/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config({ path: '.env' });

import * as fs from 'fs';
import * as path from 'path';

async function exportAllData() {
  const { db } = await import('../lib/db/connection');
  const schema = await import('../lib/db/schema');

  const tables = [
    { name: 'companies', table: schema.companies },
    { name: 'users', table: schema.users },
    { name: 'userCompanies', table: schema.userCompanies },
    { name: 'accounts', table: schema.accounts },
    { name: 'categories', table: schema.categories },
    { name: 'uploads', table: schema.uploads },
    { name: 'processingBatches', table: schema.processingBatches },
    { name: 'transactions', table: schema.transactions },
    { name: 'categoryRules', table: schema.categoryRules },
    { name: 'ruleFeedback', table: schema.ruleFeedback },
    { name: 'transactionClusters', table: schema.transactionClusters },
    { name: 'aiModelPricing', table: schema.aiModelPricing },
    { name: 'insightThresholds', table: schema.insightThresholds },
    { name: 'aiUsageLogs', table: schema.aiUsageLogs },
    { name: 'projections', table: schema.projections },
    { name: 'transactionSplits', table: schema.transactionSplits },
  ] as const;

  const OUTPUT_FILE = path.resolve(__dirname, '..', 'export-database.txt');
  const lines: string[] = [];

  lines.push('='.repeat(80));
  lines.push(`EXPORTAÇÃO COMPLETA DO BANCO DE DADOS`);
  lines.push(`Data: ${new Date().toISOString()}`);
  lines.push('='.repeat(80));
  lines.push('');

  for (const { name, table } of tables) {
    try {
      console.log(`Exportando tabela: ${name}...`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await db.select().from(table as any);

      lines.push('-'.repeat(80));
      lines.push(`TABELA: ${name} (${rows.length} registros)`);
      lines.push('-'.repeat(80));

      if (rows.length === 0) {
        lines.push('  (vazia)');
      } else {
        for (const row of rows) {
          lines.push(JSON.stringify(row, null, 2));
        }
      }
      lines.push('');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      lines.push(`ERRO ao exportar ${name}: ${msg}`);
      lines.push('');
    }
  }

  lines.push('='.repeat(80));
  lines.push('FIM DA EXPORTAÇÃO');
  lines.push('='.repeat(80));

  fs.writeFileSync(OUTPUT_FILE, lines.join('\n'), 'utf-8');
  console.log(`\nExportação concluída! Arquivo: ${OUTPUT_FILE}`);
}

exportAllData()
  .catch((err) => {
    console.error('Erro na exportação:', err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
