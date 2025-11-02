import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Tipos
interface Transaction {
  date: Date;
  description: string;
  amount: number;
  balance?: number;
  type: 'CREDIT' | 'PAYMENT' | 'DEBIT' | 'OTHER';
  fitid: string;
  memo?: string;
  name?: string;
}

interface BankAccount {
  bankId: string;
  bankName: string;
  branchId: string;
  accountId: string;
  accountType: 'CHECKING' | 'SAVINGS';
}

// Mapeamento de meses em português
const PORTUGUESE_MONTHS: Record<string, string> = {
  'Jan': '01', 'Fev': '02', 'Mar': '03', 'Abr': '04',
  'Mai': '05', 'Jun': '06', 'Jul': '07', 'Ago': '08',
  'Set': '09', 'Out': '10', 'Nov': '11', 'Dez': '12'
};

// Função para formatar data no formato OFX (YYYYMMDD)
function formatDateOFX(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// Função para parsear valor brasileiro (R$ 1.234,56)
function parseBRLCurrency(value: string | number): number {
  if (typeof value === 'number') return value;

  // Remover HTML tags se existir
  let cleanValue = value.replace(/<[^>]*>/g, '');

  // Remover R$, espaços e outros caracteres
  cleanValue = cleanValue.replace(/R\$?\s*/g, '').trim();

  // Trocar ponto por nada (milhar) e vírgula por ponto (decimal)
  cleanValue = cleanValue.replace(/\./g, '').replace(/,/g, '.');

  return parseFloat(cleanValue) || 0;
}

// Função para limpar HTML de strings
function stripHTML(html: string): string {
  if (!html) return '';
  return html.toString().replace(/<[^>]*>/g, '').trim();
}

// Função para parsear data portuguesa "31/Ago • 20h36m57s"
function parsePortugueseDate(dateStr: string, year: number = 2023): Date {
  const match = dateStr.match(/(\d{1,2})\/([\w]{3})/);
  if (!match) return new Date();

  const day = parseInt(match[1]);
  const monthStr = match[2];
  const month = parseInt(PORTUGUESE_MONTHS[monthStr] || '01');

  return new Date(year, month - 1, day);
}

// Função para parsear data Excel serial
function parseExcelDate(serial: number): Date {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
}

// Função para parsear data brasileira DD/MM/YYYY
function parseBRDate(dateStr: string | number): Date {
  if (typeof dateStr === 'number') {
    return parseExcelDate(dateStr);
  }

  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
    return new Date(year, month, day);
  }

  return new Date();
}

// Processar arquivo Itaú Extrato
function processItauExtrato(filePath: string): Transaction[] {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Lançamentos'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

  const transactions: Transaction[] = [];

  // Começar da linha 9 (índice 9, pular header)
  for (let i = 10; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // Pular linhas vazias

    const date = parseBRDate(row[0]);
    const description = String(row[1] || '').trim();
    const amount = parseBRLCurrency(row[3]);
    const balance = parseBRLCurrency(row[4]);

    if (amount === 0) continue;

    transactions.push({
      date,
      description,
      amount,
      balance,
      type: amount > 0 ? 'CREDIT' : 'PAYMENT',
      fitid: `ITAU${formatDateOFX(date)}${i}`,
      memo: description,
      name: description.substring(0, 32)
    });
  }

  return transactions;
}

// Processar arquivo Itaú Pagamentos
function processItauPagamentos(filePath: string): Transaction[] {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['consultaPagamentos'];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as any[];

  const transactions: Transaction[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    // Tentar encontrar data e valor nas colunas
    const dateValue = row['Data'] || row['data'] || row['__EMPTY_2'];
    const amountValue = row['Valor'] || row['valor'] || row['__EMPTY_10'];
    const descValue = row['Descrição'] || row['descricao'] || row['__EMPTY_4'];

    if (!dateValue || !amountValue) continue;

    const date = parseBRDate(dateValue);
    const amount = -Math.abs(parseBRLCurrency(amountValue)); // Pagamentos são sempre negativos
    const description = String(descValue || 'Pagamento').trim();

    transactions.push({
      date,
      description,
      amount,
      type: 'PAYMENT',
      fitid: `ITAUPAG${formatDateOFX(date)}${i}`,
      memo: description,
      name: description.substring(0, 32)
    });
  }

  return transactions.filter(t => !isNaN(t.date.getTime()));
}

