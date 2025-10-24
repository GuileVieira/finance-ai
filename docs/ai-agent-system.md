# Sistema de Agente de IA para Categorização Financeira

## Visão Geral

Este sistema utiliza inteligência artificial para classificar automaticamente transações financeiras em categorias contábeis brasileiras, aprendendo com o tempo para reduzir custos e melhorar a acurácia.

## Arquitetura

### Componentes Principais

1. **Agente LangGraph** (`lib/agent/agent.ts`)
   - Fluxo de decisão inteligente com múltiplas camadas
   - Integração com Gemini 2.0 Flash e GPT-4o-mini
   - Sistema de fallback entre modelos

2. **Sistema de Aprendizado** (`lib/classification/`)
   - **Histórico** (`history.ts`): Aprendizado com transações anteriores
   - **Cache** (`cache.ts`): Cache inteligente com TTL
   - **Padrões**: Reconhecimento automático de padrões

3. **Busca e Validação** (`lib/search/`)
   - **SerpApi** (`serpapi.ts`): Busca de informações de empresas
   - **CNPJ Service** (`cnpj-service.ts`): Validação e consulta de CNPJ

4. **APIs** (`app/api/ai/`)
   - Classificação individual (`categorize/route.ts`)
   - Processamento em lote (`batch-categorize/route.ts`)
   - Histórico e feedback (`history/route.ts`)

## Fluxo de Classificação

### 1. Verificação de Histórico (Primeira Camada)
- Busca exata: Transações idênticas já processadas
- Busca similar: Transações com descrições parecidas
- Padrões conhecidos: Match com padrões aprendidos

### 2. Cache Inteligente (Segunda Camada)
- Cache por descrição + valor
- Busca fuzzy para descrições similares
- Entradas expiram após 30 dias

### 3. Agente IA (Terceira Camada)
- Análise com prompts dinâmicos
- Busca de informações da empresa (se necessário)
- Classificação macro → micro
- Validação automática de resultados

## Configuração

### Variáveis de Ambiente

```bash
# Copie o arquivo de exemplo
cp .env.example .env.local

# Configure as chaves de API
OPENROUTER_API_KEY=sk-or-v1-sua-chave
SERPAPI_API_KEY=sua-chave-serpapi  # Opcional
```

### Dependências

```bash
pnpm add @langchain/langgraph @langchain/core litellm serpapi fuse.js node-persist
```

## Uso da API

### Classificação Individual

```javascript
POST /api/ai/categorize
{
  "description": "DEBITO IFOOD RESTAURANTES 45.90",
  "amount": 45.90,
  "useCache": true
}

// Resposta
{
  "success": true,
  "data": {
    "transactionId": "txn_123456",
    "originalDescription": "DEBITO IFOOD RESTAURANTES 45.90",
    "classification": {
      "macro": "Não Operacional",
      "micro": "Serviços Diversos",
      "confidence": 0.95,
      "reasoning": "IFood detectado, característica de serviço de alimentação"
    },
    "source": "ai",
    "processingTime": 1250
  }
}
```

### Processamento em Lote

```javascript
POST /api/ai/batch-categorize
{
  "transactions": [
    {
      "description": "DEBITO IFOOD RESTAURANTES 45.90",
      "amount": 45.90
    },
    {
      "description": "CREDITO SALARIO FOLHA 5500.00",
      "amount": 5500.00
    }
  ],
  "useCache": true
}
```

### Feedback e Aprendizado

```javascript
POST /api/ai/history
{
  "transactionId": "txn_123456",
  "originalDescription": "DEBITO IFOOD RESTAURANTES 45.90",
  "originalClassification": {
    "macro": "Não Operacional",
    "micro": "Serviços Diversos",
    "confidence": 0.95
  },
  "isCorrect": true,
  "feedback": "Classificação perfeita"
}
```

## Categorias Suportadas

O sistema utiliza as categorias definidas em `lib/mock-categories.ts`:

### Receitas (Verde)
- Vendas de Produtos
- Vendas de Serviços
- Receitas Financeiras

