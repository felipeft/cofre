# Estratégia e execução

## Princípios observados

A suíte prioriza regras com risco financeiro ou de isolamento. Cálculos puros são
testados sem infraestrutura; fluxos que dependem de persistência usam bancos
libSQL locais temporários; integrações Google substituem somente a fronteira
externa por doubles. Isso mantém determinismo sem transformar os testes em uma
simulação completa do código interno.

Os testes não dependem do Turso remoto, de credenciais, do Google OAuth real, da
API Google Sheets real nem dos dados pessoais de Production. Cada integração de
backend inicializa sua própria base temporária, aplica migrations e remove o
arquivo ao terminar. `NODE_ENV=test` força o banco local mesmo que variáveis do
Turso existam no ambiente.

## Camadas cobertas

### Testes unitários

Os testes unitários exercitam funções de domínio e transformações determinísticas:

- cálculo do limite do cartão e efeito de pagamentos;
- saldo financeiro;
- definição do primeiro vencimento pelo ciclo de fechamento;
- distribuição de parcelas em centavos, competências e datas válidas;
- calendário de recorrências, incluindo fim de mês e ano bissexto;
- calendário/layout da planilha, mapeamento seguro e criptografia de token.

Eles protegem principalmente contra erros de arredondamento, rollover de datas,
dupla contabilização e perda de precisão. Não comprovam persistência, autorização
ou contrato HTTP.

### Testes de integração

As integrações combinam services, repositories, migrations e libSQL local. Elas
cobrem CRUD e ownership, cartões e pagamentos, atomicidade de parcelas,
recorrências materializadas, exclusões, limpeza/reset, configurações e a
orquestração do Google Sheets com cliente externo simulado.

Esse nível detecta consultas sem `user_id`, constraints incompatíveis, gravações
parciais e regressões entre domínio e persistência. A maioria dessas suítes chama
o service diretamente, portanto não valida roteamento, serialização ou status HTTP.

### Testes de API e autenticação

`auth.integration.test.js` sobe a aplicação Express em porta efêmera e usa
`fetch`. O provedor Google é simulado na fronteira; callback, whitelist, cookie,
sessão persistida, expiração, logout, rotas protegidas e tentativas de acesso
cruzado são exercitados por HTTP.

Para as demais áreas, a cobertura HTTP é indireta. `openapi.test.js` compara o
inventário das rotas Express com as operações do OpenAPI, valida o documento 3.1,
verifica metadados mínimos e confirma alguns schemas gerados de Zod. Ele não envia
requisições para cada uma das 53 operações nem valida respostas reais contra o
schema publicado.

### Testes de regras de negócio

Parcelamento, recorrência, limite e summaries possuem testes puros e/ou integração
com persistência. Cenários críticos usam valores que revelam erro de centavo,
datas de fechamento, meses sem o dia configurado, competências futuras,
cancelamento, exclusão e repetição idempotente.

O histórico é protegido verificando que alterações na definição recorrente não
mudam ocorrências já materializadas. Parcelas são verificadas como um conjunto de
transações cuja soma é exatamente o total original, e a falha no meio da criação
é revertida integralmente.

### Testes de migrations

Todos os testes com banco novo passam pelo bootstrap e, por consequência, pela
aplicação completa das migrations atuais. Há ainda um teste dedicado ao upgrade:
ele materializa o estado até `0008`, insere dados legados e aplica `0009` a
`0015`, verificando sobrevivência dos dados, colunas importantes, defaults,
tabelas de Sheets e `foreign_key_check`.

Isso protege os cenários “banco novo” e “banco existente da Etapa 9” usados pelo
projeto. Não há matriz automatizada para partir de toda migration histórica,
teste de concorrência do migrator, checksum de arquivo alterado ou rollback de uma
migration que falha no meio.

### Regressão

Não existe uma suíte separada chamada “regressão”. O comando completo do backend
é a barreira de regressão das regras e integrações existentes; a suíte da Demo é a
barreira do adapter local. Build e lint são verificações complementares, não
substitutos de teste comportamental.

## Como executar

Pré-requisito: Node.js `22.x` e dependências instaladas em cada pacote.

```bash
cd backend
npm install
npm test
```

Validar somente o contrato OpenAPI:

```bash
cd backend
npm run openapi:validate
```

Executar a suíte da Demo:

```bash
cd frontend
npm install
npm run test:demo
```

Verificações estáticas e de empacotamento do frontend:

```bash
cd frontend
npm run lint
npm run build
npm run build:demo
```

`build:demo` também audita o artefato para impedir referências à infraestrutura
privada. Ele é uma garantia de build/isolamento, mas não é contabilizado entre os
104 cenários declarados no inventário. O runner oficial da Demo apresenta um
único teste agregado para o arquivo ESM; os sete casos internos continuam sendo
executados e qualquer falha reprova esse teste de arquivo.

## Fronteiras simuladas e validação manual

- Google OAuth: troca de código e identidade são simuladas; o restante do fluxo
  backend é real.
- Google Drive/Sheets: o cliente remoto é simulado; persistência, importação,
  exportação, conflitos, histórico e idempotência usam implementação real.
- Turso: nenhuma execução automatizada acessa o serviço remoto; usa-se libSQL
  local, compatível com o driver da aplicação.
- Safari/iPhone, cookies no deployment, CORS e proxy Vercel/Render: dependem de
  validação manual no ambiente publicado.

## Lacunas atuais

1. **Frontend Production sem testes comportamentais.** Não há testes automatizados
   de componentes React, contexts/hooks, formulários, filtros, gráficos, tema,
   navegação, responsividade ou modais.
2. **Sem E2E de navegador.** Login, cookie first-party, CRUD completo, Sheets e
   fluxos destrutivos não são reproduzidos automaticamente em um browser real;
   Safari/iPhone permanece um aceite manual.
3. **Cobertura HTTP parcial.** Fora de autenticação/perfil/settings exercitados no
   teste HTTP, os principais serviços são validados abaixo da camada de rota. Os
   53 endpoints têm inventário contratual, mas não uma matriz de requests e
   responses de runtime.
4. **Sem conformance runtime do OpenAPI.** O documento é válido e cobre as rotas,
   porém respostas reais não são comparadas automaticamente aos schemas.
5. **Sem métrica de cobertura.** Não há relatório de linhas, branches ou threshold;
   a contagem de testes não mede a extensão do código exercitado.
6. **Infraestrutura externa não automatizada.** Não há teste contra Turso, Google
   ou deployments reais. Essa escolha evita segredos e efeitos externos, mas deixa
   configuração, permissões e compatibilidade cross-site para validação manual.
7. **Migrations com amostragem histórica.** O caminho antigo coberto diretamente é
   `0008` → `0015`; não se exercita upgrade a partir de cada versão intermediária.
8. **Débitos de domínio sem teste desejado.** O endpoint backend de resumo mensal
   ainda inclui transações canceladas; mudanças de tipo de categoria usada,
   transições de status e edição apenas do tipo de transação com cartão não têm
   uma especificação automatizada que defina o comportamento futuro correto.
9. **Datas civis inválidas.** O formato de data é testado/validado, mas a aceitação
   atual de algumas datas impossíveis em transações não possui um teste de
   caracterização explícito.
10. **Divergência da Demo ao preservar recorrência.** O adapter local desmarca o
    indicador recorrente ao desvincular o histórico, enquanto o backend o mantém;
    não há teste contratual comparando os dois adapters.

Essas lacunas descrevem o estado atual; esta etapa documental não muda regras nem
adiciona uma falsa promessa de cobertura.
