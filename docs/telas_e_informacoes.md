# FinanceAI - Telas e Informações Necessárias

**Versão**: 1.0
**Data**: 23 de Outubro de 2025
**Base**: PRD Técnico e DER Completo

---

## 📋 Sumário Executivo

Este documento descreve todas as telas do FinanceAI MVP, incluindo informações necessárias, dados requeridos, e comportamentos esperados para cada interface.

### Telas Principais Documentadas
1. **Autenticação** - Login, Registro, Recuperação de Senha
2. **Dashboard** - Principal com KPIs e visualizações
3. **Upload** - Processamento de extratos bancários
4. **Transações** - Listagem, filtros e edição
5. **Categorias** - Gestão de categorias e regras
6. **Relatórios** - DRE e exportações
7. **Configurações** - Empresa e perfil

---

## 🔐 Telas de Autenticação

### 1. Login (/login)

**Descrição**: Tela de autenticação principal para acesso ao sistema.

**Informações Necessárias**:
```typescript
interface LoginFormData {
  email: string;
  password: string;
  remember?: boolean;
}
```

**Campos da Tela**:
- **Email**: Input tipo email, placeholder "seu@email.com"
- **Senha**: Input tipo password, placeholder "Sua senha"
- **Manter conectado**: Checkbox (opcional)
- **Botão Entrar**: Primary button
- **Esqueceu a senha?**: Link para recuperação
- **Não tem conta? Cadastre-se**: Link para registro

**Validações**:
- Email formato válido
- Senha mínimo 8 caracteres
- Feedback visual de erro

**Comportamento**:
- Loading no botão durante autenticação
- Redirecionamento automático para /dashboard após sucesso
- Mensagens de erro específicas (email inválido, senha incorreta)

---

### 2. Registro (/register)

**Descrição**: Formulário de cadastro de novas empresas e usuários.

**Informações Necessárias**:
```typescript
interface RegisterFormData {
  // Dados do Usuário
  name: string;
  email: string;
  password: string;
  confirmPassword: string;

  // Dados da Empresa
  companyName: string;
  cnpj: string;
  corporateName?: string;
  phone?: string;
  industry?: string;
}
```

**Campos da Tela**:
- **Nome Completo**: Input text
- **Email**: Input email
- **Senha**: Input password com validação de força
- **Confirmar Senha**: Input password
- **Nome da Empresa**: Input text
- **CNPJ**: Input text com máscara XX.XXX.XXX/XXXX-XX
- **Razão Social**: Input text (opcional)
- **Telefone**: Input tel com máscara (opcional)
- **Setor**: Select com opções (opcional)
- **Termos de Uso**: Checkbox obrigatório
- **Botão Criar Conta**: Primary button

**Validações**:
- Senha igual confirmação
- CNPJ formato válido (validação básica)
- Senha forte (letras, números, especiais)
- Todos os campos obrigatórios preenchidos
- Aceite dos termos

**Comportamento**:
- Validação em tempo real dos campos
- Feedback visual de erro/sucesso
- Loading durante criação
- Redirecionamento para dashboard após sucesso

---

### 3. Recuperação de Senha (/forgot-password)

**Descrição**: Fluxo de recuperação de senha via email.

**Informações Necessárias**:
```typescript
interface ForgotPasswordData {
  email: string;
}
```

**Campos da Tela**:
- **Email**: Input email
- **Botão Enviar Email**: Primary button
- **Voltar para Login**: Link

**Comportamento**:
- Exibe mensagem de sucesso após envio
- Envia email com link de redefinição (implementação futura)
- Não confirma se email existe (segurança)

---

## 📊 Dashboard Principal (/dashboard)

**Descrição**: Visão geral da saúde financeira com KPIs principais.

**Informações Necessárias**:
```typescript
interface DashboardData {
  kpis: {
    totalRevenue: number;
    totalExpenses: number;
    netResult: number;
    contributionMargin: number;
    transactionCount: number;
  };
  comparison: {
    revenueChange: number;
    expensesChange: number;
    netResultChange: number;
    marginChange: number;
  };
  evolutionData: Array<{
    month: string;
    revenue: number;
    expenses: number;
    netResult: number;
  }>;
  categoryBreakdown: Array<{
    categoryName: string;
    amount: number;
    percentage: number;
    color: string;
  }>;
  recentTransactions: Transaction[];
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
  }>;
}
```

**Seções da Tela**:

#### 1. Header
- **Seleção de Período**: Dropdown (Mês atual, Trimestre, Semestre, Personalizado)
- **Seleção de Conta**: Dropdown (Todas, Conta A, Conta B)
- **Botão Upload**: Primary button "Upload Extrato"

