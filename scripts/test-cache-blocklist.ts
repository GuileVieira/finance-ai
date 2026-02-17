/**
 * Test: PR1 — Cache Blocklist (SISPAG e genéricos)
 *
 * Verifica que termos genéricos nunca são salvos ou lidos do cache,
 * enquanto descrições específicas continuam funcionando normalmente.
 *
 * Uso: npx tsx scripts/test-cache-blocklist.ts
 */

import categoryCacheService from '@/lib/services/category-cache.service';

const COMPANY_ID = 'test-company-blocklist';

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`✅ ${label}`);
  } else {
    console.error(`❌ FALHOU: ${label}`);
    process.exitCode = 1;
  }
}

function runTests() {
  console.log('--- PR1: Cache Blocklist Tests ---\n');

  // Limpar cache antes dos testes
  categoryCacheService.clear();

  // ============================================================
  // TESTE 1: addToCache NÃO deve salvar termos genéricos
  // ============================================================
  console.log('>> Teste 1: addToCache bloqueia termos genéricos');

  categoryCacheService.addToCache(
    'SISPAG FORNECEDORES 123456789',
    'cat-001', 'Matéria Prima', COMPANY_ID, 0.95
  );
  const afterSispag = categoryCacheService.getStats();
  assert(afterSispag.totalEntries === 0, 'SISPAG FORNECEDORES não foi cacheado');

  categoryCacheService.addToCache(
    'PAGAMENTO',
    'cat-002', 'Fornecedores', COMPANY_ID, 0.90
  );
  assert(categoryCacheService.getStats().totalEntries === 0, 'PAGAMENTO não foi cacheado');

  categoryCacheService.addToCache(
    'PIX ENVIADO',
    'cat-003', 'Transferências', COMPANY_ID, 0.92
  );
  assert(categoryCacheService.getStats().totalEntries === 0, 'PIX ENVIADO não foi cacheado');

  categoryCacheService.addToCache(
    'TED ENVIADA',
    'cat-004', 'Transferências', COMPANY_ID, 0.88
  );
  assert(categoryCacheService.getStats().totalEntries === 0, 'TED ENVIADA não foi cacheado');

  categoryCacheService.addToCache(
    'TRANSF',
    'cat-005', 'Transferências', COMPANY_ID, 0.85
  );
  assert(categoryCacheService.getStats().totalEntries === 0, 'TRANSF não foi cacheado');

  // ============================================================
  // TESTE 2: findInCache retorna null para termos genéricos
  // ============================================================
  console.log('\n>> Teste 2: findInCache bloqueia termos genéricos');

  const sispagResult = categoryCacheService.findInCache('SISPAG FORNECEDORES 999', COMPANY_ID);
  assert(sispagResult === null, 'findInCache retorna null para SISPAG FORNECEDORES');

  const pagResult = categoryCacheService.findInCache('PAGAMENTO', COMPANY_ID);
  assert(pagResult === null, 'findInCache retorna null para PAGAMENTO');

  const pixResult = categoryCacheService.findInCache('PIX RECEBIDO', COMPANY_ID);
  assert(pixResult === null, 'findInCache retorna null para PIX RECEBIDO');

  // ============================================================
  // TESTE 3: Descrições ESPECÍFICAS continuam funcionando
  // ============================================================
  console.log('\n>> Teste 3: Descrições específicas NÃO são bloqueadas');

  categoryCacheService.addToCache(
    'PAGAMENTO ALUGUEL EMPRESA XYZ LTDA',
    'cat-010', 'Aluguel', COMPANY_ID, 0.95
  );
  assert(categoryCacheService.getStats().totalEntries === 1, 'PAGAMENTO ALUGUEL EMPRESA XYZ foi cacheado (específico)');

  const aluguelResult = categoryCacheService.findInCache('PAGAMENTO ALUGUEL EMPRESA XYZ LTDA', COMPANY_ID);
  assert(aluguelResult !== null, 'findInCache encontra PAGAMENTO ALUGUEL EMPRESA XYZ');
  assert(aluguelResult?.categoryName === 'Aluguel', 'Categoria correta: Aluguel');

  categoryCacheService.addToCache(
    'ENERGIA ELETRICA CEMIG',
    'cat-011', 'Energia', COMPANY_ID, 0.90
  );
  assert(categoryCacheService.getStats().totalEntries === 2, 'ENERGIA ELETRICA CEMIG foi cacheado');

  const energiaResult = categoryCacheService.findInCache('ENERGIA ELETRICA CEMIG', COMPANY_ID);
  assert(energiaResult !== null, 'findInCache encontra ENERGIA ELETRICA');
  assert(energiaResult?.categoryName === 'Energia', 'Categoria correta: Energia');

  // ============================================================
  // TESTE 4: Isolamento multi-tenant mantido
  // ============================================================
  console.log('\n>> Teste 4: Isolamento multi-tenant');

  const otherCompanyResult = categoryCacheService.findInCache('ENERGIA ELETRICA CEMIG', 'other-company');
  assert(otherCompanyResult === null, 'Cache isolado por empresa (outra empresa não vê)');

  // ============================================================
  // RESUMO
  // ============================================================
  console.log('\n--- Resultado Final ---');
  categoryCacheService.logStats();

  if (process.exitCode === 1) {
    console.error('\n⛔ Alguns testes falharam!');
  } else {
    console.log('\n🎉 Todos os testes passaram!');
  }

  // Cleanup
  categoryCacheService.clear();
}

runTests();
