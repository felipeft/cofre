import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import Modal from '@/components/ui/Modal'
import TransactionForm from '@/components/forms/TransactionForm'
import { useTransactions } from '@/hooks/useTransactions'
import { useToast } from '@/contexts/ToastContext'

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const { addTransaction } = useTransactions()
  const { showToast } = useToast()

  const handleQuickAdd = (tx) => {
    addTransaction(tx)
    setQuickAddOpen(false)
    showToast('Movimentação registrada')
  }

  return (
    <div className="flex h-full min-h-screen bg-bg">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} onRegister={() => setQuickAddOpen(true)} />

      <div className="flex-1 min-w-0 pb-20 md:pb-0">
        <Outlet />
      </div>

      <BottomNav onRegister={() => setQuickAddOpen(true)} />

      <Modal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} title="Nova movimentação">
        <TransactionForm onSubmit={handleQuickAdd} onCancel={() => setQuickAddOpen(false)} />
      </Modal>
    </div>
  )
}
