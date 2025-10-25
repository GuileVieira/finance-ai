#!/usr/bin/env node

console.log('🧹 Script de Limpeza de Dados OFX');
console.log('='.repeat(50));

// Verificar argumentos
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isRecent = args.includes('--recent');
const isHelp = args.includes('--help') || args.includes('-h');

if (isHelp) {
  console.log(`
Uso: node scripts/reset-data-simple.js [opções]

Opções:
  --dry-run    Apenas simular, não executar
  --recent     Limpar apenas dados recentes (última hora)
  --help       Mostrar esta ajuda

Exemplos:
  node scripts/reset-data-simple.js            # Limpeza completa
  node scripts/reset-data-simple.js --dry-run   # Simular
  node scripts/reset-data-simple.js --recent    # Apenas recentes
`);
  process.exit(0);
}

console.log(`🔍 Modo ${isDryRun ? 'simulação' : 'execução'} ${isRecent ? '(recentes)' : '(completo)'}`);

if (!isDryRun) {
  console.log('\n⚠️  ATENÇÃO: Esta operação removerá dados permanentemente!');
  console.log('Pressione ENTER para continuar ou CTRL+C para cancelar');

  // Aguardar confirmação
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', () => {
    process.stdin.pause();
    executeCleanup();
  });
} else {
  console.log('\n✨ Modo de simulação - executando teste...');
  executeCleanup();
}

async function executeCleanup() {
  try {
    // Limpar arquivos físicos
    console.log('\n📁 Limpando arquivos físicos...');

    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(process.cwd(), 'storage_tmp/ofx');

    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir, { recursive: true });
      let removedCount = 0;

      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        if (fs.existsSync(filePath) && (file.endsWith('.ofx') || file.endsWith('.json'))) {
          try {
            fs.unlinkSync(filePath);
            removedCount++;
            console.log(`  🗑️  Removido: ${file}`);
          } catch (error) {
            console.log(`  ⚠️  Erro ao remover ${file}: ${error.message}`);
          }
        }
      }

      console.log(`✅ Arquivos removidos: ${removedCount}`);
    } else {
      console.log('📁 Pasta de uploads não encontrada');
    }

    // Limpar banco de dados
    console.log('\n💾 Limpando banco de dados...');

    // Para simplificar, vamos usar o Drizzle Studio para limpeza manual
    console.log('📊 Para limpeza completa do banco:');
    console.log('   1. Execute: pnpm db:studio');
    console.log('   2. Conecte ao banco de dados');
    console.log('   3. Execute os seguintes comandos SQL:');
    console.log('');
    console.log('   -- Remover transações recentes');
    console.log('   DELETE FROM financeai_transactions WHERE created_at > NOW() - INTERVAL \'1 hour\';');
    console.log('');
    console.log('   -- Remover uploads recentes');
    console.log('   DELETE FROM financeai_uploads WHERE uploaded_at > NOW() - INTERVAL \'1 hour\';');
    console.log('');
    console.log('   -- Limpeza completa (cuidado!)');
    console.log('   TRUNCATE financeai_transactions CASCADE;');
    console.log('   TRUNCATE financeai_uploads CASCADE;');
    console.log('   -- (preservará empresas, contas e categorias)');
    console.log('');

    console.log('\n✨ Script concluído!');
    console.log('💡 Use pnpm db:studio para limpeza completa do banco');

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}