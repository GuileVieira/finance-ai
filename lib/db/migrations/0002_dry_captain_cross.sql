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
ALTER TABLE "financeai_transactions" ALTER COLUMN "confidence" SET DATA TYPE numeric(5, 2);--> statement-breakpoint
ALTER TABLE "financeai_transactions" ALTER COLUMN "confidence" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "financeai_category_rules" ADD COLUMN "examples" json;--> statement-breakpoint
ALTER TABLE "financeai_category_rules" ADD COLUMN "last_used_at" timestamp;--> statement-breakpoint
ALTER TABLE "financeai_category_rules" ADD COLUMN "source_type" varchar(20) DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE "financeai_category_rules" ADD COLUMN "match_fields" json;--> statement-breakpoint
ALTER TABLE "financeai_transactions" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "financeai_transactions" ADD COLUMN "memo" text;--> statement-breakpoint
ALTER TABLE "financeai_transactions" ADD COLUMN "categorization_source" varchar(20);--> statement-breakpoint
ALTER TABLE "financeai_transactions" ADD COLUMN "rule_id" uuid;--> statement-breakpoint
ALTER TABLE "financeai_uploads" ADD COLUMN "processed_transactions" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "financeai_uploads" ADD COLUMN "current_batch" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "financeai_uploads" ADD COLUMN "total_batches" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "financeai_uploads" ADD COLUMN "last_processed_index" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "financeai_ai_usage_logs" ADD CONSTRAINT "financeai_ai_usage_logs_user_id_financeai_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."financeai_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_ai_usage_logs" ADD CONSTRAINT "financeai_ai_usage_logs_company_id_financeai_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."financeai_companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_ai_usage_logs" ADD CONSTRAINT "financeai_ai_usage_logs_upload_id_financeai_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."financeai_uploads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_ai_usage_logs" ADD CONSTRAINT "financeai_ai_usage_logs_batch_id_financeai_processing_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."financeai_processing_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_ai_usage_logs" ADD CONSTRAINT "financeai_ai_usage_logs_transaction_id_financeai_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."financeai_transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_processing_batches" ADD CONSTRAINT "financeai_processing_batches_upload_id_financeai_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."financeai_uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
CREATE INDEX "idx_processing_batches_upload_id" ON "financeai_processing_batches" USING btree ("upload_id");--> statement-breakpoint
CREATE INDEX "idx_processing_batches_status" ON "financeai_processing_batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_processing_batches_batch_number" ON "financeai_processing_batches" USING btree ("batch_number");--> statement-breakpoint
ALTER TABLE "financeai_transactions" ADD CONSTRAINT "financeai_transactions_rule_id_financeai_category_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."financeai_category_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_category_rules_source_type" ON "financeai_category_rules" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "idx_category_rules_last_used_at" ON "financeai_category_rules" USING btree ("last_used_at");--> statement-breakpoint
CREATE INDEX "idx_transactions_name" ON "financeai_transactions" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_transactions_memo" ON "financeai_transactions" USING btree ("memo");--> statement-breakpoint
CREATE INDEX "idx_transactions_rule_id" ON "financeai_transactions" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_categorization_source" ON "financeai_transactions" USING btree ("categorization_source");--> statement-breakpoint
CREATE INDEX "idx_transactions_date_type" ON "financeai_transactions" USING btree ("transaction_date","type");--> statement-breakpoint
CREATE INDEX "idx_transactions_date_amount" ON "financeai_transactions" USING btree ("transaction_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_transactions_account_date" ON "financeai_transactions" USING btree ("account_id","transaction_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_transactions_category_date" ON "financeai_transactions" USING btree ("category_id","transaction_date" DESC NULLS LAST);