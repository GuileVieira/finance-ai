/**
 * Export Category Rules API
 *
 * GET /api/categories/rules/export
 *
 * Exporta todas as regras de categorização em formato JSON estruturado,
 * incluindo as categorias referenciadas e histórico de uso.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { categoryRules, categories } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/get-session';
import { createLogger } from '@/lib/logger';

const log = createLogger('categories-rules-export');

export interface ExportedRule {
  id: string;
  categoryId: string;
  categoryName: string;
  rulePattern: string;
  ruleType: string;
  confidenceScore: number;
  active: boolean;
  sourceType?: string;
  usageCount: number;
  examples?: string[];
  createdAt: string;
  lastUsedAt?: string | null;
}

export interface ExportedCategory {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  parentType?: string | null;
  colorHex?: string | null;
  icon?: string | null;
}

export interface RulesExport {
  version: string;
  exportedAt: string;
  exportedBy?: string;
  companyId: string;
  metadata: {
    totalRules: number;
    totalCategories: number;
    exportType: 'full';
    activeRulesOnly: boolean;
  };
  categories: ExportedCategory[];
  rules: ExportedRule[];
}

export async function GET(request: NextRequest) {
  try {
    const { companyId } = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('activeOnly') !== 'false'; // Default: true

    // 1. Buscar regras
    const rulesQuery = activeOnly
      ? and(
          eq(categoryRules.companyId, companyId),
          eq(categoryRules.active, true)
        )
      : eq(categoryRules.companyId, companyId);

    const rulesData = await db
      .select({
        rule: categoryRules,
        categoryName: categories.name
      })
      .from(categoryRules)
      .innerJoin(categories, eq(categoryRules.categoryId, categories.id))
      .where(rulesQuery);

    if (rulesData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No rules found for this company' },
        { status: 404 }
      );
    }

    // 2. Extrair IDs únicos de categorias
    const categoryIds = [...new Set(rulesData.map(r => r.rule.categoryId))];

    // 3. Buscar categorias completas
    const categoriesData = await db
      .select()
      .from(categories)
      .where(inArray(categories.id, categoryIds));

    // 4. Formatar dados para export
    const exportedCategories: ExportedCategory[] = categoriesData.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      type: cat.type,
      parentType: cat.parentType,
      colorHex: cat.colorHex,
      icon: cat.icon
    }));

    const exportedRules: ExportedRule[] = rulesData.map(({ rule, categoryName }) => ({
      id: rule.id,
      categoryId: rule.categoryId,
      categoryName,
      rulePattern: rule.rulePattern,
      ruleType: rule.ruleType,
      confidenceScore: parseFloat(rule.confidenceScore || '0.80'),
      active: rule.active || false,
      sourceType: rule.sourceType || 'manual',
      usageCount: rule.usageCount || 0,
      examples: (rule.examples as string[]) || [],
      createdAt: rule.createdAt?.toISOString() || new Date().toISOString(),
      lastUsedAt: rule.lastUsedAt?.toISOString() || null
    }));

    // 5. Criar estrutura de export
    const exportData: RulesExport = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      companyId,
      metadata: {
        totalRules: exportedRules.length,
        totalCategories: exportedCategories.length,
        exportType: 'full',
        activeRulesOnly: activeOnly
      },
      categories: exportedCategories,
      rules: exportedRules
    };

    // 6. Retornar JSON
    return NextResponse.json(
      {
        success: true,
        data: exportData
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="rules-export-${companyId}-${Date.now()}.json"`
        }
      }
    );

  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
    log.error({ err: error }, 'Error exporting rules');
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export rules'
      },
      { status: 500 }
    );
  }
}
