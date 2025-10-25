#!/usr/bin/env node

require('dotenv').config();

const { Pool } = require('pg');

console.log('🛒 Adicionando Categorias de Receita Essenciais');
console.log('='.repeat(50));

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL não encontrada nas variáveis de ambiente');
  process.exit(1);
}

// Categorias de receita essenciais para funcionamento correto da IA
const REVENUE_CATEGORIES = [
  {
    name: 'VENDAS DE PRODUTOS',
    description: 'Receitas principais de vendas de mercadorias e produtos',
    type: 'revenue',
    parentType: 'revenue',
    colorHex: '#10B981',
    icon: '📦',
    examples: ['Venda de produtos', 'Mercadorias vendidas', 'Receita de vendas']
  },
  {
    name: 'VENDAS DE SERVIÇOS',
    description: 'Receitas de prestação de serviços profissionais',
    type: 'revenue',
    parentType: 'revenue',
    colorHex: '#3B82F6',
    icon: '🔧',
    examples: ['Serviços prestados', 'Consultoria', 'Honorários profissionais']
  },
  {
    name: 'RECEITAS FINANCEIRAS',
    description: 'Rendimentos de aplicações, juros e investimentos',
    type: 'revenue',
    parentType: 'revenue',
    colorHex: '#F59E0B',
    icon: '💰',
    examples: ['Juros recebidos', 'Rendimentos', 'Aplicações financeiras']
  },
  {
    name: 'RECEBIMENTOS DE CLIENTES',
    description: 'Pagamentos recebidos de clientes',
    type: 'revenue',
    parentType: 'revenue',
    colorHex: '#8B5CF6',
    icon: '💵',
    examples: ['Pix de cliente', 'Transferência recebida', 'Pagamento de cliente']
  },
  {
    name: 'OUTRAS RECEITAS',
    description: 'Receitas não operacionais ou eventuais',
    type: 'revenue',
    parentType: 'revenue',
    colorHex: '#EC4899',
    icon: '💎',
    examples: ['Receitas eventuais', 'Outras entradas', 'Receitas diversas']
  }
];

async function main() {
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') ? false : {
      rejectUnauthorized: false
    }
  });

  const client = await pool.connect();

  try {
    console.log('🔗 Conectando ao banco: ' + dbUrl.replace(/\/\/.*@/, '//***:***'));

    // Buscar primeira empresa disponível
    console.log('\n🏢 Buscando empresa padrão...');
    const companyResult = await client.query(
      'SELECT id, name FROM financeai_companies ORDER BY created_at ASC LIMIT 1'
    );

    if (!companyResult || companyResult.rows.length === 0) {
      console.error('❌ Nenhuma empresa encontrada no banco');
      process.exit(1);
    }

    const company = companyResult.rows[0];
    console.log(`✅ Empresa encontrada: ${company.name} (${company.id})`);

    const companyId = company.id;
    let addedCount = 0;
    let skippedCount = 0;

    console.log('\n🛒 Adicionando categorias de receita...');

    for (const category of REVENUE_CATEGORIES) {
      // Verificar se categoria já existe
      const existingResult = await client.query(
        'SELECT id, name FROM financeai_categories WHERE name = $1 AND company_id = $2',
        [category.name, companyId]
      );

      if (existingResult.rows.length > 0) {
        console.log(`⚠️  Categoria já existe: ${category.name}`);
        skippedCount++;
        continue;
      }

      // Inserir nova categoria
      const result = await client.query(`
        INSERT INTO financeai_categories (
          id, company_id, name, description, type, parent_type,
          color_hex, icon, examples, is_system, active, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
        ) RETURNING id, name
      `, [
        companyId,
        category.name,
        category.description,
        category.type,
        category.parentType,
        category.colorHex,
        category.icon,
        JSON.stringify(category.examples),
        true, // is_system
        true  // active
      ]);

      console.log(`✅ Categoria adicionada: ${result.rows[0].name} (${result.rows[0].id})`);
      addedCount++;
    }

    console.log('\n📊 RELATÓRIO FINAL:');
    console.log('='.repeat(50));
    console.log(`✅ Categorias adicionadas: ${addedCount}`);
    console.log(`⚠️  Categorias puladas (já existiam): ${skippedCount}`);
    console.log(`📈 Total de categorias no sistema: ${48 + addedCount} (48 anteriores + ${addedCount} novas)`);

    if (addedCount > 0) {
      console.log('\n🎉 Categorias de receita adicionadas com sucesso!');
      console.log('💡 A IA agora poderá classificar "Pix recebido" corretamente como uma categoria de receita.');
    } else {
      console.log('\n💡 Todas as categorias de receita já existiam no sistema.');
    }

    console.log('\n🔄 Limpeza de cache do frontend recomendada');
    console.log('💡 Limpe o localStorage do navegador para que novas categorias apareçam imediatamente');

  } catch (error) {
    console.error('❌ Erro durante a operação:', error);
    process.exit(1);
  } finally {
    await client.end();
    await pool.end();
  }
}

main().catch(error => {
  console.error('❌ Erro na execução:', error);
  process.exit(1);
});