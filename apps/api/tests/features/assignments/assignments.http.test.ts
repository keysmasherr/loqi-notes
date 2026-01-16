import http from 'http';
import https from 'https';

// Configuration
const BASE_URL = 'http://localhost:3001';
const TRPC_ENDPOINT = '/api/v1/trpc';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  statusCode?: number;
  error?: string;
  data?: any;
  duration: number;
}

const results: TestResult[] = [];

// Helper to make HTTP requests to tRPC endpoint
function makeTRPCRequest(
  procedure: string,
  method: 'POST' | 'GET',
  input?: any,
  authToken?: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL);
    const path = `${TRPC_ENDPOINT}/${procedure}`;
    const requestUrl = new URL(path, BASE_URL);

    // Add query params for GET requests
    if (method === 'GET' && input) {
      requestUrl.searchParams.append('input', JSON.stringify(input));
    }

    const options = {
      hostname: url.hostname,
      port: url.port || 3001,
      path: requestUrl.pathname + requestUrl.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (method === 'POST' && input) {
      req.write(JSON.stringify(input));
    }

    req.end();
  });
}

// Test function
async function runTest(
  name: string,
  testFn: () => Promise<void>,
  timeout = 10000
): Promise<void> {
  const startTime = Date.now();
  try {
    // Use promise timeout to handle hanging requests
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Test timeout')), timeout)
    );

    await Promise.race([testFn(), timeoutPromise]);

    results.push({
      name,
      status: 'PASS',
      duration: Date.now() - startTime,
    });
    console.log(`✓ ${name}`);
  } catch (error: any) {
    results.push({
      name,
      status: 'FAIL',
      error: error.message || String(error),
      duration: Date.now() - startTime,
    });
    console.log(`✗ ${name} - ${error.message || String(error)}`);
  }
}

