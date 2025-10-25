# Scripts de Limpeza de Dados

Este documento descreve os scripts disponíveis para limpeza de dados de teste no sistema financeiro.

## Scripts Disponíveis

### 1. `pnpm reset-data:dry`
**Simulação de limpeza completa**
- Apenas mostra o que será limpo, sem executar
- Limpa arquivos físicos OFX e JSON
- Mostra comandos SQL para limpeza manual do banco

```bash
pnpm reset-data:dry
```

### 2. `pnpm reset-data`
**Limpeza completa de arquivos físicos**
- Remove arquivos OFX e JSON da pasta `storage_tmp/ofx/`
- **Não limpa o banco de dados automaticamente**
- Mostra comandos SQL para limpeza manual

```bash
pnpm reset-data
```

### 3. `pnpm reset-db:dry`
**Simulação de limpeza do banco de dados**
- Conecta ao PostgreSQL via driver pg
- Conta uploads e transações que serão removidos
- **Não remove arquivos físicos, apenas banco de dados**

```bash
pnpm reset-db:dry
```

### 4. `pnpm reset-db`
**Limpeza completa do banco de dados**
- Remove transações e uploads do PostgreSQL
- **Não remove arquivos físicos, apenas banco de dados**
- Requer confirmação manual (ENTER)

```bash
pnpm reset-db
```

## Fluxo Recomendado para Limpeza Completa

Para limpar completamente todos os dados de teste:

```bash
# 1. Simular limpeza do banco
pnpm reset-db:dry

# 2. Executar limpeza do banco
pnpm reset-db

# 3. Limpar arquivos físicos
pnpm reset-data
```

## Opções Adicionais

### Apenas dados recentes (última hora)
```bash
pnpm reset-data:recent
node scripts/reset-data-db.js --recent
```

### Apenas uploads (preserva transações)
```bash
node scripts/reset-data-db.js --uploads-only
```

### Ajuda
```bash
node scripts/reset-data-db.js --help
node scripts/reset-data-simple.js --help
```

## Tabelas Afetadas

- `financeai_uploads` - registros de uploads
- `financeai_transactions` - transações financeiras
- `financeai_accounts` - contas (preservadas)
- `financeai_companies` - empresas (preservadas)
- `financeai_categories` - categorias (preservadas)

## Arquivos Físicos Removidos

- Arquivos `.ofx` em `storage_tmp/ofx/[company-id]/[ano-mes]/`
- Arquivos `.json` de metadados
- Estrutura de diretórios vazia

## Segurança

- Scripts pedem confirmação antes de executar
- Modo dry-run disponível para simulação
- Empresas, contas e categorias são preservadas
- Backup recomendado antes de limpeza completa