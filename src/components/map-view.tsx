"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

type Pin = { lat: number; lng: number; label: string; color: string };

export function MapView({
  pins,
  route,
  height = 220,
  onPick,
}: {
  pins: Pin[];
  route?: [number, number][];
  height?: number;
  onPick?: (lat: number, lng: number) => void;
}) {
  const holder = useRef<HTMLDivElement | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const signature = JSON.stringify({ pins, route });

  useEffect(() => {
    const node = holder.current;
    if (!node) return;
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    const parsed = JSON.parse(signature) as { pins: Pin[]; route?: [number, number][] };

    (async () => {
      const leaflet = await import("leaflet");
      if (cancelled || !holder.current) return;
      const L = leaflet.default;
      const first = parsed.pins[0] ?? { lat: -15.4167, lng: 28.2833 };
      map = L.map(holder.current, { zoomControl: false, attributionControl: true }).setView([first.lat, first.lng], 13);
      const tile = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      L.tileLayer(tile, { attribution: "&copy; OpenStreetMap" }).addTo(map);
      parsed.pins.forEach((pin) => {
        const icon = L.divIcon({
          className: "",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          html: `<div style="width:18px;height:18px;border-radius:999px;background:${pin.color};border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25)"></div>`,
        });
        L.marker([pin.lat, pin.lng], { icon }).addTo(map!).bindTooltip(pin.label);
      });
      if (parsed.route && parsed.route.length > 1) {
        L.polyline(parsed.route, { color: "#6f4b32", weight: 4, opacity: 0.9 }).addTo(map);
      }
      const bounds = [
        ...parsed.pins.map((pin) => [pin.lat, pin.lng] as [number, number]),
        ...(parsed.route ?? []),
      ];
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [24, 24] });
      map.on("click", (event) => pickRef.current?.(event.latlng.lat, event.latlng.lng));
      window.setTimeout(() => map?.invalidateSize(), 180);
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [signature]);

  return <div ref={holder} style={{ height }} className="overflow-hidden rounded-[22px] border border-line" />;
}
