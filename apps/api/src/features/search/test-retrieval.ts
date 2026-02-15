/**
 * Test script for Task 1.4: Basic Retrieval
 *
 * This script:
 * 1. Creates 3 test notes (calculus, cooking, history)
 * 2. Chunks them using the chunker service
 * 3. Generates embeddings using OpenAI
 * 4. Tests retrieval queries
 */

import { db, notes, noteChunks, noteChunkEmbeddings } from '../../db';
import { chunkMarkdown } from '../embeddings/chunker';
import { generateEmbedding } from '../../lib/openai';
import { retrieveChunks } from './service';
import { eq } from 'drizzle-orm';
import { logger } from '../../lib/logger';

// Test user ID
const TEST_USER_ID = '145a8c2b-d7af-482d-91e8-8d754538d505';
const DIFFERENT_USER_ID = 'b44ae072-0502-4574-9a4f-a5e06873b401'; // For testing data isolation

// Test notes content
const TEST_NOTES = [
  {
    title: 'Calculus Fundamentals',
    content: `# Calculus Fundamentals

## Derivatives

A derivative measures how a function changes as its input changes. The derivative of a function f(x) at a point x is the slope of the tangent line at that point.

The power rule states that if f(x) = x^n, then f'(x) = nx^(n-1).

### Applications of Derivatives

Derivatives are used to find maximum and minimum values of functions. This is crucial in optimization problems where we want to maximize profit or minimize cost.

## Integrals

An integral is the inverse operation to differentiation. While derivatives measure rates of change, integrals measure accumulated quantities.

The fundamental theorem of calculus connects derivatives and integrals, showing that they are inverse operations.`,
    courseTag: 'MATH301',
  },
  {
    title: 'Italian Cooking Basics',
    content: `# Italian Cooking Basics

## Pasta Making

The key to perfect pasta is using the right ratio of flour to eggs. A classic recipe uses 100g of flour per egg.

### Kneading the Dough

Knead the pasta dough for at least 10 minutes until it becomes smooth and elastic. Let it rest for 30 minutes before rolling.

## Classic Sauces

### Marinara Sauce

A simple marinara sauce requires only tomatoes, garlic, olive oil, and fresh basil. Simmer for 30 minutes to develop rich flavors.

### Carbonara Recipe

Traditional carbonara uses eggs, pecorino cheese, guanciale, and black pepper. Never add cream - that's not authentic!`,
    courseTag: 'COOK101',
  },
  {
    title: 'World War II Overview',
    content: `# World War II Overview

## Causes of WWII

World War II was caused by multiple factors including the Treaty of Versailles, economic depression, and the rise of totalitarian regimes.

### The Treaty of Versailles

The harsh terms imposed on Germany after WWI created resentment and economic hardship, contributing to the rise of extremism.

## Major Battles

The Battle of Stalingrad was a turning point in the European theater. The Soviet victory marked the beginning of Germany's retreat.

### D-Day Invasion

The Normandy landings on June 6, 1944, marked the beginning of the Allied liberation of Western Europe.`,
    courseTag: 'HIST202',
  },
];

async function cleanupTestData() {
  logger.info('Cleaning up existing test data...');

  // Delete notes with these specific titles
  for (const note of TEST_NOTES) {
    await db.delete(notes).where(eq(notes.title, note.title));
  }

  logger.info('Cleanup complete');
}

async function createTestNotes() {
  logger.info('Creating test notes...');

  const createdNotes = [];

  for (const noteData of TEST_NOTES) {
    // Insert note
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

    // Chunk the note
    const chunks = chunkMarkdown({
      noteId: note.id,
      noteTitle: note.title,
      content: note.content,
      courseTag: noteData.courseTag,
    });

    logger.info({ noteId: note.id, chunkCount: chunks.length }, 'Note chunked');

    // Insert chunks and embeddings
    for (const chunk of chunks) {
      // Insert chunk
      const [insertedChunk] = await db
        .insert(noteChunks)
        .values({
          userId: TEST_USER_ID,
          noteId: note.id,
          noteTitle: note.title,
          sectionPath: chunk.metadata.sectionPath,
          courseTag: noteData.courseTag,
          contentRaw: chunk.contentRaw,
          contentEmbed: chunk.contentEmbed,
          chunkIndex: chunk.chunkIndex,
        })
        .returning();

      // Generate and insert embedding
      const embedding = await generateEmbedding(chunk.contentEmbed);

      await db.insert(noteChunkEmbeddings).values({
        chunkId: insertedChunk.id,
        embedding,
        embeddingModel: 'text-embedding-3-small',
      });

      logger.info(
        {
          chunkId: insertedChunk.id,
          chunkIndex: chunk.chunkIndex,
          sectionPath: chunk.metadata.sectionPath,
        },
        'Chunk embedded'
      );
    }

    createdNotes.push(note);
  }

  logger.info({ count: createdNotes.length }, 'All test notes created and embedded');
  return createdNotes;
}

