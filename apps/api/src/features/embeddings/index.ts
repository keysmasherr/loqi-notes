/**
 * Embeddings Feature - Public API
 *
 * Exports chunking functionality for use in the RAG pipeline
 */

export { chunkMarkdown, countTokens, freeEncoder } from './chunker';
export type { Chunk, ChunkMetadata, ChunkerInput, ChunkerOptions } from './types';
