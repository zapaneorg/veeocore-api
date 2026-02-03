-- ============================================
-- VeeoCore - Bookings Management
-- Migration: Create Bookings Tables
-- ============================================

-- ============================================
-- BOOKINGS (Per Tenant)
-- ============================================
CREATE TABLE public.tenant_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Reference number (human readable)
    reference VARCHAR(20) NOT NULL,
    
    -- Customer info
    customer_name VARCHAR(200) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50) NOT NULL,
    
    -- Pickup
    pickup_address TEXT NOT NULL,
    pickup_lat DECIMAL(10,7),
    pickup_lng DECIMAL(10,7),
    pickup_instructions TEXT,
    
    -- Dropoff
    dropoff_address TEXT NOT NULL,
    dropoff_lat DECIMAL(10,7),
    dropoff_lng DECIMAL(10,7),
    dropoff_instructions TEXT,
    
    -- Stops (intermediate stops)
    stops JSONB DEFAULT '[]'::jsonb,
    -- Example: [{"address": "...", "lat": ..., "lng": ..., "waitTime": 5}]
    
    -- Scheduling
    scheduled_for TIMESTAMPTZ NOT NULL,
    is_immediate BOOLEAN DEFAULT false,
    
    -- Vehicle & Driver
    vehicle_type VARCHAR(50) NOT NULL,
    driver_id UUID REFERENCES public.tenant_drivers(id) ON DELETE SET NULL,
    
    -- Passengers & Luggage
    passengers INT DEFAULT 1,
    luggage INT DEFAULT 0,
    
    -- Pricing
    estimated_distance_km DECIMAL(10,2),
    estimated_duration_minutes INT,
    base_price DECIMAL(10,2) NOT NULL,
    surge_multiplier DECIMAL(4,2) DEFAULT 1.00,
    zone_fees DECIMAL(10,2) DEFAULT 0,
    stops_fee DECIMAL(10,2) DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL,
    
    -- Actual values (after ride completion)
    actual_distance_km DECIMAL(10,2),
    actual_duration_minutes INT,
    final_price DECIMAL(10,2),
    
    -- Payment
    payment_method VARCHAR(50) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'invoice', 'online')),
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    payment_intent_id VARCHAR(255), -- Stripe payment intent
    
    -- Status flow: pending -> assigned -> driver_en_route -> arrived -> in_progress -> completed
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending',
        'assigned',
        'driver_en_route',
        'arrived',
        'in_progress',
        'completed',
        'cancelled',
        'no_show'
    )),
    
    -- Timestamps
    assigned_at TIMESTAMPTZ,
    driver_departed_at TIMESTAMPTZ,
    driver_arrived_at TIMESTAMPTZ,
    ride_started_at TIMESTAMPTZ,
    ride_completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    -- Cancellation
    cancelled_by VARCHAR(50), -- 'customer', 'driver', 'admin', 'system'
    cancellation_reason TEXT,
    cancellation_fee DECIMAL(10,2) DEFAULT 0,
    
    -- Rating (after completion)
    customer_rating INT CHECK (customer_rating BETWEEN 1 AND 5),
    customer_review TEXT,
    driver_rating INT CHECK (driver_rating BETWEEN 1 AND 5),
    
    -- Notes
    internal_notes TEXT,
    
    -- Source
    source VARCHAR(50) DEFAULT 'api' CHECK (source IN ('api', 'widget', 'admin', 'app', 'phone')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generate reference number
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
    NEW.reference := 'BK-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || 
                     UPPER(SUBSTRING(NEW.id::text FROM 1 FOR 4));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_booking_reference
    BEFORE INSERT ON public.tenant_bookings
    FOR EACH ROW
    EXECUTE FUNCTION generate_booking_reference();

-- Indexes
CREATE INDEX idx_bookings_tenant ON public.tenant_bookings(tenant_id);
CREATE INDEX idx_bookings_driver ON public.tenant_bookings(driver_id);
CREATE INDEX idx_bookings_status ON public.tenant_bookings(tenant_id, status);
CREATE INDEX idx_bookings_scheduled ON public.tenant_bookings(tenant_id, scheduled_for);
CREATE INDEX idx_bookings_reference ON public.tenant_bookings(reference);
CREATE INDEX idx_bookings_customer_phone ON public.tenant_bookings(tenant_id, customer_phone);

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON public.tenant_bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- BOOKING STATUS HISTORY
-- ============================================
CREATE TABLE public.booking_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.tenant_bookings(id) ON DELETE CASCADE,
    
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(100), -- user_id, driver_id, or 'system'
    reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_status_history_booking ON public.booking_status_history(booking_id, created_at DESC);

-- Trigger to log status changes
CREATE OR REPLACE FUNCTION log_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.booking_status_history (booking_id, old_status, new_status)
        VALUES (NEW.id, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_status_change_trigger
    AFTER UPDATE ON public.tenant_bookings
    FOR EACH ROW
    EXECUTE FUNCTION log_booking_status_change();

-- ============================================
-- DISPATCH ATTEMPTS (track driver notifications)
-- ============================================
CREATE TABLE public.booking_dispatch_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.tenant_bookings(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.tenant_drivers(id) ON DELETE CASCADE,
    
    notified_at TIMESTAMPTZ DEFAULT NOW(),
    response VARCHAR(50), -- 'accepted', 'declined', 'expired'
    responded_at TIMESTAMPTZ,
    
    distance_km DECIMAL(10,2), -- Distance to pickup at time of dispatch
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dispatch_attempts_booking ON public.booking_dispatch_attempts(booking_id);
CREATE INDEX idx_dispatch_attempts_driver ON public.booking_dispatch_attempts(driver_id);

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE public.tenant_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_dispatch_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage bookings"
    ON public.tenant_bookings FOR ALL
    USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Tenant admins can view status history"
    ON public.booking_status_history FOR SELECT
    USING (booking_id IN (
        SELECT id FROM public.tenant_bookings 
        WHERE tenant_id IN (SELECT get_user_tenant_ids())
    ));

CREATE POLICY "Tenant admins can view dispatch attempts"
    ON public.booking_dispatch_attempts FOR SELECT
    USING (booking_id IN (
        SELECT id FROM public.tenant_bookings 
        WHERE tenant_id IN (SELECT get_user_tenant_ids())
    ));

-- Comments
COMMENT ON TABLE public.tenant_bookings IS 'All bookings/rides per tenant';
COMMENT ON TABLE public.booking_status_history IS 'Audit log of booking status changes';
COMMENT ON TABLE public.booking_dispatch_attempts IS 'Track which drivers were notified and their responses';
