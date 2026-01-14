// Categorias baseadas no plano de contas do cliente (consideracoes.txt)
// Estrutura hierárquica: Máscara DRE (dreGroup) → Categoria (categoryGroup) → Rubrica (name)

import { Category, AutoRule, CategoryGroup, DreGroupType } from '@/lib/types';

// Cores por categoryGroup
const groupColors: Record<CategoryGroup, string> = {
  'RECEITAS BRUTAS': '#22C55E',
  'RECEITAS NOP': '#10B981',
  'PESSOAL': '#EF4444',
  'VEÍCULOS': '#F97316',
  'OCUPAÇÃO': '#FB923C',
  'UTILIDADES': '#FBBF24',
  'COMUNICAÇÃO': '#A855F7',
  'SERVIÇOS': '#EC4899',
  'MANUTENÇÃO': '#F472B6',
  'MATERIAIS': '#F59E0B',
  'OUTROS CF': '#9CA3AF',
  'DIRETORIA': '#DC2626',
  'VENDAS': '#3B82F6',
  'CPV/CMV': '#6366F1',
  'TRIBUTOS': '#8B5CF6',
  'CUSTO FINANCEIRO': '#7C3AED',
  'DESPESAS NOP': '#64748B',
  'EMPRÉSTIMOS': '#06B6D4',
  'TRANSFERÊNCIAS': '#14B8A6',
};

// Ícones por categoryGroup
const groupIcons: Record<CategoryGroup, string> = {
  'RECEITAS BRUTAS': '💰',
  'RECEITAS NOP': '📈',
  'PESSOAL': '👥',
  'VEÍCULOS': '🚗',
  'OCUPAÇÃO': '🏢',
  'UTILIDADES': '⚡',
  'COMUNICAÇÃO': '📱',
  'SERVIÇOS': '🛠️',
  'MANUTENÇÃO': '🔧',
  'MATERIAIS': '📦',
  'OUTROS CF': '📋',
  'DIRETORIA': '👔',
  'VENDAS': '🛒',
  'CPV/CMV': '🏭',
  'TRIBUTOS': '📊',
  'CUSTO FINANCEIRO': '🏦',
  'DESPESAS NOP': '📄',
  'EMPRÉSTIMOS': '💳',
  'TRANSFERÊNCIAS': '🔄',
};

interface CategoryDefinition {
  name: string;
  type: Category['type'];
  categoryGroup: CategoryGroup;
  dreGroup: DreGroupType;
  description: string;
  examples: string[];
}

