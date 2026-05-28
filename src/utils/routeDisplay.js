import { locationLabel } from './location';

export function getLocationLabel(location) {
  if (!location) return '';
  if (typeof location === 'string') return location.trim();
  return (
    location.name ||
    location.label ||
    location.title ||
    location.formattedAddress ||
    location.address ||
    location.city ||
    locationLabel(location) ||
    ''
  );
}

export function getShortLocationLabel(location) {
  const label = getLocationLabel(location);
  if (!label) return '';
  return label.split(',')[0].trim();
}

export function getTripRouteTitle(trip = {}) {
  const from = trip.fromText || getShortLocationLabel(trip.fromLocation) || getShortLocationLabel(trip.from);
  const to = trip.toText || getShortLocationLabel(trip.toLocation) || getShortLocationLabel(trip.to);
  return [from || 'Başlangıç', to || 'Varış'].join(' → ');
}

export function getWaypointLabels(trip = {}) {
  const waypoints = Array.isArray(trip.waypoints) ? trip.waypoints : [];
  const waypointLabels = waypoints.map(getShortLocationLabel).filter(Boolean);
  const stopLabels = Array.isArray(trip.stops)
    ? trip.stops.map(getShortLocationLabel).filter(Boolean)
    : trip.stops
      ? String(trip.stops).split(',').map((item) => item.trim()).filter(Boolean)
      : [];
  return waypointLabels.length ? waypointLabels : stopLabels;
}

export function getTripRouteSubtitle(trip = {}) {
  const waypoints = getWaypointLabels(trip);
  if (waypoints.length) return `Ara durak: ${waypoints.join(' → ')}`;

  const title = getTripRouteTitle(trip);
  const details = [
    trip.fromLocation?.formattedAddress && getShortLocationLabel(trip.fromLocation.formattedAddress),
    trip.toLocation?.formattedAddress && getShortLocationLabel(trip.toLocation.formattedAddress),
  ].filter((item) => item && !title.includes(item));
  return details.join(' → ');
}

export function getTripPopupTitle(trip = {}) {
  return getTripRouteTitle(trip);
}
