/**
 * AI Feature Types
 * Types for RAG query and response
 */

import type { RetrievalFilters } from '../search/types';

/**
 * Input for asking a question using RAG
 */
export interface AskInput {
  query: string;
  filters?: RetrievalFilters;
  limit?: number; // Number of chunks to retrieve (default 10)
}

/**
 * Cited chunk in the response
 */
export interface CitedChunk {
  id: string;
  noteTitle: string;
  sectionPath: string[];
  courseTag: string | null;
  contentRaw: string;
  similarity: number;
}

/**
 * Result from RAG query
 */
export interface AskResult {
  answer: string;
  citedChunks: CitedChunk[];
  insufficientContext: boolean;
  latencyMs: number;
}
