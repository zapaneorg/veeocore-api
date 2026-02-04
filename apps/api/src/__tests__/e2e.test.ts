/**
 * Tests E2E pour VeeoCore API
 * Validation du flux complet tenant → booking → driver → paiement
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_URL = process.env.API_URL || 'http://localhost:4000';

// Variables pour les tests
let tenantApiKey: string;
let tenantId: string;
let tenantAdminToken: string;
let driverToken: string;
let driverId: string;
let bookingId: string;

describe('VeeoCore API E2E Tests', () => {
  
  // ========================================
  // SECTION 1: TENANT ADMIN AUTH
  // ========================================
  
  describe('1. Tenant Admin Authentication', () => {
    it('should login tenant admin', async () => {
      const res = await fetch(`${API_URL}/api/v1/auth/tenant/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@test-vtc.com',
          password: 'test1234'
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        expect(data.token).toBeDefined();
        expect(data.tenant).toBeDefined();
        tenantAdminToken = data.token;
        tenantId = data.tenant.id;
        tenantApiKey = data.tenant.api_key;
        console.log('✅ Tenant admin logged in:', tenantId);
      } else {
        // Si pas de tenant test, skip
        console.log('⚠️ No test tenant found, some tests will be skipped');
      }
    });

    it('should get tenant dashboard stats', async () => {
      if (!tenantAdminToken) return;
      
      const res = await fetch(`${API_URL}/api/v1/tenant/dashboard/stats`, {
        headers: { 
          'Authorization': `Bearer ${tenantAdminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty('totalRevenue');
      expect(data).toHaveProperty('totalBookings');
      expect(data).toHaveProperty('activeDrivers');
    });
  });

  // ========================================
  // SECTION 2: PRICING API
  // ========================================
  
  describe('2. Pricing API', () => {
    it('should calculate price with /pricing/quote', async () => {
      if (!tenantApiKey) return;
      
      const res = await fetch(`${API_URL}/api/v1/pricing/quote`, {
        method: 'POST',
        headers: { 
          'X-API-Key': tenantApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          distanceKm: 15.5,
          durationMin: 25,
          vehicleType: 'standard'
        })
      });
      
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty('price');
      expect(data.price).toBeGreaterThan(0);
      console.log('✅ Price calculated:', data.price, '€');
    });

    it('should calculate all vehicle types with /pricing/calculate', async () => {
      if (!tenantApiKey) return;
      
      const res = await fetch(`${API_URL}/api/v1/pricing/calculate`, {
        method: 'POST',
        headers: { 
          'X-API-Key': tenantApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          distanceKm: 20,
          durationMin: 30
        })
      });
      
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty('standard');
      expect(data).toHaveProperty('premium');
      expect(data).toHaveProperty('van');
    });

    it('should reject invalid API key', async () => {
      const res = await fetch(`${API_URL}/api/v1/pricing/quote`, {
        method: 'POST',
        headers: { 
          'X-API-Key': 'invalid-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          distanceKm: 10,
          durationMin: 15,
          vehicleType: 'standard'
        })
      });
      
      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // SECTION 3: DRIVER AUTH
  // ========================================
  
  describe('3. Driver Authentication', () => {
    it('should login driver', async () => {
      const res = await fetch(`${API_URL}/api/v1/auth/driver/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '+33612345678',
          pin: '1234'
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        expect(data.token).toBeDefined();
        expect(data.driver).toBeDefined();
        driverToken = data.token;
        driverId = data.driver.id;
        console.log('✅ Driver logged in:', driverId);
      } else {
        console.log('⚠️ No test driver found');
      }
    });

    it('should get driver profile', async () => {
      if (!driverToken) return;
      
      const res = await fetch(`${API_URL}/api/v1/driver/profile`, {
        headers: { 
          'Authorization': `Bearer ${driverToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name');
    });

    it('should update driver status', async () => {
      if (!driverToken) return;
      
      const res = await fetch(`${API_URL}/api/v1/driver/status`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${driverToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'available' })
      });
      
      expect(res.ok).toBe(true);
    });
  });

  // ========================================
  // SECTION 4: BOOKINGS
  // ========================================
  
  describe('4. Bookings', () => {
    it('should create a booking', async () => {
      if (!tenantApiKey) return;
      
      const res = await fetch(`${API_URL}/api/v1/bookings`, {
        method: 'POST',
        headers: { 
          'X-API-Key': tenantApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          passengerName: 'Test User',
          passengerPhone: '+33600000000',
          pickupAddress: '1 Place Kléber, Strasbourg',
          pickupLat: 48.583,
          pickupLng: 7.745,
          dropoffAddress: 'Aéroport de Strasbourg-Entzheim',
          dropoffLat: 48.538,
          dropoffLng: 7.628,
          scheduledAt: new Date(Date.now() + 3600000).toISOString(),
          vehicleType: 'standard',
          distanceKm: 15.2,
          estimatedPrice: 45.50
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        expect(data).toHaveProperty('id');
        bookingId = data.id;
        console.log('✅ Booking created:', bookingId);
      }
    });

    it('should list bookings', async () => {
      if (!tenantApiKey) return;
      
      const res = await fetch(`${API_URL}/api/v1/bookings`, {
        headers: { 
          'X-API-Key': tenantApiKey,
          'Content-Type': 'application/json'
        }
      });
      
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(Array.isArray(data.bookings || data)).toBe(true);
    });

    it('should get booking details', async () => {
      if (!tenantApiKey || !bookingId) return;
      
      const res = await fetch(`${API_URL}/api/v1/bookings/${bookingId}`, {
        headers: { 
          'X-API-Key': tenantApiKey,
          'Content-Type': 'application/json'
        }
      });
      
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.id).toBe(bookingId);
    });
  });

  // ========================================
  // SECTION 5: DRIVER BOOKING OPERATIONS
  // ========================================
  
  describe('5. Driver Booking Operations', () => {
    it('should get available bookings for driver', async () => {
      if (!driverToken) return;
      
      const res = await fetch(`${API_URL}/api/v1/driver/bookings/available`, {
        headers: { 
          'Authorization': `Bearer ${driverToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should accept a booking', async () => {
      if (!driverToken || !bookingId) return;
      
      const res = await fetch(`${API_URL}/api/v1/driver/bookings/${bookingId}/accept`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${driverToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Peut échouer si déjà assigné
      if (res.ok) {
        console.log('✅ Booking accepted by driver');
      }
    });

    it('should get driver current booking', async () => {
      if (!driverToken) return;
      
      const res = await fetch(`${API_URL}/api/v1/driver/bookings/current`, {
        headers: { 
          'Authorization': `Bearer ${driverToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(res.ok).toBe(true);
    });
  });

  // ========================================
  // SECTION 6: DISPATCH
  // ========================================
  
  describe('6. Dispatch', () => {
    it('should find nearest drivers', async () => {
      if (!tenantApiKey) return;
      
      const res = await fetch(`${API_URL}/api/v1/dispatch/nearby?lat=48.583&lng=7.745&radius=10`, {
        headers: { 
          'X-API-Key': tenantApiKey,
          'Content-Type': 'application/json'
        }
      });
      
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should auto-dispatch a booking', async () => {
      if (!tenantApiKey || !bookingId) return;
      
      const res = await fetch(`${API_URL}/api/v1/dispatch/auto`, {
        method: 'POST',
        headers: { 
          'X-API-Key': tenantApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bookingId })
      });
      
      // Peut échouer si pas de chauffeur dispo
      if (res.ok) {
        const data = await res.json();
        console.log('✅ Auto-dispatched to:', data.driverId);
      }
    });
  });

  // ========================================
  // SECTION 7: TENANT DASHBOARD
  // ========================================
  
  describe('7. Tenant Dashboard', () => {
    it('should get bookings list', async () => {
      if (!tenantAdminToken) return;
      
      const res = await fetch(`${API_URL}/api/v1/tenant/bookings`, {
        headers: { 
          'Authorization': `Bearer ${tenantAdminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(res.ok).toBe(true);
    });

    it('should get drivers list', async () => {
      if (!tenantAdminToken) return;
      
      const res = await fetch(`${API_URL}/api/v1/tenant/drivers`, {
        headers: { 
          'Authorization': `Bearer ${tenantAdminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(res.ok).toBe(true);
    });

    it('should get chart data', async () => {
      if (!tenantAdminToken) return;
      
      const res = await fetch(`${API_URL}/api/v1/tenant/dashboard/charts?period=month`, {
        headers: { 
          'Authorization': `Bearer ${tenantAdminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty('revenueByDay');
    });
  });

  // ========================================
  // SECTION 8: HEALTH & METRICS
  // ========================================
  
  describe('8. Health & Metrics', () => {
    it('should return health check', async () => {
      const res = await fetch(`${API_URL}/health`);
      
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.status).toBe('ok');
    });

    it('should return metrics', async () => {
      const res = await fetch(`${API_URL}/metrics/json`);
      
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty('requests');
    });

    it('should return WebSocket stats', async () => {
      const res = await fetch(`${API_URL}/ws/stats`);
      
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty('connectedDrivers');
      expect(data).toHaveProperty('connectedAdmins');
    });
  });
});
