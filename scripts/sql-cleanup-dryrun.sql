-- ============================================================
-- PR4 — DRY-RUN: Preview do impacto ANTES de executar a limpeza
-- 
-- Este script NÃO modifica nenhum dado.
-- Mostra quantas transações seriam afetadas por cada etapa.
-- 
-- Execute antes do sql-cleanup-categorization.sql!
-- ============================================================

-- ETAPA 1: Termos genéricos (cache poisoning)
SELECT 'ETAPA 1: Termos genéricos' AS etapa, count(*) AS afetadas
FROM financeai_transactions
WHERE 
  (UPPER(description) ~ '^(SISPAG|PAGAMENTO|PIX ENVIADO|PIX RECEBIDO|TED ENVIADA|DOC ENVIADO|ENVIO TED|TRANSF|TRANSFERENCIA)\s*\S{0,15}$')
  AND manually_categorized = false
  AND verified = false;

-- ETAPA 2: FIDC como Receita
SELECT 'ETAPA 2: FIDC como Receita' AS etapa, count(*) AS afetadas
FROM financeai_transactions t
JOIN financeai_categories c ON t.category_id = c.id
WHERE 
  (UPPER(t.description) LIKE '%FIDC%' OR UPPER(t.description) LIKE '%REC TIT%' OR UPPER(t.description) LIKE '%ANTECIPACAO RECEB%')
  AND c.type IN ('revenue', 'income')
  AND c.dre_group = 'RoB'
  AND t.manually_categorized = false
  AND t.verified = false;

-- ETAPA 3a: Créditos como Despesa
SELECT 'ETAPA 3a: Créditos como Despesa' AS etapa, count(*) AS afetadas
FROM financeai_transactions t
JOIN financeai_categories c ON t.category_id = c.id
WHERE 
  CAST(t.amount AS numeric) > 0
  AND c.type IN ('variable_cost', 'fixed_cost', 'expense', 'tax')
  AND UPPER(t.description) NOT LIKE '%ESTORNO%'
  AND UPPER(t.description) NOT LIKE '%DEVOLUCAO%'
  AND UPPER(t.description) NOT LIKE '%RESTITUICAO%'
  AND t.manually_categorized = false
  AND t.verified = false;

-- ETAPA 3b: Débitos como Receita
SELECT 'ETAPA 3b: Débitos como Receita' AS etapa, count(*) AS afetadas
FROM financeai_transactions t
JOIN financeai_categories c ON t.category_id = c.id
WHERE 
  CAST(t.amount AS numeric) < 0
  AND c.type IN ('revenue', 'income')
  AND UPPER(t.description) NOT LIKE '%ESTORNO%'
  AND UPPER(t.description) NOT LIKE '%DEVOLUCAO%'
  AND UPPER(t.description) NOT LIKE '%RESTITUICAO%'
  AND t.manually_categorized = false
  AND t.verified = false;

-- ETAPA 4a: Débitos com dreGroup RoB
SELECT 'ETAPA 4a: Débitos em Receita Bruta (RoB)' AS etapa, count(*) AS afetadas
FROM financeai_transactions t
JOIN financeai_categories c ON t.category_id = c.id
WHERE 
  CAST(t.amount AS numeric) < 0
  AND c.dre_group = 'RoB'
  AND UPPER(t.description) NOT LIKE '%ESTORNO%'
  AND UPPER(t.description) NOT LIKE '%DEVOLUCAO%'
  AND t.manually_categorized = false
  AND t.verified = false;

-- ETAPA 4b: Créditos com dreGroup CV/CF/DNOP
SELECT 'ETAPA 4b: Créditos em Custos/Despesas (CV/CF/DNOP)' AS etapa, count(*) AS afetadas
FROM financeai_transactions t
JOIN financeai_categories c ON t.category_id = c.id
WHERE 
  CAST(t.amount AS numeric) > 0
  AND c.dre_group IN ('CV', 'CF', 'DNOP')
  AND UPPER(t.description) NOT LIKE '%ESTORNO%'
  AND UPPER(t.description) NOT LIKE '%DEVOLUCAO%'
  AND UPPER(t.description) NOT LIKE '%RESTITUICAO%'
  AND t.manually_categorized = false
  AND t.verified = false;

-- RESUMO: Estado atual do banco
SELECT 
  count(*) FILTER (WHERE needs_review = true) AS ja_em_revisao,
  count(*) FILTER (WHERE needs_review = false AND category_id IS NOT NULL) AS categorizadas_ok,
  count(*) FILTER (WHERE category_id IS NULL) AS sem_categoria,
  count(*) AS total_geral
FROM financeai_transactions;
