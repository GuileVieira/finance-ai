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
CREATE TABLE "financeai_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"name" varchar(100) NOT NULL,
	"description" text,
	"type" varchar(30) NOT NULL,
	"parent_type" varchar(30),
	"parent_category_id" uuid,
	"color_hex" varchar(7) DEFAULT '#6366F1',
	"icon" varchar(10) DEFAULT '📊',
	"examples" json,
	"is_system" boolean DEFAULT false,
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
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "financeai_companies_cnpj_unique" UNIQUE("cnpj")
);
--> statement-breakpoint
CREATE TABLE "financeai_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid,
	"category_id" uuid,
	"upload_id" uuid,
	"description" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"type" varchar(10) NOT NULL,
	"transaction_date" date NOT NULL,
	"balance_after" numeric(15, 2),
	"raw_description" text,
	"metadata" json,
	"manually_categorized" boolean DEFAULT false,
	"verified" boolean DEFAULT false,
	"confidence" numeric(3, 2) DEFAULT '0.00',
	"reasoning" text,
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
	"status" varchar(20) NOT NULL,
	"processing_log" json,
	"total_transactions" integer DEFAULT 0,
	"successful_transactions" integer DEFAULT 0,
	"failed_transactions" integer DEFAULT 0,
	"uploaded_at" timestamp DEFAULT now(),
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "financeai_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "financeai_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "financeai_accounts" ADD CONSTRAINT "financeai_accounts_company_id_financeai_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."financeai_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_categories" ADD CONSTRAINT "financeai_categories_company_id_financeai_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."financeai_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_categories" ADD CONSTRAINT "financeai_categories_parent_category_id_financeai_categories_id_fk" FOREIGN KEY ("parent_category_id") REFERENCES "public"."financeai_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_category_rules" ADD CONSTRAINT "financeai_category_rules_category_id_financeai_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."financeai_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_category_rules" ADD CONSTRAINT "financeai_category_rules_company_id_financeai_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."financeai_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_transactions" ADD CONSTRAINT "financeai_transactions_account_id_financeai_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financeai_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_transactions" ADD CONSTRAINT "financeai_transactions_category_id_financeai_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."financeai_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_transactions" ADD CONSTRAINT "financeai_transactions_upload_id_financeai_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."financeai_uploads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_uploads" ADD CONSTRAINT "financeai_uploads_company_id_financeai_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."financeai_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financeai_uploads" ADD CONSTRAINT "financeai_uploads_account_id_financeai_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financeai_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_accounts_company_id" ON "financeai_accounts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_accounts_active" ON "financeai_accounts" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_categories_company_id" ON "financeai_categories" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_categories_type" ON "financeai_categories" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_categories_active" ON "financeai_categories" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_category_rules_category_id" ON "financeai_category_rules" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_category_rules_company_id" ON "financeai_category_rules" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_category_rules_active" ON "financeai_category_rules" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_companies_cnpj" ON "financeai_companies" USING btree ("cnpj");--> statement-breakpoint
CREATE INDEX "idx_companies_active" ON "financeai_companies" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_transactions_account_id" ON "financeai_transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_category_id" ON "financeai_transactions" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_upload_id" ON "financeai_transactions" USING btree ("upload_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_date" ON "financeai_transactions" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "idx_transactions_type" ON "financeai_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_transactions_verified" ON "financeai_transactions" USING btree ("verified");--> statement-breakpoint
CREATE INDEX "idx_uploads_company_id" ON "financeai_uploads" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_uploads_account_id" ON "financeai_uploads" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_uploads_status" ON "financeai_uploads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_uploads_uploaded_at" ON "financeai_uploads" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "financeai_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_active" ON "financeai_users" USING btree ("active");