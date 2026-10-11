// Ana ekran metrikleri ve hızlı grafik özetlerini üretir.
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Banknote, BriefcaseBusiness, Gauge, Plus, Route, WalletCards } from 'lucide-react';
import DashboardCharts from '../components/DashboardCharts';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';
import { defaultDashboardMapFilters, matchesTravelMapFilters } from '../utils/travelMapFilters';
import { formatCurrency, formatDate, formatKm, minutesToDuration, monthName } from '../utils/formatters';
import { createStats } from '../utils/analytics';
import { tripProviderLabel } from '../utils/tripDisplay';
import { compareTripsByNewestDateTime } from '../utils/tripSorting';
import { getTransportColor, normalizeTransportType } from '../constants/transport';
import { getTripRouteSubtitle, getTripRouteTitle } from '../utils/routeDisplay';

const TravelMap = lazy(() => import('../components/TravelMap'));

export default function Dashboard({ trips, allTrips = trips, yearFilter = '', monthFilter = '', onOpenTrips, onNewTrip, onSeed }) {
  const [mapFilters, setMapFilters] = useState(defaultDashboardMapFilters);
  const [selectedTripId, setSelectedTripId] = useState('');
  const dashboardTransportTypes = useMemo(() => [...new Set(trips.map((trip) => normalizeTransportType(trip.transportType)).filter(Boolean))], [trips]);
  const filteredTrips = useMemo(() => trips.filter((trip) => matchesTravelMapFilters(trip, mapFilters)), [mapFilters, trips]);
  const stats = createStats(filteredTrips);
  const comparisonRange = useMemo(() => previousGlobalDateRange(yearFilter, monthFilter), [monthFilter, yearFilter]);
  const comparisonStats = useMemo(() => createStats(getComparisonTrips(allTrips, mapFilters, comparisonRange)), [allTrips, comparisonRange, mapFilters]);
  const comparisonLabel = dashboardComparisonLabel(yearFilter, monthFilter);
  const periodLabel = dashboardPeriodLabel(yearFilter, monthFilter);
  const recentTrips = [...filteredTrips].sort(compareTripsByNewestDateTime).slice(0, 4);
  const selectedTrip = filteredTrips.find((trip) => trip.id === selectedTripId) || null;
  const selectedRouteUsage = selectedTrip ? filteredTrips.filter((trip) => getTripRouteTitle(trip) === getTripRouteTitle(selectedTrip)).length : 0;

  useEffect(() => {
    setMapFilters((current) => ({
      ...current,
      transport: current.transport !== 'Tüm rotalar' && !dashboardTransportTypes.includes(current.transport) ? 'Tüm rotalar' : current.transport,
    }));
  }, [dashboardTransportTypes]);

  if (!trips.length) {
    return (
      <div className="page-stack">
        <EmptyState onPrimary={onNewTrip} onSeed={onSeed} />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="stat-grid hero-stat-grid">
        <StatCard label="Seyahat" value={stats.totalTrips} icon={BriefcaseBusiness} {...trendProps(stats.totalTrips, comparisonStats.totalTrips, comparisonLabel)} tone="blue" />
        <StatCard label="Toplam Km" value={formatKm(stats.totalKm)} icon={Route} {...trendProps(stats.totalKm, comparisonStats.totalKm, comparisonLabel)} tone="indigo" />
        <StatCard label="Toplam Masraf" value={formatCurrency(stats.totalCost)} icon={WalletCards} {...trendProps(stats.totalCost, comparisonStats.totalCost, comparisonLabel)} tone="pink" />
        <StatCard label="Ortalama Km" value={formatKm(stats.averageTripKm)} icon={Gauge} {...trendProps(stats.averageTripKm, comparisonStats.averageTripKm, comparisonLabel, `Seyahat başına · ${periodLabel}`)} tone="cyan" />
        <StatCard label="Ortalama Masraf" value={formatCurrency(averageTripCost(stats))} icon={Banknote} {...trendProps(averageTripCost(stats), averageTripCost(comparisonStats), comparisonLabel, `Seyahat başına · ${periodLabel}`)} tone="amber" />
      </div>
      <section className="panel pro-panel featured-map">
            {selectedTrip && (
              <div className="trips-map-selection dashboard-map-selection">
                <div>
                  <strong>{getTripRouteTitle(selectedTrip)}</strong>
                  <span>{formatKm(selectedTrip.distanceKm)} · {minutesToDuration(selectedTrip.durationMinutes)} · {formatCurrency(selectedTrip.totalCost, selectedTrip.currency)} · {normalizeTransportType(selectedTrip.transportType)} · {tripProviderLabel(selectedTrip)} · {selectedRouteUsage} kullanım</span>
                </div>
                <button type="button" className="ghost-button" onClick={() => setSelectedTripId('')}>
                  Tüm rotalar
                </button>
              </div>
            )}
            <Suspense fallback={<DashboardMapFallback />}>
              <TravelMap
                trips={trips}
                dashboard
                filters={mapFilters}
                onFiltersChange={setMapFilters}
                selectedTripId={selectedTripId}
                onRouteFocus={(trip) => setSelectedTripId(trip?.id || '')}
              />
            </Suspense>
          </section>
          <div className="dashboard-chart-strip">
            <DashboardCharts trips={filteredTrips} yearFilter={yearFilter} monthFilter={monthFilter} />
          </div>
          <div className="dashboard-grid">
            <section className="panel pro-panel recent-table-panel">
              <div className="panel-heading">
                <h2>Son seyahatler</h2>
                <button className="ghost-button" onClick={onOpenTrips}>Tümünü gör</button>
              </div>
              <div className="recent-table-head">
                <span>Tarih</span>
                <span>Rota</span>
                <span>Ulaşım</span>
                <span>Firma</span>
                <span>Süre</span>
                <span>Km</span>
                <span>Masraf</span>
                <span>Km Başı</span>
              </div>
              <div className="recent-list dashboard-recent-list">
                {recentTrips.map((trip) => (
                  <article
                    className={`recent-trip ${selectedTripId === trip.id ? 'selected-trip-row' : ''}`}
                    key={trip.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedTripId(trip.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedTripId(trip.id);
                      }
                    }}
                  >
                    <time>
                      {formatDate(trip.date)}
                      <small>{trip.departureTime || 'Saat yok'}</small>
                    </time>
                    <div>
                      <strong>{getTripRouteTitle(trip)}</strong>
                      {getTripRouteSubtitle(trip) || trip.routeNote || trip.notes ? <span>{getTripRouteSubtitle(trip) || trip.routeNote || trip.notes}</span> : null}
                    </div>
                    <span className="transport-pill" style={{ '--transport-color': getTransportColor(trip.transportType) }}>{normalizeTransportType(trip.transportType)}</span>
                    <span>{tripProviderLabel(trip)}</span>
                    <span>{minutesToDuration(trip.durationMinutes)}</span>
                    <b>{formatKm(trip.distanceKm)}</b>
                    <span>{formatCurrency(trip.totalCost, trip.currency)}</span>
                    <div>
                      <span>{formatCurrency(Number(trip.totalCost || 0) / Math.max(Number(trip.distanceKm || 0), 1), trip.currency)}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
            <aside className="dashboard-side-stack">
              <MiniCalendar trips={filteredTrips} />
              <button className="new-trip-cta" onClick={onNewTrip}>
                Yeni Seyahat Ekle
                <Plus size={18} />
              </button>
            </aside>
          </div>
    </div>
  );
}

function DashboardMapFallback() {
  return (
    <div className="map-shell map-shell-dark dashboard-map-shell">
      <div className="dashboard-map-controls skeleton-line wide" />
      <div className="travel-map-empty dashboard-map">
        <strong>Harita hazırlanıyor...</strong>
        <span>Rotalar birkaç saniye içinde yüklenecek.</span>
      </div>
    </div>
  );
}

function dashboardPeriodLabel(yearFilter, monthFilter) {
  if (yearFilter && monthFilter) return `${monthName(Number(monthFilter) - 1)} ${yearFilter}`;
  if (yearFilter) return `${yearFilter}`;
  if (monthFilter) return `${monthName(Number(monthFilter) - 1)} · Tüm yıllar`;
  return 'Tüm Zamanlarda';
}

function dashboardComparisonLabel(yearFilter, monthFilter) {
  if (yearFilter && monthFilter) return 'Geçen aya göre';
  if (yearFilter) return 'Geçen yıla göre';
  return '';
}

function trendProps(current, previous, label, fallback) {
  if (!label) return { trend: fallback || 'Seçili dönem', trendType: 'neutral' };
  const currentValue = Number(current) || 0;
  const previousValue = Number(previous) || 0;
  if (!previousValue && !currentValue) return { trend: `${label} değişim yok`, trendType: 'neutral' };
  if (!previousValue) return { trend: `${label} yeni`, trendType: 'up' };

  const change = ((currentValue - previousValue) / previousValue) * 100;
  if (Math.abs(change) < 0.5) return { trend: `${label} değişim yok`, trendType: 'neutral' };
  const direction = change > 0 ? '↑' : '↓';
  return {
    trend: `${label} ${direction} %${Math.abs(Math.round(change))}`,
    trendType: change > 0 ? 'up' : 'down',
  };
}

function averageTripCost(stats) {
  return stats.totalTrips ? stats.totalCost / stats.totalTrips : 0;
}

function getComparisonTrips(trips, filters, comparisonRange) {
  if (!comparisonRange) return [];
  return trips.filter((trip) => matchesTravelMapFilters(trip, filters) && isTripInRange(trip, comparisonRange));
}

function previousGlobalDateRange(yearFilter, monthFilter) {
  if (!yearFilter) return null;
  const year = Number(yearFilter);
  if (!Number.isFinite(year)) return null;
  if (monthFilter) {
    const month = Number(monthFilter) - 1;
    if (!Number.isFinite(month) || month < 0 || month > 11) return null;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    return { start, end };
  }
  const start = new Date(year - 1, 0, 1);
  const end = new Date(year - 1, 11, 31, 23, 59, 59, 999);
  return { start, end };
}

function isTripInRange(trip, range) {
  const date = new Date(trip.date);
  return !Number.isNaN(date.getTime()) && date >= range.start && date <= range.end;
}

function MiniCalendar({ trips }) {
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  const tripsByDay = trips.reduce((acc, trip) => {
    const date = new Date(trip.date);
    if (!Number.isNaN(date.getTime()) && date.getMonth() === month && date.getFullYear() === year) {
      const day = date.getDate();
      acc[day] ||= [];
      acc[day].push(trip);
    }
    return acc;
  }, {});
  const days = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, index) => index + 1);
  const blanks = Array.from({ length: (new Date(year, month, 1).getDay() + 6) % 7 });

  return (
    <section className="panel pro-panel calendar-panel">
      <div className="panel-heading">
        <h2>Seyahat Takvimi</h2>
      </div>
      <div className="calendar-title">Mayıs 2026</div>
      <div className="calendar-week">
        {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="calendar-days">
        {blanks.map((_, index) => <i key={`blank-${index}`} />)}
        {days.map((day) => {
          const dayTrips = tripsByDay[day] || [];
          return (
            <span
              key={day}
              className={`${day === today.getDate() ? 'today' : ''} ${dayTrips.length ? 'has-trip' : ''}`}
              title={dayTrips.map(getTripRouteTitle).join('\n')}
            >
              {day}
              {dayTrips.length > 0 && (
                <small>
                  {dayTrips.length} seyahat
                  <b>{dayTrips.slice(0, 2).map(getTripRouteTitle).join(' • ')}</b>
                </small>
              )}
            </span>
          );
        })}
      </div>
    </section>
  );
}
