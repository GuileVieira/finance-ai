# FinanceAI - Material de Referência

Esta pasta contém documentação de apoio e referência para consulta durante o desenvolvimento.

## 📚 Arquivos de Referência

### 🎨 [telas_e_informacoes.md](./telas_e_informacoes.md)
- **O que é**: Especificações detalhadas originais de todas as telas
- **Conteúdo**: Interface specs, dados necessários, comportamentos
- **Quando usar**: Para consultar detalhes técnicos das telas
- **Nota**: Versão original antes da atualização com dados reais

### 🖼️ [wireframes_e_componentes.md](./wireframes_e_componentes.md)
- **O que é**: Wireframes originais e lista de componentes shadcn/ui
- **Conteúdo**: ASCII wireframes, componentes necessários, comandos de instalação
- **Quando usar**: Para referência de componentes e estrutura original
- **Nota**: Use `../core/wireframes_atualizados.md` para versão final

### 🏷️ [final-categories.json](./final-categories.json)
- **O que é**: Estrutura final de categorias mapeadas
- **Conteúdo**: 4 categorias principais, 16 subcategorias, 47 rúbricas mapeadas
- **Quando usar**: **REFERÊNCIA PRINCIPAL** para implementação de categorias
- **Importância**: Essencial para sistema de categorização automática

### 📊 [categories-extracted.json](./categories-extracted.json)
- **O que é**: Dados brutos extraídos dos arquivos financeiros
- **Conteúdo**: 53 rúbricas do XMIND + hierarquia completa
- **Quando usar**: Para consulta de dados originais e mapeamentos
- **Nota**: Dado bruto, use `final-categories.json` para implementação

---

## 🎯 Como Usar Esta Documentação

### 🔧 Durante o Desenvolvimento:

#### Para UI/UX:
```bash
# Wireframes atualizados (principal)
docs/core/wireframes_atualizados.md

# Especificações detalhadas
docs/reference/telas_e_informacoes.md

# Componentes necessários
docs/reference/wireframes_e_componentes.md
```

#### Para Categorização:
```bash
# Estrutura final de categorias (principal)
docs/reference/final-categories.json

# Dados brutos para consulta
docs/reference/categories-extracted.json
```

#### Para Componentes shadcn/ui:
```bash
# Lista completa de componentes
docs/reference/wireframes_e_componentes.md

# Comandos de instalação
docs/reference/wireframes_e_componentes.md#componentes-shadcn-ui-necessários
```

---

## 📋 Relação com Documentação Core

| Arquivo Reference | Equivalente Core | Quando Usar |
|-------------------|------------------|-------------|
| wireframes_e_componentes.md | wireframes_atualizados.md | Use **core** como principal, reference como backup |
| telas_e_informacoes.md | wireframes_atualizados.md | **Reference** para detalhes técnicos, **core** para visual |
| final-categories.json | wireframes_atualizados.md | **Reference** para estrutura JSON, **core** para visual |

---

## ⚠️ Notas Importantes

- **Priorize sempre a documentação em `/core/`** - é a fonte da verdade
- **Este material é de apoio** - use para consulta detalhada
- **`final-categories.json` é exceção** - é referência principal para categorias
- **Mantenha consistência** - se atualizar aqui, verifique impacto no core

---

## 🔗 Links Rápidos

- **[Wireframes Atualizados](../core/wireframes_atualizados.md)** - Versão principal
- **[Estrutura de Categorias](./final-categories.json)** - Dados de categorias
- **[Componentes shadcn/ui](./wireframes_e_componentes.md)** - Lista de componentes
- **[Especificações de Telas](./telas_e_informacoes.md)** - Detalhes técnicos

---

**Material de apoio para desenvolvimento eficiente** 📚