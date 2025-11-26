# 🚨 Relatório de Análise: Mocks e Lógica Defeituosa

**Data:** 25 de Novembro de 2025
**Prioridade:** ALTA (Requer ação imediata)

Este relatório identifica componentes críticos do sistema que estão utilizando dados estáticos ("mocks") em vez de dados reais do banco de dados, além de áreas com lógica incompleta ou defeituosa.

## 🛑 1. Dados Mockados (Crítico)

A utilização de mocks em componentes principais faz com que o sistema pareça funcionar, mas as alterações do usuário não são persistidas ou refletidas corretamente.

### 🔴 Categorias e Regras (Sistema Central)
O núcleo do sistema de categorização está desconectado do banco de dados em pontos cruciais.

| Arquivo Afetado | Problema Identificado | Impacto |
|----------------|----------------------|---------|
| `lib/agent/agent.ts` | O Agente de IA usa `mockCategories` hardcoded para construir o prompt. | **Crítico**: A IA não conhece categorias novas criadas pelo usuário. Sempre usará a lista fixa de mocks. |
| `app/categories/[id]/page.tsx` | Carrega detalhes da categoria de `mockCategories`. | Usuário vê dados falsos ao editar/visualizar categorias. Edições não funcionam. |
| `app/categories/manage/page.tsx` | Renderiza lista de categorias via `mockCategories`. | Lista de gestão mostra dados estáticos, ignorando o banco de dados. |
| `lib/mock-categories.ts` | Arquivo fonte dos dados estáticos. | Usado diretamente por componentes frontend e backend, contornando o DB. |

### 🔴 Configurações de Empresa
A gestão de empresas e contas também está comprometida.

| Arquivo Afetado | Problema Identificado | Impacto |
|----------------|----------------------|---------|
| `app/settings/companies/[id]/page.tsx` | Usa `mockCompanies` para exibir dados da empresa. | Configurações da empresa não são reais. Alterações não persistem. |
| `lib/mock-companies.ts` | Fonte de dados estáticos de empresas. | Bypass completo da tabela `companies` do banco. |

### 🔴 Pesquisa e Enriquecimento de Dados
Serviços auxiliares estão retornando dados falsos.

| Arquivo Afetado | Problema Identificado | Impacto |
|----------------|----------------------|---------|
| `lib/search/serpapi.ts` | Função retorna `mockResults` diretamente (Linha 76). | Pesquisa de enriquecimento de transações não é real. |
| `lib/search/cnpj-service.ts` | Função retorna `mockData[cnpj]` (Linha 234). | Validação e busca de CNPJ usa base fixa limitada. |

---

## ⚠️ 2. Lógica Incompleta (TODOs Críticos)

Várias funcionalidades importantes têm marcadores "TODO", indicando código não implementado que pode causar falhas ou comportamento inesperado.

### 🟠 Relatórios e DRE
A inteligência financeira está incompleta.
*   **`lib/services/dre.service.ts`**: Orçamento (`budget`), Variação (`variance`), Subcategorias e Taxa de Crescimento estão hardcoded como `0` ou arrays vazios.
*   **`app/reports/page.tsx`**: Funcionalidades de Drill-down, Edição de regras e Ações de insight estão marcadas como pendentes.

### 🟠 Uploads e Transações
*   **`lib/api/transactions.ts`**: Filtragem por `accountId` e `categoryId` não implementada (Linha 135).
*   **`app/api/ofx/upload-queue/route.ts`**: Sistema de filas robusto (Redis/BullMQ) é mencionado como TODO, usando processamento em background simples atualmente.

---

## 📉 3. Código Morto (Dead Code)

Arquivos que parecem não ser usados e podem causar confusão.
*   `lib/mock-transactions.ts`: Arquivo grande com transações mockadas, aparentemente sem uso (dead code).
*   `lib/mock-accounts.ts`: Provavelmente não utilizado ou utilizado incorretamente (investigação interrompida, mas segue padrão dos outros mocks).

---

## 🚀 Plano de Correção Recomendado

Recomenda-se a seguinte ordem de execução para corrigir os problemas:

1.  **Prioridade 1 (IA & Categorização)**:
    *   Refatorar `lib/agent/agent.ts` para buscar categorias ativas do banco de dados (`CategoriesService.getCategories()`) em vez de importar `mockCategories`.
    *   Garantir que o prompt do agente receba a lista dinâmica de categorias.

2.  **Prioridade 2 (Frontend de Categorias)**:
    *   Reescrever `app/categories/[id]/page.tsx` e `app/categories/manage/page.tsx` para usar server actions ou API routes que consultam o banco de dados.
    *   Remover importações de `lib/mock-categories.ts`.

3.  **Prioridade 3 (Settings de Empresa)**:
    *   Conectar `app/settings/companies/[id]/page.tsx` ao banco de dados.
    *   Eliminar dependência de `lib/mock-companies.ts`.

4.  **Prioridade 4 (Limpeza)**:
    *   Remover arquivos de mock (`lib/mock-*.ts`) após garantir que não há mais referências a eles.
    *   Implementar lógica real para `serpapi.ts` e `cnpj-service.ts` ou configurar tratamento de erro adequado se a API externa não estiver disponível.
