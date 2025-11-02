# Correção: Identificação de Bancos no Dashboard - v2

## Problema Reportado

Mesmo após as correções iniciais do parser OFX (que agora extrai corretamente o banco dos arquivos), o dashboard continuava mostrando "Banco Não Identificado" ou nomes genéricos como "Conta Principal".

### Log do Parser (funcionando corretamente):
```
🏦 Banco identificado: { name: 'Itaú Unibanco S.a.', fid: '341' }
🏦 Banco identificado: { name: 'Banco Safra S.a.', fid: '422' }
```

### Dashboard (mostrando incorretamente):
- ❌ "Banco Não Identificado"
- ❌ "Conta Principal"

## Causa Raiz

### 1. Dashboard exibindo campo errado
**Arquivo**: `lib/services/dashboard.service.ts:306`

O dashboard estava consultando e exibindo `accounts.name` ao invés de `accounts.bankName`:

```typescript
// ANTES (ERRADO)
accountName: accounts.name,  // "Conta Principal"

// DEPOIS (CORRETO)
accountName: accounts.bankName,  // "Itaú Unibanco"
```

### 2. Contas existentes não eram atualizadas

**Problema**: Quando uma conta padrão já existia, o sistema simplesmente reutilizava essa conta SEM atualizar as informações do banco extraídas do OFX.

**Arquivos afetados**:
- `app/api/ofx/upload-async/route.ts`
- `app/api/ofx/upload-and-analyze/route.ts`
- `app/api/ofx/upload-queue/route.ts`

**Lógica antiga**:
```typescript
let defaultAccount = await getDefaultAccount();  // Conta "Conta Principal" existe

if (!defaultAccount && parseResult.bankInfo) {
  // ❌ Só cria conta SE não existir
  // Informações do OFX são PERDIDAS
}
```

**Resultado**: Transações do Itaú, Safra, BB, CEF, Santander... TODAS associadas à mesma "Conta Principal".

### 3. Sem matching de contas por banco

O sistema não tinha lógica para:
- Buscar conta existente que corresponda ao banco/conta do OFX
- Criar contas separadas por banco
- Atualizar contas existentes com dados do OFX

## Correções Implementadas

### FIX 1: Dashboard exibe `bankName` correto ✅

**Arquivo**: `lib/services/dashboard.service.ts`

**Mudança**:
```typescript
// Linha 306
const topExpenses = await db
  .select({
    // ...
    accountName: accounts.bankName,  // ← MUDADO de accounts.name
  })
  .from(transactions)
  .leftJoin(accounts, eq(transactions.accountId, accounts.id))

// Linha 321 - Fallback atualizado
return topExpenses.map(expense => ({
  // ...
  accountName: expense.accountName || 'Banco Não Identificado',  // ← Fallback mais claro
}));
```

### FIX 2: Funções de busca e atualização de contas ✅

**Arquivo**: `lib/db/init-db.ts`

**Novas funções criadas**:

#### `findAccountByBankInfo()`
Busca conta existente que corresponda ao `bankCode` e `accountNumber` do OFX:

```typescript
export async function findAccountByBankInfo(
  companyId: string,
  bankCode: string,
  accountNumber: string
) {
  const [account] = await db.select()
    .from(accounts)
    .where(and(
      eq(accounts.companyId, companyId),
      eq(accounts.bankCode, bankCode),
      eq(accounts.accountNumber, accountNumber),
      eq(accounts.active, true)
    ))
    .limit(1);

  return account;
}
```

#### `updateAccountBankInfo()`
Atualiza informações bancárias de uma conta existente:

```typescript
export async function updateAccountBankInfo(
  accountId: string,
  bankInfo: {
    bankName?: string;
    bankCode?: string;
    accountNumber?: string;
    agencyNumber?: string;
    accountType?: string;
  }
) {
  const [updatedAccount] = await db.update(accounts)
    .set({
      bankName: bankInfo.bankName,
      bankCode: bankInfo.bankCode,
      // ...
    })
    .where(eq(accounts.id, accountId))
    .returning();

  console.log(`✅ Conta atualizada: ${updatedAccount.name} → ${updatedAccount.bankName}`);
  return updatedAccount;
}
```

### FIX 3: Estratégia inteligente de resolução de contas ✅

**Arquivos atualizados**:
- `app/api/ofx/upload-async/route.ts` (linhas 113-176)
- `app/api/ofx/upload-and-analyze/route.ts` (linhas 169-244)
- `app/api/ofx/upload-queue/route.ts` (linhas 102-160)

**Nova lógica implementada**:

