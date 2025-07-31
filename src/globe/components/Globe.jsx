import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Globe component with layered approach
export default function Globe({ 
  rotationSpeed = 0.002,
  enableRotation = true,
  children 
}) {
  const meshRef = useRef();
  const [landGeoJson, setLandGeoJson] = useState(null);
  const [countriesGeoJson, setCountriesGeoJson] = useState(null);
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  // Load GeoJSON data
  useEffect(() => {
    Promise.all([
      fetch('/land-cleaned.json').then(res => res.json()),
      fetch('/countries-cleaned.json').then(res => res.json())
    ])
    .then(([landData, countriesData]) => {
      // Handle land data
      if (landData.type === 'GeometryCollection') {
        const featureCollection = {
          type: 'FeatureCollection',
          features: landData.geometries.map((geometry, index) => ({
            type: 'Feature',
            properties: { id: index },
            geometry
          }))
        };
        setLandGeoJson(featureCollection);
      } else {
        setLandGeoJson(landData);
      }
      
      // Handle countries data
      if (countriesData.type === 'GeometryCollection') {
        const featureCollection = {
          type: 'FeatureCollection',
          features: countriesData.geometries.map((geometry, index) => ({
            type: 'Feature',
            properties: { id: index },
            geometry
          }))
        };
        setCountriesGeoJson(featureCollection);
      } else {
        setCountriesGeoJson(countriesData);
      }
    })
    .catch(error => {
      console.error('Failed to load GeoJSON data:', error);
    });
  }, []);

  // Create land outline geometry (thick gray lines instead of filled areas)
  const landOutlineGeometry = useMemo(() => {
    if (!landGeoJson || !landGeoJson.features) return null;
    
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const radius = 5.01; // Just above ocean

    landGeoJson.features.forEach(feature => {
      const processRing = (ring) => {
        for (let i = 0; i < ring.length - 1; i++) {
          const [lng1, lat1] = ring[i];
          const [lng2, lat2] = ring[i + 1];
          
          const phi1 = (90 - lat1) * (Math.PI / 180);
          const theta1 = (lng1 + 180) * (Math.PI / 180);
          const x1 = -(radius * Math.sin(phi1) * Math.cos(theta1));
          const z1 = radius * Math.sin(phi1) * Math.sin(theta1);
          const y1 = radius * Math.cos(phi1);
          
          const phi2 = (90 - lat2) * (Math.PI / 180);
          const theta2 = (lng2 + 180) * (Math.PI / 180);
          const x2 = -(radius * Math.sin(phi2) * Math.cos(theta2));
          const z2 = radius * Math.sin(phi2) * Math.sin(theta2);
          const y2 = radius * Math.cos(phi2);
          
          vertices.push(x1, y1, z1, x2, y2, z2);
        }
      };

      if (feature.geometry.type === 'Polygon') {
        feature.geometry.coordinates.forEach(processRing);
      } else if (feature.geometry.type === 'MultiPolygon') {
        feature.geometry.coordinates.forEach(polygon => {
          polygon.forEach(processRing);
        });
      }
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geometry;
  }, [landGeoJson]);

  // Create coastline geometry (yellow outlines)
  const coastlineGeometry = useMemo(() => {
    if (!landGeoJson || !landGeoJson.features) return null;
    
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const radius = 5.02; // Above land masses

    landGeoJson.features.forEach(feature => {
      const processRing = (ring) => {
        for (let i = 0; i < ring.length - 1; i++) {
          const [lng1, lat1] = ring[i];
          const [lng2, lat2] = ring[i + 1];
          
          const phi1 = (90 - lat1) * (Math.PI / 180);
          const theta1 = (lng1 + 180) * (Math.PI / 180);
          const x1 = -(radius * Math.sin(phi1) * Math.cos(theta1));
          const z1 = radius * Math.sin(phi1) * Math.sin(theta1);
          const y1 = radius * Math.cos(phi1);
          
          const phi2 = (90 - lat2) * (Math.PI / 180);
          const theta2 = (lng2 + 180) * (Math.PI / 180);
          const x2 = -(radius * Math.sin(phi2) * Math.cos(theta2));
          const z2 = radius * Math.sin(phi2) * Math.sin(theta2);
          const y2 = radius * Math.cos(phi2);
          
          vertices.push(x1, y1, z1, x2, y2, z2);
        }
      };

      if (feature.geometry.type === 'Polygon') {
        feature.geometry.coordinates.forEach(processRing);
      } else if (feature.geometry.type === 'MultiPolygon') {
        feature.geometry.coordinates.forEach(polygon => {
          polygon.forEach(processRing);
        });
      }
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geometry;
  }, [landGeoJson]);

  // Create country border geometry (white lines)
  const countryGeometry = useMemo(() => {
    if (!countriesGeoJson || !countriesGeoJson.features) return null;
    
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const radius = 5.03; // Above coastlines

    countriesGeoJson.features.forEach(feature => {
      const processRing = (ring) => {
        for (let i = 0; i < ring.length - 1; i++) {
          const [lng1, lat1] = ring[i];
          const [lng2, lat2] = ring[i + 1];
          
          const phi1 = (90 - lat1) * (Math.PI / 180);
          const theta1 = (lng1 + 180) * (Math.PI / 180);
          const x1 = -(radius * Math.sin(phi1) * Math.cos(theta1));
          const z1 = radius * Math.sin(phi1) * Math.sin(theta1);
          const y1 = radius * Math.cos(phi1);
          
          const phi2 = (90 - lat2) * (Math.PI / 180);
          const theta2 = (lng2 + 180) * (Math.PI / 180);
          const x2 = -(radius * Math.sin(phi2) * Math.cos(theta2));
          const z2 = radius * Math.sin(phi2) * Math.sin(theta2);
          const y2 = radius * Math.cos(phi2);
          
          vertices.push(x1, y1, z1, x2, y2, z2);
        }
      };

      if (feature.geometry.type === 'Polygon') {
        feature.geometry.coordinates.forEach(processRing);
      } else if (feature.geometry.type === 'MultiPolygon') {
        feature.geometry.coordinates.forEach(polygon => {
          polygon.forEach(processRing);
        });
      }
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geometry;
  }, [countriesGeoJson]);

  // Track user interaction to pause rotation
  useEffect(() => {
    let interactionTimer;
    
    const handleInteractionStart = (event) => {
      const canvas = event.target;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const distanceFromCenter = Math.sqrt(
        Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
      );
      
      const globeRadius = Math.min(rect.width, rect.height) * 0.25;
      
      if (distanceFromCenter <= globeRadius) {
        setIsUserInteracting(true);
        clearTimeout(interactionTimer);
      }
    };
    
    const handleWheelInteraction = () => {
      setIsUserInteracting(true);
      clearTimeout(interactionTimer);
    };
    
    const handleInteractionEnd = () => {
      clearTimeout(interactionTimer);
      interactionTimer = setTimeout(() => {
        setIsUserInteracting(false);
      }, 1500);
    };
    
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('mousedown', handleInteractionStart);
      canvas.addEventListener('touchstart', handleInteractionStart);
      canvas.addEventListener('wheel', handleWheelInteraction, { passive: true });
      canvas.addEventListener('mouseup', handleInteractionEnd, { passive: true });
      canvas.addEventListener('touchend', handleInteractionEnd, { passive: true });
    }
    
    return () => {
      clearTimeout(interactionTimer);
      if (canvas) {
        canvas.removeEventListener('mousedown', handleInteractionStart);
        canvas.removeEventListener('touchstart', handleInteractionStart);
        canvas.removeEventListener('wheel', handleWheelInteraction);
        canvas.removeEventListener('mouseup', handleInteractionEnd);
        canvas.removeEventListener('touchend', handleInteractionEnd);
      }
    };
  }, []);
  
  // Globe rotation
  useFrame(() => {
    if (meshRef.current && enableRotation && !isUserInteracting) {
      meshRef.current.rotation.y += rotationSpeed;
    }
  });

  return (
    <group ref={meshRef}>
      {/* Layer 1: Ocean foundation (solid black) */}
      <mesh>
        <sphereGeometry args={[5, 64, 32]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      
      {/* Layer 2: Land outlines (thick gray lines) */}
      {landOutlineGeometry && (
        <lineSegments geometry={landOutlineGeometry}>
          <lineBasicMaterial 
            color="#444444"
            linewidth={4}
          />
        </lineSegments>
      )}
      
      {/* Layer 3: Coastline outlines (dark yellow) */}
      {coastlineGeometry && (
        <lineSegments geometry={coastlineGeometry}>
          <lineBasicMaterial 
            color="#ccaa00"
            linewidth={2}
          />
        </lineSegments>
      )}
      
      {/* Layer 4: Country borders (white) */}
      {countryGeometry && (
        <lineSegments geometry={countryGeometry}>
          <lineBasicMaterial 
            color="#ffffff"
            linewidth={1}
            transparent={true}
            opacity={0.6}
          />
        </lineSegments>
      )}
      
      {/* Children (markers, arcs, etc.) */}
      {children}
    </group>
  );
}