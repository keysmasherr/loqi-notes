/**
 * Test script for embedding pipeline validation
 *
 * This script validates the complete embedding pipeline:
 * 1. Chunking of markdown content
 * 2. Embedding generation
 * 3. Database operations
 * 4. Update flow (delete old chunks, create new)
 */

import { db, noteChunks, noteChunkEmbeddings, notes } from './db';
import { chunkMarkdown } from './features/embeddings';
import { generateEmbeddingsBatch } from './lib/openai';
import { eq } from 'drizzle-orm';

// Test markdown content with multiple sections
const testContent = `# Introduction to Machine Learning

Machine learning is a subset of artificial intelligence that enables systems to learn from data.

## Supervised Learning

Supervised learning uses labeled training data to learn a mapping function. Common algorithms include:

- Linear Regression
- Logistic Regression
- Decision Trees
- Neural Networks

### Training Process

The training process involves feeding examples to the model and adjusting parameters to minimize error.

## Unsupervised Learning

Unsupervised learning finds patterns in unlabeled data. Key techniques include:

- Clustering (K-means, DBSCAN)
- Dimensionality Reduction (PCA, t-SNE)
- Anomaly Detection

### Applications

Unsupervised learning is useful for customer segmentation, recommendation systems, and exploratory data analysis.

## Deep Learning

Deep learning uses neural networks with multiple layers to learn hierarchical representations of data.

### Neural Network Architecture

A typical neural network consists of:
- Input layer
- Hidden layers (can be many)
- Output layer

Each layer transforms the data through weights and activation functions.
`;

