import { Fragment, useEffect, useMemo, useRef } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { defaultTurkeyCenter } from '../../utils/cityCoordinates';
import { resolveLocationCoords } from '../../utils/location';
import { decodeOverviewPolyline, getRouteColor } from '../../services/osmRouteService';
import { formatCurrency, formatDate, formatKm, minutesToDuration } from '../../utils/formatters';
import { tripProviderLabel } from '../../utils/tripDisplay';
import { getLocationLabel, getTripPopupTitle } from '../../utils/routeDisplay';
import { normalizeTransportType } from '../../constants/transport';

const tiles = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  minimal: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
};

export default function LeafletRouteMap({ trips = [], trip, routePreview, theme = 'dark', className = '', onRouteSelect, onRouteFocus, selectedTripId = '', animate = false }) {
  const routeItems = routePreview ? [normalizeRoutePreview(routePreview)] : trip ? [tripToRouteItem(trip)] : trips.map(tripToRouteItem).filter(Boolean);
  const allPoints = routeItems.flatMap((item) => item.points || []);
  if (!routeItems.length) {
    return (
      <div className={`travel-map-empty ${className}`}>
        <strong>Harita önizlemesi hazır değil</strong>
        <span>OpenStreetMap rotası için başlangıç ve varış seçin.</span>
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
      className={`trip-map osm-route-map leaflet-route-map map-theme-${theme} ${className}`}
      scrollWheelZoom
    >
      <TileLayer attribution="&copy; OpenStreetMap &copy; CARTO" url={tiles[theme] || tiles.dark} />
      <FitBounds points={allPoints} />
      {routeItems.map((item) => (
        <RouteLayer key={item.id} item={item} onRouteSelect={onRouteSelect} onRouteFocus={onRouteFocus} selectedTripId={selectedTripId} animate={animate} />
      ))}
    </MapContainer>
  );
}

function RouteLayer({ item, onRouteSelect, onRouteFocus, selectedTripId, animate }) {
  const color = getRouteColor(item.transportType);
  const transportType = normalizeTransportType(item.transportType);
  const isFlight = transportType === 'Uçak';
  const displayPoints = isFlight ? buildFlightArc(item.points) : item.points;
  const isSelected = selectedTripId && item.trip?.id === selectedTripId;
  const hasSelection = Boolean(selectedTripId);
  const frequency = Number(item.frequency || item.trip?.__routeFrequency || 1);
  const intensity = Math.min(frequency, 8);
  const weight = (isFlight ? 3 : item.isFallback ? 2.4 : 3.2) + intensity * 0.28 + (isSelected ? 1.6 : 0);
  const opacity = isSelected ? 1 : hasSelection ? 0.28 : Math.min(0.55 + frequency * 0.08, 0.94);
  return (
    <Fragment>
      {item.points.length >= 2 && (
        <Polyline
          positions={displayPoints.map(toLeafletPoint)}
          pathOptions={{
            color: isFlight ? '#38bdf8' : color,
            opacity,
            weight,
            dashArray: isFlight ? '8 10' : item.isFallback ? '7 9' : null,
            className: isSelected ? 'selected-route-line' : 'frequency-route-line',
          }}
          eventHandlers={{
            click: () => onRouteFocus?.(item.trip),
          }}
        >
          <Tooltip sticky opacity={1} className="route-hover-tooltip">Bu rota {frequency} kez kullanıldı</Tooltip>
          <Popup>
            <RoutePopup item={{ ...item, frequency }} onRouteSelect={onRouteSelect} />
          </Popup>
        </Polyline>
      )}
      {isFlight && item.points.length >= 2 && <PlaneMarker points={item.points} color={color} />}
      {animate && item.points.length >= 2 && <AnimatedRouteIcon points={displayPoints} color={color} transportType={transportType} />}
      {item.origin && <PointMarker point={item.origin} role="Başlangıç" color="#16a34a" />}
      {item.waypoints.map((point, index) => <PointMarker key={`${item.id}-${index}`} point={point} role={`Ara durak ${index + 1}`} color="#a855f7" />)}
      {item.destination && <PointMarker point={item.destination} role="Varış" color="#dc2626" />}
      {item.isFallback && item.points.length >= 2 && (
        <Marker position={toLeafletPoint(item.points[Math.floor(item.points.length / 2)])} opacity={0}>
          <Tooltip permanent direction="top" offset={[0, -10]} opacity={1} className="route-estimate-badge">Tahmini çizgi</Tooltip>
        </Marker>
      )}
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
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
  return <Marker position={toLeafletPoint(mid)} icon={icon} interactive={false} />;
}

function AnimatedRouteIcon({ points, color, transportType }) {
  const markerRef = useRef(null);
  const path = useMemo(() => points.map(toLeafletPoint).filter(Boolean), [points]);
  useEffect(() => {
    let frame = 0;
    let start = 0;
    const duration = 6000;
    const tick = (time) => {
      if (!start) start = time;
      const progress = ((time - start) % duration) / duration;
      const position = interpolatePath(path, progress);
      if (position && markerRef.current) markerRef.current.setLatLng(position);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [path]);
  if (path.length < 2) return null;
  const icon = L.divIcon({
    className: 'route-motion-marker',
    html: `<span style="color:${color}">${transportIcon(transportType)}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
  return <Marker ref={markerRef} position={path[0]} icon={icon} interactive={false} />;
}

function PointMarker({ point, role, color }) {
  const position = toLeafletPoint(point);
  const title = getLocationLabel(point) || role;
  return (
    <CircleMarker center={position} radius={7} pathOptions={{ color: '#ffffff', fillColor: color, fillOpacity: 0.94, weight: 2 }} className="clean-map-marker">
      <Tooltip direction="top" offset={[0, -10]} opacity={1}>{title}</Tooltip>
      <Popup>
        <div className="location-popup-card">
          <strong>{title}</strong>
          <span>{role}</span>
        </div>
      </Popup>
    </CircleMarker>
  );
}

function RoutePopup({ item, onRouteSelect }) {
  const trip = item.trip || {};
  return (
    <div className="route-popup-card">
      <strong>{getTripPopupTitle(trip) || 'Rota'}</strong>
      {item.isFallback && <em>Tahmini çizgi</em>}
      <span>Tarih: {trip.date ? formatDate(trip.date) : '-'}</span>
      <span>Ulaşım: {trip.transportType || '-'}</span>
      <span>Firma/plaka: {tripProviderLabel(trip)}</span>
      <span>Km: {formatKm(trip.distanceKm)}</span>
      <span>Süre: {minutesToDuration(trip.durationMinutes)}</span>
      <span>Masraf: {formatCurrency(trip.totalCost, trip.currency)}</span>
      <span>Kullanım: {item.frequency || 1} kez</span>
      {onRouteSelect && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRouteSelect(trip);
          }}
        >
          Detaya git
        </button>
      )}
    </div>
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
  const origin = pointFromLocation(trip.fromLocation || trip.from) || pointFromCoords(resolveLocationCoords(trip.fromLocation || trip.from, trip.fromCoords), trip.fromText || trip.from);
  const destination = pointFromLocation(trip.toLocation || trip.to) || pointFromCoords(resolveLocationCoords(trip.toLocation || trip.to, trip.toCoords), trip.toText || trip.to);
  const waypoints = (trip.waypoints || []).map(pointFromLocation).filter(Boolean);
  const transportType = normalizeTransportType(trip.transportType);
  const points = transportType === 'Uçak'
    ? [origin, ...waypoints, destination].filter(Boolean)
    : trip.route?.overviewPath?.length || trip.route?.overviewPolyline
      ? decodeOverviewPolyline(trip.route.overviewPath?.length ? trip.route.overviewPath : trip.route.overviewPolyline)
      : [origin, ...waypoints, destination].filter(Boolean);
  if (!points.length) return null;
  return {
    id: trip.id || trip.title || `${points[0].lat}-${points[0].lng}`,
    trip,
    origin,
    destination,
    waypoints,
    points,
    transportType,
    frequency: trip.__routeFrequency || 1,
    isFallback: Boolean(trip.__routeFallback),
  };
}

function normalizeRoutePreview(routePreview) {
  return {
    ...routePreview,
    origin: routePreview.origin || routePreview.points?.[0] || null,
    destination: routePreview.destination || routePreview.points?.at(-1) || null,
    waypoints: routePreview.waypoints || [],
    points: routePreview.points || [],
    transportType: normalizeTransportType(routePreview.transportType),
  };
}

function pointFromLocation(location) {
  if (!location?.lat || !location?.lng) return null;
  return { ...location, lat: Number(location.lat), lng: Number(location.lng) };
}

function pointFromCoords(coords, label = '') {
  if (!Array.isArray(coords) || coords.length !== 2) return null;
  const lat = Number(coords[0]);
  const lng = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, name: typeof label === 'string' ? label : getLocationLabel(label) };
}

function toLeafletPoint(point) {
  if (!point?.lat || !point?.lng) return null;
  return [Number(point.lat), Number(point.lng)];
}

function interpolatePath(path, progress) {
  if (path.length < 2) return path[0] || null;
  const scaled = progress * (path.length - 1);
  const index = Math.min(Math.floor(scaled), path.length - 2);
  const t = scaled - index;
  const from = path[index];
  const to = path[index + 1];
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
}

function transportIcon(type) {
  if (type === 'Uçak') return '✈';
  if (type === 'Otobüs') return '▣';
  if (type === 'Tren') return '▤';
  return '●';
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
