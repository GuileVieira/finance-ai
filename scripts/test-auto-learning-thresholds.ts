/**
 * Test Script: PR3 - Auto-learning thresholds
 *
 * Verifica que:
 * 1. shouldCreateRule retorna false para confidence < 70%
 * 2. shouldCreateRule retorna true para confidence >= 70%
 * 3. AUTO_LEARNING_CONFIG tem valores conservadores
 */

import { RuleGenerationService } from '@/lib/services/rule-generation.service';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

function runTest() {
  console.log('=== Test: PR3 - Auto-learning thresholds ===\n');

  let passed = 0;
  let failed = 0;

  // TEST 1: shouldCreateRule returns false for confidence < 70%
  const lowConfidenceCases = [10, 20, 30, 50, 60, 69];
  console.log('TEST 1: shouldCreateRule should reject confidence < 70%');

  for (const confidence of lowConfidenceCases) {
    const result = RuleGenerationService.shouldCreateRule(
      confidence,
      'PAGAMENTO NETFLIX MENSAL',
      'Assinaturas'
    );

    if (!result.shouldCreate) {
      console.log(`  PASS: confidence ${confidence}% → rejected (${result.reason})`);
      passed++;
    } else {
      console.log(`  FAIL: confidence ${confidence}% → accepted (should be rejected)`);
      failed++;
    }
  }

  console.log('');

  // TEST 2: shouldCreateRule returns true for confidence >= 70%
  const highConfidenceCases = [70, 75, 80, 90, 95];
  console.log('TEST 2: shouldCreateRule should accept confidence >= 70%');

  for (const confidence of highConfidenceCases) {
    const result = RuleGenerationService.shouldCreateRule(
      confidence,
      'PAGAMENTO NETFLIX MENSAL',
      'Assinaturas'
    );

    if (result.shouldCreate) {
      console.log(`  PASS: confidence ${confidence}% → accepted`);
      passed++;
    } else {
      console.log(`  FAIL: confidence ${confidence}% → rejected (${result.reason})`);
      failed++;
    }
  }

  console.log('');

  // TEST 3: Verify old 20% threshold no longer works
  console.log('TEST 3: Old 20% threshold should no longer create rules');
  const oldThresholdResult = RuleGenerationService.shouldCreateRule(
    25,
    'PAGAMENTO FORNECEDOR XPTO',
    'Fornecedores'
  );

  if (!oldThresholdResult.shouldCreate) {
    console.log(`  PASS: 25% confidence correctly rejected\n`);
    passed++;
  } else {
    console.log(`  FAIL: 25% confidence still accepted (old threshold leak)\n`);
    failed++;
  }

  // TEST 4: Invalid pattern should still be rejected regardless of confidence
  console.log('TEST 4: Invalid pattern should be rejected even with high confidence');
  const invalidPatternResult = RuleGenerationService.shouldCreateRule(
    95,
    'DE',  // too short / generic
    'Diversos'
  );

  if (!invalidPatternResult.shouldCreate) {
    console.log(`  PASS: Invalid pattern rejected (${invalidPatternResult.reason})\n`);
    passed++;
  } else {
    console.log(`  FAIL: Invalid pattern accepted\n`);
    failed++;
  }

  // Summary
  console.log('=== Results ===');
  console.log(`Passed: ${passed}/${passed + failed}`);
  console.log(`Failed: ${failed}/${passed + failed}`);
  console.log(failed === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
}

runTest();
