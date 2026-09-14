# Matriz de rastreabilidade

A tabela liga riscos relevantes a evidências automatizadas. “Parcial” significa
que a regra é exercitada em uma camada, mas não por todo o caminho público; “código
apenas” identifica comportamento implementado sem teste direto.

| Regra crítica | Tipo de teste | Arquivo/teste responsável | Status |
| --- | --- | --- | --- |
| E-mail autorizado conclui OAuth e `/auth/me` identifica o usuário | Integração HTTP, Google simulado | [`auth.integration.test.js`](../../backend/tests/auth.integration.test.js) — “usuário permitido...” | Coberto automaticamente |
| E-mail fora da whitelist não ganha sessão | Integração HTTP | [`auth.integration.test.js`](../../backend/tests/auth.integration.test.js) — “usuário fora da whitelist...” | Coberto automaticamente |
| Sessão ausente, inválida ou expirada recebe `401` | Integração HTTP | [`auth.integration.test.js`](../../backend/tests/auth.integration.test.js) — três cenários de sessão | Coberto automaticamente |
| Logout invalida a sessão persistida e expira o cookie | Integração HTTP + banco | [`auth.integration.test.js`](../../backend/tests/auth.integration.test.js) — “logout invalida...” | Coberto automaticamente |
| Usuário A não lê, edita ou exclui recursos de B | Integração HTTP e integração de persistência | [`auth.integration.test.js`](../../backend/tests/auth.integration.test.js), [`dataManagement.integration.test.js`](../../backend/tests/dataManagement.integration.test.js), [`deletion.integration.test.js`](../../backend/tests/deletion.integration.test.js) | Coberto automaticamente |
| Preferências e nomes únicos são isolados por usuário | Integração HTTP/banco | [`auth.integration.test.js`](../../backend/tests/auth.integration.test.js), [`settings.integration.test.js`](../../backend/tests/settings.integration.test.js) | Coberto automaticamente |
| Saldo é receitas menos despesas | Unidade e integração | [`financialSummary.unit.test.js`](../../backend/tests/financialSummary.unit.test.js), [`transactions.integration.test.js`](../../backend/tests/transactions.integration.test.js) | Coberto automaticamente |
| Primeiro vencimento respeita fechamento/vencimento e virada do ano | Unidade | [`installmentPlan.unit.test.js`](../../backend/tests/installmentPlan.unit.test.js) — `resolveFirstInstallmentDate` | Coberto automaticamente |
| Parcelas preservam o total em centavos e usam competências sucessivas | Unidade + integração | [`installmentPlan.unit.test.js`](../../backend/tests/installmentPlan.unit.test.js), [`cards.integration.test.js`](../../backend/tests/cards.integration.test.js) | Coberto automaticamente |
| Criação de parcelas é atômica | Integração com falha injetada | [`cards.integration.test.js`](../../backend/tests/cards.integration.test.js) — “Atomicidade da criação de parcelas” | Coberto automaticamente |
| Limite inclui compromissos futuros, ignora canceladas e deixa de contar transação excluída | Unidade + integração | [`cardLimit.unit.test.js`](../../backend/tests/cardLimit.unit.test.js), [`cards.integration.test.js`](../../backend/tests/cards.integration.test.js) — “Limite utilizado do cartão” | Coberto automaticamente |
| Pagamento de cartão libera limite uma vez sem criar nova despesa | Unidade + integração | [`cardLimit.unit.test.js`](../../backend/tests/cardLimit.unit.test.js), [`cards.integration.test.js`](../../backend/tests/cards.integration.test.js) | Coberto automaticamente |
| Recorrência respeita início, fim, dia válido e ano bissexto | Unidade | [`recurringExpense.unit.test.js`](../../backend/tests/recurringExpense.unit.test.js) | Coberto automaticamente |
| Ocorrências recorrentes são materializadas uma vez por competência | Integração com banco | [`recurringExpenses.integration.test.js`](../../backend/tests/recurringExpenses.integration.test.js) — CRUD, geração e idempotência | Coberto automaticamente |
| Recorrência antiga usa checkpoint e passa a processar apenas o delta | Integração com banco | [`recurringExpenses.integration.test.js`](../../backend/tests/recurringExpenses.integration.test.js) — início em 2019 | Coberto automaticamente |
| Alterar a definição recorrente não altera valores históricos | Integração com banco | [`recurringExpenses.integration.test.js`](../../backend/tests/recurringExpenses.integration.test.js) — preservação dos valores | Coberto automaticamente |
| Excluir ocorrência individual não a recria na reconciliação normal | Integração com banco | [`recurringExpenses.integration.test.js`](../../backend/tests/recurringExpenses.integration.test.js) — checkpoint após exclusão | Coberto automaticamente |
| Alterar datas da recorrência pode tornar ocorrência excluída elegível novamente | Implementação auditada | Service/repository de recorrências; débito descrito no domínio | Sustentado apenas por código |
| Excluir recorrência pode preservar e desvincular histórico ou apagar suas ocorrências | Integração com banco | [`deletion.integration.test.js`](../../backend/tests/deletion.integration.test.js) — os dois modos | Coberto automaticamente |
| Exclusões de categoria/cartão são físicas, respeitam vínculos e permitem reutilizar nome | Integração com banco | [`deletion.integration.test.js`](../../backend/tests/deletion.integration.test.js), [`cards.integration.test.js`](../../backend/tests/cards.integration.test.js) | Coberto automaticamente |
| Prévia e confirmação literal antecedem limpeza/reset; operação fica no usuário atual | Integração de schema/service/banco | [`dataManagement.integration.test.js`](../../backend/tests/dataManagement.integration.test.js) | Coberto automaticamente |
| Limpar registros preserva estrutura; reset preserva conta, sessão e settings | Integração com dois usuários | [`dataManagement.integration.test.js`](../../backend/tests/dataManagement.integration.test.js) | Coberto automaticamente |
| Banco novo aplica a cadeia atual de migrations | Integração com bootstrap | Todas as suítes backend que criam banco temporário | Coberto automaticamente |
| Upgrade da Etapa 9 preserva dados e aplica `0009`–`0015` | Integração de migration | [`migrationAuth.integration.test.js`](../../backend/tests/migrationAuth.integration.test.js) | Coberto automaticamente |
| Upgrade a partir de cada versão intermediária | Migration | Não existe teste responsável | Lacuna |
| Refresh token do Sheets é criptografado e isolado por usuário | Unidade + integração | [`googleSheets.unit.test.js`](../../backend/tests/googleSheets.unit.test.js), [`googleSheets.integration.test.js`](../../backend/tests/googleSheets.integration.test.js) | Coberto automaticamente |
| Exportação repetida não duplica dados/abas | Integração com Google simulado | [`googleSheets.integration.test.js`](../../backend/tests/googleSheets.integration.test.js) — exportação repetida | Coberto automaticamente |
| Preview/confirm da importação é atômico e idempotente | Integração com Google simulado | [`googleSheets.integration.test.js`](../../backend/tests/googleSheets.integration.test.js) — preview e confirmação | Coberto automaticamente |
| Sincronização registra histórico, impede concorrência e recupera execução interrompida | Integração com Google simulado | [`googleSheets.integration.test.js`](../../backend/tests/googleSheets.integration.test.js) — sincronização e lock | Coberto automaticamente |
| Divergência histórica gera conflito em vez de sobrescrita silenciosa | Integração com Google simulado | [`googleSheets.integration.test.js`](../../backend/tests/googleSheets.integration.test.js) — divergência de campos | Coberto automaticamente |
| Exclusão local é exportada antes da importação para impedir ressurreição | Integração com Google simulado | [`googleSheets.integration.test.js`](../../backend/tests/googleSheets.integration.test.js) — “não ressuscita linha antiga” | Coberto automaticamente |
| Falha externa ou planilha removida não altera dados canônicos | Integração com Google simulado | [`googleSheets.integration.test.js`](../../backend/tests/googleSheets.integration.test.js) — referências/token/planilha inválidos | Coberto automaticamente |
| OAuth/Sheets reais e permissões em Production | Aceite manual | Não existe teste automatizado com os serviços externos | Lacuna automatizada |
| OpenAPI 3.1 é válido e cobre exatamente as 53 operações Express | Contrato estático | [`openapi.test.js`](../../backend/tests/openapi.test.js) | Coberto automaticamente |
| Schemas OpenAPI de entrada reutilizam Zod | Contrato estático por amostragem | [`openapi.test.js`](../../backend/tests/openapi.test.js) — três schemas verificados | Parcialmente coberto |
| Requests/responses reais de todas as operações obedecem ao OpenAPI | API/conformance | Não existe teste responsável | Lacuna |
| Demo cria seed fictício e persiste CRUD somente no namespace fornecido | Unidade/integração do adapter | [`demoRepository.test.js`](../../frontend/tests/demo/demoRepository.test.js) | Coberto automaticamente |
| Demo reproduz parcelas, recorrências, limite, pagamento e reset seletivo | Unidade/integração do adapter | [`demoRepository.test.js`](../../frontend/tests/demo/demoRepository.test.js) | Coberto automaticamente |
| Demo bloqueia OAuth, Sheets e navegação externa | Unidade do adapter + auditoria de build | [`demoRepository.test.js`](../../frontend/tests/demo/demoRepository.test.js); script `build:demo` | Coberto automaticamente no adapter; build é verificação complementar |
| UI React em Production e Demo funciona em desktop/mobile/Safari | Componente/E2E | Não existe suíte de browser ou componentes | Lacuna |
| Resumo mensal backend ignora transações canceladas | Regra desejada ainda não implementada | Nenhum teste; o débito está documentado em [`docs/domain`](../domain/index.md) | Lacuna de regra e teste |
| Tipos de categoria/transação e transições de status permanecem coerentes após edição | Service parcialmente coberto | Criação/edição comum em [`transactions.integration.test.js`](../../backend/tests/transactions.integration.test.js); casos-limite não têm teste | Parcialmente coberto |

## Interpretação por risco

As regras financeiras centrais possuem boa defesa no domínio e na persistência.
Os maiores vazios estão nas fronteiras: navegador real, frontend React, serviços
externos e conformance HTTP completa. Portanto, “104 testes passando” sustenta o
núcleo exercitado, mas não equivale a cobertura integral da aplicação publicada.

