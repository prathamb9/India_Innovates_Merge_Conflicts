'use client';
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';

const SIG_COLOR = { green: '#00ff9d', yellow: '#ffb800', red: '#ff3b5c' };
const SIG_GLOW  = { green: '0 0 12px #00ff9d99', yellow: '0 0 12px #ffb80099', red: '0 0 12px #ff3b5c99' };
const STREAM_BASE = 'http://localhost:8001';

// 4 directions  each maps to its own YOLO-pipelined MJPEG stream
const DIRECTION_VIEWS = [
    { id: 'NORTH', color: '#00f5ff',  axisLabel: 'N/S' },
    { id: 'SOUTH', color: '#00f5ff',  axisLabel: 'N/S' },
    { id: 'EAST',  color: '#a78bfa',  axisLabel: 'E/W' },
    { id: 'WEST',  color: '#a78bfa',  axisLabel: 'E/W' },
];

/* -- Stat card ----------------------------------------------- */
function StatCard({ label, value, unit = '', color = '#00f5ff', sub = '' }) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${color}22`,
            borderRadius: 12, padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 100,
        }}>
            <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'monospace', color, lineHeight: 1.1 }}>
                {value}<span style={{ fontSize: '0.75rem', marginLeft: 3, opacity: 0.7 }}>{unit}</span>
            </div>
            {sub && <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)', marginTop: 1 }}>{sub}</div>}
        </div>
    );
}

/* -- 3-bulb signal pole ---------------------------------------- */
function BigSignalLamp({ active }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 8px', background: '#050a14', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
            {['red', 'yellow', 'green'].map(c => (
                <div key={c} style={{ width: 20, height: 20, borderRadius: '50%', background: c === active ? SIG_COLOR[c] : 'rgba(255,255,255,0.05)', boxShadow: c === active ? SIG_GLOW[c] : 'none', transition: 'all 0.4s ease' }} />
            ))}
        </div>
    );
}

/* -- Animated traffic signal pole ------------------------------ */
function SignalPole({ active }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <div style={{ width: 3, height: 10, background: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
            <div style={{
                background: 'linear-gradient(180deg, #111 0%, #1a1a1a 100%)',
                border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 8,
                padding: '5px 4px', display: 'flex', flexDirection: 'column', gap: 4,
                boxShadow: active === 'green' ? '0 0 20px rgba(0,255,157,0.6)' : active === 'red' ? '0 0 20px rgba(255,59,92,0.6)' : '0 0 12px rgba(255,184,0,0.6)',
                transition: 'box-shadow 0.4s ease',
            }}>
                {['red', 'yellow', 'green'].map(c => (
                    <div key={c} style={{
                        width: 14, height: 14, borderRadius: '50%',
                        background: c === active ? SIG_COLOR[c] : 'rgba(255,255,255,0.04)',
                        boxShadow: c === active ? `0 0 10px ${SIG_COLOR[c]}, 0 0 24px ${SIG_COLOR[c]}88` : 'none',
                        transition: 'all 0.35s ease',
                        border: `1px solid ${c === active ? SIG_COLOR[c] : 'rgba(255,255,255,0.07)'}`,
                    }} />
                ))}
            </div>
            <div style={{ width: 3, height: 20, background: 'rgba(255,255,255,0.25)', borderRadius: 2 }} />
        </div>
    );
}

/* -- Per-direction camera panel -------------------------------- */
function DirectionPanel({ direction, signalState }) {
    const [streamOk, setStreamOk] = useState(true);
    const [dirStats, setDirStats] = useState(null);
    const streamUrl = `${STREAM_BASE}/video_feed/${direction.id}`;

    // Poll per-direction stats from the edge AI
    useEffect(() => {
        let cancelled = false;
        const poll = async () => {
            try {
                const res = await fetch(`${STREAM_BASE}/stats/${direction.id}`);
                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled) setDirStats(data);
                }
            } catch (_) {}
        };
        poll();
        const t = setInterval(poll, 2000);
        return () => { cancelled = true; clearInterval(t); };
    }, [direction.id]);

    // Determine signal color for this direction based on signal_state
    const axis = direction.id === 'NORTH' || direction.id === 'SOUTH' ? 'ns' : 'ew';
    let dirSignal = 'red';
    if (signalState) {
        if (signalState.mode === 'dynamic') {
            dirSignal = signalState.green_axis === axis ? 'green' : 'red';
        } else {
            // Fixed cycle: green_axis gets the phase, other axis is opposite
            if (signalState.green_axis === axis) {
                dirSignal = signalState.phase;
            } else {
                dirSignal = signalState.phase === 'green' ? 'red'
                         : signalState.phase === 'red'   ? 'green'
                         : 'yellow';
            }
        }
    }

    const density  = dirStats?.density_pct ?? 0;
    const vehicles = dirStats?.vehicle_count ?? 0;

    const isRed    = dirSignal === 'red';
    const isGreen  = dirSignal === 'green';
    const isYellow = dirSignal === 'yellow';

    return (
        <div style={{ position: 'relative', overflow: 'hidden', background: '#050a14',
            outline: `2px solid ${isGreen ? 'rgba(0,255,157,0.5)' : isRed ? 'rgba(255,59,92,0.35)' : 'rgba(255,184,0,0.35)'}`,
            transition: 'outline-color 0.4s ease' }}>

            {/* Real YOLO MJPEG stream — no color tint */}
            {streamOk ? (
                <img src={streamUrl} alt={`${direction.id} YOLO`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={() => setStreamOk(false)} />
            ) : (
                <video src="/demo.mp4" autoPlay loop muted playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}

            {/* Traffic status banner — center bottom */}
            <div style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', zIndex: 5,
                background: isGreen ? 'rgba(0,255,157,0.92)' : isRed ? 'rgba(200,30,50,0.92)' : 'rgba(200,140,0,0.92)',
                borderRadius: 6, padding: '3px 12px', whiteSpace: 'nowrap',
                border: `1px solid ${isGreen ? 'rgba(0,255,157,0.7)' : isRed ? 'rgba(255,59,92,0.7)' : 'rgba(255,184,0,0.7)'}`,
                backdropFilter: 'blur(4px)', transition: 'background 0.4s ease' }}>
                <span style={{ fontSize: '0.58rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.07em',
                    color: isGreen ? '#000' : '#fff' }}>
                    {isGreen ? 'TRAFFIC FLOWING' : isRed ? 'TRAFFIC STOPPED' : 'SIGNAL CLEARING'}
                </span>
            </div>

            {/* Stop-line stripes when RED */}
            {isRed && (
                <div style={{ position: 'absolute', bottom: 26, left: 0, right: 0, height: 4, zIndex: 4,
                    background: 'repeating-linear-gradient(90deg,#ff3b5c 0px,#ff3b5c 16px,transparent 16px,transparent 26px)',
                    opacity: 0.85, animation: 'stop-line-pulse 1.5s ease-in-out infinite' }} />
            )}

            {/* -- Physical signal pole (bottom-right) -- */}
            <div style={{ position: 'absolute', bottom: 8, right: 10, zIndex: 6 }}>
                <SignalPole active={dirSignal} />
            </div>

            {/* Direction label */}
            <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.82)', padding: '4px 10px',
                borderRadius: 5, border: `1px solid ${direction.color}40`, zIndex: 5, backdropFilter: 'blur(4px)' }}>
                <div style={{ color: direction.color, fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.05em' }}>CAM: {direction.id}</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.42rem', marginTop: 1 }}>
                    {density}% density · {vehicles} vehicles
                </div>
            </div>

            {/* REC dot */}
            <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 5, display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff3b5c', animation: 'pulse-dot 1.2s infinite' }} />
                <span style={{ fontSize: '0.37rem', fontWeight: 800, color: '#ff3b5c', fontFamily: 'monospace' }}>REC</span>
            </div>
        </div>
    );
}

/* -- Main Modal --------------------------------------------------------------- */
export default function IntersectionModal({ cam, camState, onClose }) {
    const [firestoreStats, setFirestoreStats] = useState(null);
    const [signalState,    setSignalState]    = useState(null);
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.email?.endsWith('@signalsync.in');
    const [overrideAxis,  setOverrideAxis]  = useState('ns');
    const [overridePhase, setOverridePhase] = useState('green');
    const [overrideDur,   setOverrideDur]   = useState(30);
    const [overrideMsg,   setOverrideMsg]   = useState('');

    async function applyOverride() {
        setOverrideMsg('Sending...');
        try {
            const res = await fetch(`${STREAM_BASE}/signal_override`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin-token-signalsync' },
                body: JSON.stringify({ phase: overridePhase, axis: overrideAxis, duration: overrideDur }),
            });
            const data = await res.json();
            setOverrideMsg(res.ok ? `Locked ${overridePhase.toUpperCase()} on ${overrideAxis.toUpperCase()} for ${data.duration}s` : data.error || 'Error');
        } catch { setOverrideMsg('Connection failed'); }
        setTimeout(() => setOverrideMsg(''), 4000);
    }


    // Firestore real-time stats per camera node
    useEffect(() => {
        if (!cam) return;
        const unsub = onSnapshot(
            doc(db, 'intersection_stats', cam.id),
            (snap) => { if (snap.exists()) setFirestoreStats(snap.data()); },
            (err) => console.warn('[Modal] Firestore error:', err)
        );
        return () => unsub();
    }, [cam]);

    // Poll /signal_state from the edge AI streamer every second
    useEffect(() => {
        let cancelled = false;
        const poll = async () => {
            try {
                const res = await fetch(`${STREAM_BASE}/signal_state`);
                if (res.ok && !cancelled) setSignalState(await res.json());
            } catch (_) {}
        };
        poll();
        const t = setInterval(poll, 1000);
        return () => { cancelled = true; clearInterval(t); };
    }, []);

    // ESC to close
    useEffect(() => {
        const handle = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [onClose]);

    if (!cam) return null;

    // Derive display signal from live signal_state (fallback to camState)
    let displaySignal = camState?.phase || 'red';
    let timer         = camState?.timer || 0;

    if (signalState) {
        const nsGreen = signalState.green_axis === 'ns';
        if (signalState.mode === 'dynamic') {
            displaySignal = nsGreen ? 'green' : 'red';
            timer = 0;
        } else {
            displaySignal = signalState.phase;
            timer = signalState.phase_timer || 0;
        }
    }

    const ns_density   = signalState?.ns_density ?? firestoreStats?.ns_density_pct ?? camState?.ns_density ?? 0;
    const ew_density   = signalState?.ew_density ?? firestoreStats?.ew_density_pct ?? camState?.ew_density ?? 0;
    const density      = Math.round((ns_density + ew_density) / 2);
    const vehicleCount = firestoreStats?.vehicle_count ?? 0;
    const barColor     = density < 40 ? '#00ff9d' : density < 70 ? '#ffb800' : '#ff3b5c';
    const isLive       = !!signalState;
    const modeLabel    = signalState?.mode === 'dynamic' ? 'Dynamic (density-driven)' : 'Fixed cycle';

    return (
        <div
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(2,5,12,0.92)',
                backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px',
                animation: 'fadeIn 0.2s ease',
            }}
        >
            <div style={{
                width: '100%', maxWidth: 1000,
                background: 'rgba(7,12,24,0.98)',
                border: '1px solid rgba(0,245,255,0.15)',
                borderRadius: 20, overflow: 'hidden',
                boxShadow: '0 0 60px rgba(0,0,0,0.6)',
                display: 'flex', flexDirection: 'column',
                maxHeight: '92vh',
            }}>

                {/* -- Header -- */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff9d', boxShadow: '0 0 10px #00ff9d', animation: 'pulse-dot 1.2s infinite' }} />
                            <span style={{ fontSize: '0.55rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}>
                                {cam.id} · LIVE · 4-CAM YOLO-v8n PIPELINE
                            </span>
                            {isLive && (
                                <span style={{ fontSize: '0.44rem', fontWeight: 800, color: '#00ff9d', background: 'rgba(0,255,157,0.1)', border: '1px solid rgba(0,255,157,0.3)', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.06em' }}>
                                    EDGE AI CONNECTED
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>{cam.name}</div>
                        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                            {cam.road} · {modeLabel}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.5)', fontSize: '1rem', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
                </div>

                {/* -- Body -- */}
                <div style={{ display: 'flex', gap: 0, flex: 1, overflow: 'hidden', minHeight: 0 }}>

                    {/* -- Left: 4-Camera Grid (NORTH/SOUTH/EAST/WEST) -- */}
                    <div style={{ flex: 1.6, position: 'relative', background: '#020509', minHeight: 480 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2, height: '100%' }}>
                            {DIRECTION_VIEWS.map((direction) => (
                                <DirectionPanel
                                    key={direction.id}
                                    direction={direction}
                                    signalState={signalState}
                                />
                            ))}
                        </div>

                        {/* Scanline overlay */}
                        <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'rgba(0,245,255,0.3)', animation: 'scanline 2.4s linear infinite', pointerEvents: 'none', zIndex: 10 }} />

                        {/* Footer label */}
                        <div style={{ position: 'absolute', bottom: 8, left: 8, zIndex: 10, background: 'rgba(0,0,0,0.65)', borderRadius: 5, padding: '2px 7px', fontSize: '0.44rem', fontFamily: 'monospace', color: 'rgba(0,245,255,0.6)' }}>
                            {cam.id} · YOLO-v8n · 4-DIRECTION PIPELINED STREAMS ({DIRECTION_VIEWS.length} live feeds)
                        </div>
                    </div>

                    {/* -- Right: Stats Panel -- */}
                    <div style={{ width: 300, borderLeft: '1px solid rgba(255,255,255,0.05)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>

                        {/* Signal Status */}
                        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Signal Status</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <BigSignalLamp active={displaySignal} />
                                <div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'monospace', color: SIG_COLOR[displaySignal], textShadow: SIG_GLOW[displaySignal] }}>
                                        {displaySignal.toUpperCase()}
                                    </div>
                                    <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                                        {timer > 0 ? `${timer}s remaining` : signalState?.mode === 'dynamic' ? 'Density-driven' : 'Switching'}
                                    </div>
                                    <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.18)', marginTop: 1 }}>
                                        N/S: <span style={{ color: signalState?.green_axis === 'ns' ? SIG_COLOR.green : SIG_COLOR.red }}>
                                            {signalState?.green_axis === 'ns' ? displaySignal.toUpperCase() : (displaySignal === 'green' ? 'RED' : displaySignal === 'red' ? 'GREEN' : 'YELLOW')}
                                        </span>
                                        {' · '}
                                        E/W: <span style={{ color: signalState?.green_axis === 'ew' ? SIG_COLOR.green : SIG_COLOR.red }}>
                                            {signalState?.green_axis === 'ew' ? displaySignal.toUpperCase() : (displaySignal === 'green' ? 'RED' : displaySignal === 'red' ? 'GREEN' : 'YELLOW')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mode indicator */}
                        {signalState && (
                            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: signalState.mode === 'dynamic' ? 'rgba(0,245,255,0.03)' : 'rgba(167,139,250,0.03)' }}>
                                <div style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Signal Mode</div>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: signalState.mode === 'dynamic' ? '#00f5ff' : '#a78bfa' }}>
                                    {signalState.mode === 'dynamic'
                                        ? `Dynamic — ${signalState.green_axis === 'ns' ? 'N/S busier' : 'E/W busier'}`
                                        : 'Fixed cycle — equal traffic'}
                                </div>
                                <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
                                    N/S: {signalState.ns_density}% · E/W: {signalState.ew_density}%
                                    {signalState.mode === 'dynamic' && ` · Δ ${Math.abs(signalState.ns_density - signalState.ew_density)}%`}
                                </div>
                            </div>
                        )}

                        {/* Key Stats */}
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            <StatCard label="Vehicles" value={vehicleCount} sub="YOLO computed" color="#00f5ff" />
                            <StatCard label="Avg Density" value={density} unit="%" color={barColor} sub={`${density < 40 ? 'Light' : density < 70 ? 'Moderate' : 'Heavy'} traffic`} />
                        </div>

                        {/* Directional density bars */}
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 }}>
                                <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live YOLO Density</div>
                                <div style={{ fontSize: '0.55rem', fontFamily: 'monospace' }}>
                                    <span style={{ color: '#00f5ff' }}>N/S {ns_density}%</span>
                                    <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.15)' }}>|</span>
                                    <span style={{ color: '#a78bfa' }}>E/W {ew_density}%</span>
                                </div>
                            </div>
                            <div style={{ height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
                                <div style={{ height: '100%', width: `${ns_density}%`, background: `linear-gradient(90deg, rgba(0,245,255,0.5), #00f5ff)`, boxShadow: '0 0 8px #00f5ff66', transition: 'width 0.9s ease' }} />
                                <div style={{ height: '100%', width: `${ew_density}%`, background: `linear-gradient(90deg, rgba(167,139,250,0.5), #a78bfa)`, boxShadow: '0 0 8px #a78bfa66', transition: 'width 0.9s ease', opacity: 0.9 }} />
                            </div>
                            {/* Signal decision explanation */}
                            {signalState && (
                                <div style={{ marginTop: 8, fontSize: '0.48rem', color: 'rgba(255,255,255,0.22)', lineHeight: 1.5 }}>
                                    {signalState.mode === 'dynamic'
                                        ? `YOLO detected ${Math.abs(ns_density - ew_density)}% higher density on ${signalState.green_axis === 'ns' ? 'N/S' : 'E/W'} axis -> assigned GREEN`
                                        : `Traffic equal within 10% threshold -> fixed 20s/5s/15s cycle`}
                                </div>
                            )}
                        </div>

                        <div style={{ padding: '12px 16px', flex: 1 }} />

                        {/* Admin-only Manual Override */}
                        {isAdmin && (
                            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,59,92,0.2)', background: 'rgba(255,59,92,0.03)' }}>
                                <div style={{ fontSize: '0.48rem', color: '#ff3b5c', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 8 }}>Admin — Manual Override</div>
                                {/* Axis */}
                                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                                    {['ns','ew'].map(a => (
                                        <button key={a} onClick={() => setOverrideAxis(a)} style={{
                                            flex: 1, padding: '4px 0', fontSize: '0.55rem', fontWeight: 800,
                                            fontFamily: 'monospace', borderRadius: 5, cursor: 'pointer', border: 'none',
                                            background: overrideAxis === a ? 'rgba(0,245,255,0.2)' : 'rgba(255,255,255,0.04)',
                                            color: overrideAxis === a ? '#00f5ff' : 'rgba(255,255,255,0.35)',
                                            outline: overrideAxis === a ? '1px solid #00f5ff55' : 'none',
                                        }}>{a.toUpperCase()} Axis</button>
                                    ))}
                                </div>
                                {/* Phase */}
                                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                                    {['green','yellow','red'].map(p => (
                                        <button key={p} onClick={() => setOverridePhase(p)} style={{
                                            flex: 1, padding: '4px 0', fontSize: '0.52rem', fontWeight: 800,
                                            fontFamily: 'monospace', borderRadius: 5, cursor: 'pointer', border: 'none',
                                            background: overridePhase === p ? `${SIG_COLOR[p]}33` : 'rgba(255,255,255,0.04)',
                                            color: overridePhase === p ? SIG_COLOR[p] : 'rgba(255,255,255,0.35)',
                                            outline: overridePhase === p ? `1px solid ${SIG_COLOR[p]}55` : 'none',
                                        }}>{p.toUpperCase()}</button>
                                    ))}
                                </div>
                                {/* Duration */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <span style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.25)' }}>Duration</span>
                                    <input type="range" min={5} max={120} value={overrideDur}
                                        onChange={e => setOverrideDur(Number(e.target.value))}
                                        style={{ flex: 1, accentColor: '#ff3b5c', height: 3 }} />
                                    <span style={{ fontSize: '0.52rem', fontFamily: 'monospace', color: '#ff3b5c', minWidth: 28 }}>{overrideDur}s</span>
                                </div>
                                {/* Apply */}
                                <button onClick={applyOverride} style={{
                                    width: '100%', padding: '6px 0', fontSize: '0.56rem', fontWeight: 800,
                                    fontFamily: 'monospace', letterSpacing: '0.06em', borderRadius: 6,
                                    cursor: 'pointer', border: '1px solid rgba(255,59,92,0.4)',
                                    background: 'rgba(255,59,92,0.15)', color: '#ff3b5c',
                                }}>APPLY OVERRIDE</button>
                                {overrideMsg && (
                                    <div style={{ marginTop: 5, fontSize: '0.44rem', color: overrideMsg.startsWith('Locked') ? '#00ff9d' : '#ff3b5c', fontFamily: 'monospace', textAlign: 'center' }}>
                                        {overrideMsg}
                                    </div>
                                )}
                            </div>
                        )}


                        {/* Timestamp */}
                        {firestoreStats?.updated_at && (
                            <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '0.44rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.15)' }}>
                                    Last Firestore update: {new Date(firestoreStats.updated_at).toLocaleTimeString('en-IN', { hour12: false })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn      { from { opacity:0; transform:scale(0.96) } to { opacity:1; transform:scale(1) } }
                @keyframes pulse-dot  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.75)} }
                @keyframes scanline   { 0%{top:0} 100%{top:100%} }
                @keyframes stop-line-pulse { 0%,100%{opacity:0.85} 50%{opacity:0.3} }
            `}</style>
        </div>
    );
}
