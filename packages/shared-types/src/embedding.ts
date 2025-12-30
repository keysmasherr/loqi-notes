import { z } from 'zod';

export const EmbeddingModelSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  provider: z.string(),
  dimensions: z.number().int().min(1),
  version: z.string().nullable(),
  maxTokens: z.number().int().nullable(),
  costPer1kTokens: z.number().nullable(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  avgLatencyMs: z.number().int().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type EmbeddingModel = z.infer<typeof EmbeddingModelSchema>;

export const EmbeddingSchema = z.object({
  id: z.string().uuid(),
  noteId: z.string().uuid(),
  userId: z.string().uuid(),
  chunkIndex: z.number().int().min(0),
  content: z.string(),
  tokenCount: z.number().int().nullable(),
  embedding: z.array(z.number()),
  embeddingModel: z.string(),
  embeddingVersion: z.number().int().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Embedding = z.infer<typeof EmbeddingSchema>;
