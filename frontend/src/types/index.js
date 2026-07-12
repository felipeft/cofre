// Este projeto é JavaScript puro, não TypeScript — migrar para `.tsx` agora
// seria uma mudança grande e arriscada para uma etapa que deveria alterar
// apenas organização, não o comportamento do build. Em vez disso, usamos
// JSDoc typedefs: dão autocomplete e documentam o contrato de dados no
// editor, e podem ser promovidos para tipos `.ts` reais sem retrabalho
// quando o backend (e um possível `tsconfig.json`) chegar.

/**
 * @typedef {'income' | 'expense'} TransactionType
 */

/**
 * @typedef {Object} Category
 * @property {string} id
 * @property {string} name
 * @property {string} icon - nome de um ícone lucide-react
 * @property {string} color - hex
 * @property {TransactionType} type
 */

/**
 * @typedef {Object} Transaction
 * @property {string|number} id
 * @property {TransactionType} type
 * @property {string} categoryId
 * @property {string} description
 * @property {number} amount
 * @property {string} date - formato YYYY-MM-DD
 */

/**
 * @typedef {Transaction & { category: Category }} EnrichedTransaction
 * Transação com a categoria completa já resolvida (usado nas telas).
 */

/**
 * @typedef {Object} MonthSummary
 * @property {number} income
 * @property {number} expense
 * @property {number} balance
 * @property {number} count
 */

export {}
