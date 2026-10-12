/**
 * Deepgram Nova-3 real-time WebSocket audio streaming client.
 *
 * Connects directly from the browser to Deepgram's edge WebSocket using an
 * ephemeral JWT (minted by /api/dictate/token). Emits low-latency partials (~150-250ms)
 * for live ghost-text preview and final utterances for background AI cleanup.
 *
 * Audio chunks are also buffered locally so that if WebSocket connection
 * fails mid-stream, the session seamlessly falls back to the record-and-upload path.
 */

export type StreamCallbacks = {
  onPartial: (text: string) => void;
  onSentenceFinal: (sentence: string) => void;
  onError: (error: Error) => void;
  onClose?: () => void;
};

export type StreamSession = {
  stop: () => Promise<{ durationSeconds: number; fallbackBlob: Blob; mimeType: string }>;
  abort: () => void;
  getStream: () => MediaStream | null;
};

const PREFERRED_MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

/** Extracts up to 50 distinctive keywords from a document text for STT vocabulary boosting */
export function extractKeywordsFromDoc(text: string, maxKeywords = 40): string[] {
  if (!text || text.length < 5) return [];
  // Find words with camelCase, PascalCase, technical terms, or capitalized words
  const words = text.match(/\b[A-Za-z0-9_-]{3,30}\b/g) ?? [];
  const freq = new Map<string, number>();
  const stopWords = new Set([
    "the", "and", "that", "have", "for", "not", "with", "you", "this", "but", "his", "from",
    "they", "say", "her", "she", "will", "one", "all", "would", "there", "their", "what",
    "about", "which", "when", "make", "can", "like", "time", "just", "him", "know", "take",
    "people", "into", "year", "your", "good", "some", "could", "them", "see", "other", "than",
    "then", "now", "look", "only", "come", "its", "over", "think", "also", "back", "after",
    "use", "two", "how", "our", "work", "first", "well", "way", "even", "new", "want", "because"
  ]);

  for (const w of words) {
    const lower = w.toLowerCase();
    if (stopWords.has(lower) || /^\d+$/.test(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

export async function startDeepgramStream(
  token: string,
  callbacks: StreamCallbacks,
  options?: { keywords?: string[]; existingStream?: MediaStream }
): Promise<StreamSession> {
  const mimeType = pickMimeType();
  const stream = options?.existingStream ?? (await navigator.mediaDevices.getUserMedia({ audio: true }));

  const url = new URL("wss://api.deepgram.com/v1/listen");
  url.searchParams.set("model", "nova-3");
  url.searchParams.set("smart_format", "true");
  url.searchParams.set("interim_results", "true");
  url.searchParams.set("endpointing", "350");
  url.searchParams.set("vad_events", "true");

  if (options?.keywords && options.keywords.length > 0) {
    for (const kw of options.keywords) {
      if (kw.trim()) {
        url.searchParams.append("keywords", `${kw.trim()}:2`);
      }
    }
  }

  // Deepgram browser subprotocol for JWTs minted via /v1/auth/grant
  const ws = new WebSocket(url.toString(), ["bearer", token]);
  const audioChunks: Blob[] = [];
  const startedAt = Date.now();
  let recorder: MediaRecorder | null = null;
  let isClosed = false;
  let accumulatedUtterance = "";
  let lastInterim = "";

  const connectionPromise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Deepgram WebSocket connection timed out"));
    }, 8000);

    ws.onopen = () => {
      clearTimeout(timeout);
      resolve();
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Failed to connect to Deepgram streaming service"));
    };
  });

  try {
    await connectionPromise;
  } catch (err) {
    ws.close();
    if (!options?.existingStream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    throw err;
  }

  // Start MediaRecorder streaming binary chunks to WebSocket
  recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      audioChunks.push(event.data);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(event.data);
      }
    }
  };

  recorder.start(250); // Emit audio slice every 250ms for low-latency streaming

  ws.onmessage = (event) => {
    if (isClosed) return;
    try {
      const data = JSON.parse(event.data);
      if (data.type === "Results") {
        const transcript = data.channel?.alternatives?.[0]?.transcript?.trim() ?? "";
        const isFinal = !!data.is_final;
        const speechFinal = !!data.speech_final;

        if (isFinal) {
          if (transcript) {
            accumulatedUtterance = accumulatedUtterance
              ? `${accumulatedUtterance} ${transcript}`
              : transcript;
          }
          lastInterim = "";

          // Complete utterance/sentence boundary detected
          if (speechFinal && accumulatedUtterance.trim()) {
            const finished = accumulatedUtterance.trim();
            accumulatedUtterance = "";
            callbacks.onSentenceFinal(finished);
            callbacks.onPartial("");
          } else if (accumulatedUtterance) {
            callbacks.onPartial(accumulatedUtterance);
          }
        } else if (transcript) {
          lastInterim = transcript;
          const display = accumulatedUtterance ? `${accumulatedUtterance} ${transcript}` : transcript;
          callbacks.onPartial(display);
        }
      }
    } catch (parseErr) {
      console.warn("Error parsing Deepgram message:", parseErr);
    }
  };

  ws.onerror = (e) => {
    if (!isClosed) {
      console.error("Deepgram WebSocket error:", e);
      callbacks.onError(new Error("WebSocket stream connection error"));
    }
  };

  ws.onclose = () => {
    if (!isClosed) {
      callbacks.onClose?.();
    }
  };

  const finalize = async (): Promise<{ durationSeconds: number; fallbackBlob: Blob; mimeType: string }> => {
    isClosed = true;
    const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));

    // Emit any remaining pending utterance before stopping
    const remaining = [accumulatedUtterance, lastInterim].filter(Boolean).join(" ").trim();
    if (remaining) {
      callbacks.onSentenceFinal(remaining);
      callbacks.onPartial("");
    }

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }

    // Gracefully send CloseStream message to Deepgram
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: "CloseStream" }));
      } catch {}
      ws.close();
    }

    if (!options?.existingStream) {
      stream.getTracks().forEach((t) => t.stop());
    }

    const effectiveMime = recorder?.mimeType || mimeType || "audio/webm";
    const fallbackBlob = new Blob(audioChunks, { type: effectiveMime });

    return { durationSeconds, fallbackBlob, mimeType: effectiveMime };
  };

  const abort = () => {
    isClosed = true;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {}
    }
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      try {
        ws.close();
      } catch {}
    }
    if (!options?.existingStream) {
      stream.getTracks().forEach((t) => t.stop());
    }
  };

  return {
    stop: finalize,
    abort,
    getStream: () => stream,
  };
}
