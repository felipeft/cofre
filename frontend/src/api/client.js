// Cliente HTTP centralizado. Nenhum Service usa `fetch` diretamente — todos
// passam por aqui. Único lugar que sabe a base URL, trata erros de forma
// uniforme e envia o cookie HTTP-only de sessão.

// `VITE_API_URL` frequentemente é configurada com barra final no painel do
// Vercel (ex: "https://cofre-api-mgdl.onrender.com/") — removê-la aqui, uma
// única vez, é o que garante que `${BASE_URL}${path}` nunca produza
// "...com//categories", não importa como a variável foi digitada.
function normalizeBaseUrl(rawUrl) {
  return rawUrl.replace(/\/+$/, '')
}

const BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL ?? '/api')

// Sempre um único "/" entre base e path, independente de o path já vir com
// uma barra inicial (todo `ENDPOINTS.*` vem, ex: '/categories') ou não.
function buildUrl(path) {
  return `${BASE_URL}/${path.replace(/^\/+/, '')}`
}

// Erro rico o suficiente para o toast mostrar uma mensagem amigável (`message`,
// já em pt-BR, vem do backend) e, se algum dia fizer falta, para lógica mais
// fina decidir com base em `status`/`code`.
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
    response = await fetch(buildUrl(path), {
      // A sessão vive no backend; o JavaScript nunca lê o cookie.
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
    if (response.status === 401) window.dispatchEvent(new CustomEvent('cofre:unauthenticated'))
    const message = payload?.message || 'Ocorreu um erro inesperado. Tente novamente.'
    throw new ApiError(message, { status: response.status, code: payload?.code, details: payload?.details })
  }

  return payload
}

export const apiClient = {
  url: buildUrl,
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
}