// Definições das categorias baseadas no plano de contas
const categoryDefinitions: CategoryDefinition[] = [
  // ============================================
  // RECEITAS BRUTAS (dreGroup: RoB)
  // ============================================
  {
    name: 'FATURAMENTO',
    type: 'revenue',
    categoryGroup: 'RECEITAS BRUTAS',
    dreGroup: 'RoB',
    description: 'Receita de vendas de produtos e serviços',
    examples: ['FATURAMENTO', 'NF VENDA', 'RECEITA VENDAS', 'FATURA']
  },
  {
    name: 'DUPLICATA DESCONTADA',
    type: 'revenue',
    categoryGroup: 'RECEITAS BRUTAS',
    dreGroup: 'RoB',
    description: 'Recebimento de duplicatas descontadas em banco',
    examples: ['DUPLICATA DESCONTADA', 'DESC DUPLICATA', 'ANTECIPACAO DUPLICATA']
  },
  {
    name: 'DUPLICATA EM CARTEIRA',
    type: 'revenue',
    categoryGroup: 'RECEITAS BRUTAS',
    dreGroup: 'RoB',
    description: 'Recebimento de duplicatas em carteira',
    examples: ['DUPLICATA CARTEIRA', 'REC DUPLICATA', 'COBRANCA DUPLICATA']
  },
  {
    name: 'DEPÓSITO EM DINHEIRO / TED',
    type: 'revenue',
    categoryGroup: 'RECEITAS BRUTAS',
    dreGroup: 'RoB',
    description: 'Depósitos em dinheiro e transferências recebidas',
    examples: ['DEPOSITO', 'TED RECEBIDO', 'DOC RECEBIDO', 'PIX RECEBIDO']
  },
  {
    name: 'CREDITO DE NOTA COMERCIAL',
    type: 'revenue',
    categoryGroup: 'RECEITAS BRUTAS',
    dreGroup: 'RoB',
    description: 'Crédito de nota comercial',
    examples: ['NOTA COMERCIAL', 'CREDITO NOTA']
  },
  {
    name: 'CREDITO SALDO VINCULADA',
    type: 'revenue',
    categoryGroup: 'RECEITAS BRUTAS',
    dreGroup: 'RoB',
    description: 'Crédito de saldo de conta vinculada',
    examples: ['SALDO VINCULADA', 'CREDITO VINCULADO']
  },

  // ============================================
  // RECEITAS NOP (dreGroup: RNOP)
  // ============================================
  {
    name: 'RECEITAS FINANCEIRAS',
    type: 'revenue',
    categoryGroup: 'RECEITAS NOP',
    dreGroup: 'RNOP',
    description: 'Receitas de aplicações e investimentos',
    examples: ['RECEITA FINANCEIRA', 'REND APLIC', 'RENDIMENTO']
  },
  {
    name: 'JUROS APLIC FINANCEIRA',
    type: 'revenue',
    categoryGroup: 'RECEITAS NOP',
    dreGroup: 'RNOP',
    description: 'Juros de aplicações financeiras',
    examples: ['JUROS APLICACAO', 'REND CDB', 'REND POUPANCA']
  },
  {
    name: 'RENDIMENTOS',
    type: 'revenue',
    categoryGroup: 'RECEITAS NOP',
    dreGroup: 'RNOP',
    description: 'Rendimentos diversos de investimentos',
    examples: ['RENDIMENTOS', 'DIVIDENDOS', 'JCP']
  },
  {
    name: 'FOMENTO',
    type: 'revenue',
    categoryGroup: 'RECEITAS NOP',
    dreGroup: 'RNOP',
    description: 'Recebimento de operações de fomento/factoring',
    examples: ['FOMENTO', 'FACTORING', 'ANTECIPACAO FOMENTO']
  },
  {
    name: 'RECEBIMENTO DE INADIMPLENTES',
    type: 'revenue',
    categoryGroup: 'RECEITAS NOP',
    dreGroup: 'RNOP',
    description: 'Recuperação de créditos de inadimplentes',
    examples: ['INADIMPLENTE', 'RECUPERACAO CREDITO', 'COBRANCA ATRASADO']
  },
  {
    name: 'VENDA ATIVOS',
    type: 'revenue',
    categoryGroup: 'RECEITAS NOP',
    dreGroup: 'RNOP',
    description: 'Venda de ativos e imobilizado',
    examples: ['VENDA ATIVO', 'VENDA VEICULO', 'VENDA EQUIPAMENTO']
  },
  {
    name: 'RECEITA DE COMISSARIA',
    type: 'revenue',
    categoryGroup: 'RECEITAS NOP',
    dreGroup: 'RNOP',
    description: 'Receita de operações de comissária',
    examples: ['COMISSARIA', 'REC COMISSARIA']
  },
  {
    name: 'DEVOLUÇÃO PGTOS',
    type: 'revenue',
    categoryGroup: 'RECEITAS NOP',
    dreGroup: 'RNOP',
    description: 'Devolução de pagamentos e estornos',
    examples: ['DEVOLUCAO', 'ESTORNO PGTO', 'REEMBOLSO']
  },
  {
    name: 'ESTORNO DE PAGAMENTOS',
    type: 'revenue',
    categoryGroup: 'RECEITAS NOP',
    dreGroup: 'RNOP',
    description: 'Estorno de pagamentos indevidos',
    examples: ['ESTORNO', 'CANCELAMENTO', 'REVERSAO']
  },
  {
    name: 'OUTRAS RECEITAS NÃO OPERACIONAIS',
    type: 'revenue',
    categoryGroup: 'RECEITAS NOP',
    dreGroup: 'RNOP',
    description: 'Outras receitas não operacionais',
    examples: ['OUTRAS RECEITAS', 'RECEITA EVENTUAL']
  },

  // ============================================
  // CUSTOS VARIÁVEIS - VENDAS (dreGroup: CV)
  // ============================================
  {
    name: 'COMISSÕES',
    type: 'variable_cost',
    categoryGroup: 'VENDAS',
    dreGroup: 'CV',
    description: 'Comissões de vendas e representação',
    examples: ['COMISSAO', 'COMISSOES', 'REPRESENTANTE']
  },
  {
    name: 'DEVOLUÇÕES',
    type: 'variable_cost',
    categoryGroup: 'VENDAS',
    dreGroup: 'CV',
    description: 'Devoluções de mercadorias vendidas',
    examples: ['DEVOLUCAO VENDA', 'TROCA', 'RETORNO MERCADORIA']
  },
  {
    name: 'FRETES E CARRETOS',
    type: 'variable_cost',
    categoryGroup: 'VENDAS',
    dreGroup: 'CV',
    description: 'Frete de entrega de mercadorias',
    examples: ['FRETE', 'CARRETO', 'TRANSPORTE VENDA']
  },
  {
    name: 'FRETES SOBRE COMPRAS',
    type: 'variable_cost',
    categoryGroup: 'VENDAS',
    dreGroup: 'CV',
    description: 'Frete de compra de mercadorias',
    examples: ['FRETE COMPRA', 'FRETE FORNECEDOR']
  },
  {
    name: 'EVENTOS/PROMOÇÕES/BRINDES',
    type: 'variable_cost',
    categoryGroup: 'VENDAS',
    dreGroup: 'CV',
    description: 'Eventos promocionais e brindes',
    examples: ['EVENTO', 'PROMOCAO', 'BRINDE', 'FEIRA']
  },
  {
    name: 'PROPAGANDA/PATROCINIO',
    type: 'variable_cost',
    categoryGroup: 'VENDAS',
    dreGroup: 'CV',
    description: 'Propaganda e patrocínio',
    examples: ['PROPAGANDA', 'PATROCINIO', 'ANUNCIO', 'PUBLICIDADE']
  },
  {
    name: 'PREMIAÇÕES',
    type: 'variable_cost',
    categoryGroup: 'VENDAS',
    dreGroup: 'CV',
    description: 'Premiações e incentivos de vendas',
    examples: ['PREMIACAO', 'INCENTIVO', 'BONUS VENDAS']
  },

  // ============================================
  // CUSTOS VARIÁVEIS - CPV/CMV (dreGroup: CV)
  // ============================================
  {
    name: 'MATÉRIA PRIMA',
    type: 'variable_cost',
    categoryGroup: 'CPV/CMV',
    dreGroup: 'CV',
    description: 'Compra de matéria prima para produção',
    examples: ['MATERIA PRIMA', 'INSUMO', 'MP']
  },
  {
    name: 'MATERIAL DE EMBALAGEM',
    type: 'variable_cost',
    categoryGroup: 'CPV/CMV',
    dreGroup: 'CV',
    description: 'Material de embalagem para produtos',
    examples: ['EMBALAGEM', 'CAIXA', 'SACOLA', 'ETIQUETA']
  },
  {
    name: 'PRODUTO ACABADO',
    type: 'variable_cost',
    categoryGroup: 'CPV/CMV',
    dreGroup: 'CV',
    description: 'Compra de produto acabado para revenda',
    examples: ['PRODUTO ACABADO', 'MERCADORIA', 'REVENDA']
  },

  // ============================================
  // CUSTOS FIXOS - PESSOAL (dreGroup: CF)
  // ============================================
  {
    name: 'SALARIOS',
    type: 'fixed_cost',
    categoryGroup: 'PESSOAL',
    dreGroup: 'CF',
    description: 'Folha de pagamento de funcionários CLT',
    examples: ['SALARIO', 'FOLHA', 'PGTO FUNCIONARIO', 'HOLERITE']
  },
  {
    name: '13º SALARIO',
    type: 'fixed_cost',
    categoryGroup: 'PESSOAL',
    dreGroup: 'CF',
    description: 'Décimo terceiro salário',
    examples: ['13 SALARIO', 'DECIMO TERCEIRO', '13º']
  },
  {
    name: 'FÉRIAS',
    type: 'fixed_cost',
    categoryGroup: 'PESSOAL',
    dreGroup: 'CF',
    description: 'Pagamento de férias e abono',
    examples: ['FERIAS', 'ABONO FERIAS']
  },
  {
    name: 'FGTS',
    type: 'fixed_cost',
    categoryGroup: 'PESSOAL',
    dreGroup: 'CF',
    description: 'Fundo de Garantia do Tempo de Serviço',
    examples: ['FGTS', 'FUNDO GARANTIA']
  },
  {
    name: 'INSS',
    type: 'fixed_cost',
    categoryGroup: 'PESSOAL',
    dreGroup: 'CF',
    description: 'Contribuição previdenciária INSS',
    examples: ['INSS', 'PREVIDENCIA']
  },
  {
    name: 'GPS',
    type: 'fixed_cost',
    categoryGroup: 'PESSOAL',
    dreGroup: 'CF',
    description: 'Guia da Previdência Social',
    examples: ['GPS', 'GUIA PREVIDENCIA']
  },
  {
    name: 'FOLHA PJ',
    type: 'fixed_cost',
    categoryGroup: 'PESSOAL',
    dreGroup: 'CF',
    description: 'Pagamento de prestadores PJ',
    examples: ['FOLHA PJ', 'PRESTADOR PJ', 'FREELANCER']
  },
  {
    name: 'VALE ALIMENTAÇÃO',
    type: 'fixed_cost',
    categoryGroup: 'PESSOAL',
    dreGroup: 'CF',
    description: 'Benefício de vale alimentação',
    examples: ['VA', 'VALE ALIMENTACAO', 'ALIMENTACAO']
  },
  {
    name: 'VALE REFEIÇÃO / RESTAURANTE',
    type: 'fixed_cost',
    categoryGroup: 'PESSOAL',
    dreGroup: 'CF',
    description: 'Benefício de vale refeição',
    examples: ['VR', 'VALE REFEICAO', 'REFEICAO', 'RESTAURANTE']
  },
  {
    name: 'VALE TRANSPORTE',
    type: 'fixed_cost',
    categoryGroup: 'PESSOAL',
    dreGroup: 'CF',
    description: 'Benefício de vale transporte',
    examples: ['VT', 'VALE TRANSPORTE', 'TRANSPORTE']
  },
  {
    name: 'ASSISTÊNCIA MÉDICA / ODONTOLÓGICA',
    type: 'fixed_cost',
    categoryGroup: 'PESSOAL',
    dreGroup: 'CF',
    description: 'Plano de saúde e odontológico',
    examples: ['PLANO SAUDE', 'ASSISTENCIA MEDICA', 'ODONTOLOGICO', 'CONVENIO']
  },
  {
    name: 'EXAME ADMISSIONAL/PERIODICO',
    type: 'fixed_cost',
    categoryGroup: 'PESSOAL',
    dreGroup: 'CF',
    description: 'Exames médicos ocupacionais',
    examples: ['EXAME ADMISSIONAL', 'EXAME PERIODICO', 'ASO']
  },
  {
    name: 'PLR',
    type: 'fixed_cost',
    categoryGroup: 'PESSOAL',
    dreGroup: 'CF',
    description: 'Participação nos Lucros e Resultados',
    examples: ['PLR', 'PARTICIPACAO LUCROS']
  },
  {
    name: 'RESCISÕES E INDENIZAÇÕES',
    type: 'fixed_cost',
    categoryGroup: 'PESSOAL',
    dreGroup: 'CF',
    description: 'Rescisões contratuais e indenizações',
    examples: ['RESCISAO', 'INDENIZACAO', 'DEMISSAO', 'ACERTO']
  },
  {
    name: 'PENSÃO ALIMENTÍCIA',
    type: 'fixed_cost',
    categoryGroup: 'PESSOAL',
    dreGroup: 'CF',
    description: 'Desconto de pensão alimentícia',
    examples: ['PENSAO ALIMENTICIA', 'PENSAO']
  },
  {
    name: 'MEDICAMENTOS',
    type: 'fixed_cost',
    categoryGroup: 'PESSOAL',
    dreGroup: 'CF',
    description: 'Medicamentos para funcionários',
    examples: ['MEDICAMENTO', 'FARMACIA', 'REMEDIO']
  },
  {
    name: 'UNIFORME / EPI',
    type: 'fixed_cost',
    categoryGroup: 'PESSOAL',
    dreGroup: 'CF',
    description: 'Uniformes e EPIs',
    examples: ['UNIFORME', 'EPI', 'EQUIPAMENTO PROTECAO']
  },
  {
    name: 'FRETADO PARA FUNCIONÁRIO',
    type: 'fixed_cost',
    categoryGroup: 'PESSOAL',
    dreGroup: 'CF',
    description: 'Transporte fretado para funcionários',
    examples: ['FRETADO', 'ONIBUS FUNCIONARIO', 'TRANSPORTE FRETADO']
  },
  {
    name: 'SEGURO DE VIDA',
    type: 'fixed_cost',
    categoryGroup: 'PESSOAL',
    dreGroup: 'CF',
    description: 'Seguro de vida em grupo',
    examples: ['SEGURO VIDA', 'SEGURO FUNCIONARIO']
  },
  {
    name: 'FESTAS E CONFRATERNIZACOES',
    type: 'fixed_cost',
    categoryGroup: 'PESSOAL',
    dreGroup: 'CF',
    description: 'Festas e confraternizações de funcionários',
    examples: ['FESTA', 'CONFRATERNIZACAO', 'ANIVERSARIO', 'FIM ANO']
  },
  {
    name: 'ASSOCIAÇÕES/SINDICATOS',
    type: 'fixed_cost',
    categoryGroup: 'PESSOAL',
    dreGroup: 'CF',
    description: 'Contribuições sindicais e associativas',
    examples: ['SINDICATO', 'ASSOCIACAO', 'CONTRIBUICAO SINDICAL']
  },
  {
    name: 'PESQ /DESENVOLVIMENTO/TREIN.',
    type: 'fixed_cost',
    categoryGroup: 'PESSOAL',
    dreGroup: 'CF',
    description: 'Pesquisa, desenvolvimento e treinamento',
    examples: ['TREINAMENTO', 'CAPACITACAO', 'CURSO', 'P&D']
  },

  // ============================================
  // CUSTOS FIXOS - DIRETORIA (dreGroup: CF)
  // ============================================
  {
    name: 'PRO LABORE',
    type: 'fixed_cost',
    categoryGroup: 'DIRETORIA',
    dreGroup: 'CF',
    description: 'Remuneração dos sócios administradores',
    examples: ['PRO LABORE', 'PROLABORE', 'RETIRADA SOCIO']
  },

  // ============================================
  // CUSTOS FIXOS - VEÍCULOS (dreGroup: CF)
  // ============================================
  {
    name: 'COMBUSTIVEIS/LUBRIFICANTES',
    type: 'fixed_cost',
    categoryGroup: 'VEÍCULOS',
    dreGroup: 'CF',
    description: 'Combustíveis e lubrificantes',
    examples: ['COMBUSTIVEL', 'GASOLINA', 'DIESEL', 'OLEO', 'LUBRIFICANTE']
  },
  {
    name: 'IPVA/LICENCIAMENTO',
    type: 'fixed_cost',
    categoryGroup: 'VEÍCULOS',
    dreGroup: 'CF',
    description: 'IPVA e licenciamento de veículos',
    examples: ['IPVA', 'LICENCIAMENTO', 'DETRAN']
  },
  {
    name: 'SEGURO DE VEÍCULOS',
    type: 'fixed_cost',
    categoryGroup: 'VEÍCULOS',
    dreGroup: 'CF',
    description: 'Seguro de veículos da empresa',
    examples: ['SEGURO VEICULO', 'SEGURO CARRO', 'SEGURO AUTO']
  },
  {
    name: 'LOCAÇÃO DE VEÍCULOS',
    type: 'fixed_cost',
    categoryGroup: 'VEÍCULOS',
    dreGroup: 'CF',
    description: 'Aluguel de veículos',
    examples: ['LOCACAO VEICULO', 'ALUGUEL CARRO', 'RENT A CAR']
  },
  {
    name: 'ESTACIONAMENTOS',
    type: 'fixed_cost',
    categoryGroup: 'VEÍCULOS',
    dreGroup: 'CF',
    description: 'Despesas com estacionamento',
    examples: ['ESTACIONAMENTO', 'PARKING', 'ZONA AZUL']
  },
  {
    name: 'CONSÓRCIOS',
    type: 'fixed_cost',
    categoryGroup: 'VEÍCULOS',
    dreGroup: 'CF',
    description: 'Parcelas de consórcio de veículos',
    examples: ['CONSORCIO', 'PARCELA CONSORCIO']
  },
  {
    name: 'DESPESAS DE VEÍCULOS',
    type: 'fixed_cost',
    categoryGroup: 'VEÍCULOS',
    dreGroup: 'CF',
    description: 'Outras despesas com veículos',
    examples: ['DESPESA VEICULO', 'MANUTENCAO VEICULO', 'PNEU', 'LAVAGEM']
  },

  // ============================================
  // CUSTOS FIXOS - OCUPAÇÃO (dreGroup: CF)
  // ============================================
  {
    name: 'ALUGUEL',
    type: 'fixed_cost',
    categoryGroup: 'OCUPAÇÃO',
    dreGroup: 'CF',
    description: 'Aluguel de imóvel comercial',
    examples: ['ALUGUEL', 'LOCACAO IMOVEL', 'ARRENDAMENTO']
  },
  {
    name: 'CONDOMINIO',
    type: 'fixed_cost',
    categoryGroup: 'OCUPAÇÃO',
    dreGroup: 'CF',
    description: 'Taxa de condomínio',
    examples: ['CONDOMINIO', 'TAXA CONDOMINIO']
  },
  {
    name: 'IPTU',
    type: 'fixed_cost',
    categoryGroup: 'OCUPAÇÃO',
    dreGroup: 'CF',
    description: 'Imposto predial e territorial urbano',
    examples: ['IPTU', 'IMPOSTO PREDIAL']
  },
  {
    name: 'ALARME E SEGURANÇA PATRIMONIAL',
    type: 'fixed_cost',
    categoryGroup: 'OCUPAÇÃO',
    dreGroup: 'CF',
    description: 'Segurança e alarme do imóvel',
    examples: ['ALARME', 'SEGURANCA', 'VIGILANCIA', 'MONITORAMENTO']
  },

  // ============================================
  // CUSTOS FIXOS - UTILIDADES (dreGroup: CF)
  // ============================================
  {
    name: 'ENERGIA ELETRICA',
    type: 'fixed_cost',
    categoryGroup: 'UTILIDADES',
    dreGroup: 'CF',
    description: 'Fornecimento de energia elétrica',
    examples: ['ENERGIA', 'LUZ', 'ELETRICA', 'CEMIG', 'CPFL', 'ENEL']
  },
  {
    name: 'ÁGUA E ESGOTO',
    type: 'fixed_cost',
    categoryGroup: 'UTILIDADES',
    dreGroup: 'CF',
    description: 'Fornecimento de água e esgoto',
    examples: ['AGUA', 'ESGOTO', 'SABESP', 'COPASA', 'SANEAMENTO']
  },
  {
    name: 'GÁS',
    type: 'fixed_cost',
    categoryGroup: 'UTILIDADES',
    dreGroup: 'CF',
    description: 'Fornecimento de gás',
    examples: ['GAS', 'GAS NATURAL', 'GLP', 'COMGAS']
  },
  {
    name: 'EQUIPAMENTOS',
    type: 'fixed_cost',
    categoryGroup: 'UTILIDADES',
    dreGroup: 'CF',
    description: 'Aquisição e manutenção de equipamentos',
    examples: ['EQUIPAMENTO', 'MAQUINA', 'FERRAMENTA']
  },
  {
    name: 'DESPESAS ADMINISTRATIVAS',
    type: 'fixed_cost',
    categoryGroup: 'UTILIDADES',
    dreGroup: 'CF',
    description: 'Despesas administrativas gerais',
    examples: ['DESPESA ADM', 'ADMINISTRATIVO']
  },

  // ============================================
  // CUSTOS FIXOS - COMUNICAÇÃO (dreGroup: CF)
  // ============================================
  {
    name: 'TELEFONE / INTERNET',
    type: 'fixed_cost',
    categoryGroup: 'COMUNICAÇÃO',
    dreGroup: 'CF',
    description: 'Telefonia e internet',
    examples: ['TELEFONE', 'INTERNET', 'CELULAR', 'VIVO', 'CLARO', 'TIM', 'OI']
  },

  // ============================================
  // CUSTOS FIXOS - SERVIÇOS (dreGroup: CF)
  // ============================================
  {
    name: 'ASSESSORIA /CONSULTORIA',
    type: 'fixed_cost',
    categoryGroup: 'SERVIÇOS',
    dreGroup: 'CF',
    description: 'Serviços de assessoria e consultoria',
    examples: ['ASSESSORIA', 'CONSULTORIA', 'CONSULTOR']
  },
  {
    name: 'AUDITORIA',
    type: 'fixed_cost',
    categoryGroup: 'SERVIÇOS',
    dreGroup: 'CF',
    description: 'Serviços de auditoria',
    examples: ['AUDITORIA', 'AUDITOR']
  },
  {
    name: 'SERVIÇOS DE ADVOCACIA',
    type: 'fixed_cost',
    categoryGroup: 'SERVIÇOS',
    dreGroup: 'CF',
    description: 'Serviços advocatícios e jurídicos',
    examples: ['ADVOCACIA', 'ADVOGADO', 'JURIDICO', 'HONORARIOS']
  },
  {
    name: 'SERVIÇOS PRESTADOS PJ',
    type: 'fixed_cost',
    categoryGroup: 'SERVIÇOS',
    dreGroup: 'CF',
    description: 'Serviços prestados por pessoa jurídica',
    examples: ['SERVICO PJ', 'TERCEIRIZADO']
  },
  {
    name: 'CONSERVAÇÃO E LIMPEZA',
    type: 'fixed_cost',
    categoryGroup: 'SERVIÇOS',
    dreGroup: 'CF',
    description: 'Serviços de limpeza e conservação',
    examples: ['LIMPEZA', 'CONSERVACAO', 'FAXINA', 'ZELADORIA']
  },
  {
    name: 'COMUNICAÇÃO E MKT',
    type: 'fixed_cost',
    categoryGroup: 'SERVIÇOS',
    dreGroup: 'CF',
    description: 'Serviços de comunicação e marketing',
    examples: ['MARKETING', 'COMUNICACAO', 'AGENCIA', 'MIDIA']
  },
  {
    name: 'CORREIOS',
    type: 'fixed_cost',
    categoryGroup: 'SERVIÇOS',
    dreGroup: 'CF',
    description: 'Serviços postais',
    examples: ['CORREIOS', 'SEDEX', 'PAC', 'POSTAGEM']
  },
  {
    name: 'MOTORISTA',
    type: 'fixed_cost',
    categoryGroup: 'SERVIÇOS',
    dreGroup: 'CF',
    description: 'Serviços de motorista',
    examples: ['MOTORISTA', 'UBER', '99', 'TAXI']
  },
  {
    name: 'SEGURANÇA DO TRABALHO',
    type: 'fixed_cost',
    categoryGroup: 'SERVIÇOS',
    dreGroup: 'CF',
    description: 'Serviços de segurança do trabalho',
    examples: ['SEGURANCA TRABALHO', 'SESMT', 'CIPA', 'PPRA', 'PCMSO']
  },
  {
    name: 'SERV PROTEÇÃO AO CREDITO',
    type: 'fixed_cost',
    categoryGroup: 'SERVIÇOS',
    dreGroup: 'CF',
    description: 'Serviços de proteção ao crédito',
    examples: ['SPC', 'SERASA', 'BOA VISTA', 'PROTESTO']
  },
  {
    name: 'TRATAMENTO DE RESÍDUOS',
    type: 'fixed_cost',
    categoryGroup: 'SERVIÇOS',
    dreGroup: 'CF',
    description: 'Tratamento e destinação de resíduos',
    examples: ['RESIDUO', 'LIXO', 'COLETA', 'DESCARTE']
  },
  {
    name: 'DESPESAS COM TI',
    type: 'fixed_cost',
    categoryGroup: 'SERVIÇOS',
    dreGroup: 'CF',
    description: 'Despesas com tecnologia da informação',
    examples: ['TI', 'INFORMATICA', 'SUPORTE TI', 'CLOUD', 'SOFTWARE']
  },
  {
    name: 'LOCAÇÃO DE MÁQ E EQUIPAMENTOS',
    type: 'fixed_cost',
    categoryGroup: 'SERVIÇOS',
    dreGroup: 'CF',
    description: 'Locação de máquinas e equipamentos',
    examples: ['LOCACAO MAQUINA', 'ALUGUEL EQUIPAMENTO']
  },

  // ============================================
  // CUSTOS FIXOS - MANUTENÇÃO (dreGroup: CF)
  // ============================================
  {
    name: 'MANUTENÇÃO PREDIAL',
    type: 'fixed_cost',
    categoryGroup: 'MANUTENÇÃO',
    dreGroup: 'CF',
    description: 'Manutenção do prédio e instalações',
    examples: ['MANUTENCAO PREDIAL', 'REPARO PREDIO', 'OBRA']
  },
  {
    name: 'MANUTENÇÃO DE EQUIPAMENTOS',
    type: 'fixed_cost',
    categoryGroup: 'MANUTENÇÃO',
    dreGroup: 'CF',
    description: 'Manutenção de equipamentos',
    examples: ['MANUTENCAO EQUIPAMENTO', 'CONSERTO', 'REPARO']
  },
  {
    name: 'MANUTENÇÃO INDUSTRIAL',
    type: 'fixed_cost',
    categoryGroup: 'MANUTENÇÃO',
    dreGroup: 'CF',
    description: 'Manutenção industrial',
    examples: ['MANUTENCAO INDUSTRIAL', 'MANUTENCAO FABRICA']
  },
  {
    name: 'DESPESAS INDUSTRIAIS',
    type: 'fixed_cost',
    categoryGroup: 'MANUTENÇÃO',
    dreGroup: 'CF',
    description: 'Despesas industriais diversas',
    examples: ['DESPESA INDUSTRIAL', 'PRODUCAO']
  },

  // ============================================
  // CUSTOS FIXOS - MATERIAIS (dreGroup: CF)
  // ============================================
  {
    name: 'COPA E COZINHA',
    type: 'fixed_cost',
    categoryGroup: 'MATERIAIS',
    dreGroup: 'CF',
    description: 'Materiais de copa e cozinha',
    examples: ['COPA', 'COZINHA', 'CAFE', 'AGUA MINERAL', 'DESCARTAVEL']
  },
  {
    name: 'MATERIAL DE CONSUMO',
    type: 'fixed_cost',
    categoryGroup: 'MATERIAIS',
    dreGroup: 'CF',
    description: 'Material de consumo e escritório',
    examples: ['MATERIAL CONSUMO', 'ESCRITORIO', 'PAPELARIA', 'LIMPEZA']
  },

  // ============================================
  // CUSTOS FIXOS - OUTROS CF (dreGroup: CF)
  // ============================================
  {
    name: 'DESPESAS COM VIAGENS',
    type: 'fixed_cost',
    categoryGroup: 'OUTROS CF',
    dreGroup: 'CF',
    description: 'Despesas com viagens a trabalho',
    examples: ['VIAGEM', 'PASSAGEM', 'HOSPEDAGEM', 'DIARIA', 'HOTEL']
  },
  {
    name: 'ÁLVARAS/LICENÇAS DIVERSAS',
    type: 'fixed_cost',
    categoryGroup: 'OUTROS CF',
    dreGroup: 'CF',
    description: 'Alvarás e licenças',
    examples: ['ALVARA', 'LICENCA', 'TAXA FUNCIONAMENTO']
  },
  {
    name: 'CARTÃO CORPORATIVO',
    type: 'fixed_cost',
    categoryGroup: 'OUTROS CF',
    dreGroup: 'CF',
    description: 'Despesas de cartão corporativo',
    examples: ['CARTAO CORPORATIVO', 'CARTAO EMPRESA']
  },
  {
    name: 'DOAÇÕES',
    type: 'fixed_cost',
    categoryGroup: 'OUTROS CF',
    dreGroup: 'CF',
    description: 'Doações e contribuições',
    examples: ['DOACAO', 'CONTRIBUICAO', 'PATROCINIO SOCIAL']
  },
  {
    name: 'SEGUROS GERAIS',
    type: 'fixed_cost',
    categoryGroup: 'OUTROS CF',
    dreGroup: 'CF',
    description: 'Seguros patrimoniais e gerais',
    examples: ['SEGURO', 'SEGURO EMPRESA', 'SEGURO PATRIMONIAL']
  },
  {
    name: 'OUTROS CUSTOS FIXOS',
    type: 'fixed_cost',
    categoryGroup: 'OUTROS CF',
    dreGroup: 'CF',
    description: 'Outros custos fixos não classificados',
    examples: ['OUTROS CF', 'DESPESA DIVERSA']
  },
  {
    name: 'SAQUE EM DINHEIRO',
    type: 'fixed_cost',
    categoryGroup: 'OUTROS CF',
    dreGroup: 'CF',
    description: 'Saques em dinheiro para despesas',
    examples: ['SAQUE', 'RETIRADA', 'CAIXA']
  },

  // ============================================
  // T.D.C.F. - TRIBUTOS (dreGroup: TDCF)
  // ============================================
  {
    name: 'COFINS',
    type: 'non_operational',
    categoryGroup: 'TRIBUTOS',
    dreGroup: 'TDCF',
    description: 'Contribuição para Financiamento da Seguridade Social',
    examples: ['COFINS']
  },
  {
    name: 'PIS',
    type: 'non_operational',
    categoryGroup: 'TRIBUTOS',
    dreGroup: 'TDCF',
    description: 'Programa de Integração Social',
    examples: ['PIS', 'PIS/PASEP']
  },
  {
    name: 'ICMS',
    type: 'non_operational',
    categoryGroup: 'TRIBUTOS',
    dreGroup: 'TDCF',
    description: 'Imposto sobre Circulação de Mercadorias e Serviços',
    examples: ['ICMS', 'ICMS ST']
  },
  {
    name: 'ISS',
    type: 'non_operational',
    categoryGroup: 'TRIBUTOS',
    dreGroup: 'TDCF',
    description: 'Imposto Sobre Serviços',
    examples: ['ISS', 'ISSQN']
  },
  {
    name: 'IPI',
    type: 'non_operational',
    categoryGroup: 'TRIBUTOS',
    dreGroup: 'TDCF',
    description: 'Imposto sobre Produtos Industrializados',
    examples: ['IPI']
  },
  {
    name: 'IOF',
    type: 'non_operational',
    categoryGroup: 'TRIBUTOS',
    dreGroup: 'TDCF',
    description: 'Imposto sobre Operações Financeiras',
    examples: ['IOF']
  },
  {
    name: 'IRRF',
    type: 'non_operational',
    categoryGroup: 'TRIBUTOS',
    dreGroup: 'TDCF',
    description: 'Imposto de Renda Retido na Fonte',
    examples: ['IRRF', 'IR RETIDO']
  },
  {
    name: 'IR EXTERIOR',
    type: 'non_operational',
    categoryGroup: 'TRIBUTOS',
    dreGroup: 'TDCF',
    description: 'Imposto de Renda sobre operações no exterior',
    examples: ['IR EXTERIOR', 'IMPOSTO EXTERIOR']
  },
  {
    name: 'DAE',
    type: 'non_operational',
    categoryGroup: 'TRIBUTOS',
    dreGroup: 'TDCF',
    description: 'Documento de Arrecadação Estadual',
    examples: ['DAE']
  },
  {
    name: 'DARF',
    type: 'non_operational',
    categoryGroup: 'TRIBUTOS',
    dreGroup: 'TDCF',
    description: 'Documento de Arrecadação de Receitas Federais',
    examples: ['DARF']
  },
  {
    name: 'OUTROS TRIBUTOS',
    type: 'non_operational',
    categoryGroup: 'TRIBUTOS',
    dreGroup: 'TDCF',
    description: 'Outros tributos federais, estaduais ou municipais',
    examples: ['TRIBUTO', 'IMPOSTO', 'TAXA']
  },
  {
    name: 'TAXAS ADUANEIRA',
    type: 'non_operational',
    categoryGroup: 'TRIBUTOS',
    dreGroup: 'TDCF',
    description: 'Taxas aduaneiras de importação/exportação',
    examples: ['ADUANEIRA', 'IMPORTACAO', 'EXPORTACAO', 'SISCOMEX']
  },
  {
    name: 'DESPESAS DE IMPORTAÇÃO',
    type: 'non_operational',
    categoryGroup: 'TRIBUTOS',
    dreGroup: 'TDCF',
    description: 'Despesas de importação',
    examples: ['IMPORTACAO', 'DESEMBARACO', 'DESPACHO ADUANEIRO']
  },

  // ============================================
  // T.D.C.F. - CUSTO FINANCEIRO (dreGroup: TDCF)
  // ============================================
  {
    name: 'TARIFAS BANCÁRIAS',
    type: 'non_operational',
    categoryGroup: 'CUSTO FINANCEIRO',
    dreGroup: 'TDCF',
    description: 'Tarifas e taxas bancárias',
    examples: ['TARIFA', 'TAXA BANCARIA', 'TED', 'DOC', 'MANUTENCAO CONTA']
  },
  {
    name: 'DESCONTO DE DUPLICATAS/CHEQUES',
    type: 'non_operational',
    categoryGroup: 'CUSTO FINANCEIRO',
    dreGroup: 'TDCF',
    description: 'Custos de desconto de duplicatas e cheques',
    examples: ['DESCONTO DUPLICATA', 'DESCONTO CHEQUE', 'ANTECIPACAO']
  },
  {
    name: 'CUSTO SOBRE FOMENTO',
    type: 'non_operational',
    categoryGroup: 'CUSTO FINANCEIRO',
    dreGroup: 'TDCF',
    description: 'Custos de operações de fomento',
    examples: ['CUSTO FOMENTO', 'TAXA FACTORING']
  },
  {
    name: 'JUROS DUPL DESCONTADAS',
    type: 'non_operational',
    categoryGroup: 'CUSTO FINANCEIRO',
    dreGroup: 'TDCF',
    description: 'Juros sobre duplicatas descontadas',
    examples: ['JUROS DUPLICATA', 'ENCARGOS ANTECIPACAO']
  },
  {
    name: 'JUROS/PRORROGAÇÃO',
    type: 'non_operational',
    categoryGroup: 'CUSTO FINANCEIRO',
    dreGroup: 'TDCF',
    description: 'Juros e custos de prorrogação',
    examples: ['JUROS', 'PRORROGACAO', 'MORA']
  },
  {
    name: 'JUROS DE NOTA COMERCIAL',
    type: 'non_operational',
    categoryGroup: 'CUSTO FINANCEIRO',
    dreGroup: 'TDCF',
    description: 'Juros de nota comercial',
    examples: ['JUROS NOTA COMERCIAL']
  },

  // ============================================
  // DESPESAS NOP (dreGroup: DNOP)
  // ============================================
  {
    name: 'CARTÓRIO',
    type: 'non_operational',
    categoryGroup: 'DESPESAS NOP',
    dreGroup: 'DNOP',
    description: 'Despesas cartorárias',
    examples: ['CARTORIO', 'TABELIAO', 'REGISTRO', 'AUTENTICACAO']
  },
  {
    name: 'CUSTO DE PRORROGAÇÃO',
    type: 'non_operational',
    categoryGroup: 'DESPESAS NOP',
    dreGroup: 'DNOP',
    description: 'Custos de prorrogação de dívidas',
    examples: ['PRORROGACAO', 'RENEGOCIACAO']
  },
  {
    name: 'INADIMPLENCIA / RECOMPRAS',
    type: 'non_operational',
    categoryGroup: 'DESPESAS NOP',
    dreGroup: 'DNOP',
    description: 'Inadimplência e recompra de títulos',
    examples: ['INADIMPLENCIA', 'RECOMPRA', 'TITULO DEVOLVIDO']
  },
  {
    name: 'PARCELAMENTO DE IMPOSTOS',
    type: 'non_operational',
    categoryGroup: 'DESPESAS NOP',
    dreGroup: 'DNOP',
    description: 'Parcelamento de impostos',
    examples: ['PARCELAMENTO', 'REFIS', 'PROGRAMA FISCAL']
  },
  {
    name: 'FINANCIAMENTO DE VEÍCULOS',
    type: 'non_operational',
    categoryGroup: 'DESPESAS NOP',
    dreGroup: 'DNOP',
    description: 'Financiamento de veículos',
    examples: ['FINANCIAMENTO VEICULO', 'PARCELA CARRO', 'LEASING']
  },
  {
    name: 'LIQUIDAÇÃO DE FOMENTO',
    type: 'non_operational',
    categoryGroup: 'DESPESAS NOP',
    dreGroup: 'DNOP',
    description: 'Liquidação de operações de fomento',
    examples: ['LIQUIDACAO FOMENTO', 'PAGAMENTO FACTORING']
  },
  {
    name: 'LIQUIDAÇÃO DE NOTA COMERCIAL',
    type: 'non_operational',
    categoryGroup: 'DESPESAS NOP',
    dreGroup: 'DNOP',
    description: 'Liquidação de nota comercial',
    examples: ['LIQUIDACAO NOTA', 'PAGAMENTO NOTA COMERCIAL']
  },
  {
    name: 'MATÉRIA PRIMA (PASSIVO)',
    type: 'non_operational',
    categoryGroup: 'DESPESAS NOP',
    dreGroup: 'DNOP',
    description: 'Pagamento de passivo de matéria prima',
    examples: ['MP PASSIVO', 'DIVIDA FORNECEDOR']
  },
  {
    name: 'PAGAMENTO DE COMISSÁRIA',
    type: 'non_operational',
    categoryGroup: 'DESPESAS NOP',
    dreGroup: 'DNOP',
    description: 'Pagamento de operações de comissária',
    examples: ['COMISSARIA', 'PAGAMENTO COMISSARIA']
  },
  {
    name: 'ROYALTIES',
    type: 'non_operational',
    categoryGroup: 'DESPESAS NOP',
    dreGroup: 'DNOP',
    description: 'Pagamento de royalties',
    examples: ['ROYALTY', 'ROYALTIES', 'FRANQUIA']
  },
  {
    name: 'FEDERAL (IMPOSTOS ATRASADOS)',
    type: 'non_operational',
    categoryGroup: 'DESPESAS NOP',
    dreGroup: 'DNOP',
    description: 'Impostos federais atrasados',
    examples: ['IMPOSTO FEDERAL ATRASADO', 'DIVIDA ATIVA FEDERAL']
  },
  {
    name: 'ESTADUAL (IMPOSTOS ATRASADOS)',
    type: 'non_operational',
    categoryGroup: 'DESPESAS NOP',
    dreGroup: 'DNOP',
    description: 'Impostos estaduais atrasados',
    examples: ['IMPOSTO ESTADUAL ATRASADO', 'DIVIDA ATIVA ESTADUAL']
  },
  {
    name: 'MUNICIPAL (IMPOSTOS ATRASADOS)',
    type: 'non_operational',
    categoryGroup: 'DESPESAS NOP',
    dreGroup: 'DNOP',
    description: 'Impostos municipais atrasados',
    examples: ['IMPOSTO MUNICIPAL ATRASADO', 'DIVIDA ATIVA MUNICIPAL']
  },
  {
    name: 'MULTAS/AUTOS DE INFRAÇÃO',
    type: 'non_operational',
    categoryGroup: 'DESPESAS NOP',
    dreGroup: 'DNOP',
    description: 'Multas e autos de infração',
    examples: ['MULTA', 'AUTO INFRACAO', 'PENALIDADE']
  },
  {
    name: 'JUROS DIVERSOS',
    type: 'non_operational',
    categoryGroup: 'DESPESAS NOP',
    dreGroup: 'DNOP',
    description: 'Juros diversos não classificados',
    examples: ['JUROS', 'ENCARGOS', 'MORA']
  },

  // ============================================
  // MOVIMENTAÇÕES FINANCEIRAS (dreGroup: EMP/TRANSF)
  // ============================================
  {
    name: 'EMPRÉSTIMOS (+)',
    type: 'financial_movement',
    categoryGroup: 'EMPRÉSTIMOS',
    dreGroup: 'EMP',
    description: 'Entrada de empréstimos',
    examples: ['EMPRESTIMO RECEBIDO', 'CREDITO EMPRESTIMO', 'LIBERACAO EMPRESTIMO']
  },
  {
    name: 'EMPRÉSTIMOS (-)',
    type: 'financial_movement',
    categoryGroup: 'EMPRÉSTIMOS',
    dreGroup: 'EMP',
    description: 'Pagamento de empréstimos',
    examples: ['PAGAMENTO EMPRESTIMO', 'PARCELA EMPRESTIMO', 'AMORTIZACAO']
  },
  {
    name: 'TRANSFERÊNCIAS (+)',
    type: 'financial_movement',
    categoryGroup: 'TRANSFERÊNCIAS',
    dreGroup: 'TRANSF',
    description: 'Transferências recebidas entre contas',
    examples: ['TRANSFERENCIA RECEBIDA', 'TED RECEBIDO', 'CREDITO TRANSFERENCIA']
  },
  {
    name: 'TRANSFERÊNCIAS (-)',
    type: 'financial_movement',
    categoryGroup: 'TRANSFERÊNCIAS',
    dreGroup: 'TRANSF',
    description: 'Transferências enviadas entre contas',
    examples: ['TRANSFERENCIA ENVIADA', 'TED ENVIADO', 'DEBITO TRANSFERENCIA']
  },

  // ============================================
  // CATEGORIA ESPECIAL - SALDO INICIAL
  // ============================================
  {
    name: 'Saldo Inicial',
    type: 'financial_movement',
    categoryGroup: 'TRANSFERÊNCIAS',
    dreGroup: 'TRANSF',
    description: 'Ajustes de saldo inicial e checkpoints (ignorado em relatórios)',
    examples: ['SALDO ANTERIOR', 'SALDO TOTAL', 'SALDO DIA', 'SALDO INICIAL']
  }
];

