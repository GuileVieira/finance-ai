/**
 * Script para atualizar o campo dreGroup das categorias existentes no banco
 *
 * Mapeamento baseado nas regras contábeis brasileiras:
 * - RoB: Receita Bruta (vendas de produtos e serviços)
 * - TDCF: Tributos/Deduções sobre vendas (COFINS, PIS, ICMS, ISS)
 * - MP: Matéria Prima / Custos Variáveis (comissões, fretes, materiais)
 * - CF: Custos Fixos (salários, aluguéis, manutenções, utilities)
 * - RNOP: Receitas Não Operacionais (rendimentos financeiros, aluguéis recebidos)
 * - DNOP: Despesas Não Operacionais (tarifas bancárias, seguros, custas judiciais)
 *
 * Executar: pnpm tsx scripts/update-categories-dre-group.ts
 */

import 'dotenv/config';
import { db } from '@/lib/db/drizzle';
import { categories } from '@/lib/db/schema';
import { eq, isNull, and, or, ilike } from 'drizzle-orm';

// Mapeamento específico por nome de categoria (tem prioridade sobre tipo)
const specificMappings: Record<string, string | null> = {
  // Tributos sobre vendas → TDCF
  'COFINS': 'TDCF',
  'PIS': 'TDCF',
  'ICMS': 'TDCF',
  'ISS': 'TDCF',

  // Despesas Não Operacionais → DNOP
  'TARIFAS BANCÁRIAS': 'DNOP',
  'SEGUROS DE VIDA': 'DNOP',
  'SEGUROS GERAIS': 'DNOP',
  'CUSTAS JUDICIAIS': 'DNOP',
  'LEASING / FINAME': 'DNOP',
  'CONTRIBUICAO SINDICAL': 'DNOP',
  'OUTROS TRIBUTOS': 'DNOP',
  'OUTRAS DESPESAS NOP': 'DNOP',

  // Receitas Não Operacionais → RNOP
  'Receitas Financeiras': 'RNOP',
  'Receitas de Aluguéis': 'RNOP',

  // Ignorar (não aparece no DRE de fluxo)
  'Saldo Inicial': null,
  'Não Classificado': null,
};

// Mapeamento padrão por tipo de categoria
const typeToGroup: Record<string, string> = {
  'revenue': 'RoB',
  'variable_cost': 'MP',
  'fixed_cost': 'CF',
  'non_operational': 'DNOP',
  'financial_movement': 'DNOP',
};

async function updateCategoriesDreGroup() {
  console.log('🔄 Iniciando atualização do dreGroup nas categorias...\n');

  try {
    // 1. Buscar todas as categorias
    const allCategories = await db.select().from(categories);
    console.log(`📊 Total de categorias encontradas: ${allCategories.length}\n`);

    let updated = 0;
    let skipped = 0;
    let alreadySet = 0;

    for (const cat of allCategories) {
      // Se já tem dreGroup definido, pular
      if (cat.dreGroup) {
        alreadySet++;
        continue;
      }

      // Determinar o dreGroup
      let dreGroup: string | null = null;

      // Primeiro, verificar mapeamento específico por nome
      const specificGroup = specificMappings[cat.name];
      if (specificGroup !== undefined) {
        dreGroup = specificGroup;
      } else {
        // Caso contrário, usar mapeamento por tipo
        dreGroup = typeToGroup[cat.type] || null;
      }

      // Se dreGroup é null explicitamente (como Saldo Inicial), não atualizar
      if (dreGroup === null) {
        console.log(`⏭️  Ignorando: ${cat.name} (sem dreGroup)`);
        skipped++;
        continue;
      }

      // Atualizar no banco
      await db.update(categories)
        .set({ dreGroup })
        .where(eq(categories.id, cat.id));

      console.log(`✅ ${cat.name} → ${dreGroup}`);
      updated++;
    }

    console.log('\n' + '='.repeat(50));
    console.log(`📈 Resumo da atualização:`);
    console.log(`   - Atualizadas: ${updated}`);
    console.log(`   - Ignoradas: ${skipped}`);
    console.log(`   - Já configuradas: ${alreadySet}`);
    console.log('='.repeat(50));

    // 2. Verificar resultado
    const withDreGroup = await db.select().from(categories).where(
      and(
        // dreGroup não é null
        // Como Drizzle não tem isNotNull fácil, usamos SQL raw ou contamos
      )
    );

    const stats = await db.select({
      dreGroup: categories.dreGroup,
    }).from(categories);

    const groupCounts: Record<string, number> = {};
    for (const s of stats) {
      const group = s.dreGroup || 'NULL';
      groupCounts[group] = (groupCounts[group] || 0) + 1;
    }

    console.log('\n📊 Distribuição por dreGroup:');
    for (const [group, count] of Object.entries(groupCounts)) {
      console.log(`   ${group}: ${count} categorias`);
    }

    console.log('\n✅ Atualização concluída com sucesso!');
    console.log('💡 Acesse o dashboard "Fluxo | Real + Projetado" para verificar.');

  } catch (error) {
    console.error('❌ Erro ao atualizar categorias:', error);
    process.exit(1);
  }
}

// Executar
updateCategoriesDreGroup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