#### 2. Cards KPIs
- **Receita Total**: Valor + variação % vs período anterior
- **Despesas Totais**: Valor + variação % vs período anterior
- **Resultado Líquido**: Valor + variação % vs período anterior
- **Margem de Contribuição**: Percentual + variação % vs período anterior

#### 3. Gráficos
- **Evolução Receita vs Despesa**: Line chart (6 meses)
- **Composição de Custos**: Pie chart por categoria
- **Fluxo de Caixa Diário**: Bar chart (últimos 30 dias)

#### 4. Transações Recentes
- **Tabela**: Data, Descrição, Categoria, Valor, Saldo
- **Filtros**: Todas, Receitas, Despesas
- **Paginação**: 10 itens por página
- **Ações**: Editar categoria, Ver detalhes

#### 5. Alertas
- **Custo Fixo Alto**: Alerta quando custos fixos > 70% receita
- **Margem Baixa**: Alerta quando margem < 20%
- **Sem Dados**: Info quando não há transações no período

**Comportamento**:
- Carregamento com skeleton screens
- Cache de 5 minutos para KPIs
- Refresh automático em background
- Responsivo com mobile-first design

---

## 📤 Tela de Upload (/upload)

**Descrição**: Interface para upload e processamento de extratos bancários.

**Informações Necessárias**:
```typescript
interface UploadData {
  files: File[];
  accountId: string;
  uploadProgress: {
    uploadId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    totalTransactions?: number;
    processedTransactions?: number;
    errors?: string[];
  };
}
```

**Campos da Tela**:

#### 1. Área de Upload
- **Drag & Drop**: Área arrastar arquivos
- **Ou clique para selecionar**: Botão secundário
- **Formatos suportados**: OFX, XLSX, CSV
- **Tamanho máximo**: 10MB por arquivo
- **Múltiplos arquivos**: Permitido

#### 2. Seleção de Conta
- **Conta Bancária**: Dropdown com contas cadastradas
- **+ Nova Conta**: Link/modal para cadastro

#### 3. Lista de Arquivos
- **Arquivos selecionados**: Lista com nome, tamanho, status
- **Remover**: Botão para excluir arquivo da lista
- **Status**: Pending, Processing, Completed, Failed

#### 4. Processamento
- **Botão Processar**: Primary button (desabilitado sem arquivos)
- **Progresso**: Barra de progresso geral
- **Status detalhado**: X de Y transações processadas
- **Log de erros**: Detalhes de falhas se houver

#### 5. Histórico
- **Uploads anteriores**: Tabela com data, arquivo, status, ações
- **Visualizar**: Link para detalhes do processamento
- **Baixar Log**: Download do log de processamento

**Validações**:
- Formato de arquivo válido
- Tamanho dentro do limite
- Conta bancária selecionada
- Arquivo não duplicado (verificação por hash)

**Comportamento**:
- Upload em paralelo de múltiplos arquivos
- WebSocket para atualizações em tempo real
- Validação client-side antes do upload
- Fila de processamento com prioridade

---

## 💰 Tela de Transações (/transactions)

**Descrição**: Listagem completa de transações com filtros avançados.

