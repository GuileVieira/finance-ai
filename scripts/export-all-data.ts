/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });

import * as fs from 'fs';
import * as path from 'path';

/**
 * Script de Auditoria e Exportação Total
 * * Este script exporta todas as tabelas do banco e verifica a integridade 
 * do prompt da IA antes da execução para detectar problemas de cache.
 */
async function exportAllData() {
  // Conexão dinâmica para evitar problemas de pré-carregamento
  const { db } = await import('../lib/db/connection');
  const schema = await import('../lib/db/schema');
  const { AgentPrompts } = await import('../lib/agent/prompts');

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

  const OUTPUT_FILE = path.resolve(process.cwd(), 'export-database.txt');
  const lines: string[] = [];

  // --- LOGICA DE VERIFICAÇÃO DE PROMPT (DNA CHECK) ---
  const currentPrompt = AgentPrompts.buildMainPrompt([], []);
  const isHardened = currentPrompt.includes('Auditor Contábil Sênior');
  const checkStatus = isHardened 
    ? '✅ ATUALIZADO (Auditor Contábil Sênior)' 
    : '❌ DESATUALIZADO (Especialista em Finanças)';

  console.log('\n' + '='.repeat(50));
  console.log('🔍 AUDITORIA DE PROMPT ATIVO');
  console.log(`STATUS: ${checkStatus}`);
  console.log('='.repeat(50) + '\n');

  lines.push('='.repeat(80));
  lines.push(`EXPORTAÇÃO COMPLETA DO BANCO DE DADOS`);
  lines.push(`Data: ${new Date().toISOString()}`);
  lines.push(`Verificação de Prompt: ${checkStatus}`);
  lines.push('='.repeat(80));
  lines.push('');

  // Iteração sobre as tabelas
  for (const { name, table } of tables) {
    try {
      console.log(`Exportando tabela: ${name}...`);
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
      console.error(`❌ Erro em ${name}: ${msg}`);
      lines.push(`ERRO ao exportar ${name}: ${msg}`);
      lines.push('');
    }
  }

  lines.push('='.repeat(80));
  lines.push('FIM DA EXPORTAÇÃO');
  lines.push('='.repeat(80));

  fs.writeFileSync(OUTPUT_FILE, lines.join('\n'));
  console.log(`\n🎉 Exportação concluída com sucesso em: ${OUTPUT_FILE}`);
}

// Execução com tratamento de erro global
exportAllData().catch((err) => {
  console.error('💥 Erro fatal no script de exportação:');
  console.error(err);
  process.exit(1);
});