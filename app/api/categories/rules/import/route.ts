/**
 * Import Category Rules API
 *
 * POST /api/categories/rules/import
 *
 * Importa regras de categorização de um arquivo JSON exportado,
 * com opções para lidar com conflitos e categorias ausentes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { categoryRules, categories } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RulesExport, ExportedRule, ExportedCategory } from '../export/route';
import { requireAuth } from '@/lib/auth/get-session';

export interface ImportOptions {
  conflictStrategy: 'skip' | 'replace' | 'merge'; // Como lidar com regras duplicadas
  createMissingCategories: boolean; // Criar categorias ausentes
  dryRun: boolean; // Apenas preview, não aplica mudanças
}

export interface ImportResult {
  success: boolean;
  summary: {
    totalRulesInFile: number;
    totalCategoriesInFile: number;
    rulesImported: number;
    rulesSkipped: number;
    rulesReplaced: number;
    categoriesCreated: number;
    categoriesMapped: number;
  };
  details: {
    imported: string[]; // Patterns importados
    skipped: Array<{ pattern: string; reason: string }>;
    replaced: string[];
    categoriesCreated: string[];
  };
  errors?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { companyId } = await requireAuth();
    const body = await request.json();
    const { importData, options }: { importData: RulesExport; options: ImportOptions } = body;

    // 1. Validações básicas
    const validation = validateImportData(importData);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const {
      conflictStrategy = 'skip',
      createMissingCategories = true,
      dryRun = false
    } = options;

    // 2. Preparar resultado
    const result: ImportResult = {
      success: true,
      summary: {
        totalRulesInFile: importData.rules.length,
        totalCategoriesInFile: importData.categories.length,
        rulesImported: 0,
        rulesSkipped: 0,
        rulesReplaced: 0,
        categoriesCreated: 0,
        categoriesMapped: 0
      },
      details: {
        imported: [],
        skipped: [],
        replaced: [],
        categoriesCreated: []
      },
      errors: []
    };

    // 3. Processar categorias
    const categoryMapping = await processCategoriesImport(
      importData.categories,
      companyId,
      createMissingCategories,
      dryRun
    );

    result.summary.categoriesCreated = categoryMapping.created.length;
    result.summary.categoriesMapped = categoryMapping.mapped.length;
    result.details.categoriesCreated = categoryMapping.created.map(c => c.name);

    // 4. Processar regras
    for (const rule of importData.rules) {
      try {
        // Mapear categoryId
        const newCategoryId = categoryMapping.idMap[rule.categoryId];
        if (!newCategoryId) {
          result.details.skipped.push({
            pattern: rule.rulePattern,
            reason: `Category "${rule.categoryName}" not found and createMissingCategories=false`
          });
          result.summary.rulesSkipped++;
          continue;
        }

        // Verificar conflito
        const existingRule = await findConflictingRule(
          rule.rulePattern,
          newCategoryId,
          companyId
        );

        if (existingRule) {
          // Lidar com conflito baseado na estratégia
          switch (conflictStrategy) {
            case 'skip':
              result.details.skipped.push({
                pattern: rule.rulePattern,
                reason: 'Rule already exists (conflict strategy: skip)'
              });
              result.summary.rulesSkipped++;
              continue;

            case 'replace':
              if (!dryRun) {
                await db
                  .update(categoryRules)
                  .set({
                    confidenceScore: rule.confidenceScore.toFixed(2),
                    active: rule.active,
                    ruleType: rule.ruleType,
                    sourceType: rule.sourceType || 'imported',
                    examples: rule.examples || [],
                    updatedAt: new Date()
                  })
                  .where(eq(categoryRules.id, existingRule.id));
              }
              result.details.replaced.push(rule.rulePattern);
              result.summary.rulesReplaced++;
              continue;

            case 'merge':
              // Merge: atualizar apenas se nova regra tem maior confidence
              if (rule.confidenceScore > parseFloat(existingRule.confidenceScore || '0')) {
                if (!dryRun) {
                  await db
                    .update(categoryRules)
                    .set({
                      confidenceScore: rule.confidenceScore.toFixed(2),
                      updatedAt: new Date()
                    })
                    .where(eq(categoryRules.id, existingRule.id));
                }
                result.details.replaced.push(rule.rulePattern);
                result.summary.rulesReplaced++;
              } else {
                result.details.skipped.push({
                  pattern: rule.rulePattern,
                  reason: 'Existing rule has higher confidence (conflict strategy: merge)'
                });
                result.summary.rulesSkipped++;
              }
              continue;
          }
        }

        // Criar nova regra
        if (!dryRun) {
          await db.insert(categoryRules).values({
            categoryId: newCategoryId,
            companyId,
            rulePattern: rule.rulePattern,
            ruleType: rule.ruleType,
            confidenceScore: rule.confidenceScore.toFixed(2),
            active: rule.active,
            usageCount: 0, // Reset usage count na importação
            sourceType: rule.sourceType || 'imported',
            matchFields: ['description', 'memo', 'name'],
            examples: rule.examples || [],
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        result.details.imported.push(rule.rulePattern);
        result.summary.rulesImported++;

      } catch (error) {
        result.errors = result.errors || [];
        result.errors.push(
          `Error importing rule "${rule.rulePattern}": ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // 5. Retornar resultado
    return NextResponse.json({
      success: true,
      data: result,
      message: dryRun
        ? 'Dry run completed - no changes applied'
        : `Import completed: ${result.summary.rulesImported} imported, ${result.summary.rulesSkipped} skipped, ${result.summary.rulesReplaced} replaced`
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
    console.error('[IMPORT-ERROR]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import rules'
      },
      { status: 500 }
    );
  }
}

/**
 * Valida estrutura do JSON de import
 */
