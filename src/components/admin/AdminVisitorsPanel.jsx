/**
 * AdminVisitorsPanel — Real-time visitor analytics for TingleTap Admin Panel
 * Data source: Firebase RTDB siteVisitors/active & siteVisitors/daily
 */
import React, { useState, useEffect, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../../firebase/config';
import './AdminVisitorsPanel.css';

// ── Small reusable bar ────────────────────────────────────────────────────────
const MiniBar = ({ label, value, max, color }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="avp-bar-row">
      <span className="avp-bar-label">{label}</span>
      <div className="avp-bar-track">
        <div className="avp-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="avp-bar-value">{value}</span>
    </div>
  );
};

// ── Day-chart bar ─────────────────────────────────────────────────────────────
const DayBar = ({ date, count, max, isToday }) => {
  const pct = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 4;
  const label = isToday ? 'Today' : new Date(date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
  return (
    <div className="avp-day-col">
      <span className="avp-day-count">{count}</span>
      <div className="avp-day-track">
        <div className="avp-day-fill" style={{ height: `${pct}%`, background: isToday ? 'linear-gradient(180deg,#7c3aed,#a855f7)' : 'linear-gradient(180deg,#c4b5fd,#ddd6fe)' }} />
      </div>
      <span className={`avp-day-label${isToday ? ' avp-day-label--today' : ''}`}>{label}</span>
    </div>
  );
};

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color, pulse }) => (
  <div className="avp-stat-card" style={{ '--avp-accent': color }}>
    <div className="avp-stat-icon" style={{ background: `${color}18` }}>
      {icon}
      {pulse && <span className="avp-pulse-ring" style={{ borderColor: color }} />}
    </div>
    <div className="avp-stat-body">
      <div className="avp-stat-value">{value}</div>
      <div className="avp-stat-label">{label}</div>
      {sub && <div className="avp-stat-sub">{sub}</div>}
    </div>
  </div>
);

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconEye = ({ c = '#7c3aed' }) => (
  <svg viewBox="0 0 24 24" width="22" height="22">
    <path fill={c} d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 12.5a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/>
  </svg>
);
const IconCalendar = ({ c = '#06b6d4' }) => (
  <svg viewBox="0 0 24 24" width="22" height="22">
    <path fill={c} d="M19 3h-1V1h-2v2H8V1H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H5V8h14v11zM7 10h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2zm-8 4h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
  </svg>
);
const IconWeek = ({ c = '#10b981' }) => (
  <svg viewBox="0 0 24 24" width="22" height="22">
    <path fill={c} d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
  </svg>
);
const IconDevice = ({ c = '#f59e0b' }) => (
  <svg viewBox="0 0 24 24" width="18" height="18">
    <path fill={c} d="M4 6h18V4H4c-1.1 0-2 .9-2 2v11H0v3h14v-3H4V6zm19 2h-6c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1zm-1 9h-4v-7h4v7z"/>
  </svg>
);
const IconBrowser = ({ c = '#a855f7' }) => (
  <svg viewBox="0 0 24 24" width="18" height="18">
    <path fill={c} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1a2 2 0 002 2v1.93zm6.9-2.54A1.99 1.99 0 0016 14h-1v-3a1 1 0 00-1-1H8v-2h2a1 1 0 000-2H8V4.07c3.95.49 7 3.85 7 7.93 0 1.91-.67 3.66-1.77 5.04-.01-.01-.02-.01-.03-.01-.01-.01-.02-.01-.03-.01 0-.01-.03 0-.04-.01l-.23-.61z"/>
  </svg>
);
const IconUser = ({ c = '#3b82f6' }) => (
  <svg viewBox="0 0 24 24" width="18" height="18">
    <path fill={c} d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);
const IconPage = ({ c = '#ec4899' }) => (
  <svg viewBox="0 0 24 24" width="18" height="18">
    <path fill={c} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 7V3.5L18.5 9H13zM8 17h8v2H8zm0-4h8v2H8zm0-4h4v2H8z"/>
  </svg>
);
const IconTrend = ({ c = '#7c3aed' }) => (
  <svg viewBox="0 0 24 24" width="18" height="18">
    <path fill={c} d="M3.5 18.5l6-6 4 4L22 6.92 20.59 5.5l-7.09 8-4-4L2 17l1.5 1.5z"/>
  </svg>
);

