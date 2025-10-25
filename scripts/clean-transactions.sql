-- Script de limpeza de dados OFX
-- Execute: psql -d financeai_db -f scripts/clean-transactions.sql

-- Remover transações recentes (última hora)
DELETE FROM financeai_transactions
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Remover uploads recentes (última hora)
DELETE FROM financeai_uploads
WHERE uploaded_at > NOW() - INTERVAL '1 hour';

-- Contar o que sobrou
SELECT 'transacoes_restantes' as tipo, COUNT(*) as count FROM financeai_transactions
UNION ALL
SELECT 'uploads_restantes' as tipo, COUNT(*) as count FROM financeai_uploads;

-- Mostrar os últimos uploads remanescentes
SELECT
  id,
  original_name,
  status,
  total_transactions,
  uploaded_at
FROM financeai_uploads
ORDER BY uploaded_at DESC
LIMIT 10;

-- Mostrar as últimas transações remanescentes
SELECT
  id,
  description,
  amount,
  date,
  created_at
FROM financeai_transactions
ORDER BY created_at DESC
LIMIT 10;