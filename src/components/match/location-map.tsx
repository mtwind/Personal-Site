"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { loadGoogleMaps } from "@/lib/google-maps";
import {
  MAP_RESTRICTION,
  tierFor,
  US_BOUNDS,
  US_VIEW,
  type LocationPin,
} from "@/lib/location-pins";

/**
 * A teardrop whose *tip* sits at the coordinate, so the pin points at
 * the city rather than covering it. Drawn upwards from the origin: the
 * anchor is (0,0) and the head is centred on (0,-30).
 */
const PIN_PATH =
  "M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z";

/** Roads and water without the shops, stops and parks. */
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "road",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative.province",
    elementType: "geometry.stroke",
    stylers: [{ color: "#dadce0" }],
  },
];

interface LocationMapProps {
  /**
   * Maps JavaScript API key, handed down from the server. Callers only
   * render this component when they have one — there is no map without
   * it, and a caller that knows that can show its text listing alone.
   */
  apiKey: string;
  pins: LocationPin[];
  /** Height and shape of the frame; the map fills it. */
  className?: string;
  /**
   * The pin whose box is held open from outside — the list beside the
   * map, or the row being edited in admin. Selecting one pans to it.
   */
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /**
   * Admin only: where the reader clicked. Turns the map into a coordinate
   * picker, which beats typing latitudes by hand.
   */
  onMapClick?: (lat: number, lng: number) => void;
  /** Admin only: the position being edited, drawn while it is unsaved. */
  draft?: { lat: number; lng: number } | null;
}

type MapState = "loading" | "ready" | "failed";

/**
 * The map of the US with a pin on every place, and the reason for it in
 * a box that opens on hover.
 *
 * The box is React rather than an `InfoWindow`: it has to look like the
 * rest of this page, and an InfoWindow brings its own chrome. Position
 * comes from an `OverlayView`'s projection — the one supported way to
 * ask the map where a coordinate currently sits in pixels — recomputed
 * whenever the map moves, so the box stays fixed to its pin through a
 * pan or a zoom.
 */
