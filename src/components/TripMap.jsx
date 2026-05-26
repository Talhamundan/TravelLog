// Şehir bazlı koordinatlarla başlangıç ve varış noktalarını ortak harita tabanında gösterir.
import { getCityCoords, getStopCoords } from '../utils/cityCoordinates';
import { resolveLocationCoords, routeLabel } from '../utils/location';
import TravelMapBase from './maps/TravelMapBase';
import LeafletRouteMap from './maps/LeafletRouteMap';
import { hasGoogleRoute } from '../utils/tripNormalizers';

export default function TripMap({ trip, theme = 'light' }) {
  if (hasGoogleRoute(trip) || trip.fromLocation?.lat || trip.toLocation?.lat) {
    return <LeafletRouteMap trip={trip} theme={theme} className="detail-preview-map" />;
  }
  const from = resolveLocationCoords(trip.fromLocation || trip.from, trip.fromCoords) || getCityCoords('');
  const to = resolveLocationCoords(trip.toLocation || trip.to, trip.toCoords) || getCityCoords('');
  const stops = getStopCoords(trip.stops);
  const center = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
  const route = [from, ...stops.map((stop) => stop.coords), to];

  return (
    <TravelMapBase
      center={center}
      zoom={6}
      theme={theme}
      scrollWheelZoom={false}
      className="detail-preview-map"
      routes={[{ id: trip.id || routeLabel(trip), points: route, color: theme === 'dark' ? '#38bdf8' : '#2563eb' }]}
      markers={[
        { id: 'from', position: from, tooltip: routeLabel(trip).split(' → ')[0], popup: <strong>{routeLabel(trip) || 'Başlangıç'}</strong> },
        ...stops.map((stop) => ({ id: stop.name, position: stop.coords, tooltip: stop.name, popup: stop.name })),
        { id: 'to', position: to, tooltip: routeLabel(trip).split(' → ')[1], popup: <strong>{routeLabel(trip) || 'Varış'}</strong> },
      ]}
      fitKey={`${trip.id || routeLabel(trip)}-${theme}`}
    />
  );
}
