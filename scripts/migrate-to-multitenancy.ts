/**
 * Script de migração para multi-tenancy
 *
 * Este script:
 * 1. Busca a empresa existente no banco
 * 2. Cria um usuário admin com as credenciais do .env
 * 3. Associa o usuário à empresa como owner
 *
 * Uso: pnpm tsx scripts/migrate-to-multitenancy.ts
 */

import 'dotenv/config';
import { db } from '../lib/db/connection';
import { users, companies, userCompanies } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function migrateToMultitenancy() {
  console.log('🚀 Iniciando migração para multi-tenancy...\n');

  try {
    // 1. Buscar empresa existente
    const [existingCompany] = await db.select().from(companies).limit(1);

    if (!existingCompany) {
      console.log('❌ Nenhuma empresa encontrada no banco.');
      console.log('   Execute o init-db.ts primeiro para criar uma empresa padrão.');
      process.exit(1);
    }

    console.log(`✅ Empresa encontrada: ${existingCompany.name}`);

    // 2. Verificar se já existe usuário vinculado
    const existingAssociations = await db
      .select()
      .from(userCompanies)
      .where(eq(userCompanies.companyId, existingCompany.id));

    if (existingAssociations.length > 0) {
      console.log('\n⚠️  Já existem usuários vinculados a esta empresa.');
      console.log('   Migração já foi executada anteriormente.');
      process.exit(0);
    }

    // 3. Obter credenciais do .env
    const adminEmail = process.env.AUTH_EMAIL;
    const adminPassword = process.env.AUTH_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.log('\n❌ Credenciais não encontradas no .env');
      console.log('   Defina AUTH_EMAIL e AUTH_PASSWORD no seu .env');
      process.exit(1);
    }

    console.log(`\n📧 Criando usuário admin: ${adminEmail}`);

    // 4. Verificar se usuário já existe
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail.toLowerCase()))
      .limit(1);

    let userId: string;

    if (existingUser) {
      console.log('   Usuário já existe, atualizando...');

      // Atualizar senha se necessário
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await db
        .update(users)
        .set({ passwordHash, active: true })
        .where(eq(users.id, existingUser.id));

      userId = existingUser.id;
    } else {
      // Criar novo usuário
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      const [newUser] = await db
        .insert(users)
        .values({
          name: adminEmail.split('@')[0],
          email: adminEmail.toLowerCase(),
          passwordHash,
          active: true,
        })
        .returning();

      userId = newUser.id;
      console.log('   ✅ Usuário criado com sucesso!');
    }

    // 5. Associar usuário à empresa
    await db.insert(userCompanies).values({
      userId,
      companyId: existingCompany.id,
      role: 'owner',
      isDefault: true,
    });

    console.log('   ✅ Usuário vinculado à empresa como owner!');

    console.log('\n========================================');
    console.log('✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('========================================');
    console.log(`\n📧 Email: ${adminEmail}`);
    console.log(`🔑 Senha: (a mesma definida em AUTH_PASSWORD)`);
    console.log(`🏢 Empresa: ${existingCompany.name}`);
    console.log('\n💡 Agora você pode fazer login no sistema!');

  } catch (error) {
    console.error('\n❌ Erro durante a migração:', error);
    process.exit(1);
  }

  process.exit(0);
}

migrateToMultitenancy();
