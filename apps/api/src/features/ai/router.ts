/**
 * AI Router
 * tRPC router for AI-powered features (RAG queries, etc.)
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../../trpc';
import { askQuestion } from './service';

/**
 * Input schema for RAG query
 */
const AskInputSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(1000, 'Query too long'),
  filters: z
    .object({
      courseId: z.string().optional(),
      dateRange: z
        .object({
          start: z.date(),
          end: z.date(),
        })
        .optional(),
    })
    .optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export const aiRouter = router({
  /**
   * Ask a question using RAG (Retrieval-Augmented Generation)
   * Retrieves relevant note chunks and uses Claude to generate an answer
   */
  ask: protectedProcedure.input(AskInputSchema).mutation(async ({ input, ctx }) => {
    return askQuestion(ctx.user.id, input);
  }),
});
