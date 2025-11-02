#!/usr/bin/env tsx

/**
 * Script para popular preços de modelos de IA no banco de dados
 * Uso: pnpm db:seed:ai-pricing
 *
 * Este script popula o banco de dados com os preços dos modelos de IA
 * usados pelo sistema (OpenRouter, OpenAI, etc.)
 */

// IMPORTANTE: Carregar variáveis de ambiente ANTES de qualquer import
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' }); // Fallback para .env

import { drizzle } from 'drizzle-orm/node-postgres';
import { aiModelPricing } from '../lib/db/schema';
import * as schema from '../lib/db/schema';

// Criar conexão diretamente
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL não está configurado');
  process.exit(1);
}

const db = drizzle(databaseUrl, { schema });

// Preços dos modelos (em USD por 1K tokens)
// Fontes: OpenRouter pricing, OpenAI pricing (Janeiro 2025)
const modelPricing = [
  // OpenRouter - Google Gemini
  {
    provider: 'openrouter',
    modelName: 'google/gemini-2.0-flash-exp',
    inputPricePer1kTokens: 0.0,
    outputPricePer1kTokens: 0.0,
    notes: 'Modelo experimental gratuito (pode mudar)'
  },
  {
    provider: 'openrouter',
    modelName: 'google/gemini-flash-1.5',
    inputPricePer1kTokens: 0.000075,
    outputPricePer1kTokens: 0.0003,
    notes: 'Modelo rápido e econômico do Google'
  },
  {
    provider: 'openrouter',
    modelName: 'google/gemini-pro-1.5',
    inputPricePer1kTokens: 0.00125,
    outputPricePer1kTokens: 0.005,
    notes: 'Modelo profissional do Google'
  },

  // OpenRouter - OpenAI
  {
    provider: 'openrouter',
    modelName: 'openai/gpt-4o-mini',
    inputPricePer1kTokens: 0.00015,
    outputPricePer1kTokens: 0.0006,
    notes: 'Modelo mini mais econômico da OpenAI'
  },
  {
    provider: 'openrouter',
    modelName: 'openai/gpt-4o',
    inputPricePer1kTokens: 0.0025,
    outputPricePer1kTokens: 0.01,
    notes: 'Modelo principal da OpenAI'
  },
  {
    provider: 'openrouter',
    modelName: 'openai/gpt-4-turbo',
    inputPricePer1kTokens: 0.01,
    outputPricePer1kTokens: 0.03,
    notes: 'GPT-4 Turbo via OpenRouter'
  },

  // OpenRouter - Anthropic Claude
  {
    provider: 'openrouter',
    modelName: 'anthropic/claude-3-haiku',
    inputPricePer1kTokens: 0.00025,
    outputPricePer1kTokens: 0.00125,
    notes: 'Modelo rápido e econômico da Anthropic'
  },
  {
    provider: 'openrouter',
    modelName: 'anthropic/claude-3-sonnet',
    inputPricePer1kTokens: 0.003,
    outputPricePer1kTokens: 0.015,
    notes: 'Modelo balanceado da Anthropic'
  },
  {
    provider: 'openrouter',
    modelName: 'anthropic/claude-3-opus',
    inputPricePer1kTokens: 0.015,
    outputPricePer1kTokens: 0.075,
    notes: 'Modelo mais avançado da Anthropic'
  },

  // OpenAI Direct
  {
    provider: 'openai',
    modelName: 'gpt-4o-mini',
    inputPricePer1kTokens: 0.00015,
    outputPricePer1kTokens: 0.0006,
    notes: 'Direto da OpenAI - mais econômico'
  },
  {
    provider: 'openai',
    modelName: 'gpt-4o',
    inputPricePer1kTokens: 0.0025,
    outputPricePer1kTokens: 0.01,
    notes: 'Direto da OpenAI - modelo principal'
  },
  {
    provider: 'openai',
    modelName: 'gpt-4-turbo',
    inputPricePer1kTokens: 0.01,
    outputPricePer1kTokens: 0.03,
    notes: 'GPT-4 Turbo direto da OpenAI'
  },
  {
    provider: 'openai',
    modelName: 'gpt-4',
    inputPricePer1kTokens: 0.03,
    outputPricePer1kTokens: 0.06,
    notes: 'GPT-4 original (mais caro)'
  },
  {
    provider: 'openai',
    modelName: 'gpt-3.5-turbo',
    inputPricePer1kTokens: 0.0005,
    outputPricePer1kTokens: 0.0015,
    notes: 'Modelo legacy mais barato'
  }
];

