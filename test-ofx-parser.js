// Script simples para testar o parser OFX
const fs = require('fs');
const path = require('path');

// Importar o service (precisa adaptar para CommonJS se necessário)
const { OFXParserService } = require('./lib/services/ofx-parser.service.ts');

async function testOFXParser() {
  console.log('🔍 Testando Parser OFX...');

  try {
    // Criar instância do parser
    const ofxParser = new OFXParserService();

    // Ler o arquivo OFX real
    const ofxPath = path.join(__dirname, 'Extrato-01-06-2025-a-30-09-2025-OFX.ofx');
    console.log('📂 Lendo arquivo:', ofxPath);

    const ofxData = fs.readFileSync(ofxPath, 'utf8');
    console.log('📊 Tamanho do arquivo:', ofxData.length, 'caracteres');

    // Mostrar primeiras linhas do arquivo
    const firstLines = ofxData.split('\n').slice(0, 10).join('\n');
    console.log('\n📋 Primeiras linhas do OFX:');
    console.log(firstLines);

    // Parse do OFX
    console.log('\n⚙️ Processando OFX...');
    const parsed = await ofxParser.parseFromString(ofxData);

    console.log('\n✅ Parse realizado com sucesso!');
    console.log('📋 Tipo de extrato:', parsed.type);
    console.log('🏦 Banco:', parsed.accountInfo.bankId);
    console.log('📄 Conta:', parsed.accountInfo.accountId);
    console.log('💰 Moeda:', parsed.accountInfo.currency);
    console.log('📅 Período:', parsed.period.startDate.toISOString(), 'a', parsed.period.endDate.toISOString());
    console.log('💸 Saldo final:', parsed.balance.amount);

    console.log('\n📊 Análise das Transações:');
    const analysis = ofxParser.analyzeOFXData(parsed);
    console.log('Total de transações:', analysis.totalTransactions);
    console.log('Créditos:', analysis.credits.length);
    console.log('Débitos:', analysis.debits.length);
    console.log('Total em créditos:', analysis.totalCredits);
    console.log('Total em débitos:', analysis.totalDebits);
    console.log('Saldo líquido:', analysis.netBalance);

    console.log('\n🏆 Top 5 Destinos:');
    analysis.frequentDestinations.slice(0, 5).forEach((dest, i) => {
      console.log(`${i + 1}. ${dest.name} (${dest.count} transações)`);
    });

    console.log('\n📋 Exemplo de Transações:');
    parsed.transactions.slice(0, 5).forEach((tx, i) => {
      console.log(`${i + 1}. ${tx.date.toISOString().split('T')[0]} - ${tx.description} - ${tx.type === 'credit' ? '+' : ''}R$${tx.amount.toFixed(2)}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
  }
}

// Executar o teste
testOFXParser();