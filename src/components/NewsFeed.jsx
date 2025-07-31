import React, { useState, useCallback, useMemo } from 'react';
import GlobeView, { createEventFromNews, createArcFromNews } from '../globe/components/GlobeView.jsx';

// Individual news article component
function NewsArticle({ 
  article, 
  onGlobeToggle, 
  showGlobe, 
  onEventCreate, 
  onArcCreate 
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Check if article has geospatial relevance
  const hasGeospatialData = useMemo(() => {
    if (!article.tags) return false;
    
    const locationTags = article.tags.filter(tag => 
      tag.type === 'location' || 
      tag.type === 'country' || 
      tag.type === 'city'
    );
    
    const actionTags = article.tags.filter(tag => 
      tag.type === 'action' || 
      tag.type === 'event'
    );
    
    return locationTags.length > 0 && actionTags.length > 0;
  }, [article.tags]);
  
  // Process article for globe visualization
  const handleCreateVisualization = useCallback(async () => {
    if (!hasGeospatialData || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const locationTags = article.tags.filter(tag => 
        tag.type === 'location' || tag.type === 'country'
      );
      
      if (locationTags.length === 1) {
        // Single location -> create event marker
        const event = await createEventFromNews(article);
        if (event && onEventCreate) {
          onEventCreate(event);
        }
      } else if (locationTags.length >= 2) {
        // Multiple locations -> create arc
        const arc = await createArcFromNews(article);
        if (arc && onArcCreate) {
          onArcCreate(arc);
        }
      }
    } catch (error) {
      console.error('Failed to create visualization:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [article, hasGeospatialData, isProcessing, onEventCreate, onArcCreate]);
  
  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '15px',
      marginBottom: '15px',
      backgroundColor: 'white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      {/* Article header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '10px'
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '18px', 
          color: '#333',
          flex: 1,
          marginRight: '15px'
        }}>
          {article.title}
        </h3>
        
        {hasGeospatialData && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCreateVisualization}
              disabled={isProcessing}
              style={{
                padding: '6px 12px',
                backgroundColor: isProcessing ? '#ccc' : '#4A90E2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: isProcessing ? 'not-allowed' : 'pointer'
              }}
            >
              {isProcessing ? '⟳' : '🌍'} Plot
            </button>
            
            <button
              onClick={() => onGlobeToggle(article.articleId)}
              style={{
                padding: '6px 12px',
                backgroundColor: showGlobe ? '#28a745' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {showGlobe ? 'Hide' : 'Show'} Globe
            </button>
          </div>
        )}
      </div>
      
      {/* Article summary */}
      <p style={{ 
        color: '#666', 
        fontSize: '14px', 
        lineHeight: '1.5',
        marginBottom: '10px'
      }}>
        {isExpanded ? article.summary : `${article.summary?.substring(0, 200)}...`}
        {article.summary?.length > 200 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'none',
              border: 'none',
              color: '#4A90E2',
              cursor: 'pointer',
              marginLeft: '5px'
            }}
          >
            {isExpanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </p>
      
      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          {article.tags.slice(0, 8).map((tag, index) => (
            <span
              key={index}
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                margin: '2px',
                backgroundColor: 
                  tag.type === 'location' || tag.type === 'country' ? '#e3f2fd' :
                  tag.type === 'action' || tag.type === 'event' ? '#fff3e0' :
                  '#f5f5f5',
                color: 
                  tag.type === 'location' || tag.type === 'country' ? '#1976d2' :
                  tag.type === 'action' || tag.type === 'event' ? '#f57c00' :
                  '#666',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '500'
              }}
            >
              {tag.entity}
            </span>
          ))}
        </div>
      )}
      
      {/* Globe view (inline) */}
      {showGlobe && hasGeospatialData && (
        <div style={{ 
          marginTop: '15px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <GlobeView
            newsData={[article]}
            height="300px"
            enableControls={true}
            enableRotation={false}
            showStars={false}
            cameraPosition={[0, 0, 12]}
          />
        </div>
      )}
      
      {/* Article metadata */}
      <div style={{ 
        fontSize: '12px', 
        color: '#999',
        marginTop: '10px',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>Article ID: {article.articleId}</span>
        {hasGeospatialData && (
          <span style={{ color: '#4A90E2' }}>
            📍 Geospatial data available
          </span>
        )}
      </div>
    </div>
  );
}

// Main news feed component
export default function NewsFeed({ 
  articles = [],
  onEventCreate,
  onArcCreate,
  globalGlobeView = false,
  onGlobalGlobeToggle
}) {
  const [inlineGlobeStates, setInlineGlobeStates] = useState({});
  const [globalEvents, setGlobalEvents] = useState([]);
  const [globalArcs, setGlobalArcs] = useState([]);
  
  // Toggle inline globe for specific article
  const handleInlineGlobeToggle = useCallback((articleId) => {
    setInlineGlobeStates(prev => ({
      ...prev,
      [articleId]: !prev[articleId]
    }));
  }, []);
  
  // Handle event creation
  const handleEventCreate = useCallback((event) => {
    setGlobalEvents(prev => [...prev, event]);
    if (onEventCreate) {
      onEventCreate(event);
    }
  }, [onEventCreate]);
  
  // Handle arc creation
  const handleArcCreate = useCallback((arc) => {
    setGlobalArcs(prev => [...prev, arc]);
    if (onArcCreate) {
      onArcCreate(arc);
    }
  }, [onArcCreate]);
  
  // Filter articles with geospatial data
  const geospatialArticles = useMemo(() => {
    return articles.filter(article => {
      if (!article.tags) return false;
      const locationTags = article.tags.filter(tag => 
        tag.type === 'location' || tag.type === 'country'
      );
      return locationTags.length > 0;
    });
  }, [articles]);
  
  return (
    <div style={{ display: 'flex', gap: '20px', height: '100vh' }}>
      {/* News articles list */}
      <div style={{ 
        flex: globalGlobeView ? 1 : 2,
        overflowY: 'auto',
        padding: '20px',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, color: '#333' }}>
            News Feed
          </h2>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>
              {geospatialArticles.length} geospatial articles
            </span>
            
            {geospatialArticles.length > 0 && (
              <button
                onClick={onGlobalGlobeToggle}
                style={{
                  padding: '8px 16px',
                  backgroundColor: globalGlobeView ? '#28a745' : '#4A90E2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {globalGlobeView ? 'Hide' : 'Show'} Global Globe
              </button>
            )}
          </div>
        </div>
        
        {articles.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#666',
            padding: '40px',
            fontSize: '16px'
          }}>
            No news articles available
          </div>
        ) : (
          articles.map((article, index) => (
            <NewsArticle
              key={article.articleId || index}
              article={article}
              onGlobeToggle={handleInlineGlobeToggle}
              showGlobe={inlineGlobeStates[article.articleId]}
              onEventCreate={handleEventCreate}
              onArcCreate={handleArcCreate}
            />
          ))
        )}
      </div>
      
      {/* Global globe view */}
      {globalGlobeView && (
        <div style={{ 
          flex: 1,
          backgroundColor: '#000',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            right: '10px',
            zIndex: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ 
              color: 'white', 
              margin: 0,
              fontSize: '18px'
            }}>
              Global Events View
            </h3>
            
            <button
              onClick={() => {
                setGlobalEvents([]);
                setGlobalArcs([]);
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Clear All
            </button>
          </div>
          
          <GlobeView
            newsData={geospatialArticles}
            events={globalEvents}
            arcs={globalArcs}
            height="100%"
            enableControls={true}
            enableRotation={true}
            showStars={true}
            cameraPosition={[0, 0, 15]}
            onEventClick={(event) => {
              console.log('Global event clicked:', event);
            }}
            onArcClick={(arc) => {
              console.log('Global arc clicked:', arc);
            }}
          />
        </div>
      )}
    </div>
  );
}

// Sample news data for testing
export const sampleNewsData = [
  {
    articleId: "1",
    title: "Iran sends missiles to Iraq",
    summary: "Iran launched several missiles targeting military installations in Iraq following recent diplomatic tensions. The missiles were launched from western Iran and struck targets near Baghdad.",
    tags: [
      { entity: "Iran", type: "country" },
      { entity: "Iraq", type: "country" },
      { entity: "sends missiles", type: "action" },
      { entity: "military", type: "category" }
    ]
  },
  {
    articleId: "2", 
    title: "Earthquake strikes Tokyo, magnitude 6.1",
    summary: "A powerful earthquake with magnitude 6.1 struck the Tokyo metropolitan area early this morning. No major damage has been reported, but residents felt strong shaking across the region.",
    tags: [
      { entity: "Tokyo", type: "city" },
      { entity: "Japan", type: "country" },
      { entity: "earthquake", type: "event" },
      { entity: "magnitude 6.1", type: "magnitude" }
    ]
  },
  {
    articleId: "3",
    title: "Trade agreement signed between Germany and Brazil",
    summary: "Germany and Brazil have signed a comprehensive trade agreement that will increase bilateral trade in automotive and agricultural sectors. The agreement is expected to boost economic cooperation between the two nations.",
    tags: [
      { entity: "Germany", type: "country" },
      { entity: "Brazil", type: "country" },
      { entity: "trade agreement", type: "action" },
      { entity: "economic", type: "category" }
    ]
  },
  {
    articleId: "4",
    title: "Volcano erupts in Iceland, affecting air traffic",
    summary: "A volcanic eruption in Iceland has disrupted air traffic across Northern Europe. The volcano, located near Reykjavik, has been spewing ash into the atmosphere since early morning.",
    tags: [
      { entity: "Iceland", type: "country" },
      { entity: "Reykjavik", type: "city" },
      { entity: "volcano eruption", type: "event" },
      { entity: "air traffic", type: "category" }
    ]
  }
];