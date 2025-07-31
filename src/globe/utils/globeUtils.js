import * as THREE from 'three';

// Globe configuration constants
export const GLOBE_CONFIG = {
  radius: 5,
  segments: 64,
  rings: 32,
  position: [0, 0, 0],
  
  // Texture paths
  textures: {
    earth: '/textures/earth.jpg', // You'll need to add this texture
    earthNight: '/textures/earth_night.jpg',
    earthClouds: '/textures/earth_clouds.jpg',
    earthBump: '/textures/earth_bump.jpg'
  },
  
  // Visual settings
  atmosphere: {
    enabled: true,
    color: '#4A90E2',
    intensity: 0.3
  },
  
  // Animation settings
  rotation: {
    speed: 0.005,
    enabled: true
  }
};

// Convert latitude/longitude to 3D coordinates on globe surface
export function latLngToVector3(lat, lng, radius = GLOBE_CONFIG.radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  
  return new THREE.Vector3(x, y, z);
}

// Convert 3D coordinates back to lat/lng
export function vector3ToLatLng(vector, radius = GLOBE_CONFIG.radius) {
  const normalizedVector = vector.clone().normalize().multiplyScalar(radius);
  
  const lat = 90 - (Math.acos(normalizedVector.y / radius) * 180 / Math.PI);
  const lng = ((Math.atan2(normalizedVector.z, -normalizedVector.x)) * 180 / Math.PI) - 180;
  
  return { lat, lng };
}

// Create arc curve between two points on globe surface
export function createArcCurve(startLatLng, endLatLng, arcHeight = 2) {
  const startVector = latLngToVector3(startLatLng.lat, startLatLng.lng);
  const endVector = latLngToVector3(endLatLng.lat, endLatLng.lng);
  
  // Calculate midpoint and add height for arc
  const midVector = startVector.clone().add(endVector).multiplyScalar(0.5);
  midVector.normalize().multiplyScalar(GLOBE_CONFIG.radius + arcHeight);
  
  // Create quadratic Bezier curve
  const curve = new THREE.QuadraticBezierCurve3(startVector, midVector, endVector);
  
  return curve;
}

// Generate geometry for arc line
export function createArcGeometry(startLatLng, endLatLng, arcHeight = 2, divisions = 50) {
  const curve = createArcCurve(startLatLng, endLatLng, arcHeight);
  const points = curve.getPoints(divisions);
  
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return geometry;
}

// Create marker geometry (sphere)
export function createMarkerGeometry(radius = 0.05) {
  return new THREE.SphereGeometry(radius, 16, 16);
}

// Create pulsing marker material
export function createPulsingMarkerMaterial(color = '#ff0000', pulseSpeed = 2) {
  const material = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.8
  });
  
  // Add pulsing animation
  material.userData = {
    pulseSpeed,
    originalOpacity: 0.8
  };
  
  return material;
}

// Create arc material with gradient effect
export function createArcMaterial(startColor = '#ff0000', endColor = '#ffaa00', opacity = 0.8) {
  return new THREE.LineBasicMaterial({
    color: startColor,
    transparent: true,
    opacity: opacity,
    linewidth: 3 // Note: linewidth > 1 only works with WebGLRenderer in some browsers
  });
}

