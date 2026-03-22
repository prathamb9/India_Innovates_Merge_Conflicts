/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,jsx}',
        './components/**/*.{js,jsx}',
    ],
    theme: {
        extend: {
            colors: {
                'bg-deep': '#030712',
                'bg-surface': '#0d1117',
                'bg-card': '#111827',
                'bg-card-h': '#1a2234',
                'accent-cyan': '#00FFFF',
                'accent-green': '#4ade80',
                'accent-amber': '#fbbf24',
                'accent-red': '#f87171',
                'accent-violet': '#a78bfa',
                'accent-blue': '#3b82f6',
                'text-primary': '#f1f5f9',
                'text-secondary': '#94a3b8',
                'text-muted': '#475569',
            },
            fontFamily: {
                sans: ['Outfit', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            borderRadius: {
                'sm': '6px',
                'md': '12px',
                'lg': '20px',
                'xl': '32px',
            },
            animation: {
                'float': 'float 4s ease-in-out infinite',
                'spin-slow': 'spin-slow 8s linear infinite',
                'pulse-dot': 'pulse-dot 2s infinite',
                'fade-in-up': 'fadeInUp 0.6s ease both',
                'scan': 'scan 3s linear infinite',
            },
            keyframes: {
                float: {
                    '0%,100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-12px)' },
                },
                'pulse-dot': {
                    '0%,100%': { opacity: '1', transform: 'scale(1)' },
                    '50%': { opacity: '0.6', transform: 'scale(1.3)' },
                },
                fadeInUp: {
                    from: { opacity: '0', transform: 'translateY(30px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                scan: {
                    '0%': { top: '0%' },
                    '100%': { top: '100%' },
                },
            },
            backgroundImage: {
                'grid-pattern': 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
            },
            backgroundSize: { 'grid': '28px 28px' },
        },
    },
    plugins: [],
};
