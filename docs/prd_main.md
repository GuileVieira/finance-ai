# FinanceAI - PRD Técnico Completo

**Versão**: 1.0
**Data**: 23 de Outubro de 2025
**Status**: Especificação Técnica MVP
**Stack**: Next.js 15 + Node.js + PostgreSQL + Drizzle ORM

---

## 📋 Sumário Executivo

### Visão do Produto
Sistema de gestão financeira automatizada que oferece visibilidade de caixa real para empresas com faturamento de 1-20M/mês através do processamento inteligente de extratos bancários e geração de insights acionáveis.

### Objetivos do MVP
1. **Upload e processamento** de extratos bancários (OFX, Excel)
2. **Dashboard financeiro** com KPIs principais e visualizações
3. **Categorização automática** via IA (OpenAI + regras)
4. **Relatórios DRE** de caixa com detalhamento

### KPIs de Sucesso
- **Time to Value**: Primeiro DRE em até 3 dias
- **Performance**: Dashboard < 5 segundos
- **Acurácia**: 85%+ categorização automática
- **Adoção**: 70%+ abrem relatório mensal

---

## 🎯 Requisitos Funcionais

### Prioridade P0 (Críticas para MVP)

#### 1. Autenticação e Gestão de Usuários
**User Stories:**
- Como empresário, quero me cadastrar com CNPJ e dados básicos
- como usuário, quero fazer login seguro para acess meus dados
- Como administrador, quero gerenciar acesso à minha empresa

**Requisitos:**
- [RF-001] Cadastro de empresa (CNPJ, razão social, contato)
- [RF-002] Autenticação via email/senha
- [RF-003] JWT tokens com refresh
- [RF-004] Recuperação de senha
- [RF-005] Multi-usuário por empresa (roles: admin, viewer)

**Critérios de Aceite:**
- Usuário consegue se cadastrar em < 2 minutos
- Login redireciona para dashboard após autenticação
- Sessão expira após 7 dias inativo

#### 2. Upload e Processamento de Extratos
**User Stories:**
- Como empresário, quero fazer upload dos meus extratos bancários
- Como usuário, quero ver o status do processamento em tempo real
- Como sistema, quero extrair transações de forma confiável

**Requisitos:**
- [RF-006] Upload de múltiplos arquivos (drag & drop)
- [RF-007] Suporte a formatos: OFX (prioritário), Excel, CSV
- [RF-008] Validação de estrutura e formato
- [RF-009] Processamento assíncrono com status updates
- [RF-010] Extração de: data, descrição, valor, saldo, tipo
- [RF-011] Histórico de uploads com status e metadata

**Critérios de Aceite:**
- Upload de 10MB concluído em < 30 segundos
- Processamento de 100 transações em < 30 segundos
- Status atualizado em tempo real via WebSocket

#### 3. Dashboard Financeiro
**User Stories:**
- Como empresário, quero ver visão geral da minha saúde financeira
- Como usuário, quero entender para onde foi meu dinheiro
- Como gestor, quero comparar períodos e identificar tendências

**Requisitos:**
- [RF-012] Cards principais: Receita, Despesas, Resultado, Margem
- [RF-013] Gráfico de evolução Receita vs Despesa (6 meses)
- [RF-014] Gráfico pizza de composição de custos
- [RF-015] Fluxo de caixa diário (últimos 30 dias)
- [RF-016] Tabela de transações recentes com filtros
- [RF-017] Alertas automáticos (custo fixo alto, margem baixa)
- [RF-018] Comparação vs mês anterior
- [RF-019] Filtros por período (mês, trimestre, semestre)

**Critérios de Aceite:**
- Dashboard carrega KPIs principais em < 5 segundos
- Gráficos interativos com tooltips detalhados
- Responsivo para mobile e desktop
- Dark mode funcional

#### 4. Categorização Inteligente
**User Stories:**
- Como empresário, quero que minhas transações sejam categorizadas automaticamente
- Como usuário, quero corrigir categorias quando o sistema errar
- Como sistema, quero aprender com as correções do usuário

**Requisitos:**
- [RF-020] Categorização automática via OpenAI API
- [RF-021] Categorias padrão (Receitas, Custos Variáveis, Custos Fixos, Não Operacional)
- [RF-022] Interface de revisão para transações não categorizadas
- [RF-023] Sistema de aprendizado com correções
- [RF-024] Batch processing para eficiência
- [RF-025] Cache de categorias conhecidas

**Critérios de Aceite:**
- 85%+ de acurácia sem intervenção
- Usuário consegue corrigir categorias em < 2 minutos
- Sistema aprende e melhora com uso

