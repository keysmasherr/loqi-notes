import { router, publicProcedure, protectedProcedure } from '../../trpc';
import { z } from 'zod';
import { getProfile, updateProfile } from './service';
import { UpdateProfileInputSchema } from '@loqi-notes/shared-types';

export const authRouter = router({
  getSession: protectedProcedure.query(async ({ ctx }) => {
    return {
      user: ctx.user,
    };
  }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return getProfile(ctx.user.id, ctx.db);
  }),

  updateProfile: protectedProcedure
    .input(UpdateProfileInputSchema)
    .mutation(async ({ input, ctx }) => {
      return updateProfile(ctx.user.id, input, ctx.db);
    }),
});
