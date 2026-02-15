/**
 * Search/Retrieval Types
 * Used for RAG retrieval queries
 */

/**
 * Filters for search queries
 */
export interface RetrievalFilters {
  courseId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Retrieved chunk with similarity score
 */
export interface RetrievedChunk {
  // Chunk data
  id: string;
  userId: string;
  noteId: string;
  noteTitle: string;
  sectionPath: string[];
  courseTag: string | null;
  contentRaw: string;
  contentEmbed: string;
  chunkIndex: number;
  createdAt: Date;
  updatedAt: Date;

  // Embedding metadata
  embeddingId: string;
  embeddingModel: string;

  // Similarity score (cosine distance from pgvector, lower is better)
  // Note: We'll convert to similarity score (1 - distance) for user-facing values
  distance: number;
  similarity: number; // 1 - distance, higher is better
}

/**
 * Input for retrieval query
 */
export interface RetrievalInput {
  userId: string;
  query: string;
  filters?: RetrievalFilters;
  limit?: number; // Default 10
}

/**
 * Result from retrieval query
 */
export interface RetrievalResult {
  chunks: RetrievedChunk[];
  queryEmbedding: number[];
  latencyMs: number;
}
