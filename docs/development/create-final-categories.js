const path = require('path');

// Mapeamento final das categorias baseado nos dados extraídos
const extractedRubrics = [
  "13º SALARIO", "ALUGUEL", "ALUGUEL DE MÁQUINAS E EQUIPAMENTOS",
  "ASSISTÊNCIA MÉDICA", "ASSISTÊNCIA ODONTOLÓGICA", "CARTÓRIO", "COFINS",
  "COMISSÕES", "CONSERVAÇÃO E LIMPEZA", "CONSULTORIA", "CONTRIBUICAO SINDICAL",
  "CORREIOS", "CUSTAS JUDICIAIS", "DESP. LOCOMOÇÃO", "DESPESAS COM VIAGENS",
  "ENERGIA ELETRICA", "EXAME ADMISSIONAL/PERIODICO", "FGTS", "FOLHA PJ", "FÉRIAS",
  "INSS", "INTERNET", "LEASING / FINAME", "LICENÇAS DIVERSAS",
  "MANUTENÇÃO DE EQUIPAMENTOS", "MANUTENÇÃO DE HARDWARE", "MANUTENÇÃO PREDIAL",
  "MARKETING E PUBLICIDADE", "MATERIAL DE EMBALAGEM", "MATERIAL DE ESCRITÓRIO",
  "MATERIAL DE LIMPEZA", "OPERADORES LOGÍSTICOS", "OUTRAS DESPESAS NOP",
  "OUTROS TRIBUTOS", "PRO LABORE", "SALARIOS", "SEGUROS DE VIDA",
  "SEGUROS GERAIS", "SERVIÇOS DE ADVOCACIA", "SERVIÇOS DE CONTABILIDADE",
  "SERVIÇOS PRESTADOS PF", "SOFTWARES", "TARIFAS BANCÁRIAS", "TELEFONES FIXOS",
  "TELEFONES MÓVEIS", "VALE ALIMENTAÇÃO", "VALE REFEIÇÃO", "VALE TRANSPORTE"
];

