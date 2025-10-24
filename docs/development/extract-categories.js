const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Caminho para o arquivo XMIND
const xmindPath = path.join(__dirname, '../docs/examples/planilhas/XMIND - GESTÃO CAIXA KING X v92.1.xlsx');

// Função para extrair categorias do arquivo XMIND
function extractCategoriesFromXMIND() {
  console.log('🔍 Extraindo categorias do arquivo XMIND...');

  const workbook = XLSX.readFile(xmindPath);
  const categories = {
    expenses: new Set(),
    revenues: new Set(),
    categories: new Set(),
    subcategories: new Set(),
    rubricas: new Set()
  };

  // Abas mais importantes para extrair categorias
  const importantSheets = [
    'CP',           // Contas a Pagar
    'CR',           // Contas a Receber
    'CP (PROJEÇÃO)',
    'CP - ORÇAMENTO',
    'CR - ORÇAMENTO',
    'ORÇAMENTO'
  ];

  importantSheets.forEach(sheetName => {
    if (workbook.SheetNames.includes(sheetName)) {
      console.log(`📊 Analisando aba: ${sheetName}`);
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length > 1) {
        // Headers
        const headers = jsonData[0];

        // Procurar colunas relevantes
        const rubricaIndex = headers.findIndex(h =>
          h && (h.toString().includes('RUBRICA') || h.toString().includes('Rubrica') || h.toString().includes('Categoria'))
        );

        const tituloIndex = headers.findIndex(h =>
          h && (h.toString().includes('TITULO') || h.toString().includes('Título') || h.toString().includes('DESCRIÇÃO'))
        );

        const valorIndex = headers.findIndex(h =>
          h && (h.toString().includes('VALOR') || h.toString().includes('Valor'))
        );

        console.log(`   - Colunas encontradas: Rubrica(${rubricaIndex}), Título(${tituloIndex}), Valor(${valorIndex})`);

        // Extrair dados das linhas
        jsonData.slice(1, 100).forEach((row, index) => { // Primeiras 100 linhas
          if (row.some(cell => cell !== null && cell !== undefined && cell !== '')) {

            // Extrair rubrica/categoria
            if (rubricaIndex >= 0 && row[rubricaIndex]) {
              const rubrica = row[rubricaIndex].toString().trim();
              if (rubrica && rubrica.length > 0) {
                categories.rubricas.add(rubrica);
                categories.categories.add(rubrica);
              }
            }

            // Extrair título/descrição
            if (tituloIndex >= 0 && row[tituloIndex]) {
              const titulo = row[tituloIndex].toString().trim();
              if (titulo && titulo.length > 0) {
                // Tentar identificar categorias pelo título
                identifyCategoryFromTitle(titulo, categories);
              }
            }
          }
        });
      }
    }
  });

  // Converter Sets para Arrays e organizar
  return {
    rubricas: Array.from(categories.rubricas).sort(),
    expenses: Array.from(categories.expenses).sort(),
    revenues: Array.from(categories.revenues).sort(),
    categories: Array.from(categories.categories).sort(),
    subcategories: Array.from(categories.subcategories).sort()
  };
}

