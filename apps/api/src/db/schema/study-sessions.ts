import { pgTable, uuid, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';
import { courses } from './courses';
import { assignments } from './assignments';

export const studySessions = pgTable('study_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'set null' }),
  assignmentId: uuid('assignment_id').references(() => assignments.id, { onDelete: 'set null' }),

  // Session info
  title: text('title'),

  // Scheduled times
  scheduledStart: timestamp('scheduled_start', { withTimezone: true }).notNull(),
  scheduledEnd: timestamp('scheduled_end', { withTimezone: true }).notNull(),

  // Actual times (tracked when session runs)
  actualStart: timestamp('actual_start', { withTimezone: true }),
  actualEnd: timestamp('actual_end', { withTimezone: true }),

  // Session type
  sessionType: text('session_type').notNull().default('study'), // study, review, practice, reading, writing, other

  // Integration with spaced repetition
  includeReviews: boolean('include_reviews').notNull().default(false),
  // reviewNoteIds stored as UUID array in DB

  // Goals (JSONB array)
  goals: jsonb('goals').notNull().default([]),

  // Status and tracking
  status: text('status').notNull().default('scheduled'), // scheduled, in_progress, completed, skipped, cancelled
  productivityRating: integer('productivity_rating'), // 1-5
  notes: text('notes'),

  // Recurrence
  recurrenceRule: text('recurrence_rule'),

  // Google Calendar sync
  googleEventId: text('google_event_id'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type StudySession = typeof studySessions.$inferSelect;
export type NewStudySession = typeof studySessions.$inferInsert;
