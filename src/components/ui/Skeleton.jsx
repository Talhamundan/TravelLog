export default function Skeleton({ className = '', count = 1 }) {
  return (
    <div className={`ui-skeleton-stack ${className}`.trim()}>
      {Array.from({ length: count }, (_, index) => (
        <div className="ui-skeleton" key={index} />
      ))}
    </div>
  );
}
