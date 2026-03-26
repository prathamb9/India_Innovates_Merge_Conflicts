'use client';
import { useState, useEffect } from 'react';
import { LANGUAGES } from '@/lib/i18n';
import { useLanguage } from '@/components/LanguageProvider';

export default function LanguagePicker() {
    const { setLang, ready } = useLanguage();
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (!ready) return;
        const stored = localStorage.getItem('signalsync_lang');
        if (!stored) setShow(true);
    }, [ready]);

    if (!show) return null;

    function pick(code) {
        setLang(code);
        setShow(false);
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(3,7,18,0.97)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 36,
            fontFamily: 'Outfit, sans-serif',
        }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#0c3547', border: '1px solid rgba(34,211,238,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22d3ee', fontSize: '1.1rem' }}>🚥</div>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9' }}>
                    <span style={{ color: '#22d3ee' }}>Signal</span>Sync
                </span>
            </div>

            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 10 }}>
                    Choose your language
                </div>
                <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
                    अपनी भाषा चुनें · மொழியை தேர்ந்தெடு · భాష ఎంచుకోండి · ভাষা বেছে নিন
                </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', maxWidth: 500 }}>
                {LANGUAGES.map(l => (
                    <button key={l.code} onClick={() => pick(l.code)}
                        style={{
                            padding: '16px 32px', borderRadius: 12,
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.03)',
                            color: '#f1f5f9', fontSize: '1.05rem', fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'Outfit, sans-serif',
                            transition: 'all 0.18s',
                            minWidth: 130,
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(34,211,238,0.08)';
                            e.currentTarget.style.borderColor = 'rgba(34,211,238,0.35)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                        }}
                    >
                        {l.native}
                    </button>
                ))}
            </div>
        </div>
    );
}
