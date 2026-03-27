'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Badge from '@/components/Badge';
import StatusDot from '@/components/StatusDot';
import { useLanguage } from '@/components/LanguageProvider';

/* -- Stat counter hook -- */
function useCountUp(target, duration = 1800) {
    const [value, setValue] = useState(0);
    const ref = useRef(null);
    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => {
            if (!e.isIntersecting) return;
            obs.unobserve(e.target);
            let start = null;
            const step = (ts) => {
                if (!start) start = ts;
                const progress = Math.min((ts - start) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                setValue(Math.round(eased * target));
                if (progress < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        }, { threshold: 0.5 });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [target, duration]);
    return [value, ref];
}

/* -- Traffic Light (hero) -- */
function TrafficLight({ state }) {
    return (
        <div className="flex flex-col items-center gap-1 bg-[#0a0a0a] border-2 border-[#222] rounded-[14px] p-2">
            {['red', 'amber', 'green'].map((c) => (
                <div
                    key={c}
                    className={`w-[22px] h-[22px] rounded-full transition-all ${state === c ? `tl-light-active-${c}` : 'bg-white/5'
                        }`}
                />
            ))}
        </div>
    );
}

/* -- Hero intersection animation -- */
function HeroVisual() {
    const [tlState, setTlState] = useState({ ns: 'red', ew: 'green' });
    const [ambX, setAmbX] = useState(0);
    const [pulse, setPulse] = useState(true);

    useEffect(() => {
        let pos = 0;
        let raf;
        const speed = 1.5;
        const cycle = () => {
            pos += speed;
            if (pos >= 100 && pos < 110) setTlState({ ns: 'amber', ew: 'green' });
            if (pos >= 120 && pos < 125) setTlState({ ns: 'red', ew: 'red' });
            if (pos >= 135) setTlState({ ns: 'red', ew: 'green' });
            if (pos > 290) {
                pos = 0;
                setTlState({ ns: 'red', ew: 'green' });
            }
            setAmbX(pos);
            raf = requestAnimationFrame(cycle);
        };
        raf = requestAnimationFrame(cycle);
        const blinkT = setInterval(() => setPulse((p) => !p), 800);
        return () => { cancelAnimationFrame(raf); clearInterval(blinkT); };
    }, []);

    return (
        <div className="relative h-[460px] hidden lg:block">
            {/* Intersection */}
            <div className="relative w-[300px] h-[300px] mx-auto top-1/2 -translate-y-1/2">
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-20 bg-[#141a26] border border-white/5" />
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-20 bg-[#141a26] border border-white/5" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-[#1a2234] border border-accent-cyan/10" />
                {/* Traffic lights */}
                <div className="absolute top-5 left-1/2 -translate-x-1/2"><TrafficLight state={tlState.ns} /></div>
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2"><TrafficLight state={tlState.ns} /></div>
                <div className="absolute left-5 top-1/2 -translate-y-1/2"><div className="flex gap-1 bg-[#0a0a0a] border-2 border-[#222] rounded-[14px] p-2">{['red', 'amber', 'green'].map(c => <div key={c} className={`w-[22px] h-[22px] rounded-full ${tlState.ew === c ? `tl-light-active-${c}` : 'bg-white/5'}`} />)}</div></div>
                <div className="absolute right-5 top-1/2 -translate-y-1/2"><div className="flex gap-1 bg-[#0a0a0a] border-2 border-[#222] rounded-[14px] p-2">{['red', 'amber', 'green'].map(c => <div key={c} className={`w-[22px] h-[22px] rounded-full ${tlState.ew === c ? `tl-light-active-${c}` : 'bg-white/5'}`} />)}</div></div>
                {/* Ambulance  flipped so it faces right (forward direction) */}
                <div className="absolute text-xl z-10 leading-none" style={{ top: '140px', left: `${ambX}px`, transform: 'scaleX(-1)' }}></div>
                {/* Scan line */}
                <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-cyan to-transparent opacity-80 animate-scan" />
                {/* Info overlay */}
                <div className="absolute -bottom-12 left-0 right-0 flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-xs font-mono"><StatusDot color="green" /><span className="text-text-secondary">AI CAMERA ONLINE</span></div>
                    <Badge variant="red" className={`transition-opacity ${pulse ? 'opacity-100' : 'opacity-30'}`}>AMBULANCE DETECTED</Badge>
                </div>
            </div>
            {/* Data panels */}
            {[
                { pos: 'top-0 left-0', label: 'NORTH LANE', pct: 82, color: 'red', delay: '0s' },
                { pos: 'top-0 right-0', label: 'EAST LANE', pct: 23, color: 'green', delay: '1s' },
                { pos: 'bottom-14 left-0', label: 'YOLO DETECT', custom: true, delay: '2s' },
                { pos: 'bottom-14 right-0', label: 'GREEN WAVE ETA', eta: true, delay: '0.5s' },
            ].map(({ pos, label, pct, color, custom, eta, delay }) => (
                <div key={label} className={`absolute ${pos} bg-bg-card border border-white/5 rounded-xl p-2.5 min-w-[130px] animate-float`} style={{ animationDelay: delay }}>
                    <div className="text-[0.7rem] text-text-muted mb-1">{label}</div>
                    {!custom && !eta && (
                        <>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden"><div className={`h-full rounded-full progress-fill-${color}`} style={{ width: `${pct}%` }} /></div>
                            <div className={`text-[0.75rem] font-bold mt-1 ${color === 'red' ? 'text-accent-red' : 'text-accent-green'}`}>{pct}% Dense</div>
                        </>
                    )}
                    {custom && (
                        <>
                            <div className="text-[0.72rem] text-accent-cyan font-mono">Class: Ambulance</div>
                            <div className="text-[0.72rem] text-accent-green font-mono">Conf: 97.2%</div>
                        </>
                    )}
                    {eta && <div className="text-[1.4rem] font-black text-accent-green font-mono">00:03</div>}
                </div>
            ))}
        </div>
    );
}

/* -- Stat Card -- */
function StatCard({ target, unit, label }) {
    const [value, ref] = useCountUp(target);
    return (
        <div ref={ref} className="flex-1 min-w-[130px] px-5 py-4 flex flex-col gap-1">
            <div>
                <span className="text-[2.2rem] font-extrabold leading-none text-white font-mono">{value}</span>
                <span className="text-xl font-bold text-accent-purple ml-1">{unit}</span>
            </div>
            <div className="text-[0.72rem] text-text-muted mt-0.5">{label}</div>
        </div>
    );
}

/* -- Pillar Card -- */
function PillarCard({ letter, badge, variant, title, desc, features, tags }) {
    const borderMap = {
        cyan: 'border-accent-cyan/20 hover:border-accent-cyan/40',
        green: 'border-accent-green/20 hover:border-accent-green/40',
        violet: 'border-accent-violet/20 hover:border-accent-violet/40',
    };
    const letterBg = {
        cyan:   'bg-[rgba(0,245,255,0.1)] text-accent-cyan',
        green:  'bg-[rgba(0,255,157,0.1)] text-accent-green',
        violet: 'bg-[rgba(115,94,239,0.1)] text-accent-violet',
    };
    const dotColor = { cyan: 'bg-accent-cyan', green: 'bg-accent-green', violet: 'bg-accent-violet' };
    return (
        <div className={`bg-bg-card border rounded-xl p-8 flex flex-col gap-5 hover:-translate-y-1 transition-all duration-300 ${borderMap[variant]}`}
             style={{ borderRadius: 24 }}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-[1.3rem] font-bold ${letterBg[variant]}`}>{letter}</div>
            <div>
                <Badge variant={variant}>{badge}</Badge>
                <h3 className="text-base font-semibold mt-2 leading-snug text-text-primary">{title}</h3>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
            <ul className="flex flex-col gap-2">
                {features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[0.82rem] text-text-secondary">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${dotColor[variant]}`} />
                        {f}
                    </li>
                ))}
            </ul>
            <div className="flex flex-wrap gap-1.5 mt-auto">
                {tags.map((t) => <Badge key={t} variant={variant}>{t}</Badge>)}
            </div>
        </div>
    );
}

