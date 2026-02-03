/**
 * VeeoCore Demo - Interactive Application
 * Utilise Google Maps Places Autocomplete (comme VeeoStras)
 */

// Configuration
const API_BASE_URL = 'https://api-core.veeo-stras.fr';
const DEMO_API_KEY = 'demo-api-key-12345';
const GOOGLE_MAPS_API_KEY = 'AIzaSyBlK-tzlbkQHQaIpa8loQGA6IP_2LAOzC4';

// State
const state = {
  pickup: null,
  dropoff: null,
  date: '',
  time: '',
  passengers: 1,
  luggage: 0,
  lastResponse: null,
  loading: false
};

// DOM Elements
let elements = {};

// Google Maps Services
let autocompleteService = null;
let placesService = null;
let geocoder = null;

/**
 * Load Google Maps API dynamically
 */
function loadGoogleMapsAPI() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=fr`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('✅ Google Maps API loaded');
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps API'));
    document.head.appendChild(script);
  });
}

/**
 * Initialize Google Places services
 */
function initGooglePlaces() {
  if (window.google && window.google.maps && window.google.maps.places) {
    autocompleteService = new window.google.maps.places.AutocompleteService();
    const mapDiv = document.createElement('div');
    placesService = new window.google.maps.places.PlacesService(mapDiv);
    geocoder = new window.google.maps.Geocoder();
    console.log('✅ Google Places services initialized');
    return true;
  }
  return false;
}

/**
 * Detect user's current position and auto-fill pickup
 */
function detectUserPosition() {
  if (!navigator.geolocation) {
    console.warn('Geolocation not supported');
    return;
  }

  if (elements.pickupInput) {
    elements.pickupInput.placeholder = '📍 Détection de votre position...';
  }
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      console.log('📍 Position detected:', latitude, longitude);
      
      if (geocoder) {
        geocoder.geocode(
          { location: { lat: latitude, lng: longitude } },
          (results, status) => {
            if (status === 'OK' && results[0]) {
              const address = results[0].formatted_address;
              state.pickup = {
                lat: latitude,
                lon: longitude,
                name: address
              };
              if (elements.pickupInput) {
                elements.pickupInput.value = address;
                elements.pickupInput.placeholder = 'Adresse de départ';
              }
              console.log('✅ Pickup auto-filled:', address);
            } else {
              console.warn('Reverse geocoding failed:', status);
              if (elements.pickupInput) {
                elements.pickupInput.placeholder = 'Adresse de départ';
              }
            }
          }
        );
      }
    },
    (error) => {
      console.warn('Geolocation error:', error.message);
      if (elements.pickupInput) {
        elements.pickupInput.placeholder = 'Adresse de départ';
      }
    },
    { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
  );
}

/**
 * Handle address input with Google Places Autocomplete
 */
function handleAddressInput(value, type) {
  const dropdown = type === 'pickup' ? elements.pickupSuggestions : elements.dropoffSuggestions;
  
  if (type === 'pickup') {
    state.pickup = null;
  } else {
    state.dropoff = null;
  }
  
  if (!dropdown || value.length < 3 || !autocompleteService) {
    if (dropdown) {
      dropdown.classList.remove('active');
      dropdown.innerHTML = '';
    }
    return;
  }

  autocompleteService.getPlacePredictions(
    {
      input: value,
      componentRestrictions: { country: 'fr' }
    },
    (predictions, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
        showGoogleSuggestions(predictions, type);
      } else {
        dropdown.classList.remove('active');
        dropdown.innerHTML = '';
      }
    }
  );
}

/**
 * Show Google Places suggestions
 */
function showGoogleSuggestions(predictions, type) {
  const dropdown = type === 'pickup' ? elements.pickupSuggestions : elements.dropoffSuggestions;
  if (!dropdown) return;
  
  dropdown.innerHTML = predictions.map(prediction => `
    <div class="suggestion-item" data-place-id="${prediction.place_id}">
      <span class="suggestion-icon">📍</span>
      <div class="suggestion-content">
        <strong>${prediction.structured_formatting.main_text}</strong>
        <span>${prediction.structured_formatting.secondary_text || ''}</span>
      </div>
    </div>
  `).join('');
  
  dropdown.classList.add('active');
  
  dropdown.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', () => {
      selectSuggestion(item.dataset.placeId, type);
    });
  });
}

/**
 * Select a suggestion and get its coordinates
 */
function selectSuggestion(placeId, type) {
  const dropdown = type === 'pickup' ? elements.pickupSuggestions : elements.dropoffSuggestions;
  const input = type === 'pickup' ? elements.pickupInput : elements.dropoffInput;
  
  placesService.getDetails(
    { placeId: placeId, fields: ['formatted_address', 'geometry'] },
    (place, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
        const address = place.formatted_address;
        const lat = place.geometry.location.lat();
        const lon = place.geometry.location.lng();
        
        if (type === 'pickup') {
          state.pickup = { lat, lon, name: address };
          if (elements.pickupInput) elements.pickupInput.value = address;
        } else {
          state.dropoff = { lat, lon, name: address };
          if (elements.dropoffInput) elements.dropoffInput.value = address;
        }
        
        if (dropdown) {
          dropdown.classList.remove('active');
          dropdown.innerHTML = '';
        }
        
        console.log(`✅ ${type} selected:`, address, { lat, lon });
      }
    }
  );
}

/**
 * Close all suggestion dropdowns
 */
function closeSuggestions() {
  if (elements.pickupSuggestions) {
    elements.pickupSuggestions.classList.remove('active');
  }
  if (elements.dropoffSuggestions) {
    elements.dropoffSuggestions.classList.remove('active');
  }
}

/**
 * Get current GPS location for a specific field (called from onclick)
 */
function useCurrentLocation(type) {
  if (!navigator.geolocation) {
    alert("La géolocalisation n'est pas supportée par votre navigateur");
    return;
  }
  
  const input = type === 'pickup' ? elements.pickupInput : elements.dropoffInput;
  if (input) {
    input.placeholder = '📍 Localisation en cours...';
    input.value = '';
  }
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      
      if (geocoder) {
        geocoder.geocode(
          { location: { lat: latitude, lng: longitude } },
          (results, status) => {
            if (status === 'OK' && results[0]) {
              const address = results[0].formatted_address;
              if (input) {
                input.value = address;
                input.placeholder = type === 'pickup' ? 'Adresse de départ' : "Adresse d'arrivée";
              }
              
              if (type === 'pickup') {
                state.pickup = { lat: latitude, lon: longitude, name: address };
              } else {
                state.dropoff = { lat: latitude, lon: longitude, name: address };
              }
              
              console.log(`✅ ${type} set to current location:`, address);
            }
          }
        );
      }
    },
    (error) => {
      alert('Impossible de récupérer votre position: ' + error.message);
      if (input) {
        input.placeholder = type === 'pickup' ? 'Adresse de départ' : "Adresse d'arrivée";
      }
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// Expose function globally for onclick in HTML
window.useCurrentLocation = useCurrentLocation;

/**
 * Update passenger/luggage counter (called from onclick)
 */
function updateCounter(type, delta) {
  if (type === 'passengers') {
    const newValue = state.passengers + delta;
    if (newValue >= 1 && newValue <= 8) {
      state.passengers = newValue;
      if (elements.passengersValue) {
        elements.passengersValue.textContent = newValue;
      }
    }
  } else if (type === 'luggage') {
    const newValue = state.luggage + delta;
    if (newValue >= 0 && newValue <= 10) {
      state.luggage = newValue;
      if (elements.luggageValue) {
        elements.luggageValue.textContent = newValue;
      }
    }
  }
}

// Expose function globally for onclick in HTML
window.updateCounter = updateCounter;

/**
 * Initialize date and time pickers with defaults
 */
function initializeDatePickers() {
  const now = new Date();
  now.setHours(now.getHours() + 1);
  
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().slice(0, 5);
  
  if (elements.dateInput) {
    elements.dateInput.value = dateStr;
    elements.dateInput.min = dateStr;
  }
  if (elements.timeInput) {
    elements.timeInput.value = timeStr;
  }
  
  state.date = dateStr;
  state.time = timeStr;
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  console.log('🎯 Setting up event listeners...');
  
  let pickupDebounce, dropoffDebounce;
  
  if (elements.pickupInput) {
    elements.pickupInput.addEventListener('input', (e) => {
      clearTimeout(pickupDebounce);
      pickupDebounce = setTimeout(() => {
        handleAddressInput(e.target.value, 'pickup');
      }, 300);
    });
  }
  
  if (elements.dropoffInput) {
    elements.dropoffInput.addEventListener('input', (e) => {
      clearTimeout(dropoffDebounce);
      dropoffDebounce = setTimeout(() => {
        handleAddressInput(e.target.value, 'dropoff');
      }, 300);
    });
  }
  
  if (elements.dateInput) {
    elements.dateInput.addEventListener('change', (e) => {
      state.date = e.target.value;
    });
  }
  
  if (elements.timeInput) {
    elements.timeInput.addEventListener('change', (e) => {
      state.time = e.target.value;
    });
  }
  
  // Form submission
  const form = document.getElementById('bookingForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      calculatePrice();
    });
  }
  
  // Calculate button
  if (elements.calculateBtn) {
    elements.calculateBtn.addEventListener('click', (e) => {
      e.preventDefault();
      calculatePrice();
    });
  }
  
  // Copy response
  if (elements.copyBtn) {
    elements.copyBtn.addEventListener('click', copyResponse);
  }
  
  // Close suggestions on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.input-wrapper')) {
      closeSuggestions();
    }
  });
  
  console.log('✅ Event listeners attached');
}

/**
 * Calculate price using VeeoCore API
 */
async function calculatePrice() {
  console.log('💰 Calculating price...', state);
  
  if (!state.pickup || !state.dropoff) {
    alert("Veuillez sélectionner une adresse de départ et d'arrivée");
    return;
  }
  
  state.loading = true;
  updateLoadingState(true);
  
  const startTime = performance.now();
  
  try {
    // First, get distance and duration from Google Directions API
    const directionsService = new google.maps.DirectionsService();
    
    const directionsResult = await new Promise((resolve, reject) => {
      directionsService.route({
        origin: { lat: state.pickup.lat, lng: state.pickup.lon },
        destination: { lat: state.dropoff.lat, lng: state.dropoff.lon },
        travelMode: google.maps.TravelMode.DRIVING
      }, (result, status) => {
        if (status === 'OK') {
          resolve(result);
        } else {
          reject(new Error('Impossible de calculer l\'itinéraire: ' + status));
        }
      });
    });
    
    const route = directionsResult.routes[0].legs[0];
    const distanceKm = route.distance.value / 1000; // meters to km
    const durationMin = route.duration.value / 60; // seconds to minutes
    
    console.log('📏 Route calculated:', { distanceKm, durationMin });
    
    const requestBody = {
      distanceKm: distanceKm,
      durationMin: durationMin,
      pickup: {
        lat: state.pickup.lat,
        lng: state.pickup.lon
      },
      dropoff: {
        lat: state.dropoff.lat,
        lng: state.dropoff.lon
      },
      passengers: state.passengers,
      luggage: state.luggage,
      bookingTime: `${state.date}T${state.time}:00Z`
    };
    
    console.log('📤 Request:', requestBody);
    
    const response = await fetch(`${API_BASE_URL}/api/v1/pricing/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': DEMO_API_KEY
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    const latency = Math.round(performance.now() - startTime);
    
    console.log('📥 Response:', data, `(${latency}ms)`);
    
    state.lastResponse = data;
    
    if (elements.latencyValue) {
      elements.latencyValue.textContent = `${latency}ms`;
      elements.latencyValue.className = `info-value latency-badge ${latency < 200 ? 'fast' : latency < 500 ? 'medium' : 'slow'}`;
    }
    
    if (elements.apiResponse) {
      elements.apiResponse.innerHTML = `<code>${JSON.stringify(data, null, 2)}</code>`;
    }
    
    if (data.success && data.data && data.data.vehicles) {
      displayVehicleResults(data.data, { distanceKm, durationMin });
    } else {
      displayError(data.error || data.message || 'Erreur inconnue');
    }
    
  } catch (error) {
    console.error('❌ API Error:', error);
    displayError(error.message);
  } finally {
    state.loading = false;
    updateLoadingState(false);
  }
}

