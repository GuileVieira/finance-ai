import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  date,
  boolean,
  timestamp,
  integer,
  json,
  index,
  unique
} from 'drizzle-orm/pg-core';

// Empresas
export const companies = pgTable('financeai_companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  cnpj: varchar('cnpj', { length: 14 }).unique(),
  corporateName: varchar('corporate_name', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 2 }),
  zipCode: varchar('zip_code', { length: 9 }),
  industry: varchar('industry', { length: 100 }),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  cnpjIdx: index('idx_companies_cnpj').on(table.cnpj),
  activeIdx: index('idx_companies_active').on(table.active)
}));

// Contas bancárias
export const accounts = pgTable('financeai_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  bankName: varchar('bank_name', { length: 100 }).notNull(),
  bankCode: varchar('bank_code', { length: 10 }).notNull(),
  agencyNumber: varchar('agency_number', { length: 20 }),
  accountNumber: varchar('account_number', { length: 30 }).notNull(),
  accountType: varchar('account_type', { length: 20 }),
  openingBalance: decimal('opening_balance', { precision: 15, scale: 2 }).default('0'),
  active: boolean('active').default(true),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  companyIdIdx: index('idx_accounts_company_id').on(table.companyId),
  activeIdx: index('idx_accounts_active').on(table.active)
}));

// Categorias de transações
export const categories = pgTable('financeai_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 30 }).notNull(), // revenue, variable_cost, fixed_cost, non_operational
  parentType: varchar('parent_type', { length: 30 }),
  parentCategoryId: uuid('parent_category_id').references(() => categories.id),
  colorHex: varchar('color_hex', { length: 7 }).default('#6366F1'),
  icon: varchar('icon', { length: 10 }).default('📊'), // Emoji para ícones das categorias
  examples: json('examples'), // Array de exemplos de transações
  isSystem: boolean('is_system').default(false),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  companyIdIdx: index('idx_categories_company_id').on(table.companyId),
  typeIdx: index('idx_categories_type').on(table.type),
  activeIdx: index('idx_categories_active').on(table.active)
}));

// Uploads de arquivos
export const uploads = pgTable('financeai_uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  fileType: varchar('file_type', { length: 10 }).notNull(), // ofx, xlsx, csv
  fileSize: integer('file_size').notNull(),
  filePath: text('file_path'),
  fileHash: varchar('file_hash', { length: 64 }), // SHA-256 hash para detectar duplicatas
  storageProvider: varchar('storage_provider', { length: 20 }).default('filesystem'), // filesystem, supabase, etc
  status: varchar('status', { length: 20 }).notNull(), // pending, processing, completed, failed
  processingLog: json('processing_log'),
  totalTransactions: integer('total_transactions').default(0),
  successfulTransactions: integer('successful_transactions').default(0),
  failedTransactions: integer('failed_transactions').default(0),
  processedTransactions: integer('processed_transactions').default(0), // Progresso real
  currentBatch: integer('current_batch').default(0),
  totalBatches: integer('total_batches').default(0),
  lastProcessedIndex: integer('last_processed_index').default(0), // Para retomada
  uploadedAt: timestamp('uploaded_at').defaultNow(),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  companyIdIdx: index('idx_uploads_company_id').on(table.companyId),
  accountIdIdx: index('idx_uploads_account_id').on(table.accountId),
  statusIdx: index('idx_uploads_status').on(table.status),
  uploadedAtIdx: index('idx_uploads_uploaded_at').on(table.uploadedAt)
}));

// Controle de processamento em batches
export const processingBatches = pgTable('financeai_processing_batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  uploadId: uuid('upload_id').references(() => uploads.id, { onDelete: 'cascade' }),
  batchNumber: integer('batch_number').notNull(),
  totalTransactions: integer('total_transactions').notNull(),
  processedTransactions: integer('processed_transactions').default(0),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, processing, completed, failed
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  errorMessage: text('error_message'),
  processingLog: json('processing_log'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  uploadIdIdx: index('idx_processing_batches_upload_id').on(table.uploadId),
  statusIdx: index('idx_processing_batches_status').on(table.status),
  batchNumberIdx: index('idx_processing_batches_batch_number').on(table.batchNumber)
}));

