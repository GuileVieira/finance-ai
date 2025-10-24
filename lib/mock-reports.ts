import { DREStatement, CashFlowReport, Insight, CategoryRule, ReportPeriod, DRELineItem } from './types';

// Mock de dados realistas baseados no PRD executivo
export const mockDRECurrent: DREStatement = {
  period: 'Outubro 2025',
  grossRevenue: 5400000,
  taxes: 594000,
  financialCosts: 400000,
  netRevenue: 4406000,
  variableCosts: 2700000,
  contributionMargin: {
    value: 1706000,
    percentage: 31.4
  },
  fixedCosts: 1556000,
  operationalResult: 150000,
  nonOperational: {
    revenue: 35000,  // Venda de equipamento antigo, juros recebidos
    expenses: 285000, // Multas, doações, perdas com ativos
    netResult: -250000
  },
  netResult: -100000,
  categories: [
    {
      name: 'Salários e Encargos',
      value: 873000,
      percentage: 31.5,
      type: 'fixed',
      color: '#DC2626',
      transactions: 156,
      drilldown: [
        {
          id: '1',
          date: '2025-10-23',
          description: 'SALÁRIOS OUTUBRO',
          category: 'Salários e Encargos',
          amount: -28500,
          type: 'expense'
        },
        {
          id: '2',
          date: '2025-10-05',
          description: 'INSS OUTUBRO',
          category: 'Salários e Encargos',
          amount: -8500,
          type: 'expense'
        }
      ]
    },
    {
      name: 'Custos de Produtos',
      value: 456000,
      percentage: 16.5,
      type: 'variable',
      color: '#B45309',
      transactions: 89
    },
    {
      name: 'Aluguel e Ocupação',
      value: 125000,
      percentage: 4.5,
      type: 'fixed',
      color: '#B91C1C',
      transactions: 12
    },
    {
      name: 'Tecnologia e Software',
      value: 62000,
      percentage: 2.2,
      type: 'fixed',
      color: '#991B1B',
      transactions: 28
    },
    {
      name: 'Serviços Profissionais',
      value: 68000,
      percentage: 2.5,
      type: 'fixed',
      color: '#7F1D1D',
      transactions: 15
    }
  ],
  lineDetails: {
    grossRevenue: [
      {
        label: "Venda de Produtos",
        value: 4200000,
        type: "revenue" as const,
        drilldown: [
          {
            id: 'rev1',
            date: '2025-10-15',
            description: 'Venda Cliente Corporativo A',
            category: 'Receita Bruta',
            amount: 850000,
            type: 'income' as const
          },
          {
            id: 'rev2',
            date: '2025-10-20',
            description: 'Venda Cliente Corporativo B',
            category: 'Receita Bruta',
            amount: 620000,
            type: 'income' as const
          }
        ],
        transactions: 245
      },
      {
        label: "Venda de Serviços",
        value: 1200000,
        type: "revenue" as const,
        drilldown: [
          {
            id: 'rev3',
            date: '2025-10-10',
            description: 'Consultoria Projeto X',
            category: 'Receita Bruta',
            amount: 450000,
            type: 'income' as const
          }
        ],
        transactions: 89
      }
    ],
    taxes: [
      {
        label: "PIS",
        value: -180000,
        type: "expense" as const,
        drilldown: [
          {
            id: 'tax1',
            date: '2025-10-20',
            description: 'PIS Outubro',
            category: 'Impostos',
            amount: -180000,
            type: 'expense' as const
          }
        ],
        transactions: 1
      },
      {
        label: "COFINS",
        value: -270000,
        type: "expense" as const,
        drilldown: [
          {
            id: 'tax2',
            date: '2025-10-20',
            description: 'COFINS Outubro',
            category: 'Impostos',
            amount: -270000,
            type: 'expense' as const
          }
        ],
        transactions: 1
      },
      {
        label: "ICMS",
        value: -144000,
        type: "expense" as const,
        drilldown: [
          {
            id: 'tax3',
            date: '2025-10-25',
            description: 'ICMS Outubro',
            category: 'Impostos',
            amount: -144000,
            type: 'expense' as const
          }
        ],
        transactions: 1
      }
    ],
    financialCosts: [
      {
        label: "Taxa de Antecipação",
        value: -250000,
        type: "expense" as const,
        drilldown: [
          {
            id: 'fin1',
            date: '2025-10-05',
            description: 'Taxa Antecipação Recebíveis',
            category: 'Custos Financeiros',
            amount: -125000,
            type: 'expense' as const
          },
          {
            id: 'fin2',
            date: '2025-10-15',
            description: 'Taxa Antecipação Recebíveis',
            category: 'Custos Financeiros',
            amount: -125000,
            type: 'expense' as const
          }
        ],
        transactions: 8
      },
      {
        label: "Juros Empréstimos",
        value: -150000,
        type: "expense" as const,
        drilldown: [
          {
            id: 'fin3',
            date: '2025-10-10',
            description: 'Juros Financiamento BNDES',
            category: 'Custos Financeiros',
            amount: -150000,
            type: 'expense' as const
          }
        ],
        transactions: 2
      }
    ],
    variableCosts: [
      {
        label: "Matéria Prima",
        value: -1800000,
        type: "expense" as const,
        drilldown: [
          {
            id: 'var1',
            date: '2025-10-05',
            description: 'Compra Matéria Prima X',
            category: 'Custos Variáveis',
            amount: -450000,
            type: 'expense' as const
          }
        ],
        transactions: 156
      },
      {
        label: "Comissões Vendas",
        value: -900000,
        type: "expense" as const,
        drilldown: [
          {
            id: 'var2',
            date: '2025-10-25',
            description: 'Comissões Outubro',
            category: 'Custos Variáveis',
            amount: -900000,
            type: 'expense' as const
          }
        ],
        transactions: 45
      }
    ],
    fixedCosts: [
      {
        label: "Salários e Encargos",
        value: -873000,
        type: "expense" as const,
        drilldown: [
          {
            id: 'fix1',
            date: '2025-10-23',
            description: 'SALÁRIOS OUTUBRO',
            category: 'Salários e Encargos',
            amount: -28500,
            type: 'expense' as const
          },
          {
            id: 'fix2',
            date: '2025-10-05',
            description: 'INSS OUTUBRO',
            category: 'Salários e Encargos',
            amount: -8500,
            type: 'expense' as const
          }
        ],
        transactions: 156
      },
      {
        label: "Aluguel e Ocupação",
        value: -125000,
        type: "expense" as const,
        drilldown: [
          {
            id: 'fix3',
            date: '2025-10-01',
            description: 'Aluguel Matriz',
            category: 'Aluguel e Ocupação',
            amount: -125000,
            type: 'expense' as const
          }
        ],
        transactions: 12
      }
    ],
    nonOperationalRevenue: [
      {
        label: "Venda de Ativos",
        value: 20000,
        type: "revenue" as const,
        drilldown: [
          {
            id: 'nonrev1',
            date: '2025-10-18',
            description: 'Venda Equipamento Antigo',
            category: 'Receita Não Operacional',
            amount: 20000,
            type: 'income' as const
          }
        ],
        transactions: 1
      },
      {
        label: "Juros Recebidos",
        value: 15000,
        type: "revenue" as const,
        drilldown: [
          {
            id: 'nonrev2',
            date: '2025-10-22',
            description: 'Juros Aplicações Financeiras',
            category: 'Receita Não Operacional',
            amount: 15000,
            type: 'income' as const
          }
        ],
        transactions: 3
      }
    ],
    nonOperationalExpenses: [
      {
        label: "Multas e Penalidades",
        value: -120000,
        type: "expense" as const,
        drilldown: [
          {
            id: 'nonexp1',
            date: '2025-10-12',
            description: 'Multa Recolhimento Atrasado',
            category: 'Despesa Não Operacional',
            amount: -25000,
            type: 'expense' as const
          }
        ],
        transactions: 3
      },
      {
        label: "Perdas com Ativos",
        value: -85000,
        type: "expense" as const,
        drilldown: [
          {
            id: 'nonexp2',
            date: '2025-10-08',
            description: 'Perda Contingência',
            category: 'Despesa Não Operacional',
            amount: -85000,
            type: 'expense' as const
          }
        ],
        transactions: 1
      },
      {
        label: "Doações",
        value: -80000,
        type: "expense" as const,
        drilldown: [
          {
            id: 'nonexp3',
            date: '2025-10-15',
            description: 'Doação Instituição',
            category: 'Despesa Não Operacional',
            amount: -80000,
            type: 'expense' as const
          }
        ],
        transactions: 2
      }
    ]
  }
};

