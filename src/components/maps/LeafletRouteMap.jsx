import { Fragment, useEffect } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { defaultTurkeyCenter } from '../../utils/cityCoordinates';
import { decodeOverviewPolyline, getRouteColor } from '../../services/osmRouteService';

const tiles = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  minimal: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
};

export default function LeafletRouteMap({ trips = [], trip, routePreview, theme = 'dark', className = '', onRouteSelect }) {
  const routeItems = routePreview ? [normalizeRoutePreview(routePreview)] : trip ? [tripToRouteItem(trip)] : trips.map(tripToRouteItem).filter(Boolean);
  const allPoints = routeItems.flatMap((item) => item.points || []);
  if (!routeItems.length) {
    return (
      <div className={`travel-map-empty ${className}`}>
        <strong>Konum bilgisi eksik</strong>
        <span>Bu seyahatte rota çizecek koordinat bulunamadı.</span>
      </div>
    );
  }

  return (
    <MapContainer
      center={toLeafletPoint(allPoints[0]) || defaultTurkeyCenter}
      zoom={6}
      zoomSnap={0.5}
      zoomDelta={0.5}
      wheelPxPerZoomLevel={180}
      wheelDebounceTime={90}
      className={`trip-map google-route-map leaflet-route-map map-theme-${theme} ${className}`}
      scrollWheelZoom
    >
      <TileLayer attribution="&copy; OpenStreetMap &copy; CARTO" url={tiles[theme] || tiles.dark} />
      <FitBounds points={allPoints} />
      {routeItems.map((item) => (
        <RouteLayer key={item.id} item={item} onRouteSelect={onRouteSelect} />
      ))}
    </MapContainer>
  );
}

function RouteLayer({ item, onRouteSelect }) {
  const color = getRouteColor(item.transportType);
  const isFlight = item.transportType === 'Uçak';
  return (
    <Fragment>
      {item.points.length >= 2 && (
        <Polyline
          positions={(isFlight ? buildFlightArc(item.points) : item.points).map(toLeafletPoint)}
          pathOptions={{
            color: isFlight ? '#dbeafe' : color,
            opacity: isFlight ? 0.92 : 0.9,
            weight: isFlight ? 2.6 : 4,
            dashArray: isFlight ? '8 10' : null,
          }}
          eventHandlers={{ click: () => onRouteSelect?.(item.trip) }}
        />
      )}
      {isFlight && item.points.length >= 2 && <PlaneMarker points={item.points} color={color} />}
      {item.origin && <NumberMarker point={item.origin} label="A" color="#22c55e" tooltip="Başlangıç" />}
      {item.waypoints.map((point, index) => <NumberMarker key={`${item.id}-${index}`} point={point} label={String(index + 1)} color="#3b82f6" tooltip={point.name || `Ara durak ${index + 1}`} />)}
      {item.destination && <NumberMarker point={item.destination} label="V" color="#ef4444" tooltip="Varış" />}
    </Fragment>
  );
}

function PlaneMarker({ points, color }) {
  const arc = buildFlightArc(points);
  const mid = arc[Math.floor(arc.length / 2)];
  if (!mid) return null;
  const icon = L.divIcon({
    className: 'flight-plane-marker',
    html: `<span style="color:${color}" aria-hidden="true">✈</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
  return <Marker position={toLeafletPoint(mid)} icon={icon} interactive={false} />;
}

function NumberMarker({ point, label, color, tooltip }) {
  const position = toLeafletPoint(point);
  return (
    <>
      <CircleMarker center={position} radius={13} pathOptions={{ color, fillColor: color, fillOpacity: 0.95, weight: 2 }}>
        <Tooltip permanent direction="center" opacity={1} className="number-marker-label">{label}</Tooltip>
        <Popup>{tooltip}</Popup>
      </CircleMarker>
      <Marker position={position} opacity={0}>
        <Tooltip direction="top" offset={[0, -18]} opacity={1}>{tooltip}</Tooltip>
      </Marker>
    </>
  );
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    const valid = points.map(toLeafletPoint).filter(Boolean);
    const timer = window.setTimeout(() => {
      map.invalidateSize();
      if (valid.length >= 2) map.fitBounds(valid, { padding: [28, 28], maxZoom: 9, animate: false });
      else if (valid.length === 1) map.setView(valid[0], 12);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [map, points]);
  return null;
}

function tripToRouteItem(trip) {
  if (!trip) return null;
  const origin = pointFromLocation(trip.fromLocation || trip.from);
  const destination = pointFromLocation(trip.toLocation || trip.to);
  const waypoints = (trip.waypoints || []).map(pointFromLocation).filter(Boolean);
  const points = trip.transportType === 'Uçak'
    ? [origin, ...waypoints, destination].filter(Boolean)
    : trip.route?.overviewPath?.length
      ? decodeOverviewPolyline(trip.route.overviewPath)
      : [origin, ...waypoints, destination].filter(Boolean);
  if (!points.length) return null;
  return {
    id: trip.id || trip.title || `${points[0].lat}-${points[0].lng}`,
    trip,
    origin,
    destination,
    waypoints,
    points,
    transportType: trip.transportType || 'Diğer',
  };
}

function normalizeRoutePreview(routePreview) {
  return {
    ...routePreview,
    origin: routePreview.origin || routePreview.points?.[0] || null,
    destination: routePreview.destination || routePreview.points?.at(-1) || null,
    waypoints: routePreview.waypoints || [],
    points: routePreview.points || [],
    transportType: routePreview.transportType || 'Diğer',
  };
}

function pointFromLocation(location) {
  if (!location?.lat || !location?.lng) return null;
  return { ...location, lat: Number(location.lat), lng: Number(location.lng) };
}

function toLeafletPoint(point) {
  if (!point?.lat || !point?.lng) return null;
  return [Number(point.lat), Number(point.lng)];
}

function buildFlightArc(points) {
  const valid = points.filter(Boolean);
  if (valid.length < 2) return valid;
  return valid.flatMap((point, index) => {
    const next = valid[index + 1];
    if (!next) return [point];
    const segment = [];
    for (let step = 0; step <= 24; step += 1) {
      const t = step / 24;
      const lat = Number(point.lat) + (Number(next.lat) - Number(point.lat)) * t;
      const lng = Number(point.lng) + (Number(next.lng) - Number(point.lng)) * t;
      const lift = Math.sin(Math.PI * t) * 1.15;
      segment.push({ lat: lat + lift, lng });
    }
    return index === 0 ? segment : segment.slice(1);
  });
}
