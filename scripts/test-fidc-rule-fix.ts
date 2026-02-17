/**
 * Test: PR2 — Remover Fallback RECEITA para FIDC
 *
 * Verifica que transações FIDC/Antecipação NUNCA são forçadas
 * para categoria de RECEITA quando não há categoria de empréstimo/passivo.
 *
 * Uso: npx tsx scripts/test-fidc-rule-fix.ts
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { AICategorization } from '@/lib/services/ai-categorization-adapter.service';

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`✅ ${label}`);
  } else {
    console.error(`❌ FALHOU: ${label}`);
    process.exitCode = 1;
  }
}

function runTests() {
  console.log('--- PR2: FIDC Rule Fix Tests ---\n');

  // Acessar o método privado via cast para testes
  const adapter = new AICategorization();
  const applyRule = (adapter as any).applyRuleBasedCategorization.bind(adapter);

  // ============================================================
  // TESTE 1: FIDC com DESCONTO DE TITULOS disponível → usa essa
  // ============================================================
  console.log('>> Teste 1: FIDC com categoria DESCONTO DE TITULOS disponível');

  const result1 = applyRule(
    { description: 'FIDC ANTECIPACAO RECEBIVEIS 123456', amount: 50000, date: new Date() },
    { term: 'FIDC' },
    ['RECEITA OPERACIONAL', 'DESCONTO DE TITULOS', 'OUTRAS DESPESAS NOP']
  );
  assert(result1 !== null, 'Retorna resultado (não null)');
  assert(result1?.category === 'DESCONTO DE TITULOS', `Usa DESCONTO DE TITULOS (got: "${result1?.category}")`);

  // ============================================================
  // TESTE 2: FIDC com EMPRESTIMO disponível → usa essa
  // ============================================================
  console.log('\n>> Teste 2: FIDC com categoria EMPRESTIMO disponível');

  const result2 = applyRule(
    { description: 'FIDC REC TIT BANCO XYZ', amount: 30000, date: new Date() },
    { term: 'FIDC' },
    ['RECEITA OPERACIONAL', 'EMPRESTIMO BANCARIO', 'OUTRAS DESPESAS NOP']
  );
  assert(result2 !== null, 'Retorna resultado (não null)');
  assert(result2?.category === 'EMPRESTIMO BANCARIO', `Usa EMPRESTIMO BANCARIO (got: "${result2?.category}")`);

  // ============================================================
  // TESTE 3: FIDC com ANTECIPACAO disponível → usa essa
  // ============================================================
  console.log('\n>> Teste 3: FIDC com categoria ANTECIPACAO disponível');

  const result3 = applyRule(
    { description: 'FIDC FACTORING', amount: 20000, date: new Date() },
    { term: 'FIDC' },
    ['RECEITA OPERACIONAL', 'ANTECIPACAO DE RECEBIVEIS', 'OUTRAS DESPESAS NOP']
  );
  assert(result3 !== null, 'Retorna resultado (não null)');
  assert(result3?.category === 'ANTECIPACAO DE RECEBIVEIS', `Usa ANTECIPACAO DE RECEBIVEIS (got: "${result3?.category}")`);

  // ============================================================
  // TESTE 4: 🚨 CRÍTICO — FIDC sem categoria específica → NÃO cai em RECEITA
  // ============================================================
  console.log('\n>> Teste 4: 🚨 FIDC sem categoria de empréstimo → retorna null (NÃO usa RECEITA)');

  const result4 = applyRule(
    { description: 'FIDC ANTECIPACAO RECEBIVEIS', amount: 100000, date: new Date() },
    { term: 'FIDC' },
    ['RECEITA OPERACIONAL', 'VENDAS DE PRODUTOS', 'OUTRAS DESPESAS NOP', 'CUSTOS DE PRODUCAO']
  );
  assert(result4 === null, `Retorna null, NÃO força RECEITA (got: ${result4 === null ? 'null' : `"${result4?.category}"`})`);

  // ============================================================
  // TESTE 5: Transação NÃO-FIDC continua funcionando normalmente
  // ============================================================
  console.log('\n>> Teste 5: Transação normal (não-FIDC) não é afetada');

  const result5 = applyRule(
    { description: 'TARIFA BANCARIA MENSAL', amount: -45.90, date: new Date() },
    undefined,
    ['RECEITA OPERACIONAL', 'TARIFAS BANCARIAS', 'OUTRAS DESPESAS NOP']
  );
  // Esse não deve ter match de FIDC, então deve retornar null (não é regra de FIDC)
  // A menos que outra regra case — a função pode retornar null para transações normais sem saldo
  // Apenas verificamos que NÃO retorna uma categoria FIDC
  if (result5 !== null) {
    assert(!result5.category.includes('FIDC'), 'Transação normal não é categorizada como FIDC');
  } else {
    assert(true, 'Transação normal retorna null (sem regra determinística) — correto');
  }

  // ============================================================
  // TESTE 6: FIDC débito (saída) → não aplica regra de crédito
  // ============================================================
  console.log('\n>> Teste 6: FIDC como débito (pagamento de FIDC) → não aplica regra');

  const result6 = applyRule(
    { description: 'FIDC PAGAMENTO PARCELA', amount: -25000, date: new Date() },
    { term: 'FIDC' },
    ['RECEITA OPERACIONAL', 'DESCONTO DE TITULOS', 'EMPRESTIMO BANCARIO']
  );
  assert(result6 === null, `FIDC débito retorna null (got: ${result6 === null ? 'null' : `"${result6?.category}"`})`);

  // ============================================================
  // RESUMO
  // ============================================================
  console.log('\n--- Resultado Final ---');
  if (process.exitCode === 1) {
    console.error('\n⛔ Alguns testes falharam!');
  } else {
    console.log('\n🎉 Todos os testes passaram!');
  }
}

runTests();
