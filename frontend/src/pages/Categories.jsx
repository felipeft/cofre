import { useState } from 'react'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import Dialog from '@/components/ui/Dialog'
import CategoryIcon from '@/components/ui/CategoryIcon'
import EmptyState from '@/components/ui/EmptyState'
import { mockCategories as initialCategories } from '@/services/mockCategories'
import { useToast } from '@/context/ToastContext'

const colorPalette = ['#3ecf8e', '#5b9ef5', '#f5a25b', '#f2666a', '#a78bfa', '#f5c15b', '#5bc8f5', '#8b8b93']
const iconOptions = ['ShoppingCart', 'Car', 'UtensilsCrossed', 'Home', 'HeartPulse', 'Popcorn', 'RefreshCw', 'GraduationCap', 'Wallet', 'Laptop', 'TrendingUp', 'MoreHorizontal']

export default function Categories() {
  const [categories, setCategories] = useState(initialCategories)
  const [modalState, setModalState] = useState(null) // { mode: 'create'|'edit', category }
  const [deleting, setDeleting] = useState(null)
  const { showToast } = useToast()

  const expenseCats = categories.filter((c) => c.type === 'expense')
  const incomeCats = categories.filter((c) => c.type === 'income')

  const handleSave = (data) => {
    if (modalState.mode === 'create') {
      setCategories((prev) => [...prev, { ...data, id: `${data.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}` }])
      showToast('Categoria criada')
    } else {
      setCategories((prev) => prev.map((c) => (c.id === modalState.category.id ? { ...c, ...data } : c)))
      showToast('Categoria atualizada')
    }
    setModalState(null)
  }

  const handleDelete = () => {
    setCategories((prev) => prev.filter((c) => c.id !== deleting.id))
    showToast('Categoria excluída', 'info')
    setDeleting(null)
  }

  return (
    <div>
      <Header
        title="Categorias"
        subtitle="Organize como suas movimentações são classificadas"
        actions={
          <Button icon={Plus} onClick={() => setModalState({ mode: 'create' })}>
            Nova
          </Button>
        }
      />

      <div className="px-5 md:px-8 pb-8 flex flex-col gap-6">
        <CategoryGroup
          title="Despesas"
          categories={expenseCats}
          onEdit={(c) => setModalState({ mode: 'edit', category: c })}
          onDelete={setDeleting}
        />
        <CategoryGroup
          title="Receitas"
          categories={incomeCats}
          onEdit={(c) => setModalState({ mode: 'edit', category: c })}
          onDelete={setDeleting}
        />
      </div>

      <Modal open={!!modalState} onClose={() => setModalState(null)} title={modalState?.mode === 'edit' ? 'Editar categoria' : 'Nova categoria'}>
        {modalState && (
          <CategoryForm
            initial={modalState.category}
            onSubmit={handleSave}
            onCancel={() => setModalState(null)}
          />
        )}
      </Modal>

      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Excluir categoria"
        description={`Excluir "${deleting?.name}"? Movimentações existentes nessa categoria não serão removidas.`}
        confirmLabel="Excluir"
      />
    </div>
  )
}

function CategoryGroup({ title, categories, onEdit, onDelete }) {
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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${c.color}1a`, color: c.color }}>
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

function CategoryForm({ initial, onSubmit, onCancel }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState(initial?.type ?? 'expense')
  const [color, setColor] = useState(initial?.color ?? colorPalette[0])
  const [icon, setIcon] = useState(initial?.icon ?? iconOptions[0])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), type, color, icon })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Pets" autoFocus />

      <Select label="Tipo" value={type} onChange={(e) => setType(e.target.value)}>
        <option value="expense">Despesa</option>
        <option value="income">Receita</option>
      </Select>

      <div>
        <label className="text-[13px] font-medium text-text-muted mb-1.5 block">Cor</label>
        <div className="flex flex-wrap gap-2">
          {colorPalette.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              className={`focus-ring h-8 w-8 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-offset-surface ring-text' : ''}`}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="text-[13px] font-medium text-text-muted mb-1.5 block">Ícone</label>
        <div className="grid grid-cols-6 gap-2">
          {iconOptions.map((i) => (
            <button
              type="button"
              key={i}
              onClick={() => setIcon(i)}
              className={`focus-ring flex h-9 items-center justify-center rounded-control border transition-colors ${
                icon === i ? 'border-income/50 bg-income/10 text-income' : 'border-border text-text-muted hover:text-text'
              }`}
            >
              <CategoryIcon name={i} size={16} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mt-1">
        <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1">
          Salvar
        </Button>
      </div>
    </form>
  )
}
