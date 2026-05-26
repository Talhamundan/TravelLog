// Koordinatlar arasında mesafe ve ulaşım türüne göre tahmini rota/süre hesabı.
const toRad = (degree) => (degree * Math.PI) / 180;

export const haversineDistance = (from, to) => {
  if (!from || !to) return 0;
  const [lat1, lng1] = Array.isArray(from) ? from.map(Number) : [Number(from.lat), Number(from.lng)];
  const [lat2, lng2] = Array.isArray(to) ? to.map(Number) : [Number(to.lat), Number(to.lng)];
  if ([lat1, lng1, lat2, lng2].some((value) => Number.isNaN(value))) return 0;
  const earthKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

export const haversineDistanceKm = haversineDistance;

const distanceMultipliers = {
  Uçak: 1,
  Tren: 1.1,
  Araç: 1.25,
  Otobüs: 1.25,
  Diğer: 1.2,
};

const speedProfiles = {
  Uçak: { speed: 650, extraMinutes: 60 },
  Otobüs: { speed: 75, extraMinutes: 0 },
  Araç: { speed: 85, extraMinutes: 0 },
  Tren: { speed: 120, extraMinutes: 0 },
  Diğer: { speed: 50, extraMinutes: 0 },
};

export const estimateTravelDistance = (from, to, transportType = 'Diğer') => {
  const base = haversineDistance(from, to);
  if (!base) return 0;
  return Math.round(base * (distanceMultipliers[transportType] || distanceMultipliers.Diğer));
};

export const estimateDurationByTransport = (distanceKm, transportType = 'Diğer') => {
  const distance = Number(distanceKm) || 0;
  if (!distance) return 0;
  const profile = speedProfiles[transportType] || speedProfiles.Diğer;
  return Math.round((distance / profile.speed) * 60 + profile.extraMinutes);
};
