import { createChartData } from '../utils/analytics';
import { getTransportColor } from '../constants/transport';
import { formatCurrency, formatKm } from '../utils/formatters';

const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const chartLeft = 38;
const chartRight = 320;
const chartBottom = 112;

export default function DashboardCharts({ trips, yearFilter = '', monthFilter = '' }) {
  const data = createChartData(trips);
  const periodSeries = monthFilter ? createDailySeries(trips, yearFilter, monthFilter) : {
    labels: months,
    km: data.monthly.map((item) => item.km),
    masraf: data.monthly.map((item) => item.masraf),
    kmTitle: 'Aylara Göre Km',
    masrafTitle: 'Aylara Göre Masraf',
  };

  return (
    <div className="chart-grid compact-chart-grid">
      <MiniLineCard title={periodSeries.kmTitle} badge={formatKm(periodSeries.km.reduce((sum, value) => sum + value, 0))} data={periodSeries.km} labels={periodSeries.labels} color="#38bdf8" fill="rgba(56, 189, 248, 0.12)" formatter={formatKm} yFormatter={(value) => `${formatCompactNumber(value)} km`} />
      <MiniLineCard title={periodSeries.masrafTitle} badge={formatCurrency(periodSeries.masraf.reduce((sum, value) => sum + value, 0))} data={periodSeries.masraf} labels={periodSeries.labels} color="#c084fc" fill="rgba(192, 132, 252, 0.13)" formatter={formatCurrency} yFormatter={(value) => `₺${formatCompactNumber(value)}`} />
      <DonutMiniCard items={data.transport.slice(0, 5)} />
      <CompanyMiniCard items={data.companies.slice(0, 5)} />
      <RoutesMiniPanel routes={data.routes.slice(0, 5)} />
    </div>
  );
}

function MiniLineCard({ title, badge, data, labels = months, color, fill, formatter = (value) => value, yFormatter = formatter }) {
  const scale = chartScale(data);
  const points = linePoints(data, scale);
  const area = `${chartLeft},${chartBottom} ${points} ${chartRight},${chartBottom}`;
  const gridIndexes = chartGridIndexes(labels.length);
  const labelIndexes = chartLabelIndexes(labels.length);
  const yTicks = chartYTicks(scale);

  return (
    <section className="panel chart-panel mini-line-card">
      <div className="mini-chart-head">
        <h2>{title}</h2>
        <b>{badge}</b>
      </div>
      <svg viewBox="0 0 320 136" role="img" aria-label={title}>
        <g className="mini-grid">
          {yTicks.map((tick) => {
            const y = pointY(tick, scale);
            return (
              <g key={tick}>
                <line x1={chartLeft} x2={chartRight} y1={y} y2={y} />
                <text x={chartLeft - 6} y={y + 3} textAnchor="end">{yFormatter(tick)}</text>
              </g>
            );
          })}
          {gridIndexes.map((index) => {
            const x = pointX(index, labels.length);
            return <line key={index} x1={x} x2={x} y1="16" y2="112" />;
          })}
          <line className="mini-y-axis" x1={chartLeft} x2={chartLeft} y1="16" y2={chartBottom} />
        </g>
        <polygon points={area} fill={fill} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.split(' ').map((point, index) => {
          const [x, y] = point.split(',');
          return (
            <g key={point} className="mini-chart-point">
              <circle cx={x} cy={y} r="9" fill="transparent" />
              <circle cx={x} cy={y} r="3.4" fill="#102033" stroke={color} strokeWidth="2" />
              <text x={x} y={Number(y) - 12} textAnchor="middle">{formatter(data[index])}</text>
            </g>
          );
        })}
        <g className="mini-x-labels">
          {labels.map((label, index) => (
            labelIndexes.includes(index) ? <text key={`${label}-${index}`} x={pointX(index, labels.length)} y="130" textAnchor="middle">{label}</text> : null
          ))}
        </g>
      </svg>
    </section>
  );
}

