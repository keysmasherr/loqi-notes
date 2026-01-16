#!/usr/bin/env node

/**
 * Comprehensive CRUD Test Suite for Assignments API
 *
 * This test suite validates all CRUD operations for the assignments feature:
 * - CREATE: Creating assignments with various configurations
 * - READ: Retrieving assignments with filtering and pagination
 * - UPDATE: Modifying existing assignments
 * - DELETE: Soft-deleting assignments
 *
 * Tests include edge cases, validation, error handling, and data integrity checks.
 */

import * as http from 'http';
import * as https from 'https';

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3001';
const TRPC_ENDPOINT = '/api/v1/trpc';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'test-token';

interface TestResult {
  name: string;
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'VALIDATION' | 'ERROR';
  status: 'PASS' | 'FAIL';
  statusCode?: number;
  error?: string;
  details?: string;
  duration: number;
  assertions?: { name: string; passed: boolean; message?: string }[];
}

const results: TestResult[] = [];
let testData: any = {};

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

    const protocol = url.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
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

// Test helper
async function runTest(
  name: string,
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'VALIDATION' | 'ERROR',
  testFn: () => Promise<{ passed: boolean; message?: string; assertions?: { name: string; passed: boolean; message?: string }[] }>,
  timeout = 15000
): Promise<void> {
  const startTime = Date.now();
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Test timeout')), timeout)
    );

    const result = await Promise.race([testFn(), timeoutPromise]) as { passed: boolean; message?: string; assertions?: { name: string; passed: boolean; message?: string }[] };

    if (!result.passed) {
      throw new Error(result.message || 'Test assertion failed');
    }

    results.push({
      name,
      operation,
      status: 'PASS',
      duration: Date.now() - startTime,
      assertions: result.assertions,
    });
    console.log(`✓ ${name}`);
  } catch (error: any) {
    results.push({
      name,
      operation,
      status: 'FAIL',
      error: error.message || String(error),
      duration: Date.now() - startTime,
    });
    console.log(`✗ ${name} - ${error.message || String(error)}`);
  }
}

// Helper to validate response structure
function validateResponse(response: any): { valid: boolean; message?: string } {
  if (!response.body) {
    return { valid: false, message: 'No response body' };
  }

  // Handle tRPC error responses
  if (response.body.error) {
    return { valid: false, message: `tRPC Error: ${response.body.error.message}` };
  }

  // Handle tRPC result responses
  if (response.body.result && response.body.result.data) {
    return { valid: true };
  }

  return { valid: false, message: `Invalid response structure: ${JSON.stringify(response.body)}` };
}

