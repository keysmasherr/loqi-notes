import { z } from 'zod';

// Assignment type enum
export const AssignmentTypeSchema = z.enum([
  'assignment',
  'exam',
  'quiz',
  'project',
  'paper',
  'presentation',
  'other',
]);
export type AssignmentType = z.infer<typeof AssignmentTypeSchema>;

// Priority enum
export const PrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export type Priority = z.infer<typeof PrioritySchema>;

// Assignment status enum
export const AssignmentStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'submitted',
  'graded',
  'cancelled',
]);
export type AssignmentStatus = z.infer<typeof AssignmentStatusSchema>;

// Reminder setting
export const ReminderSettingSchema = z.object({
  type: z.literal('before'),
  amount: z.number().int().min(1),
  unit: z.enum(['minutes', 'hours', 'days', 'weeks']),
});
export type ReminderSetting = z.infer<typeof ReminderSettingSchema>;

// Assignment Schema
export const AssignmentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  courseId: z.string().uuid().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  type: AssignmentTypeSchema,
  dueDate: z.date(),
  startDate: z.date().nullable(),
  endDate: z.date().nullable(),
  priority: PrioritySchema,
  status: AssignmentStatusSchema,
  weight: z.string().nullable(), // decimal as string
  grade: z.string().nullable(),
  maxGrade: z.string(),
  feedback: z.string().nullable(),
  reminderSettings: z.array(ReminderSettingSchema),
  googleEventId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});
export type Assignment = z.infer<typeof AssignmentSchema>;

// Create Assignment Input
export const CreateAssignmentInputSchema = z.object({
  courseId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: AssignmentTypeSchema.optional().default('assignment'),
  dueDate: z.date(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  priority: PrioritySchema.optional().default('medium'),
  weight: z.number().min(0).max(100).optional(),
  maxGrade: z.number().min(0).optional().default(100),
  reminderSettings: z.array(ReminderSettingSchema).optional().default([]),
});
export type CreateAssignmentInput = z.infer<typeof CreateAssignmentInputSchema>;

// Update Assignment Input
export const UpdateAssignmentInputSchema = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  type: AssignmentTypeSchema.optional(),
  dueDate: z.date().optional(),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  priority: PrioritySchema.optional(),
  weight: z.number().min(0).max(100).optional().nullable(),
  maxGrade: z.number().min(0).optional(),
  reminderSettings: z.array(ReminderSettingSchema).optional(),
});
export type UpdateAssignmentInput = z.infer<typeof UpdateAssignmentInputSchema>;

// Update Assignment Status Input
export const UpdateAssignmentStatusInputSchema = z.object({
  id: z.string().uuid(),
  status: AssignmentStatusSchema,
});
export type UpdateAssignmentStatusInput = z.infer<typeof UpdateAssignmentStatusInputSchema>;

// Record Grade Input
export const RecordGradeInputSchema = z.object({
  id: z.string().uuid(),
  grade: z.number().min(0),
  feedback: z.string().max(2000).optional(),
});
export type RecordGradeInput = z.infer<typeof RecordGradeInputSchema>;

// Link Notes Input
export const LinkNotesInputSchema = z.object({
  assignmentId: z.string().uuid(),
  noteIds: z.array(z.string().uuid()),
});
export type LinkNotesInput = z.infer<typeof LinkNotesInputSchema>;

// Unlink Note Input
export const UnlinkNoteInputSchema = z.object({
  assignmentId: z.string().uuid(),
  noteId: z.string().uuid(),
});
export type UnlinkNoteInput = z.infer<typeof UnlinkNoteInputSchema>;

// List Assignments Input
export const ListAssignmentsInputSchema = z.object({
  courseId: z.string().uuid().optional(),
  status: AssignmentStatusSchema.optional(),
  type: AssignmentTypeSchema.optional(),
  priority: PrioritySchema.optional(),
  fromDate: z.date().optional(),
  toDate: z.date().optional(),
  includeDeleted: z.boolean().optional().default(false),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});
export type ListAssignmentsInput = z.infer<typeof ListAssignmentsInputSchema>;

// Get Due Assignments Input
export const GetDueAssignmentsInputSchema = z.object({
  days: z.number().int().min(1).max(30).optional().default(7),
});
export type GetDueAssignmentsInput = z.infer<typeof GetDueAssignmentsInputSchema>;

// Assignment with course and notes
export const AssignmentWithDetailsSchema = AssignmentSchema.extend({
  course: z.object({
    id: z.string().uuid(),
    name: z.string(),
    code: z.string().nullable(),
    color: z.string(),
  }).nullable(),
  linkedNoteIds: z.array(z.string().uuid()),
});
export type AssignmentWithDetails = z.infer<typeof AssignmentWithDetailsSchema>;
