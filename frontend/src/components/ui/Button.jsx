const variants = {
  primary: 'bg-income text-black hover:brightness-110 active:brightness-95',
  secondary: 'bg-surface-3 text-text hover:bg-[#2a2a2e] border border-border',
  ghost: 'bg-transparent text-text-muted hover:text-text hover:bg-surface-2',
  danger: 'bg-expense/15 text-expense border border-expense/30 hover:bg-expense/25',
}

const sizes = {
  sm: 'h-8 px-3 text-[13px] rounded-[8px]',
  md: 'h-11 px-4 text-[14px] rounded-control',
  lg: 'h-[52px] px-5 text-[15px] rounded-control',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconOnly = false,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      className={`focus-ring inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none select-none ${variants[variant]} ${sizes[size]} ${iconOnly ? 'aspect-square px-0' : ''} ${className}`}
      {...props}
    >
      {Icon && <Icon size={16} strokeWidth={2} />}
      {children}
    </button>
  )
}
