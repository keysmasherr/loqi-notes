/**
 * AI Service
 * Implements RAG query pipeline
 */

import { anthropic, DEFAULT_MODEL } from '../../lib/anthropic';
import { retrieveChunks } from '../search/service';
import { constructAskPrompt } from './prompts/ask';
import { logger } from '../../lib/logger';
import type { AskInput, AskResult, CitedChunk } from './types';

/**
 * Ask a question using RAG (Retrieval-Augmented Generation)
 *
 * @param userId - User ID for filtering notes
 * @param input - Query and optional filters
 * @returns Answer with citations and metadata
 */
export async function askQuestion(userId: string, input: AskInput): Promise<AskResult> {
  const startTime = Date.now();

  try {
    // Step 1: Retrieve relevant chunks using vector search
    logger.info({ userId, query: input.query }, 'Starting RAG query');
    const retrievalResult = await retrieveChunks({
      userId,
      query: input.query,
      filters: input.filters,
      limit: input.limit || 10,
    });

    const retrievalTime = Date.now() - startTime;
    logger.info(
      { userId, chunksRetrieved: retrievalResult.chunks.length, retrievalTime },
      'Retrieval complete'
    );

    // If no chunks found, return early with insufficient context
    if (retrievalResult.chunks.length === 0) {
      logger.info({ userId, query: input.query }, 'No chunks found for query');
      return {
        answer: "I couldn't find this in your notes.",
        citedChunks: [],
        insufficientContext: true,
        latencyMs: Date.now() - startTime,
      };
    }

    // Step 2: Construct prompt with retrieved chunks
    const prompt = constructAskPrompt(input.query, retrievalResult.chunks);
    logger.info({ userId, promptLength: prompt.length }, 'Prompt constructed');

    // Step 3: Call Claude API
    const llmStart = Date.now();
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const llmTime = Date.now() - llmStart;
    logger.info({ userId, llmTime }, 'LLM response received');

    // Extract text from response
    const answerText =
      response.content.find((block) => block.type === 'text')?.text || '';

    // Step 4: Determine if context was insufficient
    const insufficientContext =
      answerText.toLowerCase().includes("couldn't find") ||
      answerText.toLowerCase().includes('could not find') ||
      answerText.toLowerCase().includes('no information');

    // Step 5: Map retrieved chunks to cited chunks format
    const citedChunks: CitedChunk[] = retrievalResult.chunks.map((chunk) => ({
      id: chunk.id,
      noteTitle: chunk.noteTitle,
      sectionPath: chunk.sectionPath,
      courseTag: chunk.courseTag,
      contentRaw: chunk.contentRaw,
      similarity: chunk.similarity,
    }));

    const totalLatency = Date.now() - startTime;
    logger.info(
      {
        userId,
        retrievalTime,
        llmTime,
        totalLatency,
        insufficientContext,
        chunksCount: citedChunks.length,
      },
      'RAG query complete'
    );

    return {
      answer: answerText,
      citedChunks,
      insufficientContext,
      latencyMs: totalLatency,
    };
  } catch (error) {
    logger.error({ error, userId, query: input.query }, 'Failed to process RAG query');
    throw error;
  }
}
