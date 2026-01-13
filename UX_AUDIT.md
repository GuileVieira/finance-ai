# Relatório de Auditoria UX/UI - Foco em Usuário Leigo
**Data:** 13/01/2026
**Analista:** Antigravity Agent

---

## 📸 Teste Prático (Browser Walkthrough)
Realizei uma navegação completa pelo sistema simulando um usuário sem conhecimento financeiro ou técnico.
**Gravação da Sessão:**
![Sessão de Auditoria](/Users/guilherme/.gemini/antigravity/brain/eee5a006-8770-4af6-87d0-9c3100b1c383/ux_audit_initial_check_1768323406529.webp)

---

## 1. Mapeamento de Funcionalidades & Complexidade

| Funcionalidade | Objetivo Percebido pelo Leigo | Complexidade (1-5) |
| :--- | :--- | :---: |
| **Dashboard** | Ver quanto dinheiro tenho e para onde foi. | 2 |
| **Transações** | Ver a lista de compras e pagamentos. | 3 |
| **Categorias** | Arrumar os grupos de contas. | 4 (Alta fricção!) |
| **Relatórios (DRE)** | Entender o lucro da empresa. | 4 |
| **Upload** | Mandar os extratos do banco para o sistema. | 2 |

---

## 2. Pontos de Fricção Críticos (O que trava o usuário)

### 🚨 Terminologias e Jargões (Cognitive Load)
- **"DRE"**: A sigla não significa nada para um leigo. (✅ Resolvido: "Demonstrativo Financeiro")
- **"Custos Variáveis / Fixos"** (Categorias): Termos contábeis confusos.
  - *Ação:* Adicionar tooltips explicativos.
- **"Wildcard / Patterns"** (Regras): O sistema expõe lógica de banco de dados para o usuário.

### 😵 Legibilidade de Dados
- **Números Grandes**: Valores como `R$ 11.072.615,20` são difíceis de escanear.
  - *Status:* ✅ Resolvido no Dashboard.
  - *Pendente:* Precisa aplicar na tela de **Categorias**.
- **Ações Escondidas** (Categorias): O usuário precisa "caçar" onde clicar para editar ou ver regras. Botões só aparecem com o mouse em cima.

---

## 3. Sugestões de Melhoria (Quick Wins)

### ✨ Dashboard
- [x] **Ação**: Implementar formatador de números compactos (ex: 1k, 1M).
- [ ] **Ação**: Renomear "Plano de Contas" para "Categorias".

### 📂 Categorias (Novo)
- [x] **Ação**: Tornar botões de ação (Editar, Regras) **sempre visíveis**.
- [x] **Ação**: Aplicar formatação compacta nos valores dos Cards.
- [x] **Ação**: Adicionar explicações (tooltips) nos filtros de tipos de custo.

### 📊 Relatórios
- [x] **Ação**: Mudar título de "DRE" para "Relatório de Resultados".

---

## 4. Evidências Visuais
| Tela | Problema Identificado |
| :--- | :--- |
| **Dashboard** | ![Dashboard](/Users/guilherme/.gemini/antigravity/brain/eee5a006-8770-4af6-87d0-9c3100b1c383/dashboard_view_1768323417916.png)<br>Números grandes difíceis de ler. |
| **Categorias** | ![Categorias](/Users/guilherme/.gemini/antigravity/brain/eee5a006-8770-4af6-87d0-9c3100b1c383/.system_generated/click_feedback/click_feedback_1768328510869.png)<br>Botões pequenos e sem legenda clara. |
