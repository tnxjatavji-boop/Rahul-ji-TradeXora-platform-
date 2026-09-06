import React, { useState } from 'react';
import { 
  X, Check, Sliders, Activity, TrendingUp, 
  Layers, Sparkles, RotateCcw, Eye, EyeOff, ShieldAlert
} from 'lucide-react';
import { IndicatorConfig, IndicatorType, IndicatorCategory } from '../../types/analysis';

interface IndicatorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicators: IndicatorConfig[];
  onUpdateIndicator: (indicator: IndicatorConfig) => void;
  onApplyPreset: (presetName: string) => void;
  theme?: 'light' | 'dark';
}

const AVAILABLE_INDICATORS: {
  id: string;
  type: IndicatorType;
  name: string;
  category: IndicatorCategory;
  description: string;
  defaultPeriod?: number;
  defaultPeriod2?: number;
  defaultPeriod3?: number;
  defaultColor: string;
  defaultStdDev?: number;
  defaultMultiplier?: number;
}[] = [
  // Trend
  { id: 'sma_fast', type: 'sma', name: 'SMA 7 (Fast)', category: 'trend', description: 'Simple Moving Average 7 period (Short-term trend)', defaultPeriod: 7, defaultColor: '#fbbf24' },
  { id: 'sma_slow', type: 'sma', name: 'SMA 25 (Trend)', category: 'trend', description: 'Simple Moving Average 25 period (Medium-term trend)', defaultPeriod: 25, defaultColor: '#0088cc' },
  { id: 'ema_50', type: 'ema', name: 'EMA 50 (Major)', category: 'trend', description: 'Exponential Moving Average 50 (Institutional baseline)', defaultPeriod: 50, defaultColor: '#a855f7' },
  { id: 'supertrend', type: 'supertrend', name: 'SuperTrend', category: 'trend', description: 'ATR-based dynamic trend indicator with Buy/Sell direction', defaultPeriod: 10, defaultMultiplier: 3, defaultColor: '#00b067' },
  { id: 'sar', type: 'sar', name: 'Parabolic SAR', category: 'trend', description: 'Trailing stop-and-reverse dots on price chart', defaultPeriod: 2, defaultColor: '#06b6d4' },

  // Volatility
  { id: 'bollinger', type: 'bollinger', name: 'Bollinger Bands (20, 2)', category: 'volatility', description: 'Upper/Lower 2.0 std dev volatility envelopes', defaultPeriod: 20, defaultStdDev: 2, defaultColor: '#38bdf8' },

  // Oscillators
  { id: 'rsi', type: 'rsi', name: 'RSI (14)', category: 'oscillators', description: 'Relative Strength Index with 70/30 Overbought/Oversold levels', defaultPeriod: 14, defaultColor: '#f97316' },
  { id: 'macd', type: 'macd', name: 'MACD (12, 26, 9)', category: 'oscillators', description: 'Moving Average Convergence Divergence & Histogram', defaultPeriod: 12, defaultPeriod2: 26, defaultPeriod3: 9, defaultColor: '#3b82f6' },

  // Structure & Smart Patterns
  { id: 'pivot_points', type: 'pivot_points', name: 'Floor Pivot Levels (S/R)', category: 'structure', description: 'Calculates R2, R1, Pivot, S1, S2 support & resistance lines', defaultPeriod: 20, defaultColor: '#f59e0b' },
  { id: 'zigzag', type: 'zigzag', name: 'ZigZag High / Low Swings', category: 'structure', description: 'Connects significant swing highs and swing lows', defaultPeriod: 1, defaultColor: '#ec4899' },
  { id: 'patterns', type: 'patterns', name: 'Candlestick Pattern AI', category: 'structure', description: 'Highlights Hammers, Engulfings, Shooting Stars on candles', defaultPeriod: 5, defaultColor: '#10b981' }
];

