/**
 * Generate Embeddings Job
 *
 * Inngest job that processes note content into chunks and embeddings
 * Triggers on: notes/created, notes/updated events
 *
 * Flow:
 * 1. Receive note event (create/update)
 * 2. Chunk the note content using embeddings chunker
 * 3. Generate embeddings for each chunk via OpenAI
 * 4. Delete old chunks (if update)
 * 5. Insert new chunks and embeddings to database
 */

import { eq } from 'drizzle-orm';
import { inngest } from '../lib/inngest';
import { db, noteChunks, noteChunkEmbeddings } from '../db';
import { chunkMarkdown } from '../features/embeddings';
import { generateEmbeddingsBatch } from '../lib/openai';
import { logger } from '../lib/logger';
import { config } from '../config';

/**
 * Generate embeddings for note chunks
 */
export const generateEmbeddingsJob = inngest.createFunction(
  {
    id: 'generate-embeddings',
    name: 'Generate Note Embeddings',
    // Retry configuration: 3 retries with exponential backoff
    retries: 3,
  },
  [
    { event: 'notes/created' },
    { event: 'notes/updated' },
  ],
  async ({ event, step }) => {
    const { noteId, userId, title, content, courseTag } = event.data;

    logger.info(
      { noteId, userId, eventName: event.name },
      'Starting embedding generation job'
    );

    // Step 1: Delete old chunks if this is an update
    if (event.name === 'notes/updated') {
      await step.run('delete-old-chunks', async () => {
        const deletedChunks = await db
          .delete(noteChunks)
          .where(eq(noteChunks.noteId, noteId))
          .returning({ id: noteChunks.id });

        logger.info(
          { noteId, deletedCount: deletedChunks.length },
          'Deleted old chunks for note update'
        );

        return { deletedCount: deletedChunks.length };
      });
    }

    // Step 2: Chunk the note content
    const chunks = await step.run('chunk-note-content', async () => {
      const chunked = chunkMarkdown({
        noteId,
        noteTitle: title,
        content,
        courseTag,
      });

      logger.info(
        { noteId, chunkCount: chunked.length },
        'Chunked note content'
      );

      return chunked;
    });

    // Handle empty content case
    if (chunks.length === 0) {
      logger.info({ noteId }, 'Note has no content to embed, skipping');
      return { success: true, chunksProcessed: 0, message: 'No content to embed' };
    }

    // Step 3: Generate embeddings for all chunks
    const embeddings = await step.run('generate-embeddings', async () => {
      const contentEmbeds = chunks.map((chunk) => chunk.contentEmbed);

      // Use batch API for efficiency
      const embeddingVectors = await generateEmbeddingsBatch(contentEmbeds);

      logger.info(
        { noteId, embeddingCount: embeddingVectors.length },
        'Generated embeddings for chunks'
      );

      return embeddingVectors;
    });

    // Step 4: Insert chunks and embeddings to database
    await step.run('insert-chunks-and-embeddings', async () => {
      // Insert chunks
      const insertedChunks = await db
        .insert(noteChunks)
        .values(
          chunks.map((chunk, index) => ({
            userId,
            noteId,
            noteTitle: title,
            sectionPath: chunk.metadata.sectionPath,
            courseTag: chunk.metadata.courseTag,
            contentRaw: chunk.contentRaw,
            contentEmbed: chunk.contentEmbed,
            chunkIndex: index,
          }))
        )
        .returning({ id: noteChunks.id });

      logger.info(
        { noteId, insertedCount: insertedChunks.length },
        'Inserted note chunks to database'
      );

      // Insert embeddings
      const insertedEmbeddings = await db
        .insert(noteChunkEmbeddings)
        .values(
          insertedChunks.map((chunk, index) => ({
            chunkId: chunk.id,
            embedding: embeddings[index],
            embeddingModel: config.ai.openai.embeddingModel,
          }))
        )
        .returning({ id: noteChunkEmbeddings.id });

      logger.info(
        { noteId, embeddingCount: insertedEmbeddings.length },
        'Inserted embeddings to database'
      );

      return {
        chunksInserted: insertedChunks.length,
        embeddingsInserted: insertedEmbeddings.length,
      };
    });

    logger.info(
      { noteId, chunksProcessed: chunks.length },
      'Completed embedding generation job'
    );

    return {
      success: true,
      noteId,
      chunksProcessed: chunks.length,
    };
  }
);
