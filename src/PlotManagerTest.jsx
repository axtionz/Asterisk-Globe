import React, { useEffect } from 'react';
import { usePlotManager } from './PlotManager';

const PlotManagerTest = () => {
  const { addLayer, getAllLayers, getLayerStats } = usePlotManager();

  useEffect(() => {
    // Test adding different types of layers
    console.log('Testing PlotManager...');

    // Test 1: Pulsing dot
    const pulsingDotId = addLayer({
      type: 'pulsing_dot',
      data: [{ longitude: 139.6917, latitude: 35.6895, location: 'Tokyo' }],
      options: {
        baseRadius: 8000,
        pulseIntensity: 0.4,
        pulseSpeed: 1.5,
        color: [255, 0, 0, 180]
      }
    });
    console.log('Added pulsing dot:', pulsingDotId);

    // Test 2: Explosion effect
    const explosionId = addLayer({
      type: 'explosion',
      data: [{ longitude: -74.006, latitude: 40.7128, location: 'New York' }],
      options: {
        baseRadius: 15000,
        maxRadius: 80000,
        duration: 3000,
        color: [255, 165, 0, 180]
      }
    });
    console.log('Added explosion:', explosionId);

    // Test 3: Directional arrow
    const arrowId = addLayer({
      type: 'directional_arrow',
      data: [{ longitude: 2.3522, latitude: 48.8566, direction: 90, location: 'Paris' }],
      options: {
        arrowLength: 0.8,
        arrowWidth: 0.15,
        color: [255, 255, 0, 220],
        height: 100000
      }
    });
    console.log('Added directional arrow:', arrowId);

    // Test 4: Area highlight
    const areaId = addLayer({
      type: 'area_highlight',
      data: {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [130, 25], [150, 25], [150, 45], [130, 45], [130, 25]
            ]]
          }
        }]
      },
      options: {
        fillColor: [255, 255, 0, 80],
        strokeColor: [255, 255, 0, 250],
        strokeWidth: 3
      }
    });
    console.log('Added area highlight:', areaId);

    // Check layer stats
    const stats = getLayerStats();
    console.log('Layer stats:', stats);

    const allLayers = getAllLayers();
    console.log('Total layers:', allLayers.length);

    // Cleanup after 10 seconds
    const timer = setTimeout(() => {
      console.log('Test completed successfully!');
    }, 10000);

    return () => clearTimeout(timer);
  }, [addLayer, getAllLayers, getLayerStats]);

  return null; // This component doesn't render anything
};

export default PlotManagerTest; 