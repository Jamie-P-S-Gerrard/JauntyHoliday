'use client';
import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatItemTime } from '@/lib/time';
import type { ItineraryItem, LatLng } from '@/types';

// Numbered teardrop pin matching the app's terra accent (leaflet's default
// PNG icons don't survive bundling, so we draw our own).
function pinIcon(n: number) {
  return L.divIcon({
    className: '',
    html:
      `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);` +
      `background:#c4633b;border:2px solid #fff;box-shadow:0 1px 4px rgba(44,40,35,0.35);` +
      `display:flex;align-items:center;justify-content:center;">` +
      `<span style="transform:rotate(45deg);color:#fff;font-size:11.5px;font-weight:700;` +
      `font-family:system-ui,sans-serif;">${n}</span></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26],
  });
}

function FitToPins({ points }: { points: LatLng[] }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat},${p.lng}`).join('|');
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
    } else {
      map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), {
        padding: [28, 28],
        maxZoom: 14,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

interface ItineraryMapProps {
  /** Items in display (time) order — pins are numbered to match. */
  items: ItineraryItem[];
  /** Fallback centre when no item has coordinates. */
  center?: LatLng;
  height?: number;
}

export default function ItineraryMap({ items, center, height = 190 }: ItineraryMapProps) {
  const located = useMemo(
    () => items.map((item, i) => ({ item, n: i + 1 })).filter(({ item }) => item.coords),
    [items],
  );
  const fallback: LatLng = center ?? located[0]?.item.coords ?? { lat: -8.65, lng: 116.32 };

  return (
    <div style={{ height, borderRadius: 'var(--radius-sm)', overflow: 'hidden', position: 'relative', zIndex: 0 }}>
      <MapContainer
        center={[fallback.lat, fallback.lng]}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToPins points={located.map(({ item }) => item.coords!)} />
        {located.map(({ item, n }) => (
          <Marker key={item.id} position={[item.coords!.lat, item.coords!.lng]} icon={pinIcon(n)}>
            <Popup>
              <strong>{item.title}</strong>
              <br />
              {formatItemTime(item)} · {item.place}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
