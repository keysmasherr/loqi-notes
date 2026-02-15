/**
 * Search/Retrieval Service
 * Implements vector similarity search using pgvector, full-text search, and hybrid search
 */

import { db, noteChunks, noteChunkEmbeddings, notes } from '../../db';
import { generateEmbedding } from '../../lib/openai';
import { logger } from '../../lib/logger';
import { eq, and, sql, gte, lte, isNull } from 'drizzle-orm';
import type { RetrievalInput, RetrievalResult, RetrievedChunk } from './types';

/**
 * Retrieve relevant note chunks using vector similarity search
 *
 * @param input - User ID, query string, and optional filters
 * @returns Chunks ranked by similarity with scores
 */
export async function retrieveChunks(input: RetrievalInput): Promise<RetrievalResult> {
  const startTime = Date.now();
  const limit = input.limit ?? 10;

  try {
    // Step 1: Generate query embedding
    logger.info({ userId: input.userId, query: input.query }, 'Generating query embedding');
    const queryEmbedding = await generateEmbedding(input.query);
    const embeddingTime = Date.now() - startTime;
    logger.info({ embeddingTime }, 'Query embedding generated');

    // Step 2: Build pgvector similarity query
    // Using cosine distance operator <=> from pgvector
    // The distance is between 0 (identical) and 2 (opposite)
    const dbQueryStart = Date.now();

    // Build WHERE conditions
    const conditions = [eq(noteChunks.userId, input.userId)];

    // Add course filter if provided
    if (input.filters?.courseId) {
      conditions.push(eq(noteChunks.courseTag, input.filters.courseId));
    }

    // Add date range filter if provided
    if (input.filters?.dateRange) {
      conditions.push(
        gte(noteChunks.createdAt, input.filters.dateRange.start),
        lte(noteChunks.createdAt, input.filters.dateRange.end)
      );
    }

    // Execute vector similarity search
    // NOTE: The sql`...` template is used for the distance calculation
    // because Drizzle doesn't have native support for pgvector operators yet
    const results = await db
      .select({
        // Chunk fields
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
        // Embedding fields
        embeddingId: noteChunkEmbeddings.id,
        embeddingModel: noteChunkEmbeddings.embeddingModel,
        // Distance calculation using pgvector <=> operator
        distance: sql<number>`${noteChunkEmbeddings.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector`,
      })
      .from(noteChunks)
      .innerJoin(noteChunkEmbeddings, eq(noteChunks.id, noteChunkEmbeddings.chunkId))
      .where(and(...conditions))
      .orderBy(sql`${noteChunkEmbeddings.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector`)
      .limit(limit);

    const dbQueryTime = Date.now() - dbQueryStart;
    const totalLatency = Date.now() - startTime;

    logger.info(
      {
        userId: input.userId,
        resultsCount: results.length,
        embeddingTime,
        dbQueryTime,
        totalLatency,
      },
      'Retrieval complete'
    );

    // Step 3: Transform results to include similarity scores
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
      // Convert distance to similarity: cosine similarity = 1 - cosine distance
      // Higher similarity is better (0-1 range typically)
      similarity: 1 - row.distance,
    }));

    return {
      chunks,
      queryEmbedding,
      latencyMs: totalLatency,
    };
  } catch (error) {
    logger.error(
      { error, userId: input.userId, query: input.query },
      'Failed to retrieve chunks'
    );
    throw error;
  }
}

/**
 * Full-text search using PostgreSQL's to_tsvector
 * Searches across note title and content
 */
