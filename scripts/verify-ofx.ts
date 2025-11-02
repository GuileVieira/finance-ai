import * as fs from 'fs';
import * as XLSX from 'xlsx';

console.log('=== VERIFICAÇÃO DE DATAS E VALORES ===\n');

// Verificar arquivo BB PIX (o mais complexo - datas em português)
const bbOfx = fs.readFileSync('BB-Ago2023.ofx', 'utf-8');

// Extrair algumas datas do OFX
const dateMatches = bbOfx.match(/<DTPOSTED>(\d{8})<\/DTPOSTED>/g) || [];
const dates = dateMatches.slice(0, 5).map(m => m.match(/(\d{8})/)![1]);

console.log('Primeiras 5 datas no BB OFX:');
dates.forEach(d => {
  const year = d.substring(0, 4);
  const month = d.substring(4, 6);
  const day = d.substring(6, 8);
  console.log(`  ${d} = ${day}/${month}/${year}`);
});

// Verificar se todas as datas são de 2023-08
const allDates = bbOfx.match(/<DTPOSTED>(\d{8})<\/DTPOSTED>/g) || [];
const invalidDates = allDates.filter(d => {
  const dateStr = d.match(/(\d{8})/)![1];
  return dateStr.substring(0, 6) !== '202308';
});

console.log(`\nTotal de datas: ${allDates.length}`);
console.log(`Datas fora de agosto/2023: ${invalidDates.length}`);
if (invalidDates.length > 0) {
  console.log('Datas inválidas encontradas:');
  invalidDates.forEach(d => console.log(`  ${d}`));
}

// Verificar valores negativos e positivos
const amounts = bbOfx.match(/<TRNAMT>(-?\d+\.\d{2})<\/TRNAMT>/g) || [];
const positiveAmounts = amounts.filter(a => !a.includes('-')).length;
const negativeAmounts = amounts.filter(a => a.includes('-')).length;

console.log(`\nValores positivos (créditos): ${positiveAmounts}`);
console.log(`Valores negativos (débitos): ${negativeAmounts}`);

// Verificar Safra (tinha HTML)
console.log('\n=== SAFRA (tinha HTML tags) ===');
const safraOfx = fs.readFileSync('Safra-Ago2023.ofx', 'utf-8');
const safraAmounts = safraOfx.match(/<TRNAMT>(-?\d+\.\d{2})<\/TRNAMT>/g) || [];
console.log('Primeiros 5 valores do Safra:');
safraAmounts.slice(0, 5).forEach(a => console.log(`  ${a}`));

// Verificar se ainda tem HTML no OFX
const hasHTML = safraOfx.includes('<font') || safraOfx.includes('color=');
console.log(`HTML tags ainda presentes: ${hasHTML}`);

// Comparar totais Excel vs OFX do Safra
console.log('\n=== COMPARAÇÃO SAFRA: Excel vs OFX ===');
const safraExcel = XLSX.readFile('docs/examples/raw/extratos/Agosto Safra .xls');
const sheet4 = safraExcel.Sheets['Sheet4'];
const data = XLSX.utils.sheet_to_json(sheet4, { defval: '' }) as any[];

const creditosExcel = data.filter(r => r['Tipo do Lançamento'] === 'Crédito').length;
const debitosExcel = data.filter(r => r['Tipo do Lançamento'] === 'Débito').length;

console.log(`Excel - Créditos: ${creditosExcel}, Débitos: ${debitosExcel}`);
console.log(`OFX - Créditos: ${positiveAmounts}, Débitos: ${negativeAmounts} (do Safra)`);

// Verificar uma transação específica do BB PIX
console.log('\n=== VERIFICAÇÃO BB PIX ===');
const bbPixExcel = XLSX.readFile('docs/examples/raw/extratos/MovimentaçãoPixBB ago23.xls');
const pixSheet = bbPixExcel.Sheets[bbPixExcel.SheetNames[0]];
const pixData = XLSX.utils.sheet_to_json(pixSheet, { defval: '' }) as any[];

console.log(`Total transações PIX no Excel: ${pixData.length}`);
console.log('Primeira transação PIX:');
const firstPix = pixData[0];
console.log(`  Data: ${firstPix['dataEHora']}`);
console.log(`  Valor: ${firstPix['valor']}`);
console.log(`  Destinatário: ${firstPix['origemDestinatario']}`);

// Procurar essa transação no OFX
const hasFirstPix = bbOfx.includes(firstPix['origemDestinatario']);
console.log(`  Encontrada no OFX: ${hasFirstPix}`);
