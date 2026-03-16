import React from 'react';

const RecommendationPanel = ({ result }) => {
  if (!result || !result.recommended_action) return null;
  return (
    <div className="panel" style={{ marginBottom: '24px' }}>
      <div className="section-label">RESPONSE & RECOMMENDED ACTION</div>
      <div style={{
        background: 'rgba(0,212,255,0.04)',
        border: '0.5px solid rgba(0,212,255,0.25)',
        borderRadius: '8px', padding: '12px',
      }}>
        <div style={{ fontSize: '9px', color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: 'JetBrains Mono, monospace', marginBottom: '8px' }}>
          RECOMMENDED ACTION
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', lineHeight: '1.75', color: 'var(--text)' }}>
          {result.recommended_action}
        </div>
      </div>
    </div>
  );
};

export default RecommendationPanel;
