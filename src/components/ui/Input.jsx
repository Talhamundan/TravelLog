export default function Input({ className = '', ...props }) {
  return <input className={`app-input ${className}`.trim()} {...props} />;
}
