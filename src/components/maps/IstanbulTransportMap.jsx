import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { useEffect, useMemo } from 'react';
import { Bus, MapPinned, TrainFront, Waves } from 'lucide-react';
import { decodeOverviewPolyline } from '../../services/osmRouteService';
import { getMapTheme } from '../../maps/mapThemes';

const istanbulCenter = [41.0082, 28.9784];
const istanbulBounds = [
  [40.78, 28.0],
  [41.33, 29.95],
];

const vehicleColors = {
  Metro: '#38bdf8',
  Metrobüs: '#22c55e',
  Otobüs: '#f59e0b',
  Vapur: '#14b8a6',
  Marmaray: '#a855f7',
  Tramvay: '#f97316',
  Füniküler: '#eab308',
  Yürüyüş: '#94a3b8',
};

export default function IstanbulTransportMap({ selectedRoute, origin, destination }) {
  const theme = getMapTheme('dark');
  const routePoints = useMemo(() => decodeOverviewPolyline(selectedRoute?.polyline || ''), [selectedRoute?.polyline]);
  const stepRoutes = useMemo(() => buildStepRoutes(selectedRoute), [selectedRoute]);
  const markers = [
    origin?.lat && { id: 'origin', label: 'Başlangıç', place: origin, color: '#22c55e' },
    destination?.lat && { id: 'destination', label: 'Varış', place: destination, color: '#ef4444' },
  ].filter(Boolean);
  const mapKey = `${selectedRoute?.id || 'empty'}-${origin?.lat || ''}-${destination?.lat || ''}-${routePoints.length}`;

  return (
    <section className="panel pro-panel istanbul-map-panel">
      <div className="planner-panel-head">
        <div>
          <h2>Rota Haritası</h2>
          <span>{selectedRoute ? 'Seçili toplu taşıma rotası ve hat kırılımları' : 'Adres seçildiğinde rota haritada gösterilir'}</span>
        </div>
        <span className="istanbul-map-chip">
          <MapPinned size={14} />
          Gerçek harita
        </span>
      </div>
      <div className="istanbul-real-map-wrap">
        <MapContainer
          center={istanbulCenter}
          zoom={10.5}
          minZoom={9}
          maxBounds={istanbulBounds}
          maxBoundsViscosity={0.25}
          zoomSnap={0.25}
          zoomDelta={0.5}
          className="trip-map istanbul-real-map map-theme-dark"
          scrollWheelZoom
        >
          <TileLayer attribution={theme.attribution} url={theme.tileUrl} />
          <IstanbulMapFitter routePoints={routePoints} markers={markers} fitKey={mapKey} />
          {routePoints.length >= 2 && (
            <Polyline
              positions={routePoints.map(toLeafletPoint)}
              pathOptions={{ color: '#38bdf8', opacity: 0.56, weight: 6, className: 'selected-route-line' }}
            />
          )}
          {stepRoutes.map((stepRoute) => (
            <Polyline
              key={stepRoute.id}
              positions={stepRoute.points.map(toLeafletPoint)}
              pathOptions={{ color: getVehicleColor(stepRoute.vehicle), opacity: 0.9, weight: stepRoute.vehicle === 'Yürüyüş' ? 3 : 5, dashArray: stepRoute.vehicle === 'Yürüyüş' ? '4 7' : null }}
            >
              <Tooltip sticky opacity={1} className="route-hover-tooltip">{stepRoute.label}</Tooltip>
            </Polyline>
          ))}
          {markers.map((marker) => (
            <CircleMarker key={marker.id} center={[marker.place.lat, marker.place.lng]} radius={8} pathOptions={{ color: '#ffffff', fillColor: marker.color, fillOpacity: 0.95, weight: 2 }}>
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>{marker.label}</Tooltip>
              <Popup>
                <div className="location-popup-card">
                  <strong>{marker.label}</strong>
                  <span>{marker.place.formattedAddress || marker.place.label}</span>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
        <div className="istanbul-map-legend">
          {buildLegend(selectedRoute).map((item) => (
            <span key={item.label} style={{ '--legend-color': item.color }}>
              {item.icon}
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function IstanbulMapFitter({ routePoints, markers, fitKey }) {
  const map = useMap();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
      const points = [
        ...routePoints.map(toLeafletPoint),
        ...markers.map((marker) => [marker.place.lat, marker.place.lng]),
      ].filter(Boolean);
      if (points.length >= 2) map.fitBounds(points, { padding: [36, 36], maxZoom: 13, animate: false });
      else if (points.length === 1) map.setView(points[0], 13, { animate: false });
      else map.fitBounds(istanbulBounds, { padding: [12, 12], animate: false });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [fitKey, map, markers, routePoints]);
  return null;
}

function buildStepRoutes(route) {
  if (!route?.routeSteps?.length) return [];
  return route.routeSteps
    .map((step, index) => {
      const polylinePoints = decodeOverviewPolyline(step.polyline || '');
      const fallbackPoints = step.startLocation && step.endLocation ? [step.startLocation, step.endLocation] : [];
      const points = polylinePoints.length >= 2 ? polylinePoints : fallbackPoints;
      if (points.length < 2) return null;
      return {
        id: `${step.line}-${index}`,
        label: `${step.line} · ${step.vehicle}`,
        vehicle: step.vehicle,
        points,
      };
    })
    .filter(Boolean);
}

function buildLegend(route) {
  const vehicles = route?.vehicles?.length ? route.vehicles : ['Metro', 'Metrobüs', 'Otobüs', 'Vapur'];
  return vehicles.map((vehicle) => ({
    label: vehicle,
    color: getVehicleColor(vehicle),
    icon: getVehicleIcon(vehicle),
  }));
}

function getVehicleIcon(vehicle) {
  if (vehicle === 'Otobüs' || vehicle === 'Metrobüs') return <Bus size={14} />;
  if (vehicle === 'Vapur') return <Waves size={14} />;
  return <TrainFront size={14} />;
}

function getVehicleColor(vehicle) {
  return vehicleColors[vehicle] || '#38bdf8';
}

function toLeafletPoint(point) {
  if (!point?.lat || !point?.lng) return null;
  return [Number(point.lat), Number(point.lng)];
}
