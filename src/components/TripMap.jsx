// Şehir bazlı koordinatlarla başlangıç ve varış noktalarını ortak harita tabanında gösterir.
import { getCityCoords, getStopCoords } from '../utils/cityCoordinates';
import { resolveLocationCoords } from '../utils/location';
import TravelMapBase from './maps/TravelMapBase';
import LeafletRouteMap from './maps/LeafletRouteMap';
import { hasRouteGeometry } from '../utils/tripNormalizers';
import { getTransportColor } from '../constants/transport';
import { getLocationLabel, getTripRouteTitle } from '../utils/routeDisplay';

export default function TripMap({ trip, theme = 'light' }) {
  if (hasRouteGeometry(trip) || trip.fromLocation?.lat || trip.toLocation?.lat) {
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
      routes={[{ id: trip.id || getTripRouteTitle(trip), points: route, color: getTransportColor(trip.transportType) }]}
      markers={[
        {
          id: 'from',
          position: from,
          tooltip: getLocationLabel(trip.fromLocation || trip.from) || getTripRouteTitle(trip).split(' → ')[0],
          popup: <div className="location-popup-card"><strong>{getLocationLabel(trip.fromLocation || trip.from) || getTripRouteTitle(trip).split(' → ')[0]}</strong><span>Başlangıç</span></div>,
        },
        ...stops.map((stop, index) => ({
          id: stop.name,
          position: stop.coords,
          tooltip: stop.name,
          popup: <div className="location-popup-card"><strong>{stop.name}</strong><span>Ara durak {index + 1}</span></div>,
        })),
        {
          id: 'to',
          position: to,
          tooltip: getLocationLabel(trip.toLocation || trip.to) || getTripRouteTitle(trip).split(' → ')[1],
          popup: <div className="location-popup-card"><strong>{getLocationLabel(trip.toLocation || trip.to) || getTripRouteTitle(trip).split(' → ')[1]}</strong><span>Varış</span></div>,
        },
      ]}
      fitKey={`${trip.id || getTripRouteTitle(trip)}-${theme}`}
    />
  );
}
