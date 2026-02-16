---
description: Especialista em design Apple-like (UX/UI Premium)
---

Este workflow orienta a criação de interfaces com estética "Apple-like", focada em minimalismo, clareza, profundidade e refinamento técnico extremo.

### 1. Princípios Fundamentais

- **Clareza**: O conteúdo deve ser o foco. Remova elementos desnecessários.
- **Deferência**: O design deve ajudar a entender o conteúdo, não competir com ele.
- **Profundidade**: Use camadas, sombras suaves e transparências (glassmorphism) para criar hierarquia visual.

### 2. Fundamentos Visuais (UI)

#### Tipografia e Hierarquia

- **Fonte**: Use `Inter` ou fontes robustas de sistema se `SF Pro` não estiver disponível.
- **Escala**: Use uma hierarquia clara:
  - **Título 1**: 24px-32px, Bold/Semi-bold, Tracking apertado (-0.022em).
  - **Título 2**: 20px-24px, Semi-bold.
  - **Body**: 14px-16px, Regular.
  - **Caption**: 12px, Medium, Muted color.
- **Espaçamento**: Aumente o line-height para 1.5-1.6 em textos longos.

#### Cores e Contrastes

- **Paleta**: Use tons de cinza extremamente sutis (`#F5F5F7` para backgrounds claros, `#000000` ou `#1D1D1F` para escuros).
- **Acentos**: Use cores vibrantes mas refinadas (Azure Blue, Indigo, Soft Green).
- **Contraste**: Garanta que o texto crítico tenha contraste WCAG AA+.

#### Formas e Bordas

- **Raio de Borda**: Use `rounded-xl` (12px) ou `rounded-2xl` (16px) para cards. Evite cantos vivos.
- **Squircle**: Se possível, simule a curvatura contínua da Apple.

#### Sombras e Profundidade

- **Camadas**: Use sombras suaves e difusas.
  - _Exemplo_: `shadow-[0_8px_30px_rgb(0,0,0,0.04)]`
- **Glassmorphism**:
  - `backdrop-filter: blur(12px);`
  - `background: rgba(255, 255, 255, 0.7);`
  - `border: 1px solid rgba(255, 255, 255, 0.1);`

### 3. Experiência do Usuário (UX)

#### Feedback e Micro-animações

- **Transições**: Use `duration-200` ou `duration-300` com `ease-out`.
- **Hovers**: Efeitos de escala sutil (`scale-[1.02]`) ou brilho.
- **Toasts**: Notificações discretas com ícones claros.

#### Ícones e Elementos Interativos

- **Estilo**: Use ícones de linha fina (`Lucide` com `strokeWidth={1.5}` ou `2`).
- **Estados**: Defina claramente estados `Disabled`, `Loading` e `Active`.

### 4. Checklist de Auditoria Apple-like

1. [ ] Os cards têm sombras suaves ou apenas bordas sutis?
2. [ ] A tipografia é a estrela da página?
3. [ ] Existe espaço em branco (respiro) suficiente entre os elementos?
4. [ ] O modo escuro foi implementado com "True Black" (`#000000`) ou cinzas profundos?
5. [ ] As animações são rápidas e orgânicas?

### Instruções para o Agente:

Ao ser ativado com este workflow, você deve revisar o código atual e propor refatorações que elevem a estética para o nível Premium descrito acima. Priorize a consistência em `tailwind.config.js` ou variáveis CSS globais.
