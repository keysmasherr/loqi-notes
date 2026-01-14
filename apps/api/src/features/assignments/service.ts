import { eq, and, isNull, gte, lte, inArray, sql } from 'drizzle-orm';
import type {
  CreateAssignmentInput,
  UpdateAssignmentInput,
  ListAssignmentsInput,
  UpdateAssignmentStatusInput,
  RecordGradeInput,
  LinkNotesInput,
  UnlinkNoteInput,
  GetDueAssignmentsInput,
} from '@loqi-notes/shared-types';
import { assignments, assignmentNotes, courses } from '../../db/schema';
import { NotFoundError } from '../../utils/errors';

export async function createAssignment(
  userId: string,
  input: CreateAssignmentInput,
  db: any
) {
  const { reminderSettings, ...rest } = input;

  const [assignment] = await db
    .insert(assignments)
    .values({
      userId,
      ...rest,
      reminderSettings: reminderSettings || [],
    })
    .returning();

  return assignment;
}

export async function listAssignments(
  userId: string,
  input: ListAssignmentsInput,
  db: any
) {
  const conditions = [eq(assignments.userId, userId)];

  if (!input.includeDeleted) {
    conditions.push(isNull(assignments.deletedAt));
  }

  if (input.courseId) {
    conditions.push(eq(assignments.courseId, input.courseId));
  }

  if (input.status) {
    conditions.push(eq(assignments.status, input.status));
  }

  if (input.type) {
    conditions.push(eq(assignments.type, input.type));
  }

  if (input.priority) {
    conditions.push(eq(assignments.priority, input.priority));
  }

  if (input.fromDate) {
    conditions.push(gte(assignments.dueDate, input.fromDate));
  }

  if (input.toDate) {
    conditions.push(lte(assignments.dueDate, input.toDate));
  }

  const result = await db
    .select({
      assignment: assignments,
      course: {
        id: courses.id,
        name: courses.name,
        code: courses.code,
        color: courses.color,
      },
    })
    .from(assignments)
    .leftJoin(courses, eq(assignments.courseId, courses.id))
    .where(and(...conditions))
    .orderBy(assignments.dueDate)
    .limit(input.limit)
    .offset(input.offset);

  return result.map((r: any) => ({
    ...r.assignment,
    course: r.course,
  }));
}

export async function getAssignmentById(
  userId: string,
  assignmentId: string,
  db: any
) {
  const result = await db
    .select({
      assignment: assignments,
      course: {
        id: courses.id,
        name: courses.name,
        code: courses.code,
        color: courses.color,
      },
    })
    .from(assignments)
    .leftJoin(courses, eq(assignments.courseId, courses.id))
    .where(
      and(
        eq(assignments.id, assignmentId),
        eq(assignments.userId, userId),
        isNull(assignments.deletedAt)
      )
    )
    .limit(1);

  if (!result.length) {
    throw new NotFoundError('Assignment', assignmentId);
  }

  // Get linked notes
  const linkedNotes = await db
    .select({ noteId: assignmentNotes.noteId })
    .from(assignmentNotes)
    .where(eq(assignmentNotes.assignmentId, assignmentId));

  return {
    ...result[0].assignment,
    course: result[0].course,
    linkedNoteIds: linkedNotes.map((n: any) => n.noteId),
  };
}

export async function updateAssignment(
  userId: string,
  input: UpdateAssignmentInput,
  db: any
) {
  const { id, reminderSettings, ...updateData } = input;

  const updatePayload: any = {
    ...updateData,
    updatedAt: new Date(),
  };

  if (reminderSettings !== undefined) {
    updatePayload.reminderSettings = reminderSettings;
  }

  const [updated] = await db
    .update(assignments)
    .set(updatePayload)
    .where(
      and(
        eq(assignments.id, id),
        eq(assignments.userId, userId),
        isNull(assignments.deletedAt)
      )
    )
    .returning();

  if (!updated) {
    throw new NotFoundError('Assignment', id);
  }

  return updated;
}

export async function deleteAssignment(
  userId: string,
  assignmentId: string,
  db: any
) {
  const [deleted] = await db
    .update(assignments)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(assignments.id, assignmentId),
        eq(assignments.userId, userId),
        isNull(assignments.deletedAt)
      )
    )
    .returning();

  if (!deleted) {
    throw new NotFoundError('Assignment', assignmentId);
  }

  return { success: true };
}

