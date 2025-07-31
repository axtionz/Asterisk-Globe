import React from 'react';
import './index.css';

const StatusIndicator = () => (
  <div style={{
    position: 'fixed',
    top: 20,
    right: 20,
    zIndex: 1000,
    background: 'rgba(20, 20, 30, 0.85)',
    borderRadius: '12px',
    padding: '14px',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
    minWidth: 0,
    fontFamily: 'monospace',
    border: '1px solid #222',
    justifyContent: 'center',
  }}>
    <div className="status-cube-3d">
      <div className="cube-face cube-face-front" />
      <div className="cube-face cube-face-back" />
      <div className="cube-face cube-face-top" />
      <div className="cube-face cube-face-bottom" />
      <div className="cube-face cube-face-left" />
      <div className="cube-face cube-face-right" />
    </div>
  </div>
);

export default StatusIndicator; 