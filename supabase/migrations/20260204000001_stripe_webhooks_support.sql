-- Migration: Support Stripe Webhooks et Paiements
-- Tables pour gérer les logs Stripe et les paiements

-- Table pour les logs des webhooks Stripe
CREATE TABLE IF NOT EXISTS stripe_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB,
    processed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_logs_tenant ON stripe_webhook_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_logs_event_type ON stripe_webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_logs_created ON stripe_webhook_logs(created_at);

-- Table pour les paiements
CREATE TABLE IF NOT EXISTS tenant_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES tenant_bookings(id) ON DELETE SET NULL,
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded', 'disputed'
    )),
    payment_method TEXT,
    refunded_amount DECIMAL(10, 2) DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_payments_tenant ON tenant_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_payments_booking ON tenant_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_tenant_payments_status ON tenant_payments(status);
CREATE INDEX IF NOT EXISTS idx_tenant_payments_created ON tenant_payments(created_at);

-- Ajouter les colonnes webhook_secret à la table tenants
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS stripe_webhook_secret TEXT,
ADD COLUMN IF NOT EXISTS webhook_secret TEXT;

-- Vue pour les statistiques de paiements par tenant
CREATE OR REPLACE VIEW tenant_payment_stats AS
SELECT 
    tenant_id,
    DATE_TRUNC('day', created_at) AS date,
    COUNT(*) AS total_transactions,
    COUNT(*) FILTER (WHERE status = 'succeeded') AS successful_transactions,
    COUNT(*) FILTER (WHERE status = 'failed') AS failed_transactions,
    COUNT(*) FILTER (WHERE status = 'refunded') AS refunded_transactions,
    SUM(amount) FILTER (WHERE status = 'succeeded') AS total_revenue,
    SUM(refunded_amount) AS total_refunded,
    AVG(amount) FILTER (WHERE status = 'succeeded') AS avg_transaction_amount
FROM tenant_payments
GROUP BY tenant_id, DATE_TRUNC('day', created_at);

-- Fonction pour calculer les revenus d'un tenant
CREATE OR REPLACE FUNCTION get_tenant_revenue(
    p_tenant_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    total_revenue DECIMAL,
    total_refunded DECIMAL,
    net_revenue DECIMAL,
    transaction_count BIGINT,
    avg_transaction DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(amount) FILTER (WHERE status = 'succeeded'), 0) AS total_revenue,
        COALESCE(SUM(refunded_amount), 0) AS total_refunded,
        COALESCE(SUM(amount) FILTER (WHERE status = 'succeeded'), 0) - COALESCE(SUM(refunded_amount), 0) AS net_revenue,
        COUNT(*) FILTER (WHERE status = 'succeeded') AS transaction_count,
        COALESCE(AVG(amount) FILTER (WHERE status = 'succeeded'), 0) AS avg_transaction
    FROM tenant_payments
    WHERE tenant_id = p_tenant_id
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour incrémenter les stats du chauffeur
CREATE OR REPLACE FUNCTION increment_driver_stats(
    p_driver_id UUID,
    p_earnings DECIMAL
)
RETURNS VOID AS $$
BEGIN
    UPDATE drivers
    SET 
        total_rides = COALESCE(total_rides, 0) + 1,
        earnings_total = COALESCE(earnings_total, 0) + p_earnings,
        earnings_month = COALESCE(earnings_month, 0) + p_earnings,
        updated_at = now()
    WHERE id = p_driver_id;
END;
$$ LANGUAGE plpgsql;

-- Reset mensuel des revenus chauffeurs (à exécuter via cron)
CREATE OR REPLACE FUNCTION reset_monthly_driver_earnings()
RETURNS VOID AS $$
BEGIN
    UPDATE drivers SET earnings_month = 0;
END;
$$ LANGUAGE plpgsql;

-- RLS pour stripe_webhook_logs
ALTER TABLE stripe_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY stripe_webhook_logs_tenant_isolation ON stripe_webhook_logs
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- RLS pour tenant_payments  
ALTER TABLE tenant_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_payments_tenant_isolation ON tenant_payments
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

COMMENT ON TABLE stripe_webhook_logs IS 'Logs des événements Stripe reçus via webhook';
COMMENT ON TABLE tenant_payments IS 'Historique des paiements par tenant';
