import { z } from 'zod';

// Class type enum
export const ClassTypeSchema = z.enum(['lecture', 'lab', 'discussion', 'office_hours', 'other']);
export type ClassType = z.infer<typeof ClassTypeSchema>;

// Day of week (0 = Sunday, 6 = Saturday)
export const DayOfWeekSchema = z.number().int().min(0).max(6);
export type DayOfWeek = z.infer<typeof DayOfWeekSchema>;

// Course Schema
export const CourseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  code: z.string().nullable(),
  section: z.string().nullable(),
  instructor: z.string().nullable(),
  location: z.string().nullable(),
  color: z.string(),
  term: z.string().nullable(),
  startDate: z.string().nullable(), // ISO date string
  endDate: z.string().nullable(),
  credits: z.number().int().nullable(),
  description: z.string().nullable(),
  googleCalendarId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});
export type Course = z.infer<typeof CourseSchema>;

// Class Schedule Schema
export const ClassScheduleSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  courseId: z.string().uuid(),
  dayOfWeek: DayOfWeekSchema,
  startTime: z.string(), // HH:mm format
  endTime: z.string(),
  location: z.string().nullable(),
  classType: ClassTypeSchema,
  recurrenceRule: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ClassSchedule = z.infer<typeof ClassScheduleSchema>;

// Create Course Input
export const CreateCourseInputSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().max(20).optional(),
  section: z.string().max(20).optional(),
  instructor: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#3B82F6'),
  term: z.string().max(50).optional(),
  startDate: z.string().optional(), // ISO date string
  endDate: z.string().optional(),
  credits: z.number().int().min(0).max(20).optional(),
  description: z.string().max(1000).optional(),
});
export type CreateCourseInput = z.infer<typeof CreateCourseInputSchema>;

// Update Course Input
export const UpdateCourseInputSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  code: z.string().max(20).optional().nullable(),
  section: z.string().max(20).optional().nullable(),
  instructor: z.string().max(100).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  term: z.string().max(50).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  credits: z.number().int().min(0).max(20).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
});
export type UpdateCourseInput = z.infer<typeof UpdateCourseInputSchema>;

// List Courses Input
export const ListCoursesInputSchema = z.object({
  term: z.string().optional(),
  includeDeleted: z.boolean().optional().default(false),
});
export type ListCoursesInput = z.infer<typeof ListCoursesInputSchema>;

// Add Class Schedule Input
export const AddClassScheduleInputSchema = z.object({
  courseId: z.string().uuid(),
  dayOfWeek: DayOfWeekSchema,
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/), // HH:mm format
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  location: z.string().max(200).optional(),
  classType: ClassTypeSchema.optional().default('lecture'),
  recurrenceRule: z.string().optional(),
});
export type AddClassScheduleInput = z.infer<typeof AddClassScheduleInputSchema>;

// Update Class Schedule Input
export const UpdateClassScheduleInputSchema = z.object({
  id: z.string().uuid(),
  dayOfWeek: DayOfWeekSchema.optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  location: z.string().max(200).optional().nullable(),
  classType: ClassTypeSchema.optional(),
  recurrenceRule: z.string().optional().nullable(),
});
export type UpdateClassScheduleInput = z.infer<typeof UpdateClassScheduleInputSchema>;

// Course with schedules
export const CourseWithSchedulesSchema = CourseSchema.extend({
  classSchedules: z.array(ClassScheduleSchema),
});
export type CourseWithSchedules = z.infer<typeof CourseWithSchedulesSchema>;