export function LocationMap({
  apiKey,
  pins,
  className = "h-[420px]",
  selectedId = null,
  onSelect,
  onMapClick,
  draft = null,
}: LocationMapProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const mapsRef = useRef<typeof google.maps | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const projectionRef = useRef<google.maps.MapCanvasProjection | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const draftMarkerRef = useRef<google.maps.Marker | null>(null);

  const [state, setState] = useState<MapState>("loading");

  /** The pin whose box is open, and where that box goes. */
  const [open, setOpen] = useState<{
    pin: LocationPin;
    x: number;
    y: number;
  } | null>(null);
  const openPinRef = useRef<LocationPin | null>(null);
  /** True once a pin was clicked: hovering away no longer closes it. */
  const stickyRef = useRef(false);

  // Callbacks are read through refs so the map is built once and never
  // torn down because a parent re-rendered with a new closure.
  const onSelectRef = useRef(onSelect);
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onSelectRef.current = onSelect;
    onMapClickRef.current = onMapClick;
  }, [onSelect, onMapClick]);

  /** Put the box on a pin — or take it down when handed null. */
  const place = useCallback((pin: LocationPin | null) => {
    openPinRef.current = pin;
    const maps = mapsRef.current;
    const projection = projectionRef.current;
    if (!pin || !maps || !projection) {
      setOpen(null);
      return;
    }
    const point = projection.fromLatLngToContainerPixel(
      new maps.LatLng(pin.lat, pin.lng),
    );
    if (!point) {
      setOpen(null);
      return;
    }
    setOpen({ pin, x: point.x, y: point.y });
  }, []);

  // Build the map once, on mount.
  useEffect(() => {
    if (!frameRef.current) {
      setState("failed");
      return;
    }
    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled || !frameRef.current) return;

        const map = new maps.Map(frameRef.current, {
          center: US_VIEW.center,
          zoom: US_VIEW.zoom,
          minZoom: 3,
          // Scrolling the page over a map should scroll the page.
          gestureHandling: "cooperative",
          // Everything except zoom: this is one country at a glance, and
          // satellite view, Street View and a tilt compass are controls
          // for a map someone came to explore.
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          cameraControl: false,
          zoomControl: true,
          clickableIcons: false,
          restriction: { latLngBounds: MAP_RESTRICTION, strictBounds: false },
          styles: MAP_STYLES,
        });

        // The frame is whatever width the column gave it, so the country
        // is fitted to it rather than assumed. Padding keeps a pin near
        // the coast off the edge of its own map.
        map.fitBounds(US_BOUNDS, 12);

        // A bare overlay, mounted only for its projection: converting a
        // coordinate to a pixel has no other supported entry point.
        const overlay = new maps.OverlayView();
        overlay.onAdd = () => {};
        overlay.onRemove = () => {};
        overlay.draw = () => {
          projectionRef.current = overlay.getProjection();
        };
        overlay.setMap(map);

        map.addListener("bounds_changed", () => {
          if (openPinRef.current) place(openPinRef.current);
        });
        map.addListener("click", (event: google.maps.MapMouseEvent) => {
          stickyRef.current = false;
          place(null);
          onSelectRef.current?.(null);
          const position = event.latLng;
          if (position) onMapClickRef.current?.(position.lat(), position.lng());
        });

        mapsRef.current = maps;
        mapRef.current = map;
        setState("ready");
      })
      .catch((error: unknown) => {
        console.error("location map unavailable:", error);
        if (!cancelled) setState("failed");
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, place]);

  // Redraw the markers whenever the pins change. The lists are small
  // enough that rebuilding beats diffing them.
  useEffect(() => {
    const maps = mapsRef.current;
    const map = mapRef.current;
    if (state !== "ready" || !maps || !map) return;

    markersRef.current = pins.map((pin) => {
      const tier = tierFor(pin.priority);
      // The classic marker rather than `AdvancedMarkerElement`, which
      // needs a cloud-configured Map ID — and a Map ID silently discards
      // the `styles` above. It logs a deprecation notice with a stated
      // 12 months' notice before anything changes.
      const marker = new maps.Marker({
        map,
        position: { lat: pin.lat, lng: pin.lng },
        title: pin.label,
        // Real DOM per marker: focusable with the keyboard, where the
        // batched canvas the optimized path draws is not.
        optimized: false,
        icon: {
          path: PIN_PATH,
          fillColor: tier.color,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 1.5,
          scale: 0.62,
          anchor: new maps.Point(0, 0),
          labelOrigin: new maps.Point(0, -30),
        },
        label: pin.priority
          ? {
              text: String(pin.priority),
              color: tier.ink,
              fontSize: "11px",
              fontWeight: "600",
            }
          : undefined,
      });

      marker.addListener("mouseover", () => {
        if (!stickyRef.current) place(pin);
      });
      marker.addListener("mouseout", () => {
        if (!stickyRef.current) place(null);
      });
      // Also what Enter on a focused marker fires, so the box is
      // reachable without a mouse.
      marker.addListener("click", () => {
        stickyRef.current = true;
        place(pin);
        onSelectRef.current?.(pin.id);
      });

      return marker;
    });

    return () => {
      for (const marker of markersRef.current) {
        maps.event.clearInstanceListeners(marker);
        marker.setMap(null);
      }
      markersRef.current = [];
    };
  }, [pins, state, place]);

  // The unsaved position, drawn as a hollow ring so it never reads as
  // one of the pins that are actually on the map.
  useEffect(() => {
    const maps = mapsRef.current;
    const map = mapRef.current;
    if (state !== "ready" || !maps || !map) return;

    draftMarkerRef.current?.setMap(null);
    draftMarkerRef.current = draft
      ? new maps.Marker({
          map,
          position: draft,
          title: "New position",
          zIndex: 1000,
          icon: {
            path: maps.SymbolPath.CIRCLE,
            fillColor: "#ffffff",
            fillOpacity: 1,
            strokeColor: "#202124",
            strokeWeight: 3,
            scale: 7,
          },
        })
      : null;

    return () => {
      draftMarkerRef.current?.setMap(null);
      draftMarkerRef.current = null;
    };
  }, [draft, state]);

  // A selection made outside the map — a row in the list, a pin being
  // edited — brings the map to it and opens its box.
  useEffect(() => {
    if (state !== "ready") return;
    const pin = pins.find((candidate) => candidate.id === selectedId) ?? null;
    stickyRef.current = pin !== null;
    if (pin) mapRef.current?.panTo({ lat: pin.lat, lng: pin.lng });
    place(pin);
  }, [selectedId, pins, state, place]);

  if (state === "failed") {
    return (
      <div
        className={`${className} flex items-center justify-center rounded-2xl border border-dashed border-[#dadce0] bg-white px-6 text-center text-sm text-[#5f6368]`}
      >
        The map couldn’t load just now — the places are listed below.
      </div>
    );
  }

  return (
    <div
      className={`${className} relative overflow-hidden rounded-2xl border border-[#dadce0] bg-[#e8eaed]`}
    >
      <div ref={frameRef} className="h-full w-full" />

      {state === "loading" ? (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-[#5f6368]">
          Loading the map…
        </p>
      ) : null}

      {open ? <PinCard pin={open.pin} x={open.x} y={open.y} /> : null}
    </div>
  );
}

/**
 * The box that opens on a pin: what the place is, where it sits in the
 * ranking, and why it's on the map at all.
 *
 * Positioned above its pin and clipped to the frame by the parent's
 * `overflow-hidden`, so a pin near an edge slides its box inward rather
 * than pushing it outside the map.
 */
function PinCard({ pin, x, y }: { pin: LocationPin; x: number; y: number }) {
  const tier = tierFor(pin.priority);

  return (
    <div
      // Pointer-transparent: the box sits over the marker it belongs to,
      // and catching the pointer would count as leaving the pin.
      className="pointer-events-none absolute z-10 w-64 max-w-[80%] -translate-x-1/2 -translate-y-full"
      style={{ left: x, top: y - 34 }}
      role="tooltip"
    >
      <div className="rounded-xl border border-[#dadce0] bg-white p-3 shadow-[0_1px_3px_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]">
        <p className="flex items-center gap-2 text-[14px] font-medium text-[#202124]">
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: tier.color }}
          />
          {pin.label}
        </p>
        <p className="mt-0.5 text-[11px] tracking-wide text-[#5f6368] uppercase">
          {pin.priority ? `${tier.label} · rank ${pin.priority}` : tier.label}
        </p>
        {pin.note ? (
          <p className="mt-2 text-[13px] leading-5 text-[#3c4043]">{pin.note}</p>
        ) : null}
      </div>
      {/* The tail, pointing back down at the pin. */}
      <div
        aria-hidden
        className="mx-auto h-2 w-2 -translate-y-1 rotate-45 border-r border-b border-[#dadce0] bg-white"
      />
    </div>
  );
}