// Processar arquivo Safra
function processSafra(filePath: string): Transaction[] {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Sheet4'];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as any[];

  const transactions: Transaction[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    const tipoLancamento = String(row['Tipo do Lançamento'] || '').trim();

    // Filtrar apenas Débito e Crédito
    if (tipoLancamento !== 'Débito' && tipoLancamento !== 'Crédito') continue;

    const dateStr = String(row['Data'] || '');
    const valorRaw = String(row['Valor'] || '');
    const descricao = stripHTML(String(row['Lançamento'] || ''));
    const complemento = stripHTML(String(row['Complemento'] || ''));
    const documento = String(row['Nº Documento'] || '');

    // Extrair valor: procurar por "R$" seguido de números
    // Formato: >R$ 42.061,36 ou >-R$ 1.071,64
    const valorMatch = valorRaw.match(/>(-?R?\$?\s*[\d.,]+)(?:<|$)/);
    let valorStr = '';

    if (valorMatch) {
      valorStr = valorMatch[1].trim();
    } else {
      // Tentar pegar tudo depois do último ">"
      const lastGt = valorRaw.lastIndexOf('>');
      if (lastGt >= 0) {
        valorStr = valorRaw.substring(lastGt + 1).trim();
      } else {
        valorStr = valorRaw;
      }
    }

    // Se o valor extraído estiver vazio, pular
    if (!valorStr || valorStr === '') continue;

    // Parse da data (pode ser DD/MM string ou número Excel serial)
    let date: Date;
    const dateValue = row['Data'];

    if (typeof dateValue === 'number') {
      // Data no formato Excel serial
      date = parseExcelDate(dateValue);
    } else {
      // Data no formato DD/MM string
      const dateParts = dateStr.split('/');
      if (dateParts.length !== 2) continue;

      const day = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1;
      date = new Date(2023, month, day);
    }

    const amount = parseBRLCurrency(valorStr);
    if (amount === 0 || isNaN(amount)) continue;

    const fullDescription = `${descricao} ${complemento}`.trim();

    transactions.push({
      date,
      description: fullDescription,
      amount,
      type: amount > 0 ? 'CREDIT' : 'PAYMENT',
      fitid: `SAFRA${formatDateOFX(date)}${documento}${i}`,
      memo: fullDescription,
      name: descricao.substring(0, 32)
    });
  }

  return transactions;
}

// Processar arquivo BB Extrato
function processBBExtrato(filePath: string): Transaction[] {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Extrato'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

  const transactions: Transaction[] = [];

  // Começar da linha 3 (índice 3, pular headers)
  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    const date = parseBRDate(row[0]);
    const historico = String(row[7] || '').trim();
    const valorStr = String(row[8] || '');
    const tipo = String(row[9] || '').trim(); // D ou C

    // Pular "Saldo Anterior"
    if (historico.includes('Saldo Anterior')) continue;

    let amount = parseBRLCurrency(valorStr);
    if (tipo === 'D') amount = -Math.abs(amount);

    if (amount === 0) continue;

    transactions.push({
      date,
      description: historico,
      amount,
      type: amount > 0 ? 'CREDIT' : 'PAYMENT',
      fitid: `BB${formatDateOFX(date)}${i}`,
      memo: historico,
      name: historico.substring(0, 32)
    });
  }

  return transactions;
}

// Processar arquivo BB PIX
function processBBPix(filePath: string): Transaction[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as any[];

  const transactions: Transaction[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    const dateStr = String(row['dataEHora'] || '');
    const descricao = String(row['lancamento'] || '');
    const idOperacao = String(row['idOperacao'] || '');
    const destinatario = String(row['origemDestinatario'] || '');
    const valor = parseBRLCurrency(row['valor']);
    const natureza = String(row['natureza'] || ''); // C ou D

    if (!dateStr || valor === 0) continue;

    const date = parsePortugueseDate(dateStr, 2023);
    let amount = valor;
    if (natureza === 'D') amount = -Math.abs(amount);

    const fullDescription = `${descricao} - ${destinatario}`.trim();

    transactions.push({
      date,
      description: fullDescription,
      amount,
      type: amount > 0 ? 'CREDIT' : 'PAYMENT',
      fitid: idOperacao || `BBPIX${formatDateOFX(date)}${i}`,
      memo: fullDescription,
      name: destinatario.substring(0, 32)
    });
  }

  return transactions;
}

