import { useNavigate } from 'react-router-dom'
import Header from '@/layout/Header'
import Card from '@/components/ui/Card'
import TransactionForm from '@/components/forms/TransactionForm'
import { useTransactions } from '@/hooks/useTransactions'
import { useToast } from '@/contexts/ToastContext'
import { ROUTES } from '@/constants/routes'

export default function RegisterTransaction() {
  const { addTransaction } = useTransactions()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (tx) => {
    try {
      await addTransaction(tx)
      showToast('Movimentação registrada')
      navigate(ROUTES.dashboard)
    } catch (err) {
      showToast(err.message ?? 'Não foi possível registrar a movimentação.', 'error')
    }
  }

  return (
    <div>
      <Header title="Registrar" subtitle="Adicione uma movimentação em segundos" />
      <div className="px-5 md:px-8 pb-8 max-w-[480px]">
        <Card className="p-5">
          <TransactionForm onSubmit={handleSubmit} submitLabel="Salvar movimentação" />
        </Card>
      </div>
    </div>
  )
}
