'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Badge from '@/components/Badge';
import StatusDot from '@/components/StatusDot';
import { useAuth } from '@/components/AuthProvider';
import { useLanguage } from '@/components/LanguageProvider';
import {
    subscribeAllCorridors, terminateCorridor, createCorridor,
    subscribeAllUsers, setUserRole, setUserVerification, subscribeSignals, setSignalStatus,
} from '@/lib/firestore';

const SIGNAL_NODES = [
    { id: 'SIG-01', name: 'Connaught Place × Janpath' },
    { id: 'SIG-02', name: 'AIIMS × Ring Road' },
    { id: 'SIG-03', name: 'Dhaula Kuan Flyover' },
    { id: 'SIG-04', name: 'Lajpat Nagar × Ashram' },
    { id: 'SIG-05', name: 'Kashmere Gate ISBT' },
    { id: 'SIG-06', name: 'Karol Bagh × Pusa Rd' },
    { id: 'SIG-07', name: 'Nizamuddin × Sarai Kale' },
    { id: 'SIG-08', name: 'GTK Road × Azadpur' },
];

const STATUS_COLORS = {
    green: { bg: 'bg-accent-green/10', border: 'border-accent-green/40', text: 'text-accent-green', dot: 'bg-accent-green' },
    yellow: { bg: 'bg-accent-amber/10', border: 'border-accent-amber/40', text: 'text-accent-amber', dot: 'bg-accent-amber' },
    red: { bg: 'bg-accent-red/10', border: 'border-accent-red/40', text: 'text-accent-red', dot: 'bg-accent-red' },
};

