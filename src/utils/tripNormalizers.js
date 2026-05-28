import { toNumber } from './analytics';
import { locationCoords, locationLabel, resolveLocationCoords } from './location';
import { tripProviderLabel } from './tripDisplay';
import { normalizeTransportType } from '../constants/transport';
import { getTripRouteTitle } from './routeDisplay';

const costKeys = ['ticketPrice', 'fuelCost', 'roadCost', 'bridgeCost', 'parkingCost', 'otherCost'];

export const normalizeTrip = (trip = {}) => {
  const fromLocation = trip.fromLocation || trip.from || null;
  const toLocation = trip.toLocation || trip.to || null;
  const fromLabel = trip.fromText || locationLabel(fromLocation) || trip.from || '-';
  const toLabel = trip.toText || locationLabel(toLocation) || trip.to || '-';
  const fromCoords = resolveLocationCoords(fromLocation, trip.fromCoords) || locationCoords(fromLocation);
  const toCoords = resolveLocationCoords(toLocation, trip.toCoords) || locationCoords(toLocation);
  const totalCost = toNumber(trip.totalCost) || costKeys.reduce((sum, key) => sum + toNumber(trip[key]), 0);
  const transportType = normalizeTransportType(trip.transportType);
  const distanceKm = toNumber(trip.distanceKm);
  const costPerKm = distanceKm > 0 ? totalCost / distanceKm : 0;

  return {
    ...trip,
    from: trip.from || fromLabel,
    to: trip.to || toLabel,
    fromLocation,
    toLocation,
    fromLabel,
    toLabel,
    fromCoords,
    toCoords,
    routeTitle: `${fromLabel} → ${toLabel}`,
    title: trip.title || `${fromLabel} → ${toLabel}`,
    transportType,
    company: trip.company || '',
    providerLabel: tripProviderLabel(trip),
    distanceKm,
    totalCost,
    costPerKm,
    currency: trip.currency || 'TRY',
    durationMinutes: toNumber(trip.durationMinutes),
    waypoints: getTripWaypoints(trip),
    stops: Array.isArray(trip.stops) ? trip.stops : trip.stops ? [trip.stops] : [],
  };
};

export const normalizeTrips = (trips = []) => trips.map(normalizeTrip);

export const normalizedRouteLabel = (trip) => trip?.routeTitle || getTripRouteTitle(trip);

export const getTripOrigin = (trip = {}) => trip.fromLocation || trip.from || null;

export const getTripDestination = (trip = {}) => trip.toLocation || trip.to || null;

export const getTripWaypoints = (trip = {}) => {
  trip = trip || {};
  if (Array.isArray(trip.waypoints)) return trip.waypoints.sort((a, b) => (a.order || 0) - (b.order || 0));
  if (Array.isArray(trip.stops)) return trip.stops.map((name, index) => ({ order: index, name }));
  if (trip.stops) return String(trip.stops).split(',').map((name, index) => ({ order: index, name: name.trim() })).filter((item) => item.name);
  return [];
};

export const getTripDisplayRoute = (trip = {}) => {
  const parts = [
    locationLabel(getTripOrigin(trip)),
    ...getTripWaypoints(trip).map(locationLabel),
    locationLabel(getTripDestination(trip)),
  ].filter((item) => item && item !== '-');
  return parts.length ? parts.join(' → ') : getTripRouteTitle(trip);
};

export const hasRouteGeometry = (trip = {}) => ['osrm', 'airline-estimate'].includes(trip.route?.provider) && Boolean(trip.route?.overviewPolyline || trip.route?.overviewPath?.length);
