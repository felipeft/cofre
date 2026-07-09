export default function Badge({ color, children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${className}`}
      style={
        color
          ? { backgroundColor: `${color}1a`, color, border: `1px solid ${color}33` }
          : undefined
      }
    >
      {children}
    </span>
  )
}
