import { useEffect, useState } from 'react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { useCategories } from '@/hooks/useCategories'
import { useCards } from '@/hooks/useCards'
import { formatDateInput, formatCurrency, formatPercent } from '@/utils/formatters'
import { DEFAULT_OFFER_RATE, DEFAULT_TITHE_RATE } from '@/constants/financialRules'

const defaultState = {
  type: 'expense',
  amount: '',
  categoryId: '',
  description: '',
  date: formatDateInput(),
}

export default function TransactionForm({ initial, onSubmit, onCancel, submitLabel = 'Salvar' }) {
  const [form, setForm] = useState(initial ?? defaultState)
  const [amountFocused, setAmountFocused] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { categories: allCategories, loading: categoriesLoading } = useCategories()
  const { cards: allCards, loading: cardsLoading } = useCards()

  // Forma de pagamento — só existe para despesa (cartão de crédito não faz
  // sentido para receita, ver backend/src/services/transaction.service.js).
  // 'normal' nunca envia cardId nenhum; o comportamento fica idêntico ao de
  // antes desta etapa.
  const [paymentMethod, setPaymentMethod] = useState(initial?.card ? 'card' : 'normal')
  const [cardId, setCardId] = useState(initial?.card?.id ?? '')
  const [installments, setInstallments] = useState(initial?.installments?.total ? String(initial.installments.total) : '1')

  const categories = allCategories.filter((c) => c.type === form.type)
  const activeCards = allCards.filter((c) => c.isActive)

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  // Categorias chegam via API de forma assíncrona — se a categoria
  // selecionada deixar de existir na lista carregada (ou nenhuma tiver sido
  // escolhida ainda), cai para a primeira opção válida do tipo atual assim
  // que os dados chegam.
  useEffect(() => {
    if (categoriesLoading) return
    const stillValid = categories.some((c) => c.id === form.categoryId)
    if (!stillValid) {
      set({ categoryId: categories[0]?.id ?? '' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriesLoading, form.type, allCategories])

  // Trocar para receita zera qualquer escolha de cartão — receita nunca usa
  // cartão de crédito neste domínio.
  useEffect(() => {
    if (form.type === 'income') {
      setPaymentMethod('normal')
      setCardId('')
      setInstallments('1')
    }
  }, [form.type])

  useEffect(() => {
    if (paymentMethod === 'card' && !cardsLoading && !cardId && activeCards.length > 0) {
      setCardId(activeCards[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, cardsLoading, activeCards])

  const handleTypeChange = (type) => {
    const firstOfType = allCategories.find((c) => c.type === type)
    set({ type, categoryId: firstOfType?.id ?? '' })
  }

  // Prévia informativa de oferta/dízimo — NÃO é a fonte da verdade. O
  // backend recalcula e persiste os valores reais (Transaction.offerAmount/
  // titheAmount) ao salvar; isso aqui só ajuda o usuário a entender o que
  // vai acontecer antes de confirmar. Quando a categoria não sobrescreve a
  // taxa (offerRate/titheRate null), usa o padrão espelhado do backend só
  // para exibição.
  const selectedCategory = categories.find((c) => c.id === form.categoryId)
  const amountNumber = Number(form.amount) || 0
  const showObligationsPreview =
    form.type === 'income' && selectedCategory && amountNumber > 0 && (selectedCategory.applyOffer || selectedCategory.applyTithe)

  const offerRate = selectedCategory?.offerRate ?? DEFAULT_OFFER_RATE
  const titheRate = selectedCategory?.titheRate ?? DEFAULT_TITHE_RATE
  const offerPreview = selectedCategory?.applyOffer ? amountNumber * offerRate : 0
  const tithePreview = selectedCategory?.applyTithe ? amountNumber * titheRate : 0

  // Prévia informativa do parcelamento — mesma ideia: aproximação para o
  // usuário entender o que vai acontecer. O backend recalcula os valores
  // definitivos (com o ajuste de centavos na última parcela) ao criar as
  // parcelas de verdade.
  const installmentsCount = Math.max(1, Number(installments) || 1)
  const selectedCard = activeCards.find((c) => c.id === Number(cardId))
  const showInstallmentPreview = form.type === 'expense' && paymentMethod === 'card' && selectedCard && installmentsCount > 1 && amountNumber > 0
  const approxInstallmentAmount = amountNumber / installmentsCount

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) return
    if (!form.categoryId) return

    const usingCard = form.type === 'expense' && paymentMethod === 'card' && cardId

    setSubmitting(true)
    try {
      await onSubmit({
        ...form,
        amount: Number(form.amount),
        cardId: usingCard ? Number(cardId) : null,
        ...(usingCard && installmentsCount > 1 ? { installmentTotal: installmentsCount } : {}),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 rounded-control bg-surface-2 p-1">
        <button
          type="button"
          onClick={() => handleTypeChange('expense')}
          className={`focus-ring h-10 rounded-[8px] text-[14px] font-medium transition-colors ${
            form.type === 'expense' ? 'bg-expense/15 text-expense' : 'text-text-muted'
          }`}
        >
          Despesa
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('income')}
          className={`focus-ring h-10 rounded-[8px] text-[14px] font-medium transition-colors ${
            form.type === 'income' ? 'bg-income/15 text-income' : 'text-text-muted'
          }`}
        >
          Receita
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-text-muted">Valor</label>
        <div
          className={`flex items-center h-16 rounded-control bg-surface-2 border px-4 transition-colors ${
            amountFocused ? 'border-income/50' : 'border-border'
          }`}
        >
          <span className="num text-[22px] text-text-faint mr-1.5">R$</span>
          <input
            autoFocus
            inputMode="decimal"
            placeholder="0,00"
            value={form.amount}
            onFocus={() => setAmountFocused(true)}
            onBlur={() => setAmountFocused(false)}
            onChange={(e) => {
              const v = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '')
              set({ amount: v })
            }}
            className="num flex-1 bg-transparent text-[28px] font-semibold text-text placeholder:text-text-faint outline-none"
          />
        </div>
      </div>

      <Select
        label="Categoria"
        value={form.categoryId}
        onChange={(e) => set({ categoryId: Number(e.target.value) })}
        disabled={categoriesLoading || categories.length === 0}
      >
        {categoriesLoading && <option value="">Carregando categorias…</option>}
        {!categoriesLoading && categories.length === 0 && <option value="">Nenhuma categoria disponível</option>}
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>

      {showObligationsPreview && (
        <div className="flex flex-col gap-1.5 rounded-control bg-surface-2 border border-border-soft p-3 text-[13px]">
          <div className="flex items-center justify-between text-text-muted">
            <span>Receita</span>
            <span className="num text-text">{formatCurrency(amountNumber)}</span>
          </div>
          {selectedCategory.applyOffer && (
            <div className="flex items-center justify-between text-text-muted">
              <span>Oferta ({formatPercent(offerRate)})</span>
              <span className="num text-income">{formatCurrency(offerPreview)}</span>
            </div>
          )}
          {selectedCategory.applyTithe && (
            <div className="flex items-center justify-between text-text-muted">
              <span>Dízimo ({formatPercent(titheRate)})</span>
              <span className="num text-income">{formatCurrency(tithePreview)}</span>
            </div>
          )}
          <p className="text-[11px] text-text-faint pt-0.5">Valor estimado — calculado e salvo pelo backend ao confirmar.</p>
        </div>
      )}

      {form.type === 'expense' && activeCards.length > 0 && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[13px] font-medium text-text-muted mb-1.5 block">Forma de pagamento</label>
            <div className="grid grid-cols-2 gap-2 rounded-control bg-surface-2 p-1">
              <button
                type="button"
                onClick={() => setPaymentMethod('normal')}
                className={`focus-ring h-10 rounded-[8px] text-[14px] font-medium transition-colors ${
                  paymentMethod === 'normal' ? 'bg-surface text-text' : 'text-text-muted'
                }`}
              >
                Dinheiro
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`focus-ring h-10 rounded-[8px] text-[14px] font-medium transition-colors ${
                  paymentMethod === 'card' ? 'bg-info/15 text-info' : 'text-text-muted'
                }`}
              >
                Cartão de crédito
              </button>
            </div>
          </div>

          {paymentMethod === 'card' && (
            <>
              <Select label="Cartão" value={cardId} onChange={(e) => setCardId(Number(e.target.value))}>
                {activeCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>

              <Input
                label="Parcelas"
                type="number"
                inputMode="numeric"
                min="1"
                max="60"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
              />

              {showInstallmentPreview && (
                <div className="flex flex-col gap-1 rounded-control bg-surface-2 border border-border-soft p-3 text-[13px]">
                  <div className="flex items-center justify-between text-text-muted">
                    <span>Compra</span>
                    <span className="num text-text">{formatCurrency(amountNumber)}</span>
                  </div>
                  <div className="flex items-center justify-between text-text-muted">
                    <span>{installmentsCount}x de aproximadamente</span>
                    <span className="num text-text">{formatCurrency(approxInstallmentAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-text-muted">
                    <span>Cartão</span>
                    <span className="text-text">{selectedCard.name}</span>
                  </div>
                  <p className="text-[11px] text-text-faint pt-0.5">
                    Valores e datas definitivos são calculados pelo backend ao confirmar.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <Input
        label="Descrição"
        placeholder="Ex: Garrafão de água Tony"
        value={form.description}
        onChange={(e) => set({ description: e.target.value })}
      />

      <Input
        label="Data"
        type="date"
        value={form.date}
        onChange={(e) => set({ date: e.target.value })}
      />

      <div className="flex gap-3 mt-1">
        {onCancel && (
          <Button type="button" variant="ghost" className="flex-1" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="primary" className="flex-1" disabled={submitting || categoriesLoading || !form.categoryId}>
          {submitting ? 'Salvando…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
