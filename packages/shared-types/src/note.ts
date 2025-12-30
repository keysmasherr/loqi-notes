import { z } from 'zod';

export const EmbeddingStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed', 'stale']);
export type EmbeddingStatus = z.infer<typeof EmbeddingStatusSchema>;

export const NoteSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  contentPlain: z.string().nullable(),
  ocrText: z.string().nullable(),
  hasHandwriting: z.boolean(),
  wordCount: z.number().int().min(0),
  readingTimeMinutes: z.number().int().min(0),
  version: z.number().int().min(1),
  clientId: z.string().nullable(),
  clientUpdatedAt: z.date().nullable(),
  lastSyncedAt: z.date().nullable(),
  embeddingStatus: EmbeddingStatusSchema,
  embeddingError: z.string().nullable(),
  lastEmbeddedAt: z.date().nullable(),
  embeddingModel: z.string().nullable(),
  lastReviewedAt: z.date().nullable(),
  reviewCount: z.number().int().min(0),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});
export type Note = z.infer<typeof NoteSchema>;

export const CreateNoteInputSchema = z.object({
  title: z.string().min(1).max(500).optional().default('Untitled'),
  content: z.string().min(1),
  ocrText: z.string().optional(),
  hasHandwriting: z.boolean().optional().default(false),
  clientId: z.string().optional(),
  clientUpdatedAt: z.date().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});
export type CreateNoteInput = z.infer<typeof CreateNoteInputSchema>;

export const UpdateNoteInputSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  ocrText: z.string().optional(),
  hasHandwriting: z.boolean().optional(),
  clientId: z.string().optional(),
  clientUpdatedAt: z.date().optional(),
  version: z.number().int().min(1),
});
export type UpdateNoteInput = z.infer<typeof UpdateNoteInputSchema>;

export const ListNotesInputSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
  tagIds: z.array(z.string().uuid()).optional(),
  searchQuery: z.string().optional(),
  includeDeleted: z.boolean().optional().default(false),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).optional().default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
export type ListNotesInput = z.infer<typeof ListNotesInputSchema>;

export const NoteWithTagsSchema = NoteSchema.extend({
  tags: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    color: z.string(),
    icon: z.string().nullable(),
  })),
});
export type NoteWithTags = z.infer<typeof NoteWithTagsSchema>;
