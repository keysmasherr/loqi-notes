import { pgTable, uuid, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';

export const notes = pgTable('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Content
  title: text('title').notNull().default('Untitled'),
  content: text('content').notNull().default(''),
  contentPlain: text('content_plain'),

  // Handwriting/OCR
  ocrText: text('ocr_text'),
  hasHandwriting: boolean('has_handwriting').notNull().default(false),

  // Metadata
  wordCount: integer('word_count').notNull().default(0),
  readingTimeMinutes: integer('reading_time_minutes').notNull().default(0),

  // Sync & Versioning
  version: integer('version').notNull().default(1),
  clientId: text('client_id'),
  clientUpdatedAt: timestamp('client_updated_at', { withTimezone: true }),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),

  // Study/Review
  lastReviewedAt: timestamp('last_reviewed_at', { withTimezone: true }),
  reviewCount: integer('review_count').notNull().default(0),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const noteConflicts = pgTable('note_conflicts', {
  id: uuid('id').primaryKey().defaultRandom(),
  noteId: uuid('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Conflicting version details
  conflictingContent: text('conflicting_content').notNull(),
  conflictingTitle: text('conflicting_title'),
  conflictingClientId: text('conflicting_client_id'),
  conflictingClientUpdatedAt: timestamp('conflicting_client_updated_at', { withTimezone: true }),
  conflictingVersion: integer('conflicting_version'),

  // Resolution
  resolutionStrategy: text('resolution_strategy'),
  resolved: boolean('resolved').notNull().default(false),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedBy: text('resolved_by'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type NoteConflict = typeof noteConflicts.$inferSelect;
export type NewNoteConflict = typeof noteConflicts.$inferInsert;
