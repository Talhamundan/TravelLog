export default function Button({ variant = 'primary', className = '', children, ...props }) {
  const classMap = {
    primary: 'primary-button',
    secondary: 'secondary-button',
    ghost: 'ghost-button',
    icon: 'icon-button',
  };
  return (
    <button className={`${classMap[variant] || classMap.primary} ${className}`.trim()} type="button" {...props}>
      {children}
    </button>
  );
}