#### 5. Relatórios DRE de Caixa
**User Stories:**
- Como empresário, quero ver Demonstrativo de Resultado do Exercício
- Como usuário, quero entender detalhadamente cada linha do DRE
- Como gestor, quero exportar relatórios para análise

**Requisitos:**
- [RF-026] DRE formatado (Receita Líquida → Margem → Resultado)
- [RF-027] Detalhamento drill-down em cada linha
- [RF-028] Comparativo com períodos anteriores
- [RF-029] Exportação PDF e Excel
- [RF-030] Cálculos automáticos de margens
- [RF-031] Identificação de anomalias

**Critérios de Aceite:**
- DRE reflete realidade de caixa (não contábil)
- Usuário consegue navegar do resumo para transações individuais
- Exportação mantém formatação profissional

### Prioridade P1 (Importantes para v1.1)

#### 6. Simulador de Cenários
- [RF-032] Inputs ajustáveis (faturamento, custos)
- [RF-033] Cálculo de break-even em tempo real
- [RF-034] Comparação cenário atual vs simulado
- [RF-035] Cenários pré-configurados (contratar, demitir)

#### 7. Relatórios Mensais Automáticos
- [RF-036] Geração automática dia 1º de cada mês
- [RF-037] Insights em linguagem natural
- [RF-038] Envio por email automático
- [RF-039] Recomendações acionáveis

#### 8. Multi-contas Bancárias
- [RF-040] Cadastro de múltiplas contas por empresa
- [RF-041] Visão consolidada e individual
- [RF-042] Transferências entre contas

---

## 🎯 Requisitos Não Funcionais (NFRs)

### Performance
**[NFR-001] Latência de Dashboard**
- Objetivo: KPIs principais em < 5 segundos (percentil 95)
- Estratégia: Pré-cálculo + cache agressivo + materialized views

**[NFR-002] Tempo de Processamento**
- Objetivo: 100 transações em < 30 segundos
- Estratégia: Batch processing + async queues

**[NFR-003] Concorrência**
- Objetivo: 50 usuários simultâneos sem degradação
- Estratégia: Connection pooling + cache distribuído

### Escalabilidade
**[NFR-004] Volume de Dados**
- Objetivo: Suportar 5.000+ transações/mês por empresa
- Estratégia: Partitioning + índices otimizados

**[NFR-005] Crescimento de Usuários**
- Objetivo: 50 empresas no MVP, 500+ em 6 meses
- Estratégia: Stateless architecture + horizontal scaling

### Disponibilidade
**[NFR-006] Uptime**
- Objetivo: 99% disponibilidade (exceto janelas de manutenção)
- Estratégia: Health checks + monitoring + backup

### Segurança
**[NFR-007] Criptografia**
- Objetivo: Dados sensíveis criptografados em trânsito e repouso
- Estratégia: HTTPS + AES-256 + environment variables

**[NFR-008] Autenticação**
- Objetivo: Proteção contra acesso não autorizado
- Estratégia: JWT + rate limiting + password policies

**[NFR-009] LGPD**
- Objetivo: Conformidade com lei de proteção de dados
- Estratégia: Anonimização + data retention + consent management

### Usabilidade
**[NFR-010] Acessibilidade**
- Objetivo: WCAG AA compliance
- Estratégia: Semantic HTML + ARIA + keyboard navigation

**[NFR-011] Mobile Experience**
- Objetivo: Funcionalidade completa em dispositivos móveis
- Estratégia: Responsive design + touch optimization

---

## 🏗️ Arquitetura de Alto Nível

### Next.js Full-Stack Architecture (Vercel Pro)

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Edge                         │
│               (Static Assets + Caching)                │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                Next.js 15 Full-Stack                   │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                 App Router                         │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐ │ │
│  │  │   Pages     │ │   Layout    │ │    API Routes   │ │ │
│  │  │             │ │             │ │                 │ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘ │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                   Components                       │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐ │ │
│  │  │    UI       │ │   Dashboard │ │     Upload      │ │ │
│  │  │  (shadcn)   │ │ Components  │ │   Components    │ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘ │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Server Components                     │ │
│  │        Direct Database Access + Auth               │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Client Components                     │ │
│  │      TanStack Query + Interactivity                │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                    Supabase                             │
│  PostgreSQL + Storage + Auth + Realtime (se necessário) │
└─────────────────────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              External Services                         │
│  OpenAI API + Resend (Email) + File Processing         │
└─────────────────────────────────────────────────────────┘
```

### Database Architecture (PostgreSQL)

```
┌─────────────────────────────────────────────────────────┐
│                PostgreSQL Database                     │
│                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │
│  │   Users     │ │  Companies  │ │      Accounts       │ │
│  │             │ │             │ │                     │ │
│  └─────────────┘ └─────────────┘ └─────────────────────┘ │
│                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │
│  │Transactions │ │ Categories  │ │     Reports         │ │
│  │             │ │             │ │                     │ │
│  └─────────────┘ └─────────────┘ └─────────────────────┘ │
│                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │
│  │   Uploads   │ │   Sessions  │ │    Cache Tables     │ │
│  │             │ │             │ │                     │ │
│  └─────────────┘ └─────────────┘ └─────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxos Principais

