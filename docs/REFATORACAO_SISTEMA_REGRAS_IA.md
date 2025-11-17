# Plano de Refatoração: Sistema de Regras Inteligente com IA

**Projeto**: MVP Finance - Sistema de Gestão Financeira
**Data de Criação**: 2025-11-16
**Versão**: 1.0
**Status**: Aprovado

---

## 📋 Sumário Executivo

### Objetivo
Refatorar o fluxo de upload e processamento de arquivos OFX para implementar um sistema hierárquico e inteligente de categorização de transações baseado em **Regras → IA → Auto-aprendizado**, com suporte para importação/exportação de regras e reclassificação histórica de dados.

### Problema Atual
- Lógica de categorização espalhada em múltiplos arquivos
- IA não aprende com classificações anteriores (sem criação automática de regras)
- Ausência de sistema de backup/restore de conhecimento (regras)
- Impossibilidade de reclassificar transações históricas ao atualizar regras
- Sistema de scoring de regras básico (sem priorização inteligente)
- Duplicação de lógica entre diferentes serviços

### Benefícios Esperados
- ✅ Sistema aprende continuamente (auto-criação de regras após IA categorizar)
- ✅ Redução de custos com IA (mais regras = menos chamadas à IA)
- ✅ Backup e restore de conhecimento (export/import de regras)
- ✅ Manutenção facilitada (reclassificação histórica automática)
- ✅ Transparência total (rastreamento de origem de cada categorização)
- ✅ Scoring justo e inteligente (combina múltiplos fatores)
- ✅ Performance otimizada (processamento hierárquico)

---

## 🎯 Requisitos Funcionais

### RF1: Sistema de Categorização Hierárquico
O sistema deve categorizar transações seguindo a ordem de prioridade:
1. **Cache** - Descrições similares já categorizadas (>95% similaridade)
2. **Regras** - Patterns definidos manualmente ou criados pela IA
3. **Histórico** - Transações similares do mesmo usuário
4. **IA** - Categorização inteligente usando LLMs (apenas se confidence < 70%)

### RF2: Auto-aprendizado de Regras
- Após IA categorizar com confidence > 75%, sugerir criação automática de regra
- Extrair pattern significativo da descrição (remover números, datas, etc)
- Validar que pattern não é genérico demais
- Detectar e evitar duplicação de regras
- Registrar origem da regra (manual/ai/imported)

### RF3: Sistema de Scoring Avançado
Quando múltiplas regras correspondem a uma transação:
- Calcular score combinado: `tipo_match + confidence + usage_bonus`
- Pesos por tipo: exact=1.0, contains=0.85, regex=0.75
- Bônus logarítmico por usageCount (evitar viés)
- Normalizar para escala 0-100%

### RF4: Import/Export de Regras
**Exportação**:
- Formato JSON estruturado
- Incluir: regras completas + categorias referenciadas + histórico de uso
- Versionamento do formato

**Importação**:
- Validar formato e versão
- Criar categorias ausentes ou mapear para existentes
- Detectar e resolver conflitos (substituir/mesclar/pular)
- Retornar relatório detalhado de importação

### RF5: Reclassificação Histórica
- Ao alterar uma regra, permitir reclassificar transações afetadas
- Filtrar apenas transações categorizadas automaticamente (`manuallyCategorized: false`)
- Preview de quantas transações serão afetadas
- Processamento em background com progress tracking
- Notificação ao usuário quando completar

---

## 🏗️ Arquitetura da Solução

### Diagrama de Fluxo Novo

