import { z } from 'zod';
import { router, protectedProcedure } from '../../trpc';
import {
  createTag,
  listTags,
  getTagById,
  updateTag,
  deleteTag,
  addTagToNote,
  removeTagFromNote,
} from './service';
import {
  CreateTagInputSchema,
  UpdateTagInputSchema,
  AddTagToNoteInputSchema,
  RemoveTagFromNoteInputSchema,
} from '@loqi-notes/shared-types';

export const tagsRouter = router({
  create: protectedProcedure
    .input(CreateTagInputSchema)
    .mutation(async ({ input, ctx }) => {
      return createTag(ctx.user.id, input, ctx.db);
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return listTags(ctx.user.id, ctx.db);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return getTagById(ctx.user.id, input.id, ctx.db);
    }),

  update: protectedProcedure
    .input(UpdateTagInputSchema)
    .mutation(async ({ input, ctx }) => {
      return updateTag(ctx.user.id, input, ctx.db);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      return deleteTag(ctx.user.id, input.id, ctx.db);
    }),

  addToNote: protectedProcedure
    .input(AddTagToNoteInputSchema)
    .mutation(async ({ input, ctx }) => {
      return addTagToNote(ctx.user.id, input, ctx.db);
    }),

  removeFromNote: protectedProcedure
    .input(RemoveTagFromNoteInputSchema)
    .mutation(async ({ input, ctx }) => {
      return removeTagFromNote(ctx.user.id, input, ctx.db);
    }),
});
