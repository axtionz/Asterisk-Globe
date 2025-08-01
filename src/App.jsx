import React, { useState, useCallback, useEffect, useRef } from 'react';
import MapboxGlobe from './globe/components/MapboxGlobe.jsx';
import SimpleMapboxTest from './globe/components/SimpleMapboxTest.jsx';
import StatusIndicator from './StatusIndicator.jsx';
import { openaiService, geocodingService } from './services/apiService.js';
import { AGENT_CONFIG } from './agentConfig.js';

export default function OriginalApp() {
  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 0,
    zoom: 1.5,
    pitch: 0,
    bearing: 0
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [events, setEvents] = useState([]);
  const [arcEvents, setArcEvents] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isProcessingChat, setIsProcessingChat] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  
  // News processing dev panel state
  const [newsInput, setNewsInput] = useState('');
  const [newsResults, setNewsResults] = useState([]);
  const [isProcessingNews, setIsProcessingNews] = useState(false);
  
  // Globe controls
  const [rotationSpeed, setRotationSpeed] = useState(0.002);
  
  // Dev panel state
  const [currentZoom, setCurrentZoom] = useState(2);
  const globeRef = useRef(null);

  useEffect(() => {
    // Add default New York earthquake event
    setEvents([{
      id: 'default-nyc',
      longitude: -74.006,
      latitude: 40.7128,
      magnitude: 5.6,
      type: 'earthquake',
      timestamp: new Date().toISOString(),
      title: 'New York City, NY'
    }]);
    setIsLoaded(true);
  }, []);

  // Handle terminal-style chat input for natural language event descriptions
  const handleEventInput = useCallback(async (input) => {
    if (!input.trim()) return;

    setIsProcessingChat(true);

    try {
      // Add user input to chat history
      const userMessage = { type: 'user', text: input, timestamp: new Date() };
      setChatHistory(prev => [...prev, userMessage]);

      // Use OpenAI API to parse the event
      const response = await openaiService.chatCompletion([
        { role: 'system', content: AGENT_CONFIG.systemPrompt },
        { role: 'user', content: input }
      ], {
        temperature: AGENT_CONFIG.temperature
      });

      const content = response.choices[0].message.content;
      
      // Parse response
      let parsedEvents;
      try {
        parsedEvents = JSON.parse(content);
        if (!Array.isArray(parsedEvents)) {
          parsedEvents = [parsedEvents];
        }
      } catch {
        const matches = content.match(/\{[\s\S]*?\}/g);
        if (matches) {
          parsedEvents = matches.map(jsonStr => JSON.parse(jsonStr));
        } else {
          throw new Error('Could not parse AI response');
        }
      }

      // Process each parsed event
      for (const parsed of parsedEvents) {
        // Add AI agent's response message to chat history
        if (parsed.message) {
          const agentMessage = { 
            type: 'agent', 
            text: parsed.message,
            timestamp: new Date()
          };
          setChatHistory(prev => [...prev, agentMessage]);
        }

        // Handle different action types
        switch (parsed.action) {
          case 'plot_event':
            if (!parsed.location) {
              throw new Error('Location is required for plotting events');
            }
            
            const coords = await geocodingService.geocodeLocation(parsed.location);
            const eventData = {
              id: `event-${Date.now()}`,
              longitude: coords.longitude,
              latitude: coords.latitude,
              magnitude: parsed.magnitude || 5.0,
              type: parsed.eventType || 'earthquake',
              timestamp: new Date().toISOString(),
              title: coords.formatted,
              description: input
            };
            
            setEvents(prev => [...prev, eventData]);
            
            const successMessage = { 
              type: 'success', 
              text: `✅ Event plotted successfully at ${coords.formatted}`,
              timestamp: new Date()
            };
            setChatHistory(prev => [...prev, successMessage]);
            break;

          case 'plot_arc':
            if (!parsed.from || !parsed.to) {
              throw new Error('Both origin and destination are required for arc events');
            }
            
            const [fromCoords, toCoords] = await Promise.all([
              geocodingService.geocodeLocation(parsed.from),
              geocodingService.geocodeLocation(parsed.to)
            ]);
            
            const arcEvent = {
              id: `arc-${Date.now()}`,
              startLatLng: { lat: fromCoords.latitude, lng: fromCoords.longitude },
              endLatLng: { lat: toCoords.latitude, lng: toCoords.longitude },
              color: parsed.eventType === 'missile' ? '#ff0000' : '#4488ff',
              type: parsed.eventType || 'generic',
              animated: true,
              from: parsed.from,
              to: parsed.to,
              timestamp: new Date().toISOString()
            };
            
            setArcEvents(prev => [...prev, arcEvent]);
            
            const arcMsg = { 
              type: 'success', 
              text: `🟠 Arc plotted: ${parsed.from} → ${parsed.to}`,
              timestamp: new Date()
            };
            setChatHistory(prev => [...prev, arcMsg]);
            break;

          case 'get_info':
            // Information request - the agent message is already added above
            break;

          case 'error':
            throw new Error(parsed.message || 'Unknown error occurred');

          default:
            throw new Error(`Unknown action type: ${parsed.action}`);
        }
      }
    } catch (error) {
      const errorMessage = { 
        type: 'error', 
        text: `❌ Error: ${error.message}`,
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorMessage]);
      console.error('Chat input error:', error);
    } finally {
      setIsProcessingChat(false);
    }
  }, []);

  // Handle news processing in dev panel
  const handleNewsProcessing = useCallback(async () => {
    if (!newsInput.trim()) return;

    setIsProcessingNews(true);
    const startTime = Date.now();

    try {
      // Simulate news processing with structured input
      const newsArticle = {
        title: newsInput,
        content: newsInput,
        timestamp: new Date().toISOString()
      };

      // Process through the event system
      const result = await handleEventInput(newsInput);
      
      const processingTime = Date.now() - startTime;
      
      const newsResult = {
        id: Date.now(),
        input: newsInput,
        processingTime,
        success: true,
        timestamp: new Date(),
        events: events.length,
        arcs: arcEvents.length
      };

      setNewsResults(prev => [newsResult, ...prev.slice(0, 9)]); // Keep last 10 results
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      const newsResult = {
        id: Date.now(),
        input: newsInput,
        processingTime,
        success: false,
        error: error.message,
        timestamp: new Date()
      };

      setNewsResults(prev => [newsResult, ...prev.slice(0, 9)]);
    } finally {
      setIsProcessingNews(false);
      setNewsInput('');
    }
  }, [newsInput, handleEventInput, events.length, arcEvents.length]);

  // Handle chat input key press
  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEventInput(chatInput);
      setChatInput('');
    }
  };

  // Handle news input key press
  const handleNewsKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleNewsProcessing();
    }
  };

  return (
    <>
      <StatusIndicator statusText="Listening for events…" />
      <div className="app" style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
        <div className="globe-container" style={{ 
          position: 'relative', 
          width: '100%', 
          height: '100%' 
        }}>
          {/* Main Globe */}
          {isLoaded ? (
            <MapboxGlobe 
              ref={globeRef}
              events={events}
              arcEvents={arcEvents}
              enableRotation={true}
              rotationSpeed={rotationSpeed}
              onZoomChange={setCurrentZoom}
              onMarkerClick={(marker) => {
                console.log('Marker clicked:', marker);
              }}
              onArcClick={(arc) => {
                console.log('Arc clicked:', arc);
              }}
            />
          ) : (
            <div style={{ 
              width: '100%', 
              height: '100%', 
              background: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '18px'
            }}>
              <div>
                <div>Loading realistic 3D globe with satellite imagery...</div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom Dev Panel for News Processing */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '200px',
        backgroundColor: '#1a1a1a',
        color: 'white',
        borderTop: '2px solid #333',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000
      }}>
        {/* Dev Panel Header */}
        <div style={{
          padding: '10px 20px',
          borderBottom: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#2a2a2a'
        }}>
          <h4 style={{ margin: 0, color: '#4A90E2' }}>
            🧪 Dev Panel - Globe Controls & News Processing
          </h4>
          <div style={{ fontSize: '12px', color: '#888', display: 'flex', gap: '20px' }}>
            <span>Zoom: {currentZoom.toFixed(2)}</span>
            <span>Events: {events.length}</span>
            <span>Arcs: {arcEvents.length}</span>
            <span>Results: {newsResults.length}</span>
            <span>Success Rate: {
              newsResults.length > 0 
                ? Math.round((newsResults.filter(r => r.success).length / newsResults.length) * 100)
                : 0
            }%</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', flex: 1 }}>
          {/* Input Section */}
          <div style={{ 
            flex: 1, 
            padding: '15px',
            borderRight: '1px solid #333'
          }}>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', color: '#ccc', display: 'block', marginBottom: '5px' }}>
                News Input (simulated article):
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={newsInput}
                  onChange={(e) => setNewsInput(e.target.value)}
                  onKeyPress={handleNewsKeyPress}
                  placeholder="Iran sends missiles to Iraq targeting military installations"
                  disabled={isProcessingNews}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: '#333',
                    color: 'white',
                    border: '1px solid #555',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                />
                <button
                  onClick={handleNewsProcessing}
                  disabled={isProcessingNews || !newsInput.trim()}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: isProcessingNews ? '#666' : '#4A90E2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: isProcessingNews ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isProcessingNews ? '⟳ Processing...' : 'Process'}
                </button>
              </div>
            </div>
            
            <div style={{ fontSize: '11px', color: '#888' }}>
              <p style={{ margin: '5px 0' }}>Test examples:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {[
                  "Earthquake strikes Tokyo magnitude 6.2",
                  "Russia attacks Ukraine with missiles", 
                  "Volcano erupts in Iceland affecting flights",
                  "Trade agreement signed between Germany and Brazil"
                ].map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setNewsInput(example)}
                    style={{
                      padding: '3px 8px',
                      backgroundColor: '#444',
                      color: '#ccc',
                      border: '1px solid #555',
                      borderRadius: '3px',
                      fontSize: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    {example.substring(0, 30)}...
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Results Section */}
          <div style={{ 
            flex: 1, 
            padding: '15px'
          }}>
            <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '10px' }}>
              Processing Results:
            </div>
            <div style={{ 
              height: '120px', 
              overflowY: 'auto',
              fontSize: '11px',
              fontFamily: 'monospace'
            }}>
              {newsResults.length === 0 ? (
                <div style={{ color: '#666', fontStyle: 'italic' }}>
                  No results yet. Try processing some news input above.
                </div>
              ) : (
                newsResults.map((result, index) => (
                  <div 
                    key={result.id}
                    style={{ 
                      marginBottom: '8px',
                      padding: '6px',
                      backgroundColor: result.success ? '#1a3d1a' : '#3d1a1a',
                      borderRadius: '3px',
                      borderLeft: `3px solid ${result.success ? '#28a745' : '#dc3545'}`
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginBottom: '3px'
                    }}>
                      <span style={{ color: result.success ? '#90ee90' : '#ffcccb' }}>
                        {result.success ? '✅' : '❌'} {result.input.substring(0, 40)}...
                      </span>
                      <span style={{ color: '#888' }}>
                        {result.processingTime}ms
                      </span>
                    </div>
                    {result.error && (
                      <div style={{ color: '#ffcccb', fontSize: '10px' }}>
                        Error: {result.error}
                      </div>
                    )}
                    {result.success && (
                      <div style={{ color: '#ccc', fontSize: '10px' }}>
                        Events: {result.events} | Arcs: {result.arcs}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}