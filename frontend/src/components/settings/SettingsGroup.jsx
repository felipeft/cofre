import Card from '@/components/ui/Card'

export default function SettingsGroup({ title, children }) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold text-text-muted uppercase tracking-wide mb-3">{title}</h3>
      <Card className="divide-y divide-border-soft overflow-hidden">{children}</Card>
    </div>
  )
}
