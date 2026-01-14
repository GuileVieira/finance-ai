// Categorias geradas a partir das 53 rúbricas extraídas dos arquivos XMIND
import { Category, AutoRule } from '@/lib/types';

// 53 categorias específicas extraídas dos arquivos financeiros

// Categorias de Receita (adicionadas manualmente, pois não existem no JSON original)
const revenueCategories: Category[] = [
  {
    id: '1',
    name: 'Vendas de Produtos',
    type: 'revenue' as const,
    colorHex: '#6EE7B7',
    icon: '💰',
    description: 'Venda de mercadorias e produtos para clientes',
    examples: ['Venda Mercadorias', 'Receita Vendas', 'Faturamento Clientes'],
    totalAmount: 156000,
    transactionCount: 248,
    percentage: 42.1,
    dreGroup: 'RoB'
  },
  {
    id: '2',
    name: 'Vendas de Serviços',
    type: 'revenue',
    colorHex: '#4dffc8',
    icon: '🛠️',
    description: 'Prestação de serviços especializados e consultoria',
    examples: ['Honorários de Serviços', 'Consultoria Empresarial', 'Serviços de TI', 'Manutenção de Software'],
    totalAmount: 89600,
    transactionCount: 143,
    percentage: 24.1,
    dreGroup: 'RoB'
  },
  {
    id: '3',
    name: 'Receitas Financeiras',
    type: 'revenue',
    colorHex: '#C4B5FD',
    icon: '📈',
    description: 'Rendimentos de aplicações financeiras, juros e investimentos',
    examples: ['Juros Ativos', 'Rendimentos Aplicações', 'Dividendos', 'Aluguél Recebido'],
    totalAmount: 75400,
    transactionCount: 89,
    percentage: 20.3,
    dreGroup: 'RNOP'
  },
  {
    id: '4',
    name: 'Receitas de Aluguéis',
    type: 'revenue',
    colorHex: '#4dffcc',
    icon: '🏠',
    description: 'Aluguel de imóveis e receitas de sublocação',
    examples: ['Aluguel Recebido', 'Sublocação Mensal', 'Aluguel Antecipado'],
    totalAmount: 12500,
    transactionCount: 67,
    percentage: 3.4,
    dreGroup: 'RNOP'
  }
];

