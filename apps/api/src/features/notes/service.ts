import { eq, and, isNull, desc, asc, sql, inArray } from 'drizzle-orm';
import type {
  CreateNoteInput,
  UpdateNoteInput,
  ListNotesInput,
} from '@loqi-notes/shared-types';
import { notes, tags, noteTags, users } from '../../db/schema';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { inngest } from '../../lib/inngest';
import { logger } from '../../lib/logger';

function calculateWordCount(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

function calculateReadingTime(wordCount: number): number {
  const wordsPerMinute = 200;
  return Math.ceil(wordCount / wordsPerMinute);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function createNote(
  userId: string,
  input: CreateNoteInput,
  db: any
) {
  const contentPlain = stripHtml(input.content);
  const wordCount = calculateWordCount(contentPlain);
  const readingTimeMinutes = calculateReadingTime(wordCount);

  const [note] = await db
    .insert(notes)
    .values({
      userId,
      title: input.title,
      content: input.content,
      contentPlain,
      ocrText: input.ocrText,
      hasHandwriting: input.hasHandwriting,
      wordCount,
      readingTimeMinutes,
      clientId: input.clientId,
      clientUpdatedAt: input.clientUpdatedAt,
    })
    .returning();

  // Add tags if provided
  if (input.tagIds && input.tagIds.length > 0) {
    await db.insert(noteTags).values(
      input.tagIds.map((tagId) => ({
        noteId: note.id,
        tagId,
      }))
    );

    // Update notes count for each tag
    await db
      .update(tags)
      .set({
        notesCount: sql`${tags.notesCount} + 1`,
        updatedAt: new Date(),
      })
      .where(inArray(tags.id, input.tagIds));
  }

  // Update user's notes count
  await db
    .update(users)
    .set({
      notesCount: sql`${users.notesCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Emit Inngest event for embedding generation
  // Fire and forget - don't await to avoid blocking the response
  inngest
    .send({
      name: 'notes/created',
      data: {
        noteId: note.id,
        userId,
        title: note.title,
        content: note.content,
        courseTag: undefined, // TODO: Get from tags when course tags are implemented
      },
    })
    .catch((error) => {
      logger.error({ error, noteId: note.id }, 'Failed to send notes/created event');
    });

  return getNoteById(userId, note.id, db);
}

export async function getNoteById(userId: string, noteId: string, db: any) {
  const note = await db.query.notes.findFirst({
    where: and(eq(notes.id, noteId), eq(notes.userId, userId)),
  });

  if (!note) {
    throw new NotFoundError('Note', noteId);
  }

  // Get tags for this note
  const noteTagsResult = await db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      icon: tags.icon,
    })
    .from(noteTags)
    .innerJoin(tags, eq(noteTags.tagId, tags.id))
    .where(and(eq(noteTags.noteId, noteId), isNull(tags.deletedAt)));

  return {
    ...note,
    tags: noteTagsResult,
  };
}

export async function listNotes(userId: string, input: ListNotesInput, db: any) {
  const { limit, offset, tagIds, searchQuery: _searchQuery, includeDeleted, sortBy, sortOrder } = input;
  // Note: searchQuery is reserved for full-text search implementation (Phase 2)

  // Build where conditions
  const conditions = [eq(notes.userId, userId)];

  if (!includeDeleted) {
    conditions.push(isNull(notes.deletedAt));
  }

  // Build the base query
  let query = db
    .select()
    .from(notes)
    .where(and(...conditions));

  // Filter by tags if provided
  if (tagIds && tagIds.length > 0) {
    const noteIdsWithTags = db
      .selectDistinct({ noteId: noteTags.noteId })
      .from(noteTags)
      .where(inArray(noteTags.tagId, tagIds));

    query = query.where(inArray(notes.id, noteIdsWithTags));
  }

  // Apply sorting
  const sortColumn = sortBy === 'title' ? notes.title : sortBy === 'createdAt' ? notes.createdAt : notes.updatedAt;
  const sortFn = sortOrder === 'asc' ? asc : desc;
  query = query.orderBy(sortFn(sortColumn));

  // Apply pagination
  query = query.limit(limit).offset(offset);

  const notesList = await query;

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(notes)
    .where(and(...conditions));

  const total = Number(countResult[0]?.count ?? 0);

  // Get tags for each note
  const noteIds = notesList.map((n: any) => n.id);
  const allNoteTags = noteIds.length > 0
    ? await db
        .select({
          noteId: noteTags.noteId,
          id: tags.id,
          name: tags.name,
          color: tags.color,
          icon: tags.icon,
        })
        .from(noteTags)
        .innerJoin(tags, eq(noteTags.tagId, tags.id))
        .where(and(inArray(noteTags.noteId, noteIds), isNull(tags.deletedAt)))
    : [];

  // Group tags by note
  const tagsByNoteId = allNoteTags.reduce((acc: any, row: any) => {
    if (!acc[row.noteId]) {
      acc[row.noteId] = [];
    }
    acc[row.noteId].push({
      id: row.id,
      name: row.name,
      color: row.color,
      icon: row.icon,
    });
    return acc;
  }, {});

  const notesWithTags = notesList.map((note: any) => ({
    ...note,
    tags: tagsByNoteId[note.id] || [],
  }));

  return {
    notes: notesWithTags,
    total,
    limit,
    offset,
    hasMore: offset + notesList.length < total,
  };
}

export async function updateNote(
  userId: string,
  input: UpdateNoteInput,
  db: any
) {
  const { id, version, ...updateData } = input;

  // Get current note to check version
  const currentNote = await db.query.notes.findFirst({
    where: and(eq(notes.id, id), eq(notes.userId, userId)),
  });

  if (!currentNote) {
    throw new NotFoundError('Note', id);
  }

  // Check for version conflict
  if (currentNote.version !== version) {
    throw new ConflictError(
      `Note has been modified. Current version: ${currentNote.version}, your version: ${version}`
    );
  }

  // Calculate new values if content changed
  const updates: any = {
    ...updateData,
    version: version + 1,
    updatedAt: new Date(),
  };

  if (updateData.content) {
    updates.contentPlain = stripHtml(updateData.content);
    updates.wordCount = calculateWordCount(updates.contentPlain);
    updates.readingTimeMinutes = calculateReadingTime(updates.wordCount);
  }

  const [updated] = await db
    .update(notes)
    .set(updates)
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .returning();

  // Emit Inngest event for embedding regeneration (only if content changed)
  if (updateData.content) {
    inngest
      .send({
        name: 'notes/updated',
        data: {
          noteId: updated.id,
          userId,
          title: updated.title,
          content: updated.content,
          courseTag: undefined, // TODO: Get from tags when course tags are implemented
        },
      })
      .catch((error) => {
        logger.error({ error, noteId: updated.id }, 'Failed to send notes/updated event');
      });
  }

  return getNoteById(userId, updated.id, db);
}

export async function deleteNote(userId: string, noteId: string, db: any) {
  const note = await db.query.notes.findFirst({
    where: and(eq(notes.id, noteId), eq(notes.userId, userId)),
  });

  if (!note) {
    throw new NotFoundError('Note', noteId);
  }

  // Soft delete
  await db
    .update(notes)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(notes.id, noteId));

  // Update user's notes count
  await db
    .update(users)
    .set({
      notesCount: sql`GREATEST(${users.notesCount} - 1, 0)`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Update tags notes count
  const noteTagsList = await db
    .select({ tagId: noteTags.tagId })
    .from(noteTags)
    .where(eq(noteTags.noteId, noteId));

  if (noteTagsList.length > 0) {
    const tagIds = noteTagsList.map((nt: any) => nt.tagId);
    await db
      .update(tags)
      .set({
        notesCount: sql`GREATEST(${tags.notesCount} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(inArray(tags.id, tagIds));
  }

  return { success: true };
}

export async function restoreNote(userId: string, noteId: string, db: any) {
  const note = await db.query.notes.findFirst({
    where: and(eq(notes.id, noteId), eq(notes.userId, userId)),
  });

  if (!note) {
    throw new NotFoundError('Note', noteId);
  }

  if (!note.deletedAt) {
    throw new ConflictError('Note is not deleted');
  }

  // Restore note
  await db
    .update(notes)
    .set({
      deletedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(notes.id, noteId));

  // Update user's notes count
  await db
    .update(users)
    .set({
      notesCount: sql`${users.notesCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Update tags notes count
  const noteTagsList = await db
    .select({ tagId: noteTags.tagId })
    .from(noteTags)
    .where(eq(noteTags.noteId, noteId));

  if (noteTagsList.length > 0) {
    const tagIds = noteTagsList.map((nt: any) => nt.tagId);
    await db
      .update(tags)
      .set({
        notesCount: sql`${tags.notesCount} + 1`,
        updatedAt: new Date(),
      })
      .where(inArray(tags.id, tagIds));
  }

  return getNoteById(userId, noteId, db);
}
