/**
 * Script para consultar e analisar regras de categorização
 * Uso: pnpm tsx .claude/skills/rule-validator/scripts/query-rules.ts [--problems] [--summary] [--category <id>]
 */

import { db } from '../../../../lib/db/connection';
import { categoryRules, categories } from '../../../../lib/db/schema';
import { eq, desc, sql, and, lt, isNull, or } from 'drizzle-orm';

interface RuleWithCategory {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  rulePattern: string;
  ruleType: string;
  confidenceScore: string | null;
  status: string | null;
  active: boolean | null;
  usageCount: number | null;
  validationCount: number | null;
  negativeCount: number | null;
  lastUsedAt: Date | null;
  sourceType: string | null;
  patternStrategy: string | null;
  createdAt: Date | null;
  examples: unknown;
}

interface RuleHealth {
  rule: RuleWithCategory;
  precision: number;
  usage: number;
  recency: number;
  health: number;
  problems: string[];
  recommendation: 'keep' | 'review' | 'deactivate';
}

// Palavras genéricas que não devem ser usadas sozinhas
const GENERIC_WORDS = [
  'PAGAMENTO', 'TRANSFERENCIA', 'PIX', 'TED', 'DOC', 'DEBITO', 'CREDITO',
  'BANCO', 'TARIFA', 'TAXA', 'COMPRA', 'VENDA', 'SALDO', 'EXTRATO',
  'DEPOSITO', 'SAQUE', 'CARTAO', 'FATURA', 'BOLETO', 'COBRANCA'
];

