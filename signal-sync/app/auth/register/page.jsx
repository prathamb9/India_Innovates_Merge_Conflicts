'use client';
import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';

export default function RegisterPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [form, setForm] = useState({
        name: '', email: '', password: '', phone: '',
        aadhaar: '', dl: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    function validate() {
        const errs = {};
        const aadhaar = form.aadhaar.replace(/\s/g, '');
        if (!aadhaar) errs.aadhaar = 'Aadhaar number is required';
        else if (!/^\d{12}$/.test(aadhaar)) errs.aadhaar = 'Aadhaar must be exactly 12 digits';
        if (!form.dl.trim()) errs.dl = 'Driving License number is required';
        else if (form.dl.trim().length < 5) errs.dl = 'Invalid Driving License number';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }

    async function handleRegister(e) {
        e.preventDefault();
        setError('');
        if (!validate()) return;
        setLoading(true);
        try {
            const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
            await setDoc(doc(db, 'users', cred.user.uid), {
                name: form.name,
                email: form.email,
                phone: form.phone.trim() || null,
                aadhaar: form.aadhaar.replace(/\s/g, ''),
                dl: form.dl.trim().toUpperCase(),
                role: 'user',
                verified: false,
                createdAt: serverTimestamp(),
            });

            // Redirect to sign in after registration
            router.push('/auth/login?registered=1');
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') setError('Email already registered. Sign in instead.');
            else if (err.code === 'auth/weak-password') setError('Password must be at least 6 characters.');
            else {
                console.error("Firebase Registration Error:", err);
                setError(`Registration failed: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-bg-deep font-sans flex items-center justify-center relative overflow-hidden">
            <div className="grid-bg" />
            <div className="glow-blob" style={{ width: 500, height: 500, top: -200, left: -100, opacity: 0.5, background: 'rgba(0,255,255,0.10)' }} />
            <div className="glow-blob" style={{ width: 400, height: 400, bottom: -100, right: -100, opacity: 0.4, background: 'rgba(124,58,237,0.12)' }} />

            <div className="relative z-10 w-full max-w-md mx-4 bg-[rgba(13,17,23,0.92)] backdrop-blur-xl border border-[rgba(0,255,255,0.20)] rounded-[32px] p-10 shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
                <div className="flex flex-col items-center mb-7">
                    <Link href="/" className="flex items-center gap-2.5 font-extrabold text-2xl mb-3 no-underline text-white">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center text-2xl">⬡</div>
                        <span><span className="text-accent-cyan">Signal</span>Sync</span>
                    </Link>
                    <h2 className="text-xl font-bold mt-1">{t('registerTitle') || 'Create Account'}</h2>
                    <p className="text-text-secondary text-sm mt-1 text-center">{t('joinDispatcher') || 'Join the dispatcher network'}</p>
                </div>

                <form onSubmit={handleRegister} className="flex flex-col gap-4">
                    {/* Name */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">{t('fullName') || 'Full Name'}</label>
                        <input required className="input-field" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Dr. Arjun Mehta" />
                    </div>

                    {/* Email */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">{t('emailLabel') || 'Email'}</label>
                        <input type="email" required className="input-field" value={form.email} onChange={e => set('email', e.target.value)} placeholder="your@email.com" />
                    </div>

                    {/* Password */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">{t('passwordLabel') || 'Password'}</label>
                        <input type="password" required minLength={6} className="input-field" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 6 characters" />
                    </div>

                    {/* Phone */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">
                            Phone <span className="text-text-muted font-normal normal-case">(optional)</span>
                        </label>
                        <input type="tel" className="input-field" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
                    </div>

                    <div className="h-px bg-white/5 my-1" />

                    {/* Aadhaar */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Aadhaar Number</label>
                        <input required className="input-field font-mono" value={form.aadhaar} onChange={e => set('aadhaar', e.target.value)} placeholder="1234 5678 9012" maxLength={14} />
                        {errors.aadhaar && <span className="text-accent-red text-xs">{errors.aadhaar}</span>}
                    </div>

                    {/* Driving License */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Driving License Number</label>
                        <input required className="input-field font-mono" value={form.dl} onChange={e => set('dl', e.target.value)} placeholder="DL-XX-XXXXXXXXXX" />
                        {errors.dl && <span className="text-accent-red text-xs">{errors.dl}</span>}
                    </div>

                    {error && <p className="text-accent-red text-sm text-center">{error}</p>}

                    <button type="submit" disabled={loading}
                        className="w-full py-3.5 rounded-xl font-bold bg-accent-cyan hover:bg-accent-cyan/80 text-black disabled:opacity-50 transition-all font-sans cursor-pointer">
                        {loading ? (t('registering') || 'Registering...') : (t('createAccount') || 'Create Account')}
                    </button>
                </form>

                <div className="mt-5 pt-4 border-t border-white/5 text-center text-sm text-text-muted">
                    {t('alreadyHaveAccount') || 'Already have an account?'}{' '}
                    <Link href="/auth/login" className="text-accent-cyan hover:underline">{t('signInLink2') || 'Sign In'}</Link>
                </div>
            </div>
        </div>
    );
}
