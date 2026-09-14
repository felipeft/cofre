# Banco de dados na arquitetura

O banco principal é o data store do backend e a fonte persistente do ambiente Production. A aplicação utiliza `@libsql/client` tanto para um arquivo libSQL/SQLite local quanto para o banco remoto hospedado no Turso.

## Responsabilidades arquiteturais

- Persistir identidade, perfil, preferências e sessões.
- Persistir categorias, transações, cartões, pagamentos e definições recorrentes.
- Guardar tentativas OAuth efêmeras e estado da integração Google Sheets.
- Manter idempotência, conflitos, contagens e histórico de sincronizações.
- Reforçar integridade referencial e ownership, além das validações de service.
- Executar mudanças de múltiplas entidades de maneira atômica.

## Acesso

Somente os repositories acessam a fachada de banco. O frontend nunca se conecta ao Turso, e o build Demo não contém URL ou token de banco.

```text
Service → Repository → database facade → @libsql/client
                                      ├── file:... no desenvolvimento/testes
                                      └── libsql://... no Turso
```

O backend serializa o acesso do client com `concurrency: 1`, habilita foreign keys e expõe operações `prepare`, `exec`, `batch` e `transaction`. Erros da biblioteca são traduzidos pelos repositories para erros da aplicação.

## Evolução do schema

Migrations SQL numeradas são forward-only e registradas em `schema_migrations`. O bootstrap aplica apenas arquivos ainda não registrados e envolve cada migration em sua própria transação.

Esta página delimita a posição arquitetural do banco. Entidades, colunas,
constraints, índices e diagrama relacional estão na
[documentação do banco de dados](../database/index.md).
