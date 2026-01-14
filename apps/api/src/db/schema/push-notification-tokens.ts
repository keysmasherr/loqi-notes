import { pgTable, uuid, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { users } from './users';

export const pushNotificationTokens = pgTable('push_notification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Token info
  token: text('token').notNull().unique(),
  platform: text('platform').notNull(), // ios, android, web

  // Device info
  deviceId: text('device_id'),
  deviceName: text('device_name'),

  // Status
  isActive: boolean('is_active').notNull().default(true),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  failureCount: integer('failure_count').notNull().default(0),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PushNotificationToken = typeof pushNotificationTokens.$inferSelect;
export type NewPushNotificationToken = typeof pushNotificationTokens.$inferInsert;
