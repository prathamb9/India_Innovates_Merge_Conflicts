'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Badge from '@/components/Badge';
import StatusDot from '@/components/StatusDot';

/* ── Node data ── */
const INITIAL_NODES = [
    { id: 'N-01', name: 'Central Sq × Main Blvd', density: 72, corridor: false, emergency: false },
    { id: 'N-02', name: 'Park St × Ring Rd', density: 34, corridor: false, emergency: false },
    { id: 'N-03', name: 'Airport Blvd × NH-4', density: 28, corridor: false, emergency: false },
    { id: 'N-04', name: 'Tech Park × Outer Ring', density: 61, corridor: false, emergency: false },
    { id: 'N-05', name: 'Civil Lines × MG Rd', density: 82, corridor: true, emergency: false },
    { id: 'N-06', name: 'Station Rd × Nehru Nagar', density: 91, corridor: true, emergency: false },
    { id: 'N-07', name: 'MG Road × Park Street', density: 55, corridor: true, emergency: true },
    { id: 'N-08', name: 'Jubilee Hills × NH-65', density: 47, corridor: true, emergency: false },
    { id: 'N-09', name: 'Sec 12 × Residential', density: 18, corridor: false, emergency: false },
    { id: 'N-10', name: 'Old City × Bazaar Rd', density: 78, corridor: false, emergency: false },
    { id: 'N-11', name: 'North Ave × Bypass', density: 43, corridor: false, emergency: false },
    { id: 'N-12', name: 'Outer Ring × Factory Rd', density: 23, corridor: false, emergency: false },
    { id: 'N-13', name: 'High Court × Museum Rd', density: 67, corridor: false, emergency: false },
    { id: 'N-14', name: 'East Gate × Highway 7', density: 52, corridor: false, emergency: false },
    { id: 'N-15', name: 'West End × Lake Blvd', density: 38, corridor: false, emergency: false },
    { id: 'N-16', name: 'Sec 4 × Arterial Rd', density: 84, corridor: false, emergency: false },
    { id: 'N-17', name: 'South Ring × Bypass', density: 29, corridor: false, emergency: false },
    { id: 'N-18', name: 'Commercial St × CBD', density: 95, corridor: false, emergency: false },
    { id: 'N-19', name: 'University Rd × NH-9', density: 41, corridor: false, emergency: false },
    { id: 'N-20', name: 'Industrial × Canal Rd', density: 14, corridor: false, emergency: false },
    { id: 'N-21', name: 'Stadium Rd × Bus Depot', density: 73, corridor: false, emergency: false },
    { id: 'N-22', name: 'Sector 7 × Metro Link', density: 57, corridor: false, emergency: false },
    { id: 'N-23', name: 'Port Rd × Dock Gate', density: 32, corridor: false, emergency: false },
    { id: 'N-24', name: 'City Hospital × Sec 9', density: 48, corridor: false, emergency: false },
];

function densityColor(d) {
    if (d < 40) return 'text-accent-green';
    if (d < 70) return 'text-accent-amber';
    return 'text-accent-red';
}
function densityBarColor(d) {
    if (d < 40) return 'progress-fill-green';
    if (d < 70) return 'progress-fill-amber';
    return 'progress-fill-red';
}
function cardBorder(d, corridor, emergency) {
    if (emergency) return 'border-accent-red/50 bg-[rgba(255,59,92,0.04)]';
    if (corridor) return 'border-accent-cyan/40 bg-[rgba(0,245,255,0.03)]';
    return 'border-white/5 hover:border-white/10';
}

/* ── Small light dot ── */
function LightDot({ d }) {
    const c = d < 40 ? 'bg-accent-green shadow-neon-green' : d < 70 ? 'bg-accent-amber shadow-neon-amber' : 'bg-accent-red shadow-neon-red';
    return <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c}`} />;
}

/* ── Intersection node card ── */
function IntNode({ node, onClick }) {
    return (
        <div
            onClick={() => onClick(node)}
            className={`bg-bg-card border rounded-xl p-3 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md flex items-center gap-3 ${cardBorder(node.density, node.corridor, node.emergency)}`}
        >
            <LightDot d={node.density} />
            <div className="flex-1 min-w-0">
                <div className="text-[0.6rem] font-mono text-text-muted">{node.id}</div>
                <div className="text-[0.72rem] font-semibold truncate leading-snug">{node.name}</div>
                <div className="h-1 bg-white/5 rounded-full mt-1.5 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${densityBarColor(node.density)}`} style={{ width: `${node.density}%` }} />
                </div>
            </div>
            <div className={`text-[0.82rem] font-black font-mono flex-shrink-0 ${densityColor(node.density)}`}>{node.density}%</div>
        </div>
    );
}