async function seedAiPricing() {
  try {
    console.log('🚀 [SEED-AI-PRICING] Iniciando seed de preços de IA...');

    // Verificar se já existem preços no banco
    const existingPricing = await db.select().from(aiModelPricing);

    if (existingPricing.length > 0) {
      console.log(`⚠️  Já existem ${existingPricing.length} modelos de preços cadastrados.`);
      console.log('❓ Deseja recriar todos os preços?');
      console.log('   Isso irá APAGAR os preços existentes e criar novos.');
      console.log('   Use: pnpm db:seed:ai-pricing --force para forçar a recriação');

      // Verificar se foi passado o flag --force
      const forceIndex = process.argv.indexOf('--force');
      if (forceIndex === -1) {
        console.log('❌ Operação cancelada. Use --force para recriar os preços.');
        process.exit(0);
      }

      console.log('🗑️  Removendo preços existentes...');
      await db.delete(aiModelPricing);
      console.log('✅ Preços existentes removidos');
    }

    // Inserir preços em lote
    console.log(`📊 Inserindo ${modelPricing.length} modelos de preços...`);

    const result = await db.insert(aiModelPricing).values(
      modelPricing.map(m => ({
        provider: m.provider,
        modelName: m.modelName,
        inputPricePer1kTokens: m.inputPricePer1kTokens.toString(),
        outputPricePer1kTokens: m.outputPricePer1kTokens.toString(),
        notes: m.notes,
        active: true
      }))
    ).returning();

    console.log(`✅ ${result.length} modelos de preços inseridos com sucesso!`);

    // Estatísticas por provedor
    const stats = modelPricing.reduce((acc, model) => {
      acc[model.provider] = (acc[model.provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📊 Estatísticas dos modelos inseridos:');
    Object.entries(stats).forEach(([provider, count]) => {
      console.log(`   ${provider}: ${count} modelos`);
    });

    // Mostrar alguns exemplos de custos estimados
    console.log('\n💰 Exemplos de custos (1000 chamadas, 500 tokens input + 200 tokens output):');
    const exampleModels = [
      'google/gemini-2.0-flash-exp',
      'openai/gpt-4o-mini',
      'anthropic/claude-3-haiku'
    ];

    exampleModels.forEach(modelName => {
      const model = modelPricing.find(m => m.modelName === modelName);
      if (model) {
        const inputCost = (500 / 1000) * model.inputPricePer1kTokens * 1000;
        const outputCost = (200 / 1000) * model.outputPricePer1kTokens * 1000;
        const totalCost = inputCost + outputCost;
        console.log(`   ${modelName}: $${totalCost.toFixed(4)}`);
      }
    });

    console.log('\n🎉 Seed de preços de IA concluído com sucesso!');
    console.log('📝 Nota: Estes preços são baseados em dados de Janeiro 2025.');
    console.log('   Verifique os preços atuais em: https://openrouter.ai/docs#models');

  } catch (error) {
    console.error('❌ Erro durante o seed de preços de IA:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Função para mostrar ajuda
function showHelp() {
  console.log(`
📖 Script de Seed de Preços de IA

Uso: tsx scripts/seed-ai-pricing.ts [opções]

Opções:
  --force    Força a recriação dos preços (apaga existentes)
  --help     Mostra esta ajuda

Exemplos:
  tsx scripts/seed-ai-pricing.ts                    # Apenas insere se não existir
  tsx scripts/seed-ai-pricing.ts --force            # Recria todos os preços
  pnpm db:seed:ai-pricing --force                   # Usando npm script

Requisitos:
  - DATABASE_URL configurada no .env.local
  - Tabelas criadas via migração (pnpm drizzle-kit push)

Modelos incluídos:
  - OpenRouter: Gemini (Flash, Pro), GPT-4o, Claude
  - OpenAI: GPT-4o, GPT-4, GPT-3.5-turbo
`);
}

// Verificar se foi pedido ajuda
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Executar seed
seedAiPricing().catch(console.error);