function validateImportData(data: RulesExport): { valid: boolean; error?: string } {
  if (!data) {
    return { valid: false, error: 'Import data is required' };
  }

  if (!data.version) {
    return { valid: false, error: 'Missing version field' };
  }

  if (data.version !== '1.0') {
    return { valid: false, error: `Unsupported version: ${data.version}. Expected: 1.0` };
  }

  if (!Array.isArray(data.rules)) {
    return { valid: false, error: 'Missing or invalid rules array' };
  }

  if (!Array.isArray(data.categories)) {
    return { valid: false, error: 'Missing or invalid categories array' };
  }

  return { valid: true };
}

/**
 * Processa importação de categorias
 */
async function processCategoriesImport(
  importedCategories: ExportedCategory[],
  companyId: string,
  createMissing: boolean,
  dryRun: boolean
): Promise<{
  idMap: Record<string, string>; // oldId → newId
  created: ExportedCategory[];
  mapped: ExportedCategory[];
}> {
  const idMap: Record<string, string> = {};
  const created: ExportedCategory[] = [];
  const mapped: ExportedCategory[] = [];

  for (const importedCat of importedCategories) {
    // Tentar encontrar categoria existente por nome
    const [existing] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.name, importedCat.name),
          eq(categories.companyId, companyId)
        )
      )
      .limit(1);

    if (existing) {
      // Categoria já existe - mapear IDs
      idMap[importedCat.id] = existing.id;
      mapped.push(importedCat);
    } else if (createMissing) {
      // Criar categoria
      if (!dryRun) {
        const [newCategory] = await db
          .insert(categories)
          .values({
            companyId,
            name: importedCat.name,
            description: importedCat.description,
            type: importedCat.type,
            parentType: importedCat.parentType,
            colorHex: importedCat.colorHex || '#6366F1',
            icon: importedCat.icon || '📊',
            active: true,
            isSystem: false
          })
          .returning();

        idMap[importedCat.id] = newCategory.id;
      } else {
        // Dry run - simular ID
        idMap[importedCat.id] = `dry-run-${importedCat.id}`;
      }
      created.push(importedCat);
    }
    // Se não existe e createMissing=false, não adiciona ao idMap (será tratado como erro)
  }

  return { idMap, created, mapped };
}

/**
 * Busca regra conflitante
 */
async function findConflictingRule(
  pattern: string,
  categoryId: string,
  companyId: string
): Promise<any> {
  const [existing] = await db
    .select()
    .from(categoryRules)
    .where(
      and(
        eq(categoryRules.rulePattern, pattern),
        eq(categoryRules.categoryId, categoryId),
        eq(categoryRules.companyId, companyId)
      )
    )
    .limit(1);

  return existing;
}
