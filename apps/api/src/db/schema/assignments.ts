import { pgTable, uuid, text, timestamp, decimal, jsonb, primaryKey } from 'drizzle-orm/pg-core';
import { users } from './users';
import { courses } from './courses';
import { notes } from './notes';

export const assignments = pgTable('assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'set null' }),

  // Assignment info
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull().default('assignment'), // assignment, exam, quiz, project, paper, presentation, other

  // Dates
  dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),

  // Priority and status
  priority: text('priority').notNull().default('medium'), // low, medium, high, urgent
  status: text('status').notNull().default('pending'), // pending, in_progress, completed, submitted, graded, cancelled

  // Grading
  weight: decimal('weight', { precision: 5, scale: 2 }),
  grade: decimal('grade', { precision: 5, scale: 2 }),
  maxGrade: decimal('max_grade', { precision: 5, scale: 2 }).notNull().default('100'),
  feedback: text('feedback'),

  // Reminders (JSONB array)
  reminderSettings: jsonb('reminder_settings').notNull().default([]),

  // Google Calendar sync
  googleEventId: text('google_event_id'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// Junction table for assignment-note relationships
export const assignmentNotes = pgTable('assignment_notes', {
  assignmentId: uuid('assignment_id').notNull().references(() => assignments.id, { onDelete: 'cascade' }),
  noteId: uuid('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.assignmentId, table.noteId] }),
}));

export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;
export type AssignmentNote = typeof assignmentNotes.$inferSelect;
export type NewAssignmentNote = typeof assignmentNotes.$inferInsert;