/**
 * Display vehicle results
 */
function displayVehicleResults(data, routeInfo) {
  if (!elements.vehicleResults) return;
  
  const vehicles = data.vehicles;
  
  // Add route info first
  let html = '';
  if (routeInfo) {
    html += `
      <div class="route-info">
        <div class="route-stat">
          <span class="route-icon">📏</span>
          <span>${routeInfo.distanceKm.toFixed(1)} km</span>
        </div>
        <div class="route-stat">
          <span class="route-icon">⏱️</span>
          <span>${Math.round(routeInfo.durationMin)} min</span>
        </div>
      </div>
    `;
  }
  
  html += vehicles.map(vehicle => `
    <div class="vehicle-card ${vehicle.recommended ? 'recommended' : ''}">
      ${vehicle.recommended ? '<div class="recommended-badge">Recommandé</div>' : ''}
      <div class="vehicle-icon">${getVehicleIcon(vehicle.type)}</div>
      <div class="vehicle-info">
        <h4 class="vehicle-name">${vehicle.name}</h4>
        <p class="vehicle-details">${vehicle.capacity || vehicle.maxPassengers} passagers • ${vehicle.luggage || vehicle.maxLuggage} bagages</p>
      </div>
      <div class="vehicle-price">
        <span class="price-amount">${vehicle.price.toFixed(2)}€</span>
        <span class="price-type">Prix fixe</span>
      </div>
    </div>
  `).join('');
  
  elements.vehicleResults.innerHTML = html;
}

