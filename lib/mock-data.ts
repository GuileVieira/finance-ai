// Dados baseados na análise real dos arquivos XMIND e extratos bancários
export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  bank?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'non-operating';
  color: string;
  amount: number;
  transactions: number;
  percentage: number;
  icon?: string;
}

export interface MetricCard {
  title: string;
  value: string;
  change: number;
  changeType: 'increase' | 'decrease';
  color: string;
}

// Dados baseados no wireframe atualizado
export const mockCategories: Category[] = [
  {
    id: '1',
    name: 'Salários e Encargos',
    type: 'expense',
    color: '#DC2626',
    amount: 45200,
    transactions: 156,
    percentage: 51.8,
    icon: '🏦'
  },
  {
    id: '2',
    name: 'Custos de Produtos',
    type: 'expense',
    color: '#B45309',
    amount: 23400,
    transactions: 89,
    percentage: 26.8,
    icon: '📦'
  },
  {
    id: '3',
    name: 'Aluguel e Ocupação',
    type: 'expense',
    color: '#B91C1C',
    amount: 12500,
    transactions: 12,
    percentage: 14.3,
    icon: '🏠'
  },
  {
    id: '4',
    name: 'Tecnologia e Software',
    type: 'expense',
    color: '#991B1B',
    amount: 6200,
    transactions: 28,
    percentage: 7.1,
    icon: '💻'
  }
];

export const mockRecentTransactions: Transaction[] = [
  {
    id: '1',
    date: '23/10',
    description: 'SALÁRIOS OUTUBRO',
    category: 'Salários e Encargos',
    amount: -28500,
    type: 'expense',
    bank: 'BB'
  },
  {
    id: '2',
    date: '23/10',
    description: 'ALUGUEL MATRIZ',
    category: 'Aluguel e Ocupação',
    amount: -12500,
    type: 'expense',
    bank: 'Itaú'
  },
  {
    id: '3',
    date: '22/10',
    description: 'SOFTWARE MENSAL',
    category: 'Tecnologia e Software',
    amount: -4200,
    type: 'expense',
    bank: 'Santander'
  },
  {
    id: '4',
    date: '22/10',
    description: 'VENDA CLIENTE X',
    category: 'Vendas de Produtos',
    amount: 15800,
    type: 'income',
    bank: 'BB'
  },
  {
    id: '5',
    date: '21/10',
    description: 'COMISSÕES VENDEDORES',
    category: 'Comissões Variáveis',
    amount: -3500,
    type: 'expense',
    bank: 'CEF'
  }
];

export const mockTopExpenses = [
  { description: 'SALÁRIOS', amount: 28500, transactions: 156, icon: '🏦', category: 'Salários e Encargos' },
  { description: 'ALUGUEL', amount: 12500, transactions: 12, icon: '🏠', category: 'Aluguel e Ocupação' },
  { description: 'SOFTWARES', amount: 4200, transactions: 8, icon: '💻', category: 'Tecnologia e Software' },
  { description: 'TELEFONES MÓVEIS', amount: 1800, transactions: 34, icon: '📱', category: 'Utilidades' },
  { description: 'ENERGIA ELÉTRICA', amount: 1500, transactions: 1, icon: '⚡', category: 'Utilidades' },
  { description: 'MATERIAL EMBALAGEM', amount: 1200, transactions: 23, icon: '📦', category: 'Custos de Produtos' },
  { description: 'OPERADORES LOGÍSTICOS', amount: 900, transactions: 5, icon: '🚚', category: 'Logística' },
  { description: 'CONSERVAÇÃO/LIMPEZA', amount: 800, transactions: 4, icon: '🧼', category: 'Manutenção' }
];

export const mockMetrics: MetricCard[] = [
  {
    title: 'Receita',
    value: 'R$ 125.400',
    change: 12.5,
    changeType: 'increase',
    color: '#10B981'
  },
  {
    title: 'Despesas',
    value: 'R$ 87.300',
    change: 8.2,
    changeType: 'increase',
    color: '#EF4444'
  },
  {
    title: 'Resultado',
    value: 'R$ 38.100',
    change: 18.3,
    changeType: 'increase',
    color: '#059669'
  },
  {
    title: 'Margem',
    value: '30.4%',
    change: 5.1,
    changeType: 'increase',
    color: '#DC2626'
  }
];

