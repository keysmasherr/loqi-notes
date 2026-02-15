/**
 * Full test for Task 1.4: Basic Retrieval
 * Tests the actual retrieveChunks service with mock embeddings
 */

import { db, notes, noteChunks, noteChunkEmbeddings } from '../../db';
import { retrieveChunks } from './service-mocked';
import { eq } from 'drizzle-orm';
import { logger } from '../../lib/logger';

// Test user IDs
const TEST_USER_ID = '145a8c2b-d7af-482d-91e8-8d754538d505';
const DIFFERENT_USER_ID = 'b44ae072-0502-4574-9a4f-a5e06873b401';

/**
 * Generate a mock embedding vector that simulates semantic similarity
 */
function generateMockEmbedding(text: string, topic: string): number[] {
  const embedding = new Array(1536).fill(0).map(() => Math.random() * 0.1 - 0.05);

  // Boost specific dimensions based on topic to simulate semantic similarity
  // This creates distinct clusters in the embedding space
  if (topic === 'calculus' && (text.toLowerCase().includes('derivative') || text.toLowerCase().includes('calculus'))) {
    for (let i = 0; i < 150; i++) {
      embedding[i] = 0.7 + Math.random() * 0.3;
    }
  } else if (topic === 'cooking' && (text.toLowerCase().includes('recipe') || text.toLowerCase().includes('cooking') || text.toLowerCase().includes('sauce'))) {
    for (let i = 500; i < 650; i++) {
      embedding[i] = 0.7 + Math.random() * 0.3;
    }
  } else if (topic === 'history' && (text.toLowerCase().includes('war') || text.toLowerCase().includes('history'))) {
    for (let i = 1000; i < 1150; i++) {
      embedding[i] = 0.7 + Math.random() * 0.3;
    }
  }

  return embedding;
}


async function cleanupTestData() {
  logger.info('Cleaning up test data...');
  await db.delete(notes).where(eq(notes.userId, TEST_USER_ID));
  logger.info('Cleanup complete');
}

async function createTestData() {
  logger.info('Creating test notes with mock embeddings...');

  const testNotes = [
    {
      title: 'Calculus Fundamentals',
      content: `# Calculus Fundamentals

## Derivatives

A derivative measures how a function changes as its input changes. The derivative of a function f(x) at a point x is the slope of the tangent line at that point.

The power rule states that if f(x) = x^n, then f'(x) = nx^(n-1).`,
      courseTag: 'MATH301',
      topic: 'calculus',
    },
    {
      title: 'More on Derivatives',
      content: `## Advanced Derivatives

Applications of derivatives include finding maximum and minimum values. This is crucial in optimization problems where we want to maximize profit or minimize cost.`,
      courseTag: 'MATH301',
      topic: 'calculus',
    },
    {
      title: 'Italian Cooking Basics',
      content: `# Italian Cooking

## Pasta Recipe

The key to perfect pasta is using the right ratio of flour to eggs. A classic recipe uses 100g of flour per egg.

## Marinara Sauce

A simple marinara sauce recipe requires only tomatoes, garlic, olive oil, and fresh basil.`,
      courseTag: 'COOK101',
      topic: 'cooking',
    },
    {
      title: 'World War II Overview',
      content: `# World War II

## Causes

World War II was caused by multiple factors including the Treaty of Versailles, economic depression, and the rise of totalitarian regimes.

## Major Battles

The Battle of Stalingrad was a turning point in the European theater.`,
      courseTag: 'HIST202',
      topic: 'history',
    },
  ];

  for (const noteData of testNotes) {
    const [note] = await db
      .insert(notes)
      .values({
        userId: TEST_USER_ID,
        title: noteData.title,
        content: noteData.content,
        wordCount: noteData.content.split(/\s+/).length,
      })
      .returning();

    logger.info({ noteId: note.id, title: note.title }, 'Note created');

    const contentEmbed = `Title: ${noteData.title} | Course: ${noteData.courseTag}\n\n${noteData.content}`;

    const [chunk] = await db
      .insert(noteChunks)
      .values({
        userId: TEST_USER_ID,
        noteId: note.id,
        noteTitle: note.title,
        sectionPath: [],
        courseTag: noteData.courseTag,
        contentRaw: noteData.content,
        contentEmbed: contentEmbed,
        chunkIndex: 0,
      })
      .returning();

    const embedding = generateMockEmbedding(noteData.content, noteData.topic);

    await db.insert(noteChunkEmbeddings).values({
      chunkId: chunk.id,
      embedding,
      embeddingModel: 'mock-for-testing',
    });

    logger.info({ chunkId: chunk.id, topic: noteData.topic }, 'Chunk created');
  }

  logger.info('Test data created');
}

