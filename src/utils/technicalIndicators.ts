import { CandleData } from './candleStore';
import { IndicatorConfig, AutoAnalysisSummary } from '../types/analysis';

// Simple Moving Average
export function calculateSMA(candles: CandleData[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  result[period - 1] = sum / period;

  for (let i = period; i < candles.length; i++) {
    sum += candles[i].close - candles[i - period].close;
    result[i] = sum / period;
  }
  return result;
}

// Exponential Moving Average
export function calculateEMA(candles: CandleData[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < period) return result;

  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let prevEma = sum / period;
  result[period - 1] = prevEma;

  for (let i = period; i < candles.length; i++) {
    const currentEma = candles[i].close * k + prevEma * (1 - k);
    result[i] = currentEma;
    prevEma = currentEma;
  }
  return result;
}

// Weighted Moving Average
export function calculateWMA(candles: CandleData[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < period) return result;

  const denominator = (period * (period + 1)) / 2;
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += candles[i - (period - 1 - j)].close * (j + 1);
    }
    result[i] = sum / denominator;
  }
  return result;
}

// Bollinger Bands
export interface BollingerBandsResult {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
}

export function calculateBollingerBands(
  candles: CandleData[],
  period = 20,
  stdDevMultiplier = 2
): BollingerBandsResult {
  const middle = calculateSMA(candles, period);
  const upper: (number | null)[] = new Array(candles.length).fill(null);
  const lower: (number | null)[] = new Array(candles.length).fill(null);

  for (let i = period - 1; i < candles.length; i++) {
    const sma = middle[i];
    if (sma === null) continue;

    let varianceSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      varianceSum += Math.pow(candles[j].close - sma, 2);
    }
    const stdDev = Math.sqrt(varianceSum / period);
    upper[i] = sma + stdDevMultiplier * stdDev;
    lower[i] = sma - stdDevMultiplier * stdDev;
  }

  return { upper, middle, lower };
}

// Relative Strength Index (RSI)
export function calculateRSI(candles: CandleData[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length <= period) return result;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result[period] = 100 - 100 / (1 + rs);

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result[i] = 100;
    } else {
      const currentRs = avgGain / avgLoss;
      result[i] = 100 - 100 / (1 + currentRs);
    }
  }

  return result;
}