async function runRetrievalTests() {
  logger.info('Starting retrieval tests...');

  const results = {
    passed: 0,
    failed: 0,
    tests: [] as Array<{ name: string; passed: boolean; details: string }>,
  };

  // Test 1: Query "derivative" → calculus chunks rank highest
  logger.info('\n=== Test 1: Query "derivative" ===');
  try {
    const startTime = Date.now();
    const result = await retrieveChunks({
      userId: TEST_USER_ID,
      query: 'derivative',
      limit: 10,
    });
    const latency = Date.now() - startTime;

    logger.info({
      query: 'derivative',
      resultsCount: result.chunks.length,
      latency,
      topResult: result.chunks[0] ? {
        noteTitle: result.chunks[0].noteTitle,
        similarity: result.chunks[0].similarity,
        sectionPath: result.chunks[0].sectionPath,
      } : null,
    });

    // Check if calculus note ranks highest
    const topChunk = result.chunks[0];
    const isCalculusTop = topChunk && topChunk.noteTitle === 'Calculus Fundamentals';

    if (isCalculusTop) {
      results.passed++;
      results.tests.push({
        name: 'Query "derivative" returns calculus chunks highest',
        passed: true,
        details: `Top result: "${topChunk.noteTitle}" (similarity: ${topChunk.similarity.toFixed(3)})`,
      });
      logger.info('✓ Test 1 PASSED');
    } else {
      results.failed++;
      results.tests.push({
        name: 'Query "derivative" returns calculus chunks highest',
        passed: false,
        details: `Top result: "${topChunk?.noteTitle}" (expected "Calculus Fundamentals")`,
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
    logger.error({ error }, '✗ Test 1 FAILED with error');
  }

  // Test 2: Query "recipe" → cooking chunks rank highest
  logger.info('\n=== Test 2: Query "recipe" ===');
  try {
    const startTime = Date.now();
    const result = await retrieveChunks({
      userId: TEST_USER_ID,
      query: 'recipe',
      limit: 10,
    });
    const latency = Date.now() - startTime;

    logger.info({
      query: 'recipe',
      resultsCount: result.chunks.length,
      latency,
      topResult: result.chunks[0] ? {
        noteTitle: result.chunks[0].noteTitle,
        similarity: result.chunks[0].similarity,
        sectionPath: result.chunks[0].sectionPath,
      } : null,
    });

    const topChunk = result.chunks[0];
    const isCookingTop = topChunk && topChunk.noteTitle === 'Italian Cooking Basics';

    if (isCookingTop) {
      results.passed++;
      results.tests.push({
        name: 'Query "recipe" returns cooking chunks highest',
        passed: true,
        details: `Top result: "${topChunk.noteTitle}" (similarity: ${topChunk.similarity.toFixed(3)})`,
      });
      logger.info('✓ Test 2 PASSED');
    } else {
      results.failed++;
      results.tests.push({
        name: 'Query "recipe" returns cooking chunks highest',
        passed: false,
        details: `Top result: "${topChunk?.noteTitle}" (expected "Italian Cooking Basics")`,
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
    logger.error({ error }, '✗ Test 2 FAILED with error');
  }

  // Test 3: Query with wrong user_id → returns empty
  logger.info('\n=== Test 3: Query with wrong user_id ===');
  try {
    const result = await retrieveChunks({
      userId: DIFFERENT_USER_ID,
      query: 'derivative',
      limit: 10,
    });

    logger.info({
      query: 'derivative',
      userId: DIFFERENT_USER_ID,
      resultsCount: result.chunks.length,
    });

    const isEmpty = result.chunks.length === 0;

    if (isEmpty) {
      results.passed++;
      results.tests.push({
        name: 'Query with wrong user_id returns empty (no data leakage)',
        passed: true,
        details: 'Returned 0 chunks as expected',
      });
      logger.info('✓ Test 3 PASSED');
    } else {
      results.failed++;
      results.tests.push({
        name: 'Query with wrong user_id returns empty (no data leakage)',
        passed: false,
        details: `Returned ${result.chunks.length} chunks (expected 0) - DATA LEAKAGE!`,
      });
      logger.error('✗ Test 3 FAILED - DATA LEAKAGE DETECTED!');
    }
  } catch (error) {
    results.failed++;
    results.tests.push({
      name: 'Query with wrong user_id returns empty (no data leakage)',
      passed: false,
      details: `Error: ${error}`,
    });
    logger.error({ error }, '✗ Test 3 FAILED with error');
  }

  // Test 4: Query with course filter
  logger.info('\n=== Test 4: Query with course filter ===');
  try {
    const result = await retrieveChunks({
      userId: TEST_USER_ID,
      query: 'what is',
      filters: {
        courseId: 'MATH301',
      },
      limit: 10,
    });

    logger.info({
      query: 'what is',
      courseFilter: 'MATH301',
      resultsCount: result.chunks.length,
      chunks: result.chunks.map(c => ({ noteTitle: c.noteTitle, courseTag: c.courseTag })),
    });

    const allFromCourse = result.chunks.every(c => c.courseTag === 'MATH301');

    if (allFromCourse && result.chunks.length > 0) {
      results.passed++;
      results.tests.push({
        name: 'Query with course filter returns only chunks from that course',
        passed: true,
        details: `All ${result.chunks.length} chunks are from MATH301`,
      });
      logger.info('✓ Test 4 PASSED');
    } else {
      results.failed++;
      results.tests.push({
        name: 'Query with course filter returns only chunks from that course',
        passed: false,
        details: allFromCourse
          ? 'No chunks returned'
          : `Some chunks not from MATH301: ${result.chunks.filter(c => c.courseTag !== 'MATH301').map(c => c.noteTitle)}`,
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
    logger.error({ error }, '✗ Test 4 FAILED with error');
  }

  // Test 5: Measure latency
  logger.info('\n=== Test 5: Latency measurement ===');
  try {
    const latencies: number[] = [];

    // Run 5 queries to get average latency
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
      allLatencies: latencies.map(l => `${l.toFixed(0)}ms`),
    });

    const underThreshold = avgLatency < 500;

    if (underThreshold) {
      results.passed++;
      results.tests.push({
        name: 'Latency is under 500ms',
        passed: true,
        details: `Average: ${avgLatency.toFixed(0)}ms, Max: ${maxLatency.toFixed(0)}ms`,
      });
      logger.info('✓ Test 5 PASSED');
    } else {
      results.failed++;
      results.tests.push({
        name: 'Latency is under 500ms',
        passed: false,
        details: `Average: ${avgLatency.toFixed(0)}ms (expected <500ms)`,
      });
      logger.error('✗ Test 5 FAILED');
    }
  } catch (error) {
    results.failed++;
    results.tests.push({
      name: 'Latency is under 500ms',
      passed: false,
      details: `Error: ${error}`,
    });
    logger.error({ error }, '✗ Test 5 FAILED with error');
  }

  // Print summary
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
    logger.info('Starting Task 1.4 validation tests');

    // Clean up any existing test data
    await cleanupTestData();

    // Create test notes with chunks and embeddings
    await createTestNotes();

    // Run retrieval tests
    const results = await runRetrievalTests();

    // Exit with appropriate code
    if (results.failed === 0) {
      logger.info('✓ All tests passed!');
      process.exit(0);
    } else {
      logger.error(`✗ ${results.failed} test(s) failed`);
      process.exit(1);
    }
  } catch (error) {
    logger.error({ error }, 'Test script failed');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { createTestNotes, runRetrievalTests, cleanupTestData };
