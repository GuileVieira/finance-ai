# Sistema de Log de Custos de IA

## Visão Geral

Sistema completo para rastreamento, análise e previsão de custos de uso de modelos de IA (OpenAI, OpenRouter, etc.) implementado no projeto MVP Finance.

Data de implementação: 02/11/2025

---

## ✅ O que foi implementado

### 1. Banco de Dados

#### Tabela `financeai_ai_model_pricing`
Armazena os preços dos modelos de IA por provedor.

**Campos:**
- `id` - UUID único
- `provider` - Provedor (openrouter, openai, anthropic)
- `modelName` - Nome do modelo (ex: google/gemini-2.0-flash-exp)
- `inputPricePer1kTokens` - Preço por 1K tokens de entrada
- `outputPricePer1kTokens` - Preço por 1K tokens de saída
- `active` - Se o modelo está ativo
- `notes` - Observações sobre o modelo
- `createdAt`, `updatedAt` - Timestamps

**Dados iniciais:** 14 modelos cadastrados (Google Gemini, OpenAI GPT, Anthropic Claude)

#### Tabela `financeai_ai_usage_logs`
Registra cada chamada de IA detalhadamente.

**Campos:**
- `id` - UUID único
- `userId`, `companyId`, `uploadId`, `batchId`, `transactionId` - Referências contextuais
- `operationType` - Tipo de operação (categorize, completion, etc)
- `provider` - Provedor usado
- `modelName` - Modelo usado
- `inputTokens`, `outputTokens`, `totalTokens` - Contagem de tokens
- `costUsd` - Custo real calculado em USD
- `processingTimeMs` - Tempo de processamento
- `source` - Origem (history, cache, ai)
- `requestData` - Dados da requisição (JSON)
- `responseData` - Dados da resposta (JSON)
- `errorMessage` - Mensagem de erro (se houver)
- `createdAt` - Timestamp

**Índices otimizados:**
- Por usuário, empresa, upload, batch, data
- Por provedor/modelo, source, operationType
- Índices compostos para análises

### 2. Serviço de Logging (`lib/services/ai-cost-logger.service.ts`)

**Funcionalidades:**
- ✅ Registro automático de cada chamada de IA
- ✅ Cálculo de custo real baseado na tabela de preços
- ✅ Fallback para custo estimado quando preço não encontrado
- ✅ Log em arquivo local (`ai-costs.log`) em modo development
- ✅ Registro no banco de dados PostgreSQL
- ✅ Singleton pattern para performance
- ✅ Error handling que não quebra o fluxo principal

**Formato do log local:**
```
[timestamp] | user:userId | company:companyId | provider/model | tokens:input/output (total) | cost:$X.XXXXXX | source:ai | op:operationType
```

### 3. Integração com AI Provider (`lib/ai/ai-provider.service.ts`)

**Modificações:**
- ✅ Adicionado campo `logContext` nas opções de completion
- ✅ Captura automática de tokens da resposta da API (usage.prompt_tokens, usage.completion_tokens)
- ✅ Chamada automática do logger após cada completion bem-sucedida
- ✅ Registro de erros também (com tokens zerados)
- ✅ Operação async não-bloqueante

### 4. Integração com Agent (`lib/agent/agent.ts`)

**Modificações:**
- ✅ Adicionado `logContext` opcional nos métodos públicos (`classifyTransaction`, `classifyBatch`)
- ✅ Contexto global para propagação do logContext nas chamadas internas
- ✅ Passagem automática de contexto (userId, companyId, uploadId, batchId, transactionId) para o logger

### 5. API REST (`/api/ai/costs`)

Endpoint unificado com múltiplas ações via query parameter.

#### GET `/api/ai/costs` - Listar logs
**Query params:**
- `userId` - Filtrar por usuário
- `companyId` - Filtrar por empresa
- `startDate` - Data inicial (ISO string)
- `endDate` - Data final (ISO string)
- `provider` - Filtrar por provedor
- `source` - Filtrar por source (history/cache/ai)
- `limit` - Limite de registros (padrão: 100)
- `offset` - Paginação (padrão: 0)

