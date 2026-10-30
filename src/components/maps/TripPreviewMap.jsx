// Yeni seyahat wizard'ında gerçek Leaflet harita ile rota önizlemesi gösterir.
import { useMemo } from 'react';
import LeafletRouteMap from './LeafletRouteMap';

export default function TripPreviewMap({ form, routeResult, routeError, children }) {
  const routePreview = useMemo(
    () => ({
      id: 'preview',
      transportType: form.transportType,
      origin: toPoint(form.fromLocation),
      destination: toPoint(form.toLocation),
      waypoints: (form.waypoints || []).map(toPoint).filter(Boolean),
      points: routeResult?.overviewPath?.length
        ? routeResult.overviewPath
        : [toPoint(form.fromLocation), ...(form.waypoints || []).map(toPoint), toPoint(form.toLocation)].filter(Boolean),
      route: routeResult,
    }),
    [form.fromLocation, form.toLocation, form.transportType, form.waypoints, routeResult],
  );

  return (
    <section className="wizard-map-card">
      <div className="wizard-map-canvas">
        <LeafletRouteMap routePreview={routePreview} theme="light" className="wizard-preview-map" />
      </div>
      <div className="wizard-map-summary">
        {children}
        {routeResult?.provider === 'airline-estimate' && <small>Uçuş mesafesi tahminidir.</small>}
        {routeError && <small>{routeError}</small>}
      </div>
    </section>
  );
}

function toPoint(location) {
  if (!location?.lat || !location?.lng) return null;
  return { lat: Number(location.lat), lng: Number(location.lng) };
}
