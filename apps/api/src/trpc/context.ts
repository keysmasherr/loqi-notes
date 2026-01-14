import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { db } from '../db';
import { logger } from '../lib/logger';

export interface Context {
  req: CreateExpressContextOptions['req'];
  res: CreateExpressContextOptions['res'];
  db: typeof db;
  session: { user: User } | null;
  user: User | null;
  logger: typeof logger;
}

export const createContext = async ({ req, res }: CreateExpressContextOptions): Promise<Context> => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  // Verify session with Supabase if token exists
  let session = null;
  let user = null;

  if (token) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) {
        user = data.user;
        session = { user: data.user };
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to verify auth token');
    }
  }

  return {
    req,
    res,
    db,
    session,
    user,
    logger,
  };
};