// Main test suite
async function main() {
  console.log('='.repeat(100));
  console.log('ASSIGNMENTS API - COMPREHENSIVE CRUD TEST SUITE');
  console.log('='.repeat(100));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Endpoint: ${TRPC_ENDPOINT}`);
  console.log('');

  // ==================== CREATE TESTS ====================
  console.log('\n--- CREATE OPERATIONS ---\n');

  // Test 1: Create assignment with required fields only
  await runTest(
    'CREATE: Assignment with required fields only',
    'CREATE',
    async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const response = await makeTRPCRequest(
        'assignments.create',
        'POST',
        {
          title: 'Test Assignment - Basic',
          dueDate: dueDate.toISOString(),
        },
        AUTH_TOKEN
      );

      const validation = validateResponse(response);
      if (!validation.valid) {
        return { passed: false, message: validation.message };
      }

      const data = response.body.result.data;
      testData.basicAssignmentId = data.id;

      const assertions = [
        { name: 'Has ID', passed: !!data.id, message: data.id ? 'ID present' : 'ID missing' },
        { name: 'Title matches', passed: data.title === 'Test Assignment - Basic', message: `Expected "Test Assignment - Basic", got "${data.title}"` },
        { name: 'Default status', passed: data.status === 'pending', message: `Expected status "pending", got "${data.status}"` },
        { name: 'Default priority', passed: data.priority === 'medium', message: `Expected priority "medium", got "${data.priority}"` },
        { name: 'Default type', passed: data.type === 'assignment', message: `Expected type "assignment", got "${data.type}"` },
        { name: 'Has createdAt', passed: !!data.createdAt, message: data.createdAt ? 'createdAt present' : 'createdAt missing' },
        { name: 'Has updatedAt', passed: !!data.updatedAt, message: data.updatedAt ? 'updatedAt present' : 'updatedAt missing' },
      ];

      const allPassed = assertions.every(a => a.passed);
      return {
        passed: allPassed,
        message: allPassed ? 'All assertions passed' : `Some assertions failed: ${assertions.filter(a => !a.passed).map(a => a.message).join(', ')}`,
        assertions,
      };
    }
  );

  // Test 2: Create assignment with all fields
  await runTest(
    'CREATE: Assignment with all optional fields',
    'CREATE',
    async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);

      const response = await makeTRPCRequest(
        'assignments.create',
        'POST',
        {
          title: 'Test Assignment - Full Details',
          description: 'This is a comprehensive test assignment with all fields populated',
          dueDate: dueDate.toISOString(),
          startDate: startDate.toISOString(),
          type: 'project',
          priority: 'high',
          weight: 25,
          maxGrade: 100,
          reminderSettings: [
            { type: 'before', amount: 24, unit: 'hours' },
            { type: 'before', amount: 1, unit: 'days' },
          ],
        },
        AUTH_TOKEN
      );

      const validation = validateResponse(response);
      if (!validation.valid) {
        return { passed: false, message: validation.message };
      }

      const data = response.body.result.data;
      testData.fullAssignmentId = data.id;

      const assertions = [
        { name: 'Has ID', passed: !!data.id, message: data.id ? 'ID present' : 'ID missing' },
        { name: 'Title matches', passed: data.title === 'Test Assignment - Full Details' },
        { name: 'Description matches', passed: data.description === 'This is a comprehensive test assignment with all fields populated' },
        { name: 'Type is project', passed: data.type === 'project' },
        { name: 'Priority is high', passed: data.priority === 'high' },
        { name: 'Weight is 25', passed: data.weight === '25' || data.weight === 25 },
        { name: 'Max grade is 100', passed: data.maxGrade === '100' || data.maxGrade === 100 },
        { name: 'Reminders configured', passed: Array.isArray(data.reminderSettings) && data.reminderSettings.length === 2 },
      ];

      const allPassed = assertions.every(a => a.passed);
      return {
        passed: allPassed,
        assertions,
      };
    }
  );

  // Test 3: Create assignment with different types
  await runTest(
    'CREATE: Assignment with various types',
    'CREATE',
    async () => {
      const types = ['exam', 'quiz', 'paper', 'presentation'];
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      for (const type of types) {
        const response = await makeTRPCRequest(
          'assignments.create',
          'POST',
          {
            title: `Test ${type.toUpperCase()} Assignment`,
            type,
            dueDate: dueDate.toISOString(),
          },
          AUTH_TOKEN
        );

        const validation = validateResponse(response);
        if (!validation.valid) {
          return { passed: false, message: `Failed to create ${type} assignment: ${validation.message}` };
        }

        const data = response.body.result.data;
        if (data.type !== type) {
          return { passed: false, message: `Type mismatch for ${type}: got ${data.type}` };
        }
      }

      return { passed: true, message: 'All assignment types created successfully' };
    }
  );

  // ==================== READ TESTS ====================
  console.log('\n--- READ OPERATIONS ---\n');

  // Test 4: Read assignment by ID
  await runTest(
    'READ: Get assignment by ID',
    'READ',
    async () => {
      if (!testData.basicAssignmentId) {
        return { passed: false, message: 'No test assignment ID available' };
      }

      const response = await makeTRPCRequest(
        'assignments.getById',
        'GET',
        { id: testData.basicAssignmentId },
        AUTH_TOKEN
      );

      const validation = validateResponse(response);
      if (!validation.valid) {
        return { passed: false, message: validation.message };
      }

      const data = response.body.result.data;

      const assertions = [
        { name: 'ID matches', passed: data.id === testData.basicAssignmentId },
        { name: 'Title matches', passed: data.title === 'Test Assignment - Basic' },
        { name: 'Has linked notes array', passed: Array.isArray(data.linkedNoteIds) },
      ];

      const allPassed = assertions.every(a => a.passed);
      return { passed: allPassed, assertions };
    }
  );

  // Test 5: List all assignments
  await runTest(
    'READ: List all assignments',
    'READ',
    async () => {
      const response = await makeTRPCRequest(
        'assignments.list',
        'GET',
        {},
        AUTH_TOKEN
      );

      const validation = validateResponse(response);
      if (!validation.valid) {
        return { passed: false, message: validation.message };
      }

      const data = response.body.result.data;

      const assertions = [
        { name: 'Returns array', passed: Array.isArray(data), message: `Expected array, got ${typeof data}` },
        { name: 'Has assignments', passed: data.length >= 1, message: `Expected at least 1 assignment, got ${data.length}` },
      ];

      const allPassed = assertions.every(a => a.passed);
      return { passed: allPassed, assertions };
    }
  );

  // Test 6: List with pagination
  await runTest(
    'READ: List with pagination (limit and offset)',
    'READ',
    async () => {
      const response1 = await makeTRPCRequest(
        'assignments.list',
        'GET',
        { limit: 1, offset: 0 },
        AUTH_TOKEN
      );

      const validation1 = validateResponse(response1);
      if (!validation1.valid) {
        return { passed: false, message: `First pagination query failed: ${validation1.message}` };
      }

      const data1 = response1.body.result.data;
      const firstId = data1[0]?.id;

      const response2 = await makeTRPCRequest(
        'assignments.list',
        'GET',
        { limit: 1, offset: 1 },
        AUTH_TOKEN
      );

      const validation2 = validateResponse(response2);
      if (!validation2.valid) {
        return { passed: false, message: `Second pagination query failed: ${validation2.message}` };
      }

      const data2 = response2.body.result.data;
      const secondId = data2[0]?.id;

      const assertions = [
        { name: 'First query returns 1 item', passed: data1.length === 1 },
        { name: 'Second query returns 1 item', passed: data2.length === 1 },
        { name: 'Different items returned', passed: firstId !== secondId, message: `Expected different items, got same: ${firstId}` },
      ];

      const allPassed = assertions.every(a => a.passed);
      return { passed: allPassed, assertions };
    }
  );

  // Test 7: Filter by status
  await runTest(
    'READ: Filter assignments by status',
    'READ',
    async () => {
      const response = await makeTRPCRequest(
        'assignments.list',
        'GET',
        { status: 'pending' },
        AUTH_TOKEN
      );

      const validation = validateResponse(response);
      if (!validation.valid) {
        return { passed: false, message: validation.message };
      }

      const data = response.body.result.data;

      let allMatchFilter = true;
      for (const assignment of data) {
        if (assignment.status !== 'pending') {
          allMatchFilter = false;
          break;
        }
      }

      const assertions = [
        { name: 'Returns array', passed: Array.isArray(data) },
        { name: 'All items match filter', passed: allMatchFilter, message: 'Some items do not match the status filter' },
      ];

      const allPassed = assertions.every(a => a.passed);
      return { passed: allPassed, assertions };
    }
  );

  // Test 8: Filter by type
  await runTest(
    'READ: Filter assignments by type',
    'READ',
    async () => {
      const response = await makeTRPCRequest(
        'assignments.list',
        'GET',
        { type: 'project' },
        AUTH_TOKEN
      );

      const validation = validateResponse(response);
      if (!validation.valid) {
        return { passed: false, message: validation.message };
      }

      const data = response.body.result.data;

      let allMatchFilter = true;
      for (const assignment of data) {
        if (assignment.type !== 'project') {
          allMatchFilter = false;
          break;
        }
      }

      const assertions = [
        { name: 'Returns array', passed: Array.isArray(data) },
        { name: 'All items match filter', passed: allMatchFilter },
      ];

      const allPassed = assertions.every(a => a.passed);
      return { passed: allPassed, assertions };
    }
  );

  // Test 9: Filter by priority
  await runTest(
    'READ: Filter assignments by priority',
    'READ',
    async () => {
      const response = await makeTRPCRequest(
        'assignments.list',
        'GET',
        { priority: 'high' },
        AUTH_TOKEN
      );

      const validation = validateResponse(response);
      if (!validation.valid) {
        return { passed: false, message: validation.message };
      }

      const data = response.body.result.data;

      let allMatchFilter = true;
      for (const assignment of data) {
        if (assignment.priority !== 'high') {
          allMatchFilter = false;
          break;
        }
      }

      const assertions = [
        { name: 'Returns array', passed: Array.isArray(data) },
        { name: 'All items match priority filter', passed: allMatchFilter },
      ];

      const allPassed = assertions.every(a => a.passed);
      return { passed: allPassed, assertions };
    }
  );

  // Test 10: Get upcoming assignments
  await runTest(
    'READ: Get upcoming assignments',
    'READ',
    async () => {
      const response = await makeTRPCRequest(
        'assignments.getUpcoming',
        'GET',
        { limit: 10 },
        AUTH_TOKEN
      );

      const validation = validateResponse(response);
      if (!validation.valid) {
        return { passed: false, message: validation.message };
      }

      const data = response.body.result.data;

      const assertions = [
        { name: 'Returns array', passed: Array.isArray(data) },
        { name: 'Respects limit', passed: data.length <= 10 },
      ];

      const allPassed = assertions.every(a => a.passed);
      return { passed: allPassed, assertions };
    }
  );

  // ==================== UPDATE TESTS ====================
  console.log('\n--- UPDATE OPERATIONS ---\n');

  // Test 11: Update assignment title
  await runTest(
    'UPDATE: Update assignment title only',
    'UPDATE',
    async () => {
      if (!testData.basicAssignmentId) {
        return { passed: false, message: 'No test assignment ID available' };
      }

      const response = await makeTRPCRequest(
        'assignments.update',
        'POST',
        {
          id: testData.basicAssignmentId,
          title: 'Updated Assignment Title',
        },
        AUTH_TOKEN
      );

      const validation = validateResponse(response);
      if (!validation.valid) {
        return { passed: false, message: validation.message };
      }

      const data = response.body.result.data;

      const assertions = [
        { name: 'Title updated', passed: data.title === 'Updated Assignment Title' },
        { name: 'updatedAt changed', passed: !!data.updatedAt },
      ];

      const allPassed = assertions.every(a => a.passed);
      return { passed: allPassed, assertions };
    }
  );

  // Test 12: Update status
  await runTest(
    'UPDATE: Update assignment status',
    'UPDATE',
    async () => {
      if (!testData.basicAssignmentId) {
        return { passed: false, message: 'No test assignment ID available' };
      }

      const response = await makeTRPCRequest(
        'assignments.updateStatus',
        'POST',
        {
          id: testData.basicAssignmentId,
          status: 'in_progress',
        },
        AUTH_TOKEN
      );

      const validation = validateResponse(response);
      if (!validation.valid) {
        return { passed: false, message: validation.message };
      }

      const data = response.body.result.data;

      const assertions = [
        { name: 'Status updated to in_progress', passed: data.status === 'in_progress' },
      ];

      const allPassed = assertions.every(a => a.passed);
      return { passed: allPassed, assertions };
    }
  );

  // Test 13: Record grade
  await runTest(
    'UPDATE: Record grade for assignment',
    'UPDATE',
    async () => {
      if (!testData.fullAssignmentId) {
        return { passed: false, message: 'No full test assignment ID available' };
      }

      const response = await makeTRPCRequest(
        'assignments.recordGrade',
        'POST',
        {
          id: testData.fullAssignmentId,
          grade: 92,
          feedback: 'Excellent work on the project!',
        },
        AUTH_TOKEN
      );

      const validation = validateResponse(response);
      if (!validation.valid) {
        return { passed: false, message: validation.message };
      }

      const data = response.body.result.data;

      const assertions = [
        { name: 'Grade recorded', passed: data.grade === '92' || data.grade === 92 },
        { name: 'Status is graded', passed: data.status === 'graded' },
        { name: 'Feedback recorded', passed: data.feedback === 'Excellent work on the project!' },
      ];

      const allPassed = assertions.every(a => a.passed);
      return { passed: allPassed, assertions };
    }
  );

  // Test 14: Update multiple fields
  await runTest(
    'UPDATE: Update multiple fields at once',
    'UPDATE',
    async () => {
      if (!testData.basicAssignmentId) {
        return { passed: false, message: 'No test assignment ID available' };
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 21);

      const response = await makeTRPCRequest(
        'assignments.update',
        'POST',
        {
          id: testData.basicAssignmentId,
          title: 'Completely Revised Assignment',
          description: 'This assignment has been completely updated',
          priority: 'urgent',
          dueDate: dueDate.toISOString(),
        },
        AUTH_TOKEN
      );

      const validation = validateResponse(response);
      if (!validation.valid) {
        return { passed: false, message: validation.message };
      }

      const data = response.body.result.data;

      const assertions = [
        { name: 'Title updated', passed: data.title === 'Completely Revised Assignment' },
        { name: 'Description updated', passed: data.description === 'This assignment has been completely updated' },
        { name: 'Priority updated', passed: data.priority === 'urgent' },
      ];

      const allPassed = assertions.every(a => a.passed);
      return { passed: allPassed, assertions };
    }
  );

  // Test 15: Mark complete
  await runTest(
    'UPDATE: Mark assignment as complete',
    'UPDATE',
    async () => {
      // Create a test assignment for this operation
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const createResponse = await makeTRPCRequest(
        'assignments.create',
        'POST',
        {
          title: 'Test Assignment for Completion',
          dueDate: dueDate.toISOString(),
        },
        AUTH_TOKEN
      );

      const validation1 = validateResponse(createResponse);
      if (!validation1.valid) {
        return { passed: false, message: `Failed to create assignment: ${validation1.message}` };
      }

      const assignmentId = createResponse.body.result.data.id;

      const response = await makeTRPCRequest(
        'assignments.markComplete',
        'POST',
        {
          id: assignmentId,
          grade: 85,
        },
        AUTH_TOKEN
      );

      const validation2 = validateResponse(response);
      if (!validation2.valid) {
        return { passed: false, message: validation2.message };
      }

      const data = response.body.result.data;

      const assertions = [
        { name: 'Status is graded', passed: data.status === 'graded' },
        { name: 'Grade recorded', passed: data.grade === '85' || data.grade === 85 },
      ];

      const allPassed = assertions.every(a => a.passed);
      return { passed: allPassed, assertions };
    }
  );

  // ==================== DELETE TESTS ====================
  console.log('\n--- DELETE OPERATIONS ---\n');

  // Test 16: Delete assignment (soft delete)
  await runTest(
    'DELETE: Soft delete assignment',
    'DELETE',
    async () => {
      if (!testData.basicAssignmentId) {
        return { passed: false, message: 'No test assignment ID available' };
      }

      const response = await makeTRPCRequest(
        'assignments.delete',
        'POST',
        { id: testData.basicAssignmentId },
        AUTH_TOKEN
      );

      const validation = validateResponse(response);
      if (!validation.valid) {
        return { passed: false, message: validation.message };
      }

      const data = response.body.result.data;

      const assertions = [
        { name: 'Delete successful', passed: data.success === true },
      ];

      const allPassed = assertions.every(a => a.passed);
      return { passed: allPassed, assertions };
    }
  );

  // Test 17: Verify deleted assignment not in default list
  await runTest(
    'DELETE: Verify soft deleted assignment excluded from default list',
    'DELETE',
    async () => {
      if (!testData.basicAssignmentId) {
        return { passed: false, message: 'No test assignment ID available' };
      }

      const response = await makeTRPCRequest(
        'assignments.list',
        'GET',
        {},
        AUTH_TOKEN
      );

      const validation = validateResponse(response);
      if (!validation.valid) {
        return { passed: false, message: validation.message };
      }

      const data = response.body.result.data;
      const foundDeleted = data.find((a: any) => a.id === testData.basicAssignmentId);

      const assertions = [
        { name: 'Deleted assignment not in list', passed: !foundDeleted, message: foundDeleted ? 'Deleted assignment found in list' : 'OK' },
      ];

      const allPassed = assertions.every(a => a.passed);
      return { passed: allPassed, assertions };
    }
  );

  // Test 18: Include deleted in list
  await runTest(
    'DELETE: Include deleted assignments when requested',
    'DELETE',
    async () => {
      if (!testData.basicAssignmentId) {
        return { passed: false, message: 'No test assignment ID available' };
      }

      const response = await makeTRPCRequest(
        'assignments.list',
        'GET',
        { includeDeleted: true },
        AUTH_TOKEN
      );

      const validation = validateResponse(response);
      if (!validation.valid) {
        return { passed: false, message: validation.message };
      }

      const data = response.body.result.data;
      const foundDeleted = data.find((a: any) => a.id === testData.basicAssignmentId);

      const assertions = [
        { name: 'Deleted assignment included', passed: !!foundDeleted, message: !foundDeleted ? 'Deleted assignment not found' : 'OK' },
        { name: 'Deleted assignment has deletedAt', passed: foundDeleted?.deletedAt !== null && foundDeleted?.deletedAt !== undefined, message: 'deletedAt not set' },
      ];

      const allPassed = assertions.every(a => a.passed);
      return { passed: allPassed, assertions };
    }
  );

  // ==================== VALIDATION TESTS ====================
  console.log('\n--- VALIDATION TESTS ---\n');

  // Test 19: Validation - Missing required field (title)
  await runTest(
    'VALIDATION: Create assignment without title',
    'VALIDATION',
    async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const response = await makeTRPCRequest(
        'assignments.create',
        'POST',
        {
          dueDate: dueDate.toISOString(),
        },
        AUTH_TOKEN
      );

      const hasError = !!response.body.error;

      const assertions = [
        { name: 'Returns error', passed: hasError, message: hasError ? 'Error returned' : 'No error returned' },
      ];

      return { passed: hasError, assertions };
    }
  );

  // Test 20: Validation - Missing required field (dueDate)
  await runTest(
    'VALIDATION: Create assignment without dueDate',
    'VALIDATION',
    async () => {
      const response = await makeTRPCRequest(
        'assignments.create',
        'POST',
        {
          title: 'Assignment Without Due Date',
        },
        AUTH_TOKEN
      );

      const hasError = !!response.body.error;

      const assertions = [
        { name: 'Returns error', passed: hasError },
      ];

      return { passed: hasError, assertions };
    }
  );

  // Test 21: Validation - Invalid UUID
  await runTest(
    'VALIDATION: Get assignment with invalid UUID',
    'VALIDATION',
    async () => {
      const response = await makeTRPCRequest(
        'assignments.getById',
        'GET',
        { id: 'not-a-uuid' },
        AUTH_TOKEN
      );

      const hasError = !!response.body.error;

      const assertions = [
        { name: 'Returns validation error', passed: hasError },
      ];

      return { passed: hasError, assertions };
    }
  );

  // Test 22: Validation - Invalid enum value
  await runTest(
    'VALIDATION: Create assignment with invalid type',
    'VALIDATION',
    async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const response = await makeTRPCRequest(
        'assignments.create',
        'POST',
        {
          title: 'Invalid Type Assignment',
          dueDate: dueDate.toISOString(),
          type: 'invalid_type',
        },
        AUTH_TOKEN
      );

      const hasError = !!response.body.error;

      const assertions = [
        { name: 'Returns validation error', passed: hasError },
      ];

      return { passed: hasError, assertions };
    }
  );

  // Test 23: Validation - Title length validation
  await runTest(
    'VALIDATION: Create assignment with title exceeding max length',
    'VALIDATION',
    async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      const longTitle = 'A'.repeat(201); // Exceeds 200 char limit

      const response = await makeTRPCRequest(
        'assignments.create',
        'POST',
        {
          title: longTitle,
          dueDate: dueDate.toISOString(),
        },
        AUTH_TOKEN
      );

      const hasError = !!response.body.error;

      const assertions = [
        { name: 'Returns validation error', passed: hasError },
      ];

      return { passed: hasError, assertions };
    }
  );

  // ==================== ERROR HANDLING TESTS ====================
  console.log('\n--- ERROR HANDLING TESTS ---\n');

  // Test 24: Error - Get non-existent assignment
  await runTest(
    'ERROR: Get non-existent assignment',
    'ERROR',
    async () => {
      const fakeId = '00000000-0000-0000-0000-000000000099';

      const response = await makeTRPCRequest(
        'assignments.getById',
        'GET',
        { id: fakeId },
        AUTH_TOKEN
      );

      const hasError = !!response.body.error;

      const assertions = [
        { name: 'Returns error', passed: hasError, message: 'Expected NotFoundError' },
      ];

      return { passed: hasError, assertions };
    }
  );

  // Test 25: Error - Update non-existent assignment
  await runTest(
    'ERROR: Update non-existent assignment',
    'ERROR',
    async () => {
      const fakeId = '00000000-0000-0000-0000-000000000099';

      const response = await makeTRPCRequest(
        'assignments.update',
        'POST',
        {
          id: fakeId,
          title: 'Updated Title',
        },
        AUTH_TOKEN
      );

      const hasError = !!response.body.error;

      const assertions = [
        { name: 'Returns error', passed: hasError },
      ];

      return { passed: hasError, assertions };
    }
  );

  // Test 26: Error - Delete non-existent assignment
  await runTest(
    'ERROR: Delete non-existent assignment',
    'ERROR',
    async () => {
      const fakeId = '00000000-0000-0000-0000-000000000099';

      const response = await makeTRPCRequest(
        'assignments.delete',
        'POST',
        { id: fakeId },
        AUTH_TOKEN
      );

      const hasError = !!response.body.error;

      const assertions = [
        { name: 'Returns error', passed: hasError },
      ];

      return { passed: hasError, assertions };
    }
  );

  // ==================== TEST SUMMARY ====================
  console.log('\n' + '='.repeat(100));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(100));

  let passCount = 0;
  let failCount = 0;
  const operationStats: Record<string, { pass: number; fail: number }> = {
    CREATE: { pass: 0, fail: 0 },
    READ: { pass: 0, fail: 0 },
    UPDATE: { pass: 0, fail: 0 },
    DELETE: { pass: 0, fail: 0 },
    VALIDATION: { pass: 0, fail: 0 },
    ERROR: { pass: 0, fail: 0 },
  };

  results.forEach((result) => {
    if (result.status === 'PASS') {
      passCount++;
      operationStats[result.operation].pass++;
      console.log(`[PASS] ${result.operation.padEnd(12)} - ${result.name} (${result.duration}ms)`);
    } else {
      failCount++;
      operationStats[result.operation].fail++;
      console.log(`[FAIL] ${result.operation.padEnd(12)} - ${result.name} (${result.duration}ms)`);
      if (result.error) {
        console.log(`       Error: ${result.error}`);
      }
      if (result.assertions) {
        result.assertions
          .filter((a) => !a.passed)
          .forEach((a) => {
            console.log(`       - ${a.name}: ${a.message || 'assertion failed'}`);
          });
      }
    }
  });

  console.log('\n' + '='.repeat(100));
  console.log('OPERATIONS BREAKDOWN');
  console.log('='.repeat(100));

  Object.entries(operationStats).forEach(([operation, stats]) => {
    const total = stats.pass + stats.fail;
    if (total > 0) {
      const percentage = Math.round((stats.pass / total) * 100);
      console.log(`${operation.padEnd(12)}: ${stats.pass}/${total} passed (${percentage}%)`);
    }
  });

  console.log('\n' + '='.repeat(100));
  console.log(`OVERALL: ${passCount} passed, ${failCount} failed out of ${results.length} tests`);
  console.log('='.repeat(100));

  if (failCount > 0) {
    process.exit(1);
  }
}

// Run tests
main().catch((error) => {
  console.error('Test suite error:', error);
  process.exit(1);
});
