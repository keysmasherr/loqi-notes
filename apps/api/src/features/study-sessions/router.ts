import { z } from 'zod';
import { router, protectedProcedure } from '../../trpc';
import {
  CreateStudySessionInputSchema,
  UpdateStudySessionInputSchema,
  ListStudySessionsInputSchema,
  StartSessionInputSchema,
  CompleteSessionInputSchema,
  SkipSessionInputSchema,
} from '@loqi-notes/shared-types';
import {
  createStudySession,
  listStudySessions,
  getStudySessionById,
  updateStudySession,
  deleteStudySession,
  startSession,
  completeSession,
  skipSession,
  getTodaySessions,
} from './service';

export const studySessionsRouter = router({
  create: protectedProcedure
    .input(CreateStudySessionInputSchema)
    .mutation(async ({ input, ctx }) => {
      return createStudySession(ctx.user.id, input, ctx.db);
    }),

  list: protectedProcedure
    .input(ListStudySessionsInputSchema.optional().default({}))
    .query(async ({ input, ctx }) => {
      return listStudySessions(ctx.user.id, input, ctx.db);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return getStudySessionById(ctx.user.id, input.id, ctx.db);
    }),

  update: protectedProcedure
    .input(UpdateStudySessionInputSchema)
    .mutation(async ({ input, ctx }) => {
      return updateStudySession(ctx.user.id, input, ctx.db);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      return deleteStudySession(ctx.user.id, input.id, ctx.db);
    }),

  start: protectedProcedure
    .input(StartSessionInputSchema)
    .mutation(async ({ input, ctx }) => {
      return startSession(ctx.user.id, input.id, ctx.db);
    }),

  complete: protectedProcedure
    .input(CompleteSessionInputSchema)
    .mutation(async ({ input, ctx }) => {
      return completeSession(ctx.user.id, input, ctx.db);
    }),

  skip: protectedProcedure
    .input(SkipSessionInputSchema)
    .mutation(async ({ input, ctx }) => {
      return skipSession(ctx.user.id, input, ctx.db);
    }),

  getToday: protectedProcedure.query(async ({ ctx }) => {
    return getTodaySessions(ctx.user.id, ctx.db);
  }),
});
