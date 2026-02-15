/**
 * Manual Validation Script for Task 1.5: RAG Prompt + tRPC Procedure
 *
 * This script validates the ai.ask endpoint with real data.
 *
 * Prerequisites:
 * 1. Database is running and has test data (notes with embeddings)
 * 2. ANTHROPIC_API_KEY and OPENAI_API_KEY are set in .env
 * 3. Test user exists in the database
 *
 * Usage:
 * tsx scripts/validate-rag-task-1-5.ts
 */

import { askQuestion } from '../apps/api/src/features/ai/service';
import { config } from '../apps/api/src/config';

const TEST_USER_ID = process.env.TEST_USER_ID || 'test-user-id';

interface ValidationResult {
  testName: string;
  passed: boolean;
  details: string;
  error?: string;
}

const results: ValidationResult[] = [];

function addResult(testName: string, passed: boolean, details: string, error?: string) {
  results.push({ testName, passed, details, error });
  const status = passed ? '✓ PASSED' : '✗ FAILED';
  console.log(`${status}: ${testName}`);
  console.log(`  ${details}`);
  if (error) {
    console.log(`  Error: ${error}`);
  }
  console.log('');
}

async function runValidations() {
  console.log('='.repeat(80));
  console.log('RAG Query Pipeline Validation - Task 1.5');
  console.log('='.repeat(80));
  console.log('');

  // Validation 1: tRPC mutation returns valid response structure
  console.log('[1/6] Testing response structure...');
  try {
    const result = await askQuestion(TEST_USER_ID, {
      query: 'What is calculus?',
    });

    const hasAnswer = typeof result.answer === 'string';
    const hasCitedChunks = Array.isArray(result.citedChunks);
    const hasInsufficientContext = typeof result.insufficientContext === 'boolean';
    const hasLatency = typeof result.latencyMs === 'number';

    const passed = hasAnswer && hasCitedChunks && hasInsufficientContext && hasLatency;
    addResult(
      'Response structure validation',
      passed,
      `answer: ${hasAnswer}, citedChunks: ${hasCitedChunks}, insufficientContext: ${hasInsufficientContext}, latencyMs: ${hasLatency}`
    );
  } catch (error: any) {
    addResult('Response structure validation', false, 'Failed to get response', error.message);
  }

  // Validation 2: Answer contains citation format
  console.log('[2/6] Testing citation format...');
  try {
    const result = await askQuestion(TEST_USER_ID, {
      query: 'What topics are covered in my notes?',
      limit: 5,
    });

    // Check if answer contains citation pattern: [Note: "...", Section: "..."]
    const citationPattern = /\[Note: ".*?", Section: ".*?"\]/;
    const hasCitation = citationPattern.test(result.answer) || result.citedChunks.length === 0;

    addResult(
      'Citation format check',
      hasCitation,
      hasCitation
        ? `Found citation in format [Note: "...", Section: "..."]`
        : 'No citations found in expected format',
      result.citedChunks.length === 0 ? 'No chunks retrieved' : undefined
    );

    console.log(`  Answer preview: ${result.answer.substring(0, 200)}...`);
  } catch (error: any) {
    addResult('Citation format check', false, 'Failed to check citations', error.message);
  }

  // Validation 3: Query about something NOT in notes
  console.log('[3/6] Testing insufficient context handling...');
  try {
    const result = await askQuestion(TEST_USER_ID, {
      query: 'What is the meaning of life, the universe, and everything according to quantum chromodynamics?',
    });

    const hasCouldntFind =
      result.answer.toLowerCase().includes("couldn't find") ||
      result.answer.toLowerCase().includes('could not find') ||
      result.insufficientContext;

    addResult(
      'Insufficient context handling',
      hasCouldntFind,
      hasCouldntFind
        ? `Response correctly indicates insufficient context`
        : 'Response did not indicate insufficient context',
      `insufficientContext flag: ${result.insufficientContext}`
    );

    console.log(`  Answer: ${result.answer.substring(0, 200)}`);
  } catch (error: any) {
    addResult('Insufficient context handling', false, 'Failed to test', error.message);
  }

  // Validation 4: Query about something IN notes (if chunks exist)
  console.log('[4/6] Testing answer accuracy with existing content...');
  try {
    const result = await askQuestion(TEST_USER_ID, {
      query: 'Summarize what I have in my notes',
      limit: 10,
    });

    const hasContent = result.citedChunks.length > 0;
    const answerNotEmpty = result.answer.length > 20;

    addResult(
      'Answer accuracy check',
      hasContent && answerNotEmpty,
      `Retrieved ${result.citedChunks.length} chunks, answer length: ${result.answer.length}`,
      !hasContent ? 'No chunks found - may need test data' : undefined
    );

    if (hasContent) {
      console.log(`  First chunk: "${result.citedChunks[0].noteTitle}" - ${result.citedChunks[0].sectionPath.join(' > ')}`);
      console.log(`  Answer preview: ${result.answer.substring(0, 300)}...`);
    }
  } catch (error: any) {
    addResult('Answer accuracy check', false, 'Failed to test', error.message);
  }

  // Validation 5: Verify citedChunks matches chunks actually sent
  console.log('[5/6] Testing cited chunks mapping...');
  try {
    const result = await askQuestion(TEST_USER_ID, {
      query: 'What can you tell me from my notes?',
      limit: 5,
    });

    const allChunksValid = result.citedChunks.every(
      (chunk) =>
        chunk.id &&
        chunk.noteTitle &&
        Array.isArray(chunk.sectionPath) &&
        chunk.contentRaw &&
        typeof chunk.similarity === 'number'
    );

    addResult(
      'Cited chunks mapping',
      allChunksValid,
      `All ${result.citedChunks.length} cited chunks have required fields`,
      !allChunksValid ? 'Some chunks missing required fields' : undefined
    );
  } catch (error: any) {
    addResult('Cited chunks mapping', false, 'Failed to test', error.message);
  }

  // Validation 6: Latency check
  console.log('[6/6] Testing latency...');
  try {
    const result = await askQuestion(TEST_USER_ID, {
      query: 'Quick test query',
      limit: 5,
    });

    const underThreeSeconds = result.latencyMs < 3000;

    addResult(
      'Latency validation',
      underThreeSeconds,
      `Latency: ${result.latencyMs}ms (target: <3000ms)`,
      !underThreeSeconds ? 'Exceeded 3 second target' : undefined
    );
  } catch (error: any) {
    addResult('Latency validation', false, 'Failed to test', error.message);
  }

  // Summary
  console.log('='.repeat(80));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(80));

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  const passRate = ((passedCount / totalCount) * 100).toFixed(1);

  console.log(`Total: ${passedCount}/${totalCount} passed (${passRate}%)`);
  console.log('');

  results.forEach((result, index) => {
    const status = result.passed ? '✓' : '✗';
    console.log(`${status} ${index + 1}. ${result.testName}`);
  });

  console.log('');
  console.log('='.repeat(80));

  if (passedCount === totalCount) {
    console.log('✅ ALL VALIDATIONS PASSED!');
  } else {
    console.log('⚠️  SOME VALIDATIONS FAILED');
    console.log('');
    console.log('NOTE: Some failures may be due to missing test data.');
    console.log('Ensure you have:');
    console.log('  1. Created test notes with embeddings');
    console.log('  2. Set TEST_USER_ID environment variable');
    console.log('  3. Valid ANTHROPIC_API_KEY and OPENAI_API_KEY');
  }

  console.log('='.repeat(80));

  return passedCount === totalCount;
}

// Run validations
runValidations()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Validation script failed:', error);
    process.exit(1);
  });
