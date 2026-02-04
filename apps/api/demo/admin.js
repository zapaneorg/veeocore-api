/**
 * VeeoCore Admin Dashboard - JavaScript
 * Manages API keys, clients, and dashboard functionality
 */

// API Configuration
const API_BASE_URL = 'https://api-core.veeo-stras.fr';
const ADMIN_API_KEY = 'admin-secret-key'; // Replace with actual admin key

// Demo Data - In production, this comes from the API
const apiKeys = [
  {
    id: 1,
    clientName: 'VTC Paris Express',
    email: 'contact@vtc-paris.com',
    apiKey: 'veco_live_px7k2m9n5q3r8t1y',
    plan: 'pro',
    status: 'active',
    usage: { current: 12456, limit: 50000 },
    createdAt: '2026-01-15',
    expiresAt: '2026-04-15'
  },
  {
    id: 2,
    clientName: 'Lyon Chauffeurs',
    email: 'api@lyon-chauffeurs.fr',
    apiKey: 'veco_live_ly3n8c4h2f5k9m1p',
    plan: 'starter',
    status: 'active',
    usage: { current: 2890, limit: 5000 },
    createdAt: '2026-01-20',
    expiresAt: '2026-04-20'
  },
  {
    id: 3,
    clientName: 'Nice Premium VTC',
    email: 'tech@nice-vtc.com',
    apiKey: 'veco_live_nc9p2r4m7v1x3k5q',
    plan: 'enterprise',
    status: 'active',
    usage: { current: 45200, limit: -1 },
    createdAt: '2026-01-10',
    expiresAt: null
  },
  {
    id: 4,
    clientName: 'Bordeaux Mobility',
    email: 'dev@bordeaux-mob.fr',
    apiKey: 'veco_live_bx5m8k2n4r7p1q3t',
    plan: 'free',
    status: 'active',
    usage: { current: 89, limit: 100 },
    createdAt: '2026-02-01',
    expiresAt: '2026-05-01'
  },
  {
    id: 5,
    clientName: 'Marseille Express',
    email: 'api@marseille-exp.com',
    apiKey: 'veco_live_ms2x9p4k7m1n5r8q',
    plan: 'pro',
    status: 'suspended',
    usage: { current: 0, limit: 50000 },
    createdAt: '2025-12-15',
    expiresAt: '2026-03-15'
  },
  {
    id: 6,
    clientName: 'Toulouse Connect',
    email: 'tech@toulouse-vtc.fr',
    apiKey: 'veco_live_tl4k8n2m5p9r1x3q',
    plan: 'starter',
    status: 'active',
    usage: { current: 3456, limit: 5000 },
    createdAt: '2026-01-25',
    expiresAt: '2026-04-25'
  },
  {
    id: 7,
    clientName: 'Nantes Ride',
    email: 'api@nantes-ride.com',
    apiKey: 'veco_live_nt7m3k9n2p5r8x1q',
    plan: 'pro',
    status: 'active',
    usage: { current: 28900, limit: 50000 },
    createdAt: '2026-01-18',
    expiresAt: '2026-04-18'
  },
  {
    id: 8,
    clientName: 'Test Account',
    email: 'test@example.com',
    apiKey: 'veco_test_demo123456789',
    plan: 'free',
    status: 'expired',
    usage: { current: 0, limit: 100 },
    createdAt: '2025-11-01',
    expiresAt: '2026-02-01'
  }
];

// ==================== NAVIGATION ====================

/**
 * Navigate to a specific page/section
 * @param {string} page - Page identifier (dashboard, api-keys, clients, usage, security, config)
 */
function navigateTo(page) {
  // Hide all pages
  document.querySelectorAll('.page-section').forEach(section => {
    section.style.display = 'none';
  });
  
  // Show target page
  const targetPage = document.getElementById('page-' + page);
  if (targetPage) {
    targetPage.style.display = 'block';
  }
  
  // Update navigation active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  
  const activeNav = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (activeNav) {
    activeNav.classList.add('active');
  }
  
  // Update URL hash
  window.location.hash = page;
}

/**
 * Handle initial page load based on URL hash
 */
function handleInitialNavigation() {
  const hash = window.location.hash.replace('#', '');
  if (hash && document.getElementById('page-' + hash)) {
    navigateTo(hash);
  } else {
    navigateTo('dashboard');
  }
}

// Listen for hash changes
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    navigateTo(hash);
  }
});

// ==================== STATE ====================

// State
let state = {
  selectedKey: null,
  filters: {
    search: '',
    plan: '',
    status: ''
  }
};

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
  setupEventListeners();
  renderApiKeysTable();
  updateStats();
});

/**
 * Initialize dashboard
 */
