import * as XLSX from 'xlsx';
import * as fs from 'fs';

console.log('=== COMPARAÇÃO DETALHADA SAFRA ===\n');

const wb = XLSX.readFile('docs/examples/raw/extratos/Agosto Safra .xls');
const sheet4 = wb.Sheets['Sheet4'];
const data = XLSX.utils.sheet_to_json(sheet4, { defval: '' }) as any[];

const creditos = data.filter(r => r['Tipo do Lançamento'] === 'Crédito');
const debitos = data.filter(r => r['Tipo do Lançamento'] === 'Débito');
const saldos = data.filter(r => r['Tipo do Lançamento'] === 'Saldo');

console.log('EXCEL Safra Sheet4:');
console.log(`  Total linhas: ${data.length}`);
console.log(`  Créditos: ${creditos.length}`);
console.log(`  Débitos: ${debitos.length}`);
console.log(`  Saldos (filtrados): ${saldos.length}`);

// Verificar valores vazios
let creditosVazios = 0;
let debitosVazios = 0;

creditos.forEach(r => {
  const val = String(r['Valor'] || '').trim();
  if (val === '' || val === '= 0 ? \'#E42618\' : \'#000000\'}}\" size=\"2.5\" color=\"#000000\">') {
    creditosVazios++;
  }
});

debitos.forEach(r => {
  const val = String(r['Valor'] || '').trim();
  if (val === '' || val === '= 0 ? \'#E42618\' : \'#000000\'}}\" size=\"2.5\" color=\"#000000\">') {
    debitosVazios++;
  }
});

console.log(`\nValores vazios/inválidos:`);
console.log(`  Créditos: ${creditosVazios}`);
console.log(`  Débitos: ${debitosVazios}`);

const creditosValidos = creditos.length - creditosVazios;
const debitosValidos = debitos.length - debitosVazios;
const totalValidos = creditosValidos + debitosValidos;

console.log(`\nTransações válidas esperadas:`);
console.log(`  Créditos: ${creditosValidos}`);
console.log(`  Débitos: ${debitosValidos}`);
console.log(`  Total: ${totalValidos}`);

// Verificar OFX
const safraOfx = fs.readFileSync('Safra-Ago2023.ofx', 'utf-8');
const txCount = (safraOfx.match(/<STMTTRN>/g) || []).length;
const amounts = safraOfx.match(/<TRNAMT>(-?\d+\.\d{2})<\/TRNAMT>/g) || [];
const positiveAmounts = amounts.filter(a => a.includes('-') === false).length;
const negativeAmounts = amounts.filter(a => a.includes('-')).length;

console.log(`\nOFX gerado:`);
console.log(`  Total transações: ${txCount}`);
console.log(`  Créditos: ${positiveAmounts}`);
console.log(`  Débitos: ${negativeAmounts}`);

console.log(`\n${'='.repeat(50)}`);
if (txCount === totalValidos) {
  console.log('✅ SAFRA: Contagem CORRETA!');
} else {
  console.log(`⚠️  SAFRA: Diferença de ${Math.abs(txCount - totalValidos)} transações`);
  console.log(`   Esperado: ${totalValidos}, Obtido: ${txCount}`);
}

// Verificar outros bancos também
console.log(`\n${'='.repeat(50)}`);
console.log('=== RESUMO GERAL ===\n');

const files = [
  { name: 'Itaú', file: 'Itau-Ago2023.ofx', expected: 491 },
  { name: 'Safra', file: 'Safra-Ago2023.ofx', expected: totalValidos },
  { name: 'BB', file: 'BB-Ago2023.ofx', expected: 259 },
  { name: 'CEF', file: 'CEF-Ago2023.ofx', expected: 4 },
  { name: 'Santander', file: 'Santander-Ago2023.ofx', expected: 70 }
];

files.forEach(f => {
  const ofx = fs.readFileSync(f.file, 'utf-8');
  const count = (ofx.match(/<STMTTRN>/g) || []).length;
  const status = count > 0 ? '✅' : '❌';
  console.log(`${status} ${f.name}: ${count} transações`);
});
