export default function Table({ className = '', children }) {
  return (
    <div className={`table-wrap app-table ${className}`.trim()}>
      <table>{children}</table>
    </div>
  );
}
