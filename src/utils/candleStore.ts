export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type TimeFrame = '5s' | '15s' | '30s' | '1m' | '3m' | '5m' | '15m' | '1min' | '3min' | '5min' | '15min';

export const normalizeTimeFrame = (tf: string): '5s' | '15s' | '30s' | '1m' | '3m' | '5m' | '15m' => {
  if (tf === '15min' || tf === '15m') return '15m';
  if (tf === '5min' || tf === '5m') return '5m';
  if (tf === '3min' || tf === '3m') return '3m';
  if (tf === '1min' || tf === '1m') return '1m';
  if (tf === '30s') return '30s';
  if (tf === '15s') return '15s';
  return '5s';
};

export const getTimeFrameMs = (tf: string): number => {
  const norm = normalizeTimeFrame(tf);
  switch (norm) {
    case '5s': return 5000;
    case '15s': return 15000;
    case '30s': return 30000;
    case '1m': return 60000;
    case '3m': return 180000;
    case '5m': return 300000;
    case '15m': return 900000;
    default: return 60000;
  }
};

export const getPrecision = (price: number): number => {
  if (!price || isNaN(price) || price <= 0) return 2;
  if (price < 0.0001) return 8; // e.g. SHIB (0.0000185), PEPE (0.0000098)
  if (price < 0.01) return 6;
  if (price < 1) return 4;    // e.g. XRP, DOGE, TRX, EURUSD
  if (price < 10) return 3;   // e.g. TON, LINK, SUI, NEAR
  return 2;                   // e.g. Gold, Bitcoin, Apple, Index
};

// In-memory cache holding historical and live candles per asset and timeframe
const candleCache = new Map<string, CandleData[]>();

// Pseudo-random generator with seed for deterministic historical continuity
function pseudoRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate realistic initial candle history for an asset and timeframe (Optimized for instant load & 60fps)
export const generateInitialCandles = (
  assetId: string,
  basePrice: number,
  timeFrame: string,
  count = 350
): CandleData[] => {
  const safeBasePrice = (typeof basePrice === 'number' && !isNaN(basePrice) && basePrice > 0) ? basePrice : 100;
  const normTf = normalizeTimeFrame(timeFrame);
  const intervalMs = getTimeFrameMs(normTf);
  const now = Date.now();
  const currentSlot = Math.floor(now / intervalMs) * intervalMs;
  
  const precision = getPrecision(safeBasePrice);
  
  // Scale volatility based on timeframe duration (e.g. 5m candles have wider swings than 5s)
  const durationMultiplier = Math.sqrt(intervalMs / 15000);
  const baseVolatility = safeBasePrice * 0.0005;
  const minVol = Math.pow(10, -precision) * 2;
  const volatility = Math.max(baseVolatility * durationMultiplier, minVol);

  const candles: CandleData[] = [];
  
  // Deterministic seed based on assetId and timeframe
  let seed = 0;
  for (let i = 0; i < (assetId || '1').length; i++) {
    seed += (assetId || '1').charCodeAt(i) * (i + 1) * 31;
  }
  seed += intervalMs;

  const historyPrices: { open: number; high: number; low: number; close: number; time: number }[] = [];
  let runningClose = safeBasePrice;

  for (let i = 0; i < count; i++) {
    const slotTime = currentSlot - (count - i) * intervalMs;
    const r1 = pseudoRandom(seed + i * 11);
    const r2 = pseudoRandom(seed + i * 11 + 3);
    const r3 = pseudoRandom(seed + i * 11 + 7);

    const wave = Math.sin(i / 10) * 0.45 + Math.cos(i / 5) * 0.35;
    const drift = (r1 - 0.495 + wave * 0.12) * volatility;
    
    const open = runningClose;
    let close = Number((open + drift).toFixed(precision));
    if (close <= 0) close = open;

    const wickUpper = Math.max(open, close) + r2 * volatility * 0.35;
    const wickLower = Math.max(minVol, Math.min(open, close) - r3 * volatility * 0.35);

    const high = Number(Math.max(wickUpper, open, close).toFixed(precision));
    const low = Number(Math.min(wickLower, open, close).toFixed(precision));

    historyPrices.push({
      time: slotTime,
      open,
      high,
      low,
      close
    });

    runningClose = close;
  }

  // Align latest historical close to safeBasePrice
  const diff = safeBasePrice - runningClose;
  for (const c of historyPrices) {
    c.open = Number(Math.max(minVol, c.open + diff).toFixed(precision));
    c.high = Number(Math.max(c.open, c.high + diff).toFixed(precision));
    c.low = Number(Math.max(minVol, Math.min(c.open, c.low + diff)).toFixed(precision));
    c.close = Number(Math.max(minVol, c.close + diff).toFixed(precision));
    candles.push(c);
  }

  // Add the active candle at currentSlot
  candles.push({
    time: currentSlot,
    open: safeBasePrice,
    high: safeBasePrice,
    low: safeBasePrice,
    close: safeBasePrice
  });

  return candles;
};

// Retrieve candles for asset and timeframe, creating persistent store if not exists
export const getCandleSeries = (
  assetId: string,
  basePrice: number,
  timeFrame: string
): CandleData[] => {
  const normTf = normalizeTimeFrame(timeFrame);
  const key = `${assetId}_${normTf}`;
  let series = candleCache.get(key);
  if (!series || series.length === 0) {
    series = generateInitialCandles(assetId, basePrice, normTf, 350);
    candleCache.set(key, series);
  }
  return series;
};

// Feed live tick into active timeframes for an asset (optimized for speed)
export const pushLiveTick = (assetId: string, currentPrice: number) => {
  if (!currentPrice || isNaN(currentPrice) || currentPrice <= 0) return;
  const timeFrames: ('5s' | '15s' | '30s' | '1m' | '3m' | '5m' | '15m')[] = ['5s', '15s', '30s', '1m', '3m', '5m', '15m'];
  const now = Date.now();
  const precision = getPrecision(currentPrice);

  for (const tf of timeFrames) {
    const key = `${assetId}_${tf}`;
    let series = candleCache.get(key);
    if (!series || series.length === 0) {
      // Lazy init only if explicitly accessed or 1m default
      if (tf === '1m') {
        series = generateInitialCandles(assetId, currentPrice, tf, 350);
        candleCache.set(key, series);
      } else {
        continue;
      }
    }

    const intervalMs = getTimeFrameMs(tf);
    const currentSlot = Math.floor(now / intervalMs) * intervalMs;
    const lastIndex = series.length - 1;
    const lastCandle = series[lastIndex];

    if (!lastCandle) continue;

    if (lastCandle.time === currentSlot) {
      // Update existing active candle in current slot
      lastCandle.close = currentPrice;
      lastCandle.high = Number(Math.max(lastCandle.high, currentPrice).toFixed(precision));
      lastCandle.low = Number(Math.min(lastCandle.low, currentPrice).toFixed(precision));
    } else if (currentSlot > lastCandle.time) {
      // New candle interval starts
      const newCandle: CandleData = {
        time: currentSlot,
        open: lastCandle.close,
        high: Number(Math.max(lastCandle.close, currentPrice).toFixed(precision)),
        low: Number(Math.min(lastCandle.close, currentPrice).toFixed(precision)),
        close: currentPrice
      };
      series.push(newCandle);

      // Keep clean memory window of 2500 candles
      if (series.length > 2500) {
        series.shift();
      }
    }
  }
};
