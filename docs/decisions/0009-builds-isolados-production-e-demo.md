# ADR-0009 — Builds isolados para Production e Demo

Status: Accepted

## Contexto

Production contém dados pessoais, Google OAuth, Turso e Google Sheets. O projeto também precisa de uma demonstração pública interativa para portfólio, sem expor infraestrutura, exigir login ou enviar dados inseridos por visitantes a servidores.

As duas experiências compartilham interface e regras principais.

## Problema

Usar o backend real com um usuário público consumiria recursos e criaria caminho para dados privados. Espalhar condicionais `demoMode` pelos componentes duplicaria comportamento e facilitaria chamadas acidentais à API. Um fork divergiria rapidamente do produto real.

## Decisão

Manter uma única base de código e gerar dois builds independentes:

### Production

- `VITE_APP_MODE=production`;
- services usam o cliente HTTP central;
- frontend na Vercel encaminha `/api` ao backend no Render;
- backend usa Turso e integrações Google.

### Demo

- `VITE_APP_MODE=demo`;
- alias de build substitui o cliente HTTP por um adapter local com contrato semelhante;
- identidade fictícia, seed sintético e estado no namespace `cofre:demo:v1` do `localStorage`;
- reset remove apenas esse namespace e restaura o seed;
- build falha se `VITE_API_URL` estiver presente;
- auditoria do bundle procura hosts, secrets e marcadores proibidos;
- deployment aplica CSP com `connect-src 'none'`;
- Google Sheets é apresentado como indisponível, não chamado nem falsamente validado.

## Alternativas consideradas

### Segundo repositório ou fork

Forneceria isolamento organizacional, mas duplicaria manutenção e permitiria divergência de UI e regras.

### Usuário Demo no backend de Production

Reutilizaria todos os casos de uso, mas daria ao público um caminho configurado para API, banco e serviços privados.

### Interface estática sem persistência

Seria segura, porém não demonstraria CRUD, parcelas, recorrências, limite e reset.

### Condicionais em cada componente

Pareceria rápido no início, mas contaminaria a UI com decisões de infraestrutura e aumentaria o risco de chamadas externas acidentais.

## Consequências

### Positivas

- Visitantes exploram o produto sem tocar a infraestrutura pessoal.
- Componentes continuam consumindo contratos semelhantes.
- Alterações locais persistem entre recargas e podem ser resetadas.
- O isolamento é reforçado em configuração, bundle e política do deployment.
- Não é necessário manter um fork.

### Negativas e trade-offs

- O adapter Demo reimplementa parte das regras e pode divergir do backend.
- `localStorage` não oferece transações relacionais nem compartilhamento entre dispositivos.
- OAuth e Sheets reais não podem ser demonstrados interativamente nesse ambiente.
- Mudanças de contrato precisam ser refletidas e testadas nos dois adapters.

## Evidências

- [`frontend/vite.config.js`](https://github.com/felipeft/cofre/blob/main/frontend/vite.config.js)
- [`frontend/src/demo/repository.js`](https://github.com/felipeft/cofre/blob/main/frontend/src/demo/repository.js)
- [`frontend/src/demo/storage.js`](https://github.com/felipeft/cofre/blob/main/frontend/src/demo/storage.js)
- [`frontend/scripts/audit-demo-build.mjs`](https://github.com/felipeft/cofre/blob/main/frontend/scripts/audit-demo-build.mjs)
- [`frontend/tests/demo/demoRepository.test.js`](https://github.com/felipeft/cofre/blob/main/frontend/tests/demo/demoRepository.test.js)
- [`vercel.json`](https://github.com/felipeft/cofre/blob/main/vercel.json)
- [`frontend/vercel.json`](https://github.com/felipeft/cofre/blob/main/frontend/vercel.json)
- [Arquitetura do frontend](../architecture/frontend.md)

## Relações com outros ADRs

- [ADR-0001](0001-persistencia-libsql-e-turso.md): a Demo não recebe acesso à persistência real.
- [ADR-0006](0006-google-oauth-e-sessoes-no-backend.md): autenticação real existe somente em Production.
- [ADR-0002](0002-banco-como-fonte-canonica.md): a canonicidade se aplica ao ambiente Production; a Demo é um sandbox local independente.
