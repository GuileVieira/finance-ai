/**
 * Script de teste para o serviço de enriquecimento de descrições
 *
 * Uso: pnpm tsx scripts/test-enrichment.ts
 */

import { descriptionEnrichmentService } from '@/lib/services/description-enrichment.service';

const TEST_DESCRIPTIONS = [
  { description: 'SISPAG FORNECEDORES', memo: 'Pix: EMPRESA XYZ LTDA' },
  { description: 'SISPAG TRIBUTOS', memo: null },
  { description: 'TEV RECEBIMENTO', memo: null },
  { description: 'TED PAGAMENTO ALUGUEL', memo: null },
  { description: 'PIX NETFLIX', memo: null },
  { description: 'DEB AUT ENERGIA', memo: 'CEMIG' },
  { description: 'COMISSÕES VENDAS', memo: null },
  { description: 'IOF COMPRA INTERNACIONAL', memo: null },
  { description: 'TARIFA MANUTENCAO CONTA', memo: null },
  { description: 'RESGATE CDB', memo: null },
  { description: 'RENDIMENTO APLICACAO', memo: null },
  { description: 'PAGAMENTO BOLETO', memo: 'ALUGUEL ESCRITORIO' },
];

async function main() {
  console.log('🧪 Teste do Serviço de Enriquecimento de Descrições');
  console.log('====================================================\n');

  for (const test of TEST_DESCRIPTIONS) {
    console.log(`\n📝 Descrição: "${test.description}"`);
    if (test.memo) {
      console.log(`   Memo: "${test.memo}"`);
    }

    try {
      const result = await descriptionEnrichmentService.enrichDescription(
        test.description,
        test.memo || undefined
      );

      console.log(`\n   ✅ Resultado:`);
      console.log(`   - Normalizado: ${result.normalized}`);

      if (result.bankingTerm) {
        console.log(`   - Termo bancário: ${result.bankingTerm.term}`);
        console.log(`   - Banco: ${result.bankingTerm.bank || 'N/A'}`);
        console.log(`   - Significado: ${result.bankingTerm.meaning}`);
        if (result.bankingTerm.categoryHint) {
          console.log(`   - Dica de categoria: ${result.bankingTerm.categoryHint}`);
        }
      }

      if (result.complement) {
        console.log(`   - Complemento: ${result.complement}`);
      }

      if (result.webSearchResult) {
        console.log(`   - Pesquisa web: ${result.webSearchResult.substring(0, 100)}...`);
      }

      console.log(`   - Confiança: ${(result.confidence * 100).toFixed(0)}%`);
      console.log(`\n   📋 Contexto enriquecido:`);
      console.log(`   ${result.enrichedContext.split('\n').join('\n   ')}`);

    } catch (error) {
      console.log(`   ❌ Erro: ${error}`);
    }

    console.log('\n   ' + '─'.repeat(50));
  }

  console.log('\n\n✅ Teste finalizado!');
}

main().catch(console.error);
