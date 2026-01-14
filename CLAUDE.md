# MVP Finance - Instruções do Projeto

## Stack Tecnológica

- **Framework**: Next.js 16 com App Router e Turbopack
- **Linguagem**: TypeScript (strict - não usar `any`)
- **UI**: React 19, Tailwind CSS 4, shadcn/ui (Radix primitives)
- **Banco de Dados**: PostgreSQL via Supabase
- **ORM**: Drizzle ORM (não temos psql instalado, sempre usar o ORM)
- **Autenticação**: NextAuth v5 (beta)
- **State Management**: TanStack Query (React Query)
- **Validação**: Zod
- **AI/LLM**: LangChain, LangGraph
- **Gerenciador de Pacotes**: pnpm

## Estrutura do Projeto

```
app/                    # App Router (páginas e API routes)
├── api/               # API endpoints
├── categories/        # Página de categorias
├── dashboard/         # Dashboard principal
├── reports/           # Relatórios
├── transactions/      # Transações
├── upload/            # Upload de arquivos OFX
└── settings/          # Configurações

components/            # Componentes React
├── ui/               # Componentes shadcn/ui
├── shared/           # Componentes compartilhados (FilterBar, etc.)
├── dashboard/        # Componentes do dashboard
├── categories/       # Componentes de categorias
└── reports/          # Componentes de relatórios

lib/                   # Lógica de negócio
├── db/               # Schema e conexão Drizzle
├── services/         # Serviços de dados
├── api/              # Helpers de API
├── auth/             # Configuração NextAuth
├── types/            # Tipos TypeScript
└── utils/            # Utilitários

hooks/                 # Custom React hooks
scripts/               # Scripts de manutenção do banco
docs/                  # Documentação do projeto
```

## Convenções de Código

### TypeScript
- **Nunca usar `any`** - sempre tipar corretamente
- Usar Zod para validação de schemas
- Preferir types a interfaces quando possível

### Componentes
- Seguir o tema definido em `globals.css`
- Usar componentes do shadcn/ui como base
- Componentes de UI ficam em `components/ui/`
- Componentes de feature ficam em `components/{feature}/`

### Banco de Dados
- Usar Drizzle ORM para todas as operações
- Schema definido em `lib/db/schema.ts`
- Migrations em `lib/db/migrations/`
- **Não temos psql instalado** - usar apenas o ORM

### API Routes
- Usar App Router API routes em `app/api/`
- Validar inputs com Zod
- Retornar erros com status codes apropriados

## Scripts Úteis

```bash
pnpm dev              # Iniciar servidor de desenvolvimento
pnpm build            # Build de produção
pnpm db:push          # Aplicar schema ao banco
pnpm db:generate      # Gerar migrations
pnpm db:studio        # Abrir Drizzle Studio
pnpm db:seed:categories  # Popular categorias padrão
```

## Commits

- Mensagens em inglês, formato convencional (feat, fix, refactor, etc.)
- **Não incluir menções a agentes ou co-autores nos commits**
- Exemplo: `feat: add transaction filtering by date range`

## Documentação

- Arquivos `.md` devem ser salvos na pasta `docs/` na raiz do projeto
- Exceção: arquivos de configuração como este CLAUDE.md

## Contexto do Negócio

Sistema financeiro para gestão empresarial:
- Upload e parsing de extratos bancários (OFX)
- Categorização automática de transações (com AI)
- Dashboard com visão geral financeira
- Relatórios e análises
- Multi-empresa e multi-conta
