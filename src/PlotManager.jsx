import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  ScatterplotLayer, 
  GeoJsonLayer, 
  ArcLayer, 
  PolygonLayer,
  LineLayer,
  IconLayer
} from '@deck.gl/layers';
import { geoDistance } from 'd3-geo';

// Animation utilities
const createPulseAnimation = (baseRadius, pulseIntensity = 0.3, pulseSpeed = 2) => {
  return (timestamp) => {
    const pulse = Math.sin(timestamp * 0.001 * pulseSpeed) * pulseIntensity + 1;
    return baseRadius * pulse;
  };
};

const createGlowAnimation = (baseOpacity, glowIntensity = 0.5, glowSpeed = 1.5) => {
  return (timestamp) => {
    const glow = Math.sin(timestamp * 0.001 * glowSpeed) * glowIntensity + glowIntensity;
    return Math.min(1, baseOpacity + glow);
  };
};

const createExplosionAnimation = (baseRadius, maxRadius, duration = 2000) => {
  return (timestamp) => {
    const elapsed = timestamp % duration;
    const progress = elapsed / duration;
    const easeOut = 1 - Math.pow(1 - progress, 3);
    return baseRadius + (maxRadius - baseRadius) * easeOut;
  };
};

// Utility: Validate a polygon's coordinates
const isValidPolygon = coords =>
  Array.isArray(coords) &&
  coords.length > 2 &&
  Array.isArray(coords[0]) &&
  coords[0].length === 2 &&
  coords[0][0] !== undefined &&
  coords[0][1] !== undefined;

// Utility: Validate GeoJSON FeatureCollection
const isValidFeatureCollection = data =>
  data &&
  data.type === 'FeatureCollection' &&
  Array.isArray(data.features) &&
  data.features.length > 0;

// Known-good fallback polygon (rectangle over Japan)
const fallbackPolygon = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [135, 30], [145, 30], [145, 40], [135, 40], [135, 30]
        ]]
      }
    }
  ]
};

// Default icon atlas and mapping
const iconAtlas = '/icons/icon-atlas.png'; // You should provide this PNG in your public/icons folder
const iconMapping = {
  earthquake: { x: 0, y: 0, width: 64, height: 64, mask: true },
  missile:    { x: 64, y: 0, width: 64, height: 64, mask: true },
  alert:      { x: 128, y: 0, width: 64, height: 64, mask: true },
  volcano:    { x: 192, y: 0, width: 64, height: 64, mask: true },
  // Add more as needed
};

// Layer generators for different visual effects
class LayerGenerators {
  // Pulsing dot effect
  static createPulsingDotLayer(id, data, options = {}) {
    const {
      baseRadius = 10000,
      pulseIntensity = 0.3,
      pulseSpeed = 2,
      color = [255, 0, 0, 180],
      strokeColor = [255, 255, 255, 255],
      strokeWidth = 1,
      height = 50000,
      pickable = true
    } = options;
    return new ScatterplotLayer({
      id: `pulsing-dot-${id}`,
      data,
      getPosition: d => [d.longitude || d.lng || 0, d.latitude || d.lat || 0, height],
      getRadius: ({timestamp}) => baseRadius * (1 + pulseIntensity * Math.sin((timestamp || 0) * 0.002 * pulseSpeed)),
      getFillColor: color,
      stroked: true,
      getLineColor: strokeColor,
      lineWidthMinPixels: strokeWidth,
      pickable,
      opacity: 1,
      filled: true,
      updateTriggers: {
        getRadius: [pulseIntensity, pulseSpeed]
      }
    });
  }

  // Arc effect
  static createArcLayer(id, data, options = {}) {
    const {
      strokeWidth = 4,
      sourceColor = [255, 0, 0, 120],
      targetColor = [255, 140, 0, 120],
      opacity = 0.7,
      pickable = true
    } = options;
    return new ArcLayer({
      id: `arc-${id}`,
      data,
      getSourcePosition: d => [d.fromLng || d.from.lng, d.fromLat || d.from.lat],
      getTargetPosition: d => [d.toLng || d.to.lng, d.toLat || d.to.lat],
      getSourceColor: sourceColor,
      getTargetColor: targetColor,
      strokeWidth,
      pickable,
      greatCircle: true,
      opacity
    });
  }
}

// Main PlotManager class
class PlotManager {
  constructor() {
    this.layers = new Map();
    this.layerCounter = 0;
    this.animationFrameId = null;
    this.lastTimestamp = 0;
    this.timestamp = 0;
  }

  // Generate a unique layer ID
  generateLayerId(type) {
    return `${type}-${++this.layerCounter}`;
  }

  // Add a new layer based on event instruction
  addLayer(eventInstruction) {
    const {
      type,
      data,
      options = {},
      id = null,
      visualType = 'dot' // Only 'dot' supported now
    } = eventInstruction;

    const layerId = id || this.generateLayerId(type);
    let layer;

    // Only support dot
    switch (type) {
      case 'pulsing_dot':
        layer = LayerGenerators.createPulsingDotLayer(layerId, data, options);
        break;
      case 'animated_arc':
        layer = LayerGenerators.createArcLayer(layerId, data, options);
        break;
      case 'explosion':
        layer = LayerGenerators.createExplosionLayer(layerId, data, options);
        break;
      case 'glowing_border':
        layer = LayerGenerators.createGlowingBorderLayer(layerId, data, options);
        break;
      case 'directional_arrow':
        layer = LayerGenerators.createDirectionalArrowLayer(layerId, data, options);
        break;
      case 'event_marker':
        layer = LayerGenerators.createEventMarkerLayer(layerId, data, options);
        break;
      case 'area_highlight':
        layer = LayerGenerators.createAreaHighlightLayer(layerId, data, options);
        break;
      default:
        console.warn(`Unknown layer type: ${type}`);
        return null;
    }

    this.layers.set(layerId, {
      layer,
      type,
      data,
      options,
      createdAt: Date.now()
    });

    return layerId;
  }

