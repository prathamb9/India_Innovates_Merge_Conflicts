'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [profile, setProfile] = useState(null);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [loadingProfile, setLoadingProfile] = useState(true);

    const [form, setForm] = useState({
        name: '', vehicleNumber: '', vehicleType: 'ambulance',
        aadhaarNumber: '', dlNumber: '',
    });

    // Redirect if not logged in
    useEffect(() => {
        if (!authLoading && !user) router.push('/auth/login');
    }, [authLoading, user, router]);

    // Load profile from Firestore
    useEffect(() => {
        async function load() {
            if (!user) return;
            try {
                const snap = await getDoc(doc(db, 'users', user.uid));
                if (snap.exists()) {
                    const d = snap.data();
                    setProfile(d);
                    setForm({
                        name: d.name || '',
                        vehicleNumber: d.vehicleNumber || '',
                        vehicleType: d.vehicleType || 'ambulance',
                        aadhaarNumber: d.aadhaarNumber || '',
                        dlNumber: d.dlNumber || '',
                    });
                }
            } catch (err) {
                console.error('Failed to load profile:', err);
            } finally {
                setLoadingProfile(false);
            }
        }
        load();
    }, [user]);

    async function handleSave(e) {
        e.preventDefault();
        setError(''); setSuccess(''); setSaving(true);
        try {
            await setDoc(doc(db, 'users', user.uid), {
                name: form.name,
                vehicleNumber: form.vehicleNumber.trim().toUpperCase(),
                vehicleType: form.vehicleType,
                aadhaarNumber: form.aadhaarNumber.replace(/\s/g, ''),
                dlNumber: form.dlNumber.trim().toUpperCase(),
            }, { merge: true });

            // Fire-and-forget backend update
            const token = localStorage.getItem('authToken');
            if (token) {
                fetch('http://localhost:8080/api/v1/auth/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        name: form.name,
                        aadhaar_number: form.aadhaarNumber.replace(/\s/g, ''),
                        dl_number: form.dlNumber.trim().toUpperCase(),
                    }),
                }).catch(() => {});
            }

            setSuccess('Profile updated successfully!');
            setEditing(false);
            const snap = await getDoc(doc(db, 'users', user.uid));
            if (snap.exists()) setProfile(snap.data());
        } catch (err) {
            setError('Failed to save profile.');
            console.error(err);
        } finally {
            setSaving(false);
        }
    }

    if (authLoading || !user || loadingProfile) {
        return (
            <div className="min-h-screen bg-bg-deep flex items-center justify-center">
                <div className="text-text-secondary animate-pulse text-lg">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-deep font-sans relative overflow-hidden">
            <div className="grid-bg" />
            <div className="glow-blob" style={{ width: 500, height: 500, top: -200, left: -100, opacity: 0.4, background: 'rgba(34,211,238,0.08)' }} />

            <div className="relative z-10 pt-24 pb-8 px-6">
                <div className="max-w-2xl mx-auto">
                    <Link href="/portal" className="text-text-muted hover:text-white text-sm transition-colors no-underline inline-flex items-center gap-1 mb-6">
                         Back to Portal
                    </Link>

                    <div className="flex items-center gap-5 mb-8">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-3xl font-bold text-black shadow-[0_0_25px_rgba(34,211,238,0.25)]">
                            {(profile?.name || user.email)?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">{profile?.name || 'Driver Profile'}</h1>
                            <p className="text-text-secondary text-sm mt-1">{user.email}</p>
                            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                {profile?.role?.toUpperCase() || 'USER'}
                            </div>
                        </div>
                    </div>

                    {success && <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm text-center">{success}</div>}
                    {error && <div className="mb-4 p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm text-center">{error}</div>}

                    <div className="bg-[rgba(13,17,23,0.92)] backdrop-blur-xl border border-cyan-500/15 rounded-[24px] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
                        {!editing ? (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-text-muted uppercase tracking-wide mb-3"> Personal Information</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><div className="text-[0.7rem] text-text-muted uppercase tracking-wide mb-1">Name</div><div className="text-white font-medium">{profile?.name || ''}</div></div>
                                        <div><div className="text-[0.7rem] text-text-muted uppercase tracking-wide mb-1">Email</div><div className="text-white font-medium">{user.email}</div></div>
                                    </div>
                                </div>

                                <div className="border-t border-white/5" />

                                <div>
                                    <h3 className="text-sm font-bold text-text-muted uppercase tracking-wide mb-3"> Vehicle Details</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><div className="text-[0.7rem] text-text-muted uppercase tracking-wide mb-1">Vehicle Type</div><div className="text-white font-medium capitalize">{profile?.vehicleType || ''}</div></div>
                                        <div><div className="text-[0.7rem] text-text-muted uppercase tracking-wide mb-1">Vehicle Number</div><div className="text-white font-medium font-mono">{profile?.vehicleNumber || ''}</div></div>
                                    </div>
                                </div>

                                <div className="border-t border-white/5" />

                                <div>
                                    <h3 className="text-sm font-bold text-text-muted uppercase tracking-wide mb-3"> Identity Documents</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/[0.02] border border-cyan-500/15 rounded-xl p-4">
                                            <div className="text-[0.7rem] text-cyan-400 uppercase tracking-wide mb-1 font-semibold">Aadhaar Number</div>
                                            <div className="text-white font-mono text-sm">
                                                {profile?.aadhaarNumber
                                                    ? `${profile.aadhaarNumber.slice(0, 4)} ${profile.aadhaarNumber.slice(4, 8)} ${profile.aadhaarNumber.slice(8)}`
                                                    : ''}
                                            </div>
                                            <div className="mt-2 text-[0.65rem] text-text-muted">{profile?.aadhaarNumber ? ' Submitted' : '! Not provided'}</div>
                                        </div>
                                        <div className="bg-white/[0.02] border border-cyan-500/15 rounded-xl p-4">
                                            <div className="text-[0.7rem] text-cyan-400 uppercase tracking-wide mb-1 font-semibold">Driving License</div>
                                            <div className="text-white font-mono text-sm">{profile?.dlNumber || ''}</div>
                                            <div className="mt-2 text-[0.65rem] text-text-muted">{profile?.dlNumber ? ' Submitted' : '! Not provided'}</div>
                                        </div>
                                    </div>
                                </div>

                                <button onClick={() => setEditing(true)}
                                    className="w-full mt-2 py-3 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-cyan-600 text-black transition-all hover:shadow-[0_0_25px_rgba(34,211,238,0.3)] cursor-pointer border-none font-sans shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                                     Edit Profile
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSave} className="space-y-5">
                                <h3 className="text-sm font-bold text-text-muted uppercase tracking-wide">Edit Profile</h3>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Full Name</label>
                                    <input required className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                                </div>

                                <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                                    <div className="text-[0.75rem] font-bold text-text-muted uppercase tracking-wide mb-1"> Vehicle</div>
                                    <div className="flex gap-2">
                                        {[['ambulance', 'Ambulance'], ['fire', 'Fire Truck'], ['vvip', 'VVIP']].map(([v, l]) => (
                                            <button key={v} type="button" onClick={() => setForm(f => ({ ...f, vehicleType: v }))}
                                                className={`flex-1 py-2 px-1 rounded-xl border text-xs transition-all font-sans cursor-pointer ${form.vehicleType === v ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-white/[0.02] border-white/5 text-text-secondary'}`}>
                                                {l}
                                            </button>
                                        ))}
                                    </div>
                                    <input className="input-field font-mono" value={form.vehicleNumber} onChange={e => setForm(f => ({ ...f, vehicleNumber: e.target.value }))} placeholder="e.g. DL-1AB-2345" />
                                </div>

                                <div className="bg-white/[0.02] border border-cyan-600/20 rounded-xl p-4 flex flex-col gap-2">
                                    <div className="text-[0.75rem] font-bold text-cyan-400 uppercase tracking-wide"> Aadhaar Number</div>
                                    <input className="input-field font-mono" value={form.aadhaarNumber} onChange={e => setForm(f => ({ ...f, aadhaarNumber: e.target.value }))} placeholder="1234 5678 9012" maxLength={14} />
                                </div>

                                <div className="bg-white/[0.02] border border-cyan-600/20 rounded-xl p-4 flex flex-col gap-2">
                                    <div className="text-[0.75rem] font-bold text-cyan-400 uppercase tracking-wide"> Driving License</div>
                                    <input className="input-field font-mono" value={form.dlNumber} onChange={e => setForm(f => ({ ...f, dlNumber: e.target.value }))} placeholder="DL-0420110012345" />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => { setEditing(false); setError(''); setSuccess(''); }}
                                        className="flex-1 py-3 rounded-xl font-bold border border-white/10 bg-transparent text-text-secondary hover:text-white hover:border-white/20 transition-all cursor-pointer font-sans">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={saving}
                                        className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-cyan-600 text-black shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_25px_rgba(34,211,238,0.3)] disabled:opacity-50 transition-all cursor-pointer font-sans border-none">
                                        {saving ? 'Saving...' : ' Save Changes'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
