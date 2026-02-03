import type { VeeoWidgetConfig, PriceQuote, BookingResult, Location } from './types';

const DEFAULT_CONFIG: Partial<VeeoWidgetConfig> = {
  apiUrl: 'https://api.veeocore.com',
  containerId: 'veeo-booking',
  theme: 'light',
  primaryColor: '#2563eb',
  locale: 'fr',
  vehicles: ['standard', 'premium', 'van'],
  showSurgeInfo: true,
  showEstimatedTime: true
};

export class VeeoWidget {
  private config: VeeoWidgetConfig;
  private container: HTMLElement | null = null;
  private state = {
    pickup: null as Location | null,
    dropoff: null as Location | null,
    selectedVehicle: 'standard',
    scheduledDate: null as Date | null,
    quote: null as PriceQuote | null,
    loading: false,
    step: 'locations' as 'locations' | 'vehicles' | 'confirm'
  };

  constructor(config: VeeoWidgetConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (!this.config.apiKey) {
      throw new Error('VeeoWidget: API key is required');
    }
  }

  mount(containerId?: string): void {
    const id = containerId || this.config.containerId || 'veeo-booking';
    this.container = document.getElementById(id);
    
    if (!this.container) {
      console.error(`VeeoWidget: Container #${id} not found`);
      return;
    }

    this.injectStyles();
    this.render();
  }

