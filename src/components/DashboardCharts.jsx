import { createChartData } from '../utils/analytics';
import { getTransportColor } from '../constants/transport';
import { formatCurrency, formatKm } from '../utils/formatters';

const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export default function DashboardCharts({ trips }) {
  const data = createChartData(trips);

  return (
    <div className="chart-grid compact-chart-grid">
      <MiniLineCard title="Aylara Göre Km" badge={formatKm(data.monthly.reduce((sum, item) => sum + item.km, 0))} data={data.monthly.map((item) => item.km)} color="#38bdf8" fill="rgba(56, 189, 248, 0.12)" formatter={formatKm} />
      <MiniLineCard title="Aylara Göre Masraf" badge={formatCurrency(data.monthly.reduce((sum, item) => sum + item.masraf, 0))} data={data.monthly.map((item) => item.masraf)} color="#c084fc" fill="rgba(192, 132, 252, 0.13)" formatter={formatCurrency} />
      <DonutMiniCard items={data.transport.slice(0, 5)} />
      <CompanyMiniCard items={data.companies.slice(0, 5)} />
      <RoutesMiniPanel routes={data.routes.slice(0, 5)} />
    </div>
  );
}

function MiniLineCard({ title, badge, data, color, fill, formatter = (value) => value }) {
  const points = linePoints(data);
  const area = `0,112 ${points} 320,112`;
  return (
    <section className="panel chart-panel mini-line-card">
      <div className="mini-chart-head">
        <h2>{title}</h2>
        <b>{badge}</b>
      </div>
      <svg viewBox="0 0 320 128" role="img" aria-label={title}>
        <g className="mini-grid">
          {months.map((_, index) => <line key={index} x1={index * 29} x2={index * 29} y1="16" y2="112" />)}
          {[28, 56, 84, 112].map((y) => <line key={y} x1="0" x2="320" y1={y} y2={y} />)}
        </g>
        <polygon points={area} fill={fill} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.split(' ').map((point, index) => {
          const [x, y] = point.split(',');
          return (
            <g key={point} className="mini-chart-point">
              <circle cx={x} cy={y} r="9" fill="transparent" />
              <circle cx={x} cy={y} r="3.4" fill="#102033" stroke={color} strokeWidth="2" />
              <text x={x} y={Number(y) - 12} textAnchor="middle">{months[index]}: {formatter(data[index])}</text>
            </g>
          );
        })}
      </svg>
      <div className="mini-months">{months.map((month) => <span key={month}>{month}</span>)}</div>
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

function linePoints(values) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  return values
    .map((value, index) => {
      const x = index * (320 / 11);
      const y = 112 - ((value - min) / range) * 88;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
