# FinanceAI - MVP Financeiro

Sistema de gestão financeira com IA para categorização automática de transações.

## 📋 Visão Geral

Este é um MVP (Produto Mínimo Viável) do FinanceAI, focado em demonstrar a interface principal com base em dados reais extraídos de planilhas XMIND e extratos bancários.

## 🎯 Funcionalidades Implementadas

### ✅ Páginas Principais
- **Login** (Mock) - Autenticação simulada
- **Dashboard** - Visão geral com métricas e gráficos
- **Transações** - Lista de transações (placeholder)
- **Upload** - Importação de extratos (placeholder)
- **Categorias** - Gestão de categorias (placeholder)
- **Relatórios** - Relatórios financeiros (placeholder)

### ✅ Dashboard Completo
- **Cards de Métricas**: Receita, Despesas, Resultado, Margem
- **Gráfico de Categorias**: Visualização detalhada dos custos
- **Top Despesas**: Lista das principais despesas com ícones
- **Transações Recentes**: Tabela com últimas movimentações
- **Insights**: Cards com informações baseadas nos dados reais

### ✅ Dados Realistas
- Baseado em 53 rúbricas reais do XMIND
- Categorias pré-definidas com cores específicas
- Valores financeiros realistas
- 94% de acurácia simulada na categorização

## 🛠️ Tecnologias

- **Next.js 15** com App Router
- **TypeScript** para type safety
- **Tailwind CSS** para estilização
- **shadcn/ui** para componentes UI
- **Lucide React** para ícones

## 🚀 Como Executar

1. **Instalar dependências:**
   ```bash
   pnpm install
   ```

2. **Executar servidor de desenvolvimento:**
   ```bash
   pnpm run dev
   ```

3. **Acessar aplicação:**
   - Abra http://localhost:3000 no navegador
   - Use qualquer email/senha para fazer login
   - Ou clique em "Acessar como visitante"

## 🎨 Interface

O design segue os wireframes atualizados com dados reais, incluindo:

- **Cores específicas por categoria:**
  - Salários: #DC2626 (vermelho)
  - Custos de Produtos: #B45309 (laranja)
  - Aluguel: #B91C1C (vermelho escuro)
  - Tecnologia: #991B1B (bordô)

- **Navegação intuitiva** com tabs
- **Cards responsivos** com métricas importantes
- **Gráficos visuais** para análise rápida

## 📊 Dados Mock

Os dados foram criados com base na análise real de:
- 8 extratos bancários (BB, Itaú, Santander, CEF, Safra)
- 16 abas do XMIND (CP, CR, ORÇAMENTO, Projeções)
- 53 rúbricas reais mapeadas

## 🔮 Próximos Passos

Este MVP é focado em frontend e mock de dados. Para uma versão completa:

1. **Backend API** - Integração com banco de dados
2. **Processamento de Arquivos** - Upload real de OFX/XLS
3. **IA de Categorização** - Machine learning para auto-categorização
4. **Autenticação Real** - Integração com provedores de auth
5. **Dashboard Interativo** - Filtros e drill-downs

## 📝 Licença

Projeto desenvolvido como MVP para demonstração.
