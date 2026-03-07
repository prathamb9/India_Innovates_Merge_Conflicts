'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Badge from '@/components/Badge';
import StatusDot from '@/components/StatusDot';
import CorridorStatusBox from '@/components/CorridorStatusBox';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { MAPS_LIBRARIES, DELHI_NODES } from '@/components/DelhiMap';
import { useAuth } from '@/components/AuthProvider';
import { createCorridor, terminateCorridor, subscribeActiveCOrridors } from '@/lib/firestore';

const DelhiMap = dynamic(() => import('@/components/DelhiMap'), {
    ssr: false,
    loading: () => (
        <div style={{ height: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050c18', borderRadius: '12px', color: '#00f5ff', fontSize: '0.9rem' }}>
            Loading map…
        </div>
    )
});

const CITIES = [
    { name: 'Delhi', bounds: { north: 28.883, south: 28.404, east: 77.347, west: 76.839 } },
    { name: 'Mumbai', bounds: { north: 19.269, south: 18.893, east: 73.047, west: 72.776 } },
    { name: 'Bengaluru', bounds: { north: 13.144, south: 12.832, east: 77.752, west: 77.458 } },
    { name: 'Hyderabad', bounds: { north: 17.540, south: 17.248, east: 78.631, west: 78.327 } },
    { name: 'Chennai', bounds: { north: 13.234, south: 12.953, east: 80.334, west: 80.207 } },
    { name: 'Pune', bounds: { north: 18.633, south: 18.418, east: 73.957, west: 73.768 } },
    { name: 'Kolkata', bounds: { north: 22.639, south: 22.395, east: 88.430, west: 88.246 } },
    { name: 'Ahmedabad', bounds: { north: 23.121, south: 22.922, east: 72.705, west: 72.490 } },
];

// ── Pick the N DELHI_NODES geographically closest to the route midpoints ──────
function pickCorridorNodes(originLatLng, destLatLng, count = 5) {
    if (!originLatLng || !destLatLng) return [];

    // Build evenly-spaced waypoints along the straight-line route
    const waypoints = [];
    for (let i = 0; i <= count + 1; i++) {
        const t = i / (count + 1);
        waypoints.push({
            lat: originLatLng.lat + (destLatLng.lat - originLatLng.lat) * t,
            lng: originLatLng.lng + (destLatLng.lng - originLatLng.lng) * t,
        });
    }

    // For each waypoint, pick the closest Delhi node not already used
    const used = new Set();
    const picked = [];
    for (const wp of waypoints.slice(1, -1)) {
        let best = null, bestDist = Infinity;
        for (const node of DELHI_NODES) {
            if (used.has(node.id)) continue;
            const d = Math.hypot(node.pos[0] - wp.lat, node.pos[1] - wp.lng);
            if (d < bestDist) { bestDist = d; best = node; }
        }
        if (best) { used.add(best.id); picked.push(best); }
    }

    return picked.slice(0, count);
}

function PlaceInput({ label, placeholder, onPlaceSelect, cityBounds, keyId }) {
    const acRef = useRef(null);
    const acOptions = cityBounds
        ? { bounds: cityBounds, strictBounds: true, componentRestrictions: { country: 'in' } }
        : { componentRestrictions: { country: 'in' } };
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">{label}</label>
            <Autocomplete key={keyId} onLoad={ac => { acRef.current = ac; }}
                onPlaceChanged={() => {
                    if (!acRef.current) return;
                    const place = acRef.current.getPlace();
                    if (place?.geometry?.location) {
                        onPlaceSelect({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng(), name: place.formatted_address || place.name || '' });
                    }
                }} options={acOptions}>
                <input className="input-field w-full" placeholder={placeholder} style={{ width: '100%' }} />
            </Autocomplete>
        </div>
    );
}

// Opens Google Maps navigation (works as native app on mobile)
function openNavigation(originLatLng, destLatLng) {
    if (!originLatLng || !destLatLng) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${originLatLng.lat},${originLatLng.lng}&destination=${destLatLng.lat},${destLatLng.lng}&travelmode=driving`;
    window.open(url, '_blank');
}

export default function PortalPage() {
    const { user, userProfile, logout } = useAuth();
    const isAdmin = userProfile?.role === 'admin';

    const { isLoaded: mapsLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries: MAPS_LIBRARIES,
    });

    const [city, setCity] = useState('Delhi');
    const [corridorType, setCorridorType] = useState('ambulance');
    const [originLatLng, setOriginLatLng] = useState(null);
    const [destLatLng, setDestLatLng] = useState(null);
    const [originName, setOriginName] = useState('');
    const [destName, setDestName] = useState('');
    const [adminVehicle, setAdminVehicle] = useState('');
    const [showCorridor, setShowCorridor] = useState(false);
    const [corridorActive, setCorridorActive] = useState(false);
    const [routeInfo, setRouteInfo] = useState(null);
    const [calculating, setCalculating] = useState(false);
    const [creating, setCreating] = useState(false);
    const [activeCds, setActiveCds] = useState([]);
    const [etaSec, setEtaSec] = useState(0);
    const [dupError, setDupError] = useState('');

    // ── Corridor node state ──────────────────────────────────────────────────
    const [corridorNodes, setCorridorNodes] = useState([]);   // [{id, name}]
    const [activeNodeIdx, setActiveNodeIdx] = useState(0);

    // All active corridors from Firestore (all cities)
    useEffect(() => {
        const unsub = subscribeActiveCOrridors(setActiveCds);
        return () => unsub();
    }, []);

    // ETA countdown
    useEffect(() => {
        if (!corridorActive || etaSec <= 0) return;
        const t = setInterval(() => setEtaSec(s => Math.max(0, s - 1)), 1000);
        return () => clearInterval(t);
    }, [corridorActive]);

    const handleRouteResult = useCallback((info) => {
        setRouteInfo(info);
        setEtaSec(info.durationSec || 0);
    }, []);

    // ── Callback fired by DelhiMap as ambulance crosses each node ──────────
    const handleNodeAdvance = useCallback((nodeIdx) => {
        setActiveNodeIdx(nodeIdx);
        // Persist to localStorage so dashboard can read it
        try {
            const raw = localStorage.getItem('aura_active_corridors');
            const corridors = raw ? JSON.parse(raw) : [];
            if (corridors.length > 0) {
                corridors[0].activeNodeIdx = nodeIdx;
                localStorage.setItem('aura_active_corridors', JSON.stringify(corridors));
            }
        } catch { }
    }, []);

    function resetRoute() {
        setOriginLatLng(null); setDestLatLng(null);
        setOriginName(''); setDestName('');
        setShowCorridor(false); setCorridorActive(false);
        setRouteInfo(null); setDupError('');
        setCorridorNodes([]); setActiveNodeIdx(0);
    }

    function calcRoute() {
        if (!originLatLng || !destLatLng) return;
        setCalculating(true);
        setTimeout(() => { setCalculating(false); setShowCorridor(true); setCorridorActive(false); setRouteInfo(null); setDupError(''); }, 600);
    }

    async function initiateWave() {
        if (!user || !originLatLng || !destLatLng) return;

        // ── Duplicate Check ──────────────────────────────────────────
        const vehicleNum = isAdmin && adminVehicle.trim()
            ? adminVehicle.trim().toUpperCase()
            : (userProfile?.vehicleNumber || 'N/A');

        const sameVehicleActive = activeCds.find(
            c => c.vehicleNumber === vehicleNum && c.city === city
        );
        if (sameVehicleActive) {
            setDupError(`Vehicle ${vehicleNum} already has an active corridor in ${city}. Terminate it first.`);
            return;
        }

        const sameRouteActive = activeCds.find(
            c => c.city === city &&
                c.originName === originName &&
                c.destName === destName
        );
        if (sameRouteActive) {
            setDupError(`This route (${originName} → ${destName}) already has an active corridor in ${city}.`);
            return;
        }

        setDupError('');
        setCreating(true);

        // ── Compute corridor nodes ───────────────────────────────────
        const nodes = pickCorridorNodes(originLatLng, destLatLng, 5);
        setCorridorNodes(nodes);
        setActiveNodeIdx(0);

        try {
            const docRef = await createCorridor(user.uid, {
                creatorName: userProfile?.name || user.email,
                vehicleNumber: vehicleNum,
                vehicleType: corridorType,
                city,
                originName,
                destName,
                originLatLng,
                destLatLng,
                distanceText: routeInfo?.distanceText || '',
                durationText: routeInfo?.durationText || '',
                corridorNodes: nodes.map(n => ({ id: n.id, name: n.name })),
            });

            // Persist to localStorage for dashboard
            try {
                const existing = localStorage.getItem('aura_active_corridors');
                const arr = existing ? JSON.parse(existing) : [];
                arr.unshift({
                    id: docRef.id,
                    vehicleId: vehicleNum,
                    origin: originName,
                    dest: destName,
                    distance: routeInfo?.distanceText || '',
                    duration: routeInfo?.durationText || '',
                    corridorType,
                    corridorNodes: nodes.map(n => ({ id: n.id, name: n.name })),
                    activeNodeIdx: 0,
                });
                localStorage.setItem('aura_active_corridors', JSON.stringify(arr));
            } catch { }

            setCorridorActive(true);
        } catch (err) {
            console.error('Failed to create corridor:', err);
        } finally {
            setCreating(false);
        }
    }

    async function handleTerminate(corridorId) {
        if (!user) return;
        await terminateCorridor(corridorId);
    }

    // ── City-filtered corridors (only show same city as selector) ──
    const cityCorridors = activeCds.filter(c => c.city === city);
    const canCalc = !!originLatLng && !!destLatLng;
    const cityBounds = CITIES.find(c => c.name === city)?.bounds;
    const etaStr = etaSec > 0 ? `${Math.floor(etaSec / 60)}m ${(etaSec % 60).toString().padStart(2, '0')}s` : routeInfo?.durationText || '—';

    return (
        <div className="min-h-screen bg-bg-deep font-sans relative">
            <div className="grid-bg" />

            {/* ── Nav ── */}
            <nav className="relative z-10 flex items-center justify-between px-10 py-3.5 bg-bg-deep/95 border-b border-white/5 backdrop-blur-xl">
                <Link href="/" className="flex items-center gap-2.5 font-extrabold text-xl no-underline text-white">
                    <div className="w-8 h-8 rounded-[6px] bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center neon-cyan">⬡</div>
                    <span><span className="text-accent-cyan">AURA</span>-GRID</span>
                </Link>

                <div className="flex items-center gap-2.5">
                    {user ? (
                        <>
                            {isAdmin && <Badge variant="red">Administrator</Badge>}
                            <Badge variant="green"><StatusDot color="green" className="mr-1" />{userProfile?.name || user.email}</Badge>
                            {userProfile?.vehicleNumber && <Badge variant="violet">{userProfile.vehicleNumber}</Badge>}
                        </>
                    ) : (
                        <span className="text-text-muted text-xs">Viewing as Guest</span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Link href="/" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/5 text-text-primary no-underline">Home</Link>
                    <Link href="/dashboard" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/5 text-text-primary no-underline">Dashboard</Link>
                    <Link href="/routes" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/5 text-text-primary no-underline">Route Finder</Link>
                    {isAdmin && <Link href="/admin" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-accent-red/15 border border-accent-red/30 text-accent-red no-underline">Admin</Link>}
                    {user
                        ? <button onClick={logout} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[rgba(255,59,92,0.15)] text-accent-red border border-accent-red/30 font-sans cursor-pointer">Logout</button>
                        : <Link href="/auth/login" className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan no-underline">Sign In</Link>
                    }
                </div>
            </nav>

            <div className="relative z-10 max-w-[1400px] mx-auto px-10 py-8">

                {/* ── City Selector (global, always visible) ── */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center gap-3 flex-1">
                        <span className="text-text-muted text-sm font-semibold uppercase tracking-wide whitespace-nowrap">Select City:</span>
                        <div className="flex flex-wrap gap-2">
                            {CITIES.map(c => (
                                <button key={c.name} onClick={() => { setCity(c.name); resetRoute(); }}
                                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all font-sans cursor-pointer ${city === c.name ? 'bg-accent-cyan/15 border border-accent-cyan/40 text-accent-cyan' : 'bg-white/[0.03] border border-white/5 text-text-secondary hover:border-accent-cyan/20'}`}>
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                        <span className="text-xs text-text-muted">{cityCorridors.length} active in {city}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-6">

                    {/* ── LEFT COLUMN ── */}
                    <div className="flex flex-col gap-5">

                        {/* Route Finder (always public) */}
                        <div className="bg-bg-card border border-white/5 rounded-xl p-6">
                            <h3 className="text-lg font-bold mb-1">Route Finder</h3>
                            <p className="text-text-secondary text-sm mb-4">Find the best route with live {city} traffic — no sign-in needed.</p>

                            <div className="flex flex-col gap-3.5">
                                {mapsLoaded ? (
                                    <PlaceInput key={`origin-${city}`} label="Origin" placeholder={`Start point in ${city}...`} cityBounds={cityBounds}
                                        onPlaceSelect={p => { setOriginLatLng({ lat: p.lat, lng: p.lng }); setOriginName(p.name); setShowCorridor(false); setCorridorActive(false); setRouteInfo(null); setDupError(''); }} />
                                ) : <div className="flex flex-col gap-1.5"><label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Origin</label><input disabled className="input-field opacity-50" placeholder="Loading Google Maps..." /></div>}

                                <div className="flex items-center gap-2.5">
                                    <div className="flex-1 h-px bg-white/10" />
                                    <button onClick={() => { const ol = originLatLng, on = originName; setOriginLatLng(destLatLng); setDestLatLng(ol); setOriginName(destName); setDestName(on); resetRoute(); }}
                                        className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-text-secondary font-sans cursor-pointer">⇅</button>
                                    <div className="flex-1 h-px bg-white/10" />
                                </div>

                                {mapsLoaded ? (
                                    <PlaceInput key={`dest-${city}`} label="Destination" placeholder={`End point in ${city}...`} cityBounds={cityBounds}
                                        onPlaceSelect={p => { setDestLatLng({ lat: p.lat, lng: p.lng }); setDestName(p.name); setShowCorridor(false); setCorridorActive(false); setRouteInfo(null); setDupError(''); }} />
                                ) : <div className="flex flex-col gap-1.5"><label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Destination</label><input disabled className="input-field opacity-50" placeholder="Loading Google Maps..." /></div>}

                                <button onClick={calcRoute} disabled={calculating || !canCalc}
                                    className="w-full py-3 rounded-xl font-bold bg-gradient-to-br from-accent-cyan to-[#0099cc] text-black disabled:opacity-50 hover:shadow-[0_0_20px_rgba(0,245,255,0.4)] transition-all font-sans cursor-pointer">
                                    {calculating ? 'Routing...' : 'Get Best Route'}
                                </button>
                            </div>

                            {/* Route Result */}
                            {showCorridor && routeInfo && (
                                <div className="mt-5 pt-5 border-t border-white/10 flex flex-col gap-4">
                                    <div className="flex gap-3">
                                        <div className="flex-1 bg-white/[0.02] border border-white/10 rounded-xl p-3.5 text-center">
                                            <div className="text-[0.65rem] text-text-muted uppercase mb-1">With Traffic</div>
                                            <div className="text-xl font-extrabold font-mono text-accent-amber">{routeInfo.durationText}</div>
                                            <div className="text-xs text-text-secondary mt-1">{routeInfo.distanceText}</div>
                                        </div>
                                        <div className="flex-1 bg-accent-green/5 border border-accent-green/30 rounded-xl p-3.5 text-center">
                                            <div className="text-[0.65rem] text-text-muted uppercase mb-1">AURA Corridor</div>
                                            <div className="text-xl font-extrabold font-mono text-accent-green">~{Math.round((routeInfo.durationSec * 0.6) / 60)}m</div>
                                            <div className="text-xs text-text-secondary mt-1">Zero stops</div>
                                        </div>
                                    </div>

                                    {/* GPS Navigate Button (always shown) */}
                                    <button onClick={() => openNavigation(originLatLng, destLatLng)}
                                        className="w-full py-3 rounded-xl font-bold bg-gradient-to-br from-[#4285F4] to-[#1a73e8] text-white hover:shadow-[0_0_20px_rgba(66,133,244,0.4)] transition-all font-sans cursor-pointer flex items-center justify-center gap-2">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                                        Start Navigation in Google Maps
                                    </button>

                                    {/* Create Corridor — auth required */}
                                    {user ? (
                                        <>
                                            {/* Corridor type selector */}
                                            <div className="flex gap-2">
                                                {[['ambulance', 'Ambulance'], ['fire', 'Fire Truck'], ['vvip', 'VVIP']].map(([v, l]) => (
                                                    <button key={v} onClick={() => setCorridorType(v)}
                                                        className={`flex-1 py-2 rounded-xl border text-sm transition-all font-sans cursor-pointer ${corridorType === v ? 'bg-accent-cyan/10 border-accent-cyan/35 text-accent-cyan' : 'bg-white/[0.03] border-white/5 text-text-secondary hover:border-accent-cyan/25'}`}>
                                                        {l}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Admin vehicle override */}
                                            {isAdmin && (
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[0.78rem] font-semibold text-accent-red uppercase tracking-wide">Vehicle # Override (Admin)</label>
                                                    <input className="input-field font-mono" value={adminVehicle} onChange={e => setAdminVehicle(e.target.value)} placeholder="e.g. AMB-099" />
                                                </div>
                                            )}

                                            {dupError && (
                                                <div className="bg-accent-amber/10 border border-accent-amber/30 rounded-xl p-3 text-sm text-accent-amber">
                                                    {dupError}
                                                </div>
                                            )}

                                            {!corridorActive ? (
                                                <button onClick={initiateWave} disabled={creating}
                                                    className="w-full py-4 rounded-xl font-bold text-base bg-gradient-to-br from-accent-green to-[#00cc7a] text-black shadow-[0_0_20px_rgba(0,255,157,0.3)] hover:shadow-[0_0_30px_rgba(0,255,157,0.6)] disabled:opacity-60 transition-all font-sans cursor-pointer">
                                                    {creating ? 'Activating...' : 'Initiate Green Wave'}
                                                </button>
                                            ) : (
                                                /* ── ACTIVE CORRIDOR — show CorridorStatusBox ── */
                                                <div className="flex flex-col gap-4">
                                                    {/* Pulse header */}
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-accent-green animate-pulse" />
                                                        <span className="text-sm font-bold text-accent-green">GREEN WAVE ACTIVE</span>
                                                        <span className="ml-auto text-xs font-mono text-accent-cyan">{etaStr}</span>
                                                    </div>

                                                    {/* Live corridor node status */}
                                                    {corridorNodes.length > 0 && (
                                                        <CorridorStatusBox
                                                            nodes={corridorNodes}
                                                            activeIdx={activeNodeIdx}
                                                            eta={etaStr}
                                                            stops={0}
                                                        />
                                                    )}

                                                    {/* GPS Navigate for active corridor */}
                                                    <button onClick={() => openNavigation(originLatLng, destLatLng)}
                                                        className="w-full py-2.5 rounded-xl font-bold text-sm bg-[#4285F4] text-white hover:bg-[#1a73e8] transition-all font-sans cursor-pointer flex items-center justify-center gap-2">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                                                        Navigate in Google Maps
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        /* Not logged in — invite to sign in for corridor creation */
                                        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 text-center">
                                            <div className="text-sm font-semibold mb-1">Want a Green Corridor?</div>
                                            <p className="text-text-muted text-xs mb-3">Sign in to activate a priority green signal corridor for ambulances, fire trucks &amp; VVIP convoys.</p>
                                            <div className="flex gap-2 justify-center">
                                                <Link href="/auth/login" className="px-4 py-2 rounded-xl font-bold text-sm bg-accent-green text-black no-underline">Sign In</Link>
                                                <Link href="/auth/register" className="px-4 py-2 rounded-xl font-bold text-sm bg-white/5 border border-white/10 text-white no-underline">Register</Link>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── RIGHT COLUMN ── */}
                    <div className="flex flex-col gap-5">

                        {/* Map */}
                        <div className="bg-bg-card border border-white/5 rounded-xl p-5">
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <h3 className="text-base font-bold">{city} Traffic Map</h3>
                                    <p className="text-text-secondary text-xs">{showCorridor && originName && destName ? `${originName} → ${destName}` : 'Select origin and destination above'}</p>
                                </div>
                                <Badge variant="cyan"><StatusDot color="cyan" className="mr-1" />Live</Badge>
                            </div>
                            <DelhiMap showCorridor={showCorridor} corridorActive={corridorActive}
                                originLatLng={originLatLng} destLatLng={destLatLng}
                                originName={originName} destName={destName}
                                onRouteResult={handleRouteResult}
                                onNodeUpdate={() => { }}
                                onNodeAdvance={handleNodeAdvance}
                                corridorNodeCount={corridorNodes.length}
                            />
                        </div>

                        {/* Active corridors — THIS CITY ONLY */}
                        <div className="bg-bg-card border border-white/5 rounded-xl p-5">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-base font-bold">Active Corridors — {city}</h3>
                                <Badge variant="green">
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent-green inline-block mr-1.5 animate-pulse" />
                                    {cityCorridors.length} Active
                                </Badge>
                            </div>

                            {cityCorridors.length === 0 ? (
                                <div className="text-center py-6 border border-white/5 border-dashed rounded-xl">
                                    <div className="text-2xl mb-2">🟢</div>
                                    <p className="text-text-muted text-sm">No active corridors in {city} right now.</p>
                                    {!user && <p className="text-text-muted text-xs mt-1">Sign in to create one for emergency vehicles.</p>}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {cityCorridors.map(c => {
                                        const canTerminate = user && (isAdmin || c.uid === user.uid);
                                        return (
                                            <div key={c.id} className="bg-accent-cyan/[0.03] border border-accent-cyan/20 rounded-xl p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse flex-shrink-0" />
                                                        <Badge variant="red">{c.vehicleNumber}</Badge>
                                                        <span className="text-[0.65rem] text-text-muted capitalize border border-white/10 rounded-full px-2 py-0.5">{c.vehicleType}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {c.originLatLng && c.destLatLng && (
                                                            <button onClick={() => openNavigation(c.originLatLng, c.destLatLng)}
                                                                title="Navigate in Google Maps"
                                                                className="text-[0.6rem] font-bold text-[#4285F4] border border-[#4285F4]/30 rounded-lg px-2 py-0.5 bg-[#4285F4]/10 hover:bg-[#4285F4]/20 font-sans cursor-pointer">
                                                                GPS
                                                            </button>
                                                        )}
                                                        {canTerminate && (
                                                            <button onClick={() => handleTerminate(c.id)}
                                                                className="text-[0.6rem] font-bold text-accent-red border border-accent-red/30 rounded-lg px-2 py-0.5 bg-accent-red/10 hover:bg-accent-red/20 font-sans cursor-pointer">
                                                                TERMINATE
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-text-secondary leading-relaxed">{c.originName} → {c.destName}</div>

                                                {/* Show CorridorStatusBox for Firestore corridors that have nodes */}
                                                {c.corridorNodes && c.corridorNodes.length > 0 && (
                                                    <div className="mt-3">
                                                        <CorridorStatusBox
                                                            nodes={c.corridorNodes}
                                                            activeIdx={corridorActive && c.originName === originName ? activeNodeIdx : 0}
                                                            eta={c.durationText || '—'}
                                                            stops={0}
                                                        />
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className="text-[0.65rem] text-text-muted">By {c.creatorName}</span>
                                                    {c.distanceText && <span className="text-[0.65rem] text-accent-cyan font-mono">{c.distanceText}</span>}
                                                    {c.durationText && <span className="text-[0.65rem] text-accent-amber font-mono">{c.durationText}</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
