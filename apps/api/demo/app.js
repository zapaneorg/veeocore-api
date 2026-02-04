/**
 * VeeoCore Demo v3 - Full Booking Flow
 * Utilise Google Maps Places Autocomplete + Pricing API + Booking + Payment
 * Réplique le flow complet de VeeoStras
 */

// Configuration
const API_BASE_URL = 'https://api-core.veeo-stras.fr';
const DEMO_API_KEY = 'demo-key';
// Google Maps API Key - Set via window.GOOGLE_MAPS_API_KEY or replace with your key
const GOOGLE_MAPS_API_KEY = window.GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';

// État de l'application
const state = {
  // Step management
  currentStep: 'address', // 'address' | 'comparison' | 'booking' | 'payment' | 'confirmation'
  
  // Trip data
  pickup: null,
  dropoff: null,
  date: '',
  time: '',
  passengers: 1,
  luggage: 0,
  
  // Route info (from Google Directions)
  distanceKm: 0,
  durationMin: 0,
  
  // Pricing data
  quotes: [],
  selectedVehicle: null,
  selectedQuote: null,
  
  // Booking data
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  customerNotes: '',
  bookingId: null,
  
  // Payment
  paymentIntentId: null,
  clientSecret: null,
  
  // UI
  lastResponse: null,
  loading: false
};

// DOM Elements
let elements = {};

// Google Maps Services
let autocompleteService = null;
let placesService = null;
let geocoder = null;
let directionsService = null;

// Vehicle icons mapping
const VEHICLE_ICONS = {
  'veeo_x': '🚗',
  'veeo_pet': '🐕',
  'veeo_vite': '⚡',
  'veeo_xl': '🚙',
  'veeo_van': '🚐',
  'standard': '🚗',
  'premium': '✨',
  'van': '🚐',
  'berline': '🚗'
};

// =====================================================
// GOOGLE MAPS INITIALIZATION
// =====================================================

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

function initGooglePlaces() {
  if (window.google && window.google.maps && window.google.maps.places) {
    autocompleteService = new window.google.maps.places.AutocompleteService();
    const mapDiv = document.createElement('div');
    placesService = new window.google.maps.places.PlacesService(mapDiv);
    geocoder = new window.google.maps.Geocoder();
    directionsService = new window.google.maps.DirectionsService();
    console.log('✅ Google Places services initialized');
    return true;
  }
  return false;
}

// =====================================================
// GEOLOCATION & ADDRESS HANDLING
// =====================================================

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
              state.pickup = { lat: latitude, lng: longitude, address };
              if (elements.pickupInput) {
                elements.pickupInput.value = address;
                elements.pickupInput.placeholder = 'Adresse de départ';
              }
              console.log('✅ Pickup auto-filled:', address);
            } else {
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

function selectSuggestion(placeId, type) {
  const dropdown = type === 'pickup' ? elements.pickupSuggestions : elements.dropoffSuggestions;
  const input = type === 'pickup' ? elements.pickupInput : elements.dropoffInput;
  
  placesService.getDetails(
    { placeId: placeId, fields: ['formatted_address', 'geometry'] },
    (place, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
        const address = place.formatted_address;
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        if (type === 'pickup') {
          state.pickup = { lat, lng, address };
          if (elements.pickupInput) elements.pickupInput.value = address;
        } else {
          state.dropoff = { lat, lng, address };
          if (elements.dropoffInput) elements.dropoffInput.value = address;
        }
        
        if (dropdown) {
          dropdown.classList.remove('active');
          dropdown.innerHTML = '';
        }
        
        console.log(`✅ ${type} selected:`, address, { lat, lng });
      }
    }
  );
}

function closeSuggestions() {
  if (elements.pickupSuggestions) elements.pickupSuggestions.classList.remove('active');
  if (elements.dropoffSuggestions) elements.dropoffSuggestions.classList.remove('active');
}

// Global function for HTML onclick
window.useCurrentLocation = function(type) {
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
                state.pickup = { lat: latitude, lng: longitude, address };
              } else {
                state.dropoff = { lat: latitude, lng: longitude, address };
              }
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
};

// Global function for HTML onclick
window.updateCounter = function(type, delta) {
  if (type === 'passengers') {
    const newValue = state.passengers + delta;
    if (newValue >= 1 && newValue <= 8) {
      state.passengers = newValue;
      if (elements.passengersValue) elements.passengersValue.textContent = newValue;
    }
  } else if (type === 'luggage') {
    const newValue = state.luggage + delta;
    if (newValue >= 0 && newValue <= 10) {
      state.luggage = newValue;
      if (elements.luggageValue) elements.luggageValue.textContent = newValue;
    }
  }
};

