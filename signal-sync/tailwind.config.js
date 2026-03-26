/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,jsx}',
        './components/**/*.{js,jsx}',
    ],
    theme: {
        extend: {
            colors: {
                /* ── Visuo backgrounds ── */
                'bg-deep':    '#121116',
                'bg-surface': '#1C1825',
                'bg-card':    '#1C1825',
                'bg-inner':   '#02071A',
                'bg-card-h':  '#221E30',
                /* ── Accents ── */
                'accent-purple': '#735EEF',
                'accent-blue':   '#4D7CFF',
                'accent-cyan':   '#67e8f9',
                'accent-green':  '#4ade80',
                'accent-amber':  '#fbbf24',
                'accent-red':    '#f87171',
                'accent-violet': '#a78bfa',
                /* ── Text ── */
                'text-primary':   '#FFFFFF',
                'text-secondary': '#C3C3C3',
                'text-muted':     '#7B7B8F',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            borderRadius: {
                'sm':   '8px',
                'md':   '12px',
                'lg':   '16px',
                'xl':   '24px',
                '2xl':  '32px',
                'pill': '9999px',
            },
            animation: {
                'float':        'float 4s ease-in-out infinite',
                'spin-slow':    'spin-slow 8s linear infinite',
                'pulse-dot':    'pulse-dot 2s infinite',
                'fade-in-up':   'fadeInUp 0.6s ease both',
                'scan':         'scan 3s linear infinite',
            },
            keyframes: {
                float: {
                    '0%,100%': { transform: 'translateY(0px)' },
                    '50%':     { transform: 'translateY(-12px)' },
                },
                'pulse-dot': {
                    '0%,100%': { opacity: '1', transform: 'scale(1)' },
                    '50%':     { opacity: '0.6', transform: 'scale(1.3)' },
                },
                fadeInUp: {
                    from: { opacity: '0', transform: 'translateY(24px)' },
                    to:   { opacity: '1', transform: 'translateY(0)' },
                },
                scan: {
                    '0%':   { top: '0%' },
                    '100%': { top: '100%' },
                },
            },
            backgroundImage: {
                'visuo-glow': 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(115,94,239,0.22) 0%, transparent 70%)',
            },
        },
    },
    plugins: [],
};
