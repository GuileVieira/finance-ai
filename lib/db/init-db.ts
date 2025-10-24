import { db } from './connection';
import { companies, accounts, categories } from './schema';
import { eq } from 'drizzle-orm';

// Dados iniciais de categorias baseadas no mock-categories.ts
const DEFAULT_CATEGORIES = [
  // Receitas
  { name: 'Vendas de Produtos', type: 'revenue', colorHex: '#10B981' },
  { name: 'Prestação de Serviços', type: 'revenue', colorHex: '#3B82F6' },
  { name: 'Receitas Financeiras', type: 'revenue', colorHex: '#8B5CF6' },

  // Custos Variáveis
  { name: 'Comissões e Bonificações', type: 'variable_cost', colorHex: '#F59E0B' },
  { name: 'Custos dos Produtos Vendidos', type: 'variable_cost', colorHex: '#EF4444' },
  { name: 'Logística e Entrega', type: 'variable_cost', colorHex: '#EC4899' },
  { name: 'Marketing e Publicidade', type: 'variable_cost', colorHex: '#06B6D4' },

  // Custos Fixos
  { name: 'Salários e Encargos', type: 'fixed_cost', colorHex: '#DC2626' },
  { name: 'Aluguel e Condomínio', type: 'fixed_cost', colorHex: '#7C3AED' },
  { name: 'Software e Tecnologia', type: 'fixed_cost', colorHex: '#0891B2' },
  { name: 'Serviços Profissionais', type: 'fixed_cost', colorHex: '#DB2777' },
  { name: 'Seguros', type: 'fixed_cost', colorHex: '#059669' },

  // Não Operacionais
  { name: 'Impostos e Taxas', type: 'non_operational', colorHex: '#6B7280' },
  { name: 'Despesas Bancárias', type: 'non_operational', colorHex: '#4B5563' },
  { name: 'Manutenção e Reparos', type: 'non_operational', colorHex: '#9333EA' }
];

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

      // Criar categorias padrão
      console.log('📊 Criando categorias padrão...');
      const categoriesToInsert = DEFAULT_CATEGORIES.map(cat => ({
        companyId: newCompany.id,
        name: cat.name,
        type: cat.type,
        colorHex: cat.colorHex,
        isSystem: true,
        active: true
      }));

      await db.insert(categories).values(categoriesToInsert);
      console.log(`✅ ${categoriesToInsert.length} categorias criadas`);

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