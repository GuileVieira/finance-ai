# TODO - Sistema Financeiro MVP

## 🚀 Sistema Inteligente de Sincronização de Contas via OFX

### **Objetivo**
Implementar um sistema inteligente que processa arquivos OFX e automaticamente cria/sincroniza contas bancárias e transações no sistema.

### **Plano de Implementação**

#### **✅ Concluído**
- [x] Parser OFX funcional (`/lib/services/ofx-parser.service.ts`)
- [x] Página de upload com drag & drop (`/app/upload/page.tsx`)
- [x] Extração de dados bancários do OFX
- [x] Interface de visualização de transações

#### **🔄 Em Andamento**
- [ ] Sistema inteligente de sincronização de contas via OFX

#### **📋 TODO - Próximos Passos**

##### **1. Banco de Dados e Schema**
- [ ] Criar/Atualizar entidades no schema PostgreSQL:
  ```sql
  -- Bancos
  banks (id, code, name, is_active)

  -- Contas Bancárias
  accounts (id, bank_id, branch_id, account_number, account_type,
           user_id, company_id, balance, created_at, updated_at)

  -- Transações
  transactions (id, account_id, date, description, amount, type,
               ofx_fitid, category_id, created_at, updated_at)

  -- Histórico de Importações
  import_history (id, user_id, filename, import_date,
                 transactions_count, status)
  ```

##### **2. Mapeamento de Bancos Brasileiros**
- [ ] Criar tabela de mapeamento `bank_id → nome`:
  ```typescript
  const BANK_MAPPING = {
    '077': 'Banco Inter',
    '001': 'Banco do Brasil',
    '033': 'Santander',
    '237': 'Bradesco',
    '104': 'Caixa Econômica Federal',
    '341': 'Itaú',
    // ... outros bancos
  };
  ```

##### **3. Lógica de Sincronização Inteligente**
- [ ] **Verificação de Conta Existente**:
  ```typescript
  async function findExistingAccount(ofxData: ParsedOFX) {
    return await db.query.accounts.findFirst({
      where: and(
        eq(accounts.bankId, ofxData.accountInfo.bankId),
        eq(accounts.accountNumber, ofxData.accountInfo.accountId),
        eq(accounts.branchId, ofxData.accountInfo.branchId)
      )
    });
  }
  ```

- [ ] **Criação Automática de Banco**:
  ```typescript
  async function ensureBankExists(bankId: string) {
    let bank = await getBankByCode(bankId);
    if (!bank) {
      bank = await createBank({
        code: bankId,
        name: BANK_MAPPING[bankId] || `Banco ${bankId}`
      });
    }
    return bank;
  }
  ```

- [ ] **Criação/Sincronização de Conta**:
  ```typescript
  async function syncAccount(ofxData: ParsedOFX, userId: string) {
    const existingAccount = await findExistingAccount(ofxData);

    if (existingAccount) {
      // Adicionar transações novas à conta existente
      await addNewTransactions(existingAccount.id, ofxData.transactions);
      return { account: existingAccount, action: 'synced' };
    } else {
      // Criar nova conta
      const bank = await ensureBankExists(ofxData.accountInfo.bankId);
      const newAccount = await createAccount({
        bankId: bank.id,
        branchId: ofxData.accountInfo.branchId,
        accountNumber: ofxData.accountInfo.accountId,
        accountType: ofxData.accountInfo.accountType,
        userId,
        balance: ofxData.balance.amount
      });
      await importTransactions(newAccount.id, ofxData.transactions);
      return { account: newAccount, action: 'created' };
    }
  }
  ```

##### **4. Validação e Evitar Duplicatas**
- [ ] Implementar verificação por `FITID` (ID único da transação OFX):
  ```typescript
  async function avoidDuplicateTransactions(accountId: string, transactions: ParsedTransaction[]) {
    const existingFitids = await getExistingFitids(accountId);
    return transactions.filter(tx => !existingFitids.includes(tx.id));
  }
  ```

##### **5. Interface de Confirmação**
- [ ] Criar modal de confirmação antes de importar:
  - Mostrar dados da conta detectada
  - Número de transações novas
  - Período do extrato
  - Opções: "Importar Tudo" ou "Revisar Antes"

##### **6. Histórico e Logs**
- [ ] Registrar todas as importações:
  - Data/hora
  - Arquivo processado
  - Conta criada/sincronizada
  - Número de transações importadas
  - Status (sucesso/erro)

##### **7. Melhorias na Interface**
- [ ] Adicionar indicador visual na página de upload:
  - 🟢 Conta existente detectada
  - 🆕 Nova conta será criada
  - 📊 N transações prontas para importar

- [ ] Página de histórico de importações:
  - Listar todas as sincronizações
  - Permitir reverter importações
  - Estatísticas de uso

### **📈 Benefícios Esperados**
1. **Automação**: Usuário faz upload e o sistema cuida de tudo
2. **Inteligência**: Detecta automaticamente contas existentes
3. **Segurança**: Evita duplicatas e perda de dados
4. **Conveniência**: Não需要 cadastro manual de contas
5. **Auditabilidade**: Histórico completo de todas as importações

### **🎯 Critérios de Sucesso**
- [ ] Upload de OFX cria/sincroniza contas automaticamente
- [ ] Zero duplicatas de transações
- [ ] Interface intuitiva com feedback claro
- [ ] Suporte para principais bancos brasileiros
- [ ] Histórico completo e reversível de importações

---

**Última Atualização**: 24/10/2025
**Status**: Em desenvolvimento - Upload OFX funcional, iniciando implementação da sincronização inteligente