-- ============================================
-- VeeoCore - Multi-tenant Schema
-- Migration: Create Tenants Table
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TENANTS (Clients SaaS)
-- ============================================
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    
    -- API Authentication
    api_key VARCHAR(64) UNIQUE NOT NULL DEFAULT md5(random()::text || clock_timestamp()::text),
    api_key_created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Subscription
    plan VARCHAR(50) DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
    plan_started_at TIMESTAMPTZ DEFAULT NOW(),
    plan_expires_at TIMESTAMPTZ,
    
    -- Settings
    settings JSONB DEFAULT '{
        "currency": "EUR",
        "timezone": "Europe/Paris",
        "locale": "fr",
        "notifications": {
            "email": true,
            "sms": false,
            "push": true
        }
    }'::jsonb,
    
    -- Branding
    branding JSONB DEFAULT '{
        "primaryColor": "#2563eb",
        "logo": null,
        "companyName": null
    }'::jsonb,
    
    -- Webhook
    webhook_url TEXT,
    webhook_secret VARCHAR(64),
    webhook_events TEXT[] DEFAULT ARRAY['booking.created', 'booking.completed', 'booking.cancelled'],
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for API key lookup
CREATE INDEX idx_tenants_api_key ON public.tenants(api_key) WHERE is_active = true;
CREATE INDEX idx_tenants_slug ON public.tenants(slug);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TENANT ADMINS (Users who manage tenants)
-- ============================================
CREATE TABLE public.tenant_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References Supabase Auth
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenant_admins_tenant ON public.tenant_admins(tenant_id);
CREATE INDEX idx_tenant_admins_user ON public.tenant_admins(user_id);
CREATE UNIQUE INDEX idx_tenant_admins_unique ON public.tenant_admins(tenant_id, user_id);

-- ============================================
-- RLS Policies for Tenants
-- ============================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_admins ENABLE ROW LEVEL SECURITY;

-- Tenant admins can view their tenant
CREATE POLICY "Tenant admins can view their tenant"
    ON public.tenants FOR SELECT
    USING (
        id IN (
            SELECT tenant_id FROM public.tenant_admins 
            WHERE user_id = auth.uid()
        )
    );

-- Tenant admins can update their tenant
CREATE POLICY "Tenant admins can update their tenant"
    ON public.tenants FOR UPDATE
    USING (
        id IN (
            SELECT tenant_id FROM public.tenant_admins 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Tenant admins can view their memberships
CREATE POLICY "Users can view their tenant memberships"
    ON public.tenant_admins FOR SELECT
    USING (user_id = auth.uid());

-- Comments
COMMENT ON TABLE public.tenants IS 'SaaS tenants (VTC companies using VeeoCore)';
COMMENT ON TABLE public.tenant_admins IS 'Admin users who can manage tenants';
COMMENT ON COLUMN public.tenants.api_key IS 'API key for authenticating API requests';
COMMENT ON COLUMN public.tenants.plan IS 'Subscription plan: starter, pro, enterprise';
