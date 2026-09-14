const { schemas, addZodSchema, nullable, timestamp, money } = require('./components')
const categorySchemas = require('../schemas/category.schema')
const transactionSchemas = require('../schemas/transaction.schema')
const cardSchemas = require('../schemas/card.schema')
const recurringSchemas = require('../schemas/recurringExpense.schema')
const settingsSchemas = require('../schemas/settings.schema')
const profileSchemas = require('../schemas/profile.schema')
const dataSchemas = require('../schemas/dataManagement.schema')
const sheetsSchemas = require('../schemas/googleSheets.schema')
const { healthQuerySchema } = require('../schemas/health.schema')

const zodComponents = {
  CreateCategoryInput: categorySchemas.createCategorySchema, UpdateCategoryInput: categorySchemas.updateCategorySchema,
  CategoryIdParams: categorySchemas.categoryIdParamSchema, ListCategoriesQuery: categorySchemas.listCategoriesQuerySchema,
  CreateTransactionInput: transactionSchemas.createTransactionSchema, UpdateTransactionInput: transactionSchemas.updateTransactionSchema,
  TransactionIdParams: transactionSchemas.transactionIdParamSchema, ListTransactionsQuery: transactionSchemas.listTransactionsQuerySchema,
  FinancialSummaryQuery: transactionSchemas.financialSummaryQuerySchema,
  CreateCardInput: cardSchemas.createCardSchema, UpdateCardInput: cardSchemas.updateCardSchema, CardIdParams: cardSchemas.cardIdParamSchema,
  ListCardsQuery: cardSchemas.listCardsQuerySchema, CreateCardPaymentInput: cardSchemas.createCardPaymentSchema,
  CreateRecurringExpenseInput: recurringSchemas.createRecurringExpenseSchema, UpdateRecurringExpenseInput: recurringSchemas.updateRecurringExpenseSchema,
  RecurringExpenseIdParams: recurringSchemas.recurringExpenseIdParamSchema, ListRecurringExpensesQuery: recurringSchemas.listRecurringExpensesQuerySchema,
  DeleteRecurringExpenseInput: recurringSchemas.deleteRecurringExpenseSchema,
  UpdateSettingsInput: settingsSchemas.updateSettingsSchema, UpdateProfileInput: profileSchemas.updateProfileSchema,
  DataPreviewQuery: dataSchemas.previewQuerySchema, ClearRecordsInput: dataSchemas.clearRecordsSchema, ResetCofreInput: dataSchemas.resetSchema,
  CreateSpreadsheetInput: sheetsSchemas.createSpreadsheetSchema, ConfirmImportInput: sheetsSchemas.confirmImportSchema,
  SynchronizeInput: sheetsSchemas.synchronizeSchema, SyncHistoryQuery: sheetsSchemas.syncHistoryQuerySchema,
  HealthQuery: healthQuerySchema,
}
for (const [name, schema] of Object.entries(zodComponents)) addZodSchema(name, schema)

