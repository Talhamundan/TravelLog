// Dashboard metriklerini kompakt kartlarla gösterir.
export default function StatCard({ label, value, icon: Icon, trend = 'Geçen aya göre ↑ 12%', trendType = 'up', tone = 'blue' }) {
  return (
    <article className={`stat-card kpi-card tone-${tone}`}>
      <div className="kpi-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small className={trendType}>{trend}</small>
      </div>
      {Icon && (
        <span className="kpi-icon">
          <Icon size={25} />
        </span>
      )}
    </article>
  );
}
