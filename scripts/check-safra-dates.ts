import * as XLSX from 'xlsx';

const wb = XLSX.readFile('docs/examples/raw/extratos/Agosto Safra .xls');
const sheet = wb.Sheets['Sheet4'];
const data = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as any[];

// Pegar transações de débito/crédito e ver os diferentes formatos de data
const transacoes = data.filter(r =>
  r['Tipo do Lançamento'] === 'Débito' || r['Tipo do Lançamento'] === 'Crédito'
);

console.log(`Total transações débito/crédito: ${transacoes.length}\n`);

const formatosData = new Set<string>();
const tiposData = new Map<string, number>();

transacoes.forEach(r => {
  const dateValue = r['Data'];
  const dateStr = String(dateValue || '');
  const tipo = typeof dateValue;

  formatosData.add(dateStr);
  tiposData.set(tipo, (tiposData.get(tipo) || 0) + 1);
});

console.log('Tipos das datas:');
tiposData.forEach((count, tipo) => {
  console.log(`  ${tipo}: ${count}`);
});

console.log(`\nPrimeiros 30 formatos de data encontrados:`);
Array.from(formatosData).slice(0, 30).forEach(d => console.log(`  "${d}"`));

// Verificar quais são válidas no formato DD/MM
const validasDD_MM = transacoes.filter(r => {
  const dateStr = String(r['Data'] || '');
  const parts = dateStr.split('/');
  return parts.length === 2;
}).length;

const invalidas = transacoes.length - validasDD_MM;

console.log(`\nAnálise do formato:`);
console.log(`  Datas formato DD/MM: ${validasDD_MM}`);
console.log(`  Datas outros formatos: ${invalidas}`);

// Mostrar exemplos de datas inválidas
console.log(`\nExemplos de datas em outros formatos:`);
transacoes
  .filter(r => {
    const dateStr = String(r['Data'] || '');
    const parts = dateStr.split('/');
    return parts.length !== 2;
  })
  .slice(0, 10)
  .forEach(r => {
    console.log(`  Data: "${r['Data']}" (${typeof r['Data']})`);
    console.log(`    Tipo: ${r['Tipo do Lançamento']}`);
    console.log(`    Desc: ${r['Lançamento']}`);
    console.log();
  });