/* -- Flow Panel -- */
const FLOWS = [
    {
        id: 0, label: 'Commuter', badge: 'cyan', color: 'cyan',
        title: 'Everyday Commuter  Smart Routing',
        desc: 'The public-facing layer. Every citizen benefits from AI-optimized routing without any special access.',
        steps: [
            ['Open the public app', 'Enter your destination as usual'],
            ['AI Overlay Applied', 'Base route from Google Maps API, augmented with live intersection wait times from SignalSync cameras'],
            ['Dynamic Re-routing', 'If your route hits density >70%, the app reroutes you in real time, naturally balancing city-wide load'],
            ['Arrive Faster', 'Average 40% reduction in intersection wait time citywide'],
        ],
    },
    {
        id: 1, label: 'Ambulance', badge: 'red', color: 'red',
        title: 'Verified Ambulance Dispatcher',
        desc: 'Planned Green Corridor  zero stops from accident site to hospital.',
        steps: [
            ['Dispatcher logs in', 'Authenticates via secure Green Corridor Portal with hospital credentials'],
            ['Enter Route', 'Our custom A* graph algorithm calculates the fastest, clearest path'],
            ['Initiate Green Wave', 'System preempts every intersection 30 seconds before arrival'],
            ['Zero Stops', 'Ambulance passes through a dynamically maintained green corridor end-to-end'],
        ],
    },
    {
        id: 2, label: 'Visual Override', badge: 'amber', color: 'amber',
        title: 'Unexpected Emergency  Visual Failsafe',
        desc: 'No GPS, no portal  the Edge-AI camera detects the vehicle and acts autonomously.',
        steps: [
            ['Ambulance approaches', 'Not using the portal  GPS unavailable. Standard approach to intersection'],
            ['YOLO Detection', 'Camera detects Class: Ambulance with 97%+ confidence  shape, color, strobe pattern'],
            ['Safety Buffer Protocol', '3-second yellow clearance -> cross-traffic turns red -> emergency lane turns green'],
            ['Auto-resume', 'Once vehicle clears the frame, intersection instantly returns to AI dynamic cycle'],
        ],
    },
    {
        id: 3, label: 'VVIP Convoy', badge: 'violet', color: 'violet',
        title: 'VVIP & Security Convoy Protocol',
        desc: 'Highest clearance tier  full route lock with extended buffers before and after the convoy.',
        steps: [
            ['Security Chief logs in', 'MFA-secured access with VVIP-tier credentials'],
            ['Route Mapping', 'System prioritizes wider roads and fewer complex intersections for convoy safety'],
            ['Convoy Lock activated', 'Extended green buffer  cross-traffic held red before AND after convoy passes'],
            ['Node Release', 'Once the final vehicle clears a node, AI dynamic cycle resumes instantly'],
        ],
    },
];