/**
 * Get vehicle icon
 */
function getVehicleIcon(type) {
  const icons = {
    'berline': '🚗',
    'van': '🚐',
    'premium': '✨',
    'green': '🌿'
  };
  return icons[type] || '🚗';
}

/**
 * Display error
 */
function displayError(message) {
  if (!elements.vehicleResults) return;
  
  elements.vehicleResults.innerHTML = `
    <div class="error-message">
      <span class="error-icon">⚠️</span>
      <p>${message}</p>
    </div>
  `;
}

/**
 * Update loading state
 */
function updateLoadingState(loading) {
  if (elements.calculateBtn) {
    elements.calculateBtn.disabled = loading;
    elements.calculateBtn.classList.toggle('loading', loading);
  }
}

/**
 * Copy API response to clipboard
 */
function copyResponse() {
  if (!state.lastResponse) return;
  
  navigator.clipboard.writeText(JSON.stringify(state.lastResponse, null, 2))
    .then(() => {
      if (elements.copyBtn) {
        elements.copyBtn.textContent = '✓ Copié!';
        setTimeout(() => {
          elements.copyBtn.textContent = '📋';
        }, 2000);
      }
    })
    .catch(err => console.error('Copy failed:', err));
}

/**
 * Setup code example tabs
 */
function setupCodeTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      
      tab.classList.add('active');
      const panelId = tab.dataset.tab + '-panel';
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.add('active');
    });
  });
}

