// Tam ekran seyahat haritası ve rota analiz paneli.
import { useMemo, useState } from 'react';
import CustomSelect from '../components/ui/CustomSelect';
import TravelMap from '../components/TravelMap';
import { TRANSPORT_TYPES } from '../constants/travel';
import { createStats, toNumber } from '../utils/analytics';
import { formatCurrency, formatKm } from '../utils/formatters';
import { routeLabel } from '../utils/location';

export default function MapPage({ trips, companies }) {
  const [filters, setFilters] = useState({ year: '', month: '', transportType: '', company: '' });
  const years = [...new Set(trips.map((trip) => new Date(trip.date).getFullYear()).filter(Boolean))].sort((a, b) => b - a);
  const filtered = useMemo(
    () =>
      trips.filter((trip) => {
        const date = new Date(trip.date);
        return (
          (!filters.year || date.getFullYear() === Number(filters.year)) &&
          (!filters.month || date.getMonth() + 1 === Number(filters.month)) &&
          (!filters.transportType || trip.transportType === filters.transportType) &&
          (!filters.company || trip.company === filters.company)
        );
      }),
    [filters, trips],
  );
  const stats = createStats(filtered);
  const longest = [...filtered].sort((a, b) => toNumber(b.distanceKm) - toNumber(a.distanceKm))[0];
  const expensive = [...filtered].sort((a, b) => toNumber(b.totalCost) - toNumber(a.totalCost))[0];

  return (
    <div className="page-stack map-page">
      <section className="page-heading">
        <div>
          <h1>Harita</h1>
          <p>Türkiye geneli tüm yolculuklar, filtreler ve rota istihbaratı.</p>
        </div>
      </section>
      <section className="panel map-filter-panel">
        <CustomSelect value={filters.year} options={['', ...years.map(String)].map((value) => ({ value, label: value || 'Tüm yıllar' }))} onChange={(value) => setFilters({ ...filters, year: value })} />
        <CustomSelect value={filters.month} options={['', ...Array.from({ length: 12 }, (_, i) => String(i + 1))].map((value) => ({ value, label: value || 'Tüm aylar' }))} onChange={(value) => setFilters({ ...filters, month: value })} />
        <CustomSelect value={filters.transportType} options={['', ...TRANSPORT_TYPES].map((value) => ({ value, label: value || 'Tüm ulaşım' }))} onChange={(value) => setFilters({ ...filters, transportType: value })} />
        <CustomSelect value={filters.company} options={['', ...companies].map((value) => ({ value, label: value || 'Tüm firmalar' }))} onChange={(value) => setFilters({ ...filters, company: value })} />
      </section>
      <div className="map-analysis-grid">
        <section className="panel pro-panel">
          <TravelMap trips={filtered} />
        </section>
        <aside className="panel map-side-panel">
          <h2>Rota Özeti</h2>
          <Metric label="Seyahat sayısı" value={stats.totalTrips} />
          <Metric label="Toplam km" value={formatKm(stats.totalKm)} />
          <Metric label="Toplam masraf" value={formatCurrency(stats.totalCost)} />
          <Metric label="En uzun rota" value={longest ? `${routeLabel(longest)} · ${formatKm(longest.distanceKm)}` : '-'} />
          <Metric label="En pahalı rota" value={expensive ? `${routeLabel(expensive)} · ${formatCurrency(expensive.totalCost)}` : '-'} />
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="map-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
