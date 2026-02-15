/**
 * Mocked version of retrieval service for testing without OpenAI API
 */

import { db, noteChunks, noteChunkEmbeddings } from '../../db';
import { logger } from '../../lib/logger';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import type { RetrievalInput, RetrievalResult, RetrievedChunk } from './types';

/**
 * Generate a mock embedding for testing
 */
function generateMockEmbedding(text: string): number[] {
  const embedding = new Array(1536).fill(0).map(() => Math.random() * 0.1 - 0.05);
  const lowerText = text.toLowerCase();

  // Create distinct clusters based on content
  if (lowerText.includes('derivative') || lowerText.includes('calculus') || lowerText.includes('integral')) {
    for (let i = 0; i < 150; i++) {
      embedding[i] = 0.7 + Math.random() * 0.3;
    }
  } else if (lowerText.includes('recipe') || lowerText.includes('cooking') || lowerText.includes('sauce') || lowerText.includes('pasta')) {
    for (let i = 500; i < 650; i++) {
      embedding[i] = 0.7 + Math.random() * 0.3;
    }
  } else if (lowerText.includes('war') || lowerText.includes('history') || lowerText.includes('battle')) {
    for (let i = 1000; i < 1150; i++) {
      embedding[i] = 0.7 + Math.random() * 0.3;
    }
  }

  return embedding;
}

/**
 * Retrieve chunks using mock embeddings
 */
export async function retrieveChunks(input: RetrievalInput): Promise<RetrievalResult> {
  const startTime = Date.now();
  const limit = input.limit ?? 10;

  try {
    logger.info({ userId: input.userId, query: input.query }, 'Generating mock embedding');
    const queryEmbedding = generateMockEmbedding(input.query);
    const embeddingTime = Date.now() - startTime;

    const dbQueryStart = Date.now();

    const conditions = [eq(noteChunks.userId, input.userId)];

    if (input.filters?.courseId) {
      conditions.push(eq(noteChunks.courseTag, input.filters.courseId));
    }

    if (input.filters?.dateRange) {
      conditions.push(
        gte(noteChunks.createdAt, input.filters.dateRange.start),
        lte(noteChunks.createdAt, input.filters.dateRange.end)
      );
    }

    const results = await db
      .select({
        id: noteChunks.id,
        userId: noteChunks.userId,
        noteId: noteChunks.noteId,
        noteTitle: noteChunks.noteTitle,
        sectionPath: noteChunks.sectionPath,
        courseTag: noteChunks.courseTag,
        contentRaw: noteChunks.contentRaw,
        contentEmbed: noteChunks.contentEmbed,
        chunkIndex: noteChunks.chunkIndex,
        createdAt: noteChunks.createdAt,
        updatedAt: noteChunks.updatedAt,
        embeddingId: noteChunkEmbeddings.id,
        embeddingModel: noteChunkEmbeddings.embeddingModel,
        distance: sql<number>`${noteChunkEmbeddings.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector`,
      })
      .from(noteChunks)
      .innerJoin(noteChunkEmbeddings, eq(noteChunks.id, noteChunkEmbeddings.chunkId))
      .where(and(...conditions))
      .orderBy(sql`${noteChunkEmbeddings.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector`)
      .limit(limit);

    const dbQueryTime = Date.now() - dbQueryStart;
    const totalLatency = Date.now() - startTime;

    logger.info({
      userId: input.userId,
      resultsCount: results.length,
      embeddingTime,
      dbQueryTime,
      totalLatency,
    }, 'Retrieval complete');

    const chunks: RetrievedChunk[] = results.map((row) => ({
      id: row.id,
      userId: row.userId,
      noteId: row.noteId,
      noteTitle: row.noteTitle,
      sectionPath: row.sectionPath,
      courseTag: row.courseTag,
      contentRaw: row.contentRaw,
      contentEmbed: row.contentEmbed,
      chunkIndex: row.chunkIndex,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      embeddingId: row.embeddingId,
      embeddingModel: row.embeddingModel,
      distance: row.distance,
      similarity: 1 - row.distance,
    }));

    return {
      chunks,
      queryEmbedding,
      latencyMs: totalLatency,
    };
  } catch (error) {
    logger.error({ error, userId: input.userId, query: input.query }, 'Failed to retrieve chunks');
    throw error;
  }
}
