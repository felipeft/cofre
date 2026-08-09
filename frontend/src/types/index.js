// Este projeto é JavaScript puro, não TypeScript — migrar para `.tsx` agora
// seria uma mudança grande e arriscada para uma etapa que deveria alterar
// apenas organização, não o comportamento do build. Em vez disso, usamos
// JSDoc typedefs: dão autocomplete e documentam o contrato de dados no
// editor, e podem ser promovidos para tipos `.ts` reais sem retrabalho
// quando um `tsconfig.json` chegar.
//
// Os formatos abaixo espelham exatamente o que a API do Cofre devolve (ver
// backend/src/utils/mappers/*.js) — não são mais um formato de mock local.

/**
 * @typedef {'income' | 'expense'} TransactionType
 */

/**
 * @typedef {Object} Category
 * @property {number} id
 * @property {string} name
 * @property {string} icon - nome de um ícone lucide-react
 * @property {string} color - hex
 * @property {TransactionType} type
 * @property {boolean} isActive
 * @property {number} sortOrder
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} Transaction
 * @property {number} id
 * @property {TransactionType} type
 * @property {number} categoryId
 * @property {string} description
 * @property {number} amount
 * @property {string} date - formato YYYY-MM-DD
 * @property {{ month: number, year: number }} competence
 * @property {string} notes
 * @property {string} source
 * @property {boolean} isRecurring
 * @property {boolean} isFixed
 * @property {string|null} card
 * @property {{ current: number, total: number } | null} installments
 * @property {string[]} tags
 * @property {'pending' | 'confirmed' | 'cancelled'} status
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {Pick<Category, 'id'|'name'|'color'|'icon'|'type'> | undefined} category - já vem populada pela API (join no backend)
 */

/**
 * @typedef {Object} PaginationMeta
 * @property {number} page
 * @property {number} limit
 * @property {number} total
 * @property {number} totalPages
 */

/**
 * @typedef {Object} MonthSummary
 * @property {number} income
 * @property {number} expense
 * @property {number} balance
 * @property {number} count
 */

export {}
