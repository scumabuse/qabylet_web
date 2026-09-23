/**
 * Shared text-to-speech for the whole app.
 *
 * Two kinds of speech share the browser's single speech queue:
 * - "assistant": voice assistant replies, AI tutor answers, explicit
 *   "read aloud" buttons. Controlled by the TTS setting.
 * - "hover": the "read on hover" accessibility mode.
 * Hover reading never interrupts assistant speech; assistant speech always
 * replaces hover reading.
 */

export type SpeechSource = "assistant" | "hover";

type SpeakOptions = {
  lang?: string;
  rate?: number;
  pitch?: number;
  source?: SpeechSource;
  /** Speak even if the TTS setting is off (explicit "read aloud" clicks). */
  force?: boolean;
};

// Chrome stops long utterances after ~15 s with some voices, so long text is
// queued as several shorter utterances.
const MAX_CHUNK_LENGTH = 200;

let assistantEnabled = true;
let activeSource: SpeechSource | null = null;
// Strong references: Chrome can garbage-collect an utterance mid-speech,
// which silently cuts it off.
let activeUtterances: SpeechSynthesisUtterance[] = [];
let voices: SpeechSynthesisVoice[] = [];
let voicesHooked = false;

function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  return window.speechSynthesis;
}

function ensureVoices(synth: SpeechSynthesis) {
  if (!voicesHooked) {
    voicesHooked = true;
    const load = () => {
      voices = synth.getVoices();
    };
    synth.addEventListener?.("voiceschanged", load);
  }
  // Voices load asynchronously; refresh until the list is available.
  if (voices.length === 0) voices = synth.getVoices();
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const wanted = lang.toLowerCase();
  const base = wanted.split("-")[0];
  const norm = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace("_", "-");
  const tests: ((v: SpeechSynthesisVoice) => boolean)[] = [
    (v) => norm(v) === wanted,
    (v) => norm(v).startsWith(base),
  ];
  // Kazakh voices are rarely installed; a Russian voice can read Cyrillic,
  // which is better than silence.
  if (base === "kk") tests.push((v) => norm(v).startsWith("ru"));
  for (const test of tests) {
    // Prefer on-device voices: they start faster and are not cut off.
    const match = voices.find((v) => test(v) && v.localService) ?? voices.find(test);
    if (match) return match;
  }
  return undefined;
}

export function cleanForSpeech(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}️?/gu, " ")
    .replace(/[*_#~`>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitIntoChunks(text: string): string[] {
  const sentences = text.split(/(?<=[.!?…;:])\s+/);
  const chunks: string[] = [];
  let current = "";
  const push = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };
  for (const sentence of sentences) {
    if ((current + " " + sentence).trim().length <= MAX_CHUNK_LENGTH) {
      current = (current + " " + sentence).trim();
      continue;
    }
    push();
    if (sentence.length <= MAX_CHUNK_LENGTH) {
      current = sentence;
      continue;
    }
    // A single very long sentence: split on spaces.
    for (const word of sentence.split(" ")) {
      if ((current + " " + word).trim().length > MAX_CHUNK_LENGTH) push();
      current = (current + " " + word).trim();
    }
  }
  push();
  return chunks;
}

/** Mirrors the TTS setting. Called by AccessibilityProvider. */
export function setAssistantSpeechEnabled(enabled: boolean) {
  assistantEnabled = enabled;
  if (!enabled) stopSpeaking("assistant");
}

export function speak(text: string, options: SpeakOptions = {}): boolean {
  const synth = getSynth();
  if (!synth) return false;

  const source = options.source ?? "assistant";
  if (source === "assistant" && !assistantEnabled && !options.force) return false;

  const clean = cleanForSpeech(text);
  if (!clean) return false;

  const busy = synth.speaking || synth.pending;
  if (source === "hover" && busy && activeSource === "assistant") return false;

  ensureVoices(synth);
  const lang = options.lang ?? "ru-RU";
  const voice = pickVoice(lang);

  if (busy) synth.cancel();
  if (synth.paused) synth.resume();

  const chunks = splitIntoChunks(clean);
  const batch: SpeechSynthesisUtterance[] = chunks.map((chunk, i) => {
    const u = new SpeechSynthesisUtterance(chunk);
    u.lang = voice?.lang ?? lang;
    if (voice) u.voice = voice;
    u.rate = options.rate ?? 1;
    u.pitch = options.pitch ?? 1;
    if (i === chunks.length - 1) {
      u.onend = u.onerror = () => {
        if (activeUtterances === batch) {
          activeUtterances = [];
          activeSource = null;
        }
      };
    }
    return u;
  });

  activeUtterances = batch;
  activeSource = source;
  batch.forEach((u) => synth.speak(u));
  return true;
}

/** Stops speech. With a source, stops only if that kind is currently speaking. */
export function stopSpeaking(source?: SpeechSource) {
  const synth = getSynth();
  if (!synth) return;
  if (source && activeSource !== source) return;
  synth.cancel();
  activeUtterances = [];
  activeSource = null;
}
