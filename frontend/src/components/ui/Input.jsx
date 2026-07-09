export default function Input({ label, error, className = '', id, ...props }) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-medium text-text-muted">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`focus-ring h-11 rounded-control bg-surface-2 border border-border px-3.5 text-[15px] text-text placeholder:text-text-faint transition-colors focus:border-income/50 ${className}`}
        {...props}
      />
      {error && <span className="text-[12px] text-expense">{error}</span>}
    </div>
  )
}
