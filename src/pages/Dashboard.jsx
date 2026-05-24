// Ana ekran metrikleri ve hızlı grafik özetlerini üretir.
import { Banknote, Building2, CalendarDays, Car, MapPinned, Route, TrendingUp } from 'lucide-react';
import Charts from '../components/Charts';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';
import TravelMap from '../components/TravelMap';
import { formatCurrency, formatDate, formatKm, minutesToDuration } from '../utils/formatters';
import { createStats, groupedSummary, routeKey } from '../utils/analytics';
import { routeLabel } from '../utils/location';

export default function Dashboard({ trips, onOpenTrips, onNewTrip, onSeed }) {
  const stats = createStats(trips);
  const recentTrips = [...trips].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 5);
  const topRoutes = groupedSummary(trips, routeKey).slice(0, 6);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <h1>Dashboard</h1>
          <p>Seyahat arşivinizin yıllık, aylık ve rota bazlı özeti.</p>
        </div>
        <button className="primary-button" onClick={onOpenTrips}>
          Seyahatleri gör
        </button>
      </section>
      {!trips.length && <EmptyState onPrimary={onNewTrip} onSeed={onSeed} />}
      <div className="stat-grid hero-stat-grid">
        <StatCard label="Toplam seyahat" value={stats.totalTrips} icon={Route} />
        <StatCard label="Bu yıl toplam km" value={formatKm(stats.yearKm)} icon={Route} />
        <StatCard label="Bu yıl toplam masraf" value={formatCurrency(stats.yearCost)} icon={Banknote} />
        <StatCard label="Bu ay km" value={formatKm(stats.monthKm)} icon={CalendarDays} />
        <StatCard label="Bu ay masraf" value={formatCurrency(stats.monthCost)} icon={Banknote} />
      </div>
      {trips.length > 0 && (
        <>
          <section className="panel pro-panel featured-map">
            <TravelMap trips={trips} />
          </section>
          <div className="stat-grid insight-stat-grid">
            <StatCard label="Ortalama km / seyahat" value={formatKm(stats.averageTripKm)} icon={TrendingUp} />
            <StatCard label="Ortalama maliyet / km" value={formatCurrency(stats.averageCostPerKm)} icon={TrendingUp} />
            <StatCard label="En çok ulaşım" value={stats.topTransport} icon={Car} />
            <StatCard label="En çok firma" value={stats.topCompany} icon={Building2} />
            <StatCard label="En sık rota" value={stats.topRoute} icon={MapPinned} />
          </div>
          <Charts trips={trips} />
          <div className="dashboard-grid">
            <section className="panel pro-panel">
              <div className="panel-heading">
                <h2>Son seyahatler</h2>
                <button className="ghost-button" onClick={onOpenTrips}>Tümünü gör</button>
              </div>
              <div className="recent-list">
                {recentTrips.map((trip) => (
                  <article className="recent-trip" key={trip.id}>
                    <div>
                      <strong>{routeLabel(trip)}</strong>
                      <span>{formatDate(trip.date)} · {trip.transportType} · {trip.company || '-'}</span>
                    </div>
                    <div>
                      <b>{formatKm(trip.distanceKm)}</b>
                      <span>{formatCurrency(trip.totalCost, trip.currency)}</span>
                    </div>
                    <small>{minutesToDuration(trip.durationMinutes)}</small>
                  </article>
                ))}
              </div>
            </section>
            <section className="panel pro-panel">
              <div className="panel-heading">
                <h2>En çok kullanılan rotalar</h2>
              </div>
              <div className="route-list">
                {topRoutes.map((route) => (
                  <article key={route.name} className="route-row">
                    <strong>{route.name}</strong>
                    <span>{route.count} seyahat</span>
                    <span>{formatKm(route.km)}</span>
                    <span>{formatCurrency(route.cost)}</span>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
