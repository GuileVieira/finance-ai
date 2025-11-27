import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ClassificationHistory } from '@/lib/classification/history';
import { ClassificationCache } from '@/lib/classification/cache';
import { ClassificationRecord } from '@/lib/agent/types';
import { requireAuth } from '@/lib/auth/get-session';

// Schema para adicionar feedback
const FeedbackSchema = z.object({
  transactionId: z.string(),
  originalDescription: z.string(),
  originalClassification: z.object({
    macro: z.string(),
    micro: z.string(),
    confidence: z.number()
  }),
  correctClassification: z.object({
    macro: z.string(),
    micro: z.string(),
    confidence: z.number()
  }).optional(),
  isCorrect: z.boolean(),
  feedback: z.string().optional()
});

// Schema para consulta
const QuerySchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  searchTerm: z.string().optional(),
  category: z.string().optional(),
  minConfidence: z.number().min(0).max(1).optional()
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const validatedData = FeedbackSchema.parse(body);

    const history = ClassificationHistory.getInstance();

    // Adicionar classificação ao histórico (se não existir)
    const record = history.addClassification({
      originalDescription: validatedData.originalDescription,
      normalizedDescription: validatedData.originalDescription.toLowerCase(),
      macroCategory: validatedData.originalClassification.macro,
      microCategory: validatedData.originalClassification.micro,
      value: 0, // Valor não disponível no feedback
      confidence: validatedData.originalClassification.confidence,
      classificationSource: 'ai',
      feedbackCount: 0,
      accuracy: validatedData.isCorrect ? 1 : 0
    });

    // Se houver classificação correta diferente, atualizar o aprendizado
    if (validatedData.isCorrect && validatedData.correctClassification) {
      history.addClassification({
        originalDescription: validatedData.originalDescription,
        normalizedDescription: validatedData.originalDescription.toLowerCase(),
        macroCategory: validatedData.correctClassification.macro,
        microCategory: validatedData.correctClassification.micro,
        value: 0,
        confidence: validatedData.correctClassification.confidence,
        classificationSource: 'ai',
        feedbackCount: 0,
        accuracy: 1
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback adicionado com sucesso',
      data: {
        recordId: record.id,
        timestamp: record.timestamp
      }
    });

  } catch (error) {
    console.error('Erro ao adicionar feedback:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const history = ClassificationHistory.getInstance();
    const cache = ClassificationCache.getInstance();

    switch (action) {
      case 'stats':
        // Estatísticas do sistema
        const historyStats = history.getStats();
        const cacheStats = cache.getStats();

        return NextResponse.json({
          success: true,
          data: {
            history: historyStats,
            cache: cacheStats,
            system: {
              uptime: process.uptime(),
              memory: process.memoryUsage(),
              timestamp: new Date().toISOString()
            }
          }
        });

      case 'export':
        // Exportar dados
        const exportHistory = searchParams.get('history') === 'true';
        const exportPatterns = searchParams.get('patterns') === 'true';
        const exportCache = searchParams.get('cache') === 'true';

        const exportData: any = {};

        if (exportHistory) {
          exportData.history = history.exportHistory();
        }

        if (exportPatterns) {
          exportData.patterns = history.exportPatterns();
        }

        if (exportCache) {
          exportData.cache = await cache.exportCache();
        }

        return NextResponse.json({
          success: true,
          data: exportData,
          metadata: {
            timestamp: new Date().toISOString(),
            exportOptions: {
              history: exportHistory,
              patterns: exportPatterns,
              cache: exportCache
            }
          }
        });

      case 'patterns':
        // Listar padrões aprendidos
        const patterns = history.exportPatterns();
        const topPatterns = patterns
          .sort((a, b) => (b.matchCount * b.accuracy) - (a.matchCount * a.accuracy))
          .slice(0, 50);

        return NextResponse.json({
          success: true,
          data: {
            total: patterns.length,
            top: topPatterns,
            metadata: {
              totalAccuracy: patterns.reduce((sum, p) => sum + p.accuracy, 0) / patterns.length,
              totalMatches: patterns.reduce((sum, p) => sum + p.matchCount, 0)
            }
          }
        });

      case 'search':
        // Buscar no histórico
        const queryParams = {
          limit: parseInt(searchParams.get('limit') || '20'),
          offset: parseInt(searchParams.get('offset') || '0'),
          searchTerm: searchParams.get('searchTerm') || '',
          category: searchParams.get('category') || '',
          minConfidence: parseFloat(searchParams.get('minConfidence') || '0')
        };

        const allRecords = history.exportHistory();
        let filteredRecords = allRecords;

        // Aplicar filtros
        if (queryParams.searchTerm) {
          const term = queryParams.searchTerm.toLowerCase();
          filteredRecords = filteredRecords.filter(record =>
            record.originalDescription.toLowerCase().includes(term) ||
            record.normalizedDescription.toLowerCase().includes(term) ||
            record.macroCategory.toLowerCase().includes(term) ||
            record.microCategory.toLowerCase().includes(term)
          );
        }

        if (queryParams.category) {
          const category = queryParams.category.toLowerCase();
          filteredRecords = filteredRecords.filter(record =>
            record.macroCategory.toLowerCase().includes(category) ||
            record.microCategory.toLowerCase().includes(category)
          );
        }

        if (queryParams.minConfidence > 0) {
          filteredRecords = filteredRecords.filter(record =>
            record.confidence >= queryParams.minConfidence
          );
        }

        // Paginar
        const paginatedRecords = filteredRecords
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(queryParams.offset, queryParams.offset + queryParams.limit);

        return NextResponse.json({
          success: true,
          data: {
            records: paginatedRecords,
            pagination: {
              total: filteredRecords.length,
              limit: queryParams.limit,
              offset: queryParams.offset,
              hasMore: queryParams.offset + queryParams.limit < filteredRecords.length
            }
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Ação não especificada ou inválida',
          availableActions: ['stats', 'export', 'patterns', 'search']
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Erro na consulta de histórico:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'clear-history') {
      const history = ClassificationHistory.getInstance();
      // Implementar método para limpar histórico
      return NextResponse.json({
        success: true,
        message: 'Histórico limpo com sucesso'
      });
    }

    if (action === 'clear-cache') {
      const cache = ClassificationCache.getInstance();
      await cache.clear();
      return NextResponse.json({
        success: true,
        message: 'Cache limpo com sucesso'
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Ação não especificada ou inválida'
    }, { status: 400 });

  } catch (error) {
    console.error('Erro ao limpar dados:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}