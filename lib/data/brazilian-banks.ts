/**
 * Lista de bancos brasileiros com códigos COMPE
 * Fonte: Banco Central do Brasil
 * https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.pdf
 */

export interface BrazilianBank {
  code: string;      // Código COMPE (3 dígitos)
  ispb?: string;     // Código ISPB (8 dígitos)
  name: string;      // Nome completo
  shortName: string; // Nome curto/fantasia
  color: string;     // Cor do logo para UI
}

export const brazilianBanks: BrazilianBank[] = [
  // ═══════════════════════════════════════════════════════════════════
  // GRANDES BANCOS
  // ═══════════════════════════════════════════════════════════════════
  { code: '001', ispb: '00000000', name: 'Banco do Brasil S.A.', shortName: 'Banco do Brasil', color: '#FFCD00' },
  { code: '033', ispb: '90400888', name: 'Banco Santander (Brasil) S.A.', shortName: 'Santander', color: '#EC0000' },
  { code: '104', ispb: '00360305', name: 'Caixa Econômica Federal', shortName: 'Caixa', color: '#0066B3' },
  { code: '237', ispb: '60746948', name: 'Banco Bradesco S.A.', shortName: 'Bradesco', color: '#CC092F' },
  { code: '341', ispb: '60701190', name: 'Itaú Unibanco S.A.', shortName: 'Itaú', color: '#FF7900' },
  { code: '399', ispb: '17298092', name: 'HSBC Bank Brasil S.A.', shortName: 'HSBC', color: '#DB0011' },
  { code: '745', ispb: '33479023', name: 'Banco Citibank S.A.', shortName: 'Citibank', color: '#003B70' },

  // ═══════════════════════════════════════════════════════════════════
  // BANCOS DIGITAIS
  // ═══════════════════════════════════════════════════════════════════
  { code: '077', ispb: '00416968', name: 'Banco Inter S.A.', shortName: 'Banco Inter', color: '#FF7A00' },
  { code: '260', ispb: '18236120', name: 'Nu Pagamentos S.A.', shortName: 'Nubank', color: '#820AD1' },
  { code: '336', ispb: '31872495', name: 'Banco C6 S.A.', shortName: 'C6 Bank', color: '#242424' },
  { code: '290', ispb: '08561701', name: 'PagSeguro Internet S.A.', shortName: 'PagBank', color: '#00A94F' },
  { code: '380', ispb: '22896431', name: 'PicPay Serviços S.A.', shortName: 'PicPay', color: '#21C25E' },
  { code: '212', ispb: '92894922', name: 'Banco Original S.A.', shortName: 'Original', color: '#00A94F' },
  { code: '637', ispb: '60889128', name: 'Banco Sofisa S.A.', shortName: 'Sofisa Direto', color: '#FF6B00' },
  { code: '323', ispb: '10573521', name: 'Mercado Pago', shortName: 'Mercado Pago', color: '#009EE3' },
  { code: '403', ispb: '37880206', name: 'Cora SCD S.A.', shortName: 'Cora', color: '#FE3E6D' },
  { code: '332', ispb: '13140088', name: 'Acesso Soluções de Pagamento S.A.', shortName: 'Acesso', color: '#00C4B3' },
  { code: '280', ispb: '23862762', name: 'Will Financeira S.A.', shortName: 'Will Bank', color: '#FFCC00' },
  { code: '335', ispb: '27098060', name: 'Banco Digio S.A.', shortName: 'Digio', color: '#0066FF' },
  { code: '197', ispb: '04184779', name: 'Stone Pagamentos S.A.', shortName: 'Stone', color: '#00A868' },

  // ═══════════════════════════════════════════════════════════════════
  // COOPERATIVAS
  // ═══════════════════════════════════════════════════════════════════
  { code: '748', ispb: '01181521', name: 'Banco Cooperativo Sicredi S.A.', shortName: 'Sicredi', color: '#0F8042' },
  { code: '756', ispb: '02038232', name: 'Banco Cooperativo Sicoob S.A.', shortName: 'Sicoob', color: '#00A693' },
  { code: '085', ispb: '05463212', name: 'Cooperativa Central de Crédito - Ailos', shortName: 'Ailos', color: '#00A3E0' },
  { code: '089', ispb: '62109566', name: 'Cooperativa de Crédito Rural da Região da Mogiana', shortName: 'Credisan', color: '#0066B3' },
  { code: '091', ispb: '01634601', name: 'Unicred Central RS', shortName: 'Unicred', color: '#00529B' },
  { code: '136', ispb: '00315557', name: 'Unicred do Brasil', shortName: 'Unicred', color: '#00529B' },

  // ═══════════════════════════════════════════════════════════════════
  // BANCOS REGIONAIS E ESTADUAIS
  // ═══════════════════════════════════════════════════════════════════
  { code: '041', ispb: '92702067', name: 'Banco do Estado do Rio Grande do Sul S.A.', shortName: 'Banrisul', color: '#003366' },
  { code: '004', ispb: '62318007', name: 'Banco do Nordeste do Brasil S.A.', shortName: 'BNB', color: '#E31837' },
  { code: '021', ispb: '33870163', name: 'Banco do Estado do Espírito Santo S.A.', shortName: 'Banestes', color: '#0066B3' },
  { code: '047', ispb: '13009717', name: 'Banco do Estado de Sergipe S.A.', shortName: 'Banese', color: '#003366' },
  { code: '070', ispb: '00000208', name: 'Banco de Brasília S.A.', shortName: 'BRB', color: '#003399' },
  { code: '037', ispb: '04913711', name: 'Banco do Estado do Pará S.A.', shortName: 'Banpará', color: '#00529B' },
  { code: '024', ispb: '03323840', name: 'Banco de Pernambuco S.A.', shortName: 'Bandepe', color: '#E31837' },

  // ═══════════════════════════════════════════════════════════════════
  // BANCOS MÉDIOS E DE INVESTIMENTO
  // ═══════════════════════════════════════════════════════════════════
  { code: '422', ispb: '58160789', name: 'Banco Safra S.A.', shortName: 'Safra', color: '#003366' },
  { code: '655', ispb: '59588111', name: 'Banco Votorantim S.A.', shortName: 'Votorantim', color: '#FF6600' },
  { code: '318', ispb: '61186680', name: 'Banco BMG S.A.', shortName: 'BMG', color: '#FF6600' },
  { code: '389', ispb: '17184037', name: 'Banco Mercantil do Brasil S.A.', shortName: 'Mercantil', color: '#003366' },
  { code: '218', ispb: '71027866', name: 'Banco BS2 S.A.', shortName: 'BS2', color: '#FF6600' },
  { code: '208', ispb: '30306294', name: 'Banco BTG Pactual S.A.', shortName: 'BTG Pactual', color: '#003366' },
  { code: '394', ispb: '07207996', name: 'Banco Bradesco Financiamentos S.A.', shortName: 'Bradesco Financ.', color: '#CC092F' },
  { code: '746', ispb: '30723886', name: 'Banco Modal S.A.', shortName: 'Modal', color: '#003366' },
  { code: '623', ispb: '59118133', name: 'Banco Pan S.A.', shortName: 'Banco Pan', color: '#FF6600' },
  { code: '633', ispb: '68900810', name: 'Banco Rendimento S.A.', shortName: 'Rendimento', color: '#003366' },
  { code: '741', ispb: '00517645', name: 'Banco Ribeirão Preto S.A.', shortName: 'BRP', color: '#003366' },
  { code: '719', ispb: '07450604', name: 'Banco Banif S.A.', shortName: 'Banif', color: '#003366' },
  { code: '707', ispb: '62232889', name: 'Banco Daycoval S.A.', shortName: 'Daycoval', color: '#003366' },
  { code: '739', ispb: '00558456', name: 'Banco Cetelem S.A.', shortName: 'Cetelem', color: '#009640' },
  { code: '743', ispb: '00795423', name: 'Banco Semear S.A.', shortName: 'Semear', color: '#003366' },
  { code: '069', ispb: '61033106', name: 'Banco Crefisa S.A.', shortName: 'Crefisa', color: '#003366' },
  { code: '654', ispb: '92874270', name: 'Banco A.J. Renner S.A.', shortName: 'Renner', color: '#E31837' },
  { code: '456', ispb: '60498557', name: 'Banco MUFG Brasil S.A.', shortName: 'MUFG', color: '#E60012' },

  // ═══════════════════════════════════════════════════════════════════
  // BANCOS DE DESENVOLVIMENTO
  // ═══════════════════════════════════════════════════════════════════
  { code: '003', ispb: '04902979', name: 'Banco da Amazônia S.A.', shortName: 'BASA', color: '#00529B' },
  { code: '029', ispb: '33657248', name: 'Banco Itaú Consignado S.A.', shortName: 'Itaú Consignado', color: '#FF7900' },

  // ═══════════════════════════════════════════════════════════════════
  // BANCOS DE FINANCIAMENTO
  // ═══════════════════════════════════════════════════════════════════
  { code: '121', ispb: '10664513', name: 'Banco Agibank S.A.', shortName: 'Agibank', color: '#00A550' },
  { code: '246', ispb: '28195667', name: 'Banco ABC Brasil S.A.', shortName: 'ABC Brasil', color: '#003366' },
  { code: '025', ispb: '03012230', name: 'Banco Alfa S.A.', shortName: 'Alfa', color: '#003366' },
  { code: '213', ispb: '54403563', name: 'Banco Arbi S.A.', shortName: 'Arbi', color: '#003366' },
  { code: '019', ispb: '09274232', name: 'Banco Azteca do Brasil S.A.', shortName: 'Azteca', color: '#00A550' },
  { code: '752', ispb: '01522368', name: 'Banco BNP Paribas Brasil S.A.', shortName: 'BNP Paribas', color: '#00965E' },
  { code: '107', ispb: '15114366', name: 'Banco Bocom BBM S.A.', shortName: 'Bocom BBM', color: '#003366' },
  { code: '063', ispb: '04866275', name: 'Banco Bradescard S.A.', shortName: 'Bradescard', color: '#CC092F' },
  { code: '036', ispb: '06271464', name: 'Banco Bradesco BBI S.A.', shortName: 'Bradesco BBI', color: '#CC092F' },
  { code: '122', ispb: '33147315', name: 'Banco Bradesco BERJ S.A.', shortName: 'Bradesco BERJ', color: '#CC092F' },
  { code: '204', ispb: '59438325', name: 'Banco Bradesco Cartões S.A.', shortName: 'Bradesco Cartões', color: '#CC092F' },
  { code: '263', ispb: '33885724', name: 'Banco Cacique S.A.', shortName: 'Cacique', color: '#003366' },
  { code: '473', ispb: '33466988', name: 'Banco Caixa Geral - Brasil S.A.', shortName: 'Caixa Geral', color: '#003366' },
  { code: '412', ispb: '15173776', name: 'Banco Capital S.A.', shortName: 'Capital', color: '#003366' },
  { code: '040', ispb: '33132044', name: 'Banco Cargill S.A.', shortName: 'Cargill', color: '#003366' },
  { code: '266', ispb: '33132044', name: 'Banco Cédula S.A.', shortName: 'Cédula', color: '#003366' },
  { code: '320', ispb: '07450604', name: 'Banco China Construction Bank Brasil', shortName: 'CCB Brasil', color: '#003366' },
  { code: '477', ispb: '33042151', name: 'Banco Citibank S.A.', shortName: 'Citibank', color: '#003B70' },
  { code: '081', ispb: '10866788', name: 'Banco Seguro S.A.', shortName: 'BBS', color: '#003366' },
  { code: '097', ispb: '04632856', name: 'Cooperativa Central de Crédito Noroeste Brasileiro', shortName: 'Credisis', color: '#003366' },
  { code: '487', ispb: '62331228', name: 'Deutsche Bank S.A. - Banco Alemão', shortName: 'Deutsche Bank', color: '#0018A8' },
  { code: '064', ispb: '04913129', name: 'Goldman Sachs do Brasil Banco Múltiplo S.A.', shortName: 'Goldman Sachs', color: '#003366' },
  { code: '062', ispb: '03012230', name: 'Hipercard Banco Múltiplo S.A.', shortName: 'Hipercard', color: '#E31837' },
  { code: '074', ispb: '03017677', name: 'Banco J. Safra S.A.', shortName: 'J. Safra', color: '#003366' },
  { code: '376', ispb: '33172537', name: 'Banco J.P. Morgan S.A.', shortName: 'J.P. Morgan', color: '#003366' },
  { code: '757', ispb: '02318507', name: 'Banco Keb Hana do Brasil S.A.', shortName: 'Keb Hana', color: '#003366' },
  { code: '600', ispb: '59118133', name: 'Banco Luso Brasileiro S.A.', shortName: 'Luso Brasileiro', color: '#003366' },
  { code: '243', ispb: '33923798', name: 'Banco Máxima S.A.', shortName: 'Máxima', color: '#003366' },
  { code: '613', ispb: '60850229', name: 'Banco Omni S.A.', shortName: 'Omni', color: '#003366' },
  { code: '254', ispb: '14388334', name: 'Banco Paraná Banco S.A.', shortName: 'Paraná Banco', color: '#003366' },
  { code: '125', ispb: '45246410', name: 'Banco Plural S.A.', shortName: 'Plural', color: '#003366' },
  { code: '611', ispb: '61024352', name: 'Banco Paulista S.A.', shortName: 'Paulista', color: '#003366' },
  { code: '643', ispb: '62144175', name: 'Banco Pine S.A.', shortName: 'Pine', color: '#003366' },
  { code: '747', ispb: '01023570', name: 'Banco Rabobank International Brasil S.A.', shortName: 'Rabobank', color: '#FF6600' },
  { code: '120', ispb: '33603457', name: 'Banco Rodobens S.A.', shortName: 'Rodobens', color: '#003366' },
  { code: '453', ispb: '60850229', name: 'Banco Rural S.A.', shortName: 'Rural', color: '#003366' },
  { code: '422', ispb: '58160789', name: 'Banco Safra S.A.', shortName: 'Safra', color: '#003366' },
  { code: '751', ispb: '29030467', name: 'Scotiabank Brasil S.A. Banco Múltiplo', shortName: 'Scotiabank', color: '#EC111A' },
  { code: '366', ispb: '61182408', name: 'Banco Société Générale Brasil S.A.', shortName: 'Société Générale', color: '#E31837' },
  { code: '637', ispb: '60889128', name: 'Banco Sofisa S.A.', shortName: 'Sofisa', color: '#FF6B00' },
  { code: '464', ispb: '60518222', name: 'Banco Sumitomo Mitsui Brasileiro S.A.', shortName: 'Sumitomo Mitsui', color: '#003366' },
  { code: '634', ispb: '17351180', name: 'Banco Triângulo S.A.', shortName: 'Triângulo', color: '#003366' },
  { code: '655', ispb: '59588111', name: 'Banco Votorantim S.A.', shortName: 'Votorantim', color: '#FF6600' },
  { code: '610', ispb: '78626983', name: 'Banco VR S.A.', shortName: 'VR', color: '#003366' },
  { code: '119', ispb: '13720915', name: 'Banco Western Union do Brasil S.A.', shortName: 'Western Union', color: '#FFCC00' },

  // ═══════════════════════════════════════════════════════════════════
  // INSTITUIÇÕES DE PAGAMENTO E FINTECHS
  // ═══════════════════════════════════════════════════════════════════
  { code: '102', ispb: '02332886', name: 'XP Investimentos S.A.', shortName: 'XP', color: '#FFCC00' },
  { code: '348', ispb: '33042953', name: 'Banco XP S.A.', shortName: 'Banco XP', color: '#FFCC00' },
  { code: '084', ispb: '02398976', name: 'Uniprime Norte do Paraná', shortName: 'Uniprime', color: '#003366' },
  { code: '180', ispb: '02685483', name: 'CM Capital Markets CCTVM Ltda', shortName: 'CM Capital', color: '#003366' },
  { code: '183', ispb: '09210106', name: 'Socred S.A.', shortName: 'Socred', color: '#003366' },
  { code: '014', ispb: '09274232', name: 'Natixis Brasil S.A.', shortName: 'Natixis', color: '#003366' },
  { code: '755', ispb: '62073200', name: 'Bank of America Merrill Lynch', shortName: 'BofA', color: '#012169' },
  { code: '188', ispb: '33775974', name: 'Ativa Investimentos S.A.', shortName: 'Ativa', color: '#003366' },
  { code: '144', ispb: '02276653', name: 'Bexs Banco de Câmbio S.A.', shortName: 'Bexs', color: '#003366' },
  { code: '126', ispb: '13009717', name: 'BR Partners Banco de Investimento S.A.', shortName: 'BR Partners', color: '#003366' },
  { code: '173', ispb: '09210106', name: 'BRL Trust DTVM S.A.', shortName: 'BRL Trust', color: '#003366' },
  { code: '092', ispb: '05463212', name: 'Brickell S.A.', shortName: 'Brickell', color: '#003366' },
  { code: '142', ispb: '02398976', name: 'Broker Brasil CC Ltda', shortName: 'Broker Brasil', color: '#003366' },
];

