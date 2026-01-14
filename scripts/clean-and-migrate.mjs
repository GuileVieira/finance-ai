/**
 * Script para limpar e recriar banco de dados PostgreSQL
 * Execute: pnpm db:reset
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';
import * as schema from '../lib/db/schema.ts';

config({ path: '.env.local' });

async function cleanAndMigrate() {
  console.log('🗑️ Limpando e recriando banco de dados...');

  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL não encontrada no .env');
    }

    console.log(`📍 Conectando ao PostgreSQL: ${databaseUrl}`);

    const db = drizzle(databaseUrl, { schema });

    // Limpar tabelas existentes
    console.log('🧹 Limpando tabelas existentes...');

    const tables = [
      'financeai_users',
      'financeai_companies',
      'financeai_accounts',
      'financeai_categories',
      'financeai_transactions',
      'financeai_uploads',
      'financeai_category_rules'
    ];

    for (const table of tables) {
      console.log(`  Removendo: ${table}`);
      await db.execute(sql`DROP TABLE IF EXISTS ${sql.identifier(table)} CASCADE`);
    }

    console.log('✅ Tabelas limpas');

    // Recriar tabelas
    console.log('🏗️ Recriando tabelas com migration...');
    const { migrate } = await import('drizzle-orm/node-postgres/migrator');

    // Criar pasta de migrações se não existir
    const fs = await import('fs');
    const migrationsDir = './lib/db/migrations';

    // Limpar pasta de migrações para começar do zero
    if (fs.existsSync(migrationsDir)) {
      const files = await fs.readdir(migrationsDir);
      for (const file of files) {
        const filePath = `${migrationsDir}/${file}`;
        await fs.unlink(filePath);
      }
      console.log('📁 Pasta de migrações limpa');
    }

    // Recriar tabelas com migration
    await migrate(db, { migrationsFolder: './lib/db/migrations' });

    console.log('✅ Migração concluída com sucesso!');

    // Inserir dados iniciais
    console.log('📝 Inserindo dados iniciais...');

    // Inserir empresa padrão
    const [existingCompany] = await db.select().from(schema.companies).limit(1);

    let company;
    if (!existingCompany) {
      const [newCompany] = await db.insert(schema.companies).values({
        name: 'Empresa Padrão',
        cnpj: '00000000000000',
        corporateName: 'Empresa Padrão LTDA',
        active: true
      }).returning();

      company = newCompany;
      console.log('✅ Empresa padrão criada:', newCompany.name);
    } else {
      company = existingCompany;
      console.log('✅ Empresa já existe:', company.name);
    }

    // Inserir conta padrão
    const [existingAccount] = await db.select()
      .from(schema.accounts)
      .where(eq(schema.accounts.companyId, company.id))
      .limit(1);

    if (!existingAccount) {
      const [newAccount] = await db.insert(schema.accounts).values({
        companyId: company.id,
        name: 'Conta Principal',
        bankName: 'Banco Exemplo',
        bankCode: '001',
        accountNumber: '12345-6',
        accountType: 'checking',
        active: true
      }).returning();

      console.log('✅ Conta padrão criada:', newAccount.name);
    } else {
      console.log('✅ Conta já existe:', existingAccount.name);
    }

    // Inserir categorias padrão
    const [categoriesCount] = await db.select({ count: 1 })
      .from(schema.categories)
      .where(eq(schema.categories.companyId, company.id));

    if (categoriesCount.count === 0) {
      console.log('📊 Inserindo 12 categorias padrão...');

      const defaultCategories = [
        { name: 'Vendas de Produtos', type: 'revenue', colorHex: '#059669' },
        { name: 'Comissões e Variáveis', type: 'variable_cost', colorHex: '#D97706' },
        { name: 'Custos de Produtos', type: 'variable_cost', colorHex: '#B45309' },
        { name: 'Logística e Distribuição', type: 'variable_cost', colorHex: '#92400E' },
        { name: 'Salários e Encargos', type: 'fixed_cost', colorHex: '#DC2626' },
        { name: 'Aluguel e Ocupação', type: 'fixed_cost', colorHex: '#B91C1C' },
        { name: 'Tecnologia e Software', type: 'fixed_cost', colorHex: '#991B1B' },
        { name: 'Serviços Profissionais', type: 'fixed_cost', colorHex: '#7F1D1D' },
        { name: 'Tributos e Contribuições', type: 'fixed_cost', colorHex: '#C2410C' },
        { name: 'Utilidades e Insumos', type: 'non_operational', colorHex: '#6B7280' },
        { name: 'Manutenção e Serviços', type: 'non_operational', colorHex: '#4B5563' },
        { name: 'Financeiros e Bancários', type: 'non_operational', colorHex: '#374151' }
      ];

      await db.insert(schema.categories).values(
        defaultCategories.map(cat => ({
          companyId: company.id,
          name: cat.name,
          type: cat.type,
          colorHex: cat.colorHex,
          isSystem: true,
          active: true
        }))
      );

      console.log('✅ 12 categorias inseridas');
    } else {
      console.log('✅ Categorias já existem:', categoriesCount.count);
    }

    // Verificar dados finais
    const [finalStats] = await db.select({
      companies: { count: sql`count(*)` }.from(schema.companies),
      accounts: { count: sql`count(*)` }.from(schema.accounts),
      categories: { count: sql`count(*)` }.from(schema.categories),
      transactions: { count: sql`count(*)` }.from(schema.transactions)
    }).from(schema.companies);

    console.log('\n📊 Estatísticas finais:');
    console.log(`🏢 Empresas: ${finalStats[0].companies}`);
    console.log(`🏦 Contas: ${finalStats[0].accounts}`);
    console.log(`📊 Categorias: ${finalStats[0].categories}`);
    console.log(`📝 Transações: ${finalStats[0].transactions}`);
    console.log('\n🎉 Banco de dados recriado com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

cleanAndMigrate().then(() => {
  console.log('\n✅ Script concluído');
  process.exit(0);
});