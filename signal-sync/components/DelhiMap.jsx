'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    useJsApiLoader,
    GoogleMap,
    TrafficLayer,
    DirectionsRenderer,
    Marker,
    Circle,
    OverlayView,
} from '@react-google-maps/api';
import { nodesOnPolyline, pickCorridorNodes } from '@/lib/cityNodes';

// Keep exported for any external consumers (legacy usage)
export const DELHI_NODES = [
    { id: 'DWK', name: 'Dwarka Sector 12', pos: [28.5931, 77.0598] },
    { id: 'DWM', name: 'Dwarka Mor Chowk', pos: [28.5936, 77.0737] },
    { id: 'PVI', name: 'Palam Vihar Intersection', pos: [28.5889, 77.1005] },
    { id: 'IGI', name: 'IGI Airport T3', pos: [28.5562, 77.0999] },
    { id: 'DHK', name: 'Dhaula Kuan Flyover', pos: [28.5921, 77.1598] },
    { id: 'SVJ', name: 'Shankar Vihar Junction', pos: [28.5783, 77.1890] },
    { id: 'SAK', name: 'Saket District Centre', pos: [28.5244, 77.2167] },
    { id: 'AIM', name: 'AIIMS New Delhi', pos: [28.5672, 77.2100] },
    { id: 'CNG', name: 'Connaught Place', pos: [28.6315, 77.2167] },
    { id: 'RJP', name: 'Rajpath / India Gate', pos: [28.6129, 77.2295] },
    { id: 'NZM', name: 'Nizamuddin Station', pos: [28.5893, 77.2507] },
    { id: 'LPN', name: 'Lajpat Nagar', pos: [28.5700, 77.2373] },
    { id: 'NWD', name: 'Nehru Place', pos: [28.5484, 77.2517] },
    { id: 'KRB', name: 'Karol Bagh', pos: [28.6512, 77.1906] },
    { id: 'RHN', name: 'Rohini Sector 18', pos: [28.7421, 77.1034] },
    { id: 'GTK', name: 'GTK Road / Azadpur', pos: [28.7104, 77.1842] },
    { id: 'CSH', name: 'Civil Lines / ISBT', pos: [28.6804, 77.2255] },
    { id: 'PGM', name: 'Pragati Maidan', pos: [28.6188, 77.2435] },
    { id: 'GTB', name: 'GTB Hospital (Northeast)', pos: [28.6799, 77.3073] },
    { id: 'NDC', name: 'Narela / Outer Ring', pos: [28.8450, 77.1034] },
];

// IMPORTANT: stable reference outside component  prevents useJsApiLoader re-runs
export const MAPS_LIBRARIES = ['places'];

// --- Dark map style -----------------------------------------------------------
const DARK_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1117' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a2234' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0f172a' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#243150' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#0f172a' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c1929' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#334155' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#0a0f1a' }] },
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0a1628' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#131e2e' }] },
    { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1e293b' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0a0f1a' }] },
];

const MAP_STYLE = { height: '100%', width: '100%' };

// --- Geo Math -----------------------------------------------------------------
function getHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// --- Signal label overlay at corridor node ---------------------------------
function SignalLabel({ position, status, name }) {
    const colors = {
        active: { bg: '#00ff9d', text: '#000', label: ' GREEN' },
        prep: { bg: '#ffb800', text: '#000', label: ' PREP' },
        queued: { bg: '#ff3b5c', text: '#fff', label: ' RED' },
        done: { bg: '#00ff9d', text: '#000', label: ' CLEAR' },
    };
    const c = colors[status] || colors.queued;
    return (
        <OverlayView
            position={position}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
            <div style={{
                transform: 'translate(-50%, -140%)',
                background: c.bg,
                color: c.text,
                fontSize: '0.6rem',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '999px',
                whiteSpace: 'nowrap',
                boxShadow: `0 0 8px ${c.bg}88`,
                pointerEvents: 'none',
                fontFamily: 'monospace',
                letterSpacing: '0.04em',
            }}>
                {c.label}
            </div>
        </OverlayView>
    );
}