async function runTests() {
  logger.info('\n=== Testing Retrieval Service ===\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: [] as Array<{ name: string; passed: boolean; details: string }>,
  };

  // Test 1: Query "derivative" should return calculus content highest
  logger.info('Test 1: Query "derivative" returns calculus chunks highest');
  try {
    const result = await retrieveChunks({
      userId: TEST_USER_ID,
      query: 'derivative',
      limit: 10,
    });

    logger.info({
      resultsCount: result.chunks.length,
      topResult: result.chunks[0] ? {
        title: result.chunks[0].noteTitle,
        similarity: result.chunks[0].similarity.toFixed(3),
      } : null,
    });

    const calculusChunks = result.chunks.filter(c => c.noteTitle.includes('Calculus') || c.noteTitle.includes('Derivatives'));
    const topIsCalculus = result.chunks.length > 0 && calculusChunks.length > 0 && calculusChunks[0] === result.chunks[0];

    if (topIsCalculus) {
      results.passed++;
      results.tests.push({
        name: 'Query "derivative" returns calculus chunks highest',
        passed: true,
        details: `Top: ${result.chunks[0].noteTitle} (similarity: ${result.chunks[0].similarity.toFixed(3)})`,
      });
      logger.info('✓ Test 1 PASSED');
    } else {
      results.failed++;
      results.tests.push({
        name: 'Query "derivative" returns calculus chunks highest',
        passed: false,
        details: `Top: ${result.chunks[0]?.noteTitle || 'none'} (expected calculus-related)`,
      });
      logger.error('✗ Test 1 FAILED');
    }
  } catch (error) {
    results.failed++;
    results.tests.push({
      name: 'Query "derivative" returns calculus chunks highest',
      passed: false,
      details: `Error: ${error}`,
    });
    logger.error({ error }, '✗ Test 1 FAILED');
  }

  // Test 2: Query "recipe" should return cooking content highest
  logger.info('\nTest 2: Query "recipe" returns cooking chunks highest');
  try {
    const result = await retrieveChunks({
      userId: TEST_USER_ID,
      query: 'recipe',
      limit: 10,
    });

    logger.info({
      resultsCount: result.chunks.length,
      topResult: result.chunks[0] ? {
        title: result.chunks[0].noteTitle,
        similarity: result.chunks[0].similarity.toFixed(3),
      } : null,
    });

    const topIsCooking = result.chunks.length > 0 && result.chunks[0].noteTitle.includes('Cooking');

    if (topIsCooking) {
      results.passed++;
      results.tests.push({
        name: 'Query "recipe" returns cooking chunks highest',
        passed: true,
        details: `Top: ${result.chunks[0].noteTitle} (similarity: ${result.chunks[0].similarity.toFixed(3)})`,
      });
      logger.info('✓ Test 2 PASSED');
    } else {
      results.failed++;
      results.tests.push({
        name: 'Query "recipe" returns cooking chunks highest',
        passed: false,
        details: `Top: ${result.chunks[0]?.noteTitle || 'none'} (expected Italian Cooking)`,
      });
      logger.error('✗ Test 2 FAILED');
    }
  } catch (error) {
    results.failed++;
    results.tests.push({
      name: 'Query "recipe" returns cooking chunks highest',
      passed: false,
      details: `Error: ${error}`,
    });
    logger.error({ error }, '✗ Test 2 FAILED');
  }

  // Test 3: Wrong user_id returns empty
  logger.info('\nTest 3: Query with wrong user_id returns empty');
  try {
    const result = await retrieveChunks({
      userId: DIFFERENT_USER_ID,
      query: 'derivative',
      limit: 10,
    });

    const isEmpty = result.chunks.length === 0;

    if (isEmpty) {
      results.passed++;
      results.tests.push({
        name: 'Query with wrong user_id returns empty (no data leakage)',
        passed: true,
        details: 'No chunks returned',
      });
      logger.info('✓ Test 3 PASSED');
    } else {
      results.failed++;
      results.tests.push({
        name: 'Query with wrong user_id returns empty (no data leakage)',
        passed: false,
        details: `DATA LEAKAGE: ${result.chunks.length} chunks returned`,
      });
      logger.error('✗ Test 3 FAILED - DATA LEAKAGE!');
    }
  } catch (error) {
    results.failed++;
    results.tests.push({
      name: 'Query with wrong user_id returns empty (no data leakage)',
      passed: false,
      details: `Error: ${error}`,
    });
    logger.error({ error }, '✗ Test 3 FAILED');
  }

  // Test 4: Course filter
  logger.info('\nTest 4: Query with course filter');
  try {
    const result = await retrieveChunks({
      userId: TEST_USER_ID,
      query: 'what is this about',
      filters: { courseId: 'MATH301' },
      limit: 10,
    });

    logger.info({
      resultsCount: result.chunks.length,
      courses: result.chunks.map(c => c.courseTag),
    });

    const allFromCourse = result.chunks.every(c => c.courseTag === 'MATH301');

    if (allFromCourse && result.chunks.length > 0) {
      results.passed++;
      results.tests.push({
        name: 'Query with course filter returns only chunks from that course',
        passed: true,
        details: `All ${result.chunks.length} chunks from MATH301`,
      });
      logger.info('✓ Test 4 PASSED');
    } else {
      results.failed++;
      results.tests.push({
        name: 'Query with course filter returns only chunks from that course',
        passed: false,
        details: allFromCourse ? 'No chunks returned' : 'Some chunks from other courses',
      });
      logger.error('✗ Test 4 FAILED');
    }
  } catch (error) {
    results.failed++;
    results.tests.push({
      name: 'Query with course filter returns only chunks from that course',
      passed: false,
      details: `Error: ${error}`,
    });
    logger.error({ error }, '✗ Test 4 FAILED');
  }

  // Test 5: Latency
  logger.info('\nTest 5: Latency measurement');
  try {
    const latencies: number[] = [];

    for (let i = 0; i < 5; i++) {
      const result = await retrieveChunks({
        userId: TEST_USER_ID,
        query: 'test query',
        limit: 10,
      });
      latencies.push(result.latencyMs);
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);

    logger.info({
      avgLatency: `${avgLatency.toFixed(0)}ms`,
      maxLatency: `${maxLatency.toFixed(0)}ms`,
    });

    if (avgLatency < 500) {
      results.passed++;
      results.tests.push({
        name: 'Query latency under 500ms',
        passed: true,
        details: `Avg: ${avgLatency.toFixed(0)}ms, Max: ${maxLatency.toFixed(0)}ms`,
      });
      logger.info('✓ Test 5 PASSED');
    } else {
      results.failed++;
      results.tests.push({
        name: 'Query latency under 500ms',
        passed: false,
        details: `Avg latency ${avgLatency.toFixed(0)}ms exceeds 500ms`,
      });
      logger.error('✗ Test 5 FAILED');
    }
  } catch (error) {
    results.failed++;
    results.tests.push({
      name: 'Query latency under 500ms',
      passed: false,
      details: `Error: ${error}`,
    });
    logger.error({ error }, '✗ Test 5 FAILED');
  }

  // Summary
  logger.info('\n=== TEST SUMMARY ===');
  logger.info({
    total: results.passed + results.failed,
    passed: results.passed,
    failed: results.failed,
  });

  for (const test of results.tests) {
    const status = test.passed ? '✓ PASS' : '✗ FAIL';
    logger.info(`${status}: ${test.name}`);
    logger.info(`  ${test.details}`);
  }

  return results;
}

async function main() {
  try {
    await cleanupTestData();
    await createTestData();
    const results = await runTests();

    if (results.failed === 0) {
      logger.info('\n✓ All tests passed!');
      process.exit(0);
    } else {
      logger.error(`\n✗ ${results.failed} test(s) failed`);
      process.exit(1);
    }
  } catch (error) {
    logger.error({ error }, 'Test failed');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
