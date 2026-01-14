/**
 * Script para adicionar/atualizar descrições às categorias existentes
 * Melhora o contexto do agente de IA para categorização
 * 
 * Executar: npx tsx scripts/add-category-descriptions.ts
 */

import 'dotenv/config';
import { db } from '../lib/db/drizzle';
import { categories } from '../lib/db/schema';
import { eq, sql } from 'drizzle-orm';

// Mapeamento de nomes de categorias para descrições ÚTEIS
const categoryDescriptions: Record<string, string> = {
    // RECEITAS
    'Vendas de Produtos': 'Venda de mercadorias e produtos para clientes',
    'Vendas de Serviços': 'Prestação de serviços especializados e consultoria',
    'Receitas Financeiras': 'Rendimentos de aplicações financeiras, juros e investimentos',
    'Receitas de Aluguéis': 'Aluguel de imóveis e receitas de sublocação recebidas',

    // CUSTOS FIXOS (Pessoal e RH)
    '13º SALARIO': 'Pagamento do décimo terceiro salário aos funcionários',
    'ALUGUEL': 'Pagamento de aluguel de imóvel comercial ou sede',
    'ALUGUEL DE MÁQUINAS E EQUIPAMENTOS': 'Aluguel de máquinas, veículos e equipamentos operacionais',
    'ASSISTÊNCIA MÉDICA': 'Plano de saúde e convênio médico para funcionários',
    'ASSISTÊNCIA ODONTOLÓGICA': 'Convênio e plano odontológico para funcionários',
    'CARTÓRIO': 'Taxas e serviços cartoriais, reconhecimento de firma, autenticações',
    'CONSERVAÇÃO E LIMPEZA': 'Serviços de limpeza, conservação e manutenção do ambiente de trabalho',
    'CONSULTORIA': 'Serviços de consultoria empresarial, financeira ou técnica',
    'ENERGIA ELETRICA': 'Fornecimento de energia elétrica para o estabelecimento',
    'EXAME ADMISSIONAL/PERIODICO': 'Exames médicos obrigatórios de admissão e periódicos dos funcionários',
    'FGTS': 'Depósito do Fundo de Garantia do Tempo de Serviço dos funcionários',
    'FOLHA PJ': 'Pagamento de prestadores de serviço pessoa jurídica (freelancers, consultores)',
    'FÉRIAS': 'Pagamento de férias e abono de férias aos funcionários',
    'INSS': 'Contribuição previdenciária patronal e do funcionário',
    'INTERNET': 'Serviço de internet e banda larga para o estabelecimento',
    'LICENÇAS DIVERSAS': 'Licenças de software, alvarás e permissões diversas',
    'MANUTENÇÃO DE EQUIPAMENTOS': 'Manutenção preventiva e corretiva de equipamentos',
    'MANUTENÇÃO DE HARDWARE': 'Manutenção de computadores, servidores e infraestrutura de TI',
    'MANUTENÇÃO PREDIAL': 'Manutenção do prédio, instalações elétricas, hidráulicas e estruturais',
    'MATERIAL DE LIMPEZA': 'Materiais de limpeza e higiene do ambiente de trabalho',
    'PRO LABORE': 'Remuneração dos sócios administradores (pró-labore)',
    'SALARIOS': 'Folha de pagamento de salários dos funcionários CLT',
    'SERVIÇOS DE ADVOCACIA': 'Serviços jurídicos e advocatícios',
    'SERVIÇOS DE CONTABILIDADE': 'Serviços contábeis, escrituração fiscal e obrigações acessórias',
    'SOFTWARES': 'Assinaturas de softwares, SaaS e ferramentas digitais',
    'TELEFONES FIXOS': 'Serviço de telefonia fixa comercial',
    'TELEFONES MÓVEIS': 'Serviço de telefonia móvel corporativa',
    'VALE ALIMENTAÇÃO': 'Benefício de alimentação para funcionários (VA)',
    'VALE REFEIÇÃO': 'Benefício de refeição para funcionários (VR)',
    'VALE TRANSPORTE': 'Benefício de transporte para funcionários (VT)',

    // CUSTOS VARIÁVEIS
    'COMISSÕES': 'Comissões de vendas pagas a vendedores e representantes',
    'CORREIOS': 'Serviços postais, envio de correspondências e documentos',
    'DESP. LOCOMOÇÃO': 'Despesas com transporte urbano, táxi, aplicativos de mobilidade',
    'DESPESAS COM VIAGENS': 'Passagens aéreas, hospedagem e diárias em viagens de negócios',
    'MARKETING E PUBLICIDADE': 'Gastos com campanhas de marketing, publicidade e propaganda',
    'MATERIAL DE EMBALAGEM': 'Caixas, plásticos e materiais para embalar produtos',
    'MATERIAL DE ESCRITÓRIO': 'Papelaria, canetas, papel e suprimentos de escritório',
    'OPERADORES LOGÍSTICOS': 'Serviços de transporte, frete e logística de mercadorias',
    'SERVIÇOS PRESTADOS PF': 'Pagamento de serviços prestados por pessoa física (autônomos)',

    // NÃO OPERACIONAIS (Impostos e Tributos)
    'COFINS': 'Contribuição para Financiamento da Seguridade Social',
    'CONTRIBUICAO SINDICAL': 'Contribuição sindical obrigatória ou assistencial',
    'CUSTAS JUDICIAIS': 'Custas processuais e despesas judiciais',
    'LEASING / FINAME': 'Financiamento de veículos, máquinas e equipamentos via FINAME ou leasing',
    'OUTRAS DESPESAS NOP': 'Despesas diversas não classificadas em outras categorias',
    'OUTROS TRIBUTOS': 'Outros tributos federais, estaduais ou municipais',
    'SEGUROS DE VIDA': 'Seguro de vida em grupo para funcionários',
    'SEGUROS GERAIS': 'Seguros patrimoniais, de responsabilidade civil e outros',
    'TARIFAS BANCÁRIAS': 'Taxas e tarifas cobradas pelo banco (TED, DOC, manutenção)',
    'Saldo Inicial': 'Ajustes de saldo inicial e checkpoints de saldo (ignorado em relatórios)',
};

