import { formatCurrency, formatKm, monthName } from './formatters';
import { locationCity } from './location';
import { tripProviderLabel } from './tripDisplay';
import { isoDate, makeLocalDate, tripDate, tripTotalCost } from './calendarHelpers';
import { getTransportColor, normalizeTransportType } from '../constants/transport';
import { getTripRouteTitle } from './routeDisplay';

const categoryColors = {
  Uçak: getTransportColor('Uçak'),
  Otobüs: getTransportColor('Otobüs'),
  Yakıt: '#f59e0b',
  'Yol/Köprü': '#fb923c',
  Otopark: '#14b8a6',
  Tren: getTransportColor('Tren'),
  Feribot: getTransportColor('Feribot'),
  Yemek: '#ec4899',
  Konaklama: '#6366f1',
  Diğer: '#ef4444',
};

const transportTicketCategory = {
  Uçak: 'Uçak',
  Otobüs: 'Otobüs',
  Tren: 'Tren',
  Feribot: 'Feribot',
};

const expenseSources = [
  { key: 'ticketPrice', category: (trip) => transportTicketCategory[trip.transportType] || 'Diğer', label: (trip) => `${trip.transportType || 'Seyahat'} bileti` },
  { key: 'fuelCost', category: 'Yakıt', label: 'Yakıt' },
  { key: 'roadCost', category: 'Yol/Köprü', label: 'Yol masrafı' },
  { key: 'bridgeCost', category: 'Yol/Köprü', label: 'Köprü/otoyol' },
  { key: 'parkingCost', category: 'Otopark', label: 'Otopark' },
  { key: 'otherCost', category: 'Diğer', label: 'Diğer masraf' },
];

export const expenseCategories = ['Uçak', 'Otobüs', 'Yakıt', 'Yol/Köprü', 'Otopark', 'Tren', 'Feribot', 'Yemek', 'Konaklama', 'Diğer'];

export const expenseCategoryColors = categoryColors;

export const normalizeExpenseDate = (expense) => makeLocalDate(expense.expenseDate || expense.date || expense.createdAt);

export const buildExpensesFromTrips = (trips = [], manualExpenses = []) => {
  const derived = trips.flatMap((trip) => {
    const date = tripDate(trip);
    return expenseSources
      .map((source) => {
        const amount = Number(trip[source.key]) || 0;
        if (amount <= 0) return null;
        const category = typeof source.category === 'function' ? source.category(trip) : source.category;
        return {
          id: `trip-${trip.id}-${source.key}`,
          tripId: trip.id,
          source: 'trip',
          derived: true,
          category,
          amount,
          currency: trip.currency || 'TRY',
          description: `${getTripRouteTitle(trip)} · ${typeof source.label === 'function' ? source.label(trip) : source.label}`,
          company: trip.company || '',
          vehiclePlate: trip.vehiclePlate || trip.plate || '',
          city: [locationCity(trip.from) || trip.fromText || trip.from, locationCity(trip.to) || trip.toText || trip.to].filter(Boolean).join(' → '),
          transportType: normalizeTransportType(trip.transportType),
          route: getTripRouteTitle(trip),
          expenseDate: date ? isoDate(date) : '',
          trip,
        };
      })
      .filter(Boolean);
  });

  const manual = manualExpenses.map((expense) => {
    const trip = trips.find((item) => item.id === expense.tripId);
    const date = normalizeExpenseDate(expense);
    return {
      ...expense,
      source: 'manual',
      derived: false,
      category: expense.category || 'Diğer',
      amount: Number(expense.amount) || 0,
      currency: expense.currency || 'TRY',
      description: expense.description || expense.note || 'Manuel masraf',
      company: expense.company || trip?.company || '',
      vehiclePlate: expense.vehiclePlate || trip?.vehiclePlate || trip?.plate || '',
      city: expense.city || (trip ? [locationCity(trip.from) || trip.fromText || trip.from, locationCity(trip.to) || trip.toText || trip.to].filter(Boolean).join(' → ') : ''),
      transportType: expense.transportType ? normalizeTransportType(expense.transportType) : trip?.transportType ? normalizeTransportType(trip.transportType) : '',
      route: trip ? getTripRouteTitle(trip) : expense.city || '-',
      expenseDate: date ? isoDate(date) : '',
      trip,
    };
  });

  return [...derived, ...manual]
    .filter((expense) => expense.amount > 0)
    .sort((a, b) => (normalizeExpenseDate(b)?.getTime() || 0) - (normalizeExpenseDate(a)?.getTime() || 0));
};

