import sys
import subprocess
import os
import threading
import re
import shutil

# 1. Install missing dependencies
print("Installing dependencies on Colab runtime...")
subprocess.run(
    [sys.executable, "-m", "pip", "install",
     "fastapi", "uvicorn", "pyngrok", "python-multipart",
     "faster-whisper", "psutil"],
    check=True
)

import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException
import traceback
from pyngrok import ngrok
from faster_whisper import WhisperModel
import psutil
import torch
import gc

# ──────────────────────────────────────────────────────────────────────────────
# System Info
# ──────────────────────────────────────────────────────────────────────────────
print("CUDA Available:", torch.cuda.is_available())
if torch.cuda.is_available():
    print("GPU Device Name:", torch.cuda.get_device_name(0))
process = psutil.Process(os.getpid())
print(f"Initial CPU Memory: {process.memory_info().rss / (1024 ** 3):.2f} GB")
sys.stdout.flush()

# ──────────────────────────────────────────────────────────────────────────────
# 2. Ngrok Authentication
# ──────────────────────────────────────────────────────────────────────────────
ngrok_token = "PLACEHOLDER_TOKEN"

if not ngrok_token or ngrok_token == "PLACEHOLDER_TOKEN":
    print("ERROR: Ngrok Authtoken is required to start the tunnel.", file=sys.stderr)
    sys.exit(1)

print("Authenticating Ngrok...")
ngrok.set_auth_token(ngrok_token)

# ──────────────────────────────────────────────────────────────────────────────
# 3. Load Whisper model (faster-whisper / CTranslate2, FP16)
# ──────────────────────────────────────────────────────────────────────────────
print("Loading Whisper model (large-v3-turbo) using faster-whisper FP16...")
sys.stdout.flush()
model = WhisperModel("large-v3-turbo", device="cuda", compute_type="float16")
print(f"Model loaded. CPU Memory: {process.memory_info().rss / (1024 ** 3):.2f} GB")
if torch.cuda.is_available():
    print(f"GPU Allocated Memory: {torch.cuda.memory_allocated(0) / (1024 ** 3):.2f} GB")
sys.stdout.flush()

# ──────────────────────────────────────────────────────────────────────────────
# 4. Audio pre-processing
# ──────────────────────────────────────────────────────────────────────────────

def trim_trailing_silence(input_path: str, output_path: str,
                          silence_threshold_db: float = -40.0,
                          min_silence_s: float = 1.5) -> str:
    """
    Uses FFmpeg silencedetect to find the last stretch of silence and trims
    the audio file to just before that silence begins.

    This is a second layer of silence removal that works at the file level,
    complementing the VAD that operates inside the Whisper model. Together
    they prevent Whisper from ever "seeing" dead air at chunk boundaries —
    which is the root cause of hallucination cascades like "They are… They are…"
    or "German German Thanks for watching!".

    Falls back gracefully to the original file if FFmpeg is unavailable or fails.
    """
    try:
        probe = subprocess.run(
            [
                "ffmpeg", "-i", input_path,
                "-af", f"silencedetect=n={silence_threshold_db}dB:d={min_silence_s}",
                "-f", "null", "-"
            ],
            capture_output=True, text=True, timeout=30
        )
        # silence_start markers appear in stderr
        starts = [float(m) for m in re.findall(r'silence_start: ([\d.]+)', probe.stderr)]
        if starts:
            trim_end = starts[-1]  # cut just before the last silence begins
            subprocess.run(
                [
                    "ffmpeg", "-y", "-i", input_path,
                    "-t", str(trim_end),
                    "-c", "copy", output_path
                ],
                check=True, timeout=60, capture_output=True
            )
            print(f"[Trim] Trimmed trailing silence. Audio ends at {trim_end:.1f}s")
            return output_path
    except Exception as e:
        print(f"[Trim] Silence trim skipped (non-fatal): {e}")

    shutil.copy(input_path, output_path)
    return output_path


# ──────────────────────────────────────────────────────────────────────────────
# 5. Anti-artifact post-processing helpers
# ──────────────────────────────────────────────────────────────────────────────

def _remove_sequential_duplicates(segments):
    """
    Drop consecutive segments whose text is identical to the previous one.
    Handles the classic "They are... They are..." cascade artifact.
    """
    cleaned = []
    last_text = None
    for seg in segments:
        stripped = seg.text.strip()
        if stripped and stripped != last_text:
            cleaned.append(stripped)
            last_text = stripped
    return cleaned


def _remove_short_word_chains(text: str) -> str:
    """
    Collapses chains of the same 1–4 word phrase repeated 3+ times.
    Catches:  "other other other other other other..."
              "And. And. And. And. And."
              "foreign foreign foreign"
    """
    pattern = re.compile(
        r'\b((?:\w[\w\'-]*\b[\s.,!?]*){1,4}?)(?:\s*\1){3,}',
        re.IGNORECASE
    )
    for _ in range(5):
        new_text = pattern.sub(lambda m: m.group(1).rstrip(), text)
        if new_text == text:
            break
        text = new_text
    return text.strip()


