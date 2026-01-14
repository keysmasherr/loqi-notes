import { pgTable, uuid, text, timestamp, date, integer } from 'drizzle-orm/pg-core';
import { users } from './users';

export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Course info
  name: text('name').notNull(),
  code: text('code'),
  section: text('section'),
  instructor: text('instructor'),
  location: text('location'),
  color: text('color').notNull().default('#3B82F6'),

  // Term info
  term: text('term'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  credits: integer('credits'),
  description: text('description'),

  // Google Calendar sync
  googleCalendarId: text('google_calendar_id'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
