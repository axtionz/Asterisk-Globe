import React, { useState, useCallback, useEffect } from 'react';
import NewsFeed, { sampleNewsData } from './components/NewsFeed.jsx';
import GlobeView from './globe/components/GlobeView.jsx';
import { openaiService, geocodingService } from './services/apiService.js';
import { AGENT_CONFIG } from './agentConfig.js';

// Secure version of the main App component
export default function SecureApp() {
  const [mode, setMode] = useState('newsfeed'); // 'newsfeed', 'globe', 'legacy'
  const [newsData, setNewsData] = useState(sampleNewsData);
  const [events, setEvents] = useState([]);
  const [arcs, setArcs] = useState([]);
  const [globalGlobeView, setGlobalGlobeView] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [apiStatus, setApiStatus] = useState({ openai: 'unknown', geocoding: 'unknown' });

  // Check API status on mount
  useEffect(() => {
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    const status = { openai: 'unknown', geocoding: 'unknown' };
    
    // Check OpenAI API
    try {
      await openaiService.chatCompletion([
        { role: 'user', content: 'test' }
      ]);
      status.openai = 'connected';
    } catch (error) {
      status.openai = error.message.includes('not configured') ? 'not_configured' : 'error';
    }
    
    // Check Geocoding API
    try {
      await geocodingService.geocodeLocation('London');
      status.geocoding = 'connected';
    } catch (error) {
      status.geocoding = error.message.includes('not configured') ? 'not_configured' : 'error';
    }
    
    setApiStatus(status);
  };

  // Handle natural language event processing
  const handleChatInput = useCallback(async (input) => {
    if (!input.trim()) return;

    setIsProcessing(true);
    const userMessage = { type: 'user', text: input, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMessage]);

    try {
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
        switch (parsed.action) {
          case 'plot_event':
            if (parsed.location) {
              const coords = await geocodingService.geocodeLocation(parsed.location);
              const event = {
                id: `event-${Date.now()}`,
                latitude: coords.latitude,
                longitude: coords.longitude,
                type: parsed.eventType || 'earthquake',
                magnitude: parsed.magnitude || 5.0,
                timestamp: new Date().toISOString(),
                title: parsed.location,
                description: input
              };
              setEvents(prev => [...prev, event]);
              
              const successMsg = { 
                type: 'success', 
                text: `✅ Event plotted at ${coords.formatted}`,
                timestamp: new Date()
              };
              setChatHistory(prev => [...prev, successMsg]);
            }
            break;

          case 'plot_arc':
            if (parsed.from && parsed.to) {
              const [fromCoords, toCoords] = await Promise.all([
                geocodingService.geocodeLocation(parsed.from),
                geocodingService.geocodeLocation(parsed.to)
              ]);
              
              const arc = {
                id: `arc-${Date.now()}`,
                startLatLng: { lat: fromCoords.latitude, lng: fromCoords.longitude },
                endLatLng: { lat: toCoords.latitude, lng: toCoords.longitude },
                color: parsed.eventType === 'missile' ? '#ff0000' : '#4488ff',
                type: parsed.eventType || 'generic',
                animated: true,
                title: `${parsed.from} → ${parsed.to}`,
                from: parsed.from,
                to: parsed.to
              };
              setArcs(prev => [...prev, arc]);
              
              const arcMsg = { 
                type: 'success', 
                text: `🟠 Arc plotted: ${parsed.from} → ${parsed.to}`,
                timestamp: new Date()
              };
              setChatHistory(prev => [...prev, arcMsg]);
            }
            break;

          default:
            if (parsed.message) {
              const agentMsg = { 
                type: 'agent', 
                text: parsed.message,
                timestamp: new Date()
              };
              setChatHistory(prev => [...prev, agentMsg]);
            }
        }
      }

    } catch (error) {
      const errorMsg = { 
        type: 'error', 
        text: `❌ Error: ${error.message}`,
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatInput(chatInput);
      setChatInput('');
    }
  };

  // Handle event creation from news feed
  const handleEventCreate = useCallback((event) => {
    setEvents(prev => [...prev, event]);
  }, []);

  // Handle arc creation from news feed
  const handleArcCreate = useCallback((arc) => {
    setArcs(prev => [...prev, arc]);
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        padding: '10px 20px',
        backgroundColor: '#1a1a1a',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #333'
      }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>
          Asterisk Globe - Secure Financial Terminal
        </h1>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* API Status */}
          <div style={{ fontSize: '12px', display: 'flex', gap: '10px' }}>
            <span>
              OpenAI: <span style={{ color: 
                apiStatus.openai === 'connected' ? '#28a745' :
                apiStatus.openai === 'not_configured' ? '#ffc107' : '#dc3545'
              }}>
                {apiStatus.openai === 'connected' ? '✓' : 
                 apiStatus.openai === 'not_configured' ? '⚠' : '✗'}
              </span>
            </span>
            <span>
              Geocoding: <span style={{ color: 
                apiStatus.geocoding === 'connected' ? '#28a745' :
                apiStatus.geocoding === 'not_configured' ? '#ffc107' : '#dc3545'
              }}>
                {apiStatus.geocoding === 'connected' ? '✓' : 
                 apiStatus.geocoding === 'not_configured' ? '⚠' : '✗'}
              </span>
            </span>
          </div>
          
          {/* Mode switcher */}
          <select 
            value={mode} 
            onChange={(e) => setMode(e.target.value)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#333',
              color: 'white',
              border: '1px solid #555',
              borderRadius: '4px'
            }}
          >
            <option value="newsfeed">News Feed</option>
            <option value="globe">Globe Only</option>
            <option value="legacy">Legacy App</option>
          </select>
        </div>
      </header>

      {/* API Configuration Warning */}
      {(apiStatus.openai === 'not_configured' || apiStatus.geocoding === 'not_configured') && (
        <div style={{
          padding: '10px 20px',
          backgroundColor: '#fff3cd',
          color: '#856404',
          borderBottom: '1px solid #ffeaa7'
        }}>
          ⚠️ API keys not configured. Please set your API keys in the .env file:
          {apiStatus.openai === 'not_configured' && ' VITE_OPENAI_API_KEY'}
          {apiStatus.geocoding === 'not_configured' && ' VITE_OPENCAGE_API_KEY'}
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {mode === 'newsfeed' && (
          <NewsFeed
            articles={newsData}
            onEventCreate={handleEventCreate}
            onArcCreate={handleArcCreate}
            globalGlobeView={globalGlobeView}
            onGlobalGlobeToggle={() => setGlobalGlobeView(!globalGlobeView)}
          />
        )}

        {mode === 'globe' && (
          <div style={{ display: 'flex', height: '100%' }}>
            {/* Globe view */}
            <div style={{ flex: 2, backgroundColor: '#000' }}>
              <GlobeView
                newsData={newsData}
                events={events}
                arcs={arcs}
                height="100%"
                enableControls={true}
                enableRotation={true}
                showStars={true}
                cameraPosition={[0, 0, 15]}
                onEventClick={(event) => {
                  console.log('Event clicked:', event);
                }}
                onArcClick={(arc) => {
                  console.log('Arc clicked:', arc);
                }}
              />
            </div>

            {/* Chat panel */}
            <div style={{ 
              flex: 1, 
              backgroundColor: '#f8f9fa',
              display: 'flex',
              flexDirection: 'column',
              borderLeft: '1px solid #ddd'
            }}>
              <div style={{
                padding: '15px',
                borderBottom: '1px solid #ddd',
                backgroundColor: 'white'
              }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Terminal Chat</h3>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
                  Natural language event plotting
                </p>
              </div>

              {/* Chat history */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '15px',
                backgroundColor: '#000',
                color: '#0f0',
                fontFamily: 'monospace',
                fontSize: '12px'
              }}>
                {chatHistory.length === 0 && (
                  <div style={{ color: '#666' }}>
                    {'>'} Try: "Earthquake in Tokyo, magnitude 6.1"<br/>
                    {'>'} Try: "Iran sends missiles to Iraq"<br/>
                    {'>'} Try: "Volcano eruption in Iceland"
                  </div>
                )}
                {chatHistory.map((message, index) => (
                  <div key={index} style={{ marginBottom: '5px' }}>
                    <span style={{ color: '#888' }}>
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                    <span style={{ 
                      color: message.type === 'user' ? '#0f0' : 
                             message.type === 'agent' ? '#87ceeb' :
                             message.type === 'success' ? '#0ff' : '#f00'
                    }}>
                      {' '}{message.text}
                    </span>
                  </div>
                ))}
                {isProcessing && (
                  <div style={{ color: '#ff0' }}>
                    {'>'} Processing...
                  </div>
                )}
              </div>

              {/* Chat input */}
              <div style={{ 
                padding: '15px',
                backgroundColor: 'white',
                borderTop: '1px solid #ddd'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ 
                    color: '#0f0', 
                    fontFamily: 'monospace', 
                    marginRight: '5px' 
                  }}>
                    {'>'}
                  </span>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={handleChatKeyPress}
                    placeholder="Earthquake in Tokyo, magnitude 6.1"
                    disabled={isProcessing}
                    style={{
                      flex: 1,
                      padding: '8px',
                      backgroundColor: '#000',
                      color: '#0f0',
                      border: '1px solid #0f0',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />
                </div>
                
                <div style={{ 
                  marginTop: '10px',
                  fontSize: '12px',
                  color: '#666',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>Events: {events.length} | Arcs: {arcs.length}</span>
                  <button
                    onClick={() => {
                      setEvents([]);
                      setArcs([]);
                      setChatHistory([]);
                    }}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '2px',
                      fontSize: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === 'legacy' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            backgroundColor: '#f8f9fa',
            color: '#666',
            flexDirection: 'column'
          }}>
            <h2>Legacy Application</h2>
            <p>The original Deck.gl implementation is available but deprecated.</p>
            <p>Please use the News Feed or Globe modes for the new Three.js implementation.</p>
            <div style={{ marginTop: '20px', fontSize: '14px' }}>
              <strong>Security Note:</strong> The legacy app contained exposed API keys.<br/>
              This has been fixed in the new implementation.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}