import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db/connection';
import { users, companies, userCompanies, categories, accounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { mockCategories } from '@/lib/mock-categories';
import { signupRateLimiter, getClientIP } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const log = createLogger('auth-signup');

export async function POST(request: Request) {
  // Rate limiting: 3 cadastros por hora por IP
  const clientIP = getClientIP(request);
  const rateLimitResult = signupRateLimiter.check(clientIP);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Muitos cadastros recentes. Tente novamente mais tarde.',
        retryAfter: Math.ceil(rateLimitResult.resetIn / 1000)
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateLimitResult.resetIn / 1000)),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining)
        }
      }
    );
  }

  try {
    const body = await request.json();
    const { name, email, password, companyName } = body;

    // Validações
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Senha deve ter pelo menos 8 caracteres' },
        { status: 400 }
      );
    }

    // Verificar se email já existe
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email já cadastrado' },
        { status: 400 }
      );
    }

    // Criar empresa para o usuário
    const [newCompany] = await db
      .insert(companies)
      .values({
        name: companyName || `Minha Empresa`,
        active: true,
      })
      .returning();

    // Criar usuário com senha hasheada
    const passwordHash = await bcrypt.hash(password, 12);
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email: email.toLowerCase(),
        passwordHash,
        active: true,
      })
      .returning();

    // Associar usuário à empresa como owner
    await db.insert(userCompanies).values({
      userId: newUser.id,
      companyId: newCompany.id,
      role: 'owner',
      isDefault: true,
    });

    // Criar conta bancária padrão (exemplo)
    await db.insert(accounts).values({
      companyId: newCompany.id,
      name: 'Conta Corrente Principal',
      bankName: 'Banco do Brasil',
      bankCode: '001',
      accountNumber: '12345-6',
      accountType: 'checking',
      active: true,
    });

    // Criar categorias padrão para a empresa
    const categoriesToInsert = mockCategories.map((cat) => ({
      companyId: newCompany.id,
      name: cat.name,
      description: cat.description,
      type: cat.type,
      colorHex: cat.color,
      icon: cat.icon,
      examples: cat.examples,
      isSystem: true,
      active: true,
    }));

    await db.insert(categories).values(categoriesToInsert);

    return NextResponse.json(
      {
        success: true,
        message: 'Conta criada com sucesso',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    log.error({ err: error }, 'Error during signup');
    return NextResponse.json(
      { success: false, error: 'Erro ao criar conta' },
      { status: 500 }
    );
  }
}
