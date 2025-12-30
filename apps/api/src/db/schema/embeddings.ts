import { pgTable, uuid, text, timestamp, integer, boolean, decimal, customType } from 'drizzle-orm/pg-core';
import { users } from './users';
import { notes } from './notes';

// Custom vector type for pgvector
const vector = customType<{ data: number[]; config: { dimensions: number } }>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`;
  },
  toDriver(value: number[]) {
    return JSON.stringify(value);
  },
  fromDriver(value: unknown) {
    if (typeof value === 'string') {
      return JSON.parse(value) as number[];
    }
    return value as number[];
  },
});

export const embeddingModels = pgTable('embedding_models', {
  id: uuid('id').primaryKey().defaultRandom(),

  name: text('name').notNull().unique(),
  provider: text('provider').notNull(),
  dimensions: integer('dimensions').notNull(),

  // Model details
  version: text('version'),
  maxTokens: integer('max_tokens'),
  costPer1kTokens: decimal('cost_per_1k_tokens', { precision: 10, scale: 6 }),

  // Status
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),

  // Performance metadata
  avgLatencyMs: integer('avg_latency_ms'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const embeddings = pgTable('embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  noteId: uuid('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Chunk info
  chunkIndex: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  tokenCount: integer('token_count'),

  // Vector embedding
  embedding: vector('embedding', { dimensions: 1536 }).notNull(),

  // Model tracking
  embeddingModel: text('embedding_model').notNull().default('text-embedding-3-small'),
  embeddingVersion: integer('embedding_version').notNull().default(1),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type EmbeddingModel = typeof embeddingModels.$inferSelect;
export type NewEmbeddingModel = typeof embeddingModels.$inferInsert;
export type Embedding = typeof embeddings.$inferSelect;
export type NewEmbedding = typeof embeddings.$inferInsert;
