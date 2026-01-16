/**
 * Real Authentication E2E Integration Test for Notes Feature
 * Uses actual Supabase authentication with test user
 * Verifies CRUD operations and database state
 *
 * This test can be run with: npm test -- --config jest.integration.config.js notes.real-auth.integration.test.ts
 */

import request from 'supertest';
import { createClient } from '@supabase/supabase-js';
import { app } from '../../../src/server';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

describe('Notes Feature - Real Authentication Integration Tests', () => {
  let accessToken: string;
  let userId: string;
  let createdNoteId: string;
  let noteVersion: number;

  beforeAll(async () => {
    try {
      const email = process.env.TEST_USER_EMAIL;
      const password = process.env.TEST_USER_PASSWORD;

      if (!email || !password) {
        throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables are required');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user || !data.session) {
        throw new Error(`Failed to sign in: ${error?.message}`);
      }

      accessToken = data.session.access_token;
      userId = data.user.id;

      console.log(`\n✓ Authenticated as: ${email} (${userId})\n`);
    } catch (error) {
      console.error('Failed to authenticate:', error);
      throw error;
    }
  });

  describe('CREATE Note', () => {
    it('should create a new note with authenticated user', async () => {
      const noteData = {
        title: 'Real Auth Integration Test Note',
        content: '<p>This is a real integration test with actual Supabase auth</p>',
        hasHandwriting: false,
        clientId: `test-real-${Date.now()}`,
      };

      const response = await request(app)
        .post('/api/v1/trpc/notes.create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(noteData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('result');

      // Data is wrapped in json due to superjson transformer
      const data = response.body.result?.data?.json || response.body.result?.data;
      expect(data).toBeDefined();
      expect(data.id).toBeDefined();
      expect(data.title).toBe(noteData.title);
      expect(data.userId).toBe(userId);

      createdNoteId = data.id;
      noteVersion = data.version || 1;

      console.log(`✓ CREATE: Successfully created note ${createdNoteId}`);
    });
  });

  describe('READ (List) Notes', () => {
    it('should list notes for authenticated user', async () => {
      const input = encodeURIComponent(JSON.stringify({ limit: 10, offset: 0 }));
      const response = await request(app)
        .get(`/api/v1/trpc/notes.list?input=${input}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('result');

      const data = response.body.result?.data?.json || response.body.result?.data;
      expect(data.notes).toBeDefined();
      expect(Array.isArray(data.notes)).toBe(true);
      expect(data.total).toBeGreaterThanOrEqual(0);

      const foundNote = data.notes.find((note: any) => note.id === createdNoteId);
      expect(foundNote).toBeDefined();

      console.log(`✓ LIST: Retrieved ${data.notes.length} notes (total: ${data.total})`);
    });
  });

  describe('READ (Single) Note', () => {
    it('should retrieve a single note by ID', async () => {
      const input = encodeURIComponent(JSON.stringify({ id: createdNoteId }));
      const response = await request(app)
        .get(`/api/v1/trpc/notes.getById?input=${input}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('result');

      const data = response.body.result?.data?.json || response.body.result?.data;
      expect(data.id).toBe(createdNoteId);
      expect(data.userId).toBe(userId);
      expect(data.title).toBeDefined();

      console.log(`✓ GET BY ID: Retrieved note "${data.title}"`);
    });
  });

  describe('UPDATE Note', () => {
    it('should update a note', async () => {
      const updateData = {
        id: createdNoteId,
        title: 'Updated Real Auth Test Note',
        content: '<p>This note has been updated via real auth test</p>',
        version: noteVersion,
      };

      const response = await request(app)
        .post('/api/v1/trpc/notes.update')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('result');

      const data = response.body.result?.data?.json || response.body.result?.data;
      expect(data.id).toBe(createdNoteId);
      expect(data.title).toBe(updateData.title);
      expect(data.version).toBeGreaterThan(noteVersion);

      noteVersion = data.version;

      console.log(`✓ UPDATE: Updated note to version ${noteVersion}`);
    });
  });

  describe('DELETE Note (Soft Delete)', () => {
    it('should soft delete a note', async () => {
      const response = await request(app)
        .post('/api/v1/trpc/notes.delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ id: createdNoteId });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('result');

      const data = response.body.result?.data?.json || response.body.result?.data;
      expect(data.success).toBe(true);

      console.log(`✓ DELETE: Soft deleted note ${createdNoteId}`);
    });
  });

  describe('RESTORE Note', () => {
    it('should restore a deleted note', async () => {
      const response = await request(app)
        .post('/api/v1/trpc/notes.restore')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ id: createdNoteId });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('result');

      const data = response.body.result?.data?.json || response.body.result?.data;
      expect(data.id).toBe(createdNoteId);
      expect(data.deletedAt).toBeNull();

      console.log(`✓ RESTORE: Restored note ${createdNoteId}`);
    });
  });

  afterAll(async () => {
    if (createdNoteId) {
      // Final cleanup - soft delete the test note
      try {
        await request(app)
          .post('/api/v1/trpc/notes.delete')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ id: createdNoteId });

        console.log(`✓ CLEANUP: Deleted test note ${createdNoteId}\n`);
      } catch (error) {
        console.error('Error cleaning up test note:', error);
      }
    }
  });
});
