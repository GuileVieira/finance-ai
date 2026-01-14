# Arquitetura do Sistema FinanceAI

Este documento descreve a arquitetura técnica, modelo de dados e fluxos principais do projeto FinanceAI.

---

## 1. Visão Macro (Architecture Overview)

O sistema utiliza uma arquitetura **Monolítica Modular** baseada em Next.js (App Router), hospedada na Vercel, com banco de dados PostgreSQL.

```mermaid
graph TD
    User(Usuário)
    
    subgraph Frontend [Next.js Client]
        UI[UI Components]
        Hooks[Custom Hooks]
    end
    
    subgraph Backend [Next.js Server]
        API[API Routes / Server Actions]
        Auth[Auth Middleware]
        Services[Business Logic Services]
        ORM[Drizzle ORM]
    end
    
    subgraph Infrastructure
        DB[(PostgreSQL)]
        AI[AI Providers <br/> OpenAI/Gemini]
    end
    
    User -->|HTTPS| UI
    UI -->|React Server/Client| API
    API -->|Validate| Auth
    API -->|Call| Services
    Services -->|Query| ORM
    ORM -->|SQL| DB
    Services -->|Analyze| AI
```

---

## 2. Diagrama de Casos de Uso (Use Cases)

Funcionalidades principais disponíveis para os usuários "Donos" de empresas.

```mermaid
mindmap
  root((FinanceAI))
    Gestão Financeira
      Visualizar Dashboard
      Gerenciar Transações
        Criar/Editar
        Importar OFX
        Conciliar
      Gerenciar Contas Bancárias
    Categorização
      Gerenciar Categorias
      Criar Regras de Autocategorização
      Revisão via IA
    Configurações
      Gerenciar Empresas
      Gerenciar Usuários
    Relatórios
      DRE
      Fluxo de Caixa
```

---

## 3. Diagrama de Sequência (Fluxo de Transações)

Exemplo do fluxo de listagem de transações, demonstrando a interação entre camadas.

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant P as Page (Client)
    participant A as API Route (/api/transactions)
    participant S as TransactionService
    participant D as Database

    U->>P: Acessa /transactions
    P->>A: GET /api/transactions?page=1
    activate A
    A->>A: requireAuth()
    A->>S: getTransactions(filters)
    activate S
    S->>D: Select count(*)
    D-->>S: totalItems
    S->>D: Select * from transactions limit 50
    D-->>S: data rows
    S-->>A: { data, pagination }
    deactivate S
    A-->>P: JSON Response
    deactivate A
    P->>U: Renderiza Tabela
```

---

## 4. DER (Diagrama de Entidade-Relacionamento)

Modelo de dados baseado no `lib/db/schema.ts`.

```mermaid
erDiagram
    COMPANIES ||--o{ ACCOUNTS : "possui"
    COMPANIES ||--o{ CATEGORIES : "define"
    COMPANIES ||--o{ USERS_COMPANIES : "vincula"
    COMPANIES ||--o{ UPLOADS : "armazena"
    
    USERS ||--o{ USERS_COMPANIES : "acessa"

    ACCOUNTS ||--o{ TRANSACTIONS : "contém"
    ACCOUNTS ||--o{ UPLOADS : "recebe"

    CATEGORIES ||--o{ TRANSACTIONS : "classifica"
    CATEGORIES ||--o{ CATEGORY_RULES : "automatiza"

    UPLOADS ||--o{ PROCESSING_BATCHES : "processa"
    UPLOADS ||--o{ TRANSACTIONS : "origina"

    TRANSACTIONS }|--|| CATEGORY_RULES : "aplicada por"
    
    COMPANIES {
        uuid id PK
        string name
        string cnpj
        string monthly_revenue_range
    }

    USERS {
        uuid id PK
        string email
        string name
    }

    ACCOUNTS {
        uuid id PK
        string name
        string bank_name
        decimal balance
    }

    CATEGORIES {
        uuid id PK
        string name
        string type
        string color_hex
    }

    TRANSACTIONS {
        uuid id PK
        date date
        decimal amount
        string description
        boolean verified
        string categorization_source
    }

    UPLOADS {
        uuid id PK
        string filename
        string status
        int total_transactions
    }
```
