import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import type {
  CreateStudySessionInput,
  UpdateStudySessionInput,
  ListStudySessionsInput,
  CompleteSessionInput,
  SkipSessionInput,
} from '@loqi-notes/shared-types';
import { studySessions, courses, assignments } from '../../db/schema';
import { NotFoundError } from '../../utils/errors';

export async function createStudySession(
  userId: string,
  input: CreateStudySessionInput,
  db: any
) {
  const { goals, ...rest } = input;

  const [session] = await db
    .insert(studySessions)
    .values({
      userId,
      ...rest,
      goals: goals || [],
    })
    .returning();

  return session;
}

export async function listStudySessions(
  userId: string,
  input: ListStudySessionsInput,
  db: any
) {
  const conditions = [eq(studySessions.userId, userId)];

  if (input.courseId) {
    conditions.push(eq(studySessions.courseId, input.courseId));
  }

  if (input.assignmentId) {
    conditions.push(eq(studySessions.assignmentId, input.assignmentId));
  }

  if (input.status) {
    conditions.push(eq(studySessions.status, input.status));
  }

  if (input.sessionType) {
    conditions.push(eq(studySessions.sessionType, input.sessionType));
  }

  if (input.fromDate) {
    conditions.push(gte(studySessions.scheduledStart, input.fromDate));
  }

  if (input.toDate) {
    conditions.push(lte(studySessions.scheduledStart, input.toDate));
  }

  const result = await db
    .select({
      session: studySessions,
      course: {
        id: courses.id,
        name: courses.name,
        code: courses.code,
        color: courses.color,
      },
      assignment: {
        id: assignments.id,
        title: assignments.title,
        dueDate: assignments.dueDate,
      },
    })
    .from(studySessions)
    .leftJoin(courses, eq(studySessions.courseId, courses.id))
    .leftJoin(assignments, eq(studySessions.assignmentId, assignments.id))
    .where(and(...conditions))
    .orderBy(studySessions.scheduledStart)
    .limit(input.limit)
    .offset(input.offset);

  return result.map((r: any) => ({
    ...r.session,
    course: r.course?.id ? r.course : null,
    assignment: r.assignment?.id ? r.assignment : null,
  }));
}

export async function getStudySessionById(
  userId: string,
  sessionId: string,
  db: any
) {
  const result = await db
    .select({
      session: studySessions,
      course: {
        id: courses.id,
        name: courses.name,
        code: courses.code,
        color: courses.color,
      },
      assignment: {
        id: assignments.id,
        title: assignments.title,
        dueDate: assignments.dueDate,
      },
    })
    .from(studySessions)
    .leftJoin(courses, eq(studySessions.courseId, courses.id))
    .leftJoin(assignments, eq(studySessions.assignmentId, assignments.id))
    .where(
      and(
        eq(studySessions.id, sessionId),
        eq(studySessions.userId, userId)
      )
    )
    .limit(1);

  if (!result.length) {
    throw new NotFoundError('StudySession', sessionId);
  }

  return {
    ...result[0].session,
    course: result[0].course?.id ? result[0].course : null,
    assignment: result[0].assignment?.id ? result[0].assignment : null,
  };
}

export async function updateStudySession(
  userId: string,
  input: UpdateStudySessionInput,
  db: any
) {
  const { id, goals, ...updateData } = input;

  const updatePayload: any = {
    ...updateData,
    updatedAt: new Date(),
  };

  if (goals !== undefined) {
    updatePayload.goals = goals;
  }

  const [updated] = await db
    .update(studySessions)
    .set(updatePayload)
    .where(
      and(
        eq(studySessions.id, id),
        eq(studySessions.userId, userId)
      )
    )
    .returning();

  if (!updated) {
    throw new NotFoundError('StudySession', id);
  }

  return updated;
}

export async function deleteStudySession(
  userId: string,
  sessionId: string,
  db: any
) {
  const deleted = await db
    .delete(studySessions)
    .where(
      and(
        eq(studySessions.id, sessionId),
        eq(studySessions.userId, userId)
      )
    )
    .returning();

  if (!deleted.length) {
    throw new NotFoundError('StudySession', sessionId);
  }

  return { success: true };
}

export async function startSession(
  userId: string,
  sessionId: string,
  db: any
) {
  const [updated] = await db
    .update(studySessions)
    .set({
      status: 'in_progress',
      actualStart: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(studySessions.id, sessionId),
        eq(studySessions.userId, userId),
        eq(studySessions.status, 'scheduled')
      )
    )
    .returning();

  if (!updated) {
    throw new NotFoundError('StudySession', sessionId);
  }

  return updated;
}

export async function completeSession(
  userId: string,
  input: CompleteSessionInput,
  db: any
) {
  const updatePayload: any = {
    status: 'completed',
    actualEnd: new Date(),
    updatedAt: new Date(),
  };

  if (input.productivityRating !== undefined) {
    updatePayload.productivityRating = input.productivityRating;
  }

  if (input.notes !== undefined) {
    updatePayload.notes = input.notes;
  }

  if (input.goals !== undefined) {
    updatePayload.goals = input.goals;
  }

  const [updated] = await db
    .update(studySessions)
    .set(updatePayload)
    .where(
      and(
        eq(studySessions.id, input.id),
        eq(studySessions.userId, userId),
        inArray(studySessions.status, ['scheduled', 'in_progress'])
      )
    )
    .returning();

  if (!updated) {
    throw new NotFoundError('StudySession', input.id);
  }

  return updated;
}

export async function skipSession(
  userId: string,
  input: SkipSessionInput,
  db: any
) {
  const updatePayload: any = {
    status: 'skipped',
    updatedAt: new Date(),
  };

  if (input.reason) {
    updatePayload.notes = input.reason;
  }

  const [updated] = await db
    .update(studySessions)
    .set(updatePayload)
    .where(
      and(
        eq(studySessions.id, input.id),
        eq(studySessions.userId, userId),
        eq(studySessions.status, 'scheduled')
      )
    )
    .returning();

  if (!updated) {
    throw new NotFoundError('StudySession', input.id);
  }

  return updated;
}

export async function getTodaySessions(
  userId: string,
  db: any
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return listStudySessions(userId, {
    fromDate: today,
    toDate: tomorrow,
    limit: 50,
    offset: 0,
  }, db);
}
