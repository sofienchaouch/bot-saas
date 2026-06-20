import { ai } from "./gemini";

export function chunkText(text: string, size = 800, overlap = 100): string[] {
  if (!text) return [];
  const chunks: string[] = [];
  let index = 0;
  while (index < text.length) {
    chunks.push(text.substring(index, index + size));
    index += (size - overlap);
  }
  return chunks;
}

export async function getEmbedding(text: string): Promise<number[] | undefined> {
  if (!ai) return undefined;
  try {
    const response = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: text
    });
    return (response as any).embedding?.values || undefined;
  } catch (err) {
    console.error("Gemini Embeddings error:", err);
    return undefined;
  }
}

export async function enrichTenantEmbeddings(tenant: any): Promise<any> {
  if (!tenant || !tenant.knowledgeBase || !Array.isArray(tenant.knowledgeBase)) return tenant;
  if (!ai) return tenant;

  for (const item of tenant.knowledgeBase) {
    if (item.chunks && item.chunks.length > 0) continue;

    console.log(`[RAG ENGINE] Embedding document "${item.title}"...`);
    const textChunks = chunkText(item.content);
    const chunksWithEmbeddings: any[] = [];
    
    for (const txt of textChunks) {
      const embedding = await getEmbedding(txt);
      chunksWithEmbeddings.push({
        text: txt,
        embedding: embedding
      });
    }
    item.chunks = chunksWithEmbeddings;
  }
  return tenant;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function getRAGContext(query: string, knowledgeBase: any[]): Promise<string> {
  if (!knowledgeBase || knowledgeBase.length === 0) return "No files in Private Knowledge Base.";
  
  const allChunks: { text: string; title: string; embedding?: number[] }[] = [];
  knowledgeBase.forEach(item => {
    const chunks = item.chunks || [];
    chunks.forEach((c: any) => {
      allChunks.push({
        text: c.text,
        title: item.title,
        embedding: c.embedding
      });
    });
  });

  if (allChunks.length === 0) {
    return knowledgeBase.map((item: any) => `[DOCUMENT: ${item.title}]\n${item.content}`).join("\n\n");
  }

  if (!ai) {
    console.log("[RAG ENGINE] Gemini API offline. Doing keyword search fallback...");
    const queryWords = query.toLowerCase().split(/\s+/);
    const scoredChunks = allChunks.map(c => {
      let score = 0;
      queryWords.forEach(word => {
        if (word.length > 2 && c.text.toLowerCase().includes(word)) score++;
      });
      return { ...c, score };
    });
    
    const matched = scoredChunks
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (matched.length === 0) {
      return allChunks.slice(0, 4).map(c => `[DOCUMENT: ${c.title}]\n${c.text}`).join("\n\n");
    }
    return matched.map(c => `[DOCUMENT: ${c.title}]\n${c.text}`).join("\n\n");
  }

  try {
    const queryVector = await getEmbedding(query);
    if (!queryVector) {
      return allChunks.slice(0, 4).map(c => `[DOCUMENT: ${c.title}]\n${c.text}`).join("\n\n");
    }

    const scored = allChunks.map(c => {
      let sim = 0;
      if (c.embedding) {
        sim = cosineSimilarity(queryVector, c.embedding);
      }
      return { ...c, sim };
    });

    scored.sort((a, b) => b.sim - a.sim);
    const topChunks = scored.slice(0, 5);
    console.log(`[RAG ENGINE] Top chunk matches:`, topChunks.map(t => `${t.title} (sim: ${t.sim.toFixed(3)})`));

    return topChunks.map(c => `[DOCUMENT: ${c.title}]\n${c.text}`).join("\n\n");
  } catch (err) {
    console.error("RAG search error:", err);
    return allChunks.slice(0, 4).map(c => `[DOCUMENT: ${c.title}]\n${c.text}`).join("\n\n");
  }
}
