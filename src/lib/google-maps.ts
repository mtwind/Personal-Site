/**
 * One-shot loader for the Google Maps JavaScript API.
 *
 * The script is a global singleton — loading it twice logs a warning and
 * throws away the first copy's state — so every component that wants a
 * map awaits the same promise rather than injecting its own tag. The
 * team-matching map and the admin one both mount from here.
 *
 * Without a key the promise rejects rather than loading a watermarked
 * map: callers show their text fallback, the way the page runs without
 * an Anthropic key.
 */

declare global {
  interface Window {
    google?: typeof google;
    /** Resolves the pending load; named so the API can call it back. */
    __matchMapsReady?: () => void;
  }
}

const CALLBACK = "__matchMapsReady";

let pending: Promise<typeof google.maps> | null = null;

export function loadGoogleMaps(apiKey: string): Promise<typeof google.maps> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps only loads in the browser"));
  }
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (pending) return pending;

  pending = new Promise<typeof google.maps>((resolve, reject) => {
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: apiKey,
      v: "weekly",
      loading: "async",
      callback: CALLBACK,
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;

    window[CALLBACK] = () => {
      const maps = window.google?.maps;
      if (maps) resolve(maps);
      else reject(new Error("Google Maps loaded without a maps namespace"));
    };

    script.addEventListener("error", () => {
      // Let a later mount try again — a failed load is usually the
      // network rather than the key, and the page may still be open.
      pending = null;
      script.remove();
      reject(new Error("Google Maps failed to load"));
    });

    document.head.append(script);
  });

  return pending;
}
