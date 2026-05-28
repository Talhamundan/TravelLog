// Dashboard ve Harita sayfası için Leaflet/OpenStreetMap tabanlı rota/konum haritası.
import { useEffect, useMemo, useState } from 'react';
import LeafletRouteMap from './maps/LeafletRouteMap';
import TravelMapBase from './maps/TravelMapBase';
import { getStopCoords } from '../utils/cityCoordinates';
import { locationCity, resolveLocationCoords } from '../utils/location';
import { getRoute } from '../services/osmRouteService';
import { tripProviderLabel } from '../utils/tripDisplay';
import { getTransportColor, normalizeTransportType, transportTypes } from '../constants/transport';
import { getLocationLabel, getTripRouteTitle } from '../utils/routeDisplay';
import { includesSearchTerm } from '../utils/search';

const dateFilters = ['Tüm zamanlar', 'Son 30 gün', 'Bu ay', 'Bu yıl'];

export const defaultDashboardMapFilters = {
  transport: 'Tüm rotalar',
  dateRange: 'Tüm zamanlar',
  query: '',
  realOnly: false,
  showFallback: true,
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
  dashboard = false,
  onRouteSelect,
  filters: controlledFilters,
  onFiltersChange,
  preserveMapOnEmpty = false,
  selectedTripId = '',
  onRouteFocus,
}) {
  const [routeCache, setRouteCache] = useState({});
  const [localFilters, setLocalFilters] = useState(defaultDashboardMapFilters);
  const filters = controlledFilters || localFilters;
  const setFilters = onFiltersChange || setLocalFilters;
  const transportFilterOptions = useMemo(
    () => ['Tüm rotalar', ...new Set(trips.map((trip) => normalizeTransportType(trip.transportType)).filter(Boolean))],
    [trips],
  );

  const visibleTrips = useMemo(
    () =>
      showRoutes
        ? trips.filter((trip) => {
            if (!trip.from || !trip.to) return false;
            if (!dashboard) return true;
            return matchesTravelMapFilters(trip, filters);
          })
        : [],
    [dashboard, filters, showRoutes, trips],
  );

  const routeStates = useMemo(
    () => visibleTrips.map((trip) => buildRouteState(trip, routeCache, filters)).filter(Boolean),
    [filters, routeCache, visibleTrips],
  );
  const routeFrequencies = useMemo(() => getRouteFrequencies(visibleTrips), [visibleTrips]);
  const displayTrips = useMemo(
    () =>
      routeStates
        .map((state) => state.displayTrip && { ...state.displayTrip, __routeFrequency: routeFrequencies[routeFrequencyKey(state.displayTrip)] || 1 })
        .filter(Boolean),
    [routeFrequencies, routeStates],
  );
  const loadingCount = routeStates.filter((state) => state.loading).length;

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
            color: getTransportColor(trip.transportType),
          };
        })
        .filter((item) => item.from && item.to),
    [visibleTrips],
  );

  useEffect(() => {
    if (!showRoutes) return undefined;
    let alive = true;
    const missingTrips = visibleTrips
      .map((trip) => ({ key: routeCacheKey(trip), routeRequest: routeRequestFromTrip(trip), hasRoute: hasRealRoute(trip) }))
      .filter(({ key, routeRequest, hasRoute }) => key && routeRequest && !hasRoute && !(key in routeCache))
      .slice(0, 12);

    if (!missingTrips.length) return undefined;

    missingTrips.forEach(({ key, routeRequest }) => {
      getRoute(routeRequest)
        .then((route) => {
          if (!alive) return;
          setRouteCache((current) => ({ ...current, [key]: route }));
        })
        .catch((error) => {
          console.warn('OpenStreetMap route calculation skipped', error);
          if (!alive) return;
          setRouteCache((current) => ({ ...current, [key]: null }));
        });
    });

    return () => {
      alive = false;
    };
  }, [routeCache, showRoutes, visibleTrips]);

  const routes = routeItems.map((item) => ({
    id: item.trip.id || getTripRouteTitle(item.trip),
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
        id: `${trip.id || getTripRouteTitle(trip)}-from`,
        position: from,
        tooltip: getLocationLabel(trip.fromLocation || trip.from) || locationCity(trip.from) || getTripRouteTitle(trip).split(' → ')[0],
        popup: (
          <div className="location-popup-card">
            <strong>{getLocationLabel(trip.fromLocation || trip.from) || getTripRouteTitle(trip).split(' → ')[0]}</strong>
            <span>Başlangıç</span>
          </div>
        ),
      },
      ...stops.map((stop) => ({
        id: `${trip.id || getTripRouteTitle(trip)}-${stop.name}`,
        position: stop.coords,
        tooltip: stop.name,
        popup: <div className="location-popup-card"><strong>{stop.name}</strong><span>Ara durak</span></div>,
      })),
      {
        id: `${trip.id || getTripRouteTitle(trip)}-to`,
        position: to,
        tooltip: getLocationLabel(trip.toLocation || trip.to) || locationCity(trip.to) || getTripRouteTitle(trip).split(' → ')[1],
        popup: (
          <div className="location-popup-card">
            <strong>{getLocationLabel(trip.toLocation || trip.to) || getTripRouteTitle(trip).split(' → ')[1]}</strong>
            <span>Varış</span>
          </div>
        ),
      },
    ]),
  ];

  return (
    <div className={`map-shell map-shell-${theme} ${dashboard ? 'dashboard-map-shell' : ''}`}>
      {(!dashboard || onThemeChange) && (
        <div className="map-toolbar">
          {!dashboard && (
            <div>
              <h2>{showRoutes ? 'Seyahat Haritası' : 'Konum Haritası'}</h2>
              <span>{showRoutes ? `${displayTrips.length} rota görüntüleniyor` : 'Kayıtlı konumları yönetin'}</span>
            </div>
          )}
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
      )}
      {dashboard && showRoutes && (
        <DashboardMapFilters filters={filters} setFilters={setFilters} transportOptions={transportFilterOptions} />
      )}
      {showRoutes ? (
        <div className="leaflet-route-stage">
          {displayTrips.length ? (
            <LeafletRouteMap
              trips={displayTrips}
              theme={theme}
              className="dashboard-map"
              onRouteSelect={onRouteSelect}
              onRouteFocus={onRouteFocus}
              selectedTripId={selectedTripId}
            />
          ) : preserveMapOnEmpty ? (
            <TravelMapBase routes={[]} markers={[]} theme={theme} className="dashboard-map" showEmptyMap />
          ) : (
            <div className="travel-map-empty dashboard-map">
              <strong>{loadingCount ? 'Rotalar yükleniyor...' : 'Henüz rota verisi yok'}</strong>
              <span>{loadingCount ? 'OpenStreetMap rota çizgileri hazırlanıyor.' : 'Filtreleri değiştirin veya ilk seyahatinizi ekleyin.'}</span>
            </div>
          )}
          {loadingCount > 0 && (
            <div className="map-loading-overlay">
              <span>Rotalar yükleniyor...</span>
            </div>
          )}
        </div>
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
          {transportTypes.map((label) => (
            <span key={label}><i style={{ background: getTransportColor(label) }} />{label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardMapFilters({ filters, setFilters, transportOptions }) {
  return (
    <div className="dashboard-map-controls">
      <div className="dashboard-map-filter-main">
        <div className="map-filter-group">
          {transportOptions.map((value) => (
            <button type="button" key={value} className={filters.transport === value ? 'active' : ''} onClick={() => setFilters((current) => ({ ...current, transport: value }))}>
              {value}
            </button>
          ))}
        </div>
        <div className="map-filter-group compact">
          {dateFilters.map((value) => (
            <button type="button" key={value} className={filters.dateRange === value ? 'active' : ''} onClick={() => setFilters((current) => ({ ...current, dateRange: value }))}>
              {value}
            </button>
          ))}
        </div>
        <div className="map-filter-search">
          <input
            value={filters.query}
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            placeholder="Firma, plaka veya şehir ara"
          />
        </div>
        <div className="map-filter-switches">
          <label>
            <input type="checkbox" checked={filters.realOnly} onChange={(event) => setFilters((current) => ({ ...current, realOnly: event.target.checked }))} />
            <span>Gerçek rota</span>
          </label>
          <label>
            <input type="checkbox" checked={filters.showFallback} onChange={(event) => setFilters((current) => ({ ...current, showFallback: event.target.checked }))} />
            <span>Tahmini</span>
          </label>
        </div>
      </div>
    </div>
  );
}

function buildRouteState(trip, routeCache, filters) {
  const key = routeCacheKey(trip);
  const cachedRoute = key ? routeCache[key] : undefined;
  if (hasRealRoute(trip)) return { displayTrip: { ...trip, __routeFallback: false }, loading: false };
  if (cachedRoute) return { displayTrip: { ...trip, route: cachedRoute, __routeFallback: false }, loading: false };

  const routeRequest = routeRequestFromTrip(trip);
  const loading = Boolean(routeRequest && key && !(key in routeCache));
  if (loading) return { displayTrip: null, loading: true };

  const fallbackTrip = routeRequest ? { ...trip, fromLocation: routeRequest.origin, toLocation: routeRequest.destination, waypoints: routeRequest.waypoints, __routeFallback: true } : null;
  const allowFallback = filters.showFallback && !filters.realOnly && fallbackTrip;
  return { displayTrip: allowFallback ? fallbackTrip : null, loading: false };
}

function hasRealRoute(trip = {}) {
  return Boolean(trip.route?.overviewPath?.length || trip.route?.overviewPolyline || trip.route?.provider === 'airline-estimate');
}

export function matchesTravelMapFilters(trip, filters = defaultDashboardMapFilters) {
  if (filters.transport !== 'Tüm rotalar' && normalizeTransportType(trip.transportType) !== filters.transport) return false;
  if (!matchesDateFilter(trip.date, filters.dateRange)) return false;
  const query = filters.query.trim();
  if (!query) return true;
  return includesSearchTerm([
    getTripRouteTitle(trip),
    tripProviderLabel(trip),
    trip.company,
    trip.plate,
    trip.vehiclePlate,
    trip.vehicleName,
    trip.licensePlate,
    trip.pnr,
    trip.ticketNo,
    trip.fromText,
    trip.toText,
    trip.notes,
  ], query);
}

function matchesDateFilter(dateValue, filter) {
  if (filter === 'Tüm zamanlar') return true;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  if (filter === 'Bu yıl') return date.getFullYear() === now.getFullYear();
  if (filter === 'Bu ay') return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  if (filter === 'Son 30 gün') {
    const ms = now.getTime() - date.getTime();
    return ms >= 0 && ms <= 30 * 24 * 60 * 60 * 1000;
  }
  return true;
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

function getRouteFrequencies(trips = []) {
  return trips.reduce((acc, trip) => {
    const key = routeFrequencyKey(trip);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function routeFrequencyKey(trip = {}) {
  const from = String(trip.fromText || getLocationLabel(trip.fromLocation || trip.from) || '').split(',')[0].toLocaleLowerCase('tr-TR').trim();
  const to = String(trip.toText || getLocationLabel(trip.toLocation || trip.to) || '').split(',')[0].toLocaleLowerCase('tr-TR').trim();
  return [from, to].sort().join('|') || getTripRouteTitle(trip).toLocaleLowerCase('tr-TR');
}