function DonutMiniCard({ items }) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  const topItems = items.length ? items : [{ name: 'Diğer', value: 1 }];
  let offset = 25;

  return (
    <section className="panel chart-panel donut-mini-card">
      <h2>Ulaşım Türü Dağılımı</h2>
      <div className="donut-mini-body">
        <svg viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="42" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="18" />
          {topItems.map((item) => {
            const length = (item.value / total) * 264;
            const dash = `${length} ${264 - length}`;
            const currentOffset = offset;
            offset -= length;
            return <circle key={item.name} cx="60" cy="60" r="42" fill="none" stroke={getTransportColor(item.name)} strokeWidth="18" strokeDasharray={dash} strokeDashoffset={currentOffset} strokeLinecap="butt" />;
          })}
          <circle cx="60" cy="60" r="30" fill="#102033" />
        </svg>
        <div className="donut-legend">
          {topItems.map((item) => (
            <div key={item.name}>
              <i style={{ background: getTransportColor(item.name) }} />
              <span>{item.name}</span>
              <b>%{Math.round((item.value / total) * 100)}</b>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CompanyMiniCard({ items }) {
  const rows = items.length ? items : [{ name: 'Diğer', value: 0 }];
  const max = Math.max(...rows.map((item) => item.value), 1);

  return (
    <section className="panel chart-panel company-mini-card">
      <h2>Araç Dağılımı</h2>
      <div className="company-bars">
        {rows.map((item) => (
          <div key={item.name}>
            <span>{item.name}</span>
            <i><em style={{ width: `${Math.max((item.value / max) * 100, 8)}%` }} /></i>
            <b>{item.value}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function RoutesMiniPanel({ routes }) {
  return (
    <section className="panel chart-panel route-mini-panel">
      <h2>En Çok Kullanılan Rotalar</h2>
      <div className="route-mini-list">
        {routes.map((route) => (
          <div key={route.name}>
            <span>{route.name}</span>
            <b>{route.value}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function linePoints(values, scale = chartScale(values)) {
  return values
    .map((value, index) => {
      const x = pointX(index, values.length);
      const y = pointY(value, scale);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function pointX(index, length) {
  return length > 1 ? chartLeft + index * ((chartRight - chartLeft) / (length - 1)) : chartLeft + (chartRight - chartLeft) / 2;
}

function pointY(value, scale) {
  return chartBottom - ((value - scale.min) / scale.range) * 88;
}

function chartScale(values) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  return { min, max, range: Math.max(max - min, 1) };
}

function chartYTicks(scale) {
  return [scale.max, scale.min + scale.range / 2, scale.min];
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0);
}

function chartGridIndexes(length) {
  const step = length > 16 ? 5 : 1;
  return Array.from({ length }, (_, index) => index).filter((index) => index === 0 || index === length - 1 || index % step === 0);
}

function chartLabelIndexes(length) {
  const step = length > 16 ? 4 : 1;
  return Array.from({ length }, (_, index) => index).filter((index) => index === 0 || index === length - 1 || (index + 1) % step === 0);
}

function createDailySeries(trips, yearFilter, monthFilter) {
  const month = Number(monthFilter) - 1;
  const year = Number(yearFilter) || new Date().getFullYear();
  const dayCount = Number.isFinite(month) && month >= 0 && month <= 11 ? new Date(year, month + 1, 0).getDate() : 30;
  const rows = Array.from({ length: dayCount }, (_, index) => ({ label: String(index + 1), km: 0, masraf: 0 }));

  trips.forEach((trip) => {
    const date = new Date(trip.date);
    if (Number.isNaN(date.getTime())) return;
    const dayIndex = date.getDate() - 1;
    if (!rows[dayIndex]) return;
    rows[dayIndex].km += Number.parseFloat(trip.distanceKm) || 0;
    rows[dayIndex].masraf += Number.parseFloat(trip.totalCost) || 0;
  });

  const visibleRows = rows.filter((row) => row.km > 0 || row.masraf > 0);
  const chartRows = visibleRows.length ? visibleRows : [{ label: '-', km: 0, masraf: 0 }];

  return {
    labels: chartRows.map((row) => row.label),
    km: chartRows.map((row) => row.km),
    masraf: chartRows.map((row) => row.masraf),
    kmTitle: 'Günlere Göre Km',
    masrafTitle: 'Günlere Göre Masraf',
  };
}
