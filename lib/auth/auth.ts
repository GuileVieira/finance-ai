import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db/connection';
import { users, userCompanies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, (credentials.email as string).toLowerCase()))
          .limit(1);

        if (!user?.passwordHash || !user.active) {
          return null;
        }

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!valid) {
          return null;
        }

        // Buscar company padrão do usuário
        const [uc] = await db
          .select()
          .from(userCompanies)
          .where(eq(userCompanies.userId, user.id))
          .limit(1);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          companyId: uc?.companyId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Primeira vez: user vem do authorize
      if (user) {
        token.id = user.id;
        token.companyId = user.companyId;
      }
      return token;
    },
    async session({ session, token }) {
      // Passa dados do JWT para a sessão
      session.user.id = token.id as string;
      session.user.companyId = token.companyId as string | null;
      return session;
    },
  },
});
