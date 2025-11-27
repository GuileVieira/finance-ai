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

// Função para limpar Supabase Storage
async function cleanSupabaseStorage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseKey === 'your_supabase_anon_key_here') {
    console.log('📁 Supabase não configurado, pulando limpeza do storage remoto');
    return;
  }

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    const bucketName = 'ofx-files';

    console.log('☁️  Limpando Supabase Storage...');

    // Listar todas as empresas (pastas no nível ofx/)
    const { data: companies, error: listError } = await supabase.storage
      .from(bucketName)
      .list('ofx', { limit: 1000 });

    if (listError) {
      if (listError.message.includes('not found')) {
        console.log('✅ Bucket não encontrado ou vazio');
        return;
      }
      throw listError;
    }

    if (!companies || companies.length === 0) {
      console.log('✅ Nenhum arquivo encontrado no Supabase Storage');
      return;
    }

    let totalFiles = 0;

    // Para cada empresa
    for (const company of companies) {
      if (!company.name) continue;

      // Listar meses dentro da empresa
      const { data: months, error: monthsError } = await supabase.storage
        .from(bucketName)
        .list(`ofx/${company.name}`, { limit: 1000 });

      if (monthsError || !months) continue;

      // Para cada mês
      for (const month of months) {
        if (!month.name) continue;

        // Listar arquivos dentro do mês
        const { data: files, error: filesError } = await supabase.storage
          .from(bucketName)
          .list(`ofx/${company.name}/${month.name}`);

        if (filesError || !files || files.length === 0) continue;

        // Montar paths completos
        const filePaths = files.map(f =>
          `ofx/${company.name}/${month.name}/${f.name}`
        );

        if (flags.dryRun) {
          console.log(`   ☁️  [DRY-RUN] ${filePaths.length} arquivos de ${company.name}/${month.name}`);
          totalFiles += filePaths.length;
        } else {
          // Deletar batch
          const { error: deleteError } = await supabase.storage
            .from(bucketName)
            .remove(filePaths);

          if (deleteError) {
            console.error(`❌ Erro ao deletar arquivos de ${company.name}/${month.name}:`, deleteError.message);
          } else {
            totalFiles += filePaths.length;
            if (flags.verbose) {
              console.log(`   ☁️  Removidos ${filePaths.length} arquivos de ${company.name}/${month.name}`);
            }
          }
        }
      }
    }

    if (flags.dryRun) {
      console.log(`✅ [DRY-RUN] Supabase Storage: ${totalFiles} arquivos seriam removidos`);
    } else {
      console.log(`✅ Supabase Storage limpo: ${totalFiles} arquivos removidos`);
    }

  } catch (error) {
    console.error('❌ Erro ao limpar Supabase Storage:', error.message);
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

Remove TODOS os dados do sistema, EXCETO usuários:
  - Transações
  - Contas bancárias
  - Categorias
  - Regras de categorização
  - Empresas
  - Uploads e processing batches
  - Arquivos do storage

Opções:
  --uploads-only     Limpa apenas uploads (não remove transações, contas, etc)
  --recent          Limpa apenas dados recentes (última hora)
  --company ID      Limpar apenas da empresa especificada
  --dry-run         Apenas mostra o que será limpo (não executa)
  --verbose         Mostra detalhes da operação
  --help, -h        Mostra esta ajuda

Exemplos:
  node scripts/reset-data-db.js                    # Limpeza completa (preserva users)
  node scripts/reset-data-db.js --dry-run          # Simular
  node scripts/reset-data-db.js --recent           # Apenas recentes
  node scripts/reset-data-db.js --uploads-only     # Apenas uploads
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
    let accountCount = null;
    let categoryCount = null;
    let companyCount = null;
    let rulesCount = null;

    if (!flags.uploadsOnly) {
      const whereTrans = options.company
        ? `WHERE company_id = $1`
        : '';
      const paramsTrans = options.company ? [options.company] : [];

      // Contar transações
      transactionCount = await client.query(
        `SELECT COUNT(*) as count FROM financeai_transactions ${whereTrans}`,
        paramsTrans
      );
      console.log(`💳 Transações encontradas: ${transactionCount.rows[0].count}`);

      // Contar contas bancárias
      accountCount = await client.query(
        `SELECT COUNT(*) as count FROM financeai_accounts ${whereTrans}`,
        paramsTrans
      );
      console.log(`🏦 Contas bancárias encontradas: ${accountCount.rows[0].count}`);

      // Contar categorias (todas, incluindo padrão do sistema)
      categoryCount = await client.query(
        `SELECT COUNT(*) as count FROM financeai_categories ${whereTrans}`,
        paramsTrans
      );
      console.log(`🏷️  Categorias encontradas: ${categoryCount.rows[0].count}`);

      // Contar regras de categorização (pode não existir)
      try {
        rulesCount = await client.query(
          `SELECT COUNT(*) as count FROM financeai_categorization_rules ${whereTrans}`,
          paramsTrans
        );
        console.log(`📐 Regras de categorização encontradas: ${rulesCount.rows[0].count}`);
      } catch (e) {
        console.log(`📐 Regras de categorização: tabela não existe`);
      }

      // Contar empresas
      if (!options.company) {
        companyCount = await client.query(
          `SELECT COUNT(*) as count FROM financeai_companies`
        );
        console.log(`🏢 Empresas encontradas: ${companyCount.rows[0].count}`);
      }
    }

    // Relatório final
    console.log('\n📋 RELATÓRIO DE LIMPEZA:');
    console.log('='.repeat(50));
    console.log(`📋 Uploads para remover: ${uploadCount.rows[0].count}`);
    console.log(`📦 Processing batches para remover: ${batchCount.rows[0].count}`);
    if (!flags.uploadsOnly) {
      console.log(`💳 Transações para remover: ${transactionCount?.rows[0].count || 0}`);
      console.log(`🏦 Contas bancárias para remover: ${accountCount?.rows[0].count || 0}`);
      console.log(`🏷️  Categorias para remover: ${categoryCount?.rows[0].count || 0}`);
      console.log(`📐 Regras de categorização para remover: ${rulesCount?.rows[0].count || 0}`);
      if (companyCount) {
        console.log(`🏢 Empresas para remover: ${companyCount.rows[0].count}`);
      }
    }
    console.log(`📁 Arquivos do storage local para remover: Todos`);
    console.log(`☁️  Arquivos do Supabase Storage para remover: Todos`);
    console.log(`👤 Usuários: NÃO SERÃO AFETADOS`);

    if (flags.dryRun) {
      console.log('\n✨ Modo de simulação - Nenhuma alteração foi realizada');
      console.log('💡 Execute sem --dry-run para realizar a limpeza');
      return;
    }

    // Confirmação - verificar se há algo para limpar
    const hasData =
      parseInt(uploadCount.rows[0].count) > 0 ||
      parseInt(batchCount.rows[0].count) > 0 ||
      (transactionCount && parseInt(transactionCount.rows[0].count) > 0) ||
      (accountCount && parseInt(accountCount.rows[0].count) > 0) ||
      (categoryCount && parseInt(categoryCount.rows[0].count) > 0) ||
      (companyCount && parseInt(companyCount.rows[0].count) > 0);

    if (!hasData) {
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

    const transWhere = options.company ? `WHERE company_id = $1` : '';
    const transParams = options.company ? [options.company] : [];

    // Remover transações primeiro (se aplicável)
    let deleteTransactions = null;
    let deleteAccounts = null;
    let deleteCategories = null;
    let deleteRules = null;
    let deleteCompanies = null;

    if (!flags.uploadsOnly) {
      // 1. Remover transações (dependem de accounts e categories)
      console.log('💳 Removendo transações...');
      deleteTransactions = await client.query(
        `DELETE FROM financeai_transactions ${transWhere}`,
        transParams
      );
      console.log(`✅ Transações removidas: ${deleteTransactions.rowCount || 0}`);

      // 2. Remover regras de categorização (pode não existir)
      try {
        console.log('📐 Removendo regras de categorização...');
        deleteRules = await client.query(
          `DELETE FROM financeai_categorization_rules ${transWhere}`,
          transParams
        );
        console.log(`✅ Regras removidas: ${deleteRules.rowCount || 0}`);
      } catch (e) {
        console.log(`📐 Regras: tabela não existe, pulando...`);
      }

      // 3. Remover categorias
      console.log('🏷️  Removendo categorias...');
      deleteCategories = await client.query(
        `DELETE FROM financeai_categories ${transWhere}`,
        transParams
      );
      console.log(`✅ Categorias removidas: ${deleteCategories.rowCount || 0}`);

      // 4. Remover contas bancárias (dependem de companies)
      console.log('🏦 Removendo contas bancárias...');
      deleteAccounts = await client.query(
        `DELETE FROM financeai_accounts ${transWhere}`,
        transParams
      );
      console.log(`✅ Contas bancárias removidas: ${deleteAccounts.rowCount || 0}`);
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

    // Remover empresas (por último, pois tudo depende delas)
    if (!flags.uploadsOnly && !options.company) {
      console.log('🏢 Removendo empresas...');
      deleteCompanies = await client.query(`DELETE FROM financeai_companies`);
      console.log(`✅ Empresas removidas: ${deleteCompanies.rowCount || 0}`);
    }

    // Limpar arquivos do storage local
    cleanStorageFiles();

    // Limpar arquivos do Supabase Storage
    await cleanSupabaseStorage();

    // Relatório final
    console.log('\n🎉 LIMPEZA COMPLETA CONCLUÍDA COM SUCESSO!');
    console.log('='.repeat(50));
    console.log(`📋 Uploads removidos: ${deleteUploads.rowCount || 0}`);
    console.log(`📦 Processing batches removidos: ${deleteBatches.rowCount || 0}`);
    if (!flags.uploadsOnly) {
      console.log(`💳 Transações removidas: ${deleteTransactions?.rowCount || 0}`);
      console.log(`📐 Regras removidas: ${deleteRules?.rowCount || 0}`);
      console.log(`🏷️  Categorias removidas: ${deleteCategories?.rowCount || 0}`);
      console.log(`🏦 Contas bancárias removidas: ${deleteAccounts?.rowCount || 0}`);
      if (deleteCompanies) {
        console.log(`🏢 Empresas removidas: ${deleteCompanies.rowCount || 0}`);
      }
    }
    console.log('📁 Arquivos do storage local: Removidos');
    console.log('☁️  Arquivos do Supabase Storage: Removidos');
    console.log('👤 Usuários: Preservados');
    console.log('\n✨ Sistema limpo e pronto para novos dados!');

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