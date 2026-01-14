import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context';
import { AppError } from '../utils/errors';
import superjson from 'superjson';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.code === 'BAD_REQUEST' && error.cause
            ? error.cause
            : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Helper to convert AppError to TRPCError
function toTRPCErrorCode(code: string): TRPCError['code'] {
  const codeMap: Record<string, TRPCError['code']> = {
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    VALIDATION_ERROR: 'BAD_REQUEST',
    CONFLICT: 'CONFLICT',
    RATE_LIMIT_EXCEEDED: 'TOO_MANY_REQUESTS',
    AI_QUOTA_EXCEEDED: 'TOO_MANY_REQUESTS',
  };
  return codeMap[code] || 'INTERNAL_SERVER_ERROR';
}

// Middleware to convert AppError to TRPCError
const errorHandler = t.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    if (error instanceof AppError) {
      throw new TRPCError({
        code: toTRPCErrorCode(error.code),
        message: error.message,
        cause: error,
      });
    }
    throw error;
  }
});

// Middleware to check if user is authenticated
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(errorHandler).use(isAuthed);
