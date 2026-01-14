# Auditoria de UX - MVP Finance

**Data:** 2026-01-14
**Auditor:** Claude (Skill UX Bugs)

---

## Resumo

| Severidade | Quantidade |
|------------|------------|
| Critico | 3 |
| Alto | 6 |
| Medio | 8 |
| Baixo | 5 |

**Total:** 22 problemas identificados

---

## Problemas Encontrados

### Critico

#### [UX-001] Deletes sem confirmacao em paginas de configuracoes
- **Arquivos:**
  - `app/settings/accounts/page.tsx:464`
  - `app/settings/companies/page.tsx:600`
- **Categoria:** Falta de Confirmacao
- **Descricao:** Os botoes de delete usam `confirm()` nativo do browser em vez de AlertDialog. Isso e inconsistente com o resto da aplicacao (CategoryCard usa AlertDialog corretamente) e resulta em uma experiencia de usuario ruim e nao estilizada.
- **Impacto:** Acao destrutiva pode ocorrer por engano, interface inconsistente
- **Sugestao:** Substituir `confirm()` por `<AlertDialog>` do shadcn/ui, igual ao implementado em `components/categories/category-card.tsx:283-316`

---

#### [UX-002] Delete de regras automaticas sem confirmacao
- **Arquivo:** `components/categories/auto-rules-table.tsx:150`
- **Categoria:** Falta de Confirmacao
- **Descricao:** Botao de excluir regra nao tem nenhuma confirmacao, executando a acao diretamente
- **Impacto:** Usuario pode deletar regras importantes por clique acidentado
- **Sugestao:**
```tsx
// Adicionar estado e AlertDialog similar ao CategoryCard
const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);

<AlertDialog open={!!deleteDialogOpen} onOpenChange={() => setDeleteDialogOpen(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Excluir Regra</AlertDialogTitle>
      <AlertDialogDescription>
        Tem certeza que deseja excluir esta regra de categorizacao?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={() => onDelete?.(deleteDialogOpen!)}>
        Excluir
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

#### [UX-003] Falta tratamento de erro visivel em reports
- **Arquivo:** `app/reports/page.tsx:136`
- **Categoria:** Estados Ausentes
- **Descricao:** Ha um `// TODO: Mostrar toast de erro` no codigo. Erros de export nao sao comunicados ao usuario
- **Impacto:** Usuario nao sabe se export falhou
- **Sugestao:**
```tsx
} catch (error) {
  console.error('Export error:', error);
  toast.error('Erro ao exportar relatorio. Tente novamente.');
}
```

---

### Alto

#### [UX-004] Inputs de busca sem labels acessiveis
- **Arquivos:**
  - `app/transactions/page.tsx:612-616`
  - `app/settings/accounts/page.tsx:244-249`
  - `app/settings/companies/page.tsx:384-388`
- **Categoria:** Acessibilidade
- **Descricao:** Campos de busca usam apenas `placeholder` sem `<Label>` associado. Screen readers nao conseguem identificar o proposito do campo
- **Impacto:** Usuarios com deficiencia visual nao conseguem usar a busca efetivamente
- **Sugestao:**
```tsx
<div className="relative">
  <Label htmlFor="search-transactions" className="sr-only">
    Buscar transacoes
  </Label>
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    id="search-transactions"
    placeholder="Buscar transacoes..."
    aria-describedby="search-hint"
  />
  <span id="search-hint" className="sr-only">Digite para filtrar resultados</span>
</div>
```

---

#### [UX-005] Botoes apenas com icone sem aria-label
- **Arquivos:**
  - `app/settings/accounts/page.tsx:412-435`
  - `app/settings/companies/page.tsx:557-606`
- **Categoria:** Acessibilidade
- **Descricao:** Botoes de acao (sincronizar, visualizar, editar, excluir) usam apenas icones sem texto ou `aria-label`
- **Impacto:** Screen readers anunciam apenas "button" sem contexto
- **Sugestao:**
```tsx
<Button variant="outline" size="sm" aria-label="Sincronizar conta">
  <RefreshCw className="h-4 w-4" />
</Button>

<Button variant="outline" size="sm" aria-label="Visualizar detalhes">
  <Eye className="h-4 w-4" />
</Button>

<Button variant="destructive" size="sm" aria-label="Excluir conta">
  <Trash2 className="h-4 w-4" />
</Button>
```

---

#### [UX-006] FilterBar selects sem labels acessiveis
- **Arquivo:** `components/shared/filter-bar.tsx:72-107`
- **Categoria:** Acessibilidade
- **Descricao:** Os selects de empresa e conta nao tem labels associados, apenas placeholders
- **Impacto:** Dificuldade de navegacao para usuarios de tecnologias assistivas
- **Sugestao:**
```tsx
<div className="space-y-1">
  <Label htmlFor="company-select" className="sr-only">Empresa</Label>
  <Select value={companyId} onValueChange={onCompanyChange}>
    <SelectTrigger id="company-select" className="w-full sm:w-[220px]">
      <SelectValue placeholder="Selecione uma empresa" />
    </SelectTrigger>
    ...
  </Select>
</div>
```

