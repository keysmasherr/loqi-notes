import { eq, and, isNull } from 'drizzle-orm';
import type {
  CreateCourseInput,
  UpdateCourseInput,
  ListCoursesInput,
  AddClassScheduleInput,
  UpdateClassScheduleInput,
} from '@loqi-notes/shared-types';
import { courses, classSchedules } from '../../db/schema';
import { NotFoundError } from '../../utils/errors';

export async function createCourse(
  userId: string,
  input: CreateCourseInput,
  db: any
) {
  const [course] = await db
    .insert(courses)
    .values({
      userId,
      ...input,
    })
    .returning();

  return course;
}

export async function listCourses(
  userId: string,
  input: ListCoursesInput,
  db: any
) {
  const conditions = [eq(courses.userId, userId)];

  if (!input.includeDeleted) {
    conditions.push(isNull(courses.deletedAt));
  }

  if (input.term) {
    conditions.push(eq(courses.term, input.term));
  }

  const result = await db.query.courses.findMany({
    where: and(...conditions),
    orderBy: (courses: any, { desc }: any) => [desc(courses.createdAt)],
  });

  return result;
}

export async function getCourseById(
  userId: string,
  courseId: string,
  db: any
) {
  const course = await db.query.courses.findFirst({
    where: and(
      eq(courses.id, courseId),
      eq(courses.userId, userId),
      isNull(courses.deletedAt)
    ),
  });

  if (!course) {
    throw new NotFoundError('Course', courseId);
  }

  // Get class schedules for this course
  const schedules = await db.query.classSchedules.findMany({
    where: eq(classSchedules.courseId, courseId),
    orderBy: (cs: any, { asc }: any) => [asc(cs.dayOfWeek), asc(cs.startTime)],
  });

  return {
    ...course,
    classSchedules: schedules,
  };
}

export async function updateCourse(
  userId: string,
  input: UpdateCourseInput,
  db: any
) {
  const { id, ...updateData } = input;

  const [updated] = await db
    .update(courses)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(courses.id, id),
        eq(courses.userId, userId),
        isNull(courses.deletedAt)
      )
    )
    .returning();

  if (!updated) {
    throw new NotFoundError('Course', id);
  }

  return updated;
}

export async function deleteCourse(
  userId: string,
  courseId: string,
  db: any
) {
  const [deleted] = await db
    .update(courses)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(courses.id, courseId),
        eq(courses.userId, userId),
        isNull(courses.deletedAt)
      )
    )
    .returning();

  if (!deleted) {
    throw new NotFoundError('Course', courseId);
  }

  return { success: true };
}

export async function addClassSchedule(
  userId: string,
  input: AddClassScheduleInput,
  db: any
) {
  // Verify the course exists and belongs to user
  const course = await db.query.courses.findFirst({
    where: and(
      eq(courses.id, input.courseId),
      eq(courses.userId, userId),
      isNull(courses.deletedAt)
    ),
  });

  if (!course) {
    throw new NotFoundError('Course', input.courseId);
  }

  const [schedule] = await db
    .insert(classSchedules)
    .values({
      userId,
      ...input,
    })
    .returning();

  return schedule;
}

export async function updateClassSchedule(
  userId: string,
  input: UpdateClassScheduleInput,
  db: any
) {
  const { id, ...updateData } = input;

  const [updated] = await db
    .update(classSchedules)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(classSchedules.id, id),
        eq(classSchedules.userId, userId)
      )
    )
    .returning();

  if (!updated) {
    throw new NotFoundError('ClassSchedule', id);
  }

  return updated;
}

export async function removeClassSchedule(
  userId: string,
  scheduleId: string,
  db: any
) {
  const deleted = await db
    .delete(classSchedules)
    .where(
      and(
        eq(classSchedules.id, scheduleId),
        eq(classSchedules.userId, userId)
      )
    )
    .returning();

  if (!deleted.length) {
    throw new NotFoundError('ClassSchedule', scheduleId);
  }

  return { success: true };
}

export async function getWeeklySchedule(
  userId: string,
  db: any
) {
  // Get all class schedules for user's active courses
  const schedules = await db
    .select({
      schedule: classSchedules,
      course: {
        id: courses.id,
        name: courses.name,
        code: courses.code,
        color: courses.color,
        location: courses.location,
      },
    })
    .from(classSchedules)
    .innerJoin(courses, eq(classSchedules.courseId, courses.id))
    .where(
      and(
        eq(classSchedules.userId, userId),
        isNull(courses.deletedAt)
      )
    )
    .orderBy(classSchedules.dayOfWeek, classSchedules.startTime);

  // Group by day of week
  const byDay: Record<number, any[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

  for (const item of schedules) {
    byDay[item.schedule.dayOfWeek].push({
      ...item.schedule,
      course: item.course,
    });
  }

  return byDay;
}
