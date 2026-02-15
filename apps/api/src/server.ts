import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { serve } from 'inngest/express';
import { appRouter } from './trpc/router';
import { createContext } from './trpc/context';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './lib/logger';
import { inngest } from './lib/inngest';
import * as jobs from './jobs';

const app: Express = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, 'Incoming request');
  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// tRPC middleware
app.use(
  '/api/v1/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ error, type, path }) {
      logger.error({ error, type, path }, 'tRPC error occurred');
    },
  })
);

// Inngest serve endpoint
app.use(
  '/api/inngest',
  serve({
    client: inngest,
    functions: Object.values(jobs),
  })
);

// Error handler (must be last)
app.use(errorHandler);

export { app };
