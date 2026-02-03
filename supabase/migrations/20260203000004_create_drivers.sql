-- ============================================
-- VeeoCore - Drivers Management
-- Migration: Create Drivers Tables
-- ============================================

-- ============================================
-- DRIVERS (Per Tenant)
-- ============================================
CREATE TABLE public.tenant_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Personal info
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    photo_url TEXT,
    
    -- Vehicle info
    vehicle_type VARCHAR(50) NOT NULL,
    vehicle_make VARCHAR(100),
    vehicle_model VARCHAR(100),
    vehicle_color VARCHAR(50),
    vehicle_plate VARCHAR(20),
    vehicle_year INT,
    
    -- Professional info
    license_number VARCHAR(100),
    vtc_card_number VARCHAR(100),
    vtc_card_expiry DATE,
    
    -- Rating
    rating DECIMAL(3,2) DEFAULT 5.00,
    total_rides INT DEFAULT 0,
    total_ratings INT DEFAULT 0,
    
    -- Status
    status VARCHAR(50) DEFAULT 'offline' CHECK (status IN ('available', 'busy', 'offline', 'on_break')),
    current_booking_id UUID,
    
    -- Location (updated in real-time)
    current_lat DECIMAL(10,7),
    current_lng DECIMAL(10,7),
    location_updated_at TIMESTAMPTZ,
    
    -- Push notifications
    fcm_token TEXT,
    notification_preferences JSONB DEFAULT '{
        "newBooking": true,
        "bookingCancelled": true,
        "reminder": true
    }'::jsonb,
    
    -- Commission override (null = use vehicle type default)
    commission_percent DECIMAL(5,2),
    
    -- Availability schedule (optional)
    schedule JSONB,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_drivers_tenant ON public.tenant_drivers(tenant_id);
CREATE INDEX idx_drivers_status ON public.tenant_drivers(tenant_id, status) WHERE is_active = true;
CREATE INDEX idx_drivers_location ON public.tenant_drivers(current_lat, current_lng) WHERE status = 'available';
CREATE INDEX idx_drivers_vehicle_type ON public.tenant_drivers(tenant_id, vehicle_type);

CREATE TRIGGER update_drivers_updated_at
    BEFORE UPDATE ON public.tenant_drivers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DRIVER LOCATION HISTORY (for analytics)
-- ============================================
CREATE TABLE public.driver_location_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.tenant_drivers(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    lat DECIMAL(10,7) NOT NULL,
    lng DECIMAL(10,7) NOT NULL,
    speed DECIMAL(5,2), -- km/h
    heading DECIMAL(5,2), -- degrees
    
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partition by time for performance (monthly partitions)
CREATE INDEX idx_location_history_driver ON public.driver_location_history(driver_id, recorded_at DESC);
CREATE INDEX idx_location_history_tenant ON public.driver_location_history(tenant_id, recorded_at DESC);

-- ============================================
-- DRIVER EARNINGS (daily summary)
-- ============================================
CREATE TABLE public.driver_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.tenant_drivers(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    date DATE NOT NULL,
    
    total_rides INT DEFAULT 0,
    total_distance_km DECIMAL(10,2) DEFAULT 0,
    total_duration_minutes INT DEFAULT 0,
    
    gross_earnings DECIMAL(10,2) DEFAULT 0,
    commission_amount DECIMAL(10,2) DEFAULT 0,
    net_earnings DECIMAL(10,2) DEFAULT 0,
    
    tips_amount DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(driver_id, date)
);

CREATE INDEX idx_driver_earnings_date ON public.driver_earnings(driver_id, date DESC);
CREATE INDEX idx_driver_earnings_tenant ON public.driver_earnings(tenant_id, date DESC);

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE public.tenant_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage drivers"
    ON public.tenant_drivers FOR ALL
    USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Tenant admins can view location history"
    ON public.driver_location_history FOR SELECT
    USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Tenant admins can view earnings"
    ON public.driver_earnings FOR SELECT
    USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Comments
COMMENT ON TABLE public.tenant_drivers IS 'Drivers belonging to each tenant';
COMMENT ON TABLE public.driver_location_history IS 'Historical location data for analytics';
COMMENT ON TABLE public.driver_earnings IS 'Daily earnings summary per driver';
