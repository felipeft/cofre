export function Spinner({ size = 18 }) {
  return (
    <svg
      className="animate-spin text-text-muted"
      style={{ width: size, height: size }}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function SkeletonRow({ className = '' }) {
  return <div className={`animate-pulse rounded-control bg-surface-2 ${className}`} />
}