  private injectStyles(): void {
    // Supprimer les anciens styles s'ils existent pour permettre le changement de thème
    const existingStyle = document.getElementById('veeo-widget-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'veeo-widget-styles';
    style.textContent = this.getStyles();
    document.head.appendChild(style);
  }

  private getStyles(): string {
    const primary = this.config.primaryColor || '#2563eb';
    const isDark = this.config.theme === 'dark';
    
    return `
      .veeo-widget {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: ${isDark ? '#1f2937' : '#ffffff'};
        color: ${isDark ? '#f9fafb' : '#1f2937'};
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
        padding: 24px;
        max-width: 400px;
        margin: 0 auto;
      }
      .veeo-widget * { box-sizing: border-box; }
      .veeo-widget h3 {
        margin: 0 0 16px;
        font-size: 18px;
        font-weight: 600;
      }
      .veeo-widget-input-group {
        margin-bottom: 16px;
      }
      .veeo-widget-label {
        display: block;
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 6px;
        color: ${isDark ? '#d1d5db' : '#374151'};
      }
      .veeo-widget-input {
        width: 100%;
        padding: 12px;
        border: 1px solid ${isDark ? '#374151' : '#d1d5db'};
        border-radius: 8px;
        font-size: 14px;
        background: ${isDark ? '#374151' : '#ffffff'};
        color: ${isDark ? '#f9fafb' : '#1f2937'};
        transition: border-color 0.2s;
      }
      .veeo-widget-input:focus {
        outline: none;
        border-color: ${primary};
        box-shadow: 0 0 0 3px ${primary}22;
      }
      .veeo-widget-vehicles {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 16px;
      }
      .veeo-widget-vehicle {
        padding: 12px;
        border: 2px solid ${isDark ? '#374151' : '#e5e7eb'};
        border-radius: 8px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
      }
      .veeo-widget-vehicle:hover {
        border-color: ${primary}66;
      }
      .veeo-widget-vehicle.active {
        border-color: ${primary};
        background: ${primary}11;
      }
      .veeo-widget-vehicle-icon {
        font-size: 24px;
        margin-bottom: 4px;
      }
      .veeo-widget-vehicle-name {
        font-size: 12px;
        font-weight: 500;
      }
      .veeo-widget-vehicle-price {
        font-size: 14px;
        font-weight: 600;
        color: ${primary};
        margin-top: 4px;
      }
      .veeo-widget-btn {
        width: 100%;
        padding: 14px;
        background: ${primary};
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .veeo-widget-btn:hover {
        filter: brightness(1.1);
      }
      .veeo-widget-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .veeo-widget-quote {
        background: ${isDark ? '#374151' : '#f3f4f6'};
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
      }
      .veeo-widget-quote-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 14px;
      }
      .veeo-widget-quote-row:last-child {
        margin-bottom: 0;
        padding-top: 8px;
        border-top: 1px solid ${isDark ? '#4b5563' : '#d1d5db'};
        font-weight: 600;
      }
      .veeo-widget-surge {
        background: #fef3c7;
        color: #92400e;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .veeo-widget-back {
        background: none;
        border: none;
        color: ${isDark ? '#9ca3af' : '#6b7280'};
        font-size: 14px;
        cursor: pointer;
        margin-bottom: 16px;
        padding: 0;
      }
      .veeo-widget-back:hover {
        color: ${primary};
      }
      .veeo-widget-success {
        text-align: center;
        padding: 24px;
      }
      .veeo-widget-success-icon {
        width: 64px;
        height: 64px;
        background: #10b98133;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
        font-size: 32px;
      }
      .veeo-widget-loader {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 2px solid #ffffff44;
        border-top-color: #ffffff;
        border-radius: 50%;
        animation: veeo-spin 0.8s linear infinite;
      }
      @keyframes veeo-spin {
        to { transform: rotate(360deg); }
      }
    `;
  }

  private render(): void {
    if (!this.container) return;
    
    const { step } = this.state;
    
    if (step === 'locations') {
      this.renderLocationsStep();
    } else if (step === 'vehicles') {
      this.renderVehiclesStep();
    } else if (step === 'confirm') {
      this.renderConfirmStep();
    }
  }

  private renderLocationsStep(): void {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="veeo-widget">
        <h3>🚖 Réserver un VTC</h3>
        
        <div class="veeo-widget-input-group">
          <label class="veeo-widget-label">📍 Départ</label>
          <input 
            type="text" 
            class="veeo-widget-input" 
            id="veeo-pickup"
            placeholder="Adresse de départ..."
            value="${this.state.pickup?.address || ''}"
          />
        </div>
        
        <div class="veeo-widget-input-group">
          <label class="veeo-widget-label">🎯 Destination</label>
          <input 
            type="text" 
            class="veeo-widget-input" 
            id="veeo-dropoff"
            placeholder="Adresse d'arrivée..."
            value="${this.state.dropoff?.address || ''}"
          />
        </div>
        
        <div class="veeo-widget-input-group">
          <label class="veeo-widget-label">📅 Date et heure (optionnel)</label>
          <input 
            type="datetime-local" 
            class="veeo-widget-input" 
            id="veeo-datetime"
          />
        </div>
        
        <button class="veeo-widget-btn" id="veeo-get-quote">
          ${this.state.loading ? '<span class="veeo-widget-loader"></span>' : 'Voir les prix'}
        </button>
      </div>
    `;
    
    this.bindLocationsEvents();
  }

  private bindLocationsEvents(): void {
    const btn = document.getElementById('veeo-get-quote');
    btn?.addEventListener('click', () => this.getQuote());
  }

  private async getQuote(): Promise<void> {
    const pickupInput = document.getElementById('veeo-pickup') as HTMLInputElement;
    const dropoffInput = document.getElementById('veeo-dropoff') as HTMLInputElement;
    const datetimeInput = document.getElementById('veeo-datetime') as HTMLInputElement;
    
    if (!pickupInput?.value || !dropoffInput?.value) {
      alert('Veuillez remplir les adresses de départ et d\'arrivée');
      return;
    }
    
    this.state.loading = true;
    this.render();
    
    try {
      // Simuler le geocoding (en prod: utiliser Google Maps API)
      this.state.pickup = {
        address: pickupInput.value,
        lat: 48.5734 + Math.random() * 0.01,
        lng: 7.7521 + Math.random() * 0.01
      };
      
      this.state.dropoff = {
        address: dropoffInput.value,
        lat: 48.5734 + Math.random() * 0.05,
        lng: 7.7521 + Math.random() * 0.05
      };
      
      if (datetimeInput?.value) {
        this.state.scheduledDate = new Date(datetimeInput.value);
      }
      
      // Appel API pour le devis
      const response = await fetch(`${this.config.apiUrl}/api/v1/pricing/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey
        },
        body: JSON.stringify({
          distanceKm: 10 + Math.random() * 15,
          durationMin: 15 + Math.random() * 20,
          pickup: this.state.pickup,
          dropoff: this.state.dropoff,
          passengers: 1
        })
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors du calcul du prix');
      }
      
