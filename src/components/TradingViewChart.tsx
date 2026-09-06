import React, { memo } from 'react';

interface TradingViewChartProps {
  tvSymbol: string;
  theme?: 'dark' | 'light';
  interval?: string;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = memo(({
  tvSymbol,
  theme = 'dark',
  interval = '15',
}) => {
  // Construct clean TradingView widget iframe URL with real-time market data
  // Disables side & top toolbars to eliminate auto-favorited intervals and clutter as requested
  // Manual timeframe switching is handled directly by the user from the app header
  const bgHex = theme === 'light' ? 'ffffff' : '0d131f';
  const iframeSrc = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_futures_widget&symbol=${encodeURIComponent(
    tvSymbol
  )}&interval=${encodeURIComponent(interval)}&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=0&saveimage=0&toolbarbg=${bgHex}&studies=%5B%5D&theme=${theme}&style=1&timezone=Asia%2FKolkata&locale=en`;

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-950 flex flex-col">
      <iframe
        key={`${tvSymbol}-${theme}-${interval}`}
        title={`TradingView Chart - ${tvSymbol}`}
        src={iframeSrc}
        className="w-full h-full border-0 block"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: theme === 'light' ? '#ffffff' : '#0d131f',
        }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
});

TradingViewChart.displayName = 'TradingViewChart';
