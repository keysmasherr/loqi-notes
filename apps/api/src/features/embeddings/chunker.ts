/**
 * Chunking Service for RAG
 *
 * Splits markdown content into chunks optimized for embedding and retrieval.
 * - Splits at ## headers
 * - Enforces 250-350 token target
 * - Merges chunks below 80 tokens
 * - Preserves metadata (title, section_path, course)
 * - Generates content_embed with contextual header
 */

import { encoding_for_model } from 'tiktoken';
import type { Chunk, ChunkerInput, ChunkerOptions, ChunkMetadata } from './types';

// Initialize tokenizer for OpenAI's text-embedding-3-small (uses cl100k_base encoding)
const encoder = encoding_for_model('gpt-4');

/**
 * Count tokens in text using tiktoken
 */
export function countTokens(text: string): number {
  const tokens = encoder.encode(text);
  return tokens.length;
}

/**
 * Free the encoder when done (call in cleanup)
 */
export function freeEncoder(): void {
  encoder.free();
}

/**
 * Parse markdown and extract sections with headers
 */
interface Section {
  headerLevel: number;
  headerText: string;
  content: string;
  startLine: number;
}

function parseMarkdownSections(markdown: string): Section[] {
  const lines = markdown.split('\n');
  const sections: Section[] = [];
  let currentSection: Section | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headerMatch) {
      // Save previous section if exists
      if (currentSection) {
        sections.push(currentSection);
      }

      // Start new section
      const level = headerMatch[1].length;
      const text = headerMatch[2].trim();
      currentSection = {
        headerLevel: level,
        headerText: text,
        content: '',
        startLine: i,
      };
    } else if (currentSection) {
      // Add content to current section
      currentSection.content += (currentSection.content ? '\n' : '') + line;
    } else {
      // Content before any header - create implicit section
      if (!sections.length || sections[0].headerLevel !== 0) {
        currentSection = {
          headerLevel: 0,
          headerText: '',
          content: line,
          startLine: 0,
        };
      } else {
        // Append to existing pre-header content
        sections[0].content += '\n' + line;
      }
    }
  }

  // Add final section
  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Build section path from hierarchy
 */
function buildSectionPath(sections: Section[], currentIndex: number): string[] {
  const path: string[] = [];
  const currentLevel = sections[currentIndex].headerLevel;

  // Work backwards to build hierarchy
  for (let i = currentIndex; i >= 0; i--) {
    const section = sections[i];
    if (section.headerLevel < currentLevel && section.headerText) {
      path.unshift(section.headerText);
    }
  }

  // Add current section header if it exists
  if (sections[currentIndex].headerText) {
    path.push(sections[currentIndex].headerText);
  }

  return path;
}

/**
 * Split large section into smaller chunks by paragraph/token limit
 */
function splitLargeSection(
  content: string,
  targetMaxTokens: number
): string[] {
  const chunks: string[] = [];
  const paragraphs = content.split(/\n\n+/);
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const testChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
    const tokens = countTokens(testChunk);

    if (tokens > targetMaxTokens && currentChunk) {
      // Current chunk is big enough, save it and start new one
      chunks.push(currentChunk);
      currentChunk = paragraph;
    } else {
      currentChunk = testChunk;
    }
  }

  // Add remaining chunk
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  // If still too large, split by sentences
  const result: string[] = [];
  for (const chunk of chunks) {
    const tokens = countTokens(chunk);
    if (tokens > targetMaxTokens * 1.5) {
      // Split by sentences
      const sentences = chunk.split(/\.(?:\s+)/);
      let sentenceChunk = '';
      for (const sentence of sentences) {
        const testChunk = sentenceChunk ? `${sentenceChunk}. ${sentence}` : sentence;
        const sentenceTokens = countTokens(testChunk);
        if (sentenceTokens > targetMaxTokens && sentenceChunk) {
          result.push(sentenceChunk);
          sentenceChunk = sentence;
        } else {
          sentenceChunk = testChunk;
        }
      }
      if (sentenceChunk) {
        result.push(sentenceChunk);
      }
    } else {
      result.push(chunk);
    }
  }

  return result.length > 0 ? result : [content];
}

