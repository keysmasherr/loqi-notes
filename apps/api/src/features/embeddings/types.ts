/**
 * Types for the chunking service
 */

export interface ChunkMetadata {
  noteTitle: string;
  sectionPath: string[];
  courseTag?: string;
}

export interface Chunk {
  contentRaw: string;
  contentEmbed: string;
  metadata: ChunkMetadata;
  chunkIndex: number;
}

export interface ChunkerInput {
  noteId: string;
  noteTitle: string;
  content: string;
  courseTag?: string;
}

export interface ChunkerOptions {
  minTokens?: number; // Minimum tokens per chunk (default: 80)
  targetMinTokens?: number; // Target minimum tokens (default: 250)
  targetMaxTokens?: number; // Target maximum tokens (default: 350)
}
