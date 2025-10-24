ALTER TABLE "financeai_uploads" ADD COLUMN "file_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "financeai_uploads" ADD COLUMN "storage_provider" varchar(20) DEFAULT 'filesystem';