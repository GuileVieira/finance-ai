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
  index
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
  uploadedAt: timestamp('uploaded_at').defaultNow(),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  companyIdIdx: index('idx_uploads_company_id').on(table.companyId),
  accountIdIdx: index('idx_uploads_account_id').on(table.accountId),
  statusIdx: index('idx_uploads_status').on(table.status),
  uploadedAtIdx: index('idx_uploads_uploaded_at').on(table.uploadedAt)
}));

// Transações financeiras
export const transactions = pgTable('financeai_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  uploadId: uuid('upload_id').references(() => uploads.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  name: text('name'), // Nome do beneficiário/estabelecimento do OFX
  memo: text('memo'), // Memo/detalhes adicionais do OFX
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  type: varchar('type', { length: 10 }).notNull(), // credit, debit
  transactionDate: date('transaction_date').notNull(),
  balanceAfter: decimal('balance_after', { precision: 15, scale: 2 }),
  rawDescription: text('raw_description'),
  metadata: json('metadata'),
  manuallyCategorized: boolean('manually_categorized').default(false),
  verified: boolean('verified').default(false),
  confidence: decimal('confidence', { precision: 3, scale: 2 }).default('0.00'),
  reasoning: text('reasoning'),
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
  // Índices compostos para performance de consultas analíticas
  dateTypeIdx: index('idx_transactions_date_type').on(table.transactionDate, table.type),
  dateAmountIdx: index('idx_transactions_date_amount').on(table.transactionDate.desc()),
  accountDateIdx: index('idx_transactions_account_date').on(table.accountId, table.transactionDate.desc()),
  categoryDateIdx: index('idx_transactions_category_date').on(table.categoryId, table.transactionDate.desc())
}));

// Usuários (simplificado para MVP)
export const users = pgTable('financeai_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
  activeIdx: index('idx_users_active').on(table.active)
}));

// Regras de categorização automática
export const categoryRules = pgTable('financeai_category_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  rulePattern: varchar('rule_pattern', { length: 500 }).notNull(),
  ruleType: varchar('rule_type', { length: 20 }).notNull(), // contains, regex, exact
  confidenceScore: decimal('confidence_score', { precision: 3, scale: 2 }).default('0.80'),
  active: boolean('active').default(true),
  usageCount: integer('usage_count').default(0),
  examples: json('examples'), // Array de exemplos de transações
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  categoryIdIdx: index('idx_category_rules_category_id').on(table.categoryId),
  companyIdIdx: index('idx_category_rules_company_id').on(table.companyId),
  activeIdx: index('idx_category_rules_active').on(table.active)
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

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type CategoryRule = typeof categoryRules.$inferSelect;
export type NewCategoryRule = typeof categoryRules.$inferInsert;