// Processar arquivo CEF
function processCEF(filePath: string): Transaction[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

  const transactions: Transaction[] = [];

  // Começar da linha 2 (índice 2, pular header)
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    const date = parseBRDate(row[0]);
    const historico = String(row[2] || '').trim();
    const valor = parseBRLCurrency(row[4]);
    const saldo = parseBRLCurrency(row[5]);

    // Filtrar "SALDO DIA" com valor zero
    if (historico.includes('SALDO DIA') && valor === 0) continue;
    if (valor === 0) continue;

    transactions.push({
      date,
      description: historico,
      amount: valor,
      balance: saldo,
      type: valor > 0 ? 'CREDIT' : 'PAYMENT',
      fitid: `CEF${formatDateOFX(date)}${i}`,
      memo: historico,
      name: historico.substring(0, 32)
    });
  }

  return transactions;
}

// Processar arquivo Santander
function processSantander(filePath: string): Transaction[] {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Sheet0'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

  const transactions: Transaction[] = [];

  // Começar da linha 3 (índice 3, pular headers não-padrão)
  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    const date = parseBRDate(row[0]);
    const historico = String(row[2] || '').trim();
    const valor = parseBRLCurrency(row[4]);
    const saldo = parseBRLCurrency(row[5]);

    // Pular "SALDO ANTERIOR"
    if (historico.includes('SALDO ANTERIOR')) continue;
    if (valor === 0) continue;

    transactions.push({
      date,
      description: historico,
      amount: valor,
      balance: saldo,
      type: valor > 0 ? 'CREDIT' : 'PAYMENT',
      fitid: `SANTANDER${formatDateOFX(date)}${i}`,
      memo: historico,
      name: historico.substring(0, 32)
    });
  }

  return transactions;
}