// ── Main Component ────────────────────────────────────────────────────────────
const AdminVisitorsPanel = () => {
  const [active, setActive] = useState({});
  const [daily, setDaily] = useState({});
  const [loading, setLoading] = useState(true);

  // Real-time active visitors
  useEffect(() => {
    const r = ref(rtdb, 'siteVisitors/active');
    const unsub = onValue(r, (snap) => {
      setActive(snap.val() || {});
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  // Daily counters (last 14 days)
  useEffect(() => {
    const r = ref(rtdb, 'siteVisitors/daily');
    const unsub = onValue(r, (snap) => setDaily(snap.val() || {}));
    return () => unsub();
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const visitors = useMemo(() => Object.values(active), [active]);

  // ── Computed stats ──────────────────────────────────────────────────────────
  const activeCount = visitors.length;
  const todayCount = daily[today] || 0;

  const last7 = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return { date: key, count: daily[key] || 0, isToday: key === today };
  }), [daily, today]);

  const weekTotal = last7.reduce((s, d) => s + d.count, 0);
  const dayMax = Math.max(...last7.map(d => d.count), 1);

  const deviceMap = useMemo(() => visitors.reduce((a, v) => { a[v.device || 'desktop'] = (a[v.device || 'desktop'] || 0) + 1; return a; }, {}), [visitors]);
  const browserMap = useMemo(() => visitors.reduce((a, v) => { a[v.browser || 'Other'] = (a[v.browser || 'Other'] || 0) + 1; return a; }, {}), [visitors]);
  const typeMap = useMemo(() => visitors.reduce((a, v) => { a[v.userType || 'anonymous'] = (a[v.userType || 'anonymous'] || 0) + 1; return a; }, {}), [visitors]);
  const pageMap = useMemo(() => {
    const m = visitors.reduce((a, v) => { const p = v.page || '/'; a[p] = (a[p] || 0) + 1; return a; }, {});
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [visitors]);

  const DEVICE_COLORS = { mobile: '#06b6d4', desktop: '#7c3aed', tablet: '#f59e0b' };
  const BROWSER_COLORS = { Chrome: '#ea580c', Safari: '#3b82f6', Firefox: '#f97316', Edge: '#0ea5e9', Opera: '#ef4444', Other: '#8b5cf6' };
  const TYPE_COLORS = { registered: '#10b981', guest: '#a855f7', anonymous: '#94a3b8' };
  const TYPE_LABELS = { registered: 'Registered', guest: 'Guest', anonymous: 'Anonymous' };

  const devMax = Math.max(...Object.values(deviceMap), 1);
  const brMax = Math.max(...Object.values(browserMap), 1);
  const tpMax = Math.max(...Object.values(typeMap), 1);
  const pgMax = pageMap[0]?.[1] || 1;

  if (loading) {
    return (
      <div className="avp-root">
        <div className="avp-loading">
          <div className="avp-spinner" />
          <span>Loading visitor data…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="avp-root">
      {/* ── Header ── */}
      <div className="avp-header">
        <div className="avp-header-left">
          <div className="avp-header-icon">
            <svg viewBox="0 0 24 24" width="26" height="26">
              <path fill="#7c3aed" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 12.5a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/>
              <circle cx="20" cy="5" r="3" fill="#10b981"/>
            </svg>
          </div>
          <div>
            <h2 className="avp-title">Visitor Analytics</h2>
            <p className="avp-subtitle">Real-time site traffic — live from Firebase</p>
          </div>
        </div>
        <div className="avp-live-badge">
          <span className="avp-live-dot" />
          Live
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="avp-stats-row">
        <StatCard
          icon={<IconEye c="#7c3aed" />}
          label="Active Now"
          value={activeCount}
          sub="On site right now"
          color="#7c3aed"
          pulse
        />
        <StatCard
          icon={<IconCalendar c="#06b6d4" />}
          label="Today's Visitors"
          value={todayCount}
          sub={today}
          color="#06b6d4"
        />
        <StatCard
          icon={<IconWeek c="#10b981" />}
          label="This Week"
          value={weekTotal}
          sub="Last 7 days"
          color="#10b981"
        />
      </div>

      {/* ── 7-Day Trend + Breakdown row ── */}
      <div className="avp-grid-2">
        {/* 7-day trend */}
        <div className="avp-card">
          <div className="avp-card-header">
            <IconTrend c="#7c3aed" />
            <span>7-Day Trend</span>
          </div>
          <div className="avp-day-chart">
            {last7.map(d => (
              <DayBar key={d.date} date={d.date} count={d.count} max={dayMax} isToday={d.isToday} />
            ))}
          </div>
        </div>

        {/* User type */}
        <div className="avp-card">
          <div className="avp-card-header">
            <IconUser c="#3b82f6" />
            <span>Visitor Type</span>
          </div>
          <div className="avp-bars-list">
            {Object.entries(typeMap).length === 0 ? (
              <span className="avp-empty">No active visitors</span>
            ) : (
              Object.entries(typeMap)
                .sort((a, b) => b[1] - a[1])
                .map(([type, cnt]) => (
                  <MiniBar key={type} label={TYPE_LABELS[type] || type} value={cnt} max={tpMax} color={TYPE_COLORS[type] || '#8b5cf6'} />
                ))
            )}
          </div>
        </div>
      </div>

      {/* ── Device + Browser ── */}
      <div className="avp-grid-2">
        <div className="avp-card">
          <div className="avp-card-header">
            <IconDevice c="#f59e0b" />
            <span>Devices</span>
          </div>
          <div className="avp-bars-list">
            {Object.entries(deviceMap).length === 0 ? (
              <span className="avp-empty">No active visitors</span>
            ) : (
              Object.entries(deviceMap)
                .sort((a, b) => b[1] - a[1])
                .map(([dev, cnt]) => (
                  <MiniBar key={dev} label={dev.charAt(0).toUpperCase() + dev.slice(1)} value={cnt} max={devMax} color={DEVICE_COLORS[dev] || '#8b5cf6'} />
                ))
            )}
          </div>
        </div>

        <div className="avp-card">
          <div className="avp-card-header">
            <IconBrowser c="#a855f7" />
            <span>Browsers</span>
          </div>
          <div className="avp-bars-list">
            {Object.entries(browserMap).length === 0 ? (
              <span className="avp-empty">No active visitors</span>
            ) : (
              Object.entries(browserMap)
                .sort((a, b) => b[1] - a[1])
                .map(([br, cnt]) => (
                  <MiniBar key={br} label={br} value={cnt} max={brMax} color={BROWSER_COLORS[br] || '#8b5cf6'} />
                ))
            )}
          </div>
        </div>
      </div>

      {/* ── Top Pages + Live List ── */}
      <div className="avp-grid-2">
        <div className="avp-card">
          <div className="avp-card-header">
            <IconPage c="#ec4899" />
            <span>Top Pages Right Now</span>
          </div>
          <div className="avp-bars-list">
            {pageMap.length === 0 ? (
              <span className="avp-empty">No active visitors</span>
            ) : (
              pageMap.map(([pg, cnt]) => (
                <MiniBar key={pg} label={pg === '/' ? 'Home' : pg.replace(/^\//, '')} value={cnt} max={pgMax} color="#ec4899" />
              ))
            )}
          </div>
        </div>

        {/* Live visitors list */}
        <div className="avp-card">
          <div className="avp-card-header">
            <IconEye c="#7c3aed" />
            <span>Live Visitors ({activeCount})</span>
          </div>
          <div className="avp-live-list">
            {visitors.length === 0 ? (
              <div className="avp-empty">No active visitors right now</div>
            ) : (
              visitors
                .sort((a, b) => (b.joinedAt || 0) - (a.joinedAt || 0))
                .slice(0, 20)
                .map((v, i) => {
                  const ago = v.joinedAt ? Math.floor((Date.now() - v.joinedAt) / 60000) : null;
                  const typeColor = TYPE_COLORS[v.userType] || '#94a3b8';
                  return (
                    <div key={i} className="avp-live-row">
                      <div className="avp-live-dot-wrap">
                        <span className="avp-live-user-dot" style={{ background: typeColor }} />
                      </div>
                      <div className="avp-live-info">
                        <span className="avp-live-page">{v.page === '/' ? 'Home' : (v.page || '/')}</span>
                        <span className="avp-live-meta">
                          {v.device} · {v.browser}
                          {v.uid && <> · <span className="avp-live-uid">{v.uid.slice(0, 8)}…</span></>}
                        </span>
                      </div>
                      <div className="avp-live-right">
                        <span className="avp-live-type" style={{ color: typeColor, borderColor: `${typeColor}33` }}>
                          {TYPE_LABELS[v.userType] || v.userType || 'anon'}
                        </span>
                        {ago !== null && (
                          <span className="avp-live-ago">{ago < 1 ? 'just now' : `${ago}m ago`}</span>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* ── RTDB rules reminder ── */}
      {activeCount === 0 && todayCount === 0 && (
        <div className="avp-rules-note">
          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#f59e0b" d="M12 2a10 10 0 100 20A10 10 0 0012 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          <span>
            <strong>RTDB Rules needed:</strong> Add write access for <code>siteVisitors/</code> in Firebase Console.{' '}
            See <code>src/utils/visitorTracking.js</code> for the exact rules.
          </span>
        </div>
      )}
    </div>
  );
};

export default AdminVisitorsPanel;
