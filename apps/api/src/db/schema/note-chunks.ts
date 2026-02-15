import { pgTable, uuid, text, timestamp, integer, customType } from 'drizzle-orm/pg-core';
import { users } from './users';
import { notes } from './notes';

/**
 * Custom vector type for pgvector
 * Used for storing OpenAI embeddings (1536 dimensions for text-embedding-3-small)
 */
const vector = customType<{ data: number[]; config: { dimensions: number } }>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`;
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: unknown): number[] {
    if (typeof value === 'string') {
      return JSON.parse(value);
    }
    return value as number[];
  },
});

/**
 * Note chunks table - stores chunked note content with contextual metadata
 * Used for RAG retrieval with rich metadata for improved search quality
 */
export const noteChunks = pgTable('note_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  noteId: uuid('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),

  // Denormalized metadata for retrieval (avoids joins during search)
  noteTitle: text('note_title').notNull(),
  sectionPath: text('section_path').array().notNull().default([]),
  courseTag: text('course_tag'),

  // Content
  contentRaw: text('content_raw').notNull(),
  contentEmbed: text('content_embed').notNull(), // Content with prepended context header for embedding

  // Position
  chunkIndex: integer('chunk_index').notNull(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Note chunk embeddings table - stores vector embeddings for chunks
 * Separated from chunks for flexibility (can re-embed without losing chunk data)
 */
export const noteChunkEmbeddings = pgTable('note_chunk_embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  chunkId: uuid('chunk_id').notNull().references(() => noteChunks.id, { onDelete: 'cascade' }),

  // Vector embedding (1536 dimensions for OpenAI text-embedding-3-small)
  embedding: vector('embedding', { dimensions: 1536 }).notNull(),
  embeddingModel: text('embedding_model').notNull().default('text-embedding-3-small'),

  // Timestamp
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Type exports for use in application code
export type NoteChunk = typeof noteChunks.$inferSelect;
export type NewNoteChunk = typeof noteChunks.$inferInsert;
export type NoteChunkEmbedding = typeof noteChunkEmbeddings.$inferSelect;
export type NewNoteChunkEmbedding = typeof noteChunkEmbeddings.$inferInsert;