export const filterExpenses = (expenses = [], filters = {}) => {
  const min = Number(filters.minAmount);
  const max = Number(filters.maxAmount);
  const start = filters.startDate ? makeLocalDate(filters.startDate) : null;
  const end = filters.endDate ? makeLocalDate(filters.endDate) : null;
  if (end) end.setHours(23, 59, 59, 999);
  return expenses.filter((expense) => {
    const date = normalizeExpenseDate(expense);
    const cityText = String(expense.city || '').toLocaleLowerCase('tr-TR');
    if (start && date < start) return false;
    if (end && date > end) return false;
    if (filters.quick === 'ticket' && !['Uçak', 'Otobüs', 'Tren', 'Feribot'].includes(expense.category)) return false;
    if (filters.quick === 'road' && expense.category !== 'Yol/Köprü') return false;
    if (filters.quick === 'hotel' && expense.category !== 'Konaklama') return false;
    if (filters.category && expense.category !== filters.category) return false;
    if (filters.transportType && expense.transportType !== filters.transportType) return false;
    if (filters.company && expense.company !== filters.company) return false;
    if (filters.vehicle && expense.vehiclePlate !== filters.vehicle) return false;
    if (filters.city && !cityText.includes(filters.city.toLocaleLowerCase('tr-TR'))) return false;
    if (Number.isFinite(min) && min > 0 && expense.amount < min) return false;
    if (Number.isFinite(max) && max > 0 && expense.amount > max) return false;
    return true;
  });
};

const sum = (items, selector = (item) => item.amount) => items.reduce((total, item) => total + (Number(selector(item)) || 0), 0);

const groupSum = (items, selector) =>
  Object.values(
    items.reduce((acc, item) => {
      const name = selector(item) || 'Belirtilmedi';
      acc[name] = acc[name] || { name, value: 0 };
      acc[name].value += Number(item.amount) || 0;
      return acc;
    }, {}),
  ).sort((a, b) => b.value - a.value);