```
┌─────────────────────────────────────────────────────────────────┐
│                    UPLOAD DE ARQUIVO OFX                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  PARSE OFX + VALIDAÇÃO + CRIAÇÃO DE UPLOAD RECORD               │
│  Status: pending → processing                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           PROCESSAMENTO POR BATCH (15 transações)                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
          ┌──────────────────────────────────────┐
          │  PARA CADA TRANSAÇÃO NO BATCH         │
          └──────────────┬───────────────────────┘
                         │
                         ▼
          ┌──────────────────────────────────────┐
          │  1️⃣ VERIFICAR CACHE                  │
          │  Similaridade > 95%?                  │
          │  ├─ SIM → Retornar categoria          │
          │  └─ NÃO → Próxima camada             │
          └──────────────┬───────────────────────┘
                         │
                         ▼
          ┌──────────────────────────────────────┐
          │  2️⃣ APLICAR REGRAS                   │
          │  Buscar todas que correspondem        │
          │  Calcular score combinado             │
          │  Confidence > 70%?                    │
          │  ├─ SIM → Retornar categoria          │
          │  └─ NÃO → Próxima camada             │
          └──────────────┬───────────────────────┘
                         │
                         ▼
          ┌──────────────────────────────────────┐
          │  3️⃣ BUSCAR HISTÓRICO                 │
          │  Transações similares (Levenshtein)   │
          │  Confidence > 70%?                    │
          │  ├─ SIM → Retornar categoria          │
          │  └─ NÃO → Próxima camada             │
          └──────────────┬───────────────────────┘
                         │
                         ▼
          ┌──────────────────────────────────────┐
          │  4️⃣ CATEGORIZAR COM IA               │
          │  Chamar LLM (Gemini/GPT)              │
          │  Validar categoria retornada          │
          │  Retornar resultado                   │
          └──────────────┬───────────────────────┘
                         │
                         ▼
          ┌──────────────────────────────────────┐
          │  5️⃣ AUTO-APRENDIZADO                 │
          │  Se IA categorizou com conf > 75%:    │
          │  ├─ Extrair pattern da descrição      │
          │  ├─ Validar pattern                   │
          │  ├─ Verificar duplicatas              │
          │  └─ Criar regra automática            │
          └──────────────┬───────────────────────┘
                         │
                         ▼
          ┌──────────────────────────────────────┐
          │  6️⃣ SALVAR TRANSAÇÃO                 │
          │  + Categoria determinada              │
          │  + Source (cache/rule/history/ai)     │
          │  + RuleId (se aplicável)              │
          │  + Confidence score                   │
          └──────────────┬───────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  COMPLETAR UPLOAD: Status → completed                           │
│  Gerar relatório: X% cache, Y% regras, Z% IA                    │
└─────────────────────────────────────────────────────────────────┘
```

### Componentes Principais

#### 1. RuleScoringService
**Responsabilidade**: Calcular scores combinados para regras
**Localização**: `lib/services/rule-scoring.service.ts`

```typescript
interface ScoringResult {
  ruleId: string;
  categoryId: string;
  categoryName: string;
  finalScore: number;      // 0-100
  breakdown: {
    matchTypeScore: number; // exact=1.0, contains=0.85, regex=0.75
    confidenceScore: number;
    usageBonus: number;     // log(usageCount)
  };
}
```

#### 2. TransactionCategorizationService
**Responsabilidade**: Orquestrar categorização hierárquica
**Localização**: `lib/services/transaction-categorization.service.ts`

```typescript
interface CategorizationResult {
  categoryId: string;
  categoryName: string;
  confidence: number;
  source: 'cache' | 'rule' | 'history' | 'ai' | 'manual';
  ruleId?: string;
  reasoning?: string;
  metadata?: Record<string, unknown>;
}
```

#### 3. RuleGenerationService
**Responsabilidade**: Criar regras automaticamente após IA categorizar
**Localização**: `lib/services/rule-generation.service.ts`

```typescript
interface GeneratedRule {
  pattern: string;        // Pattern extraído (sem números/datas)
  ruleType: 'contains';   // Sempre 'contains' para regras auto-geradas
  categoryId: string;
  confidence: number;     // 0.75-0.85 (médio)
  sourceType: 'ai';
  examples: string[];     // Descrições originais
}
```

#### 4. ReclassificationService
**Responsabilidade**: Reclassificar transações históricas
**Localização**: `lib/services/reclassification.service.ts`

```typescript
interface ReclassificationJob {
  ruleId: string;
  oldCategoryId: string;
  newCategoryId: string;
  affectedCount: number;
  onlyAutomatic: boolean;  // true (apenas manuallyCategorized: false)
  status: 'pending' | 'processing' | 'completed' | 'failed';
}
```

---

## 📦 Estrutura de Dados

### Schema: categoryRules (modificações)

```typescript
// NOVOS CAMPOS
lastUsedAt: timestamp        // Última vez que regra foi usada
sourceType: enum             // 'manual', 'ai', 'imported'
matchFields: json            // ['description', 'memo', 'name']
```

### Schema: transactions (modificações)

```typescript
// NOVOS CAMPOS
categorizationSource: enum   // 'cache', 'rule', 'history', 'ai', 'manual'
ruleId: uuid (nullable)      // ID da regra que categorizou (se aplicável)
```

### Formato de Export/Import

