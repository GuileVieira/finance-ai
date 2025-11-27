export interface Company {
  id: string;
  name: string;
  cnpj: string;
  corporate_name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  logo_url?: string;
  industry?: string;
  monthly_revenue_range?: number;
  created_at: string;
  updated_at: string;
  active: boolean;
  created_by: string;
}

export interface CompanyFormData {
  name: string;
  cnpj: string;
  corporate_name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  logo_url?: string;
  industry?: string;
  monthly_revenue_range?: number;
  active?: boolean;
}

export interface Industry {
  value: string;
  label: string;
  description: string;
}

export const industries: Industry[] = [
  {
    value: 'technology',
    label: 'Tecnologia',
    description: 'Software, hardware e serviços de TI'
  },
  {
    value: 'retail',
    label: 'Varejo',
    description: 'Comércio de produtos e serviços'
  },
  {
    value: 'services',
    label: 'Serviços',
    description: 'Prestação de serviços diversos'
  },
  {
    value: 'manufacturing',
    label: 'Indústria',
    description: 'Produção e manufatura'
  },
  {
    value: 'construction',
    label: 'Construção Civil',
    description: 'Construção e reformas'
  },
  {
    value: 'healthcare',
    label: 'Saúde',
    description: 'Hospitais, clínicas e serviços médicos'
  },
  {
    value: 'education',
    label: 'Educação',
    description: 'Escolas, faculdades e cursos'
  },
  {
    value: 'finance',
    label: 'Finanças',
    description: 'Bancos, fintechs e serviços financeiros'
  },
  {
    value: 'consulting',
    label: 'Consultoria',
    description: 'Assessoria e consultoria empresarial'
  },
  {
    value: 'other',
    label: 'Outros',
    description: 'Outros segmentos de negócio'
  }
];

export const revenueRanges = [
  { value: '0-10000', label: 'Até R$ 10.000', min: 0, max: 10000 },
  { value: '10000-50000', label: 'R$ 10.000 - R$ 50.000', min: 10000, max: 50000 },
  { value: '50000-100000', label: 'R$ 50.000 - R$ 100.000', min: 50000, max: 100000 },
  { value: '100000-500000', label: 'R$ 100.000 - R$ 500.000', min: 100000, max: 500000 },
  { value: '500000-1000000', label: 'R$ 500.000 - R$ 1.000.000', min: 500000, max: 1000000 },
  { value: '1000000+', label: 'Acima de R$ 1.000.000', min: 1000000, max: Infinity }
];

export const getIndustryLabel = (value: string) => {
  const industry = industries.find(i => i.value === value);
  return industry?.label || value;
};

export const getRevenueRangeLabel = (value: string) => {
  const range = revenueRanges.find(r => r.value === value);
  return range?.label || value;
};

// Função para validar CNPJ
export const validateCNPJ = (cnpj: string): boolean => {
  // Remove caracteres não numéricos
  cnpj = cnpj.replace(/\D/g, '');

  // Verifica se tem 14 dígitos
  if (cnpj.length !== 14) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cnpj)) return false;

  // Cálculo dos dígitos verificadores
  let length = cnpj.length - 2;
  let numbers = cnpj.substring(0, length);
  const digits = cnpj.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  length = length + 1;
  numbers = cnpj.substring(0, length);
  sum = 0;
  pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
};

// Função para formatar CNPJ
export const formatCNPJ = (cnpj: string | null | undefined): string => {
  if (!cnpj) return '';
  const cleaned = cnpj.replace(/\D/g, '');
  return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
};

// Função para formatar CEP
export const formatCEP = (cep: string | null | undefined): string => {
  if (!cep) return '';
  const cleaned = cep.replace(/\D/g, '');
  return cleaned.replace(/^(\d{5})(\d{3})$/, '$1-$2');
};