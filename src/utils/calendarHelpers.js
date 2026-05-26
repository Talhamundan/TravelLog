import { formatCurrency, formatKm, minutesToDuration, monthName } from './formatters';
import { locationCity, locationLabel, routeLabel } from './location';
import { tripProviderLabel } from './tripDisplay';

export const transportColors = {
  Uçak: '#38bdf8',
  Otobüs: '#a855f7',
  Araç: '#f59e0b',
  Tren: '#22c55e',
  Feribot: '#14b8a6',
  Taksi: '#f97316',
  Diğer: '#ef4444',
};

export const calendarViews = [
  { id: 'month', label: 'Ay' },
  { id: 'week', label: 'Hafta' },
  { id: 'day', label: 'Gün' },
  { id: 'agenda', label: 'Ajanda' },
];

export const makeLocalDate = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  if (value instanceof Date) return value;
  const text = String(value);
  return new Date(text.includes('T') ? text : `${text}T00:00:00`);
};

export const isoDate = (date) => {
  if (!date) return '';
  const next = makeLocalDate(date);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
};

export const tripDate = (trip) => makeLocalDate(trip.date || trip.departureDate || trip.startDate || trip.createdAt);

export const tripTime = (trip) => trip.departureTime || trip.time || trip.startTime || '';

export const tripTotalCost = (trip) =>
  Number(trip.totalCost) ||
  ['ticketPrice', 'fuelCost', 'roadCost', 'bridgeCost', 'parkingCost', 'otherCost'].reduce((sum, key) => sum + (Number(trip[key]) || 0), 0);

export const toCalendarEvent = (trip) => {
  const date = tripDate(trip);
  const transportType = trip.transportType || 'Diğer';
  return {
    id: trip.id,
    trip,
    date,
    dateKey: isoDate(date),
    title: trip.title || routeLabel(trip),
    route: routeLabel(trip),
    time: tripTime(trip),
    transportType,
    company: tripProviderLabel(trip),
    color: transportColors[transportType] || transportColors.Diğer,
  };
};

export const buildCalendarEvents = (trips = []) =>
  trips
    .map(toCalendarEvent)
    .filter((event) => event.date && !Number.isNaN(event.date.getTime()))
    .sort((a, b) => a.date - b.date || a.time.localeCompare(b.time));

export const getMonthGrid = (currentDate) => {
  const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - startOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
};

export const getWeekDays = (currentDate) => {
  const start = new Date(currentDate);
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
};

export const filterCalendarEvents = (events, filters = {}) => {
  const query = (filters.query || '').toLocaleLowerCase('tr-TR');
  return events.filter((event) => {
    const trip = event.trip;
    const cityText = tripCityTexts(trip).join(' ').toLocaleLowerCase('tr-TR');
    const haystack = [event.title, event.route, event.company, event.transportType, trip.notes]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('tr-TR');
    if (query && !`${haystack} ${cityText}`.includes(query)) return false;
    if (filters.transportType && event.transportType !== filters.transportType) return false;
    if (filters.company && event.company !== filters.company && trip.company !== filters.company) return false;
    if (filters.city && !cityText.includes(filters.city.toLocaleLowerCase('tr-TR'))) return false;
    if (filters.year && event.date.getFullYear() !== Number(filters.year)) return false;
    if (filters.month !== '' && filters.month != null && event.date.getMonth() !== Number(filters.month)) return false;
    return true;
  });
};

export const calendarFilterOptions = (events = []) => {
  const years = [...new Set(events.map((event) => event.date.getFullYear()))].sort((a, b) => b - a);
  const companies = [...new Set(events.map((event) => event.company).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
  const transports = [...new Set(events.map((event) => event.transportType).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
  const cities = [
    ...new Set(
      events.flatMap(({ trip }) => tripCityTexts(trip)),
    ),
  ].sort((a, b) => String(a).localeCompare(String(b), 'tr'));
  const months = Array.from({ length: 12 }, (_, index) => ({ value: index, label: monthName(index) }));
  return { years, companies, transports, cities, months };
};

export const buildCalendarAnalytics = (events = [], currentDate = new Date()) => {
  const monthEvents = events.filter(
    (event) => event.date.getFullYear() === currentDate.getFullYear() && event.date.getMonth() === currentDate.getMonth(),
  );
  const byDay = monthEvents.reduce((acc, event) => {
    const key = isoDate(event.date);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const byTransport = monthEvents.reduce((acc, event) => {
    acc[event.transportType] = (acc[event.transportType] || 0) + 1;
    return acc;
  }, {});
  const busiestDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
  const topTransport = Object.entries(byTransport).sort((a, b) => b[1] - a[1])[0];
  const totalKm = monthEvents.reduce((sum, event) => sum + (Number(event.trip.distanceKm) || 0), 0);
  const totalCost = monthEvents.reduce((sum, event) => sum + tripTotalCost(event.trip), 0);

  return [
    { label: 'Bu ay seyahat', value: monthEvents.length || 0, hint: 'Takvimde görünen kayıt' },
    { label: 'Bu ay km', value: formatKm(totalKm), hint: 'Filtrelenmiş toplam' },
    { label: 'Bu ay masraf', value: formatCurrency(totalCost), hint: 'Trip maliyetlerinden' },
    { label: 'En yoğun gün', value: busiestDay ? `${new Date(`${busiestDay[0]}T00:00:00`).getDate()} ${monthName(new Date(`${busiestDay[0]}T00:00:00`).getMonth())}` : '-', hint: busiestDay ? `${busiestDay[1]} seyahat` : 'Veri yok' },
    { label: 'Favori ulaşım', value: topTransport?.[0] || '-', hint: topTransport ? `${topTransport[1]} kayıt` : 'Veri yok' },
  ];
};

export const upcomingEvents = (events = [], limit = 6) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return events.filter((event) => event.date >= today).slice(0, limit);
};

export const eventMeta = (trip) => ({
  provider: tripProviderLabel(trip),
  duration: minutesToDuration(trip.durationMinutes),
  km: formatKm(trip.distanceKm),
  cost: formatCurrency(tripTotalCost(trip), trip.currency || 'TRY'),
});

function tripCityTexts(trip) {
  return [
    locationCity(trip.from),
    locationCity(trip.to),
    trip.fromText,
    trip.toText,
    typeof trip.from === 'string' ? trip.from : locationLabel(trip.from),
    typeof trip.to === 'string' ? trip.to : locationLabel(trip.to),
  ].filter((item) => item && item !== '-');
}
