'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
    useJsApiLoader,
    GoogleMap,
    TrafficLayer,
    DirectionsRenderer,
    Marker,
} from '@react-google-maps/api';

// Keep exported for any external consumers
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

// IMPORTANT: stable reference outside component — prevents useJsApiLoader re-runs
export const MAPS_LIBRARIES = ['places'];

// ─── Dark map style ───────────────────────────────────────────────────────────
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

// ─── Moving ambulance ─────────────────────────────────────────────────────────
function MovingAmbulance({ path, active, onNodeUpdate, totalNodes, onNodeAdvance, nodeCount }) {
    const [pos, setPos] = useState(path[0] || { lat: 28.59, lng: 77.12 });
    const timer = useRef(null);
    const idx = useRef(0);
    const lastNodeFired = useRef(-1);

    useEffect(() => {
        if (!active || !path.length) return;
        idx.current = 0;
        lastNodeFired.current = -1;
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
            setPos(path[idx.current]);

            // Fire onNodeAdvance when ambulance crosses each node threshold
            if (onNodeAdvance && nodeCount > 1) {
                const fraction = idx.current / (path.length - 1);
                const nodeIdx = Math.min(
                    Math.floor(fraction * nodeCount),
                    nodeCount - 1
                );
                if (nodeIdx > lastNodeFired.current) {
                    lastNodeFired.current = nodeIdx;
                    onNodeAdvance(nodeIdx);
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
    return <Marker position={pos} icon={icon} zIndex={1000} title="🚑 Ambulance" />;
}

// ─── Main Component ───────────────────────────────────────────────────────────
// Props:
//   showCorridor   – bool
//   corridorActive – bool
//   originLatLng   – { lat, lng }
//   destLatLng     – { lat, lng }
//   originName     – string (display)
//   destName       – string (display)
//   onRouteResult  – callback({ distanceText, durationText, durationSec })
//   onNodeUpdate   – callback(n)
//   onNodeAdvance  – callback(nodeIdx) — fires as ambulance crosses each corridor node
//   corridorNodeCount – number of corridor nodes (for fraction calculation)
export default function DelhiMap({
    showCorridor,
    corridorActive,
    originLatLng,
    destLatLng,
    originName,
    destName,
    onRouteResult,
    onNodeUpdate,
    onNodeAdvance,
    corridorNodeCount = 0,
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

    const mapCenter = {
        lat: (origin.lat + dest.lat) / 2,
        lng: (origin.lng + dest.lng) / 2,
    };

    // Recentre map when endpoints change
    useEffect(() => {
        if (mapRef.current) mapRef.current.panTo(mapCenter);
    }, [mapCenter.lat, mapCenter.lng]);

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
                    const path = result.routes[0].overview_path.map(p => ({ lat: p.lat(), lng: p.lng() }));
                    setRoutePath(path);
                    const leg = result.routes[0].legs[0];
                    onRouteResult && onRouteResult({
                        distanceText: leg.distance?.text || '',
                        durationText: leg.duration_in_traffic?.text || leg.duration?.text || '',
                        durationSec: leg.duration_in_traffic?.value || leg.duration?.value || 0,
                    });
                } else {
                    console.warn('Directions error:', status);
                }
                setLoading(false);
            }
        );
    }, [isLoaded, showCorridor, originLatLng?.lat, originLatLng?.lng, destLatLng?.lat, destLatLng?.lng]);

    if (loadError) return (
        <div style={{ height: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050c18', borderRadius: '12px', color: '#ff3b5c', fontSize: '0.9rem', padding: '1rem', textAlign: 'center' }}>
            Google Maps failed to load. Check API key & enable Maps JS API + Directions API in Cloud Console.
        </div>
    );
    if (!isLoaded) return (
        <div style={{ height: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050c18', borderRadius: '12px', color: '#00f5ff', fontSize: '0.9rem' }}>
            Loading Google Maps...
        </div>
    );

    const originIcon = { path: window.google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#00f5ff', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 };
    const destIcon = { path: window.google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#a78bfa', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 };

    return (
        <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', height: '380px' }}>
            {loading && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,12,24,0.82)', color: '#00f5ff', fontSize: '0.9rem', fontWeight: 600 }}>
                    Fetching traffic-aware route...
                </div>
            )}

            <GoogleMap
                mapContainerStyle={MAP_STYLE}
                center={mapCenter}
                zoom={12}
                options={{ styles: DARK_STYLE, zoomControl: true, mapTypeControl: false, streetViewControl: false, fullscreenControl: true, clickableIcons: false, gestureHandling: 'cooperative' }}
                onLoad={map => { mapRef.current = map; }}
            >
                {/* Live Delhi traffic flow overlay */}
                <TrafficLayer />

                {/* Origin pin */}
                {originLatLng && <Marker position={origin} icon={originIcon} title={originName || 'Origin'} zIndex={500} />}

                {/* Destination pin */}
                {destLatLng && <Marker position={dest} icon={destIcon} title={destName || 'Destination'} zIndex={500} />}

                {/* Traffic-aware corridor route */}
                {directions && (
                    <DirectionsRenderer
                        directions={directions}
                        options={{
                            suppressMarkers: true,
                            suppressInfoWindows: true,
                            polylineOptions: {
                                strokeColor: '#00f5ff',
                                strokeWeight: 5,
                                strokeOpacity: corridorActive ? 1.0 : 0.8,
                            },
                        }}
                    />
                )}

                {/* Animated ambulance */}
                {corridorActive && routePath.length > 0 && (
                    <MovingAmbulance
                        path={routePath}
                        active={corridorActive}
                        onNodeUpdate={onNodeUpdate}
                        totalNodes={corridorNodeCount}
                        onNodeAdvance={onNodeAdvance}
                        nodeCount={corridorNodeCount}
                    />
                )}
            </GoogleMap>

            {/* Legend */}
            <div style={{ position: 'absolute', bottom: 10, right: 10, zIndex: 5, background: 'rgba(5,12,24,0.92)', border: '1px solid rgba(0,245,255,0.15)', borderRadius: '8px', padding: '6px 10px', fontSize: '0.62rem', color: 'rgba(255,255,255,0.55)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 20, height: 3, background: '#00f5ff', display: 'inline-block', borderRadius: 2 }} /> Corridor
                    </span>
                    <span>· Traffic signals visible at zoom 15+</span>
                </div>
            </div>
        </div>
    );
}