function calculateHealth(rule: RuleWithCategory): RuleHealth {
  const validationCount = rule.validationCount ?? 0;
  const negativeCount = rule.negativeCount ?? 0;
  const usageCount = rule.usageCount ?? 0;
  const total = validationCount + negativeCount;

  // Precisão
  const precision = total > 0 ? validationCount / total : 0.5;

  // Uso (escala logarítmica)
  const usage = Math.min(1, Math.log10(usageCount + 1) / 2);

  // Recência
  let recency = 1;
  if (rule.lastUsedAt) {
    const daysSinceUse = (Date.now() - new Date(rule.lastUsedAt).getTime()) / (1000 * 60 * 60 * 24);
    recency = Math.max(0, 1 - daysSinceUse / 90);
  } else {
    recency = 0.5; // Se nunca usado, assume meio termo
  }

  // Health score
  const health = (precision * 0.5) + (usage * 0.3) + (recency * 0.2);

  // Detectar problemas
  const problems: string[] = [];

  // 1. Regra genérica
  const patternUpper = rule.rulePattern.toUpperCase();
  const isGeneric = GENERIC_WORDS.some(word => {
    const pattern = patternUpper.replace(/[*?]/g, '').trim();
    return pattern === word || pattern.split(/\s+/).every(w => GENERIC_WORDS.includes(w));
  });
  if (isGeneric) {
    problems.push('GENÉRICA: Padrão contém apenas palavras genéricas');
  }

  // 2. Baixa precisão
  if (total >= 5 && precision < 0.4) {
    problems.push(`BAIXA_PRECISÃO: ${(precision * 100).toFixed(0)}% de acerto`);
  }

  // 3. Alta rejeição
  if (negativeCount > 0 && negativeCount >= validationCount * 2) {
    problems.push(`ALTA_REJEIÇÃO: ${negativeCount} rejeições vs ${validationCount} aceites`);
  }

  // 4. Obsoleta
  if (rule.lastUsedAt) {
    const daysSinceUse = (Date.now() - new Date(rule.lastUsedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUse > 90) {
      problems.push(`OBSOLETA: Não usada há ${Math.floor(daysSinceUse)} dias`);
    }
  } else if (rule.createdAt) {
    const daysSinceCreation = (Date.now() - new Date(rule.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation > 30 && usageCount === 0) {
      problems.push('SEM_USO: Criada há mais de 30 dias e nunca usada');
    }
  }

  // 5. Candidata não promovida
  if (rule.status === 'candidate' && rule.createdAt) {
    const daysSinceCreation = (Date.now() - new Date(rule.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation > 30) {
      problems.push('CANDIDATA_ANTIGA: Candidata há mais de 30 dias sem promoção');
    }
  }

  // 6. Padrão muito curto
  const cleanPattern = rule.rulePattern.replace(/[*?]/g, '').trim();
  if (cleanPattern.length < 3) {
    problems.push('PADRÃO_CURTO: Menos de 3 caracteres significativos');
  }

  // 7. Categoria ausente
  if (!rule.categoryId || !rule.categoryName) {
    problems.push('ÓRFÃ: Categoria não encontrada');
  }

  // Recomendação
  let recommendation: 'keep' | 'review' | 'deactivate' = 'keep';
  if (health < 0.3 || precision < 0.4 || problems.some(p => p.startsWith('ÓRFÃ') || p.startsWith('ALTA_REJEIÇÃO'))) {
    recommendation = 'deactivate';
  } else if (health < 0.6 || precision < 0.7 || problems.length > 0) {
    recommendation = 'review';
  }

  return { rule, precision, usage, recency, health, problems, recommendation };
}

async function main() {
  if (!db) {
    console.error('❌ DATABASE_URL não configurado');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const showOnlyProblems = args.includes('--problems');
  const showSummary = args.includes('--summary');
  const categoryIndex = args.indexOf('--category');
  const filterCategory = categoryIndex !== -1 ? args[categoryIndex + 1] : null;

  console.log('🔍 Consultando regras de categorização...\n');

  // Buscar regras com nome da categoria
  let query = db
    .select({
      id: categoryRules.id,
      categoryId: categoryRules.categoryId,
      categoryName: categories.name,
      rulePattern: categoryRules.rulePattern,
      ruleType: categoryRules.ruleType,
      confidenceScore: categoryRules.confidenceScore,
      status: categoryRules.status,
      active: categoryRules.active,
      usageCount: categoryRules.usageCount,
      validationCount: categoryRules.validationCount,
      negativeCount: categoryRules.negativeCount,
      lastUsedAt: categoryRules.lastUsedAt,
      sourceType: categoryRules.sourceType,
      patternStrategy: categoryRules.patternStrategy,
      createdAt: categoryRules.createdAt,
      examples: categoryRules.examples,
    })
    .from(categoryRules)
    .leftJoin(categories, eq(categoryRules.categoryId, categories.id))
    .orderBy(desc(categoryRules.usageCount));

  const rules = await query;

  // Calcular health de cada regra
  const rulesHealth = rules.map(r => calculateHealth(r as RuleWithCategory));

  // Filtrar se necessário
  let filteredRules = rulesHealth;
  if (showOnlyProblems) {
    filteredRules = rulesHealth.filter(r => r.problems.length > 0);
  }
  if (filterCategory) {
    filteredRules = filteredRules.filter(r => r.rule.categoryId === filterCategory);
  }

  // Estatísticas
  const total = rulesHealth.length;
  const healthy = rulesHealth.filter(r => r.recommendation === 'keep').length;
  const needsReview = rulesHealth.filter(r => r.recommendation === 'review').length;
  const needsDeactivation = rulesHealth.filter(r => r.recommendation === 'deactivate').length;
  const activeRules = rulesHealth.filter(r => r.rule.active).length;
  const candidateRules = rulesHealth.filter(r => r.rule.status === 'candidate').length;

  // Exibir resumo
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    RESUMO DE REGRAS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📊 Total de regras: ${total}`);
  console.log(`✅ Saudáveis: ${healthy} (${((healthy/total)*100).toFixed(0)}%)`);
  console.log(`⚠️  Revisar: ${needsReview} (${((needsReview/total)*100).toFixed(0)}%)`);
  console.log(`❌ Desativar: ${needsDeactivation} (${((needsDeactivation/total)*100).toFixed(0)}%)`);
  console.log(`🔵 Ativas: ${activeRules}`);
  console.log(`🟡 Candidatas: ${candidateRules}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (showSummary) {
    // Problemas mais comuns
    const problemCounts: Record<string, number> = {};
    rulesHealth.forEach(r => {
      r.problems.forEach(p => {
        const type = p.split(':')[0];
        problemCounts[type] = (problemCounts[type] || 0) + 1;
      });
    });

    console.log('📋 PROBLEMAS MAIS COMUNS:');
    Object.entries(problemCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`   ${type}: ${count} regras`);
      });
    console.log('');
    return;
  }

  // Exibir regras
  console.log(`\n📋 DETALHES DAS REGRAS ${showOnlyProblems ? '(apenas com problemas)' : ''}:\n`);

  for (const { rule, precision, health, problems, recommendation } of filteredRules) {
    const statusIcon = recommendation === 'keep' ? '✅' : recommendation === 'review' ? '⚠️' : '❌';
    const activeIcon = rule.active ? '🔵' : '⚪';

    console.log('───────────────────────────────────────────────────────────────');
    console.log(`${statusIcon} ${activeIcon} Regra: ${rule.id}`);
    console.log(`   📝 Padrão: "${rule.rulePattern}" (${rule.ruleType})`);
    console.log(`   📁 Categoria: ${rule.categoryName || 'N/A'}`);
    console.log(`   📊 Status: ${rule.status} | Origem: ${rule.sourceType}`);
    console.log(`   💪 Health: ${(health * 100).toFixed(0)}% | Precisão: ${(precision * 100).toFixed(0)}%`);
    console.log(`   📈 Uso: ${rule.usageCount || 0}x | ✓${rule.validationCount || 0} ✗${rule.negativeCount || 0}`);
    console.log(`   🕐 Último uso: ${rule.lastUsedAt ? new Date(rule.lastUsedAt).toLocaleDateString('pt-BR') : 'Nunca'}`);

    if (problems.length > 0) {
      console.log(`   ⚠️  PROBLEMAS:`);
      problems.forEach(p => console.log(`      - ${p}`));
    }

    if (rule.examples && Array.isArray(rule.examples) && rule.examples.length > 0) {
      console.log(`   📌 Exemplos: ${(rule.examples as string[]).slice(0, 2).join(', ')}`);
    }

    console.log(`   💡 Recomendação: ${recommendation.toUpperCase()}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('Uso: pnpm tsx .claude/skills/rule-validator/scripts/query-rules.ts');
  console.log('  --problems   Mostrar apenas regras com problemas');
  console.log('  --summary    Mostrar apenas resumo estatístico');
  console.log('  --category <id>   Filtrar por categoria');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
