import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { db } from '../lib/db/connection';
import { companies, accounts, userCompanies, users } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function seedInitialData() {
  console.log('🌱 Iniciando seed básico do banco novo...');

  try {
    // 1. Criar Empresa Padrão
    console.log('🏢 Criando empresa padrão...');
    const [company] = await db.insert(companies).values({
      name: 'Minha Empresa Standalone',
      cnpj: '00000000000000',
      active: true,
    }).returning();
    console.log(`✅ Empresa criada: ${company.name} (${company.id})`);

    // 2. Criar Conta Bancária
    console.log('🏦 Criando conta bancária padrão...');
    const [account] = await db.insert(accounts).values({
      companyId: company.id,
      name: 'Conta Principal (Minio Storage)',
      bankName: 'Banco Digital',
      bankCode: '999',
      accountNumber: '123456-7',
      accountType: 'checking',
      active: true,
    }).returning();
    console.log(`✅ Conta criada: ${account.name} (${account.id})`);

    // 3. Vincular usuários existentes à empresa (opcional, mas útil para testes)
    const allUsers = await db.select().from(users);
    if (allUsers.length > 0) {
      console.log(`👥 Vinculando ${allUsers.length} usuários à nova empresa...`);
      for (const user of allUsers) {
        // Verificar se já está vinculado
        const [existing] = await db.select().from(userCompanies)
          .where(eq(userCompanies.userId, user.id))
          .limit(1);
        
        if (!existing) {
          await db.insert(userCompanies).values({
            userId: user.id,
            companyId: company.id,
            role: 'admin'
          });
        }
      }
      console.log('✅ Usuários vinculados.');
    }

    console.log('\n🎉 Seed básico concluído com sucesso!');
    console.log('👉 Agora você pode rodar: pnpm db:seed:categories');

  } catch (error) {
    console.error('❌ Erro no seed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedInitialData();
