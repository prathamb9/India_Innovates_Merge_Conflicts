'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Badge from '@/components/Badge';
import StatusDot from '@/components/StatusDot';
import CorridorStatusBox from '@/components/CorridorStatusBox';
import YoloFailsafePanel from '@/components/YoloFailsafePanel';
import { CITY_NODES } from '@/lib/cityNodes';
import { useLanguage } from '@/components/LanguageProvider';

/* -- Build node rows from real city intersection data -- */
function buildCityNodes(cityName) {
    const cityNodes = CITY_NODES[cityName] || CITY_NODES['Delhi'];
    // For display purposes give each node a seeded density
    const seed = cityName.charCodeAt(0) + cityName.length;
    return cityNodes.map((n, i) => ({
        id: `N-${String(i + 1).padStart(2, '0')}`,
        realId: n.id,
        name: n.name,
        density: ((seed * 31 + i * 17 + 19) % 80) + 12,  // deterministic 1291%
        corridor: i < 2,          // first 2 nodes treated as corridor-active demo
        emergency: i === 1,       // second node has emergency badge
    }));
}

/* -- City-specific lane names -- */
const CITY_LANES = {
    Delhi: ['Ring Road', 'MG Road', 'NH-48 (Airport)', 'Outer Ring Rd'],
    Mumbai: ['Western Express Hwy', 'Eastern Express Hwy', 'Andheri-Kurla Rd', 'SV Road'],
    Bengaluru: ['Outer Ring Rd', 'Hosur Road', 'Bellary Road', 'Mysore Road'],
    Hyderabad: ['Inner Ring Rd', 'Outer Ring Rd', 'NH-65', 'Nehru Outer Ring'],
    Chennai: ['Anna Salai', 'GST Road', 'OMR', 'Inner Ring Road'],
    Pune: ['FC Road', 'Pune-Mumbai Hwy', 'Satara Road', 'Solapur Road'],
    Kolkata: ['VIP Road', 'EM Bypass', 'Park Street', 'Jessore Road'],
    Ahmedabad: ['SG Highway', 'Ring Road', 'Ashram Road', 'SP Ring Road'],
};
function getCityLanes(cityName) {
    return (CITY_LANES[cityName] || CITY_LANES['Delhi']);
}

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