/**
 * Create content_embed with contextual header
 */
function createContentEmbed(
  contentRaw: string,
  metadata: ChunkMetadata
): string {
  const { noteTitle, sectionPath, courseTag } = metadata;
  const sectionStr = sectionPath.length > 0 ? sectionPath.join(' > ') : 'Main';
  const courseStr = courseTag ? ` | Course: ${courseTag}` : '';

  return `Title: ${noteTitle} | Section: ${sectionStr}${courseStr}\n\n${contentRaw}`;
}

/**
 * Main chunking function
 */
export function chunkMarkdown(
  input: ChunkerInput,
  options: ChunkerOptions = {}
): Chunk[] {
  const {
    minTokens = 80,
    targetMinTokens = 250,
    targetMaxTokens = 350,
  } = options;

  const { noteTitle, content, courseTag } = input;

  // Parse markdown into sections
  const sections = parseMarkdownSections(content);

  // If no sections found, treat entire content as one section
  if (sections.length === 0) {
    const tokens = countTokens(content);
    if (tokens < targetMinTokens) {
      return [{
        contentRaw: content,
        contentEmbed: createContentEmbed(content, {
          noteTitle,
          sectionPath: [],
          courseTag,
        }),
        metadata: {
          noteTitle,
          sectionPath: [],
          courseTag,
        },
        chunkIndex: 0,
      }];
    }

    // Split by paragraph/token limit
    const splitContent = splitLargeSection(content, targetMaxTokens);
    return splitContent.map((c, idx) => ({
      contentRaw: c,
      contentEmbed: createContentEmbed(c, {
        noteTitle,
        sectionPath: [],
        courseTag,
      }),
      metadata: {
        noteTitle,
        sectionPath: [],
        courseTag,
      },
      chunkIndex: idx,
    }));
  }

  const rawChunks: Array<{
    content: string;
    sectionPath: string[];
    tokens: number;
  }> = [];

  // Process each section
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const sectionPath = buildSectionPath(sections, i);
    const content = section.content.trim();

    if (!content) continue;

    const tokens = countTokens(content);

    // If section is too large, split it
    if (tokens > targetMaxTokens) {
      const splitContent = splitLargeSection(content, targetMaxTokens);
      for (const splitPart of splitContent) {
        rawChunks.push({
          content: splitPart,
          sectionPath,
          tokens: countTokens(splitPart),
        });
      }
    } else {
      rawChunks.push({
        content,
        sectionPath,
        tokens,
      });
    }
  }

  // Merge small chunks with neighbors
  const mergedChunks: typeof rawChunks = [];
  let i = 0;

  while (i < rawChunks.length) {
    const chunk = rawChunks[i];

    // Only merge if chunk is VERY small (below minTokens threshold)
    if (chunk.tokens < minTokens && i < rawChunks.length - 1) {
      // Try to merge with next chunk
      const nextChunk = rawChunks[i + 1];
      const combinedContent = `${chunk.content}\n\n${nextChunk.content}`;
      const combinedTokens = countTokens(combinedContent);

      // Only merge if:
      // 1. Combined size is reasonable (not exceeding target max too much)
      // 2. Both chunks are from the same section path (don't merge different sections unless necessary)
      const sameSectionPath = JSON.stringify(chunk.sectionPath) === JSON.stringify(nextChunk.sectionPath);
      const shouldMerge = combinedTokens <= targetMaxTokens * 1.2 && (sameSectionPath || chunk.tokens < 40);

      if (shouldMerge) {
        mergedChunks.push({
          content: combinedContent,
          sectionPath: chunk.sectionPath, // Use first chunk's section path
          tokens: combinedTokens,
        });
        i += 2; // Skip both chunks
        continue;
      }
    }

    mergedChunks.push(chunk);
    i++;
  }

  // Convert to final Chunk format
  return mergedChunks.map((chunk, index) => {
    const metadata: ChunkMetadata = {
      noteTitle,
      sectionPath: chunk.sectionPath,
      courseTag,
    };

    return {
      contentRaw: chunk.content,
      contentEmbed: createContentEmbed(chunk.content, metadata),
      metadata,
      chunkIndex: index,
    };
  });
}
