const fs = require('node:fs')
const path = require('node:path')
const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const SwaggerParser = require('@apidevtools/swagger-parser')
const document = require('../src/openapi/document')
const openApiRoutes = require('../src/routes/openapi.routes')

const routePrefixes = {
  'system.routes.js': '',
  'auth.routes.js': '/auth',
  'category.routes.js': '/categories',
  'transaction.routes.js': '/transactions',
  'card.routes.js': '/cards',
  'recurringExpense.routes.js': '/recurring-expenses',
  'settings.routes.js': '/settings',
  'profile.routes.js': '/profile',
  'dataManagement.routes.js': '/data-management',
  'googleSheets.routes.js': '/integrations/google-sheets',
}

function normalizeExpressPath(prefix, routePath) {
  const joined = `${prefix}${routePath === '/' ? '' : routePath}` || '/'
  return joined.replace(/:([A-Za-z0-9_]+)/g, '{$1}')
}

function implementedOperations() {
  const routesDir = path.join(__dirname, '..', 'src', 'routes')
  const functionalRouteFiles = fs.readdirSync(routesDir)
    .filter((file) => file.endsWith('.routes.js') && !['openapi.routes.js'].includes(file))
    .sort()
  assert.deepEqual(functionalRouteFiles, Object.keys(routePrefixes).sort(), 'Atualize o inventário OpenAPI ao adicionar um arquivo de rotas')
  const operations = []
  for (const [file, prefix] of Object.entries(routePrefixes)) {
    const source = fs.readFileSync(path.join(routesDir, file), 'utf8')
    for (const match of source.matchAll(/router\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g)) {
      operations.push(`${match[1].toUpperCase()} ${normalizeExpressPath(prefix, match[2])}`)
    }
  }
  return operations.sort()
}

function documentedOperations() {
  const methods = new Set(['get', 'post', 'put', 'patch', 'delete'])
  return Object.entries(document.paths)
    .flatMap(([routePath, item]) => Object.entries(item).filter(([method, operation]) => methods.has(method) && !operation.tags.includes('Documentação')).map(([method]) => `${method.toUpperCase()} ${routePath}`))
    .sort()
}

describe('contrato OpenAPI', () => {
  test('é um documento OpenAPI 3.1 válido', async () => {
    const validated = await SwaggerParser.validate(document)
    assert.equal(validated.openapi, '3.1.0')
  })

  test('cobre exatamente as 53 operações funcionais montadas pelo Express', () => {
    assert.deepEqual(documentedOperations(), implementedOperations())
  })

  test('toda operação documenta sucesso, erros e classificação por tag', () => {
    for (const [routePath, pathItem] of Object.entries(document.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        assert.ok(operation.tags?.length, `${method.toUpperCase()} ${routePath} sem tag`)
        assert.ok(operation.summary, `${method.toUpperCase()} ${routePath} sem resumo`)
        assert.ok(Object.keys(operation.responses || {}).some((code) => /^2|3/.test(code)), `${method.toUpperCase()} ${routePath} sem resposta de sucesso`)
      }
    }
  })

  test('schemas de entrada são gerados a partir dos schemas Zod', () => {
    assert.equal(document.components.schemas.CreateCategoryInput.properties.name.maxLength, 60)
    assert.deepEqual(document.components.schemas.DeleteRecurringExpenseInput.properties.mode.enum, ['preserve-history', 'with-history'])
    assert.equal(document.components.schemas.SynchronizeInput.properties.requestId.format, 'uuid')
  })

  test('monta as rotas públicas do JSON e da Swagger UI', () => {
    assert.ok(document.paths['/openapi.json']?.get)
    assert.ok(document.paths['/api-docs']?.get)
    const jsonLayer = openApiRoutes.stack.find((layer) => layer.route?.path === '/openapi.json')
    assert.equal(jsonLayer?.route?.methods?.get, true)

    const routeSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'routes', 'openapi.routes.js'), 'utf8')
    assert.match(routeSource, /router\.use\('\/api-docs'/)
    assert.match(routeSource, /swaggerUi\.setup\(document/)
  })
})
