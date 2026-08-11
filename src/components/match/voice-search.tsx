"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * The Web Speech API, narrowed to the three things this uses.
 *
 * Hand-written because the DOM lib doesn't ship these types: the API is
 * still vendor-prefixed in most browsers, which is also why the button
 * has to check for it at runtime rather than assume it.
 */
interface SpeechAlternative {
  transcript: string;
}
interface SpeechResult {
  readonly length: number;
  item(index: number): SpeechAlternative;
  [index: number]: SpeechAlternative;
}
interface SpeechResultList {
  readonly length: number;
  item(index: number): SpeechResult;
  [index: number]: SpeechResult;
}
interface SpeechEvent {
  results: SpeechResultList;
}
interface SpeechRecognizer {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognizerCtor = new () => SpeechRecognizer;

function recognizerCtor(): SpeechRecognizerCtor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: SpeechRecognizerCtor;
    webkitSpeechRecognition?: SpeechRecognizerCtor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

/** Support doesn't change while the page is open. */
const staticSource = () => () => {};

/**
 * The microphone in the search field.
 *
 * Renders nothing at all where the browser has no speech recognition,
 * rather than a button that reports failure after being pressed — an
 * affordance that can't do its job is worse than no affordance. Support
 * is checked after mount, so the server and the first client render
 * agree on a field without a mic.
 */
export function VoiceSearchButton({
  onResult,
}: {
  onResult: (text: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const recognizer = useRef<SpeechRecognizer | null>(null);

  // Whether the browser can do this at all is a fact about the browser,
  // read the same way any other external fact is — false on the server,
  // so the first paint everywhere is a field without a microphone.
  const supported = useSyncExternalStore(
    staticSource,
    () => recognizerCtor() !== null,
    () => false,
  );

  useEffect(() => {
    // Whatever is still listening when the field unmounts is abandoned:
    // a recognizer outliving its input would deliver into nothing.
    return () => recognizer.current?.abort();
  }, []);

  if (!supported) return null;

  const listen = () => {
    if (listening) {
      recognizer.current?.stop();
      return;
    }

    const Ctor = recognizerCtor();
    if (!Ctor) return;

    const instance = new Ctor();
    instance.lang = "en-US";
    instance.continuous = false;
    instance.interimResults = false;

    instance.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) onResult(transcript);
    };
    // A denied microphone and a silent room look the same from here, and
    // both mean the same thing: stop showing that we're listening.
    instance.onerror = () => setListening(false);
    instance.onend = () => setListening(false);

    recognizer.current = instance;
    setListening(true);
    instance.start();
  };

  return (
    <button
      type="button"
      onClick={listen}
      aria-label={listening ? "Stop listening" : "Search by voice"}
      title={listening ? "Listening…" : "Search by voice"}
      className={`shrink-0 cursor-pointer rounded-full p-1 transition-colors ${
        listening
          ? "bg-[#fce8e6] text-[#d93025]"
          : "text-[#4285F4] hover:bg-[#f1f3f4]"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`h-4.5 w-4.5 ${listening ? "animate-pulse" : ""}`}
        aria-hidden
      >
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    </button>
  );
}