// Transações financeiras
export const transactions = pgTable('financeai_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  uploadId: uuid('upload_id').references(() => uploads.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  name: text('name'), // Nome do beneficiário/estabelecimento do OFX (opcional)
  memo: text('memo'), // Memo/detalhes adicionais do OFX (opcional)
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  type: varchar('type', { length: 10 }).notNull(), // credit, debit
  transactionDate: date('transaction_date').notNull(),
  balanceAfter: decimal('balance_after', { precision: 15, scale: 2 }),
  rawDescription: text('raw_description'),
  metadata: json('metadata'),
  manuallyCategorized: boolean('manually_categorized').default(false),
  verified: boolean('verified').default(false),
  confidence: decimal('confidence', { precision: 5, scale: 2 }).default('0.00'), // 0.00 a 100.00
  reasoning: text('reasoning'),
  // Novos campos para rastreamento de categorização
  categorizationSource: varchar('categorization_source', { length: 20 }), // cache, rule, history, ai, manual
  ruleId: uuid('rule_id').references(() => categoryRules.id, { onDelete: 'set null' }), // Se foi categorizado por regra
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  accountIdIdx: index('idx_transactions_account_id').on(table.accountId),
  categoryIdIdx: index('idx_transactions_category_id').on(table.categoryId),
  uploadIdIdx: index('idx_transactions_upload_id').on(table.uploadId),
  dateIdx: index('idx_transactions_date').on(table.transactionDate),
  typeIdx: index('idx_transactions_type').on(table.type),
  verifiedIdx: index('idx_transactions_verified').on(table.verified),
  nameIdx: index('idx_transactions_name').on(table.name), // Índice para busca por nome
  memoIdx: index('idx_transactions_memo').on(table.memo), // Índice para busca por memo
  ruleIdIdx: index('idx_transactions_rule_id').on(table.ruleId), // Índice para rastreamento por regra
  categorizationSourceIdx: index('idx_transactions_categorization_source').on(table.categorizationSource),
  // Índices compostos para performance de consultas analíticas
  dateTypeIdx: index('idx_transactions_date_type').on(table.transactionDate, table.type),
  dateAmountIdx: index('idx_transactions_date_amount').on(table.transactionDate.desc()),
  accountDateIdx: index('idx_transactions_account_date').on(table.accountId, table.transactionDate.desc()),
  categoryDateIdx: index('idx_transactions_category_date').on(table.categoryId, table.transactionDate.desc())
}));

// Usuários
export const users = pgTable('financeai_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  tutorialState: json('tutorial_state'), // Estado do tutorial do usuário (JSONB)
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
  activeIdx: index('idx_users_active').on(table.active)
}));

// Relação usuário-empresa (multi-tenancy)
export const userCompanies = pgTable('financeai_user_companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 20 }).default('owner').notNull(),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  userIdIdx: index('idx_user_companies_user_id').on(table.userId),
  companyIdIdx: index('idx_user_companies_company_id').on(table.companyId),
  uniqueUserCompany: unique('unique_user_company').on(table.userId, table.companyId)
}));