### Custos Variáveis (Laranja)
- Comissões e Variáveis
- Custos de Produtos
- Logística e Distribuição

### Custos Fixos (Vermelho)
- Salários e Encargos
- Aluguel e Ocupação
- Tecnologia e Software
- Serviços Profissionais
- Tributos e Contribuições

### Não Operacionais (Cinza)
- Serviços Financeiros
- Serviços Diversos

## Interface de Teste

Acesse `/test-ai-agent` para uma interface completa de teste que inclui:

- Classificação individual
- Processamento em lote
- Visualização de estatísticas
- Sistema de feedback
- Transações de exemplo

## Padrões Reconhecidos

O sistema aprende automaticamente padrões como:

- **IFOOD**, **UBER EATS**, **RAPPI** → Alimentação
- **UBER**, **99**, **CIDADE** → Transporte
- **NETFLIX**, **SPOTIFY**, **PRIME** → Tecnologia
- **INSS**, **FGTS**, **PIS**, **COFINS** → Tributos
- **SALÁRIO**, **PRÓ-LABORE** → Salários e Encargos
- **ALUGUEL**, **CONDOMÍNIO** → Aluguel e Ocupação

## Métricas e Monitoramento

### Estatísticas Disponíveis

- Total de classificações
- Taxa de acerto médio
- Distribuição por fonte (histórico/cache/IA)
- Custo estimado de processamento
- Padrões aprendidos

### API de Estatísticas

```javascript
GET /api/ai/history?action=stats

// Resposta
{
  "success": true,
  "data": {
    "history": {
      "totalRecords": 1250,
      "totalPatterns": 89,
      "averageAccuracy": 0.92
    },
    "cache": {
      "totalEntries": 340,
      "hitRate": 0.78
    }
  }
}
```

## Otimizações de Performance

### Redução de Custos

1. **Cache Inteligente**: Evita reprocessamento
2. **Histórico**: Aprende com transações anteriores
3. **Batch Processing**: Processa múltiplas transações
4. **Fallback Models**: Usa modelos mais baratos quando possível

### Tempos de Processamento

- **Histórico/Cache**: < 50ms
- **IA com Cache**: 500-1500ms
- **IA sem Cache**: 1000-3000ms
- **Batch**: Tempo médio por transação reduzido

## Segurança e Privacidade

- Dados sensíveis armazenados localmente
- CNPJs validados mas não expostos
- Cache com expiração automática
- Logs sem informações confidenciais

## Troubleshooting

### Problemas Comuns

1. **Classificação Incorreta**
   - Use o sistema de feedback
   - Verifique se a descrição está clara
   - Considere adicionar padrões manualmente

2. **Alto Custo de IA**
   - Verifique se o cache está funcionando
   - Aumente o TTL do cache
   - Use mais exemplos de treinamento

3. **Performance Lenta**
   - Limpe o cache se estiver muito grande
   - Verifique as chamadas à SerpApi
   - Monitore o uso de memória

### Debug

```bash
# Ativar modo debug
DEBUG_AI_AGENT=true

# Verificar logs
tail -f logs/ai-agent.log

# Estatísticas em tempo real
curl http://localhost:3000/api/ai/categorize?action=stats
```

## Roadmap Futuro

### Próximas Funcionalidades

- [ ] Interface de treinamento customizado
- [ ] Integração com ERPs brasileiros
- [ ] Suporte a múltiplos idiomas
- [ ] Dashboard de analytics avançado
- [ ] Exportação para diferentes formatos
- [ ] API de webhook para integração

### Melhorias Técnicas

- [ ] Sistema de priorização de cache
- [ ] Machine learning para predição
- [ ] Processamento distribuído
- [ ] Cache Redis para produção
- [ ] Sistema de auditoria completo

## Suporte

Para dúvidas ou problemas:

1. Verifique a interface de teste em `/test-ai-agent`
2. Consulte os logs da aplicação
3. Revise as variáveis de ambiente
4. Teste com as transações de exemplo

---

**Versão**: 1.0.0
**Atualizado**: 24 de Outubro de 2024
**Licença**: MIT