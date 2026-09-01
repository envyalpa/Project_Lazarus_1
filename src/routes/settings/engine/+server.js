import { execSync, spawn } from 'node:child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync, readdirSync, rmSync, openSync, readSync, closeSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig, saveConfig } from '$lib/server/engine-config.js';
import { callAgent } from '$lib/server/llm.js';
import db from '$lib/server/db.js';

const TRANSCRIPTIONS_DIR = join(process.cwd(), 'data', 'transcriptions');

let activeColabProcess = null;
let colabLogLines = [];
let colabState = 'idle'; // 'idle', 'starting', 'ready', 'failed'

function getColabCommand() {
  try {
    execSync('where colab', { stdio: 'ignore' });
    return ['colab'];
  } catch {}

  const appData = process.env.APPDATA;
  if (appData) {
    const pythonBase = join(appData, 'Python');
    if (existsSync(pythonBase)) {
      const versions = readdirSync(pythonBase);
      for (const ver of versions) {
        const path = join(pythonBase, ver, 'Scripts', 'colab.exe');
        if (existsSync(path)) {
          return [path];
        }
      }
    }
  }

  return ['python', '-m', 'colab'];
}

function readConfig() {
  return loadConfig();
}

function writeConfig(config) {
  saveConfig(config);
}

function parseWavHeader(buf) {
  let offset = 12;
  let channels = 1, sampleRate = 16000, bitsPerSample = 16;
  let dataSize = 0, dataOffset = 0;
  while (offset < buf.length - 8) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === 'fmt ') {
      channels = buf.readUInt16LE(offset + 10);
      sampleRate = buf.readUInt32LE(offset + 12);
      bitsPerSample = buf.readUInt16LE(offset + 22);
    } else if (id === 'data') {
      dataSize = size;
      dataOffset = offset + 8;
      break;
    }
    offset += 8 + size;
    if (size % 2 !== 0) offset++;
  }
  return { channels, sampleRate, bitsPerSample, dataSize, dataOffset };
}

function buildWavHeader(dataSize, channels, sampleRate, bitsPerSample) {
  const buf = Buffer.alloc(44);
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(channels * (bitsPerSample / 8), 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

/**
 * Analyses the last `tailSeconds` of a freshly-built chunk WAV buffer.
 * If the RMS of that tail is below `rmsThreshold` (i.e. it is silence or
 * near-silence) the tail is stripped before upload.  This prevents Whisper
 * from hallucinating on dead-air at the end of the last chunk — the root
 * cause of the "They are… They are…" and "German German Thanks for watching"
 * artifacts.
 *
 * @param {Buffer} buf            - WAV buffer with a standard 44-byte header.
 * @param {number} channels       - Channel count from the WAV header.
 * @param {number} sampleRate     - Sample rate (Hz) from the WAV header.
 * @param {number} bitsPerSample  - Bit depth from the WAV header.
 * @param {number} [tailSeconds]  - How many seconds to inspect/trim (default 2).
 * @param {number} [rmsThreshold] - RMS value below which tail is considered silent.
 * @returns {Buffer} Original or trimmed WAV buffer.
 */
function trimSilentTailFromChunk(buf, channels, sampleRate, bitsPerSample, tailSeconds = 2.0, rmsThreshold = 80) {
  const HEADER_SIZE = 44; // standard PCM WAV header built by buildWavHeader()
  const bytesPerSec = sampleRate * channels * (bitsPerSample / 8);
  const dataSize = buf.length - HEADER_SIZE;
  if (dataSize <= 0) return buf;

  const tailBytes = Math.min(Math.round(tailSeconds * bytesPerSec), dataSize);
  const tailStart = HEADER_SIZE + dataSize - tailBytes;

  // Compute RMS of the tail window
  let sumSq = 0, count = 0;
  for (let i = tailStart; i < buf.length - 1; i += 2) {
    const sample = buf.readInt16LE(i);
    sumSq += sample * sample;
    count++;
  }
  const rms = count > 0 ? Math.sqrt(sumSq / count) : 0;

  if (rms < rmsThreshold) {
    // Tail is silent — strip it, but keep at least 0.5 s of audio so the
    // model has something to work with.
    const minDataSize = Math.round(0.5 * bytesPerSec);
    const newDataSize = Math.max(dataSize - tailBytes, minDataSize);
    const newHeader = buildWavHeader(newDataSize, channels, sampleRate, bitsPerSample);
    const audioData = buf.slice(HEADER_SIZE, HEADER_SIZE + newDataSize);
    const trimmedDuration = (newDataSize / bytesPerSec).toFixed(1);
    console.log(`[Tail-Trim] Stripped ${tailSeconds}s silent tail (RMS ${Math.round(rms)} < ${rmsThreshold}). Effective duration: ${trimmedDuration}s`);
    return Buffer.concat([newHeader, audioData]);
  }

  return buf;
}

async function fetchWithRetry(url, options = {}, retries = 5, backoffMs = 2000) {
  for (let attempt = 0; attempt < retries; attempt++) {
    if (options.signal?.aborted) {
      throw new DOMException('The user aborted a request.', 'AbortError');
    }
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
        if (attempt === retries - 1) return res;
        const delay = backoffMs * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(`[API] Request failed ${res.status}. Retry ${attempt + 1}/${retries} in ${Math.round(delay)}ms`);
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, delay);
          if (options.signal) options.signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('The user aborted a request.', 'AbortError')); });
        });
        continue;
      }
      return res;
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      if (attempt === retries - 1) throw err;
      const delay = backoffMs * Math.pow(2, attempt) + Math.random() * 500;
      console.warn(`[API] Network error: ${err.message}. Retry ${attempt + 1}/${retries} in ${Math.round(delay)}ms`);
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, delay);
        if (options.signal) options.signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('The user aborted a request.', 'AbortError')); });
      });
    }
  }
}

