import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import { getTransportColor } from '../../constants/transport';

const tooltipStyle = {
  background: 'rgba(15, 23, 42, 0.96)',
  border: '1px solid rgba(148, 163, 184, 0.24)',
  borderRadius: 8,
  color: '#e5edf8',
};

export default function ExpenseCharts({ analytics }) {
  const { category, monthly, transport, company, city } = analytics.charts;

  return (
    <section className="expense-chart-grid">
      <article className="expense-chart-card">
        <h2>Kategoriye Göre Dağılım</h2>
        <div className="donut-layout">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={category} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>
                {category.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            {category.slice(0, 7).map((item) => (
              <span key={item.name}>
                <i style={{ background: item.color }} />
                {item.name}
                <b>{formatCurrency(item.value)}</b>
              </span>
            ))}
          </div>
        </div>
      </article>

      <article className="expense-chart-card wide">
        <h2>Aylara Göre Masraf</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={monthly}>
            <defs>
              <linearGradient id="expenseLine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.65} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" stroke="#8ea3bd" />
            <YAxis stroke="#8ea3bd" tickFormatter={(value) => `₺${Math.round(value / 1000)}K`} />
            <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={3} fill="url(#expenseLine)" />
          </AreaChart>
        </ResponsiveContainer>
      </article>

      <article className="expense-chart-card">
        <h2>Ulaşıma Göre Maliyet</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={transport}>
            <XAxis dataKey="name" stroke="#8ea3bd" />
            <YAxis stroke="#8ea3bd" />
            <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={tooltipStyle} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {transport.map((entry) => <Cell key={entry.name} fill={getTransportColor(entry.name)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </article>

      <article className="expense-chart-card">
        <h2>Firma Bazlı Harcama</h2>
        <div className="rank-list">
          {company.length ? company.map((item) => <RankRow key={item.name} item={item} max={company[0].value} />) : <p className="empty-inline">Firma verisi yok.</p>}
        </div>
      </article>

      <article className="expense-chart-card">
        <h2>Şehir Bazlı Harcama</h2>
        <div className="heat-list">
          {city.length ? city.map((item) => <RankRow key={item.name} item={item} max={city[0].value} />) : <p className="empty-inline">Şehir verisi yok.</p>}
        </div>
      </article>
    </section>
  );
}

function RankRow({ item, max }) {
  const percent = Math.max(8, Math.round((item.value / Math.max(max, 1)) * 100));
  return (
    <div className="rank-row">
      <div>
        <strong>{item.name}</strong>
        <span>{formatCurrency(item.value)}</span>
      </div>
      <i><b style={{ width: `${percent}%` }} /></i>
    </div>
  );
}