// Regras de categorização automática
export const categoryRules = pgTable('financeai_category_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  rulePattern: varchar('rule_pattern', { length: 500 }).notNull(),
  ruleType: varchar('rule_type', { length: 20 }).notNull(), // contains, regex, exact, wildcard, tokens, fuzzy
  confidenceScore: decimal('confidence_score', { precision: 3, scale: 2 }).default('0.80'),
  active: boolean('active').default(true),
  usageCount: integer('usage_count').default(0),
  examples: json('examples'), // Array de exemplos de transações
  // Campos para sistema de scoring e rastreamento
  lastUsedAt: timestamp('last_used_at'), // Última vez que a regra foi usada
  sourceType: varchar('source_type', { length: 20 }).default('manual'), // manual, ai, imported
  matchFields: json('match_fields'), // Array de campos onde buscar: ['description', 'memo', 'name']
  // NOVOS CAMPOS - Sistema de Ciclo de Vida v2.0
  status: varchar('status', { length: 20 }).default('active'), // candidate, active, refined, consolidated, inactive
  validationCount: integer('validation_count').default(0), // Usos corretos validados
  negativeCount: integer('negative_count').default(0), // Usos incorretos/correções
  validationThreshold: integer('validation_threshold').default(3), // Quantos usos para promover
  patternStrategy: varchar('pattern_strategy', { length: 30 }), // entity_only, prefix_entity, multi_keyword, etc
  parentRuleId: uuid('parent_rule_id'), // Se foi mesclada de outra regra
  patternVariants: json('pattern_variants'), // Array de patterns alternativos descobertos
  metadata: json('rule_metadata'), // Estatísticas, histórico de refinamentos
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  categoryIdIdx: index('idx_category_rules_category_id').on(table.categoryId),
  companyIdIdx: index('idx_category_rules_company_id').on(table.companyId),
  activeIdx: index('idx_category_rules_active').on(table.active),
  sourceTypeIdx: index('idx_category_rules_source_type').on(table.sourceType),
  lastUsedAtIdx: index('idx_category_rules_last_used_at').on(table.lastUsedAt),
  statusIdx: index('idx_category_rules_status').on(table.status)
}));

// Feedback de regras - registra validações positivas/negativas
export const ruleFeedback = pgTable('financeai_rule_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  ruleId: uuid('rule_id').references(() => categoryRules.id, { onDelete: 'cascade' }),
  transactionId: uuid('transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  feedbackType: varchar('feedback_type', { length: 20 }).notNull(), // positive, negative, correction
  oldCategoryId: uuid('old_category_id').references(() => categories.id, { onDelete: 'set null' }),
  newCategoryId: uuid('new_category_id').references(() => categories.id, { onDelete: 'set null' }),
  description: text('description'), // Descrição da transação para referência
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  ruleIdIdx: index('idx_rule_feedback_rule_id').on(table.ruleId),
  transactionIdIdx: index('idx_rule_feedback_transaction_id').on(table.transactionId),
  feedbackTypeIdx: index('idx_rule_feedback_type').on(table.feedbackType),
  createdAtIdx: index('idx_rule_feedback_created_at').on(table.createdAt)
}));

// Clusters de transações - agrupa transações similares para geração de regras
export const transactionClusters = pgTable('financeai_transaction_clusters', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  centroidDescription: text('centroid_description').notNull(), // Descrição representativa
  commonPattern: varchar('common_pattern', { length: 500 }), // Pattern extraído do cluster
  transactionCount: integer('transaction_count').default(0),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  categoryName: varchar('category_name', { length: 100 }),
  confidence: decimal('confidence', { precision: 3, scale: 2 }).default('0.00'),
  status: varchar('status', { length: 20 }).default('pending'), // pending, processed, archived
  transactionIds: json('transaction_ids'), // Array de IDs de transações no cluster
  commonTokens: json('common_tokens'), // Tokens comuns encontrados
  createdAt: timestamp('created_at').defaultNow(),
  processedAt: timestamp('processed_at')
}, (table) => ({
  companyIdIdx: index('idx_transaction_clusters_company_id').on(table.companyId),
  categoryIdIdx: index('idx_transaction_clusters_category_id').on(table.categoryId),
  statusIdx: index('idx_transaction_clusters_status').on(table.status),
  createdAtIdx: index('idx_transaction_clusters_created_at').on(table.createdAt)
}));

// Preços dos modelos de IA
export const aiModelPricing = pgTable('financeai_ai_model_pricing', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: varchar('provider', { length: 50 }).notNull(), // openrouter, openai, anthropic
  modelName: varchar('model_name', { length: 100 }).notNull(), // google/gemini-2.0-flash-exp, gpt-4o-mini
  inputPricePer1kTokens: decimal('input_price_per_1k_tokens', { precision: 10, scale: 6 }).notNull(),
  outputPricePer1kTokens: decimal('output_price_per_1k_tokens', { precision: 10, scale: 6 }).notNull(),
  active: boolean('active').default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  providerModelIdx: index('idx_ai_pricing_provider_model').on(table.provider, table.modelName),
  activeIdx: index('idx_ai_pricing_active').on(table.active)
}));

