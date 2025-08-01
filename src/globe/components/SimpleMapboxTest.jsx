import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';

// Simple Mapbox test component to verify token and basic functionality
export default function SimpleMapboxTest() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('🧪 SimpleMapboxTest starting...');
    
    // Check token
    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    console.log('🔑 Token check:', {
      exists: !!token,
      length: token?.length,
      starts_with: token?.substring(0, 10)
    });

    if (!token) {
      setError('No Mapbox token found');
      return;
    }

    mapboxgl.accessToken = token;
    setStatus('Token set, creating map...');

    if (map.current || !mapContainer.current) return;

    try {
      // Create the simplest possible map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12', // Simple streets style
        center: [-74.5, 40],
        zoom: 9
      });

      map.current.on('load', () => {
        console.log('✅ Simple map loaded successfully!');
        setStatus('Map loaded successfully!');
      });

      map.current.on('error', (e) => {
        console.error('❌ Map error:', e);
        setError(`Map error: ${e.error?.message || 'Unknown error'}`);
      });

    } catch (err) {
      console.error('💥 Initialization error:', err);
      setError(`Initialization error: ${err.message}`);
    }

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  if (error) {
    return (
      <div style={{
        padding: '20px',
        background: '#ff6b6b',
        color: 'white',
        borderRadius: '8px',
        margin: '20px'
      }}>
        <h3>Mapbox Test Failed</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ margin: '20px' }}>
      <h3>Simple Mapbox Test</h3>
      <p>Status: {status}</p>
      <div 
        ref={mapContainer}
        style={{
          width: '100%',
          height: '400px',
          border: '1px solid #ccc',
          borderRadius: '8px'
        }}
      />
    </div>
  );
}