function initDashboard() {
  // Handle navigation based on URL hash
  handleInitialNavigation();
  
  // Load data from localStorage or API
  const savedKeys = localStorage.getItem('veeocore_api_keys');
  if (savedKeys) {
    // Merge with demo data
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Search
  document.getElementById('search-input').addEventListener('input', (e) => {
    state.filters.search = e.target.value.toLowerCase();
    renderApiKeysTable();
  });
  
  // Plan filter
  document.getElementById('plan-filter').addEventListener('change', (e) => {
    state.filters.plan = e.target.value;
    renderApiKeysTable();
  });
  
  // Status filter
  document.getElementById('status-filter').addEventListener('change', (e) => {
    state.filters.status = e.target.value;
    renderApiKeysTable();
  });
}

/**
 * Render API keys table
 */
function renderApiKeysTable() {
  const tbody = document.getElementById('api-keys-table');
  
  // Apply filters
  let filtered = apiKeys.filter(key => {
    if (state.filters.search) {
      const searchMatch = 
        key.clientName.toLowerCase().includes(state.filters.search) ||
        key.email.toLowerCase().includes(state.filters.search) ||
        key.apiKey.toLowerCase().includes(state.filters.search);
      if (!searchMatch) return false;
    }
    
    if (state.filters.plan && key.plan !== state.filters.plan) return false;
    if (state.filters.status && key.status !== state.filters.status) return false;
    
    return true;
  });
  
  tbody.innerHTML = filtered.map(key => {
    const initials = key.clientName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const usagePercent = key.usage.limit === -1 ? 0 : (key.usage.current / key.usage.limit) * 100;
    const usageClass = usagePercent > 80 ? 'high' : usagePercent > 50 ? 'medium' : 'low';
    
    return `
      <tr>
        <td>
          <div class="client-cell">
            <div class="client-avatar">${initials}</div>
            <div class="client-info">
              <span class="client-name">${key.clientName}</span>
              <span class="client-email">${key.email}</span>
            </div>
          </div>
        </td>
        <td>
          <div class="api-key-cell">
            <code class="api-key-code">${maskApiKey(key.apiKey)}</code>
            <svg class="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" onclick="copyApiKey('${key.apiKey}')">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
            </svg>
          </div>
        </td>
        <td>
          <span class="plan-badge ${key.plan}">${capitalizeFirst(key.plan)}</span>
        </td>
        <td>
          <div class="usage-cell">
            <div class="usage-bar">
              <div class="usage-fill ${usageClass}" style="width: ${Math.min(usagePercent, 100)}%"></div>
            </div>
            <span class="usage-text">
              ${formatNumber(key.usage.current)}${key.usage.limit === -1 ? '' : ' / ' + formatNumber(key.usage.limit)}
            </span>
          </div>
        </td>
        <td>
          <span class="status-badge ${key.status}">${getStatusLabel(key.status)}</span>
        </td>
        <td>${formatDate(key.createdAt)}</td>
        <td>
          <div class="actions-cell">
            <button class="action-btn" onclick="viewKeyDetails(${key.id})" title="Voir détails">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
            <button class="action-btn" onclick="editKey(${key.id})" title="Modifier">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="action-btn danger" onclick="deleteKey(${key.id})" title="Supprimer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Update stats cards
 */
function updateStats() {
  const activeKeys = apiKeys.filter(k => k.status === 'active').length;
  const totalRequests = apiKeys.reduce((sum, k) => sum + k.usage.current, 0);
  const uniqueClients = new Set(apiKeys.map(k => k.email)).size;
  const rateLimited = apiKeys.filter(k => k.usage.limit !== -1 && k.usage.current / k.usage.limit > 0.9).length * 3; // Simulated
  
  document.getElementById('total-keys').textContent = activeKeys;
  document.getElementById('total-requests').textContent = formatNumber(totalRequests);
  document.getElementById('total-clients').textContent = uniqueClients;
  document.getElementById('rate-limited').textContent = rateLimited;
}

/**
 * Open create modal
 */
function openCreateModal() {
  document.getElementById('create-modal').classList.add('active');
}

/**
 * Close create modal
 */
function closeCreateModal() {
  document.getElementById('create-modal').classList.remove('active');
  document.getElementById('create-key-form').reset();
}

/**
 * Create new API key
 */
function createApiKey(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  
  // Generate API key
  const newKey = generateApiKey();
  
  // Create key object
  const keyData = {
    id: apiKeys.length + 1,
    clientName: formData.get('clientName'),
    email: formData.get('email'),
    apiKey: newKey,
    plan: formData.get('plan'),
    status: 'active',
    usage: { 
      current: 0, 
      limit: getPlanLimit(formData.get('plan'))
    },
    createdAt: new Date().toISOString().split('T')[0],
    expiresAt: calculateExpiration(formData.get('expiration'))
  };
  
  // Add to array
  apiKeys.unshift(keyData);
  
  // Close create modal
  closeCreateModal();
  
  // Show success modal with new key
  document.getElementById('new-api-key').textContent = newKey;
  document.getElementById('success-modal').classList.add('active');
  
  // Update UI
  renderApiKeysTable();
  updateStats();
  
  // Save to localStorage
  saveKeys();
}

/**
 * Close success modal
 */
function closeSuccessModal() {
  document.getElementById('success-modal').classList.remove('active');
}

/**
 * View key details
 */
function viewKeyDetails(keyId) {
  const key = apiKeys.find(k => k.id === keyId);
  if (!key) return;
  
  state.selectedKey = key;
  
  // Populate modal
  document.getElementById('modal-api-key').textContent = key.apiKey;
  document.getElementById('modal-client').textContent = key.clientName;
  document.getElementById('modal-email').textContent = key.email;
  document.getElementById('modal-plan').innerHTML = `<span class="plan-badge ${key.plan}">${capitalizeFirst(key.plan)}</span>`;
  document.getElementById('modal-status').innerHTML = `<span class="status-badge ${key.status}">${getStatusLabel(key.status)}</span>`;
  document.getElementById('modal-created').textContent = formatDate(key.createdAt);
  document.getElementById('modal-expires').textContent = key.expiresAt ? formatDate(key.expiresAt) : 'Jamais';
  
  // Generate usage chart
  generateUsageChart();
  
  // Show modal
  document.getElementById('key-modal').classList.add('active');
}

/**
 * Close key modal
 */
function closeKeyModal() {
  document.getElementById('key-modal').classList.remove('active');
  state.selectedKey = null;
}

/**
 * Generate usage chart
 */
function generateUsageChart() {
  const chart = document.getElementById('usage-chart');
  
  // Generate random data for demo
  const bars = [];
  for (let i = 0; i < 30; i++) {
    const height = Math.random() * 80 + 10;
    bars.push(`<div class="chart-bar" style="height: ${height}%"></div>`);
  }
  
  chart.innerHTML = bars.join('');
}

/**
 * Revoke API key
 */
function revokeKey() {
  if (!state.selectedKey) return;
  
  if (confirm(`Êtes-vous sûr de vouloir révoquer la clé API pour ${state.selectedKey.clientName}?`)) {
    state.selectedKey.status = 'expired';
    closeKeyModal();
    renderApiKeysTable();
    saveKeys();
  }
}

/**
 * Delete API key
 */
function deleteKey(keyId) {
  const key = apiKeys.find(k => k.id === keyId);
  if (!key) return;
  
  if (confirm(`Êtes-vous sûr de vouloir supprimer la clé API pour ${key.clientName}?`)) {
    const index = apiKeys.findIndex(k => k.id === keyId);
    apiKeys.splice(index, 1);
    renderApiKeysTable();
    updateStats();
    saveKeys();
  }
}

/**
 * Edit API key
 */
function editKey(keyId) {
  // Open edit modal - simplified for demo
  viewKeyDetails(keyId);
}

/**
 * Copy API key to clipboard
 */
function copyApiKey(key) {
  navigator.clipboard.writeText(key);
  showToast('Clé API copiée!');
}

/**
 * Copy to clipboard from modal
 */
function copyToClipboard() {
  const key = document.getElementById('modal-api-key').textContent;
  navigator.clipboard.writeText(key);
  showToast('Clé API copiée!');
}

/**
 * Copy new key
 */
function copyNewKey() {
  const key = document.getElementById('new-api-key').textContent;
  navigator.clipboard.writeText(key);
  showToast('Clé API copiée!');
}

// Helper Functions

function generateApiKey() {
  const prefix = 'veco_live_';
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';
  for (let i = 0; i < 24; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix + key;
}

function maskApiKey(key) {
  return key.substring(0, 14) + '••••••••';
}

function getPlanLimit(plan) {
  const limits = {
    'free': 100,
    'starter': 5000,
    'pro': 50000,
    'enterprise': -1
  };
  return limits[plan] || 100;
}

function calculateExpiration(days) {
  if (days === 'never') return null;
  const date = new Date();
  date.setDate(date.getDate() + parseInt(days));
  return date.toISOString().split('T')[0];
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getStatusLabel(status) {
  const labels = {
    'active': 'Actif',
    'suspended': 'Suspendu',
    'expired': 'Expiré'
  };
  return labels[status] || status;
}

function saveKeys() {
  localStorage.setItem('veeocore_api_keys', JSON.stringify(apiKeys));
}

function showToast(message) {
  // Simple toast notification
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #1f2937;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 9999;
    animation: fadeInUp 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(style);
