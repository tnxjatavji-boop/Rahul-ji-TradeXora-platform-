import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { CandlestickChart } from '../components/CandlestickChart';
import { TradingViewChart } from '../components/TradingViewChart';
import { FuturesOrderPad } from '../components/FuturesOrderPad';
import { AssetLogo } from '../components/AssetLogo';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';
import { 
  Plus, Minus, TrendingUp, TrendingDown, BarChart2, 
  Volume2, VolumeX, Activity, CheckCircle2, XCircle, ChevronDown, 
  Zap, Clock, Sun, Moon, History, Check, Timer, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

const DURATION_OPTIONS = [
  { seconds: 5, label: '5s', display: '00:00:05', title: '5 Seconds' },
  { seconds: 15, label: '15s', display: '00:00:15', title: '15 Seconds' },
  { seconds: 30, label: '30s', display: '00:00:30', title: '30 Seconds' },
  { seconds: 60, label: '1 min', display: '00:01:00', title: '1 Minute' },
  { seconds: 120, label: '2 min', display: '00:02:00', title: '2 Minutes' },
  { seconds: 180, label: '3 min', display: '00:03:00', title: '3 Minutes' },
  { seconds: 300, label: '5 min', display: '00:05:00', title: '5 Minutes' },
  { seconds: 600, label: '10 min', display: '00:10:00', title: '10 Minutes' },
  { seconds: 900, label: '15 min', display: '00:15:00', title: '15 Minutes' },
];

const TIMEFRAME_OPTIONS = [
  { id: '5s', label: '5s', title: '5 Seconds' },
  { id: '15s', label: '15s', title: '15 Seconds' },
  { id: '30s', label: '30s', title: '30 Seconds' },
  { id: '1m', label: '1m', title: '1 Minute (Default)' },
  { id: '3m', label: '3m', title: '3 Minutes' },
  { id: '5m', label: '5m', title: '5 Minutes' },
  { id: '15m', label: '15m', title: '15 Minutes' },
];

const FUTURES_TIMEFRAME_OPTIONS = [
  { id: '1', label: '1m', title: '1 Minute' },
  { id: '5', label: '5m', title: '5 Minutes' },
  { id: '15', label: '15m', title: '15 Minutes' },
  { id: '60', label: '1h', title: '1 Hour' },
  { id: '240', label: '4h', title: '4 Hours' },
  { id: 'D', label: '1D', title: '1 Day' },
];

export const TradeScreen = () => {
  const { 
    accountType, setAccountType, 
    realBalance, demoBalance, 
    refillDemoBalance,
    currentAsset, placeTrade, trades,
    soundEnabled, toggleSound,
    lastTradeResult, dismissTradeResult,
    // 20X Futures Trading
    tradingMode, setTradingMode,
    currentFuturesAsset,
    futuresPositions, placeFuturesOrder, closeFuturesPosition
  } = useAppContext();

  const MIN_AMOUNT = 50;
  const MAX_AMOUNT = 50000;

  // Binary options state
  const [amount, setAmount] = useState(100);
  const [amountInput, setAmountInput] = useState('100');
  const [durationIndex, setDurationIndex] = useState(3); // Default 60s (1 min)
  const [chartType, setChartType] = useState<'candle' | 'area' | 'bars' | 'heikin'>('candle');
  const [chartTheme, setChartTheme] = useState<'light' | 'dark'>('light');
  const [showChartType, setShowChartType] = useState(false);
  const [showTimeFramePicker, setShowTimeFramePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [chartTimeFrame, setChartTimeFrame] = useState('1m'); // Default 1 min
  const [isPlacingTrade, setIsPlacingTrade] = useState(false);

  // Futures order pad state
  const [isFuturesPadOpen, setIsFuturesPadOpen] = useState(false);
  const [futuresOrderType, setFuturesOrderType] = useState<'LONG' | 'SHORT'>('LONG');
  const [futuresTimeFrame, setFuturesTimeFrame] = useState('15'); // Default 15m as requested
  const [showFuturesTimeFramePicker, setShowFuturesTimeFramePicker] = useState(false);

  const balance = accountType === 'real' ? realBalance : demoBalance;
  const currentDuration = DURATION_OPTIONS[durationIndex] || DURATION_OPTIONS[3];

  const handleAmountChange = (delta: number) => {
    setAmount(prev => {
      const next = Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, prev + delta));
      setAmountInput(String(next));
      return next;
    });
  };

  const handleAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAmountInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setAmount(Math.min(MAX_AMOUNT, parsed));
    }
  };

  const handleAmountInputBlur = () => {
    const parsed = parseInt(amountInput, 10);
    if (isNaN(parsed) || parsed < MIN_AMOUNT) {
      setAmount(MIN_AMOUNT);
      setAmountInput(String(MIN_AMOUNT));
    } else if (parsed > MAX_AMOUNT) {
      setAmount(MAX_AMOUNT);
      setAmountInput(String(MAX_AMOUNT));
    } else {
      setAmount(parsed);
      setAmountInput(String(parsed));
    }
  };
  
  const handleDurationStep = (delta: number) => {
    setDurationIndex(prev => {
      const next = prev + delta;
      return Math.max(0, Math.min(DURATION_OPTIONS.length - 1, next));
    });
  };

  const setFixedAmount = (amt: number) => {
    const validAmt = Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, amt));
    setAmount(validAmt);
    setAmountInput(String(validAmt));
  };

  const handleTrade = (type: 'CALL' | 'PUT') => {
    triggerHaptic('heavy');
    if (isPlacingTrade) return;
    if (amount > balance) {
      alert(`Insufficient ${accountType === 'real' ? 'Real' : 'Demo'} Account Balance.`);
      return;
    }
    setIsPlacingTrade(true);
    placeTrade(amount, type, currentDuration.seconds);
    setTimeout(() => {
      setIsPlacingTrade(false);
    }, 600);
  };

  const openFuturesOrder = (type: 'LONG' | 'SHORT') => {
    triggerHaptic('medium');
    setFuturesOrderType(type);
    setIsFuturesPadOpen(true);
  };

  const expectedProfit = amount * currentAsset.profitMargin;
  const activeTradesCount = trades.filter(t => t.status === 'active').length;
  const assetActiveTrades = trades.filter(t => t.status === 'active' && t.assetId === currentAsset.id);

  // Open futures positions for current asset or overall
  const openFuturesPositions = futuresPositions.filter(p => p.status === 'open');
  const currentAssetFuturesPositions = openFuturesPositions.filter(p => p.assetId === currentFuturesAsset.id);

  return (
    <div className="flex flex-col h-full w-full bg-white font-sans overflow-hidden relative select-none">
      {/* Top Header: Account Type Switcher & Deposit Button */}
      <div className="px-3 pt-[max(env(safe-area-inset-top,0px),12px)] pb-1 flex justify-between items-center bg-white z-10 shrink-0">
        <div className="flex bg-gray-100 p-0.5 rounded-full text-[11px] font-bold w-40">
          <button 
            className={`flex-1 py-0.5 text-center rounded-full transition-all cursor-pointer ${accountType === 'real' ? 'bg-[#0088cc] text-white shadow-xs' : 'text-gray-500'}`}
            onClick={() => setAccountType('real')}
          >
            Real
          </button>
          <button 
            className={`flex-1 py-0.5 text-center rounded-full transition-all cursor-pointer ${accountType === 'demo' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'}`}
            onClick={() => setAccountType('demo')}
          >
            Demo
          </button>
        </div>
        
        {/* Direct Link to Dedicated Deposit Page */}
        <Link 
          to="/deposit"
          className="bg-emerald-50 hover:bg-[#00b067] border border-[#00b067] hover:text-white text-[#00b067] font-black px-3.5 py-0.5 rounded-full text-[11px] uppercase transition-all shadow-xs cursor-pointer flex items-center justify-center shrink-0 tracking-wide"
        >
          <span>Deposit</span>
        </Link>
      </div>

      {/* Balance Bar & Active Deals Counter */}
      <div className="px-3 py-0.5 flex items-baseline justify-between shrink-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Balance:</span>
          <span className="text-lg font-black text-[#00b067] tracking-tight">
            ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {accountType === 'demo' && balance <= 0 && (
            <button
              onClick={refillDemoBalance}
              className="text-[10px] font-bold text-[#0088cc] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full hover:bg-blue-100 transition-all cursor-pointer animate-pulse"
              title="Click to Refill Demo Balance"
            >
              Refill ₹10,000
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Active indicator */}
          {(tradingMode === 'binary' ? activeTradesCount : openFuturesPositions.length) > 0 && (
            <Link 
              to={tradingMode === 'futures' ? '/deals?mode=futures' : '/deals?mode=binary'} 
              className="flex items-center gap-1 bg-blue-50 border border-blue-200 text-[#0088cc] px-2 py-0.2 rounded-full text-[10px] font-bold animate-pulse"
              title="View Active Deals / PnL"
            >
              <Activity className="w-2.5 h-2.5" />
              <span>{tradingMode === 'binary' ? activeTradesCount : openFuturesPositions.length} Active</span>
            </Link>
          )}

          <Link 
            to="/history" 
            className="text-gray-400 hover:text-[#0088cc] p-0.5 rounded hover:bg-gray-100 transition-colors cursor-pointer"
            title="Transaction History"
          >
            <History className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Mode Specific Asset Header */}
      {tradingMode === 'binary' ? (
        /* BINARY ASSET BAR */
        <div className="px-3 py-1 flex gap-1.5 items-center relative z-20 shrink-0 border-b border-gray-100">
          {/* Expanded Asset Selector Button */}
          <Link 
            to="/assets" 
            className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg flex-1 font-bold text-gray-800 text-xs transition-colors truncate min-w-0"
          >
            <AssetLogo symbol={currentAsset.symbol} name={currentAsset.name} size={18} />
            <span className="truncate text-xs font-black text-gray-900">{currentAsset.name}</span>
            <span className="text-[#00b067] font-black text-[9px] bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 ml-auto shrink-0">
              {(currentAsset.profitMargin * 100).toFixed(0)}%
            </span>
            <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
          </Link>

          {/* Compact Single Timeframe Dropdown Button */}
          <div className="relative shrink-0">
            <button 
              onClick={() => {
                setShowTimeFramePicker(!showTimeFramePicker);
                setShowChartType(false);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-extrabold transition-all cursor-pointer ${
                showTimeFramePicker 
                  ? 'bg-[#0088cc] text-white border-[#0088cc] shadow-xs' 
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
              }`}
              title="Select Chart Candle Timeframe"
            >
              <Clock className="w-3 h-3 shrink-0" />
              <span>{chartTimeFrame}</span>
              <ChevronDown className={`w-2.5 h-2.5 transition-transform ${showTimeFramePicker ? 'rotate-180 text-white' : 'text-gray-400'}`} />
            </button>

            {/* Timeframe Dropdown Selector Menu */}
            {showTimeFramePicker && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setShowTimeFramePicker(false)} 
                />
                <div className="absolute top-10 right-0 z-40 bg-white border border-gray-200 shadow-2xl rounded-2xl p-1.5 flex flex-col gap-1 w-44 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    Candle Timeframe
                  </div>
                  {TIMEFRAME_OPTIONS.map(tf => (
                    <button
                      key={tf.id}
                      onClick={() => {
                        setChartTimeFrame(tf.id);
                        setShowTimeFramePicker(false);
                      }}
                      className={`px-2.5 py-2 text-left rounded-xl transition-all cursor-pointer flex items-center justify-between ${
                        chartTimeFrame === tf.id 
                          ? 'bg-blue-50 text-[#0088cc] font-black' 
                          : 'text-gray-700 hover:bg-gray-100 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold w-7 text-center bg-gray-100 text-gray-800 rounded px-1 py-0.5 text-[10px]">
                          {tf.label}
                        </span>
                        <span className="text-xs">{tf.title}</span>
                      </div>
                      {chartTimeFrame === tf.id && (
                        <Check className="w-3.5 h-3.5 text-[#0088cc]" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Chart Style, Theme & Sound Toolbar */}
          <div className="flex gap-1 shrink-0">
            <button 
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${showChartType ? 'bg-[#0088cc] text-white border-[#0088cc]' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
              onClick={() => {
                setShowChartType(!showChartType);
                setShowTimeFramePicker(false);
              }}
              title="Chart Type"
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
            <button 
              className="p-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 transition-colors cursor-pointer"
              onClick={() => setChartTheme(chartTheme === 'light' ? 'dark' : 'light')}
              title="Toggle Light/Dark Canvas"
            >
              {chartTheme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            </button>
            <button 
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${soundEnabled ? 'bg-emerald-50 text-[#00b067] border-emerald-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}
              onClick={toggleSound}
              title="Audio FX"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      ) : (
        /* FUTURES (20X) ASSET BAR */
        <div className="px-3 py-1 flex gap-1.5 items-center relative z-20 shrink-0 border-b border-gray-100 bg-white">
          {/* Expanded Futures Asset Selector */}
          <Link 
            to="/assets" 
            className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg flex-1 font-bold text-gray-800 text-xs transition-colors truncate min-w-0"
          >
            <AssetLogo symbol={currentFuturesAsset.symbol.split('/')[0]} name={currentFuturesAsset.name} size={18} />
            <div className="truncate flex items-center gap-1.5 min-w-0">
              <span className="truncate text-xs font-black text-gray-900">{currentFuturesAsset.name}</span>
              <span className="text-[10px] font-mono text-gray-500 font-bold uppercase">{currentFuturesAsset.symbol}</span>
            </div>
            <span className="text-amber-900 font-black text-[9px] bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300 ml-auto shrink-0">
              20X
            </span>
            <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
          </Link>

          {/* Manual Timeframe Dropdown for Futures (No auto-favorites; user switches manually) */}
          <div className="relative shrink-0">
            <button 
              onClick={() => {
                setShowFuturesTimeFramePicker(!showFuturesTimeFramePicker);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-extrabold transition-all cursor-pointer ${
                showFuturesTimeFramePicker 
                  ? 'bg-[#0088cc] text-white border-[#0088cc] shadow-xs' 
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
              }`}
              title="Select Chart Timeframe (Manual)"
            >
              <Clock className="w-3 h-3 shrink-0" />
              <span>{FUTURES_TIMEFRAME_OPTIONS.find(o => o.id === futuresTimeFrame)?.label || '1m'}</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60 shrink-0" />
            </button>

            {showFuturesTimeFramePicker && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setShowFuturesTimeFramePicker(false)} 
                />
                <div className="absolute top-8 right-0 z-40 bg-white border border-gray-200 shadow-xl rounded-xl p-1.5 flex flex-col gap-1 w-36 text-xs animate-in fade-in slide-in-from-top-2">
                  <div className="px-2 py-1 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    Select Timeframe
                  </div>
                  {FUTURES_TIMEFRAME_OPTIONS.map((tf) => (
                    <button
                      key={tf.id}
                      onClick={() => {
                        triggerHaptic('light');
                        setFuturesTimeFrame(tf.id);
                        setShowFuturesTimeFramePicker(false);
                      }}
                      className={`px-2.5 py-1.5 text-left rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                        futuresTimeFrame === tf.id
                          ? 'bg-blue-50 text-[#0088cc] font-black'
                          : 'text-gray-700 hover:bg-gray-100 font-medium'
                      }`}
                    >
                      <span>{tf.label}</span>
                      <span className="text-[10px] text-gray-400">{tf.title}</span>
                      {futuresTimeFrame === tf.id && (
                        <Check className="w-3 h-3 text-[#0088cc]" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Theme & Sound Toggles */}
          <div className="flex gap-1 shrink-0">
            <button 
              className="p-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 transition-colors cursor-pointer"
              onClick={() => setChartTheme(chartTheme === 'light' ? 'dark' : 'light')}
              title="Toggle Light/Dark Chart"
            >
              {chartTheme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            </button>
            <button 
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${soundEnabled ? 'bg-emerald-50 text-[#00b067] border-emerald-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}
              onClick={toggleSound}
              title="Audio FX"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Chart Type Selector Dropdown Menu for Binary */}
      {tradingMode === 'binary' && showChartType && (
        <>
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setShowChartType(false)} 
          />
          <div className="absolute top-[108px] right-3 z-40 bg-white border border-gray-200 shadow-xl rounded-xl p-1.5 flex flex-col gap-1 w-36 text-xs animate-in fade-in slide-in-from-top-2">
            {[
              { id: 'candle', label: 'Candlesticks' },
              { id: 'area', label: 'Area Line' },
              { id: 'bars', label: 'Classic Bars' },
              { id: 'heikin', label: 'Heikin-Ashi' }
            ].map(ct => (
              <button
                key={ct.id}
                onClick={() => { setChartType(ct.id as any); setShowChartType(false); }}
                className={`px-3 py-1.5 text-left rounded-lg transition-colors cursor-pointer flex items-center justify-between ${chartType === ct.id ? 'bg-blue-50 text-[#0088cc] font-black' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <span>{ct.label}</span>
                {chartType === ct.id && <span className="w-1.5 h-1.5 rounded-full bg-[#0088cc]" />}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Main Chart Area */}
      <div className="flex-1 min-h-0 w-full relative bg-slate-950 overflow-hidden">
        {tradingMode === 'binary' ? (
          /* Custom Binary Candlestick Chart */
          <CandlestickChart
            assetId={currentAsset.id}
            assetSymbol={currentAsset.symbol}
            assetName={currentAsset.name}
            currentPrice={currentAsset.price}
            timeFrame={chartTimeFrame}
            chartType={chartType}
            activeTrades={assetActiveTrades}
            theme={chartTheme}
            onTradeSignal={handleTrade}
          />
        ) : (
          /* OFFICIAL TRADINGVIEW REAL-TIME CHART (ONLY TRADINGVIEW AS REQUESTED) */
          <TradingViewChart 
            tvSymbol={currentFuturesAsset.tvSymbol} 
            theme={chartTheme} 
            interval={futuresTimeFrame}
          />
        )}
      </div>

      {/* Open Futures Positions Floating Quick Strip */}
      {tradingMode === 'futures' && currentAssetFuturesPositions.length > 0 && (
        <div className="bg-slate-900 border-t border-slate-800 px-3 py-1.5 flex items-center justify-between text-xs z-20 shrink-0">
          <Link 
            to="/deals?mode=futures" 
            className="flex items-center gap-2 hover:opacity-85 transition-opacity cursor-pointer"
            title="View Position Details & PnL"
          >
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
              currentAssetFuturesPositions[0].type === 'LONG' ? 'bg-[#00b067] text-white' : 'bg-[#ff3b30] text-white'
            }`}>
              {currentAssetFuturesPositions[0].type} 20X
            </span>
            <div className="text-[11px] font-mono text-gray-300">
              Entry: {currentAssetFuturesPositions[0].entryPrice.toLocaleString()}
            </div>
            <span className="text-[10px] text-[#0088cc] font-bold">Details &rarr;</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className={`font-mono font-black text-xs ${
              currentAssetFuturesPositions[0].pnl >= 0 ? 'text-[#00b067]' : 'text-[#ff3b30]'
            }`}>
              {currentAssetFuturesPositions[0].pnl >= 0 ? '+' : ''}₹{currentAssetFuturesPositions[0].pnl.toFixed(2)} ({currentAssetFuturesPositions[0].pnlPercent >= 0 ? '+' : ''}{currentAssetFuturesPositions[0].pnlPercent.toFixed(1)}%)
            </span>
            <button
              onClick={() => closeFuturesPosition(currentAssetFuturesPositions[0].id)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-gray-200 text-[10px] font-bold border border-slate-700 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Bottom Trading Controls */}
      {tradingMode === 'binary' ? (
        /* BINARY CONTROLS (Duration + Amount + Call / Put) */
        <div className="bg-white border-t border-gray-100 p-2 shrink-0 z-20 space-y-1.5">
          {/* Controls Row: Duration & Amount */}
          <div className="flex gap-1.5">
            {/* Trade Duration Selector */}
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-1 flex flex-col justify-between relative">
              <div className="flex justify-between items-center text-[9px] font-bold text-gray-400 uppercase tracking-wider px-1">
                <span>Duration</span>
                <button 
                  onClick={() => setShowDurationPicker(true)}
                  className="text-[#0088cc] hover:underline font-mono font-bold flex items-center gap-0.5 cursor-pointer"
                >
                  <span>{currentDuration.label}</span>
                  <ChevronDown className="w-2 h-2" />
                </button>
              </div>
              
              <div className="flex items-center justify-between mt-0.5">
                <button 
                  onClick={() => handleDurationStep(-1)}
                  disabled={durationIndex === 0}
                  className="w-6 h-6 bg-white hover:bg-gray-100 disabled:opacity-30 border border-gray-200 rounded flex items-center justify-center text-gray-700 active:scale-95 transition-transform cursor-pointer"
                  title="Shorter Duration"
                >
                  <Minus className="w-3 h-3" />
                </button>
                
                <button
                  onClick={() => setShowDurationPicker(true)}
                  className="font-mono font-black text-xs text-gray-900 hover:text-[#0088cc] transition-colors cursor-pointer px-1 py-0.5 rounded"
                  title="Click to pick duration"
                >
                  {currentDuration.display}
                </button>
                
                <button 
                  onClick={() => handleDurationStep(1)}
                  disabled={durationIndex === DURATION_OPTIONS.length - 1}
                  className="w-6 h-6 bg-white hover:bg-gray-100 disabled:opacity-30 border border-gray-200 rounded flex items-center justify-center text-gray-700 active:scale-95 transition-transform cursor-pointer"
                  title="Longer Duration"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Amount Selector */}
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-1 flex flex-col justify-between">
              <div className="flex justify-between items-center text-[9px] font-bold text-gray-400 uppercase tracking-wider px-1">
                <span>Investment</span>
                <span className="text-[#00b067] font-mono">+₹{expectedProfit.toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between mt-0.5 gap-1">
                <button 
                  onClick={() => handleAmountChange(-50)}
                  disabled={amount <= MIN_AMOUNT}
                  className="w-6 h-6 bg-white hover:bg-gray-100 disabled:opacity-30 border border-gray-200 rounded flex items-center justify-center text-gray-700 active:scale-95 transition-transform cursor-pointer shrink-0"
                  title="Decrease Amount"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <div className="flex-1 min-w-0 flex items-center justify-center bg-white border border-gray-200 focus-within:border-[#0088cc] focus-within:ring-1 focus-within:ring-[#0088cc]/30 rounded px-1 py-0.5 transition-all">
                  <span className="text-gray-500 font-mono font-black text-xs select-none mr-0.5">₹</span>
                  <input 
                    type="number"
                    inputMode="numeric"
                    value={amountInput}
                    onChange={handleAmountInputChange}
                    onBlur={handleAmountInputBlur}
                    min={MIN_AMOUNT}
                    max={MAX_AMOUNT}
                    className="w-full text-center font-mono font-black text-xs text-gray-900 bg-transparent outline-none border-none p-0 appearance-none"
                    placeholder="Amount"
                  />
                </div>
                <button 
                  onClick={() => handleAmountChange(50)}
                  disabled={amount >= MAX_AMOUNT}
                  className="w-6 h-6 bg-white hover:bg-gray-100 disabled:opacity-30 border border-gray-200 rounded flex items-center justify-center text-gray-700 active:scale-95 transition-transform cursor-pointer shrink-0"
                  title="Increase Amount"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Amount Preset Chips */}
          <div className="flex gap-1 justify-between">
            {[50, 100, 200, 500, 1000, 2000].map((amt) => (
              <button
                key={amt}
                onClick={() => setFixedAmount(amt)}
                className={`flex-1 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                  amount === amt
                    ? 'border-[#0088cc] bg-blue-50 text-[#0088cc] shadow-xs'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                ₹{amt}
              </button>
            ))}
          </div>

          {/* Action Buttons: UP (CALL) & DOWN (PUT) */}
          <div className="flex gap-2 pt-0.5">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => handleTrade('PUT')}
              disabled={isPlacingTrade || balance < amount}
              className="flex-1 bg-gradient-to-r from-[#ff3b30] to-[#e62e24] hover:from-[#e62e24] hover:to-[#ff3b30] disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
            >
              <TrendingDown className="w-4 h-4 fill-white" />
              <div className="text-left leading-tight">
                <div className="text-[9px] font-bold opacity-90 uppercase">Put Option</div>
                <div className="text-xs font-black tracking-wide">{isPlacingTrade ? 'PLACING...' : 'DOWN ▼'}</div>
              </div>
            </motion.button>

            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => handleTrade('CALL')}
              disabled={isPlacingTrade || balance < amount}
              className="flex-1 bg-gradient-to-r from-[#00b067] to-[#009657] hover:from-[#009657] hover:to-[#00b067] disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
            >
              <TrendingUp className="w-4 h-4 fill-white" />
              <div className="text-left leading-tight">
                <div className="text-[9px] font-bold opacity-90 uppercase">Call Option</div>
                <div className="text-xs font-black tracking-wide">{isPlacingTrade ? 'PLACING...' : 'UP ▲'}</div>
              </div>
            </motion.button>
          </div>
        </div>
      ) : (
        /* FUTURES (20X) CONTROLS: ONLY BUY & SELL BUTTONS AS REQUESTED */
        <div className="bg-white border-t border-gray-100 p-3 shrink-0 z-20">
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mb-2 px-1">
            <div className="flex items-center gap-1.5">
              <span>Mark Price:</span>
              <span className="font-mono font-black text-gray-900">
                {currentFuturesAsset.currencySymbol}
                {currentFuturesAsset.price.toLocaleString('en-US', { minimumFractionDigits: currentFuturesAsset.precision, maximumFractionDigits: currentFuturesAsset.precision })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-400">Leverage:</span>
              <span className="bg-amber-100 text-amber-900 border border-amber-300 font-mono font-black px-1.5 py-0.2 rounded text-[10px]">
                20X
              </span>
            </div>
          </div>

          <div className="flex gap-2.5">
            {/* SELL / SHORT 20X BUTTON */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => openFuturesOrder('SHORT')}
              className="flex-1 bg-gradient-to-r from-[#ff3b30] to-[#dc2626] hover:from-[#dc2626] hover:to-[#ff3b30] text-white py-3 rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-rose-500/25 transition-all cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <ArrowDownRight className="w-5 h-5 text-white" />
              </div>
              <div className="text-left leading-tight">
                <div className="text-[9px] font-bold text-rose-100 uppercase tracking-wider">Short</div>
                <div className="text-sm font-black tracking-wide">SELL (20X)</div>
              </div>
            </motion.button>

            {/* BUY / LONG 20X BUTTON */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => openFuturesOrder('LONG')}
              className="flex-1 bg-gradient-to-r from-[#00b067] to-[#059669] hover:from-[#059669] hover:to-[#00b067] text-white py-3 rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-white" />
              </div>
              <div className="text-left leading-tight">
                <div className="text-[9px] font-bold text-emerald-100 uppercase tracking-wider">Long</div>
                <div className="text-sm font-black tracking-wide">BUY (20X)</div>
              </div>
            </motion.button>
          </div>
        </div>
      )}

      {/* Futures Order Pad (On-Screen Tab Modal) */}
      <FuturesOrderPad
        isOpen={isFuturesPadOpen}
        onClose={() => setIsFuturesPadOpen(false)}
        orderType={futuresOrderType}
        asset={currentFuturesAsset}
        balance={balance}
        accountType={accountType}
        onPlaceOrder={(params) => {
          return placeFuturesOrder(params);
        }}
      />

      {/* Binary Trade Duration Quick Selector Modal */}
      <AnimatePresence>
        {showDurationPicker && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs"
          >
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-[#0088cc]" />
                  <h3 className="text-sm font-black text-gray-900">Trade Expiry Duration</h3>
                </div>
                <button 
                  onClick={() => setShowDurationPicker(false)}
                  className="text-xs font-bold text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {DURATION_OPTIONS.map((opt, idx) => (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    key={opt.seconds}
                    onClick={() => {
                      setDurationIndex(idx);
                      setShowDurationPicker(false);
                    }}
                    className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      durationIndex === idx
                        ? 'border-[#0088cc] bg-blue-50 text-[#0088cc] shadow-xs'
                        : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-800'
                    }`}
                  >
                    <span className="text-sm font-black">{opt.label}</span>
                    <span className="text-[10px] font-mono text-gray-400 mt-0.5">{opt.display}</span>
                  </motion.button>
                ))}
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowDurationPicker(false)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-black rounded-xl transition-colors cursor-pointer"
              >
                Done
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Binary Trade Result Notification Popup Banner */}
      <AnimatePresence>
        {lastTradeResult && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute inset-x-3 top-16 z-50"
          >
            <div className={`p-3 rounded-2xl shadow-xl flex items-center justify-between text-white border ${
              lastTradeResult.won ? 'bg-gradient-to-r from-[#00b067] to-emerald-700 border-emerald-400' : 'bg-gradient-to-r from-[#ff3b30] to-rose-700 border-rose-400'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  {lastTradeResult.won ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-xs font-black">
                    {lastTradeResult.won ? `TRADE WON (+₹${lastTradeResult.profit.toFixed(2)})` : 'TRADE EXPIRED'}
                  </div>
                  <div className="text-[11px] font-mono opacity-95">
                    {lastTradeResult.won 
                      ? `₹${(lastTradeResult.amount + lastTradeResult.profit).toFixed(2)} Total Payout Credited` 
                      : `-₹${lastTradeResult.amount.toFixed(2)} Stake Expired`}
                  </div>
                </div>
              </div>
              <button 
                onClick={dismissTradeResult}
                className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
