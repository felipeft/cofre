import { Pencil, Trash2, Tag } from 'lucide-react'
import Card from '@/components/ui/Card'
import CategoryIcon from '@/components/ui/CategoryIcon'
import EmptyState from '@/components/ui/EmptyState'

export default function CategoryGroup({ title, categories, onEdit, onDelete }) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold text-text-muted uppercase tracking-wide mb-3">{title}</h3>
      {categories.length === 0 ? (
        <Card>
          <EmptyState icon={Tag} title={`Nenhuma categoria de ${title.toLowerCase()}`} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((c) => (
            <Card key={c.id} className="group p-4 flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${c.color}1a`, color: c.color }}
              >
                <CategoryIcon name={c.icon} size={18} />
              </div>
              <span className="flex-1 text-[14px] font-medium text-text truncate">{c.name}</span>
              <div className="hidden group-hover:flex items-center gap-1">
                <button onClick={() => onEdit(c)} className="focus-ring rounded-[6px] p-1.5 text-text-faint hover:text-text hover:bg-surface-2" aria-label="Editar">
                  <Pencil size={14} />
                </button>
                <button onClick={() => onDelete(c)} className="focus-ring rounded-[6px] p-1.5 text-text-faint hover:text-expense hover:bg-expense/10" aria-label="Excluir">
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