/* -- Bright Node Card -- */
function NodeCard({ node, onClick, compact = false }) {
    const isHigh = node.density >= 70;
    const isMed  = node.density >= 40 && node.density < 70;
    const isLow  = node.density < 40;

    const glowColor = isHigh ? 'rgba(255,59,92,0.18)' : isMed ? 'rgba(255,184,0,0.15)' : 'rgba(0,255,157,0.14)';
    const borderColor = isHigh
        ? (node.emergency ? 'rgba(255,59,92,0.6)' : 'rgba(255,59,92,0.32)')
        : isMed
        ? 'rgba(255,184,0,0.32)'
        : 'rgba(0,255,157,0.30)';
    const densityTextColor = isHigh ? '#ff3b5c' : isMed ? '#ffb800' : '#00ff9d';
    const barClass = isHigh ? 'progress-fill-red' : isMed ? 'progress-fill-amber' : 'progress-fill-green';

    if (compact) {
        return (
            <div
                onClick={() => onClick(node)}
                className="cursor-pointer rounded-xl p-3 flex flex-col gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110"
                style={{ background: `rgba(18,17,28,0.85)`, border: `1px solid ${borderColor}`, boxShadow: `0 0 12px ${glowColor}` }}
            >
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[0.6rem] font-mono font-bold" style={{ color: densityTextColor }}>{node.id}</span>
                        {node.corridor && <span className="text-[0.5rem] font-bold px-1 py-0.5 rounded" style={{ background: 'rgba(0,245,255,0.12)', color: '#00f5ff', border: '0.8px solid rgba(0,245,255,0.3)' }}>COR</span>}
                        {node.emergency && <span className="text-[0.5rem] font-bold px-1 py-0.5 rounded" style={{ background: 'rgba(255,59,92,0.15)', color: '#ff3b5c', border: '0.8px solid rgba(255,59,92,0.4)' }}>EMG</span>}
                    </div>
                    <span className="text-sm font-black font-mono" style={{ color: densityTextColor }}>{node.density}%</span>
                </div>
                <div className="text-[0.68rem] font-medium text-text-secondary leading-tight truncate">{node.name}</div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className={`h-full rounded-full ${barClass} transition-all duration-700`} style={{ width: `${node.density}%` }} />
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={() => onClick(node)}
            className="cursor-pointer rounded-xl p-2.5 flex items-center gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110"
            style={{ background: 'rgba(18,17,28,0.85)', border: `1px solid ${borderColor}`, boxShadow: `0 0 14px ${glowColor}` }}
        >
            {/* Density ring */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center w-10 h-10 rounded-lg text-center" style={{ background: `${glowColor}`, border: `1px solid ${borderColor}` }}>
                <span className="text-[0.82rem] font-black font-mono leading-none" style={{ color: densityTextColor }}>{node.density}</span>
                <span className="text-[0.45rem] font-bold" style={{ color: densityTextColor }}>%</span>
            </div>
            {/* Name + bar */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[0.58rem] font-mono text-text-muted">{node.id}</span>
                    {node.corridor && <span className="text-[0.5rem] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,245,255,0.12)', color: '#00f5ff', border: '0.8px solid rgba(0,245,255,0.3)' }}>COR</span>}
                    {node.emergency && <span className="text-[0.5rem] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,59,92,0.15)', color: '#ff3b5c', border: '0.8px solid rgba(255,59,92,0.4)' }}>EMG</span>}
                </div>
                <div className="text-[0.75rem] font-semibold text-text-primary truncate mb-1.5">{node.name}</div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className={`h-full rounded-full ${barClass} transition-all duration-700`} style={{ width: `${node.density}%` }} />
                </div>
            </div>
        </div>
    );
}

/* -- Node Detail Panel (slide-up) -- */
function NodeDetail({ node, onClose, t }) {
    if (!node) return null;
    const ns = Math.min(node.density + 10, 99);
    const ew = Math.max(100 - node.density - 10, 5);
    return (
        <div className="absolute inset-x-0 bottom-0 bg-[rgba(13,17,23,0.98)] backdrop-blur-xl border-t border-accent-cyan/20 rounded-t-2xl p-5 z-20 shadow-[0_-12px_40px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="cyan">{node.id}</Badge>
                        {node.corridor && <Badge variant="green">{t('corridorActive')}</Badge>}
                        {node.emergency && <Badge variant="red">{t('emergencyLabel')}</Badge>}
                    </div>
                    <h3 className="font-bold text-base">{node.name}</h3>
                </div>
                <div className="flex gap-2">
                    <Link href="/portal" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-cyan text-black no-underline">{t('activateCorridor')}</Link>
                    <button onClick={onClose} className="px-2.5 py-1.5 rounded-lg text-xs bg-white/5 text-text-muted hover:text-white font-sans cursor-pointer"></button>
                </div>
            </div>

            {/* Traffic flow bars */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                {[[t('nsFlow'), ns, 'amber'], [t('ewFlow'), ew, 'green']].map(([label, val, color]) => (
                    <div key={label}>
                        <div className="flex justify-between text-xs mb-1.5"><span className="text-text-muted">{label}</span><span className="font-bold font-mono">{val}%</span></div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full progress-fill-${color}`} style={{ width: `${val}%` }} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Real-time density gauge */}
            <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5"><span className="text-text-muted">{t('trafficDensity')}</span><span className={`font-bold font-mono ${densityColor(node.density)}`}>{node.density}%</span></div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${densityBarColor(node.density)} transition-all duration-700`} style={{ width: `${node.density}%` }} />
                </div>
            </div>

            {/* Signal + camera stats */}
            <div className="grid grid-cols-4 gap-3 text-xs">
                {[
                    [t('phase'), 'N-S GREEN', 'text-accent-green'],
                    [t('cycle'), `${Math.round(15 + node.density * 0.4)}s`, 'text-text-primary'],
                    [t('camera'), t('online'), 'text-accent-green'],
                    [t('detections'), `${(800 + Math.round(node.density * 15)).toLocaleString()}`, 'text-accent-cyan'],
                ].map(([l, v, c]) => (
                    <div key={l}><div className="text-text-muted text-[0.62rem] uppercase mb-1">{l}</div><div className={`font-bold ${c}`}>{v}</div></div>
                ))}
            </div>
        </div>
    );
}

/* -- Live Corridor Card -- */
function CorridorCard({ corridor, onTerminate, t }) {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const ti = setInterval(() => setElapsed(s => s + 1), 1000);
        return () => clearInterval(ti);
    }, []);
    const mins = Math.floor(elapsed / 60);
    const secs = (elapsed % 60).toString().padStart(2, '0');

    const nodes = corridor.corridorNodes || [];
    const activeNodeIdx = corridor.activeNodeIdx || 0;

    return (
        <div className="bg-accent-cyan/[0.04] border border-accent-cyan/25 rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-accent-cyan/10 blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
                    <span className="text-[0.62rem] font-bold uppercase tracking-widest text-accent-cyan">{t('liveCorridor')}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[0.62rem] font-mono text-text-muted">{mins}m {secs}s</span>
                    <button onClick={onTerminate} className="text-[0.58rem] font-bold text-accent-red border border-accent-red/30 rounded-lg px-2 py-0.5 bg-accent-red/10 hover:bg-accent-red/20 font-sans cursor-pointer">{t('terminate')}</button>
                </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
                <Badge variant="red">{corridor.vehicleId || 'AMB-042'}</Badge>
                <Badge variant="green">{t('activeCors')}</Badge>
                <span className="text-[0.65rem] text-text-muted capitalize ml-auto">{corridor.corridorType || 'ambulance'}</span>
            </div>

            <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-accent-cyan flex-shrink-0" />
                <span className="text-xs text-text-secondary truncate">{corridor.origin || t('origin')}</span>
            </div>
            <div className="w-px h-3 bg-white/10 ml-[3px] my-0.5" />
            <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-accent-violet flex-shrink-0" />
                <span className="text-xs text-text-secondary truncate">{corridor.dest || t('destination')}</span>
            </div>

            {nodes.length > 0 && (
                <div className="mb-3">
                    <CorridorStatusBox nodes={nodes} activeIdx={activeNodeIdx} eta={corridor.duration || ''} stops={0} />
                </div>
            )}

            <Link href={`/portal?corridorId=${corridor.id}`} className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-text-primary no-underline hover:border-accent-cyan/30 hover:text-accent-cyan transition-all">
                {t('viewRealTimePortal')}
            </Link>
        </div>
    );
}

/* -- Nodes Section with Search + View All modal -- */
function NodesSection({ nodes, onSelectNode, selectedNode, selectedCity, t }) {
    const [search, setSearch] = useState('');
    const [showAll, setShowAll] = useState(false);
    const [modalSearch, setModalSearch] = useState('');

    const filtered = nodes.filter(n =>
        n.name.toLowerCase().includes(search.toLowerCase()) ||
        n.id.toLowerCase().includes(search.toLowerCase())
    );
    const preview = filtered.slice(0, 8);

    const modalFiltered = nodes.filter(n =>
        n.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
        n.id.toLowerCase().includes(modalSearch.toLowerCase())
    );

    const highCount = nodes.filter(n => n.density >= 70).length;
    const medCount  = nodes.filter(n => n.density >= 40 && n.density < 70).length;
    const lowCount  = nodes.filter(n => n.density < 40).length;

    return (
        <>
            <section className="relative">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-text-muted">
                            {t('intersectionNodes')} · {selectedCity}
                        </h2>
                        <span className="text-[0.6rem] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(0,245,255,0.10)', color: '#00f5ff', border: '0.8px solid rgba(0,245,255,0.3)' }}>
                            {nodes.length} Active
                        </span>
                    </div>
                    {/* Legend + View All */}
                    <div className="flex items-center gap-3 flex-wrap">
                        {[['Low', '#00ff9d', lowCount], ['Med', '#ffb800', medCount], ['High', '#ff3b5c', highCount]].map(([l, c, cnt]) => (
                            <span key={l} className="flex items-center gap-1 text-[0.62rem] text-text-muted">
                                <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                                {l} <span className="font-bold font-mono" style={{ color: c }}>{cnt}</span>
                            </span>
                        ))}
                        <button onClick={() => setShowAll(true)}
                            className="text-[0.68rem] font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-all font-sans hover:brightness-110"
                            style={{ background: 'rgba(115,94,239,0.15)', color: '#a78bfa', border: '1px solid rgba(115,94,239,0.35)' }}>
                            View All ↗
                        </button>
                    </div>
                </div>

                {/* Search bar */}
                <div className="relative mb-4">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none">🔍</span>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by node name or ID…"
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl text-sm text-text-primary font-sans outline-none transition-all"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', caretColor: '#735EEF' }}
                        onFocus={e => e.target.style.borderColor = 'rgba(115,94,239,0.55)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'}
                    />
                    {search && (
                        <button onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white text-xs font-sans cursor-pointer">✕</button>
                    )}
                </div>

                {/* Node cards grid */}
                {preview.length === 0 ? (
                    <div className="text-center py-10 text-text-muted text-sm">No nodes match "{search}"</div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {preview.map(node => <NodeCard key={node.id} node={node} onClick={onSelectNode} />)}
                        </div>
                        {filtered.length > 8 && (
                            <div className="text-center mt-3">
                                <button onClick={() => setShowAll(true)}
                                    className="text-[0.72rem] font-semibold text-accent-violet hover:text-white transition-colors cursor-pointer font-sans">
                                    +{filtered.length - 8} more nodes · View All →
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Node Detail slide-up */}
                {selectedNode && (
                    <NodeDetail node={selectedNode} onClose={() => onSelectNode(null)} t={t} />
                )}
            </section>

            {/* View All Modal */}
            {showAll && (
                <div
                    className="fixed inset-0 z-50 flex flex-col"
                    style={{ background: 'rgba(5,4,13,0.96)', backdropFilter: 'blur(18px)' }}
                >
                    {/* Modal header */}
                    <div className="flex items-center justify-between px-7 py-4 flex-shrink-0"
                        style={{ borderBottom: '0.8px solid rgba(255,255,255,0.08)', background: 'rgba(18,17,22,0.90)' }}>
                        <div className="flex items-center gap-3">
                            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #735EEF, #4D7CFF)', flexShrink: 0 }} />
                            <span className="font-semibold text-base" style={{ fontFamily: 'Inter, sans-serif' }}>
                                <span style={{ color: '#735EEF' }}>Signal</span>Sync
                            </span>
                            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)' }} />
                            <span className="text-xs text-text-muted">All Intersection Nodes · {selectedCity}</span>
                            <span className="text-[0.6rem] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(0,245,255,0.10)', color: '#00f5ff', border: '0.8px solid rgba(0,245,255,0.3)' }}>
                                {nodes.length} Nodes
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-3">
                                {[['Low', '#00ff9d', lowCount], ['Med', '#ffb800', medCount], ['High', '#ff3b5c', highCount]].map(([l, c, cnt]) => (
                                    <span key={l} className="flex items-center gap-1 text-[0.65rem] text-text-muted">
                                        <span className="w-2 h-2 rounded-full" style={{ background: c }} />{l}: <b style={{ color: c }}>{cnt}</b>
                                    </span>
                                ))}
                            </div>
                            <button onClick={() => setShowAll(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold text-text-muted hover:text-white transition-colors cursor-pointer font-sans"
                                style={{ background: 'rgba(255,255,255,0.06)', border: '0.8px solid rgba(255,255,255,0.1)' }}>
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Modal Search */}
                    <div className="px-7 py-4 flex-shrink-0" style={{ borderBottom: '0.8px solid rgba(255,255,255,0.06)' }}>
                        <div className="relative max-w-md">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none">🔍</span>
                            <input
                                type="text"
                                value={modalSearch}
                                onChange={e => setModalSearch(e.target.value)}
                                placeholder="Search all nodes…"
                                className="w-full pl-8 pr-10 py-2.5 rounded-xl text-sm text-text-primary font-sans outline-none"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(115,94,239,0.35)', caretColor: '#735EEF' }}
                                autoFocus
                            />
                            {modalSearch && (
                                <button onClick={() => setModalSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white text-xs font-sans cursor-pointer">✕</button>
                            )}
                        </div>
                        {modalSearch && (
                            <p className="text-[0.68rem] text-text-muted mt-2">{modalFiltered.length} result{modalFiltered.length !== 1 ? 's' : ''} for "{modalSearch}"</p>
                        )}
                    </div>

                    {/* Modal grid */}
                    <div className="flex-1 overflow-y-auto px-7 py-5">
                        {modalFiltered.length === 0 ? (
                            <div className="text-center py-20 text-text-muted">No nodes match "{modalSearch}"</div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                                {modalFiltered.map(node => (
                                    <NodeCard key={node.id} node={node} compact onClick={(n) => { onSelectNode(n); setShowAll(false); }} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

/* -- Demo Corridor Status  city-aware, auto-animates -- */
function DemoCorridorStatus({ etaStr, cityName }) {
    const cityNodes = CITY_NODES[cityName] || CITY_NODES['Delhi'];
    const demoNodes = cityNodes.slice(0, 5).map(n => ({ id: n.id, name: n.name }));
    const [activeIdx, setActiveIdx] = useState(0);
    // Reset animation when city changes
    useEffect(() => { setActiveIdx(0); }, [cityName]);
    useEffect(() => {
        const t = setInterval(() => {
            setActiveIdx(i => (i + 1) % demoNodes.length);
        }, 8000);
        return () => clearInterval(t);
    }, [cityName]);
    return (
        <CorridorStatusBox
            nodes={demoNodes}
            activeIdx={activeIdx}
            eta={etaStr}
            stops={0}
        />
    );
}

export default function DashboardPage() {
    const { t } = useLanguage();
    const [nodes, setNodes] = useState(() => buildCityNodes('Delhi'));
    const [selectedCity, setSelectedCity] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const [etaSec, setEtaSec] = useState(222);
    const [speed, setSpeed] = useState(68);
    const [liveCorridors, setLiveCorridors] = useState([]);

    const CITIES = [
        { name: 'Delhi', state: 'Delhi NCR' },
        { name: 'Mumbai', state: 'Maharashtra' },
        { name: 'Bengaluru', state: 'Karnataka' },
        { name: 'Chennai', state: 'Tamil Nadu' },
        { name: 'Hyderabad', state: 'Telangana' },
        { name: 'Kolkata', state: 'West Bengal' },
        { name: 'Pune', state: 'Maharashtra' },
        { name: 'Ahmedabad', state: 'Gujarat' },
    ];

    /* Reset nodes when city changes */
    useEffect(() => {
        if (selectedCity) setNodes(buildCityNodes(selectedCity));
    }, [selectedCity]);

    /* Live density update */
    useEffect(() => {
        const t = setInterval(() => {
            setNodes(prev => prev.map(n => ({
                ...n,
                density: Math.max(5, Math.min(99, n.density + Math.floor(Math.random() * 7) - 3))
            })));
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

    /* Keep selected node in sync with live density updates */
    useEffect(() => {
        if (!selectedNode) return;
        const updated = nodes.find(n => n.id === selectedNode.id);
        if (updated) setSelectedNode(updated);
    }, [nodes]);

    /* Poll localStorage for live corridors */
    useEffect(() => {
        const poll = () => {
            try {
                const raw = localStorage.getItem('signalsync_active_corridors');
                setLiveCorridors(raw ? JSON.parse(raw) : []);
            } catch { setLiveCorridors([]); }
        };
        poll();
        const t = setInterval(poll, 1500);
        window.addEventListener('storage', poll);
        return () => { clearInterval(t); window.removeEventListener('storage', poll); };
    }, []);

    function terminateCorridor(id) {
        try {
            const raw = localStorage.getItem('signalsync_active_corridors');
            const corridors = raw ? JSON.parse(raw) : [];
            const updated = corridors.filter(c => c.id !== id);
            localStorage.setItem('signalsync_active_corridors', JSON.stringify(updated));
            setLiveCorridors(updated);
        } catch { }
    }

    // Only show corridors for the currently selected city
    const cityLiveCorridors = selectedCity
        ? liveCorridors.filter(c => !c.city || c.city === selectedCity)
        : liveCorridors;

    const etaStr = `${Math.floor(etaSec / 60)}m ${(etaSec % 60).toString().padStart(2, '0')}s`;
    const avgDensity = Math.round(nodes.reduce((s, n) => s + n.density, 0) / nodes.length);
    const cityLanes = selectedCity ? getCityLanes(selectedCity) : getCityLanes('Delhi');

    /* -- City picker screen -- */
    if (!selectedCity) {
        return (
            <div className="bg-bg-deep text-text-primary font-sans min-h-screen flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
                <div className="grid-bg" />
                {/* Visuo nav */}
                <header className="relative z-10 flex items-center justify-between px-8 py-4" style={{ backdropFilter: 'blur(12px)', borderBottom: '0.8px solid rgba(255,255,255,0.08)', background: 'rgba(18,17,22,0.85)' }}>
                    <Link href="/" className="flex items-center gap-2.5 font-semibold text-lg no-underline text-white">
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #735EEF, #4D7CFF)', flexShrink: 0 }} />
                        <span><span style={{ color: '#735EEF' }}>Signal</span>Sync</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Link href="/portal" className="visuo-btn-ghost" style={{ padding: '8px 18px', fontSize: '0.82rem' }}>{t('portalLink')}</Link>
                        <Link href="/" className="visuo-btn-ghost" style={{ padding: '8px 18px', fontSize: '0.82rem' }}>{t('homeLink')}</Link>
                    </div>
                </header>

                <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 py-20">
                    {/* Visuo purple glow above */}
                    <div className="visuo-glow" style={{ width: 500, height: 350, top: 0, left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(ellipse at center, rgba(115,94,239,0.20) 0%, transparent 70%)' }} />

                    <div className="flex justify-center mb-5">
                        <span className="visuo-section-badge">{t('monitorCity')}</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-normal text-center mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>{t('selectACity')}</h1>
                    <p className="text-text-secondary text-sm mb-12 text-center max-w-md">{t('citySelectDesc')}</p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-3xl w-full">
                        {CITIES.map(city => (
                            <button key={city.name} onClick={() => setSelectedCity(city.name)}
                                className="visuo-card flex flex-col items-start gap-1 p-5 text-left transition-all duration-300 cursor-pointer font-sans group hover:-translate-y-1"
                                style={{ fontFamily: 'Inter, sans-serif', border: '0.8px solid rgba(255,255,255,0.12)' }}>
                                <span className="text-sm font-semibold text-text-primary group-hover:text-white transition-colors">{city.name}</span>
                                <span className="text-[0.68rem] text-text-muted">{city.state}</span>
                                {city.name === 'Delhi' && <span className="text-[0.58rem] font-semibold mt-1.5" style={{ color: '#735EEF' }}>⬤ {t('liveData')}</span>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    /* -- Main Dashboard -- */
    return (
        <div className="bg-bg-deep text-text-primary font-sans min-h-screen flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
            <div className="grid-bg" />

            {/* Visuo Header */}
            <header className="relative z-10 flex items-center justify-between px-6 py-3.5 flex-shrink-0" style={{ backdropFilter: 'blur(12px)', borderBottom: '0.8px solid rgba(255,255,255,0.08)', background: 'rgba(18,17,22,0.90)' }}>
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-2 font-semibold text-base no-underline text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #735EEF, #4D7CFF)', flexShrink: 0 }} />
                        <span><span style={{ color: '#735EEF' }}>Signal</span>Sync</span>
                    </Link>
                    <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
                    <span className="text-xs text-text-muted">{t('liveControl')}</span>
                    <span className="text-xs font-semibold" style={{ color: '#735EEF' }}>{selectedCity}</span>
                    <button onClick={() => setSelectedCity(null)} className="text-[0.6rem] text-text-muted hover:text-white font-sans cursor-pointer" style={{ background: 'rgba(255,255,255,0.05)', border: '0.8px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '2px 8px' }}>{t('changeCity')}</button>
                </div>

                <div className="flex items-center gap-8">
                    {[
                        [t('activeCorridorsHdr'), String(liveCorridors.length || 0), '#4ade80'],
                        [t('nodesOnline'), '24/24', '#735EEF'],
                        [t('avgDensity'), `${avgDensity}%`, avgDensity > 70 ? '#f87171' : avgDensity > 45 ? '#fbbf24' : '#4ade80'],
                    ].map(([l, v, c]) => (
                        <div key={l} className="flex flex-col items-center">
                            <span className="text-[0.55rem] text-text-muted uppercase tracking-widest">{l}</span>
                            <span className="text-lg font-bold font-mono leading-tight" style={{ color: c }}>{v}</span>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: 'rgba(74,222,128,0.08)', border: '0.8px solid rgba(74,222,128,0.25)' }}>
                        <StatusDot color="green" /><span className="font-mono text-xs text-text-secondary">LIVE</span>
                    </div>
                    <Link href="/portal" className="visuo-btn-ghost" style={{ padding: '6px 16px', fontSize: '0.8rem' }}>{t('portalLink')}</Link>
                    <Link href="/" className="visuo-btn-ghost" style={{ padding: '6px 16px', fontSize: '0.8rem' }}>{t('homeLink')}</Link>
                </div>
            </header>

            {/* Main content */}
            <main className="relative z-10 flex-1 p-6 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 overflow-auto">

                {/* LEFT column */}
                <div className="flex flex-col gap-6">

                    {/* --- Feature Navigator --- */}
                    <div className="bg-bg-card border border-white/5 rounded-2xl p-4">
                        <div className="text-[0.6rem] font-bold uppercase tracking-widest text-text-muted mb-3">{t('featureNav')}</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <Link href="/routes" className="flex flex-col gap-1 bg-accent-cyan/[0.05] border border-accent-cyan/20 hover:border-accent-cyan/50 rounded-xl p-3 no-underline transition-all group">
                                <span className="text-xs font-bold text-accent-cyan group-hover:text-white transition-colors">{t('routeFinder')}</span>
                                <span className="text-[0.6rem] text-text-muted leading-tight">{t('routeFinderDesc2')}</span>
                            </Link>
                            <Link href="/portal" className="flex flex-col gap-1 bg-accent-green/[0.05] border border-accent-green/20 hover:border-accent-green/50 rounded-xl p-3 no-underline transition-all group">
                                <span className="text-xs font-bold text-accent-green group-hover:text-white transition-colors">{t('greenCorridor')}</span>
                                <span className="text-[0.6rem] text-text-muted leading-tight">{t('greenCorridorDesc')}</span>
                            </Link>
                            <button onClick={() => document.getElementById('yolo-panel')?.scrollIntoView({ behavior: 'smooth' })} className="flex flex-col gap-1 bg-accent-amber/[0.05] border border-accent-amber/20 hover:border-accent-amber/50 rounded-xl p-3 text-left transition-all group cursor-pointer font-sans">
                                <span className="text-xs font-bold text-accent-amber group-hover:text-white transition-colors">{t('visualFailsafe')}</span>
                                <span className="text-[0.6rem] text-text-muted leading-tight">{t('visualFailsafeDesc')}</span>
                            </button>
                            <Link href="/admin" className="flex flex-col gap-1 bg-accent-red/[0.05] border border-accent-red/20 hover:border-accent-red/50 rounded-xl p-3 no-underline transition-all group">
                                <span className="text-xs font-bold text-accent-red group-hover:text-white transition-colors">{t('adminPanel')}</span>
                                <span className="text-[0.6rem] text-text-muted leading-tight">{t('adminPanelDesc')}</span>
                            </Link>
                        </div>
                    </div>

                    {/* Live Green Corridors */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-bold uppercase tracking-widest text-text-muted">{t('liveGreenCorridors')}  {selectedCity}</h2>
                                {cityLiveCorridors.length > 0 && (
                                    <span className="text-[0.6rem] font-bold bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan rounded-full px-2 py-0.5">{cityLiveCorridors.length} {t('activeCors')}</span>
                                )}
                            </div>
                            <Link href="/portal" className="text-[0.7rem] font-semibold text-accent-cyan hover:text-white transition-colors no-underline">{t('newCorridor')}</Link>
                        </div>

                        {cityLiveCorridors.length === 0 ? (
                            <div className="border border-white/5 border-dashed rounded-2xl p-8 text-center">
                                <div className="text-3xl mb-3"></div>
                                <div className="text-sm font-semibold text-text-muted mb-2">{t('noActiveCorridorsCity')} {selectedCity}</div>
                                <p className="text-xs text-text-muted mb-4">{t('corridorFromPortal')}</p>
                                <Link href="/portal" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-accent-cyan text-black no-underline hover:shadow-[0_0_20px_rgba(0,245,255,0.4)] transition-all">
                                    {t('activateGreenCorridor')}
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                    {cityLiveCorridors.slice(0, 2).map(c => (
                                        <CorridorCard key={c.id} corridor={c} onTerminate={() => terminateCorridor(c.id)} t={t} />
                                    ))}
                                </div>
                                {cityLiveCorridors.length > 2 && (
                                    <div className="text-center mt-3">
                                        <Link href="/portal" className="text-[0.72rem] font-semibold no-underline transition-colors" style={{ color: '#a78bfa' }}>
                                            +{cityLiveCorridors.length - 2} more corridor{cityLiveCorridors.length - 2 > 1 ? 's' : ''} · View all in Portal →
                                        </Link>
                                    </div>
                                )}
                            </>
                        )}
                    </section>

                    {/* ALL Intersection Nodes */}
                    <NodesSection nodes={nodes} onSelectNode={setSelectedNode} selectedNode={selectedNode} selectedCity={selectedCity} t={t} />

                    {/* --- YOLO AI Traffic Density Panel (full-width) --- */}
                    <YoloFailsafePanel cityName={selectedCity} />
                </div>

                {/* RIGHT sidebar */}
                <div className="flex flex-col gap-5">

                    {/* Active corridor (static/demo) */}
                    <div className="bg-bg-card border border-white/5 rounded-2xl p-5">
                        <div className="text-[0.65rem] font-bold uppercase tracking-widest text-text-muted mb-4"> {t('demoCorridor')}  {selectedCity}</div>
                        <div className="bg-accent-cyan/[0.04] border border-accent-cyan/15 rounded-xl p-4">
                            <div className="flex flex-wrap gap-1.5 mb-3"><Badge variant="red">AMB-042</Badge><Badge variant="green">{t('activeCors')}</Badge></div>
                            <div className="text-xs font-semibold mb-1"> {(CITY_NODES[selectedCity] || CITY_NODES['Delhi'])[0]?.name || 'Start'}</div>
                            <div className="w-0.5 h-3 bg-gradient-to-b from-accent-green to-accent-cyan ml-2 my-1.5" />
                            <div className="text-xs font-semibold mb-3"> {(CITY_NODES[selectedCity] || CITY_NODES['Delhi'])[4]?.name || 'End'}</div>

                            <DemoCorridorStatus etaStr={etaStr} cityName={selectedCity} />

                            <div className="flex gap-5 pt-3 border-t border-white/5 mt-3">
                                {[[t('speed'), `${speed} km/h`, 'text-white'], [t('stops'), '0', 'text-accent-green']].map(([l, v, c]) => (
                                    <div key={l}><div className="text-[0.58rem] text-text-muted uppercase">{l}</div><div className={`font-bold font-mono text-sm ${c}`}>{v}</div></div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Lane density */}
                    <div className="bg-bg-card border border-white/5 rounded-2xl p-5">
                        <div className="text-[0.65rem] font-bold uppercase tracking-widest text-text-muted mb-4"> {t('laneDensity')}  {selectedCity}</div>
                        <div className="flex flex-col gap-3">
                            {cityLanes.map((label, i) => {
                                const d = nodes[i * 4]?.density ?? 50;
                                const c = d < 40 ? 'progress-fill-green' : d < 70 ? 'progress-fill-amber' : 'progress-fill-red';
                                const tc = d < 40 ? 'text-accent-green' : d < 70 ? 'text-accent-amber' : 'text-accent-red';
                                return (
                                    <div key={label} className="flex items-center gap-2.5 text-xs text-text-secondary">
                                        <span className="w-[90px] flex-shrink-0 truncate">{label}</span>
                                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${c} transition-all duration-700`} style={{ width: `${d}%` }} />
                                        </div>
                                        <span className={`w-8 text-right font-bold font-mono text-xs ${tc}`}>{d}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* City stats */}
                    <div className="bg-bg-card border border-white/5 rounded-2xl p-5">
                        <div className="text-[0.65rem] font-bold uppercase tracking-widest text-text-muted mb-4"> {t('cityStats')}</div>
                        <div className="grid grid-cols-2 gap-3">
                            {[[t('avgWait'), '8.3s', 'text-text-primary'], [t('co2Saved'), '2.4 t', 'text-accent-green'], [t('fuelSaved'), '1,840L', 'text-accent-green'], [t('congestion'), `${avgDensity}%`, avgDensity > 70 ? 'text-accent-red' : 'text-accent-amber']].map(([l, v, c]) => (
                                <div key={l} className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                    <div className="text-[0.6rem] text-text-muted mb-1">{l}</div>
                                    <div className={`text-base font-bold font-mono ${c}`}>{v}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-bg-card border border-white/5 rounded-2xl p-5">
                        <div className="text-[0.65rem] font-bold uppercase tracking-widest text-text-muted mb-4"> {t('actions')}</div>
                        <Link href="/portal" className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-bold bg-accent-cyan text-black no-underline hover:shadow-[0_0_20px_rgba(0,245,255,0.4)] transition-all">
                            {t('newGreenCorridor')}
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
