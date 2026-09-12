# COFRE — Contexto técnico atual

O Cofre é uma aplicação financeira multiusuário com frontend React/Vite,
backend Node.js/Express, banco libSQL/Turso, autenticação Google e integração
opcional com Google Sheets.

## Arquitetura

```text
Frontend: Page → Hook/Context → Service → API client
Backend:  Route → Auth/Validation → Controller → Service → Domain/Repository → Banco
```

O frontend é publicado na Vercel. O proxy `/api` mantém os cookies de sessão
confiáveis no Safari, enquanto a API roda no Render e persiste dados no Turso.

## Domínio atual

- Categorias personalizáveis por usuário.
- Receitas e despesas com data, competência, status, tags e observações.
- Cartões, parcelas e pagamentos manuais de fatura.
- Gastos recorrentes com geração idempotente de ocorrências.
- Dashboard, histórico, filtros, navegação mensal e análises.
- Perfil, sessão e tema individual (`system`, `light`, `dark`).
- Google Sheets com abas anuais, importação de despesas e sincronização manual auditável.

O saldo é calculado exclusivamente como receitas menos despesas. Destinações
pessoais de renda são registradas como despesas comuns na categoria escolhida
pelo usuário.

## Persistência e segurança

Migrations são forward-only e executadas em ordem. Todas as entidades privadas
possuem `user_id`; repositories combinam o id do recurso com o usuário da sessão
para impedir acesso cruzado. Exclusões visíveis são físicas, exceto o encerramento
explícito de uma definição recorrente, que preserva suas ocorrências históricas.