---

#### [UX-007] Dashboard loading state muito generico
- **Arquivo:** `app/dashboard/page.tsx:302-305`
- **Categoria:** Estados Ausentes
- **Descricao:** O loading state do dashboard mostra apenas "Carregando metricas..." sem skeleton, diferente de outras paginas
- **Impacto:** Usuario nao tem indicacao visual do layout que sera carregado
- **Sugestao:** Usar skeleton cards como na pagina de reports:
```tsx
{isLoading ? (
  <>
    <MetricCardSkeleton />
    <MetricCardSkeleton />
    <MetricCardSkeleton />
    <MetricCardSkeleton />
  </>
) : (
  dashboardMetrics.map(...)
)}
```

---

#### [UX-008] Funcionalidades "nao implementadas" exibidas
- **Arquivo:** `app/categories/page.tsx:162-188`
- **Categoria:** Feedback Confuso
- **Descricao:** Botoes de criar, editar e excluir categoria exibem toast "Funcionalidade Indisponivel" mas os botoes estao visiveis e habilitados
- **Impacto:** Usuario se frustra ao clicar em funcionalidade que nao funciona
- **Sugestao:** Ocultar botoes nao funcionais ou desabilita-los com tooltip explicativo:
```tsx
<Button
  onClick={() => setIsDialogOpen(true)}
  disabled
  title="Em breve: criacao de categorias"
>
  <Plus className="h-4 w-4 mr-2" />
  Nova Categoria (Em breve)
</Button>
```

---

#### [UX-009] Erro ao carregar categorias sem opcao de retry no dialog
- **Arquivo:** `app/categories/page.tsx:357-374`
- **Categoria:** Estados de Erro
- **Descricao:** Quando ha erro ao carregar categorias, mostra mensagem mas o botao "Tentar novamente" esta em local pouco visivel
- **Impacto:** Usuario pode nao perceber que pode tentar novamente
- **Sugestao:** Layout mais claro com botao em destaque e mensagem mais amigavel

---

### Medio

#### [UX-010] Inconsistencia no formato de data
- **Arquivos:** Multiplos
- **Categoria:** Consistencia
- **Descricao:** Algumas datas usam formato curto (dd/MM), outras completo (dd/MM/yyyy), e algumas incluem horario
- **Impacto:** Visual inconsistente em toda aplicacao
- **Sugestao:** Criar utility function padrao e usar consistentemente:
```tsx
// lib/utils.ts
export const formatDate = (date: string, format: 'short' | 'full' = 'short') => {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    ...(format === 'full' ? { year: 'numeric' } : {})
  });
};
```

---

#### [UX-011] Upload dropzone sem estado de foco visivel
- **Arquivo:** `app/upload/page.tsx:122-131`
- **Categoria:** Acessibilidade
- **Descricao:** A area de dropzone nao tem estado de foco visivel para navegacao via teclado
- **Impacto:** Usuarios que navegam via teclado nao sabem quando o elemento esta focado
- **Sugestao:** Adicionar classes de foco:
```tsx
className={`... focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
```

---

#### [UX-012] Checkbox sem feedback de estado para selecionados
- **Arquivo:** `app/transactions/page.tsx:798-808`
- **Categoria:** Feedback
- **Descricao:** O checkbox de "selecionar todas" nao tem estado intermediario quando algumas estao selecionadas
- **Impacto:** Usuario nao sabe se todas ou algumas estao selecionadas
- **Sugestao:**
```tsx
<Checkbox
  checked={allSelected}
  indeterminate={someSelected && !allSelected}
  ...
/>
```

---

#### [UX-013] Paginacao sem feedback de carregamento
- **Arquivo:** `app/transactions/page.tsx:940-958`
- **Categoria:** Feedback
- **Descricao:** Ao mudar de pagina, nao ha indicacao de que novos dados estao sendo carregados
- **Impacto:** Usuario clica multiplas vezes pensando que nao funcionou
- **Sugestao:** Desabilitar botoes durante carregamento e mostrar spinner:
```tsx
<Button
  onClick={() => setCurrentPage(prev => prev + 1)}
  disabled={!pagination.hasNextPage || isRefetching}