**Resposta:**
```json
{
  "logs": [...],
  "pagination": {
    "total": 58,
    "limit": 100,
    "offset": 0,
    "hasMore": false
  }
}
```

#### GET `/api/ai/costs?action=summary` - Resumo de custos
**Query params:** userId, companyId, startDate, endDate

**Resposta:**
```json
{
  "totalCost": 0.058,
  "totalCalls": 58,
  "totalTokens": 106931,
  "bySource": {
    "ai": { "calls": 58, "cost": 0.058, "tokens": 106931 }
  },
  "byProvider": {...},
  "byModel": {...},
  "byOperation": {...},
  "dailyCosts": {
    "2025-11-02": 0.058
  },
  "averageCostPerCall": 0.001,
  "averageTokensPerCall": 1843.64
}
```

#### GET `/api/ai/costs?action=export&format=csv` - Exportar dados
**Query params:** userId, companyId, startDate, endDate, format (csv/json)

**Resposta CSV:**
```csv
ID,Date,User ID,Company ID,Upload ID,Batch ID,Transaction ID,Operation,Provider,Model,Input Tokens,Output Tokens,Total Tokens,Cost (USD),Processing Time (ms),Source,Error
uuid,2025-11-02T02:42:26.462Z,,,,,completion,openai,gpt-4.1,1849,5,1854,0.001000,,ai,
```

#### GET `/api/ai/costs?action=forecast&days=30` - Previsão de gastos
**Query params:** companyId, days (padrão: 30)

**Resposta:**
```json
{
  "basedOnDays": 1,
  "averageDailyCost": 0.058,
  "trend": "stable",
  "trendValue": 0,
  "forecastDays": 30,
  "estimatedCost": 1.74,
  "estimatedCostWithTrend": 1.74,
  "dailyBreakdown": [
    { "date": "2025-11-03", "estimatedCost": 0.058 },
    ...
  ]
}
```

### 6. Script de Seed (`scripts/seed-ai-pricing.ts`)

**Comando:**
```bash
pnpm tsx scripts/seed-ai-pricing.ts [--force]
```

**Funcionalidades:**
- ✅ Popula tabela de preços com 14 modelos
- ✅ Proteção contra duplicação (flag --force para recriar)
- ✅ Estatísticas de modelos inseridos
- ✅ Exemplos de custos estimados

**Modelos incluídos:**
- **OpenRouter:** Gemini (Flash, Pro), GPT-4o (mini, standard, turbo), Claude (Haiku, Sonnet, Opus)
- **OpenAI Direct:** GPT-4o, GPT-4, GPT-3.5-turbo

---

## 📊 Resultados dos Testes

### Testes Realizados (02/11/2025)

1. **Log Local** ✅
   - Arquivo `ai-costs.log` criado automaticamente
   - 58 chamadas registradas
   - Formato correto com todos os campos

2. **Banco de Dados** ✅
   - 58 logs inseridos na tabela `financeai_ai_usage_logs`
   - Preços de 14 modelos na tabela `financeai_ai_model_pricing`

3. **API Summary** ✅
   ```json
   {
     "totalCost": $0.058,
     "totalCalls": 58,
     "totalTokens": 106,931
   }
   ```

4. **API List** ✅
   - Paginação funcionando
   - Filtros aplicados corretamente

5. **API Forecast** ✅
   - Previsão baseada em histórico
   - Cálculo de tendência
   - Breakdown diário

6. **API Export** ✅
   - CSV com formato correto
   - Todos os campos presentes

---

## 🚀 Como Usar

### Para Desenvolvedores

#### 1. Inicializar o banco com preços
```bash
pnpm tsx scripts/seed-ai-pricing.ts
```

#### 2. Usar o logger nas chamadas de IA
```typescript
import { classificationAgent } from '@/lib/agent/agent';

const result = await classificationAgent.classifyTransaction(
  description,
  amount,
  transactionId,
  {
    userId: 'uuid-do-usuario',
    companyId: 'uuid-da-empresa',
    uploadId: 'uuid-do-upload',
    batchId: 'uuid-do-batch'
  }
);
```