export const mockDREPrevious: DREStatement = {
  period: 'Setembro 2025',
  grossRevenue: 4800000,
  taxes: 528000,
  financialCosts: 380000,
  netRevenue: 3892000,
  variableCosts: 2500000,
  contributionMargin: {
    value: 1392000,
    percentage: 29.0
  },
  fixedCosts: 1450000,
  operationalResult: -58000,
  nonOperational: {
    revenue: 25000,  // Aluguéis recebidos, juros
    expenses: 245000, // Multas e outras despesas não operacionais
    netResult: -220000
  },
  netResult: -278000,
  categories: []
};

export const mockCashFlow: CashFlowReport = {
  period: 'Outubro 2025',
  openingBalance: 150000,
  closingBalance: 50000,
  totalIncome: 5400000,
  totalExpense: 5500000,
  dailyFlows: [
    {
      id: 'cf1',
      date: '2025-10-01',
      description: 'Saldo Inicial',
      category: 'Sistema',
      amount: 150000,
      type: 'income',
      balance: 150000
    },
    {
      id: 'cf2',
      date: '2025-10-02',
      description: 'Venda Cliente A',
      category: 'Receitas',
      amount: 85000,
      type: 'income',
      balance: 235000
    },
    {
      id: 'cf3',
      date: '2025-10-03',
      description: 'Pagamento Fornecedor X',
      category: 'Custos Variáveis',
      amount: -12000,
      type: 'expense',
      balance: 223000
    },
    {
      id: 'cf4',
      date: '2025-10-05',
      description: 'Salários Funcionários',
      category: 'Custos Fixos',
      amount: -28500,
      type: 'expense',
      balance: 194500
    },
    {
      id: 'cf5',
      date: '2025-10-08',
      description: 'Venda Cliente B',
      category: 'Receitas',
      amount: 45000,
      type: 'income',
      balance: 239500
    },
    {
      id: 'cf6',
      date: '2025-10-10',
      description: 'Aluguel Matriz',
      category: 'Custos Fixos',
      amount: -12500,
      type: 'expense',
      balance: 227000
    },
    {
      id: 'cf7',
      date: '2025-10-15',
      description: 'Software Mensal',
      category: 'Custos Fixos',
      amount: -4200,
      type: 'expense',
      balance: 222800
    }
  ]
};

