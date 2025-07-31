import React, { Suspense, useState, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import Globe from './Globe.jsx';
import Markers from './Markers.jsx';
import Arches from './Arches.jsx';
import { geocodeLocation } from '../utils/geocoding.js';

// Loading component
function LoadingSpinner() {
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      color: 'white',
      fontSize: '18px',
      textAlign: 'center',
      zIndex: 10
    }}>
      <div>Loading 3D Globe...</div>
      <div style={{ fontSize: '14px', marginTop: '10px', opacity: 0.7 }}>
        Preparing Three.js scene
      </div>
    </div>
  );
}

// Error boundary component
class GlobeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Globe rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          textAlign: 'center',
          flexDirection: 'column'
        }}>
          <h3>3D Globe Error</h3>
          <p>Failed to render the globe: {this.state.error?.message}</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '10px 20px',
              marginTop: '10px',
              backgroundColor: '#4A90E2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main GlobeView component
export default function GlobeView({ 
  newsData = [],
  events = [],
  arcs = [],
  onEventClick,
  onArcClick,
  width = '100%',
  height = '600px',
  enableControls = true,
  enableRotation = true,
  showStars = true,
  cameraPosition = [0, 0, 15],
  style = {}
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Process news data into events and arcs
  const processedData = useMemo(() => {
    const processedEvents = [];
    const processedArcs = [];
    
    // Process existing events
    events.forEach(event => {
      if (event.latitude != null && event.longitude != null) {
        processedEvents.push({
          id: event.id || `event-${processedEvents.length}`,
          latitude: event.latitude,
          longitude: event.longitude,
          type: event.type || 'earthquake',
          magnitude: event.magnitude || 5.0,
          timestamp: event.timestamp || new Date().toISOString(),
          title: event.title || event.location,
          description: event.description || event.summary
        });
      }
    });
    
    // Process existing arcs
    arcs.forEach(arc => {
      if (arc.startLatLng && arc.endLatLng) {
        processedArcs.push({
          id: arc.id || `arc-${processedArcs.length}`,
          startLatLng: arc.startLatLng,
          endLatLng: arc.endLatLng,
          color: arc.color || '#ff4444',
          type: arc.type || 'generic',
          animated: arc.animated !== false,
          title: arc.title || `${arc.from || 'Unknown'} → ${arc.to || 'Unknown'}`
        });
      }
    });
    
    // Process news data (if provided)
    newsData.forEach(article => {
      if (article.tags) {
        // Extract geographic entities and events from news tags
        const locations = article.tags.filter(tag => tag.type === 'location' || tag.type === 'country');
        const actions = article.tags.filter(tag => tag.type === 'action' || tag.type === 'event');
        
        // Create events for single locations
        if (locations.length === 1 && actions.length > 0) {
          // This would require geocoding, which we'll handle in the parent component
          // For now, we'll just log it
          console.log('News event detected:', article.title, locations[0], actions[0]);
        }
        
        // Create arcs for actions between two locations
        if (locations.length >= 2 && actions.length > 0) {
          const action = actions[0];
          if (action.entity?.includes('send') || action.entity?.includes('attack') || action.entity?.includes('missile')) {
            // This would create an arc between the two locations
            console.log('News arc detected:', article.title, locations[0], '→', locations[1]);
          }
        }
      }
    });
    
    return {
      events: processedEvents,
      arcs: processedArcs
    };
  }, [newsData, events, arcs]);
  
  // Handle marker clicks
  const handleMarkerClick = useCallback((markerData) => {
    setSelectedEvent(markerData);
    if (onEventClick) {
      onEventClick(markerData);
    }
  }, [onEventClick]);
  
  // Handle arc clicks
  const handleArcClick = useCallback((arcData) => {
    if (onArcClick) {
      onArcClick(arcData);
    }
  }, [onArcClick]);
  
  // Handle loading state
  const handleCreated = useCallback(() => {
    setTimeout(() => setIsLoading(false), 1000); // Small delay for smooth transition
  }, []);
  
  return (
    <GlobeErrorBoundary>
      <div style={{ 
        position: 'relative', 
        width, 
        height, 
        background: '#000',
        ...style 
      }}>
        {isLoading && <LoadingSpinner />}
        
        <Canvas
          camera={{ 
            position: cameraPosition, 
            fov: 45,
            near: 0.1,
            far: 1000
          }}
          onCreated={handleCreated}
          style={{ 
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.5s ease-in-out'
          }}
        >
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight 
            position={[10, 5, 5]} 
            intensity={0.8}
            castShadow
          />
          <pointLight 
            position={[-10, -5, -5]} 
            intensity={0.3}
            color="#4A90E2"
          />
          
          {/* Background stars */}
          {showStars && (
            <Stars 
              radius={300} 
              depth={50} 
              count={1000} 
              factor={4} 
              saturation={0} 
              fade={true}
            />
          )}
          
          {/* Globe and content */}
          <Suspense fallback={null}>
            <Globe enableRotation={enableRotation}>
              <Markers 
                events={processedData.events}
                onMarkerClick={handleMarkerClick}
              />
              <Arches 
                arcs={processedData.arcs}
                onArcClick={handleArcClick}
              />
            </Globe>
          </Suspense>
          
          {/* Controls */}
          {enableControls && (
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              zoomSpeed={0.6}
              panSpeed={0.5}
              rotateSpeed={0.4}
              minDistance={8}
              maxDistance={50}
              minPolarAngle={0}
              maxPolarAngle={Math.PI}
            />
          )}
        </Canvas>
        
        {/* Event details overlay */}
        {selectedEvent && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '15px',
            borderRadius: '8px',
            maxWidth: '300px',
            fontSize: '14px',
            zIndex: 10,
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <h4 style={{ margin: 0, color: '#4A90E2' }}>
                Event Details
              </h4>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '0'
                }}
              >
                ×
              </button>
            </div>
            
            <div><strong>Type:</strong> {selectedEvent.eventType}</div>
            <div><strong>Location:</strong> {selectedEvent.latitude?.toFixed(2)}, {selectedEvent.longitude?.toFixed(2)}</div>
            {selectedEvent.magnitude && (
              <div><strong>Magnitude:</strong> {selectedEvent.magnitude}</div>
            )}
            {selectedEvent.timestamp && (
              <div><strong>Time:</strong> {new Date(selectedEvent.timestamp).toLocaleString()}</div>
            )}
            {selectedEvent.title && (
              <div style={{ marginTop: '10px' }}>
                <strong>Title:</strong> {selectedEvent.title}
              </div>
            )}
            {selectedEvent.description && (
              <div style={{ marginTop: '5px', opacity: 0.8 }}>
                {selectedEvent.description}
              </div>
            )}
          </div>
        )}
        
        {/* Stats overlay */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          background: 'rgba(0, 0, 0, 0.6)',
          color: 'white',
          padding: '10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 10,
          backdropFilter: 'blur(5px)'
        }}>
          <div>Events: {processedData.events.length}</div>
          <div>Arcs: {processedData.arcs.length}</div>
          <div>Renderer: Three.js</div>
        </div>
      </div>
    </GlobeErrorBoundary>
  );
}