def _collapse_inline_repetitions(text: str) -> str:
    """
    Collapse repeated phrases WITHIN a single text string.

    Previous version used \\b\\w word boundaries which broke on abbreviations
    like J.D. (the period stops boundary matching mid-phrase).  This version
    matches any sequence of non-whitespace + spaces, so J.D., R.S.M., etc.
    are handled correctly.

    e.g. "and the J.D. is in place and the J.D. is in place" × 24 → once.
    """
    # Match 2–14 'tokens' where a token is any non-space run (includes J.D.)
    pattern = re.compile(
        r'((?:[^\s]+\s*){2,14}?)\s*(?:[,;]?\s*\1){1,}',
        re.IGNORECASE
    )
    for _ in range(8):
        new_text = pattern.sub(lambda m: m.group(1).rstrip(), text)
        if new_text == text:
            break
        text = new_text
    return text.strip()


def _collapse_long_repetitions(text: str) -> str:
    """
    Last-resort backstop: uses a regex backreference to find ANY character
    sequence of 8–200 chars that repeats 3+ times consecutively, and collapses
    it to a single occurrence.  Works regardless of word boundaries, punctuation,
    or abbreviation style.

    Iterates from longest to shortest so a 25-char phrase repeated 24 times is
    found before a 5-char sub-phrase repeated 3 times within it.
    """
    for min_len, max_len in [(50, 200), (20, 50), (8, 20)]:
        pat = re.compile(
            rf'(.{{{min_len},{max_len}}}?)\1{{2,}}',
            re.IGNORECASE | re.DOTALL
        )
        prev = None
        while prev != text:
            prev = text
            text = pat.sub(r'\1', text)
    return text.strip()


def _strip_non_latin_garbage(text: str) -> str:
    """
    Removes runs of non-Latin characters that appear as hallucination artifacts:
    — CJK (Chinese/Japanese: 詳細, ding men engineering)
    — Hangul (Korean: 핶)
    — Arabic, Devanagari etc.

    We target runs of 1+ characters from these Unicode blocks because in an
    English/Malayalam meeting with Latin-script output these characters are
    ALWAYS artifacts. Malayalam itself is transcribed by Whisper in Latin
    script (romanised) when language="en" is set.
    """
    non_latin_run = re.compile(
        r'[\u4e00-\u9fff'   # CJK Unified Ideographs
        r'\u3040-\u30ff'    # Hiragana + Katakana
        r'\uac00-\ud7af'    # Hangul Syllables
        r'\u0400-\u04ff'    # Cyrillic (Russian etc.) — дор, etc.
        r'\u0600-\u06ff'    # Arabic
        r'\u0900-\u097f'    # Devanagari
        r'\uff00-\uffef'    # Halfwidth / Fullwidth forms
        r']+',
        re.UNICODE
    )
    text = non_latin_run.sub('', text)
    text = re.sub(r'\s{2,}', ' ', text).strip()
    return text


def _strip_known_hallucinations(text: str) -> str:
    """
    Strips phrases Whisper commonly hallucinates at the boundaries of
    silence, background noise, or when it drifts to a different language context.
    """
    # Ordered from most-specific to most-general
    hallucination_phrases = [
        # ── YouTube / subtitle footers ──────────────────────────────────
        r"thanks?\s+for\s+watching[.!]?",
        r"please\s+(like|subscribe|comment)[.!]?",
        r"don'?t\s+forget\s+to\s+(like|subscribe)[.!]?",
        r"see\s+you\s+(next|in\s+the\s+next)[.!]?",
        r"subtitles?\s+by\s+.{0,40}",
        # ── Noise / music markers ───────────────────────────────────────
        r"\[music\]", r"\[applause\]", r"\[laughter\]",
        r"\(music\)", r"\(applause\)", r"\(laughter\)",
        # ── Whisper "foreign" token bleeding into output ─────────────────
        # When Whisper detects a non-English segment it emits [_foreign_]
        # which renders as the literal word "foreign".
        r"\bforeign\b",
        # ── Language name labels from Whisper's language detector ────────
        # These appear when the model detects a language switch and emits
        # the detected language name as a token (e.g. "German  German  German")
        r"^(german|english|french|spanish|japanese|chinese|korean|hindi|arabic|portuguese)\s*$",
        r"\b(german|french|spanish|japanese|chinese|korean|arabic|portuguese)\b",
        # ── Garbled token artifacts ──────────────────────────────────────
        r"voucher[-\s]?notes?",
        r"thank\s+you\s*핶\w*",  # Korean-mixed garbage
    ]
    for phrase in hallucination_phrases:
        text = re.sub(phrase, "", text, flags=re.IGNORECASE | re.MULTILINE)
    # Normalise whitespace
    text = re.sub(r'\s{2,}', ' ', text).strip()
    return text


