import { auth } from '@/lib/auth/auth';

export interface AuthSession {
  userId: string;
  companyId: string;
  email: string;
  name: string;
}

export async function getServerSession(): Promise<AuthSession | null> {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return {
    userId: session.user.id,
    companyId: session.user.companyId ?? '',
    email: session.user.email ?? '',
    name: session.user.name ?? '',
  };
}

export async function requireAuth(): Promise<AuthSession> {
  const session = await getServerSession();

  if (!session) {
    throw new Error('Não autenticado');
  }

  if (!session.companyId) {
    throw new Error('Usuário sem empresa vinculada');
  }

  return session;
}
