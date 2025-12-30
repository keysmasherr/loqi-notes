import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { supabase } from '../lib/supabase';
import { db } from '../db';
import { logger } from '../lib/logger';

export const createContext = async ({ req, res }: CreateExpressContextOptions) => {
  // Extract authorization token from header
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

export type Context = Awaited<ReturnType<typeof createContext>>;
