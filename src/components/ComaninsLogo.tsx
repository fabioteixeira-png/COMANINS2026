import React from 'react';

interface ComaninsLogoProps {
  className?: string;
  size?: number; // Width size in pixels
  color?: string; // Hex or tailwind color to override default dark blue text/lines
  variant?: 'stacked' | 'horizontal';
  src?: string;
  customLogo?: string;
}

export default function ComaninsLogo({ 
  className = '', 
  size = 240, 
  color = '#003580',
  variant = 'stacked',
  src,
  customLogo
}: ComaninsLogoProps) {
  const activeSrc = src || customLogo || (typeof window !== 'undefined' ? (localStorage.getItem('comanins_header_logo') || localStorage.getItem('comanins_custom_logo') || '') : '');

  if (activeSrc) {
    return (
      <div className={`inline-flex items-center justify-center max-w-full bg-transparent ${className}`}>
        <img 
          src={activeSrc} 
          alt="COMANINS" 
          style={{ 
            maxWidth: size ? `${size}px` : '100%', 
            maxHeight: size ? `${Math.round(size * 0.6)}px` : '100%',
            objectFit: 'contain' 
          }}
          className="max-w-full h-auto object-contain transition-all duration-300 bg-transparent"
        />
      </div>
    );
  }

  if (variant === 'horizontal') {
    const height = Math.round(size * 0.3);
    return (
      <svg 
        viewBox="0 0 800 240" 
        width={size} 
        height={height} 
        className={`${className} transition-all duration-300`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Gauge on left */}
        <circle cx="120" cy="120" r="82" stroke={color} strokeWidth="8" fill="none" />
        <circle cx="120" cy="120" r="78" fill="none" />
        <path d="M 65,120 A 55,55 0 0,1 110,66" stroke="#EAB308" strokeWidth="11" fill="none" />
        <path d="M 110,66 A 55,55 0 0,1 150,76" stroke="#10B981" strokeWidth="11" fill="none" />
        <path d="M 150,76 A 55,55 0 0,1 174,120" stroke="#EF4444" strokeWidth="11" fill="none" />
        <path d="M 66,122 A 55,55 0 0,0 90,158" stroke={color} strokeWidth="11" fill="none" />
        <line x1="120" y1="58" x2="120" y2="64" stroke={color} strokeWidth="3" />
        <line x1="68" y1="120" x2="74" y2="120" stroke={color} strokeWidth="3" />
        <line x1="172" y1="120" x2="166" y2="120" stroke={color} strokeWidth="3" />
        <line x1="120" y1="120" x2="156" y2="72" stroke={color} strokeWidth="5" strokeLinecap="round" />
        <circle cx="120" cy="120" r="10" fill={color} />
        <circle cx="120" cy="120" r="5" fill="#ffffff" />

        <text x="500" y="92" textAnchor="middle" fill={color} fontSize="105" fontWeight="900" style={{ fontFamily: "Impact, 'Arial Black', sans-serif", letterSpacing: '0.04em' }}>COMANINS</text>
        <line x1="220" y1="114" x2="780" y2="114" stroke={color} strokeWidth="5" />
        <text x="500" y="152" textAnchor="middle" fill={color} fontSize="27" fontWeight="900" style={{ fontFamily: "sans-serif", letterSpacing: '0.12em' }}>COMÉRCIO E MANUTENÇÃO</text>
        <text x="500" y="190" textAnchor="middle" fill={color} fontSize="27" fontWeight="900" style={{ fontFamily: "sans-serif", letterSpacing: '0.12em' }}>DE INSTRUMENTOS LTDA.</text>
        <line x1="330" y1="221" x2="420" y2="221" stroke={color} strokeWidth="3.5" />
        <text x="500" y="228" textAnchor="middle" fill={color} fontSize="25" fontWeight="800" style={{ fontFamily: "sans-serif", letterSpacing: '0.22em' }}>1998</text>
        <line x1="580" y1="221" x2="670" y2="221" stroke={color} strokeWidth="3.5" />
      </svg>
    );
  }

  // Default: Stacked Official Brand Logo (Matching uploaded image)
  return (
    <svg 
      viewBox="0 0 500 500" 
      width={size} 
      height={size} 
      className={`${className} transition-all duration-300`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* MANOMETER GAUGE DIAL (Centered at 250, 130) */}
      <circle cx="250" cy="130" r="95" stroke={color} strokeWidth="10" fill="none" />
      <circle cx="250" cy="130" r="90" fill="none" />
      
      {/* Yellow arc */}
      <path d="M 186,130 A 64,64 0 0,1 238,67" stroke="#EAB308" strokeWidth="13" fill="none" />
      {/* Green arc */}
      <path d="M 238,67 A 64,64 0 0,1 285,78" stroke="#10B981" strokeWidth="13" fill="none" />
      {/* Red arc */}
      <path d="M 285,78 A 64,64 0 0,1 313,130" stroke="#EF4444" strokeWidth="13" fill="none" />
      {/* Blue arc */}
      <path d="M 188,132 A 64,64 0 0,0 216,174" stroke={color} strokeWidth="13" fill="none" />

      {/* Ticks */}
      <line x1="250" y1="58" x2="250" y2="65" stroke={color} strokeWidth="3" />
      <line x1="189" y1="130" x2="196" y2="130" stroke={color} strokeWidth="3" />
      <line x1="311" y1="130" x2="304" y2="130" stroke={color} strokeWidth="3" />

      {/* Needle pointing to green section */}
      <line x1="250" y1="130" x2="292" y2="74" stroke={color} strokeWidth="6" strokeLinecap="round" />
      <circle cx="250" cy="130" r="12" fill={color} />
      <circle cx="250" cy="130" r="6" fill="#ffffff" />

      {/* COMANINS BRAND TEXT */}
      <text 
        x="250" 
        y="300" 
        textAnchor="middle" 
        fill={color} 
        fontSize="82" 
        fontWeight="900" 
        style={{ 
          fontFamily: "Impact, 'Arial Black', sans-serif", 
          letterSpacing: '0.04em' 
        }}
      >
        COMANINS
      </text>

      {/* Horizontal Divider Line */}
      <line x1="35" y1="322" x2="465" y2="322" stroke={color} strokeWidth="4.5" />

      {/* Subtitle 1: COMÉRCIO E MANUTENÇÃO */}
      <text 
        x="250" 
        y="360" 
        textAnchor="middle" 
        fill={color} 
        fontSize="24" 
        fontWeight="900" 
        style={{ 
          fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif", 
          letterSpacing: '0.08em' 
        }}
      >
        COMÉRCIO E MANUTENÇÃO
      </text>

      {/* Subtitle 2: DE INSTRUMENTOS LTDA. */}
      <text 
        x="250" 
        y="395" 
        textAnchor="middle" 
        fill={color} 
        fontSize="24" 
        fontWeight="900" 
        style={{ 
          fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif", 
          letterSpacing: '0.08em' 
        }}
      >
        DE INSTRUMENTOS LTDA.
      </text>

      {/* Foundation Year with Lines: — 1998 — */}
      <line x1="120" y1="428" x2="190" y2="428" stroke={color} strokeWidth="3" />
      <text 
        x="250" 
        y="435" 
        textAnchor="middle" 
        fill={color} 
        fontSize="22" 
        fontWeight="800" 
        style={{ 
          fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif", 
          letterSpacing: '0.2em' 
        }}
      >
        1998
      </text>
      <line x1="310" y1="428" x2="380" y2="428" stroke={color} strokeWidth="3" />
    </svg>
  );
}

