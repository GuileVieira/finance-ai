-- Migração: Adicionar descrições às categorias para melhorar contexto do agente de IA
-- As descrições ajudam o agente a tomar melhores decisões de categorização

-- RECEITAS
UPDATE categories SET description = 'Venda de mercadorias e produtos para clientes' 
WHERE name = 'Vendas de Produtos' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Prestação de serviços especializados e consultoria' 
WHERE name = 'Vendas de Serviços' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Rendimentos de aplicações financeiras, juros e investimentos' 
WHERE name = 'Receitas Financeiras' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Aluguel de imóveis e receitas de sublocação recebidas' 
WHERE name = 'Receitas de Aluguéis' AND (description IS NULL OR description = '');

-- CUSTOS FIXOS (Pessoal e RH)
UPDATE categories SET description = 'Pagamento do décimo terceiro salário aos funcionários' 
WHERE name = '13º SALARIO' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Pagamento de aluguel de imóvel comercial ou sede' 
WHERE name = 'ALUGUEL' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Aluguel de máquinas, veículos e equipamentos operacionais' 
WHERE name = 'ALUGUEL DE MÁQUINAS E EQUIPAMENTOS' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Plano de saúde e convênio médico para funcionários' 
WHERE name = 'ASSISTÊNCIA MÉDICA' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Convênio e plano odontológico para funcionários' 
WHERE name = 'ASSISTÊNCIA ODONTOLÓGICA' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Taxas e serviços cartoriais, reconhecimento de firma, autenticações' 
WHERE name = 'CARTÓRIO' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Serviços de limpeza, conservação e manutenção do ambiente de trabalho' 
WHERE name = 'CONSERVAÇÃO E LIMPEZA' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Serviços de consultoria empresarial, financeira ou técnica' 
WHERE name = 'CONSULTORIA' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Fornecimento de energia elétrica para o estabelecimento' 
WHERE name = 'ENERGIA ELETRICA' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Exames médicos obrigatórios de admissão e periódicos dos funcionários' 
WHERE name = 'EXAME ADMISSIONAL/PERIODICO' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Depósito do Fundo de Garantia do Tempo de Serviço dos funcionários' 
WHERE name = 'FGTS' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Pagamento de prestadores de serviço pessoa jurídica (freelancers, consultores)' 
WHERE name = 'FOLHA PJ' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Pagamento de férias e abono de férias aos funcionários' 
WHERE name = 'FÉRIAS' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Contribuição previdenciária patronal e do funcionário' 
WHERE name = 'INSS' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Serviço de internet e banda larga para o estabelecimento' 
WHERE name = 'INTERNET' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Licenças de software, alvarás e permissões diversas' 
WHERE name = 'LICENÇAS DIVERSAS' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Manutenção preventiva e corretiva de equipamentos' 
WHERE name = 'MANUTENÇÃO DE EQUIPAMENTOS' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Manutenção de computadores, servidores e infraestrutura de TI' 
WHERE name = 'MANUTENÇÃO DE HARDWARE' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Manutenção do prédio, instalações elétricas, hidráulicas e estruturais' 
WHERE name = 'MANUTENÇÃO PREDIAL' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Materiais de limpeza e higiene do ambiente de trabalho' 
WHERE name = 'MATERIAL DE LIMPEZA' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Remuneração dos sócios administradores (pró-labore)' 
WHERE name = 'PRO LABORE' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Folha de pagamento de salários dos funcionários CLT' 
WHERE name = 'SALARIOS' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Serviços jurídicos e advocatícios' 
WHERE name = 'SERVIÇOS DE ADVOCACIA' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Serviços contábeis, escrituração fiscal e obrigações acessórias' 
WHERE name = 'SERVIÇOS DE CONTABILIDADE' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Assinaturas de softwares, SaaS e ferramentas digitais' 
WHERE name = 'SOFTWARES' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Serviço de telefonia fixa comercial' 
WHERE name = 'TELEFONES FIXOS' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Serviço de telefonia móvel corporativa' 
WHERE name = 'TELEFONES MÓVEIS' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Benefício de alimentação para funcionários (VA)' 
WHERE name = 'VALE ALIMENTAÇÃO' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Benefício de refeição para funcionários (VR)' 
WHERE name = 'VALE REFEIÇÃO' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Benefício de transporte para funcionários (VT)' 
WHERE name = 'VALE TRANSPORTE' AND (description IS NULL OR description = '');

-- CUSTOS VARIÁVEIS
UPDATE categories SET description = 'Comissões de vendas pagas a vendedores e representantes' 
WHERE name = 'COMISSÕES' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Serviços postais, envio de correspondências e documentos' 
WHERE name = 'CORREIOS' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Despesas com transporte urbano, táxi, aplicativos de mobilidade' 
WHERE name = 'DESP. LOCOMOÇÃO' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Passagens aéreas, hospedagem e diárias em viagens de negócios' 
WHERE name = 'DESPESAS COM VIAGENS' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Gastos com campanhas de marketing, publicidade e propaganda' 
WHERE name = 'MARKETING E PUBLICIDADE' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Caixas, plásticos e materiais para embalar produtos' 
WHERE name = 'MATERIAL DE EMBALAGEM' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Papelaria, canetas, papel e suprimentos de escritório' 
WHERE name = 'MATERIAL DE ESCRITÓRIO' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Serviços de transporte, frete e logística de mercadorias' 
WHERE name = 'OPERADORES LOGÍSTICOS' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Pagamento de serviços prestados por pessoa física (autônomos)' 
WHERE name = 'SERVIÇOS PRESTADOS PF' AND (description IS NULL OR description = '');

-- NÃO OPERACIONAIS (Impostos e Tributos)
UPDATE categories SET description = 'Contribuição para Financiamento da Seguridade Social' 
WHERE name = 'COFINS' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Contribuição sindical obrigatória ou assistencial' 
WHERE name = 'CONTRIBUICAO SINDICAL' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Custas processuais e despesas judiciais' 
WHERE name = 'CUSTAS JUDICIAIS' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Financiamento de veículos, máquinas e equipamentos via FINAME ou leasing' 
WHERE name = 'LEASING / FINAME' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Despesas diversas não classificadas em outras categorias' 
WHERE name = 'OUTRAS DESPESAS NOP' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Outros tributos federais, estaduais ou municipais' 
WHERE name = 'OUTROS TRIBUTOS' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Seguro de vida em grupo para funcionários' 
WHERE name = 'SEGUROS DE VIDA' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Seguros patrimoniais, de responsabilidade civil e outros' 
WHERE name = 'SEGUROS GERAIS' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Taxas e tarifas cobradas pelo banco (TED, DOC, manutenção)' 
WHERE name = 'TARIFAS BANCÁRIAS' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Ajustes de saldo inicial e checkpoints de saldo (ignorado em relatórios)' 
WHERE name = 'Saldo Inicial' AND (description IS NULL OR description = '');
