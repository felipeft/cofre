const { z } = require('zod')

function nullable(schema) {
  return { anyOf: [schema, { type: 'null' }] }
}

// SQLite/libSQL devolve os timestamps atuais como texto UTC `YYYY-MM-DD HH:mm:ss`,
// portanto não declaramos `format: date-time` (que exigiria RFC 3339 com `T`).
const timestamp = { type: 'string', example: '2026-09-14 18:30:00' }
const date = { type: 'string', format: 'date', example: '2026-09-14' }
const money = { type: 'number', format: 'double', example: 129.9 }

const schemas = {
  ErrorDetail: {
    type: 'object',
    required: ['field', 'message'],
    properties: {
      field: { type: 'string', example: 'amount' },
      message: { type: 'string', example: 'amount deve ser maior que zero.' },
    },
  },
  ErrorResponse: {
    type: 'object',
    required: ['success', 'message', 'code', 'details'],
    properties: {
      success: { type: 'boolean', const: false },
      message: { type: 'string', example: 'Dados inválidos na requisição.' },
      code: { type: 'string', example: 'VALIDATION_ERROR' },
      details: { type: 'array', items: { $ref: '#/components/schemas/ErrorDetail' } },
    },
  },
  PaginationMeta: {
    type: 'object',
    required: ['page', 'limit', 'total', 'totalPages'],
    properties: {
      page: { type: 'integer', example: 1 }, limit: { type: 'integer', example: 20 },
      total: { type: 'integer', example: 42 }, totalPages: { type: 'integer', example: 3 },
    },
  },
  Category: {
    type: 'object', required: ['id', 'name', 'type', 'color', 'icon', 'isActive', 'sortOrder', 'createdAt', 'updatedAt'],
    properties: {
      id: { type: 'integer', example: 12 }, name: { type: 'string', example: 'Moradia' },
      type: { type: 'string', enum: ['income', 'expense'], example: 'expense' }, color: { type: 'string', example: '#14b8a6' },
      icon: { type: 'string', example: 'house' }, isActive: { type: 'boolean', example: true }, sortOrder: { type: 'integer', example: 2 },
      createdAt: timestamp, updatedAt: timestamp,
    },
  },
  Transaction: {
    type: 'object',
    required: ['id', 'description', 'amount', 'type', 'categoryId', 'date', 'competence', 'notes', 'source', 'isRecurring', 'recurringExpenseId', 'isFixed', 'card', 'installments', 'tags', 'status', 'createdAt', 'updatedAt'],
    properties: {
      id: { type: 'integer', example: 145 }, description: { type: 'string', example: 'Conta de internet' }, amount: money,
      type: { type: 'string', enum: ['income', 'expense'], example: 'expense' }, categoryId: { type: 'integer', example: 12 }, date,
      competence: { type: 'object', required: ['month', 'year'], properties: { month: { type: 'integer', example: 9 }, year: { type: 'integer', example: 2026 } } },
      notes: { type: 'string', example: '' }, source: { type: 'string', example: 'manual' }, isRecurring: { type: 'boolean', example: false },
      recurringExpenseId: nullable({ type: 'integer', example: 8 }), isFixed: { type: 'boolean', example: false },
      card: nullable({ type: 'object', required: ['id', 'name'], properties: { id: { type: 'integer', example: 3 }, name: { type: 'string', example: 'Cartão principal' } } }),
      installments: nullable({ type: 'object', required: ['current', 'total', 'groupId'], properties: { current: { type: 'integer', example: 1 }, total: { type: 'integer', example: 6 }, groupId: { type: 'string', format: 'uuid' } } }),
      tags: { type: 'array', items: { type: 'string' }, example: ['casa'] }, status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled'], example: 'confirmed' },
      category: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, color: { type: 'string' }, icon: { type: 'string' }, type: { type: 'string', enum: ['income', 'expense'] } } },
      createdAt: timestamp, updatedAt: timestamp,
    },
  },
  CreditCard: {
    type: 'object', required: ['id', 'name', 'creditLimit', 'closingDay', 'dueDay', 'isActive', 'createdAt', 'updatedAt'],
    properties: { id: { type: 'integer', example: 3 }, name: { type: 'string', example: 'Cartão principal' }, creditLimit: { ...money, example: 5000 }, closingDay: { type: 'integer', example: 5 }, dueDay: { type: 'integer', example: 12 }, isActive: { type: 'boolean', example: true }, createdAt: timestamp, updatedAt: timestamp },
  },
  CardSummary: {
    type: 'object', required: ['id', 'name', 'creditLimit', 'usedLimit', 'availableLimit', 'purchasesTotal', 'paidAmount', 'closingDay', 'dueDay', 'isActive'],
    properties: { id: { type: 'integer' }, name: { type: 'string' }, creditLimit: money, usedLimit: money, availableLimit: money, purchasesTotal: money, paidAmount: money, closingDay: { type: 'integer' }, dueDay: { type: 'integer' }, isActive: { type: 'boolean' } },
  },
  CardPayment: {
    type: 'object', required: ['id', 'cardId', 'amount', 'paidAt', 'notes', 'createdAt'],
    properties: { id: { type: 'integer' }, cardId: { type: 'integer' }, amount: money, paidAt: date, notes: { type: 'string' }, createdAt: timestamp },
  },
  RecurringExpense: {
    type: 'object', required: ['id', 'description', 'amount', 'type', 'categoryId', 'dayOfMonth', 'startDate', 'endDate', 'isActive', 'card', 'notes', 'source', 'createdAt', 'updatedAt'],
    properties: { id: { type: 'integer', example: 8 }, description: { type: 'string', example: 'Assinatura de software' }, amount: money, type: { type: 'string', const: 'expense' }, categoryId: { type: 'integer' }, dayOfMonth: { type: 'integer', example: 10 }, startDate: date, endDate: nullable(date), isActive: { type: 'boolean' }, card: nullable({ type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, isActive: { type: 'boolean' } } }), notes: { type: 'string' }, source: { type: 'string' }, category: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, color: { type: 'string' }, icon: { type: 'string' } } }, createdAt: timestamp, updatedAt: timestamp },
  },
  Profile: {
    type: 'object', required: ['id', 'provider', 'email', 'googleName', 'displayName', 'customDisplayName', 'avatarUrl', 'createdAt', 'updatedAt'],
    properties: { id: { type: 'integer' }, provider: { type: 'string', const: 'google' }, email: { type: 'string', format: 'email', example: 'demo@example.com' }, googleName: { type: 'string', example: 'Usuário Exemplo' }, displayName: { type: 'string', example: 'Alex' }, customDisplayName: nullable({ type: 'string' }), avatarUrl: nullable({ type: 'string', format: 'uri' }), createdAt: timestamp, updatedAt: timestamp },
  },
  User: {
    type: 'object', required: ['id', 'provider', 'email', 'name', 'displayName', 'googleName', 'avatarUrl', 'createdAt'],
    properties: { id: { type: 'integer' }, provider: { type: 'string', const: 'google' }, email: { type: 'string', format: 'email', example: 'demo@example.com' }, name: { type: 'string' }, displayName: { type: 'string' }, googleName: { type: 'string' }, avatarUrl: nullable({ type: 'string', format: 'uri' }), createdAt: timestamp, session: { type: 'object', properties: { createdAt: timestamp, expiresAt: timestamp } } },
  },
  Settings: {
    type: 'object', required: ['theme', 'createdAt', 'updatedAt'], properties: { theme: { type: 'string', enum: ['system', 'light', 'dark'], example: 'system' }, createdAt: timestamp, updatedAt: timestamp },
  },
  Counts: {
    type: 'object', additionalProperties: false,
    properties: { transactions: { type: 'integer' }, recurringExpenses: { type: 'integer' }, categories: { type: 'integer' }, cards: { type: 'integer' }, cardPayments: { type: 'integer' }, sheetImports: { type: 'integer' }, syncRuns: { type: 'integer' } },
  },
  GoogleSheetsIntegration: {
    type: 'object', required: ['status', 'connected'],
    properties: { status: { type: 'string', example: 'ready' }, connected: { type: 'boolean' }, googleAccountEmail: { type: 'string', format: 'email' }, spreadsheetId: nullable({ type: 'string' }), spreadsheetName: nullable({ type: 'string' }), spreadsheetUrl: nullable({ type: 'string', format: 'uri' }), startYear: nullable({ type: 'integer' }), connectedAt: nullable(timestamp), lastExportAt: nullable(timestamp), lastImportAt: nullable(timestamp), lastErrorCode: nullable({ type: 'string' }), requiresFullExport: { type: 'boolean' }, suggestedStartYear: nullable({ type: 'integer' }) },
  },
  SyncRun: {
    type: 'object', required: ['id', 'idempotencyKey', 'trigger', 'status', 'recordsRead', 'recordsImported', 'recordsExisting', 'recordsExported', 'conflictCount', 'invalidCount', 'details', 'error', 'startedAt', 'completedAt'],
    properties: { id: { type: 'integer' }, idempotencyKey: { type: 'string', format: 'uuid' }, status: { type: 'string', enum: ['running', 'success', 'conflicts', 'failed'] }, trigger: { type: 'string', example: 'manual' }, recordsRead: { type: 'integer' }, recordsImported: { type: 'integer' }, recordsExisting: { type: 'integer' }, recordsExported: { type: 'integer' }, conflictCount: { type: 'integer' }, invalidCount: { type: 'integer' }, details: { type: 'object', additionalProperties: true }, error: nullable({ type: 'object', required: ['code', 'message'], properties: { code: { type: 'string' }, message: { type: 'string' } } }), startedAt: timestamp, completedAt: nullable(timestamp), idempotentReplay: { type: 'boolean' } },
  },
}

function addZodSchema(name, schema) {
  const jsonSchema = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' })
  delete jsonSchema.$schema
  schemas[name] = jsonSchema
}

module.exports = { schemas, addZodSchema, nullable, timestamp, date, money }