// --- Moving ambulance ---------------------------------------------------------
function MovingAmbulance({ path, active, onNodeUpdate, totalNodes, onNodeAdvance, nodeCount, corridorNodeMarkers, onIotTrigger }) {
    const [pos, setPos] = useState(path[0] || { lat: 28.59, lng: 77.12 });
    const timer = useRef(null);
    const idx = useRef(0);
    const lastNodeFired = useRef(-1);
    const iotFiredForNode = useRef(new Set());

    useEffect(() => {
        if (!active || !path.length) return;
        idx.current = 0;
        lastNodeFired.current = -1;
        iotFiredForNode.current.clear();
        setPos(path[0]);
        // Fire node 0 immediately
        if (onNodeAdvance) onNodeAdvance(0);
        lastNodeFired.current = 0;

        const step = () => {
            if (idx.current >= path.length - 1) {
                onNodeUpdate && onNodeUpdate(totalNodes);
                return;
            }
            idx.current++;
            const currentPos = path[idx.current];
            setPos(currentPos);

            // Fire onNodeAdvance when ambulance crosses each node threshold
            let currentNodeIdx = lastNodeFired.current;
            if (onNodeAdvance && nodeCount > 1) {
                const fraction = idx.current / (path.length - 1);
                const calcNodeIdx = Math.min(Math.floor(fraction * nodeCount), nodeCount - 1);
                if (calcNodeIdx > lastNodeFired.current) {
                    lastNodeFired.current = calcNodeIdx;
                    currentNodeIdx = calcNodeIdx;
                    onNodeAdvance(calcNodeIdx);
                }
            }

            // IoT 500m Trigger Logic  scan ALL upcoming nodes, not just the next one
            if (onIotTrigger && corridorNodeMarkers?.length) {
                for (let ni = currentNodeIdx + 1; ni < corridorNodeMarkers.length; ni++) {
                    if (iotFiredForNode.current.has(ni)) continue;
                    const targetNode = corridorNodeMarkers[ni];
                    if (targetNode && targetNode.lat && targetNode.lng) {
                        const distMeters = getHaversineDistance(currentPos.lat, currentPos.lng, targetNode.lat, targetNode.lng);
                        if (distMeters <= 500) {
                            iotFiredForNode.current.add(ni);
                            onIotTrigger(targetNode, Math.round(distMeters));
                        }
                    }
                }
            }

            timer.current = setTimeout(step, 60);
        };
        timer.current = setTimeout(step, 60);
        return () => clearTimeout(timer.current);
    }, [active, path]);

    const icon = {
        path: 'M -2,-5 L 2,-5 L 2,-2 L 5,-2 L 5,2 L 2,2 L 2,5 L -2,5 L -2,2 L -5,2 L -5,-2 L -2,-2 Z',
        fillColor: '#00ff9d', fillOpacity: 1,
        strokeColor: '#0a0f1e', strokeWeight: 1.5, scale: 3,
    };
    return <Marker position={pos} icon={icon} zIndex={1000} title=" Ambulance" />;
}

// --- Path Densifier --------------------------------------------------------
function densifyPath(path, maxDistanceMeters = 20) {
    if (path.length < 2) return path;
    const dense = [path[0]];
    for (let i = 1; i < path.length; i++) {
        const p1 = path[i - 1];
        const p2 = path[i];
        const dist = getHaversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);
        if (dist > maxDistanceMeters) {
            const steps = Math.ceil(dist / maxDistanceMeters);
            for (let j = 1; j < steps; j++) {
                const fraction = j / steps;
                dense.push({
                    lat: p1.lat + (p2.lat - p1.lat) * fraction,
                    lng: p1.lng + (p2.lng - p1.lng) * fraction
                });
            }
        }
        dense.push(p2);
    }
    return dense;
}