// MACD (Moving Average Convergence Divergence)
export interface MACDResult {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

export function calculateMACD(
  candles: CandleData[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDResult {
  const fastEma = calculateEMA(candles, fastPeriod);
  const slowEma = calculateEMA(candles, slowPeriod);

  const macdLine: (number | null)[] = new Array(candles.length).fill(null);
  const validMacdIndices: number[] = [];
  const macdValues: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (fastEma[i] !== null && slowEma[i] !== null) {
      const val = fastEma[i]! - slowEma[i]!;
      macdLine[i] = val;
      validMacdIndices.push(i);
      macdValues.push(val);
    }
  }

  // Calculate Signal line (EMA of MACD)
  const signalLine: (number | null)[] = new Array(candles.length).fill(null);
  const histogram: (number | null)[] = new Array(candles.length).fill(null);

  if (macdValues.length >= signalPeriod) {
    const k = 2 / (signalPeriod + 1);
    let sum = 0;
    for (let i = 0; i < signalPeriod; i++) {
      sum += macdValues[i];
    }
    let prevSignal = sum / signalPeriod;
    const firstSignalIdx = validMacdIndices[signalPeriod - 1];
    signalLine[firstSignalIdx] = prevSignal;
    histogram[firstSignalIdx] = macdLine[firstSignalIdx]! - prevSignal;

    for (let i = signalPeriod; i < macdValues.length; i++) {
      const currentSignal = macdValues[i] * k + prevSignal * (1 - k);
      const originalIdx = validMacdIndices[i];
      signalLine[originalIdx] = currentSignal;
      histogram[originalIdx] = macdLine[originalIdx]! - currentSignal;
      prevSignal = currentSignal;
    }
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

// SuperTrend Indicator
export interface SuperTrendPoint {
  value: number;
  direction: 'up' | 'down'; // up = green (bullish), down = red (bearish)
}

export function calculateSuperTrend(
  candles: CandleData[],
  period = 10,
  multiplier = 3
): (SuperTrendPoint | null)[] {
  const result: (SuperTrendPoint | null)[] = new Array(candles.length).fill(null);
  if (candles.length < period) return result;

  // True Range (TR) & ATR
  const tr: number[] = [candles[0].high - candles[0].low];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const pc = candles[i - 1].close;
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }

  const atr: number[] = new Array(candles.length).fill(0);
  let atrSum = 0;
  for (let i = 0; i < period; i++) atrSum += tr[i];
  atr[period - 1] = atrSum / period;

  for (let i = period; i < candles.length; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }

  let prevUpper = 0;
  let prevLower = 0;
  let prevDirection: 'up' | 'down' = 'up';

  for (let i = period - 1; i < candles.length; i++) {
    const hl2 = (candles[i].high + candles[i].low) / 2;
    const currentAtr = atr[i];

    let upper = hl2 + multiplier * currentAtr;
    let lower = hl2 - multiplier * currentAtr;

    if (i > period - 1) {
      if (lower > prevLower || candles[i - 1].close < prevLower) {
        // Lower band adjusted
      } else {
        lower = prevLower;
      }

      if (upper < prevUpper || candles[i - 1].close > prevUpper) {
        // Upper band adjusted
      } else {
        upper = prevUpper;
      }
    }

    let direction: 'up' | 'down' = prevDirection;
    if (i === period - 1) {
      direction = candles[i].close > upper ? 'up' : 'down';
    } else {
      if (prevDirection === 'up' && candles[i].close < lower) {
        direction = 'down';
      } else if (prevDirection === 'down' && candles[i].close > upper) {
        direction = 'up';
      }
    }

    const value = direction === 'up' ? lower : upper;
    result[i] = { value, direction };

    prevUpper = upper;
    prevLower = lower;
    prevDirection = direction;
  }

  return result;
}

// Parabolic SAR
export function calculateParabolicSAR(
  candles: CandleData[],
  step = 0.02,
  maxStep = 0.2
): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < 3) return result;

  let isBull = candles[1].close >= candles[0].close;
  let sar = isBull ? candles[0].low : candles[0].high;
  let ep = isBull ? candles[1].high : candles[1].low;
  let af = step;

  result[0] = sar;

  for (let i = 1; i < candles.length; i++) {
    const prevSar = sar;
    sar = prevSar + af * (ep - prevSar);

    if (isBull) {
      if (i >= 2) sar = Math.min(sar, candles[i - 1].low, candles[i - 2].low);
      else sar = Math.min(sar, candles[i - 1].low);

      if (candles[i].low < sar) {
        isBull = false;
        sar = ep;
        ep = candles[i].low;
        af = step;
      } else {
        if (candles[i].high > ep) {
          ep = candles[i].high;
          af = Math.min(af + step, maxStep);
        }
      }
    } else {
      if (i >= 2) sar = Math.max(sar, candles[i - 1].high, candles[i - 2].high);
      else sar = Math.max(sar, candles[i - 1].high);

      if (candles[i].high > sar) {
        isBull = true;
        sar = ep;
        ep = candles[i].high;
        af = step;
      } else {
        if (candles[i].low < ep) {
          ep = candles[i].low;
          af = Math.min(af + step, maxStep);
        }
      }
    }

    result[i] = sar;
  }

  return result;
}

// ZigZag High/Low Pivot Structure
export interface ZigZagPoint {
  index: number;
  time: number;
  price: number;
  type: 'H' | 'L'; // High or Low
}

export function calculateZigZag(candles: CandleData[], deviationPercent = 0.6): ZigZagPoint[] {
  if (candles.length < 10) return [];
  const points: ZigZagPoint[] = [];

  let lastPivotType: 'H' | 'L' | null = null;
  let lastPivotPrice = candles[0].close;
  let lastPivotIndex = 0;

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const diffPctFromHigh = ((c.high - lastPivotPrice) / lastPivotPrice) * 100;
    const diffPctFromLow = ((lastPivotPrice - c.low) / lastPivotPrice) * 100;

    if (lastPivotType === null) {
      if (diffPctFromHigh >= deviationPercent) {
        lastPivotType = 'H';
        lastPivotPrice = c.high;
        lastPivotIndex = i;
        points.push({ index: i, time: c.time, price: c.high, type: 'H' });
      } else if (diffPctFromLow >= deviationPercent) {
        lastPivotType = 'L';
        lastPivotPrice = c.low;
        lastPivotIndex = i;
        points.push({ index: i, time: c.time, price: c.low, type: 'L' });
      }
    } else if (lastPivotType === 'L') {
      if (diffPctFromHigh >= deviationPercent) {
        lastPivotType = 'H';
        lastPivotPrice = c.high;
        lastPivotIndex = i;
        points.push({ index: i, time: c.time, price: c.high, type: 'H' });
      } else if (c.low < lastPivotPrice) {
        lastPivotPrice = c.low;
        lastPivotIndex = i;
        points[points.length - 1] = { index: i, time: c.time, price: c.low, type: 'L' };
      }
    } else if (lastPivotType === 'H') {
      if (diffPctFromLow >= deviationPercent) {
        lastPivotType = 'L';
        lastPivotPrice = c.low;
        lastPivotIndex = i;
        points.push({ index: i, time: c.time, price: c.low, type: 'L' });
      } else if (c.high > lastPivotPrice) {
        lastPivotPrice = c.high;
        lastPivotIndex = i;
        points[points.length - 1] = { index: i, time: c.time, price: c.high, type: 'H' };
      }
    }
  }

