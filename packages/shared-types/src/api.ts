import { z } from 'zod';

export const SearchResultSchema = z.object({
  noteId: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  similarity: z.number().min(0).max(1),
  chunkIndex: z.number().int().nullable(),
  highlights: z.array(z.string()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SemanticSearchInputSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(50).optional().default(10),
  minSimilarity: z.number().min(0).max(1).optional().default(0.7),
  tagIds: z.array(z.string().uuid()).optional(),
});
export type SemanticSearchInput = z.infer<typeof SemanticSearchInputSchema>;

export const AIActionTypeSchema = z.enum(['summarize', 'explain', 'generateQuestions', 'ask', 'quiz']);
export type AIActionType = z.infer<typeof AIActionTypeSchema>;

export const SummarizeInputSchema = z.object({
  noteId: z.string().uuid(),
  length: z.enum(['short', 'medium', 'long']).optional().default('medium'),
});
export type SummarizeInput = z.infer<typeof SummarizeInputSchema>;

export const ExplainInputSchema = z.object({
  noteId: z.string().uuid(),
  concept: z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('intermediate'),
});
export type ExplainInput = z.infer<typeof ExplainInputSchema>;

export const GenerateQuestionsInputSchema = z.object({
  noteId: z.string().uuid(),
  count: z.number().int().min(1).max(10).optional().default(5),
  type: z.enum(['conceptual', 'factual', 'application', 'mixed']).optional().default('mixed'),
});
export type GenerateQuestionsInput = z.infer<typeof GenerateQuestionsInputSchema>;

export const AskInputSchema = z.object({
  question: z.string().min(1),
  noteIds: z.array(z.string().uuid()).optional(),
  includeAllNotes: z.boolean().optional().default(false),
});
export type AskInput = z.infer<typeof AskInputSchema>;

export const AIUsageSchema = z.object({
  queriesUsed: z.number().int().min(0),
  queriesLimit: z.number().int().min(0),
  resetAt: z.date().nullable(),
  subscriptionTier: z.string(),
});
export type AIUsage = z.infer<typeof AIUsageSchema>;

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema),
    total: z.number().int().min(0),
    limit: z.number().int().min(1),
    offset: z.number().int().min(0),
    hasMore: z.boolean(),
  });

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

export const APIErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});
export type APIError = z.infer<typeof APIErrorSchema>;
