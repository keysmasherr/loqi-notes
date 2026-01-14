import { pgTable, uuid, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';

export const scheduledNotifications = pgTable('scheduled_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Notification content
  title: text('title').notNull(),
  body: text('body').notNull(),
  data: jsonb('data').notNull().default({}),

  // Scheduling
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),

  // Reference
  referenceType: text('reference_type'), // assignment, class, study_session
  referenceId: uuid('reference_id'),
  notificationType: text('notification_type').notNull(), // class_starting, assignment_reminder, study_session_starting, exam_reminder

  // Status
  status: text('status').notNull().default('pending'), // pending, sent, failed, cancelled
  sentAt: timestamp('sent_at', { withTimezone: true }),
  error: text('error'),
  retryCount: integer('retry_count').notNull().default(0),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ScheduledNotification = typeof scheduledNotifications.$inferSelect;
export type NewScheduledNotification = typeof scheduledNotifications.$inferInsert;
