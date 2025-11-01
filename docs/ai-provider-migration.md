# Migração de Provedor de IA (OpenRouter ↔ OpenAI)

## Resumo

O sistema agora suporta alternar facilmente entre OpenRouter e OpenAI através de variáveis de ambiente, sem precisar modificar código.

## Como Usar

### 1. Configurar o Provedor no `.env`

```bash
# Para usar OpenRouter (padrão atual)
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sua-chave-aqui
OPENAI_API_KEY=

# Para usar OpenAI
AI_PROVIDER=openai
OPENROUTER_API_KEY=
OPENAI_API_KEY=sua-chave-aqui
```

### 2. Configurar Modelos

Os modelos são configurados uma única vez e funcionam com ambos os provedores:

```bash
# Modelos (formato OpenRouter com prefixo 'provedor/')
AI_MODEL_PRIMARY=google/gemini-2.0-flash-exp
AI_MODEL_FALLBACK=openai/gpt-4o-mini
```

**Mapeamento Automático:**
- **OpenRouter**: Mantém o formato `provedor/modelo` (ex: `openai/gpt-4o-mini`)
- **OpenAI**: Remove o prefixo automaticamente (ex: `openai/gpt-4o-mini` → `gpt-4o-mini`)

### 3. Trocar de Provedor

Para trocar de OpenRouter para OpenAI:

1. Adicione sua chave da OpenAI no `.env`:
   ```bash
   OPENAI_API_KEY=sk-proj-...
   ```

2. Altere o provedor:
   ```bash
   AI_PROVIDER=openai
   ```

3. Reinicie a aplicação:
   ```bash
   pnpm dev
   ```

**Pronto!** O sistema agora usa OpenAI sem quebrar nada.

### 4. Voltar para OpenRouter

Simplesmente mude de volta:

```bash
AI_PROVIDER=openrouter
```

E reinicie a aplicação.

## Arquivos Modificados

### Novos Arquivos

- `lib/ai/ai-provider.service.ts` - Service abstrato que gerencia provedores

### Arquivos Refatorados

- `app/api/ai/work-categorize/route.ts` - Usa o novo service
- `lib/agent/agent.ts` - Usa o novo service (removido litellm)
- `.env` - Adicionadas variáveis de controle

## Mapeamento de Modelos

### OpenRouter → OpenAI

| Modelo OpenRouter | Modelo OpenAI Equivalente |
|------------------|---------------------------|
| `google/gemini-2.0-flash-exp` | `gpt-4o-mini` |
| `google/gemini-2.5-flash` | `gpt-4o-mini` |
| `openai/gpt-4o-mini` | `gpt-4o-mini` |
| `openai/gpt-4o` | `gpt-4o` |
| `openai/gpt-4` | `gpt-4` |

O service faz esse mapeamento automaticamente quando você usa OpenAI.

## API do Service

### Uso Básico

```typescript
import { aiProviderService } from '@/lib/ai/ai-provider.service';

// Fazer uma chamada de completion
const response = await aiProviderService.complete({
  model: 'openai/gpt-4o-mini',
  messages: [
    { role: 'system', content: 'Você é um assistente' },
    { role: 'user', content: 'Olá!' }
  ],
  temperature: 0.1,
  max_tokens: 2000
});

console.log(response.content); // Resposta da IA
console.log(response.provider); // 'openrouter' ou 'openai'
console.log(response.model); // Modelo usado
```

### Fallback entre Modelos

```typescript
// Tenta múltiplos modelos até conseguir
const response = await aiProviderService.completeWithFallback(
  ['google/gemini-2.0-flash-exp', 'openai/gpt-4o-mini'],
  [
    { role: 'system', content: 'Você é um assistente' },
    { role: 'user', content: 'Olá!' }
  ],
  { temperature: 0.1, max_tokens: 2000 }
);
```

### Verificar Configuração

```typescript
// Validar se o provedor está configurado
const validation = aiProviderService.validateConfiguration();
if (!validation.valid) {
  console.error(validation.error);
}

// Obter informações do provedor
const info = aiProviderService.getProviderInfo();
console.log(info);
// {
//   provider: 'openrouter' | 'openai',
//   apiBase: 'https://...',
//   isConfigured: true/false,
//   envVariable: 'OPENROUTER_API_KEY' | 'OPENAI_API_KEY'
// }
```

## Benefícios

1. **Fácil Alternância**: Trocar de provedor é apenas mudar uma variável
2. **Sem Código Duplicado**: Um único service para ambos os provedores
3. **Mapeamento Automático**: Modelos são mapeados automaticamente
4. **Fallback Inteligente**: Tenta múltiplos modelos se um falhar
5. **Type-Safe**: TypeScript garante segurança de tipos
6. **Logs Claros**: Sabe sempre qual provedor/modelo está sendo usado

## Troubleshooting

### "Chave de API não configurada"

Certifique-se de que:
1. A variável `AI_PROVIDER` está definida corretamente
2. A chave correspondente está no `.env`:
   - `OPENROUTER_API_KEY` para OpenRouter
   - `OPENAI_API_KEY` para OpenAI

### Modelos não encontrados

Se usar OpenAI, certifique-se de usar modelos que a OpenAI suporta:
- ✅ `gpt-4o`, `gpt-4o-mini`, `gpt-4`, `gpt-3.5-turbo`
- ❌ `gemini-*`, `claude-*` (esses são apenas para OpenRouter)

## Recomendações

### Para Produção

Use OpenAI se precisar de:
- Menor latência
- Maior disponibilidade
- Suporte oficial OpenAI

### Para Desenvolvimento/Testes

Use OpenRouter se quiser:
- Testar diferentes modelos (Gemini, Claude, etc.)
- Custo potencialmente menor
- Flexibilidade de provedores

## Exemplo Completo

```typescript
// No seu código
import { aiProviderService } from '@/lib/ai/ai-provider.service';

async function categorizarTransacao(descricao: string) {
  try {
    // Valida configuração
    const validation = aiProviderService.validateConfiguration();
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Faz a chamada
    const response = await aiProviderService.completeWithFallback(
      [
        process.env.AI_MODEL_PRIMARY || 'google/gemini-2.0-flash-exp',
        process.env.AI_MODEL_FALLBACK || 'openai/gpt-4o-mini'
      ],
      [
        { role: 'system', content: 'Você categoriza transações financeiras' },
        { role: 'user', content: `Categorize: ${descricao}` }
      ],
      {
        temperature: 0.1,
        max_tokens: 500
      }
    );

    console.log(`Provedor: ${response.provider}`);
    console.log(`Modelo: ${response.model}`);
    console.log(`Resposta: ${response.content}`);

    return response.content;
  } catch (error) {
    console.error('Erro na categorização:', error);
    throw error;
  }
}
```

## Variáveis de Ambiente - Resumo

```bash
# Controle de Provedor
AI_PROVIDER=openrouter              # ou 'openai'

# Chaves de API (configure apenas a que usar)
OPENROUTER_API_KEY=sk-or-v1-...
OPENAI_API_KEY=sk-proj-...

# Configuração de Modelos
AI_MODEL_PRIMARY=google/gemini-2.0-flash-exp
AI_MODEL_FALLBACK=openai/gpt-4o-mini
AI_TEMPERATURE=0.1
AI_MAX_TOKENS=2000
```
