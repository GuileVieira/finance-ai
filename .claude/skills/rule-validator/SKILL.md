---
name: rule-validator
description: Valida regras de categorização do banco de dados, identifica problemas e explica por que cada regra faz ou não sentido. Use quando precisar auditar regras, encontrar regras problemáticas, entender por que uma regra existe, ou melhorar a qualidade das regras de categorização.
---

# Rule Validator

Analisa e valida regras de categorização do banco de dados, identificando problemas e explicando a lógica por trás de cada regra.

## Capacidades

1. **Auditoria de Regras**: Analisa todas as regras e identifica problemas
2. **Explicação de Regras**: Explica por que uma regra existe e se faz sentido
3. **Detecção de Problemas**: Encontra regras genéricas, conflitantes ou obsoletas
4. **Recomendações**: Sugere melhorias ou desativação de regras ruins

## Workflow de Validação

### Passo 1: Consultar Regras do Banco

Execute o script de consulta para obter as regras:

```bash
pnpm tsx scripts/query-rules.ts
```

Ou use a API diretamente:
```bash
curl http://localhost:3000/api/transaction-rules
```

### Passo 2: Analisar Cada Regra

Para cada regra, avalie os seguintes critérios:

#### Critérios de Qualidade

| Critério | Bom | Ruim |
|----------|-----|------|
| **Precisão** | > 80% (validationCount / total) | < 40% |
| **Health Score** | > 0.7 | < 0.3 |
| **Especificidade** | Padrão específico (SPOTIFY, NETFLIX) | Padrão genérico (PAGAMENTO, PIX) |
| **Uso Recente** | lastUsedAt < 90 dias | > 90 dias sem uso |
| **Ratio Negativo** | negativeCount < validationCount | negativeCount > validationCount × 2 |

#### Fórmulas de Avaliação

```
Precisão = validationCount / (validationCount + negativeCount)
  - Se não há feedback: assume 0.5

Health = (precisão × 0.5) + (uso × 0.3) + (recência × 0.2)
  - uso = min(1, log10(usageCount + 1) / 2)
  - recência = max(0, 1 - diasSemUso / 90)
```

### Passo 3: Classificar Problemas

#### Tipos de Problemas

**1. Regra Genérica Demais**
- Padrão contém apenas palavras genéricas
- Palavras genéricas: PAGAMENTO, TRANSFERENCIA, PIX, TED, DOC, DEBITO, CREDITO, BANCO, TARIFA
- Risco: Alta taxa de falsos positivos

**2. Regra Conflitante**
- Múltiplas regras ativas com padrões similares
- Apontam para categorias diferentes
- Risco: Inconsistência na categorização

**3. Regra Obsoleta**
- Não usada há mais de 90 dias
- Status 'candidate' sem promoção
- Risco: Polui o sistema sem valor

**4. Regra com Alta Rejeição**
- negativeCount / validationCount >= 2.0
- Precisão < 40%
- Risco: Categoriza errado mais do que acerta

**5. Regra Orfã**
- categoryId aponta para categoria inexistente
- Risco: Erro em runtime

**6. Padrão Inválido**
- Regex com sintaxe incorreta
- Wildcard mal formado
- Menos de 3 caracteres significativos

### Passo 4: Gerar Relatório

#### Formato do Relatório

```markdown
# Relatório de Validação de Regras

## Resumo
- Total de regras: X
- Regras saudáveis: Y (Z%)
- Regras com problemas: W

## Problemas Críticos (Ação Imediata)
[Regras com health < 0.3 ou precisão < 0.4]

## Problemas Moderados (Revisar)
[Regras com health < 0.6 ou precisão < 0.7]

## Regras Suspeitas (Monitorar)
[Regras genéricas ou pouco usadas]

## Análise Detalhada

### Regra: [ID]
- **Padrão**: [rulePattern]
- **Tipo**: [ruleType]
- **Categoria**: [categoryName]
- **Status**: [status]
- **Health Score**: [X.XX]
- **Precisão**: [XX%]
- **Uso**: [usageCount] vezes
- **Validações**: [validationCount] positivas, [negativeCount] negativas
- **Última Uso**: [lastUsedAt]

**Diagnóstico**: [Explicação do problema]
**Recomendação**: [Ação sugerida]
```

