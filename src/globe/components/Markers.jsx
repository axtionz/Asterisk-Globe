import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { latLngToVector3, getEventConfig } from '../utils/globeUtils.js';

// Individual marker component
function Marker({ 
  latitude, 
  longitude, 
  eventType = 'earthquake',
  magnitude = 5.0,
  timestamp,
  onClick,
  customConfig = {}
}) {
  const meshRef = useRef();
  const config = useMemo(() => ({ 
    ...getEventConfig(eventType), 
    ...customConfig 
  }), [eventType, customConfig]);
  
  // Calculate position on globe surface
  const position = useMemo(() => {
    return latLngToVector3(latitude, longitude);
  }, [latitude, longitude]);
  
  // Create pulsing animation
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      const pulse = Math.sin(time * config.pulseSpeed) * 0.3 + 0.7; // 0.4 to 1.0
      meshRef.current.scale.setScalar(pulse);
      
      // Update material opacity for additional pulsing effect
      if (meshRef.current.material) {
        meshRef.current.material.opacity = pulse * 0.8;
      }
    }
  });
  
  const handleClick = (event) => {
    event.stopPropagation();
    if (onClick) {
      onClick({
        latitude,
        longitude,
        eventType,
        magnitude,
        timestamp,
        position
      });
    }
  };
  
  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={handleClick}
    >
      <sphereGeometry args={[config.size, 16, 16]} />
      <meshBasicMaterial
        color={config.color}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

// Markers container component
export default function Markers({ events = [], onMarkerClick }) {
  // Memoize markers to prevent unnecessary re-renders
  const markers = useMemo(() => {
    return events
      .filter(event => 
        event.latitude != null && 
        event.longitude != null &&
        !isNaN(event.latitude) && 
        !isNaN(event.longitude)
      )
      .map((event, index) => (
        <Marker
          key={event.id || `marker-${index}`}
          latitude={event.latitude}
          longitude={event.longitude}
          eventType={event.type || event.eventType || 'earthquake'}
          magnitude={event.magnitude || 5.0}
          timestamp={event.timestamp}
          onClick={onMarkerClick}
          customConfig={event.customConfig}
        />
      ));
  }, [events, onMarkerClick]);
  
  return (
    <group name="markers">
      {markers}
    </group>
  );
}

// Specialized marker types
export function EarthquakeMarkers({ earthquakes = [], onMarkerClick }) {
  return (
    <Markers 
      events={earthquakes.map(eq => ({ ...eq, type: 'earthquake' }))} 
      onMarkerClick={onMarkerClick}
    />
  );
}

export function VolcanoMarkers({ volcanoes = [], onMarkerClick }) {
  return (
    <Markers 
      events={volcanoes.map(volcano => ({ ...volcano, type: 'volcano' }))} 
      onMarkerClick={onMarkerClick}
    />
  );
}

export function StormMarkers({ storms = [], onMarkerClick }) {
  return (
    <Markers 
      events={storms.map(storm => ({ ...storm, type: 'storm' }))} 
      onMarkerClick={onMarkerClick}
    />
  );
}

// Animated marker that appears with a scaling effect
export function AnimatedMarker({ 
  latitude, 
  longitude, 
  eventType = 'earthquake',
  duration = 1.0,
  onComplete
}) {
  const meshRef = useRef();
  const startTime = useRef(Date.now());
  const config = useMemo(() => getEventConfig(eventType), [eventType]);
  
  const position = useMemo(() => {
    return latLngToVector3(latitude, longitude);
  }, [latitude, longitude]);
  
  useFrame(() => {
    if (meshRef.current) {
      const elapsed = (Date.now() - startTime.current) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress < 1) {
        // Growing animation
        const scale = progress * progress; // Ease-in
        meshRef.current.scale.setScalar(scale);
        meshRef.current.material.opacity = 0.8 * progress;
      } else {
        // Animation complete
        meshRef.current.scale.setScalar(1);
        meshRef.current.material.opacity = 0.8;
        if (onComplete) {
          onComplete();
        }
      }
    }
  });
  
  return (
    <mesh
      ref={meshRef}
      position={position}
    >
      <sphereGeometry args={[config.size, 16, 16]} />
      <meshBasicMaterial
        color={config.color}
        transparent
        opacity={0}
      />
    </mesh>
  );
}

// Cluster marker for when multiple events are close together
export function ClusterMarker({ 
  latitude, 
  longitude, 
  count,
  events = [],
  onClick
}) {
  const meshRef = useRef();
  const textRef = useRef();
  
  const position = useMemo(() => {
    return latLngToVector3(latitude, longitude);
  }, [latitude, longitude]);
  
  // Size based on event count
  const size = useMemo(() => {
    return Math.min(0.1 + (count * 0.02), 0.3);
  }, [count]);
  
  // Color based on most severe event type
  const color = useMemo(() => {
    const severityOrder = ['earthquake', 'volcano', 'storm', 'conflict'];
    const mostSevere = events.reduce((prev, curr) => {
      const prevIndex = severityOrder.indexOf(prev.type || 'earthquake');
      const currIndex = severityOrder.indexOf(curr.type || 'earthquake');
      return currIndex > prevIndex ? curr : prev;
    }, events[0] || {});
    
    return getEventConfig(mostSevere.type || 'earthquake').color;
  }, [events]);
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      const pulse = Math.sin(time * 2) * 0.1 + 0.9;
      meshRef.current.scale.setScalar(pulse);
    }
  });
  
  const handleClick = (event) => {
    event.stopPropagation();
    if (onClick) {
      onClick({
        latitude,
        longitude,
        count,
        events,
        position
      });
    }
  };
  
  return (
    <group>
      <mesh
        ref={meshRef}
        position={position}
        onClick={handleClick}
      >
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.7}
        />
      </mesh>
      
      {/* Text showing count - would need Text component from @react-three/drei */}
      {/* For now, we'll skip the text overlay */}
    </group>
  );
}