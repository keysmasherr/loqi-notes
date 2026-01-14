import { z } from 'zod';
import { router, protectedProcedure } from '../../trpc';
import {
  CreateCourseInputSchema,
  UpdateCourseInputSchema,
  ListCoursesInputSchema,
  AddClassScheduleInputSchema,
  UpdateClassScheduleInputSchema,
} from '@loqi-notes/shared-types';
import {
  createCourse,
  listCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  addClassSchedule,
  updateClassSchedule,
  removeClassSchedule,
  getWeeklySchedule,
} from './service';

export const coursesRouter = router({
  create: protectedProcedure
    .input(CreateCourseInputSchema)
    .mutation(async ({ input, ctx }) => {
      return createCourse(ctx.user.id, input, ctx.db);
    }),

  list: protectedProcedure
    .input(ListCoursesInputSchema.optional().default({}))
    .query(async ({ input, ctx }) => {
      return listCourses(ctx.user.id, input, ctx.db);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return getCourseById(ctx.user.id, input.id, ctx.db);
    }),

  update: protectedProcedure
    .input(UpdateCourseInputSchema)
    .mutation(async ({ input, ctx }) => {
      return updateCourse(ctx.user.id, input, ctx.db);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      return deleteCourse(ctx.user.id, input.id, ctx.db);
    }),

  addClassSchedule: protectedProcedure
    .input(AddClassScheduleInputSchema)
    .mutation(async ({ input, ctx }) => {
      return addClassSchedule(ctx.user.id, input, ctx.db);
    }),

  updateClassSchedule: protectedProcedure
    .input(UpdateClassScheduleInputSchema)
    .mutation(async ({ input, ctx }) => {
      return updateClassSchedule(ctx.user.id, input, ctx.db);
    }),

  removeClassSchedule: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      return removeClassSchedule(ctx.user.id, input.id, ctx.db);
    }),

  getWeeklySchedule: protectedProcedure.query(async ({ ctx }) => {
    return getWeeklySchedule(ctx.user.id, ctx.db);
  }),
});