export const IndicatorsModal: React.FC<IndicatorsModalProps> = ({
  isOpen,
  onClose,
  indicators,
  onUpdateIndicator,
  onApplyPreset,
  theme = 'light'
}) => {
  const [activeCategory, setActiveCategory] = useState<IndicatorCategory>('trend');
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(null);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const categories: { id: IndicatorCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'trend', label: 'Trend & Moving Avg', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'volatility', label: 'Volatility & Bands', icon: <Layers className="w-4 h-4" /> },
    { id: 'oscillators', label: 'Oscillators (RSI/MACD)', icon: <Activity className="w-4 h-4" /> },
    { id: 'structure', label: 'Support/Resistance & Patterns', icon: <Sparkles className="w-4 h-4" /> },
  ];

  const getIndicatorState = (item: typeof AVAILABLE_INDICATORS[0]): IndicatorConfig => {
    const existing = indicators.find(i => i.id === item.id);
    if (existing) return existing;
    return {
      id: item.id,
      type: item.type,
      name: item.name,
      enabled: false,
      color: item.defaultColor,
      period: item.defaultPeriod,
      period2: item.defaultPeriod2,
      period3: item.defaultPeriod3,
      multiplier: item.defaultMultiplier,
      stdDev: item.defaultStdDev,
      lineWidth: 2,
      lineStyle: 'solid',
      showLabels: true
    };
  };

  const currentList = AVAILABLE_INDICATORS.filter(i => i.category === activeCategory);
  const activeCount = indicators.filter(i => i.enabled).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border flex flex-col max-h-[88vh] overflow-hidden ${
        isDark 
          ? 'bg-slate-900 border-slate-700 text-slate-100' 
          : 'bg-white border-gray-200 text-gray-900'
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center text-[#0088cc]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight">Chart Indicators & Analysis</h2>
              <p className="text-[10px] text-gray-400 dark:text-slate-400">
                {activeCount} active indicator{activeCount === 1 ? '' : 's'} on canvas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets Row */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 shrink-0">
            Presets:
          </span>
          <button
            onClick={() => onApplyPreset('scalping')}
            className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-blue-500/15 hover:bg-blue-500/25 text-[#0088cc] dark:text-blue-400 border border-blue-500/30 shrink-0 cursor-pointer"
          >
            ⚡ Scalping (SMA 7 + RSI)
          </button>
          <button
            onClick={() => onApplyPreset('trend')}
            className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0 cursor-pointer"
          >
            📈 Trend Following (EMA + BB)
          </button>
          <button
            onClick={() => onApplyPreset('snr')}
            className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0 cursor-pointer"
          >
            🎯 Support & Resistance
          </button>
          <button
            onClick={() => onApplyPreset('clean')}
            className="px-2 py-1 rounded-lg text-[10px] font-bold text-gray-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
          >
            Reset All
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex border-b border-gray-200 dark:border-slate-800 px-3 overflow-x-auto no-scrollbar shrink-0">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setSelectedIndicatorId(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-black border-b-2 transition-all shrink-0 cursor-pointer ${
                activeCategory === cat.id
                  ? 'border-[#0088cc] text-[#0088cc] dark:text-[#38bdf8]'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Indicator List & Settings Panel */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {currentList.map(item => {
            const state = getIndicatorState(item);
            const isConfiguring = selectedIndicatorId === item.id;

            return (
              <div
                key={item.id}
                className={`rounded-2xl border transition-all ${
                  state.enabled 
                    ? 'border-blue-500/40 bg-blue-50/20 dark:bg-blue-950/20' 
                    : isDark 
                      ? 'border-slate-800 bg-slate-800/40' 
                      : 'border-gray-200 bg-gray-50/50'
                } p-3.5`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div 
                      className="w-4 h-4 rounded-full border shadow-xs shrink-0"
                      style={{ backgroundColor: state.color, borderColor: state.color }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-gray-900 dark:text-white truncate">
                          {item.name}
                        </span>
                        {state.enabled && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Settings Cog */}
                    <button
                      onClick={() => setSelectedIndicatorId(isConfiguring ? null : item.id)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        isConfiguring 
                          ? 'bg-[#0088cc] text-white border-[#0088cc]' 
                          : isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                      title="Adjust Parameters & Colors"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>

                    {/* Enable / Disable Toggle Switch */}
                    <button
                      onClick={() => onUpdateIndicator({ ...state, enabled: !state.enabled })}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        state.enabled ? 'bg-[#0088cc]' : isDark ? 'bg-slate-700' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-xs flex items-center justify-center ${
                          state.enabled ? 'translate-x-5 text-[#0088cc]' : 'text-gray-400'
                        }`}
                      >
                        {state.enabled && <Check className="w-3 h-3" />}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Inline Parameters Customizer */}
                {isConfiguring && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-800 grid grid-cols-2 gap-3 animate-in fade-in duration-150">
                    {/* Period Setting */}
                    {state.period !== undefined && (
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                          Period ({state.period})
                        </label>
                        <input
                          type="range"
                          min="2"
                          max={state.type === 'ema' ? 200 : 100}
                          value={state.period}
                          onChange={(e) => onUpdateIndicator({ ...state, period: Number(e.target.value) })}
                          className="w-full accent-[#0088cc]"
                        />
                      </div>
                    )}

                    {/* Secondary Period (MACD Slow) */}
                    {state.period2 !== undefined && (
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                          Slow Period ({state.period2})
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="60"
                          value={state.period2}
                          onChange={(e) => onUpdateIndicator({ ...state, period2: Number(e.target.value) })}
                          className="w-full accent-[#0088cc]"
                        />
                      </div>
                    )}

                    {/* Std Dev / Multiplier */}
                    {state.stdDev !== undefined && (
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                          Std Dev ({state.stdDev})
                        </label>
                        <div className="flex gap-1">
                          {[1.5, 2.0, 2.5, 3.0].map(val => (
                            <button
                              key={val}
                              onClick={() => onUpdateIndicator({ ...state, stdDev: val })}
                              className={`flex-1 py-1 text-[10px] font-black rounded border cursor-pointer ${
                                state.stdDev === val ? 'bg-[#0088cc] text-white border-[#0088cc]' : 'border-gray-200 dark:border-slate-700'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Color Picker Palette */}
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                        Line Color
                      </label>
                      <div className="flex gap-1.5 items-center">
                        {['#0088cc', '#00b067', '#ff3b30', '#fbbf24', '#a855f7', '#06b6d4', '#ec4899'].map(c => (
                          <button
                            key={c}
                            onClick={() => onUpdateIndicator({ ...state, color: c })}
                            className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                              state.color === c ? 'scale-125 ring-2 ring-blue-400' : 'hover:scale-110'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-black transition-colors shadow-md cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
