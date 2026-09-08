// Seyahat listelerinde tarih + başlangıç saatine göre en yeni kaydı üste taşır.
export function compareTripsByNewestDateTime(a = {}, b = {}) {
  const dateCompare = tripDateKey(b).localeCompare(tripDateKey(a));
  if (dateCompare !== 0) return dateCompare;
  return tripStartMinutes(b) - tripStartMinutes(a);
}

export function sortTripsByNewestDateTime(trips = []) {
  return [...trips].sort(compareTripsByNewestDateTime);
}

function tripDateKey(trip = {}) {
  return String(trip.date || trip.departureDate || trip.startDate || trip.createdAt || '').slice(0, 10);
}

function tripStartMinutes(trip = {}) {
  const match = String(trip.departureTime || trip.time || trip.startTime || '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return -1;
  return Number(match[1]) * 60 + Number(match[2]);
}
