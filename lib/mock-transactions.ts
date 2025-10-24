// Dados mock completos para a página de transações baseados nos dados reais
import { Transaction } from '@/lib/types';

export const mockTransactionsData: Transaction[] = [
  // Outubro 2025 - Transações mais recentes
  {
    id: '1',
    date: '2025-10-23',
    description: 'SALÁRIOS OUTUBRO',
    category: 'Salários e Encargos',
    amount: -28500,
    type: 'expense',
    bank: 'BB',
      },
  {
    id: '2',
    date: '2025-10-23',
    description: 'ALUGUEL MATRIZ',
    category: 'Aluguel e Ocupação',
    amount: -12500,
    type: 'expense',
    bank: 'Itaú',
      },
  {
    id: '3',
    date: '2025-10-22',
    description: 'SOFTWARE MENSAL',
    category: 'Tecnologia e Software',
    amount: -4200,
    type: 'expense',
    bank: 'Santander',
      },
  {
    id: '4',
    date: '2025-10-22',
    description: 'VENDA CLIENTE X',
    category: 'Vendas de Produtos',
    amount: 15800,
    type: 'income',
    bank: 'BB',
      },
  {
    id: '5',
    date: '2025-10-21',
    description: 'COMISSÕES VENDEDORES',
    category: 'Comissões e Variáveis',
    amount: -3500,
    type: 'expense',
    bank: 'CEF',
      },
  {
    id: '6',
    date: '2025-10-20',
    description: 'MATERIAL DE EMBALAGEM',
    category: 'Custos de Produtos',
    amount: -1200,
    type: 'expense',
    bank: 'BB',
      },
  {
    id: '7',
    date: '2025-10-20',
    description: 'ENERGIA ELÉTRICA',
    category: 'Utilidades e Insumos',
    amount: -1500,
    type: 'expense',
    bank: 'CEF',
      },
  {
    id: '8',
    date: '2025-10-19',
    description: 'INTERNET FIBRA',
    category: 'Tecnologia e Software',
    amount: -280,
    type: 'expense',
    bank: 'Itaú',
      },
  {
    id: '9',
    date: '2025-10-19',
    description: 'VENDA ATACADO',
    category: 'Vendas de Produtos',
    amount: 23500,
    type: 'income',
    bank: 'BB',
      },
  {
    id: '10',
    date: '2025-10-18',
    description: 'CONTABILIDADE',
    category: 'Serviços Profissionais',
    amount: -1800,
    type: 'expense',
    bank: 'Santander',
      },
  {
    id: '11',
    date: '2025-10-18',
    description: 'CORREIOS',
    category: 'Logística e Distribuição',
    amount: -450,
    type: 'expense',
    bank: 'Correios',
      },
  {
    id: '12',
    date: '2025-10-17',
    description: 'VENDA VAREJO',
    category: 'Vendas de Produtos',
    amount: 8900,
    type: 'income',
    bank: 'BB',
      },
  {
    id: '13',
    date: '2025-10-16',
    description: 'MANUTENÇÃO AR CONDICIONADO',
    category: 'Manutenção e Serviços',
    amount: -680,
    type: 'expense',
    bank: 'Itaú',
      },
  {
    id: '14',
    date: '2025-10-16',
    description: 'TELEFONE MOVEL',
    category: 'Utilidades e Insumos',
    amount: -180,
    type: 'expense',
    bank: 'Vivo',
      },
  {
    id: '15',
    date: '2025-10-15',
    description: 'COFINS MENSAL',
    category: 'Tributos e Contribuições',
    amount: -3200,
    type: 'expense',
    bank: 'BB',
      },
  // Transações mais antigas para ter mais dados
  {
    id: '16',
    date: '2025-10-15',
    description: 'TRANSPORTE',
    category: 'Logística e Distribuição',
    amount: -230,
    type: 'expense',
    bank: 'Santander',
      },
  {
    id: '17',
    date: '2025-10-14',
    description: 'VENDA EXPORTAÇÃO',
    category: 'Vendas de Produtos',
    amount: 45600,
    type: 'income',
    bank: 'BB',
      },
  {
    id: '18',
    date: '2025-10-13',
    description: 'INSS',
    category: 'Salários e Encargos',
    amount: -5200,
    type: 'expense',
    bank: 'BB',
      },
  {
    id: '19',
    date: '2025-10-12',
    description: 'MATERIAL DE LIMPEZA',
    category: 'Manutenção e Serviços',
    amount: -320,
    type: 'expense',
    bank: 'Itaú',
      },
  {
    id: '20',
    date: '2025-10-12',
    description: 'VENDA REPRESENTANTE',
    category: 'Vendas de Produtos',
    amount: 12300,
    type: 'income',
    bank: 'BB',
      }
];