function FlowsSection() {
    const [active, setActive] = useState(0);
    const { t } = useLanguage();

    const FLOWS = [
        {
            id: 0, labelKey: 'flow1Label', badge: 'cyan', color: 'cyan',
            titleKey: 'flow1Title',
            desc: 'The public-facing layer. Every citizen benefits from AI-optimized routing without any special access.',
            steps: [
                ['Open the public app', 'Enter your destination as usual'],
                ['AI Overlay Applied', 'Base route from Google Maps API, augmented with live intersection wait times from SignalSync cameras'],
                ['Dynamic Re-routing', 'If your route hits density >70%, the app reroutes you in real time, naturally balancing city-wide load'],
                ['Arrive Faster', 'Average 40% reduction in intersection wait time citywide'],
            ],
        },
        {
            id: 1, labelKey: 'flow2Label', badge: 'red', color: 'red',
            titleKey: 'flow2Title',
            desc: 'Planned Green Corridor  zero stops from accident site to hospital.',
            steps: [
                ['Dispatcher logs in', 'Authenticates via secure Green Corridor Portal with hospital credentials'],
                ['Enter Route', 'Our custom A* graph algorithm calculates the fastest, clearest path'],
                ['Initiate Green Wave', 'System preempts every intersection 30 seconds before arrival'],
                ['Zero Stops', 'Ambulance passes through a dynamically maintained green corridor end-to-end'],
            ],
        },
        {
            id: 2, labelKey: 'flow3Label', badge: 'amber', color: 'amber',
            titleKey: 'flow3Title',
            desc: 'No GPS, no portal  the Edge-AI camera detects the vehicle and acts autonomously.',
            steps: [
                ['Ambulance approaches', 'Not using the portal  GPS unavailable. Standard approach to intersection'],
                ['YOLO Detection', 'Camera detects Class: Ambulance with 97%+ confidence  shape, color, strobe pattern'],
                ['Safety Buffer Protocol', '3-second yellow clearance -> cross-traffic turns red -> emergency lane turns green'],
                ['Auto-resume', 'Once vehicle clears the frame, intersection instantly returns to AI dynamic cycle'],
            ],
        },
        {
            id: 3, labelKey: 'flow4Label', badge: 'violet', color: 'violet',
            titleKey: 'flow4Title',
            desc: 'Highest clearance tier  full route lock with extended buffers before and after the convoy.',
            steps: [
                ['Security Chief logs in', 'MFA-secured access with VVIP-tier credentials'],
                ['Route Mapping', 'System prioritizes wider roads and fewer complex intersections for convoy safety'],
                ['Convoy Lock activated', 'Extended green buffer  cross-traffic held red before AND after convoy passes'],
                ['Node Release', 'Once the final vehicle clears a node, AI dynamic cycle resumes instantly'],
            ],
        },
    ];

    const flow = FLOWS[active];
    const stepNumColor = { cyan: 'bg-[rgba(0,245,255,0.12)] text-accent-cyan', red: 'bg-[rgba(255,59,92,0.12)] text-accent-red', amber: 'bg-[rgba(255,184,0,0.12)] text-accent-amber', violet: 'bg-[rgba(124,58,237,0.12)] text-[#a78bfa]' };

    return (
        <section id="flows" className="relative z-10 py-24">
            <div className="max-w-[1200px] mx-auto px-10">
                <div className="flex items-center gap-2 mb-4 text-accent-cyan text-xs font-bold uppercase tracking-widest">
                    <span className="w-5 h-0.5 bg-accent-cyan rounded-full" />{t('flowsLabel')}
                </div>
                <h2 className="text-4xl font-extrabold tracking-tight leading-tight mb-3">
                    {t('flowsTitle')}
                </h2>

                {/* Tabs */}
                <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1 max-w-[700px] mt-10 mb-10">
                    {FLOWS.map((f, i) => (
                        <button key={f.id} onClick={() => setActive(i)}
                            className={`flex-1 py-2 px-4 rounded-lg text-[0.85rem] font-semibold transition-all font-sans ${active === i ? 'bg-bg-card text-accent-cyan shadow-[0_2px_8px_rgba(0,0,0,0.3)]' : 'text-text-muted hover:text-text-secondary'
                                }`}>
                            {t(f.labelKey)}
                        </button>
                    ))}
                </div>

                {/* Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-fade-in-up">
                    {/* Steps */}
                    <div className="flex flex-col gap-4">
                        <Badge variant={flow.badge}>{flow.badge === 'cyan' ? 'Flow 1' : flow.badge === 'red' ? 'Flow 2' : flow.badge === 'amber' ? 'Flow 3' : 'Flow 4'}</Badge>
                        <h3 className="text-2xl font-extrabold mt-2">{t(flow.titleKey)}</h3>
                        <p className="text-text-secondary text-sm">{flow.desc}</p>
                        {flow.steps.map(([title, desc], i) => (
                            <div key={i} className="flex gap-4 items-start bg-white/[0.02] border border-white/5 rounded-xl p-4">
                                <div className={`min-w-[36px] h-9 rounded-lg flex items-center justify-center text-xs font-extrabold font-mono flex-shrink-0 ${stepNumColor[flow.color]}`}>
                                    0{i + 1}
                                </div>
                                <div>
                                    <div className="font-semibold text-sm">{title}</div>
                                    <div className="text-text-secondary text-xs mt-0.5 leading-relaxed">{desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Visual card */}
                    <div className="flex items-center">
                        <div className="w-full bg-bg-card border border-white/5 rounded-xl p-5">
                            {flow.id === 0 && (
                                <>
                                    <div className="text-[0.75rem] text-text-muted mb-3">LIVE ROUTE OPTIMIZER</div>
                                    <div className="flex items-center gap-2 py-2 border-b border-white/5 text-xs"><span className="w-2 h-2 rounded-full bg-accent-green" />MG Road {'->'}  City Hospital<span className="ml-auto text-accent-green font-bold">12 min </span></div>
                                    <div className="flex items-center gap-2 py-2 text-xs opacity-60"><span className="w-2 h-2 rounded-full bg-accent-red" /><span className="line-through text-text-muted">Via Highway 4</span><span className="ml-auto text-accent-red">Congested</span></div>
                                    <div className="mt-4"><div className="text-[0.72rem] text-text-muted mb-1.5">NEXT INTERSECTION WAIT</div><div className="h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full progress-fill-green" style={{ width: '20%' }} /></div><div className="text-xs text-accent-green mt-1">~8 seconds</div></div>
                                </>
                            )}
                            {flow.id === 1 && (
                                <>
                                    <div className="text-[0.75rem] text-text-muted mb-3">GREEN CORRIDOR STATUS</div>
                                    {[['green', 'Node 1  MG Road', 'GREEN '], ['green', 'Node 2  Station Rd', 'GREEN '], ['amber', 'Node 3  Jubilee Hills', 'PREP '], ['cyan', 'Node 4  Sec 12', 'QUEUED'], ['cyan', 'City Hospital', 'QUEUED']].map(([c, n, s]) => (
                                        <div key={n} className={`flex items-center gap-2 p-2 rounded-lg text-xs mb-1.5 border cnode-${c === 'amber' ? 'preparing' : c === 'cyan' ? 'pending' : 'active'}`}><StatusDot color={c} />{n}<Badge variant={c === 'green' ? 'green' : c === 'amber' ? 'amber' : 'cyan'} className="ml-auto text-[0.65rem] py-0">{s}</Badge></div>
                                    ))}
                                    <div className="flex gap-4 mt-3 pt-3 border-t border-white/5 text-xs"><div><div className="text-text-muted">ETA</div><div className="font-bold text-accent-green">4m 12s</div></div><div><div className="text-text-muted">Stops</div><div className="font-bold text-accent-green">0</div></div><div><div className="text-text-muted">Nodes</div><div className="font-bold text-accent-cyan">5/5</div></div></div>
                                </>
                            )}
                            {flow.id === 2 && (
                                <>
                                    <div className="text-[0.75rem] text-text-muted mb-2">EDGE-AI CAMERA FEED</div>
                                    <div className="relative bg-[#050810] border border-accent-cyan/20 rounded-lg h-36 overflow-hidden">
                                        <div className="absolute top-1.5 left-2 text-[0.6rem] text-accent-cyan font-mono z-10">CAM-07 · LIVE · 30fps</div>
                                        <div className="cam-detect-box">Ambulance · 97.2%</div>
                                        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-cyan to-transparent animate-scan-fast opacity-60" />
                                    </div>
                                    <div className="flex gap-2 mt-3 flex-wrap"><Badge variant="red">OVERRIDE ACTIVE</Badge><Badge variant="amber">YELLOW {'->'} RED {'->'} GREEN</Badge></div>
                                </>
                            )}
                            {flow.id === 3 && (
                                <>
                                    <div className="text-[0.75rem] text-text-muted mb-2">CONVOY LOCK STATUS</div>
                                    <div className="flex justify-center gap-2 my-3">{['[P]', '[VIP]', '[P]'].map((v, i) => <div key={i} className={`text-sm font-bold font-mono bg-white/5 border rounded-lg px-3 py-2 ${i === 1 ? 'bg-[rgba(255,184,0,0.15)] border-accent-amber text-accent-amber' : 'border-white/5 text-text-muted'}`}>{v}</div>)}</div>
                                    <div className="text-center text-xs text-[#a78bfa] mb-3"> Extended Buffer Zone {'->'} </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-[rgba(255,59,92,0.15)] border border-accent-red/30 rounded-lg p-3 text-center"><div className="text-[0.7rem] text-text-muted">Cross Traffic</div><div className="text-accent-red font-bold text-sm">HELD RED</div></div>
                                        <div className="bg-[rgba(0,255,157,0.1)] border border-accent-green/30 rounded-lg p-3 text-center"><div className="text-[0.7rem] text-text-muted">Convoy Lane</div><div className="text-accent-green font-bold text-sm">ALL GREEN</div></div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* -- FAQ -- */
const FAQS = [
    { q: 'What if two ambulances approach from opposite directions?', a: 'The system assigns priority via a FIFO queue. If hospital integration is active, the vehicle carrying the more critical patient (e.g., Cardiac Arrest > Broken Arm) receives priority. The secondary ambulance gets a 3-second delayed corridor activation.' },
    { q: 'What if the camera goes down or is covered in rain?', a: 'The system automatically detects a null or degraded camera feed and reverts to pre-programmed fixed-timer fallback mode. An alert is sent to the control center. Normal AI operation resumes automatically when the feed is restored.' },
    { q: 'How do we prevent abuse of the VVIP system?', a: 'Every "Green Corridor" request is immutably logged with a timestamp, user ID, GPS track, and session token. MFA is required for VVIP-tier access. All logs are auditable and tamper-evident.' },
    { q: 'What if the internet connection is lost mid-corridor?', a: 'Each intersection node caches the corridor plan locally at activation. If cloud connectivity drops, the node executes its pre-cached green schedule autonomously until the last downloaded instruction expires, then defaults to safe fixed-timer mode.' },
    { q: 'Does this worsen pedestrian safety at crossings?', a: 'No. The algorithm enforces a non-negotiable minimum 15-second pedestrian phase regardless of vehicle density. Emergency overrides always trigger the 3-second yellow safety buffer, giving pedestrians time to clear.' },
    { q: 'Is this scalable to an entire city?', a: 'Yes. Edge AI at each node means processing is distributed  no single server bottleneck. The central server only handles coordination signals (WebSocket messages), not video processing.' },
];

function FaqSection() {
    const [open, setOpen] = useState(null);
    const { t } = useLanguage();
    const FAQS = [
        { qKey: 'faq1Q', aKey: 'faq1A' },
        { qKey: 'faq2Q', aKey: 'faq2A' },
        { qKey: 'faq3Q', aKey: 'faq3A' },
        { qKey: 'faq4Q', aKey: 'faq4A' },
        { qKey: 'faq5Q', aKey: 'faq5A' },
        { qKey: 'faq6Q', aKey: 'faq6A' },
    ];
    return (
        <section id="faq" className="relative z-10 py-24">
            <div className="max-w-[1200px] mx-auto px-10">
                <div className="flex items-center gap-2 mb-4 text-accent-cyan text-xs font-bold uppercase tracking-widest"><span className="w-5 h-0.5 bg-accent-cyan rounded-full" />{t('faqLabel')}</div>
                <h2 className="text-4xl font-extrabold tracking-tight mb-3">{t('faqTitle').split(' ').slice(0, -1).join(' ')} <span className="grad-text">{t('faqTitle').split(' ').slice(-1)[0]}</span></h2>
                <p className="text-text-secondary mb-12 max-w-xl">{t('faqDesc')}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {FAQS.map((faq, i) => (
                        <div key={i} onClick={() => setOpen(open === i ? null : i)}
                            className={`bg-bg-card border rounded-xl p-5 cursor-pointer transition-all hover:border-accent-cyan/20 ${open === i ? 'border-accent-cyan/25' : 'border-white/5'}`}>
                            <div className="flex items-center gap-2.5 font-semibold text-sm">
                                <span>{t(faq.qKey)}</span>
                                <span className={`ml-auto text-text-muted transition-transform ${open === i ? 'rotate-180 text-accent-cyan' : ''}`}></span>
                            </div>
                            {open === i && <p className="text-text-secondary text-[0.875rem] leading-relaxed mt-3 pt-3 border-t border-white/5">{t(faq.aKey)}</p>}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

    /* -- Main Page Export -- */
export default function HomePage() {
    const { t } = useLanguage();
    return (
        <>
            {/* ── VISUO BACKGROUND (home page only) ── */}
            {/* Base near-black */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: '#05040d' }} />

            {/* Central purple cone/spotlight from top-center */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
                background: [
                    'radial-gradient(ellipse 50% 60% at 50% -5%, rgba(141,86,253,0.72) 0%, rgba(115,94,239,0.35) 38%, transparent 65%)',
                    'radial-gradient(ellipse 90% 55% at 50% -8%, rgba(100,60,220,0.25) 0%, transparent 62%)',
                    'radial-gradient(ellipse 22% 70% at 0% 50%, rgba(115,94,239,0.08) 0%, transparent 70%)',
                    'radial-gradient(ellipse 22% 70% at 100% 50%, rgba(115,94,239,0.08) 0%, transparent 70%)',
                ].join(', '),
            }} />

            {/* Top 1px purple edge glow line */}
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, height: '1px', zIndex: 9999, pointerEvents: 'none',
                background: 'linear-gradient(90deg, transparent 0%, rgba(115,94,239,0.55) 18%, rgba(141,86,253,1) 50%, rgba(115,94,239,0.55) 82%, transparent 100%)',
                boxShadow: '0 0 22px 4px rgba(141,86,253,0.45), 0 0 60px 8px rgba(115,94,239,0.18)',
            }} />

            {/* Bottom 1px blue-purple edge glow line */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, height: '1px', zIndex: 9999, pointerEvents: 'none',
                background: 'linear-gradient(90deg, transparent 0%, rgba(77,124,255,0.65) 15%, rgba(141,86,253,0.95) 50%, rgba(77,124,255,0.65) 85%, transparent 100%)',
                boxShadow: '0 0 28px 5px rgba(77,124,255,0.30), 0 0 80px 14px rgba(141,86,253,0.18)',
            }} />

            <Navbar />

            {/* ── HERO ─────────────────────────────────────────────── */}
            <section id="hero" className="relative min-h-screen flex items-center pt-28 pb-20 overflow-hidden">
                {/* Visuo purple radial glow */}
                <div className="visuo-glow" style={{ width: 700, height: 700, top: '-250px', left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(ellipse at center, rgba(115,94,239,0.30) 0%, rgba(77,124,255,0.12) 40%, transparent 70%)' }} />

                <div className="max-w-[1100px] mx-auto px-8 w-full flex flex-col items-center text-center">
                    {/* Pill badge */}
                    <div className="visuo-badge mb-8">
                        <StatusDot color="green" />
                        <span>{t('heroBadge')}</span>
                    </div>

                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-normal leading-[1.1] tracking-[-1px] mb-6 animate-fade-in-up" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {t('heroTitle') || <>Intelligent Traffic<br />That <span style={{ color: '#735EEF' }}>Saves Lives</span><br />in Real Time</>}
                    </h1>

                    <p className="text-lg text-text-secondary leading-relaxed max-w-[540px] mb-10">
                        {t('heroDesc')}
                    </p>

                    {/* Visuo pill CTAs */}
                    <div className="flex flex-wrap gap-4 justify-center mb-14">
                        <a href="#pillars" className="visuo-btn-primary">{t('exploreSolution')}</a>
                        <Link href="/dashboard" className="visuo-btn-ghost">{t('liveDashboard')}</Link>
                    </div>

                    {/* Stats bar */}
                    <div className="flex flex-wrap bg-bg-card border rounded-xl overflow-hidden divide-x" style={{ borderColor: 'rgba(255,255,255,0.12)', borderRadius: 20, borderWidth: '0.8px' }}>
                        {[
                            { target: 94, unit: '%',  label: t('stat1Label') },
                            { target: 3,  unit: 's',  label: t('stat2Label') },
                            { target: 40, unit: '%',  label: t('stat3Label') },
                            { target: 95, unit: '%+', label: t('stat4Label') },
                        ].map(s => <StatCard key={s.label} {...s} />)}
                    </div>
                </div>
            </section>

            <div className="g-divider" />

            {/* ── PROBLEM ──────────────────────────────────────────── */}
            <section id="problem" className="relative z-10 py-28">
                <div className="max-w-[1100px] mx-auto px-8">
                    <div className="flex justify-center mb-5">
                        <span className="visuo-section-badge">{t('crisisLabel')}</span>
                    </div>
                    <h2 className="text-4xl sm:text-5xl font-normal text-center mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>{t('crisisTitle')}</h2>
                    <p className="text-text-secondary text-center mb-14 max-w-xl mx-auto">{t('crisisDesc')}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {[
                            { icon: '🚨', bg: 'rgba(248,113,113,0.08)', color: '#f87171', border: 'rgba(248,113,113,0.18)', titleKey: 'crisis1Title', descKey: 'crisis1Desc', statKey: 'crisis1Stat', statLabelKey: 'crisis1StatLabel' },
                            { icon: '⏱️', bg: 'rgba(251,191,36,0.08)',  color: '#fbbf24', border: 'rgba(251,191,36,0.18)',  titleKey: 'crisis2Title', descKey: 'crisis2Desc', statKey: 'crisis2Stat', statLabelKey: 'crisis2StatLabel' },
                            { icon: '📡', bg: 'rgba(115,94,239,0.08)',  color: '#735EEF', border: 'rgba(115,94,239,0.18)',  titleKey: 'crisis3Title', descKey: 'crisis3Desc', statKey: 'crisis3Stat', statLabelKey: 'crisis3StatLabel' },
                        ].map(({ icon, bg, color, border, titleKey, descKey, statKey, statLabelKey }) => (
                            <div key={titleKey} className="visuo-card p-7 flex flex-col gap-4 hover:-translate-y-1 transition-all duration-300">
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: bg, border: `0.8px solid ${border}` }}>{icon}</div>
                                <h3 className="font-semibold text-base text-text-primary">{t(titleKey)}</h3>
                                <p className="text-text-secondary text-sm leading-relaxed flex-1">{t(descKey)}</p>
                                <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                                    <span className="text-2xl font-black font-mono" style={{ color }}>{t(statKey)}</span>
                                    <span className="text-xs text-text-muted">{t(statLabelKey)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="g-divider" />

            {/* ── PILLARS ──────────────────────────────────────────── */}
            <section id="pillars" className="relative z-10 py-28">
                <div className="max-w-[1100px] mx-auto px-8">
                    <div className="flex justify-center mb-5">
                        <span className="visuo-section-badge">{t('solutionLabel')}</span>
                    </div>
                    <h2 className="text-4xl sm:text-5xl font-normal text-center mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>{t('pillarsTitle')}</h2>
                    <p className="text-text-secondary text-center mb-14 max-w-xl mx-auto">{t('pillarsDesc')}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <PillarCard letter="A" badge="Pillar A" variant="cyan"   title={t('pillarATitle')} desc={t('pillarADesc')} features={[t('pillarAF1'), t('pillarAF2'), t('pillarAF3')]} tags={['YOLOv8', 'OpenCV', 'WebSocket']} />
                        <PillarCard letter="B" badge="Pillar B" variant="green"  title={t('pillarBTitle')} desc={t('pillarBDesc')} features={[t('pillarBF1'), t('pillarBF2'), t('pillarBF3')]} tags={['Edge AI', 'PyTorch', 'Offline']} />
                        <PillarCard letter="C" badge="Pillar C" variant="violet" title={t('pillarCTitle')} desc={t('pillarCDesc')} features={[t('pillarCF1'), t('pillarCF2'), t('pillarCF3')]} tags={['RBAC + MFA', 'FastAPI', 'React.js']} />
                    </div>
                </div>
            </section>

            <div className="g-divider" />

            <FlowsSection />

            <div className="g-divider" />



            <FaqSection />

            <div className="g-divider" />

            {/* ── CTA AREA BEFORE FOOTER ────────────────────────── */}
            <section className="relative z-10 py-28 text-center overflow-hidden">
                <div className="visuo-glow" style={{ width: 600, height: 400, bottom: '-100px', left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(ellipse at center, rgba(115,94,239,0.22) 0%, transparent 70%)' }} />
                <div className="relative z-10 max-w-[700px] mx-auto px-8">
                    <span className="visuo-badge mb-6 inline-flex">Get started today</span>
                    <h2 className="text-4xl sm:text-5xl font-normal mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>Ready to transform your city&apos;s traffic?</h2>
                    <p className="text-text-secondary mb-10 max-w-md mx-auto">Deploy AI-powered signal management across every intersection.</p>
                    <div className="flex gap-4 justify-center">
                        <Link href="/dashboard" className="visuo-btn-primary">Open Live Dashboard</Link>
                        <Link href="/portal" className="visuo-btn-ghost">Launch Green Corridor</Link>
                    </div>
                </div>
            </section>

            <div className="g-divider" />

            {/* ── FOOTER ───────────────────────────────────────────── */}
            <footer className="relative z-10 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0D0B12' }}>
                <div className="max-w-[1100px] mx-auto px-8 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
                    {/* Brand */}
                    <div className="md:col-span-1">
                        <Link href="/" className="flex items-center gap-2.5 font-semibold text-lg no-underline text-white mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                            <img src="/logo.png" alt="SignalSync Logo" className="w-8 h-8 rounded-lg object-contain" />
                            <span><span style={{ color: '#735EEF' }}>Signal</span>Sync</span>
                        </Link>
                        <p className="text-text-muted text-xs leading-relaxed mb-4">{t('footerDesc')}</p>
                        <div className="flex items-center gap-2"><StatusDot color="green" /><span className="text-xs text-text-secondary">{t('footerStatus')}</span></div>
                    </div>
                    {/* Emergency */}
                    <div>
                        <div className="text-[0.65rem] font-semibold uppercase tracking-widest text-text-muted mb-4">{t('footerEmergency')}</div>
                        <div className="flex flex-col gap-2.5">
                            {[['Ambulance', '102'], ['Fire Brigade', '101'], ['Police', '100'], ['AIIMS Delhi', '011-2658-8500'], ['GVK EMRI', '108']].map(([l, v]) => (
                                <div key={l} className="flex justify-between items-center text-xs border-b pb-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                    <span className="text-text-secondary">{l}</span>
                                    <span className="font-mono font-bold" style={{ color: '#4ade80' }}>{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Cities */}
                    <div>
                        <div className="text-[0.65rem] font-semibold uppercase tracking-widest text-text-muted mb-4">{t('footerCities')}</div>
                        <div className="grid grid-cols-2 gap-1.5">
                            {['Mumbai','Delhi','Bengaluru','Hyderabad','Chennai','Pune','Kolkata','Ahmedabad'].map(c => (
                                <div key={c} className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-white transition-colors cursor-default">
                                    <span className="w-1 h-1 rounded-full" style={{ background: '#735EEF' }} />{c}
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Links */}
                    <div>
                        <div className="text-[0.65rem] font-semibold uppercase tracking-widest text-text-muted mb-4">{t('footerQuickAccess')}</div>
                        <div className="flex flex-col gap-2">
                            <Link href="/dashboard" className="text-xs text-text-secondary hover:text-white no-underline transition-colors">{t('liveDashboard')}</Link>
                            <Link href="/portal"    className="text-xs text-text-secondary hover:text-white no-underline transition-colors">{t('footerPortal')}</Link>
                            <a href="#pillars"      className="text-xs text-text-secondary hover:text-white no-underline transition-colors">{t('footerSolution')}</a>
                            <a href="#flows"        className="text-xs text-text-secondary hover:text-white no-underline transition-colors">{t('footerUserJourneys')}</a>
                            <a href="#faq"          className="text-xs text-text-secondary hover:text-white no-underline transition-colors">{t('footerEdgeCases')}</a>
                        </div>
                    </div>
                </div>
                <div className="px-8 py-4 flex justify-between items-center flex-wrap gap-3" style={{ borderTop: '0.8px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-[0.68rem] text-text-muted">© 2026 SignalSync · India Innovates Hackathon · Prototype v1.0</span>
                    <span className="text-[0.68rem] text-text-muted">Built with Next.js · React · Inter · Tailwind CSS</span>
                </div>
            </footer>
        </>
    );
}
