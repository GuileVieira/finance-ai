/**
 * Script para inicializar o banco de dados PGLite
 * Execute: node scripts/init-database.js
 */

const path = require('path');

async function initializeDatabase() {
  console.log('🚀 Inicializando banco de dados PGLite...');

  try {
    // Carregar módulo PGLite
    const { PGlite } = await import('@electric-sql/pglite');

    // Caminho para o banco de dados
    const dbPath = path.join(process.cwd(), 'storage_tmp', 'database.db');
    console.log(`📍 Caminho do banco: ${dbPath}`);

    // Criar instância do PGLite
    const client = new PGlite(dbPath);
    console.log('✅ Cliente PGLite criado');

    // Criar tabelas manualmente (já que PGLite não suporta migrações completas)
    console.log('📝 Criando tabelas...');

    // Schema SQL simplificado para PGLite
    const createTablesSQL = `
      -- Criar tabela companies
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY DEFAULT (random()::text),
        name TEXT NOT NULL,
        cnpj TEXT UNIQUE,
        corporate_name TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        zip_code TEXT,
        industry TEXT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Criar tabela accounts
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY DEFAULT (random()::text),
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        bank_name TEXT NOT NULL,
        bank_code TEXT NOT NULL,
        agency_number TEXT,
        account_number TEXT NOT NULL,
        account_type TEXT,
        opening_balance DECIMAL(15,2) DEFAULT 0,
        active BOOLEAN DEFAULT true,
        last_sync_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Criar tabela categories
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY DEFAULT (random()::text),
        company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        parent_type TEXT,
        parent_category_id TEXT REFERENCES categories(id),
        color_hex TEXT DEFAULT '#6366F1',
        is_system BOOLEAN DEFAULT false,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Criar tabela uploads
      CREATE TABLE IF NOT EXISTS uploads (
        id TEXT PRIMARY KEY DEFAULT (random()::text),
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        file_path TEXT,
        status TEXT NOT NULL,
        processing_log JSON,
        total_transactions INTEGER DEFAULT 0,
        successful_transactions INTEGER DEFAULT 0,
        failed_transactions INTEGER DEFAULT 0,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Criar tabela transactions
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY DEFAULT (random()::text),
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
        upload_id TEXT REFERENCES uploads(id) ON DELETE SET NULL,
        description TEXT NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        type TEXT NOT NULL,
        transaction_date DATE NOT NULL,
        balance_after DECIMAL(15,2),
        raw_description TEXT,
        metadata JSON,
        manually_categorized BOOLEAN DEFAULT false,
        verified BOOLEAN DEFAULT false,
        confidence DECIMAL(3,2) DEFAULT 0.00,
        reasoning TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Criar tabela users
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (random()::text),
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Criar tabela category_rules
      CREATE TABLE IF NOT EXISTS category_rules (
        id TEXT PRIMARY KEY DEFAULT (random()::text),
        category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
        rule_pattern TEXT NOT NULL,
        rule_type TEXT NOT NULL,
        confidence_score DECIMAL(3,2) DEFAULT 0.80,
        active BOOLEAN DEFAULT true,
        usage_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Executar SQL para criar tabelas
    await client.exec(createTablesSQL);
    console.log('✅ Tabelas criadas com sucesso');

    // Inserir dados iniciais
    console.log('📝 Inserindo dados iniciais...');

    const insertInitialDataSQL = `
      -- Inserir empresa padrão se não existir
      INSERT INTO companies (id, name, cnpj, corporate_name, active)
      SELECT
        COALESCE((SELECT id FROM companies LIMIT 1), (random()::text)),
        'Empresa Padrão',
        '00000000000000',
        'Empresa Padrão LTDA',
        true
      WHERE NOT EXISTS (SELECT 1 FROM companies LIMIT 1);

      -- Inserir conta padrão se não existir
      INSERT INTO accounts (id, company_id, name, bank_name, bank_code, account_number, account_type, active)
      SELECT
        (random()::text),
        c.id,
        'Conta Principal',
        'Banco Exemplo',
        '001',
        '12345-6',
        'checking',
        true
      FROM companies c
      WHERE c.name = 'Empresa Padrão'
      AND NOT EXISTS (SELECT 1 FROM accounts WHERE company_id = c.id LIMIT 1);

      -- Inserir categorias padrão
      INSERT INTO categories (company_id, name, type, color_hex, is_system, active)
      SELECT
        c.id,
        unnest(ARRAY[
          'Vendas de Produtos', 'Prestação de Serviços', 'Receitas Financeiras',
          'Comissões e Bonificações', 'Custos dos Produtos Vendidos', 'Logística e Entrega', 'Marketing e Publicidade',
          'Salários e Encargos', 'Aluguel e Condomínio', 'Software e Tecnologia', 'Serviços Profissionais', 'Seguros',
          'Impostos e Taxas', 'Despesas Bancárias', 'Manutenção e Reparos'
        ]),
        unnest(ARRAY[
          'revenue', 'revenue', 'revenue',
          'variable_cost', 'variable_cost', 'variable_cost', 'variable_cost',
          'fixed_cost', 'fixed_cost', 'fixed_cost', 'fixed_cost', 'fixed_cost',
          'non_operational', 'non_operational', 'non_operational'
        ]),
        unnest(ARRAY[
          '#10B981', '#3B82F6', '#8B5CF6',
          '#F59E0B', '#EF4444', '#EC4899', '#06B6D4',
          '#DC2626', '#7C3AED', '#0891B2', '#DB2777', '#059669',
          '#6B7280', '#4B5563', '#9333EA'
        ]),
        true,
        true
      FROM companies c
      WHERE c.name = 'Empresa Padrão'
      AND NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id LIMIT 1);
    `;

    await client.exec(insertInitialDataSQL);
    console.log('✅ Dados iniciais inseridos com sucesso');

    // Verificar dados
    const result = await client.query('SELECT COUNT(*) as companies_count FROM companies');
    const accountsResult = await client.query('SELECT COUNT(*) as accounts_count FROM accounts');
    const categoriesResult = await client.query('SELECT COUNT(*) as categories_count FROM categories');

    console.log('\n📊 Resumo da inicialização:');
    console.log(`🏢 Empresas: ${result.rows[0].companies_count}`);
    console.log(`🏦 Contas: ${accountsResult.rows[0].accounts_count}`);
    console.log(`📊 Categorias: ${categoriesResult.rows[0].categories_count}`);

    console.log('\n🎉 Banco de dados inicializado com sucesso!');
    console.log('💾 Arquivo do banco:', dbPath);

  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    process.exit(1);
  }
}

// Executar inicialização
initializeDatabase().then(() => {
  console.log('\n✅ Script concluído');
  process.exit(0);
});