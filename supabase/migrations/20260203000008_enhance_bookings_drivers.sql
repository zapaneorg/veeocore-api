-- Migration: Amélioration des tables existantes pour dispatch et analytics
-- 20260203000008_enhance_bookings_drivers.sql

-- Ajouter colonnes de dispatch aux bookings
ALTER TABLE tenant_bookings 
ADD COLUMN IF NOT EXISTS dispatch_request_id UUID,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pickup_eta_minutes INTEGER,
ADD COLUMN IF NOT EXISTS final_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'card';

-- Ajouter colonnes aux drivers pour le dispatch
ALTER TABLE tenant_drivers
ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(500),
ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS total_rides INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS acceptance_rate DECIMAL(5, 2) DEFAULT 100,
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3, 2) DEFAULT 5.0;

-- Table pour l'historique des dispatch (analytics)
CREATE TABLE IF NOT EXISTS dispatch_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES tenant_bookings(id) ON DELETE SET NULL,
  request_id UUID NOT NULL,
  
  -- Résultats du dispatch
  drivers_notified INTEGER DEFAULT 0,
  drivers_declined INTEGER DEFAULT 0,
  assigned_driver_id UUID REFERENCES tenant_drivers(id) ON DELETE SET NULL,
  
  -- Temps
  search_started_at TIMESTAMPTZ NOT NULL,
  search_ended_at TIMESTAMPTZ,
  response_time_seconds INTEGER,
  
  -- Statut final
  status VARCHAR(30) NOT NULL, -- 'assigned', 'no_driver', 'cancelled', 'timeout'
  failure_reason VARCHAR(200),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les métriques API par tenant (analytics)
CREATE TABLE IF NOT EXISTS api_usage_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Compteurs journaliers
  requests_total INTEGER DEFAULT 0,
  requests_pricing INTEGER DEFAULT 0,
  requests_bookings INTEGER DEFAULT 0,
  requests_drivers INTEGER DEFAULT 0,
  requests_geo INTEGER DEFAULT 0,
  
  -- Erreurs
  errors_total INTEGER DEFAULT 0,
  errors_rate_limit INTEGER DEFAULT 0,
  errors_validation INTEGER DEFAULT 0,
  errors_auth INTEGER DEFAULT 0,
  
  -- Performance
  avg_latency_ms DECIMAL(10, 2),
  p95_latency_ms DECIMAL(10, 2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, date)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_dispatch_history_tenant ON dispatch_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_history_booking ON dispatch_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_api_metrics_tenant_date ON api_usage_metrics(tenant_id, date);

-- RLS
ALTER TABLE dispatch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their dispatch history"
  ON dispatch_history FOR SELECT
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "Tenants can view their api metrics"
  ON api_usage_metrics FOR SELECT
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