// Thresholds configuráveis para insights
export const insightThresholds = pgTable('financeai_insight_thresholds', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  insightType: varchar('insight_type', { length: 50 }).notNull(),
  thresholdKey: varchar('threshold_key', { length: 50 }).notNull(),
  thresholdValue: decimal('threshold_value', { precision: 15, scale: 4 }).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  companyIdIdx: index('idx_insight_thresholds_company_id').on(table.companyId),
  insightTypeIdx: index('idx_insight_thresholds_insight_type').on(table.insightType),
  uniqueThreshold: index('idx_insight_thresholds_unique').on(table.companyId, table.insightType, table.thresholdKey)
}));

// Logs de uso de IA (detalhado por chamada)
export const aiUsageLogs = pgTable('financeai_ai_usage_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  uploadId: uuid('upload_id').references(() => uploads.id, { onDelete: 'set null' }),
  batchId: uuid('batch_id').references(() => processingBatches.id, { onDelete: 'set null' }),
  transactionId: uuid('transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  operationType: varchar('operation_type', { length: 50 }).notNull(), // categorize, batch_categorize, analyze
  provider: varchar('provider', { length: 50 }).notNull(),
  modelName: varchar('model_name', { length: 100 }).notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  totalTokens: integer('total_tokens').notNull(),
  costUsd: decimal('cost_usd', { precision: 10, scale: 6 }).notNull(),
  processingTimeMs: integer('processing_time_ms'),
  source: varchar('source', { length: 20 }).notNull(), // history, cache, ai
  requestData: json('request_data'), // Dados da requisição (prompt, etc)
  responseData: json('response_data'), // Dados da resposta (categoria, confidence, etc)
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  userIdIdx: index('idx_ai_logs_user_id').on(table.userId),
  companyIdIdx: index('idx_ai_logs_company_id').on(table.companyId),
  uploadIdIdx: index('idx_ai_logs_upload_id').on(table.uploadId),
  batchIdIdx: index('idx_ai_logs_batch_id').on(table.batchId),
  createdAtIdx: index('idx_ai_logs_created_at').on(table.createdAt.desc()),
  providerModelIdx: index('idx_ai_logs_provider_model').on(table.provider, table.modelName),
  sourceIdx: index('idx_ai_logs_source').on(table.source),
  operationTypeIdx: index('idx_ai_logs_operation_type').on(table.operationType),
  // Índices compostos para análises
  companyDateIdx: index('idx_ai_logs_company_date').on(table.companyId, table.createdAt.desc()),
  providerDateIdx: index('idx_ai_logs_provider_date').on(table.provider, table.createdAt.desc())
}));

// Export types
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Upload = typeof uploads.$inferSelect;
export type NewUpload = typeof uploads.$inferInsert;

export type ProcessingBatch = typeof processingBatches.$inferSelect;
export type NewProcessingBatch = typeof processingBatches.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type UserCompany = typeof userCompanies.$inferSelect;
export type NewUserCompany = typeof userCompanies.$inferInsert;

export type CategoryRule = typeof categoryRules.$inferSelect;
export type NewCategoryRule = typeof categoryRules.$inferInsert;

export type AiModelPricing = typeof aiModelPricing.$inferSelect;
export type NewAiModelPricing = typeof aiModelPricing.$inferInsert;

export type AiUsageLog = typeof aiUsageLogs.$inferSelect;
export type NewAiUsageLog = typeof aiUsageLogs.$inferInsert;

export type RuleFeedback = typeof ruleFeedback.$inferSelect;
export type NewRuleFeedback = typeof ruleFeedback.$inferInsert;

export type TransactionCluster = typeof transactionClusters.$inferSelect;
export type NewTransactionCluster = typeof transactionClusters.$inferInsert;

export type InsightThreshold = typeof insightThresholds.$inferSelect;
export type NewInsightThreshold = typeof insightThresholds.$inferInsert;