-- Migration: Support Tenant Admin Dashboard
-- Créer les tables nécessaires pour l'authentification tenant et le dashboard admin

-- Table tenant_users pour les utilisateurs de chaque tenant
CREATE TABLE IF NOT EXISTS tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'manager', 'operator', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(email)
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_email ON tenant_users(email);

-- Table tenant_bookings pour les réservations de chaque tenant
CREATE TABLE IF NOT EXISTS tenant_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    booking_reference TEXT UNIQUE NOT NULL,
    
    -- Client info
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT NOT NULL,
    
    -- Adresses
    pickup_address TEXT NOT NULL,
    pickup_lat DOUBLE PRECISION,
    pickup_lng DOUBLE PRECISION,
    dropoff_address TEXT NOT NULL,
    dropoff_lat DOUBLE PRECISION,
    dropoff_lng DOUBLE PRECISION,
    
    -- Trajets
    distance_km DECIMAL(10, 2),
    duration_minutes INTEGER,
    
    -- Tarification
    base_price DECIMAL(10, 2),
    distance_price DECIMAL(10, 2),
    time_price DECIMAL(10, 2),
    supplements JSONB DEFAULT '{}',
    total_price DECIMAL(10, 2) NOT NULL,
    
    -- Véhicule et chauffeur
    vehicle_type TEXT DEFAULT 'standard',
    passengers INTEGER DEFAULT 1,
    driver_id UUID REFERENCES drivers(id),
    
    -- Statut
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'assigned', 'en_route', 'arrived', 
        'in_progress', 'completed', 'cancelled'
    )),
    
    -- Date/heure
    scheduled_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    -- Paiement
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'authorized', 'captured', 'refunded', 'failed'
    )),
    payment_intent_id TEXT,
    payment_method TEXT,
    
    -- Métadonnées
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour les réservations
CREATE INDEX IF NOT EXISTS idx_tenant_bookings_tenant_id ON tenant_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_bookings_status ON tenant_bookings(status);
CREATE INDEX IF NOT EXISTS idx_tenant_bookings_driver_id ON tenant_bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_tenant_bookings_scheduled_at ON tenant_bookings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_tenant_bookings_reference ON tenant_bookings(booking_reference);

-- Ajouter des colonnes manquantes à la table tenants
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS stripe_publishable_key TEXT,
ADD COLUMN IF NOT EXISTS stripe_secret_key TEXT,
ADD COLUMN IF NOT EXISTS stripe_configured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS webhook_events TEXT[] DEFAULT ARRAY['booking.created', 'booking.completed', 'payment.captured'],
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Paris',
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';

-- Table pour les notifications des chauffeurs
CREATE TABLE IF NOT EXISTS driver_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES tenant_bookings(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('new_booking', 'booking_update', 'booking_cancelled', 'message', 'alert')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_notifications_driver_id ON driver_notifications(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_notifications_is_read ON driver_notifications(is_read);

-- Table pour les tokens de session des chauffeurs
CREATE TABLE IF NOT EXISTS driver_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    device_info JSONB,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_sessions_driver_id ON driver_sessions(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_sessions_expires_at ON driver_sessions(expires_at);

-- Fonction pour générer un numéro de réservation unique
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN 'VTC-' || result;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour générer automatiquement le numéro de réservation
CREATE OR REPLACE FUNCTION set_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.booking_reference IS NULL THEN
        NEW.booking_reference := generate_booking_reference();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_booking_reference ON tenant_bookings;
CREATE TRIGGER trigger_set_booking_reference
    BEFORE INSERT ON tenant_bookings
    FOR EACH ROW
    EXECUTE FUNCTION set_booking_reference();

-- Ajouter des colonnes au drivers pour le tenant admin
ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS vehicle_brand TEXT,
ADD COLUMN IF NOT EXISTS vehicle_model TEXT,
ADD COLUMN IF NOT EXISTS vehicle_color TEXT,
ADD COLUMN IF NOT EXISTS license_expiry DATE,
ADD COLUMN IF NOT EXISTS rating DECIMAL(2, 1) DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS total_rides INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS earnings_total DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS earnings_month DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_location JSONB,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- RLS Policies pour tenant_users
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_users_tenant_isolation ON tenant_users
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- RLS Policies pour tenant_bookings
ALTER TABLE tenant_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_bookings_tenant_isolation ON tenant_bookings
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- RLS Policies pour driver_notifications
ALTER TABLE driver_notifications ENABLE ROW LEVEL SECURITY;

-- Commentaires de documentation
COMMENT ON TABLE tenant_users IS 'Utilisateurs admin/opérateurs de chaque tenant';
COMMENT ON TABLE tenant_bookings IS 'Réservations de chaque tenant';
COMMENT ON TABLE driver_notifications IS 'Notifications push pour les chauffeurs';
COMMENT ON TABLE driver_sessions IS 'Sessions d''authentification des chauffeurs';
