#!/usr/bin/env tsx

/**
 * Script dedicado para popular categorias no banco de dados
 * Uso: pnpm db:seed:categories
 *
 * Este script popula o banco de dados com todas as categorias do mock-categories.ts
 * including icons, descriptions e examples
 */

import { config } from 'dotenv';
import { db } from '../lib/db/connection';
import { companies, accounts, categories } from '../lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { mockCategories } from '../lib/mock-categories';

// Carregar variáveis de ambiente
config({ path: '.env.local' });

async function seedCategories() {
  try {
    console.log('🚀 [SEED-CATEGORIES] Iniciando seed de categorias...');

    // Verificar se já existe empresa padrão
    const [existingCompany] = await db.select()
      .from(companies)
      .limit(1);

    if (!existingCompany) {
      console.log('❌ Nenhuma empresa encontrada. Execute a inicialização do banco primeiro.');
      process.exit(1);
    }

    console.log(`🏢 Empresa encontrada: ${existingCompany.name}`);

    // Verificar se já existem categorias para esta empresa
    const existingCategories = await db.select()
      .from(categories)
      .where(and(
        eq(categories.companyId, existingCompany.id),
        eq(categories.isSystem, true)
      ));

    if (existingCategories.length > 0) {
      console.log(`⚠️  Já existem ${existingCategories.length} categorias de sistema.`);

      // Perguntar se deseja recriar as categorias
      console.log('❓ Deseja recriar todas as categorias de sistema?');
      console.log('   Isso irá APAGAR as categorias existentes e criar novas.');
      console.log('   Use: pnpm db:seed:categories --force para forçar a recriação');

      // Verificar se foi passado o flag --force
      const forceIndex = process.argv.indexOf('--force');
      if (forceIndex === -1) {
        console.log('❌ Operação cancelada. Use --force para recriar as categorias.');
        process.exit(0);
      }

      console.log('🗑️  Removendo categorias de sistema existentes...');
      await db.delete(categories).where(and(
        eq(categories.companyId, existingCompany.id),
        eq(categories.isSystem, true)
      ));
      console.log('✅ Categorias existentes removidas');
    }

    // Mapear categorias do mock para o formato do banco
    console.log(`📊 Inserindo ${mockCategories.length} categorias do mock-categories.ts...`);

    const categoriesToInsert = mockCategories.map(cat => ({
      companyId: existingCompany.id,
      name: cat.name,
      description: cat.description,
      type: cat.type,
      colorHex: cat.color,
      icon: cat.icon,
      examples: cat.examples,
      isSystem: true,
      active: true
    }));

    // Inserir categorias em lote
    const result = await db.insert(categories).values(categoriesToInsert).returning();

    console.log(`✅ ${result.length} categorias inseridas com sucesso!`);

    // Estatísticas por tipo
    const stats = mockCategories.reduce((acc, cat) => {
      acc[cat.type] = (acc[cat.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📊 Estatísticas das categorias inseridas:');
    Object.entries(stats).forEach(([type, count]) => {
      const typeNames = {
        revenue: 'Receitas',
        variable_cost: 'Custos Variáveis',
        fixed_cost: 'Custos Fixos',
        non_operating: 'Não Operacionais'
      };
      console.log(`   ${typeNames[type as keyof typeof typeNames] || type}: ${count}`);
    });

    console.log('\n🎉 Seed de categorias concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante o seed de categorias:', error);
    process.exit(1);
  } finally {
    // Encerrar conexão se necessário
    process.exit(0);
  }
}

// Função para mostrar ajuda
function showHelp() {
  console.log(`
📖 Script de Seed de Categorias

Uso: tsx scripts/seed-categories.ts [opções]

Opções:
  --force    Força a recriação das categorias (apaga existentes)
  --help     Mostra esta ajuda

Exemplos:
  tsx scripts/seed-categories.ts                    # Apenas insere se não existir
  tsx scripts/seed-categories.ts --force            # Recria todas as categorias
  pnpm db:seed:categories --force                   # Usando npm script

Requisitos:
  - DATABASE_URL configurada no .env.local
  - Tabelas criadas via migração (pnpm db:migrate)
  - Empresa padrão existente
`);
}

// Verificar se foi pedido ajuda
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Executar seed
seedCategories().catch(console.error);