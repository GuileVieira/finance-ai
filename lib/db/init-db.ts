import { db } from './connection';
import { companies, accounts, categories } from './schema';
import { eq } from 'drizzle-orm';
import { mockCategories } from '../mock-categories';

export async function initializeDatabase() {
  try {
    console.log('🚀 Inicializando banco de dados...');

    // Verificar se já existe uma empresa
    const existingCompany = await db.select().from(companies).limit(1);

    if (existingCompany.length === 0) {
      console.log('📝 Criando empresa padrão...');

      // Criar empresa padrão
      const [newCompany] = await db.insert(companies).values({
        name: 'Empresa Padrão',
        cnpj: '00000000000000',
        corporateName: 'Empresa Padrão LTDA',
        active: true
      }).returning();

      console.log(`✅ Empresa criada: ${newCompany.name}`);

      // Criar conta bancária padrão
      console.log('🏦 Criando conta bancária padrão...');
      const [newAccount] = await db.insert(accounts).values({
        companyId: newCompany.id,
        name: 'Conta Principal',
        bankName: 'Banco Exemplo',
        bankCode: '001',
        accountNumber: '12345-6',
        accountType: 'checking',
        active: true
      }).returning();

      console.log(`✅ Conta criada: ${newAccount.name}`);

      // Criar categorias padrão usando mockCategories
      console.log('📊 Criando categorias padrão...');
      const categoriesToInsert = mockCategories.map(cat => ({
        companyId: newCompany.id,
        name: cat.name,
        description: cat.description,
        type: cat.type,
        colorHex: cat.color,
        icon: cat.icon,
        examples: cat.examples,
        isSystem: true,
        active: true
      }));

      await db.insert(categories).values(categoriesToInsert);
      console.log(`✅ ${categoriesToInsert.length} categorias criadas com dados completos`);

      console.log('🎉 Banco de dados inicializado com sucesso!');
      return { company: newCompany, account: newAccount };
    } else {
      console.log('✅ Banco de dados já inicializado');
      return { company: existingCompany[0], account: null };
    }

  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    throw error;
  }
}

// Função para resetar o banco (apenas para desenvolvimento)
export async function resetDatabase() {
  try {
    console.log('🔄 Resetando banco de dados...');

    // Delete em ordem reversa devido às foreign keys
    await db.delete(categories);
    await db.delete(accounts);
    await db.delete(companies);

    console.log('✅ Banco de dados resetado');

    // Recriar com dados padrão
    return await initializeDatabase();
  } catch (error) {
    console.error('❌ Erro ao resetar banco de dados:', error);
    throw error;
  }
}

// Função para obter empresa padrão
export async function getDefaultCompany() {
  const [company] = await db.select().from(companies).limit(1);
  return company;
}

// Função para obter conta padrão de uma empresa
export async function getDefaultAccount(companyId: string) {
  const [account] = await db.select().from(accounts).where(eq(accounts.companyId, companyId)).limit(1);
  return account;
}