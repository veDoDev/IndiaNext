import React from 'react';

const TABS = [
  { id: 'phishing', label: 'PHISHING', emoji: '🎣' },
  { id: 'injection', label: 'PROMPT INJECTION', emoji: '💉' },
  { id: 'behaviour', label: 'USER BEHAVIOUR', emoji: '👁' },
  { id: 'url', label: 'MALICIOUS URL', emoji: '🔗', disabled: false },
];

const Tabs = ({ activeTab, onTabSelect }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px', marginBottom: '24px' }}>
      {TABS.map(tab => {
        const isActive = activeTab === tab.id;
        const isDisabled = tab.disabled;
        return (
          <button
            key={tab.id}
            disabled={isDisabled}
            onClick={() => !isDisabled && onTabSelect(tab.id)}
            style={{
              position: 'relative',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '16px 8px',
              background: isActive ? 'rgba(0,212,255,0.06)' : 'var(--s1)',
              border: `0.5px solid ${isActive ? 'var(--cyan)' : 'var(--border)'}`,
              borderRadius: '8px',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.35 : 1,
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: '18px', marginBottom: '6px' }}>{tab.emoji}</span>
            <span style={{
              fontSize: '9px', textTransform: 'uppercase',
              letterSpacing: '0.8px',
              fontFamily: 'JetBrains Mono, monospace',
              color: isActive ? 'var(--cyan)' : 'var(--text)',
              fontWeight: isActive ? 700 : 400,
            }}>{tab.label}</span>
            {isDisabled && (
              <span style={{
                position: 'absolute', bottom: '4px',
                fontSize: '8px', color: 'var(--amber)',
                background: 'rgba(255,171,0,0.1)',
                padding: '1px 6px', borderRadius: '3px',
              }}>SOON</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
