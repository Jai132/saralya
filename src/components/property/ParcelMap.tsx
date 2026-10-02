import { Circle, CircleMarker, MapContainer, Polygon, TileLayer } from 'react-leaflet';

export const ESRI_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
export const ESRI_ATTRIBUTION = 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community';

/** Satellite map centred on the capture point, with the GPS accuracy circle and the (dummy) cadastral parcel. */
export function ParcelMap({ lat, lng, accuracy, parcel, height = 240 }: { lat: number; lng: number; accuracy: number; parcel: [number, number][]; height?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line shadow-card" style={{ height }}>
      <MapContainer center={[lat, lng]} zoom={19} maxZoom={20} scrollWheelZoom={false} zoomControl={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer url={ESRI_TILES} attribution={ESRI_ATTRIBUTION} maxNativeZoom={19} maxZoom={20} />
        <Polygon positions={parcel} pathOptions={{ color: '#2dd4bf', weight: 3, fillColor: '#14b8a6', fillOpacity: 0.18 }} />
        <Circle center={[lat, lng]} radius={accuracy} pathOptions={{ color: '#fbbf24', weight: 1.5, fillOpacity: 0.08, dashArray: '4 4' }} />
        <CircleMarker center={[lat, lng]} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: '#0F766E', fillOpacity: 1 }} />
      </MapContainer>
    </div>
  );
}

/** Esri tile (z/x/y) containing a point, and the point's pixel position inside it. */
export function tileFor(lat: number, lng: number, z = 18) {
  const n = 2 ** z;
  const xf = ((lng + 180) / 360) * n;
  const r = (lat * Math.PI) / 180;
  const yf = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
  const x = Math.floor(xf);
  const y = Math.floor(yf);
  return { url: ESRI_TILES.replace('{z}', String(z)).replace('{y}', String(y)).replace('{x}', String(x)), px: (xf - x) * 256, py: (yf - y) * 256 };
}
