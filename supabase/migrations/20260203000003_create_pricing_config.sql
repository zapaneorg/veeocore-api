-- ============================================
-- VeeoCore - Pricing Configuration
-- Migration: Create Pricing Tables
-- ============================================

-- ============================================
-- VEHICLE TYPES (Per Tenant)
-- ============================================
CREATE TABLE public.tenant_vehicle_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    type VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Pricing
    base_fare DECIMAL(10,2) NOT NULL DEFAULT 4.50,
    per_km DECIMAL(10,2) NOT NULL DEFAULT 1.35,
    per_minute DECIMAL(10,2) NOT NULL DEFAULT 0.35,
    minimum_fare DECIMAL(10,2) NOT NULL DEFAULT 8.00,
    
    -- Commission
    commission_percent DECIMAL(5,2) DEFAULT 20.00,
    
    -- Surge multipliers
    peak_multiplier DECIMAL(4,2) DEFAULT 1.15,
    night_multiplier DECIMAL(4,2) DEFAULT 1.05,
    weekend_multiplier DECIMAL(4,2) DEFAULT 1.10,
    
    -- Capacity
    max_passengers INT DEFAULT 4,
    max_luggage INT DEFAULT 2,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, type)
);

CREATE INDEX idx_vehicle_types_tenant ON public.tenant_vehicle_types(tenant_id);
CREATE TRIGGER update_vehicle_types_updated_at
    BEFORE UPDATE ON public.tenant_vehicle_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PRICING ZONES (Airports, Stations, etc.)
-- ============================================
CREATE TABLE public.tenant_pricing_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    zone_type VARCHAR(50) NOT NULL CHECK (zone_type IN ('airport', 'station', 'port', 'zone', 'custom')),
    
    -- Fee applied when pickup/dropoff in this zone
    pickup_fee DECIMAL(10,2) DEFAULT 0,
    dropoff_fee DECIMAL(10,2) DEFAULT 0,
    
    -- Geographic area (center point + radius or polygon)
    center_lat DECIMAL(10,7),
    center_lng DECIMAL(10,7),
    radius_km DECIMAL(5,2),
    polygon JSONB, -- GeoJSON polygon for complex zones
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pricing_zones_tenant ON public.tenant_pricing_zones(tenant_id);
CREATE INDEX idx_pricing_zones_location ON public.tenant_pricing_zones(center_lat, center_lng);

-- ============================================
-- FIXED PRICE ROUTES
-- ============================================
CREATE TABLE public.tenant_fixed_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    name VARCHAR(200),
    
    -- Origin
    origin_name VARCHAR(200) NOT NULL,
    origin_lat DECIMAL(10,7),
    origin_lng DECIMAL(10,7),
    origin_radius_km DECIMAL(5,2) DEFAULT 1.0,
    
    -- Destination
    destination_name VARCHAR(200) NOT NULL,
    destination_lat DECIMAL(10,7),
    destination_lng DECIMAL(10,7),
    destination_radius_km DECIMAL(5,2) DEFAULT 1.0,
    
    -- Fixed prices per vehicle type (JSONB for flexibility)
    prices JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Example: {"standard": 35, "premium": 50, "van": 75}
    
    -- Bidirectional (same price both ways)
    is_bidirectional BOOLEAN DEFAULT true,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fixed_routes_tenant ON public.tenant_fixed_routes(tenant_id);

-- ============================================
-- SURGE PRICING CONFIG
-- ============================================
CREATE TABLE public.tenant_surge_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Maximum surge cap
    max_surge_multiplier DECIMAL(4,2) DEFAULT 1.50,
    
    -- Peak hours (stored as JSON array)
    peak_hours JSONB DEFAULT '[
        {"start": "07:00", "end": "09:00", "multiplier": 1.15},
        {"start": "17:00", "end": "19:00", "multiplier": 1.15}
    ]'::jsonb,
    
    -- Night hours
    night_start TIME DEFAULT '22:00',
    night_end TIME DEFAULT '06:00',
    
    -- Weekend config
    weekend_enabled BOOLEAN DEFAULT true,
    
    -- Dynamic surge based on demand (future feature)
    dynamic_surge_enabled BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id)
);

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE public.tenant_vehicle_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_pricing_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_fixed_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_surge_config ENABLE ROW LEVEL SECURITY;

-- Policy macro for tenant isolation
CREATE OR REPLACE FUNCTION get_user_tenant_ids()
RETURNS SETOF UUID AS $$
    SELECT tenant_id FROM public.tenant_admins WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Vehicle Types policies
CREATE POLICY "Tenant admins can manage vehicle types"
    ON public.tenant_vehicle_types FOR ALL
    USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Pricing Zones policies
CREATE POLICY "Tenant admins can manage pricing zones"
    ON public.tenant_pricing_zones FOR ALL
    USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Fixed Routes policies
CREATE POLICY "Tenant admins can manage fixed routes"
    ON public.tenant_fixed_routes FOR ALL
    USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Surge Config policies
CREATE POLICY "Tenant admins can manage surge config"
    ON public.tenant_surge_config FOR ALL
    USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Comments
COMMENT ON TABLE public.tenant_vehicle_types IS 'Vehicle types and their pricing per tenant';
COMMENT ON TABLE public.tenant_pricing_zones IS 'Geographic zones with special fees (airports, stations)';
COMMENT ON TABLE public.tenant_fixed_routes IS 'Fixed price routes between common locations';
COMMENT ON TABLE public.tenant_surge_config IS 'Surge pricing configuration per tenant';