export const buildExpenseFilterOptions = (expenses = []) => ({
  categories: [...new Set(expenses.map((expense) => expense.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr')),
  transports: [...new Set(expenses.map((expense) => expense.transportType).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr')),
  companies: [...new Set(expenses.map((expense) => expense.company).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr')),
  vehicles: [...new Set(expenses.map((expense) => expense.vehiclePlate).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr')),
  cities: [...new Set(expenses.map((expense) => expense.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr')),
});

export const buildExpenseAnalytics = (expenses = [], trips = [], period = {}) => {
  const now = new Date();
  const periodYear = Number(period.yearFilter) || now.getFullYear();
  const periodMonth = Number(period.monthFilter);
  const thisMonth = expenses.filter((expense) => {
    const date = normalizeExpenseDate(expense);
    return date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonth = expenses.filter((expense) => {
    const date = normalizeExpenseDate(expense);
    return date && date.getFullYear() === previousMonthDate.getFullYear() && date.getMonth() === previousMonthDate.getMonth();
  });
  const total = sum(expenses);
  const monthTotal = sum(thisMonth);
  const prevMonthTotal = sum(previousMonth);
  const totalKm = sum(trips, (trip) => trip.distanceKm);
  const maxExpense = expenses.reduce((max, expense) => (expense.amount > (max?.amount || 0) ? expense : max), null);
  const averageTrip = trips.length ? sum(trips, tripTotalCost) / trips.length : 0;
  const ticketTotal = sum(expenses.filter((expense) => ['Uçak', 'Otobüs', 'Tren', 'Feribot'].includes(expense.category)));
  const vehicleTrips = trips.filter((trip) => normalizeTransportType(trip.transportType) === 'Araç');
  const vehicleKm = sum(vehicleTrips, (trip) => trip.distanceKm);
  const fuelTotal = sum(expenses.filter((expense) => expense.category === 'Yakıt'));
  const roadTotal = sum(expenses.filter((expense) => expense.category === 'Yol/Köprü'));
  const averageRouteKm = trips.length ? totalKm / trips.length : 0;
  const fuelPerKm = vehicleKm ? fuelTotal / vehicleKm : 0;
  const roadPerKm = vehicleKm ? roadTotal / vehicleKm : totalKm ? roadTotal / totalKm : 0;
  const assumedFuelPrice = 45;

  const periodSeries = periodMonth ? buildDailyExpenseSeries(expenses, periodYear, periodMonth) : buildMonthlyExpenseSeries(expenses, periodYear, Boolean(period.yearFilter));

  const category = groupSum(expenses, (expense) => expense.category).map((item) => ({
    ...item,
    color: categoryColors[item.name] || categoryColors.Diğer,
  }));
  const transport = groupSum(expenses, (expense) => expense.transportType || expense.category);
  const company = groupSum(expenses, (expense) => expense.company || expense.vehiclePlate);
  const city = groupSum(expenses, (expense) => expense.city).slice(0, 8);

  const routeCost = groupSum(expenses, (expense) => expense.route);
  const transportKm = Object.values(
    trips.reduce((acc, trip) => {
      const name = trip.transportType || 'Diğer';
      acc[name] = acc[name] || { name, cost: 0, km: 0 };
      acc[name].cost += tripTotalCost(trip);
      acc[name].km += Number(trip.distanceKm) || 0;
      return acc;
    }, {}),
  );
  const routeKmCost = Object.values(
    trips.reduce((acc, trip) => {
      const name = getTripRouteTitle(trip);
      acc[name] = acc[name] || { name, cost: 0, km: 0 };
      acc[name].cost += tripTotalCost(trip);
      acc[name].km += Number(trip.distanceKm) || 0;
      return acc;
    }, {}),
  ).sort((a, b) => b.cost / Math.max(b.km, 1) - a.cost / Math.max(a.km, 1));

  const expensiveTransport = transport[0];
  const economicTransport = transportKm.filter((item) => item.km > 0).sort((a, b) => a.cost / a.km - b.cost / b.km)[0];
  const expensivePeriod = periodSeries.rows.slice().sort((a, b) => b.value - a.value)[0];

  return {
    kpis: [
      { label: 'Toplam Masraf', value: formatCurrency(total), change: 'Tüm kayıtlar', tone: 'blue' },
      { label: 'Bu Ay Masraf', value: formatCurrency(monthTotal), change: prevMonthTotal ? `%${Math.round(((monthTotal - prevMonthTotal) / prevMonthTotal) * 100)}` : 'Yeni dönem', tone: 'green' },
      { label: 'Km Başı Maliyet', value: formatCurrency(totalKm ? total / totalKm : 0), change: formatKm(totalKm), tone: 'cyan' },
      { label: 'En Yüksek Tek Masraf', value: formatCurrency(maxExpense?.amount || 0), change: maxExpense?.description || '-', tone: 'pink' },
      { label: 'Ort. Seyahat Maliyeti', value: formatCurrency(averageTrip), change: `${trips.length} seyahat`, tone: 'purple' },
      { label: 'Yakıt Toplamı', value: formatCurrency(fuelTotal), change: 'Araç giderleri', tone: 'amber' },
      { label: 'Bilet Toplamı', value: formatCurrency(ticketTotal), change: 'Uçak/otobüs/tren', tone: 'indigo' },
      { label: 'Yol/Köprü Toplamı', value: formatCurrency(roadTotal), change: 'Otoyol + köprü', tone: 'orange' },
    ],
    charts: { category, monthly: periodSeries.rows, periodTitle: periodSeries.title, transport, company: company.slice(0, 8), city },
    intelligence: [
      {
        label: 'Gidilecek rota yakıt tahmini',
        value: fuelPerKm ? formatCurrency(fuelPerKm * Math.max(averageRouteKm, 1)) : '-',
        detail: averageRouteKm ? `${formatKm(averageRouteKm)} ortalama rota için geçmiş yakıt/km bazlı` : 'Araç km verisi bekleniyor',
      },
      {
        label: 'Otoyol/köprü tahmini',
        value: roadPerKm ? formatCurrency(roadPerKm * Math.max(averageRouteKm, 1)) : '-',
        detail: 'Geçmiş yol/köprü masrafının km ortalaması',
      },
      {
        label: 'Ortalama yakıt tüketimi',
        value: fuelPerKm ? `${((fuelPerKm / assumedFuelPrice) * 100).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} lt/100 km` : '-',
        detail: `${formatCurrency(assumedFuelPrice)}/lt varsayımıyla hesaplanır`,
      },
      {
        label: 'Rota başı ortalama masraf',
        value: trips.length ? formatCurrency(total / trips.length) : '-',
        detail: `${trips.length} seyahat ve ${expenses.length} masraf kaleminden`,
      },
    ],
    insights: [
      { label: 'Bu yıl en pahalı ulaşım türü', value: expensiveTransport ? `${expensiveTransport.name} · ${formatCurrency(expensiveTransport.value)}` : '-' },
      { label: 'En maliyetli rota', value: routeCost[0] ? `${routeCost[0].name} · ${formatCurrency(routeCost[0].value)}` : '-' },
      { label: 'En fazla masraf yapılan dönem', value: expensivePeriod ? `${expensivePeriod.name} · ${formatCurrency(expensivePeriod.value)}` : '-' },
      { label: 'En ekonomik ulaşım türü', value: economicTransport ? `${economicTransport.name} · ${formatCurrency(economicTransport.cost / Math.max(economicTransport.km, 1))}/km` : '-' },
      { label: 'Km başı en pahalı rota', value: routeKmCost[0] ? `${routeKmCost[0].name} · ${formatCurrency(routeKmCost[0].cost / Math.max(routeKmCost[0].km, 1))}/km` : '-' },
    ],
  };
};

function buildMonthlyExpenseSeries(expenses, year, restrictToYear) {
  return {
    title: 'Aylara Göre Masraf',
    rows: Array.from({ length: 12 }, (_, month) => ({
      name: monthName(month),
      value: sum(
        expenses.filter((expense) => {
          const date = normalizeExpenseDate(expense);
          return date && (!restrictToYear || date.getFullYear() === year) && date.getMonth() === month;
        }),
      ),
    })),
  };
}

function buildDailyExpenseSeries(expenses, year, month) {
  const monthIndex = month - 1;
  const dayCount = monthIndex >= 0 && monthIndex <= 11 ? new Date(year, monthIndex + 1, 0).getDate() : 31;
  return {
    title: 'Günlere Göre Masraf',
    rows: Array.from({ length: dayCount }, (_, index) => ({
      name: String(index + 1),
      value: sum(
        expenses.filter((expense) => {
          const date = normalizeExpenseDate(expense);
          return date && date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === index + 1;
        }),
      ),
    })),
  };
}