const ref = (name) => ({ $ref: `#/components/schemas/${name}` })
const json = (schema, example) => ({ content: { 'application/json': { schema, ...(example ? { example } : {}) } } })
const response = (description, dataSchema, options = {}) => ({
  description,
  ...json({ type: 'object', required: ['success', 'data', 'message'], properties: { success: { type: 'boolean', const: true }, data: dataSchema, message: { type: 'string', example: options.message || '' }, ...(options.meta ? { meta: ref('PaginationMeta') } : {}) } }),
})
const redirect = (description) => ({ description, headers: { Location: { schema: { type: 'string', format: 'uri' } }, 'Set-Cookie': { schema: { type: 'string' }, description: 'Cookie HTTP-only de estado ou sessão.' } } })
const errors = (codes = [400, 401, 403, 404, 409, 500, 503]) => Object.fromEntries(codes.map((code) => [code, { description: { 400: 'Requisição inválida', 401: 'Sessão ausente, inválida ou expirada', 403: 'Origem ou acesso não permitido', 404: 'Recurso não encontrado', 409: 'Conflito com o estado do recurso', 500: 'Erro interno', 503: 'Serviço ou banco indisponível' }[code], ...json(ref('ErrorResponse')) }]))
const body = (name, required = true) => ({ required, ...json(ref(name)) })
const params = (name, location) => {
  const schema = schemas[name]
  return Object.entries(schema.properties || {}).map(([key, value]) => ({ name: key, in: location, required: location === 'path' || (schema.required || []).includes(key), schema: value }))
}
const secured = { security: [{ sessionCookie: [] }] }
const op = ({ tags, summary, description, input, inputRequired, query, path, parameters = [], success, successCode = 200, extraResponses = {}, security = secured.security, errorCodes }) => ({
  tags: [tags], summary, ...(description ? { description } : {}), ...(security ? { security } : {}),
  ...((query || path || parameters.length) ? { parameters: [...(path ? params(path, 'path') : []), ...(query ? params(query, 'query') : []), ...parameters] } : {}),
  ...(input ? { requestBody: body(input, inputRequired !== false) } : {}),
  responses: { [successCode]: success, ...errors(errorCodes || (path ? [400, 401, 403, 404, 409, 500, 503] : [400, 401, 403, 409, 500, 503])), ...extraResponses },
})

const oauthCallbackParameters = [
  { name: 'code', in: 'query', required: false, schema: { type: 'string' }, description: 'Código de autorização retornado pelo Google.' },
  { name: 'state', in: 'query', required: false, schema: { type: 'string' }, description: 'State correlacionado ao cookie HTTP-only temporário.' },
  { name: 'error', in: 'query', required: false, schema: { type: 'string' }, description: 'Erro retornado quando o usuário cancela ou o Google rejeita a autorização.' },
]

const categoryArray = { type: 'array', items: ref('Category') }
const transactionArray = { type: 'array', items: ref('Transaction') }
const cardArray = { type: 'array', items: ref('CreditCard') }
const recurringArray = { type: 'array', items: ref('RecurringExpense') }
const nullSchema = { type: 'null' }

