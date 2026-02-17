-- ============================================================
-- PR4 — Script de Limpeza de Categorização
-- Cirurgia de Categorização: Corrigir dados históricos contaminados
-- 
-- ⚠️  EXECUTAR APENAS APÓS DEPLOY DE PR1, PR2 E PR3
-- ⚠️  FAÇA BACKUP ANTES DE EXECUTAR
-- ⚠️  EXECUTE EM TRANSAÇÃO (BEGIN/COMMIT) PARA PODER REVERTER
-- ============================================================

-- Verificar quantas transações serão afetadas ANTES de executar:
-- SELECT count(*) FROM financeai_transactions WHERE needs_review = true;

BEGIN;

-- ============================================================
-- ETAPA 1: Resetar transações com termos genéricos (cache poisoning)
-- 
-- Transações cujo description é genérico demais (SISPAG, PAGAMENTO, etc.)
-- e que foram categorizadas via cache — provavelmente cache envenenado.
-- Reseta para revisão manual.
-- ============================================================

WITH generic_cleanup AS (
  UPDATE financeai_transactions t
  SET 
    needs_review = true,
    confidence = 0,
    reasoning = CONCAT(
      '🔧 [PR4-CLEANUP] Categorização resetada: termo genérico detectado. ',
      COALESCE(reasoning, '')
    ),
    categorization_source = NULL,
    updated_at = NOW()
  WHERE 
    -- Descrição contém termo genérico E é curta (sem detalhes especificos)
    (
      (UPPER(description) ~ '^(SISPAG|PAGAMENTO|PIX ENVIADO|PIX RECEBIDO|TED ENVIADA|DOC ENVIADO|ENVIO TED|TRANSF|TRANSFERENCIA)\s*\S{0,15}$')
    )
    -- Só reseta as que foram auto-categorizadas (não as manuais)
    AND manually_categorized = false
    AND verified = false
  RETURNING id
)
SELECT count(*) AS etapa1_transacoes_resetadas FROM generic_cleanup;


-- ============================================================
-- ETAPA 2: Corrigir FIDC classificado como RECEITA
-- 
-- Transações com FIDC no description que foram forçadas para
-- categorias de receita. Devem ser Empréstimo/Antecipação.
-- ============================================================

WITH fidc_cleanup AS (
  UPDATE financeai_transactions t
  SET 
    needs_review = true,
    confidence = 0,
    reasoning = CONCAT(
      '🔧 [PR4-CLEANUP] FIDC classificado como Receita — corrigir para Empréstimo/Antecipação. ',
      COALESCE(reasoning, '')
    ),
    categorization_source = NULL,
    updated_at = NOW()
  FROM financeai_categories c
  WHERE 
    t.category_id = c.id
    AND (UPPER(t.description) LIKE '%FIDC%' OR UPPER(t.description) LIKE '%REC TIT%' OR UPPER(t.description) LIKE '%ANTECIPACAO RECEB%')
    AND c.type IN ('revenue', 'income')
    AND c.dre_group = 'RoB'
    AND t.manually_categorized = false
    AND t.verified = false
  RETURNING t.id
)
SELECT count(*) AS etapa2_fidc_corrigidos FROM fidc_cleanup;


-- ============================================================
-- ETAPA 3: Corrigir violações contábeis de sinal × tipo
-- 
-- Créditos (+) classificados como Despesa/Custo
-- Débitos (-) classificados como Receita
-- (excluindo estornos/devoluções)
-- ============================================================

-- 3a. Créditos classificados como Despesa
WITH credit_as_expense AS (
  UPDATE financeai_transactions t
  SET 
    needs_review = true,
    confidence = 0,
    reasoning = CONCAT(
      '🔧 [PR4-CLEANUP] Violação contábil: Crédito classificado como Despesa. ',
      COALESCE(reasoning, '')
    ),
    categorization_source = NULL,
    updated_at = NOW()
  FROM financeai_categories c
  WHERE 
    t.category_id = c.id
    AND CAST(t.amount AS numeric) > 0
    AND c.type IN ('variable_cost', 'fixed_cost', 'expense', 'tax')
    -- Excluir estornos/devoluções (sinal invertido é correto)
    AND UPPER(t.description) NOT LIKE '%ESTORNO%'
    AND UPPER(t.description) NOT LIKE '%DEVOLUCAO%'
    AND UPPER(t.description) NOT LIKE '%RESTITUICAO%'
    AND t.manually_categorized = false
    AND t.verified = false
  RETURNING t.id
)
SELECT count(*) AS etapa3a_creditos_como_despesa FROM credit_as_expense;

