CREATE TABLE "financeai_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"name" varchar(255) NOT NULL,
	"bank_name" varchar(100) NOT NULL,
	"bank_code" varchar(10) NOT NULL,
	"agency_number" varchar(20),
	"account_number" varchar(30) NOT NULL,
	"account_type" varchar(20),
	"opening_balance" numeric(15, 2) DEFAULT '0',
	"active" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "financeai_ai_model_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(50) NOT NULL,
	"model_name" varchar(100) NOT NULL,
	"input_price_per_1k_tokens" numeric(10, 6) NOT NULL,
	"output_price_per_1k_tokens" numeric(10, 6) NOT NULL,
	"active" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "financeai_ai_usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"company_id" uuid,
	"upload_id" uuid,
	"batch_id" uuid,
	"transaction_id" uuid,
	"operation_type" varchar(50) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"model_name" varchar(100) NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"total_tokens" integer NOT NULL,
	"cost_usd" numeric(10, 6) NOT NULL,
	"processing_time_ms" integer,
	"source" varchar(20) NOT NULL,
	"request_data" json,
	"response_data" json,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "financeai_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"name" varchar(100) NOT NULL,
	"description" text,
	"type" varchar(30) NOT NULL,
	"parent_type" varchar(30),
	"parent_category_id" uuid,
	"color_hex" varchar(7) DEFAULT '#3B82F6',
	"category_group" varchar(50),
	"dre_group" varchar(50),
	"icon" varchar(10) DEFAULT '📊',
	"examples" json,
	"is_system" boolean DEFAULT false,
	"is_ignored" boolean DEFAULT false,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "financeai_category_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid,
	"company_id" uuid,
	"rule_pattern" varchar(500) NOT NULL,
	"rule_type" varchar(20) NOT NULL,
	"confidence_score" numeric(3, 2) DEFAULT '0.80',
	"active" boolean DEFAULT true,
	"usage_count" integer DEFAULT 0,
	"examples" json,
	"last_used_at" timestamp,
	"source_type" varchar(20) DEFAULT 'manual',
	"match_fields" json,
	"status" varchar(20) DEFAULT 'active',
	"validation_count" integer DEFAULT 0,
	"negative_count" integer DEFAULT 0,
	"validation_threshold" integer DEFAULT 3,
	"pattern_strategy" varchar(30),
	"parent_rule_id" uuid,
	"pattern_variants" json,
	"rule_metadata" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "financeai_companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"cnpj" varchar(14),
	"corporate_name" varchar(255),
	"phone" varchar(20),
	"email" varchar(255),
	"address" text,
	"city" varchar(100),
	"state" varchar(2),
	"zip_code" varchar(9),
	"industry" varchar(100),
	"monthly_revenue_range" numeric(15, 2),
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "financeai_companies_cnpj_unique" UNIQUE("cnpj")
);
--> statement-breakpoint
CREATE TABLE "financeai_insight_thresholds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"insight_type" varchar(50) NOT NULL,
	"threshold_key" varchar(50) NOT NULL,
	"threshold_value" numeric(15, 4) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "financeai_processing_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"upload_id" uuid,
	"batch_number" integer NOT NULL,
	"total_transactions" integer NOT NULL,
	"processed_transactions" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error_message" text,
	"processing_log" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "financeai_projections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"dre_group" varchar(50) NOT NULL,
	"amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_projection" UNIQUE("company_id","year","month","dre_group")
);
--> statement-breakpoint
CREATE TABLE "financeai_rule_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid,
	"transaction_id" uuid,
	"feedback_type" varchar(20) NOT NULL,
	"old_category_id" uuid,
	"new_category_id" uuid,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "financeai_transaction_clusters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"centroid_description" text NOT NULL,
	"common_pattern" varchar(500),
	"transaction_count" integer DEFAULT 0,
	"category_id" uuid,
	"category_name" varchar(100),
	"confidence" numeric(3, 2) DEFAULT '0.00',
	"status" varchar(20) DEFAULT 'pending',
	"transaction_ids" json,
	"common_tokens" json,
	"created_at" timestamp DEFAULT now(),
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "financeai_transaction_splits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "financeai_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid,
	"category_id" uuid,
	"upload_id" uuid,
	"description" text NOT NULL,
	"name" text,
	"memo" text,
	"amount" numeric(15, 2) NOT NULL,
	"type" varchar(10) NOT NULL,
	"transaction_date" date NOT NULL,
	"balance_after" numeric(15, 2),
	"raw_description" text,
	"metadata" json,
	"manually_categorized" boolean DEFAULT false,
	"verified" boolean DEFAULT false,
	"confidence" numeric(5, 2) DEFAULT '0.00',
	"reasoning" text,
	"categorization_source" varchar(20),
	"rule_id" uuid,
	"needs_review" boolean DEFAULT false,
	"review_suggestions" json,
	"movement_type" varchar(30),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "financeai_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"account_id" uuid,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"file_type" varchar(10) NOT NULL,
	"file_size" integer NOT NULL,
	"file_path" text,
	"file_hash" varchar(64),
	"storage_provider" varchar(20) DEFAULT 'filesystem',
	"status" varchar(20) NOT NULL,
	"processing_log" json,
	"total_transactions" integer DEFAULT 0,
	"successful_transactions" integer DEFAULT 0,
	"failed_transactions" integer DEFAULT 0,
	"processed_transactions" integer DEFAULT 0,
	"current_batch" integer DEFAULT 0,
	"total_batches" integer DEFAULT 0,
	"last_processed_index" integer DEFAULT 0,
	"uploaded_at" timestamp DEFAULT now(),
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "financeai_user_companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'owner' NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_user_company" UNIQUE("user_id","company_id")
);
--> statement-breakpoint
CREATE TABLE "financeai_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255),
	"is_super_admin" boolean DEFAULT false NOT NULL,
	"tutorial_state" json,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "financeai_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "financeai_accounts" ADD CONSTRAINT "financeai_accounts_company_id_financeai_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."financeai_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_ai_usage_logs" ADD CONSTRAINT "financeai_ai_usage_logs_user_id_financeai_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."financeai_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_ai_usage_logs" ADD CONSTRAINT "financeai_ai_usage_logs_company_id_financeai_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."financeai_companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_ai_usage_logs" ADD CONSTRAINT "financeai_ai_usage_logs_upload_id_financeai_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."financeai_uploads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_ai_usage_logs" ADD CONSTRAINT "financeai_ai_usage_logs_batch_id_financeai_processing_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."financeai_processing_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_ai_usage_logs" ADD CONSTRAINT "financeai_ai_usage_logs_transaction_id_financeai_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."financeai_transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_categories" ADD CONSTRAINT "financeai_categories_company_id_financeai_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."financeai_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_categories" ADD CONSTRAINT "financeai_categories_parent_category_id_financeai_categories_id_fk" FOREIGN KEY ("parent_category_id") REFERENCES "public"."financeai_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_category_rules" ADD CONSTRAINT "financeai_category_rules_category_id_financeai_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."financeai_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_category_rules" ADD CONSTRAINT "financeai_category_rules_company_id_financeai_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."financeai_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_insight_thresholds" ADD CONSTRAINT "financeai_insight_thresholds_company_id_financeai_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."financeai_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_processing_batches" ADD CONSTRAINT "financeai_processing_batches_upload_id_financeai_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."financeai_uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_projections" ADD CONSTRAINT "financeai_projections_company_id_financeai_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."financeai_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_rule_feedback" ADD CONSTRAINT "financeai_rule_feedback_rule_id_financeai_category_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."financeai_category_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_rule_feedback" ADD CONSTRAINT "financeai_rule_feedback_transaction_id_financeai_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."financeai_transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_rule_feedback" ADD CONSTRAINT "financeai_rule_feedback_old_category_id_financeai_categories_id_fk" FOREIGN KEY ("old_category_id") REFERENCES "public"."financeai_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_rule_feedback" ADD CONSTRAINT "financeai_rule_feedback_new_category_id_financeai_categories_id_fk" FOREIGN KEY ("new_category_id") REFERENCES "public"."financeai_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_transaction_clusters" ADD CONSTRAINT "financeai_transaction_clusters_company_id_financeai_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."financeai_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_transaction_clusters" ADD CONSTRAINT "financeai_transaction_clusters_category_id_financeai_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."financeai_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_transaction_splits" ADD CONSTRAINT "financeai_transaction_splits_transaction_id_financeai_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."financeai_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_transaction_splits" ADD CONSTRAINT "financeai_transaction_splits_category_id_financeai_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."financeai_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_transactions" ADD CONSTRAINT "financeai_transactions_account_id_financeai_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financeai_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_transactions" ADD CONSTRAINT "financeai_transactions_category_id_financeai_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."financeai_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_transactions" ADD CONSTRAINT "financeai_transactions_upload_id_financeai_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."financeai_uploads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_transactions" ADD CONSTRAINT "financeai_transactions_rule_id_financeai_category_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."financeai_category_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_uploads" ADD CONSTRAINT "financeai_uploads_company_id_financeai_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."financeai_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_uploads" ADD CONSTRAINT "financeai_uploads_account_id_financeai_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financeai_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_user_companies" ADD CONSTRAINT "financeai_user_companies_user_id_financeai_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."financeai_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_user_companies" ADD CONSTRAINT "financeai_user_companies_company_id_financeai_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."financeai_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_accounts_company_id" ON "financeai_accounts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_accounts_active" ON "financeai_accounts" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_ai_pricing_provider_model" ON "financeai_ai_model_pricing" USING btree ("provider","model_name");--> statement-breakpoint
