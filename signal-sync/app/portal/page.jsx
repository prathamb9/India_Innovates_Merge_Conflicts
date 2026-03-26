'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Badge from '@/components/Badge';
import StatusDot from '@/components/StatusDot';
import CorridorStatusBox from '@/components/CorridorStatusBox';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { MAPS_LIBRARIES } from '@/components/DelhiMap';
import { useAuth } from '@/components/AuthProvider';
import { createCorridor, terminateCorridor, subscribeActiveCOrridors, setSignalStatus } from '@/lib/firestore';
import { pickCorridorNodes, nodesOnPolyline } from '@/lib/cityNodes';
import { useLanguage } from '@/components/LanguageProvider';

const DelhiMap = dynamic(() => import('@/components/DelhiMap'), {
    ssr: false,
    loading: () => (
        <div style={{ height: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050c18', borderRadius: '12px', color: '#00f5ff', fontSize: '0.9rem' }}>
            Loading map
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

// -- Derive node status string from activeNodeIdx ------------------------------
function getNodeStatus(nodeIdx, activeIdx) {
    if (nodeIdx < activeIdx) return 'done';
    if (nodeIdx === activeIdx) return 'active';
    if (nodeIdx === activeIdx + 1) return 'prep';
    return 'queued';
}

export default function PortalPage() {
    const { user, userProfile, logout } = useAuth();
    const isAdmin = userProfile?.role === 'admin';
    const { t } = useLanguage();

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

    // Dynamic Form States
    const [patientSeverity, setPatientSeverity] = useState('Stable');
    const [dispatchRef, setDispatchRef] = useState('');
    const [fireType, setFireType] = useState('Residential');
    const [fireSeverity, setFireSeverity] = useState('Low');
    const [vvipLevel, setVvipLevel] = useState('Minister');
    const [timeSensitivity, setTimeSensitivity] = useState('Standard');

    // -- Corridor node state --------------------------------------------------
    const [corridorNodes, setCorridorNodes] = useState([]);
    const [activeNodeIdx, setActiveNodeIdx] = useState(0);
    const [activeCdId, setActiveCdId] = useState(null);

    // -- IoT preemption visual state ------------------------------------------
    const [iotPreemption, setIotPreemption] = useState(null); // { nodeName, distance }

    // -- GPS / Navigation state -----------------------------------------------
    const [userLocation, setUserLocation] = useState(null);
    const [navigationMode, setNavigationMode] = useState(false);
    const [gpsError, setGpsError] = useState('');
    const [gpsLoading, setGpsLoading] = useState(false);
    const watchIdRef = useRef(null);

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

    // -- Auto-advance node timer (Fallback for when GPS is stationary) --------
    useEffect(() => {
        if (!corridorActive || corridorNodes.length === 0) return;
        
        // Every 12 seconds, if we skip a node manually or stay stationary, 
        // we auto-advance the green wave to the next node.
        const interval = setInterval(() => {
            const nextIdx = activeNodeIdx + 1;
            if (nextIdx < corridorNodes.length) {
                const nextNode = corridorNodes[nextIdx];
                if (nextNode?.id) {
                    console.log(` AUTO-ADVANCE: Turning ${nextNode.name} green via timer wave`);
                    setSignalStatus(nextNode.id, 'green', 'AUTO-TIMER');
                }
                const prevNode = corridorNodes[activeNodeIdx];
                if (prevNode?.id) {
                    console.log(` AUTO-ADVANCE: Releasing ${prevNode.name}`);
                    setSignalStatus(prevNode.id, 'auto', null);
                }
                setActiveNodeIdx(nextIdx);
            }
        }, 12000);

        return () => clearInterval(interval);
    }, [corridorActive, corridorNodes, activeNodeIdx]);

    // Stop GPS watch when navigation ends
    useEffect(() => {
        return () => {
            if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
        };
    }, []);

    const handleRouteResult = useCallback((info) => {
        setRouteInfo(info);
        setEtaSec(info.durationSec || 0);
    }, []);

    // Receives matched city signal nodes from DelhiMap (nodesOnPolyline result).
    // Guard: do NOT overwrite nodes if corridor is already active  that
    // would reset activeNodeIdx and break live navigation.
    const handleRouteNodes = useCallback((nodes) => {
        if (corridorActive) return;  // never overwrite during live corridor
        if (nodes.length > 0) {
            setCorridorNodes(nodes);
            setActiveNodeIdx(0);
        }
    }, [corridorActive]);

    // -- Use My Location -------------------------------------------------------
    function useMyLocation() {
        if (!navigator.geolocation) {
            setGpsError('Geolocation is not supported by your browser.');
            return;
        }
        setGpsLoading(true);
        setGpsError('');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setUserLocation(loc);
                setOriginLatLng(loc);
                setOriginName(' My Current Location');
                setShowCorridor(false);
                setCorridorActive(false);
                setRouteInfo(null);
                setDupError('');
                setGpsLoading(false);
            },
            (err) => {
                setGpsError('Location access denied. Please allow location in browser settings.');
                setGpsLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }

    // -- Start In-App Navigation -----------------------------------------------
    function startNavigation() {
        if (!navigator.geolocation) {
            setGpsError('Geolocation not supported.');
            return;
        }
        setGpsError('');
        setNavigationMode(true);
        // Clear any existing watch
        if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            (err) => {
                setGpsError('GPS signal lost. Using last known position.');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
        );
    }

    function stopNavigation() {
        if (watchIdRef.current != null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setNavigationMode(false);
    }

    // -- Callback fired by DelhiMap as ambulance crosses each node --------------
    const handleNodeAdvance = useCallback(async (nodeIdx) => {
        setActiveNodeIdx(nodeIdx);

        // Auto-release the previous node's IOT preemption now that the ambulance has crossed it
        if (corridorNodes[nodeIdx - 1]?.id) {
            try { await setSignalStatus(corridorNodes[nodeIdx - 1].id, 'auto', null); } catch (e) { console.error(e); }
        }

        try {
            const raw = localStorage.getItem('signalsync_active_corridors');
            const corridors = raw ? JSON.parse(raw) : [];
            if (corridors.length > 0) {
                corridors[0].activeNodeIdx = nodeIdx;
                localStorage.setItem('signalsync_active_corridors', JSON.stringify(corridors));
            }
        } catch { }
    }, [corridorNodes]);

    // -- Callback fired when ambulance enters 500m geofence --------------------
    const handleIotTrigger = useCallback((node, distance) => {
        if (!node.id) return;
        console.log(` IOT PREEMPTION: ${node.name} (${node.id})  ambulance ${distance}m away`);
        // Show visual indicator on portal
        setIotPreemption({ nodeName: node.name, distance });
        // Auto-clear the indicator after 8 seconds
        setTimeout(() => setIotPreemption(null), 8000);

        // Encode the distance into the overriddenBy string for the dashboard to parse.
        // We do NOT await this, and we silently catch network timeouts.
        setSignalStatus(node.id, 'green', `IOT-AUTO:${distance}`)
            .then(() => console.log(`   Firestore signal overridden: ${node.id} -> GREEN`))
            .catch(e => {
                // Ignore "Could not reach Cloud Firestore backend" offline errors that happen if websocket drops
                if (!e.message?.includes('Cloud Firestore backend')) {
                    console.error('Failed to trigger IoT preemption', e);
                }
            });
    }, []);

    // -- Auto-terminate when ambulance reaches destination ----------------------
    const handleArrival = useCallback(async () => {
        setActiveNodeIdx(prev => prev + 100);
        setTimeout(async () => {
            // Force release the final intersection upon arrival
            if (corridorNodes.length > 0) {
                const lastNode = corridorNodes[corridorNodes.length - 1];
                if (lastNode?.id) try { await setSignalStatus(lastNode.id, 'auto', null); } catch (e) { }
            }

            setCorridorActive(false);
            setShowCorridor(false);
            setCorridorNodes([]);
            setActiveNodeIdx(0);
            stopNavigation();
            if (activeCdId) {
                try { await terminateCorridor(activeCdId); } catch { }
                setActiveCdId(null);
            }
            try {
                const raw = localStorage.getItem('signalsync_active_corridors');
                const corridors = raw ? JSON.parse(raw) : [];
                const updated = corridors.filter(c => c.id !== activeCdId);
                localStorage.setItem('signalsync_active_corridors', JSON.stringify(updated));
            } catch { }
        }, 2500);
    }, [activeCdId]);

    function resetRoute() {
        setOriginLatLng(null); setDestLatLng(null);
        setOriginName(''); setDestName('');
        setShowCorridor(false); setCorridorActive(false);
        setRouteInfo(null); setDupError('');
        setCorridorNodes([]); setActiveNodeIdx(0);
        stopNavigation();
    }

    function calcRoute() {
        if (!originLatLng || !destLatLng) return;
        setCalculating(true);
        setTimeout(() => { setCalculating(false); setShowCorridor(true); setCorridorActive(false); setRouteInfo(null); setDupError(''); }, 600);
    }

    async function initiateWave() {
        if (!user || !originLatLng || !destLatLng) return;

        const vehicleNum = isAdmin && adminVehicle.trim()
            ? adminVehicle.trim().toUpperCase()
            : (userProfile?.vehicleNumber || 'N/A');

        const sameVehicleActive = activeCds.find(c => c.vehicleNumber === vehicleNum && c.city === city);
        if (sameVehicleActive) { setDupError(`Vehicle ${vehicleNum} already has an active corridor in ${city}. Terminate it first.`); return; }

        const sameRouteActive = activeCds.find(c => c.city === city && c.originName === originName && c.destName === destName);
        if (sameRouteActive) { setDupError(`This route already has an active corridor in ${city}.`); return; }

        setDupError('');
        setCreating(true);

        // -- Compute corridor nodes from route polyline or straight-line fallback --
        // routePolyline is set by DelhiMap via onRouteNodes as soon as the route loads.
        // We use ALL nodes found within 350m of the actual route  no hardcoded count.
        const nodes = corridorNodes.length > 0
            ? corridorNodes
            : nodesOnPolyline(
                // Approximate the route with a straight-line two-point polyline as fallback
                [{ lat: originLatLng.lat, lng: originLatLng.lng }, { lat: destLatLng.lat, lng: destLatLng.lng }],
                city,
                15000  // 15km wide corridor for straight-line fallback
              );
        if (corridorNodes.length === 0) setCorridorNodes(nodes);
        setActiveNodeIdx(0);

        // -- Timeout-protected Firestore creation ------------------------------
        const creationTimeout = setTimeout(() => {
            if (!corridorActive) {
                setCreating(false);
                setCorridorActive(true); 
                setActiveCdId('local_' + Date.now()); // Fake ID to allow UI to proceed
                console.warn('Corridor creation timed out - proceeding with local state');
            }
        }, 8000);

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
                // Dynamic metadata
                patientSeverity: corridorType === 'ambulance' ? patientSeverity : null,
                dispatchRef: corridorType === 'ambulance' ? dispatchRef : null,
                fireType: corridorType === 'fire' ? fireType : null,
                fireSeverity: corridorType === 'fire' ? fireSeverity : null,
                vvipLevel: corridorType === 'vvip' ? vvipLevel : null,
                timeSensitivity: corridorType === 'vvip' ? timeSensitivity : null,
            });

            // CREATE IN BACKEND POSTGRES (fire-and-forget, don't block activation)
            try {
                let vType = 'AMBULANCE';
                if (corridorType === 'fire') vType = 'FIRE_TRUCK';
                if (corridorType === 'vvip') vType = 'VVIP';
                
                fetch('http://localhost:8080/api/v1/incident/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify({
                        cad_incident_id: corridorType === 'fire' ? dispatchRef : null,
                        dispatch_ticket: corridorType === 'ambulance' ? dispatchRef : null,
                        location: { origin: originLatLng, dest: destLatLng },
                        vehicles: [{
                            vehicle_type: vType,
                            details: { patientSeverity, fireType, fireSeverity, vvipLevel, timeSensitivity }
                        }]
                    })
                }).catch(e => console.error("Backend incident sync failed", e));
            } catch(e) { }

            try {
                const existing = localStorage.getItem('signalsync_active_corridors');
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
                localStorage.setItem('signalsync_active_corridors', JSON.stringify(arr));
            } catch { }

            setActiveCdId(docRef.id);
            setCorridorActive(true);
            
            // Turn first node green immediately
            if (nodes[0]?.id) {
                setSignalStatus(nodes[0].id, 'green', 'START-WAVE');
            }
        } catch (err) {
            console.error('Failed to create corridor:', err);
            // Fallback: activate locally even if Firestore fails
            setCorridorActive(true);
        } finally {
            clearTimeout(creationTimeout);
            setCreating(false);
        }
    }

    async function handleTerminate(corridorId) {
        if (!user) return;
        await terminateCorridor(corridorId);
    }

    // -- Compute signal markers for map -----------------------------------------
    const corridorNodeMarkers = corridorNodes
        .filter(n => n.pos)
        .map((n, i) => ({
            id: n.id,
            lat: n.pos[0],
            lng: n.pos[1],
            name: n.name,
            status: getNodeStatus(i, activeNodeIdx),
        }));

    const cityCorridors = activeCds.filter(c => c.city === city);
    const canCalc = !!originLatLng && !!destLatLng;
    const cityBounds = CITIES.find(c => c.name === city)?.bounds;
    const etaStr = etaSec > 0 ? `${Math.floor(etaSec / 60)}m ${(etaSec % 60).toString().padStart(2, '0')}s` : routeInfo?.durationText || '';

    return (
        <div className="min-h-screen bg-bg-deep font-sans relative">
            <div className="grid-bg" />

            {/* -- Nav -- */}
            <nav className="relative z-10 flex items-center justify-between px-10 py-3.5 bg-bg-deep/95 border-b border-white/5 backdrop-blur-xl">
                <Link href="/" className="flex items-center gap-2.5 font-extrabold text-xl no-underline text-white">
                    <div className="w-8 h-8 rounded-[6px] bg-[#0c3547] border border-cyan-500/30 flex items-center justify-center text-cyan-400"></div>
                    <span><span className="text-cyan-400">Signal</span>Sync</span>
                </Link>
                <div className="flex items-center gap-2.5">
                    {user ? (
                        <>
                            {isAdmin && <Badge variant="red">{t('administratorBadge')}</Badge>}
                            <Badge variant="green"><StatusDot color="green" className="mr-1" />{userProfile?.name || user.email}</Badge>
                            {userProfile?.vehicleNumber && <Badge variant="violet">{userProfile.vehicleNumber}</Badge>}
                        </>
                    ) : <span className="text-text-muted text-xs">{t('viewingAsGuest')}</span>}
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[24px] text-xs font-semibold bg-white/5 border border-white/5 text-text-primary no-underline">{t('homeLink')}</Link>
                    <Link href="/dashboard" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[24px] text-xs font-semibold bg-white/5 border border-white/5 text-text-primary no-underline">{t('dashboardLink')}</Link>
                    <Link href="/routes" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[24px] text-xs font-semibold bg-white/5 border border-white/5 text-text-primary no-underline">{t('routeFinderLink')}</Link>
                    {isAdmin && <Link href="/admin" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[24px] text-xs font-semibold bg-accent-red/15 border border-accent-red/30 text-accent-red no-underline">{t('adminLink')}</Link>}
                    {user
                        ? <button onClick={logout} className="px-3 py-1.5 rounded-[24px] text-xs font-semibold bg-[rgba(255,59,92,0.15)] text-accent-red border border-accent-red/30 font-sans cursor-pointer">{t('logoutLink')}</button>
                        : <Link href="/auth/login" className="px-3 py-1.5 rounded-[24px] text-xs font-semibold bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan no-underline">{t('signIn')}</Link>
                    }
                </div>
            </nav>

            <div className="relative z-10 max-w-[1400px] mx-auto px-10 py-8">

                {/* -- City Selector -- */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center gap-3 flex-1">
                        <span className="text-text-muted text-sm font-semibold uppercase tracking-wide whitespace-nowrap">{t('selectCity')}:</span>
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
                        <span className="text-xs text-text-muted">{cityCorridors.length} {t('activeIn')} {city}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-6">

                    {/* -- LEFT COLUMN -- */}
                    <div className="flex flex-col gap-5">

                        {/* Route Finder */}
                        <div className="bg-bg-card border border-white/5 rounded-[24px] p-6">
                            <h3 className="text-lg font-bold mb-1">{t('routeFinderTitle')}</h3>
                            <p className="text-text-secondary text-sm mb-4">{t('routeFinderDesc', city)}</p>

                            <div className="flex flex-col gap-3.5">
                                {/* Origin row with GPS button */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">{t('origin')}</label>
                                    <div className="flex gap-2">
                                        {mapsLoaded ? (
                                            <div className="flex-1">
                                                <PlaceInput key={`origin-${city}`} label="" placeholder={`Start point in ${city}...`} cityBounds={cityBounds}
                                                    onPlaceSelect={p => { setOriginLatLng({ lat: p.lat, lng: p.lng }); setOriginName(p.name); setShowCorridor(false); setCorridorActive(false); setRouteInfo(null); setDupError(''); }} />
                                            </div>
                                        ) : <input disabled className="input-field flex-1 opacity-50" placeholder="Loading Google Maps..." />}

                                        {/*  One-tap GPS origin button */}
                                        <button
                                            onClick={useMyLocation}
                                            disabled={gpsLoading}
                                            title="Set origin to my current GPS location"
                                            className="flex-shrink-0 w-11 h-11 rounded-[24px] bg-[#4285F4]/15 border border-[#4285F4]/40 text-[#4285F4] hover:bg-[#4285F4]/30 transition-all font-sans cursor-pointer flex items-center justify-center text-base disabled:opacity-50"
                                        >
                                            {gpsLoading ? '' : ''}
                                        </button>
                                    </div>
                                    {originName === ' My Current Location' && (
                                        <div className="text-[0.7rem] text-[#4285F4] font-semibold flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4] animate-pulse inline-block" />
                                            {t('usingGPSOrigin')}
                                        </div>
                                    )}
                                    {gpsError && <div className="text-[0.7rem] text-accent-red">{gpsError}</div>}
                                </div>

                                <div className="flex items-center gap-2.5">
                                    <div className="flex-1 h-px bg-white/10" />
                                    <button onClick={() => { const ol = originLatLng, on = originName; setOriginLatLng(destLatLng); setDestLatLng(ol); setOriginName(destName); setDestName(on); resetRoute(); }}
                                        className="w-9 h-9 rounded-full bg-white/5 border border-white/10 text-text-secondary font-sans cursor-pointer"></button>
                                    <div className="flex-1 h-px bg-white/10" />
                                </div>

                                {mapsLoaded ? (
                                    <PlaceInput key={`dest-${city}`} label={t('destination')} placeholder={`End point in ${city}...`} cityBounds={cityBounds}
                                        onPlaceSelect={p => { setDestLatLng({ lat: p.lat, lng: p.lng }); setDestName(p.name); setShowCorridor(false); setCorridorActive(false); setRouteInfo(null); setDupError(''); }} />
                                ) : <div className="flex flex-col gap-1.5"><label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">{t('destination')}</label><input disabled className="input-field opacity-50" placeholder="Loading Google Maps..." /></div>}

                                <button onClick={calcRoute} disabled={calculating || !canCalc}
                                    className="w-full py-3 rounded-[24px] font-bold bg-cyan-500 hover:bg-cyan-400 text-white disabled:opacity-50 transition-all font-sans cursor-pointer">
                                    {calculating ? t('routing') : t('getBestRoute')}
                                </button>
                            </div>

                            {/* Route Result */}
                            {showCorridor && routeInfo && (
                                <div className="mt-5 pt-5 border-t border-white/10 flex flex-col gap-4">
                                    <div className="flex gap-3">
                                        <div className="flex-1 bg-white/[0.02] border border-white/10 rounded-[24px] p-3.5 text-center">
                                            <div className="text-[0.65rem] text-text-muted uppercase mb-1">{t('withTraffic')}</div>
                                            <div className="text-xl font-extrabold font-mono text-accent-amber">{routeInfo.durationText}</div>
                                            <div className="text-xs text-text-secondary mt-1">{routeInfo.distanceText}</div>
                                        </div>
                                    </div>

                                    {/* Corridor creation  auth + verification required */}
                                    {user ? (
                                        (isAdmin || userProfile?.verified) ? (
                                            <>
                                                <div className="flex gap-2">
                                                    {[['ambulance', t('ambulanceLabel')], ['fire', t('fireTruckLabel')], ['vvip', t('vvipLabel')]].map(([v, l]) => (
                                                        <button key={v} onClick={() => setCorridorType(v)}
                                                            className={`flex-1 py-2 rounded-[24px] border text-sm transition-all font-sans cursor-pointer ${corridorType === v ? 'bg-accent-cyan/10 border-accent-cyan/35 text-accent-cyan' : 'bg-white/[0.03] border-white/5 text-text-secondary hover:border-accent-cyan/25'}`}>
                                                            {l}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Dynamic Context Forms */}
                                                <div className="bg-white/[0.02] border border-white/10 rounded-[24px] p-4 flex flex-col gap-3">
                                                    {corridorType === 'ambulance' && (
                                                        <>
                                                            <div className="flex flex-col gap-1.5">
                                                                <label className="text-[0.75rem] font-semibold text-text-secondary uppercase">{t('patientSeverity')}</label>
                                                                <select value={patientSeverity} onChange={e => setPatientSeverity(e.target.value)} className="input-field py-2 text-sm bg-[#050c18] text-white">
                                                                    <option value="Stable">Stable</option>
                                                                    <option value="Serious">Serious</option>
                                                                    <option value="Critical">Critical</option>
                                                                </select>
                                                            </div>
                                                            <div className="flex flex-col gap-1.5">
                                                                <label className="text-[0.75rem] font-semibold text-text-secondary uppercase">{t('dispatchRef')}</label>
                                                                <input value={dispatchRef} onChange={e => setDispatchRef(e.target.value)} placeholder="e.g. HOSP-1029" className="input-field py-2 text-sm" />
                                                            </div>
                                                        </>
                                                    )}
                                                    {corridorType === 'fire' && (
                                                        <>
                                                            <div className="flex flex-col gap-1.5">
                                                                <label className="text-[0.75rem] font-semibold text-text-secondary uppercase">{t('fireType')}</label>
                                                                <select value={fireType} onChange={e => setFireType(e.target.value)} className="input-field py-2 text-sm bg-[#050c18] text-white">
                                                                    <option value="Residential">Residential</option>
                                                                    <option value="Commercial">Commercial</option>
                                                                    <option value="Industrial">Industrial</option>
                                                                    <option value="Forest">Forest</option>
                                                                </select>
                                                            </div>
                                                            <div className="flex flex-col gap-1.5">
                                                                <label className="text-[0.75rem] font-semibold text-text-secondary uppercase">{t('severityLevel')}</label>
                                                                <select value={fireSeverity} onChange={e => setFireSeverity(e.target.value)} className="input-field py-2 text-sm bg-[#050c18] text-white">
                                                                    <option value="Low">Low</option>
                                                                    <option value="Medium">Medium</option>
                                                                    <option value="High">High</option>
                                                                </select>
                                                            </div>
                                                        </>
                                                    )}
                                                    {corridorType === 'vvip' && (
                                                        <>
                                                            <div className="flex flex-col gap-1.5">
                                                                <label className="text-[0.75rem] font-semibold text-text-secondary uppercase">{t('vvipLevel')}</label>
                                                                <select value={vvipLevel} onChange={e => setVvipLevel(e.target.value)} className="input-field py-2 text-sm bg-[#050c18] text-white">
                                                                    <option value="Minister">Minister</option>
                                                                    <option value="Security movement">Security movement</option>
                                                                    <option value="PM-Presidential">PM / Presidential</option>
                                                                </select>
                                                            </div>
                                                            <div className="flex flex-col gap-1.5">
                                                                <label className="text-[0.75rem] font-semibold text-text-secondary uppercase">{t('timeSensitivity')}</label>
                                                                <select value={timeSensitivity} onChange={e => setTimeSensitivity(e.target.value)} className="input-field py-2 text-sm bg-[#050c18] text-white">
                                                                    <option value="Standard">Standard</option>
                                                                    <option value="High">High (Immediate)</option>
                                                                </select>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {isAdmin && (
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-[0.78rem] font-semibold text-accent-red uppercase tracking-wide">Vehicle # Override (Admin)</label>
                                                        <input className="input-field font-mono" value={adminVehicle} onChange={e => setAdminVehicle(e.target.value)} placeholder="e.g. AMB-099" />
                                                    </div>
                                                )}

                                                {dupError && (
                                                    <div className="bg-accent-amber/10 border border-accent-amber/30 rounded-[24px] p-3 text-sm text-accent-amber">{dupError}</div>
                                                )}

                                                {!corridorActive ? (
                                                    <button onClick={initiateWave} disabled={creating}
                                                        className="w-full py-4 rounded-[24px] font-bold text-base bg-emerald-500 hover:bg-emerald-400 text-white disabled:opacity-60 transition-all font-sans cursor-pointer">
                                                        {creating ? t('activating') : t('initiateWave')}
                                                    </button>
                                                ) : (
                                                    <div className="flex flex-col gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2.5 h-2.5 rounded-full bg-accent-green animate-pulse" />
                                                            <span className="text-sm font-bold text-accent-green">{t('greenWaveActive')}</span>
                                                            <span className="ml-auto text-xs font-mono text-accent-cyan">{etaStr}</span>
                                                        </div>
                                                        {routeInfo && (
                                                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[24px] p-3 text-center">
                                                                <div className="text-base font-extrabold text-emerald-400 mb-0.5">
                                                                     {t('savingMinutes', Math.round((routeInfo.durationSec || 0) * 0.4 / 60))}
                                                                </div>
                                                                <div className="text-xs text-text-muted">{t('priorityCleared')}</div>
                                                            </div>
                                                        )}
                                                        {corridorNodes.length > 0 && (
                                                            <CorridorStatusBox nodes={corridorNodes} activeIdx={activeNodeIdx} eta={etaStr} stops={0} />
                                                        )}
                                                        {/* Navigation starts here  physically travelling */}
                                                        {!navigationMode ? (
                                                            <button onClick={startNavigation}
                                                                className="w-full py-3 rounded-[24px] font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-all font-sans cursor-pointer flex items-center justify-center gap-2">
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                                                                {t('startGPS')}
                                                            </button>
                                                        ) : (
                                                            <div className="flex gap-2">
                                                                <div className="flex-1 flex items-center gap-2 bg-[#4285F4]/10 border border-[#4285F4]/30 rounded-[24px] px-4 py-2.5">
                                                                    <span className="w-2 h-2 rounded-full bg-[#4285F4] animate-pulse" />
                                                                    <span className="text-sm font-bold text-[#4285F4]">{t('gpsTrackingLive')}</span>
                                                                </div>
                                                                <button onClick={stopNavigation}
                                                                    className="px-4 py-2.5 rounded-[24px] text-xs font-bold text-accent-red bg-accent-red/10 border border-accent-red/30 font-sans cursor-pointer">Stop</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            /* -- Unverified user banner -- */
                                            <div className="bg-accent-amber/[0.06] border border-accent-amber/30 rounded-[24px] p-5 text-center">
                                                <div className="text-2xl mb-2"></div>
                                                <div className="text-sm font-bold text-accent-amber mb-1">{t('pendingVerification')}</div>
                                                <p className="text-text-muted text-xs leading-relaxed mb-3">
                                                    {t('pendingDesc')}
                                                </p>
                                                <div className="inline-flex items-center gap-2 bg-accent-amber/10 border border-accent-amber/25 rounded-full px-3 py-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-accent-amber animate-pulse" />
                                                    <span className="text-[0.65rem] font-bold text-accent-amber uppercase tracking-wider">{t('awaitingApproval')}</span>
                                                </div>
                                            </div>
                                        )
                                    ) : (
                                        <div className="bg-white/[0.02] border border-white/10 rounded-[24px] p-4 text-center">
                                            <div className="text-sm font-semibold mb-1">{t('wantCorridor')}</div>
                                            <p className="text-text-muted text-xs mb-3">{t('corridorSignInDesc')}</p>
                                            <div className="flex gap-2 justify-center">
                                                <Link href="/auth/login" className="px-4 py-2 rounded-[24px] font-bold text-sm bg-accent-green text-black no-underline">{t('signIn')}</Link>
                                                <Link href="/auth/register" className="px-4 py-2 rounded-[24px] font-bold text-sm bg-white/5 border border-white/10 text-white no-underline">{t('register')}</Link>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* -- RIGHT COLUMN -- */}
                    <div className="flex flex-col gap-5">

                        {/* Map with GPS + signal overlays */}
                        <div className="bg-bg-card border border-white/5 rounded-[24px] p-5">
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <h3 className="text-base font-bold">{t('trafficMapTitle', city) || `${city} Traffic Map`}</h3>
                                    <p className="text-text-secondary text-xs">
                                        {navigationMode ? t('liveNavActive') :
                                            showCorridor && originName && destName ? `${originName} -> ${destName}` :
                                                t('selectOriginDest')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {navigationMode && <Badge variant="cyan"><span className="w-1.5 h-1.5 rounded-full bg-[#4285F4] inline-block mr-1 animate-pulse" />GPS</Badge>}
                                    <Badge variant="cyan"><StatusDot color="cyan" className="mr-1" />Live</Badge>
                                </div>
                            </div>
                            <DelhiMap
                                showCorridor={showCorridor}
                                corridorActive={corridorActive}
                                originLatLng={originLatLng}
                                destLatLng={destLatLng}
                                originName={originName}
                                destName={destName}
                                cityName={city}
                                onRouteResult={handleRouteResult}
                                onNodeUpdate={handleArrival}
                                onNodeAdvance={handleNodeAdvance}
                                corridorNodeCount={corridorNodes.length}
                                corridorNodeMarkers={corridorNodeMarkers}
                                userLocation={userLocation}
                                navigationMode={navigationMode}
                                onIotTrigger={handleIotTrigger}
                                onRouteNodes={handleRouteNodes}
                            />
                        </div>

                        {/* Active corridors  THIS CITY ONLY */}
                        <div className="bg-bg-card border border-white/5 rounded-[24px] p-5">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-base font-bold">{t('activeCorridors', city) || `${t('activeCorridorsHdr')}  ${city}`}</h3>
                                <Badge variant="green">
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent-green inline-block mr-1.5 animate-pulse" />
                                    {cityCorridors.length} {t('activeCors')}
                                </Badge>
                            </div>

                            {cityCorridors.length === 0 ? (
                                <div className="text-center py-6 border border-white/5 border-dashed rounded-[24px]">
                                    <div className="text-2xl mb-2"></div>
                                    <p className="text-text-muted text-sm">{t('noActiveCorridors', city)}</p>
                                    {!user && <p className="text-text-muted text-xs mt-1">{t('signInCreate')}</p>}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {cityCorridors.map(c => {
                                        const canTerminate = user && (isAdmin || c.uid === user.uid);
                                        const cNodes = c.corridorNodes || [];
                                        const cActiveIdx = corridorActive && c.originName === originName ? activeNodeIdx : 0;
                                        return (
                                            <div key={c.id} className="bg-accent-cyan/[0.03] border border-accent-cyan/20 rounded-[24px] p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse flex-shrink-0" />
                                                        <Badge variant="red">{c.vehicleNumber}</Badge>
                                                        <span className="text-[0.65rem] text-text-muted capitalize border border-white/10 rounded-full px-2 py-0.5">{c.vehicleType}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {canTerminate && (
                                                            <button onClick={() => handleTerminate(c.id)}
                                                                className="text-[0.6rem] font-bold text-accent-red border border-accent-red/30 rounded-full px-2 py-0.5 bg-accent-red/10 hover:bg-accent-red/20 font-sans cursor-pointer">
                                                                {t('terminate')}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-text-secondary leading-relaxed">{c.originName} {'->'} {c.destName}</div>
                                                {cNodes.length > 0 && (
                                                    <div className="mt-3">
                                                        <CorridorStatusBox nodes={cNodes} activeIdx={cActiveIdx} eta={c.durationText || ''} stops={0} />
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className="text-[0.65rem] text-text-muted">{t('byLabel')} {c.creatorName}</span>
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
