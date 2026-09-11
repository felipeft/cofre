export default function AppIcon({ size = 32, className = '', alt = '' }) {
  return (
    <span
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : 'true'}
      className={`relative inline-block shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <img src="/icon-192-nobg.png" alt="" draggable="false" className="app-icon-light absolute inset-0 h-full w-full object-contain" />
      <img src="/icon-192.png" alt="" draggable="false" className="app-icon-dark absolute inset-0 h-full w-full rounded-[22%] object-cover" />
    </span>
  )
}
