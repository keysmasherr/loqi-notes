/**
 * Authenticated E2E Integration Test for Notes Feature
 * Tests CRUD operations with real Supabase authentication
 * Verifies database state after each operation
 */

import request from 'supertest';
import { app } from '../../../src/server';
import { signInTestUser, extractTRPCData } from '../../helpers/test-utils';

describe('Notes Feature - Authenticated CRUD Tests', () => {
  let accessToken: string;
  let userId: string;
  let createdNoteId: string;
  let noteVersion: number;

  // Sign in before running tests
  beforeAll(async () => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;

    if (!email || !password) {
      throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables are required');
    }

    try {
      const testUser = await signInTestUser(email, password);
      accessToken = testUser.accessToken;
      userId = testUser.id;
      console.log(`Authenticated as: ${testUser.email} (${userId})`);
    } catch (error) {
      console.error('Failed to authenticate:', error);
      throw error;
    }
  });

  describe('CREATE Note', () => {
    it('should create a new note with authenticated user', async () => {
      const noteData = {
        title: 'Integration Test Note',
        content: '<p>This is a test note for integration testing</p>',
        hasHandwriting: false,
        clientId: `test-client-${Date.now()}`,
      };

      const response = await request(app)
        .post('/api/v1/trpc/notes.create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(noteData);

      console.log('CREATE Response Status:', response.status);
      console.log('CREATE Response Body:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);

      const data = extractTRPCData<{ id: string; title: string; content: string; userId: string; version: number }>(response);
      expect(data).not.toBeNull();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('title', noteData.title);
      expect(data).toHaveProperty('content', noteData.content);
      expect(data).toHaveProperty('userId', userId);

      createdNoteId = data!.id;
      noteVersion = data!.version || 1;
      console.log(`Created note with ID: ${createdNoteId}`);
    });
  });

  describe('READ (List) Notes', () => {
    it('should list notes for authenticated user', async () => {
      const input = encodeURIComponent(JSON.stringify({ limit: 10, offset: 0 }));
      const response = await request(app)
        .get(`/api/v1/trpc/notes.list?input=${input}`)
        .set('Authorization', `Bearer ${accessToken}`);

      console.log('LIST Response Status:', response.status);
      console.log('LIST Response Body:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);

      const data = extractTRPCData<{ notes: Array<{ id: string }>; total: number }>(response);
      expect(data).not.toBeNull();
      expect(data).toHaveProperty('notes');
      expect(data).toHaveProperty('total');
      expect(Array.isArray(data!.notes)).toBe(true);

      // Verify created note is in the list
      const foundNote = data!.notes.find((note) => note.id === createdNoteId);
      expect(foundNote).toBeDefined();
      console.log(`Found ${data!.notes.length} notes in list`);
    });
  });

  describe('READ (Single) Note', () => {
    it('should retrieve a single note by ID', async () => {
      const input = encodeURIComponent(JSON.stringify({ id: createdNoteId }));
      const response = await request(app)
        .get(`/api/v1/trpc/notes.getById?input=${input}`)
        .set('Authorization', `Bearer ${accessToken}`);

      console.log('GET BY ID Response Status:', response.status);
      console.log('GET BY ID Response Body:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);

      const data = extractTRPCData(response);
      expect(data).not.toBeNull();
      expect(data).toHaveProperty('id', createdNoteId);
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('userId', userId);
    });
  });

  describe('UPDATE Note', () => {
    it('should update a note', async () => {
      const updateData = {
        id: createdNoteId,
        title: 'Updated Integration Test Note',
        content: '<p>This note has been updated</p>',
        version: noteVersion,
      };

      const response = await request(app)
        .post('/api/v1/trpc/notes.update')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      console.log('UPDATE Response Status:', response.status);
      console.log('UPDATE Response Body:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);

      const data = extractTRPCData<{ id: string; title: string; version: number }>(response);
      expect(data).not.toBeNull();
      expect(data).toHaveProperty('id', createdNoteId);
      expect(data).toHaveProperty('title', updateData.title);
      expect(data!.version).toBeGreaterThan(noteVersion);

      noteVersion = data!.version;
      console.log(`Updated note to version ${noteVersion}`);
    });
  });

  describe('DELETE Note (Soft Delete)', () => {
    it('should soft delete a note', async () => {
      const response = await request(app)
        .post('/api/v1/trpc/notes.delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ id: createdNoteId });

      console.log('DELETE Response Status:', response.status);
      console.log('DELETE Response Body:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);

      const data = extractTRPCData(response);
      expect(data).not.toBeNull();
      expect(data).toHaveProperty('success', true);
      console.log('Note soft deleted successfully');
    });
  });

  describe('RESTORE Note', () => {
    it('should restore a deleted note', async () => {
      const response = await request(app)
        .post('/api/v1/trpc/notes.restore')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ id: createdNoteId });

      console.log('RESTORE Response Status:', response.status);
      console.log('RESTORE Response Body:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);

      const data = extractTRPCData(response);
      expect(data).not.toBeNull();
      expect(data).toHaveProperty('id', createdNoteId);
      expect(data).toHaveProperty('deletedAt', null);
      console.log('Note restored successfully');
    });
  });

  // Cleanup - always run to avoid test data accumulation
  afterAll(async () => {
    if (createdNoteId) {
      // Soft delete test note
      await request(app)
        .post('/api/v1/trpc/notes.delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ id: createdNoteId });

      console.log(`Cleanup: Deleted test note ${createdNoteId}`);
    }

    // Allow connections to close to prevent Jest open handles warning
    await new Promise((resolve) => setTimeout(resolve, 500));
  });
});
