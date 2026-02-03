-- Migration: Zones de tarification et routes à prix fixe
-- 20260203000007_create_pricing_zones.sql

-- Table des zones de tarification
CREATE TABLE IF NOT EXISTS pricing_zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('polygon', 'circle')),
  
  -- Pour les polygones
  coordinates JSONB, -- [{lat, lng}, ...]
  
  -- Pour les cercles
  center JSONB, -- {lat, lng}
  radius_km DECIMAL(10, 2),
  
  -- Configuration de tarification
  pricing JSONB DEFAULT '{}', -- {surchargePercent, surchargeFixed, minimumFare, perKmMultiplier}
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des routes à prix fixe
CREATE TABLE IF NOT EXISTS fixed_price_routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  
  -- Point de départ
  origin_name VARCHAR(200) NOT NULL,
  origin_lat DECIMAL(10, 7) NOT NULL,
  origin_lng DECIMAL(10, 7) NOT NULL,
  origin_radius_km DECIMAL(5, 2) DEFAULT 1.0,
  
  -- Point d'arrivée
  destination_name VARCHAR(200) NOT NULL,
  destination_lat DECIMAL(10, 7) NOT NULL,
  destination_lng DECIMAL(10, 7) NOT NULL,
  destination_radius_km DECIMAL(5, 2) DEFAULT 1.0,
  
  -- Prix par type de véhicule
  prices JSONB NOT NULL DEFAULT '{}', -- {standard: 25, premium: 35, van: 50}
  
  bidirectional BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_pricing_zones_tenant ON pricing_zones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pricing_zones_active ON pricing_zones(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_fixed_routes_tenant ON fixed_price_routes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fixed_routes_active ON fixed_price_routes(tenant_id, is_active);

-- RLS Policies
ALTER TABLE pricing_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_price_routes ENABLE ROW LEVEL SECURITY;

-- Policies pour pricing_zones
CREATE POLICY "Tenants can view their zones"
  ON pricing_zones FOR SELECT
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "Tenants can insert their zones"
  ON pricing_zones FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "Tenants can update their zones"
  ON pricing_zones FOR UPDATE
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "Tenants can delete their zones"
  ON pricing_zones FOR DELETE
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Policies pour fixed_price_routes
CREATE POLICY "Tenants can view their routes"
  ON fixed_price_routes FOR SELECT
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "Tenants can insert their routes"
  ON fixed_price_routes FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "Tenants can update their routes"
  ON fixed_price_routes FOR UPDATE
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "Tenants can delete their routes"
  ON fixed_price_routes FOR DELETE
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
