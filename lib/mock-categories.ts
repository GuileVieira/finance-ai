// Dados mock completos baseados no wireframe atualizado com dados reais XMIND
import { Category, AutoRule } from '@/lib/types';

// Dados baseados no wireframe atualizado - 53 rúbricas reais XMIND
export const mockCategories: Category[] = [
  // Receitas (#10B981)
  {
    id: '1',
    name: 'Vendas de Produtos',
    type: 'revenue',
    color: '#059669',
    amount: 125400,
    transactions: 156,
    percentage: 28.5,
    icon: '📦',
    description: 'Venda de mercadorias e produtos',
    examples: ['Venda Mercadorias', 'Receita Vendas', 'Faturamento', 'Receita Clientes']
  },

  // Custos Variáveis (#F59E0B)
  {
    id: '2',
    name: 'Comissões e Variáveis',
    type: 'variable_cost',
    color: '#D97706',
    amount: 12300,
    transactions: 45,
    percentage: 14.1,
    icon: '💰',
    description: 'Comissões sobre vendas e bônus variáveis',
    examples: ['COMISSÕES', 'BÔNUS VAR', 'PARTICIPAÇÃO LUCROS']
  },
  {
    id: '3',
    name: 'Custos de Produtos',
    type: 'variable_cost',
    color: '#B45309',
    amount: 45600,
    transactions: 89,
    percentage: 26.8,
    icon: '🏭',
    description: 'Matéria prima e insumos para produção',
    examples: ['MATÉRIA PRIMA', 'EMBALAGEM', 'INSUMOS']
  },
  {
    id: '4',
    name: 'Logística e Distribuição',
    type: 'variable_cost',
    color: '#92400E',
    amount: 8900,
    transactions: 34,
    percentage: 4.9,
    icon: '🚚',
    description: 'Transporte e distribuição',
    examples: ['CORREIOS', 'VIAGENS', 'TRANSPORTES', 'FRETES']
  },

  // Custos Fixos (#EF4444)
  {
    id: '5',
    name: 'Salários e Encargos',
    type: 'fixed_cost',
    color: '#DC2626',
    amount: 87300,
    transactions: 234,
    percentage: 51.8,
    icon: '🏦',
    description: 'Salários, pró-labre e encargos sociais',
    examples: ['SALARIOS', 'INSS', 'FGTS', 'PRO LABORE', 'FÉRIAS', '13º SALARIO']
  },
  {
    id: '6',
    name: 'Aluguel e Ocupação',
    type: 'fixed_cost',
    color: '#B91C1C',
    amount: 8500,
    transactions: 12,
    percentage: 14.3,
    icon: '🏠',
    description: 'Aluguel de imóveis e ocupação',
    examples: ['ALUGUEL', 'CONDOMÍNIO', 'IPTU']
  },
  {
    id: '7',
    name: 'Tecnologia e Software',
    type: 'fixed_cost',
    color: '#991B1B',
    amount: 4200,
    transactions: 28,
    percentage: 7.1,
    icon: '💻',
    description: 'Software e serviços de TI',
    examples: ['SOFTWARES', 'INTERNET', 'HOSPEDAGEM', 'SISTEMAS']
  },
  {
    id: '8',
    name: 'Serviços Profissionais',
    type: 'fixed_cost',
    color: '#7F1D1D',
    amount: 6800,
    transactions: 15,
    percentage: 3.9,
    icon: '👔',
    description: 'Contabilidade, advocacia e consultoria',
    examples: ['CONTABILIDADE', 'ADVOCACIA', 'CONSULTORIA', 'ASSESSORIA']
  },
  {
    id: '9',
    name: 'Tributos e Contribuições',
    type: 'fixed_cost',
    color: '#C2410C',
    amount: 15300,
    transactions: 22,
    percentage: 8.8,
    icon: '📋',
    description: 'Tributos federais, estaduais e municipais',
    examples: ['COFINS', 'PIS', 'IRPJ', 'ISS', 'ICMS']
  },

  // Não Operacionais (#6B7280)
  {
    id: '10',
    name: 'Utilidades e Insumos',
    type: 'non_operating',
    color: '#6B7280',
    amount: 1500,
    transactions: 35,
    percentage: 2.1,
    icon: '⚡',
    description: 'Utilidades e serviços diversos',
    examples: ['ENERGIA ELETRICA', 'TELEFONES', 'ÁGUA']
  },
  {
    id: '11',
    name: 'Manutenção e Serviços',
    type: 'non_operating',
    color: '#4B5563',
    amount: 7200,
    transactions: 18,
    percentage: 4.1,
    icon: '🔧',
    description: 'Manutenção em geral',
    examples: ['MANUTENÇÃO', 'CONSERVAÇÃO', 'LIMPEZA']
  },
  {
    id: '12',
    name: 'Financeiros e Bancários',
    type: 'non_operating',
    color: '#374151',
    amount: 2800,
    transactions: 23,
    percentage: 1.6,
    icon: '🏛️',
    description: 'Tarifas bancárias e serviços financeiros',
    examples: ['TARIFAS BANCÁRIAS', 'JUROS', 'MULTAS']
  }
];

