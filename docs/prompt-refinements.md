# Prompt Refinement Suggestions

To further reduce costs and improve response speed, the following refinements can be applied to the categorization prompts in `ai-categorization-adapter.service.ts`.

## 1. Brevity vs. Reasoning

Currently, the AI is asked for reasoning, which increases token usage. For high-confidence matches, we can instruct the AI to provide reasoning ONLY when the categorization is non-obvious.

**Suggested System Prompt Addition:**

```text
5. Se a transação for óbvia (ex: "PAGAMENTO SALARIOS"), retorne apenas o nome.
6. Se houver ambiguidade ou necessidade de interpretação profunda, adicione uma justificativa curta de no máximo 10 palavras após o nome, separada por "|".
```

## 2. Handling Snapshots

Adding an explicit instruction to catch any "Saldo" entries that bypass the deterministic filters:

**Suggested System Prompt Addition:**

```text
7. Se identificar que a transação é um snapshot de saldo técnico (resumo bancário), use preferencialmente a categoria "Saldo Inicial".
```

## 3. Localization Hints

Provide a dictionary of common Brazilian banking terms to avoid the AI hallucinating or asking for more context.

**Suggested Context:**

```text
DICIONÁRIO DE TERMOS:
- DARF/GPS: Impostos/Tributos.
- TED/DOC/PIX: Transferências (verificar se comercial ou interna).
- FIDC/REC TIT: Antecipação de Recebíveis / Desconto de Duplicatas.
- TAR/TARIFA: Custos Financeiros/Bancários.
```

## 4. Token Optimization

- Use `temperature: 0` for maximum consistency.
- Use `max_tokens: 50` (instead of 100) since we only need the category name and a tiny reasoning.