// Gerar as categorias com IDs sequenciais
let categoryId = 1;

export const mockCategories: Category[] = categoryDefinitions.map((def) => ({
  id: String(categoryId++),
  name: def.name,
  type: def.type,
  colorHex: groupColors[def.categoryGroup],
  icon: groupIcons[def.categoryGroup],
  description: def.description,
  examples: def.examples,
  categoryGroup: def.categoryGroup,
  dreGroup: def.dreGroup,
  totalAmount: 0,
  transactionCount: 0,
  percentage: 0,
}));

// Configuração dos tipos de categoria
export const categoryTypes = [
  {
    value: 'revenue',
    label: 'Receitas',
    colorHex: '#22C55E',
    color: '#22C55E',
    description: 'Todas as entradas de dinheiro'
  },
  {
    value: 'variable_cost',
    label: 'Custos Variáveis',
    colorHex: '#3B82F6',
    color: '#3B82F6',
    description: 'Custos que variam com o volume de vendas'
  },
  {
    value: 'fixed_cost',
    label: 'Custos Fixos',
    colorHex: '#EF4444',
    color: '#EF4444',
    description: 'Custos fixos mensais'
  },
  {
    value: 'non_operational',
    label: 'Não Operacionais',
    colorHex: '#8B5CF6',
    color: '#8B5CF6',
    description: 'Tributos, custos financeiros e despesas não operacionais'
  },
  {
    value: 'financial_movement',
    label: 'Movimentações Financeiras',
    colorHex: '#06B6D4',
    color: '#06B6D4',
    description: 'Empréstimos, transferências e ajustes de saldo'
  }
];