// --- Main Component -----------------------------------------------------------
//   showCorridor         bool
//   corridorActive       bool
//   originLatLng         { lat, lng }
//   destLatLng           { lat, lng }
//   originName           string
//   destName             string
//   cityName             string (e.g. 'Delhi'), used for signal node matching
//   onRouteResult        callback({ distanceText, durationText, durationSec })
//   onRouteNodes         callback(nodes)  receives exact signal nodes on the route
//   onNodeUpdate         callback(n)  fires when ambulance reaches end
//   onNodeAdvance        callback(nodeIdx)  fires as ambulance crosses each node
//   corridorNodeCount    number, for path fraction calc
//   corridorNodeMarkers  [{ id, lat, lng, status, name }]  signal overlays on map
//   userLocation         { lat, lng } | null  live GPS dot
//   navigationMode       bool  map follows userLocation when true
//   onIotTrigger         callback(node, distance)  fires when ambulance < 500m to next signal
export default function DelhiMap({
    showCorridor,
    corridorActive,
    originLatLng,
    destLatLng,
    originName,
    destName,
    cityName = 'Delhi',
    onRouteResult,
    onRouteNodes,
    onNodeUpdate,
    onNodeAdvance,
    corridorNodeCount = 0,
    corridorNodeMarkers = [],
    userLocation = null,
    navigationMode = false,
    onIotTrigger,
}) {
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries: MAPS_LIBRARIES,
    });

    const [directions, setDirections] = useState(null);
    const [routePath, setRoutePath] = useState([]);
    const [loading, setLoading] = useState(false);
    const mapRef = useRef(null);

    const origin = originLatLng || { lat: 28.5931, lng: 77.0598 };
    const dest = destLatLng || { lat: 28.5672, lng: 77.2100 };

    const mapCenter = userLocation || {
        lat: (origin.lat + dest.lat) / 2,
        lng: (origin.lng + dest.lng) / 2,
    };

    // Re-centre map when navigation mode follows user
    useEffect(() => {
        if (!mapRef.current) return;
        if (navigationMode && userLocation) {
            mapRef.current.panTo(userLocation);
        } else {
            mapRef.current.panTo(mapCenter);
        }
    }, [userLocation?.lat, userLocation?.lng, navigationMode, mapCenter.lat, mapCenter.lng]);

    // Fetch traffic-aware route from Google Directions
    useEffect(() => {
        if (!isLoaded || !showCorridor || !originLatLng || !destLatLng) {
            setDirections(null);
            setRoutePath([]);
            return;
        }
        setLoading(true);

        new window.google.maps.DirectionsService().route(
            {
                origin: origin,
                destination: dest,
                travelMode: window.google.maps.TravelMode.DRIVING,
                drivingOptions: {
                    departureTime: new Date(),
                    trafficModel: window.google.maps.TrafficModel.BEST_GUESS,
                },
                provideRouteAlternatives: false,
            },
            (result, status) => {
                if (status === 'OK') {
                    setDirections(result);
                    let rawPath = result.routes[0].overview_path.map(p => ({ lat: p.lat(), lng: p.lng() }));
                    // Interpolate path so vertices are max 20m apart for smooth & reliable IoT triggers
                    const smoothPath = densifyPath(rawPath, 20);
                    setRoutePath(smoothPath);
                    const leg = result.routes[0].legs[0];
                    onRouteResult && onRouteResult({
                        distanceText: leg.distance?.text || '',
                        durationText: leg.duration_in_traffic?.text || leg.duration?.text || '',
                        durationSec: leg.duration_in_traffic?.value || leg.duration?.value || 0,
                    });

                    // -- Pick exactly 6 signal nodes on the route --
                    // Match real intersections against the route polyline,
                    // then pick 6 evenly-spaced from matches (or fallback).
                    if (onRouteNodes) {
                        const FIXED_COUNT = 6;
                        let allMatched = nodesOnPolyline(rawPath, cityName, 350);
                        let finalNodes;

                        if (allMatched.length >= FIXED_COUNT) {
                            // Pick 6 evenly spaced from matched nodes
                            finalNodes = [];
                            for (let i = 0; i < FIXED_COUNT; i++) {
                                const idx = Math.round(i * (allMatched.length - 1) / (FIXED_COUNT - 1));
                                finalNodes.push(allMatched[idx]);
                            }
                        } else if (allMatched.length > 0) {
                            // Use all matched + fill remaining from pickCorridorNodes
                            const usedIds = new Set(allMatched.map(n => n.id));
                            const extras = pickCorridorNodes(
                                { lat: rawPath[0].lat, lng: rawPath[0].lng },
                                { lat: rawPath[rawPath.length - 1].lat, lng: rawPath[rawPath.length - 1].lng },
                                cityName, FIXED_COUNT
                            ).filter(n => !usedIds.has(n.id));
                            finalNodes = [...allMatched, ...extras].slice(0, FIXED_COUNT);
                        } else {
                            // No polyline matches  straight-line fallback
                            finalNodes = pickCorridorNodes(
                                { lat: rawPath[0].lat, lng: rawPath[0].lng },
                                { lat: rawPath[rawPath.length - 1].lat, lng: rawPath[rawPath.length - 1].lng },
                                cityName, FIXED_COUNT
                            );
                        }
                        onRouteNodes(finalNodes);
                    }
                } else {
                    console.warn('Directions error:', status);
                }
                setLoading(false);
            }
        );
    }, [isLoaded, showCorridor, originLatLng?.lat, originLatLng?.lng, destLatLng?.lat, destLatLng?.lng]);

    if (loadError) return (
        <div style={{ height: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050c18', borderRadius: '12px', color: '#ff3b5c', fontSize: '0.9rem', padding: '1rem', textAlign: 'center' }}>
            Google Maps failed to load. Check API key &amp; enable Maps JS API + Directions API in Cloud Console.
        </div>
    );
    if (!isLoaded) return (
        <div style={{ height: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050c18', borderRadius: '12px', color: '#00f5ff', fontSize: '0.9rem' }}>
            Loading Google Maps...
        </div>
    );

    const originIcon = { path: window.google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#00f5ff', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 };
    const destIcon = { path: window.google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#a78bfa', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 };

    // Live GPS dot icon  bright blue pulsing circle
    const gpsIcon = {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#4285F4', fillOpacity: 1,
        strokeColor: '#fff', strokeWeight: 3,
    };

    // Signal circle options per status
    const signalCircleOpts = {
        active: { strokeColor: '#00ff9d', fillColor: '#00ff9d', fillOpacity: 0.25, strokeWeight: 3, radius: 80 },
        prep: { strokeColor: '#ffb800', fillColor: '#ffb800', fillOpacity: 0.2, strokeWeight: 2, radius: 70 },
        queued: { strokeColor: '#ff3b5c', fillColor: '#ff3b5c', fillOpacity: 0.15, strokeWeight: 2, radius: 60 },
        done: { strokeColor: '#00ff9d', fillColor: '#00ff9d', fillOpacity: 0.1, strokeWeight: 1, radius: 50 },
    };

    return (
        <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', height: '420px' }}>
            {loading && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,12,24,0.82)', color: '#00f5ff', fontSize: '0.9rem', fontWeight: 600 }}>
                    Fetching traffic-aware route...
                </div>
            )}

            {/* Navigation mode indicator */}
            {navigationMode && (
                <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, background: '#4285F4', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'pulse-gps 1.2s ease-in-out infinite' }} />
                    LIVE NAVIGATION
                </div>
            )}

            <GoogleMap
                mapContainerStyle={MAP_STYLE}
                center={mapCenter}
                zoom={navigationMode ? 15 : 12}
                options={{ styles: DARK_STYLE, zoomControl: true, mapTypeControl: false, streetViewControl: false, fullscreenControl: true, clickableIcons: false, gestureHandling: 'cooperative' }}
                onLoad={map => { mapRef.current = map; }}
            >
                {/* Live traffic overlay */}
                <TrafficLayer />

                {/* Origin pin */}
                {originLatLng && <Marker position={origin} icon={originIcon} title={originName || 'Origin'} zIndex={500} />}

                {/* Destination pin */}
                {destLatLng && <Marker position={dest} icon={destIcon} title={destName || 'Destination'} zIndex={500} />}

                {/* Live GPS user location dot */}
                {userLocation && (
                    <>
                        {/* Outer pulsing ring */}
                        <Circle
                            center={userLocation}
                            options={{ strokeColor: '#4285F4', fillColor: '#4285F4', fillOpacity: 0.15, strokeWeight: 2, strokeOpacity: 0.6, radius: 120 }}
                        />
                        {/* Inner dot */}
                        <Marker
                            position={userLocation}
                            icon={gpsIcon}
                            title=" Your Location"
                            zIndex={900}
                        />
                    </>
                )}

                {/* Traffic-aware corridor route */}
                {directions && (
                    <DirectionsRenderer
                        directions={directions}
                        options={{
                            suppressMarkers: true,
                            suppressInfoWindows: true,
                            polylineOptions: {
                                strokeColor: corridorActive ? '#00ff9d' : '#00f5ff',
                                strokeWeight: 5,
                                strokeOpacity: corridorActive ? 1.0 : 0.8,
                            },
                        }}
                    />
                )}

                {/* Signal circles at corridor nodes */}
                {corridorNodeMarkers.map((node, i) => {
                    const opts = signalCircleOpts[node.status] || signalCircleOpts.queued;
                    return (
                        <React.Fragment key={`node-${i}`}>
                            <Circle center={{ lat: node.lat, lng: node.lng }} options={opts} />
                            
                            {/* IoT 500m glowing geofence ring for the active/prep nodes */}
                            {corridorActive && node.status === 'prep' && (
                                <Circle 
                                    center={{ lat: node.lat, lng: node.lng }} 
                                    options={{ 
                                        strokeColor: '#00f5ff', fillColor: '#00f5ff', fillOpacity: 0.04, 
                                        strokeWeight: 1, radius: 500, strokeOpacity: 0.8
                                    }} 
                                />
                            )}

                            <SignalLabel
                                position={{ lat: node.lat, lng: node.lng }}
                                status={node.status}
                                name={node.name}
                            />
                        </React.Fragment>
                    );
                })}

                {/* Animated ambulance */}
                {corridorActive && routePath.length > 0 && (
                    <MovingAmbulance
                        path={routePath}
                        active={corridorActive}
                        onNodeUpdate={onNodeUpdate}
                        totalNodes={corridorNodeCount}
                        onNodeAdvance={onNodeAdvance}
                        nodeCount={corridorNodeCount}
                        corridorNodeMarkers={corridorNodeMarkers}
                        onIotTrigger={onIotTrigger}
                    />
                )}
            </GoogleMap>

            {/* Legend */}
            <div style={{ position: 'absolute', bottom: 10, right: 10, zIndex: 5, background: 'rgba(5,12,24,0.92)', border: '1px solid rgba(0,245,255,0.15)', borderRadius: '8px', padding: '6px 10px', fontSize: '0.62rem', color: 'rgba(255,255,255,0.55)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 20, height: 3, background: '#00ff9d', display: 'inline-block', borderRadius: 2 }} /> Corridor
                    </span>
                    {corridorNodeMarkers.length > 0 && <>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff9d', display: 'inline-block' }} /> GREEN</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffb800', display: 'inline-block' }} /> PREP</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff3b5c', display: 'inline-block' }} /> RED</span>
                    </>}
                </div>
            </div>

            <style>{`
                @keyframes pulse-gps {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(1.5); }
                }
            `}</style>
        </div>
    );
}
