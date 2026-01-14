import { pgTable, uuid, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';

export const googleCalendarConnections = pgTable('google_calendar_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),

  // OAuth tokens
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }).notNull(),
  scope: text('scope'),

  // Google account info
  googleEmail: text('google_email'),
  googleAccountId: text('google_account_id'),

  // Sync settings
  syncEnabled: boolean('sync_enabled').notNull().default(true),
  // syncCalendarIds stored as text array in DB
  defaultCalendarId: text('default_calendar_id'),

  // Sync state
  lastFullSync: timestamp('last_full_sync', { withTimezone: true }),
  lastIncrementalSync: timestamp('last_incremental_sync', { withTimezone: true }),
  syncToken: text('sync_token'),

  // Settings (JSONB)
  syncSettings: jsonb('sync_settings').notNull().default({}),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type GoogleCalendarConnection = typeof googleCalendarConnections.$inferSelect;
export type NewGoogleCalendarConnection = typeof googleCalendarConnections.$inferInsert;
