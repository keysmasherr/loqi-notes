import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { config } from '../config';

const connectionString = config.database.url;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

// Create postgres client
const queryClient = postgres(connectionString);

// Create drizzle instance
export const db = drizzle(queryClient, { schema });

export * from './schema';