// Função para identificar categorias baseado no título
function identifyCategoryFromTitle(titulo, categories) {
  const tituloLower = titulo.toLowerCase();

  // Padrões de Despesas
  if (tituloLower.includes('aluguel') || tituloLower.includes('imóvel') || tituloLower.includes('locação')) {
    categories.expenses.add('Aluguel');
    categories.subcategories.add('Aluguel Imóvel Comercial');
  } else if (tituloLower.includes('salário') || tituloLower.includes('folha') || tituloLower.includes('pró-labore') || tituloLower.includes('funcionário')) {
    categories.expenses.add('Salários e Encargos');
    categories.subcategories.add('Salários');
    categories.subcategories.add('Encargos Sociais');
  } else if (tituloLower.includes('fornecedor') || tituloLower.includes('fornec') || tituloLower.includes('matéria prima') || tituloLower.includes('insumo')) {
    categories.expenses.add('Custos de Produtos/Serviços');
    categories.subcategories.add('Matéria Prima');
    categories.subcategories.add('Insumos');
  } else if (tituloLower.includes('marketing') || tituloLower.includes('publicidade') || tituloLower.includes('propaganda') || tituloLower.includes('anúncio')) {
    categories.expenses.add('Marketing e Vendas');
    categories.subcategories.add('Publicidade');
    categories.subcategories.add('Marketing Digital');
  } else if (tituloLower.includes('software') || tituloLower.includes('sistema') || tituloLower.includes('tecnologia') || tituloLower.includes('ti')) {
    categories.expenses.add('Tecnologia e Software');
    categories.subcategories.add('Software');
    categories.subcategories.add('Sistemas');
  } else if (tituloLower.includes('energia') || tituloLower.includes('luz') || tituloLower.includes('água') || tituloLower.includes('telefone') || tituloLower.includes('internet')) {
    categories.expenses.add('Utilidades e Serviços');
    categories.subcategories.add('Energia Elétrica');
    categories.subcategories.add('Água e Saneamento');
    categories.subcategories.add('Telecomunicações');
  } else if (tituloLower.includes('imposto') || tituloLower.includes('taxa') || tituloLower.includes('tributo') || tituloLower.includes('contribuição')) {
    categories.expenses.add('Impostos e Taxas');
    categories.subcategories.add('Impostos Federais');
    categories.subcategories.add('Taxas Municipais');
  } else if (tituloLower.includes('transporte') || tituloLower.includes('combustível') || tituloLower.includes('viagem') || tituloLower.includes('refeição')) {
    categories.expenses.add('Despesas de Transporte');
    categories.subcategories.add('Combustível');
    categories.subcategories.add('Deslocamento');
  } else if (tituloLower.includes('material') || tituloLower.includes('escritório') || tituloLower.includes('limpeza') || tituloLower.includes('manutenção')) {
    categories.expenses.add('Material de Escritório e Manutenção');
    categories.subcategories.add('Material de Escritório');
    categories.subcategories.add('Manutenção Predial');
  } else if (tituloLower.includes('seguro') || tituloLower.includes('segurança') || tituloLower.includes('alvará')) {
    categories.expenses.add('Seguros e Segurança');
    categories.subcategories.add('Seguros');
  }

  // Padrões de Receitas
  if (tituloLower.includes('cliente') || tituloLower.includes('venda') || tituloLower.includes('faturamento') || tituloLower.includes('receita')) {
    categories.revenues.add('Vendas de Produtos/Serviços');
    categories.subcategories.add('Receitas de Clientes');
  } else if (tituloLower.includes('juros') || tituloLower.includes('rendimento') || tituloLower.includes('aplicação')) {
    categories.revenues.add('Receitas Financeiras');
    categories.subcategories.add('Juros Ativos');
  } else if (tituloLower.includes('aluguel') && (tituloLower.includes('recebido') || tituloLower.includes('receita'))) {
    categories.revenues.add('Receitas de Aluguéis');
  }
}

