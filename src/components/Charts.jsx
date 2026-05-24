// Recharts grafiklerini tek bileşende toplar; rapor ve dashboard ekranlarında kullanılır.
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { createChartData } from '../utils/analytics';
import EmptyState from './EmptyState';

const colors = ['#2563eb', '#16a34a', '#f97316', '#dc2626', '#7c3aed', '#0891b2', '#4b5563', '#ca8a04'];

export default function Charts({ trips, compact = false }) {
  const data = createChartData(trips);
  const height = compact ? 260 : 320;

  if (!trips.length) return <EmptyState title="Henüz kayıt yok" />;

  return (
    <div className="chart-grid">
      <ChartPanel title="Aylara göre toplam km">
        <ResponsiveContainer height={height}>
          <BarChart data={data.monthly}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="km" fill="#2563eb" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>
      <ChartPanel title="Aylara göre toplam masraf">
        <ResponsiveContainer height={height}>
          <LineChart data={data.monthly}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line dataKey="masraf" stroke="#16a34a" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartPanel>
      <ChartPanel title="Ulaşım türüne göre dağılım">
        <ResponsiveContainer height={height}>
          <PieChart>
            <Pie data={data.transport} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} label>
              {data.transport.map((_, index) => (
                <Cell key={index} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartPanel>
      <ChartPanel title="Firmalara göre seyahat sayısı">
        <ResponsiveContainer height={height}>
          <BarChart data={data.companies}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#f97316" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>
      {!compact && (
        <>
          <ChartPanel title="Yıllara göre toplam km ve masraf">
            <ResponsiveContainer height={height}>
              <BarChart data={data.years}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="km" fill="#2563eb" radius={[5, 5, 0, 0]} />
                <Bar dataKey="masraf" fill="#16a34a" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>
          <ChartPanel title="En çok kullanılan rotalar">
            <ResponsiveContainer height={height}>
              <BarChart data={data.routes} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={130} />
                <Tooltip />
                <Bar dataKey="value" fill="#0891b2" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>
        </>
      )}
    </div>
  );
}

function ChartPanel({ title, children }) {
  return (
    <section className="panel chart-panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
