// Badge  reusable colored pill
const variantClasses = {
    cyan: 'bg-[rgba(0,245,255,0.12)] text-accent-cyan border border-[rgba(0,245,255,0.25)]',
    green: 'bg-[rgba(0,255,157,0.12)] text-accent-green border border-[rgba(0,255,157,0.25)]',
    amber: 'bg-[rgba(255,184,0,0.12)] text-accent-amber border border-[rgba(255,184,0,0.25)]',
    red: 'bg-[rgba(255,59,92,0.12)] text-accent-red border border-[rgba(255,59,92,0.25)]',
    violet: 'bg-[rgba(124,58,237,0.12)] text-[#a78bfa] border border-[rgba(124,58,237,0.25)]',
};

export default function Badge({ variant = 'cyan', children, className = '' }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${variantClasses[variant]} ${className}`}
        >
            {children}
        </span>
    );
}
