import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { latLngToVector3, createArcCurve } from '../utils/globeUtils.js';

// Individual arc component
function Arc({
  startLatLng,
  endLatLng,
  color = '#ff4444',
  opacity = 0.8,
  lineWidth = 3,
  arcHeight = 2,
  animated = false,
  animationDuration = 2,
  onClick
}) {
  const lineRef = useRef();
  const animationRef = useRef({ progress: animated ? 0 : 1, startTime: Date.now() });
  
  // Create arc curve and geometry
  const { curve, geometry } = useMemo(() => {
    const arcCurve = createArcCurve(startLatLng, endLatLng, arcHeight);
    const points = arcCurve.getPoints(50);
    const arcGeometry = new THREE.BufferGeometry().setFromPoints(points);
    
    return {
      curve: arcCurve,
      geometry: arcGeometry
    };
  }, [startLatLng, endLatLng, arcHeight]);
  
  // Material
  const material = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      linewidth: lineWidth
    });
  }, [color, opacity, lineWidth]);
  
  // Animation
  useFrame(() => {
    if (animated && lineRef.current && animationRef.current.progress < 1) {
      const elapsed = (Date.now() - animationRef.current.startTime) / 1000;
      const progress = Math.min(elapsed / animationDuration, 1);
      animationRef.current.progress = progress;
      
      // Create partial geometry based on progress
      const totalPoints = 51; // 50 segments + 1
      const visiblePoints = Math.floor(totalPoints * progress);
      
      if (visiblePoints > 1) {
        const points = curve.getPoints(50);
        const partialPoints = points.slice(0, visiblePoints);
        const partialGeometry = new THREE.BufferGeometry().setFromPoints(partialPoints);
        
        lineRef.current.geometry.dispose();
        lineRef.current.geometry = partialGeometry;
      }
    }
  });
  
  const handleClick = (event) => {
    event.stopPropagation();
    if (onClick) {
      onClick({
        startLatLng,
        endLatLng,
        arcHeight,
        color
      });
    }
  };
  
  return (
    <line
      ref={lineRef}
      geometry={geometry}
      material={material}
      onClick={handleClick}
    />
  );
}

// Arches container component
export default function Arches({ arcs = [], onArcClick }) {
  const archComponents = useMemo(() => {
    return arcs
      .filter(arc => 
        arc.startLatLng && arc.endLatLng &&
        typeof arc.startLatLng.lat === 'number' &&
        typeof arc.startLatLng.lng === 'number' &&
        typeof arc.endLatLng.lat === 'number' &&
        typeof arc.endLatLng.lng === 'number'
      )
      .map((arc, index) => (
        <Arc
          key={arc.id || `arc-${index}`}
          startLatLng={arc.startLatLng}
          endLatLng={arc.endLatLng}
          color={arc.color}
          opacity={arc.opacity}
          lineWidth={arc.lineWidth}
          arcHeight={arc.arcHeight}
          animated={arc.animated}
          animationDuration={arc.animationDuration}
          onClick={onArcClick}
        />
      ));
  }, [arcs, onArcClick]);
  
  return (
    <group name="arches">
      {archComponents}
    </group>
  );
}

// Specialized arc types for different events
export function MissileArcs({ missiles = [], onArcClick }) {
  const missileArcs = useMemo(() => {
    return missiles.map(missile => ({
      ...missile,
      color: missile.color || '#ff0000',
      opacity: missile.opacity || 0.9,
      lineWidth: missile.lineWidth || 4,
      arcHeight: missile.arcHeight || 3,
      animated: missile.animated !== false, // Default to animated
      animationDuration: missile.animationDuration || 1.5
    }));
  }, [missiles]);
  
  return <Arches arcs={missileArcs} onArcClick={onArcClick} />;
}

export function TradeArcs({ trades = [], onArcClick }) {
  const tradeArcs = useMemo(() => {
    return trades.map(trade => ({
      ...trade,
      color: trade.color || '#00ff88',
      opacity: trade.opacity || 0.6,
      lineWidth: trade.lineWidth || 2,
      arcHeight: trade.arcHeight || 1.5,
      animated: trade.animated !== false,
      animationDuration: trade.animationDuration || 3
    }));
  }, [trades]);
  
  return <Arches arcs={tradeArcs} onArcClick={onArcClick} />;
}

