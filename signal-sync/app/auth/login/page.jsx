'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';

export default function LoginPage() {
    const router = useRouter();
    const { t } = useLanguage();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [showReset, setShowReset] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetMsg, setResetMsg] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    async function handleLogin(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            const snap = await getDoc(doc(db, 'users', cred.user.uid));
            const userRole = snap.exists() ? snap.data().role : 'user';

            const token = await cred.user.getIdToken();
            localStorage.setItem("authToken", token);

            if (userRole === 'admin') router.push('/admin');
            else router.push('/portal');
        } catch (err) {
            setError('Invalid email or password.');
        } finally {
            setLoading(false);
        }
    }

    async function handleForgotPassword(e) {
        e.preventDefault();
        setResetMsg('');
        setResetLoading(true);
        try {
            await sendPasswordResetEmail(auth, resetEmail);
            setResetMsg('Reset email sent! Check your inbox (and spam folder).');
        } catch (err) {
            if (err.code === 'auth/user-not-found') setResetMsg('No account found with that email.');
            else setResetMsg('Failed to send email. Please try again.');
        } finally {
            setResetLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-bg-deep font-sans flex flex-col items-center justify-center relative overflow-hidden">
            <div className="grid-bg" />
            <div className="glow-blob" style={{ width: 500, height: 500, top: -200, left: -100, opacity: 0.4, background: 'rgba(34,211,238,0.10)' }} />
            <div className="glow-blob" style={{ width: 400, height: 400, bottom: -100, right: -100, opacity: 0.3, background: 'rgba(6,182,212,0.10)' }} />

            <div className="relative z-10 w-full max-w-[480px] mx-4 bg-[rgba(13,17,23,0.92)] backdrop-blur-xl border border-cyan-500/20 rounded-[32px] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
                <div className="flex flex-col items-center mb-6">
                    <Link href="/" className="flex items-center gap-2.5 font-extrabold text-2xl mb-3 no-underline text-white">
                        <div className="w-12 h-12 rounded-[24px] bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(34,211,238,0.25)]"></div>
                        <span><span className="text-cyan-400">Signal</span>Sync</span>
                    </Link>
                    <h2 className="text-xl font-bold mt-1">{showReset ? t('resetPassword') : t('signInTitle')}</h2>
                    {!showReset && <p className="text-text-secondary text-sm mt-1 text-center">{t('accessGreen')}</p>}
                </div>

                {showReset ? (
                    <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">{t('emailAddress')}</label>
                            <input type="email" required className="input-field" value={resetEmail}
                                onChange={e => setResetEmail(e.target.value)} placeholder="your@email.com" />
                        </div>
                        {resetMsg && <p className={`text-sm text-center ${resetMsg.includes('sent') ? 'text-accent-green' : 'text-accent-red'}`}>{resetMsg}</p>}
                        <button type="submit" disabled={resetLoading} className="w-full py-3.5 rounded-[24px] font-bold bg-gradient-to-r from-cyan-500 to-cyan-600 text-black shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] transition-all cursor-pointer border-none font-sans">
                            {resetLoading ? t('sending') : t('sendResetEmail')}
                        </button>
                        <button type="button" onClick={() => { setShowReset(false); setResetMsg(''); }} className="text-sm text-text-muted hover:text-white mt-2 border-none bg-transparent cursor-pointer">{t('backToSignIn')}</button>
                    </form>
                ) : (
                    <>
                        <form onSubmit={handleLogin} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">{t('emailLabel')}</label>
                                <input type="email" required className="input-field" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-center">
                                    <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">{t('passwordLabel')}</label>
                                    <button type="button" onClick={() => { setShowReset(true); setResetEmail(email); }} className="text-[0.75rem] text-cyan-400 hover:underline bg-transparent border-none cursor-pointer">{t('forgotPassword')}</button>
                                </div>
                                <input type="password" required className="input-field" value={password} onChange={e => setPassword(e.target.value)} placeholder="" />
                            </div>
                            {error && <p className="text-accent-red text-sm text-center">{error}</p>}
                            <button type="submit" disabled={loading} className="w-full mt-2 py-3.5 rounded-[24px] font-bold bg-gradient-to-r from-cyan-500 to-cyan-600 text-black shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] disabled:opacity-50 transition-all cursor-pointer border-none font-sans">
                                {loading ? t('signingIn') : t('signInTitle')}
                            </button>
                        </form>

                        <div className="mt-5 pt-4 border-t border-white/5 text-center text-sm text-text-muted">
                            {t('noAccount')} <Link href="/auth/register" className="text-cyan-400 hover:underline">{t('registerHere')}</Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
