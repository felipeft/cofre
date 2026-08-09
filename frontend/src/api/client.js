// Cliente HTTP centralizado. Nenhum Service usa `fetch` diretamente — todos
// passam por aqui. Único lugar que sabe a base URL, trata erros de forma
// uniforme e (quando a autenticação existir) enviará o cookie de sessão.

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// Erro rico o suficiente para o toast mostrar uma mensagem amigável (`message`,
// já em pt-BR, vem do backend) e, se algum dia fizer falta, para lógica mais
// fina decidir com base em `status`/`code` (ex: redirecionar em 401 quando a
// autenticação existir).
export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

async function request(path, options = {}) {
  let response

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      // Preparado para a autenticação por sessão HTTP-only futura mesmo sem
      // login existir ainda — nenhuma chamada precisará ser revisitada
      // quando essa etapa chegar.
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })
  } catch {
    // Falha de rede de verdade (servidor fora do ar, sem internet) — não
    // existe resposta HTTP para interpretar.
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.', {
      status: 0,
      code: 'NETWORK_ERROR',
    })
  }

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json().catch(() => null) : null

  if (!response.ok) {
    const message = payload?.message || 'Ocorreu um erro inesperado. Tente novamente.'
    throw new ApiError(message, { status: response.status, code: payload?.code, details: payload?.details })
  }

  return payload
}

export const apiClient = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
}
