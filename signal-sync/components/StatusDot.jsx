// StatusDot  animated pulsing indicator
const colorMap = {
    green: 'bg-accent-green shadow-[0_0_8px_#00ff9d]',
    red: 'bg-accent-red shadow-[0_0_8px_#ff3b5c]',
    amber: 'bg-accent-amber shadow-[0_0_8px_#ffb800]',
    cyan: 'bg-accent-cyan shadow-[0_0_8px_#00f5ff]',
    gray: 'bg-[#475569]',
};

export default function StatusDot({ color = 'green', className = '' }) {
    return (
        <span
            className={`inline-block w-2 h-2 rounded-full animate-pulse-dot flex-shrink-0 ${colorMap[color]} ${className}`}
        />
    );
}
