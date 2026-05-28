import { useEffect, useRef } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { AlertTriangle } from 'lucide-react';
import { defaultTurkeyCenter } from '../../utils/cityCoordinates';
import { getMapTheme } from '../../maps/mapThemes';

const turkeyBounds = [
  [35.65, 25.4],
  [42.35, 45.2],
];

export default function TravelMapBase({
  routes = [],
  markers = [],
  center = defaultTurkeyCenter,
  zoom = 6,
  theme = 'dark',
  className = '',
  scrollWheelZoom = true,
  onMapClick,
  fitKey = '',
  emptyMessage = 'Konum bilgisi eksik',
  showEmptyMap = false,
}) {
  const themeConfig = getMapTheme(theme);
  const hasContent = routes.some((route) => route.points?.length >= 2) || markers.some((marker) => isCoord(marker.position));

  if (!hasContent && !onMapClick && !showEmptyMap) {
    return (
      <div className={`travel-map-empty ${className}`}>
        <AlertTriangle size={24} />
        <strong>{emptyMessage}</strong>
        <span>Başlangıç ve varış için geçerli koordinat bulunamadı.</span>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      minZoom={5}
      maxBounds={turkeyBounds}
      maxBoundsViscosity={0.15}
      zoomSnap={0.25}
      zoomDelta={0.5}
      wheelPxPerZoomLevel={130}
      wheelDebounceTime={70}
      easeLinearity={0.25}
      inertia
      inertiaDeceleration={1500}
      className={`trip-map map-theme-${themeConfig.id} ${className}`}
      scrollWheelZoom={scrollWheelZoom}
    >
      <TileLayer attribution={themeConfig.attribution} url={themeConfig.tileUrl} />
      {onMapClick && <MapClickPicker onPick={onMapClick} />}
      <MapInvalidator />
      <MapFitter routes={routes} markers={markers} fitKey={fitKey || `${theme}-${routes.length}-${markers.length}`} />
      {routes.map((route) => (
        <Polyline
          key={route.id}
          positions={route.points}
          color={route.color || '#3b82f6'}
          opacity={themeConfig.routeOpacity}
          weight={themeConfig.routeWeight}
          className={theme === 'dark' ? 'neon-route-line' : 'soft-route-line'}
        />
      ))}
      {markers.filter((marker) => isCoord(marker.position)).map((marker) => (
        <Marker key={marker.id} position={marker.position} eventHandlers={marker.onClick ? { click: marker.onClick } : undefined}>
          {marker.tooltip && <Tooltip direction="top" offset={[0, -28]} opacity={1}>{marker.tooltip}</Tooltip>}
          {marker.popup && <Popup>{marker.popup}</Popup>}
        </Marker>
      ))}
    </MapContainer>
  );
}

function MapClickPicker({ onPick }) {
  useMapEvents({
    click: (event) => onPick({ lat: event.latlng.lat, lng: event.latlng.lng }),
  });
  return null;
}

function MapInvalidator() {
  const map = useMap();
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => map.invalidateSize({ animate: false }));
    const timer = window.setTimeout(() => map.invalidateSize({ animate: false }), 240);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [map]);
  return null;
}

function MapFitter({ routes, markers, fitKey }) {
  const map = useMap();
  const lastFitKey = useRef('');
  useEffect(() => {
    if (lastFitKey.current === fitKey) return;
    lastFitKey.current = fitKey;
    const points = [
      ...routes.flatMap((route) => route.points || []),
      ...markers.map((marker) => marker.position),
    ].filter(isCoord);
    if (points.length >= 2) map.fitBounds(points, { padding: [28, 28], maxZoom: 12 });
    else if (points.length === 1) map.setView(points[0], 12, { animate: true });
    else map.fitBounds(turkeyBounds, { padding: [12, 12] });
  }, [fitKey, map, markers, routes]);
  return null;
}

function isCoord(coords) {
  return Array.isArray(coords) && coords.length === 2 && coords.every((coord) => Number.isFinite(Number(coord)));
}
