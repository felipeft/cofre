import { useState } from 'react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import CategoryIcon from '@/components/ui/CategoryIcon'
import { CATEGORY_COLOR_PALETTE, CATEGORY_ICON_OPTIONS } from '@/constants/categories'
import { DEFAULT_OFFER_RATE, DEFAULT_TITHE_RATE } from '@/constants/financialRules'

// Backend guarda a taxa como fração (0.01), mas o campo é mais natural de
// digitar em porcentagem (1) — essa conversão fica só na borda do form.
const toPercentString = (rate) => String(rate * 100)
const toFraction = (percentString) => {
  const value = Number(String(percentString).replace(',', '.'))
  return Number.isFinite(value) ? value / 100 : 0
}
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/

export default function CategoryForm({ initial, onSubmit, onCancel }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState(initial?.type ?? 'expense')
  const [color, setColor] = useState(initial?.color ?? CATEGORY_COLOR_PALETTE[0])
  const [customColor, setCustomColor] = useState(initial?.color ?? CATEGORY_COLOR_PALETTE[0])
  const [icon, setIcon] = useState(initial?.icon ?? CATEGORY_ICON_OPTIONS[0])

  // Regras financeiras (oferta/dízimo) — só fazem sentido para categorias de
  // receita (ver backend/src/domain/financialRules.js). Os campos usados
  // aqui são exatamente os que a API já espera: applyOffer, offerRate,
  // applyTithe, titheRate — nenhum campo novo foi inventado.
  const [applyOffer, setApplyOffer] = useState(initial?.applyOffer ?? false)
  const [offerRatePercent, setOfferRatePercent] = useState(
    toPercentString(initial?.offerRate ?? DEFAULT_OFFER_RATE)
  )
  const [applyTithe, setApplyTithe] = useState(initial?.applyTithe ?? false)
  const [titheRatePercent, setTitheRatePercent] = useState(
    toPercentString(initial?.titheRate ?? DEFAULT_TITHE_RATE)
  )

  const [submitting, setSubmitting] = useState(false)

  const isIncome = type === 'income'
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
        // Despesa nunca carrega regra de oferta/dízimo — o backend já
        // recusaria (categoria de despesa não pode ativar essas flags),
        // mas o formulário garante que a intenção nem chega a ser enviada.
        applyOffer: isIncome ? applyOffer : false,
        offerRate: isIncome && applyOffer ? toFraction(offerRatePercent) : null,
        applyTithe: isIncome ? applyTithe : false,
        titheRate: isIncome && applyTithe ? toFraction(titheRatePercent) : null,
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

      {isIncome && (
        <div className="flex flex-col gap-3 rounded-control bg-surface-2 border border-border-soft p-3">
          <span className="text-[13px] font-medium text-text">Regras financeiras</span>

          <RuleToggle
            label="Aplicar oferta"
            value={applyOffer}
            onChange={setApplyOffer}
          />
          {applyOffer && (
            <Input
              label="Taxa da oferta (%)"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="0.01"
              value={offerRatePercent}
              onChange={(e) => setOfferRatePercent(e.target.value)}
            />
          )}

          <RuleToggle
            label="Aplicar dízimo"
            value={applyTithe}
            onChange={setApplyTithe}
          />
          {applyTithe && (
            <Input
              label="Taxa do dízimo (%)"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="0.01"
              value={titheRatePercent}
              onChange={(e) => setTitheRatePercent(e.target.value)}
            />
          )}
        </div>
      )}

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

function RuleToggle({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-text-muted">{label}</span>
      <div className="grid grid-cols-2 gap-1 rounded-[8px] bg-surface-3 p-1">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`focus-ring h-7 px-3 rounded-[6px] text-[12px] font-medium transition-colors ${
            value ? 'bg-income/15 text-income' : 'text-text-faint'
          }`}
        >
          Sim
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`focus-ring h-7 px-3 rounded-[6px] text-[12px] font-medium transition-colors ${
            !value ? 'bg-surface text-text' : 'text-text-faint'
          }`}
        >
          Não
        </button>
      </div>
    </div>
  )
}
