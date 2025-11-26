// Categorias geradas a partir das 53 rúbricas extraídas dos arquivos XMIND
import { Category, AutoRule } from '@/lib/types';

// 53 categorias específicas extraídas dos arquivos financeiros

// Categorias de Receita (adicionadas manualmente, pois não existem no JSON original)
const revenueCategories = [
  {
    id: '1',
    name: 'Vendas de Produtos',
    type: 'revenue',
    color: '#10B981',
    icon: '💰',
    description: 'Venda de mercadorias e produtos para clientes',
    examples: ['Venda Mercadorias', 'Receita Vendas', 'Faturamento Clientes'],
    amount: 156000,
    transactions: 248,
    percentage: 42.1
  },
  {
    id: '2',
    name: 'Vendas de Serviços',
    type: 'revenue',
    color: '#059669',
    icon: '🛠️',
    description: 'Prestação de serviços especializados e consultoria',
    examples: ['Honorários de Serviços', 'Consultoria Empresarial', 'Serviços de TI', 'Manutenção de Software'],
    amount: 89600,
    transactions: 143,
    percentage: 24.1
  },
  {
    id: '3',
    name: 'Receitas Financeiras',
    type: 'revenue',
    color: '#8B5CF6',
    icon: '📈',
    description: 'Rendimentos de aplicações financeiras, juros e investimentos',
    examples: ['Juros Ativos', 'Rendimentos Aplicações', 'Dividendos', 'Aluguél Recebido'],
    amount: 75400,
    transactions: 89,
    percentage: 20.3
  },
  {
    id: '4',
    name: 'Receitas de Aluguéis',
    type: 'revenue',
    color: '#047857',
    icon: '🏠',
    description: 'Aluguel de imóveis e receitas de sublocação',
    examples: ['Aluguel Recebido', 'Sublocação Mensal', 'Aluguel Antecipado'],
    amount: 12500,
    transactions: 67,
    percentage: 3.4
  }
];

