// Cliente HTTP centralizado.
//
// Nenhum Service deve usar `fetch` diretamente — todos passam por aqui.
// Isso garante um único lugar para tratar base URL, headers (ex: token do
// Google OAuth futuramente), parsing de erro e timeouts.
//
// Hoje nenhuma dessas funções é chamada de verdade (os Services ainda leem
// os arquivos em `data/`), mas a assinatura já é a definitiva: quando o
// backend em Node.js/Express existir, basta trocar o corpo dos Services
// para chamar `apiClient.get(...)` etc. em vez de retornar o mock.

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText)
    throw new Error(`[apiClient] ${options.method ?? 'GET'} ${path} → ${response.status}: ${message}`)
  }

  if (response.status === 204) return null
  return response.json()
}

export const apiClient = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
}
