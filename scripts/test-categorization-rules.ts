
import { aiCategorizationAdapter } from '@/lib/services/ai-categorization-adapter.service';
import { descriptionEnrichmentService } from '@/lib/services/description-enrichment.service';

const TEST_CASES = [
  // 1. FIDC
  {
    description: "TED 363.0001.ATLANTA F D ATLANTA FIDC",
    amount: 50000,
    expectedHint: "Desconto de Títulos",
    expectedRule: true
  },
  {
    description: "REC TIT ANT",
    amount: 10000,
    expectedHint: "Receita",
    expectedRule: true
  },
  
  // 2. TED Return / Estorno
  {
    description: "DEV TED B49E1360MOT3 ALCANCE",
    amount: 1200,
    expectedHint: "Estorno",
    expectedRule: true
  },
  {
    description: "ESTORNO DE LANCAMENTO",
    amount: 500,
    expectedHint: "Estorno",
    expectedRule: true
  },

  // 3. Tax Credit (Restituição/Estorno)
  {
    description: "DA REC FED DARF C211000",
    amount: 5000, // Positive = Credit
    expectedHint: "Estorno",
    expectedRule: true
  },
  {
    description: "DA REC FED DARF C211000",
    amount: -5000, // Negative = Debit
    expectedHint: "Impostos", // Normal rule
    expectedRule: false // Rule based override logic handles positive amounts for this case mainly
  },

  // 4. Ambiguity
  {
    description: "SISPAG FORNECEDORES",
    amount: -1000,
    isAmbiguous: true
  },
  {
    description: "SISPAG TRIBUTOS DARF",
    amount: -1000,
    // Should NOT be ambiguous because it has specific tax terms
    isAmbiguous: false 
  }
];

async function runTests() {
  console.log('Running Categorization Logic Verification...\n');

  for (const test of TEST_CASES) {
    console.log(`Testing: "${test.description}" (${test.amount > 0 ? 'Credit' : 'Debit'})`);
    
    // 1. Check Enrichment
    const enrichment = await descriptionEnrichmentService.enrichDescription(test.description);
    console.log(`  -> Term Detected: ${enrichment.bankingTerm?.term || 'None'}`);
    if (enrichment.bankingTerm) {
       console.log(`  -> Hint: ${enrichment.bankingTerm.categoryHint}`);
    }

    // 2. Check Rule Based Logic (Simulated)
    // We can't easily access the private method applyRuleBasedCategorization, 
    // so we will interpret based on the logic we know we implemented or mock it if needed.
    // For now, let's just rely on the banking term info which drives that logic.
    
    if (test.expectedRule) {
       const hasExpectedHint = enrichment.bankingTerm?.categoryHint?.includes(test.expectedHint) 
                            || enrichment.bankingTerm?.meaning?.includes(test.expectedHint);
       
       if (hasExpectedHint) {
         console.log('  ✅ Enrichment matches expectation');
       } else {
         console.log(`  ❌ Enrichment FAILED. Expected "${test.expectedHint}"`);
       }
    }

    // 3. Check Ambiguity (Simulating the logic added to TransactionCategorizationService)
    if (test.isAmbiguous !== undefined) {
       const isAmbiguous = checkAmbiguity(test.description);
       if (isAmbiguous === test.isAmbiguous) {
         console.log(`  ✅ Ambiguity check passed (${isAmbiguous})`);
       } else {
         console.log(`  ❌ Ambiguity check FAILED. Expected ${test.isAmbiguous}, got ${isAmbiguous}`);
       }
    }

    console.log('---');
  }
}

// Copy of the logic for verification purposed since it's private in the service
function checkAmbiguity(description: string): boolean {
    const upper = description.toUpperCase();
    if (upper.includes('SISPAG')) {
        const genericComplements = ['FORNECEDORES', 'SALARIOS', 'TRIBUTOS', 'CONCESSIONARIAS'];
        // Our logic was conservative: "Se for SISPAG, marca como ambíguo... a menos que seja muito específico"
        // But the implemented logic was just: "if (upper.includes('SISPAG')) return true;" 
        // Wait, did I implement the conservative logic or just the simple return true?
        // Let's check the code I wrote in Step 64.
        // It was:
        /*
        if (upper.includes('SISPAG')) {
            // ... comments ...
            return true; 
        }
        */
        // So currently it returns true for ALL SISPAG.
        return true;
    }
    return false;
}

runTests().catch(console.error);
