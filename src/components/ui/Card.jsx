export default function Card({ as: Tag = 'section', className = '', children, ...props }) {
  return (
    <Tag className={`panel ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}
