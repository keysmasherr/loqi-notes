import { eq, and, gte, lte, isNull, inArray } from 'drizzle-orm';
import type {
  GetEventsInput,
  GetDayInput,
  GetWeekInput,
  FindFreeSlotsInput,
  ScheduleEvent,
} from '@loqi-notes/shared-types';
import { courses, classSchedules, assignments, studySessions } from '../../db/schema';

// Helper to get day of week for a date (0 = Sunday)
function getDayOfWeek(date: Date): number {
  return date.getDay();
}

// Helper to combine date with time string
function combineDateAndTime(date: Date, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

// Helper to generate dates between start and end
function getDatesBetween(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);

  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);

  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export async function getEvents(
  userId: string,
  input: GetEventsInput,
  db: any
): Promise<ScheduleEvent[]> {
  const events: ScheduleEvent[] = [];

  // Get class schedules and expand them for the date range
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
    );

  // Expand class schedules to actual dates
  const dates = getDatesBetween(input.startDate, input.endDate);
  for (const date of dates) {
    const dayOfWeek = getDayOfWeek(date);

    for (const { schedule, course } of schedules) {
      if (schedule.dayOfWeek === dayOfWeek) {
        const startTime = combineDateAndTime(date, schedule.startTime);
        const endTime = combineDateAndTime(date, schedule.endTime);

        if (!input.types || input.types.includes('class')) {
          if (!input.courseIds || input.courseIds.includes(course.id)) {
            events.push({
              id: `${schedule.id}-${date.toISOString().split('T')[0]}`,
              type: 'class',
              title: `${course.code || course.name}${schedule.classType !== 'lecture' ? ` (${schedule.classType})` : ''}`,
              description: course.name,
              location: schedule.location || course.location,
              startTime,
              endTime,
              isAllDay: false,
              color: course.color,
              sourceType: 'class_schedule',
              sourceId: schedule.id,
              course: {
                id: course.id,
                name: course.name,
                code: course.code,
              },
            });
          }
        }
      }
    }
  }

  // Get assignments in date range
  if (!input.types || input.types.some(t => ['assignment', 'exam'].includes(t))) {
    const assignmentConditions = [
      eq(assignments.userId, userId),
      isNull(assignments.deletedAt),
      gte(assignments.dueDate, input.startDate),
      lte(assignments.dueDate, input.endDate),
    ];

    if (input.courseIds && input.courseIds.length > 0) {
      assignmentConditions.push(inArray(assignments.courseId, input.courseIds));
    }

    const assignmentResults = await db
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
      .where(and(...assignmentConditions));

    for (const { assignment, course } of assignmentResults) {
      const eventType = assignment.type === 'exam' ? 'exam' : 'assignment';

      if (!input.types || input.types.includes(eventType)) {
        events.push({
          id: assignment.id,
          type: eventType,
          title: assignment.title,
          description: assignment.description,
          location: null,
          startTime: assignment.dueDate,
          endTime: assignment.dueDate,
          isAllDay: true,
          color: course?.color || '#EF4444',
          sourceType: 'assignment',
          sourceId: assignment.id,
          course: course?.id ? {
            id: course.id,
            name: course.name,
            code: course.code,
          } : null,
          metadata: {
            priority: assignment.priority,
            status: assignment.status,
            type: assignment.type,
          },
        });
      }
    }
  }

  // Get study sessions in date range
  if (!input.types || input.types.includes('study_session')) {
    const sessionConditions = [
      eq(studySessions.userId, userId),
      gte(studySessions.scheduledStart, input.startDate),
      lte(studySessions.scheduledStart, input.endDate),
    ];

    if (input.courseIds && input.courseIds.length > 0) {
      sessionConditions.push(inArray(studySessions.courseId, input.courseIds));
    }

    const sessionResults = await db
      .select({
        session: studySessions,
        course: {
          id: courses.id,
          name: courses.name,
          code: courses.code,
          color: courses.color,
        },
      })
      .from(studySessions)
      .leftJoin(courses, eq(studySessions.courseId, courses.id))
      .where(and(...sessionConditions));

    for (const { session, course } of sessionResults) {
      events.push({
        id: session.id,
        type: 'study_session',
        title: session.title || `Study: ${course?.name || 'General'}`,
        description: null,
        location: null,
        startTime: session.scheduledStart,
        endTime: session.scheduledEnd,
        isAllDay: false,
        color: course?.color || '#10B981',
        sourceType: 'study_session',
        sourceId: session.id,
        course: course?.id ? {
          id: course.id,
          name: course.name,
          code: course.code,
        } : null,
        metadata: {
          status: session.status,
          sessionType: session.sessionType,
        },
      });
    }
  }

  // Sort by start time
  events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  return events;
}

