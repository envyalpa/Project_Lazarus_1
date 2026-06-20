import { execSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Target the whisper.cpp local inference endpoint
const WHISPER_URL = 'http://localhost:8080/inference';

/**
 * @param {Buffer} audioBuffer - raw uploaded audio data
 * @param {string} ext - original file extension e.g. 'mp3', 'wav'
 * @returns {Promise<{text: string, logs: Array<{time: string, level: string, msg: string}>}>}
 */
export async function transcribeAudio(audioBuffer, ext) {
  const logs = [];
  const tmpId = randomBytes(8).toString('hex');
  const inPath = join(tmpdir(), `transcribe_in_${tmpId}.${ext}`);
  const outPath = join(tmpdir(), `transcribe_out_${tmpId}.wav`);

  function stamp() {
    return new Date().toLocaleTimeString('en-GB', { hour12: false });
  }
  function log(level, msg) {
    logs.push({ time: stamp(), level, msg });
  }

  try {
    writeFileSync(inPath, audioBuffer);
    log('UPLOAD', `Received audio file: ${(audioBuffer.length / 1024).toFixed(1)} KB`);

    const ffmpegStart = Date.now();
    execSync(
      `ffmpeg -y -i "${inPath}" -ar 16000 -ac 1 -sample_fmt s16 "${outPath}"`,
      { stdio: 'pipe', timeout: 30000 }
    );
    const ffmpegTime = ((Date.now() - ffmpegStart) / 1000).toFixed(2);
    log('PROCESS', `FFmpeg: converted .${ext} → 16kHz mono WAV (${ffmpegTime}s)`);

    const { readFileSync } = await import('node:fs');
    const wavBuffer = readFileSync(outPath);
    log('PROCESS', `WAV size: ${(wavBuffer.length / 1024).toFixed(1)} KB, sending to whisper.cpp...`);

    const whisperStart = Date.now();
    
    // Construct multipart form data for whisper-server
    const formData = new FormData();
    formData.append('file', new Blob([wavBuffer], { type: 'audio/wav' }), 'audio.wav');
    formData.append('response_format', 'json');

    const response = await fetch(WHISPER_URL, {
      method: 'POST',
      body: formData
    });

    const whisperTime = ((Date.now() - whisperStart) / 1000).toFixed(2);

    if (!response.ok) {
      const err = await response.text();
      log('ERROR', `whisper.cpp error ${response.status}: ${err}`);
      throw new Error(`whisper.cpp error ${response.status}: ${err}`);
    }

    const json = await response.json();
    const text = (json.text || '').trim();
    log('DONE', `whisper.cpp: processed in ${whisperTime}s`);
    log('DONE', `Transcription complete — ${text.length} characters`);

    return { text, logs };
  } finally {
    try { unlinkSync(inPath); } catch {}
    try { unlinkSync(outPath); } catch {}
  }
}
