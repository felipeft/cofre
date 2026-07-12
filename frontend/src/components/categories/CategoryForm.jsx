import { useState } from 'react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import CategoryIcon from '@/components/ui/CategoryIcon'
import { CATEGORY_COLOR_PALETTE, CATEGORY_ICON_OPTIONS } from '@/constants/categories'

export default function CategoryForm({ initial, onSubmit, onCancel }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState(initial?.type ?? 'expense')
  const [color, setColor] = useState(initial?.color ?? CATEGORY_COLOR_PALETTE[0])
  const [icon, setIcon] = useState(initial?.icon ?? CATEGORY_ICON_OPTIONS[0])

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
          {CATEGORY_COLOR_PALETTE.map((c) => (
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
          {CATEGORY_ICON_OPTIONS.map((i) => (
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