// =====================================================
// PRICING CALCULATION
// =====================================================

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
    // Get distance and duration from Google Directions API
    const directionsResult = await new Promise((resolve, reject) => {
      directionsService.route({
        origin: { lat: state.pickup.lat, lng: state.pickup.lng },
        destination: { lat: state.dropoff.lat, lng: state.dropoff.lng },
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
    state.distanceKm = route.distance.value / 1000;
    state.durationMin = route.duration.value / 60;
    
    console.log('📏 Route calculated:', { distanceKm: state.distanceKm, durationMin: state.durationMin });
    
    // Call VeeoCore Pricing API
    const requestBody = {
      distanceKm: state.distanceKm,
      durationMin: state.durationMin,
      pickup: {
        lat: state.pickup.lat,
        lng: state.pickup.lng,
        address: state.pickup.address
      },
      dropoff: {
        lat: state.dropoff.lat,
        lng: state.dropoff.lng,
        address: state.dropoff.address
      },
      passengers: state.passengers,
      luggage: state.luggage,
      bookingTime: `${state.date}T${state.time}:00Z`
    };
    
    console.log('📤 Request:', requestBody);
    console.log('⏳ Fetching pricing API...');
    
    const response = await fetch(`${API_BASE_URL}/api/v1/pricing/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': DEMO_API_KEY
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('✅ Response received, status:', response.status);
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
    
    if (data.success && data.data && data.data.quotes) {
      state.quotes = data.data.quotes;
      showVehicleComparison();
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

// =====================================================
// DISPLAY VEHICLE RESULTS
// =====================================================

function showVehicleComparison() {
  if (!elements.vehicleResults) return;
  
  // Route info header
  let html = `
    <div class="route-summary">
      <div class="route-addresses">
        <div class="route-point">
          <span class="point-icon pickup">●</span>
          <span class="point-text">${state.pickup.address.split(',')[0]}</span>
        </div>
        <div class="route-line"></div>
        <div class="route-point">
          <span class="point-icon dropoff">●</span>
          <span class="point-text">${state.dropoff.address.split(',')[0]}</span>
        </div>
      </div>
      <div class="route-stats">
        <div class="route-stat">
          <span class="stat-icon">📏</span>
          <span class="stat-value">${state.distanceKm.toFixed(1)} km</span>
        </div>
        <div class="route-stat">
          <span class="stat-icon">⏱️</span>
          <span class="stat-value">${Math.round(state.durationMin)} min</span>
        </div>
      </div>
    </div>
  `;
  
  // Vehicle cards
  html += '<div class="vehicle-grid">';
  
  state.quotes.forEach((quote, index) => {
    const isFirst = index === 0;
    const icon = VEHICLE_ICONS[quote.vehicleType] || '🚗';
    
    html += `
      <div class="vehicle-card ${isFirst ? 'recommended' : ''}" data-index="${index}">
        ${isFirst ? '<div class="recommended-badge">⭐ Recommandé</div>' : ''}
        
        <div class="vehicle-header">
          <span class="vehicle-icon">${icon}</span>
          <div class="vehicle-info">
            <h4 class="vehicle-name">${quote.name}</h4>
            <p class="vehicle-desc">${quote.description || ''}</p>
          </div>
        </div>
        
        <div class="vehicle-specs">
          <div class="spec-item">
            <span class="spec-icon">👥</span>
            <span class="spec-value">${quote.maxPassengers}</span>
            <span class="spec-label">passagers</span>
          </div>
          <div class="spec-item">
            <span class="spec-icon">🧳</span>
            <span class="spec-value">${quote.maxLuggage}</span>
            <span class="spec-label">bagages</span>
          </div>
        </div>
        
        ${quote.features ? `
        <div class="vehicle-features">
          ${quote.features.slice(0,3).map(f => `<span class="feature-tag">${f}</span>`).join('')}
        </div>
        ` : ''}
        
        <div class="vehicle-pricing">
          <div class="price-main">
            <span class="price-value">${quote.price.toFixed(2)}</span>
            <span class="price-currency">€</span>
            ${quote.surgeMultiplier > 1 ? `<span class="surge-indicator">⚡ +${Math.round((quote.surgeMultiplier - 1) * 100)}%</span>` : ''}
          </div>
          ${quote.breakdown ? `
          <div class="price-details">
            Base ${quote.breakdown.baseFare.toFixed(2)}€ • Distance ${quote.breakdown.distanceCost.toFixed(2)}€ • Temps ${quote.breakdown.durationCost.toFixed(2)}€
          </div>
          ` : ''}
        </div>
        
        <button class="btn-select-vehicle" onclick="event.stopPropagation(); selectVehicle(${index})">
          <span class="btn-text">Sélectionner ce véhicule</span>
          <span class="btn-arrow">→</span>
        </button>
      </div>
    `;
  });
  
  html += '</div>';
  
  elements.vehicleResults.innerHTML = html;
}

// Global function
window.selectVehicle = function(index) {
  state.selectedVehicle = state.quotes[index];
  state.selectedQuote = state.quotes[index];
  showBookingForm();
};

function showBookingForm() {
  const container = document.getElementById('bookingFormContainer');
  if (!container) {
    // Fallback: show in vehicle results
    displayBookingFormInResults();
    return;
  }
  
  const quote = state.selectedQuote;
  const icon = VEHICLE_ICONS[quote.vehicleType] || '🚗';
  
  container.innerHTML = `
    <div class="booking-modal">
      <div class="booking-modal-content">
        <button class="modal-close" onclick="closeBookingForm()">×</button>
        
        <div class="booking-summary">
          <div class="selected-vehicle-card">
            <span class="vehicle-icon">${icon}</span>
            <div class="vehicle-info">
              <h4>${quote.name}</h4>
              <p>${state.distanceKm.toFixed(1)} km • ${Math.round(state.durationMin)} min</p>
            </div>
            <div class="vehicle-price">
              <span class="price-amount">${quote.price.toFixed(2)}€</span>
            </div>
          </div>
          
          <div class="trip-summary">
            <div class="trip-point">
              <span class="point-icon pickup">●</span>
              <div>
                <strong>Départ</strong>
                <p>${state.pickup.address}</p>
              </div>
            </div>
            <div class="trip-point">
              <span class="point-icon dropoff">●</span>
              <div>
                <strong>Arrivée</strong>
                <p>${state.dropoff.address}</p>
              </div>
            </div>
            <div class="trip-datetime">
              📅 ${new Date(state.date + 'T' + state.time).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${state.time}
            </div>
          </div>
        </div>
        
        <form id="customerForm" class="booking-form" onsubmit="submitBooking(event)">
          <div class="form-section">
            <h3 class="form-section-title">
              <span class="section-icon">👤</span>
              Vos coordonnées
            </h3>
            
            <div class="form-grid">
              <div class="form-field">
                <label for="customerName" class="field-label">
                  <span class="label-icon">📝</span>
                  Nom complet
                  <span class="required-star">*</span>
                </label>
                <input type="text" id="customerName" class="field-input" required placeholder="Jean Dupont">
              </div>
              
              <div class="form-field">
                <label for="customerPhone" class="field-label">
                  <span class="label-icon">📱</span>
                  Téléphone
                  <span class="required-star">*</span>
                </label>
                <input type="tel" id="customerPhone" class="field-input" required placeholder="06 12 34 56 78">
              </div>
            </div>
            
            <div class="form-field">
              <label for="customerEmail" class="field-label">
                <span class="label-icon">✉️</span>
                Email
                <span class="optional-tag">optionnel</span>
              </label>
              <input type="email" id="customerEmail" class="field-input" placeholder="jean@example.com">
            </div>
          </div>
          
          <div class="form-section">
            <div class="form-field">
              <label for="customerNotes" class="field-label">
                <span class="label-icon">💬</span>
                Notes pour le chauffeur
                <span class="optional-tag">optionnel</span>
              </label>
              <textarea id="customerNotes" class="field-textarea" placeholder="Ex: Code portail 1234, siège bébé, animal de compagnie..." rows="3"></textarea>
            </div>
          </div>
          
          <div class="booking-actions">
            <button type="button" class="btn-cancel" onclick="closeBookingForm()">
              ← Retour aux véhicules
            </button>
            <button type="submit" class="btn-confirm">
              <span class="btn-confirm-text">Confirmer la réservation</span>
              <span class="btn-confirm-arrow">→</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  container.classList.add('active');
}

function displayBookingFormInResults() {
  if (!elements.vehicleResults) return;
  
  const quote = state.selectedQuote;
  const icon = VEHICLE_ICONS[quote.vehicleType] || '🚗';
  
  elements.vehicleResults.innerHTML = `
    <div class="booking-inline">
      <div class="booking-header">
        <button class="btn-back" onclick="showVehicleComparison()">← Retour</button>
        <h3>Réservation</h3>
      </div>
      
      <div class="booking-summary">
        <div class="selected-vehicle-card">
          <span class="vehicle-icon">${icon}</span>
          <div class="vehicle-info">
            <h4>${quote.name}</h4>
            <p>${state.distanceKm.toFixed(1)} km • ${Math.round(state.durationMin)} min</p>
          </div>
          <div class="vehicle-price">
            <span class="price-amount">${quote.price.toFixed(2)}€</span>
          </div>
        </div>
      </div>
      
      <form id="customerForm" class="booking-form" onsubmit="submitBooking(event)">
        <div class="form-section">
          <h3 class="form-section-title">
            <span class="section-icon">👤</span>
            Vos coordonnées
          </h3>
          
          <div class="form-grid">
            <div class="form-field">
              <label for="customerName" class="field-label">
                <span class="label-icon">📝</span>
                Nom complet
                <span class="required-star">*</span>
              </label>
              <input type="text" id="customerName" class="field-input" required placeholder="Jean Dupont">
            </div>
            
            <div class="form-field">
              <label for="customerPhone" class="field-label">
                <span class="label-icon">📱</span>
                Téléphone
                <span class="required-star">*</span>
              </label>
              <input type="tel" id="customerPhone" class="field-input" required placeholder="06 12 34 56 78">
            </div>
          </div>
          
          <div class="form-field">
            <label for="customerEmail" class="field-label">
              <span class="label-icon">✉️</span>
              Email
              <span class="optional-tag">optionnel</span>
            </label>
            <input type="email" id="customerEmail" class="field-input" placeholder="jean@example.com">
          </div>
        </div>
        
        <div class="form-section">
          <div class="form-field">
            <label for="customerNotes" class="field-label">
              <span class="label-icon">💬</span>
              Notes pour le chauffeur
              <span class="optional-tag">optionnel</span>
            </label>
            <textarea id="customerNotes" class="field-textarea" placeholder="Ex: Code portail 1234, siège bébé, animal de compagnie..." rows="3"></textarea>
          </div>
        </div>
        
        <div class="booking-actions-inline">
          <button type="submit" class="btn-confirm-full">
            <span class="btn-icon">✓</span>
            Confirmer la réservation (${quote.price.toFixed(2)}€)
          </button>
        </div>
        
        <p class="demo-notice">
          ⚠️ <strong>Mode démo</strong> - Cette réservation n'est pas réelle.
        </p>
      </form>
    </div>
  `;
}

// Global function
window.closeBookingForm = function() {
  const container = document.getElementById('bookingFormContainer');
  if (container) {
    container.classList.remove('active');
    container.innerHTML = '';
  }
};

// Global function
window.submitBooking = async function(event) {
  event.preventDefault();
  
  // Get form values
  state.customerName = document.getElementById('customerName').value;
  state.customerPhone = document.getElementById('customerPhone').value;
  state.customerEmail = document.getElementById('customerEmail').value || '';
  state.customerNotes = document.getElementById('customerNotes').value || '';
  
  if (!state.customerName || !state.customerPhone) {
    alert('Veuillez remplir votre nom et téléphone');
    return;
  }
  
  // Immediately show loading state on button
  const confirmBtn = document.querySelector('.btn-confirm, .btn-confirm-full');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="btn-spinner"></span> Confirmation en cours...';
  }
  
  // Prepare booking data
  const bookingData = {
    customerName: state.customerName,
    customerPhone: state.customerPhone,
    customerEmail: state.customerEmail,
    
    pickup: {
      address: state.pickup.address,
      lat: state.pickup.lat,
      lng: state.pickup.lng
    },
    dropoff: {
      address: state.dropoff.address,
      lat: state.dropoff.lat,
      lng: state.dropoff.lng
    },
    
    vehicleType: state.selectedQuote.vehicleType,
    passengers: state.passengers,
    luggage: state.luggage,
    
    scheduledFor: `${state.date}T${state.time}:00Z`,
    estimatedPrice: state.selectedQuote.price,
    estimatedDistance: state.distanceKm,
    estimatedDuration: state.durationMin,
    
    customerNotes: state.customerNotes
  };
  
  console.log('📤 Creating booking:', bookingData);
  
  // Show confirmation immediately (optimistic UI)
  // Generate temporary booking ID for demo
  state.bookingId = 'DEMO-' + Date.now().toString(36).toUpperCase();
  
  // Quick delay for visual feedback then show confirmation
  setTimeout(() => {
    showConfirmation();
  }, 300);
  
  // Create booking in background (fire and forget for demo)
  fetch(`${API_BASE_URL}/api/v1/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': DEMO_API_KEY
    },
    body: JSON.stringify(bookingData)
  })
  .then(response => response.json())
  .then(data => {
    console.log('📥 Booking response:', data);
    if (data.success && data.data?.booking?.id) {
      state.bookingId = data.data.booking.id;
      // Update the reference if still visible
      const refElement = document.querySelector('.booking-ref');
      if (refElement) {
        refElement.textContent = 'Référence: #' + state.bookingId.substring(0, 8).toUpperCase();
      }
    }
  })
  .catch(error => {
    console.error('Booking API error (demo continues):', error);
  });
};

function showConfirmation() {
  closeBookingForm();
  
  if (!elements.vehicleResults) return;
  
  const quote = state.selectedQuote;
  const icon = VEHICLE_ICONS[quote.vehicleType] || '🚗';
  const bookingRef = state.bookingId 
    ? state.bookingId.substring(0, 8).toUpperCase() 
    : 'DEMO-' + Date.now().toString(36).toUpperCase();
  
  elements.vehicleResults.innerHTML = `
    <div class="confirmation-container">
      <div class="confirmation-header">
        <div class="success-icon">✅</div>
        <h2>Réservation confirmée !</h2>
        <p class="booking-ref">Référence: #${bookingRef}</p>
      </div>
      
      <div class="confirmation-details">
        <div class="detail-row">
          <span class="detail-label">📍 Trajet</span>
          <span class="detail-value">${state.pickup.address.split(',')[0]} → ${state.dropoff.address.split(',')[0]}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">📅 Date</span>
          <span class="detail-value">${new Date(state.date + 'T' + state.time).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${state.time}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">${icon} Véhicule</span>
          <span class="detail-value">${quote.name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">👤 Client</span>
          <span class="detail-value">${state.customerName}</span>
        </div>
        <div class="detail-row total">
          <span class="detail-label">💰 Prix</span>
          <span class="detail-value">${quote.price.toFixed(2)}€</span>
        </div>
      </div>
      
      <div class="confirmation-footer">
        <p>📧 En production, un email de confirmation serait envoyé à <strong>${state.customerEmail || 'votre adresse'}</strong></p>
        <p>📱 Un SMS avec les détails du chauffeur serait envoyé 15 min avant.</p>
        
        <button class="btn btn-primary" onclick="resetDemo()">
          🚗 Nouvelle réservation
        </button>
      </div>
    </div>
  `;
}

// Global function
window.resetDemo = function() {
  // Reset state
  state.quotes = [];
  state.selectedVehicle = null;
  state.selectedQuote = null;
  state.customerName = '';
  state.customerPhone = '';
  state.customerEmail = '';
  state.customerNotes = '';
  state.bookingId = null;
  
  // Show initial placeholder
  if (elements.vehicleResults) {
    elements.vehicleResults.innerHTML = `
      <div class="results-placeholder">
        <div class="placeholder-icon">🚗</div>
        <p>Remplissez le formulaire et cliquez sur "Calculer le prix"</p>
      </div>
    `;
  }
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function setLoading(loading) {
  state.loading = loading;
  updateLoadingState(loading);
}

function updateLoadingState(loading) {
  const btns = document.querySelectorAll('.btn-primary, .btn-calculate');
  btns.forEach(btn => {
    btn.disabled = loading;
    btn.classList.toggle('loading', loading);
  });
}

function displayError(message) {
  if (!elements.vehicleResults) return;
  
  elements.vehicleResults.innerHTML = `
    <div class="error-message">
      <span class="error-icon">⚠️</span>
      <p>${message}</p>
    </div>
  `;
}

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
  const form = document.getElementById('addressForm');
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
    elements.copyBtn.addEventListener('click', () => {
      if (state.lastResponse) {
        navigator.clipboard.writeText(JSON.stringify(state.lastResponse, null, 2));
        elements.copyBtn.textContent = '✓ Copié!';
        setTimeout(() => {
          elements.copyBtn.textContent = '📋';
        }, 2000);
      }
    });
  }
  
  // Close suggestions on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.input-wrapper')) {
      closeSuggestions();
    }
  });
  
  console.log('✅ Event listeners attached');
}

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 VeeoCore Demo v3 starting...');
  
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
  
  // Initialize other components
  initializeDatePickers();
  setupEventListeners();
  
  // Load Google Maps API
  try {
    await loadGoogleMapsAPI();
    initGooglePlaces();
    detectUserPosition();
  } catch (error) {
    console.error('Failed to load Google Maps:', error);
  }
  
  console.log('✅ VeeoCore Demo v3 fully initialized');
});
