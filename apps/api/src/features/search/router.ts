import { z } from 'zod';
import { router, protectedProcedure } from '../../trpc';
import { retrieveChunks, fullTextSearch, hybridSearch } from './service';
import { SemanticSearchInputSchema, SearchResultSchema } from '@loqi-notes/shared-types';

/**
 * Search Router
 * Provides semantic, full-text, and hybrid search endpoints
 */
export const searchRouter = router({
  /**
   * Semantic search using vector similarity
   * Uses OpenAI embeddings + pgvector cosine distance
   */
  semantic: protectedProcedure
    .input(SemanticSearchInputSchema)
    .output(z.array(SearchResultSchema))
    .query(async ({ input, ctx }) => {
      const { query, limit = 10, minSimilarity = 0.7, tagIds } = input;

      const result = await retrieveChunks({
        userId: ctx.user.id,
        query,
        limit,
        filters: {
          courseId: tagIds?.[0], // For now, use first tag as course filter
        },
      });

      // Filter by minimum similarity and transform to SearchResult format
      return result.chunks
        .filter((chunk) => chunk.similarity >= minSimilarity)
        .map((chunk) => ({
          noteId: chunk.noteId,
          title: chunk.noteTitle,
          content: chunk.contentRaw,
          similarity: chunk.similarity,
          chunkIndex: chunk.chunkIndex,
          createdAt: chunk.createdAt,
          updatedAt: chunk.updatedAt,
        }));
    }),

  /**
   * Full-text search using PostgreSQL's to_tsvector
   * Fast keyword-based search
   */
  fullText: protectedProcedure
    .input(SemanticSearchInputSchema)
    .output(z.array(SearchResultSchema))
    .query(async ({ input, ctx }) => {
      const { query, limit = 10, tagIds } = input;

      const chunks = await fullTextSearch(
        ctx.user.id,
        query,
        limit,
        tagIds?.[0] // Use first tag as course filter
      );

      return chunks.map((chunk) => ({
        noteId: chunk.noteId,
        title: chunk.noteTitle,
        content: chunk.contentRaw,
        similarity: chunk.similarity,
        chunkIndex: chunk.chunkIndex,
        createdAt: chunk.createdAt,
        updatedAt: chunk.updatedAt,
      }));
    }),

  /**
   * Hybrid search combining semantic and full-text
   * Uses Reciprocal Rank Fusion (RRF) to merge results
   */
  hybrid: protectedProcedure
    .input(SemanticSearchInputSchema)
    .output(z.array(SearchResultSchema))
    .query(async ({ input, ctx }) => {
      const { query, limit = 10, minSimilarity = 0.7, tagIds } = input;

      const result = await hybridSearch({
        userId: ctx.user.id,
        query,
        limit,
        filters: {
          courseId: tagIds?.[0], // Use first tag as course filter
        },
      });

      // Filter by minimum similarity and transform to SearchResult format
      return result.chunks
        .filter((chunk) => chunk.similarity >= minSimilarity)
        .map((chunk) => ({
          noteId: chunk.noteId,
          title: chunk.noteTitle,
          content: chunk.contentRaw,
          similarity: chunk.similarity,
          chunkIndex: chunk.chunkIndex,
          createdAt: chunk.createdAt,
          updatedAt: chunk.updatedAt,
        }));
    }),
});
