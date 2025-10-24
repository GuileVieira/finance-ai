'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import { ArrowRight, BarChart3, TrendingUp, Users, FileText, Upload } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();

  useEffect(() => {
    // Redirecionar para dashboard se já estiver logado
    if (!isLoading && isLoggedIn) {
      router.push('/dashboard');
    }
  }, [isLoggedIn, isLoading, router]);

  return (
    <LayoutWrapper requireAuth={false}>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-5xl font-bold text-gray-900 mb-6">
                FinanceAI
                <span className="text-emerald-600">.</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Gestão financeira inteligente com IA para categorização automática de transações.
                Baseado em dados reais de empresas brasileiras.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/login">
                  <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 px-8 py-3">
                    Começar Gratuitamente
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline" size="lg" className="px-8 py-3">
                    Ver Demo
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600 mb-2">94%</div>
                <div className="text-sm text-gray-600">Acurácia na Categorização</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600 mb-2">53</div>
                <div className="text-sm text-gray-600">Categorias Financeiras</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600 mb-2">8</div>
                <div className="text-sm text-gray-600">Bancos Suportados</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600 mb-2">24/7</div>
                <div className="text-sm text-gray-600">Disponibilidade</div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Recursos Principais
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Tudo que você precisa para gerenciar suas finanças de forma inteligente
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <BarChart3 className="h-8 w-8 text-emerald-600 mb-2" />
                <CardTitle>Dashboard Completo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Visualização completa de métricas financeiras com gráficos interativos e insights em tempo real.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <TrendingUp className="h-8 w-8 text-emerald-600 mb-2" />
                <CardTitle>Transações Inteligentes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Categorização automática com 94% de acurácia baseada em IA e dados reais de empresas brasileiras.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Users className="h-8 w-8 text-emerald-600 mb-2" />
                <CardTitle>Categorias Personalizadas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  53 categorias financeiras reais com regras automáticas inteligentes configuráveis para seu negócio.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Upload className="h-8 w-8 text-emerald-600 mb-2" />
                <CardTitle>Importação Automática</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Suporte para múltiplos formatos (OFX, XLS, XLSX) dos principais bancos brasileiros.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <FileText className="h-8 w-8 text-emerald-600 mb-2" />
                <CardTitle>Relatórios Detalhados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Relatórios financeiros completos com exportação em múltiplos formatos para análise.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <TrendingUp className="h-8 w-8 text-emerald-600 mb-2" />
                <CardTitle>Previsões e Análises</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Projeções financeiras baseadas em histórico com machine learning para melhores decisões.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="bg-emerald-600 rounded-2xl p-12 text-center max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">
              Pronto para transformar sua gestão financeira?
            </h2>
            <p className="text-emerald-100 text-lg mb-8">
              Comece agora mesmo e veja o poder da IA trabalhando para suas finanças.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="bg-white text-emerald-600 hover:bg-gray-100 px-8 py-3">
                  Criar Conta Gratuita
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-emerald-600 px-8 py-3">
                  Explorar Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}