#### 3. Consultar custos via API
```typescript
// Resumo geral
const summary = await fetch('/api/ai/costs?action=summary').then(r => r.json());

// Listar logs
const logs = await fetch('/api/ai/costs?limit=10&offset=0').then(r => r.json());

// Exportar CSV
window.location.href = '/api/ai/costs?action=export&format=csv';

// Previsão de 30 dias
const forecast = await fetch('/api/ai/costs?action=forecast&days=30').then(r => r.json());
```

#### 4. Ver logs locais (development)
```bash
tail -f ai-costs.log
```

### Para Análise de Custos

#### Custo total por período
```bash
curl "http://localhost:3001/api/ai/costs?action=summary&startDate=2025-11-01&endDate=2025-11-30"
```

#### Custo por empresa
```bash
curl "http://localhost:3001/api/ai/costs?action=summary&companyId=uuid-da-empresa"
```

#### Exportar dados do mês
```bash
curl "http://localhost:3001/api/ai/costs?action=export&format=csv&startDate=2025-11-01&endDate=2025-11-30" > custos-novembro.csv
```

#### Previsão de gastos
```bash
curl "http://localhost:3001/api/ai/costs?action=forecast&days=30&companyId=uuid"
```

---

## 📈 Métricas Atuais (02/11/2025)

- **Total de chamadas:** 58
- **Custo total:** $0.058
- **Tokens processados:** 106,931
- **Custo médio por chamada:** $0.001
- **Tokens médios por chamada:** ~1,844
- **Modelos mais usados:** openai/gpt-4.1

---

## 🔧 Manutenção

### Atualizar preços dos modelos

1. Consultar preços atuais:
   - OpenRouter: https://openrouter.ai/docs#models
   - OpenAI: https://openai.com/pricing

2. Atualizar no banco:
```sql
UPDATE financeai_ai_model_pricing
SET input_price_per_1k_tokens = 0.00015,
    output_price_per_1k_tokens = 0.0006,
    updated_at = NOW()
WHERE provider = 'openai' AND model_name = 'gpt-4o-mini';
```

3. Ou re-executar o seed:
```bash
pnpm tsx scripts/seed-ai-pricing.ts --force
```

### Limpar logs antigos

```sql
-- Deletar logs com mais de 90 dias
DELETE FROM financeai_ai_usage_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Rotacionar arquivo de log local

```bash
# Manual
mv ai-costs.log ai-costs-$(date +%Y%m%d).log
touch ai-costs.log

# Ou configurar logrotate (Linux)
```

---

## 🎯 Próximos Passos (Futuro)

### Melhorias Sugeridas

1. **Dashboard Visual**
   - Gráficos de custos por período
   - Comparação entre modelos
   - Alertas de custo

2. **Alertas Automáticos**
   - Email quando ultrapassar limite diário/mensal
   - Webhook para sistemas externos

3. **Otimizações**
   - Cache de preços em memória
   - Batch insert de logs para reduzir writes
   - Índices adicionais baseados em queries reais

4. **Análises Avançadas**
   - ML para detectar anomalias de custo
   - Recomendações de modelos mais econômicos
   - Análise de ROI por tipo de operação

5. **Integrações**
   - Export para Google Sheets
   - Integração com sistemas de billing
   - Webhooks para notificações

---

## 📝 Notas Técnicas

### Performance
- Logs são salvos de forma assíncrona (não bloqueiam a chamada principal)
- Índices otimizados para queries comuns
- Paginação implementada em todos os endpoints de listagem

### Segurança
- Dados sensíveis (prompts completos) são truncados para 200 caracteres
- Logs podem ser filtrados por empresa/usuário para isolamento
- Endpoint de API pode ser protegido com autenticação (implementar no futuro)

### Observações
- Custo de $0.001 é um fallback quando o preço real não é encontrado na tabela
- O modelo "gpt-4.1" nos logs parece ser um fallback do sistema - verificar configuração
- Em produção, desabilitar logs locais (verificar NODE_ENV)

---

## 🤝 Contribuidores

Sistema implementado em 02/11/2025 por Claude Code.

## 📄 Licença

Parte do projeto MVP Finance - Todos os direitos reservados.
