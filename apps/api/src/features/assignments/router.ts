import { z } from 'zod';
import { router, protectedProcedure } from '../../trpc';
import {
  CreateAssignmentInputSchema,
  UpdateAssignmentInputSchema,
  ListAssignmentsInputSchema,
  UpdateAssignmentStatusInputSchema,
  RecordGradeInputSchema,
  LinkNotesInputSchema,
  UnlinkNoteInputSchema,
  GetDueAssignmentsInputSchema,
} from '@loqi-notes/shared-types';
import {
  createAssignment,
  listAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  updateAssignmentStatus,
  markComplete,
  recordGrade,
  linkNotes,
  unlinkNote,
  getDueAssignments,
  getUpcomingAssignments,
} from './service';

export const assignmentsRouter = router({
  create: protectedProcedure
    .input(CreateAssignmentInputSchema)
    .mutation(async ({ input, ctx }) => {
      return createAssignment(ctx.user.id, input, ctx.db);
    }),

  list: protectedProcedure
    .input(ListAssignmentsInputSchema.optional().default({}))
    .query(async ({ input, ctx }) => {
      return listAssignments(ctx.user.id, input, ctx.db);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return getAssignmentById(ctx.user.id, input.id, ctx.db);
    }),

  update: protectedProcedure
    .input(UpdateAssignmentInputSchema)
    .mutation(async ({ input, ctx }) => {
      return updateAssignment(ctx.user.id, input, ctx.db);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      return deleteAssignment(ctx.user.id, input.id, ctx.db);
    }),

  updateStatus: protectedProcedure
    .input(UpdateAssignmentStatusInputSchema)
    .mutation(async ({ input, ctx }) => {
      return updateAssignmentStatus(ctx.user.id, input, ctx.db);
    }),

  markComplete: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      grade: z.number().min(0).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return markComplete(ctx.user.id, input.id, input.grade, ctx.db);
    }),

  recordGrade: protectedProcedure
    .input(RecordGradeInputSchema)
    .mutation(async ({ input, ctx }) => {
      return recordGrade(ctx.user.id, input, ctx.db);
    }),

  linkNotes: protectedProcedure
    .input(LinkNotesInputSchema)
    .mutation(async ({ input, ctx }) => {
      return linkNotes(ctx.user.id, input, ctx.db);
    }),

  unlinkNote: protectedProcedure
    .input(UnlinkNoteInputSchema)
    .mutation(async ({ input, ctx }) => {
      return unlinkNote(ctx.user.id, input, ctx.db);
    }),

  getDue: protectedProcedure
    .input(GetDueAssignmentsInputSchema.optional().default({}))
    .query(async ({ input, ctx }) => {
      return getDueAssignments(ctx.user.id, input, ctx.db);
    }),

  getUpcoming: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).optional().default(10) }).optional().default({}))
    .query(async ({ input, ctx }) => {
      return getUpcomingAssignments(ctx.user.id, input.limit ?? 10, ctx.db);
    }),
});