  return points;
}

// Classical Pivot Points (Floor Pivots)
export function calculatePivotPoints(candles: CandleData[]) {
  if (candles.length < 20) {
    const p = candles[candles.length - 1]?.close || 100;
    return { r2: p * 1.01, r1: p * 1.005, pivot: p, s1: p * 0.995, s2: p * 0.99 };
  }

  // Use recent 20 candles window to compute reference High, Low, Close
  const recent = candles.slice(-30);
  let high = -Infinity;
  let low = Infinity;
  for (const c of recent) {
    if (c.high > high) high = c.high;
    if (c.low < low) low = c.low;
  }
  const close = recent[recent.length - 1].close;

  const pivot = (high + low + close) / 3;
  const r1 = 2 * pivot - low;
  const s1 = 2 * pivot - high;
  const r2 = pivot + (high - low);
  const s2 = pivot - (high - low);

  return { r2, r1, pivot, s1, s2 };
}

// Candlestick Pattern Recognition
export interface RecognizedPattern {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  candleIndex: number;
  time: number;
  price: number;
  description: string;
}

export function detectCandlestickPatterns(candles: CandleData[]): RecognizedPattern[] {
  if (candles.length < 5) return [];
  const patterns: RecognizedPattern[] = [];

  for (let i = 2; i < candles.length; i++) {
    const curr = candles[i];
    const prev = candles[i - 1];
    const prev2 = candles[i - 2];

    const body = Math.abs(curr.close - curr.open);
    const range = curr.high - curr.low;
    const prevBody = Math.abs(prev.close - prev.open);

    if (range === 0) continue;

    const isBull = curr.close > curr.open;
    const isBear = curr.close < curr.open;
    const isPrevBull = prev.close > prev.open;
    const isPrevBear = prev.close < prev.open;

    const upperWick = curr.high - Math.max(curr.open, curr.close);
    const lowerWick = Math.min(curr.open, curr.close) - curr.low;

    // 1. Hammer (Bullish Reversal)
    if (lowerWick >= 2 * body && upperWick <= 0.2 * body && isPrevBear) {
      patterns.push({
        name: 'Hammer',
        type: 'bullish',
        candleIndex: i,
        time: curr.time,
        price: curr.low,
        description: 'Bullish rejection at support level'
      });
      continue;
    }

    // 2. Shooting Star / Inverted Hammer (Bearish Reversal)
    if (upperWick >= 2 * body && lowerWick <= 0.2 * body && isPrevBull) {
      patterns.push({
        name: 'Shooting Star',
        type: 'bearish',
        candleIndex: i,
        time: curr.time,
        price: curr.high,
        description: 'Bearish rejection at resistance'
      });
      continue;
    }

    // 3. Bullish Engulfing
    if (isPrevBear && isBull && curr.open <= prev.close && curr.close >= prev.open && body > prevBody * 1.1) {
      patterns.push({
        name: 'Bullish Engulfing',
        type: 'bullish',
        candleIndex: i,
        time: curr.time,
        price: curr.low,
        description: 'Strong buyers takeover pattern'
      });
      continue;
    }

    // 4. Bearish Engulfing
    if (isPrevBull && isBear && curr.open >= prev.close && curr.close <= prev.open && body > prevBody * 1.1) {
      patterns.push({
        name: 'Bearish Engulfing',
        type: 'bearish',
        candleIndex: i,
        time: curr.time,
        price: curr.high,
        description: 'Strong sellers takeover pattern'
      });
      continue;
    }

    // 5. Morning Star (3-candle bullish)
    if (isPrevBear && prev2.close < prev2.open && isBull && curr.close > (prev2.open + prev2.close) / 2 && prevBody < (prev2.high - prev2.low) * 0.3) {
      patterns.push({
        name: 'Morning Star',
        type: 'bullish',
        candleIndex: i,
        time: curr.time,
        price: curr.low,
        description: '3-candle high-probability bullish reversal'
      });
      continue;
    }

    // 6. Doji (Indecision)
    if (body <= range * 0.08 && range > 0) {
      patterns.push({
        name: 'Doji',
        type: 'neutral',
        candleIndex: i,
        time: curr.time,
        price: (curr.high + curr.low) / 2,
        description: 'Market equilibrium / volatility pause'
      });
    }
  }

  return patterns;
}

