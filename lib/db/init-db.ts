import { db } from './connection';
import { companies, accounts, categories } from './schema';
import { eq, and } from 'drizzle-orm';
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

      // Adicionar categoria "Não Classificado" como fallback
      categoriesToInsert.push({
        companyId: newCompany.id,
        name: 'Não Classificado',
        description: 'Transações que não puderam ser categorizadas automaticamente',
        type: 'expense' as const,
        colorHex: '#6B7280',
        icon: 'help-circle',
        examples: [],
        isSystem: true,
        active: true
      });

      await db.insert(categories).values(categoriesToInsert);
      console.log(`✅ ${categoriesToInsert.length} categorias criadas com dados completos (incluindo fallback)`);

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
export async function getDefaultAccount(companyId?: string) {
  // Se não receber companyId, buscar a empresa padrão
  let targetCompanyId = companyId;

  if (!targetCompanyId) {
    const defaultCompany = await getDefaultCompany();
    if (!defaultCompany) {
      console.error('❌ Nenhuma empresa padrão encontrada para getDefaultAccount()');
      return undefined;
    }
    targetCompanyId = defaultCompany.id;
    console.log(`ℹ️ getDefaultAccount() sem companyId - usando empresa padrão: ${defaultCompany.name}`);
  }

  const [account] = await db.select()
    .from(accounts)
    .where(eq(accounts.companyId, targetCompanyId))
    .limit(1);

  if (!account) {
    console.warn(`⚠️ Nenhuma conta encontrada para companyId: ${targetCompanyId}`);
  }

  return account;
}

// Função para buscar conta por informações bancárias do OFX
export async function findAccountByBankInfo(
  companyId: string,
  bankCode: string,
  accountNumber: string
) {
  if (!bankCode || !accountNumber) {
    console.log('⚠️ findAccountByBankInfo: bankCode ou accountNumber não fornecidos');
    return undefined;
  }

  const [account] = await db.select()
    .from(accounts)
    .where(and(
      eq(accounts.companyId, companyId),
      eq(accounts.bankCode, bankCode),
      eq(accounts.accountNumber, accountNumber),
      eq(accounts.active, true)
    ))
    .limit(1);

  if (account) {
    console.log(`✅ Conta encontrada: ${account.name} (${account.bankName})`);
  } else {
    console.log(`ℹ️ Nenhuma conta encontrada para bankCode: ${bankCode}, accountNumber: ${accountNumber}`);
  }

  return account;
}

// Função para atualizar informações bancárias de uma conta existente
export async function updateAccountBankInfo(
  accountId: string,
  bankInfo: {
    bankName?: string;
    bankCode?: string;
    accountNumber?: string;
    agencyNumber?: string;
    accountType?: string;
  }
) {
  const updateData: Record<string, string> = {};

  if (bankInfo.bankName) updateData.bankName = bankInfo.bankName;
  if (bankInfo.bankCode) updateData.bankCode = bankInfo.bankCode;
  if (bankInfo.accountNumber) updateData.accountNumber = bankInfo.accountNumber;
  if (bankInfo.agencyNumber) updateData.agencyNumber = bankInfo.agencyNumber;
  if (bankInfo.accountType) updateData.accountType = bankInfo.accountType;

  if (Object.keys(updateData).length === 0) {
    console.log('⚠️ updateAccountBankInfo: Nenhum dado para atualizar');
    return undefined;
  }

  const [updatedAccount] = await db.update(accounts)
    .set(updateData)
    .where(eq(accounts.id, accountId))
    .returning();

  console.log(`✅ Conta atualizada: ${updatedAccount.name} → ${updatedAccount.bankName}`);
  return updatedAccount;
}