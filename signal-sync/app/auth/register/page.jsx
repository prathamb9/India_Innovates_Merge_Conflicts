'use client';
import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';

export default function RegisterPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [form, setForm] = useState({
        name: '', email: '', password: '',
        vehicleNumber: '', type: 'ambulance',
        aadhaarNumber: '', dlNumber: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    async function handleRegister(e) {
        e.preventDefault();
        setError('');

        // Validate Aadhaar (12 digits)
        const cleanAadhaar = form.aadhaarNumber.replace(/\s/g, '');
        if (!/^\d{12}$/.test(cleanAadhaar)) {
            setError('Aadhaar number must be exactly 12 digits.');
            return;
        }
        if (!form.dlNumber.trim()) {
            setError('Driving License number is required.');
            return;
        }

        setLoading(true);
        try {
            // 1. Create Firebase user
            const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);

            // 2. Save to Firestore (non-blocking  redirect immediately after)
            const profileData = {
                name: form.name,
                email: form.email,
                vehicleNumber: form.vehicleNumber.trim().toUpperCase(),
                vehicleType: form.type,
                aadhaarNumber: cleanAadhaar,
                dlNumber: form.dlNumber.trim().toUpperCase(),
                role: 'user',
                verified: false,
                createdAt: new Date().toISOString(),
            };

            // Don't await  write in background so redirect is instant
            setDoc(doc(db, 'users', cred.user.uid), profileData).catch(err =>
                console.error('Firestore write error:', err)
            );

            // 3. Fire-and-forget backend registration
            cred.user.getIdToken().then(token => {
                fetch('http://localhost:8080/api/v1/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        firebase_uid: cred.user.uid,
                        email: form.email,
                        name: form.name,
                        aadhaar_number: cleanAadhaar,
                        dl_number: form.dlNumber.trim().toUpperCase(),
                    }),
                }).catch(() => {});
            }).catch(() => {});

            // 4. Redirect to sign-in immediately
            router.push('/auth/login');
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') setError('Email already registered. Sign in instead.');
            else if (err.code === 'auth/weak-password') setError('Password must be at least 6 characters.');
            else {
                console.error("Registration Error:", err);
                setError(`Registration failed: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-bg-deep font-sans flex items-center justify-center relative overflow-hidden py-12">
            <div className="grid-bg" />
            <div className="glow-blob" style={{ width: 500, height: 500, top: -200, left: -100, opacity: 0.4, background: 'rgba(34,211,238,0.10)' }} />

            <div className="relative z-10 w-full max-w-md mx-4 bg-[rgba(13,17,23,0.92)] backdrop-blur-xl border border-cyan-500/20 rounded-[32px] p-10 shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
                <div className="flex flex-col items-center mb-7">
                    <Link href="/" className="flex items-center gap-2.5 font-extrabold text-2xl mb-3 no-underline text-white">
                        <div className="w-12 h-12 rounded-[24px] bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(34,211,238,0.25)]"></div>
                        <span><span className="text-cyan-400">Signal</span>Sync</span>
                    </Link>
                    <h2 className="text-xl font-bold mt-1">{t('registerTitle')}</h2>
                    <p className="text-text-secondary text-sm mt-1 text-center">{t('joinDispatcher')}</p>
                </div>

                <form onSubmit={handleRegister} className="flex flex-col gap-4">
                    {/* Personal Info */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">{t('fullName')}</label>
                        <input required className="input-field" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Dr. Arjun Mehta" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">{t('emailLabel')}</label>
                        <input type="email" required className="input-field" value={form.email} onChange={e => set('email', e.target.value)} placeholder="your@email.com" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">{t('passwordLabel')}</label>
                        <input type="password" required minLength={6} className="input-field" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 6 characters" />
                    </div>

                    {/* Vehicle section */}
                    <div className="bg-white/[0.02] border border-white/10 rounded-[24px] p-4 flex flex-col gap-3">
                        <div className="text-[0.75rem] font-bold text-text-muted uppercase tracking-wide mb-1"> {t('vehicleNumber')}</div>
                        <div className="flex gap-2">
                            {[['ambulance', t('ambulanceLabel')], ['fire', t('fireTruckLabel')], ['vvip', t('vvipLabel')]].map(([v, l]) => (
                                <button key={v} type="button" onClick={() => set('type', v)}
                                    className={`flex-1 py-2 px-1 rounded-[24px] border text-xs transition-all font-sans cursor-pointer ${form.type === v ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-white/[0.02] border-white/5 text-text-secondary'}`}>
                                    {l}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">{t('vehicleNumber')}</label>
                            <input required className="input-field font-mono" value={form.vehicleNumber} onChange={e => set('vehicleNumber', e.target.value)} placeholder="e.g. DL-1AB-2345" />
                        </div>
                    </div>

                    {/* Aadhaar section */}
                    <div className="bg-white/[0.02] border border-cyan-600/20 rounded-[24px] p-4 flex flex-col gap-2">
                        <div className="text-[0.75rem] font-bold text-cyan-400 uppercase tracking-wide"> Aadhaar Number <span className="text-accent-red">*</span></div>
                        <input required className="input-field font-mono" value={form.aadhaarNumber} onChange={e => set('aadhaarNumber', e.target.value)} placeholder="1234 5678 9012" maxLength={14} />
                    </div>

                    {/* Driving License section */}
                    <div className="bg-white/[0.02] border border-cyan-600/20 rounded-[24px] p-4 flex flex-col gap-2">
                        <div className="text-[0.75rem] font-bold text-cyan-400 uppercase tracking-wide"> Driving License <span className="text-accent-red">*</span></div>
                        <input required className="input-field font-mono" value={form.dlNumber} onChange={e => set('dlNumber', e.target.value)} placeholder="DL-0420110012345" />
                    </div>

                    {error && <p className="text-accent-red text-sm text-center">{error}</p>}

                    <button type="submit" disabled={loading}
                        className="w-full py-3.5 rounded-[24px] font-bold bg-gradient-to-r from-cyan-500 to-cyan-600 text-black shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] disabled:opacity-50 transition-all font-sans cursor-pointer border-none">
                        {loading ? t('registering') : t('createAccount')}
                    </button>
                </form>

                <div className="mt-5 pt-4 border-t border-white/5 text-center text-sm text-text-muted">
                    {t('alreadyHaveAccount')}{' '}
                    <Link href="/auth/login" className="text-cyan-400 hover:underline">{t('signInLink2')}</Link>
                </div>
            </div>
        </div>
    );
}
