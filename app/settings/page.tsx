'use client';

import { useState } from 'react';
import { LayoutWrapper } from '@/components/shared/layout-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Users, Building2, CreditCard, Tags, Upload, FileText, Shield, Bell } from 'lucide-react';

const menuItems = [
  {
    id: 'categories',
    label: 'Categorias',
    icon: Tags,
    description: 'Gerenciar categorias financeiras',
    badge: '12'
  },
  {
    id: 'accounts',
    label: 'Contas Bancárias',
    icon: CreditCard,
    description: 'Configurar contas e bancos',
    badge: null
  },
  {
    id: 'companies',
    label: 'Empresas',
    icon: Building2,
    description: 'Gerenciar empresas e multitenancy',
    badge: null
  },
  {
    id: 'uploads',
    label: 'Uploads',
    icon: Upload,
    description: 'Histórico de importações',
    badge: '3'
  },
  {
    id: 'users',
    label: 'Usuários',
    icon: Users,
    description: 'Gestão de usuários e permissões',
    badge: null
  },
  {
    id: 'reports',
    label: 'Relatórios',
    icon: FileText,
    description: 'Configurar relatórios personalizados',
    badge: null
  },
  {
    id: 'security',
    label: 'Segurança',
    icon: Shield,
    description: 'Configurações de segurança',
    badge: null
  },
  {
    id: 'notifications',
    label: 'Notificações',
    icon: Bell,
    description: 'Preferências de notificação',
    badge: null
  }
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('categories');

  const handleNavigation = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie todas as configurações do sistema em um único lugar
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Menu
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <nav className="space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigation(item.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent transition-colors ${
                          activeSection === item.id ? 'bg-accent border-l-4 border-primary' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          <div>
                            <p className="font-medium">{item.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            {activeSection === 'categories' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">Categorias Financeiras</h2>
                  <p className="text-muted-foreground">
                    Gerencie todas as categorias para classificação automática de transações
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold">12</p>
                          <p className="text-sm text-muted-foreground">Categorias Ativas</p>
                        </div>
                        <Tags className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold">94%</p>
                          <p className="text-sm text-muted-foreground">Acurácia Média</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-green-600 text-xs font-bold">✓</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Ações Rápidas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      className="w-full justify-start"
                      onClick={() => window.location.href = '/settings/categories'}
                    >
                      <Tags className="h-4 w-4 mr-2" />
                      Gerenciar Categorias
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => window.location.href = '/categories'}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Ver Visão Geral
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection === 'accounts' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">Contas Bancárias</h2>
                  <p className="text-muted-foreground">
                    Configure e gerencie suas contas bancárias
                  </p>
                </div>

                <Card>
                  <CardContent className="p-8 text-center">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Gerenciamento de Contas</h3>
                    <p className="text-muted-foreground mb-4">
                      Configure suas contas bancárias para importação automática de extratos
                    </p>
                    <Button onClick={() => window.location.href = '/accounts'}>
                      Gerenciar Contas
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection === 'companies' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">Empresas</h2>
                  <p className="text-muted-foreground">
                    Gerencie múltiplas empresas e configure multitenancy
                  </p>
                </div>

                <Card>
                  <CardContent className="p-8 text-center">
                    <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Gestão de Empresas</h3>
                    <p className="text-muted-foreground mb-4">
                      Adicione e gerencie múltiplas empresas no sistema
                    </p>
                    <Button onClick={() => window.location.href = '/companies'}>
                      Gerenciar Empresas
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection === 'uploads' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">Histórico de Uploads</h2>
                  <p className="text-muted-foreground">
                    Visualize e gerencie o histórico de importações de arquivos
                  </p>
                </div>

                <Card>
                  <CardContent className="p-8 text-center">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Uploads Realizados</h3>
                    <p className="text-muted-foreground mb-4">
                      Acompanhe o status e histórico de suas importações
                    </p>
                    <Button onClick={() => window.location.href = '/uploads/history'}>
                      Ver Histórico
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection === 'users' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">Usuários e Permissões</h2>
                  <p className="text-muted-foreground">
                    Gerencie usuários, equipes e controle de acesso
                  </p>
                </div>

                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Gestão de Usuários</h3>
                    <p className="text-muted-foreground mb-4">
                      Configure permissões e gerencie o acesso ao sistema
                    </p>
                    <Button onClick={() => window.location.href = '/users'}>
                      Gerenciar Usuários
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection === 'reports' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">Relatórios Personalizados</h2>
                  <p className="text-muted-foreground">
                    Configure relatórios automatizados e personalizados
                  </p>
                </div>

                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Configurações de Relatórios</h3>
                    <p className="text-muted-foreground mb-4">
                      Crie e gerencie relatórios personalizados
                    </p>
                    <Button>
                      Configurar Relatórios
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection === 'security' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">Segurança</h2>
                  <p className="text-muted-foreground">
                    Configure opções de segurança e autenticação
                  </p>
                </div>

                <Card>
                  <CardContent className="p-8 text-center">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Configurações de Segurança</h3>
                    <p className="text-muted-foreground mb-4">
                      Gerencie senhas, autenticação e políticas de segurança
                    </p>
                    <Button>
                      Configurar Segurança
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">Notificações</h2>
                  <p className="text-muted-foreground">
                    Configure preferências de notificação e alertas
                  </p>
                </div>

                <Card>
                  <CardContent className="p-8 text-center">
                    <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Preferências de Notificação</h3>
                    <p className="text-muted-foreground mb-4">
                      Configure como e quando receber notificações
                    </p>
                    <Button>
                      Configurar Notificações
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}