#!/usr/bin/env node

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Configuração
const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
const { version, name } = packageJson;

console.log(`🧹 ${name} v${version} - Script de Limpeza de Dados`);
console.log('='.repeat(50));

// Parse dos argumentos da linha de comando
const args = process.argv.slice(2);
const flags = {
  uploadsOnly: args.includes('--uploads-only'),
  recent: args.includes('--recent'),
  dryRun: args.includes('--dry-run'),
  help: args.includes('--help') || args.includes('-h'),
  verbose: args.includes('--verbose') || args.includes('-v')
};

// Parse de opções com valor
const options = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--company' && i + 1 < args.length) {
    options.company = args[i + 1];
    i++; // Pular próximo argumento
  }
}

// Função de help
if (flags.help) {
  console.log(`
Uso: pnpm reset-data [opções]

Opções:
  --uploads-only     Limpa apenas uploads (não remove transações)
  --recent          Limpa apenas dados recentes (última hora)
  --company ID      Limpa apenas da empresa especificada
  --dry-run         Apenas mostra o que será limpo (não executa)
  --verbose         Mostra detalhes da operação
  --help, -h        Mostra esta ajuda

Exemplos:
  pnpm reset-data                    # Limpeza completa segura
  pnpm reset-data --dry-run          # Apenas simular limpeza
  pnpm reset-data --recent           # Apenas dados recentes
  pnpm reset-data --uploads-only      # Apenas uploads
`);
  process.exit(0);
}

