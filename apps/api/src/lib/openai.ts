/**
 * OpenAI API Client
 *
 * Provides embeddings generation for RAG pipeline
 * Uses text-embedding-3-small model (1536 dimensions)
 */

import OpenAI from 'openai';
import { config } from '../config';
import { logger } from './logger';

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: config.ai.openai.apiKey,
});

/**
 * Generate embeddings for text using OpenAI text-embedding-3-small
 * @param text - Text to embed
 * @returns 1536-dimensional embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    const embedding = response.data[0].embedding;

    // Validate embedding dimensions
    if (embedding.length !== 1536) {
      throw new Error(
        `Unexpected embedding dimensions: ${embedding.length} (expected 1536)`
      );
    }

    return embedding;
  } catch (error) {
    logger.error({ error, textLength: text.length }, 'Failed to generate embedding');
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in a single batch call
 * @param texts - Array of texts to embed
 * @returns Array of 1536-dimensional embedding vectors
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  try {
    if (texts.length === 0) {
      return [];
    }

    // OpenAI API supports batching up to 2048 inputs
    if (texts.length > 2048) {
      throw new Error(
        `Too many texts to embed in one batch: ${texts.length} (max 2048)`
      );
    }

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });

    const embeddings = response.data.map((item) => item.embedding);

    // Validate all embeddings have correct dimensions
    for (const embedding of embeddings) {
      if (embedding.length !== 1536) {
        throw new Error(
          `Unexpected embedding dimensions: ${embedding.length} (expected 1536)`
        );
      }
    }

    return embeddings;
  } catch (error) {
    logger.error(
      { error, batchSize: texts.length },
      'Failed to generate embeddings batch'
    );
    throw error;
  }
}
