import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';

export const calendarEvents = pgTable('calendar_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Event info
  title: text('title').notNull(),
  description: text('description'),
  location: text('location'),

  // Timing
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  isAllDay: boolean('is_all_day').notNull().default(false),

  // Event categorization
  eventType: text('event_type').notNull().default('generic'), // class, assignment, exam, study_session, office_hours, generic
  sourceType: text('source_type').notNull().default('manual'), // manual, google_sync, system_generated

  // Reference to internal entities
  referenceType: text('reference_type'), // course, assignment, study_session
  referenceId: uuid('reference_id'),

  // Google Calendar sync
  googleEventId: text('google_event_id'),
  googleCalendarId: text('google_calendar_id'),
  googleEtag: text('google_etag'),
  syncStatus: text('sync_status').notNull().default('synced'), // pending, synced, conflict, error

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type NewCalendarEvent = typeof calendarEvents.$inferInsert;
