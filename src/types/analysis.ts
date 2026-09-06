export type DrawingToolType = 
  | 'none'
  | 'trendline'
  | 'horizontal'
  | 'horizontal_ray'
  | 'vertical'
  | 'rectangle'
  | 'fibonacci'
  | 'channel'
  | 'ruler'
  | 'arrow'
  | 'brush';

export interface ChartPoint {
  time: number; // Unix timestamp
  price: number; // Price level
}

export interface DrawingItem {
  id: string;
  type: DrawingToolType;
  points: ChartPoint[];
  color: string;
  lineWidth: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  label?: string;
  fibLevels?: number[];
  fillColor?: string;
  locked?: boolean;
}

export type IndicatorCategory = 'trend' | 'oscillators' | 'volatility' | 'structure';

export type IndicatorType = 
  | 'sma'
  | 'ema'
  | 'wma'
  | 'bollinger'
  | 'supertrend'
  | 'sar'
  | 'zigzag'
  | 'rsi'
  | 'macd'
  | 'stochastic'
  | 'pivot_points'
  | 'patterns';

export interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  name: string;
  enabled: boolean;
  color: string;
  period?: number;
  period2?: number;
  period3?: number;
  multiplier?: number;
  stdDev?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  lineWidth?: number;
  showLabels?: boolean;
}

export interface AutoAnalysisSummary {
  overallSignal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  score: number; // -100 to 100
  movingAveragesSignal: 'BUY' | 'NEUTRAL' | 'SELL';
  oscillatorsSignal: 'BUY' | 'NEUTRAL' | 'SELL';
  summaryText: string;
  rsiValue: number;
  macdHistogram: number;
  trendStrength: 'Weak' | 'Moderate' | 'Strong';
  pivotLevels: {
    r2: number;
    r1: number;
    pivot: number;
    s1: number;
    s2: number;
  };
  activePatterns: {
    name: string;
    type: 'bullish' | 'bearish' | 'neutral';
    candleTime: number;
    price: number;
  }[];
}
