# API HTTP e OpenAPI

O backend do Cofre publica um contrato **OpenAPI 3.1** gerado durante a
inicialização. O documento cobre as 53 operações funcionais atualmente
montadas pelo Express, além das duas rotas que entregam a própria documentação.

## Acesso local

Com o backend executando em `http://localhost:3000`:

- [Swagger UI](http://localhost:3000/api-docs)
- [OpenAPI JSON](http://localhost:3000/openapi.json)

Em um deployment, substitua apenas a origem pelo endereço público do backend.
A documentação não contém credenciais, tokens ou exemplos com dados pessoais.

## Fonte do contrato

- Parâmetros, query strings e corpos são convertidos dos schemas Zod usados
  pelo middleware real de validação.
- Respostas são declaradas em componentes centralizados, de acordo com os
  mappers, services e envelopes reais da API. Elas são manuais porque o
  backend ainda não aplica schemas Zod de saída.
- O catálogo de operações registra descrição, segurança, respostas e exemplos
  que não pertencem aos schemas de validação.

O teste `backend/tests/openapi.test.js` valida a especificação com Swagger
Parser e compara métodos/caminhos documentados com os arquivos de rotas.

```bash
cd backend
npm run openapi:validate
```

## Sessão e CSRF

As rotas de negócio usam um cookie de sessão opaco e HTTP-only. O Swagger não
recebe nem exibe o token: quando a UI é aberta em uma origem na qual o usuário
já possui uma sessão válida, o navegador envia o cookie automaticamente.

Para métodos mutáveis, o backend verifica o header `Origin` quando ele está
presente. Uma origem fora de `FRONTEND_URLS` recebe `403` com o código
`CSRF_REJECTED`. Não existe um token CSRF exposto ao JavaScript.

Os endpoints de sistema e o fluxo inicial de autenticação são públicos. O
callback do Google Sheets permanece protegido pela sessão Cofre existente.

## Limites da geração automática

Refinamentos estruturais do Zod são exportados para JSON Schema sempre que o
conversor consegue representá-los. Regras implementadas com `superRefine` ou
`refine` — por exemplo, relações entre campos de parcelamento e ordem de datas
— continuam sendo aplicadas pelo backend, mas precisam de descrição textual no
catálogo OpenAPI porque JSON Schema não preserva automaticamente toda função de
validação arbitrária.