// Create atmosphere effect
export function createAtmosphere() {
  const atmosphereGeometry = new THREE.SphereGeometry(
    GLOBE_CONFIG.radius * 1.1, 
    GLOBE_CONFIG.segments, 
    GLOBE_CONFIG.rings
  );
  
  const atmosphereMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color: { value: new THREE.Color(GLOBE_CONFIG.atmosphere.color) },
      intensity: { value: GLOBE_CONFIG.atmosphere.intensity }
    },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 color;
      uniform float intensity;
      varying vec3 vNormal;
      
      void main() {
        float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        float pulse = sin(time * 2.0) * 0.1 + 0.9;
        
        gl_FragColor = vec4(color, fresnel * intensity * pulse);
      }
    `,
    transparent: true,
    side: THREE.BackSide
  });
  
  return new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
}

// Animation utilities
export class GlobeAnimationManager {
  constructor() {
    this.animations = new Map();
    this.clock = new THREE.Clock();
  }
  
  // Add pulsing animation to marker
  addPulsingMarker(marker, options = {}) {
    const { speed = 2, minOpacity = 0.3, maxOpacity = 1.0 } = options;
    
    this.animations.set(marker.uuid, {
      type: 'pulse',
      marker,
      speed,
      minOpacity,
      maxOpacity,
      originalOpacity: marker.material.opacity
    });
  }
  
  // Add arc animation
  addAnimatedArc(arc, options = {}) {
    const { duration = 2, delay = 0 } = options;
    
    this.animations.set(arc.uuid, {
      type: 'arc',
      arc,
      duration,
      delay,
      startTime: this.clock.getElapsedTime() + delay,
      originalGeometry: arc.geometry.clone()
    });
  }
  
  // Update all animations
  update() {
    const time = this.clock.getElapsedTime();
    
    this.animations.forEach((animation, key) => {
      switch (animation.type) {
        case 'pulse':
          this.updatePulseAnimation(animation, time);
          break;
        case 'arc':
          this.updateArcAnimation(animation, time);
          break;
      }
    });
  }
  
  updatePulseAnimation(animation, time) {
    const { marker, speed, minOpacity, maxOpacity } = animation;
    const pulse = Math.sin(time * speed) * 0.5 + 0.5; // 0 to 1
    const opacity = minOpacity + (maxOpacity - minOpacity) * pulse;
    
    if (marker.material) {
      marker.material.opacity = opacity;
    }
  }
  
  updateArcAnimation(animation, time) {
    const { arc, duration, startTime, originalGeometry } = animation;
    
    if (time < startTime) return;
    
    const progress = Math.min((time - startTime) / duration, 1);
    
    if (progress >= 1) {
      // Animation complete
      this.animations.delete(arc.uuid);
      return;
    }
    
    // Animate arc drawing by updating geometry
    const points = originalGeometry.attributes.position.array;
    const animatedPoints = [];
    const visiblePoints = Math.floor(points.length * progress);
    
    for (let i = 0; i < visiblePoints; i++) {
      animatedPoints.push(points[i]);
    }
    
    arc.geometry.setFromPoints(animatedPoints);
  }
  
  // Remove animation
  removeAnimation(object) {
    this.animations.delete(object.uuid);
  }
  
  // Clear all animations
  clear() {
    this.animations.clear();
  }
}

// Event type configurations for different visual styles
export const EVENT_TYPES = {
  earthquake: {
    color: '#ff4444',
    size: 0.08,
    pulseSpeed: 3,
    icon: '🌍'
  },
  volcano: {
    color: '#ff8800',
    size: 0.1,
    pulseSpeed: 2,
    icon: '🌋'
  },
  storm: {
    color: '#4488ff',
    size: 0.06,
    pulseSpeed: 4,
    icon: '⛈️'
  },
  conflict: {
    color: '#ff0000',
    size: 0.05,
    pulseSpeed: 2.5,
    icon: '⚡'
  },
  trade: {
    color: '#00ff88',
    size: 0.04,
    pulseSpeed: 1,
    icon: '💹'
  },
  political: {
    color: '#8844ff',
    size: 0.06,
    pulseSpeed: 1.5,
    icon: '🏛️'
  }
};

// Helper function to get event configuration
export function getEventConfig(eventType) {
  return EVENT_TYPES[eventType] || EVENT_TYPES.earthquake;
}

// Create event marker with specific styling
export function createEventMarker(position, eventType = 'earthquake', customConfig = {}) {
  const config = { ...getEventConfig(eventType), ...customConfig };
  
  const geometry = createMarkerGeometry(config.size);
  const material = createPulsingMarkerMaterial(config.color, config.pulseSpeed);
  
  const marker = new THREE.Mesh(geometry, material);
  marker.position.copy(position);
  
  // Add metadata
  marker.userData = {
    eventType,
    config,
    createdAt: Date.now()
  };
  
  return marker;
}

// Utility to dispose of Three.js objects properly
export function disposeObject(object) {
  if (object.geometry) {
    object.geometry.dispose();
  }
  
  if (object.material) {
    if (Array.isArray(object.material)) {
      object.material.forEach(material => {
        if (material.map) material.map.dispose();
        material.dispose();
      });
    } else {
      if (object.material.map) object.material.map.dispose();
      object.material.dispose();
    }
  }
  
  if (object.children) {
    object.children.forEach(child => disposeObject(child));
  }
}

// Performance monitoring
export class PerformanceMonitor {
  constructor() {
    this.stats = {
      frameCount: 0,
      lastTime: performance.now(),
      fps: 0,
      renderTime: 0
    };
  }
  
  update() {
    this.stats.frameCount++;
    const currentTime = performance.now();
    
    if (currentTime - this.stats.lastTime >= 1000) {
      this.stats.fps = this.stats.frameCount;
      this.stats.frameCount = 0;
      this.stats.lastTime = currentTime;
    }
  }
  
  getFPS() {
    return this.stats.fps;
  }
  
  getRenderTime() {
    return this.stats.renderTime;
  }
}