const paths = {
  '/api-docs': { get: op({ tags: 'Documentação', summary: 'Abre a Swagger UI', description: 'Interface HTML navegável do contrato HTTP atual.', security: null, errorCodes: [403, 500], success: { description: 'Swagger UI', content: { 'text/html': { schema: { type: 'string' } } } } }) },
  '/openapi.json': { get: op({ tags: 'Documentação', summary: 'Obtém o documento OpenAPI', security: null, errorCodes: [403, 500], success: { description: 'Documento OpenAPI 3.1', ...json({ type: 'object', additionalProperties: true }) } }) },
  '/': { get: op({ tags: 'Sistema', summary: 'Informações básicas da API', security: null, success: response('API disponível', { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, version: { type: 'string' }, environment: { type: 'string' } } }) }) },
  '/health': { get: op({ tags: 'Sistema', summary: 'Health check e conectividade do banco', security: null, query: 'HealthQuery', success: response('Serviço saudável', { type: 'object', properties: { status: { type: 'string', enum: ['ok', 'degraded'] }, database: { type: 'string', enum: ['connected', 'unavailable'] }, uptimeSeconds: { type: 'integer' }, timestamp } }), extraResponses: { 503: response('Serviço degradado', { type: 'object' }) } }) },
  '/version': { get: op({ tags: 'Sistema', summary: 'Versões da aplicação e do Node.js', security: null, success: response('Versões atuais', { type: 'object', properties: { version: { type: 'string' }, node: { type: 'string' }, environment: { type: 'string' } } }) }) },
  '/status': { get: op({ tags: 'Sistema', summary: 'Estado operacional do processo', security: null, success: response('Estado operacional', { type: 'object', properties: { environment: { type: 'string' }, pid: { type: 'integer' }, uptimeSeconds: { type: 'integer' }, startedAt: timestamp, platform: { type: 'string' }, nodeVersion: { type: 'string' }, memory: { type: 'object', properties: { rssMb: { type: 'integer' }, heapUsedMb: { type: 'integer' } } }, database: { type: 'object', properties: { provider: { type: 'string', enum: ['turso', 'local'] }, connected: { type: 'boolean' } } } } }) }) },

  '/auth/google': { get: op({ tags: 'Autenticação', summary: 'Inicia o login Google OAuth', description: 'Cria uma tentativa com state, nonce e PKCE, grava cookie temporário HTTP-only e redireciona ao Google.', security: null, successCode: 302, success: redirect('Redirecionamento para o Google') }) },
  '/auth/google/callback': { get: op({ tags: 'Autenticação', summary: 'Callback do Google OAuth', description: 'Valida code, state, nonce, PKCE e whitelist. Em sucesso cria a sessão; em falha redireciona ao frontend com auth_error.', security: null, parameters: oauthCallbackParameters, successCode: 302, success: redirect('Redirecionamento ao frontend'), errorCodes: [] }) },
  '/auth/me': { get: op({ tags: 'Autenticação', summary: 'Consulta a sessão atual', description: 'É público para permitir ao frontend distinguir sessão ausente de sessão válida.', security: [{ sessionCookie: [] }, {}], success: response('Estado da autenticação', { type: 'object', required: ['authenticated', 'user'], properties: { authenticated: { type: 'boolean' }, user: nullable(ref('User')) } }) }) },
  '/auth/logout': { post: op({ tags: 'Autenticação', summary: 'Encerra a sessão atual', description: 'Invalida a sessão persistida e expira o cookie. Se Origin estiver presente, deve pertencer à allowlist CORS.', security: [{ sessionCookie: [] }, {}], success: response('Sessão encerrada', nullSchema, { message: 'Sessão encerrada com sucesso.' }) }) },

  '/categories': {
    get: op({ tags: 'Categorias', summary: 'Lista categorias do usuário', query: 'ListCategoriesQuery', success: response('Categorias encontradas', categoryArray) }),
    post: op({ tags: 'Categorias', summary: 'Cria uma categoria', input: 'CreateCategoryInput', successCode: 201, success: response('Categoria criada', ref('Category'), { message: 'Categoria criada com sucesso.' }) }),
  },
  '/categories/{id}': {
    get: op({ tags: 'Categorias', summary: 'Obtém uma categoria', path: 'CategoryIdParams', success: response('Categoria encontrada', ref('Category')) }),
    put: op({ tags: 'Categorias', summary: 'Atualiza parcialmente uma categoria', description: 'Embora use PUT, o contrato aceita somente os campos enviados.', path: 'CategoryIdParams', input: 'UpdateCategoryInput', success: response('Categoria atualizada', ref('Category')) }),
    delete: op({ tags: 'Categorias', summary: 'Exclui fisicamente uma categoria sem vínculos', path: 'CategoryIdParams', success: response('Categoria excluída', { type: 'object', properties: { category: nullSchema } }) }),
  },
  '/categories/{id}/deletion-preview': { get: op({ tags: 'Categorias', summary: 'Mostra o impacto da exclusão da categoria', path: 'CategoryIdParams', success: response('Impacto calculado', { type: 'object', properties: { category: ref('Category'), transactions: { type: 'integer' }, recurringExpenses: { type: 'integer' }, canDelete: { type: 'boolean' } } }) }) },

  '/transactions': {
    get: op({ tags: 'Transações', summary: 'Lista e filtra transações', description: 'Pode materializar ocorrências recorrentes até o período consultado.', query: 'ListTransactionsQuery', success: response('Página de transações', transactionArray, { meta: true }) }),
    post: op({ tags: 'Transações', summary: 'Cria uma transação ou compra parcelada', description: 'Com cardId e installmentTotal maior que 1, cria atomicamente todas as parcelas.', input: 'CreateTransactionInput', successCode: 201, success: response('Transação ou parcelas criadas', { oneOf: [ref('Transaction'), { type: 'object', properties: { installmentGroupId: { type: 'string', format: 'uuid' }, count: { type: 'integer' }, transactions: transactionArray } }] }) }),
  },
  '/transactions/summary': { get: op({ tags: 'Transações', summary: 'Resumo financeiro mensal por competência', query: 'FinancialSummaryQuery', success: response('Resumo calculado', { type: 'object', properties: { totalIncome: money, totalExpenses: money, balance: money } }) }) },
  '/transactions/{id}': {
    get: op({ tags: 'Transações', summary: 'Obtém uma transação', path: 'TransactionIdParams', success: response('Transação encontrada', ref('Transaction')) }),
    put: op({ tags: 'Transações', summary: 'Atualiza parcialmente uma transação', description: 'Não altera automaticamente as demais parcelas do grupo.', path: 'TransactionIdParams', input: 'UpdateTransactionInput', success: response('Transação atualizada', ref('Transaction')) }),
    delete: op({ tags: 'Transações', summary: 'Exclui definitivamente uma transação', path: 'TransactionIdParams', success: response('Transação excluída', nullSchema) }),
  },
  '/transactions/{id}/deletion-preview': { get: op({ tags: 'Transações', summary: 'Mostra o impacto da exclusão da transação', path: 'TransactionIdParams', success: response('Impacto calculado', { type: 'object', properties: { id: { type: 'integer' }, description: { type: 'string' }, amount: money, type: { type: 'string' }, permanent: { type: 'boolean' }, isRecurringOccurrence: { type: 'boolean' }, cardLimitReduction: money, installmentGroupSize: { type: 'integer' }, deletesOnlyThisInstallment: { type: 'boolean' } } }) }) },

  '/cards': {
    get: op({ tags: 'Cartões', summary: 'Lista cartões do usuário', query: 'ListCardsQuery', success: response('Cartões encontrados', cardArray) }),
    post: op({ tags: 'Cartões', summary: 'Cria um cartão', input: 'CreateCardInput', successCode: 201, success: response('Cartão criado', ref('CreditCard')) }),
  },
  '/cards/{id}': {
    get: op({ tags: 'Cartões', summary: 'Obtém um cartão', path: 'CardIdParams', success: response('Cartão encontrado', ref('CreditCard')) }),
    put: op({ tags: 'Cartões', summary: 'Atualiza parcialmente um cartão', path: 'CardIdParams', input: 'UpdateCardInput', success: response('Cartão atualizado', ref('CreditCard')) }),
    delete: op({ tags: 'Cartões', summary: 'Exclui fisicamente um cartão sem vínculos', path: 'CardIdParams', success: response('Cartão excluído', { type: 'object', properties: { card: nullSchema } }) }),
  },
  '/cards/{id}/summary': { get: op({ tags: 'Cartões', summary: 'Consulta limite e pagamentos do cartão', path: 'CardIdParams', success: response('Limite calculado', ref('CardSummary')) }) },
  '/cards/{id}/deletion-preview': { get: op({ tags: 'Cartões', summary: 'Mostra o impacto da exclusão do cartão', path: 'CardIdParams', success: response('Impacto calculado', { type: 'object', properties: { card: ref('CreditCard'), transactions: { type: 'integer' }, recurringExpenses: { type: 'integer' }, payments: { type: 'integer' }, purchasesTotal: money, canDelete: { type: 'boolean' } } }) }) },
  '/cards/{id}/payments': { post: op({ tags: 'Cartões', summary: 'Registra pagamento de fatura', path: 'CardIdParams', input: 'CreateCardPaymentInput', successCode: 201, success: response('Pagamento registrado', { type: 'object', properties: { payment: ref('CardPayment'), summary: ref('CardSummary') } }) }) },

  '/recurring-expenses': {
    get: op({ tags: 'Recorrências', summary: 'Lista gastos recorrentes', query: 'ListRecurringExpensesQuery', success: response('Recorrências encontradas', recurringArray) }),
    post: op({ tags: 'Recorrências', summary: 'Cria um gasto recorrente', input: 'CreateRecurringExpenseInput', successCode: 201, success: response('Recorrência criada', ref('RecurringExpense')) }),
  },
  '/recurring-expenses/{id}': {
    get: op({ tags: 'Recorrências', summary: 'Obtém um gasto recorrente', path: 'RecurringExpenseIdParams', success: response('Recorrência encontrada', ref('RecurringExpense')) }),
    put: op({ tags: 'Recorrências', summary: 'Atualiza parcialmente um gasto recorrente', description: 'Ocorrências históricas já materializadas não são reescritas.', path: 'RecurringExpenseIdParams', input: 'UpdateRecurringExpenseInput', success: response('Recorrência atualizada', ref('RecurringExpense')) }),
    delete: op({ tags: 'Recorrências', summary: 'Exclui uma recorrência com política histórica explícita', path: 'RecurringExpenseIdParams', input: 'DeleteRecurringExpenseInput', success: response('Recorrência excluída', { type: 'object', required: ['deletedTransactions', 'preservedTransactions'], properties: { deletedTransactions: { type: 'integer' }, preservedTransactions: { type: 'integer' } } }) }),
  },
  '/recurring-expenses/{id}/deletion-preview': { get: op({ tags: 'Recorrências', summary: 'Mostra ocorrências afetadas por cada modo de exclusão', path: 'RecurringExpenseIdParams', success: response('Impacto calculado', { type: 'object', required: ['id', 'description', 'transactionCount', 'totalAmount', 'cardLimitImpact', 'firstDate', 'lastDate'], properties: { id: { type: 'integer' }, description: { type: 'string' }, transactionCount: { type: 'integer' }, totalAmount: money, cardLimitImpact: money, firstDate: nullable({ type: 'string', format: 'date' }), lastDate: nullable({ type: 'string', format: 'date' }) } }) }) },

  '/settings': {
    get: op({ tags: 'Preferências', summary: 'Obtém preferências do usuário', success: response('Preferências atuais', ref('Settings')) }),
    patch: op({ tags: 'Preferências', summary: 'Atualiza preferências enviadas', input: 'UpdateSettingsInput', success: response('Preferências atualizadas', ref('Settings')) }),
  },
  '/profile': {
    get: op({ tags: 'Perfil', summary: 'Obtém o perfil autenticado', success: response('Perfil atual', ref('Profile')) }),
    patch: op({ tags: 'Perfil', summary: 'Atualiza o nome de exibição', description: 'E-mail, identidade Google e demais campos não são aceitos.', input: 'UpdateProfileInput', success: response('Perfil atualizado', ref('Profile')) }),
  },

  '/data-management/preview': { get: op({ tags: 'Gerenciamento de dados', summary: 'Pré-visualiza uma operação destrutiva', query: 'DataPreviewQuery', success: response('Contagens e frase de confirmação', { type: 'object', properties: { operation: { type: 'string', enum: ['clear-records', 'reset'] }, counts: ref('Counts'), totalRecords: { type: 'integer' }, preservesAccount: { type: 'boolean' }, preservesSettings: { type: 'boolean' }, preservesStructure: { type: 'boolean' }, spreadsheetWillBeOverwritten: { type: 'boolean' }, confirmationPhrase: { type: 'string' } } }) }) },
  '/data-management/clear-records': { post: op({ tags: 'Gerenciamento de dados', summary: 'Remove todos os registros financeiros', description: 'Preserva categorias, cartões, recorrências, conta e preferências.', input: 'ClearRecordsInput', success: response('Registros removidos', { type: 'object', properties: { deleted: ref('Counts'), spreadsheetRequiresExport: { type: 'boolean' } } }) }) },
  '/data-management/reset': { post: op({ tags: 'Gerenciamento de dados', summary: 'Reseta os dados financeiros do Cofre', description: 'Preserva conta, sessão, perfil, preferências e vínculo Sheets.', input: 'ResetCofreInput', success: response('Dados resetados', { type: 'object', properties: { deleted: ref('Counts'), spreadsheetRequiresExport: { type: 'boolean' } } }) }) },

  '/integrations/google-sheets': {
    get: op({ tags: 'Google Sheets', summary: 'Consulta o estado da integração', success: response('Estado da integração', ref('GoogleSheetsIntegration')) }),
    delete: op({ tags: 'Google Sheets', summary: 'Desconecta a integração', description: 'Revoga o token quando possível e remove a integração local; não apaga a planilha do Drive.', success: response('Integração desconectada', nullSchema) }),
  },
  '/integrations/google-sheets/connect': { get: op({ tags: 'Google Sheets', summary: 'Inicia autorização Google Drive/Sheets', successCode: 302, success: redirect('Redirecionamento para o Google') }) },
  '/integrations/google-sheets/callback': { get: op({ tags: 'Google Sheets', summary: 'Callback da autorização Google Sheets', description: 'Exige a sessão Cofre existente e valida que a conta Google é a mesma. Falhas internas do callback também são comunicadas por redirecionamento.', parameters: oauthCallbackParameters, successCode: 302, success: redirect('Redirecionamento para Configurações'), errorCodes: [401, 403] }) },
  '/integrations/google-sheets/spreadsheet': { post: op({ tags: 'Google Sheets', summary: 'Cria a planilha gerenciada', input: 'CreateSpreadsheetInput', successCode: 201, success: response('Planilha criada e exportada', ref('GoogleSheetsIntegration')) }) },
  '/integrations/google-sheets/export': { post: op({ tags: 'Google Sheets', summary: 'Exporta o estado canônico para a planilha', success: response('Exportação concluída', { type: 'object', properties: { exportedTransactions: { type: 'integer' }, exportedRecords: { type: 'integer' }, breakdown: { type: 'object', properties: { transactions: { type: 'integer' }, categorySummaries: { type: 'integer' } } }, exportedAt: timestamp } }) }) },
  '/integrations/google-sheets/import/preview': { post: op({ tags: 'Google Sheets', summary: 'Valida alterações importáveis da planilha', success: response('Preview calculado', { type: 'object', properties: { summary: { type: 'object', properties: { new: { type: 'integer' }, existing: { type: 'integer' }, invalid: { type: 'integer' }, conflicts: { type: 'integer' } } }, fingerprint: { type: 'string', pattern: '^[a-f0-9]{64}$' }, details: { type: 'object', additionalProperties: true }, canImport: { type: 'boolean' } } }) }) },
  '/integrations/google-sheets/import': { post: op({ tags: 'Google Sheets', summary: 'Confirma a importação previamente validada', input: 'ConfirmImportInput', success: response('Importação concluída', { type: 'object', properties: { importedCount: { type: 'integer' }, alreadyImported: { type: 'boolean' } } }) }) },
  '/integrations/google-sheets/sync': {
    get: op({ tags: 'Google Sheets', summary: 'Consulta o estado da sincronização', success: response('Estado atual', { type: 'object', properties: { integrationStatus: { type: 'string' }, ready: { type: 'boolean' }, latest: nullable(ref('SyncRun')) } }) }),
    post: op({ tags: 'Google Sheets', summary: 'Executa sincronização manual idempotente', input: 'SynchronizeInput', success: response('Sincronização processada', ref('SyncRun')) }),
  },
  '/integrations/google-sheets/sync/history': { get: op({ tags: 'Google Sheets', summary: 'Lista o histórico de sincronizações', query: 'SyncHistoryQuery', success: response('Histórico encontrado', { type: 'array', items: ref('SyncRun') }) }) },
}

const document = {
  openapi: '3.1.0',
  info: { title: 'Cofre API', version: '0.3.0', description: 'API HTTP do Cofre. O banco é a fonte canônica; Google Sheets é uma integração secundária controlada. Rotas de negócio exigem cookie de sessão HTTP-only. Em métodos mutáveis, quando o cliente envia o header Origin, ele deve corresponder a uma origem autorizada pelo backend; caso contrário a proteção CSRF responde 403 com code CSRF_REJECTED.' },
  servers: [{ url: '/', description: 'Servidor atual' }],
  tags: ['Documentação', 'Sistema', 'Autenticação', 'Categorias', 'Transações', 'Cartões', 'Recorrências', 'Preferências', 'Perfil', 'Gerenciamento de dados', 'Google Sheets'].map((name) => ({ name })),
  paths,
  components: {
    securitySchemes: { sessionCookie: { type: 'apiKey', in: 'cookie', name: 'cofre_session', description: 'Cookie de sessão opaco, HTTP-only. O nome pode ser alterado por configuração do backend.' } },
    schemas,
  },
}

module.exports = document
