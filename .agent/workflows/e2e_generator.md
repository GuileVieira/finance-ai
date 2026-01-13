---
description: Identificar componentes principais (Telas, Modais, Filtros) e gerar testes E2E automáticos
---

### 1. Mapeamento de Componentes Críticos
- **Objetivo**: Listar onde estão as interações principais do usuário.
- **Ação**:
  - Rode buscas (`grep_search`) por componentes interativos chave: `Dialog`, `Sheet`, `Drawer`, `Popover`, `Select`, `Form`.
  - Liste todas as `page.tsx` para saber as rotas.
  - Identifique "Features" principais agrupando por funcionalidade (ex: Cadastro de Categoria, Filtro de Dashboard, Upload).

### 2. Geração do Plano de Teste (Test Plan)
- **Ação**: Crie um arquivo `TEST_PLAN.md` listando os cenários a serem testados.
- **Formato**:
  ```markdown
  # Plano de Testes E2E
  ## [Nome da Funcionalidade]
  - Rota: /exemplo
  - Componentes: Botão "Novo", Modal de Cadastro
  - Cenário: Abrir modal, preencher form, salvar, verificar se apareceu na lista.
  ```

### 3. Execução dos Testes (Browser Subagent)
- **Ação Obrigatória**: Para cada funcionalidade listada no plano, use o `browser_subagent`.
- **Instrução pro Agente**: "Navegue para [Rota], e execute o cenário: [Descrição do Cenário]. Se houver erro, tire screenshot."
- **Registro**: Salve os screenshots e logs de sucesso/erro no próprio arquivo (ou num `TEST_RESULTS.md`).

### 4. Relatório de Execução
- Gere um resumo final dizendo quais fluxos funcionaram e quais quebraram.
