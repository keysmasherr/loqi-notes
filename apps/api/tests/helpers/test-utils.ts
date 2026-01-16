import { createClient } from '@supabase/supabase-js';
import request from 'supertest';
import { app } from '../../src/server';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface TestUser {
  id: string;
  email: string;
  accessToken: string;
}

/**
 * Creates a test user and returns auth credentials
 * IMPORTANT: Use environment variable for password, never hardcode
 */
export async function createTestUser(): Promise<TestUser> {
  const email = `test-${Date.now()}@loqi.test`;
  const password = process.env.TEST_NEW_USER_PASSWORD;

  if (!password) {
    throw new Error('TEST_NEW_USER_PASSWORD environment variable is required for creating test users');
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error || !data.user || !data.session) {
    throw new Error(`Failed to create test user: ${error?.message}`);
  }

  return {
    id: data.user.id,
    email,
    accessToken: data.session.access_token,
  };
}

/**
 * Signs in an existing user and returns auth credentials
 */
export async function signInTestUser(email: string, password: string): Promise<TestUser> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user || !data.session) {
    throw new Error(`Failed to sign in: ${error?.message}`);
  }

  return {
    id: data.user.id,
    email,
    accessToken: data.session.access_token,
  };
}

/**
 * Cleans up test user (sign out)
 */
export async function cleanupTestUser(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Makes an authenticated tRPC request
 */
export function makeTRPCRequest(
  procedure: string,
  body: Record<string, unknown>,
  accessToken?: string
) {
  const req = request(app)
    .post(`/api/v1/trpc/${procedure}`)
    .send(body);

  if (accessToken) {
    req.set('Authorization', `Bearer ${accessToken}`);
  }

  return req;
}

/**
 * Makes an unauthenticated tRPC request (for testing auth rejection)
 */
export function makeUnauthenticatedRequest(
  procedure: string,
  body: Record<string, unknown>
) {
  return makeTRPCRequest(procedure, body);
}

/**
 * Extracts data from tRPC response
 */
export function extractTRPCData<T>(response: request.Response): T | null {
  if (response.body?.result?.data) {
    return response.body.result.data as T;
  }
  return null;
}

/**
 * Extracts error from tRPC response
 */
export function extractTRPCError(response: request.Response): {
  code: string;
  message: string;
} | null {
  if (response.body?.error) {
    return response.body.error;
  }
  return null;
}

/**
 * Checks if response is UNAUTHORIZED
 */
export function isUnauthorized(response: request.Response): boolean {
  const error = extractTRPCError(response);
  return error?.code === 'UNAUTHORIZED';
}

/**
 * Test helper to verify auth rejection
 */
export async function testAuthRejection(procedure: string, body: Record<string, unknown>) {
  const response = await makeUnauthenticatedRequest(procedure, body);
  return {
    passed: isUnauthorized(response),
    response,
  };
}

export { app, request };