async function readErrorText(res) {
  try {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const text = await res.text();
      const titleMatch = text.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch?.[1]) return `HTTP ${res.status}: ${titleMatch[1].trim()}`;
      return `HTTP ${res.status} (HTML error response)`;
    }
    const text = await res.text();
    try {
      const parsed = JSON.parse(text);
      if (parsed.error?.message) return parsed.error.message;
      if (parsed.error) return typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error);
      if (parsed.message) return parsed.message;
    } catch {}
    return text.substring(0, 300) || `HTTP ${res.status}`;
  } catch (err) {
    return `HTTP ${res.status} (failed to read response: ${err.message})`;
  }
}

function formatElevenLabsWords(words) {
  if (!words || words.length === 0) return { text: '', segments: [] };

  const segments = [];
  let currentSpeaker = null;
  let currentSegmentTokens = [];
  let segmentStartTime = 0;

  for (const token of words) {
    if (token.type === 'word') {
      const speakerId = token.speaker_id || 'unknown';
      const start = token.start;
      const end = token.end;

      if (currentSpeaker === null) {
        currentSpeaker = speakerId;
        segmentStartTime = start;
        currentSegmentTokens.push(token);
      } else if (speakerId !== currentSpeaker || (currentSegmentTokens.length > 0 && start - currentSegmentTokens[currentSegmentTokens.length - 1].end > 3.0)) {
        const segmentText = currentSegmentTokens.map(t => t.text).join('');
        segments.push({
          start: segmentStartTime,
          end: currentSegmentTokens[currentSegmentTokens.length - 1].end || segmentStartTime,
          speaker: currentSpeaker,
          text: `[Speaker ${currentSpeaker}]: ${segmentText.trim()}`
        });

        currentSpeaker = speakerId;
        segmentStartTime = start;
        currentSegmentTokens = [token];
      } else {
        currentSegmentTokens.push(token);
      }
    } else {
      if (currentSpeaker !== null) {
        currentSegmentTokens.push(token);
      }
    }
  }

  if (currentSegmentTokens.length > 0) {
    let lastEnd = segmentStartTime;
    for (let i = currentSegmentTokens.length - 1; i >= 0; i--) {
      if (currentSegmentTokens[i].end !== undefined) {
        lastEnd = currentSegmentTokens[i].end;
        break;
      }
    }
    const segmentText = currentSegmentTokens.map(t => t.text).join('');
    segments.push({
      start: segmentStartTime,
      end: lastEnd,
      speaker: currentSpeaker,
      text: `[Speaker ${currentSpeaker}]: ${segmentText.trim()}`
    });
  }

  const formattedLines = segments.map(seg => {
    const h = Math.floor(seg.start / 3600);
    const m = Math.floor((seg.start % 3600) / 60);
    const s = Math.floor(seg.start % 60);
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `[${timeStr}] ${seg.text}`;
  });

  return {
    text: formattedLines.join('\n\n'),
    segments: segments.map(seg => ({
      start: seg.start,
      end: seg.end,
      text: seg.text
    }))
  };
}