```typescript
// Estratégia de resolução de conta
let targetAccount = null;

if (parseResult.bankInfo && parseResult.bankInfo.bankId && parseResult.bankInfo.accountId) {
  console.log('🔍 Buscando conta existente para:', {
    bankCode: parseResult.bankInfo.bankId,
    accountNumber: parseResult.bankInfo.accountId
  });

  // 1. Buscar conta que corresponda ao banco e número de conta do OFX
  targetAccount = await findAccountByBankInfo(
    defaultCompany.id,
    parseResult.bankInfo.bankId,
    parseResult.bankInfo.accountId
  );

  if (targetAccount && parseResult.bankInfo.bankName) {
    // 2. Conta encontrada → ATUALIZAR com informações do OFX
    console.log('🔄 Atualizando informações bancárias da conta existente...');
    targetAccount = await updateAccountBankInfo(targetAccount.id, {
      bankName: parseResult.bankInfo.bankName,
      bankCode: parseResult.bankInfo.bankId,
      accountNumber: parseResult.bankInfo.accountId,
      agencyNumber: parseResult.bankInfo.branchId,
      accountType: parseResult.bankInfo.accountType
    });
  } else if (!targetAccount) {
    // 3. Conta não encontrada → CRIAR nova conta específica para o banco
    console.log('🏦 Criando nova conta baseada no OFX...');
    const [newAccount] = await db.insert(accounts).values({
      companyId: defaultCompany.id,
      name: `Conta ${parseResult.bankInfo.bankName} - ${parseResult.bankInfo.accountId}`,
      bankName: parseResult.bankInfo.bankName || 'Banco Não Identificado',
      bankCode: parseResult.bankInfo.bankId || '000',
      accountNumber: parseResult.bankInfo.accountId || '00000-0',
      // ...
    }).returning();

    targetAccount = newAccount;
  }
} else {
  // 4. OFX sem bankInfo completo → usar conta padrão
  console.log('ℹ️ OFX sem bankInfo completo, usando conta padrão...');
  targetAccount = await getDefaultAccount();
}

console.log(`✅ Conta selecionada: ${targetAccount.name} (${targetAccount.bankName})`);
```

### FIX 4: Atualização no `upload-and-analyze` ✅

**Arquivo**: `app/api/ofx/upload-and-analyze/route.ts`

Este arquivo já tinha uma lógica complexa de matching, mas não atualizava contas encontradas.

**Adicionado**:
- Atualização de conta quando encontrada por match exato (linha 174-183)
- Atualização quando encontrada por banco correspondente (linha 199-210)
- Atualização quando encontrada conta similar (linha 236-244)

```typescript
// Exemplo: Estratégia 1 - Match exato
if (exactMatch) {
  defaultAccount = exactMatch;

  // NOVO: Atualizar informações da conta
  if (parseResult.bankInfo?.bankName) {
    console.log('🔄 Atualizando informações bancárias da conta encontrada...');
    defaultAccount = await updateAccountBankInfo(exactMatch.id, {
      bankName: parseResult.bankInfo.bankName,
      bankCode: parseResult.bankInfo.bankId,
      agencyNumber: parseResult.bankInfo.branchId,
      accountType: parseResult.bankInfo.accountType
    }) || defaultAccount;
  }
}
```

## Fluxo Completo: Do OFX ao Dashboard

### Antes das Correções ❌
```
OFX <ORG> tag → Parser → parseResult.bankInfo.bankName = "Itaú Unibanco"
    ↓
getDefaultAccount() → Retorna "Conta Principal" existente
    ↓
❌ PERDE informações do banco (não atualiza)
    ↓
transactions.accountId → "Conta Principal" ID
    ↓
Dashboard query → accounts.name (campo errado)
    ↓
Exibe: "Conta Principal" ou "Banco Não Identificado"
```

### Depois das Correções ✅
```
OFX <ORG> tag → Parser → parseResult.bankInfo.bankName = "Itaú Unibanco"
    ↓
findAccountByBankInfo() → Busca por bankCode + accountNumber
    ↓
SE encontrar → updateAccountBankInfo() atualiza bankName
SE não encontrar → Cria nova conta com bankName correto
    ↓
transactions.accountId → Conta com bankName correto
    ↓
Dashboard query → accounts.bankName (campo correto)
    ↓
Exibe: "Itaú Unibanco", "Banco Safra", etc.
```

## Como Testar

### 1. Upload de Múltiplos Bancos

Fazer upload dos arquivos OFX:
- Itau-Ago2023.ofx
- Safra-Ago2023.ofx
- BB-Ago2023.ofx
- CEF-Ago2023.ofx
- Santander-Ago2023.ofx

### 2. Verificar Logs do Console

Durante o upload, você deve ver:

```
🏦 Banco identificado: { name: 'Itaú Unibanco', fid: '341' }
🔍 Buscando conta existente para: { bankCode: '341', accountNumber: '12345-6' }
ℹ️ Nenhuma conta encontrada para bankCode: 341, accountNumber: 12345-6
🏦 Criando nova conta baseada no OFX...
✅ Conta selecionada: Conta Itaú Unibanco - 12345-6 (Itaú Unibanco)
```

Ou, se a conta já existe:

