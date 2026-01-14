import { z } from 'zod';
import { router, protectedProcedure } from '../../trpc';
import {
  createNote,
  getNoteById,
  listNotes,
  updateNote,
  deleteNote,
  restoreNote,
} from './service';
import {
  CreateNoteInputSchema,
  UpdateNoteInputSchema,
  ListNotesInputSchema,
} from '@loqi-notes/shared-types';

export const notesRouter = router({
  create: protectedProcedure
    .input(CreateNoteInputSchema)
    .mutation(async ({ input, ctx }) => {
      return createNote(ctx.user.id, input, ctx.db);
    }),

  list: protectedProcedure
    .input(ListNotesInputSchema)
    .query(async ({ input, ctx }) => {
      return listNotes(ctx.user.id, input, ctx.db);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return getNoteById(ctx.user.id, input.id, ctx.db);
    }),

  update: protectedProcedure
    .input(UpdateNoteInputSchema)
    .mutation(async ({ input, ctx }) => {
      return updateNote(ctx.user.id, input, ctx.db);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      return deleteNote(ctx.user.id, input.id, ctx.db);
    }),

  restore: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      return restoreNote(ctx.user.id, input.id, ctx.db);
    }),
});
