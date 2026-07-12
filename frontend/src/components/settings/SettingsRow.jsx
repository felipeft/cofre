import { ChevronRight } from 'lucide-react'

export default function SettingsRow({ icon: Icon, label, value, onClick }) {
  return (
    <button
      onClick={onClick}
      className="focus-ring w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-2/60 transition-colors"
    >
      <Icon size={17} className="text-text-muted shrink-0" strokeWidth={2} />
      <span className="flex-1 text-[14px] text-text">{label}</span>
      {value && <span className="text-[13px] text-text-faint">{value}</span>}
      <ChevronRight size={16} className="text-text-faint shrink-0" />
    </button>
  )
}
