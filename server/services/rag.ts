import { eq, and, sql } from "drizzle-orm";
import { ai } from "./gemini";
import { Type } from "@google/genai";
import { getDb, isDbAvailable, schema } from "../db/index";

// ── Pure utility functions (unchanged) ────────────────────────────────────────

export function chunkText(text: string, size = 800, overlap = 100): string[] {
  if (!text) return [];
  const sentences = text.split(/(?<=[.!?])\s+|\n+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (currentChunk.length + trimmed.length + 1 <= size) {
      currentChunk += (currentChunk ? " " : "") + trimmed;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      if (trimmed.length > size) {
        let idx = 0;
        while (idx < trimmed.length) {
          chunks.push(trimmed.substring(idx, idx + size));
          idx += size - overlap;
        }
        currentChunk = "";
      } else {
        const overlapPart = currentChunk.substring(Math.max(0, currentChunk.length - overlap));
        currentChunk = overlapPart.trim() + (overlapPart ? " " : "") + trimmed;
      }
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

export async function getEmbedding(text: string): Promise<number[] | undefined> {
  if (!ai) return undefined;
  try {
    const response = await ai.models.embedContent({ model: "text-embedding-004", contents: text });
    return (response as any).embedding?.values || undefined;
  } catch (err) {
    console.error("Gemini Embeddings error:", err);
    return undefined;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ── enrichTenantEmbeddings: stores chunks to DB (replaces in-memory mutation) ─

export async function enrichTenantEmbeddings(tenant: any): Promise<any> {
  if (!tenant || !tenant.knowledgeBase || !Array.isArray(tenant.knowledgeBase)) return tenant;
  if (!ai) return tenant;

  if (!isDbAvailable()) {
    // No DB: return tenant unchanged (can't store chunks)
    return tenant;
  }

  const db = getDb();

  for (const item of tenant.knowledgeBase) {
    // Check if chunks already exist for this document
    const existing = await db
      .select({ id: schema.kbChunks.id })
      .from(schema.kbChunks)
      .where(eq(schema.kbChunks.documentId, item.id))
      .limit(1);

    if (existing.length > 0) continue;

    console.log(`[RAG ENGINE] Embedding document "${item.title}"...`);
    const textChunks = chunkText(item.content);

    for (const txt of textChunks) {
      const embedding = await getEmbedding(txt);
      await db.insert(schema.kbChunks).values({
        documentId: item.id,
        tenantId: tenant.id,
        chunkText: txt,
        embedding: embedding ?? null,
      });
    }
  }

  // Return tenant without the chunks array — chunks now live in DB
  return tenant;
}

// ── RAG Filter type (unchanged) ────────────────────────────────────────────────

export interface RAGFilter {
  type?: "faq" | "document" | "file" | "url" | "crawl";
  titlePattern?: string;
}

// ── getRAGContext: now uses pgvector ANN search ───────────────────────────────

export async function getRAGContext(
  query: string,
  tenantId: string,
  filter?: RAGFilter
): Promise<{ contextText: string; citations: string[] }> {

  if (!isDbAvailable()) {
    return { contextText: "No knowledge base available (database not configured).", citations: [] };
  }

  const db = getDb();
  const queryVector = ai ? await getEmbedding(query) : undefined;

  let candidates: { chunkText: string; title: string; type: string }[];

  if (queryVector) {
    // pgvector cosine distance search
    const vectorLiteral = `[${queryVector.join(",")}]`;

    const rows = await db.execute(sql`
      SELECT
        kc.chunk_text,
        kd.title,
        kd.type,
        1 - (kc.embedding <=> ${sql.raw(`'${vectorLiteral}'::vector`)}::vector) AS similarity
      FROM kb_chunks kc
      JOIN kb_documents kd ON kc.document_id = kd.id AND kd.tenant_id = kc.tenant_id
      WHERE kc.tenant_id = ${tenantId}
        ${filter?.type ? sql`AND kd.type = ${filter.type}` : sql``}
        ${filter?.titlePattern ? sql`AND LOWER(kd.title) LIKE ${'%' + filter.titlePattern.toLowerCase() + '%'}` : sql``}
        AND kc.embedding IS NOT NULL
      ORDER BY kc.embedding <=> ${sql.raw(`'${vectorLiteral}'::vector`)}::vector
      LIMIT 8
    `);

    candidates = (rows.rows ?? rows) as any[];
  } else {
    // Fallback: keyword search when embeddings are unavailable
    const rows = await db
      .select({
        chunkText: schema.kbChunks.chunkText,
        title: schema.kbDocuments.title,
        type: schema.kbDocuments.type,
      })
      .from(schema.kbChunks)
      .innerJoin(
        schema.kbDocuments,
        and(
          eq(schema.kbChunks.documentId, schema.kbDocuments.id),
          eq(schema.kbDocuments.tenantId, schema.kbChunks.tenantId)
        )
      )
      .where(eq(schema.kbChunks.tenantId, tenantId))
      .limit(8);

    candidates = rows;
  }

  if (candidates.length === 0) {
    return { contextText: "No matching knowledge base documents found.", citations: [] };
  }

  // Gemini re-ranking (unchanged logic)
  let finalChunks = candidates.slice(0, 4);
  if (ai && candidates.length > 1) {
    try {
      const prompt = `You are a RAG Re-ranking system.
Given the user query: "${query}"
And the following document chunks, select the top 3-4 chunks that are most relevant to answering the query.
Return your choice strictly as a JSON array of integers representing the 0-indexed indices of the chosen chunks in order of relevance (most relevant first).
Do not wrap your output in markdown codeblocks. Return bare clean JSON.

Chunks:
${candidates.map((c, i) => `[Chunk ${i}]:\nTitle: ${c.title}\nContent: ${c.chunkText}`).join("\n\n")}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: { type: Type.ARRAY, items: { type: Type.INTEGER } },
        },
      });

      const rawText = response.text || "";
      let indices: number[];
      try {
        indices = JSON.parse(rawText.trim());
      } catch {
        const match = rawText.match(/\[.*\]/s);
        indices = match ? JSON.parse(match[0]) : [];
      }

      if (Array.isArray(indices) && indices.length > 0) {
        const reRanked: typeof candidates = [];
        const seen = new Set<number>();
        indices.forEach((idx) => {
          if (idx >= 0 && idx < candidates.length && !seen.has(idx)) {
            reRanked.push(candidates[idx]);
            seen.add(idx);
          }
        });
        candidates.forEach((c, idx) => {
          if (!seen.has(idx) && reRanked.length < 4) reRanked.push(c);
        });
        finalChunks = reRanked.slice(0, 4);
        console.log(`[RAG ENGINE] Re-ranked candidates:`, finalChunks.map((c) => c.title));
      }
    } catch (reRankErr) {
      console.warn("[RAG ENGINE] Re-ranking failed, using vector order:", reRankErr);
    }
  }

  const uniqueCitations = Array.from(new Set(finalChunks.map((c) => c.title)));
  const contextText = finalChunks
    .map((c) => `[DOCUMENT: ${c.title}]\n${c.chunkText}`)
    .join("\n\n");

  return { contextText, citations: uniqueCitations };
}