## Explicações de Por Que Regras Existem

### Por Tipo de Origem (sourceType)

**manual**: Criada pelo usuário
- Geralmente mais confiável
- Reflete conhecimento do negócio
- Validar se ainda é relevante

**ai**: Gerada pela IA
- Baseada em padrões detectados
- Pode ter falsos positivos
- Verificar se foi promovida (status != 'candidate')

**imported**: Importada de outro sistema
- Pode não se aplicar ao contexto atual
- Verificar compatibilidade

### Por Estratégia de Padrão (patternStrategy)

| Estratégia | Significado | Confiança |
|------------|-------------|-----------|
| entity_only | Apenas nome da entidade | Alta |
| prefix_entity | Tipo + entidade (PIX*EMPRESA) | Média-Alta |
| single_keyword | Palavra-chave única | Média |
| multi_keyword | Múltiplas palavras | Média-Baixa |
| fallback | Texto normalizado | Baixa |

### Por Tipo de Match (ruleType)

| Tipo | Quando Usar | Risco |
|------|-------------|-------|
| exact | Match exato | Baixo (muito específico) |
| contains | Substring | Médio |
| wildcard | Padrões com * | Médio-Alto |
| tokens | Palavras-chave | Médio |
| regex | Expressão regular | Alto |
| fuzzy | Similaridade | Alto |

## Queries Úteis para Diagnóstico

### Regras com problemas de precisão
```sql
SELECT * FROM financeai_category_rules
WHERE active = true
AND (negative_count::float / NULLIF(validation_count + negative_count, 0)) > 0.6;
```

### Regras genéricas
```sql
SELECT * FROM financeai_category_rules
WHERE rule_pattern ~* '^(PAGAMENTO|PIX|TED|DOC|TRANSFERENCIA)$'
AND active = true;
```

### Regras conflitantes (mesmo padrão, categorias diferentes)
```sql
SELECT rule_pattern, COUNT(DISTINCT category_id) as num_categories
FROM financeai_category_rules
WHERE active = true
GROUP BY rule_pattern
HAVING COUNT(DISTINCT category_id) > 1;
```

### Regras obsoletas
```sql
SELECT * FROM financeai_category_rules
WHERE active = true
AND (last_used_at IS NULL OR last_used_at < NOW() - INTERVAL '90 days');
```

### Regras candidatas não promovidas
```sql
SELECT * FROM financeai_category_rules
WHERE status = 'candidate'
AND created_at < NOW() - INTERVAL '30 days';
```

## Checklist de Validação

Antes de aprovar uma regra, verifique:

- [ ] Padrão não é genérico demais?
- [ ] Não há outra regra similar para categoria diferente?
- [ ] Precisão > 70%?
- [ ] Health score > 0.5?
- [ ] Usada recentemente (< 90 dias)?
- [ ] Categoria alvo existe e faz sentido?
- [ ] Exemplos de transações fazem sentido?

## Ações Recomendadas por Problema

| Problema | Ação |
|----------|------|
| Genérica demais | Refinar padrão ou desativar |
| Conflitante | Mesclar ou escolher uma |
| Obsoleta | Desativar se não usada |
| Alta rejeição | Desativar imediatamente |
| Órfã | Deletar |
| Padrão inválido | Corrigir ou deletar |

## Contexto Técnico

**Tabela**: `financeai_category_rules`

**Campos principais**:
- `id`: UUID da regra
- `category_id`: Categoria alvo
- `rule_pattern`: Padrão de match
- `rule_type`: Tipo de match (exact, contains, wildcard, tokens, regex, fuzzy)
- `confidence_score`: Confiança (0-1)
- `status`: candidate, active, refined, consolidated, inactive
- `usage_count`: Vezes que foi usada
- `validation_count`: Usos positivos (usuário aceitou)
- `negative_count`: Usos negativos (usuário corrigiu)
- `last_used_at`: Última vez usada
- `source_type`: manual, ai, imported
- `pattern_strategy`: Estratégia de geração do padrão

**Serviços relacionados**:
- `lib/services/category-rules.service.ts`: Matching de regras
- `lib/services/rule-lifecycle.service.ts`: Gestão de ciclo de vida
- `lib/services/rule-scoring.service.ts`: Pontuação de qualidade
