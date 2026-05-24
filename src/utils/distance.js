// Koordinatlar arasında kuş uçuşu mesafe hesabı.
const toRad = (degree) => (degree * Math.PI) / 180;

export const haversineDistanceKm = (from, to) => {
  if (!from || !to) return 0;
  const [lat1, lng1] = from.map(Number);
  const [lat2, lng2] = to.map(Number);
  const earthKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};
