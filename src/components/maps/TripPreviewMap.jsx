// Yeni seyahat wizard'ında gerçek Leaflet harita ile rota önizlemesi gösterir.
import { useMemo } from 'react';
import LeafletRouteMap from './LeafletRouteMap';
import { formatCurrency, formatKm, minutesToDuration } from '../../utils/formatters';

export default function TripPreviewMap({ form, distanceKm, durationMinutes, totalCost, routeResult, routeError }) {
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
      <aside className="wizard-map-info">
        <span>Tahmini mesafe</span>
        <strong>{formatKm(distanceKm)}</strong>
        <span>Tahmini süre</span>
        <strong>{minutesToDuration(durationMinutes)}</strong>
        <span>Ulaşım türü</span>
        <strong>{form.transportType || '-'}</strong>
        <span>Tahmini masraf</span>
        <strong>{formatCurrency(totalCost, form.currency)}</strong>
        {routeResult?.provider === 'airline-estimate' && <small>Uçuş mesafesi tahminidir.</small>}
        {routeError && <small>{routeError}</small>}
      </aside>
    </section>
  );
}

function toPoint(location) {
  if (!location?.lat || !location?.lng) return null;
  return { lat: Number(location.lat), lng: Number(location.lng) };
}
