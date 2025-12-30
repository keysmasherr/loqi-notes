import { pgTable, uuid, text, timestamp, integer, decimal } from 'drizzle-orm/pg-core';
import { users } from './users';
import { notes } from './notes';

export const aiLogs = pgTable('ai_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Action details
  actionType: text('action_type').notNull(),
  noteId: uuid('note_id').references(() => notes.id, { onDelete: 'set null' }),

  // Input/Output
  inputPreview: text('input_preview'),
  outputPreview: text('output_preview'),

  // Token usage
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  totalTokens: integer('total_tokens'),

  // Cost tracking
  estimatedCostUsd: decimal('estimated_cost_usd', { precision: 10, scale: 6 }),

  // Model info
  modelUsed: text('model_used'),
  modelVersion: text('model_version'),

  // Performance
  latencyMs: integer('latency_ms'),

  // Status
  status: text('status').notNull().default('success'),
  errorMessage: text('error_message'),

  // Request metadata
  requestId: text('request_id'),
  clientId: text('client_id'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AILog = typeof aiLogs.$inferSelect;
export type NewAILog = typeof aiLogs.$inferInsert;
