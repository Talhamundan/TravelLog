// Dashboard metriklerini kompakt kartlarla gösterir.
export default function StatCard({ label, value, icon: Icon }) {
  return (
    <article className="stat-card">
      {Icon && <Icon size={20} />}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
