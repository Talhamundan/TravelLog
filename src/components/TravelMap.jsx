// Dashboard üzerinde tüm seyahatlerin başlangıç/varış noktalarını toplu gösterir.
import { Fragment, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import { defaultTurkeyCenter, getCityCoords, getStopCoords } from '../utils/cityCoordinates';
import { locationCity, locationCoords, routeLabel } from '../utils/location';
import { formatCurrency, formatKm } from '../utils/formatters';

const transportColors = {
  Uçak: '#38bdf8',
  Otobüs: '#a855f7',
  Araç: '#f59e0b',
  Tren: '#22c55e',
  Feribot: '#14b8a6',
  Diğer: '#ef4444',
};

const getCoord = (value) => locationCoords(value) || getCityCoords(locationCity(value) || value);

export default function TravelMap({ trips }) {
  const [animate, setAnimate] = useState(false);
  const visibleTrips = trips.filter((trip) => trip.from && trip.to);
  const firstRoute = useMemo(() => visibleTrips[0], [visibleTrips]);

  return (
    <div className="map-shell">
      <div className="map-toolbar">
        <div>
          <h2>Seyahat Haritası</h2>
          <span>Tüm seyahat rotalarını görüntüleyin</span>
        </div>
        <button className="secondary-button" onClick={() => setAnimate((value) => !value)}>
          {animate ? 'Animasyonu Durdur' : 'Animasyonu Başlat'}
        </button>
      </div>
      <MapContainer center={defaultTurkeyCenter} zoom={5} className="trip-map dashboard-map" scrollWheelZoom={false}>
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {visibleTrips.map((trip) => {
          const from = trip.fromCoords || getCoord(trip.from);
          const to = trip.toCoords || getCoord(trip.to);
          const stops = getStopCoords(trip.stops);
          const route = [from, ...stops.map((stop) => stop.coords), to];
          const color = transportColors[trip.transportType] || transportColors.Diğer;
          return (
            <Fragment key={trip.id || `${routeLabel(trip)}-${trip.date}`}>
              <Marker position={from}>
                <Popup>
                  <strong>{routeLabel(trip)}</strong>
                  <br />
                  {trip.transportType} · {formatKm(trip.distanceKm)} · {formatCurrency(trip.totalCost, trip.currency)}
                </Popup>
              </Marker>
              {stops.map((stop) => (
                <Marker key={`${trip.id}-${stop.name}`} position={stop.coords}>
                  <Popup>{stop.name}</Popup>
                </Marker>
              ))}
              <Marker position={to}>
                <Popup>{routeLabel(trip)}</Popup>
              </Marker>
              <Polyline positions={route} color={color} weight={4} opacity={0.72} className="glow-route" />
            </Fragment>
          );
        })}
      </MapContainer>
      {animate && firstRoute && <span className={`route-orb ${firstRoute.transportType || 'Diğer'}`} />}
      <div className="map-legend">
        {Object.entries(transportColors).map(([label, color]) => (
          <span key={label}><i style={{ background: color }} />{label}</span>
        ))}
      </div>
    </div>
  );
}