>
  {isRefetching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Proxima'}
</Button>
```

---

#### [UX-014] Toast de export muito vago
- **Arquivo:** `app/transactions/page.tsx:205-209`
- **Categoria:** Feedback
- **Descricao:** Toast mostra "Exportacao Iniciada" mas a funcionalidade nao esta realmente implementada (apenas mostra toast)
- **Impacto:** Usuario espera download que nao acontece
- **Sugestao:** Implementar export ou remover botao temporariamente

---

#### [UX-015] Cards de metricas sem titulo acessivel
- **Arquivo:** `app/transactions/page.tsx:500-582`
- **Categoria:** Acessibilidade
- **Descricao:** Cards nao tem `role` ou `aria-label` que identifique o proposito da metrica
- **Impacto:** Screen readers le apenas numeros sem contexto
- **Sugestao:**
```tsx
<Card role="region" aria-label={`Receitas: ${formatCurrency(stats?.income || 0)}`}>
```

---

#### [UX-016] Tooltip de editar nome confuso
- **Arquivo:** `components/categories/category-card.tsx:193`
- **Categoria:** Feedback
- **Descricao:** O title "Clique para editar" aparece no nome, mas na verdade e um click simples (nao double-click como o handler sugere `handleNameDoubleClick`)
- **Impacto:** Usuario confuso sobre como editar
- **Sugestao:** Alinhar tooltip com comportamento real ou mudar para double-click de fato

---

#### [UX-017] Transacoes recentes sem aria-label clicavel
- **Arquivo:** `components/dashboard/recent-transactions.tsx:80-104`
- **Categoria:** Acessibilidade
- **Descricao:** As linhas de transacao sao clicaveis mas nao tem `role="button"` ou `tabIndex`
- **Impacto:** Nao navegavel via teclado
- **Sugestao:**
```tsx
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && openTransaction(...)}
  onClick={() => openTransaction(...)}
  className="..."
>
```

---

### Baixo

#### [UX-018] Console.logs em producao
- **Arquivos:**
  - `app/dashboard/page.tsx:30`
  - `app/dashboard/page.tsx:185`
  - `app/transactions/page.tsx:200`
- **Categoria:** Performance
- **Descricao:** Ha varios `console.log` de debug no codigo de producao
- **Impacto:** Poluicao do console, possivel vazamento de informacao
- **Sugestao:** Remover ou usar variavel de ambiente para debug

---

#### [UX-019] Uso de `any` em mapeamentos
- **Arquivos:**
  - `app/transactions/page.tsx:638`
  - `components/shared/filter-bar.tsx:81`
- **Categoria:** Qualidade de Codigo
- **Descricao:** Uso de `any` para options de categoria e empresa
- **Impacto:** Pode causar bugs em runtime
- **Sugestao:** Tipar corretamente os options

---

#### [UX-020] Espacamento inconsistente entre gaps
- **Arquivos:** Multiplos
- **Categoria:** Consistencia Visual
- **Descricao:** Alguns lugares usam `gap-4`, outros `gap-6`, outros `gap-2` sem padrao claro
- **Impacto:** Visual levemente inconsistente
- **Sugestao:** Definir design tokens e usar consistentemente

---

#### [UX-021] Badge de transacoes poderia ter cores por tipo
- **Arquivo:** `components/categories/category-card.tsx:139-149`
- **Categoria:** UX Enhancement
- **Descricao:** Badge de transacoes usa a cor da categoria mas poderia diferenciar por tipo (receita/despesa)
- **Impacto:** Menor clareza visual
- **Sugestao:** Adicionar indicador visual do tipo de transacao

---

#### [UX-022] Link "Ver todas" sem indicador visual
- **Arquivo:** `components/dashboard/recent-transactions.tsx:107-110`
- **Categoria:** UX Enhancement
- **Descricao:** Botao "Ver todas" poderia ter um icone indicando navegacao
- **Impacto:** Menor clareza de que e um link de navegacao
- **Sugestao:**
```tsx
<Button variant="outline" size="sm">
  Ver todas
  <ArrowRight className="h-4 w-4 ml-2" />
</Button>
```

---

## Estatisticas por Categoria

| Categoria | Quantidade |
|-----------|------------|
| Acessibilidade | 8 |
| Falta de Confirmacao | 3 |
| Feedback | 4 |
| Estados Ausentes | 2 |
| Consistencia | 3 |
| Qualidade de Codigo | 2 |

---

## Proximos Passos Recomendados

### Prioridade 1 - Imediata (Criticos)
- [ ] Corrigir problemas de confirmacao em deletes (UX-001, UX-002)
- [ ] Adicionar tratamento de erro em export (UX-003)

### Prioridade 2 - Curto Prazo (Altos)
- [ ] Adicionar labels e aria-labels para acessibilidade (UX-004, UX-005, UX-006)
- [ ] Padronizar estados de loading com skeletons (UX-007)
- [ ] Resolver funcionalidades "em breve" - ocultar ou implementar (UX-008)

### Prioridade 3 - Medio Prazo (Medios)
- [ ] Padronizar formato de datas (UX-010)
- [ ] Adicionar estados de foco visiveis (UX-011)
- [ ] Melhorar feedback de paginacao (UX-013)
- [ ] Implementar export real ou remover botao (UX-014)

### Prioridade 4 - Continuo (Baixos)
- [ ] Remover console.logs de producao (UX-018)
- [ ] Eliminar usos de `any` (UX-019)
- [ ] Padronizar espacamentos (UX-020)

---

## Componentes com Boas Praticas (Referencia)

Os seguintes componentes podem servir de referencia para corrigir os problemas:

1. **AlertDialog de confirmacao:** `components/categories/category-card.tsx:283-316`
2. **Skeleton loading:** `components/dashboard/recent-transactions.tsx:27-47`
3. **Empty state:** `components/dashboard/empty-state.tsx`
4. **Aria-labels em checkboxes:** `app/transactions/page.tsx:807, 834`
