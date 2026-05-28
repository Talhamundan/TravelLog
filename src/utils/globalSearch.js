import { normalizeTransportType } from '../constants/transport';
import { formatDate, formatKm } from './formatters';
import { getTripRouteTitle } from './routeDisplay';
import { tripProviderLabel } from './tripDisplay';
import { includesSearchTerm } from './search';

const limitGroup = (items, limit = 5) => items.slice(0, limit);

export function buildGlobalSearchResults({ query, trips = [], vehicles = [], companies = [], locations = [] }) {
  const term = String(query || '').trim();
  if (!term) return [];

  const tripResults = limitGroup(
    trips
      .filter((trip) =>
        includesSearchTerm(
          [
            getTripRouteTitle(trip),
            trip.title,
            trip.from,
            trip.to,
            trip.fromText,
            trip.toText,
            tripProviderLabel(trip),
            trip.company,
            trip.plate,
            trip.vehiclePlate,
            trip.vehicleName,
            trip.licensePlate,
            trip.notes,
            trip.pnr,
            trip.ticketNo,
            trip.flightNo,
            trip.gateNo,
            trip.terminal,
            normalizeTransportType(trip.transportType),
          ],
          term,
        ),
      )
      .map((trip) => ({
        id: `trip-${trip.id}`,
        category: 'Seyahatler',
        title: getTripRouteTitle(trip),
        subtitle: [formatDate(trip.date), normalizeTransportType(trip.transportType), tripProviderLabel(trip), formatKm(trip.distanceKm)]
          .filter(Boolean)
          .join(' · '),
        page: 'trips',
        item: trip,
      })),
  );

  const vehicleResults = limitGroup(
    vehicles
      .filter((vehicle) => includesSearchTerm([vehicle.plate, vehicle.name, vehicle.brand, vehicle.model, vehicle.fuelType], term))
      .map((vehicle) => ({
        id: `vehicle-${vehicle.id || vehicle.plate}`,
        category: 'Araçlar',
        title: [vehicle.plate, vehicle.name].filter(Boolean).join(' · ') || 'Araç',
        subtitle: [vehicle.brand, vehicle.model, vehicle.fuelType].filter(Boolean).join(' · '),
        page: 'vehicles',
        item: vehicle,
      })),
  );

  const companyResults = limitGroup(
    companies
      .filter((company) => includesSearchTerm([company.name, company.category, company.website, company.notes], term))
      .map((company) => ({
        id: `company-${company.id || company.name}`,
        category: 'Firmalar',
        title: company.name || 'Firma',
        subtitle: company.category || company.website || '',
        page: 'companies',
        item: company,
      })),
  );

  const locationResults = limitGroup(
    locations
      .filter((location) => includesSearchTerm([location.name, location.type, location.city, location.district, location.address, location.notes], term))
      .map((location) => ({
        id: `location-${location.id || location.name}`,
        category: 'Konumlar',
        title: location.name || 'Konum',
        subtitle: [location.type, location.city, location.district].filter(Boolean).join(' · '),
        page: 'map',
        item: location,
      })),
  );

  return [
    { category: 'Seyahatler', items: tripResults },
    { category: 'Araçlar', items: vehicleResults },
    { category: 'Firmalar', items: companyResults },
    { category: 'Konumlar', items: locationResults },
  ].filter((group) => group.items.length);
}
