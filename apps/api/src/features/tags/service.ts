import { eq, and, isNull, sql } from 'drizzle-orm';
import type {
  CreateTagInput,
  UpdateTagInput,
  AddTagToNoteInput,
  RemoveTagFromNoteInput,
} from '@loqi-notes/shared-types';
import { tags, noteTags, notes } from '../../db/schema';
import { NotFoundError, ConflictError } from '../../utils/errors';

export async function createTag(userId: string, input: CreateTagInput, db: any) {
  // Check if tag with same name already exists for this user
  const existingTag = await db.query.tags.findFirst({
    where: and(
      eq(tags.userId, userId),
      eq(tags.name, input.name),
      isNull(tags.deletedAt)
    ),
  });

  if (existingTag) {
    throw new ConflictError(`Tag "${input.name}" already exists`);
  }

  const [tag] = await db
    .insert(tags)
    .values({
      userId,
      name: input.name,
      color: input.color,
      icon: input.icon,
    })
    .returning();

  return tag;
}

export async function listTags(userId: string, db: any) {
  const tagsList = await db.query.tags.findMany({
    where: and(eq(tags.userId, userId), isNull(tags.deletedAt)),
    orderBy: (tags: any, { asc }: any) => [asc(tags.name)],
  });

  return tagsList;
}

export async function getTagById(userId: string, tagId: string, db: any) {
  const tag = await db.query.tags.findFirst({
    where: and(
      eq(tags.id, tagId),
      eq(tags.userId, userId),
      isNull(tags.deletedAt)
    ),
  });

  if (!tag) {
    throw new NotFoundError('Tag', tagId);
  }

  return tag;
}

export async function updateTag(userId: string, input: UpdateTagInput, db: any) {
  const { id, ...updateData } = input;

  // Check if tag exists
  const existingTag = await db.query.tags.findFirst({
    where: and(eq(tags.id, id), eq(tags.userId, userId), isNull(tags.deletedAt)),
  });

  if (!existingTag) {
    throw new NotFoundError('Tag', id);
  }

  // Check if new name conflicts with another tag
  if (updateData.name && updateData.name !== existingTag.name) {
    const nameConflict = await db.query.tags.findFirst({
      where: and(
        eq(tags.userId, userId),
        eq(tags.name, updateData.name),
        isNull(tags.deletedAt)
      ),
    });

    if (nameConflict) {
      throw new ConflictError(`Tag "${updateData.name}" already exists`);
    }
  }

  const [updated] = await db
    .update(tags)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(tags.id, id))
    .returning();

  return updated;
}

export async function deleteTag(userId: string, tagId: string, db: any) {
  const tag = await db.query.tags.findFirst({
    where: and(eq(tags.id, tagId), eq(tags.userId, userId), isNull(tags.deletedAt)),
  });

  if (!tag) {
    throw new NotFoundError('Tag', tagId);
  }

  // Soft delete
  await db
    .update(tags)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tags.id, tagId));

  // Remove all note-tag associations (the junction table entries remain but tag is soft-deleted)
  // Note: We don't need to delete from noteTags as the tag is soft-deleted

  return { success: true };
}

export async function addTagToNote(
  userId: string,
  input: AddTagToNoteInput,
  db: any
) {
  const { noteId, tagId } = input;

  // Verify note exists and belongs to user
  const note = await db.query.notes.findFirst({
    where: and(eq(notes.id, noteId), eq(notes.userId, userId)),
  });

  if (!note) {
    throw new NotFoundError('Note', noteId);
  }

  // Verify tag exists and belongs to user
  const tag = await db.query.tags.findFirst({
    where: and(eq(tags.id, tagId), eq(tags.userId, userId), isNull(tags.deletedAt)),
  });

  if (!tag) {
    throw new NotFoundError('Tag', tagId);
  }

  // Check if association already exists
  const existing = await db.query.noteTags.findFirst({
    where: and(eq(noteTags.noteId, noteId), eq(noteTags.tagId, tagId)),
  });

  if (existing) {
    // Already exists, just return success
    return { success: true };
  }

  // Create association
  await db.insert(noteTags).values({ noteId, tagId });

  // Update tag notes count
  await db
    .update(tags)
    .set({
      notesCount: sql`${tags.notesCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(tags.id, tagId));

  return { success: true };
}

export async function removeTagFromNote(
  userId: string,
  input: RemoveTagFromNoteInput,
  db: any
) {
  const { noteId, tagId } = input;

  // Verify note exists and belongs to user
  const note = await db.query.notes.findFirst({
    where: and(eq(notes.id, noteId), eq(notes.userId, userId)),
  });

  if (!note) {
    throw new NotFoundError('Note', noteId);
  }

  // Verify tag exists and belongs to user
  const tag = await db.query.tags.findFirst({
    where: and(eq(tags.id, tagId), eq(tags.userId, userId)),
  });

  if (!tag) {
    throw new NotFoundError('Tag', tagId);
  }

  // Check if association exists
  const existing = await db.query.noteTags.findFirst({
    where: and(eq(noteTags.noteId, noteId), eq(noteTags.tagId, tagId)),
  });

  if (!existing) {
    // Doesn't exist, just return success
    return { success: true };
  }

  // Remove association
  await db
    .delete(noteTags)
    .where(and(eq(noteTags.noteId, noteId), eq(noteTags.tagId, tagId)));

  // Update tag notes count
  await db
    .update(tags)
    .set({
      notesCount: sql`GREATEST(${tags.notesCount} - 1, 0)`,
      updatedAt: new Date(),
    })
    .where(eq(tags.id, tagId));

  return { success: true };
}
