
import { CategorizationValidators } from '@/lib/services/categorization-validators';
import { TransactionContext } from '@/lib/services/rule-scoring.service';
import { CategorizationResult } from '@/lib/services/transaction-categorization.service';

async function runTest() {
  console.log('--- Testing PR3: Aligned Validators (DRE Groups) ---');

  const context: TransactionContext = {
    description: 'TRANSFERENCIA ENTRE CONTAS',
    amount: -500.00,
    memo: ''
  };

  // Case 1: Transferencia Interna mapping to CF (Fixed Cost) - SHOULD FAIL
  console.log('Case 1: Transferência em Grupo Operacional (CF)');
  const res1 = CategorizationValidators.validate(
    context,
    { movementType: 'transferencia_interna' } as any,
    { type: 'transfer', dreGroup: 'CF' }
  );
  
  if (res1.isValid === false) {
    console.log('✅ Correctly blocked: ' + res1.reason);
  } else {
    console.error('❌ Failed: Should have blocked Transfer -> CF');
    process.exit(1);
  }

  // Case 2: Investimento mapping to RoB - SHOULD FAIL
  console.log('Case 2: Investimento em RoB');
  const res2 = CategorizationValidators.validate(
    context,
    { movementType: 'investimento' } as any,
    { type: 'equity', dreGroup: 'RoB' }
  );

  if (res2.isValid === false) {
    console.log('✅ Correctly blocked: ' + res2.reason);
  } else {
    console.error('❌ Failed: Should have blocked Investimento -> RoB');
    process.exit(1);
  }

  // Case 3: Proper movement mapping
  console.log('Case 3: Custo Direto em MP (Materiais/CMV)');
  const res3 = CategorizationValidators.validate(
    context,
    { movementType: 'custo_direto' } as any,
    { type: 'variable_cost', dreGroup: 'MP' }
  );

  if (res3.isValid === true) {
    console.log('✅ Properly allowed');
  } else {
    console.error('❌ Failed: Should have allowed Custo Direto -> MP');
    process.exit(1);
  }

  console.log('--- Aligned Validators Test Complete ---');
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
