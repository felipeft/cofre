import { mockCategories } from './categories.mock'

// Small deterministic pseudo-random generator so the mock dataset
// looks the same on every reload (no backend yet, so we fake it consistently).
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(42)

const expenseDescriptions = {
  mercado: ['Compra do mês', 'Garrafão de água Tony', 'Feira da semana', 'Hortifruti', 'Padaria'],
  transporte: ['Uber', 'Combustível', 'Estacionamento', 'Ônibus', '99'],
  alimentacao: ['Almoço', 'Ifood', 'Café', 'Lanche da tarde', 'Jantar fora'],
  moradia: ['Aluguel', 'Conta de luz', 'Conta de água', 'Internet', 'Condomínio'],
  saude: ['Farmácia', 'Consulta médica', 'Academia', 'Suplementos'],
  lazer: ['Cinema', 'Show', 'Streaming avulso', 'Bar com amigos'],
  assinaturas: ['Netflix', 'Spotify', 'iCloud', 'ChatGPT Plus'],
  educacao: ['Curso online', 'Livro técnico', 'Material de estudo'],
  outros: ['Presente', 'Doação', 'Imprevisto'],
}

const incomeDescriptions = {
  salario: ['Salário mensal'],
  freelance: ['Projeto freelance', 'Consultoria pontual'],
  investimentos: ['Rendimento CDB', 'Dividendos'],
}

function pick(arr) {
  return arr[Math.floor(rand() * arr.length)]
}

function generateTransactions() {
  const list = []
  let id = 1
  const now = new Date()

  for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
    const daysInMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate()
    const maxDay = monthsAgo === 0 ? Math.min(now.getDate(), daysInMonth) : daysInMonth

    // fixed income entries
    const incomeCat = pick(['salario'])
    list.push({
      id: id++,
      type: 'income',
      categoryId: 'salario',
      description: 'Salário mensal',
      amount: 4200 + Math.floor(rand() * 300),
      date: `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}-05`,
    })
    if (rand() > 0.4) {
      list.push({
        id: id++,
        type: 'income',
        categoryId: 'freelance',
        description: pick(incomeDescriptions.freelance),
        amount: 300 + Math.floor(rand() * 900),
        date: `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}-${String(10 + Math.floor(rand() * 15)).padStart(2, '0')}`,
      })
    }

    // random expenses through the month
    const expenseCount = 16 + Math.floor(rand() * 10)
    const expenseCats = mockCategories.filter((c) => c.type === 'expense')
    for (let i = 0; i < expenseCount; i++) {
      const cat = pick(expenseCats)
      const day = String(1 + Math.floor(rand() * maxDay)).padStart(2, '0')
      const baseAmounts = {
        mercado: [15, 220],
        transporte: [8, 60],
        alimentacao: [12, 90],
        moradia: [80, 1400],
        saude: [20, 350],
        lazer: [20, 180],
        assinaturas: [15, 60],
        educacao: [30, 250],
        outros: [10, 150],
      }
      const [min, max] = baseAmounts[cat.id] ?? [10, 100]
      const amount = Math.round((min + rand() * (max - min)) * 100) / 100
      list.push({
        id: id++,
        type: 'expense',
        categoryId: cat.id,
        description: pick(expenseDescriptions[cat.id] ?? ['Despesa']),
        amount,
        date: `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}-${day}`,
      })
    }
  }

  return list.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export const mockTransactions = generateTransactions()