// Combinar categorias específicas (despesas) com categorias de receita (4)
export const mockCategories: Category[] = [
  // Categorias de Receita
  ...revenueCategories,
  // Categorias de Despesa
  {
    id: '101',
    name: '13º SALARIO',
    type: 'fixed_cost' as const,
    colorHex: '#FCA5A5',
    totalAmount: 2632,
    transactionCount: 22,
    percentage: 6.1,
    icon: '👥',
    description: 'Pagamento do décimo terceiro salário aos funcionários',
    examples: ["13º SALARIO", "13º SALARIO"]
  },
  {
    id: '5',
    name: 'ALUGUEL',
    type: 'fixed_cost',
    colorHex: '#ed5f5f',
    totalAmount: 10176,
    transactionCount: 25,
    percentage: 7.1,
    icon: '🏠',
    description: 'Pagamento de aluguel de imóvel comercial ou sede',
    examples: ["ALUGUEL", "ALUGUEL"]
  },
  {
    id: '6',
    name: 'ALUGUEL DE MÁQUINAS E EQUIPAMENTOS',
    type: 'fixed_cost',
    colorHex: '#ed5f5f',
    totalAmount: 7462,
    transactionCount: 53,
    percentage: 7.1,
    icon: '🏠',
    description: 'Aluguel de máquinas, veículos e equipamentos operacionais',
    examples: ["ALUGUEL DE MÁQUINAS E EQUIPAMENTOS", "ALUGUEL DE MÁQUINAS E EQUIPAMENTOS"]
  },
  {
    id: '7',
    name: 'ASSISTÊNCIA MÉDICA',
    type: 'fixed_cost',
    colorHex: '#FCA5A5',
    totalAmount: 5981,
    transactionCount: 26,
    percentage: 7.1,
    icon: '👥',
    description: 'Plano de saúde e convênio médico para funcionários',
    examples: ["ASSISTÊNCIA MÉDICA", "ASSISTÊNCIA MÉDICA"]
  },
  {
    id: '8',
    name: 'ASSISTÊNCIA ODONTOLÓGICA',
    type: 'fixed_cost',
    colorHex: '#FCA5A5',
    totalAmount: 7131,
    transactionCount: 10,
    percentage: 3.1,
    icon: '👥',
    description: 'Convênio e plano odontológico para funcionários',
    examples: ["ASSISTÊNCIA ODONTOLÓGICA", "ASSISTÊNCIA ODONTOLÓGICA"]
  },
  {
    id: '9',
    name: 'CARTÓRIO',
    type: 'fixed_cost',
    colorHex: '#e36868',
    totalAmount: 1055,
    transactionCount: 45,
    percentage: 4.1,
    icon: '👔',
    description: 'Taxas e serviços cartoriais, reconhecimento de firma',
    examples: ["CARTÓRIO", "CARTÓRIO"]
  },
  {
    id: '10',
    name: 'COFINS',
    type: 'non_operational' as const,
    colorHex: '#fc824f',
    totalAmount: 5943,
    transactionCount: 41,
    percentage: 1.1,
    icon: '📋',
    description: 'Contribuição para Financiamento da Seguridade Social',
    examples: ["COFINS", "COFINS"]
  },
  {
    id: '11',
    name: 'COMISSÕES',
    type: 'variable_cost' as const,
    colorHex: '#ffac4d',
    totalAmount: 10214,
    transactionCount: 24,
    percentage: 8.1,
    icon: '💸',
    description: 'Comissões de vendas pagas a vendedores e representantes',
    examples: ["COMISSÕES", "COMISSÕES"]
  },
  {
    id: '12',
    name: 'CONSERVAÇÃO E LIMPEZA',
    type: 'fixed_cost',
    colorHex: '#FCD34D',
    totalAmount: 9386,
    transactionCount: 26,
    percentage: 4.1,
    icon: '🔧',
    description: 'Serviços de limpeza e manutenção do ambiente',
    examples: ["CONSERVAÇÃO E LIMPEZA", "CONSERVAÇÃO E LIMPEZA"]
  },
  {
    id: '13',
    name: 'CONSULTORIA',
    type: 'fixed_cost',
    colorHex: '#e36868',
    totalAmount: 5179,
    transactionCount: 49,
    percentage: 6.1,
    icon: '👔',
    description: 'Serviços de consultoria empresarial ou técnica',
    examples: ["CONSULTORIA", "CONSULTORIA"]
  },
  {
    id: '14',
    name: 'CONTRIBUICAO SINDICAL',
    type: 'non_operational',
    colorHex: '#fc824f',
    totalAmount: 7063,
    transactionCount: 51,
    percentage: 7.1,
    icon: '📋',
    description: 'Contribuição sindical obrigatória ou assistencial',
    examples: ["CONTRIBUICAO SINDICAL", "CONTRIBUICAO SINDICAL"]
  },
  {
    id: '15',
    name: 'CORREIOS',
    type: 'variable_cost',
    colorHex: '#f79255',
    totalAmount: 7748,
    transactionCount: 8,
    percentage: 7.1,
    icon: '🚚',
    description: 'Serviços postais, envio de correspondências',
    examples: ["CORREIOS", "CORREIOS"]
  },
  {
    id: '16',
    name: 'CUSTAS JUDICIAIS',
    type: 'non_operational',
    colorHex: '#98a3b3',
    totalAmount: 9451,
    transactionCount: 37,
    percentage: 0.1,
    icon: '⚖️',
    description: 'Custas processuais e despesas judiciais',
    examples: ["CUSTAS JUDICIAIS", "CUSTAS JUDICIAIS"]
  },
  {
    id: '18',
    name: 'DESP. LOCOMOÇÃO',
    type: 'variable_cost',
    colorHex: '#f79255',
    totalAmount: 9461,
    transactionCount: 36,
    percentage: 9.1,
    icon: '🚚',
    description: 'Despesas com transporte urbano, táxi, apps',
    examples: ["DESP. LOCOMOÇÃO", "DESP. LOCOMOÇÃO"]
  },
  {
    id: '19',
    name: 'DESPESAS COM VIAGENS',
    type: 'variable_cost',
    colorHex: '#f79255',
    totalAmount: 9386,
    transactionCount: 31,
    percentage: 8.1,
    icon: '✈️',
    description: 'Passagens, hospedagem e diárias em viagens',
    examples: ["DESPESAS COM VIAGENS", "DESPESAS COM VIAGENS"]
  },
  {
    id: '20',
    name: 'ENERGIA ELETRICA',
    type: 'fixed_cost',
    colorHex: '#D1D5DB',
    totalAmount: 9187,
    transactionCount: 6,
    percentage: 9.1,
    icon: '⚡',
    description: 'Fornecimento de energia elétrica',
    examples: ["ENERGIA ELETRICA", "ENERGIA ELETRICA"]
  },
  {
    id: '21',
    name: 'EXAME ADMISSIONAL/PERIODICO',
    type: 'fixed_cost',
    colorHex: '#FCA5A5',
    totalAmount: 7999,
    transactionCount: 50,
    percentage: 9.1,
    icon: '🩺',
    description: 'Exames médicos de admissão e periódicos',
    examples: ["EXAME ADMISSIONAL/PERIODICO", "EXAME ADMISSIONAL/PERIODICO"]
  },
  {
    id: '22',
    name: 'FGTS',
    type: 'fixed_cost',
    colorHex: '#FCA5A5',
    totalAmount: 10101,
    transactionCount: 17,
    percentage: 6.1,
    icon: '👥',
    description: 'Fundo de Garantia do Tempo de Serviço',
    examples: ["FGTS", "FGTS"]
  },
  {
    id: '23',
    name: 'FOLHA PJ',
    type: 'fixed_cost',
    colorHex: '#FCA5A5',
    totalAmount: 8550,
    transactionCount: 9,
    percentage: 6.1,
    icon: '👥',
    description: 'Pagamento de prestadores PJ (freelancers)',
    examples: ["FOLHA PJ", "FOLHA PJ"]
  },
  {
    id: '24',
    name: 'FÉRIAS',
    type: 'fixed_cost',
    colorHex: '#FCA5A5',
    totalAmount: 5652,
    transactionCount: 42,
    percentage: 9.1,
    icon: '🏖️',
    description: 'Pagamento de férias e abono aos funcionários',
    examples: ["FÉRIAS", "FÉRIAS"]
  },
  {
    id: '25',
    name: 'INSS',
    type: 'fixed_cost',
    colorHex: '#FCA5A5',
    totalAmount: 7249,
    transactionCount: 20,
    percentage: 4.1,
    icon: '👥',
    description: 'Contribuição previdenciária patronal e do funcionário',
    examples: ["INSS", "INSS"]
  },
  {
    id: '26',
    name: 'INTERNET',
    type: 'fixed_cost',
    colorHex: '#ea6161',
    totalAmount: 7259,
    transactionCount: 42,
    percentage: 1.1,
    icon: '💻',
    description: 'Serviço de internet e banda larga',
    examples: ["INTERNET", "INTERNET"]
  },
  {
    id: '27',
    name: 'LEASING / FINAME',
    type: 'non_operational',
    colorHex: '#93a1b9',
    totalAmount: 7340,
    transactionCount: 9,
    percentage: 5.1,
    icon: '🏛️',
    description: 'Financiamento via FINAME ou leasing',
    examples: ["LEASING / FINAME", "LEASING / FINAME"]
  },
  {
    id: '28',
    name: 'LICENÇAS DIVERSAS',
    type: 'fixed_cost',
    colorHex: '#ea6161',
    totalAmount: 8197,
    transactionCount: 42,
    percentage: 0.1,
    icon: '💻',
    description: 'Licenças de software, alvarás e permissões',
    examples: ["LICENÇAS DIVERSAS", "LICENÇAS DIVERSAS"]
  },
  {
    id: '29',
    name: 'MANUTENÇÃO DE EQUIPAMENTOS',
    type: 'fixed_cost',
    colorHex: '#FCD34D',
    totalAmount: 1448,
    transactionCount: 43,
    percentage: 9.1,
    icon: '🔧',
    description: 'Manutenção preventiva e corretiva de equipamentos',
    examples: ["MANUTENÇÃO DE EQUIPAMENTOS", "MANUTENÇÃO DE EQUIPAMENTOS"]
  },
  {
    id: '30',
    name: 'MANUTENÇÃO DE HARDWARE',
    type: 'fixed_cost',
    colorHex: '#FCD34D',
    totalAmount: 1789,
    transactionCount: 7,
    percentage: 4.1,
    icon: '🔧',
    description: 'Manutenção de computadores e servidores',
    examples: ["MANUTENÇÃO DE HARDWARE", "MANUTENÇÃO DE HARDWARE"]
  },
  {
    id: '31',
    name: 'MANUTENÇÃO PREDIAL',
    type: 'fixed_cost',
    colorHex: '#FCD34D',
    totalAmount: 8688,
    transactionCount: 47,
    percentage: 6.1,
    icon: '🔧',
    description: 'Manutenção do prédio e instalações',
    examples: ["MANUTENÇÃO PREDIAL", "MANUTENÇÃO PREDIAL"]
  },
  {
    id: '32',
    name: 'MARKETING E PUBLICIDADE',
    type: 'variable_cost',
    colorHex: '#ffac4d',
    totalAmount: 10741,
    transactionCount: 27,
    percentage: 0.1,
    icon: '📣',
    description: 'Campanhas de marketing e publicidade',
    examples: ["MARKETING E PUBLICIDADE", "MARKETING E PUBLICIDADE"]
  },
  {
    id: '33',
    name: 'MATERIAL DE EMBALAGEM',
    type: 'variable_cost',
    colorHex: '#ff9a4d',
    totalAmount: 4073,
    transactionCount: 40,
    percentage: 4.1,
    icon: '📦',
    description: 'Caixas e materiais para embalar produtos',
    examples: ["MATERIAL DE EMBALAGEM", "MATERIAL DE EMBALAGEM"]
  },
  {
    id: '34',
    name: 'MATERIAL DE ESCRITÓRIO',
    type: 'variable_cost',
    colorHex: '#ff9a4d',
    totalAmount: 1358,
    transactionCount: 10,
    percentage: 5.1,
    icon: '📦',
    description: 'Papelaria e suprimentos de escritório',
    examples: ["MATERIAL DE ESCRITÓRIO", "MATERIAL DE ESCRITÓRIO"]
  },
  {
    id: '35',
    name: 'MATERIAL DE LIMPEZA',
    type: 'fixed_cost',
    colorHex: '#FCD34D',
    totalAmount: 2560,
    transactionCount: 48,
    percentage: 3.1,
    icon: '🔧',
    description: 'Materiais de limpeza e higiene',
    examples: ["MATERIAL DE LIMPEZA", "MATERIAL DE LIMPEZA"]
  },
  {
    id: '36',
    name: 'OPERADORES LOGÍSTICOS',
    type: 'variable_cost',
    colorHex: '#f79255',
    totalAmount: 3399,
    transactionCount: 11,
    percentage: 8.1,
    icon: '🚚',
    description: 'Serviços de frete e logística',
    examples: ["OPERADORES LOGÍSTICOS", "OPERADORES LOGÍSTICOS"]
  },
  {
    id: '37',
    name: 'OUTRAS DESPESAS NOP',
    type: 'non_operational',
    colorHex: '#D1D5DB',
    totalAmount: 2088,
    transactionCount: 50,
    percentage: 9.1,
    icon: '📄',
    description: 'Despesas diversas não classificadas',
    examples: ["OUTRAS DESPESAS NOP", "OUTRAS DESPESAS NOP"]
  },
  {
    id: '38',
    name: 'OUTROS TRIBUTOS',
    type: 'non_operational',
    colorHex: '#fc824f',
    totalAmount: 6833,
    transactionCount: 53,
    percentage: 6.1,
    icon: '📋',
    description: 'Outros tributos federais, estaduais ou municipais',
    examples: ["OUTROS TRIBUTOS", "OUTROS TRIBUTOS"]
  },
  {
    id: '39',
    name: 'PRO LABORE',
    type: 'fixed_cost',
    colorHex: '#FCA5A5',
    totalAmount: 5275,
    transactionCount: 23,
    percentage: 3.1,
    icon: '👥',
    description: 'Remuneração dos sócios administradores',
    examples: ["PRO LABORE", "PRO LABORE"]
  },
  {
    id: '41',
    name: 'SALARIOS',
    type: 'fixed_cost',
    colorHex: '#FCA5A5',
    totalAmount: 2280,
    transactionCount: 45,
    percentage: 3.1,
    icon: '👥',
    description: 'Folha de pagamento dos funcionários CLT',
    examples: ["SALARIOS", "SALARIOS"]
  },
  {
    id: '42',
    name: 'SEGUROS DE VIDA',
    type: 'non_operational',
    colorHex: '#93a1b9',
    totalAmount: 4964,
    transactionCount: 21,
    percentage: 9.1,
    icon: '🏛️',
    description: 'Seguro de vida em grupo para funcionários',
    examples: ["SEGUROS DE VIDA", "SEGUROS DE VIDA"]
  },
  {
    id: '43',
    name: 'SEGUROS GERAIS',
    type: 'non_operational',
    colorHex: '#93a1b9',
    totalAmount: 9250,
    transactionCount: 40,
    percentage: 5.1,
    icon: '🏛️',
    description: 'Seguros patrimoniais e responsabilidade civil',
    examples: ["SEGUROS GERAIS", "SEGUROS GERAIS"]
  },
  {
    id: '44',
    name: 'SERVIÇOS DE ADVOCACIA',
    type: 'fixed_cost',
    colorHex: '#e36868',
    totalAmount: 4970,
    transactionCount: 49,
    percentage: 3.1,
    icon: '👔',
    description: 'Serviços jurídicos e advocatícios',
    examples: ["SERVIÇOS DE ADVOCACIA", "SERVIÇOS DE ADVOCACIA"]
  },
  {
    id: '45',
    name: 'SERVIÇOS DE CONTABILIDADE',
    type: 'fixed_cost',
    colorHex: '#e36868',
    totalAmount: 5573,
    transactionCount: 25,
    percentage: 2.1,
    icon: '👔',
    description: 'Serviços contábeis e escrituração fiscal',
    examples: ["SERVIÇOS DE CONTABILIDADE", "SERVIÇOS DE CONTABILIDADE"]
  },
  {
    id: '46',
    name: 'SERVIÇOS PRESTADOS PF',
    type: 'variable_cost',
    colorHex: '#ff9a4d',
    totalAmount: 1527,
    transactionCount: 18,
    percentage: 3.1,
    icon: '👷',
    description: 'Pagamento de serviços por pessoa física',
    examples: ["SERVIÇOS PRESTADOS PF", "SERVIÇOS PRESTADOS PF"]
  },
  {
    id: '47',
    name: 'SOFTWARES',
    type: 'fixed_cost',
    colorHex: '#ea6161',
    totalAmount: 8488,
    transactionCount: 32,
    percentage: 4.1,
    icon: '💻',
    description: 'Assinaturas de softwares e SaaS',
    examples: ["SOFTWARES", "SOFTWARES"]
  },
  {
    id: '48',
    name: 'TARIFAS BANCÁRIAS',
    type: 'non_operational',
    colorHex: '#93a1b9',
    totalAmount: 10489,
    transactionCount: 36,
    percentage: 5.1,
    icon: '🏛️',
    description: 'Taxas e tarifas cobradas pelo banco',
    examples: ["TARIFAS BANCÁRIAS", "TARIFAS BANCÁRIAS"]
  },
  {
    id: '49',
    name: 'TELEFONES FIXOS',
    type: 'fixed_cost',
    colorHex: '#D1D5DB',
    totalAmount: 8956,
    transactionCount: 45,
    percentage: 2.1,
    icon: '⚡',
    description: 'Serviço de telefonia fixa comercial',
    examples: ["TELEFONES FIXOS", "TELEFONES FIXOS"]
  },
  {
    id: '50',
    name: 'TELEFONES MÓVEIS',
    type: 'fixed_cost',
    colorHex: '#D1D5DB',
    totalAmount: 8838,
    transactionCount: 9,
    percentage: 3.1,
    icon: '⚡',
    description: 'Serviço de telefonia móvel corporativa',
    examples: ["TELEFONES MÓVEIS", "TELEFONES MÓVEIS"]
  },
  {
    id: '51',
    name: 'VALE ALIMENTAÇÃO',
    type: 'fixed_cost',
    colorHex: '#D1D5DB',
    totalAmount: 4968,
    transactionCount: 29,
    percentage: 8.1,
    icon: '⚡',
    description: 'Benefício de alimentação (VA)',
    examples: ["VALE ALIMENTAÇÃO", "VALE ALIMENTAÇÃO"]
  },
  {
    id: '52',
    name: 'VALE REFEIÇÃO',
    type: 'fixed_cost',
    colorHex: '#D1D5DB',
    totalAmount: 8222,
    transactionCount: 50,
    percentage: 0.1,
    icon: '⚡',
    description: 'Benefício de refeição (VR)',
    examples: ["VALE REFEIÇÃO", "VALE REFEIÇÃO"]
  },
  {
    id: '53',
    name: 'VALE TRANSPORTE',
    type: 'fixed_cost',
    colorHex: '#D1D5DB',
    totalAmount: 2634,
    transactionCount: 31,
    percentage: 8.1,
    icon: '⚡',
    description: 'Benefício de transporte (VT)',
    examples: ["VALE TRANSPORTE", "VALE TRANSPORTE"]
  },
  {
    id: '54',
    name: 'Saldo Inicial',
    type: 'non_operational',
    colorHex: '#9CA3AF',
    icon: '💰',
    description: 'Ajustes de saldo inicial e checkpoints de saldo (ignorado em relatórios)',
    examples: ['SALDO ANTERIOR', 'SALDO TOTAL DISPONÍVEL', 'SALDO DIA'],
    totalAmount: 0,
    transactionCount: 0,
    percentage: 0
  }
];

