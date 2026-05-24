// Dashboard ve rapor ekranları için seyahat analitik hesaplamaları.
import { monthName } from './formatters';
import { routeLabel } from './location';

export const toNumber = (value) => Number.parseFloat(value) || 0;
const plateKey = (value = '') => String(value).toLocaleUpperCase('tr-TR').replace(/[^0-9A-Z]/g, '');

export const sumBy = (items, key) => items.reduce((total, item) => total + toNumber(item[key]), 0);

export const routeKey = (trip) => routeLabel(trip);

export const groupTrips = (trips, getKey) =>
  trips.reduce((acc, trip) => {
    const key = getKey(trip) || 'Belirtilmedi';
    acc[key] ||= [];
    acc[key].push(trip);
    return acc;
  }, {});

export const summarizeGroup = (name, trips) => ({
  name,
  count: trips.length,
  km: sumBy(trips, 'distanceKm'),
  cost: sumBy(trips, 'totalCost'),
  fuelCost: sumBy(trips, 'fuelCost'),
  roadCost: sumBy(trips, 'roadCost'),
  bridgeCost: sumBy(trips, 'bridgeCost'),
  parkingCost: sumBy(trips, 'parkingCost'),
  otherCost: sumBy(trips, 'otherCost'),
  averageTicket: trips.length ? sumBy(trips, 'ticketPrice') / trips.length : 0,
  averageCostPerKm: sumBy(trips, 'distanceKm') ? sumBy(trips, 'totalCost') / sumBy(trips, 'distanceKm') : 0,
});

export const groupedSummary = (trips, getKey) =>
  Object.entries(groupTrips(trips, getKey))
    .map(([name, rows]) => summarizeGroup(name, rows))
    .sort((a, b) => b.count - a.count);

export const createStats = (trips, now = new Date()) => {
  const year = now.getFullYear();
  const month = now.getMonth();
  const thisYearTrips = trips.filter((trip) => new Date(trip.date).getFullYear() === year);
  const thisMonthTrips = thisYearTrips.filter((trip) => new Date(trip.date).getMonth() === month);
  const totalKm = sumBy(trips, 'distanceKm');
  const totalCost = sumBy(trips, 'totalCost');
  const top = (rows) => rows[0]?.name || '0';
  const companies = groupedSummary(trips, (trip) => trip.company || 'Belirtilmedi');
  const transports = groupedSummary(trips, (trip) => trip.transportType || 'Diğer');
  const routes = groupedSummary(trips, routeKey);

  return {
    totalTrips: trips.length,
    yearKm: sumBy(thisYearTrips, 'distanceKm'),
    yearCost: sumBy(thisYearTrips, 'totalCost'),
    monthKm: sumBy(thisMonthTrips, 'distanceKm'),
    monthCost: sumBy(thisMonthTrips, 'totalCost'),
    averageTripKm: trips.length ? totalKm / trips.length : 0,
    averageCostPerKm: totalKm ? totalCost / totalKm : 0,
    averageMonthlyKm: sumBy(thisYearTrips, 'distanceKm') / Math.max(month + 1, 1),
    averageMonthlyCost: sumBy(thisYearTrips, 'totalCost') / Math.max(month + 1, 1),
    topCompany: top(companies),
    topTransport: top(transports),
    topRoute: top(routes),
    totalKm,
    totalCost,
  };
};

export const createChartData = (trips) => {
  const monthly = Array.from({ length: 12 }, (_, month) => ({ name: monthName(month), km: 0, masraf: 0, count: 0 }));
  const byYear = {};

  trips.forEach((trip) => {
    const date = new Date(trip.date);
    if (!Number.isNaN(date.getTime())) {
      monthly[date.getMonth()].km += toNumber(trip.distanceKm);
      monthly[date.getMonth()].masraf += toNumber(trip.totalCost);
      monthly[date.getMonth()].count += 1;
      const year = String(date.getFullYear());
      byYear[year] ||= { name: year, km: 0, masraf: 0, count: 0 };
      byYear[year].km += toNumber(trip.distanceKm);
      byYear[year].masraf += toNumber(trip.totalCost);
      byYear[year].count += 1;
    }
  });

  return {
    monthly,
    transport: groupedSummary(trips, (trip) => trip.transportType || 'Diğer').map((item) => ({ name: item.name, value: item.count, ...item })),
    companies: groupedSummary(trips, (trip) => trip.company || 'Belirtilmedi').map((item) => ({ name: item.name, value: item.count, ...item })),
    years: Object.values(byYear).sort((a, b) => a.name.localeCompare(b.name)),
    routes: groupedSummary(trips, routeKey).slice(0, 10).map((item) => ({ ...item, value: item.count })),
  };
};

export const buildReports = (trips) => ({
  yearly: groupedSummary(trips, (trip) => String(new Date(trip.date).getFullYear() || 'Belirsiz')),
  monthly: groupedSummary(trips, (trip) => {
    const date = new Date(trip.date);
    return Number.isNaN(date.getTime()) ? 'Belirsiz' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }),
  companies: groupedSummary(trips, (trip) => trip.company || 'Belirtilmedi'),
  transports: groupedSummary(trips, (trip) => trip.transportType || 'Diğer'),
  routes: groupedSummary(trips, routeKey),
  vehicleCosts: groupedSummary(
    trips.filter((trip) => trip.transportType === 'Araç'),
    (trip) => trip.vehicleName || trip.company || routeKey(trip),
  ),
});

export const vehicleStats = (trips, vehicle) => {
  const plate = vehicle?.plate;
  const name = vehicle?.name;
  const normalizedPlate = plateKey(plate);
  const rows = trips.filter(
    (trip) =>
      trip.vehicleId === vehicle?.id ||
      (normalizedPlate && plateKey(trip.plate) === normalizedPlate) ||
      (normalizedPlate && plateKey(trip.vehicleName) === normalizedPlate) ||
      trip.vehicleName === name,
  );
  return { ...summarizeGroup(plate || name || '-', rows), trips: rows };
};

export const companyStats = (trips, company) => summarizeGroup(company?.name || '-', trips.filter((trip) => trip.company === company?.name));
