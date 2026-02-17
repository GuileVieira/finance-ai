# Guia de Identidade Visual - AuditGo (v3.4)

## 1. O Conceito Adaptativo

A **AuditGo** utiliza uma identidade "viva" que se adapta ao tema do sistema do usuário. Isso garante que a sofisticação da marca nunca comprometa a legibilidade.

---

## 2. Paleta de Cores Adaptativa

O desafio do **Tech Mint** é o contraste em fundos claros. Por isso, definimos uma variação de alto contraste para o Tema Claro.

### Tema Escuro (Premium Strategy)

| Cor           | Hex       | Uso           |
| :------------ | :-------- | :------------ |
| **Obsidian**  | `#0E0E10` | Background    |
| **Tech Mint** | `#2DD4BF` | Destaque / Go |
| **Gold**      | `#FBBF24` | Insight       |

### Tema Claro (Contrast Strategy)

| Cor            | Hex       | Uso           |
| :------------- | :-------- | :------------ |
| **Pure White** | `#FFFFFF` | Background    |
| **Deep Teal**  | `#0D9488` | Destaque / Go |
| **Amber Gold** | `#D97706` | Insight       |

---

## 3. Tipografia

Mantemos o mix editorial/moderno:

- **AUDIT**: Outfit (Black 800)
- **Go**: Instrument Serif (Italic)

---

## 4. Implementação Técnica

O componente `Logo.tsx` utiliza `next-themes` para detectar o tema e aplicar a variável de cor correta:

```typescript
const brandColor = isDark ? "#2DD4BF" : "#0D9488";
```

---

## 5. Favicon e Ícones

O ícone do sistema (`app/icon.svg`) utiliza um tom de verde intermediário para garantir visibilidade aceitável em abas escuras e claras de navegadores.