def clean_transcript(segments) -> str:
    """
    Full cleanup pipeline applied to every transcribed chunk:
      1. Sequential segment deduplication  (same sentence repeated × N)
      2. Non-Latin garbage strip           (CJK / Cyrillic / Arabic artifacts)
      3. Short-word chain collapse         ("other other other..." / "And. And.")
      4. Inline phrase repetition collapse (token-level — handles J.D., R.S.M.)
      5. Character-level long repetition   (final backstop for any missed loops)
      6. Known hallucination phrase strip  ("foreign", "Thanks for watching", etc.)
    Layers are independent — if one misses an artifact the next catches it.
    """
    parts = _remove_sequential_duplicates(segments)
    joined = " ".join(parts)
    joined = _strip_non_latin_garbage(joined)
    joined = _remove_short_word_chains(joined)
    joined = _collapse_inline_repetitions(joined)
    joined = _collapse_long_repetitions(joined)   # backstop for J.D.-style loops
    joined = _strip_known_hallucinations(joined)
    return joined


# ──────────────────────────────────────────────────────────────────────────────
# 6. FastAPI App
# ──────────────────────────────────────────────────────────────────────────────
app = FastAPI()


@app.get("/ping")
async def ping():
    return {"status": "ok"}


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    temp_file = "temp_chunk.wav"
    trimmed_file = "temp_chunk_trimmed.wav"

    try:
        with open(temp_file, "wb") as f:
            f.write(await file.read())

        print(f"Transcribing audio file: {file.filename}")
        sys.stdout.flush()

        # Pre-process: strip trailing silence before the model sees it.
        # The Node.js server already does an RMS-based trim, but this FFmpeg pass
        # is more precise and catches longer silence stretches (> 1.5 s).
        audio_to_transcribe = trim_trailing_silence(temp_file, trimmed_file)

        segments_gen, info = model.transcribe(
            audio_to_transcribe,
            language="en",
            beam_size=5,
            patience=1.0,
            temperature=(0.0, 0.2, 0.4, 0.6, 0.8, 1.0),
            compression_ratio_threshold=1.35,
            no_speech_threshold=0.6,
            condition_on_previous_text=False,
            suppress_blank=True,
            initial_prompt=(
                "This is a business meeting transcript in English and Malayalam. "
                "Participants are discussing sales, finance, and business strategy."
            ),
            vad_filter=True,
            vad_parameters=dict(
                threshold=0.6,
                min_speech_duration_ms=250,
                min_silence_duration_ms=300,
                speech_pad_ms=300,
            ),
        )

        segments = list(segments_gen)
        print(f"Raw segments: {len(segments)}")
        sys.stdout.flush()

        text = clean_transcript(segments)

        for path in (temp_file, trimmed_file):
            if os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass

        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        print(f"Transcription complete. Output length: {len(text)} chars")
        sys.stdout.flush()

        return {"text": text}

    except torch.cuda.OutOfMemoryError:
        # ── CUDA OOM ─────────────────────────────────────────────────────────────
        # A Python-level OOM exception is recoverable: clear the cache and return
        # 503 (Service Unavailable).  fetchWithRetry in the SvelteKit server
        # already retries all 5xx responses, so the client will automatically
        # wait and try this chunk again without re-provisioning.
        # This prevents the uvicorn process from dying, keeping the server alive
        # for subsequent chunks.
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        for path in (temp_file, trimmed_file):
            try:
                if os.path.exists(path): os.remove(path)
            except Exception:
                pass
        print("[ERROR] CUDA Out of Memory — cleared cache, returning 503.", file=sys.stderr)
        sys.stdout.flush()
        raise HTTPException(status_code=503, detail="GPU out of memory. Retry in a moment.")

    except Exception as e:
        # ── All other errors ──────────────────────────────────────────────────────
        # Surface as a 500 instead of letting the exception propagate and
        # potentially crash the uvicorn worker.  Full traceback is printed to
        # stderr so it appears in the Colab console logs.
        print(f"[ERROR] Transcription failed:\n{traceback.format_exc()}", file=sys.stderr)
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        for path in (temp_file, trimmed_file):
            try:
                if os.path.exists(path): os.remove(path)
            except Exception:
                pass
        sys.stdout.flush()
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────────────────────
# 7. Entry point
# ──────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Kill any existing process on port 8000
    print("Clearing any existing processes on port 8000...")
    subprocess.run("fuser -k 8000/tcp", shell=True)
    sys.stdout.flush()

    # Open Ngrok tunnel
    print("Opening Ngrok Tunnel...")
    public_url = ngrok.connect(8000).public_url
    print(f"\n[COLAB_URL] {public_url} \n")
    sys.stdout.flush()

    # Run FastAPI server in a background thread.
    # daemon=False ensures the thread survives cell execution completion.
    server_thread = threading.Thread(
        target=lambda: uvicorn.run(app, host="0.0.0.0", port=8000),
        daemon=False
    )
    server_thread.start()

    print("Server successfully started in background thread. Exiting main thread to yield to Jupyter event loop.")
    sys.stdout.flush()
