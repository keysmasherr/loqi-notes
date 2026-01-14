import { z } from 'zod';

// Session type enum
export const SessionTypeSchema = z.enum([
  'study',
  'review',
  'practice',
  'reading',
  'writing',
  'other',
]);
export type SessionType = z.infer<typeof SessionTypeSchema>;

// Session status enum
export const SessionStatusSchema = z.enum([
  'scheduled',
  'in_progress',
  'completed',
  'skipped',
  'cancelled',
]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

// Study goal
export const StudyGoalSchema = z.object({
  description: z.string(),
  completed: z.boolean(),
});
export type StudyGoal = z.infer<typeof StudyGoalSchema>;

// Study Session Schema
export const StudySessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  courseId: z.string().uuid().nullable(),
  assignmentId: z.string().uuid().nullable(),
  title: z.string().nullable(),
  scheduledStart: z.date(),
  scheduledEnd: z.date(),
  actualStart: z.date().nullable(),
  actualEnd: z.date().nullable(),
  sessionType: SessionTypeSchema,
  includeReviews: z.boolean(),
  goals: z.array(StudyGoalSchema),
  status: SessionStatusSchema,
  productivityRating: z.number().int().min(1).max(5).nullable(),
  notes: z.string().nullable(),
  recurrenceRule: z.string().nullable(),
  googleEventId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type StudySession = z.infer<typeof StudySessionSchema>;

// Create Study Session Input
export const CreateStudySessionInputSchema = z.object({
  courseId: z.string().uuid().optional(),
  assignmentId: z.string().uuid().optional(),
  title: z.string().max(200).optional(),
  scheduledStart: z.date(),
  scheduledEnd: z.date(),
  sessionType: SessionTypeSchema.optional().default('study'),
  includeReviews: z.boolean().optional().default(false),
  reviewNoteIds: z.array(z.string().uuid()).optional(),
  goals: z.array(z.object({
    description: z.string().min(1).max(500),
    completed: z.boolean().optional().default(false),
  })).optional().default([]),
  recurrenceRule: z.string().optional(),
});
export type CreateStudySessionInput = z.infer<typeof CreateStudySessionInputSchema>;

// Update Study Session Input
export const UpdateStudySessionInputSchema = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid().optional().nullable(),
  assignmentId: z.string().uuid().optional().nullable(),
  title: z.string().max(200).optional().nullable(),
  scheduledStart: z.date().optional(),
  scheduledEnd: z.date().optional(),
  sessionType: SessionTypeSchema.optional(),
  includeReviews: z.boolean().optional(),
  reviewNoteIds: z.array(z.string().uuid()).optional(),
  goals: z.array(StudyGoalSchema).optional(),
  recurrenceRule: z.string().optional().nullable(),
});
export type UpdateStudySessionInput = z.infer<typeof UpdateStudySessionInputSchema>;

// Start Session Input
export const StartSessionInputSchema = z.object({
  id: z.string().uuid(),
});
export type StartSessionInput = z.infer<typeof StartSessionInputSchema>;

// Complete Session Input
export const CompleteSessionInputSchema = z.object({
  id: z.string().uuid(),
  productivityRating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(2000).optional(),
  goals: z.array(StudyGoalSchema).optional(), // Update goal completion status
});
export type CompleteSessionInput = z.infer<typeof CompleteSessionInputSchema>;

// Skip Session Input
export const SkipSessionInputSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().max(500).optional(),
});
export type SkipSessionInput = z.infer<typeof SkipSessionInputSchema>;

// List Study Sessions Input
export const ListStudySessionsInputSchema = z.object({
  courseId: z.string().uuid().optional(),
  assignmentId: z.string().uuid().optional(),
  status: SessionStatusSchema.optional(),
  sessionType: SessionTypeSchema.optional(),
  fromDate: z.date().optional(),
  toDate: z.date().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});
export type ListStudySessionsInput = z.infer<typeof ListStudySessionsInputSchema>;

// Study Session with details
export const StudySessionWithDetailsSchema = StudySessionSchema.extend({
  course: z.object({
    id: z.string().uuid(),
    name: z.string(),
    code: z.string().nullable(),
    color: z.string(),
  }).nullable(),
  assignment: z.object({
    id: z.string().uuid(),
    title: z.string(),
    dueDate: z.date(),
  }).nullable(),
});
export type StudySessionWithDetails = z.infer<typeof StudySessionWithDetailsSchema>;
