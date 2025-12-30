import { z } from 'zod';

export const TagSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  color: z.string(),
  icon: z.string().nullable(),
  notesCount: z.number().int().min(0),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});
export type Tag = z.infer<typeof TagSchema>;

export const CreateTagInputSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#3B82F6'),
  icon: z.string().max(10).optional(),
});
export type CreateTagInput = z.infer<typeof CreateTagInputSchema>;

export const UpdateTagInputSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(10).optional(),
});
export type UpdateTagInput = z.infer<typeof UpdateTagInputSchema>;

export const AddTagToNoteInputSchema = z.object({
  noteId: z.string().uuid(),
  tagId: z.string().uuid(),
});
export type AddTagToNoteInput = z.infer<typeof AddTagToNoteInputSchema>;

export const RemoveTagFromNoteInputSchema = z.object({
  noteId: z.string().uuid(),
  tagId: z.string().uuid(),
});
export type RemoveTagFromNoteInput = z.infer<typeof RemoveTagFromNoteInputSchema>;