// Função para criar hierarquia de categorias
function createCategoryHierarchy(extractedData) {
  const hierarchy = {
    mainCategories: [],
    subcategories: {},
    examples: {}
  };

  // Definir categorias principais baseadas nos dados
  hierarchy.mainCategories = [
    {
      id: 'revenue',
      name: 'Receitas',
      type: 'revenue',
      color: '#10B981',
      description: 'Todas as entradas de dinheiro'
    },
    {
      id: 'variable_cost',
      name: 'Custos Variáveis',
      type: 'variable_cost',
      color: '#F59E0B',
      description: 'Custos que variam com o volume de vendas'
    },
    {
      id: 'fixed_cost',
      name: 'Custos Fixos',
      type: 'fixed_cost',
      color: '#EF4444',
      description: 'Custos fixos mensais da empresa'
    },
    {
      id: 'non_operational',
      name: 'Não Operacional',
      type: 'non_operational',
      color: '#6B7280',
      description: 'Receitas e despesas não operacionais'
    }
  ];

  // Mapear subcategorias para categorias principais
  hierarchy.subcategories = {
    revenue: {
      'Vendas de Produtos/Serviços': {
        color: '#10B981',
        examples: ['Receitas de Clientes', 'Faturamento Mensal', 'Vendas Diretas']
      },
      'Receitas Financeiras': {
        color: '#059669',
        examples: ['Juros Ativos', 'Rendimentos de Aplicações', 'Descontos Obtidos']
      },
      'Receitas de Aluguéis': {
        color: '#047857',
        examples: ['Aluguel Recebido', 'Sublocação']
      }
    },
    variable_cost: {
      'Custos de Produtos/Serviços': {
        color: '#F59E0B',
        examples: ['Matéria Prima', 'Insumos', 'Embargalagens', 'Fornecedores Diretos']
      },
      'Marketing e Vendas': {
        color: '#D97706',
        examples: ['Publicidade', 'Marketing Digital', 'Comissões de Vendas', 'Eventos']
      },
      'Impostos sobre Vendas': {
        color: '#B45309',
        examples: ['ICMS', 'PIS', 'COFINS sobre Faturamento']
      }
    },
    fixed_cost: {
      'Salários e Encargos': {
        color: '#EF4444',
        examples: ['Salários', 'Pró-labore', 'INSS', 'FGTS', 'Vale Transporte', 'Vale Refeição']
      },
      'Aluguel e Ocupação': {
        color: '#DC2626',
        examples: ['Aluguel Imóvel', 'Condomínio', 'IPTU']
      },
      'Tecnologia e Software': {
        color: '#B91C1C',
        examples: ['Software', 'Sistemas', 'Hospedagem', 'Licenças']
      },
      'Utilidades e Serviços': {
        color: '#991B1B',
        examples: ['Energia Elétrica', 'Água e Saneamento', 'Telecomunicações', 'Internet']
      },
      'Impostos e Taxas': {
        color: '#7F1D1D',
        examples: ['Impostos Federais', 'Taxas Municipais', 'Contribuições']
      },
      'Seguros e Segurança': {
        color: '#450A0A',
        examples: ['Seguros', 'Segurança Patrimonial']
      }
    },
    non_operational: {
      'Despesas Financeiras': {
        color: '#6B7280',
        examples: ['Juros Passivos', 'Taxas Bancárias', 'Multas', 'Descontos Concedidos']
      },
      'Outras Receitas/Despesas': {
        color: '#4B5563',
        examples: ['Receitas Eventuais', 'Despesas Eventuais', 'Doações', 'Perdas']
      }
    }
  };

  return hierarchy;
}

// Função principal
function main() {
  console.log('🚀 Iniciando extração de categorias...\n');

  // Extrair categorias do XMIND
  const extractedData = extractCategoriesFromXMIND();

  // Criar hierarquia organizada
  const hierarchy = createCategoryHierarchy(extractedData);

  // Salvar resultado completo
  const outputPath = path.join(__dirname, '../docs/categories-extracted.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    extracted: extractedData,
    hierarchy: hierarchy
  }, null, 2));

  // Gerar relatório de categorias
  generateCategoriesReport(extractedData, hierarchy);

  console.log('\n✅ Extração concluída!');
  console.log(`📊 Resultados salvos em: ${outputPath}`);
}

// Gerar relatório de categorias
function generateCategoriesReport(extractedData, hierarchy) {
  let report = '# Categorias Financeiras Extraídas - FinanceAI\n\n';

  report += '## 📊 Resumo da Extração\n\n';
  report += `- **Rúbricas Encontradas**: ${extractedData.rubricas.length}\n`;
  report += `- **Categorias de Despesa**: ${extractedData.expenses.length}\n`;
  report += `- **Categorias de Receita**: ${extractedData.revenues.length}\n\n`;

  // Rúbricas encontradas
  if (extractedData.rubricas.length > 0) {
    report += '## 🏷️ Rúbricas Encontradas (XMIND)\n\n';
    extractedData.rubricas.forEach(rubrica => {
      report += `- ${rubrica}\n`;
    });
    report += '\n';
  }

  // Hierarquia de categorias recomendada
  report += '## 🎯 Hierarquia de Categorias Recomendada\n\n';

  hierarchy.mainCategories.forEach(category => {
    report += `### ${category.name} (${category.type})\n`;
    report += `**Cor**: ${category.color}\n`;
    report += `**Descrição**: ${category.description}\n\n`;

    const subcats = hierarchy.subcategories[category.id];
    if (subcats) {
      Object.entries(subcats).forEach(([subName, subData]) => {
        report += `#### ${subName}\n`;
        report += `**Exemplos**: ${subData.examples.join(', ')}\n\n`;
      });
    }
  });

  // Salvar relatório
  const reportPath = path.join(__dirname, '../docs/categories-report.md');
  fs.writeFileSync(reportPath, report);

  console.log(`📄 Relatório de categorias salvo em: ${reportPath}`);
}

// Executar extração
if (require.main === module) {
  main();
}

module.exports = { extractCategoriesFromXMIND, createCategoryHierarchy };