import { useNavigate } from 'react-router-dom'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import TransactionForm from '@/components/forms/TransactionForm'
import { useTransactions } from '@/context/TransactionsContext'
import { useToast } from '@/context/ToastContext'

export default function RegisterTransaction() {
  const { addTransaction } = useTransactions()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = (tx) => {
    addTransaction(tx)
    showToast('Movimentação registrada')
    navigate('/')
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
