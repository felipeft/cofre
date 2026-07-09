export default function Card({ className = '', children, as: Tag = 'div', ...props }) {
  return (
    <Tag
      className={`rounded-card bg-surface border border-border-soft ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}
