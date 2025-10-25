import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { categoryRules, categories, transactions } from '@/lib/db/schema';
import { eq, and, ilike, desc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, description, amount, transactionType } = body;

    // Validações
    if (!companyId || !description) {
      return NextResponse.json({
        success: false,
        error: 'CompanyId e description são obrigatórios'
      }, { status: 400 });
    }

    console.log(`🔍 Buscando sugestões para descrição: "${description}"`);

    // Normalizar descrição para busca
    const normalizedDescription = description.toLowerCase().trim();

    // Buscar regras que correspondem à descrição
    const matchingRules = await db
      .select({
        id: categoryRules.id,
        rulePattern: categoryRules.rulePattern,
        confidence: categoryRules.confidenceScore,
        categoryId: categories.id,
        categoryName: categories.name,
        categoryType: categories.type,
        usageCount: categoryRules.usageCount,
      })
      .from(categoryRules)
      .innerJoin(categories, eq(categoryRules.categoryId, categories.id))
      .where(and(
        eq(categoryRules.companyId, companyId),
        eq(categoryRules.active, true),
        ilike(categoryRules.rulePattern, `%${normalizedDescription}%`)
      ))
      .orderBy(desc(categoryRules.usageCount), desc(categoryRules.confidenceScore))
      .limit(5); // Limitar a 5 sugestões

    console.log(`✅ Encontradas ${matchingRules.length} regras correspondentes`);

    // Calcular scores de matching
    const suggestions = matchingRules.map(rule => {
      const pattern = rule.rulePattern.toLowerCase();
      const desc = normalizedDescription;

      // Score baseado na correspondência exata
      let score = 0;

      // Se o padrão está contido na descrição
      if (desc.includes(pattern)) {
        score += 0.5;
      }

      // Se a descrição contém o padrão
      if (pattern.includes(desc)) {
        score += 0.3;
      }

      // Palavras em comum
      const descWords = desc.split(/\s+/);
      const patternWords = pattern.split(/\s+/);
      const commonWords = descWords.filter(word => patternWords.includes(word));
      const commonWordsRatio = commonWords.length / Math.max(descWords.length, patternWords.length);
      score += commonWordsRatio * 0.2;

      // Aplicar confiança da regra
      const finalScore = score * parseFloat(rule.confidence);

      return {
        categoryId: rule.categoryId,
        categoryName: rule.categoryName,
        categoryType: rule.categoryType,
        confidence: Math.min(finalScore, 1.0),
        source: 'rule',
        ruleId: rule.id,
        rulePattern: rule.rulePattern,
        usageCount: rule.usageCount,
        reasoning: `Correspondência com regra: "${rule.rulePattern}" (${commonWords.length} palavras em comum)`
      };
    });

    // Se não encontrou regras, buscar transações similares
    if (suggestions.length === 0) {
      console.log(`🔍 Nenhuma regra encontrada, buscando transações similares...`);

      const similarTransactions = await db
        .select({
          categoryId: categories.id,
          categoryName: categories.name,
          categoryType: categories.type,
          count: db.raw('COUNT(*)::int').as('count'),
        })
        .from(transactions)
        .innerJoin(categories, eq(transactions.categoryId, categories.id))
        .where(and(
          eq(transactions.companyId, companyId),
          ilike(transactions.description, `%${normalizedDescription}%`)
        ))
        .groupBy(categories.id, categories.name, categories.type)
        .orderBy(desc('count'))
        .limit(3);

      similarTransactions.forEach((trans: any) => {
        suggestions.push({
          categoryId: trans.categoryId,
          categoryName: trans.categoryName,
          categoryType: trans.categoryType,
          confidence: 0.6, // Confiança menor para transações similares
          source: 'similar_transaction',
          usageCount: trans.count,
          reasoning: `Baseado em ${trans.count} transação(ões) similar(es) encontrada(s)`
        });
      });
    }

    // Ordenar por confiança
    suggestions.sort((a, b) => b.confidence - a.confidence);

    console.log(`🎯 ${suggestions.length} sugestões geradas`);

    return NextResponse.json({
      success: true,
      data: {
        suggestions,
        originalDescription: description,
        totalSuggestions: suggestions.length
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar sugestões:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'API de sugestão de categorização',
    endpoint: '/api/categories/suggest',
    method: 'POST',
    body: {
      companyId: 'string (obrigatório) - ID da empresa',
      description: 'string (obrigatório) - Descrição da transação',
      amount: 'number (opcional) - Valor da transação',
      transactionType: 'string (opcional) - Tipo da transação (credit/debit)'
    },
    response: {
      suggestions: [
        {
          categoryId: 'string',
          categoryName: 'string',
          categoryType: 'string',
          confidence: 'number (0-1)',
          source: 'rule|similar_transaction|ai',
          reasoning: 'string'
        }
      ]
    }
  });
}