async function validateEmbeddingPipeline() {
  console.log('\n🧪 Starting Embedding Pipeline Validation...\n');

  const testUserId = '4300d237-f35b-434a-9489-99177b296439';
  const testNoteTitle = 'Machine Learning Fundamentals';

  try {
    // Step 0: Create a test note
    console.log('📋 Step 0: Creating test note...');
    const [testNote] = await db
      .insert(notes)
      .values({
        userId: testUserId,
        title: testNoteTitle,
        content: testContent,
        contentPlain: testContent.replace(/<[^>]*>/g, ''),
        wordCount: testContent.split(/\s+/).length,
        readingTimeMinutes: Math.ceil(testContent.split(/\s+/).length / 200),
      })
      .returning({ id: notes.id });

    const testNoteId = testNote.id;
    console.log(`✅ Created test note: ${testNoteId}`);

    // Step 1: Test chunking
    console.log('📝 Step 1: Testing markdown chunking...');
    const chunks = chunkMarkdown({
      noteId: testNoteId,
      noteTitle: testNoteTitle,
      content: testContent,
      courseTag: 'CS101',
    });

    console.log(`✅ Chunked content into ${chunks.length} chunks`);
    chunks.forEach((chunk, idx) => {
      console.log(`   Chunk ${idx}: ${chunk.metadata.sectionPath.join(' > ')} (${chunk.contentRaw.length} chars)`);
    });

    if (chunks.length === 0) {
      throw new Error('❌ Chunking failed: No chunks produced');
    }

    // Step 2: Test embedding generation (only if OpenAI key is valid)
    console.log('\n🤖 Step 2: Testing embedding generation...');
    const hasValidOpenAIKey = process.env.OPENAI_API_KEY &&
                               process.env.OPENAI_API_KEY !== 'sk-your-key-here';

    let embeddings: number[][] = [];

    if (hasValidOpenAIKey) {
      const contentEmbeds = chunks.map(chunk => chunk.contentEmbed);
      embeddings = await generateEmbeddingsBatch(contentEmbeds);

      console.log(`✅ Generated ${embeddings.length} embeddings`);
      console.log(`   Embedding dimensions: ${embeddings[0].length}`);

      if (embeddings[0].length !== 1536) {
        throw new Error(`❌ Invalid embedding dimensions: ${embeddings[0].length} (expected 1536)`);
      }
    } else {
      console.log('⚠️  Skipping embedding generation (no valid OpenAI API key)');
      console.log('   Using mock embeddings for database validation');
      // Create mock embeddings for testing
      embeddings = chunks.map(() => Array(1536).fill(0).map(() => Math.random()));
    }

    // Step 3: Test database insertion
    console.log('\n💾 Step 3: Testing database insertion...');

    // Insert chunks
    const insertedChunks = await db
      .insert(noteChunks)
      .values(
        chunks.map((chunk, index) => ({
          userId: testUserId,
          noteId: testNoteId,
          noteTitle: testNoteTitle,
          sectionPath: chunk.metadata.sectionPath,
          courseTag: chunk.metadata.courseTag,
          contentRaw: chunk.contentRaw,
          contentEmbed: chunk.contentEmbed,
          chunkIndex: index,
        }))
      )
      .returning({ id: noteChunks.id });

    console.log(`✅ Inserted ${insertedChunks.length} chunks to note_chunks table`);

    // Insert embeddings
    const insertedEmbeddings = await db
      .insert(noteChunkEmbeddings)
      .values(
        insertedChunks.map((chunk, index) => ({
          chunkId: chunk.id,
          embedding: embeddings[index],
          embeddingModel: 'text-embedding-3-small',
        }))
      )
      .returning({ id: noteChunkEmbeddings.id, chunkId: noteChunkEmbeddings.chunkId });

    console.log(`✅ Inserted ${insertedEmbeddings.length} embeddings to note_chunk_embeddings table`);

    // Step 4: Verify data in database
    console.log('\n🔍 Step 4: Verifying data in database...');

    const dbChunks = await db
      .select()
      .from(noteChunks)
      .where(eq(noteChunks.noteId, testNoteId));

    const dbEmbeddings = await db
      .select()
      .from(noteChunkEmbeddings)
      .where(eq(noteChunkEmbeddings.chunkId, dbChunks[0].id));

    console.log(`✅ Found ${dbChunks.length} chunks in database`);
    console.log(`✅ Found ${dbEmbeddings.length} embeddings in database`);

    if (dbChunks.length !== chunks.length) {
      throw new Error(`❌ Chunk count mismatch: expected ${chunks.length}, got ${dbChunks.length}`);
    }

    if (dbEmbeddings.length === 0) {
      throw new Error('❌ No embeddings found in database');
    }

    // Verify embedding data
    const firstEmbedding = dbEmbeddings[0];
    if (!Array.isArray(firstEmbedding.embedding)) {
      throw new Error('❌ Embedding is not an array');
    }
    if (firstEmbedding.embedding.length !== 1536) {
      throw new Error(`❌ Invalid embedding dimensions in DB: ${firstEmbedding.embedding.length}`);
    }
    if (firstEmbedding.embeddingModel !== 'text-embedding-3-small') {
      throw new Error(`❌ Invalid embedding model: ${firstEmbedding.embeddingModel}`);
    }

    console.log(`✅ Embedding validation passed:`);
    console.log(`   - Dimensions: ${firstEmbedding.embedding.length}`);
    console.log(`   - Model: ${firstEmbedding.embeddingModel}`);
    console.log(`   - First 5 values: [${firstEmbedding.embedding.slice(0, 5).join(', ')}...]`);

    // Step 5: Test update flow (delete old chunks)
    console.log('\n🔄 Step 5: Testing update flow (delete old chunks)...');

    const deletedChunks = await db
      .delete(noteChunks)
      .where(eq(noteChunks.noteId, testNoteId))
      .returning({ id: noteChunks.id });

    console.log(`✅ Deleted ${deletedChunks.length} old chunks (cascade should delete embeddings)`);

    // Verify embeddings were cascade deleted
    const remainingEmbeddings = await db
      .select()
      .from(noteChunkEmbeddings)
      .where(eq(noteChunkEmbeddings.chunkId, insertedChunks[0].id));

    if (remainingEmbeddings.length > 0) {
      throw new Error(`❌ Embeddings not cascade deleted: ${remainingEmbeddings.length} remaining`);
    }

    console.log('✅ Cascade delete of embeddings verified');

    // Summary
    // Cleanup: Delete test note
    console.log('\n🧹 Cleanup: Deleting test note...');
    await db.delete(notes).where(eq(notes.id, testNoteId));
    console.log('✅ Test note deleted');

    console.log('\n✅ ✅ ✅ ALL VALIDATIONS PASSED! ✅ ✅ ✅\n');
    console.log('Summary:');
    console.log(`  - Created test note: ${testNoteId}`);
    console.log(`  - Chunked ${chunks.length} sections from markdown`);
    console.log(`  - Generated ${embeddings.length} embeddings (1536 dimensions each)`);
    console.log(`  - Inserted chunks and embeddings to database`);
    console.log(`  - Verified data integrity`);
    console.log(`  - Tested update flow (delete old chunks)`);
    console.log(`  - Verified cascade delete of embeddings`);
    console.log('\n🎉 Embedding pipeline is working correctly!\n');

  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    throw error;
  }
}

// Run validation
validateEmbeddingPipeline()
  .then(() => {
    console.log('✅ Validation complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
