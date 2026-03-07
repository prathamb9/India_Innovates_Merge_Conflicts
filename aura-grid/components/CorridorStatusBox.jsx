'use client';

/**
 * CorridorStatusBox
 * Displays named intersection nodes for an active green corridor,
 * with real-time status animation: GREEN ✓ → PREP ⏱ → QUEUED
 *
 * Props:
 *   nodes        – [{ id, name }] ordered list of intersections on route
 *   activeIdx    – index of the node the ambulance is currently AT (0-based)
 *   eta          – string, e.g. "4m 12s"
 *   stops        – number of stops (always 0 for green corridor)
 */
export default function CorridorStatusBox({ nodes = [], activeIdx = 0, eta = '—', stops = 0 }) {
    if (!nodes.length) return null;

    function getStatus(i) {
        if (i < activeIdx) return 'done';      // passed — still GREEN
        if (i === activeIdx) return 'active';  // currently GREEN ✓
        if (i === activeIdx + 1) return 'prep'; // PREP ⏱
        return 'queued';                        // QUEUED
    }

    const statusConfig = {
        done:   { dot: '#00ff9d', badge: '#00ff9d', label: 'GREEN ✓',  bg: 'rgba(0,255,157,0.08)', border: 'rgba(0,255,157,0.2)' },
        active: { dot: '#00ff9d', badge: '#00ff9d', label: 'GREEN ✓',  bg: 'rgba(0,255,157,0.12)', border: 'rgba(0,255,157,0.35)' },
        prep:   { dot: '#ffb800', badge: '#ffb800', label: 'PREP ⏱',   bg: 'rgba(255,184,0,0.08)', border: 'rgba(255,184,0,0.2)' },
        queued: { dot: '#00f5ff', badge: '#00f5ff', label: 'QUEUED',   bg: 'rgba(0,245,255,0.04)', border: 'rgba(0,245,255,0.15)' },
    };

    return (
        <div style={{
            background: 'rgba(10,15,28,0.95)',
            border: '1px solid rgba(0,245,255,0.15)',
            borderRadius: '14px',
            padding: '14px 16px',
        }}>
            {/* Header */}
            <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', marginBottom: '10px', textTransform: 'uppercase' }}>
                Green Corridor Status
            </div>

            {/* Node rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {nodes.map((node, i) => {
                    const st = getStatus(i);
                    const cfg = statusConfig[st];
                    return (
                        <div key={node.id} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '8px 12px', borderRadius: '10px',
                            background: cfg.bg, border: `1px solid ${cfg.border}`,
                            transition: 'all 0.5s ease',
                        }}>
                            {/* Status dot */}
                            <span style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: cfg.dot, flexShrink: 0,
                                boxShadow: st === 'active' ? `0 0 8px ${cfg.dot}` : 'none',
                                animation: st === 'active' ? 'pulse-dot 1.4s ease-in-out infinite' : 'none',
                            }} />

                            {/* Node name */}
                            <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 500, color: st === 'queued' ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.85)' }}>
                                Node {i + 1} — {node.name}
                            </span>

                            {/* Status badge */}
                            <span style={{
                                fontSize: '0.68rem', fontWeight: 700,
                                color: cfg.badge,
                                background: `${cfg.badge}18`,
                                border: `1px solid ${cfg.badge}40`,
                                borderRadius: '20px', padding: '2px 10px',
                                fontFamily: 'monospace',
                                letterSpacing: '0.04em',
                            }}>
                                {cfg.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Footer stats */}
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '20px' }}>
                {[
                    ['ETA', eta, '#00ff9d'],
                    ['Stops', String(stops), '#00ff9d'],
                    ['Nodes', `${Math.min(activeIdx + 1, nodes.length)}/${nodes.length}`, '#00f5ff'],
                ].map(([label, val, color]) => (
                    <div key={label}>
                        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>{label}</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'monospace', color }}>{val}</div>
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes pulse-dot {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(0.85); }
                }
            `}</style>
        </div>
    );
}