export async function getDay(
  userId: string,
  input: GetDayInput,
  db: any
) {
  const startOfDay = new Date(input.date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(input.date);
  endOfDay.setHours(23, 59, 59, 999);

  return getEvents(userId, {
    startDate: startOfDay,
    endDate: endOfDay,
  }, db);
}

export async function getWeek(
  userId: string,
  input: GetWeekInput,
  db: any
) {
  const startDate = new Date(input.startOfWeek);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);

  const events = await getEvents(userId, { startDate, endDate }, db);

  // Group events by day
  const days: { date: Date; dayOfWeek: number; events: ScheduleEvent[] }[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const dayEvents = events.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === date.toDateString();
    });

    days.push({
      date,
      dayOfWeek: getDayOfWeek(date),
      events: dayEvents,
    });
  }

  // Calculate summary
  const summary = {
    totalClasses: events.filter(e => e.type === 'class').length,
    totalStudySessions: events.filter(e => e.type === 'study_session').length,
    upcomingDeadlines: events.filter(e => ['assignment', 'exam'].includes(e.type)).length,
    totalStudyHours: events
      .filter(e => e.type === 'study_session')
      .reduce((acc, e) => {
        const duration = (e.endTime.getTime() - e.startTime.getTime()) / (1000 * 60 * 60);
        return acc + duration;
      }, 0),
  };

  return {
    startDate,
    endDate,
    days,
    summary,
  };
}

export async function getToday(userId: string, db: any) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const events = await getEvents(userId, { startDate: today, endDate: tomorrow }, db);

  // Get upcoming deadlines (next 7 days)
  const upcomingDeadlines = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      dueDate: assignments.dueDate,
      type: assignments.type,
      priority: assignments.priority,
      courseName: courses.name,
    })
    .from(assignments)
    .leftJoin(courses, eq(assignments.courseId, courses.id))
    .where(
      and(
        eq(assignments.userId, userId),
        isNull(assignments.deletedAt),
        gte(assignments.dueDate, today),
        lte(assignments.dueDate, new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)),
        inArray(assignments.status, ['pending', 'in_progress'])
      )
    )
    .orderBy(assignments.dueDate)
    .limit(10);

  return {
    date: today,
    classes: events.filter(e => e.type === 'class'),
    assignments: events.filter(e => ['assignment', 'exam'].includes(e.type)),
    studySessions: events.filter(e => e.type === 'study_session'),
    upcomingDeadlines,
  };
}

export async function findFreeSlots(
  userId: string,
  input: FindFreeSlotsInput,
  db: any
) {
  const date = new Date(input.date);
  date.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get all events for the day
  const events = await getEvents(userId, { startDate: date, endDate: endOfDay }, db);

  // Define working hours based on preference
  let workingHours: { start: number; end: number };
  switch (input.preferredTimeOfDay) {
    case 'morning':
      workingHours = { start: 6, end: 12 };
      break;
    case 'afternoon':
      workingHours = { start: 12, end: 18 };
      break;
    case 'evening':
      workingHours = { start: 18, end: 23 };
      break;
    default:
      workingHours = { start: 8, end: 22 };
  }

  // Find gaps in schedule
  const slots: { startTime: Date; endTime: Date; durationMinutes: number; score: number }[] = [];

  // Sort events by start time
  const sortedEvents = events
    .filter(e => !e.isAllDay)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  let currentTime = new Date(date);
  currentTime.setHours(workingHours.start, 0, 0, 0);

  const endTime = new Date(date);
  endTime.setHours(workingHours.end, 0, 0, 0);

  for (const event of sortedEvents) {
    if (event.startTime > currentTime && event.startTime < endTime) {
      const slotEnd = new Date(Math.min(event.startTime.getTime(), endTime.getTime()));
      const slotStart = new Date(Math.max(currentTime.getTime(), date.getTime()));

      if (slotEnd > slotStart) {
        const durationMinutes = (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60);

        if (durationMinutes >= input.minDurationMinutes) {
          // Calculate score based on various factors
          let score = 50;

          // Longer slots are better
          score += Math.min(durationMinutes / 60 * 10, 20);

          // Morning/afternoon slots might be better for studying
          const slotHour = slotStart.getHours();
          if (slotHour >= 9 && slotHour <= 11) score += 15;
          else if (slotHour >= 14 && slotHour <= 16) score += 10;

          slots.push({
            startTime: slotStart,
            endTime: slotEnd,
            durationMinutes,
            score: Math.min(score, 100),
          });
        }
      }
    }

    if (event.endTime > currentTime) {
      currentTime = new Date(event.endTime);
    }
  }

  // Check for slot after last event
  if (currentTime < endTime) {
    const durationMinutes = (endTime.getTime() - currentTime.getTime()) / (1000 * 60);

    if (durationMinutes >= input.minDurationMinutes) {
      slots.push({
        startTime: new Date(currentTime),
        endTime: new Date(endTime),
        durationMinutes,
        score: 60,
      });
    }
  }

  // Sort by score descending and limit
  return slots
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit);
}
