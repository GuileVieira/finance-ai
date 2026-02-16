'use server';

import { db } from '@/lib/db/connection';
import { companies, users, userCompanies, accounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth/auth';
import { revalidatePath } from 'next/cache';

async function verifySuperAdmin() {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    throw new Error('Não autorizado. Apenas Super Admins podem realizar esta ação.');
  }
}

export async function getCompanies() {
  await verifySuperAdmin();
  return db.select().from(companies).orderBy(companies.name);
}

export async function createCompany(data: { name: string; cnpj?: string }) {
  await verifySuperAdmin();
  const [newCompany] = await db.insert(companies).values({
    name: data.name,
    cnpj: data.cnpj || null,
    active: true,
  }).returning();

  revalidatePath('/admin/companies');
  return newCompany;
}

export async function updateCompany(id: string, data: { name: string; cnpj?: string; active: boolean }) {
  await verifySuperAdmin();
  const [updated] = await db.update(companies)
    .set({
      name: data.name,
      cnpj: data.cnpj || null,
      active: data.active,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, id))
    .returning();

  revalidatePath('/admin/companies');
  return updated;
}

export async function getUsersWithCompanies() {
  await verifySuperAdmin();
  // Join para trazer usuários e suas empresas vinculadas
  const result = await db
    .select({
      user: users,
      company: companies,
      role: userCompanies.role,
    })
    .from(users)
    .leftJoin(userCompanies, eq(users.id, userCompanies.userId))
    .leftJoin(companies, eq(userCompanies.companyId, companies.id))
    .orderBy(users.name);

  return result;
}

export async function createUserWithCompany(data: { 
  name: string; 
  email: string; 
  passwordHash: string; 
  companyId?: string;
  role?: 'admin' | 'viewer' | 'owner';
}) {
  await verifySuperAdmin();
  
  const [newUser] = await db.insert(users).values({
    name: data.name,
    email: data.email.toLowerCase(),
    passwordHash: data.passwordHash,
    isSuperAdmin: false,
    active: true,
  }).returning();

  if (data.companyId) {
    await db.insert(userCompanies).values({
      userId: newUser.id,
      companyId: data.companyId,
      role: data.role || 'admin',
      isDefault: true,
    });
  }

  revalidatePath('/admin/users');
  return newUser;
}