/* ── Flow Chart (canvas) ── */
function FlowChart() {
    const ref = useRef(null);
    const draw = useCallback(() => {
        const canvas = ref.current; if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        const data = Array.from({ length: 20 }, (_, i) => 20 + Math.random() * 60 + Math.sin(i * 0.5) * 20);
        ctx.clearRect(0, 0, w, h);
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(0,245,255,0.25)');
        grad.addColorStop(1, 'rgba(0,245,255,0)');
        ctx.beginPath();
        data.forEach((v, i) => { const x = (i / (data.length - 1)) * w, y = h - (v / 100) * h; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
        ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
        ctx.fillStyle = grad; ctx.fill();
        ctx.beginPath();
        data.forEach((v, i) => { const x = (i / (data.length - 1)) * w, y = h - (v / 100) * h; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
        ctx.strokeStyle = 'rgba(0,245,255,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
    }, []);
    useEffect(() => { draw(); const t = setInterval(draw, 4000); return () => clearInterval(t); }, [draw]);
    return <canvas ref={ref} width={300} height={80} className="w-full opacity-90" />;
}

/* ── Node detail panel ── */
function NodeDetail({ node, onClose }) {
    if (!node) return null;
    const ns = Math.min(node.density + 10, 99);
    const ew = Math.max(100 - node.density - 10, 5);
    return (
        <div className="absolute inset-x-0 bottom-0 bg-[rgba(13,17,23,0.98)] backdrop-blur-xl border-t border-accent-cyan/20 rounded-t-2xl p-5 z-20 shadow-[0_-12px_40px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1"><Badge variant="cyan">{node.id}</Badge>{node.corridor && <Badge variant="green">Corridor Active</Badge>}{node.emergency && <Badge variant="red">Emergency</Badge>}</div>
                    <h3 className="font-bold text-base">{node.name}</h3>
                </div>
                <div className="flex gap-2">
                    <Link href="/portal" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-br from-accent-green to-[#00cc7a] text-black no-underline">Activate Corridor</Link>
                    <button onClick={onClose} className="px-2.5 py-1.5 rounded-lg text-xs bg-white/5 text-text-muted hover:text-white font-sans cursor-pointer">✕</button>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
                {[['N-S Flow', ns, 'amber'], ['E-W Flow', ew, 'green']].map(([label, val, color]) => (
                    <div key={label}>
                        <div className="flex justify-between text-xs mb-1.5"><span className="text-text-muted">{label}</span><span className="font-bold font-mono">{val}%</span></div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full progress-fill-${color}`} style={{ width: `${val}%` }} />
                        </div>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-4 gap-3 text-xs">
                {[['Phase', 'N-S GREEN', 'text-accent-green'], ['Cycle', `${Math.round(15 + node.density * 0.4)}s`, 'text-text-primary'], ['Camera', 'Online', 'text-accent-green'], ['Detections', `${(800 + Math.round(node.density * 15)).toLocaleString()}`, 'text-accent-cyan']].map(([l, v, c]) => (
                    <div key={l}><div className="text-text-muted text-[0.65rem] uppercase mb-1">{l}</div><div className={`font-bold ${c}`}>{v}</div></div>
                ))}
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const [nodes, setNodes] = useState(INITIAL_NODES);
    const [selectedNode, setSelectedNode] = useState(null);
    const [etaSec, setEtaSec] = useState(222);
    const [speed, setSpeed] = useState(68);
    const [toastVisible, setToastVisible] = useState(false);

    const LANES = [
        { idx: 15, label: 'North Ring Rd' }, { idx: 10, label: 'MG Road' },
        { idx: 2, label: 'Airport Blvd' }, { idx: 11, label: 'Outer Ring Rd' },
    ];

    /* Live density update */
    useEffect(() => {
        const t = setInterval(() => {
            setNodes(prev => prev.map(n => ({ ...n, density: Math.max(5, Math.min(99, n.density + Math.floor(Math.random() * 7) - 3)) })));
        }, 2200);
        return () => clearInterval(t);
    }, []);

    /* ETA countdown */
    useEffect(() => {
        const t = setInterval(() => {
            setEtaSec(s => Math.max(0, s - 1));
            setSpeed(Math.floor(60 + Math.random() * 20));
        }, 1000);
        return () => clearInterval(t);
    }, []);

    /* Toast on load */
    useEffect(() => { const t = setTimeout(() => setToastVisible(true), 2500); return () => clearTimeout(t); }, []);

    function simulateAlert() {
        const rnd = Math.floor(Math.random() * nodes.length);
        setNodes(prev => prev.map((n, i) => i === rnd ? { ...n, emergency: true } : n));
        setToastVisible(true);
        setTimeout(() => setNodes(prev => prev.map((n, i) => i === rnd ? { ...n, emergency: false } : n)), 8000);
    }

    const etaStr = `${Math.floor(etaSec / 60)}m ${(etaSec % 60).toString().padStart(2, '0')}s`;
    const avgDensity = Math.round(nodes.reduce((s, n) => s + n.density, 0) / nodes.length);

    return (
        <div className="bg-bg-deep text-text-primary font-sans h-screen flex flex-col overflow-hidden">
            <div className="grid-bg" />

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 py-3 bg-bg-deep/95 border-b border-white/5 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2 font-extrabold text-xl no-underline text-white">
                        <div className="w-8 h-8 rounded-[6px] bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center neon-cyan">⬡</div>
                        <span><span className="text-accent-cyan">AURA</span>-GRID</span>
                    </Link>
                    <div className="w-px h-6 bg-white/10" />
                    <span className="text-sm text-text-muted">Live Control Center</span>
                </div>

                {/* Center stats */}
                <div className="flex items-center gap-6">
                    {[['Active Corridors', '2', 'text-accent-green'], ['Nodes Online', '24/24', 'text-accent-cyan'], ['City Density', `${avgDensity}%`, 'text-accent-amber']].map(([l, v, c]) => (
                        <div key={l} className="flex flex-col items-center">
                            <span className="text-[0.62rem] text-text-muted uppercase tracking-wide">{l}</span>
                            <span className={`text-xl font-extrabold font-mono leading-tight ${c}`}>{v}</span>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-accent-green/10 border border-accent-green/20 rounded-full px-3 py-1.5">
                        <StatusDot color="green" /><span className="font-mono text-xs text-text-secondary">LIVE</span>
                    </div>
                    <Link href="/portal" className="inline-flex gap-1.5 items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-br from-accent-cyan to-[#0099cc] text-black no-underline">🔒 Portal</Link>
                    <Link href="/" className="inline-flex gap-1.5 items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/5 text-text-primary no-underline">← Home</Link>
                </div>
            </header>

            {/* Main 2-col layout */}
            <main className="flex flex-1 overflow-hidden relative z-10">

                {/* LEFT — Intersection Grid */}
                <section className="flex-1 bg-bg-deep p-5 overflow-hidden flex flex-col relative">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-sm font-bold uppercase tracking-wide text-text-muted">Intersection Nodes</h2>
                            <Badge variant="cyan">24 Active</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-text-muted">
                            {[['#00ff9d', 'Low'], ['#ffb800', 'Med'], ['#ff3b5c', 'High']].map(([c, l]) => (
                                <span key={l} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: c }} />{l}</span>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 overflow-y-auto flex-1">
                        {nodes.map(node => <IntNode key={node.id} node={node} onClick={setSelectedNode} />)}
                    </div>
                    {selectedNode && <NodeDetail node={selectedNode} onClose={() => setSelectedNode(null)} />}
                </section>

                {/* RIGHT SIDEBAR */}
                <aside className="w-72 bg-[rgba(13,17,23,0.96)] border-l border-white/5 overflow-y-auto flex flex-col flex-shrink-0">

                    {/* Emergency Corridor */}
                    <div className="p-4 border-b border-white/5">
                        <div className="text-[0.68rem] font-bold uppercase tracking-widest text-text-muted mb-3">🚑 Active Corridor</div>
                        <div className="bg-accent-cyan/[0.04] border border-accent-cyan/15 rounded-xl p-3.5">
                            <div className="flex flex-wrap gap-1.5 mb-3"><Badge variant="red">AMB-042</Badge><Badge variant="green">ACTIVE</Badge></div>
                            <div className="text-xs font-semibold mb-1">📍 Sector 12 Accident Site</div>
                            <div className="w-0.5 h-3 bg-gradient-to-b from-accent-green to-accent-cyan ml-2 my-1" />
                            <div className="text-xs font-semibold mb-3">🏥 City General Hospital</div>
                            <div className="flex flex-col gap-1 mb-3">
                                {[['green', 'N-05 — Cleared ✓', 'done'], ['green', 'N-06 — Cleared ✓', 'done'], ['cyan', 'N-07 — In Transit 🚑', 'active'], ['amber', 'N-08 — Preparing', 'prep'], ['gray', 'N-09 — Queued', 'pending']].map(([c, t, s]) => (
                                    <div key={t} className={`flex items-center gap-2 text-xs py-0.5 ${s === 'active' ? 'text-accent-cyan font-bold' : s === 'prep' ? 'text-accent-amber' : 'text-text-muted'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s === 'done' ? 'bg-accent-green' : s === 'active' ? 'bg-accent-cyan animate-pulse' : s === 'prep' ? 'bg-accent-amber' : 'bg-white/20'}`} />{t}
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-4 pt-2.5 border-t border-white/5">
                                {[['ETA', etaStr, 'text-accent-green'], ['Speed', `${speed} km/h`, 'text-white'], ['Stops', '0', 'text-accent-green']].map(([l, v, c]) => (
                                    <div key={l}><div className="text-[0.6rem] text-text-muted uppercase">{l}</div><div className={`font-bold font-mono text-sm ${c}`}>{v}</div></div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Lane density */}
                    <div className="p-4 border-b border-white/5">
                        <div className="text-[0.68rem] font-bold uppercase tracking-widest text-text-muted mb-3">🚗 Lane Density</div>
                        <div className="flex flex-col gap-2">
                            {LANES.map(({ idx, label }) => {
                                const d = nodes[idx]?.density ?? 50;
                                const c = d < 40 ? 'progress-fill-green' : d < 70 ? 'progress-fill-amber' : 'progress-fill-red';
                                const tc = d < 40 ? 'text-accent-green' : d < 70 ? 'text-accent-amber' : 'text-accent-red';
                                return (
                                    <div key={label} className="flex items-center gap-2 text-xs text-text-secondary">
                                        <span className="w-[85px] flex-shrink-0 truncate">{label}</span>
                                        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden"><div className={`h-full rounded-full ${c} transition-all duration-700`} style={{ width: `${d}%` }} /></div>
                                        <span className={`w-8 text-right font-bold font-mono ${tc}`}>{d}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* City stats */}
                    <div className="p-4 border-b border-white/5">
                        <div className="text-[0.68rem] font-bold uppercase tracking-widest text-text-muted mb-3">📊 City Stats</div>
                        <div className="grid grid-cols-2 gap-2">
                            {[['Avg Wait', '8.3s', 'text-text-primary'], ['CO₂ Saved', '2.4 t', 'text-accent-green'], ['Fuel Saved', '1,840L', 'text-accent-green'], ['Congestion', `${avgDensity}%`, 'text-accent-amber']].map(([l, v, c]) => (
                                <div key={l} className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5">
                                    <div className="text-[0.62rem] text-text-muted mb-1">{l}</div>
                                    <div className={`text-sm font-bold font-mono ${c}`}>{v}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Traffic chart */}
                    <div className="p-4 border-b border-white/5">
                        <div className="text-[0.68rem] font-bold uppercase tracking-widest text-text-muted mb-3">📈 Flow (Last 1h)</div>
                        <FlowChart />
                    </div>

                    {/* Camera feeds — simplified */}
                    <div className="p-4 border-b border-white/5">
                        <div className="text-[0.68rem] font-bold uppercase tracking-widest text-text-muted mb-3">📷 Camera Status</div>
                        <div className="flex flex-col gap-2">
                            {[['CAM-07', 'N-07 · MG Road', 'Override Active', 'red'], ['CAM-12', 'N-12 · Outer Ring', 'Normal', 'green'], ['CAM-03', 'N-03 · Airport', 'Signal Weak', 'amber']].map(([id, loc, status, color]) => (
                                <div key={id} className="flex items-center gap-2.5 text-xs">
                                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color === 'red' ? 'bg-accent-red' : color === 'green' ? 'bg-accent-green' : 'bg-accent-amber'}`} />
                                    <span className="font-mono text-[0.65rem] text-text-muted w-12 flex-shrink-0">{id}</span>
                                    <span className="text-text-secondary flex-1 truncate">{loc}</span>
                                    <Badge variant={color} className="text-[0.6rem] flex-shrink-0">{status}</Badge>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick actions */}
                    <div className="p-4">
                        <div className="text-[0.68rem] font-bold uppercase tracking-widest text-text-muted mb-3">⚡ Actions</div>
                        <div className="flex flex-col gap-2">
                            <Link href="/portal" className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-br from-accent-green to-[#00cc7a] text-black no-underline">🚑 New Green Corridor</Link>
                            <button onClick={simulateAlert} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/5 text-text-primary font-sans cursor-pointer hover:bg-white/10">🔔 Simulate Emergency</button>
                            <button className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/5 text-text-primary font-sans cursor-pointer hover:bg-white/10">📊 Export Report</button>
                        </div>
                    </div>
                </aside>
            </main>

            {/* Toast */}
            <div className={`toast ${toastVisible ? 'show' : ''}`}>
                <div className="text-2xl">🚨</div>
                <div>
                    <div className="font-bold text-sm">Emergency Override Activated!</div>
                    <div className="text-xs text-text-secondary">Node override active — corridor initiating</div>
                </div>
                <button onClick={() => setToastVisible(false)} className="ml-auto text-text-muted text-lg leading-none bg-transparent border-none cursor-pointer">✕</button>
            </div>
        </div>
    );
}