export function FlightArcs({ flights = [], onArcClick }) {
  const flightArcs = useMemo(() => {
    return flights.map(flight => ({
      ...flight,
      color: flight.color || '#4488ff',
      opacity: flight.opacity || 0.5,
      lineWidth: flight.lineWidth || 1.5,
      arcHeight: flight.arcHeight || 1,
      animated: flight.animated !== false,
      animationDuration: flight.animationDuration || 4
    }));
  }, [flights]);
  
  return <Arches arcs={flightArcs} onArcClick={onArcClick} />;
}

// Pulsing arc that changes opacity over time
export function PulsingArc({
  startLatLng,
  endLatLng,
  color = '#ff4444',
  pulseSpeed = 2,
  minOpacity = 0.3,
  maxOpacity = 0.9,
  arcHeight = 2,
  onClick
}) {
  const lineRef = useRef();
  
  const { geometry, material } = useMemo(() => {
    const curve = createArcCurve(startLatLng, endLatLng, arcHeight);
    const points = curve.getPoints(50);
    const arcGeometry = new THREE.BufferGeometry().setFromPoints(points);
    
    const arcMaterial = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: maxOpacity
    });
    
    return { geometry: arcGeometry, material: arcMaterial };
  }, [startLatLng, endLatLng, color, maxOpacity, arcHeight]);
  
  useFrame((state) => {
    if (lineRef.current && lineRef.current.material) {
      const time = state.clock.getElapsedTime();
      const pulse = Math.sin(time * pulseSpeed) * 0.5 + 0.5; // 0 to 1
      const opacity = minOpacity + (maxOpacity - minOpacity) * pulse;
      lineRef.current.material.opacity = opacity;
    }
  });
  
  const handleClick = (event) => {
    event.stopPropagation();
    if (onClick) {
      onClick({
        startLatLng,
        endLatLng,
        arcHeight,
        color
      });
    }
  };
  
  return (
    <line
      ref={lineRef}
      geometry={geometry}
      material={material}
      onClick={handleClick}
    />
  );
}

// Multi-segment arc for complex paths
export function MultiSegmentArc({
  waypoints = [], // Array of lat/lng objects
  color = '#ff4444',
  opacity = 0.8,
  arcHeight = 2,
  onClick
}) {
  const segments = useMemo(() => {
    if (waypoints.length < 2) return [];
    
    const arcSegments = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      arcSegments.push({
        id: `segment-${i}`,
        startLatLng: waypoints[i],
        endLatLng: waypoints[i + 1],
        color,
        opacity: opacity * (0.5 + (i / waypoints.length) * 0.5), // Fade effect
        arcHeight: arcHeight * (1 + i * 0.2) // Increasing height
      });
    }
    
    return arcSegments;
  }, [waypoints, color, opacity, arcHeight]);
  
  return <Arches arcs={segments} onArcClick={onClick} />;
}

// Arc with gradient effect (requires custom shader material)
export function GradientArc({
  startLatLng,
  endLatLng,
  startColor = '#ff0000',
  endColor = '#ffaa00',
  arcHeight = 2,
  opacity = 0.8,
  onClick
}) {
  const lineRef = useRef();
  
  const { geometry, material } = useMemo(() => {
    const curve = createArcCurve(startLatLng, endLatLng, arcHeight);
    const points = curve.getPoints(50);
    const arcGeometry = new THREE.BufferGeometry().setFromPoints(points);
    
    // Create colors array for gradient
    const colors = [];
    const startColorObj = new THREE.Color(startColor);
    const endColorObj = new THREE.Color(endColor);
    
    for (let i = 0; i <= 50; i++) {
      const t = i / 50;
      const color = startColorObj.clone().lerp(endColorObj, t);
      colors.push(color.r, color.g, color.b);
    }
    
    arcGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    const gradientMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity
    });
    
    return { geometry: arcGeometry, material: gradientMaterial };
  }, [startLatLng, endLatLng, startColor, endColor, arcHeight, opacity]);
  
  const handleClick = (event) => {
    event.stopPropagation();
    if (onClick) {
      onClick({
        startLatLng,
        endLatLng,
        startColor,
        endColor,
        arcHeight
      });
    }
  };
  
  return (
    <line
      ref={lineRef}
      geometry={geometry}
      material={material}
      onClick={handleClick}
    />
  );
}