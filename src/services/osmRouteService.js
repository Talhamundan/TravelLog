import { haversineDistanceKm } from '../utils/distance';
import { getTransportColor, normalizeTransportType } from '../constants/transport';

export const getRouteColor = (transportType) => getTransportColor(transportType);

export const getTravelModeByTransportType = (transportType) => {
  if (transportType === 'Yaya') return 'foot';
  if (transportType === 'Bisiklet') return 'bike';
  return 'driving';
};

export async function geocodeOsmPlace(query) {
  const text = String(query || '').trim();
  if (!text) return [];
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '6');
  url.searchParams.set('countrycodes', 'tr');
  url.searchParams.set('accept-language', 'tr');
  url.searchParams.set('q', text);
  const response = await fetch(url);
  if (!response.ok) throw new Error('OpenStreetMap konum araması başarısız.');
  const data = await response.json();
  return data.map(normalizeNominatimResult);
}

export async function getRoute({ origin, destination, waypoints = [], transportType = 'Araç' }) {
  if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
    throw new Error('Rota için başlangıç ve varış konumu zorunlu.');
  }

  const normalizedTransportType = normalizeTransportType(transportType);
  const points = [origin, ...waypoints, destination].filter((point) => point?.lat && point?.lng);
  if (normalizedTransportType === 'Uçak') return buildAirRoute(points);

  const coordinates = points.map((point) => `${Number(point.lng)},${Number(point.lat)}`).join(';');
  const url = new URL(`https://router.project-osrm.org/route/v1/driving/${coordinates}`);
  url.searchParams.set('overview', 'full');
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('steps', 'false');
  url.searchParams.set('annotations', 'false');

  const response = await fetch(url);
  if (!response.ok) throw new Error('OSRM rota servisi yanıt vermedi.');
  const data = await response.json();
  const route = data.routes?.[0];
  if (!route) throw new Error('OpenStreetMap rotası bulunamadı.');

  const overviewPath = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
  return {
    provider: 'osrm',
    travelMode: getTravelModeByTransportType(normalizedTransportType),
    distanceText: `${(route.distance / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} km`,
    distanceMeters: Math.round(route.distance),
    durationText: `${Math.round(route.duration / 60)} dk`,
    durationSeconds: Math.round(route.duration),
    overviewPolyline: '',
    overviewPath,
    bounds: boundsFromPoints(overviewPath),
    legs: (route.legs || []).map((leg, index) => ({
      startAddress: points[index]?.name || points[index]?.formattedAddress || '',
      endAddress: points[index + 1]?.name || points[index + 1]?.formattedAddress || '',
      distanceMeters: Math.round(leg.distance || 0),
      durationSeconds: Math.round(leg.duration || 0),
    })),
    waypointOrder: waypoints.map((_, index) => index),
  };
}

export function calculateDistanceAndDuration(route) {
  const legs = route?.legs || [];
  if (!legs.length) return { distanceMeters: route?.distanceMeters || 0, durationSeconds: route?.durationSeconds || 0 };
  return legs.reduce(
    (acc, leg) => ({
      distanceMeters: acc.distanceMeters + (leg.distanceMeters || 0),
      durationSeconds: acc.durationSeconds + (leg.durationSeconds || 0),
    }),
    { distanceMeters: 0, durationSeconds: 0 },
  );
}

export const decodeOverviewPolyline = (polylineOrPath) => {
  if (Array.isArray(polylineOrPath)) return polylineOrPath;
  if (typeof polylineOrPath !== 'string' || !polylineOrPath) return [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const points = [];
  while (index < polylineOrPath.length) {
    const nextLat = decodePolylineValue(polylineOrPath, index);
    index = nextLat.index;
    const nextLng = decodePolylineValue(polylineOrPath, index);
    index = nextLng.index;
    lat += nextLat.value;
    lng += nextLng.value;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
};

function decodePolylineValue(polyline, startIndex) {
  let result = 0;
  let shift = 0;
  let index = startIndex;
  let byte = 0;
  do {
    byte = polyline.charCodeAt(index) - 63;
    index += 1;
    result |= (byte & 0x1f) << shift;
    shift += 5;
  } while (byte >= 0x20 && index < polyline.length);
  return {
    value: result & 1 ? ~(result >> 1) : result >> 1,
    index,
  };
}

function buildAirRoute(points) {
  const distanceKm = points.slice(0, -1).reduce((sum, point, index) => sum + haversineDistanceKm([point.lat, point.lng], [points[index + 1].lat, points[index + 1].lng]), 0);
  const durationMinutes = Math.round(distanceKm / 750 * 60);
  return {
    provider: 'airline-estimate',
    travelMode: 'AIR',
    distanceCalculation: 'air_haversine',
    distanceText: `${Math.round(distanceKm).toLocaleString('tr-TR')} km`,
    distanceMeters: Math.round(distanceKm * 1000),
    durationText: `${durationMinutes} dk`,
    durationSeconds: durationMinutes * 60,
    overviewPath: points.map((point) => ({ ...point, lat: Number(point.lat), lng: Number(point.lng) })),
    overviewPolyline: '',
    bounds: boundsFromPoints(points),
    legs: points.slice(0, -1).map((point, index) => {
      const next = points[index + 1];
      return {
        startAddress: point.name || '',
        endAddress: next.name || '',
        distanceMeters: Math.round(haversineDistanceKm([point.lat, point.lng], [next.lat, next.lng]) * 1000),
        durationSeconds: 0,
      };
    }),
    waypointOrder: points.slice(1, -1).map((_, index) => index),
  };
}

function normalizeNominatimResult(result) {
  const address = result.address || {};
  return {
    placeId: String(result.place_id || ''),
    name: result.name || result.display_name?.split(',')[0] || 'Konum',
    formattedAddress: result.display_name || '',
    lat: Number(result.lat),
    lng: Number(result.lon),
    city: address.city || address.town || address.village || address.province || '',
    district: address.county || address.suburb || address.neighbourhood || '',
    province: address.province || address.state || '',
    country: address.country || 'Türkiye',
    types: [result.type, result.class].filter(Boolean),
    provider: 'osm',
  };
}

function boundsFromPoints(points) {
  const valid = points.filter((point) => Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng)));
  if (!valid.length) return null;
  return {
    north: Math.max(...valid.map((point) => Number(point.lat))),
    south: Math.min(...valid.map((point) => Number(point.lat))),
    east: Math.max(...valid.map((point) => Number(point.lng))),
    west: Math.min(...valid.map((point) => Number(point.lng))),
  };
}