// Gerar arquivo OFX
function generateOFX(
  account: BankAccount,
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): string {
  // Ordenar transações por data
  transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calcular saldo final
  const finalBalance = transactions.reduce((sum, t) => sum + t.amount, 0);

  // Gerar transações OFX
  const transactionsOFX = transactions.map(t => `<STMTTRN>
<TRNTYPE>${t.type}</TRNTYPE>
<DTPOSTED>${formatDateOFX(t.date)}</DTPOSTED>
<TRNAMT>${t.amount.toFixed(2)}</TRNAMT>
<FITID>${t.fitid}</FITID>
<CHECKNUM>${account.bankId}</CHECKNUM>
<REFNUM>${account.bankId}</REFNUM>
<MEMO>${t.memo || t.description}</MEMO>
<NAME>${t.name || ''}</NAME>
</STMTTRN>`).join('\n');

  return `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0</CODE>
<SEVERITY>INFO</SEVERITY>
</STATUS>
<DTSERVER>${formatDateOFX(new Date())}</DTSERVER>
<LANGUAGE>POR</LANGUAGE>
<FI>
<ORG>${account.bankName}</ORG>
<FID>${account.bankId}</FID>
</FI>
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1001</TRNUID>
<STATUS>
<CODE>0</CODE>
<SEVERITY>INFO</SEVERITY>
</STATUS>
<STMTRS>
<CURDEF>BRL</CURDEF>
<BANKACCTFROM>
<BANKID>${account.bankId}</BANKID>
<BRANCHID>${account.branchId}</BRANCHID>
<ACCTID>${account.accountId}</ACCTID>
<ACCTTYPE>${account.accountType}</ACCTTYPE>
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>${formatDateOFX(startDate)}</DTSTART>
<DTEND>${formatDateOFX(endDate)}</DTEND>
${transactionsOFX}
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>${finalBalance.toFixed(2)}</BALAMT>
<DTASOF>${formatDateOFX(endDate)}</DTASOF>
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;
}

// Função principal
async function main() {
  const extractsDir = '/Users/guilherme/Documents/Projetos/financeiro-aldo/mvp_finance/docs/examples/raw/extratos';
  const outputDir = '/Users/guilherme/Documents/Projetos/financeiro-aldo/mvp_finance';

  console.log('Iniciando conversão de Excel para OFX...\n');

  // 1. ITAÚ (Extrato + Pagamentos)
  console.log('1. Processando Itaú...');
  const itauExtrato = processItauExtrato(path.join(extractsDir, '2023.08 - KINGX - Extrato Itaú.xlsx'));
  const itauPagamentos = processItauPagamentos(path.join(extractsDir, '2023.08 - KINGX - Pagamentos Itaú.xls'));
  const itauAll = [...itauExtrato, ...itauPagamentos];

  const itauOFX = generateOFX(
    {
      bankId: '341',
      bankName: 'Itaú Unibanco S.A.',
      branchId: '1529',
      accountId: '73200',
      accountType: 'CHECKING'
    },
    itauAll,
    new Date(2023, 7, 1),
    new Date(2023, 7, 31)
  );

  fs.writeFileSync(path.join(outputDir, 'Itau-Ago2023.ofx'), itauOFX);
  console.log(`✓ Itau-Ago2023.ofx gerado (${itauAll.length} transações)`);

  // 2. SAFRA
  console.log('2. Processando Safra...');
  const safra = processSafra(path.join(extractsDir, 'Agosto Safra .xls'));

  const safraOFX = generateOFX(
    {
      bankId: '422',
      bankName: 'Banco Safra S.A.',
      branchId: '0211',
      accountId: '00584212-4',
      accountType: 'CHECKING'
    },
    safra,
    new Date(2023, 7, 1),
    new Date(2023, 7, 31)
  );

  fs.writeFileSync(path.join(outputDir, 'Safra-Ago2023.ofx'), safraOFX);
  console.log(`✓ Safra-Ago2023.ofx gerado (${safra.length} transações)`);

  // 3. BANCO DO BRASIL (Extrato + PIX)
  console.log('3. Processando Banco do Brasil...');
  const bbExtrato = processBBExtrato(path.join(extractsDir, 'Extrato BB ago23.xlsx'));
  const bbPix = processBBPix(path.join(extractsDir, 'MovimentaçãoPixBB ago23.xls'));
  const bbAll = [...bbExtrato, ...bbPix];

  const bbOFX = generateOFX(
    {
      bankId: '001',
      bankName: 'Banco do Brasil S.A.',
      branchId: '08575',
      accountId: '325112',
      accountType: 'CHECKING'
    },
    bbAll,
    new Date(2023, 7, 1),
    new Date(2023, 7, 31)
  );

  fs.writeFileSync(path.join(outputDir, 'BB-Ago2023.ofx'), bbOFX);
  console.log(`✓ BB-Ago2023.ofx gerado (${bbAll.length} transações)`);

  // 4. CEF
  console.log('4. Processando CEF...');
  const cef = processCEF(path.join(extractsDir, 'Extrato CEF ago23.xls'));

  const cefOFX = generateOFX(
    {
      bankId: '104',
      bankName: 'Caixa Econômica Federal',
      branchId: '4846',
      accountId: '00000008104',
      accountType: 'CHECKING'
    },
    cef,
    new Date(2023, 7, 1),
    new Date(2023, 7, 31)
  );

  fs.writeFileSync(path.join(outputDir, 'CEF-Ago2023.ofx'), cefOFX);
  console.log(`✓ CEF-Ago2023.ofx gerado (${cef.length} transações)`);

  // 5. SANTANDER
  console.log('5. Processando Santander...');
  const santander = processSantander(path.join(extractsDir, 'Extrato Santander Ago23.xls'));

  const santanderOFX = generateOFX(
    {
      bankId: '033',
      bankName: 'Banco Santander S.A.',
      branchId: '4334',
      accountId: '130053675',
      accountType: 'CHECKING'
    },
    santander,
    new Date(2023, 7, 1),
    new Date(2023, 7, 31)
  );

  fs.writeFileSync(path.join(outputDir, 'Santander-Ago2023.ofx'), santanderOFX);
  console.log(`✓ Santander-Ago2023.ofx gerado (${santander.length} transações)`);

  console.log('\n✅ Conversão concluída! 5 arquivos OFX gerados na raiz do projeto.');
}

main().catch(console.error);
