# Relatório de Categorização de Transações

Este documento detalha o sistema de categorização de transações financeiras, cobrindo o pipeline de processamento, categorias padrão, regras e prompts utilizados pelos agentes de IA.

## 1. Pipeline de Categorização

O sistema utiliza uma abordagem hierárquica para categorizar transações (`TransactionCategorizationService`), priorizando métodos determinísticos e rápidos antes de recorrer à Inteligência Artificial.

### Camadas do Pipeline:

1.  **Cache**: Verifica se uma transação idêntica já foi categorizada recentemente (95% de confiança).
2.  **Regras (Rules)**: Aplica regras de correspondência (Regex, Exact, Fuzzy) definidas pelo usuário ou sistema.
3.  **Histórico**: Busca transações similares passadas (últimos 90 dias) usando similaridade de texto (Levenshtein).
4.  **Inteligência Artificial (IA)**: Se nenhuma das camadas anteriores resolver, a transação é enviada para o agente de IA.

Após a categorização via IA com alta confiança (>= 75%), o sistema pode acionar o **Auto-Learning**, que agrupa transações similares (Clustering) para sugerir novas regras automáticas.

---

## 2. Categorias Padrão

As categorias são estruturadas hierarquicamente para atender ao DRE (Demonstrativo de Resultados do Exercício). Elas são definidas principalmente em `lib/mock-categories.ts`.

### Estrutura:

- **DRE Group**: Grupo macro do DRE (ex: Receita Bruta, Custos Fixos).
- **Category Group**: Agrupamento lógico (ex: Pessoal, Ocupação).
- **Category Name**: Nome da rubrica (ex: Salários, Aluguel).

### Listagem de Categorias por Grupo DRE:

#### RECEITA BRUTA (RoB)

- **FATURAMENTO**: Receita de vendas de produtos e serviços.
- **DUPLICATA DESCONTADA**: Recebimento de duplicatas descontadas.
- **DUPLICATA EM CARTEIRA**: Recebimento de duplicatas em carteira.
- **DEPÓSITO EM DINHEIRO / TED**: Transferências recebidas.
- **CREDITO DE NOTA COMERCIAL**: Crédito de nota comercial.
- **CREDITO SALDO VINCULADA**: Crédito de conta vinculada.

#### RECEITAS NÃO OPERACIONAIS (RNOP)

- **RECEITAS FINANCEIRAS**: Rendimentos e aplicações.
- **JUROS APLIC FINANCEIRA**: Juros de aplicações.
- **RENDIMENTOS, DIVIDENDOS, JCP**: Rendimentos diversos.
- **FOMENTO / FACTORING**: E operações de fomento.
- **VENDA ATIVOS**: Venda de imobilizado.
- **RECEBIMENTO DE INADIMPLENTES**: Recuperação de crédito.
- **DEVOLUÇÃO PGTOS**: Estornos e devoluções.

#### CUSTOS VARIÁVEIS (CV)

- **COMISSÕES**: Vendas e representantes.
- **DEVOLUÇÕES**: Devolução de vendas.
- **FRETES E CARRETOS**: Fretes de vendas.
- **FRETES SOBRE COMPRAS**: Fretes de insumos.
- **EVENTOS/PROMOÇÕES/BRINDES**: Marketing promocional.
- **PROPAGANDA/PATROCINIO**: Publicidade.
- **MATÉRIA PRIMA**: Insumos de produção.
- **MATERIAL DE EMBALAGEM**: Embalagens.
- **PRODUTO ACABADO**: Mercadoria para revenda.

#### CUSTOS FIXOS (CF)

- **PESSOAL**: Salários, 13º, Férias, FGTS, INSS, Vale Transporte/Alimentação/Refeição, Plano de Saúde.
- **DIRETORIA**: Pró-labore.
- **VEÍCULOS**: Combustível, IPVA, Seguro, Manutenção.
- **OCUPAÇÃO**: Aluguel, Condomínio, IPTU, Segurança.
- **UTILIDADES**: Energia, Água, Gás, Internet, Telefone.
- **SERVIÇOS**: Contabilidade, Advocacia, Consultoria, Limpeza, Marketing, TI.
- **MANUTENÇÃO**: Predial, Equipamentos, Industrial.
- **MATERIAIS**: Copa e Cozinha, Material de Escritório/Consumo.

---

## 3. Agentes de IA e Prompts

A lógica de IA está centralizada em `lib/agent/prompts.ts` e executada via `AICategorizationService`.

### Prompt Principal (`buildMainPrompt`)

Este é o prompt "System" enviado ao modelo. Ele define a persona do agente e as regras de negócio.

- **Persona**: Especialista em contabilidade brasileira com 20 anos de experiência.
- **Input**: Lista de categorias disponíveis e padrões de transações conhecidos.
- **Regras Críticas**:
  - Classificação Hierárquica (Macro/Micro).
  - **Identificação de Saldos**: Transações com termos como "SALDO", "SDO", "SALDO ANTERIOR" devem ser categorizadas como **"Saldo Inicial"** e ignoradas nos cálculos.
  - Mapeamentos Específicos (Ex: iFood -> Alimentação, Uber -> Transporte).
- **Saída Esperada**: JSON contendo `macro`, `micro`, `confidence`, e `reasoning`.

### Outros Prompts Relevantes:

- **Validation Prompt**: Valida uma categorização sugerida, retornando `isValid`, confiança e sugestões de correção.
- **Explanation Prompt**: Gera uma explicação detalhada em linguagem natural sobre o "porquê" de uma categorização.
- **Company Search Prompt**: Extrai dados da empresa (CNPJ, Ramo, B2B/B2C) a partir da descrição da transação.
- **Enriched Categorization**: Usa contexto adicional (descoberto via scraping ou base de conhecimento) para refinar a precisão.

### Exemplo de Regra Interna do Prompt:

> _"Qualquer transação que contenha "SALDO", "SALDO TOTAL", ... representa apenas uma "foto" do saldo atual e NÃO uma movimentação financeira real. Estas devem ser categorizadas como "Saldo Inicial"..."_

---

## 4. Motor de Regras

O serviço `CategoryRulesService` gerencia as regras manuais e automáticas.

### Tipos de Correspondência (`ruleType`):

1.  **Exata (`exact`)**: A descrição deve ser idêntica.
2.  **Contém (`contains`)**: O texto deve conter o padrão (Case Insensitive).
3.  **Wildcard**: Suporta `*` (vários caracteres) e `?` (um caractere).
4.  **Tokens**: Verifica se todas as palavras-chave estão presentes, independente da ordem.
5.  **Fuzzy**: Usa distância de Levenshtein para encontrar similaridade (aprox. 85%).
6.  **Regex**: Expressões regulares para padrões complexos.

### Sistema de Conflitos:

O sistema valida novas regras verificando:

- Duplicatas exatas.
- Regras muito similares que apontam para categorias diferentes (Conflito Cross-Category).
- Regras redundantes.

---

## 5. Auto-Learning

O sistema possui um mecanismo de aprendizado contínuo:

1.  Transações categorizadas com alta confiança pela IA são agrupadas em **Clusters**.
2.  Quando um cluster atinge um tamanho mínimo (ex: 2 transações similares), o sistema sugere a criação de uma nova regra.
3.  Regras com baixo desempenho ou "órfãs" (categoria deletada) são automaticamente desativadas por rotinas de manutenção.
