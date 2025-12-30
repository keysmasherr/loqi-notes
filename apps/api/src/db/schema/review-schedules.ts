import { pgTable, uuid, timestamp, integer, decimal, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';
import { notes } from './notes';

export const reviewSchedules = pgTable('review_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  noteId: uuid('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),

  // SM-2 Algorithm fields
  nextReviewAt: timestamp('next_review_at', { withTimezone: true }).notNull(),
  intervalDays: integer('interval_days').notNull().default(1),
  easeFactor: decimal('ease_factor', { precision: 4, scale: 2 }).notNull().default('2.5'),
  repetitionCount: integer('repetition_count').notNull().default(0),

  // Last review data
  lastQuality: integer('last_quality'),
  lastReviewedAt: timestamp('last_reviewed_at', { withTimezone: true }),

  // Stats
  totalReviews: integer('total_reviews').notNull().default(0),
  streakCount: integer('streak_count').notNull().default(0),

  // Status
  isPaused: boolean('is_paused').notNull().default(false),
  pausedUntil: timestamp('paused_until', { withTimezone: true }),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ReviewSchedule = typeof reviewSchedules.$inferSelect;
export type NewReviewSchedule = typeof reviewSchedules.$inferInsert;