/**
 * Mapa para busca rápida por código
 */
const banksByCode = new Map<string, BrazilianBank>();
brazilianBanks.forEach(bank => {
  banksByCode.set(bank.code, bank);
  // Também indexar sem zeros à esquerda (ex: '1' para '001')
  banksByCode.set(bank.code.replace(/^0+/, '') || '0', bank);
});

/**
 * Busca um banco pelo código COMPE
 * @param code Código COMPE (com ou sem zeros à esquerda)
 * @returns Dados do banco ou undefined se não encontrado
 */
export function getBankByCode(code: string): BrazilianBank | undefined {
  if (!code) return undefined;

  // Normalizar código para 3 dígitos
  const normalizedCode = code.replace(/\D/g, '').padStart(3, '0');

  return banksByCode.get(normalizedCode) || banksByCode.get(code.replace(/^0+/, '') || '0');
}

/**
 * Retorna o nome do banco pelo código, ou "Banco não identificado" se não encontrar
 * @param code Código COMPE
 * @returns Nome do banco
 */
export function getBankName(code: string): string {
  const bank = getBankByCode(code);
  return bank?.shortName || `Banco ${code}`;
}

/**
 * Retorna o nome completo do banco pelo código
 * @param code Código COMPE
 * @returns Nome completo do banco
 */
export function getBankFullName(code: string): string {
  const bank = getBankByCode(code);
  return bank?.name || `Banco código ${code}`;
}

/**
 * Retorna a cor do banco pelo código
 * @param code Código COMPE
 * @returns Cor hexadecimal
 */
export function getBankColor(code: string): string {
  const bank = getBankByCode(code);
  return bank?.color || '#6B7280'; // Cinza padrão
}

/**
 * Lista todos os bancos ordenados por nome
 */
export function getAllBanksSorted(): BrazilianBank[] {
  return [...brazilianBanks].sort((a, b) => a.shortName.localeCompare(b.shortName, 'pt-BR'));
}

/**
 * Busca bancos pelo nome (parcial)
 * @param query Texto para buscar
 * @returns Lista de bancos que contêm o texto
 */
export function searchBanks(query: string): BrazilianBank[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  return brazilianBanks.filter(bank =>
    bank.name.toLowerCase().includes(normalizedQuery) ||
    bank.shortName.toLowerCase().includes(normalizedQuery) ||
    bank.code.includes(normalizedQuery)
  );
}
