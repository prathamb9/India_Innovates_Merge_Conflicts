'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { useAuth } from '@/components/AuthProvider';
import { LANGUAGES } from '@/lib/i18n';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [langOpen, setLangOpen] = useState(false);
    const { lang, setLang, t } = useLanguage();
    const { user, logout } = useAuth();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-3.5 border-b border-white/5 backdrop-blur-xl transition-all duration-300 ${scrolled ? 'bg-bg-deep/95' : 'bg-bg-deep/80'}`}>
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 text-white font-extrabold text-xl tracking-tight no-underline">
                <div className="w-9 h-9 rounded-[6px] bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan text-lg">⬡</div>
                <span><span className="text-accent-cyan">Signal</span>Sync</span>
            </Link>

            {/* Nav links */}
            <ul className="hidden md:flex items-center gap-1 list-none">
                {[
                    { href: '/#hero', label: t('home') },
                    { href: '/#problem', label: t('problemNav') || 'Problem' },
                    { href: '/#pillars', label: t('solutionNav') || 'Solution' },
                    { href: '/#flows', label: t('flowsNav') || 'User Flows' },
                    { href: '/#faq', label: 'Q&A' },
                ].map(({ href, label }) => (
                    <li key={href}>
                        <a href={href} className="px-3.5 py-2 text-sm font-medium text-text-secondary rounded-[6px] hover:text-text-primary hover:bg-white/5 transition-all duration-200 no-underline">
                            {label}
                        </a>
                    </li>
                ))}
            </ul>

            {/* Right: Language switcher + CTAs */}
            <div className="flex items-center gap-2.5">
                {/* Language switcher dropdown */}
                <div style={{ position: 'relative' }}>
                    <button onClick={() => setLangOpen(o => !o)} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.04)',
                        color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                    }}>
                        {currentLang.native} <span style={{ opacity: 0.5, fontSize: '0.65rem' }}>▾</span>
                    </button>
                    {langOpen && (
                        <div style={{
                            position: 'absolute', top: '110%', right: 0, zIndex: 300,
                            background: '#111827', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 10, padding: 6, minWidth: 140,
                            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                        }}>
                            {LANGUAGES.map(l => (
                                <button key={l.code} onClick={() => { setLang(l.code); setLangOpen(false); }} style={{
                                    display: 'block', width: '100%', textAlign: 'left',
                                    padding: '8px 12px', borderRadius: 7,
                                    background: l.code === lang ? 'rgba(0,255,255,0.1)' : 'transparent',
                                    color: l.code === lang ? '#00FFFF' : '#94a3b8',
                                    fontSize: '0.85rem', fontWeight: 500, border: 'none',
                                    cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                                }}>
                                    {l.native}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <Link href="/dashboard" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white/5 text-text-primary border border-white/5 hover:bg-white/10 transition-all no-underline">
                    {t('dashboard')}
                </Link>
                <Link href="/portal" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-accent-green hover:bg-accent-green/80 text-black transition-all no-underline">
                    🟢 {t('greenCorridor') || 'Green Corridor'}
                </Link>

                {/* Auth buttons */}
                {user ? (
                    <button onClick={logout} className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-[rgba(255,59,92,0.15)] text-accent-red border border-accent-red/30 font-sans cursor-pointer transition-all">
                        Logout
                    </button>
                ) : (
                    <>
                        <Link href="/auth/login" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white/5 text-text-primary border border-white/5 hover:bg-white/10 transition-all no-underline">
                            Sign In
                        </Link>
                        <Link href="/auth/register" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-accent-cyan hover:bg-accent-cyan/80 text-black transition-all no-underline">
                            Sign Up
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
}