export async function fullTextSearch(
  userId: string,
  query: string,
  limit: number = 10,
  courseTag?: string
): Promise<RetrievedChunk[]> {
  try {
    const startTime = Date.now();

    // Build WHERE conditions
    const conditions = [eq(noteChunks.userId, userId)];

    // Filter only non-deleted notes
    conditions.push(isNull(notes.deletedAt));

    // Add course filter if provided
    if (courseTag) {
      conditions.push(eq(noteChunks.courseTag, courseTag));
    }

    // Use PostgreSQL full-text search
    // ts_rank gives relevance score
    const results = await db.execute(sql`
      SELECT
        nc.id,
        nc.user_id as "userId",
        nc.note_id as "noteId",
        nc.note_title as "noteTitle",
        nc.section_path as "sectionPath",
        nc.course_tag as "courseTag",
        nc.content_raw as "contentRaw",
        nc.content_embed as "contentEmbed",
        nc.chunk_index as "chunkIndex",
        nc.created_at as "createdAt",
        nc.updated_at as "updatedAt",
        nce.id as "embeddingId",
        nce.embedding_model as "embeddingModel",
        0 as "distance",
        ts_rank(
          to_tsvector('english', nc.note_title || ' ' || nc.content_raw),
          plainto_tsquery('english', ${query})
        ) as "similarity"
      FROM ${noteChunks} nc
      INNER JOIN ${noteChunkEmbeddings} nce ON nc.id = nce.chunk_id
      INNER JOIN ${notes} n ON nc.note_id = n.id
      WHERE nc.user_id = ${userId}
        AND n.deleted_at IS NULL
        AND to_tsvector('english', nc.note_title || ' ' || nc.content_raw) @@ plainto_tsquery('english', ${query})
        ${courseTag ? sql`AND nc.course_tag = ${courseTag}` : sql``}
      ORDER BY "similarity" DESC
      LIMIT ${limit}
    `);

    const totalLatency = Date.now() - startTime;

    logger.info(
      {
        userId,
        query,
        resultsCount: results.length,
        totalLatency,
      },
      'Full-text search complete'
    );

    return results.map((row: any) => ({
      id: row.id,
      userId: row.userId,
      noteId: row.noteId,
      noteTitle: row.noteTitle,
      sectionPath: row.sectionPath || [],
      courseTag: row.courseTag,
      contentRaw: row.contentRaw,
      contentEmbed: row.contentEmbed,
      chunkIndex: row.chunkIndex,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      embeddingId: row.embeddingId,
      embeddingModel: row.embeddingModel,
      distance: parseFloat(row.distance),
      similarity: parseFloat(row.similarity),
    }));
  } catch (error) {
    logger.error({ error, query, userId }, 'Full-text search failed');
    throw error;
  }
}

/**
 * Hybrid search combines semantic and full-text search
 * Uses RRF (Reciprocal Rank Fusion) to merge results
 */
export async function hybridSearch(input: RetrievalInput): Promise<RetrievalResult> {
  const startTime = Date.now();
  const limit = input.limit ?? 10;

  try {
    // Run both searches in parallel
    const [semanticResult, fullTextResults] = await Promise.all([
      retrieveChunks(input),
      fullTextSearch(input.userId, input.query, limit * 2, input.filters?.courseId),
    ]);

    // Use Reciprocal Rank Fusion (RRF) to combine results
    // RRF score = sum(1 / (k + rank)) where k = 60 is a constant
    const k = 60;
    const scoreMap = new Map<string, { chunk: RetrievedChunk; score: number }>();

    // Add semantic results
    semanticResult.chunks.forEach((chunk, index) => {
      const key = `${chunk.noteId}-${chunk.chunkIndex}`;
      const rrfScore = 1 / (k + index + 1);
      scoreMap.set(key, {
        chunk,
        score: rrfScore,
      });
    });

    // Add full-text results
    fullTextResults.forEach((chunk, index) => {
      const key = `${chunk.noteId}-${chunk.chunkIndex}`;
      const rrfScore = 1 / (k + index + 1);

      const existing = scoreMap.get(key);
      if (existing) {
        // If already exists, add the scores (appears in both results)
        existing.score += rrfScore;
      } else {
        scoreMap.set(key, {
          chunk,
          score: rrfScore,
        });
      }
    });

    // Sort by combined RRF score and take top results
    const mergedChunks = Array.from(scoreMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => ({
        ...item.chunk,
        similarity: item.score, // Use RRF score as similarity
      }));

    const totalLatency = Date.now() - startTime;

    logger.info(
      {
        userId: input.userId,
        query: input.query,
        resultsCount: mergedChunks.length,
        totalLatency,
      },
      'Hybrid search complete'
    );

    return {
      chunks: mergedChunks,
      queryEmbedding: semanticResult.queryEmbedding,
      latencyMs: totalLatency,
    };
  } catch (error) {
    logger.error({ error, userId: input.userId, query: input.query }, 'Hybrid search failed');
    throw error;
  }
}
