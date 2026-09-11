import { useState } from 'react'
import { Plus } from 'lucide-react'
import Header from '@/layout/Header'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Dialog from '@/components/ui/Dialog'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import { SkeletonRow } from '@/components/ui/Loading'
import CategoryGroup from '@/components/categories/CategoryGroup'
import CategoryForm from '@/components/categories/CategoryForm'
import { useCategories } from '@/hooks/useCategories'
import { useToast } from '@/contexts/ToastContext'
import { getCategoryDeletionPreview } from '@/services/category.service'

export default function Categories() {
  const { categories, loading, error, createCategory, editCategory, removeCategory } = useCategories()
  const [modalState, setModalState] = useState(null) // { mode: 'create'|'edit', category }
  const [deleting, setDeleting] = useState(null)
  const { showToast } = useToast()

  const expenseCats = categories.filter((c) => c.type === 'expense')
  const incomeCats = categories.filter((c) => c.type === 'income')

  const handleSave = async (data) => {
    try {
      if (modalState.mode === 'create') {
        await createCategory(data)
        showToast('Categoria criada')
      } else {
        await editCategory(modalState.category.id, data)
        showToast('Categoria atualizada')
      }
      setModalState(null)
    } catch (err) {
      showToast(err.message ?? 'Não foi possível salvar a categoria.', 'error')
    }
  }

  const handleDelete = async () => {
    try {
      const result = await removeCategory(deleting.item.id)
      showToast(result.message ?? 'Categoria excluída')
    } catch (err) {
      showToast(err.message ?? 'Não foi possível excluir a categoria.', 'error')
    } finally {
      setDeleting(null)
    }
  }

  const prepareDelete = async (category) => {
    setDeleting({ item: category, preview: null, loading: true })
    try {
      const preview = await getCategoryDeletionPreview(category.id)
      setDeleting((current) => current?.item.id === category.id ? { item: category, preview, loading: false } : current)
    } catch (err) {
      setDeleting(null)
      showToast(err.message ?? 'Não foi possível calcular o impacto da exclusão.', 'error')
    }
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
        {error ? (
          <Card>
            <EmptyState title="Não foi possível carregar as categorias" description={error.message ?? 'Tente novamente em instantes.'} />
          </Card>
        ) : loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonRow key={i} className="h-16" />
            ))}
          </div>
        ) : (
          <>
            <CategoryGroup
              title="Despesas"
              categories={expenseCats}
              onEdit={(c) => setModalState({ mode: 'edit', category: c })}
              onDelete={prepareDelete}
            />
            <CategoryGroup
              title="Receitas"
              categories={incomeCats}
              onEdit={(c) => setModalState({ mode: 'edit', category: c })}
              onDelete={prepareDelete}
            />
          </>
        )}
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
        description={deleting?.loading
          ? 'Calculando os vínculos desta categoria…'
          : deleting?.preview?.canDelete
            ? `A categoria "${deleting.item.name}" não possui registros vinculados e será removida definitivamente.`
            : `A categoria "${deleting?.item.name}" possui ${deleting?.preview?.transactions ?? 0} movimentação(ões) e ${deleting?.preview?.recurringExpenses ?? 0} recorrência(s). Ela não pode ser excluída enquanto esses vínculos existirem.`}
        confirmLabel="Excluir"
        cancelLabel={deleting?.preview?.canDelete ? 'Cancelar' : 'Fechar'}
        confirmDisabled={deleting?.loading}
        hideConfirm={!deleting?.loading && !deleting?.preview?.canDelete}
      />
    </div>
  )
}
