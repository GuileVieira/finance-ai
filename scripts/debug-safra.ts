import * as XLSX from 'xlsx';

function stripHTML(html: string): string {
  if (!html) return '';
  return html.toString().replace(/<[^>]*>/g, '').trim();
}

function parseBRLCurrency(value: string | number): number {
  if (typeof value === 'number') return value;

  let cleanValue = value.replace(/<[^>]*>/g, '');
  cleanValue = cleanValue.replace(/R\$?\s*/g, '').trim();
  cleanValue = cleanValue.replace(/\./g, '').replace(/,/g, '.');

  return parseFloat(cleanValue) || 0;
}

const workbook = XLSX.readFile('docs/examples/raw/extratos/Agosto Safra .xls');
const sheet = workbook.Sheets['Sheet4'];
const data = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as any[];

let processadas = 0;
let puladas = 0;
let razoesPular: Record<string, number> = {};

console.log('=== DEBUG SAFRA - PROCESSAMENTO ===\n');

for (let i = 0; i < data.length; i++) {
  const row = data[i];

  const tipoLancamento = String(row['Tipo do Lançamento'] || '').trim();

  // Filtrar apenas Débito e Crédito
  if (tipoLancamento !== 'Débito' && tipoLancamento !== 'Crédito') {
    puladas++;
    razoesPular['tipo_nao_debito_credito'] = (razoesPular['tipo_nao_debito_credito'] || 0) + 1;
    continue;
  }

  const dateStr = String(row['Data'] || '');
  const valorRaw = String(row['Valor'] || '');
  const descricao = stripHTML(String(row['Lançamento'] || ''));

  // Extrair valor
  const valorMatch = valorRaw.match(/>(-?R?\$?\s*[\d.,]+)(?:<|$)/);
  let valorStr = '';

  if (valorMatch) {
    valorStr = valorMatch[1].trim();
  } else {
    const lastGt = valorRaw.lastIndexOf('>');
    if (lastGt >= 0) {
      valorStr = valorRaw.substring(lastGt + 1).trim();
    } else {
      valorStr = valorRaw;
    }
  }

  if (!valorStr || valorStr === '') {
    puladas++;
    razoesPular['valor_vazio'] = (razoesPular['valor_vazio'] || 0) + 1;
    if (puladas <= 5) {
      console.log(`Pulada ${puladas}: valor vazio`);
      console.log(`  Tipo: ${tipoLancamento}`);
      console.log(`  Desc: ${descricao}`);
      console.log(`  ValorRaw: "${valorRaw}"`);
      console.log();
    }
    continue;
  }

  const dateParts = dateStr.split('/');
  if (dateParts.length !== 2) {
    puladas++;
    razoesPular['data_invalida'] = (razoesPular['data_invalida'] || 0) + 1;
    continue;
  }

  const amount = parseBRLCurrency(valorStr);
  if (amount === 0 || isNaN(amount)) {
    puladas++;
    razoesPular['valor_zero_ou_nan'] = (razoesPular['valor_zero_ou_nan'] || 0) + 1;
    if (puladas <= 10) {
      console.log(`Pulada: valor zero/NaN`);
      console.log(`  Tipo: ${tipoLancamento}`);
      console.log(`  Desc: ${descricao}`);
      console.log(`  ValorStr: "${valorStr}"`);
      console.log(`  Amount: ${amount}`);
      console.log();
    }
    continue;
  }

  processadas++;
}

console.log('=== RESULTADO ===');
console.log(`Total linhas no Excel: ${data.length}`);
console.log(`Transações processadas: ${processadas}`);
console.log(`Transações puladas: ${puladas}`);
console.log(`\nRazões para pular:`);
Object.entries(razoesPular).forEach(([razao, count]) => {
  console.log(`  ${razao}: ${count}`);
});