-- 3b. Débitos classificados como Receita
WITH debit_as_revenue AS (
  UPDATE financeai_transactions t
  SET 
    needs_review = true,
    confidence = 0,
    reasoning = CONCAT(
      '🔧 [PR4-CLEANUP] Violação contábil: Débito classificado como Receita. ',
      COALESCE(reasoning, '')
    ),
    categorization_source = NULL,
    updated_at = NOW()
  FROM financeai_categories c
  WHERE 
    t.category_id = c.id
    AND CAST(t.amount AS numeric) < 0
    AND c.type IN ('revenue', 'income')
    -- Excluir estornos/devoluções
    AND UPPER(t.description) NOT LIKE '%ESTORNO%'
    AND UPPER(t.description) NOT LIKE '%DEVOLUCAO%'
    AND UPPER(t.description) NOT LIKE '%RESTITUICAO%'
    AND t.manually_categorized = false
    AND t.verified = false
  RETURNING t.id
)
SELECT count(*) AS etapa3b_debitos_como_receita FROM debit_as_revenue;


-- ============================================================
-- ETAPA 4: Corrigir violações de dreGroup × sinal
-- 
-- Transações com dreGroup RoB (Receita Bruta) mas são Débito
-- Transações com dreGroup CV/CF/DNOP (Custos/Despesas) mas são Crédito
-- ============================================================

-- 4a. Débitos com dreGroup RoB
WITH debit_rob AS (
  UPDATE financeai_transactions t
  SET 
    needs_review = true,
    confidence = 0,
    reasoning = CONCAT(
      '🔧 [PR4-CLEANUP] Violação dreGroup: Débito em Receita Bruta (RoB). ',
      COALESCE(reasoning, '')
    ),
    categorization_source = NULL,
    updated_at = NOW()
  FROM financeai_categories c
  WHERE 
    t.category_id = c.id
    AND CAST(t.amount AS numeric) < 0
    AND c.dre_group = 'RoB'
    AND UPPER(t.description) NOT LIKE '%ESTORNO%'
    AND UPPER(t.description) NOT LIKE '%DEVOLUCAO%'
    AND t.manually_categorized = false
    AND t.verified = false
  RETURNING t.id
)
SELECT count(*) AS etapa4a_debitos_rob FROM debit_rob;

-- 4b. Créditos com dreGroup CV/CF/DNOP
WITH credit_expense_dre AS (
  UPDATE financeai_transactions t
  SET 
    needs_review = true,
    confidence = 0,
    reasoning = CONCAT(
      '🔧 [PR4-CLEANUP] Violação dreGroup: Crédito em Despesa (', c.dre_group, '). ',
      COALESCE(reasoning, '')
    ),
    categorization_source = NULL,
    updated_at = NOW()
  FROM financeai_categories c
  WHERE 
    t.category_id = c.id
    AND CAST(t.amount AS numeric) > 0
    AND c.dre_group IN ('CV', 'CF', 'DNOP')
    AND UPPER(t.description) NOT LIKE '%ESTORNO%'
    AND UPPER(t.description) NOT LIKE '%DEVOLUCAO%'
    AND UPPER(t.description) NOT LIKE '%RESTITUICAO%'
    AND t.manually_categorized = false
    AND t.verified = false
  RETURNING t.id
)
SELECT count(*) AS etapa4b_creditos_despesa_dre FROM credit_expense_dre;


-- ============================================================
-- RESUMO FINAL: Quantas transações precisam de revisão agora?
-- ============================================================
SELECT 
  count(*) FILTER (WHERE needs_review = true AND confidence = 0) AS total_para_revisao,
  count(*) FILTER (WHERE needs_review = false) AS total_ok,
  count(*) AS total_geral
FROM financeai_transactions;


-- ⚠️  Revise os números acima. Se estiverem corretos:
COMMIT;
-- Se algo estiver errado:
-- ROLLBACK;