async function addCategoryDescriptions() {
    console.log('🚀 Atualizando descrições das categorias...\n');

    let updated = 0;
    let skipped = 0;
    let notFound = 0;

    for (const [name, description] of Object.entries(categoryDescriptions)) {
        try {
            // Atualizar categoria: descrição vazia OU descrição genérica ("Categoria extraída...")
            const result = await db
                .update(categories)
                .set({ description })
                .where(
                    sql`${categories.name} = ${name} AND (
            ${categories.description} IS NULL OR 
            ${categories.description} = '' OR
            ${categories.description} LIKE 'Categoria extraída%'
          )`
                )
                .returning({ id: categories.id, name: categories.name });

            if (result.length > 0) {
                console.log(`✅ ${name}: descrição atualizada`);
                updated++;
            } else {
                // Verificar se a categoria existe e já tem descrição boa
                const existing = await db
                    .select({ id: categories.id, description: categories.description })
                    .from(categories)
                    .where(eq(categories.name, name))
                    .limit(1);

                if (existing.length > 0 && existing[0].description && !existing[0].description.startsWith('Categoria extraída')) {
                    console.log(`⏭️  ${name}: já possui descrição boa`);
                    skipped++;
                } else if (existing.length === 0) {
                    console.log(`❓ ${name}: categoria não encontrada no banco`);
                    notFound++;
                }
            }
        } catch (error) {
            console.error(`❌ Erro ao atualizar ${name}:`, error);
        }
    }

    console.log('\n📊 Resumo:');
    console.log(`   ✅ Atualizadas: ${updated}`);
    console.log(`   ⏭️  Já tinham descrição: ${skipped}`);
    console.log(`   ❓ Não encontradas: ${notFound}`);
    console.log('\n✨ Concluído!');

    process.exit(0);
}

addCategoryDescriptions().catch((error) => {
    console.error('Erro fatal:', error);
    process.exit(1);
});
