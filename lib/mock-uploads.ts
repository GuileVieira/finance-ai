import { Upload, ProcessingLog } from '@/lib/types/uploads';

// Gera logs de processamento mock
const generateProcessingLogs = (status: string): ProcessingLog[] => {
  const logs: ProcessingLog[] = [
    {
      step: 'upload',
      message: 'Arquivo recebido com sucesso',
      timestamp: new Date().toISOString(),
      level: 'info'
    },
    {
      step: 'validation',
      message: 'Validando formato do arquivo',
      timestamp: new Date(Date.now() + 1000).toISOString(),
      level: 'info'
    }
  ];

  if (status === 'processing') {
    logs.push(
      {
        step: 'parsing',
        message: 'Processando transações...',
        timestamp: new Date(Date.now() + 2000).toISOString(),
        level: 'info'
      }
    );
  } else if (status === 'completed') {
    logs.push(
      {
        step: 'parsing',
        message: 'Transações processadas com sucesso',
        timestamp: new Date(Date.now() + 3000).toISOString(),
        level: 'info'
      },
      {
        step: 'categorization',
        message: 'Categorizando transações automaticamente',
        timestamp: new Date(Date.now() + 4000).toISOString(),
        level: 'info'
      },
      {
        step: 'completion',
        message: 'Processamento concluído com sucesso',
        timestamp: new Date(Date.now() + 5000).toISOString(),
        level: 'info'
      }
    );
  } else if (status === 'failed') {
    logs.push(
      {
        step: 'parsing',
        message: 'Erro ao processar arquivo: Formato inválido',
        timestamp: new Date(Date.now() + 3000).toISOString(),
        level: 'error'
      }
    );
  }

  return logs;
};

export const mockUploads: Upload[] = [
  {
    id: '1',
    company_id: '1',
    account_id: '1',
    filename: 'extrato_bb_jan_2024.ofx',
    original_name: 'Extrato Janeiro 2024.ofx',
    file_type: 'ofx',
    file_size: 45632,
    file_url: '/uploads/extrato_bb_jan_2024.ofx',
    status: 'completed',
    processing_log: generateProcessingLogs('completed'),
    total_transactions: 156,
    successful_transactions: 156,
    failed_transactions: 0,
    uploaded_at: '2024-10-24T08:30:00Z',
    processed_at: '2024-10-24T08:30:15Z',
    uploaded_by: 'user1',
    processing_time: 15
  },
  {
    id: '2',
    company_id: '1',
    account_id: '2',
    filename: 'movimentacoes_caixa_fev_2024.xlsx',
    original_name: 'Movimentações Fevereiro 2024.xlsx',
    file_type: 'xlsx',
    file_size: 234567,
    file_url: '/uploads/movimentacoes_caixa_fev_2024.xlsx',
    status: 'completed',
    processing_log: generateProcessingLogs('completed'),
    total_transactions: 89,
    successful_transactions: 87,
    failed_transactions: 2,
    uploaded_at: '2024-10-23T14:15:00Z',
    processed_at: '2024-10-23T14:15:35Z',
    uploaded_by: 'user1',
    processing_time: 35
  },
  {
    id: '3',
    company_id: '1',
    account_id: '3',
    filename: 'extrato_itau_mar_2024.ofx',
    original_name: 'Extrato Itaú Março 2024.ofx',
    file_type: 'ofx',
    file_size: 52123,
    file_url: '/uploads/extrato_itau_mar_2024.ofx',
    status: 'processing',
    processing_log: generateProcessingLogs('processing'),
    total_transactions: 0,
    successful_transactions: 0,
    failed_transactions: 0,
    uploaded_at: '2024-10-24T10:45:00Z',
    uploaded_by: 'user1'
  },
  {
    id: '4',
    company_id: '1',
    account_id: '4',
    filename: 'dados_bradesco_abr_2024.csv',
    original_name: 'Dados Bradesco Abril 2024.csv',
    file_type: 'csv',
    file_size: 128901,
    file_url: '/uploads/dados_bradesco_abr_2024.csv',
    status: 'failed',
    processing_log: generateProcessingLogs('failed'),
    total_transactions: 0,
    successful_transactions: 0,
    failed_transactions: 0,
    uploaded_at: '2024-10-22T16:20:00Z',
    uploaded_by: 'user1'
  },
  {
    id: '5',
    company_id: '1',
    account_id: '5',
    filename: 'extrato_nubank_mai_2024.ofx',
    original_name: 'Extrato Nubank Maio 2024.ofx',
    file_type: 'ofx',
    file_size: 34256,
    file_url: '/uploads/extrato_nubank_mai_2024.ofx',
    status: 'completed',
    processing_log: generateProcessingLogs('completed'),
    total_transactions: 234,
    successful_transactions: 232,
    failed_transactions: 2,
    uploaded_at: '2024-10-21T09:10:00Z',
    processed_at: '2024-10-21T09:10:42Z',
    uploaded_by: 'user1',
    processing_time: 42
  },
  {
    id: '6',
    company_id: '1',
    account_id: '1',
    filename: 'planilha_transacoes_jun_2024.xlsx',
    original_name: 'Planilha Transações Junho 2024.xlsx',
    file_type: 'xlsx',
    file_size: 567890,
    file_url: '/uploads/planilha_transacoes_jun_2024.xlsx',
    status: 'completed',
    processing_log: generateProcessingLogs('completed'),
    total_transactions: 445,
    successful_transactions: 445,
    failed_transactions: 0,
    uploaded_at: '2024-10-20T11:30:00Z',
    processed_at: '2024-10-20T11:31:28Z',
    uploaded_by: 'user1',
    processing_time: 88
  },
  {
    id: '7',
    company_id: '1',
    account_id: '2',
    filename: 'extrato_caixa_jul_2024.ofx',
    original_name: 'Extrato Caixa Julho 2024.ofx',
    file_type: 'ofx',
    file_size: 41234,
    file_url: '/uploads/extrato_caixa_jul_2024.ofx',
    status: 'pending',
    processing_log: generateProcessingLogs('pending'),
    total_transactions: 0,
    successful_transactions: 0,
    failed_transactions: 0,
    uploaded_at: '2024-10-24T15:30:00Z',
    uploaded_by: 'user1'
  }
];

// Função para gerar novo upload
export const createMockUpload = (data: {
  original_name: string;
  file_type: 'ofx' | 'xlsx' | 'csv';
  account_id: string;
}): Upload => {
  const now = new Date();
  const fileSize = Math.floor(Math.random() * 500000) + 10000;

  return {
    id: Date.now().toString(),
    company_id: '1',
    account_id: data.account_id,
    filename: data.original_name.toLowerCase().replace(/\s+/g, '_'),
    original_name: data.original_name,
    file_type: data.file_type,
    file_size: fileSize,
    status: 'pending',
    processing_log: generateProcessingLogs('pending'),
    total_transactions: 0,
    successful_transactions: 0,
    failed_transactions: 0,
    uploaded_at: now.toISOString(),
    uploaded_by: 'user1'
  };
};

// Função para simular processamento
export const simulateProcessing = (uploadId: string): void => {
  // Isso seria implementado com WebSockets ou polling em um app real
  console.log(`Processing upload ${uploadId}...`);
};