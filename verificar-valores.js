// Script para verificar os valores do OFX
const fs = require('fs');
const path = require('path');

// Importar o service
const { OFXParserService } = require('./lib/services/ofx-parser.service.ts');

async function verificarValores() {
  console.log('🔍 Verificando valores do OFX...');

  try {
    const ofxParser = new OFXParserService();

    // Ler o arquivo OFX
    const ofxPath = path.join(__dirname, 'Extrato-01-06-2025-a-30-09-2025-OFX.ofx');
    const ofxData = fs.readFileSync(ofxPath, 'utf8');

    // Parse do OFX
    const parsed = await ofxParser.parseFromString(ofxData);
    const analysis = ofxParser.analyzeOFXData(parsed);

    console.log('\n📊 Análise Detalhada:');
    console.log('='.repeat(50));
    console.log(`Total de transações: ${analysis.totalTransactions}`);
    console.log(`Créditos: ${analysis.credits.length}`);
    console.log(`Débitos: ${analysis.debits.length}`);
    console.log(`Total em créditos: R$${analysis.totalCredits.toFixed(2)}`);
    console.log(`Total em débitos: R$${analysis.totalDebits.toFixed(2)}`);
    console.log(`Saldo líquido: R$${analysis.netBalance.toFixed(2)}`);

    // Calcular média por transação
    const mediaCalculada = analysis.totalTransactions > 0
      ? analysis.netBalance / analysis.totalTransactions
      : 0;

    console.log(`\n📈 Verificação da Média:`);
    console.log(`Cálculo: (${analysis.totalCredits.toFixed(2)} - ${analysis.totalDebits.toFixed(2)}) ÷ ${analysis.totalTransactions}`);
    console.log(`Cálculo: (${analysis.netBalance.toFixed(2)}) ÷ ${analysis.totalTransactions}`);
    console.log(`Média calculada: R$${mediaCalculada.toFixed(2)}`);
    console.log(`Média do sistema: R$${analysis.averageTransaction.toFixed(2)}`);

    // Verificar se os valores batem
    const valoresBatem = Math.abs(mediaCalculada - analysis.averageTransaction) < 0.01;
    console.log(`\n✅ Valores batem? ${valoresBatem ? 'SIM' : 'NÃO'}`);

    if (!valoresBatem) {
      console.log(`⚠️ Diferença: R$${Math.abs(mediaCalculada - analysis.averageTransaction).toFixed(2)}`);
    }

    // Análise adicional por transação
    console.log('\n📋 Detalhes por Tipo:');
    console.log('='.repeat(50));

    const creditoTotal = analysis.credits.reduce((sum, t) => sum + t.amount, 0);
    const debitoTotal = Math.abs(analysis.debits.reduce((sum, t) => sum + t.amount, 0));

    console.log(`Soma dos créditos (verificação): R$${creditoTotal.toFixed(2)}`);
    console.log(`Soma dos débitos (verificação): R$${debitoTotal.toFixed(2)}`);

    // Média por tipo
    const mediaCreditos = analysis.credits.length > 0 ? creditoTotal / analysis.credits.length : 0;
    const mediaDebitos = analysis.debits.length > 0 ? debitoTotal / analysis.debits.length : 0;

    console.log(`Média por crédito: R$${mediaCreditos.toFixed(2)}`);
    console.log(`Média por débito: R$${mediaDebitos.toFixed(2)}`);

    console.log('\n🎯 Conclusão:');
    if (valoresBatem) {
      console.log('✅ Todos os valores estão corretos!');
    } else {
      console.log('❌ Há discrepâncias nos valores.');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

verificarValores();