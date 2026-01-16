// Jest setup file for integration tests
// Loads real environment variables from .env file (no mocking)

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file from the apps/api directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Also try loading from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Set test environment
process.env.NODE_ENV = 'test';

// Verify required env vars are loaded
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`Warning: ${envVar} is not set. Integration tests may fail.`);
  }
}
