'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Badge from '@/components/Badge';
import { useLanguage } from '@/components/LanguageProvider';

export default function ProfilePage() {
    const router = useRouter();
    const { user, userProfile, logout } = useAuth();
    const { t } = useLanguage();

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [form, setForm] = useState({
        display_name: '',
        phone: '',
        aadhaar_number: '',
        dl_number: '',
        vehicle_type: 'ambulance',
        vehicle_number: '',
    });
    const [errors, setErrors] = useState({});

    // Redirect if not logged in
    useEffect(() => {
        if (!user && typeof window !== 'undefined') {
            router.push('/auth/login');
        }
    }, [user, router]);

    // Load profile from backend
    useEffect(() => {
        if (!user) return;
        async function load() {
            try {
                const token = localStorage.getItem('authToken');
                const res = await fetch('http://localhost:8080/api/v1/user/profile', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setForm({
                        display_name: data.display_name || '',
                        phone: data.phone || '',
                        aadhaar_number: data.aadhaar_number || '',
                        dl_number: data.dl_number || '',
                        vehicle_type: data.vehicle_type || 'ambulance',
                        vehicle_number: data.vehicle_number || '',
                    });
                }
            } catch (e) {
                console.error('Failed to load profile', e);
            }
        }
        load();
    }, [user]);

    function validate() {
        const errs = {};
        if (form.aadhaar_number && !/^\d{12}$/.test(form.aadhaar_number.replace(/\s/g, ''))) {
            errs.aadhaar_number = 'Aadhaar must be exactly 12 digits';
        }
        if (form.dl_number && form.dl_number.trim().length < 5) {
            errs.dl_number = 'Invalid Driving License number';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }

    async function handleSave() {
        if (!validate()) return;
        setSaving(true);
        setMsg('');
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch('http://localhost:8080/api/v1/user/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    display_name: form.display_name,
                    phone: form.phone || null,
                    aadhaar_number: form.aadhaar_number.replace(/\s/g, '') || null,
                    dl_number: form.dl_number.trim() || null,
                    vehicle_type: form.vehicle_type || null,
                    vehicle_number: form.vehicle_number || null,
                }),
            });
            if (res.ok) {
                setMsg('Profile updated successfully!');
                setEditing(false);
            } else {
                const err = await res.json();
                setMsg(err.detail || 'Failed to update profile');
            }
        } catch (e) {
            setMsg('Network error. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    if (!user) return null;

    return (
        <div className="min-h-screen bg-bg-deep font-sans relative">
            <div className="grid-bg" />

            {/* Nav */}
            <nav className="relative z-10 flex items-center justify-between px-10 py-3.5 bg-bg-deep/95 border-b border-white/5 backdrop-blur-xl">
                <Link href="/" className="flex items-center gap-2.5 font-extrabold text-xl no-underline text-white">
                    <div className="w-8 h-8 rounded-[6px] bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan">⬡</div>
                    <span><span className="text-accent-cyan">Signal</span>Sync</span>
                </Link>
                <div className="flex items-center gap-2">
                    <Link href="/portal" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/5 text-text-primary no-underline">Portal</Link>
                    <Link href="/dashboard" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/5 text-text-primary no-underline">Dashboard</Link>
                    <button onClick={logout} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[rgba(255,59,92,0.15)] text-accent-red border border-accent-red/30 font-sans cursor-pointer">Logout</button>
                </div>
            </nav>

            <div className="relative z-10 max-w-2xl mx-auto px-6 py-10">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold">My Profile</h1>
                        <p className="text-text-secondary text-sm mt-1">View and update your driver details</p>
                    </div>
                    <Badge variant="cyan">{userProfile?.role || 'user'}</Badge>
                </div>

                {/* Profile Card */}
                <div className="bg-bg-card border border-white/5 rounded-2xl p-8">

                    {/* Account Info (read-only) */}
                    <div className="mb-8">
                        <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">Account</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <div className="text-[0.7rem] text-text-muted uppercase mb-1">Email</div>
                                <div className="text-sm text-text-primary">{user?.email || '—'}</div>
                            </div>
                            <div>
                                <div className="text-[0.7rem] text-text-muted uppercase mb-1">UID</div>
                                <div className="text-sm text-text-muted font-mono truncate">{user?.uid || '—'}</div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-white/5 mb-8" />

                    {/* Editable fields */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider">Personal Details</h3>
                            {!editing && (
                                <button onClick={() => setEditing(true)}
                                    className="text-xs font-bold text-accent-cyan bg-accent-cyan/10 border border-accent-cyan/30 px-3 py-1.5 rounded-lg font-sans cursor-pointer hover:bg-accent-cyan/20 transition-all">
                                    Edit
                                </button>
                            )}
                        </div>

                        <div className="flex flex-col gap-4">
                            {/* Name */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[0.75rem] font-semibold text-text-secondary uppercase">Display Name</label>
                                {editing ? (
                                    <input className="input-field" value={form.display_name} onChange={e => set('display_name', e.target.value)} placeholder="Dr. Arjun Mehta" />
                                ) : (
                                    <div className="text-sm text-text-primary py-3 px-4 bg-white/[0.02] border border-white/5 rounded-xl">{form.display_name || '—'}</div>
                                )}
                            </div>

                            {/* Phone */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[0.75rem] font-semibold text-text-secondary uppercase">Phone</label>
                                {editing ? (
                                    <input type="tel" className="input-field" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
                                ) : (
                                    <div className="text-sm text-text-primary py-3 px-4 bg-white/[0.02] border border-white/5 rounded-xl">{form.phone || '—'}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-white/5 mb-8" />

                    {/* Driver Details */}
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">Driver & Vehicle Details</h3>
                        <div className="flex flex-col gap-4">

                            {/* Aadhaar */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[0.75rem] font-semibold text-text-secondary uppercase">Aadhaar Number</label>
                                {editing ? (
                                    <>
                                        <input className="input-field font-mono" value={form.aadhaar_number} onChange={e => set('aadhaar_number', e.target.value)} placeholder="1234 5678 9012" maxLength={14} />
                                        {errors.aadhaar_number && <span className="text-accent-red text-xs">{errors.aadhaar_number}</span>}
                                    </>
                                ) : (
                                    <div className="text-sm text-text-primary py-3 px-4 bg-white/[0.02] border border-white/5 rounded-xl font-mono">
                                        {form.aadhaar_number ? `${form.aadhaar_number.slice(0,4)} •••• ${form.aadhaar_number.slice(-4)}` : '—'}
                                    </div>
                                )}
                            </div>

                            {/* Driving License */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[0.75rem] font-semibold text-text-secondary uppercase">Driving License</label>
                                {editing ? (
                                    <>
                                        <input className="input-field font-mono" value={form.dl_number} onChange={e => set('dl_number', e.target.value)} placeholder="DL-XX-XXXXXXXXXX" />
                                        {errors.dl_number && <span className="text-accent-red text-xs">{errors.dl_number}</span>}
                                    </>
                                ) : (
                                    <div className="text-sm text-text-primary py-3 px-4 bg-white/[0.02] border border-white/5 rounded-xl font-mono">{form.dl_number || '—'}</div>
                                )}
                            </div>

                            {/* Vehicle Type */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[0.75rem] font-semibold text-text-secondary uppercase">Vehicle Type</label>
                                {editing ? (
                                    <div className="flex gap-2">
                                        {[['ambulance', 'Ambulance'], ['fire', 'Fire Truck'], ['vvip', 'VVIP']].map(([v, l]) => (
                                            <button key={v} type="button" onClick={() => set('vehicle_type', v)}
                                                className={`flex-1 py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all font-sans cursor-pointer ${form.vehicle_type === v ? 'bg-accent-cyan/10 border-accent-cyan/35 text-accent-cyan' : 'bg-white/[0.02] border-white/5 text-text-secondary hover:border-accent-cyan/20'}`}>
                                                {l}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-text-primary py-3 px-4 bg-white/[0.02] border border-white/5 rounded-xl capitalize">{form.vehicle_type || '—'}</div>
                                )}
                            </div>

                            {/* Vehicle Number */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[0.75rem] font-semibold text-text-secondary uppercase">Vehicle Number</label>
                                {editing ? (
                                    <input className="input-field font-mono" value={form.vehicle_number} onChange={e => set('vehicle_number', e.target.value)} placeholder="DL-1AB-2345 or AMB-042" />
                                ) : (
                                    <div className="text-sm text-text-primary py-3 px-4 bg-white/[0.02] border border-white/5 rounded-xl font-mono">{form.vehicle_number || '—'}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    {editing && (
                        <div className="flex gap-3 mt-6">
                            <button onClick={handleSave} disabled={saving}
                                className="flex-1 py-3.5 rounded-xl font-bold bg-gradient-to-br from-accent-cyan to-[#0099cc] text-black disabled:opacity-50 transition-all font-sans cursor-pointer">
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button onClick={() => { setEditing(false); setErrors({}); setMsg(''); }}
                                className="px-6 py-3.5 rounded-xl font-bold bg-white/5 border border-white/10 text-text-secondary font-sans cursor-pointer hover:bg-white/10 transition-all">
                                Cancel
                            </button>
                        </div>
                    )}

                    {/* Success/error message */}
                    {msg && (
                        <div className={`mt-4 text-sm text-center py-3 rounded-xl ${msg.includes('success') ? 'text-accent-green bg-accent-green/10 border border-accent-green/20' : 'text-accent-red bg-accent-red/10 border border-accent-red/20'}`}>
                            {msg}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