// Filtros disponíveis
export const filterOptions = {
  periods: [
    { value: '2025-10', label: 'Outubro/2025' },
    { value: '2025-09', label: 'Setembro/2025' },
    { value: '2025-08', label: 'Agosto/2025' },
    { value: '2025-07', label: 'Julho/2025' }
  ],
  banks: [
    { value: 'all', label: 'Todos' },
    { value: 'BB', label: 'Banco do Brasil' },
    { value: 'Itaú', label: 'Itaú' },
    { value: 'Santander', label: 'Santander' },
    { value: 'CEF', label: 'Caixa Econômica' },
    { value: 'Correios', label: 'Correios' },
    { value: 'Vivo', label: 'Vivo' }
  ],
  categories: [
    { value: 'all', label: 'Todas' },
    { value: 'Vendas de Produtos', label: 'Vendas de Produtos' },
    { value: 'Salários e Encargos', label: 'Salários e Encargos' },
    { value: 'Aluguel e Ocupação', label: 'Aluguel e Ocupação' },
    { value: 'Tecnologia e Software', label: 'Tecnologia e Software' },
    { value: 'Comissões e Variáveis', label: 'Comissões e Variáveis' },
    { value: 'Custos de Produtos', label: 'Custos de Produtos' },
    { value: 'Serviços Profissionais', label: 'Serviços Profissionais' },
    { value: 'Logística e Distribuição', label: 'Logística e Distribuição' },
    { value: 'Utilidades e Insumos', label: 'Utilidades e Insumos' },
    { value: 'Tributos e Contribuições', label: 'Tributos e Contribuições' },
    { value: 'Manutenção e Serviços', label: 'Manutenção e Serviços' }
  ],
  types: [
    { value: 'all', label: 'Todas' },
    { value: 'income', label: 'Receitas' },
    { value: 'expense', label: 'Despesas' }
  ]
};

// Funções de filtragem
export const filterTransactions = (
  transactions: Transaction[],
  filters: {
    period?: string;
    bank?: string;
    category?: string;
    type?: string;
    search?: string;
  }
): Transaction[] => {
  return transactions.filter(transaction => {
    // Filtro por período
    if (filters.period && !transaction.date.startsWith(filters.period)) {
      return false;
    }

    // Filtro por banco
    if (filters.bank && filters.bank !== 'all' && transaction.bank !== filters.bank) {
      return false;
    }

    // Filtro por categoria
    if (filters.category && filters.category !== 'all' && transaction.category !== filters.category) {
      return false;
    }

    // Filtro por tipo
    if (filters.type && filters.type !== 'all' && transaction.type !== filters.type) {
      return false;
    }

    // Filtro por busca
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        transaction.description.toLowerCase().includes(searchLower) ||
        transaction.category.toLowerCase().includes(searchLower) ||
        (transaction.bank && transaction.bank.toLowerCase().includes(searchLower))
      );
    }

    return true;
  });
};

// Paginação
export const paginateTransactions = (
  transactions: Transaction[],
  currentPage: number,
  itemsPerPage: number = 10
) => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return transactions.slice(startIndex, endIndex);
};

// Estatísticas
export const getTransactionsStats = (transactions: Transaction[]) => {
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = Math.abs(
    transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
  );

  const total = income - expenses;

  return {
    income,
    expenses,
    total,
    transactionCount: transactions.length,
    incomeCount: transactions.filter(t => t.type === 'income').length,
    expenseCount: transactions.filter(t => t.type === 'expense').length
  };
};