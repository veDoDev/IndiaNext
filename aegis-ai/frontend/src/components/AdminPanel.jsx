import React, { useState, useEffect, useRef } from 'react';

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:8000';

const SEV_COLOR = { CRITICAL: '#ff3b5c', HIGH: '#ff3b5c', MEDIUM: '#ffab00', LOW: '#00c48c', CRIT: '#ff3b5c', MED: '#ffab00' };
const SCORE_COLOR = s => s >= 75 ? '#ff3b5c' : s >= 50 ? '#ffab00' : s >= 25 ? '#00d4ff' : '#00c48c';

function detectThreatType(flaggedEvents = []) {
  const text = flaggedEvents.map(e => e.description || '').join(' ').toLowerCase();
  if (text.includes('injection') || text.includes('ignore previous') || text.includes('jailbreak')) return { label: 'PROMPT INJECTION', color: '#8b5cf6' };
  if (text.includes('brute force') || text.includes('failed login') || text.includes('credential')) return { label: 'BRUTE FORCE', color: '#ff3b5c' };
  if (text.includes('export') || text.includes('exfil')) return { label: 'DATA EXFILTRATION', color: '#ff3b5c' };
  if (text.includes('privilege') || text.includes('admin') || text.includes('escalation')) return { label: 'PRIVILEGE ESCALATION', color: '#ffab00' };
  if (text.includes('off-hours') || text.includes('non-business')) return { label: 'OFF-HOURS ACCESS', color: '#ffab00' };
  if (text.includes('unknown ip') || text.includes('new ip')) return { label: 'SUSPICIOUS IP', color: '#ffab00' };
  return { label: 'ANOMALOUS BEHAVIOUR', color: '#ffab00' };
}

