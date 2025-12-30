import { z } from 'zod';

export const ReviewQualitySchema = z.number().int().min(0).max(5);
export type ReviewQuality = z.infer<typeof ReviewQualitySchema>;

export const ReviewScheduleSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  noteId: z.string().uuid(),
  nextReviewAt: z.date(),
  intervalDays: z.number().int().min(1),
  easeFactor: z.number().min(1.3),
  repetitionCount: z.number().int().min(0),
  lastQuality: z.number().int().min(0).max(5).nullable(),
  lastReviewedAt: z.date().nullable(),
  totalReviews: z.number().int().min(0),
  streakCount: z.number().int().min(0),
  isPaused: z.boolean(),
  pausedUntil: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ReviewSchedule = z.infer<typeof ReviewScheduleSchema>;

export const RecordReviewInputSchema = z.object({
  noteId: z.string().uuid(),
  quality: ReviewQualitySchema,
});
export type RecordReviewInput = z.infer<typeof RecordReviewInputSchema>;

export const StudyStatsSchema = z.object({
  totalNotes: z.number().int().min(0),
  dueToday: z.number().int().min(0),
  reviewedToday: z.number().int().min(0),
  currentStreak: z.number().int().min(0),
  totalReviews: z.number().int().min(0),
  averageQuality: z.number().min(0).max(5).nullable(),
});
export type StudyStats = z.infer<typeof StudyStatsSchema>;
