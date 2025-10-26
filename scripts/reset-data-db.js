#!/usr/bin/env node

const { readFileSync, rmSync, existsSync } = require('fs');
const { resolve } = require('path');
const { readdirSync, statSync } = require('fs');

console.log('🧹 Script de Limpeza Completa do Banco OFX');
console.log('='.repeat(50));

// Carregar variáveis de ambiente
require('dotenv').config();

// Obter URL do banco da variável de ambiente
const dbUrl = process.env.DATABASE_URL;

// Função para limpar arquivos do storage
function cleanStorageFiles(storagePath = 'storage_tmp') {
  try {
    if (!existsSync(storagePath)) {
      console.log('📁 Storage não encontrado, pulando limpeza de arquivos');
      return;
    }

    console.log('🗂️ Limpando arquivos do storage...');

    let totalFiles = 0;
    let totalSize = 0;

    // Função recursiva para deletar diretório
    function deleteDirectory(dirPath) {
      if (!existsSync(dirPath)) return;

      const files = readdirSync(dirPath);

      for (const file of files) {
        const filePath = resolve(dirPath, file);
        const stat = statSync(filePath);

        if (stat.isDirectory()) {
          deleteDirectory(filePath); // Recursivo para subdiretórios
        } else {
          const fileSize = stat.size;
          rmSync(filePath);
          totalFiles++;
          totalSize += fileSize;

          if (flags.verbose) {
            console.log(`   📄 Removido: ${filePath} (${formatFileSize(fileSize)})`);
          }
        }
      }

      // Deletar diretório vazio
      rmSync(dirPath);
    }

    deleteDirectory(storagePath);

    console.log(`✅ Storage limpo: ${totalFiles} arquivos removidos (${formatFileSize(totalSize)})`);

  } catch (error) {
    console.error('❌ Erro ao limpar storage:', error);
  }
}

// Função para formatar tamanho de arquivo
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

if (!dbUrl) {
  console.error('❌ DATABASE_URL não encontrada nas variáveis de ambiente');
  console.error('💡 Verifique se o arquivo .exists está configurado');
  process.exit(1);
}

// Parse dos argumentos
const args = process.argv.slice(2);
const flags = {
  uploadsOnly: args.includes('--uploads-only'),
  recent: args.includes('--recent'),
  dryRun: args.includes('--dry-run'),
  help: args.includes('--help') || args.includes('-h'),
  verbose: args.includes('--verbose') || args.includes('-v')
};

// Parse de empresa
const options = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--company' && i + 1 < args.length) {
    options.company = args[i + 1];
    i++;
  }
}

// Função de help
if (flags.help) {
  console.log(`
Uso: node scripts/reset-data-db.js [opções]

Opções:
  --uploads-only     Limpa apenas uploads (não remove transações)
  --recent          Limpa apenas dados recentes (última hora)
  --company ID      Limpar apenas da empresa especificada
  --dry-run         Apenas mostra o que será limpo (não executa)
  --verbose         Mostra detalhes da operação
  --help, -h        Mostra esta ajuda

Exemplos:
  node scripts/reset-data-db.js                    # Limpeza completa
  node scripts/reset-data-db.js --dry-run          # Simular
  node scripts/reset-data-db.js --recent           # Apenas recentes
  node scripts/reset-data-db.js --uploads-only      # Apenas uploads
`);
  process.exit(0);
}

console.log(`🔍 Modo ${flags.dryRun ? 'simulação' : 'execução'} ${flags.recent ? '(recentes)' : '(completo)'}`);
console.log(`🔗 Conectando ao banco: ${dbUrl.replace(/\/\/.*@/, '//***:***')}`);