CREATE INDEX "idx_ai_pricing_active" ON "financeai_ai_model_pricing" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_ai_logs_user_id" ON "financeai_ai_usage_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_logs_company_id" ON "financeai_ai_usage_logs" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_ai_logs_upload_id" ON "financeai_ai_usage_logs" USING btree ("upload_id");--> statement-breakpoint
CREATE INDEX "idx_ai_logs_batch_id" ON "financeai_ai_usage_logs" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "idx_ai_logs_created_at" ON "financeai_ai_usage_logs" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_ai_logs_provider_model" ON "financeai_ai_usage_logs" USING btree ("provider","model_name");--> statement-breakpoint
CREATE INDEX "idx_ai_logs_source" ON "financeai_ai_usage_logs" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_ai_logs_operation_type" ON "financeai_ai_usage_logs" USING btree ("operation_type");--> statement-breakpoint
CREATE INDEX "idx_ai_logs_company_date" ON "financeai_ai_usage_logs" USING btree ("company_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_ai_logs_provider_date" ON "financeai_ai_usage_logs" USING btree ("provider","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_categories_company_id" ON "financeai_categories" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_categories_type" ON "financeai_categories" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_categories_active" ON "financeai_categories" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_categories_is_ignored" ON "financeai_categories" USING btree ("is_ignored");--> statement-breakpoint
CREATE INDEX "idx_category_rules_category_id" ON "financeai_category_rules" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_category_rules_company_id" ON "financeai_category_rules" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_category_rules_active" ON "financeai_category_rules" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_category_rules_source_type" ON "financeai_category_rules" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "idx_category_rules_last_used_at" ON "financeai_category_rules" USING btree ("last_used_at");--> statement-breakpoint
CREATE INDEX "idx_category_rules_status" ON "financeai_category_rules" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_companies_cnpj" ON "financeai_companies" USING btree ("cnpj");--> statement-breakpoint
CREATE INDEX "idx_companies_active" ON "financeai_companies" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_insight_thresholds_company_id" ON "financeai_insight_thresholds" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_insight_thresholds_insight_type" ON "financeai_insight_thresholds" USING btree ("insight_type");--> statement-breakpoint
CREATE INDEX "idx_insight_thresholds_unique" ON "financeai_insight_thresholds" USING btree ("company_id","insight_type","threshold_key");--> statement-breakpoint
CREATE INDEX "idx_processing_batches_upload_id" ON "financeai_processing_batches" USING btree ("upload_id");--> statement-breakpoint
CREATE INDEX "idx_processing_batches_status" ON "financeai_processing_batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_processing_batches_batch_number" ON "financeai_processing_batches" USING btree ("batch_number");--> statement-breakpoint
CREATE INDEX "idx_projections_company" ON "financeai_projections" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_projections_year_month" ON "financeai_projections" USING btree ("year","month");--> statement-breakpoint
CREATE INDEX "idx_projections_dre_group" ON "financeai_projections" USING btree ("dre_group");--> statement-breakpoint
CREATE INDEX "idx_rule_feedback_rule_id" ON "financeai_rule_feedback" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "idx_rule_feedback_transaction_id" ON "financeai_rule_feedback" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_rule_feedback_type" ON "financeai_rule_feedback" USING btree ("feedback_type");--> statement-breakpoint
CREATE INDEX "idx_rule_feedback_created_at" ON "financeai_rule_feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_transaction_clusters_company_id" ON "financeai_transaction_clusters" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_transaction_clusters_category_id" ON "financeai_transaction_clusters" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_transaction_clusters_status" ON "financeai_transaction_clusters" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_transaction_clusters_created_at" ON "financeai_transaction_clusters" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_transaction_splits_transaction_id" ON "financeai_transaction_splits" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_transaction_splits_category_id" ON "financeai_transaction_splits" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_account_id" ON "financeai_transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_category_id" ON "financeai_transactions" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_upload_id" ON "financeai_transactions" USING btree ("upload_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_date" ON "financeai_transactions" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "idx_transactions_type" ON "financeai_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_transactions_verified" ON "financeai_transactions" USING btree ("verified");--> statement-breakpoint
CREATE INDEX "idx_transactions_name" ON "financeai_transactions" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_transactions_memo" ON "financeai_transactions" USING btree ("memo");--> statement-breakpoint
CREATE INDEX "idx_transactions_rule_id" ON "financeai_transactions" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_categorization_source" ON "financeai_transactions" USING btree ("categorization_source");--> statement-breakpoint
CREATE INDEX "idx_transactions_date_type" ON "financeai_transactions" USING btree ("transaction_date","type");--> statement-breakpoint
CREATE INDEX "idx_transactions_date_amount" ON "financeai_transactions" USING btree ("transaction_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_transactions_account_date" ON "financeai_transactions" USING btree ("account_id","transaction_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_transactions_category_date" ON "financeai_transactions" USING btree ("category_id","transaction_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_uploads_company_id" ON "financeai_uploads" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_uploads_account_id" ON "financeai_uploads" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_uploads_status" ON "financeai_uploads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_uploads_uploaded_at" ON "financeai_uploads" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "idx_user_companies_user_id" ON "financeai_user_companies" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_companies_company_id" ON "financeai_user_companies" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "financeai_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_active" ON "financeai_users" USING btree ("active");