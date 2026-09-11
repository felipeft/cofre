export default function AppIcon({ size = 32, className = '', alt = '' }) {
  return (
    <img
      src="/icon-192.png"
      alt={alt}
      width={size}
      height={size}
      draggable="false"
      className={`shrink-0 select-none rounded-[22%] object-cover ${className}`}
    />
  )
}
