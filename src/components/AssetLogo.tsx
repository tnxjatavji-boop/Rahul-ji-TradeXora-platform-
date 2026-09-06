import React from 'react';

interface AssetLogoProps {
  symbol: string;
  name?: string;
  className?: string;
  size?: number;
}

// Premium modern badge for all assets
interface PremiumBadgeProps {
  size: number;
  className?: string;
  gradientFrom?: string;
  gradientTo?: string;
  bgColor?: string;
  children: React.ReactNode;
}

const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  size,
  className = '',
  gradientFrom,
  gradientTo,
  bgColor = '#1E293B',
  children
}) => {
  const bgStyle = gradientFrom && gradientTo 
    ? { backgroundImage: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }
    : { backgroundColor: bgColor };

  return (
    <div
      className={`relative rounded-full flex items-center justify-center shrink-0 select-none overflow-hidden shadow-sm border border-white/10 ${className}`}
      style={{
        width: size,
        height: size,
        ...bgStyle,
        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.05)'
      }}
    >
      <div className="flex items-center justify-center w-full h-full p-1 relative z-10">
        {children}
      </div>
      {/* Subtle shine effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none" />
    </div>
  );
};

// Dedicated Custom Icon Badge for user-specified high-fidelity asset logos
interface CustomIconBadgeProps {
  size: number;
  localSrc: string;
  remoteSrc: string;
  alt: string;
  className?: string;
  bg?: string;
}

const CustomIconBadge: React.FC<CustomIconBadgeProps> = ({
  size,
  localSrc,
  remoteSrc,
  alt,
  className = '',
  bg = '#FFFFFF',
}) => {
  const [src, setSrc] = React.useState(localSrc);
  const [failed, setFailed] = React.useState(false);

  return (
    <div
      className={`relative rounded-full flex items-center justify-center shrink-0 select-none overflow-hidden border border-slate-700/30 shadow-xs ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
      }}
    >
      {!failed ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover rounded-full"
          referrerPolicy="no-referrer"
          loading="eager"
          onError={() => {
            if (src !== remoteSrc) {
              setSrc(remoteSrc);
            } else {
              setFailed(true);
            }
          }}
        />
      ) : (
        <span className="text-[10px] font-black text-slate-800 uppercase">
          {alt.slice(0, 4)}
        </span>
      )}
    </div>
  );
};

// Exact user-provided icons with local bundled assets and remote fallbacks
const CUSTOM_ASSET_LOGOS: Record<string, { local: string; remote: string; bg: string }> = {
  // 1. Bitcoin
  'BTC': { local: '/assets/logos/btc.png', remote: 'https://files.catbox.moe/idrymu.png', bg: '#FFFFFF' },
  // 2. Binance
  'BNB': { local: '/assets/logos/bnb.jpeg', remote: 'https://files.catbox.moe/c6waze.jpeg', bg: '#0E0E0E' },
  // 3. AMD
  'AMD': { local: '/assets/logos/amd.png', remote: 'https://files.catbox.moe/fjusqc.png', bg: '#FFFFFF' },
  // 4. Meta
  'META': { local: '/assets/logos/meta.jpeg', remote: 'https://files.catbox.moe/tyt59l.jpeg', bg: '#FFFFFF' },
  // 5. PayPal
  'PYPL': { local: '/assets/logos/pypl.png', remote: 'https://files.catbox.moe/hqnj3p.png', bg: '#FFFFFF' },
  // 6. TRX Coin / TRON
  'TRX': { local: '/assets/logos/trx.jpeg', remote: 'https://files.catbox.moe/ohugav.jpeg', bg: '#FFFFFF' },
  // 7. Ton coin / Toncoin
  'TON': { local: '/assets/logos/ton.jpeg', remote: 'https://files.catbox.moe/b2vvkt.jpeg', bg: '#FFFFFF' },
  // 8. Pepe coin
  'PEPE': { local: '/assets/logos/pepe.jpeg', remote: 'https://files.catbox.moe/o8i13w.jpeg', bg: '#FFFFFF' },
  // 9. Alibaba
  'BABA': { local: '/assets/logos/baba.png', remote: 'https://files.catbox.moe/xb79fm.png', bg: '#FFFFFF' },
  // 10. Coca Cola
  'KO': { local: '/assets/logos/ko.png', remote: 'https://files.catbox.moe/9u1gzz.png', bg: '#FFFFFF' },
  // 11. Nvidia
  'NVDA': { local: '/assets/logos/nvda.png', remote: 'https://files.catbox.moe/kntv0y.png', bg: '#77B900' },
  // 12. Avalanche
  'AVAX': { local: '/assets/logos/avax.jpeg', remote: 'https://files.catbox.moe/se41l1.jpeg', bg: '#020001' },
};

const matchCustomLogo = (s: string, n: string) => {
  if (s === 'BTC' || s.startsWith('BTC') || n.includes('bitcoin')) return CUSTOM_ASSET_LOGOS['BTC'];
  if (s === 'BNB' || s.startsWith('BNB') || n.includes('binance')) return CUSTOM_ASSET_LOGOS['BNB'];
  if (s === 'AMD' || n.includes('amd')) return CUSTOM_ASSET_LOGOS['AMD'];
  if (s === 'META' || n.includes('meta') || n.includes('facebook')) return CUSTOM_ASSET_LOGOS['META'];
  if (s === 'PYPL' || s === 'PAYPAL' || n.includes('paypal')) return CUSTOM_ASSET_LOGOS['PYPL'];
  if (s === 'TRX' || n.includes('tron') || n.includes('trx')) return CUSTOM_ASSET_LOGOS['TRX'];
  if (s === 'TON' || n.includes('toncoin') || n.includes('ton')) return CUSTOM_ASSET_LOGOS['TON'];
  if (s === 'PEPE' || n.includes('pepe')) return CUSTOM_ASSET_LOGOS['PEPE'];
  if (s === 'BABA' || n.includes('alibaba')) return CUSTOM_ASSET_LOGOS['BABA'];
  if (s === 'KO' || n.includes('coca') || n.includes('coke')) return CUSTOM_ASSET_LOGOS['KO'];
  if (s === 'NVDA' || n.includes('nvidia')) return CUSTOM_ASSET_LOGOS['NVDA'];
  if (s === 'AVAX' || s.startsWith('AVAX') || n.includes('avalanche')) return CUSTOM_ASSET_LOGOS['AVAX'];
  return null;
};

export const AssetLogo: React.FC<AssetLogoProps> = ({ symbol, name = '', className = '', size = 32 }) => {
  const s = (symbol || '').toUpperCase().trim();
  const n = (name || '').toLowerCase().trim();

  // Check custom user-provided icons first
  const customConfig = matchCustomLogo(s, n);
  if (customConfig) {
    return (
      <CustomIconBadge
        size={size}
        localSrc={customConfig.local}
        remoteSrc={customConfig.remote}
        alt={symbol || name}
        className={className}
        bg={customConfig.bg}
      />
    );
  }

  // ==========================================
  // 1. CRYPTOCURRENCIES (Clean Normal Logos)
  // ==========================================

  // Bitcoin (BTC)
  if (s === 'BTC' || n.includes('bitcoin')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#F7931A" gradientTo="#D87B11">
        <svg viewBox="0 0 32 32" className="w-[62%] h-[62%] fill-white">
          <path d="M23.189 14.02c0.314-2.096-1.283-3.223-3.465-3.975l0.708-2.84-1.728-0.43-0.69 2.765c-0.454-0.114-0.922-0.221-1.387-0.326l0.695-2.783-1.728-0.431-0.709 2.839c-0.376-0.086-0.744-0.17-1.104-0.26l0.002-0.007-2.384-0.595-0.46 1.846s1.283 0.294 1.256 0.312c0.7 0.175 0.826 0.638 0.805 1.006l-0.806 3.235c0.048 0.012 0.111 0.03 0.181 0.057l-0.185-0.046-1.13 4.532c-0.086 0.212-0.303 0.531-0.793 0.41 0.018 0.025-1.256-0.313-1.256-0.313l-0.858 1.978 2.25 0.561c0.418 0.105 0.828 0.214 1.232 0.318l-0.716 2.873 1.727 0.431 0.708-2.84c0.472 0.128 0.93 0.246 1.378 0.357l-0.705 2.828 1.728 0.431 0.716-2.869c2.948 0.558 5.164 0.333 6.097-2.333 0.752-2.146-0.037-3.384-1.588-4.192 1.13-0.26 1.98-1.003 2.208-2.538zM18.847 20.916c-0.535 2.146-4.152 0.986-5.321 0.695l0.95-3.808c1.17 0.292 4.933 0.87 4.371 3.113zm0.533-5.698c-0.488 1.954-3.499 0.962-4.473 0.719l0.86-3.453c0.974 0.243 4.128 0.697 3.613 2.734z" />
        </svg>
      </PremiumBadge>
    );
  }

  // Ethereum (ETH)
  if (s === 'ETH' || n.includes('ethereum')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#627EEA" gradientTo="#4863C9">
        <svg viewBox="0 0 32 32" className="w-[60%] h-[60%]">
          <path d="M16 3L8 16.2L16 21L24 16.2L16 3Z" fill="#FFFFFF" fillOpacity="0.95" />
          <path d="M16 22.3L8 17.5L16 29L24 17.5L16 22.3Z" fill="#E0E7FF" fillOpacity="0.8" />
          <path d="M16 3V21L24 16.2L16 3Z" fill="#C7D2FE" />
          <path d="M16 22.3V29L24 17.5L16 22.3Z" fill="#A5B4FC" />
        </svg>
      </PremiumBadge>
    );
  }

  // Solana (SOL)
  if (s === 'SOL' || n.includes('solana')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#2B2E36" gradientTo="#14151A">
        <svg viewBox="0 0 32 32" className="w-[66%] h-[66%]">
          <path d="M6 8.5h16l4-4H10L6 8.5z" fill="url(#solNormG1)" />
          <path d="M6 27.5h16l4-4H10L6 27.5z" fill="url(#solNormG2)" />
          <path d="M10 18h16l-4-4H6l4 4z" fill="url(#solNormG3)" />
          <defs>
            <linearGradient id="solNormG1" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00FFA3" />
              <stop offset="100%" stopColor="#00D2FF" />
            </linearGradient>
            <linearGradient id="solNormG2" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#DC1FFF" />
              <stop offset="100%" stopColor="#7E22CE" />
            </linearGradient>
            <linearGradient id="solNormG3" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00E0FF" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
        </svg>
      </PremiumBadge>
    );
  }

  // Binance Coin (BNB)
  if (s === 'BNB' || n.includes('binance')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#F3BA2F" gradientTo="#DDA01B">
        <svg viewBox="0 0 32 32" className="w-[62%] h-[62%] fill-[#1E2026]">
          <path d="M16 4.5L11.5 9L16 13.5L20.5 9L16 4.5ZM16 18.5L11.5 23L16 27.5L20.5 23L16 18.5ZM7.5 13L3 17.5L7.5 22L12 17.5L7.5 13ZM24.5 13L20 17.5L24.5 22L29 17.5L24.5 13ZM16 14.5L13 17.5L16 20.5L19 17.5L16 14.5Z" />
        </svg>
      </PremiumBadge>
    );
  }

  // Ripple (XRP)
  if (s === 'XRP' || n.includes('ripple')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#343A40" gradientTo="#111417">
        <svg viewBox="0 0 32 32" className="w-[64%] h-[64%] fill-white">
          <path d="M26.2 7h2.8l-8.2 8.1c-2.7 2.6-7 2.6-9.6 0L3 7h2.8l6.7 6.6c1.9 1.8 4.9 1.8 6.8 0L26.2 7zM5.8 25H3l8.2-8.1c2.7-2.6 7-2.6 9.6 0L29 25h-2.8l-6.7-6.6c-1.9-1.8-4.9-1.8-6.8 0L5.8 25z" />
        </svg>
      </PremiumBadge>
    );
  }

  // Dogecoin (DOGE)
  if (s === 'DOGE' || n.includes('doge')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#E0C23E" gradientTo="#A88E28">
        <span className="text-[15px] font-black font-serif text-white tracking-tighter">Ð</span>
      </PremiumBadge>
    );
  }

  // TON
  if (s === 'TON' || n.includes('toncoin') || n.includes('ton')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#00B4FF" gradientTo="#007AC0">
        <svg viewBox="0 0 32 32" className="w-[62%] h-[62%] fill-white">
          <path d="M16 4.5L5 11L16 27.5L27 11L16 4.5ZM7.8 11.5L16 6.8L24.2 11.5L16 23.8L7.8 11.5Z" />
          <path d="M16 8L10 12L16 21L22 12L16 8Z" fillOpacity="0.6" />
        </svg>
      </PremiumBadge>
    );
  }

  // Shiba Inu (SHIB)
  if (s === 'SHIB' || n.includes('shiba')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#FFBA3D" gradientTo="#E58F00">
        <span className="text-[10px] font-black text-white">SHIB</span>
      </PremiumBadge>
    );
  }

  // Pepe (PEPE)
  if (s === 'PEPE' || n.includes('pepe')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#55B24E" gradientTo="#357A2E">
        <span className="text-[10px] font-black text-white">PEPE</span>
      </PremiumBadge>
    );
  }

  // Polygon (POL / MATIC)
  if (s === 'POL' || s === 'MATIC' || n.includes('polygon')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#9D5EFF" gradientTo="#6732C1">
        <svg viewBox="0 0 32 32" className="w-[62%] h-[62%] fill-white">
          <path d="M21.5 12.5c-1.1 0-2.1.6-2.6 1.6l-2.9 5.3-2-3.6c-.5-1-1.5-1.6-2.6-1.6h-.9l3.5 6.3c.5 1 1.5 1.6 2.6 1.6s2.1-.6 2.6-1.6l3-5.3 2 3.6c.5 1 1.5 1.6 2.6 1.6h.9l-3.5-6.3c-.5-1-1.5-1.6-2.7-1.6z" />
          <path d="M10.5 19.5c1.1 0 2.1-.6 2.6-1.6l2.9-5.3 2 3.6c.5 1 1.5 1.6 2.6 1.6h.9l-3.5-6.3c-.5-1-1.5-1.6-2.6-1.6s-2.1.6-2.6 1.6l-3 5.3-2-3.6c-.5-1-1.5-1.6-2.6-1.6h-.9l3.5 6.3c.5 1 1.5 1.6 2.7 1.6z" opacity="0.85" />
        </svg>
      </PremiumBadge>
    );
  }

  // Chainlink (LINK)
  if (s === 'LINK' || n.includes('chainlink')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#4A70ED" gradientTo="#2945A6">
        <svg viewBox="0 0 32 32" className="w-[62%] h-[62%] fill-white">
          <path d="M16 3.5l-9 5.2v10.4l9 5.2 9-5.2V8.7L16 3.5zm6.5 14.1l-6.5 3.8-6.5-3.8v-7.5l6.5-3.8 6.5 3.8v7.5z" />
        </svg>
      </PremiumBadge>
    );
  }

  // Litecoin (LTC)
  if (s === 'LTC' || n.includes('litecoin')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#4574C2" gradientTo="#26467A">
        <span className="text-[15px] font-black font-serif text-white">Ł</span>
      </PremiumBadge>
    );
  }

  // Polkadot (DOT)
  if (s === 'DOT' || n.includes('polkadot')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#FF1A96" gradientTo="#B80062">
        <div className="flex flex-col items-center gap-0.5">
          <span className="w-2 h-2 rounded-full bg-white" />
          <div className="flex gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
          </div>
        </div>
      </PremiumBadge>
    );
  }

  // Tron (TRX)
  if (s === 'TRX' || n.includes('tron')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#FF1A43" gradientTo="#C2001F">
        <svg viewBox="0 0 32 32" className="w-[62%] h-[62%] fill-white">
          <path d="M4 6.5l24 2.5-16 19.5-8-22zM23.5 10l-16-1.5 10.5 13 5.5-11.5z" />
        </svg>
      </PremiumBadge>
    );
  }

  // Cardano (ADA)
  if (s === 'ADA' || n.includes('cardano')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#0047E0" gradientTo="#00247D">
        <span className="text-[14px] font-black text-white">₳</span>
      </PremiumBadge>
    );
  }

  // Avalanche (AVAX)
  if (s === 'AVAX' || n.includes('avalanche')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#FF595A" gradientTo="#C43132">
        <svg viewBox="0 0 32 32" className="w-[62%] h-[62%] fill-white">
          <path d="M19.5 7l8.5 15h-5.5l-3-5.5L19.5 7zm-7 0l7 12.5h-5l-2-3.5L10 20H4.5L12.5 7z" />
        </svg>
      </PremiumBadge>
    );
  }

  // Near (NEAR)
  if (s === 'NEAR' || n.includes('near')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#222222" gradientTo="#000000">
        <span className="text-[11px] font-black text-white">NEAR</span>
      </PremiumBadge>
    );
  }

  // Sui (SUI)
  if (s === 'SUI' || n.includes('sui')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#6BB5FF" gradientTo="#2A87ED">
        <span className="text-[10px] font-black text-white">SUI</span>
      </PremiumBadge>
    );
  }

  // Aptos (APT)
  if (s === 'APT' || n.includes('aptos')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#383D45" gradientTo="#131518">
        <span className="text-[11px] font-black text-emerald-400">APT</span>
      </PremiumBadge>
    );
  }

  // Uniswap (UNI)
  if (s === 'UNI' || n.includes('uniswap')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#FF3399" gradientTo="#D60066">
        <span className="text-[10px] font-black text-white">UNI</span>
      </PremiumBadge>
    );
  }

  // Cosmos (ATOM)
  if (s === 'ATOM' || n.includes('cosmos')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#424666" gradientTo="#1F2131">
        <span className="text-[9px] font-black text-white">ATOM</span>
      </PremiumBadge>
    );
  }

  // ==========================================
  // 2. STOCKS & EQUITIES (Clean Normal Logos)
  // ==========================================

  // Apple (AAPL)
  if (s === 'AAPL' || n.includes('apple')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#222222" gradientTo="#000000">
        <svg viewBox="0 0 32 32" className="w-[62%] h-[62%] fill-white">
          <path d="M22.5 17.8c0-3.3 2.7-4.9 2.8-5-1.5-2.2-3.9-2.5-4.7-2.6-2-.2-3.9 1.2-4.9 1.2-1 0-2.6-1.1-4.2-1.1-2.2 0-4.2 1.3-5.3 3.2-2.3 4-0.6 9.9 1.6 13.1 1.1 1.6 2.4 3.3 4.1 3.2 1.7-.1 2.3-1.1 4.3-1.1 1.9 0 2.5 1.1 4.3 1.1 1.8 0 2.9-1.6 4-3.1 1.3-1.8 1.8-3.6 1.8-3.7-.1 0-3.8-1.5-3.8-5zm-3.6-9.8c.9-1.1 1.5-2.6 1.3-4.1-1.3.1-2.8.9-3.7 1.9-.8.9-1.5 2.4-1.3 3.9 1.4.1 2.8-.7 3.7-1.7z" />
        </svg>
      </PremiumBadge>
    );
  }

  // Tesla (TSLA)
  if (s === 'TSLA' || n.includes('tesla')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#FF383F" gradientTo="#BF171C">
        <span className="text-[16px] font-black font-serif text-white">T</span>
      </PremiumBadge>
    );
  }

  // Nvidia (NVDA)
  if (s === 'NVDA' || n.includes('nvidia')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#8FDE00" gradientTo="#5A8D00">
        <span className="text-[10.5px] font-black font-mono text-white tracking-tighter">NVDA</span>
      </PremiumBadge>
    );
  }

  // Microsoft (MSFT)
  if (s === 'MSFT' || n.includes('microsoft')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#334155" gradientTo="#0F172A">
        <div className="grid grid-cols-2 gap-0.5 w-[56%] h-[56%]">
          <div className="bg-[#F25022] rounded-[1px]" />
          <div className="bg-[#7FBA00] rounded-[1px]" />
          <div className="bg-[#00A4EF] rounded-[1px]" />
          <div className="bg-[#FFB900] rounded-[1px]" />
        </div>
      </PremiumBadge>
    );
  }

  // Amazon (AMZN)
  if (s === 'AMZN' || n.includes('amazon')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#374A61" gradientTo="#121921">
        <span className="text-[14px] font-black text-[#FF9900]">a</span>
      </PremiumBadge>
    );
  }

  // Google (GOOGL / GOOG)
  if (s === 'GOOGL' || s === 'GOOG' || n.includes('google') || n.includes('alphabet')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#FFFFFF" gradientTo="#E2E8F0">
        <span className="text-[15px] font-black text-[#4285F4]">G</span>
      </PremiumBadge>
    );
  }

  // Meta (META)
  if (s === 'META' || n.includes('meta') || n.includes('facebook')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#0866FF" gradientTo="#0046B8">
        <span className="text-[10px] font-black text-white">META</span>
      </PremiumBadge>
    );
  }

  // Internet Computer (ICP)
  if (s === 'ICP' || n.includes('internet computer')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#29ABE2" gradientTo="#1A5B8C">
        <span className="text-[10.5px] font-black text-white tracking-tighter">ICP</span>
      </PremiumBadge>
    );
  }

  // Netflix (NFLX)
  if (s === 'NFLX' || n.includes('netflix')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#2B2B2B" gradientTo="#000000">
        <span className="text-[16px] font-black font-serif text-[#E50914]">N</span>
      </PremiumBadge>
    );
  }

  // AMD
  if (s === 'AMD' || n.includes('amd')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#FF333B" gradientTo="#B81118">
        <span className="text-[11px] font-black text-white tracking-tighter">AMD</span>
      </PremiumBadge>
    );
  }

  // Intel (INTC)
  if (s === 'INTC' || n.includes('intel')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#008BF0" gradientTo="#005596">
        <span className="text-[11px] font-black text-white font-mono">intel</span>
      </PremiumBadge>
    );
  }

  // Alibaba (BABA)
  if (s === 'BABA' || n.includes('alibaba')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#FF8533" gradientTo="#CC4D00">
        <span className="text-[11px] font-black text-white">BABA</span>
      </PremiumBadge>
    );
  }

  // Coca-Cola (KO)
  if (s === 'KO' || n.includes('coca') || n.includes('coke')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#FF2B2B" gradientTo="#C20000">
        <span className="text-[12px] font-black text-white italic font-serif">Ko</span>
      </PremiumBadge>
    );
  }

  // Visa (V)
  if (s === 'V' || n.includes('visa')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#272E9C" gradientTo="#101347">
        <span className="text-[11px] font-black text-[#FAB600] italic">VISA</span>
      </PremiumBadge>
    );
  }

  // Mastercard (MA)
  if (s === 'MA' || n.includes('mastercard')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#1A1A1A" gradientTo="#000000">
        <div className="flex items-center -space-x-1.5">
          <div className="w-3 h-3 rounded-full bg-[#EB001B]" />
          <div className="w-3 h-3 rounded-full bg-[#F79E1B]/90" />
        </div>
      </PremiumBadge>
    );
  }

  // ==========================================
  // 3. COMMODITIES & METALS (Clean Normal Badges)
  // ==========================================

  // Gold (XAU / Gold)
  if (s === 'XAU' || s === 'XAUEUR' || n.includes('gold')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#EBC242" gradientTo="#AA8A2A">
        <span className="text-[11px] font-black text-amber-950 tracking-tighter">AU</span>
      </PremiumBadge>
    );
  }

  // Silver (XAG / Silver)
  if (s === 'XAG' || s === 'XAGEUR' || n.includes('silver')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#CBD5E1" gradientTo="#64748B">
        <span className="text-[11px] font-black text-slate-900 tracking-tighter">AG</span>
      </PremiumBadge>
    );
  }

  // Platinum (XPT)
  if (s === 'XPT' || n.includes('platinum')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#94A3B8" gradientTo="#475569">
        <span className="text-[11px] font-black text-white tracking-tighter">PT</span>
      </PremiumBadge>
    );
  }

  // Crude Oil (BRENT / WTI)
  if (s === 'BRENT' || s === 'WTI' || n.includes('oil') || n.includes('crude')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#334155" gradientTo="#0F172A">
        <span className="text-[11px] font-black text-white">OIL</span>
      </PremiumBadge>
    );
  }

  // Natural Gas (NG)
  if (s === 'NG' || n.includes('gas') || n.includes('natural gas')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#0EA5E9" gradientTo="#0369A1">
        <span className="text-[11px] font-black text-white">GAS</span>
      </PremiumBadge>
    );
  }

  // ==========================================
  // 4. INDICES (Clean Normal Badges)
  // ==========================================

  // Nasdaq 100 (NDX / US100)
  if (s === 'NDX' || s === 'US100' || n.includes('nasdaq')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#0EA5E9" gradientTo="#0369A1">
        <span className="text-[10px] font-black text-white tracking-tight font-mono">NDX</span>
      </PremiumBadge>
    );
  }

  // S&P 500 (SPX / US500)
  if (s === 'SPX' || s === 'US500' || n.includes('s&p') || n.includes('spx')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#2563EB" gradientTo="#1E3A8A">
        <span className="text-[10px] font-black text-white tracking-tight">SPX</span>
      </PremiumBadge>
    );
  }

  // Dow Jones (DJI / US30)
  if (s === 'DJI' || s === 'US30' || n.includes('dow') || n.includes('dji')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#475569" gradientTo="#1E293B">
        <span className="text-[10px] font-black text-amber-300 font-mono">DJI</span>
      </PremiumBadge>
    );
  }

  // German DAX (GER40 / DAX)
  if (s === 'GER40' || s === 'GER30' || s === 'DAX' || n.includes('dax') || n.includes('ger40')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#EF4444" gradientTo="#991B1B">
        <span className="text-[9.5px] font-black text-yellow-300">GER</span>
      </PremiumBadge>
    );
  }

  // UK 100 (UK100 / FTSE)
  if (s === 'UK100' || s === 'FTSE' || n.includes('ftse') || n.includes('uk100')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#1E40AF" gradientTo="#172554">
        <span className="text-[9.5px] font-black text-white font-serif">UK100</span>
      </PremiumBadge>
    );
  }

  // Nikkei 225 (JP225)
  if (s === 'JP225' || s === 'N225' || n.includes('nikkei') || n.includes('jp225')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#EF4444" gradientTo="#991B1B">
        <span className="text-[9.5px] font-black text-white">JP225</span>
      </PremiumBadge>
    );
  }

  // Hang Seng (HSI / HK50)
  if (s === 'HSI' || s === 'HK50' || n.includes('hang seng') || n.includes('hsi')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#DC2626" gradientTo="#7F1D1D">
        <span className="text-[10px] font-black text-yellow-300">HSI</span>
      </PremiumBadge>
    );
  }

  // ==========================================
  // 5. FOREX & CURRENCY PAIRS (Clean Normal Badges)
  // ==========================================

  // EUR/USD
  if (s === 'EURUSD' || n.includes('eur/usd')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#0047D6" gradientTo="#002266">
        <div className="flex items-center text-[10px] font-bold">
          <span className="text-yellow-300">€</span>
          <span className="text-white/60 mx-0.5">/</span>
          <span className="text-emerald-300">$</span>
        </div>
      </PremiumBadge>
    );
  }

  // USD/INR
  if (s === 'USDINR' || n.includes('usd/inr')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#1E40AF" gradientTo="#172554">
        <div className="flex items-center text-[10px] font-bold">
          <span className="text-emerald-300">$</span>
          <span className="text-white/60 mx-0.5">/</span>
          <span className="text-amber-400">₹</span>
        </div>
      </PremiumBadge>
    );
  }

  // GBP/USD
  if (s === 'GBPUSD' || n.includes('gbp/usd')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#E5173A" gradientTo="#9B0B22">
        <div className="flex items-center text-[10px] font-bold">
          <span className="text-white">£</span>
          <span className="text-white/60 mx-0.5">/</span>
          <span className="text-emerald-300">$</span>
        </div>
      </PremiumBadge>
    );
  }

  // USD/JPY
  if (s === 'USDJPY' || n.includes('usd/jpy')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#0036B8" gradientTo="#001345">
        <div className="flex items-center text-[10px] font-bold">
          <span className="text-emerald-300">$</span>
          <span className="text-white/60 mx-0.5">/</span>
          <span className="text-yellow-300">¥</span>
        </div>
      </PremiumBadge>
    );
  }

  // AUD/USD
  if (s === 'AUDUSD' || n.includes('aud/usd')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#0000D1" gradientTo="#00005C">
        <div className="flex items-center text-[9px] font-bold">
          <span className="text-amber-300">A$</span>
          <span className="text-white/60 mx-0.5">/</span>
          <span className="text-emerald-300">$</span>
        </div>
      </PremiumBadge>
    );
  }

  // USD/CAD
  if (s === 'USDCAD' || n.includes('usd/cad')) {
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#0036B8" gradientTo="#001345">
        <div className="flex items-center text-[9px] font-bold">
          <span className="text-emerald-300">$</span>
          <span className="text-white/60 mx-0.5">/</span>
          <span className="text-white">C$</span>
        </div>
      </PremiumBadge>
    );
  }

  // Generic 6-character forex pairs (e.g., EURGBP, NZDUSD, USDCHF, etc.)
  if (s.length === 6 && !s.includes(' ') && !s.includes('-')) {
    const base = s.substring(0, 3);
    const quote = s.substring(3, 6);
    return (
      <PremiumBadge size={size} className={className} gradientFrom="#334155" gradientTo="#0F172A">
        <div className="flex flex-col items-center leading-none text-[8px] font-bold text-white tracking-tighter">
          <span>{base}</span>
          <span className="text-slate-400">{quote}</span>
        </div>
      </PremiumBadge>
    );
  }

  // ==========================================
  // 6. DEFAULT / FALLBACK (Clean Standard Badge)
  // ==========================================
  const colors = [
    '#3B82F6', '#10B981', '#6366F1', '#EC4899', 
    '#8B5CF6', '#F59E0B', '#06B6D4', '#EF4444'
  ];
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = colors[Math.abs(hash) % colors.length];
  const displayLetters = s.length <= 4 ? s : s.substring(0, 3);

  return (
    <PremiumBadge size={size} className={className} bgColor={color}>
      <span className="text-[11px] font-bold text-white tracking-tight">
        {displayLetters}
      </span>
    </PremiumBadge>
  );
};
