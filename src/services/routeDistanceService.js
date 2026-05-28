// OpenStreetMap/Nominatim ve OSRM kullanan rota servis yüzeyi.
import { getCityCoords } from '../utils/cityCoordinates';
import { estimateDurationByTransport, estimateTravelDistance, haversineDistanceKm } from '../utils/distance';
import { locationCity, locationCoords } from '../utils/location';
import { normalizeTransportType } from '../constants/transport';

export const estimateDistanceKm = async (from, to) => {
  const fromCoords = locationCoords(from) || getCityCoords(locationCity(from) || from);
  const toCoords = locationCoords(to) || getCityCoords(locationCity(to) || to);
  return haversineDistanceKm(fromCoords, toCoords);
};

export const geocodeLocationText = async (text) => {
  const query = String(text || '').trim();
  if (!query) return null;
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'tr');
    url.searchParams.set('q', query);
    const response = await fetch(url);
    const data = await response.json();
    const result = data?.[0];
    if (result) {
      return {
        name: result.display_name?.split(',').slice(0, 3).join(', ') || query,
        city: result.display_name?.split(',').at(-4)?.trim() || '',
        district: '',
        type: guessPointType(query),
        lat: Number(result.lat),
        lng: Number(result.lon),
        provider: 'nominatim',
      };
    }
  } catch (error) {
    console.warn('Nominatim geocode başarısız', error);
  }
  return null;
};

export const getRouteEstimate = async (fromLocation, toLocation, transportType = 'Diğer') => {
  const normalizedTransportType = normalizeTransportType(transportType);
  const from = locationCoords(fromLocation) || locationArray(fromLocation);
  const to = locationCoords(toLocation) || locationArray(toLocation);
  if (!from || !to) return { distanceKm: 0, durationMinutes: 0, source: 'none' };

  if (normalizedTransportType !== 'Uçak') {
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=false`);
      const data = await response.json();
      const route = data.routes?.[0];
      if (route) {
        return {
          distanceKm: Math.round(route.distance / 1000),
          durationMinutes: Math.round(route.duration / 60),
          source: 'osrm',
        };
      }
    } catch (error) {
      console.warn('OSRM rota hesabı başarısız', error);
    }
  }

  const distanceKm = estimateTravelDistance(from, to, normalizedTransportType);
  return {
    distanceKm,
    durationMinutes: estimateDurationByTransport(distanceKm, normalizedTransportType),
    source: 'haversine',
  };
};

function guessPointType(value) {
  const text = String(value).toLocaleLowerCase('tr-TR');
  if (text.includes('havaliman') || text.includes('airport')) return 'Havalimanı';
  if (text.includes('otogar') || text.includes('terminal')) return 'Otogar';
  if (text.includes('gar') || text.includes('tren')) return 'Gar';
  return 'Diğer';
}

function locationArray(value) {
  if (value?.lat && value?.lng) return [Number(value.lat), Number(value.lng)];
  if (Array.isArray(value)) return value;
  return null;
}
