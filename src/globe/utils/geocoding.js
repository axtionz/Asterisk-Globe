import { geocodingService, validation } from '../../services/apiService.js';

// Static coordinate database for common locations to reduce API calls
const STATIC_COORDINATES = {
  // Major cities
  'new york': { latitude: 40.7128, longitude: -74.0060, formatted: 'New York City, NY, USA' },
  'london': { latitude: 51.5074, longitude: -0.1278, formatted: 'London, UK' },
  'tokyo': { latitude: 35.6762, longitude: 139.6503, formatted: 'Tokyo, Japan' },
  'paris': { latitude: 48.8566, longitude: 2.3522, formatted: 'Paris, France' },
  'berlin': { latitude: 52.5200, longitude: 13.4050, formatted: 'Berlin, Germany' },
  'moscow': { latitude: 55.7558, longitude: 37.6176, formatted: 'Moscow, Russia' },
  'beijing': { latitude: 39.9042, longitude: 116.4074, formatted: 'Beijing, China' },
  'sydney': { latitude: -33.8688, longitude: 151.2093, formatted: 'Sydney, Australia' },
  'mumbai': { latitude: 19.0760, longitude: 72.8777, formatted: 'Mumbai, India' },
  'cairo': { latitude: 30.0444, longitude: 31.2357, formatted: 'Cairo, Egypt' },
  
  // Countries (capital cities)
  'iran': { latitude: 35.6892, longitude: 51.3890, formatted: 'Tehran, Iran' },
  'iraq': { latitude: 33.3152, longitude: 44.3661, formatted: 'Baghdad, Iraq' },
  'israel': { latitude: 31.7683, longitude: 35.2137, formatted: 'Jerusalem, Israel' },
  'ukraine': { latitude: 50.4501, longitude: 30.5234, formatted: 'Kiev, Ukraine' },
  'russia': { latitude: 55.7558, longitude: 37.6176, formatted: 'Moscow, Russia' },
  'china': { latitude: 39.9042, longitude: 116.4074, formatted: 'Beijing, China' },
  'india': { latitude: 28.6139, longitude: 77.2090, formatted: 'New Delhi, India' },
  'japan': { latitude: 35.6762, longitude: 139.6503, formatted: 'Tokyo, Japan' },
  'south korea': { latitude: 37.5665, longitude: 126.9780, formatted: 'Seoul, South Korea' },
  'north korea': { latitude: 39.0392, longitude: 125.7625, formatted: 'Pyongyang, North Korea' },
  
  // US States (major cities)
  'california': { latitude: 34.0522, longitude: -118.2437, formatted: 'Los Angeles, CA, USA' },
  'texas': { latitude: 29.7604, longitude: -95.3698, formatted: 'Houston, TX, USA' },
  'florida': { latitude: 25.7617, longitude: -80.1918, formatted: 'Miami, FL, USA' },
  'new york state': { latitude: 40.7128, longitude: -74.0060, formatted: 'New York City, NY, USA' },
  
  // Geographic regions
  'middle east': { latitude: 29.0, longitude: 47.0, formatted: 'Middle East Region' },
  'europe': { latitude: 54.5260, longitude: 15.2551, formatted: 'Central Europe' },
  'asia': { latitude: 34.0479, longitude: 100.6197, formatted: 'Central Asia' },
  'africa': { latitude: -8.7832, longitude: 34.5085, formatted: 'Central Africa' },
  'south america': { latitude: -8.7832, longitude: -55.4915, formatted: 'Central South America' },
  'north america': { latitude: 45.0, longitude: -100.0, formatted: 'Central North America' }
};

// Normalize location name for lookup
function normalizeLocationName(name) {
  return name.toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

// Get coordinates from location name
export async function geocodeLocation(locationName) {
  // Validate input
  if (!validation.isValidLocation(locationName)) {
    throw new Error('Invalid location name provided');
  }

  const sanitized = validation.sanitizeInput(locationName);
  const normalized = normalizeLocationName(sanitized);

  // Check static database first
  if (STATIC_COORDINATES[normalized]) {
    console.log(`Static geocoding hit for: ${locationName}`);
    return STATIC_COORDINATES[normalized];
  }

  // Fallback to API geocoding service
  try {
    return await geocodingService.geocodeLocation(sanitized);
  } catch (error) {
    console.error(`Geocoding failed for "${locationName}":`, error);
    
    // Return null coordinates for unmappable locations
    // This allows the system to continue functioning
    return {
      latitude: 0,
      longitude: 0,
      formatted: `Unknown Location: ${locationName}`,
      error: error.message
    };
  }
}

// Batch geocode multiple locations
export async function geocodeMultipleLocations(locations) {
  const results = [];
  
  for (const location of locations) {
    try {
      const coords = await geocodeLocation(location);
      results.push({
        location,
        success: true,
        coordinates: coords
      });
    } catch (error) {
      results.push({
        location,
        success: false,
        error: error.message
      });
    }
    
    // Add small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

// Calculate great circle distance between two points
export function calculateDistance(coord1, coord2) {
  if (!validation.isValidCoordinate(coord1.latitude, coord1.longitude) ||
      !validation.isValidCoordinate(coord2.latitude, coord2.longitude)) {
    throw new Error('Invalid coordinates provided');
  }

  const R = 6371; // Earth's radius in kilometers
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const dLng = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

// Get intermediate points along a great circle path
export function getIntermediatePoints(start, end, numPoints = 10) {
  if (!validation.isValidCoordinate(start.latitude, start.longitude) ||
      !validation.isValidCoordinate(end.latitude, end.longitude)) {
    throw new Error('Invalid coordinates provided');
  }

  const points = [];
  const lat1 = start.latitude * Math.PI / 180;
  const lng1 = start.longitude * Math.PI / 180;
  const lat2 = end.latitude * Math.PI / 180;
  const lng2 = end.longitude * Math.PI / 180;
  
  const d = 2 * Math.asin(Math.sqrt(
    Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lng1 - lng2) / 2), 2)
  ));
  
  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const a = Math.sin((1 - f) * d) / Math.sin(d);
    const b = Math.sin(f * d) / Math.sin(d);
    
    const x = a * Math.cos(lat1) * Math.cos(lng1) + b * Math.cos(lat2) * Math.cos(lng2);
    const y = a * Math.cos(lat1) * Math.sin(lng1) + b * Math.cos(lat2) * Math.sin(lng2);
    const z = a * Math.sin(lat1) + b * Math.sin(lat2);
    
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lng = Math.atan2(y, x);
    
    points.push({
      latitude: lat * 180 / Math.PI,
      longitude: lng * 180 / Math.PI
    });
  }
  
  return points;
}

// Add new static coordinates (useful for expanding the database)
export function addStaticCoordinate(name, coordinates) {
  const normalized = normalizeLocationName(name);
  if (validation.isValidCoordinate(coordinates.latitude, coordinates.longitude)) {
    STATIC_COORDINATES[normalized] = coordinates;
    console.log(`Added static coordinate for: ${name}`);
  } else {
    throw new Error('Invalid coordinates provided');
  }
}

// Get all static coordinates (for debugging)
export function getStaticCoordinates() {
  return { ...STATIC_COORDINATES };
}

// Clear geocoding cache
export function clearGeocodingCache() {
  geocodingService.clearCache();
}

// Get geocoding statistics
export function getGeocodingStats() {
  return {
    staticCoordinates: Object.keys(STATIC_COORDINATES).length,
    ...geocodingService.getCacheStats()
  };
}