### 1. Fluxo de Autenticação
```
User → Login Page → API → Database → JWT Token → Dashboard
```

### 2. Fluxo de Upload e Processamento
```
User → Upload Files → Validation → Storage → Queue →
Parse → Extract → Categorize → Store → Notify → Dashboard
```

### 3. Fluxo de Dashboard
```
Dashboard → Cache Check → API → Aggregate → Response →
Update UI → Background Refresh
```

### 4. Fluxo de Categorização
```
Batch Transactions → OpenAI API → Categories →
Update DB → Refresh Cache → Notify User
```

---

## 🎨 Decisões Técnicas e Justificativas

### Full-Stack: Next.js 15 Pro
**Decisão:** Next.js 15 full-stack no plano Pro da Vercel
**Justificativa:**
- Simplicidade arquitetural (único repo)
- Server Components para performance máxima
- API Routes integradas sem backend separado
- Vercel Postgres com connection pooling
- Edge Functions para processamento pesado
- Deploy zero-downtime com previews

### Styling: Tailwind CSS v4 + shadcn/ui
**Decisão:** Tailwind CSS v4 com tema OKLCH + shadcn/ui
**Justificativa:**
- Desenvolvimento rápido com utility-first
- Tema OKLCH para melhor acessibilidade
- Componentes de alta qualidade prontos
- Consistência visual garantida

### Database: Supabase PostgreSQL + Drizzle ORM
**Decisão:** Supabase com Drizzle ORM
**Justificativa:**
- PostgreSQL com connection pooling via URL
- Storage integrado para arquivos (se necessário)
- Realtime subscriptions (futuro)
- Dashboard completo para gestão
- Drizzle: type-safe, migrations simples
- Backups automáticos e restores
- Row Level Security (RLS) para segurança adicional

### Autenticação: Auth.js (NextAuth.js)
**Decisão:** Auth.js para autenticação completa
**Justificativa:**
- Integrado nativamente com Next.js
- Múltiplos providers (Email, Google, etc)
- Sessões via JWT com database backing
- Middleware para rotas protegidas
- CSRF protection e rate limiting
- Suporte a refresh tokens

### Cache: TanStack Query + Server Components
**Decisão:** TanStack Query + Server Components para cache
**Justificativa:**
- Server Components para dados estáticos
- TanStack Query para dados dinâmicos
- Cache inteligente com invalidação automática
- Background refetch e stale-while-revalidate
- Devtools poderosas para debugging


### IA: OpenAI API + Fallback
**Decisão:** OpenAI API com fallback heurístico
**Justificativa:**
- Alta precisão de categorização
- Implementação rápida no MVP
- Fallback garante funcionamento
- Custo controlado com cache

---

## 🚀 Estratégia de Deploy e CI/CD

### Vercel Pro (Full-Stack)
```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "outputDirectory": ".next",
  "installCommand": "pnpm install",
  "env": {
    "DATABASE_URL": "@supabase-db-url",
    "NEXTAUTH_SECRET": "@nextauth-secret",
    "NEXTAUTH_URL": "@nextauth-url",
    "OPENAI_API_KEY": "@openai-key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-role"
  },
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "crons": [
    {
      "path": "/api/cron/monthly-reports",
      "schedule": "0 2 1 * *"
    }
  ]
}
```

### Database Migrations (Drizzle)
```typescript
// package.json scripts
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

### Auth.js Configuration
```typescript
// lib/auth.ts
import { AuthOptions } from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import Credentials from 'next-auth/providers/credentials';

export const authOptions: AuthOptions = {
  adapter: DrizzleAdapter(db),
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        // Lógica de autenticação customizada
        // Validar usuário no Supabase via Drizzle
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/login',
    signUp: '/register'
  }
};
```

### CI/CD Pipeline (Vercel + GitHub)
```yaml
# .github/workflows/ci.yml
name: CI/CD
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm run lint
      - run: pnpm run type-check
      - run: pnpm run test
      - run: pnpm run db:generate
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
```

---

## 📊 Estratégia de Monitoramento

### Vercel Analytics + Speed Insights
- Web Vitals automáticas
- Performance metrics por rota
- User behavior analytics
- Error tracking integrado
- Real User Monitoring (RUM)

### Health Checks + Logging
```typescript
// app/api/health/route.ts
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await db.select().from(users).limit(1);
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date(),
      version: process.env.VERCEL_GIT_COMMIT_SHA
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: error.message },
      { status: 503 }
    );
  }
}