/**
 * Main initialization
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 VeeoCore Demo starting...');
  
  // Initialize DOM elements
  elements = {
    pickupInput: document.getElementById('pickup'),
    dropoffInput: document.getElementById('dropoff'),
    dateInput: document.getElementById('bookingDate'),
    timeInput: document.getElementById('bookingTime'),
    passengersValue: document.getElementById('passengersCount'),
    luggageValue: document.getElementById('luggageCount'),
    calculateBtn: document.querySelector('.btn-calculate'),
    vehicleResults: document.getElementById('vehicleResults'),
    apiResponse: document.getElementById('apiResponse'),
    copyBtn: document.querySelector('.copy-btn'),
    latencyValue: document.getElementById('latencyValue'),
    pickupSuggestions: document.getElementById('pickupSuggestions'),
    dropoffSuggestions: document.getElementById('dropoffSuggestions')
  };
  
  console.log('📦 Elements:', elements);
  
  // Initialize other components first
  initializeDatePickers();
  setupEventListeners();
  setupCodeTabs();
  
  // Load Google Maps API
  try {
    await loadGoogleMapsAPI();
    initGooglePlaces();
    
    // Auto-detect user position for pickup
    detectUserPosition();
  } catch (error) {
    console.error('Failed to load Google Maps:', error);
  }
  
  console.log('✅ VeeoCore Demo fully initialized');
});