// Configuração dos tipos de categoria (mantido para compatibilidade)
export const categoryTypes = [
  {
    value: 'revenue',
    label: 'Receitas',
    colorHex: '#6EE7B7',
    color: '#6EE7B7',
    description: 'Todas as entradas de dinheiro'
  },
  {
    value: 'variable_cost',
    label: 'Custos Variáveis',
    colorHex: '#FCD34D',
    color: '#FCD34D',
    description: 'Custos que variam com o volume de vendas'
  },
  {
    value: 'fixed_cost',
    label: 'Custos Fixos',
    colorHex: '#FCA5A5',
    color: '#FCA5A5',
    description: 'Custos fixos mensais'
  },
  {
    value: 'non_operational',
    label: 'Não Operacionais',
    colorHex: '#D1D5DB',
    color: '#D1D5DB',
    description: 'Despesas não relacionadas à operação principal'
  }
];

// Regras automáticas baseadas nas 53 rúbricas
export const mockAutoRules: AutoRule[] = [
  {
    id: '1',
    category: '13º SALARIO',
    pattern: '13º SALARIO',
    type: 'exact',
    accuracy: 100,
    status: 'active'
  },
  {
    id: '2',
    category: 'ALUGUEL',
    pattern: 'ALUGUEL',
    type: 'exact',
    accuracy: 100,
    status: 'active'
  },
  {
    id: '3',
    category: 'ALUGUEL DE MÁQUINAS E EQUIPAMENTOS',
    pattern: 'ALUGUEL DE MÁQUINAS E EQUIPAMENTOS',
    type: 'exact',
    accuracy: 100,
    status: 'active'
  },
  {
    id: '4',
    category: 'ASSISTÊNCIA MÉDICA',
    pattern: 'ASSISTÊNCIA MÉDICA',
    type: 'exact',
    accuracy: 100,
    status: 'active'
  },
  {
    id: '5',
    category: 'ASSISTÊNCIA ODONTOLÓGICA',
    pattern: 'ASSISTÊNCIA ODONTOLÓGICA',
    type: 'exact',
    accuracy: 100,
    status: 'active'
  },
  {
    id: '6',
    category: 'CARTÓRIO',
    pattern: 'CARTÓRIO',
    type: 'exact',
    accuracy: 100,
    status: 'active'
  },
  {
    id: '7',
    category: 'CONSERVAÇÃO E LIMPEZA',
    pattern: 'CONSERVAÇÃO E LIMPEZA',
    type: 'exact',
    accuracy: 100,
    status: 'active'
  },
  {
    id: '8',
    category: 'CONSULTORIA',
    pattern: 'CONSULTORIA',
    type: 'exact',
    accuracy: 100,
    status: 'active'
  },
  {
    id: '9',
    category: 'CORREIOS',
    pattern: 'CORREIOS',
    type: 'exact',
    accuracy: 100,
    status: 'active'
  },
  {
    id: '10',
    category: 'DESP. LOCOMOÇÃO',
    pattern: 'DESP. LOCOMOÇÃO',
    type: 'exact',
    accuracy: 100,
    status: 'active'
  },
  {
    id: '11',
    category: 'ENERGIA ELETRICA',
    pattern: 'ENERGIA ELETRICA',
    type: 'exact',
    accuracy: 100,
    status: 'active'
  },
  {
    id: '12',
    category: 'FGTS',
    pattern: 'FGTS',
    type: 'exact',
    accuracy: 100,
    status: 'active'
  },
  {
    id: '13',
    category: 'FOLHA PJ',
    pattern: 'FOLHA PJ',
    type: 'exact',
    accuracy: 100,
    status: 'active'
  },
  {
    id: '14',
    category: 'INSS',
    pattern: 'INSS',
    type: 'exact',
    accuracy: 100,
    status: 'active'
  },
  {
    id: '15',
    category: 'INTERNET',
    pattern: 'INTERNET',
    type: 'exact',
    accuracy: 100,
    status: 'active'
  },
  {
    id: '16',
    category: 'LICENÇAS DIVERSAS',
    pattern: 'LICENÇAS DIVERSAS',
    type: 'exact',
    accuracy: 100,
    status: 'active'
  },
  {
    id: '17',
    category: 'MANUTENÇÃO DE EQUIPAMENTOS',
    pattern: 'MANUTENÇÃO DE EQUIPAMENTOS',
    type: 'exact',
    accuracy: 100,
    status: 'active'
  },
  {
    id: '18',
    category: 'MANUTENÇÃO DE HARDWARE',
    pattern: 'MANUTENÇÃO DE HARDWARE',
    type: 'exact',
    accuracy: 100,
    status: 'active'
  },
  {
    id: '19',
    category: 'MANUTENÇÃO PREDIAL',
    pattern: 'MANUTENÇÃO PREDIAL',
    type: 'exact',
    accuracy: 100,
    status: 'active'
  },
  {
    id: '20',
    category: 'MARKETING E PUBLICIDADE',
    pattern: 'MARKETING E PUBLICIDADE',
    type: 'exact',
    accuracy: 100,
    status: 'active'
  },
  {
    id: '54',
    category: 'Saldo Inicial',
    pattern: 'SALDO',
    type: 'contains',
    accuracy: 100,
    status: 'active'
  }
];

// Sugestões para nova categoria
export const categorySuggestions = {
  names: ['Outras Despesas', 'Receitas Eventuais', 'Investimentos'],
  descriptions: ['Categorias adicionais para organizar finanças'],
  colors: ['#6EE7B7', '#FCD34D', '#FCA5A5']
};
