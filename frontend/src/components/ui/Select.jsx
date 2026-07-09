import { ChevronDown } from 'lucide-react'

export default function Select({ label, className = '', children, id, ...props }) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-[13px] font-medium text-text-muted">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={`focus-ring w-full h-11 appearance-none rounded-control bg-surface-2 border border-border pl-3.5 pr-9 text-[15px] text-text transition-colors focus:border-income/50 ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-text-faint"
        />
      </div>
    </div>
  )
}
