
import { MovementTypeService } from '@/lib/services/movement-type.service';
import { CategorizationValidators } from '@/lib/services/categorization-validators';
import { TransactionContext } from '@/lib/services/rule-scoring.service';

const testCases = [
  {
    desc: 'Transferência Interna',
    context: { description: 'TRANSFERENCIA ENTRE CONTAS', amount: -1000, date: new Date() },
    expectedType: 'transferencia_interna'
  },
  {
    desc: 'Empréstimo (Entrada)',
    context: { description: 'CONTRATO EMPRESTIMO BB', amount: 50000, date: new Date() },
    expectedType: 'financeiro' // ou nao_operacional, definimos financeiro
  },
  {
    desc: 'Antecipação (Entrada)',
    context: { description: 'ANTECIPACAO DE RECEBIVEIS', amount: 4800, date: new Date() },
    expectedType: 'financeiro'
  },
  {
    desc: 'Pagamento Fornecedor (Custo Direto)',
    context: { description: 'PGTO FORNECEDOR ABC', amount: -500, date: new Date() },
    expectedType: 'custo_direto'
  },
  {
    desc: 'Receita Operacional',
    context: { description: 'RECEBIMENTO CLIENTE X', amount: 1000, date: new Date() },
    expectedType: 'operacional_receita'
  },
  {
    desc: 'Tarifa Bancária (Financeiro)',
    context: { description: 'TARIFA BANCARIA CESTA', amount: -50, date: new Date() },
    expectedType: 'financeiro'
  }
];

async function runTests() {
  console.log('--- Testing MovementTypeService ---');
  let errors = 0;

  for (const test of testCases) {
    const type = MovementTypeService.classify(test.context as TransactionContext);
    const passed = type === test.expectedType;
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${test.desc}: Got '${type}', Expected '${test.expectedType}'`);
    if (!passed) errors++;
  }

  console.log('\n--- Testing CategorizationValidators ---');
  
  // Test Validator: Expensive positive
  const ctxExpensePos: any = { description: 'TEST', amount: 100 };
  const resExpensePos: any = { movementType: 'operacional_receita' };
  const catExpense: any = { type: 'variable_cost' }; // Cost should not be positive unless deduction
  
  const val1 = CategorizationValidators.validate(ctxExpensePos, resExpensePos, catExpense);
  console.log(`[${!val1.isValid ? 'PASS' : 'FAIL'}] Positive Expense blocked: ${val1.isValid ? 'Allowed (Bad)' : 'Blocked (Good)'} - Reason: ${val1.reason}`);

  // Test Validator: Expected Allowed
  const ctxRevenue: any = { description: 'Venda', amount: 100 };
  const resRevenue: any = { movementType: 'operacional_receita' };
  const catRevenue: any = { type: 'revenue' };
  
  const val2 = CategorizationValidators.validate(ctxRevenue, resRevenue, catRevenue);
  console.log(`[${val2.isValid ? 'PASS' : 'FAIL'}] Revenue Positive allowed: ${val2.isValid}`);

  // Test Validator: Wrong Type for Movement
  // Movement: transferencia_interna, Category Type: expense (Should be transfer or internal)
  const ctxTransf: any = { description: 'Transf', amount: -100 };
  const resTransf: any = { movementType: 'transferencia_interna' };
  const catTransfWrong: any = { type: 'expense' };
  
  const val3 = CategorizationValidators.validate(ctxTransf, resTransf, catTransfWrong);
  console.log(`[${!val3.isValid ? 'PASS' : 'FAIL'}] Transfer with Expense Category blocked: ${val3.isValid ? 'Allowed (Bad)' : 'Blocked (Good)'} - Reason: ${val3.reason}`);

  if (errors > 0 || val1.isValid || !val2.isValid || val3.isValid) {
    console.error('\nTests Failed!');
    process.exit(1);
  } else {
    console.log('\nAll Tests Passed!');
  }
}

runTests();
