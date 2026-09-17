// create token payload
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

// Build a term-frequency vector from an array of tokens
export function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }
  const total = tokens.length || 1;
  for (const [key, count] of tf) {
    tf.set(key, count / total);
  }
  return tf;
}

// Compute cosine similarity between two term-frequency vectors
export function cosineSimilarity(
  vecA: Map<string, number>,
  vecB: Map<string, number>,
): number {
  const allTerms = new Set([...vecA.keys(), ...vecB.keys()]);

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (const term of allTerms) {
    const aVal = vecA.get(term) ?? 0;
    const bVal = vecB.get(term) ?? 0;
    dotProduct += aVal * bVal;
    magA += aVal * aVal;
    magB += bVal * bVal;
  }

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

// Compute text similarity between two strings (0–1).
export function textSimilarity(textA: string, textB: string): number {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);
  const tfA = termFrequency(tokensA);
  const tfB = termFrequency(tokensB);
  return cosineSimilarity(tfA, tfB);
}

// Generate a simple embedding vector for text (array of term weights)
export function embedText(text: string): Map<string, number> {
  return termFrequency(tokenize(text));
}