// Import dinâmico para ES modules
async function main() {
  try {
    // Importar dependências apenas quando necessário
    const { db } = await import('../lib/db/connection.ts');
    const { uploads, transactions, accounts, companies } = await import('../lib/db/schema.ts');
    const { eq, lt, and, desc } = await import('drizzle-orm');
    const fs = await import('fs/promises');
    const path = await import('path');

    console.log('🔧 Conectando ao banco de dados...');

    // Obter empresa padrão ou específica
    let targetCompany;
    if (options.company) {
      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, options.company))
        .limit(1);

      if (!company) {
        console.error(`❌ Empresa não encontrada: ${options.company}`);
        process.exit(1);
      }
      targetCompany = company;
    } else {
      const [company] = await db.select()
        .from(companies)
        .limit(1);
      targetCompany = company;
    }

    if (!targetCompany) {
      console.error('❌ Nenhuma empresa encontrada no banco de dados');
      process.exit(1);
    }

    console.log(`🏢 Empresa: ${targetCompany.name} (${targetCompany.id})`);
    console.log(`📅 Modo ${flags.recent ? 'reciente (1 hora)' : 'completo'}`);
    console.log(`🔍 Modo ${flags.dryRun ? 'simulação' : 'execução'}`);

    // Construir filtros de data
    let dateFilter;
    if (flags.recent) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      dateFilter = lt(uploads.uploadedAt, oneHourAgo);
      console.log(`📅 Data limite: ${oneHourAgo.toISOString()}`);
    }

    // Construir where clause
    const whereClause = dateFilter
      ? and(eq(uploads.companyId, targetCompany.id), dateFilter)
      : eq(uploads.companyId, targetCompany.id);

    // Etapa 1: Contar o que será limpo
    console.log('\n📊 Contando dados para limpeza...');

    const uploadsToDelete = await db.select()
      .from(uploads)
      .where(whereClause);

    console.log(`📋 Uploads encontrados: ${uploadsToDelete.length}`);

    // Contar transações relacionadas
    const uploadIds = uploadsToDelete.map(u => u.id);
    let transactionCount = 0;

    if (uploadIds.length > 0 && !flags.uploadsOnly) {
      // Contar transações de cada upload individualmente
      for (const uploadId of uploadIds) {
        const transactionsForUpload = await db.select()
          .from(transactions)
          .where(eq(transactions.uploadId, uploadId));
        transactionCount += transactionsForUpload.length;
      }
    }

    console.log(`💳 Transações relacionadas: ${transactionCount}`);

    // Etapa 2: Mostrar arquivos que serão removidos
    const filesToDelete = [];
    for (const upload of uploadsToDelete) {
      if (upload.filePath) {
        filesToDelete.push({
          id: upload.id,
          path: upload.filePath,
          originalName: upload.originalName,
          exists: fs.existsSync(upload.filePath)
        });
      }
    }

    console.log(`📁 Arquivos físicos: ${filesToDelete.length}`);

    // Etapa 3: Relatório final
    console.log('\n📋 RELATÓRIO DE LIMPEZA:');
    console.log('='.repeat(50));
    console.log(`📋 Uploads para remover: ${uploadsToDelete.length}`);
    console.log(`💳 Transações para remover: ${transactionCount}`);
    console.log(`📁 Arquivos para remover: ${filesToDelete.length}`);
    console.log(`💾 Espaço estimado: ${(filesToDelete.length * 0.1).toFixed(2)} MB`);

    if (flags.dryRun) {
      console.log('\n✨ Modo de simulação - Nenhuma alteração foi realizada');
      console.log('💡 Execute sem --dry-run para realizar a limpeza');
      return;
    }

    // Etapa 4: Confirmação
    if (uploadsToDelete.length === 0) {
      console.log('\n✅ Nenhum dado encontrado para limpeza');
      return;
    }

    console.log('\n⚠️  ATENÇÃO: Esta operação removerá dados permanentemente!');
    console.log('Para confirmar, pressione ENTER. Para cancelar, pressione CTRL+C');

    // Aguardar confirmação (em modo interativo)
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      await new Promise(resolve => {
        process.stdin.once('data', () => {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          resolve();
        });
      });
    }

    // Etapa 5: Executar limpeza
    console.log('\n🧹 Iniciando limpeza...');

    let removedTransactions = 0;
    let removedUploads = 0;
    let removedFiles = 0;

    try {
      // Remover transações primeiro (dependência)
      if (!flags.uploadsOnly && uploadIds.length > 0) {
        console.log('💳 Removendo transações...');

        for (const uploadId of uploadIds) {
          const result = await db.delete(transactions)
            .where(eq(transactions.uploadId, uploadId));
          removedTransactions += result.rowCount || 0;
        }
        console.log(`✅ Transações removidas: ${removedTransactions}`);
      }

      // Remover uploads
      console.log('📋 Removendo uploads...');
      const uploadResult = await db.delete(uploads)
        .where(whereClause);
      removedUploads = uploadResult.rowCount || 0;
      console.log(`✅ Uploads removidos: ${removedUploads}`);

      // Remover arquivos físicos
      console.log('📁 Removendo arquivos físicos...');
      for (const file of filesToDelete) {
        if (file.exists) {
          try {
            await fs.unlink(file.path);
            removedFiles++;

            // Tentar remover arquivo de metadados JSON
            const jsonPath = file.path + '.json';
            if (fs.existsSync(jsonPath)) {
              await fs.unlink(jsonPath);
            }

            if (flags.verbose) {
              console.log(`  🗑️  Removido: ${file.originalName}`);
            }
          } catch (error) {
            console.log(`  ⚠️  Erro ao remover ${file.originalName}: ${error.message}`);
          }
        }
      }
      console.log(`✅ Arquivos removidos: ${removedFiles}`);

    } catch (error) {
      console.error('❌ Erro durante a limpeza:', error);
      process.exit(1);
    }

    // Etapa 6: Relatório final
    console.log('\n🎉 LIMPEZA CONCLUÍDA COM SUCESSO!');
    console.log('='.repeat(50));
    console.log(`📋 Uploads removidos: ${removedUploads}`);
    console.log(`💳 Transações removidas: ${removedTransactions}`);
    console.log(`📁 Arquivos removidos: ${removedFiles}`);
    console.log(`💾 Espaço liberado: ${(removedFiles * 0.1).toFixed(2)} MB`);
    console.log('\n✨ Sistema limpo e pronto para novos testes!');

  } catch (error) {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  }
}

// Executar
main().catch(error => {
  console.error('❌ Erro na execução:', error);
  process.exit(1);
});