export async function updateAssignmentStatus(
  userId: string,
  input: UpdateAssignmentStatusInput,
  db: any
) {
  const [updated] = await db
    .update(assignments)
    .set({
      status: input.status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(assignments.id, input.id),
        eq(assignments.userId, userId),
        isNull(assignments.deletedAt)
      )
    )
    .returning();

  if (!updated) {
    throw new NotFoundError('Assignment', input.id);
  }

  return updated;
}

export async function markComplete(
  userId: string,
  assignmentId: string,
  grade?: number,
  db?: any
) {
  const updatePayload: any = {
    status: 'completed',
    updatedAt: new Date(),
  };

  if (grade !== undefined) {
    updatePayload.grade = grade.toString();
    updatePayload.status = 'graded';
  }

  const [updated] = await db
    .update(assignments)
    .set(updatePayload)
    .where(
      and(
        eq(assignments.id, assignmentId),
        eq(assignments.userId, userId),
        isNull(assignments.deletedAt)
      )
    )
    .returning();

  if (!updated) {
    throw new NotFoundError('Assignment', assignmentId);
  }

  return updated;
}

export async function recordGrade(
  userId: string,
  input: RecordGradeInput,
  db: any
) {
  const [updated] = await db
    .update(assignments)
    .set({
      grade: input.grade.toString(),
      feedback: input.feedback,
      status: 'graded',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(assignments.id, input.id),
        eq(assignments.userId, userId),
        isNull(assignments.deletedAt)
      )
    )
    .returning();

  if (!updated) {
    throw new NotFoundError('Assignment', input.id);
  }

  return updated;
}

export async function linkNotes(
  userId: string,
  input: LinkNotesInput,
  db: any
) {
  // Verify assignment exists
  const assignment = await db.query.assignments.findFirst({
    where: and(
      eq(assignments.id, input.assignmentId),
      eq(assignments.userId, userId),
      isNull(assignments.deletedAt)
    ),
  });

  if (!assignment) {
    throw new NotFoundError('Assignment', input.assignmentId);
  }

  // Insert links (ignore duplicates)
  for (const noteId of input.noteIds) {
    await db
      .insert(assignmentNotes)
      .values({
        assignmentId: input.assignmentId,
        noteId,
      })
      .onConflictDoNothing();
  }

  return { success: true, linkedCount: input.noteIds.length };
}

export async function unlinkNote(
  userId: string,
  input: UnlinkNoteInput,
  db: any
) {
  // Verify assignment exists and belongs to user
  const assignment = await db.query.assignments.findFirst({
    where: and(
      eq(assignments.id, input.assignmentId),
      eq(assignments.userId, userId)
    ),
  });

  if (!assignment) {
    throw new NotFoundError('Assignment', input.assignmentId);
  }

  await db
    .delete(assignmentNotes)
    .where(
      and(
        eq(assignmentNotes.assignmentId, input.assignmentId),
        eq(assignmentNotes.noteId, input.noteId)
      )
    );

  return { success: true };
}

export async function getDueAssignments(
  userId: string,
  input: GetDueAssignmentsInput,
  db: any
) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + input.days);

  const result = await db
    .select({
      assignment: assignments,
      course: {
        id: courses.id,
        name: courses.name,
        code: courses.code,
        color: courses.color,
      },
    })
    .from(assignments)
    .leftJoin(courses, eq(assignments.courseId, courses.id))
    .where(
      and(
        eq(assignments.userId, userId),
        isNull(assignments.deletedAt),
        gte(assignments.dueDate, now),
        lte(assignments.dueDate, futureDate),
        inArray(assignments.status, ['pending', 'in_progress'])
      )
    )
    .orderBy(assignments.dueDate);

  return result.map((r: any) => ({
    ...r.assignment,
    course: r.course,
  }));
}

export async function getUpcomingAssignments(
  userId: string,
  limit: number,
  db: any
) {
  const now = new Date();

  const result = await db
    .select({
      assignment: assignments,
      course: {
        id: courses.id,
        name: courses.name,
        code: courses.code,
        color: courses.color,
      },
    })
    .from(assignments)
    .leftJoin(courses, eq(assignments.courseId, courses.id))
    .where(
      and(
        eq(assignments.userId, userId),
        isNull(assignments.deletedAt),
        gte(assignments.dueDate, now),
        inArray(assignments.status, ['pending', 'in_progress'])
      )
    )
    .orderBy(assignments.dueDate)
    .limit(limit);

  return result.map((r: any) => ({
    ...r.assignment,
    course: r.course,
  }));
}
