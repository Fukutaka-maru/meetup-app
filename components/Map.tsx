"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  color: string;
};

type Props = {
  markers: MapMarker[];
};

function createMarkerElement(label: string, color: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "flex flex-col items-center";
  el.innerHTML = `
    <div style="
      background:${color};color:#fff;font-size:12px;font-weight:600;
      padding:2px 8px;border-radius:9999px;white-space:nowrap;
      box-shadow:0 1px 4px rgba(0,0,0,.3);margin-bottom:2px;
    ">${label}</div>
    <div style="
      width:16px;height:16px;border-radius:9999px;background:${color};
      border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);
    "></div>
  `;
  return el;
}

export default function Map({ markers }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerObjsRef = useRef<Record<string, mapboxgl.Marker>>({});
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [139.7671, 35.6812], // 初期表示: 東京駅付近(位置取得までの仮表示)
      zoom: 12,
    });
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerObjsRef.current = {};
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<string>();
    for (const m of markers) {
      seen.add(m.id);
      const existing = markerObjsRef.current[m.id];
      if (existing) {
        existing.setLngLat([m.lng, m.lat]);
      } else {
        markerObjsRef.current[m.id] = new mapboxgl.Marker({
          element: createMarkerElement(m.label, m.color),
          anchor: "bottom",
        })
          .setLngLat([m.lng, m.lat])
          .addTo(map);
      }
    }
    for (const id of Object.keys(markerObjsRef.current)) {
      if (!seen.has(id)) {
        markerObjsRef.current[id].remove();
        delete markerObjsRef.current[id];
      }
    }

    // マーカー数が変わったときだけ全体が収まるようにズーム調整
    if (markers.length !== prevCountRef.current && markers.length > 0) {
      fitToMarkers(map, markers);
    }
    prevCountRef.current = markers.length;
  }, [markers]);

  const handleFitAll = () => {
    if (mapRef.current && markers.length > 0) {
      fitToMarkers(mapRef.current, markers);
    }
  };

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {markers.length > 0 && (
        <button
          onClick={handleFitAll}
          className="absolute bottom-4 right-4 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-lg active:bg-gray-100"
        >
          全体を表示
        </button>
      )}
    </div>
  );
}

function fitToMarkers(map: mapboxgl.Map, markers: MapMarker[]) {
  if (markers.length === 1) {
    map.flyTo({ center: [markers[0].lng, markers[0].lat], zoom: 15 });
    return;
  }
  const bounds = new mapboxgl.LngLatBounds();
  for (const m of markers) bounds.extend([m.lng, m.lat]);
  map.fitBounds(bounds, { padding: 80, maxZoom: 16 });
}
