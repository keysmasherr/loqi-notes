/**
 * Prompt Template for RAG Query
 * Constructs prompt for asking questions based on user's notes
 */

import type { RetrievedChunk } from '../../search/types';

/**
 * Formats section path as readable string
 * Example: ["Introduction", "Key Concepts"] -> "Introduction > Key Concepts"
 */
function formatSectionPath(sectionPath: string[]): string {
  return sectionPath.length > 0 ? sectionPath.join(' > ') : 'Main Content';
}

/**
 * Constructs RAG prompt with retrieved chunks
 *
 * @param query - User's question
 * @param chunks - Retrieved note chunks with context
 * @returns Formatted prompt string
 */
export function constructAskPrompt(query: string, chunks: RetrievedChunk[]): string {
  const chunksContext = chunks
    .map((chunk) => {
      const sectionPathStr = formatSectionPath(chunk.sectionPath);
      return `[Note: "${chunk.noteTitle}" | Section: "${sectionPathStr}"]
${chunk.contentRaw}
---`;
    })
    .join('\n\n');

  const prompt = `You are answering questions using ONLY the user's notes provided below.

RULES:
- Only make claims directly supported by the provided chunks
- Cite sources as [Note: "title", Section: "section"]
- If information is insufficient, say: "I couldn't find this in your notes."
- DO NOT use general knowledge to fill gaps

USER'S NOTES:
${chunksContext}

QUESTION: ${query}`;

  return prompt;
}
