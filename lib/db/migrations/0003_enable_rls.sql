-- Enable RLS on core tables
ALTER TABLE "financeai_companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financeai_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financeai_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financeai_uploads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financeai_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financeai_category_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financeai_user_companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financeai_rule_feedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financeai_transaction_splits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financeai_ai_usage_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financeai_projections" ENABLE ROW LEVEL SECURITY;

-- Helper to get the current user ID from the session variable
-- We use NULLIF and COALESCE to handle empty strings or unset variables safely
CREATE OR REPLACE FUNCTION get_app_user_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

-- 1. Policies for User-Company relationships (Self-reference)
CREATE POLICY "Users can only see their own memberships" ON "financeai_user_companies"
    FOR ALL USING (user_id = get_app_user_id());

-- 2. Policies for Companies
CREATE POLICY "Users can only see companies they belong to" ON "financeai_companies"
    FOR ALL USING (
        id IN (SELECT company_id FROM "financeai_user_companies" WHERE user_id = get_app_user_id())
    );

-- 3. Policies for Accounts (Owned by Company)
CREATE POLICY "Users can access accounts of their companies" ON "financeai_accounts"
    FOR ALL USING (
        company_id IN (SELECT company_id FROM "financeai_user_companies" WHERE user_id = get_app_user_id())
    );

-- 4. Policies for Categories (Owned by Company or System)
CREATE POLICY "Users can access categories of their companies or system categories" ON "financeai_categories"
    FOR ALL USING (
        is_system = true OR
        company_id IN (SELECT company_id FROM "financeai_user_companies" WHERE user_id = get_app_user_id())
    );

-- 5. Policies for Uploads
CREATE POLICY "Users can access uploads of their companies" ON "financeai_uploads"
    FOR ALL USING (
        company_id IN (SELECT company_id FROM "financeai_user_companies" WHERE user_id = get_app_user_id())
    );

-- 6. Policies for Transactions (Linked to Account -> Company)
CREATE POLICY "Users can access transactions of their accounts" ON "financeai_transactions"
    FOR ALL USING (
        account_id IN (
            SELECT id FROM "financeai_accounts" 
            WHERE company_id IN (SELECT company_id FROM "financeai_user_companies" WHERE user_id = get_app_user_id())
        )
    );

-- 7. Policies for Transaction Splits (Linked to Transaction -> Account -> Company)
CREATE POLICY "Users can access splits of their transactions" ON "financeai_transaction_splits"
    FOR ALL USING (
        transaction_id IN (
            SELECT id FROM "financeai_transactions" 
            WHERE account_id IN (
                SELECT id FROM "financeai_accounts" 
                WHERE company_id IN (SELECT company_id FROM "financeai_user_companies" WHERE user_id = get_app_user_id())
            )
        )
    );

-- 8. Policies for Category Rules
CREATE POLICY "Users can access rules of their companies" ON "financeai_category_rules"
    FOR ALL USING (
        company_id IN (SELECT company_id FROM "financeai_user_companies" WHERE user_id = get_app_user_id())
    );

-- 9. Policies for AI Usage Logs
CREATE POLICY "Users can access their own AI logs or company logs" ON "financeai_ai_usage_logs"
    FOR ALL USING (
        user_id = get_app_user_id() OR
        company_id IN (SELECT company_id FROM "financeai_user_companies" WHERE user_id = get_app_user_id())
    );

-- 10. Policies for Projections
CREATE POLICY "Users can access projections of their companies" ON "financeai_projections"
    FOR ALL USING (
        company_id IN (SELECT company_id FROM "financeai_user_companies" WHERE user_id = get_app_user_id())
    );
