export interface VeeoWidgetConfig {
  apiKey: string;
  apiUrl?: string;
  containerId?: string;
  theme?: 'light' | 'dark' | 'auto';
  primaryColor?: string;
  locale?: string;
  vehicles?: string[];
  showSurgeInfo?: boolean;
  showEstimatedTime?: boolean;
  onQuoteReceived?: (quote: PriceQuote) => void;
  onBookingCreated?: (booking: BookingResult) => void;
  onError?: (error: Error) => void;
}

export interface PriceQuote {
  vehicleType: string;
  basePrice: number;
  surgeMultiplier: number;
  finalPrice: number;
  estimatedDuration: number;
  estimatedDistance: number;
  currency: string;
  allQuotes?: any[];
}

export interface BookingResult {
  id: string;
  status: string;
  pickup: Location;
  dropoff: Location;
  scheduledFor: string;
  price: number;
  vehicleType: string;
}

export interface Location {
  address: string;
  lat: number;
  lng: number;
}