export default function AdminPage() {
    const { user, userProfile, loading, logout } = useAuth();
    const router = useRouter();
    const { t } = useLanguage();

    useEffect(() => {
        if (!loading && (!user || userProfile?.role !== 'admin')) {
            router.push('/auth/login');
        }
    }, [user, userProfile, loading]);

    const [tab, setTab] = useState('corridors');
    const [corridors, setCds] = useState([]);
    const [users, setUsers] = useState([]);
    const [signals, setSigs] = useState({});

    // Create corridor form state (admin)
    const [createForm, setCreateForm] = useState({ vehicleNumber: '', vehicleType: 'ambulance', city: 'Delhi', originName: '', destName: '' });
    const [creating, setCreating] = useState(false);

    useEffect(() => { const u = subscribeAllCorridors(setCds); return () => u(); }, []);
    useEffect(() => { const u = subscribeAllUsers(setUsers); return () => u(); }, []);
    useEffect(() => { const u = subscribeSignals(setSigs); return () => u(); }, []);

    async function handleTerminate(id) {
        await terminateCorridor(id);
    }

    async function handleSignal(nodeId, status) {
        await setSignalStatus(nodeId, status, user.uid);
    }

    async function handleRoleToggle(uid, currentRole) {
        await setUserRole(uid, currentRole === 'admin' ? 'user' : 'admin');
    }

    async function handleVerifyToggle(uid, currentVerified) {
        await setUserVerification(uid, !currentVerified);
    }

    async function handleCreateCorridor(e) {
        e.preventDefault();
        if (!createForm.vehicleNumber.trim()) return;
        setCreating(true);
        try {
            await createCorridor(user.uid, {
                creatorName: userProfile.name || user.email,
                vehicleNumber: createForm.vehicleNumber.trim().toUpperCase(),
                vehicleType: createForm.vehicleType,
                city: createForm.city,
                originName: createForm.originName || '',
                destName: createForm.destName || '',
                originLatLng: null,
                destLatLng: null,
            });
            setCreateForm(f => ({ ...f, vehicleNumber: '', originName: '', destName: '' }));
        } finally {
            setCreating(false);
        }
    }

    const active = corridors.filter(c => c.status === 'active');
    const history = corridors.filter(c => c.status !== 'active');

    if (loading || !user || userProfile?.role !== 'admin') return (
        <div className="min-h-screen bg-bg-deep flex items-center justify-center text-text-muted">Verifying access</div>
    );

    return (
        <div className="min-h-screen bg-bg-deep font-sans relative">
            <div className="grid-bg" />

            {/* Header */}
            <nav className="relative z-10 flex items-center justify-between px-8 py-3.5 bg-bg-deep/95 border-b border-white/5 backdrop-blur-xl">
                <Link href="/" className="flex items-center gap-2.5 font-extrabold text-xl no-underline text-white">
                    <div className="w-8 h-8 rounded-[6px] bg-gradient-to-br from-accent-red to-accent-violet flex items-center justify-center text-lg"></div>
                    <span><span className="text-accent-red">Signal</span>Sync Admin</span>
                </Link>
                <div className="flex items-center gap-2.5">
                    <Badge variant="red">{t('administratorBadge')}</Badge>
                    <Badge variant="green"><StatusDot color="green" className="mr-1" />{userProfile?.name || user.email}</Badge>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/portal" className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/5 text-text-primary no-underline">{t('portalLink')}</Link>
                    <Link href="/dashboard" className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/5 text-text-primary no-underline">{t('dashboardLink')}</Link>
                    <button onClick={logout} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[rgba(255,59,92,0.15)] text-accent-red border border-accent-red/30 font-sans cursor-pointer">{t('logoutLink')}</button>
                </div>
            </nav>

            <div className="relative z-10 max-w-[1400px] mx-auto px-8 py-8">
                {/* Stat strip */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                        ['Active Corridors', active.length, 'text-accent-green'],
                        ['Total Corridors', corridors.length, 'text-accent-cyan'],
                        ['Registered Users', users.length, 'text-accent-violet'],
                        ['Pending Verification', users.filter(u => !u.verified && u.role !== 'admin').length, 'text-accent-amber'],
                    ].map(([l, v, c]) => (
                        <div key={l} className="bg-bg-card border border-white/5 rounded-xl p-4 text-center">
                            <div className="text-[0.65rem] text-text-muted uppercase tracking-widest mb-1">{l}</div>
                            <div className={`text-3xl font-extrabold font-mono ${c}`}>{v}</div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {[['corridors', 'Corridors'], ['signals', 'Signal Control'], ['create', 'Create Corridor'], ['users', 'Users']].map(([k, l]) => (
                        <button key={k} onClick={() => setTab(k)}
                            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all font-sans cursor-pointer ${tab === k ? 'bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan' : 'bg-white/[0.03] border border-white/5 text-text-secondary hover:border-accent-cyan/20'}`}>
                            {l}
                        </button>
                    ))}
                </div>

                {/* -- Corridors Tab -- */}
                {tab === 'corridors' && (
                    <div className="flex flex-col gap-4">
                        <div>
                            <h2 className="font-bold text-sm uppercase tracking-widest text-text-muted mb-3">Active Corridors ({active.length})</h2>
                            {active.length === 0 && <p className="text-text-muted text-sm">No active corridors.</p>}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {active.map(c => (
                                    <div key={c.id} className="bg-accent-cyan/[0.04] border border-accent-cyan/25 rounded-xl p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
                                                <Badge variant="red">{c.vehicleNumber}</Badge>
                                            </div>
                                            <button onClick={() => handleTerminate(c.id)}
                                                className="text-[0.6rem] font-bold text-accent-red border border-accent-red/30 rounded-lg px-2 py-0.5 bg-accent-red/10 hover:bg-accent-red/20 font-sans cursor-pointer">
                                                TERMINATE
                                            </button>
                                        </div>
                                        <div className="text-xs text-text-secondary mb-1">{c.originName} {'->'} {c.destName}</div>
                                        <div className="text-[0.65rem] text-text-muted">Type: {c.vehicleType} · City: {c.city}</div>
                                        <div className="text-[0.65rem] text-text-muted">By: {c.creatorName}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h2 className="font-bold text-sm uppercase tracking-widest text-text-muted mb-3 mt-4">History ({history.length})</h2>
                            <div className="flex flex-col gap-2">
                                {history.map(c => (
                                    <div key={c.id} className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 flex items-center gap-4">
                                        <span className="font-mono text-xs text-text-muted">{c.vehicleNumber}</span>
                                        <span className="text-xs text-text-secondary flex-1">{c.originName} {'->'} {c.destName}</span>
                                        <Badge variant={c.status === 'terminated' ? 'red' : 'green'}>{c.status}</Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* -- Signal Control Tab -- */}
                {tab === 'signals' && (
                    <div>
                        <h2 className="font-bold text-sm uppercase tracking-widest text-text-muted mb-4">Signal Override Panel</h2>
                        <p className="text-text-secondary text-sm mb-5">Click a colour to override the signal at that intersection. Changes are pushed to live dashboard instantly.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            {SIGNAL_NODES.map(node => {
                                const cur = signals[node.id]?.status || 'green';
                                const sc = STATUS_COLORS[cur];
                                return (
                                    <div key={node.id} className={`${sc.bg} border ${sc.border} rounded-xl p-4`}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className={`w-3 h-3 rounded-full ${sc.dot}`} />
                                            <span className="text-[0.65rem] font-mono text-text-muted">{node.id}</span>
                                        </div>
                                        <div className="text-sm font-semibold mb-3">{node.name}</div>
                                        <div className={`text-xs font-bold ${sc.text} mb-3 uppercase`}>{cur}</div>
                                        <div className="flex gap-2">
                                            {['green', 'yellow', 'red'].map(s => (
                                                <button key={s} onClick={() => handleSignal(node.id, s)}
                                                    disabled={cur === s}
                                                    className={`flex-1 py-1.5 rounded-lg text-[0.6rem] font-bold uppercase transition-all font-sans cursor-pointer disabled:opacity-30 ${s === 'green' ? 'bg-accent-green/20 text-accent-green' : s === 'yellow' ? 'bg-accent-amber/20 text-accent-amber' : 'bg-accent-red/20 text-accent-red'}`}>
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* -- Create Corridor Tab -- */}
                {tab === 'create' && (
                    <div className="max-w-lg">
                        <h2 className="font-bold text-sm uppercase tracking-widest text-text-muted mb-4">Create Corridor (Admin)</h2>
                        <p className="text-text-secondary text-sm mb-5">Directly create a corridor for any vehicle number without the map flow.</p>
                        <form onSubmit={handleCreateCorridor} className="bg-bg-card border border-white/5 rounded-xl p-6 flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Vehicle Number</label>
                                <input required className="input-field font-mono" value={createForm.vehicleNumber}
                                    onChange={e => setCreateForm(f => ({ ...f, vehicleNumber: e.target.value }))} placeholder="e.g. AMB-042, DL-1AB-2345" />
                            </div>
                            <div className="flex gap-2">
                                {[['ambulance', 'Ambulance'], ['fire', 'Fire Truck'], ['vvip', 'VVIP']].map(([v, l]) => (
                                    <button key={v} type="button" onClick={() => setCreateForm(f => ({ ...f, vehicleType: v }))}
                                        className={`flex-1 py-2.5 rounded-xl border text-sm transition-all font-sans cursor-pointer ${createForm.vehicleType === v ? 'bg-accent-cyan/10 border-accent-cyan/35 text-accent-cyan' : 'bg-white/[0.02] border-white/5 text-text-secondary'}`}>
                                        {l}
                                    </button>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Origin</label>
                                    <input className="input-field" value={createForm.originName}
                                        onChange={e => setCreateForm(f => ({ ...f, originName: e.target.value }))} placeholder="Start location" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Destination</label>
                                    <input className="input-field" value={createForm.destName}
                                        onChange={e => setCreateForm(f => ({ ...f, destName: e.target.value }))} placeholder="End location" />
                                </div>
                            </div>
                            <button type="submit" disabled={creating}
                                className="w-full py-3 rounded-xl font-bold bg-gradient-to-br from-accent-green to-[#00cc7a] text-black disabled:opacity-50 font-sans cursor-pointer">
                                {creating ? 'Creating...' : 'Create Corridor'}
                            </button>
                        </form>
                    </div>
                )}

                {/* -- Users Tab -- */}
                {tab === 'users' && (
                    <div>
                        <h2 className="font-bold text-sm uppercase tracking-widest text-text-muted mb-4">Registered Users ({users.length})</h2>
                        <div className="flex flex-col gap-2">
                            {users.map(u => (
                                <div key={u.id} className={`border rounded-xl px-5 py-3.5 flex items-center gap-4 ${!u.verified && u.role !== 'admin' ? 'bg-accent-amber/[0.04] border-accent-amber/20' : 'bg-bg-card border-white/5'}`}>
                                    <div className="flex-1">
                                        <div className="font-semibold text-sm">{u.name || ''}</div>
                                        <div className="text-xs text-text-muted">{u.email}</div>
                                    </div>
                                    {u.vehicleNumber && <span className="font-mono text-xs text-text-secondary bg-white/5 px-2 py-0.5 rounded">{u.vehicleNumber}</span>}
                                    {u.role === 'admin' ? (
                                        <Badge variant="red">admin</Badge>
                                    ) : u.verified ? (
                                        <Badge variant="green">verified</Badge>
                                    ) : (
                                        <Badge variant="amber">pending</Badge>
                                    )}
                                    {u.id !== user.uid && u.role !== 'admin' && (
                                        <button onClick={() => handleVerifyToggle(u.id, u.verified)}
                                            className={`text-[0.65rem] font-bold px-2.5 py-1 rounded-lg border font-sans cursor-pointer ${u.verified ? 'bg-accent-red/10 text-accent-red border-accent-red/30' : 'bg-accent-green/10 text-accent-green border-accent-green/30'}`}>
                                            {u.verified ? 'Revoke' : 'Verify'}
                                        </button>
                                    )}
                                    {u.id !== user.uid && (
                                        <button onClick={() => handleRoleToggle(u.id, u.role)}
                                            className={`text-[0.65rem] font-bold px-2.5 py-1 rounded-lg border font-sans cursor-pointer ${u.role === 'admin' ? 'bg-accent-red/10 text-accent-red border-accent-red/30' : 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30'}`}>
                                            {u.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
