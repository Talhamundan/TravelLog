// Dashboard ve Harita sayfası için ortak TravelMapBase üzerine kurulu rota/konum haritası.
import { useMemo } from 'react';
import LeafletRouteMap from './maps/LeafletRouteMap';
import TravelMapBase from './maps/TravelMapBase';
import { getStopCoords } from '../utils/cityCoordinates';
import { locationCity, resolveLocationCoords, routeLabel } from '../utils/location';
import { formatCurrency, formatKm } from '../utils/formatters';

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
  const routedTrips = useMemo(() => trips.filter((trip) => trip.route?.overviewPath?.length || trip.fromLocation?.lat), [trips]);
  const visibleTrips = useMemo(() => (showRoutes ? trips.filter((trip) => trip.from && trip.to) : []), [showRoutes, trips]);
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