// lib/logger.ts
export const logger = {
  info: (message: string, meta?: any) => {
    console.log(JSON.stringify({ level: 'info', message, ...meta }));
  },
  error: (message: string, error?: any) => {
    console.error(JSON.stringify({ level: 'error', message, error }));
  }
};
```

### Performance Monitoring
- Response times por endpoint
- Database query performance
- Cache hit/miss ratios
- Error rates by service

---

## 🔒 Estratégia de Segurança

### Autenticação
```javascript
// auth middleware
export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
```

### Rate Limiting
```javascript
// rate limiting
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
});
```

### Data Validation
```javascript
// validation schema
import { z } from 'zod';

export const transactionSchema = z.object({
  date: z.string().datetime(),
  description: z.string().min(1),
  amount: z.number(),
  type: z.enum(['credit', 'debit']),
  categoryId: z.number().optional(),
});
```

---

## ⚠️ Riscos e Mitigações

### Risco 1: Performance em Grande Escala
**Problema:** Consultas complexas podem degradar com volume
**Mitigação:**
- Materialized views para KPIs
- Índices otimizados
- Cache de resultados
- Paginação em todas as listagens

### Risco 2: Falha da OpenAI API
**Problema:** Dependência crítica pode falhar
**Mitigação:**
- Sistema de fallback com regras heurísticas
- Cache de categorias conhecidas
- Retry com exponential backoff
- Alertas de degradação

### Risco 3: Corrupção de Dados Financeiros
**Problema:** Dados bancários sensíveis
**Mitigação:**
- Transações ACID no database
- Backups diários automatizados
- Audit trails para todas as alterações
- Validations rigorosas

### Risco 4: Vulnerabilidades de Segurança
**Problema:** Dados financeiros são alvos
**Mitigação:**
- Code reviews obrigatórios
- Dependências atualizadas automaticamente
- Security headers configurados
- Penetration tests periódicos

### Risco 5: Experiência do Usuário
**Problema:** Complexidade pode afetar adoção
**Mitigação:**
- User testing contínuo
- Onboarding simplificado
- Feedback visual constante
- Suporte proativo

---

## 📈 Roadmap de Evolução

### MVP (Próximos 2 meses)
- [x] Stack definida
- [ ] Autenticação básica
- [ ] Upload de extratos OFX
- [ ] Dashboard principal
- [ ] Categorização automática

### v1.1 (Meses 3-4)
- [ ] Simulador de cenários
- [ ] Relatórios mensais automáticos
- [ ] Multi-contas bancárias
- [ ] Melhorias de performance

### v1.2 (Meses 5-6)
- [ ] Integração com APIs bancárias
- [ ] Machine learning local
- [ ] Advanced analytics
- [ ] Enterprise features

### v2.0 (Meses 7-12)
- [ ] Multi-empresas
- [ ] Workflow de aprovação
- [ ] Integrações contábeis
- [ ] Mobile app nativo

---

## 🎯 Critérios de Aceite do MVP

### Funcionais
1. ✅ Upload de 10+ extratos processado com sucesso
2. ✅ Dashboard com KPIs principais em < 5s
3. ✅ 85%+ de categorização automática correta
4. ✅ DRE de caixa preciso e exportável
5. ✅ Interface responsiva e acessível

### Não Funcionais
1. ✅ 99% uptime durante testes
2. ✅ < 2s para login e navegação
3. ✅ Suporta 50 usuários simultâneos
4. ✅ Dados criptografados e seguros
5. ✅ WCAG AA compliance

### Negócio
1. ✅ Primeiro DRE gerado em até 3 dias
2. ✅ Cliente identifica insight acionável
3. ✅ Feedback positivo de usabilidade
4. ✅ Sem bugs críticos em produção
5. ✅ Métricas de engagement positivas

---

## ✅ Confirmação Necessária

**[AGUARDANDO CONFIRMAÇÃO DO STAKEHOLDER]**

Por favor, revise este PRD técnico completo e confirme se:

1. ✅ **Escopo do MVP** está bem definido e realizável
2. ✅ **Requisitos funcionais** cobrem as necessidades principais
3. ✅ **Requisitos não-funcionais** são adequados
4. ✅ **Arquitetura proposta** suporta os objetivos
5. ✅ **Decisões técnicas** fazem sentido
6. ✅ **Riscos e mitigações** são realistas
7. ✅ **Roadmap** está alinhado com expectativas

**Responda "CONFIRMAR" para avançar para o modelo de dados (DER).**