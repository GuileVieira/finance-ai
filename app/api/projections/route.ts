import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/get-session';
import { db } from '@/lib/db/drizzle';
import { projections } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';

const log = createLogger('projections-api');

// Schema de validação
const projectionSchema = z.object({
  year: z.number().min(2020).max(2100),
  month: z.number().min(1).max(12),
  dreGroup: z.enum(['RoB', 'TDCF', 'MP', 'CF', 'RNOP', 'DNOP']),
  amount: z.number(),
});

const bulkProjectionSchema = z.object({
  year: z.number().min(2020).max(2100),
  month: z.number().min(1).max(12),
  projections: z.array(z.object({
    dreGroup: z.enum(['RoB', 'TDCF', 'MP', 'CF', 'RNOP', 'DNOP']),
    amount: z.number(),
  })),
});

// GET - Listar projeções
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear();
    const companyId = searchParams.get('companyId') || session.companyId;

    const data = await db
      .select()
      .from(projections)
      .where(and(
        eq(projections.year, year),
        companyId && companyId !== 'all' ? eq(projections.companyId, companyId) : undefined
      ))
      .orderBy(projections.month, projections.dreGroup);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    log.error({ err: error }, 'Error listing projections');
    return NextResponse.json(
      { success: false, error: 'Erro ao listar projeções' },
      { status: 500 }
    );
  }
}

// POST - Criar/Atualizar projeção (upsert)
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();

    // Verificar se é bulk ou individual
    if (body.projections) {
      // Bulk upsert
      const parsed = bulkProjectionSchema.parse(body);
      const companyId = session.companyId;

      const results = [];
      for (const proj of parsed.projections) {
        // Tentar atualizar, se não existir, inserir
        const existing = await db
          .select()
          .from(projections)
          .where(and(
            eq(projections.companyId, companyId),
            eq(projections.year, parsed.year),
            eq(projections.month, parsed.month),
            eq(projections.dreGroup, proj.dreGroup)
          ))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(projections)
            .set({ amount: proj.amount.toString(), updatedAt: new Date() })
            .where(eq(projections.id, existing[0].id));
          results.push({ ...existing[0], amount: proj.amount });
        } else {
          const [created] = await db
            .insert(projections)
            .values({
              companyId,
              year: parsed.year,
              month: parsed.month,
              dreGroup: proj.dreGroup,
              amount: proj.amount.toString(),
            })
            .returning();
          results.push(created);
        }
      }

      return NextResponse.json({ success: true, data: results });
    } else {
      // Individual upsert
      const parsed = projectionSchema.parse(body);
      const companyId = session.companyId;

      const existing = await db
        .select()
        .from(projections)
        .where(and(
          eq(projections.companyId, companyId),
          eq(projections.year, parsed.year),
          eq(projections.month, parsed.month),
          eq(projections.dreGroup, parsed.dreGroup)
        ))
        .limit(1);

      let result;
      if (existing.length > 0) {
        [result] = await db
          .update(projections)
          .set({ amount: parsed.amount.toString(), updatedAt: new Date() })
          .where(eq(projections.id, existing[0].id))
          .returning();
      } else {
        [result] = await db
          .insert(projections)
          .values({
            companyId,
            year: parsed.year,
            month: parsed.month,
            dreGroup: parsed.dreGroup,
            amount: parsed.amount.toString(),
          })
          .returning();
      }

      return NextResponse.json({ success: true, data: result });
    }
  } catch (error) {
    log.error({ err: error }, 'Error creating/updating projection');
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar projeção' },
      { status: 500 }
    );
  }
}

// DELETE - Remover projeções de um mês
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '0');
    const month = parseInt(searchParams.get('month') || '0');

    if (!year || !month) {
      return NextResponse.json(
        { success: false, error: 'Ano e mês são obrigatórios' },
        { status: 400 }
      );
    }

    await db
      .delete(projections)
      .where(and(
        eq(projections.companyId, session.companyId),
        eq(projections.year, year),
        eq(projections.month, month)
      ));

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ err: error }, 'Error deleting projections');
    return NextResponse.json(
      { success: false, error: 'Erro ao deletar projeções' },
      { status: 500 }
    );
  }
}
