'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Badge from '@/components/Badge';
import StatusDot from '@/components/StatusDot';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { MAPS_LIBRARIES } from '@/components/DelhiMap';
import { useRef, useState, useCallback } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

const DelhiMap = dynamic(() => import('@/components/DelhiMap'), {
    ssr: false,
    loading: () => (
        <div style={{ height: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050c18', borderRadius: '12px', color: '#00f5ff' }}>
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

function PlaceInput({ label, placeholder, cityBounds, onPlaceSelect, keyId }) {
    const acRef = useRef(null);
    const opts = cityBounds
        ? { bounds: cityBounds, strictBounds: true, componentRestrictions: { country: 'in' } }
        : { componentRestrictions: { country: 'in' } };
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">{label}</label>
            <Autocomplete key={keyId} onLoad={ac => { acRef.current = ac; }}
                onPlaceChanged={() => {
                    if (!acRef.current) return;
                    const place = acRef.current.getPlace();
                    if (place?.geometry?.location) onPlaceSelect({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng(), name: place.formatted_address || place.name || '' });
                }} options={opts}>
                <input className="input-field w-full" placeholder={placeholder} style={{ width: '100%' }} />
            </Autocomplete>
        </div>
    );
}

export default function RoutesPage() {
    const { t } = useLanguage();
    const { isLoaded: mapsLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries: MAPS_LIBRARIES,
    });

    const [city, setCity] = useState('Delhi');
    const [originLatLng, setOriginLatLng] = useState(null);
    const [destLatLng, setDestLatLng] = useState(null);
    const [originName, setOriginName] = useState('');
    const [destName, setDestName] = useState('');
    const [showRoute, setShowRoute] = useState(false);
    const [routeInfo, setRouteInfo] = useState(null);
    const [calculating, setCalculating] = useState(false);

    function reset() { setOriginLatLng(null); setDestLatLng(null); setOriginName(''); setDestName(''); setShowRoute(false); setRouteInfo(null); }
    function calcRoute() { if (!originLatLng || !destLatLng) return; setCalculating(true); setTimeout(() => { setCalculating(false); setShowRoute(true); }, 600); }

    const handleRouteResult = useCallback((info) => setRouteInfo(info), []);
    const cityBounds = CITIES.find(c => c.name === city)?.bounds;

    return (
        <div className="min-h-screen bg-bg-deep font-sans relative">
            <div className="grid-bg" />
            <nav className="relative z-10 flex items-center justify-between px-8 py-3.5 bg-bg-deep/95 border-b border-white/5 backdrop-blur-xl">
                <Link href="/" className="flex items-center gap-2.5 font-extrabold text-xl no-underline text-white">
                    <div className="w-8 h-8 rounded-[6px] bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center neon-cyan"></div>
                    <span><span className="text-accent-cyan">Signal</span>Sync</span>
                </Link>
                <div className="flex items-center gap-2.5">
                    <Badge variant="cyan"><StatusDot color="cyan" className="mr-1" />{t('liveTraffic') || 'Live Traffic'}</Badge>
                    <span className="text-text-muted text-xs">{t('routeFinderLink')}  {t('noAccountRequired')}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/dashboard" className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/5 text-text-primary no-underline">{t('dashboardLink')}</Link>
                    <Link href="/portal" className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan no-underline">{t('portalLink')}</Link>
                    <Link href="/" className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/5 text-text-primary no-underline"> {t('homeLink')}</Link>
                </div>
            </nav>

            <div className="relative z-10 max-w-[1400px] mx-auto px-8 py-10">
                <div className="mb-6">
                    <h1 className="text-3xl font-extrabold mb-2">{t('routeFinderTitle')}</h1>
                    <p className="text-text-secondary">{t('routeFinderSub')}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
                    {/* LEFT  Input panel */}
                    <div className="bg-bg-card border border-white/5 rounded-xl p-6 flex flex-col gap-4 h-fit">
                        <h2 className="text-base font-bold">{t('findRoute') || 'Find Best Route'}</h2>

                        {/* City */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">{t('selectCity')}</label>
                            <select className="input-field" value={city}
                                onChange={e => { setCity(e.target.value); reset(); }}
                                style={{ color: '#0f172a', background: '#f8fafc' }}>
                                {CITIES.map(c => <option key={c.name} value={c.name} style={{ color: '#0f172a' }}>{c.name}</option>)}
                            </select>
                        </div>

                        {/* Origin */}
                        {mapsLoaded ? (
                            <PlaceInput key={`ro-${city}`} label={t('origin')} placeholder={`${city}...`} cityBounds={cityBounds} onPlaceSelect={p => { setOriginLatLng({ lat: p.lat, lng: p.lng }); setOriginName(p.name); setShowRoute(false); setRouteInfo(null); }} />
                        ) : <div className="flex flex-col gap-1.5"><label className="text-[0.78rem] font-semibold text-text-secondary uppercase">{t('origin')}</label><input disabled className="input-field opacity-50" placeholder="Loading Maps..." /></div>}

                        <div className="flex items-center gap-2.5">
                            <div className="flex-1 h-px bg-white/10" />
                            <button onClick={() => { const ol = originLatLng, on = originName; setOriginLatLng(destLatLng); setDestLatLng(ol); setOriginName(destName); setDestName(on); reset(); }}
                                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-text-secondary font-sans cursor-pointer"></button>
                            <div className="flex-1 h-px bg-white/10" />
                        </div>

                        {/* Destination */}
                        {mapsLoaded ? (
                            <PlaceInput key={`rd-${city}`} label={t('destination')} placeholder={`${city}...`} cityBounds={cityBounds} onPlaceSelect={p => { setDestLatLng({ lat: p.lat, lng: p.lng }); setDestName(p.name); setShowRoute(false); setRouteInfo(null); }} />
                        ) : <div className="flex flex-col gap-1.5"><label className="text-[0.78rem] font-semibold text-text-secondary uppercase">{t('destination')}</label><input disabled className="input-field opacity-50" placeholder="Loading Maps..." /></div>}

                        <button onClick={calcRoute} disabled={calculating || !originLatLng || !destLatLng}
                            className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-br from-accent-cyan to-[#0099cc] text-black disabled:opacity-50 hover:shadow-[0_0_20px_rgba(0,245,255,0.4)] transition-all font-sans cursor-pointer">
                            {calculating ? t('findingRoute') : t('findRoute')}
                        </button>

                        {/* Result summary */}
                        {showRoute && routeInfo && (
                            <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
                                <div className="text-[0.7rem] text-text-muted uppercase tracking-widest">Traffic-Aware Route</div>
                                <div className="flex gap-3">
                                    <div className="flex-1 bg-white/[0.02] border border-white/10 rounded-xl p-3 text-center">
                                        <div className="text-[0.65rem] text-text-muted mb-1">{t('distance')}</div>
                                        <div className="font-bold font-mono text-accent-cyan">{routeInfo.distanceText}</div>
                                    </div>
                                    <div className="flex-1 bg-white/[0.02] border border-white/10 rounded-xl p-3 text-center">
                                        <div className="text-[0.65rem] text-text-muted mb-1">{t('duration')}</div>
                                        <div className="font-bold font-mono text-accent-amber">{routeInfo.durationText}</div>
                                    </div>
                                </div>
                                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                    <div className="flex items-start gap-2 mb-2">
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00f5ff', display: 'inline-block', flexShrink: 0, marginTop: 4 }} />
                                        <span className="text-xs text-text-secondary">{originName}</span>
                                    </div>
                                    <div className="ml-[4px] w-0.5 h-3 bg-white/10 mb-2" />
                                    <div className="flex items-start gap-2">
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa', display: 'inline-block', flexShrink: 0, marginTop: 4 }} />
                                        <span className="text-xs text-text-secondary">{destName}</span>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <Link href="/portal" className="text-xs text-accent-cyan no-underline hover:underline">Need priority? Create a Green Corridor {'->'} </Link>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT  Map */}
                    <div className="bg-bg-card border border-white/5 rounded-xl p-5">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <h3 className="text-base font-bold">{t('trafficMapTitle', city) || `${city} ${t('trafficMapTitle') || 'Traffic Map'}`}</h3>
                                <p className="text-text-secondary text-xs">{showRoute && originName ? `${originName} -> ${destName}` : t('selectOriginDest')}</p>
                            </div>
                            <Badge variant="cyan"><StatusDot color="cyan" className="mr-1" />Live</Badge>
                        </div>
                        <div style={{ height: '420px' }}>
                            <DelhiMap
                                showCorridor={showRoute}
                                corridorActive={false}
                                originLatLng={originLatLng}
                                destLatLng={destLatLng}
                                originName={originName}
                                destName={destName}
                                onRouteResult={handleRouteResult}
                                onNodeUpdate={() => { }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
