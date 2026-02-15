/**
 * AI Ask Integration Test
 * Tests RAG query pipeline end-to-end with mocked dependencies
 */

import { askQuestion } from '../../../src/features/ai/service';
import * as searchService from '../../../src/features/search/service';
import { anthropic } from '../../../src/lib/anthropic';

// Mock Anthropic API
jest.mock('../../../src/lib/anthropic', () => ({
  anthropic: {
    messages: {
      create: jest.fn(),
    },
  },
  DEFAULT_MODEL: 'claude-3-haiku-20240307',
  ADVANCED_MODEL: 'claude-3-sonnet-20240229',
}));

// Mock OpenAI for embeddings
jest.mock('../../../src/lib/openai', () => ({
  generateEmbedding: jest.fn().mockResolvedValue(new Array(1536).fill(0.1)),
}));

// Mock database
jest.mock('../../../src/db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
  },
  noteChunks: {},
  noteChunkEmbeddings: {},
}));

describe('AI Ask - RAG Query Pipeline', () => {
  const TEST_USER_ID = 'test-user-id';
  const mockAnthropicCreate = anthropic.messages.create as jest.MockedFunction<
    typeof anthropic.messages.create
  >;

  // Default mock chunks for retrieval
  const mockRetrievalResult = {
    chunks: [
      {
        id: 'chunk-1',
        userId: TEST_USER_ID,
        noteId: 'note-1',
        noteTitle: 'Test Note',
        sectionPath: ['Section 1'],
        courseTag: 'TEST101',
        contentRaw: 'Test content about derivatives',
        contentEmbed: 'Test content embed',
        chunkIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        embeddingId: 'emb-1',
        embeddingModel: 'text-embedding-3-small',
        distance: 0.2,
        similarity: 0.8,
      },
    ],
    queryEmbedding: new Array(1536).fill(0.1),
    latencyMs: 100,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for retrieveChunks
    jest.spyOn(searchService, 'retrieveChunks').mockResolvedValue(mockRetrievalResult);
  });

  describe('Basic Functionality', () => {
    it('should return valid response structure with answer and citedChunks', async () => {
      // Mock Anthropic response
      mockAnthropicCreate.mockResolvedValueOnce({
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Based on your notes, the derivative of x^2 is 2x. [Note: "Calculus Basics", Section: "Derivatives"]',
          },
        ],
        model: 'claude-3-haiku-20240307',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 100, output_tokens: 50 },
      } as any);

      const result = await askQuestion(TEST_USER_ID, {
        query: 'What is the derivative of x^2?',
      });

      // Validate response structure
      expect(result).toBeDefined();
      expect(result).toHaveProperty('answer');
      expect(result).toHaveProperty('citedChunks');
      expect(result).toHaveProperty('insufficientContext');
      expect(result).toHaveProperty('latencyMs');

      expect(typeof result.answer).toBe('string');
      expect(Array.isArray(result.citedChunks)).toBe(true);
      expect(typeof result.insufficientContext).toBe('boolean');
      expect(typeof result.latencyMs).toBe('number');
    });

    it('should include citations in expected format', async () => {
      mockAnthropicCreate.mockResolvedValueOnce({
        id: 'msg_124',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'The capital of France is Paris. [Note: "Geography Notes", Section: "Europe > Capitals"]',
          },
        ],
        model: 'claude-3-haiku-20240307',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 100, output_tokens: 50 },
      } as any);

      const result = await askQuestion(TEST_USER_ID, {
        query: 'What is the capital of France?',
      });

      // Check citation format
      const citationPattern = /\[Note: ".*?", Section: ".*?"\]/;
      expect(citationPattern.test(result.answer)).toBe(true);
    });

    it('should return "couldn\'t find" when no relevant chunks found', async () => {
      // Mock empty retrieval result
      jest.spyOn(searchService, 'retrieveChunks').mockResolvedValueOnce({
        chunks: [],
        queryEmbedding: new Array(1536).fill(0.1),
        latencyMs: 100,
      });

      const result = await askQuestion(TEST_USER_ID, {
        query: 'What is quantum entanglement?',
      });

      expect(result.answer).toContain("couldn't find");
      expect(result.insufficientContext).toBe(true);
      expect(result.citedChunks).toHaveLength(0);
    });

    it('should handle insufficient context flag correctly', async () => {
      mockAnthropicCreate.mockResolvedValueOnce({
        id: 'msg_125',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: "I couldn't find information about quantum mechanics in your notes.",
          },
        ],
        model: 'claude-3-haiku-20240307',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 100, output_tokens: 50 },
      } as any);

      const result = await askQuestion(TEST_USER_ID, {
        query: 'Explain quantum mechanics',
      });

      expect(result.insufficientContext).toBe(true);
    });

    it('should respect chunk limit parameter', async () => {
      const retrieveChunksSpy = jest.spyOn(searchService, 'retrieveChunks');

      mockAnthropicCreate.mockResolvedValueOnce({
        id: 'msg_126',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Test answer' }],
        model: 'claude-3-haiku-20240307',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 100, output_tokens: 50 },
      } as any);

      await askQuestion(TEST_USER_ID, {
        query: 'Test query',
        limit: 5,
      });

      expect(retrieveChunksSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 5,
        })
      );
    });
  });

  describe('Performance', () => {
    it('should complete within 3 seconds', async () => {
      mockAnthropicCreate.mockResolvedValueOnce({
        id: 'msg_127',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Quick response' }],
        model: 'claude-3-haiku-20240307',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 100, output_tokens: 50 },
      } as any);

      const result = await askQuestion(TEST_USER_ID, {
        query: 'What is 2+2?',
      });

      expect(result.latencyMs).toBeLessThan(3000);
    }, 5000); // Allow 5s for test timeout
  });

  describe('CitedChunks Mapping', () => {
    it('should map retrieved chunks to cited chunks correctly', async () => {
      // Mock retrieval with known chunks
      const mockChunks = [
        {
          id: 'chunk-1',
          userId: TEST_USER_ID,
          noteId: 'note-1',
          noteTitle: 'Test Note',
          sectionPath: ['Section 1'],
          courseTag: 'MATH101',
          contentRaw: 'Test content',
          contentEmbed: 'Test content embed',
          chunkIndex: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          embeddingId: 'emb-1',
          embeddingModel: 'text-embedding-3-small',
          distance: 0.2,
          similarity: 0.8,
        },
      ];

      jest.spyOn(searchService, 'retrieveChunks').mockResolvedValueOnce({
        chunks: mockChunks,
        queryEmbedding: new Array(1536).fill(0.1),
        latencyMs: 100,
      });

      mockAnthropicCreate.mockResolvedValueOnce({
        id: 'msg_128',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Test answer' }],
        model: 'claude-3-haiku-20240307',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 100, output_tokens: 50 },
      } as any);

      const result = await askQuestion(TEST_USER_ID, {
        query: 'Test query',
      });

      expect(result.citedChunks).toHaveLength(1);
      expect(result.citedChunks[0]).toMatchObject({
        id: 'chunk-1',
        noteTitle: 'Test Note',
        sectionPath: ['Section 1'],
        courseTag: 'MATH101',
        contentRaw: 'Test content',
        similarity: 0.8,
      });
    });
  });
});
