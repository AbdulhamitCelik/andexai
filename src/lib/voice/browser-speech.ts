/** Client-side Web Speech API helpers (browser built-in voice). */

export type VoiceChatMessage = { role: "user" | "assistant"; content: string };

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
}

let pendingOnEnd: (() => void) | null = null;
let lastSpokenText = "";

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown };
  return Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition);
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

type RecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

interface RecognitionResultEvent {
  resultIndex: number;
  results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } };
}

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { webkitSpeechRecognition?: RecognitionCtor; SpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function createSpeechRecognition(): InstanceType<RecognitionCtor> | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  return recognition;
}

export function getLastSpokenText(): string {
  return lastSpokenText;
}

export function speakText(text: string, options?: SpeakOptions | (() => void)): void {
  const opts: SpeakOptions =
    typeof options === "function" ? { onEnd: options } : (options ?? {});

  if (!isSpeechSynthesisSupported()) {
    opts.onEnd?.();
    return;
  }

  lastSpokenText = text;
  pendingOnEnd = opts.onEnd ?? null;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = opts.rate ?? 1;
  utterance.pitch = opts.pitch ?? 1;
  utterance.onend = () => {
    const cb = pendingOnEnd;
    pendingOnEnd = null;
    cb?.();
  };
  utterance.onerror = () => {
    const cb = pendingOnEnd;
    pendingOnEnd = null;
    cb?.();
  };
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (!isSpeechSynthesisSupported()) return;
  pendingOnEnd = null;
  window.speechSynthesis.cancel();
}

export function pauseSpeaking(): boolean {
  if (!isSpeechSynthesisSupported() || !window.speechSynthesis.speaking) return false;
  window.speechSynthesis.pause();
  return true;
}

export function resumeSpeaking(): boolean {
  if (!isSpeechSynthesisSupported() || !window.speechSynthesis.paused) return false;
  window.speechSynthesis.resume();
  return true;
}

export function isSpeaking(): boolean {
  return isSpeechSynthesisSupported() && window.speechSynthesis.speaking;
}

export function isSpeakingPaused(): boolean {
  return isSpeechSynthesisSupported() && window.speechSynthesis.paused;
}

export function getVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisSupported()) return [];
  return window.speechSynthesis.getVoices();
}

export function copyText(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.reject(new Error("Clipboard unavailable"));
}
