#!/usr/bin/env node

console.log('🏦 Script de Configuração - Banco Intermedium S/A');
console.log('='.repeat(50));

// Carregar variáveis de ambiente
require('dotenv').config();

// Obter URL do banco da variável de ambiente
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL não encontrada nas variáveis de ambiente');
  console.error('💡 Verifique se o arquivo .env está configurado');
  process.exit(1);
}

// Parse dos argumentos
const args = process.argv.slice(2);
const flags = {
  dryRun: args.includes('--dry-run'),
  help: args.includes('--help') || args.includes('-h'),
  verbose: args.includes('--verbose') || args.includes('-v')
};

// Função de help
if (flags.help) {
  console.log(`
Uso: node scripts/setup-banco-intermedium.js [opções]

Opções:
  --dry-run         Apenas mostra o que será alterado (não executa)
  --verbose         Mostra detalhes da operação
  --help, -h        Mostra esta ajuda

Descrição:
  Este script atualiza a primeira conta bancária existente com os dados
  do Banco Intermedium S/A:

  • Banco: Banco Intermedium S/A
  • Código: 077
  • Agência: 0001-9
  • Conta: 118352130
  • Tipo: Corrente (checking)

Exemplos:
  node scripts/setup-banco-intermedium.js --dry-run    # Simular
  node scripts/setup-banco-intermedium.js --verbose    # Executar com detalhes
`);
  process.exit(0);
}

console.log(`🔍 Modo ${flags.dryRun ? 'simulação' : 'execução'}`);
console.log(`🔗 Conectando ao banco: ${dbUrl.replace(/\/\/.*@/, '//***:***')}`);

// Importar dependências do Node.js
const { Pool } = require('pg');

// Dados do Banco Intermedium
const bancoIntermedium = {
  bankName: 'Banco Intermedium S/A',
  bankCode: '077',
  agencyNumber: '0001-9',
  accountNumber: '118352130',
  accountType: 'checking'
};

async function main() {
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') ? false : {
      rejectUnauthorized: false
    }
  });

  const client = await pool.connect();

  try {
    console.log('\n📊 Buscando primeira conta existente...');

    // Buscar primeira conta existente
    const existingAccount = await client.query(
      `SELECT id, name, bank_name, bank_code, agency_number, account_number, account_type, company_id, created_at
       FROM financeai_accounts
       ORDER BY created_at ASC
       LIMIT 1`
    );

    if (existingAccount.rows.length === 0) {
      console.error('❌ Nenhuma conta encontrada no banco de dados');
      console.log('💡 Execute a inicialização do banco primeiro');
      process.exit(1);
    }

    const account = existingAccount.rows[0];

    console.log('\n📋 CONTA ENCONTRADA:');
    console.log('='.repeat(50));
    console.log(`ID: ${account.id}`);
    console.log(`Nome: ${account.name}`);
    console.log(`Banco: ${account.bank_name}`);
    console.log(`Código: ${account.bank_code}`);
    console.log(`Agência: ${account.agency_number || 'N/A'}`);
    console.log(`Conta: ${account.account_number}`);
    console.log(`Tipo: ${account.account_type || 'N/A'}`);
    console.log(`Empresa ID: ${account.company_id}`);
    console.log(`Criada em: ${account.created_at}`);

    console.log('\n🔄 DADOS NOVOS (Banco Intermedium):');
    console.log('='.repeat(50));
    console.log(`Banco: ${bancoIntermedium.bankName}`);
    console.log(`Código: ${bancoIntermedium.bankCode}`);
    console.log(`Agência: ${bancoIntermedium.agencyNumber}`);
    console.log(`Conta: ${bancoIntermedium.accountNumber}`);
    console.log(`Tipo: ${bancoIntermedium.accountType}`);

    // Verificar se já tem os mesmos dados
    const sameBank = account.bank_name === bancoIntermedium.bankName;
    const sameCode = account.bank_code === bancoIntermedium.bankCode;
    const sameAgency = account.agency_number === bancoIntermedium.agencyNumber;
    const sameAccount = account.account_number === bancoIntermedium.accountNumber;
    const sameType = account.account_type === bancoIntermedium.accountType;

    if (sameBank && sameCode && sameAgency && sameAccount && sameType) {
      console.log('\n✅ A conta já possui os dados do Banco Intermedium!');
      console.log('🎉 Nenhuma alteração necessária');
      return;
    }

    if (flags.dryRun) {
      console.log('\n✨ Modo de simulação - Nenhuma alteração será realizada');
      console.log('💡 Execute sem --dry-run para aplicar as alterações');
      return;
    }

    // Confirmação
    console.log('\n⚠️  ATENÇÃO: Esta operação sobrescreverá os dados da conta!');
    console.log('Para confirmar, pressione ENTER. Para cancelar, pressione CTRL+C');

    // Aguardar confirmação
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    await new Promise(resolve => {
      process.stdin.once('data', () => {
        process.stdin.pause();
        resolve();
      });
    });

    console.log('\n🔄 Atualizando conta...');

    // Atualizar conta
    const updateResult = await client.query(
      `UPDATE financeai_accounts
       SET
         bank_name = $1,
         bank_code = $2,
         agency_number = $3,
         account_number = $4,
         account_type = $5,
         updated_at = NOW()
       WHERE id = $6`,
      [
        bancoIntermedium.bankName,
        bancoIntermedium.bankCode,
        bancoIntermedium.agencyNumber,
        bancoIntermedium.accountNumber,
        bancoIntermedium.accountType,
        account.id
      ]
    );

    if (flags.verbose) {
      console.log(`\n📊 Query executada:`);
      console.log(`UPDATE financeai_accounts
       SET
         bank_name = '${bancoIntermedium.bankName}',
         bank_code = '${bancoIntermedium.bankCode}',
         agency_number = '${bancoIntermedium.agencyNumber}',
         account_number = '${bancoIntermedium.accountNumber}',
         account_type = '${bancoIntermedium.accountType}',
         updated_at = NOW()
       WHERE id = '${account.id}'`);
    }

    console.log('\n🎉 CONTA ATUALIZADA COM SUCESSO!');
    console.log('='.repeat(50));
    console.log(`ID: ${account.id}`);
    console.log(`Novo Banco: ${bancoIntermedium.bankName}`);
    console.log(`Novo Código: ${bancoIntermedium.bankCode}`);
    console.log(`Nova Agência: ${bancoIntermedium.agencyNumber}`);
    console.log(`Nova Conta: ${bancoIntermedium.accountNumber}`);
    console.log(`Novo Tipo: ${bancoIntermedium.accountType}`);

    // Contar transações associadas
    const transactionCount = await client.query(
      'SELECT COUNT(*) as count FROM financeai_transactions WHERE account_id = $1',
      [account.id]
    );

    console.log(`\n📊 Transações associadas: ${transactionCount.rows[0].count}`);
    console.log('\n✨ Todas as transações existentes agora estão vinculadas ao Banco Intermedium!');
    console.log('\n💡 Os uploads futuros de arquivos OFX do Banco Intermedium serão associados automaticamente a esta conta.');

  } catch (error) {
    console.error('❌ Erro durante a atualização:', error);
    process.exit(1);
  } finally {
    await client.end();
    await pool.end();
  }
}

// Executar
main().catch(error => {
  console.error('❌ Erro na execução:', error);
  process.exit(1);
});