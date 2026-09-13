workspace "Cofre" "Modelo C4 da arquitetura implementada do Cofre" {
    !identifiers flat

    model {
        authorizedUser = person "Usuário autorizado" "Pessoa incluída na whitelist que utiliza sua conta financeira privada."
        publicVisitor = person "Visitante da Demo" "Recrutador ou desenvolvedor que explora somente dados sintéticos no próprio navegador."

        googleIdentity = softwareSystem "Google Identity" "Autentica o usuário e fornece uma identidade OIDC verificável." {
            tags "External"
        }

        googleWorkspace = softwareSystem "Google Drive e Sheets" "Mantém a planilha opcional criada e sincronizada pelo usuário." {
            tags "External"
        }

        cofre = softwareSystem "Cofre" "Sistema de controle financeiro pessoal com um ambiente privado e uma demonstração pública isolada." {
            prodWeb = container "Frontend Production" "SPA responsiva para operação dos dados reais do usuário." "React 19, Vite 8, React Router 7, Tailwind CSS 4" {
                prodUi = component "UI e roteamento" "Páginas, layout responsivo, formulários e componentes visuais." "React"
                prodState = component "Estado e coordenação" "Hooks e Contexts de autenticação, configurações e entidades financeiras." "React Context e hooks"
                prodServices = component "Serviços de frontend" "Contratos de acesso a autenticação, finanças, perfil e Google Sheets." "JavaScript modules"
                prodApiClient = component "Cliente HTTP" "Centraliza base URL, envelopes, erros e envio de cookies com credentials include." "Fetch API"
            }

            api = container "Backend API" "Fonte de verdade para autenticação, autorização, validação, regras financeiras e sincronização." "Node.js 22, Express 5, Zod 4" {
                apiHttp = component "Borda HTTP" "Middlewares, rotas, schemas Zod e controllers da API." "Express e Zod"
                authComponent = component "Autenticação e sessões" "Executa OAuth, whitelist, cookies, renovação e invalidação de sessões." "Node.js crypto e OAuth/OIDC"
                accountServices = component "Serviços de conta" "Orquestra perfil e preferência visual do usuário atual." "Application services"
                financeServices = component "Serviços financeiros" "Orquestra categorias, transações, cartões, faturas, parcelas e recorrências." "Application services"
                financeDomain = component "Domínio financeiro" "Funções puras para limite, resumo, parcelamento e ocorrências recorrentes." "JavaScript"
                dataManagement = component "Gerenciamento de dados" "Executa preview, limpeza e reset transacionais por usuário." "Application service"
                sheetsIntegration = component "Integração Google Sheets" "Autoriza acesso incremental, cria layout anual, importa e exporta dados." "Google APIs e AES-GCM"
                syncOrchestrator = component "Orquestrador de sincronização" "Controla idempotência, conflitos, falhas, contagens e histórico de execuções manuais." "Application service"
                repositories = component "Repositories" "Encapsula SQL parametrizado, ownership e transações de persistência." "@libsql/client"
            }

            primaryData = container "Banco de dados principal" "Persiste usuários, sessões, dados financeiros, integrações e histórico de sincronização." "libSQL / SQLite" {
                tags "Database"
            }

            demoWeb = container "Frontend Public Demo" "Build separado da SPA, com identidade fictícia e integrações externas desativadas." "React 19 e Vite 8" {
                tags "Demo"
                demoUi = component "UI e serviços compartilhados" "Executa as mesmas páginas, hooks, Contexts e contratos usados pelo frontend Production." "React"
                demoAdapter = component "Demo API adapter" "Implementa localmente o contrato do cliente de dados, sem fetch ou cookies." "JavaScript modules"
                demoDomain = component "Domínio e seed da Demo" "Simula CRUD, parcelas, recorrências, limite e restauração de dados sintéticos." "JavaScript modules"
            }

            demoStorage = container "Armazenamento da Demo" "Guarda exclusivamente o estado sintético no namespace cofre:demo:v1 do navegador." "Browser localStorage" {
                tags "Database,Demo"
            }
        }

        authorizedUser -> cofre "Gerencia suas finanças pessoais"
        publicVisitor -> cofre "Explora a demonstração pública"
        cofre -> googleIdentity "Delega autenticação e valida identidade"
        cofre -> googleWorkspace "Cria e sincroniza a planilha opcional"

        authorizedUser -> prodWeb "Usa em desktop ou navegador móvel" "HTTPS"
        publicVisitor -> demoWeb "Explora dados fictícios" "HTTPS"
        prodWeb -> api "Consome a API pelo proxy /api e envia o cookie HTTP-only" "HTTPS/JSON"
        api -> primaryData "Lê e grava dados user-scoped" "libSQL protocol"
        api -> googleIdentity "Executa OAuth/OIDC e valida ID Tokens" "HTTPS"
        api -> googleWorkspace "Cria, lê, formata e atualiza planilhas autorizadas" "HTTPS"
        demoWeb -> demoStorage "Lê e grava somente dados sintéticos" "Web Storage API"

        authorizedUser -> prodUi "Interage com"
        prodUi -> prodState "Aciona hooks e Contexts"
        prodState -> prodServices "Consulta e executa mutações"
        prodServices -> prodApiClient "Usa"
        prodApiClient -> api "Envia requisições" "HTTPS/JSON"
        prodWeb -> apiHttp "Entrega chamadas à borda HTTP" "HTTPS/JSON"

        publicVisitor -> demoUi "Interage com"
        demoUi -> demoAdapter "Usa os contratos de dados"
        demoAdapter -> demoDomain "Executa regras locais"
        demoAdapter -> demoStorage "Persiste estado sintético" "Web Storage API"

        apiHttp -> authComponent "Autentica requisições e protege mutações"
        apiHttp -> accountServices "Encaminha operações de perfil e settings"
        apiHttp -> financeServices "Encaminha operações financeiras"
        apiHttp -> dataManagement "Encaminha operações destrutivas confirmadas"
        apiHttp -> sheetsIntegration "Encaminha autorização e operações diretas"
        apiHttp -> syncOrchestrator "Encaminha sincronização manual e consultas de histórico"
        authComponent -> repositories "Persiste usuários, tentativas e sessões"
        authComponent -> googleIdentity "Troca código e verifica identidade" "HTTPS"
        accountServices -> repositories "Lê e grava dados da conta atual"
        financeServices -> financeDomain "Executa cálculos e geração determinística"
        financeServices -> repositories "Lê e grava dados financeiros"
        dataManagement -> repositories "Executa exclusões transacionais"
        sheetsIntegration -> repositories "Persiste integração e importa/exporta dados"
        sheetsIntegration -> googleWorkspace "Usa Drive e Sheets" "HTTPS"
        sheetsIntegration -> googleIdentity "Confirma a identidade vinculada" "OIDC"
        syncOrchestrator -> sheetsIntegration "Coordena preview, importação e exportação"
        syncOrchestrator -> repositories "Registra idempotência, status e histórico"
        repositories -> primaryData "Executa SQL parametrizado" "libSQL protocol"

        production = deploymentEnvironment "Production" {
            deploymentNode "Vercel Production" "Hospedagem e CDN do frontend privado, com rewrite de /api." "Vercel" {
                containerInstance prodWeb
            }
            deploymentNode "Render" "Executa o processo da API Node.js." "Render Web Service" {
                containerInstance api
            }
            deploymentNode "Turso" "Serviço gerenciado que hospeda o banco libSQL remoto." "Turso" {
                containerInstance primaryData
            }
        }

        publicDemo = deploymentEnvironment "Public Demo" {
            deploymentNode "Vercel Demo" "Deployment separado, gerado pelo build Demo e protegido por CSP sem conexões externas." "Vercel" {
                containerInstance demoWeb
            }
            deploymentNode "Navegador do visitante" "Origem do armazenamento persistente e isolado da demonstração." "Web browser" {
                containerInstance demoStorage
            }
        }
    }

    views {
        systemContext cofre "SystemContext" "Pessoas e sistemas externos que se relacionam com o Cofre." {
            include *
            autoLayout lr
        }

        container cofre "Containers" "Containers lógicos dos ambientes Production e Public Demo." {
            include *
            autoLayout lr
        }

        component prodWeb "FrontendComponents" "Componentes relevantes do frontend Production." {
            include *
            autoLayout lr
        }

        component api "BackendComponents" "Componentes relevantes da API e suas dependências." {
            include *
            autoLayout lr
        }

        component demoWeb "DemoComponents" "Componentes relevantes do frontend Public Demo." {
            include *
            autoLayout lr
        }

        deployment cofre production "ProductionDeployment" "Mapeamento dos containers lógicos para a infraestrutura Production." {
            include *
            autoLayout lr
        }

        deployment cofre publicDemo "DemoDeployment" "Mapeamento dos containers isolados da demonstração pública." {
            include *
            autoLayout lr
        }

        styles {
            element "Person" {
                shape Person
                background #334155
                color #ffffff
            }
            element "Software System" {
                background #047857
                color #ffffff
            }
            element "External" {
                background #475569
                color #ffffff
            }
            element "Container" {
                background #059669
                color #ffffff
            }
            element "Component" {
                background #10b981
                color #052e24
            }
            element "Database" {
                shape Cylinder
            }
            element "Demo" {
                background #0f766e
                color #ffffff
            }
            relationship "Relationship" {
                color #64748b
                routing Orthogonal
            }
        }
    }

    configuration {
        scope softwaresystem
    }
}
