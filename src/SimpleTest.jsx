import React from 'react';

function SimpleTest() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#000',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px'
    }}>
      <div>
        <h1>Simple Test</h1>
        <p>If you can see this, React is working!</p>
        <p>Now let's test DeckGL...</p>
      </div>
    </div>
  );
}

export default SimpleTest; 