export const mockInsights: Insight[] = [
  {
    id: 'insight1',
    type: 'alert',
    title: 'Custo Fixo Aumentou 25%',
    description: 'Seus custos fixos aumentaram significativamente este mês. O principal driver foi a contratação de 8 novos funcionários, impactando em R$ 25.000 adicionais mensais.',
    impact: 'high',
    category: 'Custos Fixos',
    value: 25000,
    comparison: 'vs mês anterior'
  },
  {
    id: 'insight2',
    type: 'recommendation',
    title: 'Renegocie Taxa de Antecipação',
    description: 'Você está pagando 2,5% ao mês de antecipação. O mercado está entre 1,8-2,2%. Renegociar pode economizar R$ 150.000 por ano.',
    impact: 'medium',
    category: 'Custos Financeiros',
    value: 150000
  },
  {
    id: 'insight3',
    type: 'alert',
    title: 'Margem Abaixo do Setor',
    description: 'Sua margem de contribuição está 7 pontos percentuais abaixo da média do setor (38%). Considere revisar precificação ou reduzir custos.',
    impact: 'high',
    category: 'Rentabilidade',
    value: 7,
    comparison: 'Setor: 38% | Sua: 31%'
  },
  {
    id: 'insight4',
    type: 'positive',
    title: 'Receita Cresceu 12,5%',
    description: 'Sua receita bruta apresentou crescimento sólido de 12,5% em relação ao mês anterior, mantendo a tendência positiva dos últimos 3 meses.',
    impact: 'medium',
    category: 'Receitas',
    value: 600000,
    comparison: 'vs setembro: +12,5%'
  },
  {
    id: 'insight5',
    type: 'recommendation',
    title: 'Break-Even Identificado',
    description: 'Seu break-even atual é R$ 5,2 milhões/mês. Você precisa faturar 4% a mais ou cortar R$ 200.000 de custos para atingir o ponto de equilíbrio.',
    impact: 'high',
    category: 'Planejamento',
    value: 5200000
  }
];