```json
{
  "version": "1.0",
  "exportedAt": "2025-11-16T10:30:00Z",
  "exportedBy": "user-id",
  "companyId": "company-id",
  "metadata": {
    "totalRules": 150,
    "totalCategories": 25,
    "exportType": "full"
  },
  "categories": [
    {
      "id": "uuid",
      "name": "Alimentação",
      "type": "variable_cost",
      "description": "...",
      "colorHex": "#FF5733",
      "icon": "utensils"
    }
  ],
  "rules": [
    {
      "id": "uuid",
      "categoryId": "uuid",
      "categoryName": "Alimentação",
      "rulePattern": "ifood",
      "ruleType": "contains",
      "confidenceScore": 0.85,
      "active": true,
      "sourceType": "ai",
      "usageCount": 127,
      "examples": ["IFOOD*ABC123", "Ifood delivery"],
      "createdAt": "2025-10-15T08:00:00Z",
      "lastUsedAt": "2025-11-15T20:30:00Z"
    }
  ]
}
```

---

## 🔧 Fases de Implementação

### FASE 1: Sistema de Scoring Unificado
**Duração estimada**: 2-3 horas
**Prioridade**: Alta (base para tudo)

#### Tarefas:
1. ✅ Criar `lib/services/rule-scoring.service.ts`
   - Implementar `calculateCombinedScore()`
   - Implementar `rankMatchingRules()`
   - Adicionar testes unitários

2. ✅ Atualizar `lib/db/schema.ts`
   - Adicionar campos: `lastUsedAt`, `sourceType`, `matchFields`
   - Criar migration
   - Executar: `pnpm drizzle-kit push`

#### Critérios de Aceitação:
- ✅ Score combinado considera tipo + confidence + usage
- ✅ Múltiplas regras são ranqueadas corretamente
- ✅ Schema atualizado no banco de dados

---

### FASE 2: Serviço Unificado de Categorização
**Duração estimada**: 4-5 horas
**Prioridade**: Alta (centraliza lógica)

#### Tarefas:
1. ✅ Criar `lib/services/transaction-categorization.service.ts`
   - Implementar pipeline hierárquico (6 camadas)
   - Integrar com serviços existentes (cache, rules, AI)
   - Adicionar logging detalhado por camada

2. ✅ Atualizar `lib/services/batch-processing.service.ts`
   - Substituir lógica antiga por `transactionCategorization.categorize()`
   - Manter compatibilidade com processamento paralelo
   - Adicionar métricas de performance

#### Critérios de Aceitação:
- ✅ Pipeline respeta ordem: cache → rules → history → AI
- ✅ Cada camada registra se foi usada
- ✅ Fallback automático entre camadas funciona

---

### FASE 3: Auto-aprendizado (Regras Automáticas)
**Duração estimada**: 3-4 horas
**Prioridade**: Alta (melhoria contínua)

#### Tarefas:
1. ✅ Criar `lib/services/rule-generation.service.ts`
   - `generateRuleFromAI()` - cria regra com confidence 0.75-0.85
   - `extractPattern()` - remove números, datas, caracteres especiais
   - `validatePattern()` - evita patterns genéricos
   - `detectDuplicateRules()` - verifica similaridade

2. ✅ Integrar no `transaction-categorization.service.ts`
   - Após IA categorizar: chamar `ruleGeneration.shouldCreateRule()`
   - Se sim: criar regra automaticamente
   - Registrar `sourceType: 'ai'`

#### Critérios de Aceitação:
- ✅ Regras criadas apenas quando confidence > 75%
- ✅ Patterns extraídos são significativos (não genéricos)
- ✅ Não cria regras duplicadas

---

### FASE 4: Import/Export de Regras
**Duração estimada**: 3-4 horas
**Prioridade**: Média (backup/restore)

#### Tarefas:
1. ✅ Criar `app/api/categories/rules/export/route.ts`
   - GET: exportar todas as regras em JSON
   - Incluir categorias referenciadas
   - Incluir histórico de uso (usageCount, lastUsedAt)

2. ✅ Criar `app/api/categories/rules/import/route.ts`
   - POST: importar regras de JSON
   - Validar formato e versão
   - Detectar conflitos e oferecer opções
   - Retornar relatório detalhado

#### Critérios de Aceitação:
- ✅ Export gera JSON válido com todas as informações
- ✅ Import valida formato antes de processar
- ✅ Conflitos são detectados e resolvidos corretamente

---

### FASE 5: Reclassificação Histórica
**Duração estimada**: 4-5 horas
**Prioridade**: Média (manutenção de dados)

