import { pgTable, uuid, text, timestamp, integer, bigint, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),

  // Subscription & Limits
  subscriptionTier: text('subscription_tier').notNull().default('free'),
  subscriptionExpiresAt: timestamp('subscription_expires_at', { withTimezone: true }),

  // Usage Tracking
  aiQueriesUsed: integer('ai_queries_used').notNull().default(0),
  aiQueriesResetAt: timestamp('ai_queries_reset_at', { withTimezone: true }),
  storageUsedBytes: bigint('storage_used_bytes', { mode: 'number' }).notNull().default(0),
  notesCount: integer('notes_count').notNull().default(0),

  // Preferences (JSONB for flexibility)
  preferences: jsonb('preferences').notNull().default({}),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
