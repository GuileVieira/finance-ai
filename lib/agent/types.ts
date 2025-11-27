// Tipos para o sistema de agente de categorização

export interface ClassificationRecord {
  id: string;
  originalDescription: string;
  normalizedDescription: string;
  companyName?: string;
  cnpj?: string;
  macroCategory: string;
  microCategory: string;
  value: number;
  confidence: number;
  classificationSource: 'history' | 'cache' | 'ai';
  timestamp: string;
  feedbackCount: number;
  accuracy: number;
}

export interface ClassificationPattern {
  id: string;
  pattern: string;
  macroCategory: string;
  microCategory: string;
  matchCount: number;
  accuracy: number;
  lastUsed: string;
  examples: string[];
  type: 'exact' | 'contains' | 'regex';
}

export interface CompanyInfo {
  name: string;
  cnpj?: string;
  website?: string;
  description?: string;
  category?: string;
  confidence: number;
}

export interface ClassificationResult {
  transactionId: string;
  originalDescription: string;
  classification: {
    macro: string;
    micro: string;
    confidence: number;
    reasoning: string;
  };
  rawData: {
    companyName?: string;
    cnpj?: string;
    website?: string;
    description: string;
  };
  source: 'history' | 'cache' | 'ai';
  processingTime: number;
}

export interface BatchClassificationRequest {
  transactions: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
  }>;
  useCache?: boolean;
  forceAI?: boolean;
}

export interface BatchClassificationResponse {
  results: ClassificationResult[];
  summary: {
    total: number;
    fromHistory: number;
    fromCache: number;
    fromAI: number;
    processingTime: number;
    costEstimate: number;
  };
}

export interface AgentPromptData {
  categories: Array<{
    name: string;
    type: string;
    examples: string[];
    color: string;
  }>;
  recentPatterns: ClassificationPattern[];
  companyInfo?: CompanyInfo;
  transactionValue: number;
}

export interface CacheEntry {
  key: string;
  result: ClassificationResult;
  timestamp: string;
  accessCount: number;
}

export interface SearchQuery {
  query: string;
  type: 'company' | 'cnpj' | 'service' | 'general' | 'banking_term';
  context?: string;
}