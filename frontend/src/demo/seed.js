import { addMonths, buildInstallmentPlan, occurrenceDate } from './domain.js'

export const DEMO_SCHEMA_VERSION = 1

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function sqlTimestamp(date = new Date()) {
  return date.toISOString().replace('T', ' ').slice(0, 19)
}

function monthDate(offset, day) {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  return occurrenceDate(target.getFullYear(), target.getMonth() + 1, day)
}

function transaction(id, input, timestamp) {
  const [year, month] = input.date.split('-').map(Number)
  return {
    id,
    description: input.description,
    amount: input.amount,
    type: input.type,
    categoryId: input.categoryId,
    date: input.date,
    competence: { month, year },
    notes: input.notes || '',
    source: input.source || 'manual',
    isRecurring: Boolean(input.recurringExpenseId),
    recurringExpenseId: input.recurringExpenseId ?? null,
    isFixed: false,
    cardId: input.cardId ?? null,
    installments: input.installments ?? null,
    tags: [],
    status: 'confirmed',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function createDemoSeed(now = new Date()) {
  const timestamp = sqlTimestamp(now)
  const categories = [
    { id: 1, name: 'Salário', type: 'income', color: '#3ecf8e', icon: 'Wallet', isActive: true, sortOrder: 0 },
    { id: 2, name: 'Projetos', type: 'income', color: '#5b9ef5', icon: 'Laptop', isActive: true, sortOrder: 1 },
    { id: 3, name: 'Moradia', type: 'expense', color: '#14b8a6', icon: 'House', isActive: true, sortOrder: 0 },
    { id: 4, name: 'Mercado', type: 'expense', color: '#a78bfa', icon: 'ShoppingCart', isActive: true, sortOrder: 1 },
    { id: 5, name: 'Transporte', type: 'expense', color: '#f97316', icon: 'Car', isActive: true, sortOrder: 2 },
    { id: 6, name: 'Saúde', type: 'expense', color: '#f2666a', icon: 'HeartPulse', isActive: true, sortOrder: 3 },
    { id: 7, name: 'Educação', type: 'expense', color: '#eab308', icon: 'GraduationCap', isActive: true, sortOrder: 4 },
    { id: 8, name: 'Lazer', type: 'expense', color: '#ec4899', icon: 'Popcorn', isActive: true, sortOrder: 5 },
    { id: 9, name: 'Assinaturas', type: 'expense', color: '#ef4444', icon: 'Tv', isActive: true, sortOrder: 6 },
    { id: 10, name: 'Outros', type: 'expense', color: '#8b8b93', icon: 'MoreHorizontal', isActive: true, sortOrder: 7 },
  ].map((item) => ({ ...item, createdAt: timestamp, updatedAt: timestamp }))

  const cards = [
    { id: 1, name: 'Aurora Visa', creditLimit: 8500, closingDay: 10, dueDay: 18, isActive: true, createdAt: timestamp, updatedAt: timestamp },
    { id: 2, name: 'Horizonte', creditLimit: 4200, closingDay: 25, dueDay: 5, isActive: true, createdAt: timestamp, updatedAt: timestamp },
  ]

  const recurringExpenses = [
    { id: 1, description: 'Internet residencial', amount: 119.9, type: 'expense', categoryId: 3, dayOfMonth: 8, startDate: monthDate(-5, 8), endDate: null, isActive: true, cardId: null, notes: '', source: 'recurring', generatedThrough: null, createdAt: timestamp, updatedAt: timestamp },
    { id: 2, description: 'Plataforma de filmes', amount: 44.9, type: 'expense', categoryId: 9, dayOfMonth: 12, startDate: monthDate(-5, 12), endDate: null, isActive: true, cardId: 1, notes: 'Assinatura fictícia', source: 'recurring', generatedThrough: null, createdAt: timestamp, updatedAt: timestamp },
    { id: 3, description: 'Academia do bairro', amount: 139.9, type: 'expense', categoryId: 6, dayOfMonth: 3, startDate: monthDate(-4, 3), endDate: null, isActive: true, cardId: 2, notes: '', source: 'recurring', generatedThrough: null, createdAt: timestamp, updatedAt: timestamp },
  ]

  const transactions = []
  let transactionId = 1
  const variableExpenses = [
    ['Compra semanal', 4, 286.4, 7],
    ['Combustível', 5, 210, 14],
    ['Farmácia', 6, 78.35, 19],
    ['Cinema e jantar', 8, 126.8, 22],
    ['Conta de energia', 3, 184.7, 10],
  ]

  for (let offset = -5; offset <= 0; offset += 1) {
    transactions.push(transaction(transactionId++, {
      description: 'Salário mensal', amount: 5600, type: 'income', categoryId: 1, date: monthDate(offset, 5),
    }, timestamp))
    if (offset === -3 || offset === -1) {
      transactions.push(transaction(transactionId++, {
        description: offset === -1 ? 'Consultoria de interface' : 'Projeto freelance',
        amount: offset === -1 ? 1250 : 850,
        type: 'income', categoryId: 2, date: monthDate(offset, 16),
      }, timestamp))
    }
    variableExpenses.forEach(([description, categoryId, baseAmount, day], index) => {
      transactions.push(transaction(transactionId++, {
        description,
        amount: Math.round((baseAmount + (offset + 5) * 4.75 + index * 1.2) * 100) / 100,
        type: 'expense', categoryId, date: monthDate(offset, day),
        cardId: index === 1 ? 2 : null,
      }, timestamp))
    })
  }

  const notebookPlan = buildInstallmentPlan({
    totalAmount: 3600,
    installmentsCount: 6,
    purchaseDate: monthDate(-2, 14),
    description: 'Notebook para estudos',
    card: cards[0],
  })
  const groupId = 'demo-installment-notebook'
  notebookPlan.forEach((installment) => {
    transactions.push(transaction(transactionId++, {
      ...installment,
      type: 'expense', categoryId: 7, cardId: 1,
      installments: { current: installment.installmentCurrent, total: installment.installmentTotal, groupId },
    }, timestamp))
  })

  const state = {
    schemaVersion: DEMO_SCHEMA_VERSION,
    seededAt: timestamp,
    nextIds: { category: 11, card: 3, cardPayment: 3, recurringExpense: 4, transaction: transactionId },
    user: {
      id: 1,
      provider: 'demo',
      email: 'demo@cofre.local',
      googleName: 'Usuário Demo',
      displayName: 'Usuário Demo',
      name: 'Usuário Demo',
      avatarUrl: null,
      createdAt: timestamp,
      session: { createdAt: timestamp, expiresAt: '2099-12-31 23:59:59' },
    },
    settings: { theme: 'system', createdAt: timestamp, updatedAt: timestamp },
    categories,
    cards,
    cardPayments: [
      { id: 1, cardId: 1, amount: 900, paidAt: monthDate(-1, 18), notes: 'Pagamento demonstrativo', createdAt: timestamp },
      { id: 2, cardId: 2, amount: 500, paidAt: monthDate(-1, 5), notes: 'Pagamento demonstrativo', createdAt: timestamp },
    ],
    recurringExpenses,
    transactions,
  }

  return state
}

export const seedHelpers = { localDate, sqlTimestamp, monthDate, addMonths }
