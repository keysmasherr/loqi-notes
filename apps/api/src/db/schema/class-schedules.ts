import { pgTable, uuid, text, timestamp, integer, time } from 'drizzle-orm/pg-core';
import { users } from './users';
import { courses } from './courses';

export const classSchedules = pgTable('class_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),

  // Schedule
  dayOfWeek: integer('day_of_week').notNull(), // 0-6 (Sunday-Saturday)
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),

  // Optional overrides
  location: text('location'),
  classType: text('class_type').notNull().default('lecture'), // lecture, lab, discussion, office_hours, other

  // Recurrence (iCal RRULE format)
  recurrenceRule: text('recurrence_rule'),
  // excludedDates stored as array in DB, but Drizzle doesn't have native array support for date
  // We'll handle this via raw SQL or JSONB if needed

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ClassSchedule = typeof classSchedules.$inferSelect;
export type NewClassSchedule = typeof classSchedules.$inferInsert;