```
🏦 Banco identificado: { name: 'Banco Safra', fid: '422' }
🔍 Buscando conta existente para: { bankCode: '422', accountNumber: '98765-4' }
✅ Conta encontrada: Conta Banco Safra - 98765-4 (Banco Safra)
🔄 Atualizando informações bancárias da conta existente...
✅ Conta atualizada: Conta Banco Safra - 98765-4 → Banco Safra
```

### 3. Verificar Dashboard

Acessar `/dashboard` e conferir:
- **Top Despesas**: Deve mostrar nomes reais dos bancos
- **Transações**: Cada transação deve mostrar o banco correto

**Resultado esperado**:
```
Categoria: Fornecedores
Banco: Itaú Unibanco     ← ✅ Nome correto do banco
Valor: -R$ 5.432,10

Categoria: Vendas e Receitas
Banco: Banco Safra       ← ✅ Nome correto do banco
Valor: +R$ 15.789,50
```

### 4. Verificar Banco de Dados (Opcional)

```sql
-- Ver contas criadas
SELECT id, name, bankName, bankCode, accountNumber
FROM financeai_accounts
WHERE active = true;

-- Ver transações com bancos
SELECT
  t.description,
  a.bankName as banco,
  c.name as categoria,
  t.amount
FROM financeai_transactions t
LEFT JOIN financeai_accounts a ON t.accountId = a.id
LEFT JOIN financeai_categories c ON t.categoryId = c.id
LIMIT 10;
```

**Resultados esperados**:

#### Tabela `financeai_accounts`:
| name | bankName | bankCode | accountNumber |
|------|----------|----------|---------------|
| Conta Itaú Unibanco - 12345-6 | Itaú Unibanco | 341 | 12345-6 |
| Conta Banco Safra - 98765-4 | Banco Safra | 422 | 98765-4 |
| Conta Banco do Brasil - 11111-1 | Banco do Brasil | 001 | 11111-1 |

#### Transações:
| description | banco | categoria | amount |
|-------------|-------|-----------|--------|
| Pagamento fornecedor X | Itaú Unibanco | Fornecedores | -5432.10 |
| Venda produto Y | Banco Safra | Vendas | +15789.50 |

## Impacto Esperado

### Identificação de Bancos
- **Antes**: 100% "Banco Não Identificado" ou "Conta Principal"
- **Depois**: 100% identificados corretamente ("Itaú Unibanco", "Banco Safra", etc.)

### Organização de Contas
- **Antes**: Todas transações na mesma conta genérica
- **Depois**: Cada banco tem sua própria conta, ou conta existente é atualizada

### Exemplo Prático

#### Upload de 5 arquivos OFX de bancos diferentes:

**Antes**:
```
financeai_accounts:
- Conta Principal (Banco Exemplo) → 1.500 transações de 5 bancos misturadas
```

**Depois**:
```
financeai_accounts:
- Conta Itaú Unibanco - 12345-6 (Itaú Unibanco) → 491 transações
- Conta Banco Safra - 98765-4 (Banco Safra) → 235 transações
- Conta Banco do Brasil - 11111-1 (Banco do Brasil) → 259 transações
- Conta Caixa Econômica Federal - 22222-2 (CEF) → 4 transações
- Conta Santander - 33333-3 (Santander) → 70 transações
```

## Arquivos Modificados

### Código de Produção
1. ✅ `lib/services/dashboard.service.ts` - Campo exibido corrigido
2. ✅ `lib/db/init-db.ts` - Novas funções de busca e atualização
3. ✅ `app/api/ofx/upload-async/route.ts` - Estratégia de resolução inteligente
4. ✅ `app/api/ofx/upload-and-analyze/route.ts` - Atualização em todos matches
5. ✅ `app/api/ofx/upload-queue/route.ts` - Mesma estratégia que upload-async

### Documentação
6. 📄 `docs/fix-banco-identificacao-v2.md` - Esta documentação

## Próximos Passos

### Pendente: Performance de Processamento

O problema de uploads travados em 0 transações (reportado pelo usuário) é causado por:
- **Causa**: AI categorization sequencial (2-5 segundos × 491 transações = 16-40 minutos)
- **Status**: Ainda não resolvido

**Soluções propostas**:
1. Processar categorizações em paralelo (batch de 10-20 por vez)
2. Cache de descrições similares
3. Skip de AI para importação inicial (categorizar depois)
4. Timeout de 5s por transação

### Opcional: Melhorias Futuras

1. **Interface de edição de conta**: Permitir usuário editar banco/conta manualmente
2. **Relatório de confiança**: Mostrar quais matches foram automáticos vs manuais
3. **Histórico de atualizações**: Log de quando conta foi atualizada com dados do OFX
4. **Validação de FID**: Adicionar mais bancos ao `BANK_FID_MAP`

## Status

✅ **TODAS as correções de identificação de bancos implementadas e prontas**

❌ **Problema de performance ainda pendente** (upload travado em 0 transações)

---

**Criado em**: 2025-11-02
**Autor**: Claude Code
