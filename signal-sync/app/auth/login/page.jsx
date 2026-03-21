'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    // Email login states
    const [loginMode, setLoginMode] = useState('email'); // 'email', 'aadhaar', 'dl'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // Aadhaar/DL states
    const [documentNumber, setDocumentNumber] = useState('');
    const [role, setRole] = useState('AMBULANCE_DRIVER');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);

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
            
            // Store firebase token in localstorage
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

    async function handleAadhaarRequest(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('http://localhost:8000/api/v1/auth/login/aadhaar/request-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aadhaar_number: documentNumber })
            });
            if (!res.ok) throw new Error('Failed to request OTP');
            setOtpSent(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleAadhaarVerify(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('http://localhost:8000/api/v1/auth/login/aadhaar/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aadhaar_number: documentNumber, otp, role })
            });
            if (!res.ok) throw new Error('Invalid OTP');
            const data = await res.json();
            // Store local JWT
            localStorage.setItem("authToken", data.access_token);
            router.push('/portal');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDLUpload(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('http://localhost:8000/api/v1/auth/login/dl/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dl_number: documentNumber, role })
            });
            if (!res.ok) throw new Error('Failed to upload DL');
            const data = await res.json();
            localStorage.setItem("authToken", data.access_token);
            router.push('/portal');
        } catch (err) {
            setError(err.message);
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
            <div className="glow-blob" style={{ width: 500, height: 500, top: -200, left: -100, opacity: 0.5, background: 'rgba(0,245,255,0.12)' }} />
            <div className="glow-blob" style={{ width: 400, height: 400, bottom: -100, right: -100, opacity: 0.4, background: 'rgba(124,58,237,0.12)' }} />

            <div className="relative z-10 w-full max-w-[480px] mx-4 bg-[rgba(13,17,23,0.92)] backdrop-blur-xl border border-[rgba(124,58,237,0.25)] rounded-[32px] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
                <div className="flex flex-col items-center mb-6">
                    <Link href="/" className="flex items-center gap-2.5 font-extrabold text-2xl mb-3 no-underline text-white">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center text-2xl neon-cyan">⬡</div>
                        <span><span className="text-accent-cyan">Signal</span>Sync</span>
                    </Link>
                    <h2 className="text-xl font-bold mt-1">{showReset ? 'Reset Password' : 'Sign In'}</h2>
                    {!showReset && <p className="text-text-secondary text-sm mt-1 text-center">Access the Green Corridor Dispatcher via multiple docs.</p>}
                </div>

                {showReset ? (
                    <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Email Address</label>
                            <input type="email" required className="input-field" value={resetEmail}
                                onChange={e => setResetEmail(e.target.value)} placeholder="your@email.com" />
                        </div>
                        {resetMsg && <p className={`text-sm text-center ${resetMsg.includes('sent') ? 'text-accent-green' : 'text-accent-red'}`}>{resetMsg}</p>}
                        <button type="submit" disabled={resetLoading} className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-br from-accent-violet to-[#7c3aed] text-white">
                            {resetLoading ? 'Sending…' : 'Send Reset Email'}
                        </button>
                        <button type="button" onClick={() => { setShowReset(false); setResetMsg(''); }} className="text-sm text-text-muted hover:text-white mt-2 border-none bg-transparent cursor-pointer">← Back to Sign In</button>
                    </form>
                ) : (
                    <>
                        <div className="flex bg-black/30 p-1 rounded-xl mb-6">
                            <button onClick={() => { setLoginMode('email'); setError(''); }} className={`flex-1 py-2 text-sm rounded-lg transition-colors ${loginMode==='email' ? 'bg-[#7c3aed] text-white font-bold' : 'text-text-muted hover:text-white'}`}>Email</button>
                            <button onClick={() => { setLoginMode('aadhaar'); setError(''); setOtpSent(false); }} className={`flex-1 py-2 text-sm rounded-lg transition-colors ${loginMode==='aadhaar' ? 'bg-[#7c3aed] text-white font-bold' : 'text-text-muted hover:text-white'}`}>Aadhaar</button>
                            <button onClick={() => { setLoginMode('dl'); setError(''); }} className={`flex-1 py-2 text-sm rounded-lg transition-colors ${loginMode==='dl' ? 'bg-[#7c3aed] text-white font-bold' : 'text-text-muted hover:text-white'}`}>Div. License</button>
                        </div>

                        {loginMode === 'email' && (
                            <form onSubmit={handleLogin} className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Email</label>
                                    <input type="email" required className="input-field" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Password</label>
                                        <button type="button" onClick={() => { setShowReset(true); setResetEmail(email); }} className="text-[0.75rem] text-accent-cyan hover:underline bg-transparent border-none cursor-pointer">Forgot password?</button>
                                    </div>
                                    <input type="password" required className="input-field" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                                </div>
                                {error && <p className="text-accent-red text-sm text-center">{error}</p>}
                                <button type="submit" disabled={loading} className="w-full mt-2 py-3.5 rounded-xl font-bold bg-gradient-to-br from-accent-cyan to-[#0099cc] text-black">
                                    {loading ? 'Signing in…' : 'Sign In'}
                                </button>
                            </form>
                        )}

                        {loginMode === 'aadhaar' && (
                            <form onSubmit={otpSent ? handleAadhaarVerify : handleAadhaarRequest} className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Select Role</label>
                                    <select value={role} onChange={e => setRole(e.target.value)} className="input-field bg-[rgba(20,25,35,0.8)]">
                                        <option value="AMBULANCE_DRIVER">Ambulance Driver</option>
                                        <option value="FIRE_TRUCK_OPERATOR">Fire Truck Operator</option>
                                        <option value="VVIP_OPERATOR">VVIP Operator</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Aadhaar Number</label>
                                    <input type="text" required disabled={otpSent} className="input-field disabled:opacity-50" value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} placeholder="1234 5678 9012" />
                                </div>
                                {otpSent && (
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">OTP (Hint: 123456)</label>
                                        <input type="text" required className="input-field" value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter 6-digit OTP" />
                                    </div>
                                )}
                                {error && <p className="text-accent-red text-sm text-center">{error}</p>}
                                <button type="submit" disabled={loading} className="w-full mt-2 py-3.5 rounded-xl font-bold bg-gradient-to-br from-accent-violet to-[#7c3aed] text-white">
                                    {loading ? 'Processing…' : (otpSent ? 'Verify OTP' : 'Request OTP')}
                                </button>
                            </form>
                        )}

                        {loginMode === 'dl' && (
                            <form onSubmit={handleDLUpload} className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Select Role</label>
                                    <select value={role} onChange={e => setRole(e.target.value)} className="input-field bg-[rgba(20,25,35,0.8)]">
                                        <option value="AMBULANCE_DRIVER">Ambulance Driver</option>
                                        <option value="FIRE_TRUCK_OPERATOR">Fire Truck Operator</option>
                                        <option value="VVIP_OPERATOR">VVIP Operator</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Driving License ID</label>
                                    <input type="text" required className="input-field" value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} placeholder="DL-XXX-XXXX" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[0.78rem] font-semibold text-text-secondary uppercase tracking-wide">Upload DL Image</label>
                                    <input type="file" className="text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[rgba(124,58,237,0.2)] file:text-accent-violet hover:file:bg-[rgba(124,58,237,0.3)]" accept="image/*" />
                                </div>
                                {error && <p className="text-accent-red text-sm text-center">{error}</p>}
                                <button type="submit" disabled={loading} className="w-full mt-2 py-3.5 rounded-xl font-bold bg-gradient-to-br from-accent-cyan to-[#0099cc] text-black">
                                    {loading ? 'Uploading…' : 'Submit for Verification'}
                                </button>
                            </form>
                        )}
                        
                        <div className="mt-5 pt-4 border-t border-white/5 text-center text-sm text-text-muted">
                            No account? <Link href="/auth/register" className="text-accent-cyan hover:underline">Register here</Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
