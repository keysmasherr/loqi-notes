import { router, protectedProcedure } from '../../trpc';
import {
  GetEventsInputSchema,
  GetDayInputSchema,
  GetWeekInputSchema,
  GetMonthInputSchema,
  FindFreeSlotsInputSchema,
} from '@loqi-notes/shared-types';
import {
  getEvents,
  getDay,
  getWeek,
  getToday,
  findFreeSlots,
} from './service';

export const scheduleRouter = router({
  getEvents: protectedProcedure
    .input(GetEventsInputSchema)
    .query(async ({ input, ctx }) => {
      return getEvents(ctx.user.id, input, ctx.db);
    }),

  getDay: protectedProcedure
    .input(GetDayInputSchema)
    .query(async ({ input, ctx }) => {
      return getDay(ctx.user.id, input, ctx.db);
    }),

  getWeek: protectedProcedure
    .input(GetWeekInputSchema)
    .query(async ({ input, ctx }) => {
      return getWeek(ctx.user.id, input, ctx.db);
    }),

  getMonth: protectedProcedure
    .input(GetMonthInputSchema)
    .query(async ({ input, ctx }) => {
      // Get first and last day of month
      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0, 23, 59, 59, 999);

      return getEvents(ctx.user.id, { startDate, endDate }, ctx.db);
    }),

  getToday: protectedProcedure.query(async ({ ctx }) => {
    return getToday(ctx.user.id, ctx.db);
  }),

  getUpcoming: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return getEvents(ctx.user.id, { startDate: now, endDate: nextWeek }, ctx.db);
  }),

  findFreeSlots: protectedProcedure
    .input(FindFreeSlotsInputSchema)
    .query(async ({ input, ctx }) => {
      return findFreeSlots(ctx.user.id, input, ctx.db);
    }),
});
