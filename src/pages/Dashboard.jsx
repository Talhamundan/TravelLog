// Ana ekran metrikleri ve hızlı grafik özetlerini üretir.
import { useEffect, useMemo, useState } from 'react';
import { Banknote, BriefcaseBusiness, Gauge, Plus, Route, WalletCards } from 'lucide-react';
import Charts from '../components/Charts';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';
import TravelMap, { defaultDashboardMapFilters, matchesTravelMapFilters } from '../components/TravelMap';
import { formatCurrency, formatDate, formatKm, minutesToDuration } from '../utils/formatters';
import { createStats } from '../utils/analytics';
import { tripProviderLabel } from '../utils/tripDisplay';
import { getTransportColor, normalizeTransportType } from '../constants/transport';
import { getTripRouteSubtitle, getTripRouteTitle } from '../utils/routeDisplay';

export default function Dashboard({ trips, onOpenTrips, onNewTrip, onSeed }) {
  const [mapFilters, setMapFilters] = useState(defaultDashboardMapFilters);
  const [selectedTripId, setSelectedTripId] = useState('');
  const dashboardTransportTypes = useMemo(() => [...new Set(trips.map((trip) => normalizeTransportType(trip.transportType)).filter(Boolean))], [trips]);
  const filteredTrips = useMemo(() => trips.filter((trip) => matchesTravelMapFilters(trip, mapFilters)), [mapFilters, trips]);
  const stats = createStats(filteredTrips);
  const recentTrips = [...filteredTrips].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 5);
  const selectedTrip = filteredTrips.find((trip) => trip.id === selectedTripId) || null;
  const selectedRouteUsage = selectedTrip ? filteredTrips.filter((trip) => getTripRouteTitle(trip) === getTripRouteTitle(selectedTrip)).length : 0;

  useEffect(() => {
    setMapFilters((current) => ({
      ...current,
      transport: current.transport !== 'Tüm rotalar' && !dashboardTransportTypes.includes(current.transport) ? 'Tüm rotalar' : current.transport,
    }));
  }, [dashboardTransportTypes]);

  return (
    <div className="page-stack">
      {!trips.length && <EmptyState onPrimary={onNewTrip} onSeed={onSeed} />}
      <div className="stat-grid hero-stat-grid">
        <StatCard label="Toplam Seyahat" value={stats.totalTrips} icon={BriefcaseBusiness} trend="Geçen yıla göre ↑ 24%" trendType="up" tone="blue" />
        <StatCard label="Bu Yıl Toplam Km" value={formatKm(stats.yearKm)} icon={Route} trend="Geçen yıla göre ↑ 18%" trendType="up" tone="indigo" />
        <StatCard label="Bu Yıl Toplam Masraf" value={formatCurrency(stats.yearCost)} icon={WalletCards} trend="Geçen yıla göre ↑ 27%" trendType="up" tone="pink" />
        <StatCard label="Bu Ay Km" value={formatKm(stats.monthKm)} icon={Gauge} trend="Geçen aya göre ↓ 8%" trendType="down" tone="cyan" />
        <StatCard label="Bu Ay Masraf" value={formatCurrency(stats.monthCost)} icon={Banknote} trend="Geçen aya göre ↑ 12%" trendType="up" tone="amber" />
      </div>
      {trips.length > 0 && (
        <>
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
            <TravelMap
              trips={trips}
              dashboard
              filters={mapFilters}
              onFiltersChange={setMapFilters}
              selectedTripId={selectedTripId}
              onRouteFocus={(trip) => setSelectedTripId(trip?.id || '')}
            />
          </section>
          <div className="dashboard-chart-strip">
            <Charts trips={filteredTrips} compact />
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
                    <time>{formatDate(trip.date)}</time>
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
        </>
      )}
    </div>
  );
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