// Combinar categorias específicas (53 despesas) com categorias de receita (4)
export const mockCategories: Category[] = [
  {
    id: '1',
    name: '13º SALARIO',
    type: 'fixed_cost',
    color: '#EF4444',
    amount: 2632,
    transactions: 22,
    percentage: 6.1,
    icon: '👥',
    description: 'Categoria extraída dos dados financeiros: 13º SALARIO',
    examples: ["13º SALARIO","13º SALARIO"]
  },
    {
    id: '5',
    name: 'ALUGUEL',
    type: 'fixed_cost',
    color: '#DC2626',
    amount: 10176,
    transactions: 25,
    percentage: 7.1,
    icon: '🏠',
    description: 'Categoria extraída dos dados financeiros: ALUGUEL',
    examples: ["ALUGUEL","ALUGUEL"]
  },
  {
    id: '6',
    name: 'ALUGUEL DE MÁQUINAS E EQUIPAMENTOS',
    type: 'fixed_cost',
    color: '#DC2626',
    amount: 7462,
    transactions: 53,
    percentage: 7.1,
    icon: '🏠',
    description: 'Categoria extraída dos dados financeiros: ALUGUEL DE MÁQUINAS E EQUIPAMENTOS',
    examples: ["ALUGUEL DE MÁQUINAS E EQUIPAMENTOS","ALUGUEL DE MÁQUINAS E EQUIPAMENTOS"]
  },
  {
    id: '7',
    name: 'ASSISTÊNCIA MÉDICA',
    type: 'fixed_cost',
    color: '#EF4444',
    amount: 5981,
    transactions: 26,
    percentage: 7.1,
    icon: '👥',
    description: 'Categoria extraída dos dados financeiros: ASSISTÊNCIA MÉDICA',
    examples: ["ASSISTÊNCIA MÉDICA","ASSISTÊNCIA MÉDICA"]
  },
  {
    id: '8',
    name: 'ASSISTÊNCIA ODONTOLÓGICA',
    type: 'fixed_cost',
    color: '#EF4444',
    amount: 7131,
    transactions: 10,
    percentage: 3.1,
    icon: '👥',
    description: 'Categoria extraída dos dados financeiros: ASSISTÊNCIA ODONTOLÓGICA',
    examples: ["ASSISTÊNCIA ODONTOLÓGICA","ASSISTÊNCIA ODONTOLÓGICA"]
  },
  {
    id: '9',
    name: 'CARTÓRIO',
    type: 'fixed_cost',
    color: '#7F1D1D',
    amount: 1055,
    transactions: 45,
    percentage: 4.1,
    icon: '👔',
    description: 'Categoria extraída dos dados financeiros: CARTÓRIO',
    examples: ["CARTÓRIO","CARTÓRIO"]
  },
  {
    id: '10',
    name: 'COFINS',
    type: 'non_operating',
    color: '#C2410C',
    amount: 5943,
    transactions: 41,
    percentage: 1.1,
    icon: '📋',
    description: 'Categoria extraída dos dados financeiros: COFINS',
    examples: ["COFINS","COFINS"]
  },
  {
    id: '11',
    name: 'COMISSÕES',
    type: 'variable_cost',
    color: '#D97706',
    amount: 10214,
    transactions: 24,
    percentage: 8.1,
    icon: '💸',
    description: 'Categoria extraída dos dados financeiros: COMISSÕES',
    examples: ["COMISSÕES","COMISSÕES"]
  },
  {
    id: '12',
    name: 'CONSERVAÇÃO E LIMPEZA',
    type: 'fixed_cost',
    color: '#F59E0B',
    amount: 9386,
    transactions: 26,
    percentage: 4.1,
    icon: '🔧',
    description: 'Categoria extraída dos dados financeiros: CONSERVAÇÃO E LIMPEZA',
    examples: ["CONSERVAÇÃO E LIMPEZA","CONSERVAÇÃO E LIMPEZA"]
  },
  {
    id: '13',
    name: 'CONSULTORIA',
    type: 'fixed_cost',
    color: '#7F1D1D',
    amount: 5179,
    transactions: 49,
    percentage: 6.1,
    icon: '👔',
    description: 'Categoria extraída dos dados financeiros: CONSULTORIA',
    examples: ["CONSULTORIA","CONSULTORIA"]
  },
  {
    id: '14',
    name: 'CONTRIBUICAO SINDICAL',
    type: 'non_operating',
    color: '#C2410C',
    amount: 7063,
    transactions: 51,
    percentage: 7.1,
    icon: '📋',
    description: 'Categoria extraída dos dados financeiros: CONTRIBUICAO SINDICAL',
    examples: ["CONTRIBUICAO SINDICAL","CONTRIBUICAO SINDICAL"]
  },
  {
    id: '15',
    name: 'CORREIOS',
    type: 'variable_cost',
    color: '#92400E',
    amount: 7748,
    transactions: 8,
    percentage: 7.1,
    icon: '🚚',
    description: 'Categoria extraída dos dados financeiros: CORREIOS',
    examples: ["CORREIOS","CORREIOS"]
  },
  {
    id: '16',
    name: 'CUSTAS JUDICIAIS',
    type: 'non_operating',
    color: '#4B5563',
    amount: 9451,
    transactions: 37,
    percentage: 0.1,
    icon: '⚖️',
    description: 'Categoria extraída dos dados financeiros: CUSTAS JUDICIAIS',
    examples: ["CUSTAS JUDICIAIS","CUSTAS JUDICIAIS"]
  },
    {
    id: '18',
    name: 'DESP. LOCOMOÇÃO',
    type: 'variable_cost',
    color: '#92400E',
    amount: 9461,
    transactions: 36,
    percentage: 9.1,
    icon: '🚚',
    description: 'Categoria extraída dos dados financeiros: DESP. LOCOMOÇÃO',
    examples: ["DESP. LOCOMOÇÃO","DESP. LOCOMOÇÃO"]
  },
  {
    id: '19',
    name: 'DESPESAS COM VIAGENS',
    type: 'variable_cost',
    color: '#92400E',
    amount: 9386,
    transactions: 31,
    percentage: 8.1,
    icon: '✈️',
    description: 'Categoria extraída dos dados financeiros: DESPESAS COM VIAGENS',
    examples: ["DESPESAS COM VIAGENS","DESPESAS COM VIAGENS"]
  },
  {
    id: '20',
    name: 'ENERGIA ELETRICA',
    type: 'fixed_cost',
    color: '#6B7280',
    amount: 9187,
    transactions: 6,
    percentage: 9.1,
    icon: '⚡',
    description: 'Categoria extraída dos dados financeiros: ENERGIA ELETRICA',
    examples: ["ENERGIA ELETRICA","ENERGIA ELETRICA"]
  },
  {
    id: '21',
    name: 'EXAME ADMISSIONAL/PERIODICO',
    type: 'fixed_cost',
    color: '#EF4444',
    amount: 7999,
    transactions: 50,
    percentage: 9.1,
    icon: '🩺',
    description: 'Categoria extraída dos dados financeiros: EXAME ADMISSIONAL/PERIODICO',
    examples: ["EXAME ADMISSIONAL/PERIODICO","EXAME ADMISSIONAL/PERIODICO"]
  },
  {
    id: '22',
    name: 'FGTS',
    type: 'fixed_cost',
    color: '#EF4444',
    amount: 10101,
    transactions: 17,
    percentage: 6.1,
    icon: '👥',
    description: 'Categoria extraída dos dados financeiros: FGTS',
    examples: ["FGTS","FGTS"]
  },
  {
    id: '23',
    name: 'FOLHA PJ',
    type: 'fixed_cost',
    color: '#EF4444',
    amount: 8550,
    transactions: 9,
    percentage: 6.1,
    icon: '👥',
    description: 'Categoria extraída dos dados financeiros: FOLHA PJ',
    examples: ["FOLHA PJ","FOLHA PJ"]
  },
  {
    id: '24',
    name: 'FÉRIAS',
    type: 'fixed_cost',
    color: '#EF4444',
    amount: 5652,
    transactions: 42,
    percentage: 9.1,
    icon: '🏖️',
    description: 'Categoria extraída dos dados financeiros: FÉRIAS',
    examples: ["FÉRIAS","FÉRIAS"]
  },
  {
    id: '25',
    name: 'INSS',
    type: 'fixed_cost',
    color: '#EF4444',
    amount: 7249,
    transactions: 20,
    percentage: 4.1,
    icon: '👥',
    description: 'Categoria extraída dos dados financeiros: INSS',
    examples: ["INSS","INSS"]
  },
  {
    id: '26',
    name: 'INTERNET',
    type: 'fixed_cost',
    color: '#991B1B',
    amount: 7259,
    transactions: 42,
    percentage: 1.1,
    icon: '💻',
    description: 'Categoria extraída dos dados financeiros: INTERNET',
    examples: ["INTERNET","INTERNET"]
  },
  {
    id: '27',
    name: 'LEASING / FINAME',
    type: 'non_operating',
    color: '#374151',
    amount: 7340,
    transactions: 9,
    percentage: 5.1,
    icon: '🏛️',
    description: 'Categoria extraída dos dados financeiros: LEASING / FINAME',
    examples: ["LEASING / FINAME","LEASING / FINAME"]
  },
  {
    id: '28',
    name: 'LICENÇAS DIVERSAS',
    type: 'fixed_cost',
    color: '#991B1B',
    amount: 8197,
    transactions: 42,
    percentage: 0.1,
    icon: '💻',
    description: 'Categoria extraída dos dados financeiros: LICENÇAS DIVERSAS',
    examples: ["LICENÇAS DIVERSAS","LICENÇAS DIVERSAS"]
  },
  {
    id: '29',
    name: 'MANUTENÇÃO DE EQUIPAMENTOS',
    type: 'fixed_cost',
    color: '#F59E0B',
    amount: 1448,
    transactions: 43,
    percentage: 9.1,
    icon: '🔧',
    description: 'Categoria extraída dos dados financeiros: MANUTENÇÃO DE EQUIPAMENTOS',
    examples: ["MANUTENÇÃO DE EQUIPAMENTOS","MANUTENÇÃO DE EQUIPAMENTOS"]
  },
  {
    id: '30',
    name: 'MANUTENÇÃO DE HARDWARE',
    type: 'fixed_cost',
    color: '#F59E0B',
    amount: 1789,
    transactions: 7,
    percentage: 4.1,
    icon: '🔧',
    description: 'Categoria extraída dos dados financeiros: MANUTENÇÃO DE HARDWARE',
    examples: ["MANUTENÇÃO DE HARDWARE","MANUTENÇÃO DE HARDWARE"]
  },
  {
    id: '31',
    name: 'MANUTENÇÃO PREDIAL',
    type: 'fixed_cost',
    color: '#F59E0B',
    amount: 8688,
    transactions: 47,
    percentage: 6.1,
    icon: '🔧',
    description: 'Categoria extraída dos dados financeiros: MANUTENÇÃO PREDIAL',
    examples: ["MANUTENÇÃO PREDIAL","MANUTENÇÃO PREDIAL"]
  },
  {
    id: '32',
    name: 'MARKETING E PUBLICIDADE',
    type: 'variable_cost',
    color: '#D97706',
    amount: 10741,
    transactions: 27,
    percentage: 0.1,
    icon: '📣',
    description: 'Categoria extraída dos dados financeiros: MARKETING E PUBLICIDADE',
    examples: ["MARKETING E PUBLICIDADE","MARKETING E PUBLICIDADE"]
  },
  {
    id: '33',
    name: 'MATERIAL DE EMBALAGEM',
    type: 'variable_cost',
    color: '#B45309',
    amount: 4073,
    transactions: 40,
    percentage: 4.1,
    icon: '📦',
    description: 'Categoria extraída dos dados financeiros: MATERIAL DE EMBALAGEM',
    examples: ["MATERIAL DE EMBALAGEM","MATERIAL DE EMBALAGEM"]
  },
  {
    id: '34',
    name: 'MATERIAL DE ESCRITÓRIO',
    type: 'variable_cost',
    color: '#B45309',
    amount: 1358,
    transactions: 10,
    percentage: 5.1,
    icon: '📦',
    description: 'Categoria extraída dos dados financeiros: MATERIAL DE ESCRITÓRIO',
    examples: ["MATERIAL DE ESCRITÓRIO","MATERIAL DE ESCRITÓRIO"]
  },
  {
    id: '35',
    name: 'MATERIAL DE LIMPEZA',
    type: 'fixed_cost',
    color: '#F59E0B',
    amount: 2560,
    transactions: 48,
    percentage: 3.1,
    icon: '🔧',
    description: 'Categoria extraída dos dados financeiros: MATERIAL DE LIMPEZA',
    examples: ["MATERIAL DE LIMPEZA","MATERIAL DE LIMPEZA"]
  },
  {
    id: '36',
    name: 'OPERADORES LOGÍSTICOS',
    type: 'variable_cost',
    color: '#92400E',
    amount: 3399,
    transactions: 11,
    percentage: 8.1,
    icon: '🚚',
    description: 'Categoria extraída dos dados financeiros: OPERADORES LOGÍSTICOS',
    examples: ["OPERADORES LOGÍSTICOS","OPERADORES LOGÍSTICOS"]
  },
  {
    id: '37',
    name: 'OUTRAS DESPESAS NOP',
    type: 'non_operating',
    color: '#9CA3AF',
    amount: 2088,
    transactions: 50,
    percentage: 9.1,
    icon: '📄',
    description: 'Categoria extraída dos dados financeiros: OUTRAS DESPESAS NOP',
    examples: ["OUTRAS DESPESAS NOP","OUTRAS DESPESAS NOP"]
  },
  {
    id: '38',
    name: 'OUTROS TRIBUTOS',
    type: 'non_operating',
    color: '#C2410C',
    amount: 6833,
    transactions: 53,
    percentage: 6.1,
    icon: '📋',
    description: 'Categoria extraída dos dados financeiros: OUTROS TRIBUTOS',
    examples: ["OUTROS TRIBUTOS","OUTROS TRIBUTOS"]
  },
  {
    id: '39',
    name: 'PRO LABORE',
    type: 'fixed_cost',
    color: '#EF4444',
    amount: 5275,
    transactions: 23,
    percentage: 3.1,
    icon: '👥',
    description: 'Categoria extraída dos dados financeiros: PRO LABORE',
    examples: ["PRO LABORE","PRO LABORE"]
  },
    {
    id: '41',
    name: 'SALARIOS',
    type: 'fixed_cost',
    color: '#EF4444',
    amount: 2280,
    transactions: 45,
    percentage: 3.1,
    icon: '👥',
    description: 'Categoria extraída dos dados financeiros: SALARIOS',
    examples: ["SALARIOS","SALARIOS"]
  },
  {
    id: '42',
    name: 'SEGUROS DE VIDA',
    type: 'non_operating',
    color: '#374151',
    amount: 4964,
    transactions: 21,
    percentage: 9.1,
    icon: '🏛️',
    description: 'Categoria extraída dos dados financeiros: SEGUROS DE VIDA',
    examples: ["SEGUROS DE VIDA","SEGUROS DE VIDA"]
  },
  {
    id: '43',
    name: 'SEGUROS GERAIS',
    type: 'non_operating',
    color: '#374151',
    amount: 9250,
    transactions: 40,
    percentage: 5.1,
    icon: '🏛️',
    description: 'Categoria extraída dos dados financeiros: SEGUROS GERAIS',
    examples: ["SEGUROS GERAIS","SEGUROS GERAIS"]
  },
  {
    id: '44',
    name: 'SERVIÇOS DE ADVOCACIA',
    type: 'fixed_cost',
    color: '#7F1D1D',
    amount: 4970,
    transactions: 49,
    percentage: 3.1,
    icon: '👔',
    description: 'Categoria extraída dos dados financeiros: SERVIÇOS DE ADVOCACIA',
    examples: ["SERVIÇOS DE ADVOCACIA","SERVIÇOS DE ADVOCACIA"]
  },
  {
    id: '45',
    name: 'SERVIÇOS DE CONTABILIDADE',
    type: 'fixed_cost',
    color: '#7F1D1D',
    amount: 5573,
    transactions: 25,
    percentage: 2.1,
    icon: '👔',
    description: 'Categoria extraída dos dados financeiros: SERVIÇOS DE CONTABILIDADE',
    examples: ["SERVIÇOS DE CONTABILIDADE","SERVIÇOS DE CONTABILIDADE"]
  },
  {
    id: '46',
    name: 'SERVIÇOS PRESTADOS PF',
    type: 'variable_cost',
    color: '#B45309',
    amount: 1527,
    transactions: 18,
    percentage: 3.1,
    icon: '👷',
    description: 'Categoria extraída dos dados financeiros: SERVIÇOS PRESTADOS PF',
    examples: ["SERVIÇOS PRESTADOS PF","SERVIÇOS PRESTADOS PF"]
  },
  {
    id: '47',
    name: 'SOFTWARES',
    type: 'fixed_cost',
    color: '#991B1B',
    amount: 8488,
    transactions: 32,
    percentage: 4.1,
    icon: '💻',
    description: 'Categoria extraída dos dados financeiros: SOFTWARES',
    examples: ["SOFTWARES","SOFTWARES"]
  },
  {
    id: '48',
    name: 'TARIFAS BANCÁRIAS',
    type: 'non_operating',
    color: '#374151',
    amount: 10489,
    transactions: 36,
    percentage: 5.1,
    icon: '🏛️',
    description: 'Categoria extraída dos dados financeiros: TARIFAS BANCÁRIAS',
    examples: ["TARIFAS BANCÁRIAS","TARIFAS BANCÁRIAS"]
  },
  {
    id: '49',
    name: 'TELEFONES FIXOS',
    type: 'fixed_cost',
    color: '#6B7280',
    amount: 8956,
    transactions: 45,
    percentage: 2.1,
    icon: '⚡',
    description: 'Categoria extraída dos dados financeiros: TELEFONES FIXOS',
    examples: ["TELEFONES FIXOS","TELEFONES FIXOS"]
  },
  {
    id: '50',
    name: 'TELEFONES MÓVEIS',
    type: 'fixed_cost',
    color: '#6B7280',
    amount: 8838,
    transactions: 9,
    percentage: 3.1,
    icon: '⚡',
    description: 'Categoria extraída dos dados financeiros: TELEFONES MÓVEIS',
    examples: ["TELEFONES MÓVEIS","TELEFONES MÓVEIS"]
  },
  {
    id: '51',
    name: 'VALE ALIMENTAÇÃO',
    type: 'fixed_cost',
    color: '#6B7280',
    amount: 4968,
    transactions: 29,
    percentage: 8.1,
    icon: '⚡',
    description: 'Categoria extraída dos dados financeiros: VALE ALIMENTAÇÃO',
    examples: ["VALE ALIMENTAÇÃO","VALE ALIMENTAÇÃO"]
  },
  {
    id: '52',
    name: 'VALE REFEIÇÃO',
    type: 'fixed_cost',
    color: '#6B7280',
    amount: 8222,
    transactions: 50,
    percentage: 0.1,
    icon: '⚡',
    description: 'Categoria extraída dos dados financeiros: VALE REFEIÇÃO',
    examples: ["VALE REFEIÇÃO","VALE REFEIÇÃO"]
  },
  {
    id: '53',
    name: 'VALE TRANSPORTE',
    type: 'fixed_cost',
    color: '#6B7280',
    amount: 2634,
    transactions: 31,
    percentage: 8.1,
    icon: '⚡',
    description: 'Categoria extraída dos dados financeiros: VALE TRANSPORTE',
    examples: ["VALE TRANSPORTE","VALE TRANSPORTE"]
  }
];

// Configuração dos tipos de categoria (mantido para compatibilidade)
export const categoryTypes = [
  {
    value: 'revenue',
    label: 'Receitas',
    color: '#10B981',
    description: 'Todas as entradas de dinheiro'
  },
  {
    value: 'variable_cost',
    label: 'Custos Variáveis',
    color: '#F59E0B',
    description: 'Custos que variam com o volume de vendas'
  },
  {
    value: 'fixed_cost',
    label: 'Custos Fixos',
    color: '#EF4444',
    description: 'Custos fixos mensais'
  },
  {
    value: 'non_operating',
    label: 'Não Operacionais',
    color: '#6B7280',
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
  }
];

// Sugestões para nova categoria
export const categorySuggestions = {
  names: ['Outras Despesas', 'Receitas Eventuais', 'Investimentos'],
  descriptions: ['Categorias adicionais para organizar finanças'],
  colors: ['#10B981', '#F59E0B', '#EF4444']
};
