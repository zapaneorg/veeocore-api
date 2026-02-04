/**
 * Script de test WebSocket
 * Usage: npx tsx scripts/test-websocket.ts
 */

import { io } from 'socket.io-client';
import jwt from 'jsonwebtoken';

const WS_URL = process.env.WS_URL || 'http://localhost:4000';
const JWT_SECRET = process.env.JWT_SECRET || 'veeocore-secret-key';

// Créer un token de test pour un chauffeur fictif
const driverToken = jwt.sign({
  driverId: 'test-driver-001',
  tenantId: 'test-tenant-001',
  type: 'driver'
}, JWT_SECRET, { expiresIn: '1h' });

// Créer un token de test pour un admin fictif
const adminToken = jwt.sign({
  userId: 'test-admin-001',
  tenantId: 'test-tenant-001',
  type: 'tenant_admin'
}, JWT_SECRET, { expiresIn: '1h' });

async function testDriverConnection() {
  console.log('\n🚗 Testing Driver WebSocket connection...\n');
  
  return new Promise<void>((resolve) => {
    const socket = io(WS_URL, {
      auth: { token: driverToken },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      console.log('✅ Driver connected! Socket ID:', socket.id);
    });

    socket.on('connected', (data) => {
      console.log('✅ Driver authenticated:', data);
    });

    socket.on('booking:new', (data) => {
      console.log('📍 New booking received:', data);
    });

    socket.on('booking:assigned', (data) => {
      console.log('🎯 Booking assigned:', data);
    });

    socket.on('message:received', (data) => {
      console.log('💬 Message from admin:', data);
    });

    socket.on('connect_error', (err) => {
      console.log('❌ Connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected:', reason);
    });

    // Test: envoyer une mise à jour de position
    setTimeout(() => {
      console.log('\n📍 Sending location update...');
      socket.emit('location:update', { lat: 48.5734, lng: 7.7521 });
    }, 1000);

    // Test: changer le statut
    setTimeout(() => {
      console.log('🔄 Changing status to available...');
      socket.emit('status:change', { status: 'available' });
    }, 2000);

    // Déconnexion après 5 secondes
    setTimeout(() => {
      socket.disconnect();
      resolve();
    }, 5000);
  });
}

async function testAdminConnection() {
  console.log('\n👔 Testing Admin WebSocket connection...\n');
  
  return new Promise<void>((resolve) => {
    const socket = io(WS_URL, {
      auth: { token: adminToken },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      console.log('✅ Admin connected! Socket ID:', socket.id);
    });

    socket.on('connected', (data) => {
      console.log('✅ Admin authenticated:', data);
    });

    socket.on('driver:location_updated', (data) => {
      console.log('📍 Driver location update:', data);
    });

    socket.on('driver:status_changed', (data) => {
      console.log('🔄 Driver status changed:', data);
    });

    socket.on('booking:created', (data) => {
      console.log('📋 New booking created:', data);
    });

    socket.on('booking:status_changed', (data) => {
      console.log('🔄 Booking status changed:', data);
    });

    socket.on('connect_error', (err) => {
      console.log('❌ Connection error:', err.message);
    });

    // Déconnexion après 5 secondes
    setTimeout(() => {
      socket.disconnect();
      resolve();
    }, 5000);
  });
}

async function checkStats() {
  console.log('\n📊 Checking WebSocket stats...\n');
  
  try {
    const response = await fetch(`${WS_URL}/ws/stats`);
    const stats = await response.json();
    console.log('Stats:', stats);
  } catch (error) {
    console.log('❌ Failed to fetch stats:', error);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('       VeeoCore WebSocket Test Script');
  console.log('═══════════════════════════════════════════════');
  console.log(`\nConnecting to: ${WS_URL}`);
  
  // Vérifier stats avant
  await checkStats();
  
  // Lancer les deux connexions en parallèle
  await Promise.all([
    testDriverConnection(),
    testAdminConnection()
  ]);
  
  // Vérifier stats après
  await checkStats();
  
  console.log('\n✅ All tests completed!\n');
}

main().catch(console.error);