#### Tarefas:
1. ✅ Criar `lib/services/reclassification.service.ts`
   - `findAffectedTransactions()` - busca por ruleId
   - `previewReclassification()` - mostra quantas serão afetadas
   - `reclassifyTransactions()` - executa em batches
   - Filtrar apenas `manuallyCategorized: false`

2. ✅ Criar `app/api/categories/rules/[id]/reclassify/route.ts`
   - PUT: iniciar reclassificação
   - GET: status/progresso
   - Processar em background

3. ✅ Adicionar UI em `app/dashboard/rules/[id]/edit/page.tsx`
   - Modal de confirmação
   - Preview de transações afetadas
   - Progress tracking

#### Critérios de Aceitação:
- ✅ Apenas transações automáticas são reclassificadas
- ✅ Processamento não bloqueia UI
- ✅ Usuário pode acompanhar progresso

---

### FASE 6: Integração com Upload OFX
**Duração estimada**: 2-3 horas
**Prioridade**: Alta (juntar tudo)

#### Tarefas:
1. ✅ Atualizar `lib/services/async-upload-processor.service.ts`
   - Usar `transactionCategorization.categorize()` unificado
   - Adicionar retry com backoff exponencial
   - Melhorar logging de cada camada

2. ✅ Atualizar `lib/db/schema.ts` (transactions)
   - Adicionar: `categorizationSource`, `ruleId`
   - Criar migration
   - Executar: `pnpm drizzle-kit push`

#### Critérios de Aceitação:
- ✅ Upload usa novo sistema de categorização
- ✅ Origem de cada categorização é rastreada
- ✅ Regras são criadas automaticamente quando apropriado

---

### FASE 7: Testes e Validação
**Duração estimada**: 3-4 horas
**Prioridade**: Alta (garantir qualidade)

#### Tarefas:
1. ✅ Testes unitários
   - `rule-scoring.service.spec.ts`
   - `transaction-categorization.service.spec.ts`
   - `rule-generation.service.spec.ts`

2. ✅ Testes de integração
   - Upload OFX completo
   - Criação automática de regras
   - Reclassificação histórica

3. ✅ Teste end-to-end
   - Upload arquivo OFX real
   - Verificar categorização em todas as camadas
   - Alterar regra e reclassificar histórico
   - Export/import de regras

#### Critérios de Aceitação:
- ✅ Todos os testes unitários passam
- ✅ Fluxo completo funciona sem erros
- ✅ Performance aceitável (<2s por batch)

---

## 📊 Métricas de Sucesso

### KPIs Técnicos
- **Taxa de cache**: >30% das transações categorizadas via cache
- **Taxa de regras**: >40% das transações categorizadas via regras
- **Taxa de IA**: <30% das transações precisam de IA
- **Redução de custo IA**: >40% após 1 mês de auto-aprendizado
- **Performance**: <2s para processar batch de 15 transações
- **Uptime**: >99% de sucesso no processamento

### KPIs de Negócio
- **Precisão**: >95% de categorização correta
- **Tempo de processamento**: <30s para arquivo com 100 transações
- **Satisfação do usuário**: >4.5/5 em pesquisa de usabilidade
- **Adoção**: >80% dos usuários usam reclassificação histórica

---

## ⚠️ Riscos e Mitigações

### Risco 1: Performance degradada com muitas regras
**Probabilidade**: Média
**Impacto**: Alto
**Mitigação**:
- Adicionar índices no banco de dados
- Implementar cache de regras em memória
- Limitar a 500 regras ativas por empresa
- Desativar regras com usageCount = 0 após 90 dias

### Risco 2: Criação de regras genéricas demais
**Probabilidade**: Alta
**Impacto**: Médio
**Mitigação**:
- Validação rigorosa de patterns (min 3 caracteres)
- Rejeitar patterns com palavras muito comuns (o, de, a, etc)
- Revisar regras criadas automaticamente periodicamente
- Permitir usuário aprovar/rejeitar regras sugeridas

### Risco 3: Conflitos na importação de regras
**Probabilidade**: Média
**Impacto**: Médio
**Mitigação**:
- Preview detalhado antes de importar
- Opções claras: substituir/mesclar/pular
- Backup automático antes de importar
- Rollback em caso de erro

### Risco 4: Reclassificação incorreta em massa
**Probabilidade**: Baixa
**Impacto**: Alto
**Mitigação**:
- Preview obrigatório antes de reclassificar
- Limite de 1000 transações por vez
- Backup das categorizações antigas
- Opção de desfazer reclassificação