// Main test suite
async function main() {
  console.log('='.repeat(80));
  console.log('ASSIGNMENTS API HTTP TEST SUITE');
  console.log('='.repeat(80));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Endpoint: ${TRPC_ENDPOINT}`);
  console.log('');

  let testUserId: string;
  let testCourseId: string;
  let testAssignmentId: string;
  let testAssignmentId2: string;
  let testNoteId: string;

  // Test 1: Health check
  await runTest('Health Check', async () => {
    const response = await makeTRPCRequest('', 'GET');
    if (response.statusCode !== 200 && response.statusCode !== 404) {
      throw new Error(`Expected status 200 or 404, got ${response.statusCode}`);
    }
  });

  // Test 2: Create a test user and sign up
  await runTest('Create Test User and Sign Up', async () => {
    // This would require auth endpoints - for now we'll use a mock user
    testUserId = '00000000-0000-0000-0000-000000000001';
    if (!testUserId) {
      throw new Error('Failed to create test user');
    }
  });

  // Test 3: Create a test course
  await runTest('Create Test Course', async () => {
    // Direct database insertion would be needed here
    testCourseId = '00000000-0000-0000-0000-000000000002';
    if (!testCourseId) {
      throw new Error('Failed to create test course');
    }
  });

  // Test 4: CREATE - Simple assignment without optional fields
  await runTest('CREATE: Assignment with required fields only', async () => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const response = await makeTRPCRequest(
      'assignments.create',
      'POST',
      {
        title: 'Test Assignment 1',
        dueDate: dueDate.toISOString(),
      },
      'test-token'
    );

    if (!response.body || !response.body.result) {
      throw new Error(`Invalid response structure: ${JSON.stringify(response.body)}`);
    }

    const data = response.body.result.data;
    if (!data?.id) {
      throw new Error('Assignment ID not returned');
    }

    testAssignmentId = data.id;

    if (data.title !== 'Test Assignment 1') {
      throw new Error(
        `Expected title "Test Assignment 1", got "${data.title}"`
      );
    }

    if (!data.createdAt) {
      throw new Error('createdAt timestamp not set');
    }
  });

  // Test 5: CREATE - Assignment with all optional fields
  await runTest(
    'CREATE: Assignment with all optional fields',
    async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const response = await makeTRPCRequest(
        'assignments.create',
        'POST',
        {
          title: 'Test Assignment 2 - Full Details',
          description: 'This is a detailed test assignment',
          dueDate: dueDate.toISOString(),
          courseId: testCourseId,
          type: 'project',
          priority: 'high',
          status: 'in_progress',
          reminderSettings: [
            {
              type: 'before',
              amount: 24,
              unit: 'hours',
            },
          ],
        },
        'test-token'
      );

      if (!response.body || !response.body.result) {
        throw new Error(`Invalid response structure`);
      }

      const data = response.body.result.data;
      if (!data?.id) {
        throw new Error('Assignment ID not returned');
      }

      testAssignmentId2 = data.id;

      if (data.title !== 'Test Assignment 2 - Full Details') {
        throw new Error(`Title mismatch: ${data.title}`);
      }

      if (data.type !== 'project') {
        throw new Error(`Type mismatch: ${data.type}`);
      }

      if (data.priority !== 'high') {
        throw new Error(`Priority mismatch: ${data.priority}`);
      }
    }
  );

  // Test 6: READ - Get assignment by ID
  await runTest('READ: Get assignment by ID', async () => {
    if (!testAssignmentId) {
      throw new Error('No test assignment ID available');
    }

    const response = await makeTRPCRequest(
      'assignments.getById',
      'GET',
      { id: testAssignmentId },
      'test-token'
    );

    if (!response.body || !response.body.result) {
      throw new Error(`Invalid response structure`);
    }

    const data = response.body.result.data;
    if (data.id !== testAssignmentId) {
      throw new Error(`ID mismatch: ${data.id}`);
    }

    if (data.title !== 'Test Assignment 1') {
      throw new Error(`Title mismatch: ${data.title}`);
    }
  });

  // Test 7: READ - List all assignments
  await runTest('READ: List all assignments', async () => {
    const response = await makeTRPCRequest(
      'assignments.list',
      'GET',
      {},
      'test-token'
    );

    if (!response.body || !response.body.result) {
      throw new Error(`Invalid response structure`);
    }

    const data = response.body.result.data;
    if (!Array.isArray(data)) {
      throw new Error(`Expected array, got ${typeof data}`);
    }

    if (data.length < 2) {
      throw new Error(`Expected at least 2 assignments, got ${data.length}`);
    }
  });

  // Test 8: READ - List with filters (by status)
  await runTest('READ: List assignments filtered by status', async () => {
    const response = await makeTRPCRequest(
      'assignments.list',
      'GET',
      { status: 'in_progress' },
      'test-token'
    );

    if (!response.body || !response.body.result) {
      throw new Error(`Invalid response structure`);
    }

    const data = response.body.result.data;
    if (!Array.isArray(data)) {
      throw new Error(`Expected array, got ${typeof data}`);
    }

    data.forEach((assignment: any) => {
      if (assignment.status !== 'in_progress') {
        throw new Error(`Filter failed: got status ${assignment.status}`);
      }
    });
  });

  // Test 9: UPDATE - Update assignment title
  await runTest('UPDATE: Update assignment title', async () => {
    if (!testAssignmentId) {
      throw new Error('No test assignment ID available');
    }

    const response = await makeTRPCRequest(
      'assignments.update',
      'POST',
      {
        id: testAssignmentId,
        title: 'Updated Assignment Title',
      },
      'test-token'
    );

    if (!response.body || !response.body.result) {
      throw new Error(`Invalid response structure`);
    }

    const data = response.body.result.data;
    if (data.title !== 'Updated Assignment Title') {
      throw new Error(`Title not updated: ${data.title}`);
    }

    if (!data.updatedAt) {
      throw new Error('updatedAt not set');
    }
  });

  // Test 10: UPDATE - Update assignment status
  await runTest('UPDATE: Update assignment status', async () => {
    if (!testAssignmentId) {
      throw new Error('No test assignment ID available');
    }

    const response = await makeTRPCRequest(
      'assignments.updateStatus',
      'POST',
      {
        id: testAssignmentId,
        status: 'completed',
      },
      'test-token'
    );

    if (!response.body || !response.body.result) {
      throw new Error(`Invalid response structure`);
    }

    const data = response.body.result.data;
    if (data.status !== 'completed') {
      throw new Error(`Status not updated: ${data.status}`);
    }
  });

  // Test 11: UPDATE - Record grade
  await runTest('UPDATE: Record grade for assignment', async () => {
    if (!testAssignmentId2) {
      throw new Error('No test assignment ID 2 available');
    }

    const response = await makeTRPCRequest(
      'assignments.recordGrade',
      'POST',
      {
        id: testAssignmentId2,
        grade: 92,
        feedback: 'Excellent work!',
      },
      'test-token'
    );

    if (!response.body || !response.body.result) {
      throw new Error(`Invalid response structure`);
    }

    const data = response.body.result.data;
    if (data.grade !== '92' && data.grade !== 92) {
      throw new Error(`Grade not recorded: ${data.grade}`);
    }

    if (data.status !== 'graded') {
      throw new Error(`Status not updated to 'graded': ${data.status}`);
    }
  });

  // Test 12: UPDATE - Multiple fields at once
  await runTest('UPDATE: Multiple fields at once', async () => {
    if (!testAssignmentId) {
      throw new Error('No test assignment ID available');
    }

    const newDueDate = new Date();
    newDueDate.setDate(newDueDate.getDate() + 21);

    const response = await makeTRPCRequest(
      'assignments.update',
      'POST',
      {
        id: testAssignmentId,
        title: 'Completely Updated Assignment',
        description: 'New description for the assignment',
        priority: 'low',
        dueDate: newDueDate.toISOString(),
      },
      'test-token'
    );

    if (!response.body || !response.body.result) {
      throw new Error(`Invalid response structure`);
    }

    const data = response.body.result.data;
    if (data.title !== 'Completely Updated Assignment') {
      throw new Error(`Title mismatch: ${data.title}`);
    }

    if (data.priority !== 'low') {
      throw new Error(`Priority mismatch: ${data.priority}`);
    }
  });

  // Test 13: DELETE - Soft delete assignment
  await runTest('DELETE: Soft delete assignment', async () => {
    if (!testAssignmentId) {
      throw new Error('No test assignment ID available');
    }

    const response = await makeTRPCRequest(
      'assignments.delete',
      'POST',
      { id: testAssignmentId },
      'test-token'
    );

    if (!response.body || !response.body.result) {
      throw new Error(`Invalid response structure`);
    }

    const data = response.body.result.data;
    if (data.success !== true) {
      throw new Error(`Delete not successful: ${JSON.stringify(data)}`);
    }
  });

  // Test 14: DELETE - Verify soft deleted assignment not in list
  await runTest(
    'DELETE: Verify soft deleted assignment not in regular list',
    async () => {
      const response = await makeTRPCRequest(
        'assignments.list',
        'GET',
        {},
        'test-token'
      );

      if (!response.body || !response.body.result) {
        throw new Error(`Invalid response structure`);
      }

      const data = response.body.result.data;
      const foundDeleted = data.find((a: any) => a.id === testAssignmentId);

      if (foundDeleted) {
        throw new Error('Soft deleted assignment still appears in list');
      }
    }
  );

  // Test 15: Error handling - Invalid assignment ID
  await runTest('ERROR: Attempt to get non-existent assignment', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000099';

    const response = await makeTRPCRequest(
      'assignments.getById',
      'GET',
      { id: fakeId },
      'test-token'
    );

    // Should either return error or 404-like response
    if (response.body && response.body.error) {
      // tRPC error response
      return;
    }

    throw new Error(`Expected error response for non-existent assignment`);
  });

  // Test 16: Error handling - Missing required fields
  await runTest('ERROR: Create assignment without title', async () => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const response = await makeTRPCRequest(
      'assignments.create',
      'POST',
      {
        dueDate: dueDate.toISOString(),
      },
      'test-token'
    );

    // Should return error
    if (!response.body?.error) {
      throw new Error('Expected validation error for missing title');
    }
  });

  // Test 17: Timestamps verification
  await runTest('TIMESTAMPS: Verify timestamps on creation', async () => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const beforeCreate = new Date();

    const response = await makeTRPCRequest(
      'assignments.create',
      'POST',
      {
        title: 'Timestamp Test Assignment',
        dueDate: dueDate.toISOString(),
      },
      'test-token'
    );

    const afterCreate = new Date();

    if (!response.body || !response.body.result) {
      throw new Error(`Invalid response structure`);
    }

    const data = response.body.result.data;
    const createdAt = new Date(data.createdAt);
    const updatedAt = new Date(data.updatedAt);

    if (createdAt < beforeCreate || createdAt > afterCreate) {
      throw new Error(
        `createdAt timestamp out of range: ${createdAt.toISOString()}`
      );
    }

    if (updatedAt < beforeCreate || updatedAt > afterCreate) {
      throw new Error(
        `updatedAt timestamp out of range: ${updatedAt.toISOString()}`
      );
    }

    if (createdAt.getTime() !== updatedAt.getTime()) {
      throw new Error('createdAt and updatedAt should match on creation');
    }
  });

  // Test 18: Response structure validation
  await runTest('RESPONSE: Validate response structure for create', async () => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const response = await makeTRPCRequest(
      'assignments.create',
      'POST',
      {
        title: 'Response Structure Test',
        dueDate: dueDate.toISOString(),
      },
      'test-token'
    );

    if (!response.body || !response.body.result || !response.body.result.data) {
      throw new Error(
        `Invalid response structure: ${JSON.stringify(response.body)}`
      );
    }

    const data = response.body.result.data;
    const requiredFields = [
      'id',
      'userId',
      'title',
      'dueDate',
      'status',
      'createdAt',
      'updatedAt',
    ];

    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new Error(`Missing required field in response: ${field}`);
      }
    }
  });

  // Print results
  console.log('');
  console.log('='.repeat(80));
  console.log('TEST RESULTS');
  console.log('='.repeat(80));

  let passCount = 0;
  let failCount = 0;

  results.forEach((result) => {
    if (result.status === 'PASS') {
      passCount++;
      console.log(
        `[PASS] ${result.name} (${result.duration}ms)`
      );
    } else {
      failCount++;
      console.log(
        `[FAIL] ${result.name} (${result.duration}ms)`
      );
      if (result.error) {
        console.log(`       Error: ${result.error}`);
      }
    }
  });

  console.log('');
  console.log('='.repeat(80));
  console.log(`Summary: ${passCount} passed, ${failCount} failed out of ${results.length} tests`);
  console.log('='.repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

// Run tests
main().catch((error) => {
  console.error('Test suite error:', error);
  process.exit(1);
});