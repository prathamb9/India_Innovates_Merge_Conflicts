'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { useAuth } from '@/components/AuthProvider';
import { LANGUAGES } from '@/lib/i18n';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

/* ── Visuo-style Navbar ─────────────────────────────────────────────────── */
export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [langOpen, setLangOpen] = useState(false);
    const { lang, setLang, t } = useLanguage();
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

    async function handleLogout() {
        await signOut(auth);
        localStorage.removeItem('authToken');
        router.push('/');
    }

    return (
        <nav style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 40px', height: 64,
            background: scrolled ? 'rgba(18,17,22,0.96)' : 'rgba(18,17,22,0.75)',
            backdropFilter: 'blur(12px)',
            borderBottom: '0.8px solid rgba(255,255,255,0.08)',
            transition: 'background 0.3s ease',
            fontFamily: 'Inter, sans-serif',
        }}>
            <div className="flex items-center gap-10">
                <Link href="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight no-underline group">
                    <img src="/logo.png" alt="SignalSync Logo" style={{ width: 32, height: 32, objectFit: 'contain' }} className="rounded-lg group-hover:scale-105 transition-transform" />
                    <span className="text-white"><span style={{ color: '#735EEF' }}>Signal</span>Sync</span>
                </Link>
            </div>

            {/* Nav links */}
            <ul style={{ display: 'flex', alignItems: 'center', gap: 4, listStyle: 'none', margin: 0, padding: 0 }}>
                {[
                    { href: '/#hero',    label: t('home') },
                    { href: '/#problem', label: t('problemNav') || 'Problem' },
                    { href: '/#pillars', label: t('solutionNav') || 'Solution' },
                    { href: '/#flows',   label: t('flowsNav') || 'User Flows' },
                    { href: '/#faq',     label: 'Q&A' },
                ].map(({ href, label }) => (
                    <li key={href}>
                        <a href={href} style={{ padding: '6px 14px', fontSize: '0.88rem', color: '#C3C3C3', borderRadius: 8, textDecoration: 'none', transition: 'color 0.2s', display: 'block' }}
                           onMouseEnter={e => e.target.style.color = '#fff'}
                           onMouseLeave={e => e.target.style.color = '#C3C3C3'}>
                            {label}
                        </a>
                    </li>
                ))}
            </ul>

            {/* Right controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

                {/* Language picker */}
                <div style={{ position: 'relative' }}>
                    <button onClick={() => setLangOpen(o => !o)} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 9999,
                        border: '0.8px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.04)',
                        color: '#C3C3C3', fontSize: '0.8rem', fontWeight: 500,
                        cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}>
                        {currentLang.native} <span style={{ opacity: 0.5, fontSize: '0.65rem' }}>▾</span>
                    </button>
                    {langOpen && (
                        <div style={{
                            position: 'absolute', top: '110%', right: 0, zIndex: 300,
                            background: '#1C1825', border: '0.8px solid rgba(255,255,255,0.12)',
                            borderRadius: 16, padding: 6, minWidth: 140,
                            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
                        }}>
                            {LANGUAGES.map(l => (
                                <button key={l.code} onClick={() => { setLang(l.code); setLangOpen(false); }} style={{
                                    display: 'block', width: '100%', textAlign: 'left',
                                    padding: '8px 12px', borderRadius: 10,
                                    background: l.code === lang ? 'rgba(115,94,239,0.12)' : 'transparent',
                                    color: l.code === lang ? '#735EEF' : '#C3C3C3',
                                    fontSize: '0.85rem', fontWeight: 500, border: 'none',
                                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                                }}>
                                    {l.native}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Dashboard ghost link */}
                <Link href="/dashboard" className="visuo-btn-ghost" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
                    {t('dashboard')}
                </Link>

                {user ? (
                    <>
                        <Link href="/profile" style={{ padding: '8px 18px', borderRadius: 9999, fontSize: '0.85rem', fontWeight: 500, background: 'rgba(115,94,239,0.1)', color: '#735EEF', border: '0.8px solid rgba(115,94,239,0.3)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            Profile
                        </Link>
                        <button onClick={handleLogout} style={{ padding: '8px 18px', borderRadius: 9999, fontSize: '0.85rem', fontWeight: 500, background: 'transparent', color: '#C3C3C3', border: '0.8px solid rgba(255,255,255,0.12)', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <Link href="/auth/login" style={{ padding: '8px 18px', borderRadius: 9999, fontSize: '0.85rem', fontWeight: 500, background: 'transparent', color: '#C3C3C3', border: '0.8px solid rgba(255,255,255,0.12)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                            Sign In
                        </Link>
                        <Link href="/auth/register" className="visuo-btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
                            Sign Up
                        </Link>
                    </>
                )}

                {/* Green Corridor pill — kept green for functional significance */}
                <Link href="/portal" style={{ padding: '8px 18px', borderRadius: 9999, fontSize: '0.85rem', fontWeight: 600, background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '0.8px solid rgba(74,222,128,0.3)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    🟢 {t('greenCorridor') || 'Green Corridor'}
                </Link>
            </div>
        </nav>
    );
}
