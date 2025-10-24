'use client';

import { useState, useEffect } from 'react';
import { Database, Table, Building2, CreditCard, Users, BarChart3 } from 'lucide-react';

interface DatabaseStats {
  companies: number;
  accounts: number;
  categories: number;
  transactions: number;
  uploads: number;
}

export default function DatabasePage() {
  const [stats, setStats] = useState<DatabaseStats>({
    companies: 0,
    accounts: 0,
    categories: 0,
    transactions: 0,
    uploads: 0
  });

  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDatabaseInfo();
  }, []);

  const loadDatabaseInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregar estatísticas
      const statsResponse = await fetch('/api/test');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats(statsData.data.statistics);
        }
      }

      // Carregar transações recentes
      const transactionsResponse = await fetch('/api/transactions?limit=20');
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        if (transactionsData.success) {
          setTables(transactionsData.data.transactions || []);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    loadDatabaseInfo();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Database className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Carregando informações do banco de dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <Database className="w-12 h-12 mx-auto mb-4" />
          <p>Erro: {error}</p>
          <button
            onClick={refreshData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Database className="w-8 h-8 mr-3 text-blue-600" />
            Banco de Dados Financeiro
          </h1>
          <p className="mt-2 text-gray-600">
            Visualização dos dados do sistema PGLite + Drizzle ORM
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Empresas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.companies}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <CreditCard className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Contas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.accounts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Categorias</p>
                <p className="text-2xl font-bold text-gray-900">{stats.categories}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Table className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Transações</p>
                <p className="text-2xl font-bold text-gray-900">{stats.transactions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Database className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Uploads</p>
                <p className="text-2xl font-bold text-gray-900">{stats.uploads}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Transações */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Transações Recentes</h2>
            <button
              onClick={refreshData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 flex items-center"
            >
              <Database className="w-4 h-4 mr-2" />
              Atualizar
            </button>
          </div>

          {tables.length === 0 ? (
            <div className="text-center py-12">
              <Table className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma transação encontrada</p>
              <p className="text-sm text-gray-400 mt-2">
                Faça upload de um arquivo OFX para começar
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoria
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conta
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tables.map((transaction, index) => (
                    <tr key={transaction.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(transaction.transactionDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {transaction.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          transaction.type === 'credit'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.type === 'credit' ? 'Crédito' : 'Débito'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`font-medium ${
                          transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'credit' ? '+' : '-'}
                          R$ {Math.abs(Number(transaction.amount)).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {transaction.categoryName || 'Não classificado'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {transaction.accountName || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Informações do Sistema */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Informações do Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-700">Banco de Dados:</span>
              <p className="text-blue-600">PGLite (PostgreSQL em arquivo local)</p>
            </div>
            <div>
              <span className="font-medium text-blue-700">ORM:</span>
              <p className="text-blue-600">Drizzle ORM</p>
            </div>
            <div>
              <span className="font-medium text-blue-700">Arquivo do Banco:</span>
              <p className="text-blue-600 font-mono text-xs">storage_tmp/database.db</p>
            </div>
            <div>
              <span className="font-medium text-blue-700">Storage de Arquivos:</span>
              <p className="text-blue-600">storage_tmp/ofx/</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}