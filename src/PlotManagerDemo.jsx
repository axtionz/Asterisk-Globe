import React, { useState, useEffect } from 'react';
import { usePlotManager } from './PlotManager';

const EFFECTS = [
  {
    key: 'pulsing_dot',
    label: 'Pulsing Dot',
    color: '#ff4444',
    description: 'Animated point for earthquakes, storms, etc.'
  },
  {
    key: 'animated_arc',
    label: 'Animated Arc',
    color: '#00bfff',
    description: 'Curved line for connections or flows.'
  },
  {
    key: 'explosion',
    label: 'Explosion',
    color: '#ffa500',
    description: 'Expanding ring for eruptions, impacts.'
  },
  {
    key: 'glowing_border',
    label: 'Glowing Border',
    color: '#00ffff',
    description: 'Animated border for regions.'
  },
  {
    key: 'directional_arrow',
    label: 'Directional Arrow',
    color: '#ffff00',
    description: 'Arrow for movement or direction.'
  },
  {
    key: 'event_marker',
    label: 'Event Marker',
    color: '#00ff00',
    description: 'Static marker for simple events.'
  },
  {
    key: 'area_highlight',
    label: 'Area Highlight',
    color: '#ffff99',
    description: 'Polygon highlight for regions.'
  }
];

const PREVIEW_COLORS = {
  pulsing_dot: '#ff4444',
  animated_arc: '#00bfff',
  explosion: '#ffa500',
  glowing_border: '#00ffff',
  directional_arrow: '#ffff00',
  event_marker: '#00ff00',
  area_highlight: '#ffff99'
};

const KNOWN_GOOD_EVENTS = {
  pulsing_dot: {
    type: 'pulsing_dot',
    data: [{ longitude: 139.6917, latitude: 35.6895, location: 'Tokyo' }],
    options: { baseRadius: 5000, pulseIntensity: 0.3, pulseSpeed: 2, color: [255, 0, 0, 180] }
  },
  animated_arc: {
    type: 'animated_arc',
    data: [{ fromLng: -74.006, fromLat: 40.7128, toLng: 139.6917, toLat: 35.6895 }],
    options: { strokeWidth: 6, sourceColor: [255, 0, 0, 150], targetColor: [0, 255, 255, 150], animationSpeed: 2 }
  },
  explosion: {
    type: 'explosion',
    data: [{ longitude: 139.6917, latitude: 35.6895, location: 'Tokyo', iconType: 'volcano' }],
    options: { baseRadius: 15000, maxRadius: 80000, duration: 3000, color: [255, 165, 0, 180], iconType: 'volcano' }
  },
  glowing_border: {
    type: 'glowing_border',
    data: {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[ [135, 30], [145, 30], [145, 40], [135, 40], [135, 30] ]] }
      }]
    },
    options: { lineWidth: 4, baseColor: [0, 255, 255, 200], glowIntensity: 0.6, glowSpeed: 2 }
  },
  directional_arrow: {
    type: 'directional_arrow',
    data: [{ longitude: 139.6917, latitude: 35.6895, direction: 45, iconType: 'missile' }],
    options: { arrowLength: 0.8, arrowWidth: 0.15, color: [255, 255, 0, 220], height: 100000, iconType: 'missile' }
  },
  event_marker: {
    type: 'event_marker',
    data: [{ longitude: 139.6917, latitude: 35.6895, location: 'Tokyo', iconType: 'alert' }],
    options: { radius: 30000, color: [0, 255, 0, 200], strokeColor: [255, 255, 255, 255], iconType: 'alert' }
  },
  area_highlight: {
    type: 'area_highlight',
    data: {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[ [130, 25], [150, 25], [150, 45], [130, 45], [130, 25] ]] }
      }]
    },
    options: { fillColor: [255, 255, 0, 80], strokeColor: [255, 255, 0, 250], strokeWidth: 3 }
  }
};

const VISUAL_TYPES = ['dot', 'icon', 'both'];

