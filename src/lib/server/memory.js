import db from './db.js';
import { loadConfig } from './engine-config.js';

/**
 * Calculates cosine similarity between two float arrays
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return normA === 0 || normB === 0 ? 0 : dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Fetches embeddings from Google Gemini API using configured API Key
 */
export async function getEmbedding(text) {
  const config = loadConfig();
  if (!config.googleApiKey) {
    console.warn('Google API Key not configured for embeddings.');
    return null;
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${config.googleApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text }] }
      }),
      signal: AbortSignal.timeout(4000)
    });

    if (res.ok) {
      const data = await res.json();
      return data.embedding?.values || null;
    }
  } catch (err) {
    console.error('Failed to generate embedding:', err.message);
  }
  return null;
}

/**
 * Saves a document's vector embedding in SQLite
 */
export async function saveMemory(sector, entityType, entityId, content, clientId = null, projectId = null) {
  const vector = await getEmbedding(content);
  if (!vector) return;

  try {
    // Delete existing memory entry if it exists to avoid duplication
    db.prepare(`
      DELETE FROM memory_embeddings 
      WHERE sector = ? AND entity_type = ? AND entity_id = ?
    `).run(sector, entityType, entityId);

    // Insert new entry
    db.prepare(`
      INSERT INTO memory_embeddings (sector, entity_type, entity_id, content, vector, client_id, project_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(sector, entityType, entityId, content, JSON.stringify(vector), clientId, projectId);
  } catch (err) {
    console.error('Failed to save memory to SQLite:', err.message);
  }
}

/**
 * Queries sector-isolated long-term memory using cosine similarity
 */
export async function queryMemory(sector, queryText, limit = 5, projectId = null, clientId = null) {
  const queryVector = await getEmbedding(queryText);
  if (!queryVector) return [];

  try {
    // Fetch all vectors for this isolated sector, potentially filtered by project/client
    let query = 'SELECT entity_type, entity_id, content, vector FROM memory_embeddings WHERE sector = ?';
    const params = [sector];

    if (projectId) {
      query += ' AND project_id = ?';
      params.push(projectId);
    } else if (clientId) {
      query += ' AND client_id = ?';
      params.push(clientId);
    }

    const rows = db.prepare(query).all(...params);

    const matches = rows.map(row => {
      try {
        const docVector = JSON.parse(row.vector);
        const similarity = cosineSimilarity(queryVector, docVector);
        return {
          entityType: row.entity_type,
          entityId: row.entity_id,
          content: row.content,
          similarity
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Sort by descending similarity score
    matches.sort((a, b) => b.similarity - a.similarity);
    return matches.slice(0, limit);
  } catch (err) {
    console.error('Failed to query SQLite memories:', err.message);
  }
  return [];
}

/**
 * Deletes all project codex section memory entries for a project
 */
export function deleteProjectCodexMemory(projectId) {
  try {
    db.prepare(`
      DELETE FROM memory_embeddings 
      WHERE entity_type = 'project_codex_section' AND project_id = ?
    `).run(projectId);
  } catch (err) {
    console.error('Failed to delete project codex memory:', err.message);
  }
}


/**
 * Splits text into paragraphs/blocks of maximum specified size
 */
function chunkText(text, size = 800) {
  const lines = text.split('\n');
  const chunks = [];
  let currentChunk = '';
  
  for (const line of lines) {
    if ((currentChunk + '\n' + line).length > size) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = line;
    } else {
      currentChunk = currentChunk ? currentChunk + '\n' + line : line;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
}

/**
 * Indexes a markdown document's text chunks in the vector space for AI RAG queries
 */
export async function saveFileChunksMemory(fileId, filename, contentMarkdown, clientId = null, projectId = null) {
  try {
    // Delete existing chunk references first
    db.prepare(`
      DELETE FROM memory_embeddings 
      WHERE sector = 'operations' AND entity_type = 'client_file_chunk' AND entity_id = ?
    `).run(fileId);
    
    if (!contentMarkdown) return;
    
    const chunks = chunkText(contentMarkdown, 800);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const contentWithContext = `File: ${filename} (Part ${i + 1}/${chunks.length})\n\n${chunk}`;
      const vector = await getEmbedding(contentWithContext);
      if (!vector) continue;
      
      db.prepare(`
        INSERT INTO memory_embeddings (sector, entity_type, entity_id, content, vector, client_id, project_id)
        VALUES ('operations', 'client_file_chunk', ?, ?, ?, ?, ?)
      `).run(
        fileId,
        contentWithContext,
        JSON.stringify(vector),
        clientId,
        projectId
      );
    }
  } catch (err) {
    console.error('Failed to save file chunk memory:', err.message);
  }
}

/**
 * Deletes all memory references for a file
 */
export function deleteFileMemory(fileId) {
  try {
    db.prepare(`
      DELETE FROM memory_embeddings 
      WHERE sector = 'operations' AND entity_type = 'client_file_chunk' AND entity_id = ?
    `).run(fileId);
  } catch (err) {
    console.error('Failed to delete file memory:', err.message);
  }
}


