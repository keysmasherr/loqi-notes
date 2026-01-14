import { router } from './index';
import { authRouter } from '../features/auth/router';
import { notesRouter } from '../features/notes/router';
import { tagsRouter } from '../features/tags/router';
import { coursesRouter } from '../features/courses/router';
import { assignmentsRouter } from '../features/assignments/router';
import { studySessionsRouter } from '../features/study-sessions/router';
import { scheduleRouter } from '../features/schedule/router';
import type { AnyRouter } from '@trpc/server';

export const appRouter = router({
  auth: authRouter,
  notes: notesRouter,
  tags: tagsRouter,
  courses: coursesRouter,
  assignments: assignmentsRouter,
  studySessions: studySessionsRouter,
  schedule: scheduleRouter,
}) as AnyRouter;

export type AppRouter = typeof appRouter;
