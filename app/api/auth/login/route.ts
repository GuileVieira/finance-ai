import { NextResponse } from 'next/server';
import { loginRateLimiter, getClientIP } from '@/lib/rate-limit';

export async function POST(request: Request) {
  // Rate limiting: 5 tentativas por minuto por IP
  const clientIP = getClientIP(request);
  const rateLimitResult = loginRateLimiter.check(clientIP);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
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
    const { email, password } = await request.json();

    // Validações básicas
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Obter credenciais do .env
    const authEmail = process.env.AUTH_EMAIL;
    const authPassword = process.env.AUTH_PASSWORD;

    if (!authEmail || !authPassword) {
      console.error('Credenciais de autenticação não configuradas no .env');
      return NextResponse.json(
        { success: false, error: 'Erro de configuração do servidor' },
        { status: 500 }
      );
    }

    // Validar credenciais
    if (email === authEmail && password === authPassword) {
      return NextResponse.json({
        success: true,
        user: {
          email,
          name: email.split('@')[0],
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Email ou senha incorretos' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
