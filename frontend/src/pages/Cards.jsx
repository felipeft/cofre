import { useEffect, useState } from 'react'
import { Plus, CreditCard } from 'lucide-react'
import Header from '@/layout/Header'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Dialog from '@/components/ui/Dialog'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import { SkeletonRow } from '@/components/ui/Loading'
import CardForm from '@/components/cards/CardForm'
import CardPaymentForm from '@/components/cards/CardPaymentForm'
import CardListItem from '@/components/cards/CardListItem'
import { useCards } from '@/hooks/useCards'
import { useToast } from '@/contexts/ToastContext'
import * as cardService from '@/services/card.service'

export default function Cards() {
  const { cards, loading, error, createCard, editCard, removeCard } = useCards()
  const [modalState, setModalState] = useState(null) // { mode: 'create'|'edit', card }
  const [deleting, setDeleting] = useState(null)
  const [paying, setPaying] = useState(null)
  const { showToast } = useToast()

  // O limite usado/disponível não vem na listagem (GET /cards) — só no
  // resumo por cartão (GET /cards/:id/summary), então busca uma vez por
  // cartão carregado e de novo sempre que a lista mudar (criar/editar/
  // excluir um cartão, ou registrar uma compra em outro lugar do app).
  const [summaries, setSummaries] = useState({})
  const [paymentsVersion, setPaymentsVersion] = useState(0)

  useEffect(() => {
    if (cards.length === 0) return
    let cancelled = false

    Promise.all(cards.map((c) => cardService.getCardSummary(c.id).then((s) => [c.id, s]))).then((entries) => {
      if (cancelled) return
      setSummaries(Object.fromEntries(entries))
    })

    return () => {
      cancelled = true
    }
  }, [cards, paymentsVersion])

  const handleSave = async (data) => {
    try {
      if (modalState.mode === 'create') {
        await createCard(data)
        showToast('Cartão criado')
      } else {
        await editCard(modalState.card.id, data)
        showToast('Cartão atualizado')
      }
      setModalState(null)
    } catch (err) {
      showToast(err.message ?? 'Não foi possível salvar o cartão.', 'error')
    }
  }

  const handleDelete = async () => {
    try {
      const result = await removeCard(deleting.item.id)
      showToast(result.message ?? 'Cartão excluído')
    } catch (err) {
      showToast(err.message ?? 'Não foi possível excluir o cartão.', 'error')
    } finally {
      setDeleting(null)
    }
  }

  const prepareDelete = async (card) => {
    setDeleting({ item: card, preview: null, loading: true })
    try {
      const preview = await cardService.getCardDeletionPreview(card.id)
      setDeleting((current) => current?.item.id === card.id ? { item: card, preview, loading: false } : current)
    } catch (err) {
      setDeleting(null)
      showToast(err.message ?? 'Não foi possível calcular o impacto da exclusão.', 'error')
    }
  }

  const handlePayment = async (data) => {
    try {
      await cardService.registerCardPayment(paying.card.id, data)
      setPaymentsVersion((version) => version + 1)
      showToast('Pagamento da fatura registrado')
      setPaying(null)
    } catch (err) {
      showToast(err.message ?? 'Não foi possível registrar o pagamento.', 'error')
    }
  }

  return (
    <div>
      <Header
        title="Cartões"
        subtitle="Gerencie seus cartões de crédito"
        actions={
          <Button icon={Plus} onClick={() => setModalState({ mode: 'create' })}>
            Novo
          </Button>
        }
      />

      <div className="px-5 md:px-8 pb-8 flex flex-col gap-3">
        {error ? (
          <Card>
            <EmptyState title="Não foi possível carregar os cartões" description={error.message ?? 'Tente novamente em instantes.'} />
          </Card>
        ) : loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <SkeletonRow key={i} className="h-28" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <Card>
            <EmptyState
              icon={CreditCard}
              title="Nenhum cartão cadastrado"
              description="Cadastre um cartão para registrar compras parceladas."
              action={
                <Button icon={Plus} onClick={() => setModalState({ mode: 'create' })}>
                  Novo cartão
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cards.map((c) => (
              <CardListItem
                key={c.id}
                card={c}
                summary={summaries[c.id]}
                onEdit={(card) => setModalState({ mode: 'edit', card })}
                onDelete={prepareDelete}
                onPay={(card, summary) => setPaying({ card, summary })}
              />
            ))}
          </div>
        )}
      </div>

      <Modal open={!!modalState} onClose={() => setModalState(null)} title={modalState?.mode === 'edit' ? 'Editar cartão' : 'Novo cartão'}>
        {modalState && <CardForm initial={modalState.card} onSubmit={handleSave} onCancel={() => setModalState(null)} />}
      </Modal>

      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Excluir cartão"
        description={deleting?.loading
          ? 'Calculando os vínculos deste cartão…'
          : deleting?.preview?.canDelete
            ? `O cartão "${deleting.item.name}" não possui registros vinculados e será removido definitivamente.`
            : `O cartão "${deleting?.item.name}" possui ${deleting?.preview?.transactions ?? 0} movimentação(ões), ${deleting?.preview?.recurringExpenses ?? 0} recorrência(s) e ${deleting?.preview?.payments ?? 0} pagamento(s) de fatura. Ele não pode ser excluído enquanto esses vínculos existirem.`}
        confirmLabel="Excluir"
        cancelLabel={deleting?.preview?.canDelete ? 'Cancelar' : 'Fechar'}
        confirmDisabled={deleting?.loading}
        hideConfirm={!deleting?.loading && !deleting?.preview?.canDelete}
      />
      <Modal open={!!paying} onClose={() => setPaying(null)} title="Registrar pagamento da fatura">
        {paying && <CardPaymentForm card={paying.card} summary={paying.summary} onSubmit={handlePayment} onCancel={() => setPaying(null)} />}
      </Modal>
    </div>
  )
}
