interface MapViewProps {
  showRoute?: boolean;
  showTechnician?: boolean;
  techProgress?: number; // 0-1
  height?: string;
  className?: string;
}

export default function MapView({ showRoute = false, showTechnician = false, techProgress = 0.3, height = 'h-64', className = '' }: MapViewProps) {
  const tx = 60 + techProgress * 100;
  const ty = 200 - techProgress * 110;

  return (
    <div className={`relative ${height} ${className} overflow-hidden bg-[#E8EFF7] rounded-2xl`}>
      <svg viewBox="0 0 400 280" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {/* Base map background */}
        <rect width="400" height="280" fill="#EDF2F7" />

        {/* Major roads */}
        <rect x="0" y="120" width="400" height="18" fill="#FFFFFF" opacity="0.9" />
        <rect x="180" y="0" width="18" height="280" fill="#FFFFFF" opacity="0.9" />
        <rect x="0" y="60" width="400" height="10" fill="#FFFFFF" opacity="0.7" />
        <rect x="0" y="200" width="400" height="10" fill="#FFFFFF" opacity="0.7" />
        <rect x="90" y="0" width="10" height="280" fill="#FFFFFF" opacity="0.7" />
        <rect x="300" y="0" width="10" height="280" fill="#FFFFFF" opacity="0.7" />

        {/* Diagonal roads */}
        <line x1="0" y1="0" x2="180" y2="120" stroke="#FFFFFF" strokeWidth="8" opacity="0.6" />
        <line x1="400" y1="0" x2="180" y2="120" stroke="#FFFFFF" strokeWidth="8" opacity="0.6" />
        <line x1="0" y1="280" x2="180" y2="120" stroke="#FFFFFF" strokeWidth="6" opacity="0.5" />

        {/* City blocks */}
        <rect x="100" y="70" width="70" height="40" rx="4" fill="#D1D9E6" opacity="0.6" />
        <rect x="200" y="30" width="90" height="25" rx="4" fill="#D1D9E6" opacity="0.6" />
        <rect x="210" y="140" width="80" height="50" rx="4" fill="#D1D9E6" opacity="0.6" />
        <rect x="20" y="30" width="60" height="25" rx="4" fill="#D1D9E6" opacity="0.5" />
        <rect x="10" y="140" width="70" height="50" rx="4" fill="#D1D9E6" opacity="0.5" />
        <rect x="310" y="70" width="80" height="40" rx="4" fill="#D1D9E6" opacity="0.5" />
        <rect x="310" y="140" width="80" height="50" rx="4" fill="#D1D9E6" opacity="0.5" />
        <rect x="100" y="215" width="70" height="55" rx="4" fill="#D1D9E6" opacity="0.5" />
        <rect x="200" y="220" width="90" height="50" rx="4" fill="#D1D9E6" opacity="0.5" />

        {/* Park area */}
        <rect x="20" y="205" width="65" height="65" rx="8" fill="#C3E6CB" opacity="0.7" />
        <circle cx="52" cy="237" r="18" fill="#86C996" opacity="0.6" />

        {/* Route line */}
        {showRoute && (
          <polyline
            points={`${tx},${ty} ${tx + 20},${ty + 15} ${tx + 40},${ty + 30} 200,129`}
            stroke="#2563EB"
            strokeWidth="3"
            strokeDasharray="8,4"
            fill="none"
            opacity="0.85"
          />
        )}

        {/* Technician marker */}
        {showTechnician && (
          <g transform={`translate(${tx - 16}, ${ty - 28})`}>
            <circle cx="16" cy="16" r="20" fill="#2563EB" opacity="0.15" />
            <circle cx="16" cy="16" r="14" fill="#2563EB" />
            <text x="16" y="21" textAnchor="middle" fill="white" fontSize="13">🛵</text>
          </g>
        )}

        {/* Customer home marker */}
        <g transform="translate(168, 98)">
          <circle cx="16" cy="16" r="22" fill="#DC2626" opacity="0.15" className="marker-pulse" />
          <circle cx="16" cy="16" r="14" fill="#DC2626" />
          <text x="16" y="21" textAnchor="middle" fill="white" fontSize="13">📍</text>
        </g>

        {/* Map label */}
        <text x="10" y="274" fill="#94A3B8" fontSize="10" fontFamily="Inter, sans-serif">Greater Noida West, UP</text>
      </svg>

      {/* Map overlay gradient (bottom fade) */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white/30 to-transparent pointer-events-none" />

      {/* Google Maps watermark style */}
      <div className="absolute bottom-2 right-3 bg-white/80 backdrop-blur-sm rounded px-2 py-0.5 text-[10px] text-gray-500 font-medium">
        © SOS HomeFix Maps
      </div>
    </div>
  );
}
