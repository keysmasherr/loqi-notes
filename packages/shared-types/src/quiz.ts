import { z } from 'zod';

export const DifficultySchema = z.enum(['easy', 'medium', 'hard', 'mixed']);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const QuizQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()),
  correctAnswer: z.number().int().min(0),
  explanation: z.string().optional(),
});
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export const QuizSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  noteId: z.string().uuid().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  questions: z.array(QuizQuestionSchema),
  totalQuestions: z.number().int().min(1),
  difficulty: DifficultySchema,
  timeLimitMinutes: z.number().int().nullable(),
  attemptsCount: z.number().int().min(0),
  avgScore: z.number().nullable(),
  generatedByModel: z.string().nullable(),
  sourceNoteIds: z.array(z.string().uuid()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});
export type Quiz = z.infer<typeof QuizSchema>;

export const GenerateQuizInputSchema = z.object({
  noteId: z.string().uuid().optional(),
  noteIds: z.array(z.string().uuid()).optional(),
  difficulty: DifficultySchema.optional().default('medium'),
  questionCount: z.number().int().min(1).max(20).optional().default(5),
  timeLimitMinutes: z.number().int().min(1).optional(),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

export const QuizAnswerSchema = z.object({
  questionId: z.string(),
  selectedAnswer: z.number().int().min(0),
  isCorrect: z.boolean(),
  timeSpentSeconds: z.number().int().min(0).optional(),
});
export type QuizAnswer = z.infer<typeof QuizAnswerSchema>;

export const SubmitQuizAttemptInputSchema = z.object({
  quizId: z.string().uuid(),
  answers: z.array(QuizAnswerSchema),
  timeSpentSeconds: z.number().int().min(0).optional(),
});
export type SubmitQuizAttemptInput = z.infer<typeof SubmitQuizAttemptInputSchema>;

export const QuizAttemptSchema = z.object({
  id: z.string().uuid(),
  quizId: z.string().uuid(),
  userId: z.string().uuid(),
  answers: z.array(QuizAnswerSchema),
  score: z.number().int().min(0),
  total: z.number().int().min(1),
  percentage: z.number().min(0).max(100),
  startedAt: z.date(),
  completedAt: z.date().nullable(),
  timeSpentSeconds: z.number().int().nullable(),
  createdAt: z.date(),
});
export type QuizAttempt = z.infer<typeof QuizAttemptSchema>;
