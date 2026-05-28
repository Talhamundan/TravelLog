// Seyahat listelerinde firma/araç bilgisini ulaşım türüne göre okunur hale getirir.
import { formatPlate } from './plateFormatter';
import { normalizeTransportType } from '../constants/transport';

export const tripProviderLabel = (trip) => {
  if (!trip) return '-';
  if (normalizeTransportType(trip.transportType) === 'Araç') {
    return formatPlate(trip.vehiclePlate || trip.plate || '') || trip.vehicleName || 'Araç';
  }
  return trip.company || 'Belirtilmedi';
};
