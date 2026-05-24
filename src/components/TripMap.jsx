// Şehir bazlı koordinatlarla başlangıç ve varış noktalarını Leaflet haritasında gösterir.
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import { getCityCoords, getStopCoords } from '../utils/cityCoordinates';
import { locationCity, locationCoords, routeLabel } from '../utils/location';

export default function TripMap({ trip }) {
  const from = trip.fromCoords || locationCoords(trip.from) || getCityCoords(locationCity(trip.from) || trip.from);
  const to = trip.toCoords || locationCoords(trip.to) || getCityCoords(locationCity(trip.to) || trip.to);
  const stops = getStopCoords(trip.stops);
  const center = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
  const route = [from, ...stops.map((stop) => stop.coords), to];

  return (
    <MapContainer center={center} zoom={6} className="trip-map" scrollWheelZoom={false}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={from}>
        <Popup>{routeLabel(trip) || 'Başlangıç'}</Popup>
      </Marker>
      {stops.map((stop) => (
        <Marker key={stop.name} position={stop.coords}>
          <Popup>{stop.name}</Popup>
        </Marker>
      ))}
      <Marker position={to}>
        <Popup>{routeLabel(trip) || 'Varış'}</Popup>
      </Marker>
      <Polyline positions={route} color="#2563eb" />
    </MapContainer>
  );
}
