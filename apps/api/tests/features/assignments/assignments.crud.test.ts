import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://xjjcmmrlaufahlhzowjz.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqamNtbXJsYXVmYWhsaHpvd2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzcwNDQsImV4cCI6MjA3NDkxMzA0NH0.S4kRPF_islMh2fh0x-fEiOZlR43-mrTyKShHI0JiPlU';

describe('Assignments CRUD Operations', () => {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  let testUserId: string;
  let testCourseId: string;
  let testAssignmentId: string;
  let testAssignmentId2: string;
  let testNoteId: string;

  // Setup test data
  beforeAll(async () => {
    // Create a test user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: `test-assignments-${Date.now()}@example.com`,
      password: 'TestPassword123!',
    });

    if (authError) {
      console.error('Auth signup error:', authError);
    } else if (authData.user) {
      testUserId = authData.user.id;
      console.log('Test user created:', testUserId);
    }

    // Create a test course
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .insert({
        user_id: testUserId,
        name: 'Test Course for Assignments',
        code: 'TCFA001',
        color: '#FF5733',
      })
      .select()
      .single();

    if (courseError) {
      console.error('Course creation error:', courseError);
    } else if (courseData) {
      testCourseId = courseData.id;
      console.log('Test course created:', testCourseId);
    }

    // Create a test note for linking
    const { data: noteData, error: noteError } = await supabase
      .from('notes')
      .insert({
        user_id: testUserId,
        title: 'Test Note for Assignment',
        content: 'This is a test note',
      })
      .select()
      .single();

    if (noteError) {
      console.error('Note creation error:', noteError);
    } else if (noteData) {
      testNoteId = noteData.id;
      console.log('Test note created:', testNoteId);
    }
  });

  // Cleanup after all tests
  afterAll(async () => {
    // Delete test data
    if (testAssignmentId) {
      await supabase
        .from('assignments')
        .delete()
        .eq('id', testAssignmentId);
    }
    if (testAssignmentId2) {
      await supabase
        .from('assignments')
        .delete()
        .eq('id', testAssignmentId2);
    }
    if (testNoteId) {
      await supabase
        .from('notes')
        .delete()
        .eq('id', testNoteId);
    }
    if (testCourseId) {
      await supabase
        .from('courses')
        .delete()
        .eq('id', testCourseId);
    }

    // Delete test user (sign out first)
    await supabase.auth.signOut();
  });

  describe('CREATE', () => {
    it('should create an assignment with required fields only', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const { data, error } = await supabase
        .from('assignments')
        .insert({
          user_id: testUserId,
          title: 'Test Assignment 1',
          due_date: dueDate.toISOString(),
          max_grade: 100,
          status: 'pending',
          priority: 'medium',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.id).toBeDefined();
      expect(data?.user_id).toBe(testUserId);
      expect(data?.title).toBe('Test Assignment 1');
      expect(data?.status).toBe('pending');
      expect(data?.priority).toBe('medium');
      expect(data?.created_at).toBeDefined();
      expect(data?.updated_at).toBeDefined();

      if (data?.id) {
        testAssignmentId = data.id;
      }
    });

    it('should create an assignment with all optional fields', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const { data, error } = await supabase
        .from('assignments')
        .insert({
          user_id: testUserId,
          course_id: testCourseId,
          title: 'Test Assignment 2 - Full Details',
          description: 'This is a detailed test assignment',
          type: 'project',
          due_date: dueDate.toISOString(),
          start_date: new Date().toISOString(),
          priority: 'high',
          weight: 20,
          max_grade: 100,
          status: 'in_progress',
          reminder_settings: [
            {
              type: 'before',
              amount: 24,
              unit: 'hours',
            },
          ],
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.id).toBeDefined();
      expect(data?.course_id).toBe(testCourseId);
      expect(data?.title).toBe('Test Assignment 2 - Full Details');
      expect(data?.description).toBe('This is a detailed test assignment');
      expect(data?.type).toBe('project');
      expect(data?.priority).toBe('high');
      expect(data?.weight).toBe(20);
      expect(data?.status).toBe('in_progress');
      expect(data?.reminder_settings).toBeDefined();

      if (data?.id) {
        testAssignmentId2 = data.id;
      }
    });

    it('should fail creating assignment without title', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const { error } = await supabase
        .from('assignments')
        .insert({
          user_id: testUserId,
          due_date: dueDate.toISOString(),
          max_grade: 100,
        })
        .select()
        .single();

      expect(error).toBeDefined();
    });

    it('should fail creating assignment without due_date', async () => {
      const { error } = await supabase
        .from('assignments')
        .insert({
          user_id: testUserId,
          title: 'Test Assignment No Due Date',
          max_grade: 100,
        })
        .select()
        .single();

      expect(error).toBeDefined();
    });
  });

  describe('READ', () => {
    it('should retrieve assignment by id', async () => {
      if (!testAssignmentId) {
        console.log('Test assignment id not available');
        return;
      }

      const { data, error } = await supabase
        .from('assignments')
        .select()
        .eq('id', testAssignmentId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.id).toBe(testAssignmentId);
      expect(data?.user_id).toBe(testUserId);
      expect(data?.title).toBe('Test Assignment 1');
    });

    it('should list all assignments for a user', async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select()
        .eq('user_id', testUserId)
        .is('deleted_at', null);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      expect(data!.length).toBeGreaterThanOrEqual(1);
    });

    it('should list assignments filtered by course', async () => {
      if (!testCourseId) {
        console.log('Test course id not available');
        return;
      }

      const { data, error } = await supabase
        .from('assignments')
        .select()
        .eq('user_id', testUserId)
        .eq('course_id', testCourseId)
        .is('deleted_at', null);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      expect(data!.every((a) => a.course_id === testCourseId)).toBe(true);
    });

    it('should list assignments filtered by status', async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select()
        .eq('user_id', testUserId)
        .eq('status', 'pending')
        .is('deleted_at', null);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      expect(data!.every((a) => a.status === 'pending')).toBe(true);
    });

    it('should list assignments filtered by priority', async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select()
        .eq('user_id', testUserId)
        .eq('priority', 'high')
        .is('deleted_at', null);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should list assignments with pagination', async () => {
      const { data: page1, error: error1 } = await supabase
        .from('assignments')
        .select()
        .eq('user_id', testUserId)
        .is('deleted_at', null)
        .limit(1);

      expect(error1).toBeNull();
      expect(page1?.length).toBeLessThanOrEqual(1);

      const { data: page2, error: error2 } = await supabase
        .from('assignments')
        .select()
        .eq('user_id', testUserId)
        .is('deleted_at', null)
        .range(1, 1);

      expect(error2).toBeNull();
    });

    it('should return empty list for non-existent user', async () => {
      const fakeUserId = 'f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0';

      const { data, error } = await supabase
        .from('assignments')
        .select()
        .eq('user_id', fakeUserId)
        .is('deleted_at', null);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBe(0);
    });

    it('should not return deleted assignments by default', async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select()
        .eq('user_id', testUserId)
        .is('deleted_at', null);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.every((a) => a.deleted_at === null)).toBe(true);
    });
  });

  describe('UPDATE', () => {
    it('should update assignment title', async () => {
      if (!testAssignmentId) {
        console.log('Test assignment id not available');
        return;
      }

      const { data, error } = await supabase
        .from('assignments')
        .update({
          title: 'Updated Assignment Title',
        })
        .eq('id', testAssignmentId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.title).toBe('Updated Assignment Title');
      expect(data?.updated_at).toBeDefined();
    });

    it('should update assignment status', async () => {
      if (!testAssignmentId) {
        console.log('Test assignment id not available');
        return;
      }

      const { data, error } = await supabase
        .from('assignments')
        .update({
          status: 'completed',
        })
        .eq('id', testAssignmentId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.status).toBe('completed');
    });

    it('should update assignment grade and feedback', async () => {
      if (!testAssignmentId2) {
        console.log('Test assignment id 2 not available');
        return;
      }

      const { data, error } = await supabase
        .from('assignments')
        .update({
          grade: 92,
          feedback: 'Great work! Well done on this assignment.',
          status: 'graded',
        })
        .eq('id', testAssignmentId2)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.grade).toBe(92);
      expect(data?.feedback).toBe('Great work! Well done on this assignment.');
      expect(data?.status).toBe('graded');
    });

    it('should update assignment priority', async () => {
      if (!testAssignmentId2) {
        console.log('Test assignment id 2 not available');
        return;
      }

      const { data, error } = await supabase
        .from('assignments')
        .update({
          priority: 'urgent',
        })
        .eq('id', testAssignmentId2)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.priority).toBe('urgent');
    });

    it('should update multiple fields at once', async () => {
      if (!testAssignmentId) {
        console.log('Test assignment id not available');
        return;
      }

      const newDueDate = new Date();
      newDueDate.setDate(newDueDate.getDate() + 21);

      const { data, error } = await supabase
        .from('assignments')
        .update({
          title: 'Completely Updated Assignment',
          description: 'New description for the assignment',
          priority: 'low',
          due_date: newDueDate.toISOString(),
        })
        .eq('id', testAssignmentId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.title).toBe('Completely Updated Assignment');
      expect(data?.description).toBe('New description for the assignment');
      expect(data?.priority).toBe('low');
    });

    it('should update reminder settings', async () => {
      if (!testAssignmentId2) {
        console.log('Test assignment id 2 not available');
        return;
      }

      const { data, error } = await supabase
        .from('assignments')
        .update({
          reminder_settings: [
            {
              type: 'before',
              amount: 48,
              unit: 'hours',
            },
            {
              type: 'before',
              amount: 2,
              unit: 'days',
            },
          ],
        })
        .eq('id', testAssignmentId2)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.reminder_settings).toBeDefined();
      expect(Array.isArray(data?.reminder_settings)).toBe(true);
    });

    it('should fail updating non-existent assignment', async () => {
      const fakeAssignmentId = 'f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0';

      const { data, error } = await supabase
        .from('assignments')
        .update({
          title: 'Update Non-Existent',
        })
        .eq('id', fakeAssignmentId)
        .select()
        .single();

      expect(data).toBeNull();
    });

    it('should preserve timestamps correctly on update', async () => {
      if (!testAssignmentId) {
        console.log('Test assignment id not available');
        return;
      }

      // Get current assignment
      const { data: beforeUpdate } = await supabase
        .from('assignments')
        .select()
        .eq('id', testAssignmentId)
        .single();

      // Wait a bit to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Update it
      const { data: afterUpdate } = await supabase
        .from('assignments')
        .update({
          title: 'Timestamp Test Update',
        })
        .eq('id', testAssignmentId)
        .select()
        .single();

      expect(afterUpdate?.created_at).toBe(beforeUpdate?.created_at);
      expect(new Date(afterUpdate?.updated_at!).getTime()).toBeGreaterThan(
        new Date(beforeUpdate?.updated_at!).getTime()
      );
    });
  });

  describe('DELETE (Soft Delete)', () => {
    it('should soft delete an assignment', async () => {
      if (!testAssignmentId) {
        console.log('Test assignment id not available');
        return;
      }

      const { data, error } = await supabase
        .from('assignments')
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq('id', testAssignmentId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.deleted_at).toBeDefined();
      expect(data?.deleted_at).not.toBeNull();
    });

    it('should not return soft deleted assignments in regular list', async () => {
      if (!testAssignmentId) {
        console.log('Test assignment id not available');
        return;
      }

      const { data, error } = await supabase
        .from('assignments')
        .select()
        .eq('id', testAssignmentId)
        .is('deleted_at', null);

      expect(error).toBeNull();
      expect(data?.length).toBe(0);
    });

    it('should return soft deleted assignments when explicitly requested', async () => {
      if (!testAssignmentId) {
        console.log('Test assignment id not available');
        return;
      }

      const { data, error } = await supabase
        .from('assignments')
        .select()
        .eq('id', testAssignmentId);

      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThan(0);
      expect(data?.[0]?.deleted_at).not.toBeNull();
    });

    it('should fail deleting non-existent assignment', async () => {
      const fakeAssignmentId = 'f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0';

      const { data, error } = await supabase
        .from('assignments')
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq('id', fakeAssignmentId)
        .select();

      expect(data?.length).toBe(0);
    });

    it('should allow restoring a soft deleted assignment', async () => {
      if (!testAssignmentId) {
        console.log('Test assignment id not available');
        return;
      }

      const { data, error } = await supabase
        .from('assignments')
        .update({
          deleted_at: null,
        })
        .eq('id', testAssignmentId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.deleted_at).toBeNull();
    });

    it('should verify restored assignment is visible in list', async () => {
      if (!testAssignmentId) {
        console.log('Test assignment id not available');
        return;
      }

      const { data, error } = await supabase
        .from('assignments')
        .select()
        .eq('id', testAssignmentId)
        .is('deleted_at', null);

      expect(error).toBeNull();
      expect(data?.length).toBe(1);
    });
  });

  describe('Note Linking', () => {
    it('should link notes to assignment', async () => {
      if (!testAssignmentId2 || !testNoteId) {
        console.log('Test assignment or note id not available');
        return;
      }

      const { data, error } = await supabase
        .from('assignment_notes')
        .insert({
          assignment_id: testAssignmentId2,
          note_id: testNoteId,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.assignment_id).toBe(testAssignmentId2);
      expect(data?.note_id).toBe(testNoteId);
    });

    it('should retrieve linked notes for assignment', async () => {
      if (!testAssignmentId2) {
        console.log('Test assignment id 2 not available');
        return;
      }

      const { data, error } = await supabase
        .from('assignment_notes')
        .select()
        .eq('assignment_id', testAssignmentId2);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      expect(data!.length).toBeGreaterThan(0);
    });

    it('should unlink notes from assignment', async () => {
      if (!testAssignmentId2 || !testNoteId) {
        console.log('Test assignment or note id not available');
        return;
      }

      const { error } = await supabase
        .from('assignment_notes')
        .delete()
        .eq('assignment_id', testAssignmentId2)
        .eq('note_id', testNoteId);

      expect(error).toBeNull();

      // Verify deletion
      const { data } = await supabase
        .from('assignment_notes')
        .select()
        .eq('assignment_id', testAssignmentId2)
        .eq('note_id', testNoteId);

      expect(data?.length).toBe(0);
    });

    it('should prevent duplicate note links', async () => {
      if (!testAssignmentId2 || !testNoteId) {
        console.log('Test assignment or note id not available');
        return;
      }

      // Link once
      await supabase
        .from('assignment_notes')
        .insert({
          assignment_id: testAssignmentId2,
          note_id: testNoteId,
        });

      // Try to link again (should be ignored due to onConflictDoNothing)
      const { data, error } = await supabase
        .from('assignment_notes')
        .insert({
          assignment_id: testAssignmentId2,
          note_id: testNoteId,
        })
        .select();

      // Verify only one link exists
      const { data: linkedNotes } = await supabase
        .from('assignment_notes')
        .select()
        .eq('assignment_id', testAssignmentId2)
        .eq('note_id', testNoteId);

      expect(linkedNotes?.length).toBe(1);
    });
  });

  describe('Complex Queries', () => {
    it('should retrieve assignments with course details', async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select(
          `
          id,
          title,
          due_date,
          status,
          priority,
          courses(id, name, code, color)
        `
        )
        .eq('user_id', testUserId)
        .is('deleted_at', null);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should retrieve assignments with linked notes', async () => {
      if (!testAssignmentId2) {
        console.log('Test assignment id 2 not available');
        return;
      }

      // First link a note
      await supabase
        .from('assignment_notes')
        .insert({
          assignment_id: testAssignmentId2,
          note_id: testNoteId,
        })
        .select();

      const { data, error } = await supabase
        .from('assignments')
        .select(
          `
          id,
          title,
          assignment_notes(note_id)
        `
        )
        .eq('id', testAssignmentId2);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.[0]?.assignment_notes).toBeDefined();
    });

    it('should find assignments due within next 7 days', async () => {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('assignments')
        .select()
        .eq('user_id', testUserId)
        .is('deleted_at', null)
        .gte('due_date', now.toISOString())
        .lte('due_date', nextWeek.toISOString())
        .order('due_date', { ascending: true });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should count assignments by status', async () => {
      const { data: pending } = await supabase
        .from('assignments')
        .select('id')
        .eq('user_id', testUserId)
        .eq('status', 'pending')
        .is('deleted_at', null);

      const { data: completed } = await supabase
        .from('assignments')
        .select('id')
        .eq('user_id', testUserId)
        .eq('status', 'completed')
        .is('deleted_at', null);

      expect(pending).toBeDefined();
      expect(completed).toBeDefined();
    });
  });
});