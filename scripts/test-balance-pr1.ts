/**
 * Test script for PR1: openingBalance calculation from LEDGERBAL
 *
 * Validates:
 * 1. Formula: openingBalance = LEDGERBAL - sum(transactions)
 * 2. No LEDGERBAL → openingBalance = 0
 * 3. Edge cases (negative balance, zero transactions sum, etc.)
 *
 * Run: pnpm tsx scripts/test-balance-pr1.ts
 */

interface TestCase {
  name: string;
  ledgerBalance: number | null;
  transactions: number[];
  expectedOpeningBalance: string;
}

const testCases: TestCase[] = [
  {
    name: 'LEDGERBAL positivo com transações mistas',
    ledgerBalance: 5000.00,
    transactions: [1000, -500, 200, -300],
    // sum = 400, opening = 5000 - 400 = 4600
    expectedOpeningBalance: '4600.00',
  },
  {
    name: 'LEDGERBAL negativo (saldo devedor)',
    ledgerBalance: -1500.00,
    transactions: [-2000, -1000, 500],
    // sum = -2500, opening = -1500 - (-2500) = 1000
    expectedOpeningBalance: '1000.00',
  },
  {
    name: 'LEDGERBAL com soma de transações zero',
    ledgerBalance: 3000.00,
    transactions: [500, -500],
    // sum = 0, opening = 3000 - 0 = 3000
    expectedOpeningBalance: '3000.00',
  },
  {
    name: 'Sem LEDGERBAL → opening balance = 0',
    ledgerBalance: null,
    transactions: [1000, -500],
    expectedOpeningBalance: '0',
  },
  {
    name: 'LEDGERBAL = 0 → opening balance = 0 (tratado como ausente)',
    ledgerBalance: 0,
    transactions: [1000, -500],
    expectedOpeningBalance: '0',
  },
  {
    name: 'LEDGERBAL com muitas transações (precisão decimal)',
    ledgerBalance: 12345.67,
    transactions: [100.50, -200.30, 50.10, -75.25, 300.00],
    // sum = 175.05, opening = 12345.67 - 175.05 = 12170.62
    expectedOpeningBalance: '12170.62',
  },
  {
    name: 'Apenas débitos (todas transações negativas)',
    ledgerBalance: 1000.00,
    transactions: [-100, -200, -300],
    // sum = -600, opening = 1000 - (-600) = 1600
    expectedOpeningBalance: '1600.00',
  },
  {
    name: 'Apenas créditos (todas transações positivas)',
    ledgerBalance: 5000.00,
    transactions: [1000, 2000, 500],
    // sum = 3500, opening = 5000 - 3500 = 1500
    expectedOpeningBalance: '1500.00',
  },
];

function calculateOpeningBalance(
  ledgerBalance: number | null,
  transactions: number[]
): string {
  const hasLedgerBalance = ledgerBalance !== null && ledgerBalance !== 0;

  if (!hasLedgerBalance) {
    return '0';
  }

  const transactionSum = transactions.reduce((sum, tx) => sum + tx, 0);
  return (ledgerBalance - transactionSum).toFixed(2);
}

let passed = 0;
let failed = 0;

console.log('=== Teste PR1: Cálculo de openingBalance a partir do LEDGERBAL ===\n');

for (const tc of testCases) {
  const result = calculateOpeningBalance(tc.ledgerBalance, tc.transactions);
  const ok = result === tc.expectedOpeningBalance;

  if (ok) {
    console.log(`  [PASS] ${tc.name}`);
    passed++;
  } else {
    console.log(`  [FAIL] ${tc.name}`);
    console.log(`         Esperado: ${tc.expectedOpeningBalance}`);
    console.log(`         Obtido:   ${result}`);
    failed++;
  }
}

console.log(`\n=== Resultado: ${passed} passed, ${failed} failed ===`);

if (failed > 0) {
  process.exit(1);
}
