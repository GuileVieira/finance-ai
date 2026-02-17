/**
 * Test: PR3 — Validação Contábil Reforçada (Sinal × Tipo + dreGroup)
 *
 * Testa diretamente o CategorizationValidators.validate() sem precisar de DB.
 * Verifica que violações contábeis são bloqueadas e ESTORNO é aceito como exceção.
 *
 * Uso: npx tsx scripts/test-accounting-validation.ts
 */

import { CategorizationValidators } from '@/lib/services/categorization-validators';
import type { CategorizationResult } from '@/lib/services/transaction-categorization.service';

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`✅ ${label}`);
  } else {
    console.error(`❌ FALHOU: ${label}`);
    process.exitCode = 1;
  }
}

// Helper para criar contexto mínimo
function makeContext(description: string, amount: number) {
  return { description, amount, date: new Date() };
}

// Helper para criar resultado mínimo (sem movementType explícito)
function makeResult(overrides: Partial<CategorizationResult> = {}): CategorizationResult {
  return {
    categoryId: 'cat-test',
    categoryName: 'Test Category',
    confidence: 90,
    source: 'ai',
    ...overrides,
  };
}

function runTests() {
  console.log('--- PR3: Accounting Validation Tests ---\n');

  // ============================================================
  // TESTE 1: Crédito (+) → Categoria Despesa (type=fixed_cost) → BLOQUEADO
  // ============================================================
  console.log('>> Teste 1: Crédito → Despesa (via type) → deve bloquear');

  const r1 = CategorizationValidators.validate(
    makeContext('PIX RECEBIDO EMPRESA XYZ', 1000),
    makeResult(),
    { type: 'fixed_cost', dreGroup: 'CF' }
  );
  assert(!r1.isValid, 'Crédito + Despesa (type) = inválido');
  assert(r1.reason?.includes('Erro Contábil'), `Mensagem contém "Erro Contábil" (got: "${r1.reason}")`);

  // ============================================================
  // TESTE 2: Débito (-) → Categoria Receita (type=revenue) → BLOQUEADO
  // ============================================================
  console.log('\n>> Teste 2: Débito → Receita (via type) → deve bloquear');

  const r2 = CategorizationValidators.validate(
    makeContext('PAGAMENTO FORNECEDOR ABC', -500),
    makeResult(),
    { type: 'revenue', dreGroup: 'RoB' }
  );
  assert(!r2.isValid, 'Débito + Receita (type) = inválido');

  // ============================================================
  // TESTE 3: Crédito (+) → dreGroup=CF (Custo Fixo) → BLOQUEADO via dreGroup
  // ============================================================
  console.log('\n>> Teste 3: Crédito → dreGroup CF → deve bloquear (via dreGroup)');

  const r3 = CategorizationValidators.validate(
    makeContext('TED RECEBIDA EMPRESA', 5000),
    makeResult(),
    { type: 'other', dreGroup: 'CF' } // type não é expense, mas dreGroup é CF
  );
  assert(!r3.isValid, 'Crédito + dreGroup CF = inválido');
  assert(r3.reason?.includes('dreGroup=CF'), `Mensagem menciona dreGroup CF (got: "${r3.reason}")`);

  // ============================================================
  // TESTE 4: Débito (-) → dreGroup=RoB (Receita) → BLOQUEADO via dreGroup
  // ============================================================
  console.log('\n>> Teste 4: Débito → dreGroup RoB → deve bloquear (via dreGroup)');

  const r4 = CategorizationValidators.validate(
    makeContext('SISPAG FORNECEDORES 12345', -2000),
    makeResult(),
    { type: 'other', dreGroup: 'RoB' } // type ok, mas dreGroup é Receita
  );
  assert(!r4.isValid, 'Débito + dreGroup RoB = inválido');
  assert(r4.reason?.includes('dreGroup=RoB'), `Mensagem menciona dreGroup RoB (got: "${r4.reason}")`);

  // ============================================================
  // TESTE 5: Crédito (+) → dreGroup=CV (Custo Variável) → BLOQUEADO via dreGroup
  // ============================================================
  console.log('\n>> Teste 5: Crédito → dreGroup CV → deve bloquear');

  const r5 = CategorizationValidators.validate(
    makeContext('DEPOSITO CLIENTES', 3000),
    makeResult(),
    { type: 'other', dreGroup: 'CV' }
  );
  assert(!r5.isValid, 'Crédito + dreGroup CV = inválido');

  // ============================================================
  // TESTE 6: Crédito (+) → dreGroup=DNOP → BLOQUEADO via dreGroup
  // ============================================================
  console.log('\n>> Teste 6: Crédito → dreGroup DNOP → deve bloquear');

  const r6 = CategorizationValidators.validate(
    makeContext('TED RECEBIDA', 10000),
    makeResult(),
    { type: 'other', dreGroup: 'DNOP' }
  );
  assert(!r6.isValid, 'Crédito + dreGroup DNOP = inválido');

  // ============================================================
  // TESTE 7: 🎯 ESTORNO — Crédito (+) → Despesa → aceito (exceção)
  // ============================================================
  console.log('\n>> Teste 7: 🎯 ESTORNO de despesa (crédito + despesa) → deve ACEITAR');

  const r7 = CategorizationValidators.validate(
    makeContext('ESTORNO TARIFA BANCARIA', 45.90),
    makeResult(),
    { type: 'fixed_cost', dreGroup: 'CF' }
  );
  assert(r7.isValid, 'ESTORNO + Crédito + Despesa = válido (exceção)');

  // ============================================================
  // TESTE 8: 🎯 DEVOLUCAO — Débito (-) → Receita → aceito (exceção)
  // ============================================================
  console.log('\n>> Teste 8: 🎯 DEVOLUÇÃO (débito + receita) → deve ACEITAR');

  const r8 = CategorizationValidators.validate(
    makeContext('DEVOLUCAO VENDA PRODUTO', -200),
    makeResult(),
    { type: 'revenue', dreGroup: 'RoB' }
  );
  assert(r8.isValid, 'DEVOLUCAO + Débito + Receita = válido (exceção)');

  // ============================================================
  // TESTE 9: 🎯 RESTITUICAO — Crédito → Despesa → aceito (exceção)
  // ============================================================
  console.log('\n>> Teste 9: 🎯 RESTITUIÇÃO (crédito + despesa) → deve ACEITAR');

  const r9 = CategorizationValidators.validate(
    makeContext('RESTITUICAO IMPOSTO RENDA', 1500),
    makeResult(),
    { type: 'tax', dreGroup: 'CF' }
  );
  assert(r9.isValid, 'RESTITUICAO + Crédito + Tax = válido (exceção)');

  // ============================================================
  // TESTE 10: Transação normal válida — Débito (-) → Despesa → OK
  // ============================================================
  console.log('\n>> Teste 10: Transação normal (débito → despesa) → deve ACEITAR');

  const r10 = CategorizationValidators.validate(
    makeContext('PAGAMENTO ENERGIA ELETRICA', -350),
    makeResult(),
    { type: 'fixed_cost', dreGroup: 'CF' }
  );
  assert(r10.isValid, 'Débito + Despesa = válido');

  // ============================================================
  // TESTE 11: Transação normal válida — Crédito (+) → Receita → OK
  // ============================================================
  console.log('\n>> Teste 11: Transação normal (crédito → receita) → deve ACEITAR');

  const r11 = CategorizationValidators.validate(
    makeContext('VENDA LOJA ONLINE', 2500),
    makeResult(),
    { type: 'revenue', dreGroup: 'RoB' }
  );
  assert(r11.isValid, 'Crédito + Receita = válido');

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
