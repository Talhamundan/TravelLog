// Ana ekran metrikleri ve hızlı grafik özetlerini üretir.
import { Banknote, BriefcaseBusiness, Eye, Gauge, Pencil, Plus, Route, Trash2, WalletCards } from 'lucide-react';
import Charts from '../components/Charts';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';
import TravelMap from '../components/TravelMap';
import { formatCurrency, formatDate, formatKm, minutesToDuration } from '../utils/formatters';
import { createStats } from '../utils/analytics';
import { routeLabel } from '../utils/location';
import { tripProviderLabel } from '../utils/tripDisplay';

export default function Dashboard({ trips, onOpenTrips, onNewTrip, onSeed, onEdit, onDelete, onDetail }) {
  const stats = createStats(trips);
  const recentTrips = [...trips].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 5);

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
            <TravelMap trips={trips} />
          </section>
          <div className="dashboard-chart-strip">
            <Charts trips={trips} compact />
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
                <span>İşlemler</span>
              </div>
              <div className="recent-list dashboard-recent-list">
                {recentTrips.map((trip) => (
                  <article className="recent-trip" key={trip.id}>
                    <time>{formatDate(trip.date)}</time>
                    <div>
                      <strong>{routeLabel(trip)}</strong>
                      <span>{trip.routeNote || trip.notes || '-'}</span>
                    </div>
                    <span className={`transport-pill transport-${trip.transportType || 'Diğer'}`}>{trip.transportType || 'Diğer'}</span>
                    <span>{tripProviderLabel(trip)}</span>
                    <span>{minutesToDuration(trip.durationMinutes)}</span>
                    <b>{formatKm(trip.distanceKm)}</b>
                    <span>{formatCurrency(trip.totalCost, trip.currency)}</span>
                    <div>
                      <span>{formatCurrency(Number(trip.totalCost || 0) / Math.max(Number(trip.distanceKm || 0), 1), trip.currency)}</span>
                    </div>
                    <div className="mini-actions">
                      <button title="Detay" onClick={() => onDetail?.(trip)}><Eye size={14} /></button>
                      <button title="Düzenle" onClick={() => onEdit?.(trip)}><Pencil size={14} /></button>
                      <button title="Sil" onClick={() => onDelete?.(trip)}><Trash2 size={14} /></button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
            <aside className="dashboard-side-stack">
              <MiniCalendar trips={trips} />
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
              title={dayTrips.map(routeLabel).join('\n')}
            >
              {day}
              {dayTrips.length > 0 && (
                <small>
                  {dayTrips.length} seyahat
                  <b>{dayTrips.slice(0, 2).map(routeLabel).join(' • ')}</b>
                </small>
              )}
            </span>
          );
        })}
      </div>
    </section>
  );
}
