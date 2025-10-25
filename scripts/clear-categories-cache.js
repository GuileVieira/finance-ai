#!/usr/bin/env node

console.log('🧹 Limpando Cache de Categorias');
console.log('='.repeat(50));

// Função para limpar cache no backend
function clearBackendCache() {
  // Forçar reload do módulo do backend limpando o cache do módulo
  const cacheFile = './node_modules/.cache';

  try {
    // Limpar cache do Next.js
    const { execSync } = require('child_process');

    console.log('🗑️  Limpando cache do Next.js...');
    execSync('rm -rf .next', { cwd: process.cwd(), stdio: 'inherit' });

    console.log('🗑️  Limpando cache do node_modules...');
    execSync('rm -rf node_modules/.cache', { cwd: process.cwd(), stdio: 'inherit' });

    console.log('✅ Cache do backend limpo com sucesso!');
    console.log('💡 Reinicie o servidor: pnpm dev');

  } catch (error) {
    console.log('⚠️  Erro ao limpar cache do backend:', error.message);
    console.log('💡 Tente limpar manualmente: rm -rf .next');
  }
}

console.log('📋 Instruções para limpar cache completo:');
console.log('1. Backend (automático): node scripts/clear-categories-cache.js');
console.log('2. Reiniciar servidor: pnpm dev');
console.log('3. Frontend: Limpar localStorage do navegador');
console.log('   - Abra DevTools (F12)');
console.log('   - Console → Application → Local Storage');
console.log('   - Delete chave: financeai_categories_cache');
console.log('');
console.log('🔄 Cache limpo! Recarregue a página para ver as novas categorias.');

clearBackendCache();