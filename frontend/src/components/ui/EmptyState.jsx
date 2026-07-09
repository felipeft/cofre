export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-text-faint">
          <Icon size={22} strokeWidth={1.5} />
        </div>
      )}
      <p className="text-[15px] font-medium text-text mb-1">{title}</p>
      {description && <p className="text-[13px] text-text-muted max-w-[280px]">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
