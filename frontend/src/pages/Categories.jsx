import { useState } from 'react'
import { Plus } from 'lucide-react'
import Header from '@/layout/Header'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Dialog from '@/components/ui/Dialog'
import CategoryGroup from '@/components/categories/CategoryGroup'
import CategoryForm from '@/components/categories/CategoryForm'
import { useCategoryManager } from '@/hooks/useCategoryManager'
import { useToast } from '@/contexts/ToastContext'

export default function Categories() {
  const { categories, createCategory, editCategory, removeCategory } = useCategoryManager()
  const [modalState, setModalState] = useState(null) // { mode: 'create'|'edit', category }
  const [deleting, setDeleting] = useState(null)
  const { showToast } = useToast()

  const expenseCats = categories.filter((c) => c.type === 'expense')
  const incomeCats = categories.filter((c) => c.type === 'income')

  const handleSave = (data) => {
    if (modalState.mode === 'create') {
      createCategory(data)
      showToast('Categoria criada')
    } else {
      editCategory(modalState.category.id, data)
      showToast('Categoria atualizada')
    }
    setModalState(null)
  }

  const handleDelete = () => {
    removeCategory(deleting.id)
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