// Configuração dos grupos de categoria (categoryGroup)
export const categoryGroups: Array<{ value: CategoryGroup; label: string; dreGroup: DreGroupType }> = [
  // Receitas
  { value: 'RECEITAS BRUTAS', label: 'Receitas Brutas', dreGroup: 'RoB' },
  { value: 'RECEITAS NOP', label: 'Receitas Não Operacionais', dreGroup: 'RNOP' },
  // Custos Variáveis
  { value: 'VENDAS', label: 'Vendas', dreGroup: 'CV' },
  { value: 'CPV/CMV', label: 'CPV/CMV', dreGroup: 'CV' },
  // Custos Fixos
  { value: 'PESSOAL', label: 'Pessoal', dreGroup: 'CF' },
  { value: 'DIRETORIA', label: 'Diretoria', dreGroup: 'CF' },
  { value: 'VEÍCULOS', label: 'Veículos', dreGroup: 'CF' },
  { value: 'OCUPAÇÃO', label: 'Ocupação', dreGroup: 'CF' },
  { value: 'UTILIDADES', label: 'Utilidades', dreGroup: 'CF' },
  { value: 'COMUNICAÇÃO', label: 'Comunicação', dreGroup: 'CF' },
  { value: 'SERVIÇOS', label: 'Serviços', dreGroup: 'CF' },
  { value: 'MANUTENÇÃO', label: 'Manutenção', dreGroup: 'CF' },
  { value: 'MATERIAIS', label: 'Materiais', dreGroup: 'CF' },
  { value: 'OUTROS CF', label: 'Outros Custos Fixos', dreGroup: 'CF' },
  // Não Operacionais
  { value: 'TRIBUTOS', label: 'Tributos', dreGroup: 'TDCF' },
  { value: 'CUSTO FINANCEIRO', label: 'Custo Financeiro', dreGroup: 'TDCF' },
  { value: 'DESPESAS NOP', label: 'Despesas Não Operacionais', dreGroup: 'DNOP' },
  // Movimentações
  { value: 'EMPRÉSTIMOS', label: 'Empréstimos', dreGroup: 'EMP' },
  { value: 'TRANSFERÊNCIAS', label: 'Transferências', dreGroup: 'TRANSF' },
];

// Regras automáticas baseadas nas categorias
export const mockAutoRules: AutoRule[] = mockCategories.slice(0, 20).map((cat, index) => ({
  id: String(index + 1),
  category: cat.name,
  pattern: cat.name,
  type: 'exact' as const,
  accuracy: 100,
  status: 'active' as const
}));

// Sugestões para nova categoria
export const categorySuggestions = {
  names: ['Outras Despesas', 'Receitas Eventuais', 'Investimentos'],
  descriptions: ['Categorias adicionais para organizar finanças'],
  colors: ['#22C55E', '#3B82F6', '#EF4444']
};
