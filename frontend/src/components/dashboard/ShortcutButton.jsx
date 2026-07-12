export default function ShortcutButton({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="focus-ring flex items-center gap-2.5 rounded-card bg-surface border border-border-soft px-4 h-14 text-[14px] font-medium text-text-muted hover:text-text hover:border-border transition-colors"
    >
      <Icon size={17} strokeWidth={2} />
      {label}
    </button>
  )
}
