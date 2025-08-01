import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';

// MapboxGlobe component with realistic terrain and satellite imagery
const MapboxGlobe = React.forwardRef(({ 
  events = [], 
  arcEvents = [], 
  onMarkerClick,
  onArcClick,
  onZoomChange,
  enableRotation = true,
  rotationSpeed = 0.002 
}, ref) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [loadingStage, setLoadingStage] = useState('Initializing...');
  const [markers, setMarkers] = useState([]);
  const loadingTimeout = useRef(null);

  // Initialize Mapbox with token from environment
  useEffect(() => {
    console.log('🚀 MapboxGlobe useEffect triggered');
    setLoadingStage('Reading environment variables...');
    
    // Set the access token
    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    console.log('🔑 Environment variables:', import.meta.env);
    console.log('🔑 Mapbox token length:', token?.length || 0);
    console.log('🔑 Mapbox token first 10 chars:', token?.substring(0, 10) || 'undefined');
    console.log('🔑 Mapbox token exists:', !!token);
    
    if (!token) {
      console.error('❌ No Mapbox token found');
      setError('Mapbox access token not found. Please check your .env file contains VITE_MAPBOX_ACCESS_TOKEN');
      return;
    }

    console.log('✅ Token found, setting mapboxgl.accessToken');
    mapboxgl.accessToken = token;

    if (map.current) {
      console.log('⚠️ Map already exists, skipping initialization');
      return;
    }
    
    if (!mapContainer.current) {
      console.error('❌ Map container ref not found');
      setError('Map container not found');
      return;
    }

    console.log('📦 Map container found:', mapContainer.current);
    setLoadingStage('Creating Mapbox map instance...');

    // Set loading timeout
    loadingTimeout.current = setTimeout(() => {
      console.error('⏰ Loading timeout after 15 seconds');
      setError('Map loading timed out. This could be due to network issues or invalid token.');
    }, 15000);

    try {
      console.log('🗺️ Creating Mapbox map instance...');
      setLoadingStage('Creating map with satellite style...');
      
      // Start with a simpler configuration first
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-v9',
        zoom: 2,
        center: [0, 0],
        pitch: 0,
        bearing: 0,
        antialias: true
      });

      console.log('✅ Map instance created');

      // Add comprehensive error handling
      map.current.on('error', (e) => {
        console.error('❌ Mapbox error:', e.error);
        clearTimeout(loadingTimeout.current);
        setError(`Mapbox error: ${e.error.message || 'Unknown error'}`);
      });

      // Track style loading
      map.current.on('styledata', () => {
        console.log('🎨 Map style loaded');
        setLoadingStage('Map style loaded, preparing 3D features...');
      });

      // Track source loading
      map.current.on('sourcedata', (e) => {
        if (e.isSourceLoaded) {
          console.log('📊 Source loaded:', e.sourceId);
        }
      });

      // Main load event
      map.current.on('load', () => {
        console.log('🎉 Mapbox map loaded successfully');
        console.log('🎨 Current style:', map.current.getStyle());
        clearTimeout(loadingTimeout.current);
        setLoadingStage('Adding 3D terrain and atmosphere...');
        
        try {
          // Try to set globe projection
          console.log('🌍 Setting globe projection...');
          map.current.setProjection('globe');
          
          // Add Mapbox Terrain-RGB source for 3D terrain
          console.log('🏔️ Adding terrain source...');
          map.current.addSource('mapbox-dem', {
            'type': 'raster-dem',
            'url': 'mapbox://mapbox.terrain-rgb',
            'tileSize': 512,
            'maxzoom': 14
          });

          // Set terrain with exaggeration for dramatic 3D effect
          console.log('⛰️ Setting terrain...');
          map.current.setTerrain({
            'source': 'mapbox-dem',
            'exaggeration': 1.5
          });

          // Add fog effects with built-in stars - black space, no aura
          console.log('🌫️ Adding fog effects with vanilla Mapbox stars...');
          map.current.setFog({
            'range': [0.8, 8],
            'color': 'rgba(0, 0, 0, 0)',  // No fog color/aura
            'horizon-blend': 0.02,
            'high-color': 'rgba(0, 0, 0, 0)',  // No high color aura
            'space-color': 'rgba(0, 0, 0, 1)',  // Pure black space
            'star-intensity': 0.6  // Enable Mapbox's beautiful built-in stars
          });

          // Add natural sun lighting matching reference image
          console.log('☀️ Adding natural sun lighting system...');
          map.current.addLayer({
            'id': 'sky-with-sun',
            'type': 'sky',
            'paint': {
              'sky-type': 'atmosphere',
              'sky-atmosphere-sun': [45.0, 40.0], // Fixed sun position like reference
              'sky-atmosphere-sun-intensity': 10, // Moderate intensity for natural look
              'sky-atmosphere-color': 'rgba(0, 0, 0, 0)', // Keep space black
              'sky-atmosphere-halo-color': 'rgba(255, 245, 230, 0.12)', // Subtle warm sun halo
              'sky-opacity': 0.25 // Slightly more visible for natural atmospheric effect
            }
          });

          // Skip atmosphere layer to avoid aura effects
          console.log('🌌 Skipping atmosphere layer for clean black space...');

          // Add navigation controls
          console.log('🧭 Adding navigation controls...');
          map.current.addControl(new mapboxgl.NavigationControl({
            visualizePitch: true
          }), 'top-right');

          console.log('✅ All features added successfully');
          setIsLoaded(true);
          setLoadingStage('Complete!');

          // Setup dynamic lighting system
          setupDynamicLighting();

          // Add geopolitical borders and labels
          setupGeopoliticalLayers();

          // Start auto-rotation if enabled
          if (enableRotation) {
            console.log('🔄 Starting auto-rotation...');
            startAutoRotation();
          }
          
        } catch (terrainError) {
          console.error('⚠️ Error adding 3D features:', terrainError);
          console.log('📍 Falling back to basic map...');
          setIsLoaded(true); // Still show the basic map
          setLoadingStage('Loaded (basic mode)');
        }
      });

      // Track render events and zoom changes
      map.current.on('render', () => {
        console.log('🎨 Map render event');
      });
      
      // Track zoom changes for dev panel
      map.current.on('zoom', () => {
        if (onZoomChange) {
          const currentZoom = map.current.getZoom();
          onZoomChange(currentZoom);
        }
      });

    } catch (initError) {
      console.error('💥 Error initializing Mapbox:', initError);
      clearTimeout(loadingTimeout.current);
      setError(`Failed to initialize map: ${initError.message}`);
    }

    return () => {
      console.log('🧹 Cleaning up MapboxGlobe...');
      if (loadingTimeout.current) {
        clearTimeout(loadingTimeout.current);
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Setup geopolitical borders and labels
  const setupGeopoliticalLayers = () => {
    console.log('🗺️ Setting up geopolitical borders and labels...');
    
    try {
      // Add country borders using original Mapbox data (works with basic plan)
      map.current.addLayer({
        'id': 'country-borders',
        'type': 'line',
        'source': {
          'type': 'vector',
          'url': 'mapbox://mapbox.country-boundaries-v1'
        },
        'source-layer': 'country_boundaries',
        'paint': {
          'line-color': 'rgba(255, 255, 255, 0.6)',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0.5,  // Thin lines when zoomed out
            4, 1.0,  // Medium lines at medium zoom
            8, 1.5   // Thicker lines when zoomed in
          ],
          'line-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0.6,  // More transparent when zoomed out
            4, 0.8,  // More opaque at medium zoom
            8, 0.9   // Most opaque when zoomed in
          ]
        }
      });

      // Add country labels using original Mapbox place labels
      map.current.addLayer({
        'id': 'country-labels',
        'type': 'symbol',
        'source': {
          'type': 'vector',
          'url': 'mapbox://mapbox.mapbox-streets-v8'
        },
        'source-layer': 'place_label',
        'filter': [
          'any',
          ['==', ['get', 'type'], 'country'], // Standard country type
          ['==', ['get', 'class'], 'country'], // Alternative property name
          ['in', ['get', 'name_en'], ['literal', ['United States', 'United States of America', 'USA']]], // Explicit US inclusion
          ['in', ['get', 'name'], ['literal', ['United States', 'United States of America', 'USA']]] // Backup name property
        ], // Enhanced filter to ensure US and all countries show
        'layout': {
          'text-field': [
            'coalesce',
            ['get', 'name_en'], // Primary English name
            ['get', 'name'], // Fallback to default name
            ['get', 'name:en'], // Alternative English name property
            'Unknown' // Final fallback
          ], // Enhanced name resolution for all countries including US
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'], // Available Mapbox fonts
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            2, 11,   // Start showing at zoom 2
            4, 13,   // Medium text at medium zoom
            6, 16,   // Larger text when closer
            8, 18    // Large text when very close
          ],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.15, // Monospace-like appearance
          'text-offset': [0, 0],
          'text-anchor': 'center',
          'text-max-width': 10, // Allow text wrapping
          'text-allow-overlap': false, // Prevent overlap
          'text-ignore-placement': false, // Respect collision detection
          'symbol-placement': 'point',
          'text-rotation-alignment': 'viewport', // Keep text readable
          'text-pitch-alignment': 'viewport' // Keep text flat on screen
        },
        'paint': {
          'text-color': 'rgba(255, 255, 255, 0.95)',
          'text-halo-color': 'rgba(0, 0, 0, 0.9)',
          'text-halo-width': 2,
          'text-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0,     // Hidden when very far out
            1.9, 0,   // Still hidden just before zoom 2
            2.0, 1.0, // Fully visible at exactly zoom 2.0
            4.5, 1.0, // Stay visible until states are well established
            5, 0.8,   // Start fading when states are fully visible
            6, 0.5    // Reduced visibility at high zoom but still present
          ]
        }
      });

      // Add disputed territories layer (different styling)
      map.current.addLayer({
        'id': 'disputed-borders',
        'type': 'line',
        'source': {
          'type': 'vector',
          'url': 'mapbox://mapbox.country-boundaries-v1'
        },
        'source-layer': 'country_boundaries',
        'filter': ['==', ['get', 'disputed'], 'true'],
        'paint': {
          'line-color': 'rgba(255, 255, 0, 0.7)',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0.5,
            4, 1.0,
            8, 1.5
          ],
          'line-dasharray': [2, 2], // Dashed line for disputed territories
          'line-opacity': 0.8
        }
      });

      // Try to add US states data from reliable public source
      try {
        map.current.addSource('us-states', {
          'type': 'geojson',
          'data': 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json'
        });

        // Add state/province borders that appear at zoom 4+
        map.current.addLayer({
        'id': 'state-province-borders',
        'type': 'line',
        'source': 'us-states',
        'paint': {
          'line-color': 'rgba(255, 255, 255, 0.65)', // More visible than before
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            3.8, 0.6,  // Thicker lines when they first appear
            6, 1.0,    // Medium-thick lines at medium zoom
            8, 1.4     // Even thicker lines when zoomed in
          ],
          'line-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0,      // Hidden when far out
            3.7, 0,    // Still hidden
            3.8, 0.75, // Start appearing at zoom 3.8 with good visibility
            4.5, 0.9,  // Very visible at zoom 4.5
            8, 1.0     // Fully visible when zoomed in
          ]
        }
      });

      // Add state/province labels that appear at zoom 3.8+ with strict single label enforcement
      map.current.addLayer({
        'id': 'state-province-labels',
        'type': 'symbol',
        'source': 'us-states',
        'layout': {
          'text-field': [
            'coalesce',
            ['get', 'NAME'],
            ['get', 'name'], 
            ['get', 'Name'],
            'State'
          ], // Try multiple property names with fallback
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'], // Same font as countries
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            3.8, 10,   // Start with readable text when they first appear
            6, 12,     // Medium text at medium zoom
            8, 15      // Larger text when zoomed in
          ],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.15, // Same spacing as countries for consistency
          'text-offset': [0, 0],
          'text-anchor': 'center',
          'text-max-width': 10, // Allow text wrapping like countries
          'text-allow-overlap': false, // Strict no overlap - prevents multiple labels
          'text-ignore-placement': false, // Use collision detection to enforce single labels
          'symbol-placement': 'point', // Fixed point placement - anchored to geometry centroid
          'symbol-spacing': [
            'interpolate',
            ['linear'],
            ['zoom'],
            3.8, 250,   // Moderate initial spacing - allow labels to show
            5.0, 300,   // Small increase to zoom 5
            5.5, 320,   // Gentle increase mid-way
            6.0, 340,   // Small increase at zoom 6 - maintain visibility
            7, 400,     // Moderate increase at zoom 7
            8, 500      // Controlled spacing at high zoom
          ],
          'text-padding': [
            'interpolate',
            ['linear'],
            ['zoom'],
            3.8, 8,     // Minimal initial padding - allow labels to appear
            5.0, 10,    // Very small increase to zoom 5
            5.5, 11,    // Tiny increase mid-way
            6.0, 12,    // Small increase at zoom 6 - keep labels visible
            7, 15,      // Moderate increase at zoom 7
            8, 20       // Reasonable padding at high zoom
          ],
          'text-rotation-alignment': 'viewport', // Keep text readable like countries
          'text-pitch-alignment': 'viewport', // Keep text flat on screen like countries
          'text-optional': false, // Ensure labels are placed - prioritize visibility
          'text-justify': 'center', // Center justify the text
          'symbol-sort-key': 1, // Fixed sort key for consistent placement
          'symbol-avoid-edges': true, // Prevent labels near tile edges which can cause duplicates
          'icon-allow-overlap': false, // Ensure no icon overlap
          'text-variable-anchor': ['center'], // Force center anchoring only
          'text-radial-offset': 0, // No radial offset - keep centered
          'symbol-z-order': 'source' // Use source order for consistent placement
        },
        'paint': {
          'text-color': 'rgba(255, 255, 255, 0.9)', // Same as countries for consistency
          'text-halo-color': 'rgba(0, 0, 0, 0.9)', // Same strong halo as countries
          'text-halo-width': 2, // Same halo width as countries
          'text-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0,      // Hidden when far out
            3.7, 0,    // Still hidden
            3.8, 0.9,  // Strong visibility immediately at zoom 3.8
            4.0, 1.0,  // Fully visible at zoom 4.0
            5.0, 1.0,  // Stay fully visible through zoom 5
            6.0, 1.0,  // Maintain full visibility at zoom 6
            8.0, 1.0,  // Stay fully visible when zoomed in
            9.0, 0.3,  // Start fading at zoom 9.0
            10, 0      // Completely hidden at zoom 10+
          ]
        }
      });

      console.log('✅ US state borders and labels added successfully');
      console.log('📍 State labels should appear at zoom 3.8+');
      
      } catch (stateError) {
        console.error('⚠️ Error adding US states:', stateError);
        console.log('📍 Continuing without state boundaries...');
      }

      // Add dedicated US country label to ensure it shows at zoom 2.0 like other countries
      map.current.addLayer({
        'id': 'us-country-label-dedicated',
        'type': 'symbol',
        'source': {
          'type': 'geojson',
          'data': {
            'type': 'FeatureCollection',
            'features': [{
              'type': 'Feature',
              'properties': {
                'name': 'UNITED STATES',
                'name_en': 'UNITED STATES'
              },
              'geometry': {
                'type': 'Point',
                'coordinates': [-98.5795, 39.8283] // Geographic center of US
              }
            }]
          }
        },
        'layout': {
          'text-field': 'UNITED STATES',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            2, 11,   // Same as other countries - start showing at zoom 2
            4, 13,   // Medium text at medium zoom
            6, 16,   // Larger text when closer
            8, 18    // Large text when very close
          ],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.15,
          'text-offset': [0, 0],
          'text-anchor': 'center',
          'text-max-width': 10,
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          'symbol-placement': 'point',
          'text-rotation-alignment': 'viewport',
          'text-pitch-alignment': 'viewport'
        },
        'paint': {
          'text-color': 'rgba(255, 255, 255, 0.95)',
          'text-halo-color': 'rgba(0, 0, 0, 0.9)',
          'text-halo-width': 2,
          'text-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0,     // Hidden when very far out
            1.9, 0,   // Still hidden just before zoom 2
            2.0, 1.0, // Fully visible at exactly zoom 2.0 - SAME AS OTHER COUNTRIES
            4.5, 1.0, // Stay visible until states are well established
            5, 0.8,   // Start fading when states are fully visible
            6, 0.5    // Reduced visibility at high zoom but still present
          ]
        }
      });

      console.log('✅ Dedicated US country label added - should show at zoom 2.0');
      console.log('✅ Geopolitical layers added successfully');
      
    } catch (geoError) {
      console.error('⚠️ Error setting up geopolitical layers:', geoError);
      
      // Fallback: Try using a simpler approach with built-in admin boundaries
      try {
        console.log('🔄 Trying fallback geopolitical data...');
        
        // Fallback: Use original Mapbox admin boundaries
        map.current.addLayer({
          'id': 'admin-0-boundary',
          'type': 'line',
          'source': {
            'type': 'vector',
            'url': 'mapbox://mapbox.boundaries-adm0-v3'
          },
          'source-layer': 'boundaries_admin_0',
          'paint': {
            'line-color': 'rgba(255, 255, 255, 0.6)',
            'line-width': 1
          }
        });

        // Fallback: Try using original Mapbox place labels for single country labels
        map.current.addLayer({
          'id': 'admin-0-labels',
          'type': 'symbol',
          'source': {
            'type': 'vector',
            'url': 'mapbox://mapbox.mapbox-streets-v8'
          },
          'source-layer': 'place_label',
          'filter': [
            'any',
            ['==', ['get', 'type'], 'country'], // Standard country type
            ['==', ['get', 'class'], 'country'], // Alternative property name
            ['in', ['get', 'name_en'], ['literal', ['United States', 'United States of America', 'USA']]], // Explicit US inclusion
            ['in', ['get', 'name'], ['literal', ['United States', 'United States of America', 'USA']]] // Backup name property
          ], // Enhanced filter to ensure US and all countries show
          'layout': {
            'text-field': [
              'coalesce',
              ['get', 'name_en'], // Primary English name
              ['get', 'name'], // Fallback to default name
              ['get', 'name:en'], // Alternative English name property
              'Unknown' // Final fallback
            ], // Enhanced name resolution for all countries including US
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
            'text-size': [
              'interpolate',
              ['linear'],
              ['zoom'],
              2, 11,
              4, 14,
              6, 16
            ],
            'text-transform': 'uppercase',
            'text-letter-spacing': 0.15,
            'text-allow-overlap': false,
            'text-rotation-alignment': 'viewport',
            'text-pitch-alignment': 'viewport'
          },
          'paint': {
            'text-color': 'white',
            'text-halo-color': 'black',
            'text-halo-width': 2,
            'text-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 0,     // Hidden when very far out
              1.9, 0,   // Still hidden just before zoom 2
              2.0, 1.0, // Fully visible at exactly zoom 2.0
              4.5, 1.0, // Stay visible until states are well established
              5, 0.8,   // Start fading when states are fully visible
              6, 0.5    // Reduced visibility at high zoom but still present
            ]
          }
        });

        // Add fallback state/province borders
        map.current.addLayer({
          'id': 'state-province-borders-fallback',
          'type': 'line',
          'source': 'us-states',
          'paint': {
            'line-color': 'rgba(255, 255, 255, 0.65)',
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              3.8, 0.6,
              6, 1.0,
              8, 1.4
            ],
            'line-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 0,
              3.7, 0,
              3.8, 0.75,
              4.5, 0.9,
              8, 1.0
            ]
          }
        });

        // Add fallback state/province labels with strict single label enforcement
        map.current.addLayer({
          'id': 'state-province-labels-fallback',
          'type': 'symbol',
          'source': 'us-states',
          'layout': {
            'text-field': [
              'coalesce',
              ['get', 'NAME'],
              ['get', 'name'], 
              ['get', 'Name'],
              'State'
            ],
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
            'text-size': [
              'interpolate',
              ['linear'],
              ['zoom'],
              3.8, 10,
              6, 12,
              8, 15
            ],
            'text-transform': 'uppercase',
            'text-letter-spacing': 0.15,
            'text-offset': [0, 0],
            'text-anchor': 'center',
            'text-max-width': 10, // Allow text wrapping like countries
            'text-allow-overlap': false, // Strict no overlap - prevents multiple labels
            'text-ignore-placement': false, // Use collision detection to enforce single labels
            'symbol-placement': 'point', // Fixed point placement - anchored to geometry centroid
            'symbol-spacing': [
              'interpolate',
              ['linear'],
              ['zoom'],
              3.8, 250,   // Moderate initial spacing - allow labels to show
              5.0, 300,   // Small increase to zoom 5
              5.5, 320,   // Gentle increase mid-way
              6.0, 340,   // Small increase at zoom 6 - maintain visibility
              7, 400,     // Moderate increase at zoom 7
              8, 500      // Controlled spacing at high zoom
            ],
            'text-padding': [
              'interpolate',
              ['linear'],
              ['zoom'],
              3.8, 8,     // Minimal initial padding - allow labels to appear
              5.0, 10,    // Very small increase to zoom 5
              5.5, 11,    // Tiny increase mid-way
              6.0, 12,    // Small increase at zoom 6 - keep labels visible
              7, 15,      // Moderate increase at zoom 7
              8, 20       // Reasonable padding at high zoom
            ],
            'text-rotation-alignment': 'viewport',
            'text-pitch-alignment': 'viewport',
            'text-optional': false, // Ensure labels are placed - prioritize visibility
            'text-justify': 'center', // Center justify the text
            'symbol-sort-key': 1, // Fixed sort key for consistent placement
            'symbol-avoid-edges': true, // Prevent labels near tile edges which can cause duplicates
            'icon-allow-overlap': false, // Ensure no icon overlap
            'text-variable-anchor': ['center'], // Force center anchoring only
            'text-radial-offset': 0, // No radial offset - keep centered
            'symbol-z-order': 'source' // Use source order for consistent placement
          },
          'paint': {
            'text-color': 'rgba(255, 255, 255, 0.85)',
            'text-halo-color': 'rgba(0, 0, 0, 0.8)',
            'text-halo-width': 1.5,
            'text-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 0,      // Hidden when far out
              3.7, 0,    // Still hidden
              3.8, 0.9,  // Strong visibility immediately at zoom 3.8
              4.0, 1.0,  // Fully visible at zoom 4.0
              5.0, 1.0,  // Stay fully visible through zoom 5
              6.0, 1.0,  // Maintain full visibility at zoom 6
              8.0, 1.0,  // Stay fully visible when zoomed in
              9.0, 0.3,  // Start fading at zoom 9.0
              10, 0      // Completely hidden at zoom 10+
            ]
          }
        });

        console.log('✅ Fallback geopolitical layers added');
        
      } catch (fallbackError) {
        console.error('⚠️ Fallback geopolitical layers also failed:', fallbackError);
      }
    }
  };

  // Realistic lighting system matching reference image
  const setupDynamicLighting = () => {
    console.log('💡 Setting up realistic lighting system based on reference...');
    
    try {
      // Create natural sun terminator using a simple hemisphere shadow approach
      const createRealisticTerminator = (sunBearing) => {
        // Calculate the longitude where the terminator line should be
        // In the reference image, the sun appears to be coming from a fixed angle
        const terminatorLng = (sunBearing + 90) % 360 - 180; // 90 degrees offset from sun
        
        // Create a simple hemisphere shadow (180 degrees from sun)
        const shadowStartLng = (terminatorLng - 90 + 360) % 360 - 180;
        const shadowEndLng = (terminatorLng + 90 + 360) % 360 - 180;
        
        // Handle dateline crossing
        let coordinates;
        if (shadowStartLng > shadowEndLng) {
          // Shadow crosses dateline
          coordinates = [
            [[-180, -90], [shadowEndLng, -90], [shadowEndLng, 90], [-180, 90], [-180, -90]],
            [[shadowStartLng, -90], [180, -90], [180, 90], [shadowStartLng, 90], [shadowStartLng, -90]]
          ];
        } else {
          // Normal shadow
          coordinates = [[
            [shadowStartLng, -90], [shadowEndLng, -90], [shadowEndLng, 90], [shadowStartLng, 90], [shadowStartLng, -90]
          ]];
        }
        
        return {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: coordinates[0]
            }
          }]
        };
      };

      // Add terminator shadow source
      map.current.addSource('realistic-terminator-source', {
        'type': 'geojson',
        'data': createRealisticTerminator(0)
      });
      
      // Add realistic shadow layer - much simpler and cleaner like the reference
      map.current.addLayer({
        'id': 'realistic-terminator',
        'type': 'fill',
        'source': 'realistic-terminator-source',
        'paint': {
          // Simple, natural shadow like in the reference image
          'fill-color': 'rgba(0, 0, 0, 0.4)', // Single shadow color
          'fill-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0.6,  // More visible when zoomed out
            4, 0.45, // Medium visibility
            8, 0.3   // Less visible when zoomed in
          ]
        }
      });

      // Simplified lighting update
      let lightingUpdateTimeout = null;
      const updateLighting = () => {
        if (lightingUpdateTimeout) return;
        
        lightingUpdateTimeout = setTimeout(() => {
          try {
            const bearing = map.current?.getBearing() || 0;
            const pitch = map.current?.getPitch() || 0;
            
            if (bearing === null || pitch === null) {
              lightingUpdateTimeout = null;
              return;
            }
            
            // Fixed sun position like in reference - not following camera exactly
            const sunAzimuth = 45; // Fixed sun angle for consistent lighting
            const sunElevation = Math.max(25, Math.min(60, 40 + (pitch * 0.2)));
            
            // Update sky layer sun position
            if (map.current.getLayer('sky-with-sun')) {
              map.current.setPaintProperty('sky-with-sun', 'sky-atmosphere-sun', [sunAzimuth, sunElevation]);
            }
            
            // Update terminator based on fixed sun position, not camera
            if (map.current.getSource('realistic-terminator-source')) {
              const newTerminator = createRealisticTerminator(sunAzimuth);
              map.current.getSource('realistic-terminator-source').setData(newTerminator);
            }
            
          } catch (error) {
            console.warn('⚠️ Lighting update error:', error);
          }
          
          lightingUpdateTimeout = null;
        }, 200); // Slower updates since lighting is more stable
      };

      // Update lighting on camera events (but less frequently)
      map.current.on('pitch', updateLighting);
      
      // Initial lighting setup
      updateLighting();
      
      console.log('✨ Realistic lighting system activated');
      
    } catch (lightingError) {
      console.error('⚠️ Error setting up lighting:', lightingError);
    }
  };

  // Auto-rotation functionality
  const startAutoRotation = () => {
    let userInteracting = false;
    let spinEnabled = true;
    
    function spinGlobe() {
      const zoom = map.current.getZoom();
      if (spinEnabled && !userInteracting && zoom < 5) {
        let distancePerSecond = 360 / 120; // Complete rotation in 2 minutes
        const center = map.current.getCenter();
        center.lng -= distancePerSecond * rotationSpeed * 100;
        
        // Seamless rotation across dateline
        map.current.easeTo({
          center: center,
          duration: 1000,
          easing: function(n) { return n; }
        });
      }
    }

    const rotationInterval = setInterval(spinGlobe, 1000);

    // Pause rotation during user interaction
    map.current.on('mousedown', () => { userInteracting = true; });
    map.current.on('mouseup', () => { 
      userInteracting = false;
      // Resume rotation after 3 seconds of inactivity
      setTimeout(() => { if (!userInteracting) spinEnabled = true; }, 3000);
    });
    map.current.on('dragstart', () => { userInteracting = true; spinEnabled = false; });
    map.current.on('pitchstart', () => { userInteracting = true; spinEnabled = false; });
    map.current.on('rotatestart', () => { userInteracting = true; spinEnabled = false; });
    map.current.on('zoomstart', () => { userInteracting = true; spinEnabled = false; });

    return () => clearInterval(rotationInterval);
  };

  // Add markers for events
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Clear existing markers
    markers.forEach(marker => marker.remove());
    setMarkers([]);

    const newMarkers = events.map(event => {
      // Create custom marker element
      const markerElement = document.createElement('div');
      markerElement.className = 'mapbox-marker';
      markerElement.style.cssText = `
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: ${getEventColor(event.type)};
        border: 2px solid white;
        box-shadow: 0 0 10px rgba(255,255,255,0.5);
        cursor: pointer;
        animation: pulse 2s infinite;
      `;

      // Add pulsing animation
      if (!document.getElementById('mapbox-marker-styles')) {
        const style = document.createElement('style');
        style.id = 'mapbox-marker-styles';
        style.textContent = `
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
          }
        `;
        document.head.appendChild(style);
      }

      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat([event.longitude, event.latitude])
        .addTo(map.current);

      // Add popup
      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div style="font-family: Arial; font-size: 12px;">
            <h4 style="margin: 0 0 5px 0; color: #333;">${event.title}</h4>
            <p style="margin: 0; color: #666;">Type: ${event.type}</p>
            <p style="margin: 0; color: #666;">Magnitude: ${event.magnitude}</p>
            ${event.description ? `<p style="margin: 5px 0 0 0; color: #666; font-size: 11px;">${event.description}</p>` : ''}
          </div>
        `);

      markerElement.addEventListener('click', () => {
        marker.setPopup(popup).togglePopup();
        if (onMarkerClick) onMarkerClick(event);
      });

      return marker;
    });

    setMarkers(newMarkers);
  }, [events, isLoaded, onMarkerClick]);

  // Add arcs for arc events (using lines on Mapbox)
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Remove existing arc layers
    if (map.current.getLayer('arc-layer')) {
      map.current.removeLayer('arc-layer');
    }
    if (map.current.getSource('arc-source')) {
      map.current.removeSource('arc-source');
    }

    if (arcEvents.length === 0) return;

    // Create GeoJSON for arcs
    const arcFeatures = arcEvents.map((arc, index) => ({
      type: 'Feature',
      properties: {
        id: arc.id || `arc-${index}`,
        color: arc.color || '#4488ff',
        type: arc.type || 'generic'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [arc.startLatLng.lng, arc.startLatLng.lat],
          [arc.endLatLng.lng, arc.endLatLng.lat]
        ]
      }
    }));

    map.current.addSource('arc-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: arcFeatures
      }
    });

    map.current.addLayer({
      id: 'arc-layer',
      type: 'line',
      source: 'arc-source',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 3,
        'line-opacity': 0.8
      }
    });

    // Add click handler for arcs
    map.current.on('click', 'arc-layer', (e) => {
      if (onArcClick && e.features[0]) {
        const arcId = e.features[0].properties.id;
        const arc = arcEvents.find(a => a.id === arcId);
        if (arc) onArcClick(arc);
      }
    });

    // Change cursor on hover
    map.current.on('mouseenter', 'arc-layer', () => {
      map.current.getCanvas().style.cursor = 'pointer';
    });

    map.current.on('mouseleave', 'arc-layer', () => {
      map.current.getCanvas().style.cursor = '';
    });

  }, [arcEvents, isLoaded, onArcClick]);

  // Helper function to get event colors
  const getEventColor = (eventType) => {
    const colors = {
      earthquake: '#ff6b6b',
      volcano: '#ff8c00',
      missile: '#dc143c',
      rocket: '#4169e1',
      generic: '#4488ff'
    };
    return colors[eventType] || colors.generic;
  };

  // Show error state
  if (error) {
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
        flexDirection: 'column',
        padding: '20px'
      }}>
        <h3 style={{ color: '#ff6b6b', marginBottom: '10px' }}>Mapbox Globe Error</h3>
        <p style={{ marginBottom: '20px', opacity: 0.8 }}>{error}</p>
        <button 
          onClick={() => {
            setError(null);
            if (map.current) {
              map.current.remove();
              map.current = null;
            }
            // Force re-initialization
            setTimeout(() => window.location.reload(), 100);
          }}
          style={{
            padding: '10px 20px',
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


  return (
    <div 
      id="mapbox-globe-container"
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#000000' }}
    >
      {/* Mapbox Globe Container */}
      <div 
        ref={mapContainer} 
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%', 
          height: '100%',
          borderRadius: '0px',
          zIndex: 2
        }} 
      />


      {!isLoaded && !error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '18px',
          textAlign: 'center',
          zIndex: 10,
          background: 'rgba(0,0,0,0.9)',
          padding: '30px',
          borderRadius: '12px',
          border: '1px solid #333',
          minWidth: '300px'
        }}>
          <div style={{ marginBottom: '15px', fontSize: '20px' }}>
            🌍 Loading Realistic 3D Globe
          </div>
          <div style={{ 
            fontSize: '14px', 
            opacity: 0.8, 
            marginBottom: '15px',
            color: '#4A90E2'
          }}>
            {loadingStage}
          </div>
          <div style={{
            width: '100%',
            height: '4px',
            background: '#333',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: '60%',
              height: '100%',
              background: 'linear-gradient(90deg, #4A90E2, #67B7FF)',
              borderRadius: '2px',
              animation: 'loading 2s infinite'
            }} />
          </div>
          <div style={{ 
            fontSize: '12px', 
            opacity: 0.6, 
            marginTop: '15px' 
          }}>
            Check browser console (F12) for detailed logs
          </div>
        </div>
      )}
      
      {/* Add CSS animations and custom font styling */}
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
        /* Custom monospace-like styling for country labels */
        .mapboxgl-ctrl-group .mapboxgl-ctrl-country-label {
          font-family: 'Courier New', 'Monaco', 'Menlo', monospace !important;
          letter-spacing: 0.1em !important;
          font-weight: 500 !important;
        }
        .mapboxgl-canvas-container {
          background: transparent !important;
        }
        .mapboxgl-canvas {
          background: transparent !important;
        }
        .mapboxgl-map {
          background: transparent !important;
        }
        /* Ensure globe surface is fully opaque */
        .mapboxgl-canvas-container canvas {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
});

MapboxGlobe.displayName = 'MapboxGlobe';

export default MapboxGlobe;