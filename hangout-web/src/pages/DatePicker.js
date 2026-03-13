import { useState, useRef, useEffect } from 'react';

const DAYS   = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

// value: MM/DD/YYYY string  |  onChange(mmddyyyy)
// min / max: Date objects (optional)
export default function DatePicker({ value, onChange, min, max, placeholder = 'MM/DD/YYYY', error, success, inputBackground = '#13131f' }) {
  const today    = new Date(); today.setHours(0,0,0,0);
  const minDate  = min  ?? null;
  const maxDate  = max  ?? null;

  // Parse value → Date or null
  function parseValue(v) {
    if (!v || v.length < 10) return null;
    const [mm, dd, yyyy] = v.split('/');
    if (!mm || !dd || !yyyy) return null;
    const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    return isNaN(d) ? null : d;
  }

  const selected    = parseValue(value);
  const initDate    = selected ?? today;

  const [open,      setOpen]      = useState(false);
  const [viewYear,  setViewYear]  = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const [typed,     setTyped]     = useState(value || '');
  const [mode,      setMode]      = useState('days'); // 'days' | 'months' | 'years'

  const containerRef = useRef(null);

  // Sync typed display with prop value
  useEffect(() => { setTyped(value || ''); }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setMode('days');
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  function isDisabled(d) {
    if (minDate != null && d < minDate) return true;
    if (maxDate != null && d > maxDate) return true;
    return false;
  }

  function selectDay(d) {
    if (isDisabled(d)) return;
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    const str  = `${mm}/${dd}/${yyyy}`;
    setTyped(str);
    onChange?.(str);
    setOpen(false);
    setMode('days');
  }

  function handleTyped(e) {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2);
    if (v.length >= 6) v = v.slice(0,5) + '/' + v.slice(5);
    v = v.slice(0, 10);
    setTyped(v);
    // Only propagate when complete and valid
    if (v.length === 10) {
      const parsed = parseValue(v);
      if (parsed && !isDisabled(parsed)) {
        onChange?.(v);
        setViewYear(parsed.getFullYear());
        setViewMonth(parsed.getMonth());
      }
    } else {
      onChange?.(v);
    }
  }

  // Build calendar grid
  function buildDays() {
    const first   = new Date(viewYear, viewMonth, 1);
    const start   = first.getDay(); // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevDays    = new Date(viewYear, viewMonth, 0).getDate();
    const cells = [];
    // Prev month filler
    for (let i = start - 1; i >= 0; i--)
      cells.push({ day: prevDays - i, cur: false });
    // Current month
    for (let d = 1; d <= daysInMonth; d++)
      cells.push({ day: d, cur: true });
    // Next month filler
    while (cells.length % 7 !== 0)
      cells.push({ day: cells.length - daysInMonth - start + 1, cur: false });
    return cells;
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // Year range for year picker
  const yearStart = Math.floor(viewYear / 12) * 12;
  const years     = Array.from({ length: 12 }, (_, i) => yearStart + i);

  const borderColor = error   ? 'rgba(239,68,68,0.6)'
                    : success ? 'rgba(16,185,129,0.5)'
                    : open    ? 'rgba(124,58,237,0.5)'
                    : 'rgba(255,255,255,0.07)';

  return (
    <div ref={containerRef} style={{ position: 'relative', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Text input ── */}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder={placeholder}
          maxLength={10}
          value={typed}
          onChange={handleTyped}
          onFocus={() => { setOpen(true); setMode('days'); }}
          style={{
            width: '100%', padding: '14px 44px 14px 18px',
            borderRadius: 12, background: inputBackground,
            border: `1px solid ${borderColor}`,
            fontFamily: "'DM Sans', sans-serif", fontSize: '0.95rem',
            color: '#f0eeff', outline: 'none', boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
        />
        {/* Calendar icon button */}
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); setOpen(o => !o); setMode('days'); }}
          style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', padding: 4, cursor: 'pointer',
            display: 'flex', alignItems: 'center',
            color: open ? '#a855f7' : '#8882aa',
            borderRadius: 6, transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#a855f7'}
          onMouseLeave={e => e.currentTarget.style.color = open ? '#a855f7' : '#8882aa'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8"  y1="2" x2="8"  y2="6"/>
            <line x1="3"  y1="10" x2="21" y2="10"/>
          </svg>
        </button>
      </div>

      {/* ── Dropdown ── */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 200,
          background: '#13131f', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, padding: 16, width: 280,
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          animation: 'dpFadeIn 0.15s ease',
        }}>

          {/* ── Header ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button type="button" onClick={prevMonth} style={navBtnStyle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>

            <div style={{ display: 'flex', gap: 6 }}>
              {/* Month label — click to switch to month picker */}
              <button type="button" onClick={() => setMode(m => m === 'months' ? 'days' : 'months')} style={labelBtnStyle}>
                {MONTHS[viewMonth]}
              </button>
              {/* Year label — click to switch to year picker */}
              <button type="button" onClick={() => setMode(m => m === 'years' ? 'days' : 'years')} style={labelBtnStyle}>
                {viewYear}
              </button>
            </div>

            <button type="button" onClick={nextMonth} style={navBtnStyle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          {/* ── Month picker ── */}
          {mode === 'months' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {MONTHS.map((m, i) => (
                <button key={m} type="button"
                  onClick={() => { setViewMonth(i); setMode('days'); }}
                  style={{
                    ...cellBase,
                    background: viewMonth === i ? 'linear-gradient(135deg,#7c3aed,#e040fb)' : 'transparent',
                    color: viewMonth === i ? 'white' : '#c4bfe8',
                    borderRadius: 8, padding: '8px 4px', fontSize: '0.78rem',
                  }}>
                  {m.slice(0,3)}
                </button>
              ))}
            </div>
          )}

          {/* ── Year picker ── */}
          {mode === 'years' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {years.map(y => (
                  <button key={y} type="button"
                    onClick={() => { setViewYear(y); setMode('days'); }}
                    style={{
                      ...cellBase,
                      background: viewYear === y ? 'linear-gradient(135deg,#7c3aed,#e040fb)' : 'transparent',
                      color: viewYear === y ? 'white' : '#c4bfe8',
                      borderRadius: 8, padding: '8px 4px', fontSize: '0.78rem',
                    }}>
                    {y}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <button type="button" onClick={() => setViewYear(y => y - 12)} style={navBtnStyle}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                <button type="button" onClick={() => setViewYear(y => y + 12)} style={navBtnStyle}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ── Day grid ── */}
          {mode === 'days' && (
            <>
              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
                {DAYS.map(d => (
                  <div key={d} style={{
                    textAlign: 'center', fontSize: '0.72rem', fontWeight: 700,
                    color: '#8882aa', padding: '4px 0', letterSpacing: '0.05em',
                  }}>{d}</div>
                ))}
              </div>

              {/* Day cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {buildDays().map((cell, i) => {
                  const cellDate = new Date(viewYear, viewMonth + (cell.cur ? 0 : cell.day > 15 ? -1 : 1), cell.day);
                  cellDate.setHours(0,0,0,0);
                  const disabled  = !cell.cur || isDisabled(cellDate);
                  const isToday   = cellDate.toDateString() === today.toDateString();
                  const isSel     = selected && cellDate.toDateString() === selected.toDateString();

                  return (
                    <button key={i} type="button"
                      disabled={disabled}
                      onClick={() => selectDay(cellDate)}
                      style={{
                        ...cellBase,
                        background: isSel
                          ? 'linear-gradient(135deg,#7c3aed,#e040fb)'
                          : isToday && !isSel
                          ? 'rgba(124,58,237,0.15)'
                          : 'transparent',
                        color: isSel      ? 'white'
                             : disabled   ? 'rgba(255,255,255,0.15)'
                             : !cell.cur  ? 'rgba(255,255,255,0.2)'
                             : isToday    ? '#a855f7'
                             : '#f0eeff',
                        borderRadius: 8,
                        border: isToday && !isSel ? '1px solid rgba(168,85,247,0.4)' : '1px solid transparent',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        fontWeight: isSel || isToday ? 700 : 400,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (!disabled && !isSel) e.currentTarget.style.background = 'rgba(124,58,237,0.2)'; }}
                      onMouseLeave={e => { if (!disabled && !isSel) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>


            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes dpFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const navBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#8882aa', display: 'flex', alignItems: 'center',
  padding: 6, borderRadius: 8,
  transition: 'color 0.15s, background 0.15s',
};

const labelBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontFamily: "'Syne', sans-serif", fontWeight: 700,
  fontSize: '0.95rem', color: '#f0eeff',
  padding: '4px 8px', borderRadius: 8,
  transition: 'background 0.15s',
};

const cellBase = {
  width: '100%', aspectRatio: '1',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem',
  border: '1px solid transparent', cursor: 'pointer',
  background: 'transparent',
};