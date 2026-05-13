// components/maps/MapView.tsx - New component using Leaflet
'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), {
  ssr: false,
});

interface MapViewProps {
  merchants: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    address: string;
  }>;
  center: { lat: number; lng: number };
  onMarkerClick?: (merchant: any) => void;
}

export function MapView({ merchants, center, onMarkerClick }: MapViewProps) {
  const [LeafletIcon, setLeafletIcon] = useState<any>(null);

  useEffect(() => {
    import('leaflet').then((L) => {
      setLeafletIcon(() =>
        L.icon({
          iconUrl: '/marker-icon.png',
          iconRetinaUrl: '/marker-icon-2x.png',
          shadowUrl: '/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
        })
      );
    });
  }, []);

  if (!LeafletIcon)
    return <div className="animate-pulse bg-gray-200 h-64 rounded-xl" />;

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={14}
      style={{ height: '280px', width: '100%', borderRadius: '1rem' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
      />
      {merchants.map((merchant) => (
        <Marker
          key={merchant.id}
          position={[merchant.latitude, merchant.longitude]}
          icon={LeafletIcon}
          eventHandlers={{ click: () => onMarkerClick?.(merchant) }}
        >
          <Popup>
            <div className="p-2">
              <p className="font-semibold">{merchant.name}</p>
              <p className="text-xs text-gray-500">{merchant.address}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
