export type DreGroupKey = 'RoB' | 'TDCF' | 'RO' | 'MP' | 'MC' | 'CV' | 'CF' | 'EBIT' | 'RNOP' | 'DNOP' | 'LAIR' | 'JCP' | 'CSLL' | 'IRPJ' | 'LLE' | 'OUTROS' | 'EMP' | 'TRANSF';

export interface DreGroupDef {
    code: DreGroupKey;
    label: string;
    description: string;
    sign: 1 | -1 | 0; // 1 for Revenue/Income, -1 for Cost/Expense, 0 for Neural/Mixed
    order: number;
}

export const DRE_GROUPS: Record<string, DreGroupDef> = {
    RoB: {
        code: 'RoB',
        label: 'Receita Operacional Bruta',
        description: 'Faturamento total com vendas de produtos e serviços',
        sign: 1,
        order: 10
    },
    TDCF: {
        code: 'TDCF',
        label: 'Deduções da Receita',
        description: 'Impostos sobre vendas, devoluções, abatimentos e cancelamentos',
        sign: -1,
        order: 20
    },
    RO: {
        code: 'RO',
        label: 'Receita Operacional Líquida',
        description: 'Receita bruta menos deduções (RoB + TDCF)',
        sign: 1,
        order: 25
    },

    MP: { // Often mapped to CMV/CSP
        code: 'MP',
        label: 'Custos de Produtos/Serviços',
        description: 'Custos diretos, matéria prima, mão de obra direta (CMV/CSP)',
        sign: -1,
        order: 30
    },
    MC: {
        code: 'MC',
        label: 'Margem de Contribuição',
        description: 'Receita líquida menos custos diretos e variáveis (RO + MP + CV)',
        sign: 1,
        order: 38
    },

    CV: {
        code: 'CV',
        label: 'Custos Variáveis',
        description: 'Custos que variam conforme volume de vendas (comissões, fretes, embalagens)',
        sign: -1,
        order: 35
    },

    CF: {
        code: 'CF',
        label: 'Despesas Operacionais Fixas',
        description: 'Salários, aluguel, energia, pro-labore, etc.',
        sign: -1,
        order: 40
    },
    EBIT: {
        code: 'EBIT',
        label: 'Resultado Operacional (EBIT)',
        description: 'Margem de contribuição menos despesas fixas (MC + CF)',
        sign: 1,
        order: 45
    },

    RNOP: {
        code: 'RNOP',
        label: 'Receitas Não Operacionais',
        description: 'Rendimentos financeiros, venda de ativo imobilizado',
        sign: 1,
        order: 50
    },
    DNOP: {
        code: 'DNOP',
        label: 'Despesas Não Operacionais',
        description: 'Juros pagos, multas, perda de capital',
        sign: -1,
        order: 60
    },

    // Below are for completeness but might not be fully used in MVP
    LAIR: { code: 'LAIR', label: 'Lucro Antes do IR', description: '', sign: 1, order: 70 },
    IRPJ: { code: 'IRPJ', label: 'IRPJ', description: 'Imposto de Renda PJ', sign: -1, order: 80 },
    CSLL: { code: 'CSLL', label: 'CSLL', description: 'Contribuição Social', sign: -1, order: 85 },
    LLE: { code: 'LLE', label: 'Lucro Líquido do Exercício', description: '', sign: 1, order: 90 },
    
    OUTROS: {
        code: 'OUTROS',
        label: 'Outras Categorias',
        description: 'Categorias sem grupo DRE definido',
        sign: 0, // Depends on transaction type
        order: 999
    }
};

export const DRE_GROUP_LABELS: Record<string, string> = Object.entries(DRE_GROUPS).reduce((acc, [key, val]) => {
    acc[key] = val.label;
    return acc;
}, {} as Record<string, string>);
