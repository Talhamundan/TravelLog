// Seyahat listelerinde firma/araç bilgisini ulaşım türüne göre okunur hale getirir.
import { formatPlate } from './plateFormatter';

export const tripProviderLabel = (trip) => {
  if (!trip) return '-';
  if (trip.transportType === 'Araç') {
    return formatPlate(trip.vehiclePlate || trip.plate || '') || trip.vehicleName || 'Araç';
  }
  return trip.company || 'Belirtilmedi';
};
