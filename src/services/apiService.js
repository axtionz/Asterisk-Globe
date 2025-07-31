// Secure API service that hides API keys from frontend
// This would typically be a backend service, but for development we'll use environment variables

const API_CONFIG = {
  openai: {
    key: import.meta.env.VITE_OPENAI_API_KEY,
    url: import.meta.env.VITE_OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions'
  },
  opencage: {
    key: import.meta.env.VITE_OPENCAGE_API_KEY,
    url: import.meta.env.VITE_OPENCAGE_BASE_URL || 'https://api.opencagedata.com/geocode/v1/json'
  }
};

// Validate that API keys are configured
const validateApiKeys = () => {
  if (!API_CONFIG.openai.key || API_CONFIG.openai.key.includes('your_')) {
    console.warn('OpenAI API key not configured properly');
  }
  if (!API_CONFIG.opencage.key || API_CONFIG.opencage.key.includes('your_')) {
    console.warn('OpenCage API key not configured properly');
  }
};

// Initialize validation on module load
validateApiKeys();

// OpenAI API service
export const openaiService = {
  async chatCompletion(messages, options = {}) {
    if (!API_CONFIG.openai.key || API_CONFIG.openai.key.includes('your_')) {
      throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env file');
    }

    const body = {
      model: options.model || 'gpt-3.5-turbo',
      messages,
      temperature: options.temperature || 0.7,
      ...options
    };

    const response = await fetch(API_CONFIG.openai.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_CONFIG.openai.key}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    return response.json();
  }
};

// Geocoding service
export const geocodingService = {
  cache: new Map(),
  
  async geocodeLocation(locationName) {
    if (!API_CONFIG.opencage.key || API_CONFIG.opencage.key.includes('your_')) {
      throw new Error('OpenCage API key not configured. Please set VITE_OPENCAGE_API_KEY in your .env file');
    }

    // Check cache first
    const cacheKey = locationName.toLowerCase().trim();
    if (this.cache.has(cacheKey)) {
      console.log(`Geocoding cache hit for: ${locationName}`);
      return this.cache.get(cacheKey);
    }

    try {
      const encodedLocation = encodeURIComponent(locationName);
      const url = `${API_CONFIG.opencage.url}?q=${encodedLocation}&key=${API_CONFIG.opencage.key}&limit=1&no_annotations=1`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const coords = {
          latitude: result.geometry.lat,
          longitude: result.geometry.lng,
          formatted: result.formatted,
          confidence: result.confidence
        };
        
        // Cache the result
        this.cache.set(cacheKey, coords);
        console.log(`Geocoded "${locationName}" -> ${coords.formatted}`);
        
        return coords;
      } else {
        throw new Error(`Location not found: ${locationName}`);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  },

  // Clear cache if needed
  clearCache() {
    this.cache.clear();
  },

  // Get cache stats
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
};

// Rate limiting utility
class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  canMakeRequest() {
    const now = Date.now();
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }

  getTimeUntilReset() {
    if (this.requests.length === 0) return 0;
    const oldestRequest = Math.min(...this.requests);
    const timeUntilReset = this.windowMs - (Date.now() - oldestRequest);
    return Math.max(0, timeUntilReset);
  }
}

// Create rate limiters for different services
export const rateLimiters = {
  openai: new RateLimiter(10, 60000), // 10 requests per minute
  geocoding: new RateLimiter(100, 60000) // 100 requests per minute (generous for OpenCage free tier)
};

// Input validation utilities
export const validation = {
  isValidLocation(location) {
    if (typeof location !== 'string') return false;
    const trimmed = location.trim();
    return trimmed.length > 0 && trimmed.length < 200;
  },

  sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.trim().substring(0, 500); // Limit input length
  },

  isValidCoordinate(lat, lng) {
    return (
      typeof lat === 'number' && 
      typeof lng === 'number' &&
      lat >= -90 && lat <= 90 &&
      lng >= -180 && lng <= 180
    );
  }
};