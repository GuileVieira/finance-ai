import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from '@/lib/auth/get-session';
import { TutorialState } from '@/lib/types/tutorial';

// GET - Buscar estado do tutorial do usuário
export async function GET() {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Não autenticado'
      }, { status: 401 });
    }

    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        tutorialState: user.tutorialState as TutorialState | null
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar estado do tutorial:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// PUT - Atualizar estado do tutorial do usuário
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Não autenticado'
      }, { status: 401 });
    }

    const body = await request.json();
    const tutorialState = body.tutorialState as TutorialState;

    // Validação básica do estado
    if (!tutorialState || typeof tutorialState !== 'object') {
      return NextResponse.json({
        success: false,
        error: 'Estado do tutorial inválido'
      }, { status: 400 });
    }

    // Atualizar estado do tutorial
    const [updatedUser] = await db.update(users)
      .set({
        tutorialState: tutorialState,
        updatedAt: new Date()
      })
      .where(eq(users.id, session.userId))
      .returning();

    if (!updatedUser) {
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        tutorialState: updatedUser.tutorialState as TutorialState
      }
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar estado do tutorial:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}
