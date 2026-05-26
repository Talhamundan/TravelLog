// Dashboard ve Harita sayfası için ortak TravelMapBase üzerine kurulu rota/konum haritası.
import { useEffect, useMemo, useState } from 'react';
import LeafletRouteMap from './maps/LeafletRouteMap';
import TravelMapBase from './maps/TravelMapBase';
import { getStopCoords } from '../utils/cityCoordinates';
import { locationCity, resolveLocationCoords, routeLabel } from '../utils/location';
import { formatCurrency, formatKm } from '../utils/formatters';
import { getRoute } from '../services/osmRouteService';

const transportColors = {
  Uçak: '#38bdf8',
  Otobüs: '#a855f7',
  Araç: '#f59e0b',
  Tren: '#22c55e',
  Feribot: '#14b8a6',
  Diğer: '#ef4444',
};

export default function TravelMap({
  trips,
  savedLocations = [],
  selectedLocation = null,
  onLocationPick,
  onSavedLocationSelect,
  showRoutes = true,
  theme = 'dark',
  onThemeChange,
}) {
  const [routeCache, setRouteCache] = useState({});
  const visibleTrips = useMemo(() => (showRoutes ? trips.filter((trip) => trip.from && trip.to) : []), [showRoutes, trips]);
  const routedTrips = useMemo(
    () => visibleTrips.map((trip) => withCachedRoute(trip, routeCache)).filter(hasRouteMapData),
    [routeCache, visibleTrips],
  );
  const routeItems = useMemo(
    () =>
      visibleTrips
        .map((trip) => {
          const from = resolveLocationCoords(trip.fromLocation || trip.from, trip.fromCoords);
          const to = resolveLocationCoords(trip.toLocation || trip.to, trip.toCoords);
          const stops = getStopCoords(trip.stops);
          const points = [from, ...stops.map((stop) => stop.coords), to].filter(Boolean);
          return {
            trip,
            from,
            to,
            stops,
            points,
            color: transportColors[trip.transportType] || transportColors.Diğer,
          };
        })
        .filter((item) => item.from && item.to),
    [visibleTrips],
  );

  useEffect(() => {
    if (!showRoutes) return undefined;
    let alive = true;
    const missingTrips = visibleTrips
      .map((trip) => ({ trip, key: routeCacheKey(trip), routeRequest: routeRequestFromTrip(trip) }))
      .filter(({ trip, key, routeRequest }) => key && routeRequest && !trip.route?.overviewPath?.length && !trip.route?.overviewPolyline && !(key in routeCache))
      .slice(0, 12);

    if (!missingTrips.length) return undefined;

    missingTrips.forEach(({ key, routeRequest }) => {
      getRoute(routeRequest)
        .then((route) => {
          if (!alive) return;
          setRouteCache((current) => ({ ...current, [key]: route }));
        })
        .catch((error) => {
          console.warn('Dashboard route calculation skipped', error);
          if (!alive) return;
          setRouteCache((current) => ({ ...current, [key]: null }));
        });
    });

    return () => {
      alive = false;
    };
  }, [routeCache, showRoutes, visibleTrips]);

  const routes = routeItems.map((item) => ({
    id: item.trip.id || routeLabel(item.trip),
    points: item.points,
    color: item.color,
  }));

  const markers = [
    ...savedLocations
      .filter((location) => Number.isFinite(Number(location.lat)) && Number.isFinite(Number(location.lng)))
      .map((location) => ({
        id: `saved-${location.id || location.name}`,
        position: [Number(location.lat), Number(location.lng)],
        tooltip: location.name,
        popup: (
          <>
            <strong>{location.name}</strong>
            <br />
            {location.type || 'Kayıtlı konum'}
          </>
        ),
        onClick: () => onSavedLocationSelect?.(location),
      })),
    ...(selectedLocation?.lat && selectedLocation?.lng
      ? [
          {
            id: 'selected-location',
            position: [Number(selectedLocation.lat), Number(selectedLocation.lng)],
            tooltip: selectedLocation.name || 'Seçili konum',
            popup: (
              <>
                <strong>{selectedLocation.name || 'Seçili konum'}</strong>
                <br />
                {selectedLocation.type || 'Konum'}
              </>
            ),
          },
        ]
      : []),
    ...routeItems.flatMap(({ trip, from, to, stops }) => [
      {
        id: `${trip.id || routeLabel(trip)}-from`,
        position: from,
        tooltip: locationCity(trip.from) || routeLabel(trip).split(' → ')[0],
        popup: (
          <>
            <strong>{routeLabel(trip)}</strong>
            <br />
            {trip.transportType} · {formatKm(trip.distanceKm)} · {formatCurrency(trip.totalCost, trip.currency)}
          </>
        ),
      },
      ...stops.map((stop) => ({
        id: `${trip.id || routeLabel(trip)}-${stop.name}`,
        position: stop.coords,
        tooltip: stop.name,
        popup: stop.name,
      })),
      {
        id: `${trip.id || routeLabel(trip)}-to`,
        position: to,
        tooltip: locationCity(trip.to) || routeLabel(trip).split(' → ')[1],
        popup: routeLabel(trip),
      },
    ]),
  ];

  return (
    <div className={`map-shell map-shell-${theme}`}>
      <div className="map-toolbar">
        <div>
          <h2>{showRoutes ? 'Seyahat Haritası' : 'Konum Haritası'}</h2>
          <span>{showRoutes ? 'Tüm seyahat rotalarını görüntüleyin' : 'Kayıtlı konumları yönetin'}</span>
        </div>
        <div className="map-toolbar-actions">
          {onThemeChange && (
            <div className="map-theme-toggle" aria-label="Harita teması">
              {[
                ['dark', 'Dark'],
                ['light', 'Light'],
                ['minimal', 'Minimal'],
              ].map(([value, label]) => (
                <button type="button" key={value} className={theme === value ? 'active' : ''} onClick={() => onThemeChange(value)}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {routedTrips.length && showRoutes ? (
        <LeafletRouteMap trips={routedTrips} theme={theme} className="dashboard-map" />
      ) : (
        <TravelMapBase
          routes={routes}
          markers={markers}
          theme={theme}
          className="dashboard-map"
          onMapClick={onLocationPick}
          fitKey={`${theme}-${routes.map((route) => route.id).join('|')}-${markers.map((marker) => marker.id).join('|')}`}
        />
      )}
      {showRoutes && (
        <div className="map-legend">
          {Object.entries(transportColors).map(([label, color]) => (
            <span key={label}><i style={{ background: color }} />{label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function hasRouteMapData(trip = {}) {
  return Boolean(
    trip.route?.overviewPath?.length ||
    trip.route?.overviewPolyline ||
    (trip.fromLocation?.lat && trip.toLocation?.lat) ||
    (trip.fromCoords && trip.toCoords),
  );
}

function withCachedRoute(trip, routeCache) {
  const key = routeCacheKey(trip);
  const cachedRoute = key ? routeCache[key] : null;
  if (!cachedRoute || trip.route?.overviewPath?.length || trip.route?.overviewPolyline) return trip;
  return { ...trip, route: cachedRoute };
}

function routeCacheKey(trip = {}) {
  const request = routeRequestFromTrip(trip);
  if (!request) return '';
  return [
    trip.transportType || 'Diğer',
    pointKey(request.origin),
    ...request.waypoints.map(pointKey),
    pointKey(request.destination),
  ].join('|');
}

function routeRequestFromTrip(trip = {}) {
  const origin = pointFromLocation(trip.fromLocation) || pointFromCoords(resolveLocationCoords(trip.fromLocation || trip.from, trip.fromCoords));
  const destination = pointFromLocation(trip.toLocation) || pointFromCoords(resolveLocationCoords(trip.toLocation || trip.to, trip.toCoords));
  if (!origin || !destination) return null;
  const waypoints = (trip.waypoints || []).map(pointFromLocation).filter(Boolean);
  return {
    origin,
    destination,
    waypoints,
    transportType: trip.transportType || 'Araç',
  };
}

function pointFromLocation(location) {
  if (!location?.lat || !location?.lng) return null;
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { ...location, lat, lng };
}

function pointFromCoords(coords) {
  if (!Array.isArray(coords) || coords.length !== 2) return null;
  const lat = Number(coords[0]);
  const lng = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function pointKey(point) {
  return `${Number(point.lat).toFixed(5)},${Number(point.lng).toFixed(5)}`;
}
