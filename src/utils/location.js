// Eski string lokasyonlar ile yeni il/ilçe/nokta objelerini ortak biçimde okur.
import { defaultTurkeyCenter, getCityCoords } from './cityCoordinates';
import { findTravelLocation } from './locations';

export const locationCity = (value) => (typeof value === 'string' ? value : value?.city || '');

export const locationLabel = (value) => {
  if (!value) return '-';
  if (typeof value === 'string') return value;
  return value.name || [value.city, value.district, value.pointName].filter(Boolean).join(' / ') || '-';
};

export const routeLabel = (trip) =>
  `${trip.fromText || locationLabel(trip.from)} → ${trip.toText || locationLabel(trip.to)}`;

export const locationCoords = (value) => {
  if (Number.isFinite(Number(value?.lat)) && Number.isFinite(Number(value?.lng))) return [Number(value.lat), Number(value.lng)];
  return null;
};

export const resolveLocationCoords = (value, fallbackCoords = null) => {
  const resolved = findTravelLocation(locationSearchText(value));
  const resolvedCoords = locationCoords(resolved);
  if (resolvedCoords) return resolvedCoords;

  const directCoords = locationCoords(value);
  if (directCoords && !isDefaultTurkeyCenter(directCoords)) return directCoords;

  if (isValidCoords(fallbackCoords) && !isDefaultTurkeyCenter(fallbackCoords)) return fallbackCoords;

  const cityCoords = getCityCoords(locationCity(value) || (typeof value === 'string' ? value : ''));
  if (cityCoords && !isDefaultTurkeyCenter(cityCoords)) return cityCoords;

  return isValidCoords(fallbackCoords) ? fallbackCoords : null;
};

function locationSearchText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.name || [value.city, value.district, value.pointName, value.type].filter(Boolean).join(' ');
}

function isValidCoords(coords) {
  return Array.isArray(coords) && coords.length === 2 && coords.every((coord) => Number.isFinite(Number(coord)));
}

function isDefaultTurkeyCenter(coords) {
  if (!isValidCoords(coords)) return false;
  return Math.abs(Number(coords[0]) - defaultTurkeyCenter[0]) < 0.0001 && Math.abs(Number(coords[1]) - defaultTurkeyCenter[1]) < 0.0001;
}
