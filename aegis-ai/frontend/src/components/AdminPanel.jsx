import React, { useState, useEffect, useRef } from 'react';

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:8000';
const WS_URL = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');

const SEVERITY_COLOR = {
  CRITICAL: 'var(--red)',
  HIGH: 'var(--red)',
  MEDIUM: 'var(--amber)',
  LOW: 'var(--green)',
  CRIT: 'var(--red)',
  MED: 'var(--amber)',
};

const SCORE_COLOR = (score) => {
  if (score >= 75) return 'var(--red)';
  if (score >= 50) return 'var(--amber)';
  if (score >= 25) return 'var(--cyan)';
  return 'var(--green)';
};

export default function AdminPanel() {
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [sessions, setSessions] = useState({});
  const [simRunning, setSimRunning] = useState(false);
  const [simEvents, setSimEvents] = useState([]);
  const [simStatus, setSimStatus] = useState('');
  const wsRef = useRef(null);
  const alertsEndRef = useRef(null);

  // Auto scroll alerts
  useEffect(() => {
    alertsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [alerts, simEvents]);

  // WebSocket connection
  useEffect(() => {
    connectWS();
    return () => wsRef.current?.close();
  }, []);

  function connectWS() {
    const ws = new WebSocket(`${WS_URL}/ws/alerts/demo`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log('[AEGIS] WebSocket connected');
    };

    ws.onclose = () => {
      setConnected(false);
      // Reconnect after 3 seconds
      setTimeout(connectWS, 3000);
    };

    ws.onerror = () => setConnected(false);

    ws.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        handleMessage(payload);
      } catch (err) {
        console.error('WS parse error', err);
      }
    };

    // Keep-alive ping
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send('ping');
    }, 30000);
    ws.onclose = () => { clearInterval(ping); setConnected(false); setTimeout(connectWS, 3000); };
  }

  function handleMessage(payload) {
    if (payload.type === 'ALERT') {
      setAlerts(prev => [{
        ...payload,
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
      }, ...prev].slice(0, 50));
    } else if (payload.type === 'SCORE_UPDATE') {
      setSessions(prev => ({
        ...prev,
        [payload.user_id]: payload,
      }));
    } else if (payload.type === 'SIM_EVENT') {
      setSimEvents(prev => [...prev, {
        ...payload,
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
      }].slice(-20));
      setSessions(prev => ({
        ...prev,
        [payload.user_id]: {
          ...prev[payload.user_id],
          last_action: payload.action,
        },
      }));
    }
  }

  async function startSimulation() {
    setSimRunning(true);
    setSimEvents([]);
    setAlerts([]);
    setSessions({});
    setSimStatus('Attack simulation running...');

    try {
      const res = await fetch(`${API_URL}/simulate/attack`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'simulation started') {
        setSimStatus('Streaming events — watch the threat meter climb...');
        setTimeout(() => { setSimRunning(false); setSimStatus('Simulation complete'); }, 35000);
      }
    } catch (err) {
      setSimStatus('Failed to start simulation — is backend running?');
      setSimRunning(false);
    }
  }

  async function stopSimulation() {
    await fetch(`${API_URL}/simulate/stop`, { method: 'POST' });
    setSimRunning(false);
    setSimEvents([]);
    setSessions({});
    setAlerts([]);
    setSimStatus('');
  }

  const activeUsers = Object.keys(sessions).length;
  const criticalCount = alerts.filter(a => a.severity === 'CRIT' || a.severity === 'CRITICAL').length;

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '0.5px solid var(--border)' }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: 700, color: 'var(--cyan)', letterSpacing: '1px' }}>
            DAEMON MODE — LIVE MONITORING
          </div>
          <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '3px' }}>
            Real-time threat detection across all active sessions
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: connected ? 'var(--green)' : 'var(--red)', animation: connected ? 'pulse 2s infinite' : 'none' }} />
          <span style={{ color: connected ? 'var(--green)' : 'var(--red)' }}>
            {connected ? 'DAEMON CONNECTED' : 'RECONNECTING...'}
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '16px' }}>
        {[
          { label: 'ACTIVE SESSIONS', value: activeUsers, color: 'var(--cyan)' },
          { label: 'ALERTS FIRED', value: alerts.length, color: alerts.length > 0 ? 'var(--red)' : 'var(--green)' },
          { label: 'CRITICAL', value: criticalCount, color: criticalCount > 0 ? 'var(--red)' : 'var(--green)' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--s2)', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '0.5px solid var(--border)' }}>
            <div style={{ fontSize: '9px', color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '5px' }}>{s.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Simulation Controls */}
      <div style={{ background: 'var(--s1)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
        <div style={{ fontSize: '9px', color: 'var(--muted)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '3px', height: '9px', background: 'var(--cyan)', borderRadius: '2px', display: 'inline-block' }} />
          ATTACK SIMULATION
        </div>
        <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '12px', lineHeight: 1.6 }}>
          Simulates a real attack scenario: brute force → credential stuffing → data exfiltration → prompt injection.
          Mimics what the aegis.js SDK sends from a host website in real time.
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={startSimulation}
            disabled={simRunning}
            style={{
              flex: 1, padding: '10px', border: 'none', borderRadius: '6px',
              background: simRunning ? 'rgba(0,212,255,0.3)' : 'var(--cyan)',
              color: '#000', fontFamily: 'Syne, sans-serif', fontWeight: 700,
              fontSize: '12px', cursor: simRunning ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
          >
            {simRunning
              ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span> SIMULATING...</>
              : '▶ START ATTACK SIMULATION'}
          </button>
          {simRunning && (
            <button onClick={stopSimulation} style={{ padding: '10px 16px', border: '0.5px solid var(--red)', borderRadius: '6px', background: 'transparent', color: 'var(--red)', fontFamily: 'Syne, sans-serif', fontSize: '11px', cursor: 'pointer' }}>
              STOP
            </button>
          )}
        </div>
        {simStatus && (
          <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--amber)' }}>
            ◈ {simStatus}
          </div>
        )}
      </div>

      {/* Live Event Feed */}
      {simEvents.length > 0 && (
        <div style={{ background: 'var(--s1)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ fontSize: '9px', color: 'var(--muted)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '3px', height: '9px', background: 'var(--cyan)', borderRadius: '2px', display: 'inline-block' }} />
            LIVE EVENT STREAM
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
            {simEvents.map(ev => (
              <div key={ev.id} style={{ display: 'flex', gap: '8px', fontSize: '10px', padding: '5px 8px', background: 'var(--s2)', borderRadius: '4px', animation: 'fadeIn 0.3s ease-out' }}>
                <span style={{ color: 'var(--muted)', minWidth: '54px' }}>{ev.time}</span>
                <span style={{ color: 'var(--muted)', minWidth: '90px' }}>{ev.ip}</span>
                <span style={{ flex: 1, color: 'var(--text)' }}>{ev.action}</span>
              </div>
            ))}
            <div ref={alertsEndRef} />
          </div>
        </div>
      )}

      {/* Session Threat Meters */}
      {Object.keys(sessions).length > 0 && (
        <div style={{ background: 'var(--s1)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ fontSize: '9px', color: 'var(--muted)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '3px', height: '9px', background: 'var(--cyan)', borderRadius: '2px', display: 'inline-block' }} />
            ACTIVE SESSION THREAT METERS
          </div>
          {Object.entries(sessions).map(([uid, s]) => (
            <div key={uid} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '5px' }}>
                <span style={{ color: 'var(--muted)' }}>{uid}</span>
                <span style={{ color: SCORE_COLOR(s.threat_score || 0), fontWeight: 700 }}>
                  {s.threat_score || 0} / 100 — {s.severity || 'LOW'}
                </span>
              </div>
              <div style={{ height: '7px', background: 'var(--bg)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${s.threat_score || 0}%`,
                  background: `linear-gradient(90deg, var(--amber), ${SCORE_COLOR(s.threat_score || 0)})`,
                  borderRadius: '4px',
                  transition: 'width 0.8s ease-out',
                }} />
              </div>
              {s.last_action && (
                <div style={{ fontSize: '9px', color: 'var(--muted)', marginTop: '3px' }}>
                  Last: {s.last_action}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Alert Feed */}
      <div style={{ background: 'var(--s1)', border: `0.5px solid ${alerts.length > 0 ? 'rgba(255,59,92,0.4)' : 'var(--border)'}`, borderRadius: '10px', padding: '14px' }}>
        <div style={{ fontSize: '9px', color: alerts.length > 0 ? 'var(--red)' : 'var(--muted)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '3px', height: '9px', background: alerts.length > 0 ? 'var(--red)' : 'var(--muted)', borderRadius: '2px', display: 'inline-block' }} />
          ALERT FEED {alerts.length > 0 && `— ${alerts.length} ALERT${alerts.length > 1 ? 'S' : ''}`}
        </div>
        {alerts.length === 0 ? (
          <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>
            No alerts yet — start simulation or send events via SDK
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
            {alerts.map(alert => (
              <div key={alert.id} style={{
                background: 'rgba(255,59,92,0.05)',
                border: '0.5px solid rgba(255,59,92,0.3)',
                borderLeft: '3px solid var(--red)',
                borderRadius: '8px', padding: '12px',
                animation: 'fadeIn 0.4s ease-out',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '9px', background: 'rgba(255,59,92,0.15)', color: 'var(--red)', padding: '2px 8px', borderRadius: '3px', border: '0.5px solid rgba(255,59,92,0.3)', letterSpacing: '0.5px' }}>
                      🚨 THREAT DETECTED
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{alert.time}</span>
                  </div>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--red)' }}>
                    {alert.threat_score}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px', marginBottom: '8px' }}>
                  {[
                    { label: 'USER', value: alert.user_id },
                    { label: 'SEVERITY', value: alert.severity, color: SEVERITY_COLOR[alert.severity] },
                    { label: 'CONFIDENCE', value: `${Math.round((alert.confidence || 0) * 100)}%`, color: 'var(--cyan)' },
                  ].map((c, i) => (
                    <div key={i} style={{ background: 'var(--s2)', borderRadius: '5px', padding: '6px 8px' }}>
                      <div style={{ fontSize: '8px', color: 'var(--muted)', letterSpacing: '0.5px', marginBottom: '3px' }}>{c.label}</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: c.color || 'var(--text)' }}>{c.value}</div>
                    </div>
                  ))}
                </div>
                {alert.flagged_events && alert.flagged_events.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                    {alert.flagged_events.slice(0, 3).map((ev, i) => (
                      <div key={i} style={{ fontSize: '10px', padding: '5px 8px', background: 'var(--s2)', borderRadius: '4px', borderLeft: `2px solid ${SEVERITY_COLOR[ev.severity] || 'var(--amber)'}`, color: 'var(--text)' }}>
                        {ev.description}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: '10px', color: 'var(--cyan)', lineHeight: 1.6 }}>
                  ⟶ {alert.recommended_action}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SDK Integration snippet */}
      <div style={{ background: 'var(--s1)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px', marginTop: '16px' }}>
        <div style={{ fontSize: '9px', color: 'var(--muted)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '3px', height: '9px', background: 'var(--cyan)', borderRadius: '2px', display: 'inline-block' }} />
          SDK INTEGRATION — ONE LINE
        </div>
        <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '6px', padding: '10px', fontSize: '10px', color: 'var(--cyan)', lineHeight: 1.8, overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {`<script src="${API_URL}/sdk/aegis.js" data-client-key="YOUR_KEY"></script>`}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '8px', lineHeight: 1.6 }}>
          Paste into your website &lt;head&gt;. Auto-captures login events, navigation, API calls and chatbot inputs. Zero code changes required.
        </div>
      </div>
    </div>
  );
}