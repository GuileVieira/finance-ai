
import { db } from '../lib/db/drizzle';
import DashboardService from '../lib/services/dashboard.service';
import { companies, accounts } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('🚀 Iniciando teste do DashboardService...');

  try {
    // Buscar uma conta qualquer para ter um ID de conta e empresa válido
    const accountResult = await db.select().from(accounts).limit(1);
    if (accountResult.length === 0) {
      console.log('⚠️ Nenhuma conta encontrada no banco.');
      return;
    }

    const testAccount = accountResult[0];
    const companyId = testAccount.companyId;
    const accountId = testAccount.id;

    console.log(`🏢 Testando com empresa ID: ${companyId}`);
    console.log(`🏦 Testando com conta ID: ${accountId}`);

    console.log('\n🔍 Testando getTopExpenses...');
    const topExpenses = await DashboardService.getTopExpenses({
      companyId: companyId,
      period: 'all'
    });
    console.log('✅ getTopExpenses executado com sucesso!');
    console.log(`📊 Encontradas ${topExpenses.length} despesas.`);

    if (topExpenses.length > 0) {
      console.log('Exemplo:', {
        description: topExpenses[0].description,
        amount: topExpenses[0].amount,
        category: topExpenses[0].category
      });
    }

    console.log('\n🔍 Testando getDashboardData completo...');
    const dashboardData = await DashboardService.getDashboardData({
      companyId: companyId,
      period: 'all'
    });
    console.log('✅ getDashboardData (apenas companyId) executado com sucesso!');

    // Testar PR2: Filtro por accountId (UUID)
    const accountsList = await db.select().from(accounts).where(eq(accounts.companyId, companyId)).limit(1);
    if (accountsList.length > 0) {
      const accountId = accountsList[0].id;
      console.log(`\n🔍 Testando PR2: Filtro por accountId (UUID): ${accountId}`);
      const dataWithAccount = await DashboardService.getDashboardData({
        companyId: companyId,
        accountId: accountId,
        period: 'all'
      });
      console.log('✅ getDashboardData (com accountId UUID) executado com sucesso!');
    }

    // Testar PR3: Filtro por data (dispara calculateAllComparisons)
    console.log('\n🔍 Testando PR3: Filtro por data (Comparações)...');
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const startDate = lastMonth.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    const dataWithDates = await DashboardService.getDashboardData({
      companyId: companyId,
      startDate,
      endDate,
      period: 'custom'
    });
    console.log('✅ getDashboardData (com datas) executado com sucesso!');
    console.log('📊 Comparação (growthRate):', dataWithDates.metrics.growthRate);

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
