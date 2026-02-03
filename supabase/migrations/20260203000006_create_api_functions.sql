-- ============================================
-- VeeoCore - API Helper Functions
-- Migration: Create Database Functions
-- ============================================

-- ============================================
-- AUTHENTICATE API KEY
-- Returns tenant_id if valid, NULL otherwise
-- ============================================
CREATE OR REPLACE FUNCTION public.authenticate_api_key(api_key_input TEXT)
RETURNS UUID AS $$
DECLARE
    tenant_uuid UUID;
BEGIN
    SELECT id INTO tenant_uuid
    FROM public.tenants
    WHERE api_key = api_key_input
      AND is_active = true;
    
    RETURN tenant_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GET TENANT PRICING CONFIG
-- Returns all pricing configuration for a tenant
-- ============================================
CREATE OR REPLACE FUNCTION public.get_tenant_pricing_config(tenant_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'vehicleTypes', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'type', type,
                'name', name,
                'baseFare', base_fare,
                'perKm', per_km,
                'perMinute', per_minute,
                'minimumFare', minimum_fare,
                'peakMultiplier', peak_multiplier,
                'nightMultiplier', night_multiplier,
                'weekendMultiplier', weekend_multiplier
            ) ORDER BY sort_order), '[]'::jsonb)
            FROM public.tenant_vehicle_types
            WHERE tenant_id = tenant_uuid AND is_active = true
        ),
        'zones', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', id,
                'name', name,
                'type', zone_type,
                'pickupFee', pickup_fee,
                'dropoffFee', dropoff_fee,
                'centerLat', center_lat,
                'centerLng', center_lng,
                'radiusKm', radius_km
            )), '[]'::jsonb)
            FROM public.tenant_pricing_zones
            WHERE tenant_id = tenant_uuid AND is_active = true
        ),
        'fixedRoutes', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', id,
                'originName', origin_name,
                'destinationName', destination_name,
                'prices', prices,
                'bidirectional', is_bidirectional
            )), '[]'::jsonb)
            FROM public.tenant_fixed_routes
            WHERE tenant_id = tenant_uuid AND is_active = true
        ),
        'surgeConfig', (
            SELECT jsonb_build_object(
                'maxMultiplier', COALESCE(max_surge_multiplier, 1.50),
                'peakHours', COALESCE(peak_hours, '[]'::jsonb),
                'nightStart', night_start,
                'nightEnd', night_end,
                'weekendEnabled', weekend_enabled
            )
            FROM public.tenant_surge_config
            WHERE tenant_id = tenant_uuid
            LIMIT 1
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FIND AVAILABLE DRIVERS
-- Returns nearby available drivers for a booking
-- ============================================
CREATE OR REPLACE FUNCTION public.find_available_drivers(
    tenant_uuid UUID,
    pickup_lat DECIMAL(10,7),
    pickup_lng DECIMAL(10,7),
    vehicle_type_filter VARCHAR(50) DEFAULT NULL,
    max_distance_km DECIMAL(5,2) DEFAULT 10.0,
    max_results INT DEFAULT 10
)
RETURNS TABLE (
    driver_id UUID,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    vehicle_type VARCHAR(50),
    rating DECIMAL(3,2),
    distance_km DECIMAL(10,2),
    lat DECIMAL(10,7),
    lng DECIMAL(10,7)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.first_name,
        d.last_name,
        d.vehicle_type,
        d.rating,
        -- Haversine formula for distance
        ROUND((
            6371 * ACOS(
                COS(RADIANS(pickup_lat)) * COS(RADIANS(d.current_lat)) *
                COS(RADIANS(d.current_lng) - RADIANS(pickup_lng)) +
                SIN(RADIANS(pickup_lat)) * SIN(RADIANS(d.current_lat))
            )
        )::DECIMAL(10,2), 2) AS distance_km,
        d.current_lat,
        d.current_lng
    FROM public.tenant_drivers d
    WHERE d.tenant_id = tenant_uuid
      AND d.is_active = true
      AND d.status = 'available'
      AND d.current_lat IS NOT NULL
      AND d.current_lng IS NOT NULL
      AND (vehicle_type_filter IS NULL OR d.vehicle_type = vehicle_type_filter)
      AND (
          6371 * ACOS(
              COS(RADIANS(pickup_lat)) * COS(RADIANS(d.current_lat)) *
              COS(RADIANS(d.current_lng) - RADIANS(pickup_lng)) +
              SIN(RADIANS(pickup_lat)) * SIN(RADIANS(d.current_lat))
          )
      ) <= max_distance_km
    ORDER BY distance_km ASC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATE DRIVER LOCATION
-- Updates driver position and returns status
-- ============================================
CREATE OR REPLACE FUNCTION public.update_driver_location(
    driver_uuid UUID,
    new_lat DECIMAL(10,7),
    new_lng DECIMAL(10,7),
    speed_kmh DECIMAL(5,2) DEFAULT NULL,
    heading_deg DECIMAL(5,2) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    driver_record RECORD;
BEGIN
    -- Update driver location
    UPDATE public.tenant_drivers
    SET 
        current_lat = new_lat,
        current_lng = new_lng,
        location_updated_at = NOW()
    WHERE id = driver_uuid
    RETURNING * INTO driver_record;
    
    -- Log to history (only if moved significantly or every 30 seconds)
    INSERT INTO public.driver_location_history (driver_id, tenant_id, lat, lng, speed, heading)
    VALUES (driver_uuid, driver_record.tenant_id, new_lat, new_lng, speed_kmh, heading_deg);
    
    RETURN jsonb_build_object(
        'success', true,
        'driverId', driver_uuid,
        'status', driver_record.status,
        'currentBookingId', driver_record.current_booking_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GET TENANT DASHBOARD STATS
-- Returns dashboard statistics for admin
-- ============================================
CREATE OR REPLACE FUNCTION public.get_tenant_dashboard_stats(tenant_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'drivers', jsonb_build_object(
            'total', (SELECT COUNT(*) FROM tenant_drivers WHERE tenant_id = tenant_uuid AND is_active = true),
            'available', (SELECT COUNT(*) FROM tenant_drivers WHERE tenant_id = tenant_uuid AND status = 'available'),
            'busy', (SELECT COUNT(*) FROM tenant_drivers WHERE tenant_id = tenant_uuid AND status = 'busy'),
            'offline', (SELECT COUNT(*) FROM tenant_drivers WHERE tenant_id = tenant_uuid AND status = 'offline')
        ),
        'bookings', jsonb_build_object(
            'today', (
                SELECT COUNT(*) FROM tenant_bookings 
                WHERE tenant_id = tenant_uuid 
                  AND DATE(scheduled_for) = CURRENT_DATE
            ),
            'pending', (
                SELECT COUNT(*) FROM tenant_bookings 
                WHERE tenant_id = tenant_uuid AND status = 'pending'
            ),
            'inProgress', (
                SELECT COUNT(*) FROM tenant_bookings 
                WHERE tenant_id = tenant_uuid AND status IN ('assigned', 'driver_en_route', 'arrived', 'in_progress')
            ),
            'completedToday', (
                SELECT COUNT(*) FROM tenant_bookings 
                WHERE tenant_id = tenant_uuid 
                  AND status = 'completed'
                  AND DATE(ride_completed_at) = CURRENT_DATE
            )
        ),
        'revenue', jsonb_build_object(
            'today', (
                SELECT COALESCE(SUM(final_price), 0) FROM tenant_bookings 
                WHERE tenant_id = tenant_uuid 
                  AND status = 'completed'
                  AND DATE(ride_completed_at) = CURRENT_DATE
            ),
            'thisWeek', (
                SELECT COALESCE(SUM(final_price), 0) FROM tenant_bookings 
                WHERE tenant_id = tenant_uuid 
                  AND status = 'completed'
                  AND ride_completed_at >= DATE_TRUNC('week', CURRENT_DATE)
            ),
            'thisMonth', (
                SELECT COALESCE(SUM(final_price), 0) FROM tenant_bookings 
                WHERE tenant_id = tenant_uuid 
                  AND status = 'completed'
                  AND ride_completed_at >= DATE_TRUNC('month', CURRENT_DATE)
            )
        )
    ) INTO stats;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SEED DEFAULT VEHICLE TYPES
-- Called after creating a new tenant
-- ============================================
CREATE OR REPLACE FUNCTION public.seed_tenant_defaults(tenant_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Insert default vehicle types
    INSERT INTO public.tenant_vehicle_types (tenant_id, type, name, base_fare, per_km, per_minute, minimum_fare, max_passengers, sort_order)
    VALUES 
        (tenant_uuid, 'standard', 'Standard', 4.50, 1.35, 0.35, 8.00, 4, 1),
        (tenant_uuid, 'premium', 'Premium', 5.50, 1.60, 0.42, 10.00, 4, 2),
        (tenant_uuid, 'van', 'Van', 12.00, 2.10, 0.55, 25.00, 7, 3);
    
    -- Insert default surge config
    INSERT INTO public.tenant_surge_config (tenant_id)
    VALUES (tenant_uuid);
END;
$$ LANGUAGE plpgsql;

-- Trigger to seed defaults on new tenant
CREATE OR REPLACE FUNCTION trigger_seed_tenant_defaults()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.seed_tenant_defaults(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_tenant_insert
    AFTER INSERT ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION trigger_seed_tenant_defaults();

-- Comments
COMMENT ON FUNCTION public.authenticate_api_key IS 'Validates API key and returns tenant_id';
COMMENT ON FUNCTION public.get_tenant_pricing_config IS 'Returns complete pricing configuration for a tenant';
COMMENT ON FUNCTION public.find_available_drivers IS 'Finds nearby available drivers using Haversine formula';
COMMENT ON FUNCTION public.update_driver_location IS 'Updates driver GPS position and logs history';
COMMENT ON FUNCTION public.get_tenant_dashboard_stats IS 'Returns dashboard statistics for admin panel';
