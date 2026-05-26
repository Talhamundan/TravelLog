export default function Badge({ tone = 'blue', className = '', children }) {
  return <span className={`app-badge tone-${tone} ${className}`.trim()}>{children}</span>;
}