// Mapeamento das rúbricas para categorias do sistema
function createMapping() {
  return {
    // Custos Fixos - Pessoal
    "SALARIOS": {
      category: "Salários e Encargos",
      type: "fixed_cost",
      subcategory: "Salários",
      color: "#EF4444",
      examples: ["Salário Base", "Comissões Fixas", "Horas Extras"]
    },
    "PRO LABORE": {
      category: "Salários e Encargos",
      type: "fixed_cost",
      subcategory: "Pró-labore",
      color: "#EF4444",
      examples: ["Pró-labore Sócios", "Retirada de Pro-labore"]
    },
    "FOLHA PJ": {
      category: "Salários e Encargos",
      type: "fixed_cost",
      subcategory: "Prestadores PJ",
      color: "#EF4444",
      examples: ["Consultores PJ", "Serviços Terceirizados"]
    },
    "FÉRIAS": {
      category: "Salários e Encargos",
      type: "fixed_cost",
      subcategory: "Férias e Décimo",
      color: "#EF4444",
      examples: ["Férias Vencidas", "Férias Proporcionais", "1/3 de Férias"]
    },
    "13º SALARIO": {
      category: "Salários e Encargos",
      type: "fixed_cost",
      subcategory: "Férias e Décimo",
      color: "#EF4444",
      examples: ["13º Salário Integral", "13º Proporcional"]
    },
    "INSS": {
      category: "Salários e Encargos",
      type: "fixed_cost",
      subcategory: "Encargos Sociais",
      color: "#DC2626",
      examples: ["INSS Empresa", "INSS Retido"]
    },
    "FGTS": {
      category: "Salários e Encargos",
      type: "fixed_cost",
      subcategory: "Encargos Sociais",
      color: "#DC2626",
      examples: ["FGTS Mês", "FGTS Rescisório", "Multa FGTS"]
    },
    "VALE TRANSPORTE": {
      category: "Salários e Encargos",
      type: "fixed_cost",
      subcategory: "Benefícios",
      color: "#B91C1C",
      examples: ["Vale Transporte Mensal", "Recarga VT"]
    },
    "VALE REFEIÇÃO": {
      category: "Salários e Encargos",
      type: "fixed_cost",
      subcategory: "Benefícios",
      color: "#B91C1C",
      examples: ["Vale Refeição", "Refeição Convênio"]
    },
    "VALE ALIMENTAÇÃO": {
      category: "Salários e Encargos",
      type: "fixed_cost",
      subcategory: "Benefícios",
      color: "#B91C1C",
      examples: ["Vale Alimentação", "Cesta Alimentação"]
    },
    "ASSISTÊNCIA MÉDICA": {
      category: "Salários e Encargos",
      type: "fixed_cost",
      subcategory: "Benefícios",
      color: "#B91C1C",
      examples: ["Plano Saúde", "Seguro Saúde"]
    },
    "ASSISTÊNCIA ODONTOLÓGICA": {
      category: "Salários e Encargos",
      type: "fixed_cost",
      subcategory: "Benefícios",
      color: "#B91C1C",
      examples: ["Plano Odontológico", "Seguro Dental"]
    },
    "EXAME ADMISSIONAL/PERIODICO": {
      category: "Salários e Encargos",
      type: "fixed_cost",
      subcategory: "Benefícios",
      color: "#B91C1C",
      examples: ["ASO Admissional", "ASO Periódico"]
    },

    // Custos Fixos - Estrutura
    "ALUGUEL": {
      category: "Aluguel e Ocupação",
      type: "fixed_cost",
      subcategory: "Aluguel Comercial",
      color: "#F59E0B",
      examples: ["Aluguel Loja", "Aluguel Escritório", "Aluguel Galpão"]
    },
    "ALUGUEL DE MÁQUINAS E EQUIPAMENTOS": {
      category: "Aluguel e Ocupação",
      type: "fixed_cost",
      subcategory: "Locação de Equipamentos",
      color: "#D97706",
      examples: ["Aluguel Máquinas", "Leasing Equipamentos", "Locação Veículos"]
    },
    "LEASING / FINAME": {
      category: "Aluguel e Ocupação",
      type: "fixed_cost",
      subcategory: "Locação de Equipamentos",
      color: "#D97706",
      examples: ["Arrendamento Mercantil", "Finame"]
    },
    "MANUTENÇÃO PREDIAL": {
      category: "Manutenção e Serviços",
      type: "fixed_cost",
      subcategory: "Manutenção Predial",
      color: "#D97706",
      examples: ["Consertos Prediais", "Pintura", "Reformas Pequenas"]
    },
    "CONSERVAÇÃO E LIMPEZA": {
      category: "Manutenção e Serviços",
      type: "fixed_cost",
      subcategory: "Limpeza e Conservação",
      color: "#B45309",
      examples: ["Limpeza Mensal", "Conservação", "Dedetização"]
    },
    "MANUTENÇÃO DE EQUIPAMENTOS": {
      category: "Manutenção e Serviços",
      type: "fixed_cost",
      subcategory: "Manutenção de Equipamentos",
      color: "#B45309",
      examples: ["Manutenção Ar Condicionado", "Conserto Máquinas"]
    },
    "MANUTENÇÃO DE HARDWARE": {
      category: "Tecnologia e Software",
      type: "fixed_cost",
      subcategory: "Suporte Técnico",
      color: "#059669",
      examples: ["Manutenção Computadores", "Suporte TI"]
    },

    // Custos Fixos - Tecnologia
    "SOFTWARES": {
      category: "Tecnologia e Software",
      type: "fixed_cost",
      subcategory: "Software",
      color: "#059669",
      examples: ["Licenças Software", "SaaS", "Aplicativos"]
    },
    "LICENÇAS DIVERSAS": {
      category: "Tecnologia e Software",
      type: "fixed_cost",
      subcategory: "Licenças",
      color: "#047857",
      examples: ["Licenças Especiais", "Certificados Digitais"]
    },
    "INTERNET": {
      category: "Tecnologia e Software",
      type: "fixed_cost",
      subcategory: "Conectividade",
      color: "#047857",
      examples: ["Internet Fibra", "Link Dedicado"]
    },
    "TELEFONES FIXOS": {
      category: "Tecnologia e Software",
      type: "fixed_cost",
      subcategory: "Telecomunicações",
      color: "#065F46",
      examples: ["Telefone Fixo", "PABX"]
    },
    "TELEFONES MÓVEIS": {
      category: "Tecnologia e Software",
      type: "fixed_cost",
      subcategory: "Telecomunicações",
      color: "#065F46",
      examples: ["Celular Empresa", "Plano Móvel Corporativo"]
    },

    // Custos Fixos - Serviços Profissionais
    "SERVIÇOS DE CONTABILIDADE": {
      category: "Serviços Profissionais",
      type: "fixed_cost",
      subcategory: "Contabilidade",
      color: "#7C3AED",
      examples: ["Honorários Contábeis", "Declarações"]
    },
    "SERVIÇOS DE ADVOCACIA": {
      category: "Serviços Profissionais",
      type: "fixed_cost",
      subcategory: "Jurídico",
      color: "#7C3AED",
      examples: ["Honorários Advogado", "Consultoria Jurídica"]
    },
    "CONSULTORIA": {
      category: "Serviços Profissionais",
      type: "fixed_cost",
      subcategory: "Consultoria",
      color: "#6D28D9",
      examples: ["Consultoria Empresarial", "Consultoria Técnica"]
    },
    "CARTÓRIO": {
      category: "Serviços Profissionais",
      type: "fixed_cost",
      subcategory: "Documentação",
      color: "#6D28D9",
      examples: ["Taxas Cartório", "Registros", "Certidões"]
    },
    "CUSTAS JUDICIAIS": {
      category: "Serviços Profissionais",
      type: "fixed_cost",
      subcategory: "Jurídico",
      color: "#6D28D9",
      examples: ["Custas Processuais", "Honorários Peritos"]
    },

    // Custos Fixos - Seguros e Tributos
    "SEGUROS GERAIS": {
      category: "Seguros e Proteção",
      type: "fixed_cost",
      subcategory: "Seguros Empresariais",
      color: "#DC2626",
      examples: ["Seguro Empresarial", "Seguro Incêndio"]
    },
    "SEGUROS DE VIDA": {
      category: "Seguros e Proteção",
      type: "fixed_cost",
      subcategory: "Seguros de Pessoal",
      color: "#B91C1C",
      examples: ["Seguro Vida Grupo", "Seguro Acidentes"]
    },
    "COFINS": {
      category: "Tributos e Contribuições",
      type: "fixed_cost",
      subcategory: "Tributos Federais",
      color: "#991B1B",
      examples: ["COFINS Mensal", "COFINS Cumulativo"]
    },
    "OUTROS TRIBUTOS": {
      category: "Tributos e Contribuições",
      type: "fixed_cost",
      subcategory: "Outros Tributos",
      color: "#7F1D1D",
      examples: ["ISS", "Taxas Diversas"]
    },
    "CONTRIBUICAO SINDICAL": {
      category: "Tributos e Contribuições",
      type: "fixed_cost",
      subcategory: "Contribuições",
      color: "#7F1D1D",
      examples: ["Contribuição Sindical", "Contribuição Confederativa"]
    },

    // Custos Fixos - Operacionais
    "ENERGIA ELETRICA": {
      category: "Utilidades e Insumos",
      type: "fixed_cost",
      subcategory: "Energia",
      color: "#0891B2",
      examples: ["Conta de Luz", "Iluminação Pública"]
    },
    "MATERIAL DE ESCRITÓRIO": {
      category: "Utilidades e Insumos",
      type: "fixed_cost",
      subcategory: "Material de Escritório",
      color: "#0E7490",
      examples: ["Papelaria", "Material Higiene", "Copos Descartáveis"]
    },
    "MATERIAL DE LIMPEZA": {
      category: "Utilidades e Insumos",
      type: "fixed_cost",
      subcategory: "Material de Limpeza",
      color: "#155E75",
      examples: ["Produtos Limpeza", "EPI's"]
    },
    "CORREIOS": {
      category: "Utilidades e Insumos",
      type: "fixed_cost",
      subcategory: "Serviços Postais",
      color: "#164E63",
      examples: ["Cartas Registradas", "Sedex", "Encomendas"]
    },

    // Custos Variáveis
    "COMISSÕES": {
      category: "Comissões e Variáveis",
      type: "variable_cost",
      subcategory: "Comissões de Vendas",
      color: "#CA8A04",
      examples: ["Comissão Vendedor", "Comissão Repres", "Bônus Vendas"]
    },
    "MATERIAL DE EMBALAGEM": {
      category: "Custos de Produtos",
      type: "variable_cost",
      subcategory: "Embalagem",
      color: "#A16207",
      examples: ["Caixas", "Etiquetas", "Plástico Bolha"]
    },
    "OPERADORES LOGÍSTICOS": {
      category: "Logística e Distribuição",
      type: "variable_cost",
      subcategory: "Transporte",
      color: "#92400E",
      examples: ["Transportadora", "Entregas", "Logística"]
    },
    "DESPESAS COM VIAGENS": {
      category: "Logística e Distribuição",
      type: "variable_cost",
      subcategory: "Viagens",
      color: "#78350F",
      examples: ["Hospedagem", "Passagens", "Alimentação Viagem"]
    },
    "DESP. LOCOMOÇÃO": {
      category: "Logística e Distribuição",
      type: "variable_cost",
      subcategory: "Transporte Local",
      color: "#451A03",
      examples: ["Uber/99", "Táxi", "Combustível Próprio"]
    },

    // Não Operacional
    "TARIFAS BANCÁRIAS": {
      category: "Serviços Financeiros",
      type: "non_operational",
      subcategory: "Taxas Bancárias",
      color: "#6B7280",
      examples: ["Taxa manutenção", "TED", "DOC", "Anuidades"]
    },
    "SERVIÇOS PRESTADOS PF": {
      category: "Serviços Diversos",
      type: "non_operational",
      subcategory: "Prestadores PF",
      color: "#4B5563",
      examples: ["Autônomos", "Freelancers", "Pequenos Serviços"]
    },
    "OUTRAS DESPESAS NOP": {
      category: "Serviços Diversos",
      type: "non_operational",
      subcategory: "Outras Despesas",
      color: "#374151",
      examples: ["Despesas Eventuais", "Não Classificadas"]
    }
  };
}