**Informações Necessárias**:
```typescript
interface TransactionsData {
  transactions: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'credit' | 'debit';
    category?: {
      id: string;
      name: string;
      color: string;
    };
    account: {
      id: string;
      name: string;
    };
    verified: boolean;
    manuallyCategorized: boolean;
  }>;
  filters: {
    dateFrom: string;
    dateTo: string;
    accountIds: string[];
    categoryIds: string[];
    type?: 'credit' | 'debit';
    search: string;
    verified?: boolean;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Campos da Tela**:

#### 1. Filtros (Sidebar)
- **Período**: Date picker (início e fim)
- **Contas**: Multi-select checkboxes
- **Categorias**: Multi-select com busca
- **Tipo**: Radio buttons (Todas, Receitas, Despesas)
- **Buscar**: Input text para busca por descrição
- **Status**: Checkboxes (Verificadas, Não verificadas)
- **Limpar Filtros**: Botão secundário

#### 2. Barra de Ações
- **Transações Selecionadas**: Counter quando há seleção
- **Ações em Lote**:
  - Categorizar selecionadas
  - Marcar como verificadas
  - Exportar selecionadas
- **Exportar Tudo**: Botão exportar CSV/Excel
- **+ Adicionar Transação**: Botão primário

#### 3. Tabela de Transações
- **Colunas**: Checkbox, Data, Descrição, Categoria, Valor, Saldo, Status, Ações
- **Ordenação**: Clicável nas colunas (data, valor, descrição)
- **Seleção**: Individual ou select all
- **Paginação**: Páginas numeradas com info "X de Y"

#### 4. Modal de Edição
- **Editar Categoria**: Dropdown de categorias
- **Editar Descrição**: Input text
- **Verificar**: Checkbox
- **Salvar/Cancelar**: Botões de ação

**Comportamento**:
- Filtros aplicados em tempo real
- Persistência de filtros na URL
- Seleção persistente durante navegação
- Loading states para cada operação

---

## 🏷️ Tela de Categorias (/categories)

**Descrição**: Gestão de categorias de transações e regras automáticas.

**Informações Necessárias**:
```typescript
interface CategoriesData {
  categories: Array<{
    id: string;
    name: string;
    type: 'revenue' | 'variable_cost' | 'fixed_cost' | 'non_operational';
    color: string;
    isSystem: boolean;
    active: boolean;
    transactionCount: number;
    totalAmount: number;
    rules: Array<{
      id: string;
      pattern: string;
      type: 'contains' | 'regex' | 'exact';
      confidence: number;
    }>;
    children?: Category[];
  }>;
}
```

**Campos da Tela**:

#### 1. Abas
- **Categorias**: Listagem e gestão de categorias
- **Regras**: Configuração de regras automáticas
- **Análise**: Estatísticas de uso

#### 2. Gestão de Categorias
- **Tipo de Categoria**: Tabs (Receitas, Custos Variáveis, Custos Fixos, Não Operacional)
- **Lista de Categorias**: Cards com nome, cor, # transações, valor total
- **+ Nova Categoria**: Botão flutuante ou header
- **Ações**: Editar, Desativar, Ver regras

#### 3. Formulário de Categoria
- **Nome**: Input text
- **Descrição**: Textarea (opcional)
- **Tipo**: Select (fixo baseado na aba)
- **Cor**: Color picker
- **Categoria Pai**: Select (para subcategorias)
- **Ativa**: Checkbox

#### 4. Regras Automáticas
- **Lista de Regras**: Tabela com padrão, tipo, acurácia, uso
- **+ Nova Regra**: Botão primário
- **Testar Regra**: Input para testar padrão
- **Ativar/Desativar**: Toggle por regra

#### 5. Formulário de Regra
- **Categoria**: Select de categorias
- **Padrão**: Input text
- **Tipo**: Radio buttons (contém, exato, regex)
- **Confiança**: Slider 0-100%
- **Ativa**: Checkbox

**Comportamento**:
- Drag & drop para ordenação (futuro)
- Preview em tempo real de regras
- Análise de impacto de mudanças
- Undo para alterações

---

## 📈 Tela de Relatórios (/reports)

**Descrição**: Geração e visualização de relatórios DRE e análises.

**Informações Necessárias**:
```typescript
interface ReportsData {
  availableReports: Array<{
    id: string;
    type: 'dre' | 'cash_flow' | 'monthly_summary';
    name: string;
    description: string;
    lastGenerated?: string;
  }>;
  reportHistory: Array<{
    id: string;
    type: string;
    period: { start: string; end: string };
    generatedAt: string;
    status: 'generating' | 'completed' | 'failed';
    downloadUrl?: string;
  }>;
}
```

**Campos da Tela**:

#### 1. Gerar Relatório
- **Tipo de Relatório**: Cards selecionáveis
  - DRE (Demonstrativo de Resultado)
  - Fluxo de Caixa
  - Resumo Mensal
- **Período**: Date picker (início e fim)
- **Opções**: Checkboxes (incluir detalhes, comparar períodos)
- **Gerar**: Botão primário

#### 2. Visualização de Relatório
- **DRE Estruturado**:
  - Receita Líquida
  - (-) Custos Variáveis
  - (=) Margem de Contribuição
  - (-) Custos Fixos
  - (=) Resultado Operacional
  - (-/+) Não Operacional
  - (=) Resultado Líquido
- **Drill-down**: Clicar em cada linha para ver transações
- **Comparativos**: Colunas período atual vs anterior
- **Gráficos**: Visualizações dos dados

#### 3. Exportação
- **Formatos**: PDF, Excel, CSV
- **Opções**: Incluir gráficos, detalhamento completo
- **Download**: Botão de download após geração
- **Compartilhar**: Link para compartilhamento (futuro)

#### 4. Histórico
- **Relatórios Anteriores**: Lista com data, tipo, período
- **Actions**: Visualizar, Download, Gerar novamente
- **Agendamentos**: Configurar relatórios automáticos (futuro)

**Comportamento**:
- Geração assíncrona com status updates
- Cache de relatórios por 24h
- Preview antes de download
- Templates personalizados (futuro)

---

## ⚙️ Tela de Configurações (/settings)

**Descrição**: Configurações da empresa, perfil e preferências.

### Aba 1: Empresa

**Informações Necessárias**:
```typescript
interface CompanySettings {
  name: string;
  cnpj: string;
  corporateName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  industry: string;
  monthlyRevenueRange: number;
  logo?: string;
}
```

**Campos**:
- **Nome Fantasia**: Input text
- **Razão Social**: Input text
- **CNPJ**: Input text (readonly após cadastro)
- **Contato**: Email, telefone
- **Endereço Completo**: Campos de endereço
- **Setor**: Select
- **Logo**: Upload de imagem
- **Salvar**: Botão primário

### Aba 2: Contas Bancárias

**Informações Necessárias**:
```typescript
interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  bankCode: string;
  agencyNumber: string;
  accountNumber: string;
  accountType: 'checking' | 'savings' | 'investment';
  openingBalance: number;
  active: boolean;
}
```

**Campos**:
- **Lista de Contas**: Cards com informações
- **+ Nova Conta**: Botão
- **Formulário**: Todos os campos da conta
- **Ativar/Desativar**: Toggle
- **Editar/Excluir**: Ações

### Aba 3: Usuários

**Informações Necessárias**:
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  active: boolean;
  lastLogin?: string;
}
```