// Importar dependências do Node.js
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') ? false : {
      rejectUnauthorized: false
    }
  });

  const client = await pool.connect();

  try {
    console.log('\n📊 Analisando dados existentes...');

    // Construir filtros
    let whereConditions = [];
    let parameters = [];
    let paramIndex = 1;

    if (options.company) {
      whereConditions.push(`company_id = $${paramIndex}`);
      parameters.push(options.company);
      paramIndex++;
    }

    if (flags.recent) {
      whereConditions.push(`uploaded_at > NOW() - INTERVAL '1 hour'`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Contar uploads
    const uploadCount = await client.query(
      `SELECT COUNT(*) as count FROM financeai_uploads ${whereClause}`,
      parameters
    );
    console.log(`📋 Uploads encontrados: ${uploadCount.rows[0].count}`);

    // Contar processing batches
    const batchCount = await client.query(
      `SELECT COUNT(*) as count FROM financeai_processing_batches ${whereClause}`,
      parameters
    );
    console.log(`📦 Processing batches encontrados: ${batchCount.rows[0].count}`);

    // Contar transações
    let transactionCount = null;
    if (!flags.uploadsOnly) {
      const whereTrans = options.company
        ? `WHERE company_id = $1`
        : '';
      const paramsTrans = options.company ? [options.company] : [];

      // Contar transações diretamente (sem dependência de uploads para simplificar)
      transactionCount = await client.query(
        `SELECT COUNT(*) as count FROM financeai_transactions ${whereTrans}`,
        paramsTrans
      );
      console.log(`💳 Transações encontradas: ${transactionCount.rows[0].count}`);
    }

    // Relatório final
    console.log('\n📋 RELATÓRIO DE LIMPEZA:');
    console.log('='.repeat(50));
    console.log(`📋 Uploads para remover: ${uploadCount.rows[0].count}`);
    console.log(`📦 Processing batches para remover: ${batchCount.rows[0].count}`);
    if (!flags.uploadsOnly && transactionCount) {
      console.log(`💳 Transações para remover: ${transactionCount.rows[0].count}`);
    }
    console.log(`📁 Arquivos do storage para remover: Todos`);

    if (flags.dryRun) {
      console.log('\n✨ Modo de simulação - Nenhuma alteração foi realizada');
      console.log('💡 Execute sem --dry-run para realizar a limpeza');
      return;
    }

    // Confirmação
    if (uploadCount.rows[0].count === 0 &&
        batchCount.rows[0].count === 0 &&
        (!transactionCount || transactionCount.rows[0].count === 0)) {
      console.log('\n✅ Nenhum dado encontrado para limpeza');
      return;
    }

    console.log('\n⚠️  ATENÇÃO: Esta operação removerá dados permanentemente!');
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

    console.log('\n🧹 Iniciando limpeza...');

    // Remover transações primeiro (se aplicável)
    if (!flags.uploadsOnly) {
      console.log('💳 Removendo transações...');

      const transWhere = options.company
        ? `WHERE company_id = $1`
        : '';
      const transParams = options.company ? [options.company] : [];

      const deleteTransactions = await client.query(
        `DELETE FROM financeai_transactions ${transWhere}`,
        transParams
      );
      console.log(`✅ Transações removidas: ${deleteTransactions.rowCount || 0}`);
    }

    // Remover processing batches
    console.log('📦 Removendo processing batches...');
    const deleteBatches = await client.query(
      `DELETE FROM financeai_processing_batches ${whereClause}`,
      parameters
    );
    console.log(`✅ Processing batches removidos: ${deleteBatches.rowCount || 0}`);

    // Remover uploads
    console.log('📋 Removendo uploads...');
    const deleteUploads = await client.query(
      `DELETE FROM financeai_uploads ${whereClause}`,
      parameters
    );
    console.log(`✅ Uploads removidos: ${deleteUploads.rowCount || 0}`);

    // Limpar arquivos do storage
    cleanStorageFiles();

    // Relatório final
    console.log('\n🎉 LIMPEZA COMPLETA CONCLUÍDA COM SUCESSO!');
    console.log('='.repeat(50));
    console.log(`📋 Uploads removidos: ${deleteUploads.rowCount || 0}`);
    console.log(`📦 Processing batches removidos: ${deleteBatches.rowCount || 0}`);
    if (!flags.uploadsOnly) {
      console.log(`💳 Transações removidas: ${deleteTransactions.rowCount || 0}`);
    }
    console.log('📁 Arquivos do storage: Removidos');
    console.log('\n✨ Sistema 100% limpo e pronto para novos uploads OFX!');

  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
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