  // Remove a layer by ID
  removeLayer(layerId) {
    return this.layers.delete(layerId);
  }

  // Remove all layers of a specific type
  removeLayersByType(type) {
    const toRemove = [];
    for (const [id, layerInfo] of this.layers) {
      if (layerInfo.type === type) {
        toRemove.push(id);
      }
    }
    toRemove.forEach(id => this.layers.delete(id));
    return toRemove.length;
  }

  // Update layer data
  updateLayerData(layerId, newData) {
    const layerInfo = this.layers.get(layerId);
    if (layerInfo) {
      layerInfo.data = newData;
      layerInfo.layer.setProps({ data: newData });
      return true;
    }
    return false;
  }

  // Update layer options
  updateLayerOptions(layerId, newOptions) {
    const layerInfo = this.layers.get(layerId);
    if (layerInfo) {
      layerInfo.options = { ...layerInfo.options, ...newOptions };
      // Recreate layer with new options
      const newLayer = this.addLayer({
        type: layerInfo.type,
        data: layerInfo.data,
        options: layerInfo.options,
        id: layerId
      });
      return true;
    }
    return false;
  }

  // Get all layers as an array
  getAllLayers() {
    return Array.from(this.layers.values()).map(info => info.layer);
  }

  // Get layer info by ID
  getLayerInfo(layerId) {
    return this.layers.get(layerId);
  }

  // Get layers by type
  getLayersByType(type) {
    return Array.from(this.layers.values())
      .filter(info => info.type === type)
      .map(info => info.layer);
  }

  // Clear all layers
  clearAllLayers() {
    this.layers.clear();
  }

  // Get layer statistics
  getLayerStats() {
    const stats = {};
    for (const layerInfo of this.layers.values()) {
      stats[layerInfo.type] = (stats[layerInfo.type] || 0) + 1;
    }
    return stats;
  }

  // Process a batch of event instructions
  processEventBatch(instructions) {
    const results = [];
    
    for (const instruction of instructions) {
      try {
        const layerId = this.addLayer(instruction);
        if (layerId) {
          results.push({ success: true, layerId, instruction });
        } else {
          results.push({ success: false, error: 'Failed to create layer', instruction });
        }
      } catch (error) {
        results.push({ success: false, error: error.message, instruction });
      }
    }
    
    return results;
  }

  // Start animation loop for layers that need it
  startAnimation() {
    if (this.animationFrameId) return;
    
    const animate = (timestamp) => {
      this.lastTimestamp = timestamp;
      this.timestamp = timestamp;
      // Update all IconLayers with new timestamp
      for (const { layer } of this.layers.values()) {
        if (layer && typeof layer.setProps === 'function') {
          layer.setProps({ timestamp });
        }
      }
      this.animationFrameId = requestAnimationFrame(animate);
    };
    
    this.animationFrameId = requestAnimationFrame(animate);
  }

  // Stop animation loop
  stopAnimation() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // Cleanup
  destroy() {
    this.stopAnimation();
    this.clearAllLayers();
  }
}

let globalPlotManager = null;

export const usePlotManager = () => {
  const plotManagerRef = useRef();

  if (!plotManagerRef.current) {
    if (!globalPlotManager) {
      globalPlotManager = new PlotManager();
      globalPlotManager.startAnimation();
    }
    plotManagerRef.current = globalPlotManager;
  }

  const addLayer = useCallback((eventInstruction) => {
    return plotManagerRef.current?.addLayer(eventInstruction);
  }, []);

  const removeLayer = useCallback((layerId) => {
    return plotManagerRef.current?.removeLayer(layerId);
  }, []);

  const removeLayersByType = useCallback((type) => {
    return plotManagerRef.current?.removeLayersByType(type);
  }, []);

  const updateLayerData = useCallback((layerId, newData) => {
    return plotManagerRef.current?.updateLayerData(layerId, newData);
  }, []);

  const updateLayerOptions = useCallback((layerId, newOptions) => {
    return plotManagerRef.current?.updateLayerOptions(layerId, newOptions);
  }, []);

  const getAllLayers = useCallback(() => {
    return plotManagerRef.current?.getAllLayers() || [];
  }, []);

  const getLayerInfo = useCallback((layerId) => {
    return plotManagerRef.current?.getLayerInfo(layerId);
  }, []);

  const getLayersByType = useCallback((type) => {
    return plotManagerRef.current?.getLayersByType(type) || [];
  }, []);

  const clearAllLayers = useCallback(() => {
    plotManagerRef.current?.clearAllLayers();
  }, []);

  const getLayerStats = useCallback(() => {
    return plotManagerRef.current?.getLayerStats() || {};
  }, []);

  const processEventBatch = useCallback((instructions) => {
    return plotManagerRef.current?.processEventBatch(instructions) || [];
  }, []);

  return {
    addLayer,
    removeLayer,
    removeLayersByType,
    updateLayerData,
    updateLayerOptions,
    getAllLayers,
    getLayerInfo,
    getLayersByType,
    clearAllLayers,
    getLayerStats,
    processEventBatch
  };
};

// Export the PlotManager class and LayerGenerators for direct use
export { PlotManager, LayerGenerators }; 