export const mockInsights = [
  'Salários representam 51.8% dos custos fixos',
  'Categorias XMIND importadas: 47/53 mapeadas',
  '94% de acurácia na categorização automática'
];

export const mockAlerts = [
  {
    type: 'critical',
    title: 'Custo Fixo Aumentou 25%',
    description: 'Você contratou 8 funcionários nos últimos 3 meses',
    icon: '⚠️'
  },
  {
    type: 'warning',
    title: 'Taxa de Antecipação Acima do Mercado',
    description: 'Sua taxa de 2,5%/mês está acima da média (1,8-2,2%)',
    icon: '📈'
  },
  {
    type: 'info',
    title: 'Margem Abaixo da Média do Setor',
    description: 'Sua margem de 30.4% vs 38% média do setor',
    icon: '📊'
  }
];

export const mockBudgetComparison = [
  {
    category: 'Receita',
    actual: 125400,
    budget: 120000,
    variance: 4.5,
    status: 'positive'
  },
  {
    category: 'Despesas',
    actual: 87300,
    budget: 85000,
    variance: 2.7,
    status: 'negative'
  },
  {
    category: 'Custo Fixo',
    actual: 45200,
    budget: 38000,
    variance: 18.9,
    status: 'negative'
  }
];

export const mockHistoricalData = [
  { month: 'Abr/25', revenue: 98000, expenses: 72000, result: 26000 },
  { month: 'Mai/25', revenue: 105000, expenses: 75000, result: 30000 },
  { month: 'Jun/25', revenue: 112000, expenses: 78000, result: 34000 },
  { month: 'Jul/25', revenue: 118000, expenses: 81000, result: 37000 },
  { month: 'Ago/25', revenue: 122000, expenses: 84000, result: 38000 },
  { month: 'Set/25', revenue: 125400, expenses: 87300, result: 38100 }
];

export const mockCashFlow = [
  { day: '01/10', inflow: 15000, outflow: 12000, balance: 45000 },
  { day: '02/10', inflow: 8000, outflow: 15000, balance: 38000 },
  { day: '03/10', inflow: 22000, outflow: 9000, balance: 51000 },
  { day: '04/10', inflow: 5000, outflow: 18000, balance: 38000 },
  { day: '05/10', inflow: 28000, outflow: 11000, balance: 55000 },
  { day: '06/10', inflow: 12000, outflow: 25000, balance: 42000 },
  { day: '07/10', inflow: 18000, outflow: 14000, balance: 46000 },
  { day: '08/10', inflow: 35000, outflow: 16000, balance: 65000 },
  { day: '09/10', inflow: 9000, outflow: 22000, balance: 52000 },
  { day: '10/10', inflow: 25000, outflow: 13000, balance: 64000 }
];

export const mockBenchmarks = {
  margin: {
    current: 30.4,
    industry: 38.0,
    difference: -7.6,
    status: 'below'
  },
  growth: {
    current: 12.5,
    industry: 8.2,
    difference: 4.3,
    status: 'above'
  },
  costRatio: {
    current: 69.6,
    industry: 62.0,
    difference: 7.6,
    status: 'above'
  }
};

export const mockProjections = {
  current: {
    revenue: 125400,
    expenses: 87300,
    margin: 30.4
  },
  projected: {
    revenue: 132000,
    expenses: 91000,
    margin: 31.1
  },
  scenarios: [
    {
      name: 'Cenário Otimista',
      description: 'Aumento 5% nas vendas',
      revenue: 131670,
      expenses: 87300,
      result: 44370,
      margin: 33.7
    },
    {
      name: 'Cenário Conservador',
      description: 'Manutenção atual',
      revenue: 125400,
      expenses: 91000,
      result: 34400,
      margin: 27.4
    },
    {
      name: 'Cenário de Corte',
      description: 'Redução 10% custo fixo',
      revenue: 125400,
      expenses: 83600,
      result: 41800,
      margin: 33.3
    }
  ]
};

export const mockUserData = {
  name: 'João Silva',
  email: 'joao.silva@empresa.com',
  avatar: null
};

export const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', active: true },
  { name: 'Transações', href: '/transactions', active: false },
  { name: 'Upload', href: '/upload', active: false },
  { name: 'Categorias', href: '/categories', active: false },
  { name: 'Relatórios', href: '/reports', active: false }
];