// Real-time Technical Analysis Consensus Generator
export function generateAutoTechnicalAnalysis(candles: CandleData[]): AutoAnalysisSummary {
  const currentPrice = candles[candles.length - 1]?.close || 100;
  const sma20 = calculateSMA(candles, 20);
  const sma50 = calculateSMA(candles, 50);
  const ema12 = calculateEMA(candles, 12);
  const ema26 = calculateEMA(candles, 26);
  const rsi = calculateRSI(candles, 14);
  const macd = calculateMACD(candles);
  const supertrend = calculateSuperTrend(candles, 10, 3);
  const pivotLevels = calculatePivotPoints(candles);
  const allPatterns = detectCandlestickPatterns(candles);
  const activePatterns = allPatterns.slice(-4).map(p => ({
    name: p.name,
    type: p.type,
    candleTime: p.time,
    price: p.price
  }));

  const lastIdx = candles.length - 1;
  const lastRsi = rsi[lastIdx] !== null ? rsi[lastIdx]! : 50;
  const lastMacdHist = macd.histogram[lastIdx] !== null ? macd.histogram[lastIdx]! : 0;
  const lastSt = supertrend[lastIdx];

  let bullPoints = 0;
  let bearPoints = 0;

  // Moving averages voting
  const lastSma20 = sma20[lastIdx];
  const lastSma50 = sma50[lastIdx];
  const lastEma12 = ema12[lastIdx];
  const lastEma26 = ema26[lastIdx];

  if (lastSma20 && currentPrice > lastSma20) bullPoints += 15;
  else if (lastSma20 && currentPrice < lastSma20) bearPoints += 15;

  if (lastSma50 && currentPrice > lastSma50) bullPoints += 15;
  else if (lastSma50 && currentPrice < lastSma50) bearPoints += 15;

  if (lastEma12 && lastEma26 && lastEma12 > lastEma26) bullPoints += 20;
  else if (lastEma12 && lastEma26 && lastEma12 < lastEma26) bearPoints += 20;

  // Oscillators voting
  if (lastRsi < 30) bullPoints += 25; // Oversold bounce
  else if (lastRsi > 70) bearPoints += 25; // Overbought drop
  else if (lastRsi > 50) bullPoints += 10;
  else bearPoints += 10;

  if (lastMacdHist > 0) bullPoints += 15;
  else if (lastMacdHist < 0) bearPoints += 15;

  if (lastSt && lastSt.direction === 'up') bullPoints += 15;
  else if (lastSt && lastSt.direction === 'down') bearPoints += 15;

  const totalPoints = bullPoints + bearPoints || 1;
  const netScore = Math.round(((bullPoints - bearPoints) / totalPoints) * 100);

  let overallSignal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL' = 'NEUTRAL';
  if (netScore >= 50) overallSignal = 'STRONG_BUY';
  else if (netScore >= 20) overallSignal = 'BUY';
  else if (netScore <= -50) overallSignal = 'STRONG_SELL';
  else if (netScore <= -20) overallSignal = 'SELL';

  const movingAveragesSignal = bullPoints > bearPoints + 15 ? 'BUY' : bearPoints > bullPoints + 15 ? 'SELL' : 'NEUTRAL';
  const oscillatorsSignal = lastRsi < 35 || lastMacdHist > 0 ? 'BUY' : lastRsi > 65 || lastMacdHist < 0 ? 'SELL' : 'NEUTRAL';

  const trendStrength = Math.abs(netScore) > 60 ? 'Strong' : Math.abs(netScore) > 25 ? 'Moderate' : 'Weak';

  const summaryText = overallSignal === 'STRONG_BUY'
    ? 'Strong upward momentum detected across multiple moving averages and oscillators.'
    : overallSignal === 'BUY'
    ? 'Mild bullish bias with positive MACD histogram and support holding.'
    : overallSignal === 'STRONG_SELL'
    ? 'Significant downward pressure with key moving averages acting as resistance.'
    : overallSignal === 'SELL'
    ? 'Bearish divergence observed on momentum indicators.'
    : 'Consolidation range with balanced order flow between buyers and sellers.';

  return {
    overallSignal,
    score: netScore,
    movingAveragesSignal,
    oscillatorsSignal,
    summaryText,
    rsiValue: Number(lastRsi.toFixed(1)),
    macdHistogram: Number(lastMacdHist.toFixed(3)),
    trendStrength,
    pivotLevels,
    activePatterns
  };
}
