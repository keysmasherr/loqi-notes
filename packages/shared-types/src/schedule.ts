import { z } from 'zod';

// Event type for unified schedule view
export const ScheduleEventTypeSchema = z.enum([
  'class',
  'assignment',
  'exam',
  'study_session',
  'office_hours',
  'generic',
]);
export type ScheduleEventType = z.infer<typeof ScheduleEventTypeSchema>;

// Unified schedule event (for calendar views)
export const ScheduleEventSchema = z.object({
  id: z.string().uuid(),
  type: ScheduleEventTypeSchema,
  title: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  startTime: z.date(),
  endTime: z.date(),
  isAllDay: z.boolean(),
  color: z.string(),

  // Reference to source entity
  sourceType: z.enum(['class_schedule', 'assignment', 'study_session', 'calendar_event']),
  sourceId: z.string().uuid(),

  // Optional course info
  course: z.object({
    id: z.string().uuid(),
    name: z.string(),
    code: z.string().nullable(),
  }).nullable(),

  // Additional metadata based on type
  metadata: z.record(z.unknown()).optional(),
});
export type ScheduleEvent = z.infer<typeof ScheduleEventSchema>;

// Get Events Input
export const GetEventsInputSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  types: z.array(ScheduleEventTypeSchema).optional(),
  courseIds: z.array(z.string().uuid()).optional(),
});
export type GetEventsInput = z.infer<typeof GetEventsInputSchema>;

// Get Day Input
export const GetDayInputSchema = z.object({
  date: z.date(),
});
export type GetDayInput = z.infer<typeof GetDayInputSchema>;

// Get Week Input
export const GetWeekInputSchema = z.object({
  startOfWeek: z.date(), // Should be a Monday/Sunday based on user preference
});
export type GetWeekInput = z.infer<typeof GetWeekInputSchema>;

// Get Month Input
export const GetMonthInputSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});
export type GetMonthInput = z.infer<typeof GetMonthInputSchema>;

// Free Slot
export const FreeSlotSchema = z.object({
  startTime: z.date(),
  endTime: z.date(),
  durationMinutes: z.number().int(),
  score: z.number().min(0).max(100), // Quality score based on various factors
});
export type FreeSlot = z.infer<typeof FreeSlotSchema>;

// Find Free Slots Input
export const FindFreeSlotsInputSchema = z.object({
  date: z.date(),
  minDurationMinutes: z.number().int().min(15).max(480).optional().default(30),
  preferredTimeOfDay: z.enum(['morning', 'afternoon', 'evening', 'any']).optional().default('any'),
  limit: z.number().int().min(1).max(20).optional().default(5),
});
export type FindFreeSlotsInput = z.infer<typeof FindFreeSlotsInputSchema>;

// Today's Schedule Response
export const TodayScheduleSchema = z.object({
  date: z.date(),
  classes: z.array(ScheduleEventSchema),
  assignments: z.array(ScheduleEventSchema),
  studySessions: z.array(ScheduleEventSchema),
  upcomingDeadlines: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    dueDate: z.date(),
    type: z.string(),
    priority: z.string(),
    courseName: z.string().nullable(),
  })),
});
export type TodaySchedule = z.infer<typeof TodayScheduleSchema>;

// Week View Response
export const WeekViewSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  days: z.array(z.object({
    date: z.date(),
    dayOfWeek: z.number().int().min(0).max(6),
    events: z.array(ScheduleEventSchema),
  })),
  summary: z.object({
    totalClasses: z.number().int(),
    totalStudySessions: z.number().int(),
    upcomingDeadlines: z.number().int(),
    totalStudyHours: z.number(),
  }),
});
export type WeekView = z.infer<typeof WeekViewSchema>;
