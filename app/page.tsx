"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

export default function Dashboard() {
  const [userName, setUserName] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Verificar se usuário está "logado"
    const isLoggedIn = localStorage.getItem('isLoggedIn')
    const storedUserName = localStorage.getItem('userName')

    if (!isLoggedIn) {
      // Redirecionar para login se não estiver logado
      window.location.href = '/login'
      return
    }

    setUserName(storedUserName || 'Usuário')

    // Simular loading de dados
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userName')
    window.location.href = '/login'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  // Dados mock do dashboard
  const kpis = {
    totalRevenue: 125400,
    totalExpenses: 87300,
    netResult: 38100,
    contributionMargin: 30.4
  }

  const recentTransactions = [
    { date: "23/10", description: "SALÁRIOS OUTUBRO", category: "Salários/Encargos", value: -28500 },
    { date: "23/10", description: "ALUGUEL MATRIZ", category: "Aluguel e Ocupação", value: -12500 },
    { date: "22/10", description: "SOFTWARE MENSAL", category: "Tecnologia", value: -4200 },
    { date: "22/10", description: "VENDA CLIENTE X", category: "Vendas Prod", value: 15800 },
    { date: "21/10", description: "COMISSÕES VENDAS", category: "Comissões Variáveis", value: -3200 },
  ]

  const categoryBreakdown = [
    { name: "SALÁRIOS E ENCARGOS", amount: 45200, percentage: 51.8, color: "bg-red-600" },
    { name: "CUSTOS DE PRODUTOS", amount: 23400, percentage: 26.8, color: "bg-orange-600" },
    { name: "ALUGUEL E OCUPAÇÃO", amount: 12500, percentage: 14.3, color: "bg-red-700" },
    { name: "TECNOLOGIA E SOFTWARE", amount: 6200, percentage: 7.1, color: "bg-red-800" },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-emerald-700">FinanceAI</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">👤 {userName}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-transparent border-b rounded-none h-auto p-0">
              <TabsTrigger
                value="dashboard"
                className="text-gray-600 hover:text-emerald-700 border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-700 rounded-none"
              >
                Dashboard
              </TabsTrigger>
              <TabsTrigger
                value="transactions"
                className="text-gray-600 hover:text-emerald-700 border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-700 rounded-none"
              >
                Transações
              </TabsTrigger>
              <TabsTrigger
                value="upload"
                className="text-gray-600 hover:text-emerald-700 border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-700 rounded-none"
              >
                Upload
              </TabsTrigger>
              <TabsTrigger
                value="categories"
                className="text-gray-600 hover:text-emerald-700 border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-700 rounded-none"
              >
                Categorias
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="text-gray-600 hover:text-emerald-700 border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-700 rounded-none"
              >
                Relatórios
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-0">
              <div className="py-4">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Visão Geral</h2>
                  <div className="flex space-x-4">
                    <select className="px-3 py-2 border border-gray-300 rounded-md text-sm">
                      <option>Setembro/2025</option>
                      <option>Agosto/2025</option>
                      <option>Julho/2025</option>
                    </select>
                    <Button size="sm">
                      Upload
                    </Button>
                  </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                      <Badge variant="secondary" className="text-green-600">+12.5%</Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        R$ {kpis.totalRevenue.toLocaleString('pt-BR')}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Despesas Totais</CardTitle>
                      <Badge variant="secondary" className="text-red-600">+8.2%</Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        R$ {kpis.totalExpenses.toLocaleString('pt-BR')}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Resultado Líquido</CardTitle>
                      <Badge variant="secondary" className="text-green-600">+18.3%</Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-700">
                        R$ {kpis.netResult.toLocaleString('pt-BR')}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Margem Contribuição</CardTitle>
                      <Badge variant="secondary" className="text-green-600">↑5.1%</Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-emerald-600">
                        {kpis.contributionMargin}%
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Category Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>Detalhamento por Categoria</CardTitle>
                      <CardDescription>Distribuição dos custos</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {categoryBreakdown.map((category, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{category.name}</span>
                            <span className="text-sm text-gray-600">
                              R$ {category.amount.toLocaleString('pt-BR')} ({category.percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`${category.color} h-2 rounded-full`}
                              style={{ width: `${category.percentage * 2}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Transações Recentes</CardTitle>
                      <CardDescription>Últimas movimentações</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {recentTransactions.map((transaction, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium">{transaction.description}</p>
                              <p className="text-xs text-gray-500">{transaction.category}</p>
                            </div>
                            <span className={`text-sm font-bold ${transaction.value > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.value > 0 ? '+' : ''}R$ {Math.abs(transaction.value).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        ))}
                      </div>
                      <Separator className="my-4" />
                      <div className="text-center">
                        <Link href="/transactions">
                          <Button variant="outline" size="sm">Ver todas</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Alert */}
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-yellow-600">⚠️</span>
                      <p className="text-sm text-yellow-800">
                        <strong>Alerta:</strong> Custos fixos representam 75% da receita. Considere otimizar despesas para melhorar a margem.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Other tabs content - placeholder */}
            <TabsContent value="transactions" className="mt-0">
              <div className="py-8 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Transações</h3>
                <p className="text-gray-600">Funcionalidade em desenvolvimento...</p>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="mt-0">
              <div className="py-8 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload de Extratos</h3>
                <p className="text-gray-600">Funcionalidade em desenvolvimento...</p>
              </div>
            </TabsContent>

            <TabsContent value="categories" className="mt-0">
              <div className="py-8 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Categorias</h3>
                <p className="text-gray-600">Funcionalidade em desenvolvimento...</p>
              </div>
            </TabsContent>

            <TabsContent value="reports" className="mt-0">
              <div className="py-8 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Relatórios</h3>
                <p className="text-gray-600">Funcionalidade em desenvolvimento...</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
