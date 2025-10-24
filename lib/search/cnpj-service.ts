export interface CNPJInfo {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  situacao: 'ATIVA' | 'INAPTA' | 'BAIXADA' | 'SUSPENSA';
  dataAbertura: string;
  cnaePrincipal: {
    codigo: string;
    descricao: string;
  };
  naturezaJuridica: {
    codigo: string;
    descricao: string;
  };
  endereco?: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
  };
  telefone?: string;
  email?: string;
}

// Serviço para validação e consulta de CNPJ
export class CNPJService {
  private static instance: CNPJService;
  private readonly cache = new Map<string, CNPJInfo>();
  private readonly cacheTimeout = 24 * 60 * 60 * 1000; // 24 horas

  private constructor() {}

  static getInstance(): CNPJService {
    if (!CNPJService.instance) {
      CNPJService.instance = new CNPJService();
    }
    return CNPJService.instance;
  }

  // Validar formato do CNPJ
  static validarCNPJ(cnpj: string): boolean {
    const cnpjLimpo = cnpj.replace(/[^\d]/g, '');

    if (cnpjLimpo.length !== 14) return false;

    // CNPJs conhecidos inválidos
    const cnpjInvalidos = [
      '00000000000000',
      '11111111111111',
      '22222222222222',
      '33333333333333',
      '44444444444444',
      '55555555555555',
      '66666666666666',
      '77777777777777',
      '88888888888888',
      '99999999999999'
    ];

    if (cnpjInvalidos.includes(cnpjLimpo)) return false;

    // Validação dos dígitos verificadores
    let tamanho = cnpjLimpo.length - 2;
    let numeros = cnpjLimpo.substring(0, tamanho);
    let digitos = cnpjLimpo.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0))) return false;

    tamanho = tamanho + 1;
    numeros = cnpjLimpo.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);

    return resultado === parseInt(digitos.charAt(1));
  }

  // Formatar CNPJ
  static formatarCNPJ(cnpj: string): string {
    const cnpjLimpo = cnpj.replace(/[^\d]/g, '');

    if (cnpjLimpo.length !== 14) return cnpj;

    return cnpjLimpo.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    );
  }

  // Extrair CNPJ de texto
  static extrairCNPJ(texto: string): string[] {
    const cnpjPattern = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;
    const matches = texto.match(cnpjPattern) || [];

    // Validar cada CNPJ encontrado
    return matches.filter(cnpj => CNPJService.validarCNPJ(cnpj));
  }

  // Consultar informações do CNPJ (com cache)
  async consultarCNPJ(cnpj: string): Promise<CNPJInfo | null> {
    const cnpjLimpo = cnpj.replace(/[^\d]/g, '');

    if (!CNPJService.validarCNPJ(cnpj)) {
      throw new Error('CNPJ inválido');
    }

    // Verificar cache
    const cached = this.cache.get(cnpjLimpo);
    if (cached && Date.now() - new Date(cached.dataAbertura).getTime() < this.cacheTimeout) {
      return cached;
    }

    try {
      const info = await this.buscarCNPJExterno(cnpjLimpo);
      if (info) {
        this.cache.set(cnpjLimpo, info);
      }
      return info;
    } catch (error) {
      console.error('Erro ao consultar CNPJ:', error);
      return null;
    }
  }

  // Buscar CNPJ em APIs externas (Receita Federal ou similares)
  private async buscarCNPJExterno(cnpj: string): Promise<CNPJInfo | null> {
    // Nota: Em produção, você usaria uma API real como:
    // - https://www.receitaws.com.br/v1/cnpj/{cnpj}
    // - https://minhareceita.org/api/v1/{cnpj}
    // - API própria da Receita Federal

    // Por enquanto, implementar versão mock com dados realistas
    return this.gerarDadosMock(cnpj);
  }

  // Gerar dados mockados para testes
  private gerarDadosMock(cnpj: string): CNPJInfo | null {
    const mockData: { [key: string]: CNPJInfo } = {
      '23261898000132': {
        cnpj: '23.261.898/0001-32',
        razaoSocial: 'IFOOD COMERCIO E SERVICOS DE ALIMENTACAO LTDA',
        nomeFantasia: 'IFOOD',
        situacao: 'ATIVA',
        dataAbertura: '2015-05-26',
        cnaePrincipal: {
          codigo: '6311900',
          descricao: 'Tratamento de dados, provedores de serviços de aplicação e serviços de hospedagem na internet'
        },
        naturezaJuridica: {
          codigo: '206-2',
          descricao: 'Sociedade Empresária Limitada'
        },
        endereco: {
          logradouro: 'Avenida Brigadeiro Faria Lima',
          numero: '1842',
          complemento: 'Cj 42',
          bairro: 'Jardim Paulistano',
          municipio: 'São Paulo',
          uf: 'SP',
          cep: '01451-001'
        },
        telefone: '(11) 3003-1315',
        email: 'suporte@ifood.com.br'
      },
      '21862419000136': {
        cnpj: '21.862.419/0001-36',
        razaoSocial: 'UBER DO BRASIL TECNOLOGIA LTDA',
        nomeFantasia: 'UBER BRASIL',
        situacao: 'ATIVA',
        dataAbertura: '2014-12-19',
        cnaePrincipal: {
          codigo: '4923000',
          descricao: 'Transporte rodoviário de passageiros, sob regime de fretamento'
        },
        naturezaJuridica: {
          codigo: '206-2',
          descricao: 'Sociedade Empresária Limitada'
        },
        endereco: {
          logradouro: 'Avenida Presidente Juscelino Kubitschek',
          numero: '1909',
          bairro: 'Vila Nova Conceição',
          municipio: 'São Paulo',
          uf: 'SP',
          cep: '04543-907'
        },
        telefone: '(11) 3003-1401',
        email: 'suporte@uber.com'
      },
      '25767302000149': {
        cnpj: '25.767.302/0001-49',
        razaoSocial: 'NETFLIX SERVICOS DE ENTRETENIMENTO BRASIL LTDA',
        nomeFantasia: 'NETFLIX BRASIL',
        situacao: 'ATIVA',
        dataAbertura: '2015-09-21',
        cnaePrincipal: {
          codigo: '6311900',
          descricao: 'Tratamento de dados, provedores de serviços de aplicação e serviços de hospedagem na internet'
        },
        naturezaJuridica: {
          codigo: '206-2',
          descricao: 'Sociedade Empresária Limitada'
        },
        endereco: {
          logradouro: 'Avenida Brigadeiro Faria Lima',
          numero: '1384',
          bairro: 'Pinheiros',
          municipio: 'São Paulo',
          uf: 'SP',
          cep: '01452-002'
        },
        telefone: '(11) 3003-3100',
        email: 'help@netflix.com'
      }
    };

    return mockData[cnpj] || null;
  }

  // Obter categoria baseada no CNAE
  static getCategoriaPorCNAE(codigoCNAE: string): string {
    const cnaeMap: { [key: string]: string } = {
      // Serviços de Tecnologia
      '6311900': 'Tecnologia e Software',
      '6201500': 'Tecnologia e Software',
      '6202300': 'Tecnologia e Software',
      '6203100': 'Tecnologia e Software',
      '6209100': 'Tecnologia e Software',
      '6209900': 'Tecnologia e Software',

      // Serviços de Transporte
      '4923000': 'Logística e Distribuição',
      '4924800': 'Logística e Distribuição',
      '4910000': 'Logística e Distribuição',
      '4921300': 'Logística e Distribuição',

      // Serviços de Alimentação
      '5611200': 'Custos de Produtos',
      '5612100': 'Custos de Produtos',
      '5620100': 'Custos de Produtos',

      // Serviços Profissionais
      '6920601': 'Serviços Profissionais',
      '6920602': 'Serviços Profissionais',
      '7020400': 'Serviços Profissionais',
      '7112000': 'Serviços Profissionais',

      // Comércio
      '4771700': 'Custos de Produtos',
      '4772500': 'Custos de Produtos',
      '4773300': 'Custos de Produtos',

      // Serviços Financeiros
      '6421200': 'Serviços Financeiros',
      '6422100': 'Serviços Financeiros',
      '6422300': 'Serviços Financeiros',
      '6423900': 'Serviços Financeiros',

      // Saúde
      '8610100': 'Serviços Profissionais',
      '8620100': 'Serviços Profissionais',
      '8630500': 'Serviços Profissionais',

      // Educação
      '8513900': 'Serviços Profissionais',
      '8520100': 'Serviços Profissionais',

      // Construção
      '4120400': 'Manutenção e Serviços',
      '4321500': 'Manutenção e Serviços',
      '4329500': 'Manutenção e Serviços',

      // Utilidades
      '3530100': 'Utilidades e Insumos',
      '3600600': 'Utilidades e Insumos',
      '3701100': 'Utilidades e Insumos'
    };

    // Primeiro tenta匹配 exato
    if (cnaeMap[codigoCNAE]) {
      return cnaeMap[codigoCNAE];
    }

    // Depois tenta pelos primeiros dígitos (classe)
    const classe = codigoCNAE.substring(0, 4);
    if (cnaeMap[classe + '0000']) {
      return cnaeMap[classe + '0000'];
    }

    // Finalmente tenta grupo (3 primeiros dígitos)
    const grupo = codigoCNAE.substring(0, 3) + '00000';
    if (cnaeMap[grupo]) {
      return cnaeMap[grupo];
    }

    return 'Outras Despesas';
  }

  // Limpar cache
  clearCache(): void {
    this.cache.clear();
  }

  // Obter estatísticas
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // TODO: Implementar hit rate tracking
    };
  }
}