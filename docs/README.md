# FinanceAI - Documentação

Esta pasta contém toda a documentação do projeto FinanceAI, organizada por finalidade e importância.

## 📁 Estrutura da Documentação

### 🚀 `/core/` - Documentação Essencial do Projeto
Documentação fundamental para desenvolvimento e entendimento do sistema.

- **`resume.md`** - Resumo executivo do projeto e stack técnica
- **`prd_main.md`** - PRD técnico completo (requisitos funcionais e não-funcionais)
- **`der.md`** - Modelo de dados completo com diagrama ERD e entidades
- **`sequence.md`** - Contratos de API e diagramas de sequência
- **`wireframes_atualizados.md`** - Wireframes finais com dados reais extraídos

**📖 Uso**: Leia estes arquivos primeiro para entender o projeto. São a fonte da verdade para desenvolvimento.

---

### 📚 `/reference/` - Material de Referência
Documentação de apoio para consulta durante o desenvolvimento.

- **`telas_e_informacoes.md`** - Especificações detalhadas de todas as telas
- **`wireframes_e_componentes.md`** - Wireframes originais e componentes shadcn/ui
- **`final-categories.json`** - Estrutura final de categorias mapeadas
- **`categories-extracted.json`** - Dados brutos extraídos dos arquivos financeiros

**📖 Uso**: Consulte durante implementação para detalhes específicos de telas, componentes e categorias.

---

### 🔍 `/examples/` - Arquivos de Exemplo
Dados e exemplos usados para análise e desenvolvimento.

#### `/examples/raw/` - Dados Brutos
Arquivos originais fornecidos para análise:
- **`extratos/`** - 8 extratos bancários (BB, Itaú, Santander, CEF, Safra)
- **`planilhas/`** - Planilha XMIND completa com 16 abas

#### `/examples/processed/` - Dados Processados
Resultados da análise dos arquivos brutos:
- **`analysis-report.md`** - Relatório completo da análise de arquivos
- **`categories-report.md`** - Relatório de categorias extraídas
- **`analysis-results.json`** - Dados estruturados da análise

**📖 Uso**: Use para entender os dados reais que deram origem às categorias e regras do sistema.

---

### 🛠️ `/development/` - Scripts de Desenvolvimento
Scripts utilizados para processamento e análise de dados.

- **`analyze-excel-files.js`** - Script para analisar arquivos Excel
- **`extract-categories.js`** - Script para extrair categorias do XMIND
- **`create-final-categories.js`** - Script para gerar estrutura final

**📖 Uso**: Scripts de referência para manutenção e reprocessamento de dados.

---

## 🎯 Fluxo Recomendado de Leitura

### Para Novos Desenvolvedores:
1. **Comece com `/core/`** → Entenda o projeto (resume → prd → der → sequence)
2. **Consulte `/reference/`** → Detalhes de implementação (wireframes → categorias)
3. **Explore `/examples/`** → Entenda a base dos dados reais (se necessário)

### Para Implementação de Features:
1. **Referência principal**: `/core/wireframes_atualizados.md`
2. **Detalhes técnicos**: `/reference/final-categories.json`
3. **API specs**: `/core/sequence.md`
4. **Data model**: `/core/der.md`

### Para Análise de Dados:
1. **Dados originais**: `/examples/raw/`
2. **Resultados processados**: `/examples/processed/`
3. **Scripts de referência**: `/development/`

---

## 📋 Status da Documentação

| Categoria | Status | Última Atualização |
|-----------|---------|-------------------|
| Core Documentation | ✅ Completa | 23/10/2025 |
| Reference Materials | ✅ Completa | 23/10/2025 |
| Examples & Data | ✅ Completa | 23/10/2025 |
| Development Scripts | ✅ Completa | 23/10/2025 |

---

## 🔗 Links Rápidos

- **[Resumo Executivo](core/resume.md)** - Visão geral do projeto
- **[PRD Completo](core/prd_main.md)** - Todos os requisitos
- **[Wireframes Atualizados](core/wireframes_atualizados.md)** - Telas finais
- **[Categorias Finais](reference/final-categories.json)** - Estrutura de categorias
- **[Modelo de Dados](core/der.md)** - Database schema completo

---

## 📝 Notas Importantes

- **Arquivos em `/examples/raw/` contêm dados sensíveis** e não devem ser commitados
- **Documentação em `/core/` é a fonte da verdade** para o projeto
- **Sempre prefira `wireframes_atualizados.md`** sobre os wireframes originais
- **Categorias finais estão em `final-categories.json`** com mapeamento completo

---

**FinanceAI v1.0** - Documentação organizada para desenvolvimento eficiente 🚀