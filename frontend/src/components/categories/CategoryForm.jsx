import { useState } from 'react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import CategoryIcon from '@/components/ui/CategoryIcon'
import { CATEGORY_COLOR_PALETTE, CATEGORY_ICON_OPTIONS } from '@/constants/categories'
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/

export default function CategoryForm({ initial, onSubmit, onCancel }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState(initial?.type ?? 'expense')
  const [color, setColor] = useState(initial?.color ?? CATEGORY_COLOR_PALETTE[0])
  const [customColor, setCustomColor] = useState(initial?.color ?? CATEGORY_COLOR_PALETTE[0])
  const [icon, setIcon] = useState(initial?.icon ?? CATEGORY_ICON_OPTIONS[0])

  const [submitting, setSubmitting] = useState(false)

  const colorIsValid = HEX_COLOR_REGEX.test(color)

  const chooseCustomColor = (value) => {
    setCustomColor(value)
    if (HEX_COLOR_REGEX.test(value)) setColor(value.toLowerCase())
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !colorIsValid) return

    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        type,
        color,
        icon,
      })
    } finally {
      setSubmitting(false)
    }
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
              onClick={() => {
                setColor(c)
                setCustomColor(c)
              }}
              className={`focus-ring h-8 w-8 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-offset-surface ring-text' : ''}`}
              style={{ backgroundColor: c }}
              aria-label={c}
              aria-pressed={color === c}
            />
          ))}
        </div>
        <div className="mt-3 flex items-end gap-3 rounded-control border border-border-soft bg-surface-2 p-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="category-custom-color" className="text-[12px] text-text-muted">Cor personalizada</label>
            <input
              id="category-custom-color"
              type="color"
              value={colorIsValid ? color : CATEGORY_COLOR_PALETTE[0]}
              onChange={(e) => chooseCustomColor(e.target.value)}
              className="focus-ring h-11 w-14 cursor-pointer rounded-control border border-border bg-transparent p-1"
              aria-label="Escolher cor no espectro"
            />
          </div>
          <Input
            label="Hexadecimal"
            value={customColor}
            onChange={(e) => chooseCustomColor(e.target.value)}
            placeholder="#3ecf8e"
            maxLength={7}
            error={customColor && !HEX_COLOR_REGEX.test(customColor) ? 'Use o formato #RRGGBB.' : ''}
            className="font-mono uppercase"
          />
          <div className="mb-0.5 h-10 w-10 shrink-0 rounded-full border border-border" style={{ backgroundColor: colorIsValid ? color : 'transparent' }} />
        </div>
      </div>

      <div>
        <label className="text-[13px] font-medium text-text-muted mb-1.5 block">Ícone</label>
        <div className="grid max-h-48 grid-cols-6 gap-2 overflow-y-auto pr-1 sm:grid-cols-8">
          {CATEGORY_ICON_OPTIONS.map((i) => (
            <button
              type="button"
              key={i}
              onClick={() => setIcon(i)}
              className={`focus-ring flex h-9 items-center justify-center rounded-control border transition-colors ${
                icon === i ? 'border-income/50 bg-income/10 text-income' : 'border-border text-text-muted hover:text-text'
              }`}
              title={i}
              aria-label={`Ícone ${i}`}
              aria-pressed={icon === i}
            >
              <CategoryIcon name={i} size={16} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mt-1">
        <Button type="button" variant="ghost" className="flex-1" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={submitting || !colorIsValid}>
          {submitting ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}
