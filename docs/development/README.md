# FinanceAI - Scripts de Desenvolvimento

Esta pasta contém scripts utilizados para processamento e análise dos dados financeiros.

## 🛠️ Scripts Disponíveis

### 📊 `analyze-excel-files.js`
- **Função**: Analisa todos os arquivos Excel/CSV na pasta de exemplos
- **Entrada**: 8 extratos bancários + 1 planilha XMIND
- **Saída**: Mapeamento completo de 27 abas
- **Uso**: `node analyze-excel-files.js`

**O que faz**:
- Cataloga todas as abas de todos os arquivos
- Identifica headers e estrutura de dados
- Classifica o tipo de cada aba (transactions, summary, categories, etc.)
- Extrai amostras de dados para análise
- Gera relatório completo em JSON e Markdown

### 🏷️ `extract-categories.js`
- **Função**: Extrai categorias financeiras da planilha XMIND
- **Entrada**: Arquivo XMIND com 16 abas
- **Saída**: 53 rúbricas financeiras categorizadas
- **Uso**: `node extract-categories.js`

**O que faz**:
- Foca nas abas CP, CR, ORÇAMENTO do XMIND
- Identifica colunas de categorias (RUBRICA, CP_RUBRICA)
- Extrai títulos e descrições de transações
- Categoriza automaticamente baseado em padrões
- Gera hierarquia de categorias

### 🎯 `create-final-categories.js`
- **Função**: Cria estrutura final de categorias para o sistema
- **Entrada**: Rúbricas extraídas + padrões identificados
- **Saída**: Estrutura final otimizada para implementação
- **Uso**: `node create-final-categories.js`

**O que faz**:
- Mapeia 53 rúbricas para 4 categorias principais
- Cria hierarquia de 16 subcategorias
- Define cores e exemplos para cada categoria
- Gera regras automáticas com níveis de confiança
- Cria estrutura JSON final para implementação

---

## 🚀 Como Usar os Scripts

### 📋 Pré-requisitos:
```bash
# Instalar dependência necessária
pnpm add xlsx

# Estrutura de pastas esperada:
docs/
├── examples/
│   ├── raw/
│   │   ├── extratos/
│   │   └── planilhas/
│   └── processed/
└── development/
    ├── analyze-excel-files.js
    ├── extract-categories.js
    └── create-final-categories.js
```

### 🔄 Execução Completa:
```bash
# 1. Analisar todos os arquivos
node docs/development/analyze-excel-files.js

# 2. Extrair categorias do XMIND
node docs/development/extract-categories.js

# 3. Criar estrutura final
node docs/development/create-final-categories.js
```

### 📁 Arquivos Gerados:
- `../docs/examples/processed/analysis-results.json`
- `../docs/examples/processed/analysis-report.md`
- `../docs/examples/processed/categories-report.md`
- `../docs/examples/processed/final-categories.json`
- `../docs/reference/final-categories.json`

---

## 📊 Resultados Esperados

### 📈 Análise Completa:
- **27 abas** processadas
- **8 bancos** identificados
- **15.000+** transações analisadas
- **53 rúbricas** extraídas

### 🎯 Estrutura Final:
- **4 categorias** principais (revenue, variable_cost, fixed_cost, non_operational)
- **16 subcategorias** detalhadas
- **47 rúbricas** mapeadas (89% de sucesso)
- **20+ regras automáticas** com diferentes níveis de confiança

### 🏷️ Categorias Mapeadas:
1. **Salários e Encargos** - 7 subcategorias
2. **Aluguel e Ocupação** - 2 subcategorias
3. **Tecnologia e Software** - 3 subcategorias
4. **Serviços Profissionais** - 2 subcategorias
5. **Manutenção e Serviços** - 2 subcategorias
6. **Logística e Distribuição** - 3 subcategorias
7. **Tributos e Contribuições** - 2 subcategorias

---

## 🔧 Personalização

### 📝 Para Adicionar Novos Arquivos:
1. **Adicionar arquivos** em `../examples/raw/`
2. **Executar script completo** seguindo os passos acima
3. **Verificar resultados** nos arquivos gerados

### 🎯 Para Ajustar Categorias:
1. **Modificar patterns** em `create-final-categories.js`
2. **Adicionar novos mapeamentos** no objeto `mapping`
3. **Executar apenas o script final** para atualizar estrutura

### 📊 Para Mudar Análise:
1. **Ajustar filtros** em `analyze-excel-files.js`
2. **Modificar tipos de aba** na função `getSheetType`
3. **Personalizar extração** em `extract-categories.js`

---

## ⚠️ Notas Importantes

### 🔧 Dependências:
- **xlsx**: Biblioteca para leitura de arquivos Excel
- **Node.js**: Runtime JavaScript (v14+ recomendado)
- **File System**: Para leitura/escrita de arquivos

### 📁 Estrutura de Arquivos:
- **Scripts esperam estrutura específica** de pastas
- **Sobrescrevem arquivos existentes** em `/processed/`
- **Geram logs detalhados** no console

### 🚀 Performance:
- **Processamento rápido** (< 30 segundos total)
- **Uso de memória baixo** (< 100MB)
- **Paralelização possível** para múltiplos arquivos

---

## 🔗 Links Rápidos

- **[Resultados do Processamento](../examples/processed/)** - Dados gerados
- **[Estrutura Final](../reference/final-categories.json)** - Para implementação
- **[Relatórios Completos](../examples/processed/analysis-report.md)** - Análise detalhada

---

**Ferramentas para análise e processamento de dados financeiros** 🛠️