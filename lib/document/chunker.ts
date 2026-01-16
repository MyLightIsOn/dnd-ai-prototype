/**
 * Chunk a document using the specified strategy
 * @param text The text to chunk
 * @param strategy The chunking strategy to use
 * @param chunkSize The maximum size of each chunk
 * @param overlap The number of characters to overlap between chunks
 * @returns An array of text chunks
 */
export function chunkDocument(
  text: string,
  strategy: 'fixed' | 'semantic',
  chunkSize: number,
  overlap: number
): string[] {
  if (!text || text.length === 0) {
    return [];
  }

  if (strategy === 'fixed') {
    // Fixed-size chunking with overlap
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Semantic: split by sentences, then group to fit chunk size
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // Add overlap by keeping the last sentence
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