export async function GET() {
  const config = readConfig();

  // Google Colaboratory connectivity check
  let colabConnected = false;
  if (config.colabUrl) {
    try {
      const colabBase = config.colabUrl.replace(/\/+$/, '');
      const colabRes = await fetch(`${colabBase}/ping`, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
        signal: AbortSignal.timeout(4000)
      });
      if (colabRes.ok) {
        const json = await colabRes.json();
        colabConnected = json.status === 'ok';
      }
    } catch { colabConnected = false; }
  }

  // Sync internal state to failed if the live connection is lost
  if (!colabConnected && colabState === 'ready') {
    colabState = 'failed';
  }

  // Google Gemini connectivity check
  let geminiConnected = false;
  if (config.googleApiKey) {
    try {
      const geminiModelName = config.geminiModel || 'models/gemini-2.0-flash';
      const cleanModelName = geminiModelName.startsWith('models/') ? geminiModelName : `models/${geminiModelName}`;
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${cleanModelName}?key=${config.googleApiKey}`, {
        signal: AbortSignal.timeout(3000)
      });
      geminiConnected = geminiRes.ok;
    } catch { geminiConnected = false; }
  }

  // ElevenLabs connectivity check
  let elevenlabsConnected = false;
  if (config.elevenlabsApiKey) {
    try {
      const elRes = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: { 'xi-api-key': config.elevenlabsApiKey },
        signal: AbortSignal.timeout(3000)
      });
      if (elRes.ok) {
        elevenlabsConnected = true;
      } else {
        const text = await elRes.text();
        try {
          const parsed = JSON.parse(text);
          if (parsed.detail?.status === 'missing_permissions') {
            // Key is valid, just missing metadata read permissions
            elevenlabsConnected = true;
          }
        } catch {}
      }
    } catch { elevenlabsConnected = false; }
  }

  let history = [];
  try {
    history = db.prepare('SELECT id, filename, file_size, duration, transcribe_mode, status, created_at FROM transcriptions ORDER BY created_at DESC').all();
  } catch (err) {
    console.error('[GET settings/engine] Failed to load history:', err.message);
  }

  return Response.json({
    connected: colabConnected || geminiConnected || elevenlabsConnected,
    config,
    colabConnected,
    geminiConnected,
    elevenlabsConnected,
    history
  });
}

export async function POST({ request, url }) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const body = await request.json();
    const action = body.action;

    if (action === 'save-config') {
      const config = body.config;
      if (config) {
        saveConfig(config);
        return Response.json({ success: true, message: 'Configuration saved.' });
      }
    }

    if (action === 'provision-colab') {
      const config = readConfig();
      if (!config.colabNgrokToken) {
        return Response.json({ error: 'Ngrok Token is required to start the Colab runtime.' }, { status: 400 });
      }

      if (colabState === 'starting' || colabState === 'ready') {
        return Response.json({ success: true, status: colabState, logs: colabLogLines });
      }

      colabState = 'starting';
      colabLogLines = ['[System] Initiating Google Colab session...'];
      
      try {
        let colabSessionId = null;
        const colabCmd = getColabCommand();
        const spawnCmd = colabCmd[0];
        const spawnArgs = [...colabCmd.slice(1), 'new', '--gpu', 'T4'];
        colabLogLines.push(`[System] Running: ${spawnCmd} ${spawnArgs.join(' ')}`);
        
        const colabNew = spawn(spawnCmd, spawnArgs, { shell: true });
        
        colabNew.stdout.on('data', (data) => {
          const text = data.toString();
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.trim()) colabLogLines.push(`[Colab CLI] ${line.trim()}`);
          }
          const sessionMatch = text.match(/Creating session '([a-f0-9]+)'/);
          if (sessionMatch) {
            colabSessionId = sessionMatch[1];
          }
        });

        colabNew.stderr.on('data', (data) => {
          const lines = data.toString().split('\n');
          for (const line of lines) {
            if (line.trim()) colabLogLines.push(`[Colab CLI Error] ${line.trim()}`);
          }
        });

        colabNew.on('close', (code) => {
          if (code !== 0) {
            colabLogLines.push(`[System] colab new exited with code ${code}. Trying to run scripts/colab_whisper_server.py remotely anyway...`);
          } else {
            colabLogLines.push('[System] Google Colab instance allocated successfully.');
            if (colabSessionId) {
              colabLogLines.push(`[System] Automatically opening notebook URL for session: ${colabSessionId}`);
              const urlArgs = [...colabCmd.slice(1), 'url', '-s', colabSessionId, '--open'];
              spawn(spawnCmd, urlArgs, { shell: true });
            }
          }

          colabLogLines.push('[System] Preparing remote server script...');
          const serverScriptPath = join(process.cwd(), 'scripts', 'colab_whisper_server.py');
          const tempScriptPath = join(process.cwd(), 'scripts', 'temp_colab_whisper_server.py');
          
          try {
            const scriptContent = readFileSync(serverScriptPath, 'utf8');
            const patchedContent = scriptContent.replace('"PLACEHOLDER_TOKEN"', `"${config.colabNgrokToken}"`);
            writeFileSync(tempScriptPath, patchedContent, 'utf8');
            colabLogLines.push('[System] Created patched script with Ngrok Authtoken.');
          } catch (err) {
            colabLogLines.push(`[System Error] Failed to create temp script: ${err.message}`);
            colabState = 'failed';
            return;
          }

          colabLogLines.push('[System] Executing server script on remote Google Colab runtime...');
          const execArgs = [...colabCmd.slice(1), 'exec', '-f', tempScriptPath];
          const colabExec = spawn(spawnCmd, execArgs, { shell: true });
          activeColabProcess = colabExec;

          colabExec.stdout.on('data', (data) => {
            const output = data.toString();
            const lines = output.split('\n');
            for (const line of lines) {
              if (line.trim()) colabLogLines.push(`[Remote Python] ${line.trim()}`);
            }

            const match = output.match(/\[COLAB_URL\]\s*(https:\/\/[^\s]+)/);
            if (match?.[1]) {
              const url = match[1];
              colabLogLines.push(`[System] Successfully established tunnel at: ${url}`);
              const updatedConfig = readConfig();
              updatedConfig.colabUrl = url;
              writeConfig(updatedConfig);
              colabState = 'ready';
            }
          });

          colabExec.stderr.on('data', (data) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
              if (line.trim()) colabLogLines.push(`[Remote Python Error] ${line.trim()}`);
            }
          });

          colabExec.on('close', (execCode) => {
            colabLogLines.push(`[System] Remote script process exited with code ${execCode}`);
            try {
              if (existsSync(tempScriptPath)) unlinkSync(tempScriptPath);
            } catch {}
            if (colabState !== 'ready') colabState = 'failed';
            activeColabProcess = null;
          });
        });

        return Response.json({ success: true, status: colabState, logs: colabLogLines });
      } catch (err) {
        colabState = 'failed';
        colabLogLines.push(`[System Error] Exception caught: ${err.message}`);
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    if (action === 'get-colab-provision-status') {
      return Response.json({ success: true, status: colabState, logs: colabLogLines });
    }

    if (action === 'stop-colab') {
      if (activeColabProcess) {
        activeColabProcess.kill();
        activeColabProcess = null;
      }
      try {
        const colabCmd = getColabCommand();
        const stopArgs = [...colabCmd.slice(1), 'stop'];
        const colabStop = spawn(colabCmd[0], stopArgs, { shell: true });
        colabStop.on('close', () => {
          colabLogLines.push('[System] Google Colab instance terminated.');
        });
      } catch (err) {
        colabLogLines.push(`[System Error] Failed to stop Colab runtime: ${err.message}`);
      }
      colabState = 'idle';
      colabLogLines.push('[System] Session halted manually.');
      return Response.json({ success: true, status: colabState, logs: colabLogLines });
    }

    if (action === 'terminate-all-colab-sessions') {
      colabLogLines.push('[System] Listing all active remote Colab sessions...');
      try {
        const colabCmd = getColabCommand();
        const spawnCmd = colabCmd[0];
        const cmdPrefix = colabCmd.slice(1).join(' ');
        
        const sessionsOutput = execSync(`"${spawnCmd}" ${cmdPrefix} sessions`, { encoding: 'utf8', shell: true });
        
        colabLogLines.push('[System] Active sessions output check:');
        const lines = sessionsOutput.split('\n');
        for (const line of lines) {
          if (line.trim()) colabLogLines.push(`[Colab CLI] ${line.trim()}`);
        }

        const matches = sessionsOutput.match(/\b([a-f0-9]{6})\b/g) || [];
        const sessionIds = [...new Set(matches)];

        if (sessionIds.length === 0) {
          colabLogLines.push('[System] No active sessions found on server to terminate.');
        } else {
          colabLogLines.push(`[System] Found ${sessionIds.length} active session(s): ${sessionIds.join(', ')}`);
          for (const id of sessionIds) {
            colabLogLines.push(`[System] Terminating session: ${id}...`);
            try {
              execSync(`"${spawnCmd}" ${cmdPrefix} stop -s ${id}`, { shell: true });
              colabLogLines.push(`[System] Session ${id} successfully stopped.`);
            } catch (err) {
              colabLogLines.push(`[System Error] Failed to stop session ${id}: ${err.message}`);
            }
          }
        }
        
        colabState = 'idle';
        return Response.json({ success: true, status: colabState, logs: colabLogLines });
      } catch (err) {
        colabLogLines.push(`[System Error] Failed to list or stop sessions: ${err.message}`);
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    if (action === 'save-transcription') {
      const { id, filename, fileSize, duration, transcribeMode, transcription, segments, status = 'completed' } = body;
      try {
        db.prepare(`
          INSERT INTO transcriptions (id, filename, file_size, duration, transcribe_mode, status, transcription, segments_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            status = excluded.status,
            transcription = excluded.transcription,
            segments_json = excluded.segments_json,
            updated_at = datetime('now')
        `).run(id, filename, fileSize, duration, transcribeMode, status, transcription, JSON.stringify(segments));
        return Response.json({ success: true });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    if (action === 'get-transcription-detail') {
      const { id } = body;
      try {
        const row = db.prepare('SELECT * FROM transcriptions WHERE id = ?').get(id);
        if (!row) return Response.json({ error: 'Transcription not found' }, { status: 404 });
        return Response.json({ success: true, transcription: row });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    if (action === 'delete-transcription') {
      const { id } = body;
      try {
        db.prepare('DELETE FROM transcriptions WHERE id = ?').run(id);
        return Response.json({ success: true });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    if (action === 'get-session') {
      const { sessionId } = body;
      if (!sessionId) return Response.json({ error: 'Missing sessionId' }, { status: 400 });
      const sessionDir = join(TRANSCRIPTIONS_DIR, sessionId);
      const sessionJsonPath = join(sessionDir, 'session.json');
      if (!existsSync(sessionJsonPath)) return Response.json({ error: 'Session not found' }, { status: 404 });
      try {
        const sessionState = JSON.parse(readFileSync(sessionJsonPath, 'utf8'));
        const chunksDir = join(sessionDir, 'chunks');
        let segments = [], fullText = '';
        if (existsSync(chunksDir)) {
          const files = readdirSync(chunksDir).filter(f => f.startsWith('chunk_') && f.endsWith('.json'));
          const chunks = files.map(f => { try { return JSON.parse(readFileSync(join(chunksDir, f), 'utf8')); } catch { return null; } })
            .filter(Boolean).sort((a, b) => a.index - b.index);
          for (const chunk of chunks) {
            if (chunk.text) fullText += (fullText ? ' ' : '') + chunk.text;
            if (chunk.segments) segments.push(...chunk.segments);
          }
        }
        let refinedText = '';
        const refinedPath = join(sessionDir, 'refined.txt');
        if (existsSync(refinedPath)) refinedText = readFileSync(refinedPath, 'utf8');
        return Response.json({ success: true, session: sessionState, transcription: fullText, segments, refinedText });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    if (action === 'transcribe-chunk') {
      const { sessionId, chunkIndex } = body;
      if (!sessionId || chunkIndex === undefined) return Response.json({ error: 'Missing sessionId or chunkIndex' }, { status: 400 });

      const sessionDir = join(TRANSCRIPTIONS_DIR, sessionId);
      const sessionJsonPath = join(sessionDir, 'session.json');
      const wavPath = join(sessionDir, 'audio.wav');
      if (!existsSync(sessionJsonPath) || !existsSync(wavPath)) return Response.json({ error: 'Session or audio file not found' }, { status: 404 });

      try {
        const sessionState = JSON.parse(readFileSync(sessionJsonPath, 'utf8'));
        const config = readConfig();
        const isColab = sessionState.transcribeMode === 'colab';
        const isGemini = sessionState.transcribeMode === 'gemini';
        const isElevenLabs = sessionState.transcribeMode === 'elevenlabs';
        const CHUNK_SECONDS = 300; // 5-minute chunks for cloud providers

        const wavBuf = readFileSync(wavPath);
        const wavInfo = parseWavHeader(wavBuf);
        const { channels, sampleRate, bitsPerSample, dataSize, dataOffset } = wavInfo;
        const bytesPerSec = sampleRate * channels * (bitsPerSample / 8);
        const chunkSize = (bytesPerSec * CHUNK_SECONDS);

        const chunkStart = (chunkIndex * chunkSize);
        const chunkEnd = Math.min((chunkIndex + 1) * chunkSize, dataSize);
        const chunkDataSize = chunkEnd - chunkStart;

        if (chunkDataSize <= 0) return Response.json({ error: 'Invalid chunk range' }, { status: 400 });

        const chunkWav = Buffer.concat([
          buildWavHeader(chunkDataSize, channels, sampleRate, bitsPerSample),
          wavBuf.slice(dataOffset + chunkStart, dataOffset + chunkEnd)
        ]);

        // ─── Google Colaboratory ────────────────────────────────────────────────
        if (isColab) {
          if (!config.colabUrl) return Response.json({ error: 'No Google Colab URL configured. Please add your Colab notebook URL in settings.' }, { status: 400 });

          const colabBase = config.colabUrl.replace(/\/+$/, '');

          // Strip silent tail from the chunk WAV before upload.
          // Silence at the end of a chunk is the primary trigger for Whisper
          // hallucination cascades (repetition loops, language drift, garbage tokens).
          const uploadWav = trimSilentTailFromChunk(chunkWav, channels, sampleRate, bitsPerSample);

          const formData = new FormData();
          formData.append('file', new Blob([uploadWav], { type: 'audio/wav' }), `chunk_${chunkIndex}.wav`);

          console.log(`[Colab] Sending chunk ${chunkIndex} to ${colabBase}/transcribe (${(uploadWav.length / 1024).toFixed(0)} KB)`);
          const colabRes = await fetchWithRetry(`${colabBase}/transcribe`, {
            method: 'POST',
            headers: { 'ngrok-skip-browser-warning': 'true' },
            body: formData,
            signal: request.signal
          });

          if (!colabRes.ok) {
            const errText = await readErrorText(colabRes);

            // A 404 from the Colab /transcribe endpoint almost always means the
            // FastAPI/uvicorn process on the remote runtime has died (CUDA OOM,
            // segfault, or Colab runtime recycled). ngrok is still up but has
            // nothing to proxy to, so it returns its own HTML 404 error page.
            //
            // Confirm by pinging /ping. If that also fails, flip colabState to
            // 'failed' so the engine badges in the UI update immediately and the
            // user knows to re-provision before retrying.
            if (colabRes.status === 404) {
              try {
                const pingCheck = await fetch(`${colabBase}/ping`, {
                  headers: { 'ngrok-skip-browser-warning': 'true' },
                  signal: AbortSignal.timeout(4000)
                });
                if (!pingCheck.ok) {
                  colabState = 'failed';
                  colabLogLines.push('[System] ⚠ Colab server confirmed offline (ping returned non-ok). Re-provisioning required before retrying.');
                }
              } catch {
                colabState = 'failed';
                colabLogLines.push('[System] ⚠ Colab server confirmed offline (ping unreachable). Re-provisioning required before retrying.');
              }
            }

            throw new Error(`Colab transcription failed: ${errText}`);
          }

          const colabData = await colabRes.json();
          let transcriptText = colabData.text || colabData.transcription || '';

          // Optional Round 2: LLM self-correction via the selected agent
          if (transcriptText.trim()) {
            const verifyPrompt = `Review the following transcript for typos, spelling/grammatical errors, repetitions, and formatting inconsistencies. Maintain all timestamps and speaker attributions exactly as they are. Return only the cleaned transcript with no additional chat commentary or conversational padding.\n\nTranscript:\n${transcriptText}`;
            try {
              const { text: verifiedText } = await callAgent({ user: verifyPrompt, timeout: 60000 });
              if (verifiedText?.trim()) transcriptText = verifiedText.trim();
            } catch (err) {
              console.warn(`[Colab+Agent] LLM verification failed (non-fatal): ${err.message}`);
            }
          }

          const chunkResult = { index: chunkIndex, text: transcriptText, segments: [] };
          const chunksDir = join(sessionDir, 'chunks');
          if (!existsSync(chunksDir)) mkdirSync(chunksDir, { recursive: true });
          writeFileSync(join(chunksDir, `chunk_${chunkIndex}.json`), JSON.stringify(chunkResult, null, 2));

          sessionState.currentChunk = Math.max(sessionState.currentChunk, chunkIndex + 1);
          sessionState.updatedAt = new Date().toISOString();
          sessionState.status = sessionState.currentChunk >= sessionState.totalChunks ? 'complete' : 'transcribing';
          writeFileSync(sessionJsonPath, JSON.stringify(sessionState, null, 2));

          return Response.json({ success: true, chunk: chunkResult, session: sessionState });
        }

        // ─── Google Gemini API ──────────────────────────────────────────────────
        if (isGemini) {
          const googleApiKey = config.googleApiKey;
          if (!googleApiKey) {
            return Response.json({ error: 'Missing Google Gemini API Key. Please add it in settings.' }, { status: 400 });
          }

          const geminiModel = config.geminiModel || 'models/gemini-2.0-flash';
          console.log(`[Gemini API] Processing audio via Files API... File size: ${(chunkWav.length / 1024 / 1024).toFixed(2)} MB`);

          // 1. Initialize Resumable Upload
          console.log(`[Gemini API] Initializing resumable session...`);
          const initRes = await fetchWithRetry(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${googleApiKey}`, {
            method: 'POST',
            headers: {
              'X-Goog-Upload-Protocol': 'resumable',
              'X-Goog-Upload-Command': 'start',
              'X-Goog-Upload-Header-Content-Length': chunkWav.length.toString(),
              'X-Goog-Upload-Header-Content-Type': 'audio/wav',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              file: {
                display_name: `transcription-full-${sessionId}`
              }
            }),
            signal: request.signal
          });

          if (!initRes.ok) {
            const errText = await readErrorText(initRes);
            throw new Error(`Gemini Files API initialization failed: ${errText}`);
          }

          const uploadUrl = initRes.headers.get('x-goog-upload-url');
          if (!uploadUrl) {
            throw new Error('Gemini Files API: Failed to retrieve upload session URL.');
          }

          // 2. Upload WAV Bytes
          console.log(`[Gemini API] Uploading binary bytes...`);
          const uploadRes = await fetchWithRetry(uploadUrl, {
            method: 'POST',
            headers: {
              'X-Goog-Upload-Offset': '0',
              'X-Goog-Upload-Command': 'upload, finalize',
              'Content-Length': chunkWav.length.toString()
            },
            body: chunkWav,
            signal: request.signal
          });

          if (!uploadRes.ok) {
            const errText = await readErrorText(uploadRes);
            throw new Error(`Gemini Files API upload failed: ${errText}`);
          }

          const uploadData = await uploadRes.json();
          const fileUri = uploadData.file.uri;
          const fileName = uploadData.file.name; // e.g. "files/..."
          console.log(`[Gemini API] Upload complete. File URI: ${fileUri}, File Name: ${fileName}`);

          // 3. Poll status until ACTIVE
          let state = 'PROCESSING';
          let attempt = 0;
          console.log(`[Gemini API] Waiting for audio processing...`);
          while (state === 'PROCESSING') {
            attempt++;
            if (attempt > 30) { // 60 seconds limit
              throw new Error('Gemini audio processing timed out.');
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const pollRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${googleApiKey}`, {
              signal: request.signal
            });
            if (!pollRes.ok) {
              const errText = await readErrorText(pollRes);
              throw new Error(`Gemini Files API poll failed: ${errText}`);
            }
            const pollData = await pollRes.json();
            state = pollData.state || 'ACTIVE';
            console.log(`[Gemini API] Processing state: ${state} (attempt ${attempt})`);
            if (state === 'FAILED') {
              throw new Error('Gemini audio processing failed on server.');
            }
          }

          // 4. Generate Transcription
          console.log(`[Gemini API] Generating content with model: ${geminiModel}...`);
          const transcriptionPrompt = config.transcriptionPrompt || defaults.transcriptionPrompt;
          const genRes = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/${geminiModel}:generateContent?key=${googleApiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: transcriptionPrompt },
                    {
                      fileData: {
                        fileUri: fileUri,
                        mimeType: 'audio/wav'
                      }
                    }
                  ]
                }
              ]
            }),
            signal: request.signal
          });

          if (!genRes.ok) {
            const errText = await readErrorText(genRes);
            throw new Error(`Gemini generateContent failed: ${errText}`);
          }

          const genData = await genRes.json();
          let transcriptText = genData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          console.log(`[Gemini API] Content generation complete. Transcript length: ${transcriptText.length} characters`);

          // 5. Cleanup file from Gemini API storage asynchronously
          fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${googleApiKey}`, {
            method: 'DELETE'
          }).then(res => {
            if (res.ok) console.log(`[Gemini API] Cleaned up remote file ${fileName}`);
            else console.warn(`[Gemini API] Failed to cleanup file ${fileName}`);
          }).catch(err => {
            console.warn(`[Gemini API] File cleanup network error: ${err.message}`);
          });

          // 6. Return response
          const chunkResult = { index: chunkIndex, text: transcriptText, segments: [] };
          const chunksDir = join(sessionDir, 'chunks');
          if (!existsSync(chunksDir)) mkdirSync(chunksDir, { recursive: true });
          writeFileSync(join(chunksDir, `chunk_${chunkIndex}.json`), JSON.stringify(chunkResult, null, 2));

          sessionState.currentChunk = Math.max(sessionState.currentChunk, chunkIndex + 1);
          sessionState.updatedAt = new Date().toISOString();
          sessionState.status = sessionState.currentChunk >= sessionState.totalChunks ? 'complete' : 'transcribing';
          writeFileSync(sessionJsonPath, JSON.stringify(sessionState, null, 2));

          return Response.json({ success: true, chunk: chunkResult, session: sessionState });
        }

        // ─── ElevenLabs Scribe API ──────────────────────────────────────────────
        if (isElevenLabs) {
          const elevenlabsApiKey = config.elevenlabsApiKey;
          if (!elevenlabsApiKey) {
            return Response.json({ error: 'Missing ElevenLabs API Key. Please add it in settings.' }, { status: 400 });
          }

          const elevenlabsModel = config.elevenlabsModel || 'scribe_v2';
          console.log(`[ElevenLabs API] Processing audio via Scribe API... File size: ${(chunkWav.length / 1024 / 1024).toFixed(2)} MB`);

          const formData = new FormData();
          formData.append('file', new Blob([chunkWav], { type: 'audio/wav' }), `transcription-${sessionId}.wav`);
          formData.append('model_id', elevenlabsModel);
          formData.append('diarize', 'true');
          
          if (config.elevenlabsLanguageCode) {
            formData.append('language_code', config.elevenlabsLanguageCode);
          }

          console.log(`[ElevenLabs API] Sending request to Speech to Text API...`);
          const elRes = await fetchWithRetry('https://api.elevenlabs.io/v1/speech-to-text', {
            method: 'POST',
            headers: {
              'xi-api-key': elevenlabsApiKey
            },
            body: formData,
            signal: request.signal
          });

          if (!elRes.ok) {
            const errText = await readErrorText(elRes);
            throw new Error(`ElevenLabs Speech to Text failed: ${errText}`);
          }

          const elData = await elRes.json();
          console.log(`[ElevenLabs API] Response text length: ${elData.text?.length || 0}`);
          
          let transcriptText = elData.text || '';
          let elSegments = [];
          
          if (elData.words && elData.words.length > 0) {
            const formatted = formatElevenLabsWords(elData.words);
            transcriptText = formatted.text;
            elSegments = formatted.segments;
          }

          const chunkResult = { index: chunkIndex, text: transcriptText, segments: elSegments };
          const chunksDir = join(sessionDir, 'chunks');
          if (!existsSync(chunksDir)) mkdirSync(chunksDir, { recursive: true });
          writeFileSync(join(chunksDir, `chunk_${chunkIndex}.json`), JSON.stringify(chunkResult, null, 2));

          sessionState.currentChunk = Math.max(sessionState.currentChunk, chunkIndex + 1);
          sessionState.updatedAt = new Date().toISOString();
          sessionState.status = sessionState.currentChunk >= sessionState.totalChunks ? 'complete' : 'transcribing';
          writeFileSync(sessionJsonPath, JSON.stringify(sessionState, null, 2));

          return Response.json({ success: true, chunk: chunkResult, session: sessionState });
        }

        return Response.json({ error: 'Unknown transcription mode' }, { status: 400 });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    if (action === 'cleanup-session') {
      const { sessionId } = body;
      if (sessionId) {
        const sessionDir = join(TRANSCRIPTIONS_DIR, sessionId);
        if (existsSync(sessionDir)) rmSync(sessionDir, { recursive: true, force: true });
      }
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  }

  // ── Handle Audio Upload (multipart/form-data) ────────────────────────────────
  const formData = await request.formData();
  const file = formData.get('audio');
  const transcribeMode = formData.get('mode') || 'elevenlabs';

  if (!file || !(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'No audio file provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const extMatch = file.name.match(/\.(\w+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'mp3';
  const allowed = ['mp3', 'wav', 'ogg', 'm4a', 'webm'];
  if (!allowed.includes(ext)) {
    return new Response(JSON.stringify({ error: `Unsupported format: .${ext}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const config = readConfig();

  if (transcribeMode === 'huggingface' && !config.hfApiKey) {
    return new Response(JSON.stringify({ error: 'Missing Hugging Face Access Token. Please add it in settings.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (transcribeMode === 'colab' && !config.colabUrl) {
    return new Response(JSON.stringify({ error: 'No Google Colab URL configured. Please add your Colab notebook URL in settings.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (transcribeMode === 'gemini' && !config.googleApiKey) {
    return new Response(JSON.stringify({ error: 'Missing Google Gemini API Key. Please add it in settings.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (transcribeMode === 'elevenlabs' && !config.elevenlabsApiKey) {
    return new Response(JSON.stringify({ error: 'Missing ElevenLabs API Key. Please add it in settings.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const sessionId = randomBytes(16).toString('hex');
  const sessionDir = join(TRANSCRIPTIONS_DIR, sessionId);

  try {
    mkdirSync(sessionDir, { recursive: true });
    mkdirSync(join(sessionDir, 'chunks'), { recursive: true });

    const inPath = join(sessionDir, `audio_in.${ext}`);
    const outPath = join(sessionDir, 'audio.wav');

    writeFileSync(inPath, buffer);

    // Convert to 16kHz mono WAV via FFmpeg
    execSync(`ffmpeg -y -i "${inPath}" -ar 16000 -ac 1 -sample_fmt s16 "${outPath}"`, { stdio: 'pipe', timeout: 120000 });

    try { unlinkSync(inPath); } catch {}

    const wavBuf = readFileSync(outPath);
    const CHUNK_SECONDS = 300; // 5-minute cloud chunks
    const wavInfo = parseWavHeader(wavBuf);
    const { channels, sampleRate, bitsPerSample, dataSize } = wavInfo;
    const bytesPerSec = sampleRate * channels * (bitsPerSample / 8);
    const duration = bytesPerSec > 0 ? dataSize / bytesPerSec : 0;
    const totalChunks = Math.max(1, Math.ceil(dataSize / (bytesPerSec * CHUNK_SECONDS)));

    const sessionState = {
      id: sessionId,
      filename: file.name,
      fileSize: file.size,
      status: 'ready',
      duration,
      totalChunks,
      transcribeMode,
      currentChunk: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    writeFileSync(join(sessionDir, 'session.json'), JSON.stringify(sessionState, null, 2));

    return Response.json({ success: true, sessionId, filename: file.name, fileSize: file.size, totalChunks, duration });
  } catch (err) {
    try { rmSync(sessionDir, { recursive: true, force: true }); } catch {}
    return Response.json({ error: err.message }, { status: 500 });
  }
}
