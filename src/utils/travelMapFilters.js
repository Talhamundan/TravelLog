import { normalizeTransportType } from '../constants/transport';
import { getTripRouteTitle } from './routeDisplay';
import { includesSearchTerm } from './search';
import { tripProviderLabel } from './tripDisplay';

export const defaultDashboardMapFilters = {
  transport: 'Tüm rotalar',
  query: '',
  realOnly: false,
  showFallback: true,
};

export function matchesTravelMapFilters(trip, filters = defaultDashboardMapFilters) {
  if (filters.transport !== 'Tüm rotalar' && normalizeTransportType(trip.transportType) !== filters.transport) return false;
  const query = String(filters.query || '').trim();
  if (!query) return true;
  return includesSearchTerm([
    getTripRouteTitle(trip),
    tripProviderLabel(trip),
    trip.company,
    trip.plate,
    trip.vehiclePlate,
    trip.vehicleName,
    trip.licensePlate,
    trip.pnr,
    trip.ticketNo,
    trip.fromText,
    trip.toText,
    trip.notes,
  ], query);
}