// Helper function to create event from news article
export async function createEventFromNews(article) {
  try {
    // Extract location from article tags or content
    const locationTags = article.tags?.filter(tag => 
      tag.type === 'location' || tag.type === 'country' || tag.type === 'city'
    );
    
    if (!locationTags || locationTags.length === 0) {
      throw new Error('No location found in article');
    }
    
    const location = locationTags[0].entity;
    const coords = await geocodeLocation(location);
    
    // Determine event type from article content
    let eventType = 'earthquake'; // default
    const content = (article.title + ' ' + article.summary).toLowerCase();
    
    if (content.includes('earthquake') || content.includes('seismic')) {
      eventType = 'earthquake';
    } else if (content.includes('volcano') || content.includes('eruption')) {
      eventType = 'volcano';
    } else if (content.includes('storm') || content.includes('hurricane') || content.includes('typhoon')) {
      eventType = 'storm';
    } else if (content.includes('conflict') || content.includes('war') || content.includes('attack')) {
      eventType = 'conflict';
    } else if (content.includes('trade') || content.includes('economic')) {
      eventType = 'trade';
    } else if (content.includes('political') || content.includes('election')) {
      eventType = 'political';
    }
    
    return {
      id: article.articleId || `news-${Date.now()}`,
      latitude: coords.latitude,
      longitude: coords.longitude,
      type: eventType,
      magnitude: 5.0, // default magnitude
      timestamp: new Date().toISOString(),
      title: article.title,
      description: article.summary,
      source: 'news',
      originalArticle: article
    };
  } catch (error) {
    console.error('Failed to create event from news:', error);
    return null;
  }
}

// Helper function to create arc from news article
export async function createArcFromNews(article) {
  try {
    const locationTags = article.tags?.filter(tag => 
      tag.type === 'location' || tag.type === 'country'
    );
    
    if (!locationTags || locationTags.length < 2) {
      throw new Error('Need at least two locations for arc');
    }
    
    const [startCoords, endCoords] = await Promise.all([
      geocodeLocation(locationTags[0].entity),
      geocodeLocation(locationTags[1].entity)
    ]);
    
    // Determine arc type and color from content
    const content = (article.title + ' ' + article.summary).toLowerCase();
    let arcType = 'generic';
    let color = '#4488ff';
    
    if (content.includes('missile') || content.includes('rocket') || content.includes('attack')) {
      arcType = 'missile';
      color = '#ff0000';
    } else if (content.includes('trade') || content.includes('export') || content.includes('import')) {
      arcType = 'trade';
      color = '#00ff88';
    } else if (content.includes('flight') || content.includes('travel')) {
      arcType = 'flight';
      color = '#4488ff';
    }
    
    return {
      id: `news-arc-${Date.now()}`,
      startLatLng: {
        lat: startCoords.latitude,
        lng: startCoords.longitude
      },
      endLatLng: {
        lat: endCoords.latitude,
        lng: endCoords.longitude
      },
      color,
      type: arcType,
      animated: true,
      title: article.title,
      from: locationTags[0].entity,
      to: locationTags[1].entity,
      source: 'news',
      originalArticle: article
    };
  } catch (error) {
    console.error('Failed to create arc from news:', error);
    return null;
  }
}