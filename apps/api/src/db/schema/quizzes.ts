import { pgTable, uuid, text, timestamp, integer, jsonb, decimal } from 'drizzle-orm/pg-core';
import { users } from './users';
import { notes } from './notes';

export const quizzes = pgTable('quizzes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  noteId: uuid('note_id').references(() => notes.id, { onDelete: 'set null' }),

  title: text('title').notNull(),
  description: text('description'),

  // Quiz content
  questions: jsonb('questions').notNull(),
  totalQuestions: integer('total_questions').notNull(),

  // Quiz settings
  difficulty: text('difficulty').notNull().default('medium'),
  timeLimitMinutes: integer('time_limit_minutes'),

  // Stats
  attemptsCount: integer('attempts_count').notNull().default(0),
  avgScore: decimal('avg_score', { precision: 5, scale: 2 }),

  // Generation metadata
  generatedByModel: text('generated_by_model'),
  sourceNoteIds: uuid('source_note_ids').array(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const quizAttempts = pgTable('quiz_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  quizId: uuid('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Results
  answers: jsonb('answers').notNull(),
  score: integer('score').notNull(),
  total: integer('total').notNull(),
  percentage: decimal('percentage', { precision: 5, scale: 2 }),

  // Timing
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  timeSpentSeconds: integer('time_spent_seconds'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Quiz = typeof quizzes.$inferSelect;
export type NewQuiz = typeof quizzes.$inferInsert;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type NewQuizAttempt = typeof quizAttempts.$inferInsert;
