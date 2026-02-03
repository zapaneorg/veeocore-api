/**
 * Routes API - Géocodage et ETA (Temps d'arrivée estimé)
 * Utilise Google Maps API pour la précision
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { calculateDistance } from './utils/geo';

const router = Router();

// Google Maps API Key (from environment)
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

// Schémas de validation
const geocodeSchema = z.object({
  address: z.string().min(3)
});

const reverseGeocodeSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});

const etaSchema = z.object({
  origin: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }),
  destination: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }),
  mode: z.enum(['driving', 'walking']).optional().default('driving')
});

const distanceMatrixSchema = z.object({
  origins: z.array(z.object({
    lat: z.number(),
    lng: z.number()
  })).min(1).max(10),
  destinations: z.array(z.object({
    lat: z.number(),
    lng: z.number()
  })).min(1).max(10),
  mode: z.enum(['driving', 'walking']).optional().default('driving')
});

/**
 * GET /api/v1/geo/geocode
 * Convertit une adresse en coordonnées (pour autocomplete)
 * Utilise Google Places Autocomplete API
 */
router.get('/geocode', async (req: Request, res: Response) => {
  try {
    const address = req.query.address as string;
    const limit = parseInt(req.query.limit as string) || 5;
    
    if (!address || address.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'ADDRESS_REQUIRED',
        message: 'Address query parameter is required (min 3 chars)'
      });
    }
    
    // Utiliser Google Places Autocomplete API
    if (GOOGLE_MAPS_API_KEY) {
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodedAddress}&types=address&components=country:fr&language=fr&key=${GOOGLE_MAPS_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.predictions?.length > 0) {
        // Récupérer les détails pour chaque prédiction (coordonnées)
        const locations = await Promise.all(
          data.predictions.slice(0, limit).map(async (prediction: any) => {
            const detailsRes = await fetch(
              `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,formatted_address&key=${GOOGLE_MAPS_API_KEY}`
            );
            const details = await detailsRes.json();
            
            return {
              lat: details.result?.geometry?.location?.lat,
              lon: details.result?.geometry?.location?.lng,
              display_name: prediction.description,
              place_id: prediction.place_id,
              type: prediction.types?.[0] || 'address'
            };
          })
        );
        
        return res.json({
          success: true,
          data: { results: locations.filter(l => l.lat && l.lon) }
        });
      }
    }
    
    // Fallback: Nominatim (OpenStreetMap) si pas de clé Google
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=${limit}&addressdetails=1&countrycodes=fr`,
      {
        headers: {
          'User-Agent': 'VeeoCore-API/1.0'
        }
      }
    );
    
    const results = await response.json();
    
    if (!results || results.length === 0) {
      return res.json({
        success: true,
        data: { results: [] }
      });
    }
    
    const locations = results.map((r: any) => ({
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
      display_name: r.display_name,
      type: r.type,
      importance: r.importance
    }));
    
    res.json({
      success: true,
      data: { results: locations }
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'GEOCODING_ERROR',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/geo/geocode
 * Convertit une adresse en coordonnées
 */
router.post('/geocode', async (req: Request, res: Response) => {
  try {
    const { address } = geocodeSchema.parse(req.body);
    
    // Utiliser l'API Nominatim (OpenStreetMap) - gratuit
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=5&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'VeeoCore-API/1.0'
        }
      }
    );
    
    const results = await response.json();
    
    if (!results || results.length === 0) {
      return res.status(404).json({
        error: 'ADDRESS_NOT_FOUND',
        message: 'Unable to find coordinates for the given address'
      });
    }
    
    const locations = results.map((r: any) => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      formattedAddress: r.display_name,
      components: {
        street: r.address?.road,
        houseNumber: r.address?.house_number,
        city: r.address?.city || r.address?.town || r.address?.village,
        postcode: r.address?.postcode,
        country: r.address?.country,
        countryCode: r.address?.country_code?.toUpperCase()
      },
      confidence: r.importance
    }));

    res.json({
      success: true,
      data: {
        query: address,
        results: locations
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request parameters',
        details: error.errors
      });
    }
    throw error;
  }
});

/**
 * POST /api/v1/geo/reverse
 * Convertit des coordonnées en adresse
 */
router.post('/reverse', async (req: Request, res: Response) => {
  try {
    const { lat, lng } = reverseGeocodeSchema.parse(req.body);
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'VeeoCore-API/1.0'
        }
      }
    );
    
    const result = await response.json();
    
    if (!result || result.error) {
      return res.status(404).json({
        error: 'LOCATION_NOT_FOUND',
        message: 'Unable to find address for the given coordinates'
      });
    }

    res.json({
      success: true,
      data: {
        lat,
        lng,
        formattedAddress: result.display_name,
        components: {
          street: result.address?.road,
          houseNumber: result.address?.house_number,
          city: result.address?.city || result.address?.town || result.address?.village,
          postcode: result.address?.postcode,
          country: result.address?.country,
          countryCode: result.address?.country_code?.toUpperCase()
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request parameters',
        details: error.errors
      });
    }
    throw error;
  }
});

/**
 * POST /api/v1/geo/eta
 * Calcule le temps d'arrivée estimé entre deux points
 */
router.post('/eta', async (req: Request, res: Response) => {
  try {
    const { origin, destination, mode } = etaSchema.parse(req.body);
    
    // Calcul de la distance à vol d'oiseau
    const straightLineDistance = calculateDistance(
      origin.lat, origin.lng,
      destination.lat, destination.lng
    );
    
    // Facteur de détour moyen (routes ne sont pas droites)
    const detourFactor = 1.3;
    const estimatedDistance = straightLineDistance * detourFactor;
    
    // Vitesses moyennes par mode (km/h)
    const avgSpeeds = {
      driving: {
        city: 25,      // En ville
        suburban: 50,  // Péri-urbain
        highway: 90    // Autoroute
      },
      walking: { city: 5, suburban: 5, highway: 5 }
    };
    
    // Estimation basée sur la distance
    let avgSpeed: number;
    if (estimatedDistance < 5) {
      avgSpeed = avgSpeeds[mode].city;
    } else if (estimatedDistance < 20) {
      avgSpeed = avgSpeeds[mode].suburban;
    } else {
      // Mix urbain/autoroute pour longues distances
      avgSpeed = mode === 'driving' 
        ? (avgSpeeds.driving.city * 0.3 + avgSpeeds.driving.highway * 0.7)
        : avgSpeeds.walking.city;
    }
    
    const durationMin = Math.round((estimatedDistance / avgSpeed) * 60);
    
    // Ajout du temps de trafic estimé (heures de pointe)
    const now = new Date();
    const hour = now.getHours();
    const isPeakHour = (hour >= 7 && hour < 9) || (hour >= 17 && hour < 19);
    const trafficMultiplier = isPeakHour && mode === 'driving' ? 1.4 : 1.0;
    
    const adjustedDuration = Math.round(durationMin * trafficMultiplier);
    
    // ETA en timestamp
    const etaTimestamp = new Date(now.getTime() + adjustedDuration * 60000);

    res.json({
      success: true,
      data: {
        origin,
        destination,
        distance: {
          straightLine: Math.round(straightLineDistance * 100) / 100,
          estimated: Math.round(estimatedDistance * 100) / 100,
          unit: 'km'
        },
        duration: {
          estimated: adjustedDuration,
          withoutTraffic: durationMin,
          unit: 'minutes'
        },
        eta: etaTimestamp.toISOString(),
        traffic: {
          isPeakHour,
          multiplier: trafficMultiplier
        },
        mode,
        calculatedAt: now.toISOString()
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request parameters',
        details: error.errors
      });
    }
    throw error;
  }
});

/**
 * POST /api/v1/geo/distance-matrix
 * Calcule les distances/durées entre plusieurs points
 */
router.post('/distance-matrix', async (req: Request, res: Response) => {
  try {
    const { origins, destinations, mode } = distanceMatrixSchema.parse(req.body);
    
    const matrix: Array<Array<{ distance: number; duration: number }>> = [];
    
    for (const origin of origins) {
      const row: Array<{ distance: number; duration: number }> = [];
      
      for (const destination of destinations) {
        const straightLine = calculateDistance(
          origin.lat, origin.lng,
          destination.lat, destination.lng
        );
        const distance = straightLine * 1.3; // Detour factor
        
        // Vitesse moyenne simplifiée
        const avgSpeed = mode === 'driving' ? 35 : 5;
        const duration = Math.round((distance / avgSpeed) * 60);
        
        row.push({
          distance: Math.round(distance * 100) / 100,
          duration
        });
      }
      
      matrix.push(row);
    }

    res.json({
      success: true,
      data: {
        origins,
        destinations,
        matrix,
        mode,
        units: {
          distance: 'km',
          duration: 'minutes'
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request parameters',
        details: error.errors
      });
    }
    throw error;
  }
});

export default router;