export const mockCategoryRules: CategoryRule[] = [
  {
    id: 'rule1',
    category: 'Salários e Encargos',
    pattern: 'SALARIOS',
    type: 'exact',
    accuracy: 100,
    status: 'active',
    matchCount: 156
  },
  {
    id: 'rule2',
    category: 'Salários e Encargos',
    pattern: 'INSS',
    type: 'exact',
    accuracy: 100,
    status: 'active',
    matchCount: 12
  },
  {
    id: 'rule3',
    category: 'Salários e Encargos',
    pattern: 'FGTS',
    type: 'exact',
    accuracy: 100,
    status: 'active',
    matchCount: 12
  },
  {
    id: 'rule4',
    category: 'Aluguel e Ocupação',
    pattern: 'ALUGUEL',
    type: 'exact',
    accuracy: 100,
    status: 'active',
    matchCount: 12
  },
  {
    id: 'rule5',
    category: 'Tecnologia e Software',
    pattern: 'SOFTWARES',
    type: 'exact',
    accuracy: 100,
    status: 'active',
    matchCount: 8
  },
  {
    id: 'rule6',
    category: 'Tecnologia e Software',
    pattern: 'INTERNET',
    type: 'exact',
    accuracy: 100,
    status: 'active',
    matchCount: 3
  },
  {
    id: 'rule7',
    category: 'Serviços Profissionais',
    pattern: 'CONTABILIDADE',
    type: 'exact',
    accuracy: 100,
    status: 'active',
    matchCount: 4
  },
  {
    id: 'rule8',
    category: 'Serviços Profissionais',
    pattern: 'ADVOCACIA',
    type: 'exact',
    accuracy: 100,
    status: 'active',
    matchCount: 2
  },
  {
    id: 'rule9',
    category: 'Tributos e Contribuições',
    pattern: 'COFINS',
    type: 'exact',
    accuracy: 100,
    status: 'active',
    matchCount: 22
  },
  {
    id: 'rule10',
    category: 'Logística e Distribuição',
    pattern: 'CORREIOS',
    type: 'exact',
    accuracy: 100,
    status: 'active',
    matchCount: 15
  }
];

export const mockReportPeriods: ReportPeriod[] = [
  {
    id: 'current',
    name: 'Outubro 2025',
    startDate: '2025-10-01',
    endDate: '2025-10-31',
    type: 'month'
  },
  {
    id: 'september',
    name: 'Setembro 2025',
    startDate: '2025-09-01',
    endDate: '2025-09-30',
    type: 'month'
  },
  {
    id: 'august',
    name: 'Agosto 2025',
    startDate: '2025-08-01',
    endDate: '2025-08-31',
    type: 'month'
  },
  {
    id: 'q3',
    name: '3º Trimestre 2025',
    startDate: '2025-07-01',
    endDate: '2025-09-30',
    type: 'quarter'
  },
  {
    id: 'ytd',
    name: 'Acumulado 2025',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    type: 'year'
  }
];