// Regras automáticas baseadas no XMIND com 94% de acurácia
export const mockAutoRules: AutoRule[] = [
  // 100% acurácia
  { id: '1', category: 'Salários e Encargos', pattern: 'SALARIOS', type: 'exact', accuracy: 100, status: 'active' },
  { id: '2', category: 'Salários e Encargos', pattern: 'INSS', type: 'exact', accuracy: 100, status: 'active' },
  { id: '3', category: 'Salários e Encargos', pattern: 'FGTS', type: 'exact', accuracy: 100, status: 'active' },
  { id: '4', category: 'Salários e Encargos', pattern: 'PRO LABORE', type: 'exact', accuracy: 100, status: 'active' },
  { id: '5', category: 'Salários e Encargos', pattern: 'FÉRIAS', type: 'exact', accuracy: 100, status: 'active' },
  { id: '6', category: 'Salários e Encargos', pattern: '13º SALARIO', type: 'exact', accuracy: 100, status: 'active' },
  { id: '7', category: 'Aluguel e Ocupação', pattern: 'ALUGUEL', type: 'exact', accuracy: 100, status: 'active' },
  { id: '8', category: 'Tecnologia e Software', pattern: 'SOFTWARES', type: 'exact', accuracy: 100, status: 'active' },
  { id: '9', category: 'Tecnologia e Software', pattern: 'INTERNET', type: 'exact', accuracy: 100, status: 'active' },
  { id: '10', category: 'Serviços Profissionais', pattern: 'CONTABILIDADE', type: 'exact', accuracy: 100, status: 'active' },
  { id: '11', category: 'Serviços Profissionais', pattern: 'ADVOCACIA', type: 'exact', accuracy: 100, status: 'active' },
  { id: '12', category: 'Tributos e Contribuições', pattern: 'COFINS', type: 'exact', accuracy: 100, status: 'active' },
  { id: '13', category: 'Tributos e Contribuições', pattern: 'PIS', type: 'exact', accuracy: 100, status: 'active' },
  { id: '14', category: 'Logística e Distribuição', pattern: 'CORREIOS', type: 'exact', accuracy: 100, status: 'active' },
  { id: '15', category: 'Comissões e Variáveis', pattern: 'COMISSÕES', type: 'exact', accuracy: 100, status: 'active' },
  { id: '16', category: 'Utilidades e Insumos', pattern: 'ENERGIA ELETRICA', type: 'exact', accuracy: 100, status: 'active' },

  // 95-99% acurácia
  { id: '17', category: 'Logística e Distribuição', pattern: 'VIAGENS', type: 'contains', accuracy: 95, status: 'active' },
  { id: '18', category: 'Utilidades e Insumos', pattern: 'TELEFONES', type: 'contains', accuracy: 98, status: 'active' },
  { id: '19', category: 'Manutenção e Serviços', pattern: 'MANUTENÇÃO', type: 'contains', accuracy: 92, status: 'active' },
  { id: '20', category: 'Financeiros e Bancários', pattern: 'TARIFAS BANCÁRIAS', type: 'exact', accuracy: 100, status: 'active' },
  { id: '21', category: 'Custos de Produtos', pattern: 'EMBALAGEM', type: 'contains', accuracy: 96, status: 'active' }
];

// Configuração dos tipos de categoria
export const categoryTypes = {
  revenue: {
    name: 'Receitas',
    color: '#10B981',
    description: 'Todas as entradas de dinheiro'
  },
  variable_cost: {
    name: 'Custos Variáveis',
    color: '#F59E0B',
    description: 'Custos que variam com o volume de vendas'
  },
  fixed_cost: {
    name: 'Custos Fixos',
    color: '#EF4444',
    description: 'Custos fixos mensais'
  },
  non_operating: {
    name: 'Não Operacionais',
    color: '#6B7280',
    description: 'Despesas não relacionadas à operação principal'
  }
};

// Sugestões para nova categoria
export const categorySuggestions = {
  names: ['Vendas', 'Faturamento', 'Receitas', 'Serviços', 'Honorários', 'Consultorias'],
  descriptions: ['Venda de mercadorias e produtos', 'Prestação de serviços especializados', 'Receitas financeiras e investimentos'],
  colors: ['#059669', '#047857', '#065F46', '#D97706', '#B45309', '#92400E']
};