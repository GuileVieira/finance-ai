---
description: Realizar uma auditoria completa de UX/UI focada em usuários leigos
---

### 1. Mapeamento de Funcionalidades
- **Objetivo**: Identificar todas as telas e ações principais do sistema.
- **Ação**:
  - Liste todos os arquivos em `app/` para identificar as rotas (páginas).
  - Para cada página, identifique as ações principais (botões, formulários, filtros).
  - *Dica*: Procure por componentes interativos como `Button`, `Dialog`, `Select`, `Input`.

### 2. Teste Prático e Simulação de Jornada (Browser & Walkthrough)
- **Ação Obrigatória**: Abra o navegador (`browser_subagent`) e navegue pelas páginas. Não faça apenas análise estática de código.
- **Objetivo**: Sentir a fluidez, tempos de resposta e feedback visual real.
- **Simulação**: Para cada funcionalidade, use o sistema como uma pessoa sem conhecimento técnico:
  1. **O que é isso?**: O nome da funcionalidade é claro? (Ex: "DRE" vs "Relatório de Lucro").
  2. **Como uso?**: É óbvio onde clicar? O fluxo é linear?
  3. **O que aconteceu?**: O sistema dá feedback de sucesso/erro claro?

### 3. Análise de Fricção e Barreiras
Identifique pontos que podem travar um usuário leigo:
- **Jargões Técnicos**: Termos financeiros ou de TI complexos.
- **Carga Cognitiva**: Telas com informação demais ou sem hierarquia visual.
- **Erros**: Mensagens de erro vagas ("Erro 500" vs "Não foi possível salvar").
- **Acessibilidade**: Contraste, tamanho de fonte, facilidade de clique.

### 4. Relatório de Melhora
Gere um relatório final no formato Markdown contendo:
- **Tabela de Funcionalidades**: [Nome] | [Objetivo] | [Complexidade Percebida (1-5)]
- **Pontos de Fricção Críticos**: Lista do que mais atrapalha o uso.
- **Sugestões de Melhoria**: Ações concretas (trocar texto X por Y, mudar cor do botão, simplificar formulário).