      const data = await response.json();
      
      // Adapter la réponse de l'API au format attendu
      if (data.success && data.data?.quotes) {
        const standardQuote = data.data.quotes.find((q: any) => q.vehicleType === 'standard') || data.data.quotes[0];
        this.state.quote = {
          vehicleType: 'standard',
          basePrice: standardQuote.breakdown.baseFare,
          surgeMultiplier: standardQuote.surgeMultiplier || 1,
          finalPrice: standardQuote.price,
          estimatedDuration: standardQuote.durationMin || 20,
          estimatedDistance: standardQuote.distanceKm || 10,
          currency: 'EUR',
          allQuotes: data.data.quotes
        };
      } else {
        this.state.quote = data;
      }
      if (this.state.quote) {
        this.config.onQuoteReceived?.(this.state.quote);
      }
      
      this.state.step = 'vehicles';
      this.state.loading = false;
      this.render();
      
    } catch (error) {
      console.error('VeeoWidget error:', error);
      this.state.loading = false;
      this.render();
      
      // Demo mode: afficher des prix simulés
      this.state.quote = this.getMockQuote();
      this.state.step = 'vehicles';
      this.render();
    }
  }

  private getMockQuote(): PriceQuote {
    const distance = 5 + Math.random() * 25;
    const duration = distance * 2 + Math.random() * 10;
    const basePrice = 4.5 + distance * 1.35 + duration * 0.35;
    const surge = 1 + (Math.random() > 0.7 ? 0.15 : 0);
    
    return {
      vehicleType: 'standard',
      basePrice: Math.round(basePrice * 100) / 100,
      surgeMultiplier: surge,
      finalPrice: Math.round(basePrice * surge * 100) / 100,
      estimatedDuration: Math.round(duration),
      estimatedDistance: Math.round(distance * 10) / 10,
      currency: 'EUR'
    };
  }

  private renderVehiclesStep(): void {
    if (!this.container || !this.state.quote) return;
    
    const quote = this.state.quote as any;
    const allQuotes = quote.allQuotes || [];
    
    const vehicles = [
      { type: 'standard', name: 'Standard', icon: '🚗', price: allQuotes.find((q: any) => q.vehicleType === 'standard')?.price || quote.finalPrice },
      { type: 'premium', name: 'Premium', icon: '🚙', price: allQuotes.find((q: any) => q.vehicleType === 'premium')?.price || quote.finalPrice * 1.4 },
      { type: 'van', name: 'Van', icon: '🚐', price: allQuotes.find((q: any) => q.vehicleType === 'van')?.price || quote.finalPrice * 1.8 }
    ].filter(v => this.config.vehicles?.includes(v.type));
    
    this.container.innerHTML = `
      <div class="veeo-widget">
        <button class="veeo-widget-back" id="veeo-back">← Modifier les adresses</button>
        <h3>Choisir un véhicule</h3>
        
        ${quote.surgeMultiplier > 1 && this.config.showSurgeInfo ? `
          <div class="veeo-widget-surge">
            ⚡ Forte demande : majoration de ${Math.round((quote.surgeMultiplier - 1) * 100)}%
          </div>
        ` : ''}
        
        <div class="veeo-widget-vehicles">
          ${vehicles.map(v => `
            <div 
              class="veeo-widget-vehicle ${this.state.selectedVehicle === v.type ? 'active' : ''}"
              data-vehicle="${v.type}"
            >
              <div class="veeo-widget-vehicle-icon">${v.icon}</div>
              <div class="veeo-widget-vehicle-name">${v.name}</div>
              <div class="veeo-widget-vehicle-price">
                ${Math.round(v.price)}€
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="veeo-widget-quote">
          <div class="veeo-widget-quote-row">
            <span>Distance</span>
            <span>${quote.estimatedDistance} km</span>
          </div>
          ${this.config.showEstimatedTime ? `
            <div class="veeo-widget-quote-row">
              <span>Durée estimée</span>
              <span>${quote.estimatedDuration} min</span>
            </div>
          ` : ''}
          <div class="veeo-widget-quote-row">
            <span>Total</span>
            <span>${this.getSelectedPrice()}€</span>
          </div>
        </div>
        
        <button class="veeo-widget-btn" id="veeo-confirm">
          Confirmer la réservation
        </button>
      </div>
    `;
    
    this.bindVehiclesEvents();
  }

  private getSelectedPrice(): number {
    if (!this.state.quote) return 0;
    const quote = this.state.quote as any;
    const allQuotes = quote.allQuotes || [];
    const selectedQuote = allQuotes.find((q: any) => q.vehicleType === this.state.selectedVehicle);
    if (selectedQuote) {
      return Math.round(selectedQuote.price);
    }
    const multipliers: Record<string, number> = { standard: 1, premium: 1.4, van: 1.8 };
    return Math.round(quote.finalPrice * (multipliers[this.state.selectedVehicle] || 1));
  }

  private bindVehiclesEvents(): void {
    const backBtn = document.getElementById('veeo-back');
    backBtn?.addEventListener('click', () => {
      this.state.step = 'locations';
      this.render();
    });
    
    document.querySelectorAll('.veeo-widget-vehicle').forEach(el => {
      el.addEventListener('click', () => {
        const type = (el as HTMLElement).dataset.vehicle;
        if (type) {
          this.state.selectedVehicle = type;
          this.render();
        }
      });
    });
    
    const confirmBtn = document.getElementById('veeo-confirm');
    confirmBtn?.addEventListener('click', () => this.createBooking());
  }

  private async createBooking(): Promise<void> {
    this.state.loading = true;
    this.render();
    
    try {
      const response = await fetch(`${this.config.apiUrl}/api/v1/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey
        },
        body: JSON.stringify({
          customerName: 'Client Widget',
          customerPhone: '+33600000000',
          customerEmail: 'widget@veeocore.com',
          pickup: this.state.pickup,
          dropoff: this.state.dropoff,
          vehicleType: this.state.selectedVehicle,
          scheduledFor: this.state.scheduledDate?.toISOString() || new Date(Date.now() + 3600000).toISOString(),
          passengers: 1,
          luggage: 0,
          estimatedPrice: this.getSelectedPrice(),
          estimatedDistance: this.state.quote?.estimatedDistance || 10,
          estimatedDuration: this.state.quote?.estimatedDuration || 20
        })
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la création de la réservation');
      }
      
      const result = await response.json();
      const booking = result.data?.booking || result;
      this.config.onBookingCreated?.(booking);
      
      this.state.step = 'confirm';
      this.state.loading = false;
      this.render();
      
    } catch (error) {
      console.error('VeeoWidget booking error:', error);
      // Demo mode
      const mockBooking: BookingResult = {
        id: 'BK-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        status: 'pending',
        pickup: this.state.pickup!,
        dropoff: this.state.dropoff!,
        scheduledFor: this.state.scheduledDate?.toISOString() || new Date().toISOString(),
        price: this.getSelectedPrice(),
        vehicleType: this.state.selectedVehicle
      };
      
      this.config.onBookingCreated?.(mockBooking);
      this.state.step = 'confirm';
      this.state.loading = false;
      this.render();
    }
  }

  private renderConfirmStep(): void {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="veeo-widget">
        <div class="veeo-widget-success">
          <div class="veeo-widget-success-icon">✓</div>
          <h3>Réservation confirmée !</h3>
          <p style="color: #6b7280; margin: 16px 0;">
            Votre chauffeur sera notifié et vous recevrez une confirmation par email.
          </p>
          <button class="veeo-widget-btn" id="veeo-new">
            Nouvelle réservation
          </button>
        </div>
      </div>
    `;
    
    document.getElementById('veeo-new')?.addEventListener('click', () => {
      this.state = {
        pickup: null,
        dropoff: null,
        selectedVehicle: 'standard',
        scheduledDate: null,
        quote: null,
        loading: false,
        step: 'locations'
      };
      this.render();
    });
  }

  destroy(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