**Campos**:
- **Lista de Usuários**: Tabela com nome, email, função, status
- **+ Convidar Usuário**: Botão para enviar convite
- **Funções**: Admin, Editor, Visualizador
- **Ativo/Inativo**: Toggle

### Aba 4: Preferências

**Campos**:
- **Moeda**: Select (BRL, USD, EUR)
- **Idioma**: Select (PT-BR, EN)
- **Tema**: Toggle (Claro/Escuro)
- **Notificações**: Checkboxes (email, push)
- **Exportações**: Configurações padrão

---

## 📱 Componentes Comuns

### 1. Header Principal
- **Logo**: FinanceAI branding
- **Busca Global**: Input search (futuro)
- **Notificações**: Badge com contador (futuro)
- **User Menu**: Avatar, nome, logout

### 2. Sidebar Navigation
- **Dashboard**: Ícone home
- **Transações**: Ícone transactions
- **Upload**: Ícone upload
- **Categorias**: Ícone tags
- **Relatórios**: Ícone reports
- **Configurações**: Ícone settings

### 3. Componentes de Feedback
- **Skeleton Screens**: Durante loading
- **Empty States**: Quando não há dados
- **Error States**: Mensagens de erro claras
- **Success Toasts**: Confirmações de ações

### 4. Modais Comuns
- **Confirmar Ação**: Para exclusões
- **Formulários**: Criação/edição
- **Detalhes**: Visualização de informações
- **Import/Export**: Configurações de exportação

---

## 🔄 Estados de Loading e Error

### Loading States
- **Skeleton cards** para KPIs
- **Progress bars** para processamento
- **Spinners** para botões
- **Shimmer effects** para tabelas

### Error States
- **Network error**: Tentar novamente
- **Validation error**: Campo específico destacado
- **Permission error**: Redirecionar ou bloquear
- **Server error**: Tente novamente mais tarde

### Empty States
- **No data**: Illustration + CTA para ação
- **No results**: Mensagem de busca sem resultados
- **First time**: Onboarding para nova funcionalidade

---

## 📊 Responsividade e Mobile

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Adaptações Mobile
- **Sidebar**: Collapsible drawer
- **Tabelas**: Cards em mobile
- **Gráficos**: Versões simplificadas
- **Modais**: Full screen em mobile

### Touch Interactions
- **Swipe actions**: Para transações
- **Pull to refresh**: Dashboard
- **Touch targets**: 44px mínimo

---

## ✅ Validações e Sanitização

### Client-side
- **Format validation**: Email, CNPJ, datas
- **Required fields**: Indicadores visuais
- **Character limits**: Contadores de caracteres
- **File validation**: Formato e tamanho

### Server-side
- **Input sanitization**: XSS protection
- **Authentication**: Session validation
- **Authorization**: Role-based access
- **Rate limiting**: API protection

---

## 🎯 Próximos Passos para Implementação

1. **Setup do projeto**: Next.js + Tailwind + shadcn/ui
2. **Autenticação**: Auth.js configuration
3. **Database**: Drizzle + Supabase setup
4. **Core pages**: Dashboard, Upload, Transactions
5. **IA integration**: OpenAI API setup
6. **Testing**: Unit + integration tests
7. **Deploy**: Vercel Pro configuration

**Este documento serve como guia completo para desenvolvimento de todas as telas do FinanceAI MVP!** 🚀