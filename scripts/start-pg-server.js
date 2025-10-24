/**
 * Script para iniciar servidor PGLite para acesso externo
 * Execute: node scripts/start-pg-server.js
 */

const { PGlite } = require('@electric-sql/pglite');
const path = require('path');

async function startServer() {
  console.log('🚀 Iniciando servidor PGLite para acesso externo...');

  const dbPath = path.join(process.cwd(), 'storage_tmp', 'database.db');
  console.log(`📍 Banco de dados: ${dbPath}`);

  try {
    // Criar instância com servidor habilitado
    const pg = new PGlite(dbPath, {
      relaxedDurability: true,
      extensions: {
        // Habilitar extensões se necessário
      }
    });

    console.log('✅ Servidor PGLite iniciado!');
    console.log('📋 Conecte com:');
    console.log('   Tipo: PostgreSQL');
    console.log('   Host: localhost');
    console.log('   Port: 5432');
    console.log('   Database: postgres');
    console.log('   Username: postgres');
    console.log('   Password: (vazio)');
    console.log('');
    console.log('⚠️  Mantenha este terminal aberto para manter o servidor rodando');
    console.log('🛑 Pressione Ctrl+C para parar');

    // Manter servidor rodando
    process.on('SIGINT', async () => {
      console.log('\n🛑 Encerrando servidor...');
      await pg.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();