---

## 🔐 Considerações de Segurança

### Validação de Entrada
- ✅ Validar formato JSON no import
- ✅ Limitar tamanho de arquivo de import (10MB)
- ✅ Sanitizar patterns de regras (evitar regex perigosos)
- ✅ Validar que categoryId existe antes de importar

### Autorização
- ✅ Verificar `companyId` em todas as operações
- ✅ Apenas admin pode importar regras
- ✅ Apenas admin pode reclassificar em massa
- ✅ Logs de auditoria para operações críticas

### Rate Limiting
- ✅ Limitar exports a 10 por hora
- ✅ Limitar imports a 5 por hora
- ✅ Limitar reclassificações a 3 por hora

---

## 📅 Cronograma

| Fase | Duração | Dependências | Status |
|------|---------|--------------|--------|
| FASE 1: Scoring | 2-3h | Nenhuma | 🔵 Pendente |
| FASE 2: Categorização | 4-5h | FASE 1 | 🔵 Pendente |
| FASE 3: Auto-aprendizado | 3-4h | FASE 2 | 🔵 Pendente |
| FASE 4: Import/Export | 3-4h | FASE 1 | 🔵 Pendente |
| FASE 5: Reclassificação | 4-5h | FASE 2 | 🔵 Pendente |
| FASE 6: Integração | 2-3h | FASE 2, FASE 3 | 🔵 Pendente |
| FASE 7: Testes | 3-4h | Todas | 🔵 Pendente |
| **TOTAL** | **21-28h** | - | - |

**Prazo estimado**: 3-4 dias de trabalho efetivo

---

## 📚 Referências

### Documentação Técnica
- [Drizzle ORM - Migrations](https://orm.drizzle.team/docs/migrations)
- [Next.js - API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Levenshtein Distance](https://en.wikipedia.org/wiki/Levenshtein_distance)

### Arquivos do Projeto
- `lib/ofx-parser.ts` - Parser de arquivos OFX
- `lib/services/batch-processing.service.ts` - Processamento de batches
- `lib/services/category-rules.service.ts` - Serviço de regras atual
- `lib/services/category-cache.service.ts` - Cache de categorização
- `lib/db/schema.ts` - Schema do banco de dados

---

## 📝 Notas de Implementação

### Decisões Técnicas

1. **Confidence de regras IA**: 0.75-0.85 (médio)
   - Permite que regras manuais tenham prioridade
   - Ainda suficientemente alto para automatizar

2. **Scoring combinado**: tipo + confidence + usage
   - Evita que regras antigas dominem sempre
   - Balanceia precisão com frequência de uso

3. **Reclassificação**: apenas transações automáticas
   - Respeita decisões manuais do usuário
   - Evita sobrescrever correções importantes

4. **Export completo**: regras + categorias + histórico
   - Garante portabilidade total
   - Permite análise externa do conhecimento

### Padrões de Código

- ✅ Todos os serviços são classes com métodos estáticos
- ✅ Usar TypeScript strict mode
- ✅ Documentar todas as interfaces com JSDoc
- ✅ Adicionar logs estruturados (JSON)
- ✅ Seguir convenções do projeto (pnpm, Next.js App Router)

### Considerações de Performance

- ✅ Processar regras em ordem de confidence DESC
- ✅ Limitar busca de histórico a últimos 90 dias
- ✅ Cache de categorias em memória (5 minutos)
- ✅ Usar índices compostos no banco de dados

---

## 🎯 Próximos Passos (Pós-Refatoração)

### Melhorias Futuras
1. **Machine Learning**: Treinar modelo próprio para substituir LLMs externos
2. **UI de gestão de regras**: Interface visual para criar/editar regras
3. **Sugestões proativas**: Sistema sugere regras baseado em padrões detectados
4. **Analytics**: Dashboard de performance de regras (precisão, uso, custo)
5. **A/B Testing**: Testar diferentes configurações de scoring
6. **Multi-idioma**: Suporte a descrições em PT, EN, ES

### Otimizações Técnicas
1. **Cache distribuído**: Redis para cache de regras
2. **Processamento assíncrono**: Queue (BullMQ) para uploads grandes
3. **Compressão**: Comprimir arquivos de export/import
4. **Versionamento de regras**: Histórico de alterações em regras
5. **Monitoramento**: Integrar com Sentry/DataDog

---

**Documento preparado por**: Claude Code
**Última atualização**: 2025-11-16
**Status do Plano**: ✅ Aprovado e Pronto para Execução