const PlotManagerDemo = ({ onZoomTo }) => {
  const [lastAction, setLastAction] = useState('');
  const [showOnlyPlotManager, setShowOnlyPlotManager] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [activeLayers, setActiveLayers] = useState([]);
  const [layerStats, setLayerStats] = useState({});

  const {
    addLayer,
    removeLayer,
    removeLayersByType,
    getAllLayers,
    getLayerStats,
    clearAllLayers,
    processEventBatch
  } = usePlotManager();

  useEffect(() => {
    setActiveLayers(getAllLayers());
    setLayerStats(getLayerStats());
  }, [getAllLayers, getLayerStats]);

  const addEffect = (effectKey) => {
    const event = KNOWN_GOOD_EVENTS[effectKey];
    if (event) {
      const layerId = addLayer(event);
      let loc = '';
      if (event.data && event.data[0] && event.data[0].longitude !== undefined && event.data[0].latitude !== undefined) {
        loc = ` @ [${event.data[0].longitude.toFixed(2)}, ${event.data[0].latitude.toFixed(2)}]`;
      }
      setLastAction(`Added ${effectKey} (layerId: ${layerId})${loc}`);
      setActiveLayers(getAllLayers());
      setLayerStats(getLayerStats());
    }
  };

  const testAllEffects = () => {
    const batch = EFFECTS.map(e => KNOWN_GOOD_EVENTS[e.key]);
    const results = processEventBatch(batch);
    setLastAction('Tested all effects');
    setActiveLayers(getAllLayers());
    setLayerStats(getLayerStats());
  };

  const resetGlobe = () => {
    clearAllLayers();
    setLastAction('Reset globe (cleared all PlotManager layers)');
    setActiveLayers(getAllLayers());
    setLayerStats(getLayerStats());
  };

  const handleRemoveLayer = (layerId) => {
    removeLayer(layerId);
    setLastAction(`Removed layer ${layerId}`);
    setActiveLayers(getAllLayers());
    setLayerStats(getLayerStats());
  };

  const handleRemoveType = (type) => {
    removeLayersByType(type);
    setLastAction(`Removed all layers of type ${type}`);
    setActiveLayers(getAllLayers());
    setLayerStats(getLayerStats());
  };

  // Legend for effect types
  const legend = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: 8 }}>
      {EFFECTS.map(e => (
        <span key={e.key} style={{ display: 'flex', alignItems: 'center', fontSize: 12 }}>
          <span style={{ width: 16, height: 16, background: e.color, borderRadius: 8, display: 'inline-block', marginRight: 4 }} />
          {e.label}
        </span>
      ))}
    </div>
  );

  // Show warning if no layers
  const noLayersWarning = activeLayers.length === 0 ? (
    <div style={{ color: 'orange', fontWeight: 'bold', marginBottom: 8 }}>
      No PlotManager layers are currently rendered.
    </div>
  ) : null;

  // Show raw layer data
  const rawLayerData = showRaw ? (
    <pre style={{ background: '#222', color: '#fff', fontSize: 10, maxHeight: 200, overflow: 'auto' }}>
      {JSON.stringify(activeLayers, null, 2)}
    </pre>
  ) : null;

  // Helper to extract location from layer data
  const getLayerLocation = (layer) => {
    if (layer && layer.props && layer.props.data && layer.props.data[0]) {
      const d = layer.props.data[0];
      if (d.longitude !== undefined && d.latitude !== undefined) {
        return [d.longitude, d.latitude];
      }
      if (d.lng !== undefined && d.lat !== undefined) {
        return [d.lng, d.lat];
      }
    }
    return null;
  };

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      width: '420px',
      backgroundColor: 'rgba(0, 0, 0, 0.92)',
      color: 'white',
      padding: '18px',
      borderRadius: '10px',
      zIndex: 1000,
      fontFamily: 'monospace',
      fontSize: '13px',
      boxShadow: '0 2px 12px #000a'
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#0f0' }}>PlotManager Test Panel</h3>
      {legend}
      <div style={{ marginBottom: 10 }}>
        <button onClick={testAllEffects} style={{ background: '#007bff', color: '#fff', padding: '8px', border: 'none', borderRadius: 4, marginRight: 8, fontWeight: 'bold', cursor: 'pointer' }}>Test All Effects</button>
        <button onClick={resetGlobe} style={{ background: '#dc3545', color: '#fff', padding: '8px', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer' }}>Reset Globe</button>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ marginRight: 10 }}>
          <input type="checkbox" checked={showOnlyPlotManager} onChange={e => setShowOnlyPlotManager(e.target.checked)} /> Show Only PlotManager Layers
        </label>
        <button onClick={() => setShowRaw(r => !r)} style={{ background: '#444', color: '#fff', padding: '4px 8px', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>{showRaw ? 'Hide' : 'Show'} Raw Layer Data</button>
      </div>
      {noLayersWarning}
      <div style={{ marginBottom: 10 }}>
        <b>Last Action:</b> <span style={{ color: '#0ff' }}>{lastAction}</span>
      </div>
      <div style={{ marginBottom: 18 }}>
        <b>Effects:</b>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: 6 }}>
          {EFFECTS.map(e => (
            <button
              key={e.key}
              title={e.description}
              onClick={() => addEffect(e.key)}
              style={{
                background: e.color,
                color: '#000',
                padding: '8px',
                border: 'none',
                borderRadius: 4,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: 13
              }}
            >
              {e.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: '#aaa', marginTop: 8 }}>
          Click a button to add a visual effect.
        </div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <b>Active PlotManager Layers:</b>
        <div style={{ maxHeight: 120, overflowY: 'auto', marginTop: 6 }}>
          {activeLayers.length === 0 ? (
            <span style={{ color: '#888' }}>None</span>
          ) : (
            activeLayers.map((layer, idx) => {
              const loc = getLayerLocation(layer);
              return (
                <div key={layer.id || idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#222',
                  borderRadius: 4,
                  marginBottom: 4,
                  padding: '4px 8px',
                  fontSize: 12
                }}>
                  <span style={{ width: 12, height: 12, background: PREVIEW_COLORS[layer.id?.split('-')[0]] || '#fff', borderRadius: 6, display: 'inline-block', marginRight: 8 }} />
                  <span style={{ flex: 1 }}>{layer.id}
                    {loc && (
                      <span style={{ color: '#0ff', marginLeft: 8, fontSize: 11 }}>
                        [{loc[0].toFixed(2)}, {loc[1].toFixed(2)}]
                      </span>
                    )}
                  </span>
                  {loc && (
                    <button
                      onClick={() => {
                        if (onZoomTo) onZoomTo(loc[0], loc[1]);
                        else console.log('Zoom to', loc);
                      }}
                      style={{ background: '#444', color: '#fff', border: 'none', borderRadius: 3, fontSize: 11, padding: '2px 6px', marginLeft: 4, cursor: 'pointer' }}
                    >
                      Zoom to
                    </button>
                  )}
                  <button onClick={() => handleRemoveLayer(layer.id)} style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: 3, fontSize: 11, padding: '2px 6px', marginLeft: 8, cursor: 'pointer' }}>Remove</button>
                </div>
              );
            })
          )}
        </div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <b>Remove by Type:</b>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: 6 }}>
          {Object.keys(layerStats).map(type => (
            <button
              key={type}
              onClick={() => handleRemoveType(type)}
              style={{
                background: PREVIEW_COLORS[type] || '#dc3545',
                color: '#000',
                border: 'none',
                borderRadius: 4,
                fontSize: 11,
                padding: '4px 8px',
                cursor: 'pointer'
              }}
            >
              Remove {type}
            </button>
          ))}
        </div>
      </div>
      {rawLayerData}
    </div>
  );
};

export default PlotManagerDemo; 