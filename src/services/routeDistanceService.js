// İleride OSRM/Google Maps yol mesafesine geçmek için tek servis yüzeyi.
import { getCityCoords } from '../utils/cityCoordinates';
import { haversineDistanceKm } from '../utils/distance';
import { locationCity, locationCoords } from '../utils/location';

export const estimateDistanceKm = async (from, to) => {
  const fromCoords = locationCoords(from) || getCityCoords(locationCity(from) || from);
  const toCoords = locationCoords(to) || getCityCoords(locationCity(to) || to);
  return haversineDistanceKm(fromCoords, toCoords);
};