function loadChartJs(cb) {
  if (window.Chart) { cb(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
  s.onload = cb;
  document.head.appendChild(s);
}

export default function AdminPanel() {
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [sessions, setSessions] = useState({});
  const [simRunning, setSimRunning] = useState(false);
  const [simEvents, setSimEvents] = useState([]);
  const [simStatus, setSimStatus] = useState('');
  const [scoreHistory, setScoreHistory] = useState([]);
  const [chartReady, setChartReady] = useState(false);

  const lineChartRef = useRef(null);
  const lineChartInstance = useRef(null);
  const alertsEndRef = useRef(null);
  const pollRef = useRef(null);
  const prevScoreRef = useRef(0);
  const alertIdsRef = useRef(new Set());

  useEffect(() => {
    loadChartJs(() => setChartReady(true));
  }, []);

  // Start polling on mount
  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, []);

  useEffect(() => {
    alertsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [alerts]);

  // Update chart when score history changes
  useEffect(() => {
    if (!chartReady || !lineChartRef.current || scoreHistory.length === 0) return;
    const labels = scoreHistory.map((_, i) => `T+${i * 2}s`);
    if (lineChartInstance.current) {
      lineChartInstance.current.data.labels = labels;
      lineChartInstance.current.data.datasets[0].data = scoreHistory;
      lineChartInstance.current.update('none');
      return;
    }
    lineChartInstance.current = new window.Chart(lineChartRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Threat Score',
          data: scoreHistory,
          borderColor: '#ff3b5c',
          backgroundColor: 'rgba(255,59,92,0.08)',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#ff3b5c',
          tension: 0.4,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: { legend: { display: false } },
        scales: {
          y: {
            min: 0, max: 100,
            ticks: { color: '#64748b', font: { size: 10 }, stepSize: 25 },
            grid: { color: 'rgba(255,255,255,0.04)' },
          },
          x: {
            ticks: { color: '#64748b', font: { size: 9 }, maxTicksLimit: 8 },
            grid: { color: 'rgba(255,255,255,0.04)' },
          }
        }
      }
    });
  }, [scoreHistory, chartReady]);

  function startPolling() {
    // Poll every 2 seconds
    pollRef.current = setInterval(pollSession, 2000);
    setConnected(true);
  }

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    setConnected(false);
  }

  async function pollSession() {
    try {
      const res = await fetch(`${API_URL}/session/attacker_demo`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.error) return;

      const score = data.threat_score || 0;
      const severity = data.severity || 'LOW';
      const verdict = data.verdict || 'NORMAL';
      const confidence = data.confidence || 0.75;
      const flaggedEvents = data.flagged_events || [];

      // Update session state
      setSessions({
        attacker_demo: {
          threat_score: score,
          severity,
          verdict,
          confidence,
          last_action: data.events?.[data.events.length - 1]?.action || '',
          user_id: 'attacker_demo',
        }
      });

      // Update score history
      if (score > 0) {
        setScoreHistory(prev => [...prev.slice(-29), score]);
      }

      // Fire alert if threshold crossed (score >= 75 and not already alerted)
      const alertId = `${score}-${flaggedEvents.length}`;
      if (score >= 75 && !alertIdsRef.current.has(alertId) && flaggedEvents.length > 0) {
        alertIdsRef.current.add(alertId);
        const threatType = detectThreatType(flaggedEvents);
        setAlerts(prev => [{
          id: Date.now(),
          user_id: 'attacker_demo',
          threat_score: score,
          severity,
          verdict,
          confidence,
          flagged_events: flaggedEvents,
          threatType,
          recommended_action: verdict === 'ANOMALY'
            ? 'Immediately invalidate the active session. Block the originating IP. Require MFA re-authentication. Escalate to security team.'
            : 'Monitor session closely.',
          time: new Date().toLocaleTimeString(),
        }, ...prev].slice(0, 50));
      }

      setConnected(true);
    } catch {
      setConnected(false);
    }
  }

  async function startSimulation() {
    setSimRunning(true);
    setSimEvents([]);
    setAlerts([]);
    setSessions({});
    setScoreHistory([]);
    alertIdsRef.current = new Set();
    setSimStatus('Streaming attack scenario...');
    if (lineChartInstance.current) { lineChartInstance.current.destroy(); lineChartInstance.current = null; }

    try {
      // Reset session first
      await fetch(`${API_URL}/simulate/stop`, { method: 'POST' }).catch(() => {});
      await new Promise(r => setTimeout(r, 500));

      const res = await fetch(`${API_URL}/simulate/attack`, { method: 'POST' });
      const data = await res.json();

      if (data.status === 'simulation started') {
        setSimStatus('Watch the threat meter climb...');
        // Mirror the scenario events in the UI with delays
        const scenario = data.scenario || [];
        scenario.forEach(({ delay, action, ip }) => {
          setTimeout(() => {
            setSimEvents(prev => [...prev, {
              id: Date.now() + delay,
              time: new Date().toLocaleTimeString(),
              action, ip,
            }].slice(-20));
          }, delay * 1000);
        });
        setTimeout(() => { setSimRunning(false); setSimStatus('Simulation complete'); }, 35000);
      }
    } catch {
      setSimStatus('Failed — is backend running?');
      setSimRunning(false);
    }
  }

  async function stopSimulation() {
    await fetch(`${API_URL}/simulate/stop`, { method: 'POST' }).catch(() => {});
    setSimRunning(false); setSimEvents([]); setSessions({}); setAlerts([]);
    setScoreHistory([]); setSimStatus('');
    alertIdsRef.current = new Set();
    if (lineChartInstance.current) { lineChartInstance.current.destroy(); lineChartInstance.current = null; }
  }

  const panel = { background: '#0d1117', border: '0.5px solid #1e2a3a', borderRadius: '10px', padding: '14px', marginBottom: '14px' };
  const secLbl = (text, color = '#00d4ff') => (
    <div style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#64748b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ width: '3px', height: '9px', background: color, borderRadius: '2px', display: 'inline-block' }} />
      {text}
    </div>
  );

  const latestScore = scoreHistory[scoreHistory.length - 1] || 0;
  const critCount = alerts.filter(a => ['CRIT', 'CRITICAL'].includes(a.severity)).length;
  const threatCounts = alerts.reduce((acc, a) => { const k = a.threatType?.label || 'UNKNOWN'; acc[k] = (acc[k] || 0) + 1; return acc; }, {});

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#dde4f0' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '0.5px solid #1e2a3a' }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '13px', fontWeight: 700, color: '#00d4ff', letterSpacing: '1px' }}>DAEMON MODE — LIVE MONITORING</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>Real-time threat detection across all active sessions</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: connected ? '#00c48c' : '#ff3b5c' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: connected ? '#00c48c' : '#ff3b5c', animation: connected ? 'pulse 2s infinite' : 'none' }} />
          {connected ? 'DAEMON CONNECTED' : 'CONNECTING...'}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '14px' }}>
        {[
          { label: 'ACTIVE SESSIONS', value: Object.keys(sessions).length, color: '#00d4ff' },
          { label: 'ALERTS FIRED', value: alerts.length, color: alerts.length > 0 ? '#ff3b5c' : '#00c48c' },
          { label: 'CRITICAL', value: critCount, color: critCount > 0 ? '#ff3b5c' : '#00c48c' },
          { label: 'LIVE SCORE', value: latestScore, color: SCORE_COLOR(latestScore) },
        ].map((s, i) => (
          <div key={i} style={{ background: '#161b24', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '0.5px solid #1e2a3a' }}>
            <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '5px' }}>{s.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Threat Score Timeline */}
      <div style={panel}>
        {secLbl('THREAT SCORE TIMELINE', '#ff3b5c')}
        {scoreHistory.length === 0 ? (
          <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '11px', border: '0.5px dashed #1e2a3a', borderRadius: '6px' }}>
            Start simulation to see live score progression →
          </div>
        ) : (
          <div style={{ position: 'relative', width: '100%', height: '140px' }}>
            <canvas ref={lineChartRef} />
          </div>
        )}
      </div>

      {/* Session Threat Meters */}
      {Object.keys(sessions).length > 0 && (
        <div style={panel}>
          {secLbl('SESSION THREAT METERS')}
          {Object.entries(sessions).map(([uid, s]) => {
            const conf = Math.round((s.confidence || 0.75) * 100);
            return (
              <div key={uid} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>{uid}</span>
                  <span style={{ color: SCORE_COLOR(s.threat_score || 0), fontWeight: 700 }}>{s.threat_score || 0} / 100 — {s.severity || 'LOW'}</span>
                </div>
                <div style={{ height: '7px', background: '#080b10', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
                  <div style={{ height: '100%', width: `${s.threat_score || 0}%`, background: `linear-gradient(90deg, #ffab00, ${SCORE_COLOR(s.threat_score || 0)})`, borderRadius: '4px', transition: 'width 0.8s ease-out' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>Model Confidence</span>
                  <span style={{ color: '#00d4ff' }}>{conf}%</span>
                </div>
                <div style={{ height: '4px', background: '#080b10', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${conf}%`, background: 'linear-gradient(90deg, #00d4ff, #8b5cf6)', borderRadius: '2px', transition: 'width 0.8s ease-out' }} />
                </div>
                {s.last_action && <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>Last: {s.last_action}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Simulation Controls */}
      <div style={panel}>
        {secLbl('ATTACK SIMULATION')}
        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px', lineHeight: 1.6 }}>
          Simulates: brute force → credential stuffing → data exfiltration → prompt injection.
          Mirrors what the aegis.js SDK sends from a real integrated website.
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={startSimulation} disabled={simRunning} style={{
            flex: 1, padding: '10px', border: 'none', borderRadius: '6px',
            background: simRunning ? 'rgba(0,212,255,0.3)' : '#00d4ff',
            color: '#000', fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '12px', cursor: simRunning ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}>
            {simRunning ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span> SIMULATING...</> : '▶ START ATTACK SIMULATION'}
          </button>
          {simRunning && (
            <button onClick={stopSimulation} style={{ padding: '10px 14px', border: '0.5px solid #ff3b5c', borderRadius: '6px', background: 'transparent', color: '#ff3b5c', fontFamily: 'Syne, sans-serif', fontSize: '11px', cursor: 'pointer' }}>STOP</button>
          )}
        </div>
        {simStatus && <div style={{ marginTop: '8px', fontSize: '10px', color: '#ffab00' }}>◈ {simStatus}</div>}
      </div>

      {/* Live Event Stream */}
      {simEvents.length > 0 && (
        <div style={panel}>
          {secLbl('LIVE EVENT STREAM')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
            {simEvents.map(ev => {
              const hostile = ['inject', 'ignore', 'export', 'bulk', 'admin', 'failed', 'escalat'].some(k => ev.action.toLowerCase().includes(k));
              return (
                <div key={ev.id} style={{ display: 'flex', gap: '8px', fontSize: '10px', padding: '5px 8px', background: '#161b24', borderRadius: '4px', borderLeft: `2px solid ${hostile ? '#ff3b5c' : '#1e2a3a'}` }}>
                  <span style={{ color: '#64748b', minWidth: '60px' }}>{ev.time}</span>
                  <span style={{ color: '#64748b', minWidth: '90px', flexShrink: 0 }}>{ev.ip}</span>
                  <span style={{ flex: 1, color: hostile ? '#ff8099' : '#dde4f0' }}>{ev.action}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Threat Type Breakdown */}
      {Object.keys(threatCounts).length > 0 && (
        <div style={panel}>
          {secLbl('THREAT TYPE BREAKDOWN')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(threatCounts).map(([type, count], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '10px', color: '#dde4f0', minWidth: '200px' }}>{type}</div>
                <div style={{ flex: 1, height: '6px', background: '#080b10', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(count / alerts.length) * 100}%`, background: '#ff3b5c', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ fontSize: '10px', color: '#ff3b5c', minWidth: '20px', textAlign: 'right' }}>{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert Feed */}
      <div style={{ ...panel, border: `0.5px solid ${alerts.length > 0 ? 'rgba(255,59,92,0.4)' : '#1e2a3a'}` }}>
        {secLbl(`ALERT FEED${alerts.length > 0 ? ` — ${alerts.length} ALERT${alerts.length > 1 ? 'S' : ''}` : ''}`, alerts.length > 0 ? '#ff3b5c' : '#64748b')}
        {alerts.length === 0 ? (
          <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', padding: '20px 0' }}>
            No alerts yet — start simulation or send events via SDK
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
            {alerts.map(alert => (
              <div key={alert.id} style={{ background: 'rgba(255,59,92,0.04)', border: '0.5px solid rgba(255,59,92,0.25)', borderLeft: '3px solid #ff3b5c', borderRadius: '8px', padding: '12px', animation: 'fadeIn 0.4s ease-out' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '9px', background: 'rgba(255,59,92,0.15)', color: '#ff3b5c', padding: '2px 8px', borderRadius: '3px', border: '0.5px solid rgba(255,59,92,0.3)', letterSpacing: '0.5px' }}>THREAT DETECTED</span>
                    <span style={{ fontSize: '9px', background: 'rgba(139,92,246,0.12)', color: alert.threatType?.color || '#8b5cf6', padding: '2px 8px', borderRadius: '3px', border: `0.5px solid ${alert.threatType?.color || '#8b5cf6'}55`, letterSpacing: '0.5px' }}>
                      {alert.threatType?.label || 'ANOMALY'}
                    </span>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>{alert.time}</span>
                  </div>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: '#ff3b5c' }}>{alert.threat_score}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '5px', marginBottom: '10px' }}>
                  {[
                    { label: 'USER', value: alert.user_id },
                    { label: 'SEVERITY', value: alert.severity, color: SEV_COLOR[alert.severity] },
                    { label: 'CONFIDENCE', value: `${Math.round((alert.confidence || 0) * 100)}%`, color: '#00d4ff' },
                    { label: 'VERDICT', value: alert.verdict || 'ANOMALY', color: '#ff3b5c' },
                  ].map((c, i) => (
                    <div key={i} style={{ background: '#161b24', borderRadius: '5px', padding: '6px 8px' }}>
                      <div style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.5px', marginBottom: '3px' }}>{c.label}</div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: c.color || '#dde4f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.value}</div>
                    </div>
                  ))}
                </div>

                {alert.flagged_events && alert.flagged_events.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                    {alert.flagged_events.slice(0, 4).map((ev, i) => (
                      <div key={i} style={{ fontSize: '10px', padding: '5px 8px', background: '#161b24', borderRadius: '4px', borderLeft: `2px solid ${SEV_COLOR[ev.severity] || '#ffab00'}`, color: '#dde4f0' }}>
                        <span style={{ color: '#64748b', marginRight: '6px' }}>{ev.timestamp}</span>
                        {ev.description}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ fontSize: '10px', color: '#00d4ff', lineHeight: 1.6, borderTop: '0.5px solid #1e2a3a', paddingTop: '8px' }}>
                  ⟶ {alert.recommended_action}
                </div>
              </div>
            ))}
            <div ref={alertsEndRef} />
          </div>
        )}
      </div>

      {/* SDK Snippet */}
      <div style={panel}>
        {secLbl('SDK INTEGRATION — ONE LINE')}
        <div style={{ background: '#080b10', border: '0.5px solid #1e2a3a', borderRadius: '6px', padding: '10px', fontSize: '10px', color: '#00d4ff', lineHeight: 1.8, overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {`<script src="${API_URL}/sdk/aegis.js" data-client-key="YOUR_KEY"></script>`}
        </div>
        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '8px', lineHeight: 1.6 }}>
          Paste into your website &lt;head&gt;. Auto-captures logins, navigation, API calls and chatbot inputs. Zero code changes required.
        </div>
      </div>
    </div>
  );
}