// Função para gerar estrutura final de categorias
function generateFinalCategories() {
  const mapping = createMapping();

  const categories = {
    revenue: {
      name: "Receitas",
      type: "revenue",
      color: "#10B981",
      description: "Todas as entradas de dinheiro",
      subcategories: {
        "Vendas de Produtos": {
          color: "#059669",
          examples: ["Venda Mercadorias", "Receita Vendas", "Faturamento"]
        },
        "Vendas de Serviços": {
          color: "#047857",
          examples: ["Prestação Serviços", "Honorários", "Consultorias"]
        },
        "Receitas Financeiras": {
          color: "#065F46",
          examples: ["Juros Recebidos", "Rendimentos", "Descontos Obtidos"]
        }
      }
    },
    variable_cost: {
      name: "Custos Variáveis",
      type: "variable_cost",
      color: "#F59E0B",
      description: "Custos que variam com o volume de vendas",
      subcategories: {
        "Comissões e Variáveis": {
          color: "#D97706",
          examples: ["Comissões Vendas", "Bônus Variáveis", "Participação Lucros"]
        },
        "Custos de Produtos": {
          color: "#B45309",
          examples: ["Matéria Prima", "Embalagem", "Insumos Diretos"]
        },
        "Logística e Distribuição": {
          color: "#92400E",
          examples: ["Transporte", "Viagens", "Logística"]
        }
      }
    },
    fixed_cost: {
      name: "Custos Fixos",
      type: "fixed_cost",
      color: "#EF4444",
      description: "Custos fixos mensais da empresa",
      subcategories: {
        "Salários e Encargos": {
          color: "#DC2626",
          examples: ["Salários", "Pró-labore", "INSS", "FGTS", "Benefícios"]
        },
        "Aluguel e Ocupação": {
          color: "#B91C1C",
          examples: ["Aluguel", "Condomínio", "Locação Equipamentos"]
        },
        "Tecnologia e Software": {
          color: "#991B1B",
          examples: ["Software", "Internet", "Telefonia", "Suporte TI"]
        },
        "Serviços Profissionais": {
          color: "#7F1D1D",
          examples: ["Contabilidade", "Advocacia", "Consultoria"]
        },
        "Manutenção e Serviços": {
          color: "#450A0A",
          examples: ["Manutenção Predial", "Limpeza", "Consertos"]
        },
        "Utilidades e Insumos": {
          color: "#7C2D12",
          examples: ["Energia Elétrica", "Material Escritório", "Correios"]
        },
        "Seguros e Proteção": {
          color: "#EA580C",
          examples: ["Seguros Empresariais", "Seguro Vida"]
        },
        "Tributos e Contribuições": {
          color: "#C2410C",
          examples: ["COFINS", "Contribuições Sindical", "Outros Tributos"]
        }
      }
    },
    non_operational: {
      name: "Não Operacional",
      type: "non_operational",
      color: "#6B7280",
      description: "Receitas e despesas não operacionais",
      subcategories: {
        "Serviços Financeiros": {
          color: "#4B5563",
          examples: ["Taxas Bancárias", "Juros Passivos", "Multa Contratos"]
        },
        "Serviços Diversos": {
          color: "#374151",
          examples: ["Prestadores PF", "Outras Despesas", "Eventuais"]
        }
      }
    }
  };

  return { categories, mapping };
}

// Função principal
function main() {
  console.log('🚀 Gerando estrutura final de categorias...\n');

  const { categories, mapping } = generateFinalCategories();

  // Salvar estrutura completa
  const outputPath = path.join(__dirname, '../docs/final-categories.json');
  require('fs').writeFileSync(outputPath, JSON.stringify({
    categories: categories,
    rubricMapping: mapping,
    summary: {
      totalCategories: Object.keys(categories).length,
      totalSubcategories: Object.values(categories).reduce((acc, cat) => acc + Object.keys(cat.subcategories).length, 0),
      totalRubrics: Object.keys(mapping).length
    }
  }, null, 2));

  console.log(`✅ Estrutura final criada!`);
  console.log(`📊 Salvo em: ${outputPath}`);
  console.log(`📈 Resumo: ${Object.keys(categories).length} categorias principais, ${Object.keys(mapping).length} rúbricas mapeadas`);
}

// Executar
if (require.main === module) {
  main();
}

module.exports = { generateFinalCategories, createMapping };