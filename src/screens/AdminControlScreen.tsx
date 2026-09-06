import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Radio, 
  ArrowLeft, 
  RefreshCw, 
  ShieldCheck, 
  Zap, 
  Clock, 
  CheckCircle, 
  Flame, 
  Users, 
  Sliders, 
  Sparkles,
  Search,
  DollarSign,
  Send,
  Lock,
  Unlock,
  AlertTriangle,
  UserCheck,
  CreditCard,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  Check,
  X,
  Crown,
  PlayCircle,
  Trash2
} from 'lucide-react';

interface ActiveTradeItem {
  id: string;
  userId: string;
  assetId: string;
  assetName: string;
  amount: number;
  type: 'CALL' | 'PUT';
  entryPrice: number;
  strikeTime: number;
  accountType: 'real' | 'demo';
  createdAt: number;
}

interface AssetSummary {
  assetId: string;
  assetName: string;
  symbol: string;
  price: number;
  totalVolume: number;
  totalTrades: number;
  buyVolume: number;
  buyCount: number;
  sellVolume: number;
  sellCount: number;
  override: 'AUTO' | 'BUY' | 'SELL';
  overrideExpiresAt: number;
}

interface MasterAccountConfig {
  email: string;
  enabled: boolean;
  driveGlobalCandles: boolean;
  winRate: number;
}

interface PlatformAnalytics {
  totalUsers: number;
  activeTradersToday: number;
  openLiveTradesCount: number;
  todayDeposits: number;
  todayWithdrawals: number;
  todayPendingWithdrawals: number;
  todayNetInflow: number;
  monthlyDeposits: number;
  monthlyWithdrawals: number;
  monthlyNetInflow: number;
  lifetimeDeposits: number;
  lifetimeWithdrawals: number;
  totalUserBalances: number;
  platformNetProfit: number;
  isProfit: boolean;
  currentMargin: number;
  masterAccount?: MasterAccountConfig;
  autoProfitAlgorithm: {
    enabled: boolean;
    targetMargin: number;
    currentStatus: string;
    action: string;
    dynamicWinRate: number;
  };
}

interface UserItem {
  email: string;
  name: string;
  balance: number;
  wagerTarget: number;
  wagerCurrent: number;
  hasDeposited: boolean;
  winRate?: number;
  isRiskFree?: boolean;
  isBlocked?: boolean;
  referralCount?: number;
  referralBonus?: number;
}

interface TransactionItem {
  id: string;
  userId: string;
  type: string;
  amount: number;
  status: string;
  date: string;
  description?: string;
  utr?: string;
  upiId?: string;
}

export const AdminControlScreen: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'master' | 'analytics' | 'autoprofit' | 'traders' | 'transactions' | 'signals'>('master');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [transactionsList, setTransactionsList] = useState<TransactionItem[]>([]);
  const [assetSummaries, setAssetSummaries] = useState<AssetSummary[]>([]);
  const [activeTrades, setActiveTrades] = useState<ActiveTradeItem[]>([]);
  
  // Master Account State
  const [masterConfig, setMasterConfig] = useState<MasterAccountConfig>({
    email: 'tnxjatavji@gmail.com',
    enabled: true,
    driveGlobalCandles: true,
    winRate: 1.0
  });
  const [masterEmailInput, setMasterEmailInput] = useState('tnxjatavji@gmail.com');

  // Controls & Filters
  const [searchUser, setSearchUser] = useState('');
  const [searchAsset, setSearchAsset] = useState('');
  const [searchTx, setSearchTx] = useState('');
  const [txFilter, setTxFilter] = useState<'all' | 'deposit' | 'withdraw' | 'pending'>('all');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [targetEmail, setTargetEmail] = useState('');
  const [customWinRate, setCustomWinRate] = useState('90');
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTimerRef = useRef<any>(null);

  const fetchAllData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [monitorRes, allDataRes, masterRes] = await Promise.all([
        fetch('/api/admin/live_monitor').catch(() => null),
        fetch('/api/admin/all_data').catch(() => null),
        fetch('/api/admin/master_account').catch(() => null)
      ]);

      if (monitorRes) {
        const monitorData = await monitorRes.json();
        if (monitorData.success) {
          setAssetSummaries(monitorData.assets || []);
          setActiveTrades(monitorData.activeTrades || []);
        }
      }

      if (allDataRes) {
        const allData = await allDataRes.json();
        if (allData.success) {
          setAnalytics(allData.analytics);
          setUsersList(allData.users || []);
          setTransactionsList(allData.transactions || []);
          if (allData.analytics?.masterAccount) {
            setMasterConfig(allData.analytics.masterAccount);
            setMasterEmailInput(allData.analytics.masterAccount.email);
          }
        }
      }

      if (masterRes) {
        const masterData = await masterRes.json();
        if (masterData.success && masterData.config) {
          setMasterConfig(masterData.config);
          setMasterEmailInput(masterData.config.email);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch admin data:", e);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    fetchTimerRef.current = setInterval(() => {
      fetchAllData();
    }, 2500);

    const clockInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      clearInterval(fetchTimerRef.current);
      clearInterval(clockInterval);
    };
  }, []);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleShareTelegramReport = async () => {
    try {
      const res = await fetch('/api/admin/share_telegram_report', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast("📢 Live Financial & Profit Report sent to Telegram bot!");
      }
    } catch (e: any) {
      showToast("Error sending Telegram report: " + e.message);
    }
  };

  const handleSaveMasterConfig = async (overrideParams?: Partial<MasterAccountConfig>) => {
    try {
      const updated = {
        ...masterConfig,
        email: masterEmailInput.trim().toLowerCase(),
        ...overrideParams
      };
      const res = await fetch('/api/admin/master_account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data.success) {
        setMasterConfig(data.config);
        showToast(`👑 Master Account updated: ${data.config.email}`);
      }
    } catch (e: any) {
      showToast("Error updating master account: " + e.message);
    }
  };

  const handleToggleAutoProfit = async (enable: boolean, margin?: number) => {
    try {
      const body: any = { enabled: enable };
      if (typeof margin === 'number') body.targetMargin = margin;
      const res = await fetch('/api/admin/auto_profit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.analytics);
        showToast(enable ? "⚡ Auto-Profit Algorithm Activated!" : "Auto-Profit Algorithm Paused");
      }
    } catch (e: any) {
      showToast("Error configuring algorithm: " + e.message);
    }
  };

  const handleSetDirection = async (assetId: string, direction: 'AUTO' | 'BUY' | 'SELL') => {
    try {
      const res = await fetch('/api/admin/set_market_direction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, direction, durationSeconds: 60 })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Signal set to ${direction} for 1 Minute!`);
        fetchAllData();
      }
    } catch (e: any) {
      showToast("Error updating signal: " + e.message);
    }
  };

  const handleSetWinRate = async (email: string, winRatePercent: number) => {
    try {
      const res = await fetch('/api/admin/set_win_rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, winRate: winRatePercent })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Win rate set to ${winRatePercent}% for ${email}`);
        fetchAllData();
      } else {
        showToast("Failed: " + (data.message || "Unknown error"));
      }
    } catch (e: any) {
      showToast("Error setting win rate: " + e.message);
    }
  };

  const handleDeleteUser = async (email: string) => {
    try {
      setIsDeleting(true);
      const res = await fetch('/api/admin/delete_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🗑️ User account ${email} permanently deleted`);
        setUserToDelete(null);
        fetchAllData();
      } else {
        showToast("Failed to delete user: " + (data.message || "Unknown error"));
      }
    } catch (e: any) {
      showToast("Error deleting user: " + e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendLogoTelegram = async () => {
    try {
      showToast("Sending TradeXora 3D Logo to Telegram Bot...");
      const res = await fetch('/api/admin/send_logo_telegram', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast("✨ TradeXora Logo sent to Telegram successfully!");
      } else {
        showToast("Failed to send logo: " + (data.error || "Unknown error"));
      }
    } catch (e: any) {
      showToast("Error: " + e.message);
    }
  };

  const filteredUsers = usersList.filter(u => {
    const q = searchUser.toLowerCase();
    return u.email.toLowerCase().includes(q) || (u.name && u.name.toLowerCase().includes(q));
  });

  const filteredTransactions = transactionsList.filter(t => {
    const q = searchTx.toLowerCase();
    const matchesSearch = (t.userId && t.userId.toLowerCase().includes(q)) ||
      (t.utr && t.utr.toLowerCase().includes(q)) ||
      (t.id && t.id.toLowerCase().includes(q));
    
    if (!matchesSearch) return false;
    if (txFilter === 'all') return true;
    if (txFilter === 'deposit') return t.type === 'deposit';
    if (txFilter === 'withdraw') return t.type === 'withdraw';
    if (txFilter === 'pending') return t.status === 'pending';
    return true;
  });

  const filteredAssets = assetSummaries.filter(a => 
    a.assetName.toLowerCase().includes(searchAsset.toLowerCase()) || 
    a.symbol.toLowerCase().includes(searchAsset.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#090d16] text-slate-100 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#0c121e]/95 backdrop-blur border-b border-slate-800/80 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="w-8 h-8 rounded-lg bg-slate-800/90 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition active:scale-95 shrink-0"
            title="Back to Trading"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-base text-white tracking-tight flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                Trade<span className="text-[#0088cc]">Xora</span>
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Master Operating Portal
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Financials, Auto-Profit & Global Candlestick Driver</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSendLogoTelegram}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-xs font-bold transition active:scale-95 shadow-sm"
            title="Send 3D TradeXora Brand Logo to Telegram Bot"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send Logo TG</span>
          </button>

          <button
            onClick={handleShareTelegramReport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0088cc]/20 border border-[#0088cc]/40 text-[#0088cc] hover:bg-[#0088cc]/30 text-xs font-bold transition active:scale-95 shadow-sm"
            title="Push Latest Report to Telegram Bot"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Push Telegram</span>
          </button>

          <button 
            onClick={() => fetchAllData(true)}
            disabled={refreshing}
            className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition active:scale-95 shrink-0"
            title="Refresh All Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-[#0b101c] border-b border-slate-800/80 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full">
        <button
          onClick={() => setActiveTab('master')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
            activeTab === 'master'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Crown className="w-3.5 h-3.5" />
          <span>👑 Master Candle Driver</span>
          {masterConfig.enabled && masterConfig.driveGlobalCandles && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
            activeTab === 'analytics'
              ? 'bg-[#0088cc] text-white shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Financials & PnL</span>
        </button>

        <button
          onClick={() => setActiveTab('autoprofit')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
            activeTab === 'autoprofit'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Auto-Profit Engine</span>
          {analytics?.autoProfitAlgorithm?.enabled && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('traders')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
            activeTab === 'traders'
              ? 'bg-[#0088cc] text-white shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>All Traders ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
            activeTab === 'transactions'
              ? 'bg-[#0088cc] text-white shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Ledger & Cash Flow</span>
        </button>

        <button
          onClick={() => setActiveTab('signals')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
            activeTab === 'signals'
              ? 'bg-[#0088cc] text-white shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>1-Min Signals ({activeTrades.length})</span>
        </button>
      </div>

      {/* Toast Feedback */}
      {statusMessage && (
        <div className="fixed top-16 right-4 left-4 sm:left-auto sm:w-96 z-50 bg-emerald-950/95 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold backdrop-blur animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-4 max-w-7xl mx-auto w-full">

        {/* TAB 0: MASTER DEMO ACCOUNT & GLOBAL CANDLESTICK DRIVER */}
        {activeTab === 'master' && (
          <div className="space-y-4">
            {/* Master Driver Overview Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 shadow-xl shadow-amber-500/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-400" />
                    <h2 className="text-base sm:text-lg font-black text-white">Master Demo Account & Candlestick Driver</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Synchronizer Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                    Whenever you trade from this Master Demo account, <b className="text-emerald-400">CALL (BUY)</b> guides natural <b className="text-emerald-400">BUY MOMENTUM</b> across user screens, and <b className="text-rose-400">PUT (SELL)</b> guides <b className="text-rose-400">SELL MOMENTUM</b> across the entire platform.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Candle Sync</span>
                    <span className={`text-xs font-black ${masterConfig.driveGlobalCandles ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {masterConfig.driveGlobalCandles ? '🟢 Active (Drives All Users)' : '⚪ Inactive'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleSaveMasterConfig({ driveGlobalCandles: !masterConfig.driveGlobalCandles })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 ${
                      masterConfig.driveGlobalCandles 
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {masterConfig.driveGlobalCandles ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* Master Configuration Controls */}
              <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                    Designated Master Demo Account Email
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="email"
                      value={masterEmailInput}
                      onChange={(e) => setMasterEmailInput(e.target.value)}
                      placeholder="e.g. tnxjatavji@gmail.com"
                      className="flex-1 bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={() => handleSaveMasterConfig({ email: masterEmailInput })}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition active:scale-95 shrink-0"
                    >
                      Save Master
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">House PnL Liability Protection</span>
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    100% Excluded from Platform PnL
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Demo trades never count against house profit</span>
                </div>
              </div>
            </div>

            {/* Quick 1-Click Forced Candle Controls */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <h3 className="text-sm font-bold text-white">Direct 1-Minute Global Candle Overrides</h3>
                </div>
                <span className="text-xs text-slate-400">Instant real-time chart control for all users</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {assetSummaries.slice(0, 6).map((asset) => {
                  const isOverridden = asset.override && asset.override !== 'AUTO' && asset.overrideExpiresAt > currentTime;
                  const remainingSec = isOverridden ? Math.max(0, Math.ceil((asset.overrideExpiresAt - currentTime) / 1000)) : 0;

                  return (
                    <div 
                      key={asset.assetId}
                      className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition space-y-2.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-black text-white block">{asset.assetName}</span>
                          <span className="text-[11px] font-mono text-slate-400">₹{asset.price.toFixed(2)}</span>
                        </div>
                        {isOverridden ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            asset.override === 'BUY' 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            ⚡ {asset.override === 'BUY' ? 'GREEN CANDLE' : 'RED CANDLE'} ({remainingSec}s)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                            AUTO DRIFT
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => handleSetDirection(asset.assetId, 'BUY')}
                          className="py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] transition active:scale-95 flex items-center justify-center gap-1 shadow-sm"
                          title="Signals smooth BUY momentum for 1 minute"
                        >
                          <TrendingUp className="w-3 h-3" />
                          <span>BUY (1m)</span>
                        </button>
                        <button
                          onClick={() => handleSetDirection(asset.assetId, 'SELL')}
                          className="py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-[11px] transition active:scale-95 flex items-center justify-center gap-1 shadow-sm"
                          title="Signals smooth SELL momentum for 1 minute"
                        >
                          <TrendingDown className="w-3 h-3" />
                          <span>SELL (1m)</span>
                        </button>
                        <button
                          onClick={() => handleSetDirection(asset.assetId, 'AUTO')}
                          className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] transition active:scale-95"
                        >
                          Auto
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: FINANCIALS & PNL MASTER DASHBOARD */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            {/* Big Platform Profit / Deficit Status Banner */}
            <div className={`p-4 sm:p-5 rounded-2xl border ${
              analytics?.isProfit 
                ? 'bg-gradient-to-br from-emerald-950/60 via-[#0a1818] to-slate-900 border-emerald-500/40 shadow-emerald-500/10'
                : 'bg-gradient-to-br from-rose-950/60 via-[#180a0f] to-slate-900 border-rose-500/40 shadow-rose-500/10'
            } shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                    analytics?.isProfit 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${analytics?.isProfit ? 'bg-emerald-400' : 'bg-rose-400'} animate-ping`} />
                    {analytics?.isProfit ? 'PLATFORM IN NET HOUSE PROFIT' : 'AUTO-RECOVERY ALGORITHM ENGAGED'}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">House Margin: <b>+{analytics?.currentMargin || 0}%</b></span>
                </div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className={`text-3xl sm:text-4xl font-black ${analytics?.isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {analytics?.isProfit ? '+' : '-'}₹{(Math.abs(analytics?.platformNetProfit || 0)).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Net Retained House Profit</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Formula: Lifetime Deposits (₹{(analytics?.lifetimeDeposits || 0).toLocaleString('en-IN')}) minus Withdrawals (₹{(analytics?.lifetimeWithdrawals || 0).toLocaleString('en-IN')}) & Real User Balances. (Demo/Master trades excluded).
                </p>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={handleShareTelegramReport}
                  className="px-4 py-2 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white font-black text-xs transition active:scale-95 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Push Report to Telegram Bot</span>
                </button>
              </div>
            </div>

            {/* Financial Metrics Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Active Traders Today</span>
                <span className="text-xl font-black text-white block">{(analytics?.activeTradersToday || 0)} Traders</span>
                <span className="text-[10px] text-emerald-400 font-semibold block">{activeTrades.length} Open Deals Right Now</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Today's Deposits</span>
                <span className="text-xl font-black text-emerald-400 block">₹{(analytics?.todayDeposits || 0).toLocaleString('en-IN')}</span>
                <span className="text-[10px] text-slate-400 block">Today's Total Cash In</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Today's Withdrawals</span>
                <span className="text-xl font-black text-amber-400 block">₹{(analytics?.todayWithdrawals || 0).toLocaleString('en-IN')}</span>
                <span className="text-[10px] text-slate-400 block">Net Inflow: ₹{(analytics?.todayNetInflow || 0).toLocaleString('en-IN')}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Monthly Cash Inflow</span>
                <span className="text-xl font-black text-blue-400 block">₹{(analytics?.monthlyDeposits || 0).toLocaleString('en-IN')}</span>
                <span className="text-[10px] text-slate-400 block">Withdrawals: ₹{(analytics?.monthlyWithdrawals || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Lifetime Totals & Reserves */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-3">
              <h3 className="font-bold text-xs text-slate-300 uppercase tracking-wider">Lifetime Financial Ledger</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 block font-bold">Total Lifetime Deposits</span>
                  <span className="text-lg font-black text-emerald-400">₹{(analytics?.lifetimeDeposits || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 block font-bold">Total Withdrawals Paid Out</span>
                  <span className="text-lg font-black text-amber-400">₹{(analytics?.lifetimeWithdrawals || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 block font-bold">Active User Wallet Liability</span>
                  <span className="text-lg font-black text-blue-400">₹{(analytics?.totalUserBalances || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AUTO-PROFIT ALGORITHM ENGINE */}
        {activeTab === 'autoprofit' && (
          <div className="space-y-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-900 border border-emerald-500/30 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-base sm:text-lg font-black text-white">Auto-Profit Algorithm Engine</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      House Protector
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                    Continuously regulates platform-wide trading odds. If deposits drop or player wins spike, the algorithm automatically enforces a healthy house margin (+25%) so the house is always strictly profitable.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleAutoProfit(!analytics?.autoProfitAlgorithm?.enabled)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition active:scale-95 shadow-md ${
                      analytics?.autoProfitAlgorithm?.enabled
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {analytics?.autoProfitAlgorithm?.enabled ? '🟢 ENGINE ACTIVE' : '⚪ ENGINE PAUSED'}
                  </button>
                </div>
              </div>

              {/* Status details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Engine Mode</span>
                  <span className="text-xs font-black text-emerald-300 block mt-0.5">
                    {analytics?.autoProfitAlgorithm?.currentStatus || 'ACTIVE'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Target House Margin</span>
                  <span className="text-base font-black text-white block mt-0.5">
                    +{Math.round((analytics?.autoProfitAlgorithm?.targetMargin || 0.25) * 100)}% Profit Margin
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Dynamic Calibration Rate</span>
                  <span className="text-base font-black text-emerald-400 block mt-0.5">
                    {Math.round((analytics?.autoProfitAlgorithm?.dynamicWinRate || 0.45) * 100)}% Baseline Odds
                  </span>
                </div>
              </div>

              {/* Margin Preset Selectors */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-300 uppercase block">Set Target House Profit Margin</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[0.15, 0.20, 0.25, 0.30, 0.35, 0.40].map((marginVal) => {
                    const isSelected = Math.abs((analytics?.autoProfitAlgorithm?.targetMargin || 0.25) - marginVal) < 0.01;
                    return (
                      <button
                        key={marginVal}
                        onClick={() => handleToggleAutoProfit(true, marginVal)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        +{Math.round(marginVal * 100)}% House Profit
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ALL TRADERS & WIN RATES (A-to-Z) */}
        {activeTab === 'traders' && (
          <div className="space-y-4">
            {/* Quick Demo & Custom Win Rate Configurator Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/40 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                    Make Any Account Demo / Set Custom Win Rate
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                  Instant Overwrite
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-6">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Target Account Email</label>
                  <input
                    type="email"
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    placeholder="Enter any user email (e.g. user@gmail.com)"
                    className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Custom Win Rate (%)</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={customWinRate}
                      onChange={(e) => setCustomWinRate(e.target.value)}
                      placeholder="90"
                      className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-xs font-black text-slate-400">%</span>
                  </div>
                </div>

                <div className="sm:col-span-3 flex items-end gap-1.5">
                  <button
                    onClick={() => {
                      if (!targetEmail.trim()) {
                        showToast("Please enter an email address first");
                        return;
                      }
                      handleSetWinRate(targetEmail.trim(), parseInt(customWinRate) || 90);
                    }}
                    className="flex-1 py-2 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition active:scale-95 shadow-sm"
                  >
                    Set {customWinRate}% Win
                  </button>

                  <button
                    onClick={() => {
                      if (!targetEmail.trim()) {
                        showToast("Please enter an email address first");
                        return;
                      }
                      setMasterEmailInput(targetEmail.trim());
                      handleSaveMasterConfig({ 
                        email: targetEmail.trim(),
                        winRate: (parseInt(customWinRate) || 100) / 100,
                        driveGlobalCandles: true,
                        enabled: true
                      });
                      handleSetWinRate(targetEmail.trim(), parseInt(customWinRate) || 100);
                    }}
                    className="py-2 px-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition active:scale-95 shadow-sm shrink-0"
                    title="Make this account the Master Demo Candlestick Driver with custom win rate"
                  >
                    👑 Set Master
                  </button>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Quick Win Rate Presets:</span>
                {[50, 75, 85, 90, 95, 100].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setCustomWinRate(preset.toString())}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                      customWinRate === preset.toString()
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  placeholder="Search user by email or name..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <span className="text-xs text-slate-400 font-medium">Showing {filteredUsers.length} of {usersList.length} traders</span>
            </div>

            {/* Users List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredUsers.map((u) => {
                const isMaster = masterConfig.email.toLowerCase().trim() === u.email.toLowerCase().trim();
                const winRatePct = typeof u.winRate === 'number' ? Math.round(u.winRate * 100) : null;

                return (
                  <div 
                    key={u.email}
                    className={`p-3.5 rounded-xl border transition ${
                      isMaster 
                        ? 'bg-amber-950/20 border-amber-500/40 shadow-sm'
                        : 'bg-slate-900/70 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-white">{u.name || u.email.split('@')[0]}</span>
                          {isMaster && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              👑 MASTER DEMO
                            </span>
                          )}
                          {u.isRiskFree && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              🛡️ Risk-Free
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono block">{u.email}</span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-bold">Real Balance</span>
                        <span className="text-sm font-black text-emerald-400 font-mono">₹{u.balance.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2 flex-wrap text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400">Win Rate:</span>
                        <span className={`font-bold font-mono px-1.5 py-0.5 rounded text-[11px] ${
                          winRatePct && winRatePct >= 80 
                            ? 'bg-emerald-500/20 text-emerald-400 font-black' 
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {winRatePct !== null ? `${winRatePct}%` : 'Auto (Fair)'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSetWinRate(u.email, 90)}
                          className="px-2 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold transition active:scale-95"
                          title="Set 90% guaranteed win rate"
                        >
                          90% Win
                        </button>
                        <button
                          onClick={() => handleSetWinRate(u.email, 100)}
                          className="px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 rounded text-[10px] font-bold transition active:scale-95"
                          title="Set 100% win rate"
                        >
                          100% Win
                        </button>
                        <button
                          onClick={() => handleSetWinRate(u.email, 45)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold transition active:scale-95"
                          title="Reset to fair odds"
                        >
                          Reset
                        </button>
                        {!isMaster && (
                          <button
                            onClick={() => {
                              setMasterEmailInput(u.email);
                              handleSaveMasterConfig({ email: u.email });
                            }}
                            className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold transition active:scale-95"
                            title="Set as Master Demo account"
                          >
                            Set Master
                          </button>
                        )}
                        {!isMaster && (
                          <button
                            onClick={() => setUserToDelete(u.email)}
                            className="p-1 bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 border border-red-800/40 rounded transition active:scale-95"
                            title={`Delete user account ${u.email}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: DEPOSITS & LEDGER */}
        {activeTab === 'transactions' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  value={searchTx}
                  onChange={(e) => setSearchTx(e.target.value)}
                  placeholder="Search by User, UTR or TxID..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {(['all', 'deposit', 'withdraw', 'pending'] as const).map((filterType) => (
                  <button
                    key={filterType}
                    onClick={() => setTxFilter(filterType)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition ${
                      txFilter === filterType 
                        ? 'bg-[#0088cc] text-white' 
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {filterType}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {filteredTransactions.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-slate-500 text-xs">
                  No transaction records found matching search.
                </div>
              ) : (
                filteredTransactions.slice(0, 100).map((tx) => (
                  <div 
                    key={tx.id}
                    className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          tx.type === 'deposit' 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : tx.type === 'withdraw'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {tx.type}
                        </span>

                        <span className="text-xs font-bold text-white">{tx.userId}</span>

                        <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          tx.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : tx.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-400 animate-pulse'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {tx.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-3 flex-wrap">
                        {tx.utr && <span className="font-mono">UTR: <b>{tx.utr}</b></span>}
                        {tx.upiId && <span className="font-mono">UPI: <b>{tx.upiId}</b></span>}
                        <span>{new Date(tx.date).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-base font-black font-mono ${
                        tx.type === 'deposit' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {tx.type === 'deposit' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 5: 1-MINUTE SIGNALS & LIVE MATRIX */}
        {activeTab === 'signals' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
                <div>
                  <h3 className="font-bold text-sm text-white">Live 1-Sec Candlestick & Signal Matrix</h3>
                  <p className="text-xs text-slate-400">Active positions & forced 1-minute market overrides</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-slate-400 uppercase block">Active Deals</span>
                <span className="text-lg font-black text-white">{activeTrades.length} Positions</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAssets.map((asset) => {
                const isOverridden = asset.override && asset.override !== 'AUTO' && asset.overrideExpiresAt > currentTime;
                const remainingSec = isOverridden ? Math.max(0, Math.ceil((asset.overrideExpiresAt - currentTime) / 1000)) : 0;

                return (
                  <div 
                    key={asset.assetId}
                    className={`p-3.5 rounded-xl border transition ${
                      isOverridden
                        ? 'bg-slate-900/90 border-blue-500/50 shadow-lg shadow-blue-500/10'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-black text-sm text-white block">{asset.assetName}</span>
                        <span className="text-[11px] text-slate-400 font-mono">₹{asset.price.toFixed(2)}</span>
                      </div>

                      {isOverridden ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1 ${
                          asset.override === 'BUY'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          <Clock className="w-3 h-3" />
                          <span>{asset.override} ({remainingSec}s)</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                          AUTO MARKET
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 my-2.5 text-xs">
                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 block font-bold">Buy Stakes</span>
                        <span className="text-emerald-400 font-bold font-mono">₹{asset.buyVolume} ({asset.buyCount})</span>
                      </div>
                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 block font-bold">Sell Stakes</span>
                        <span className="text-rose-400 font-bold font-mono">₹{asset.sellVolume} ({asset.sellCount})</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <button
                        onClick={() => handleSetDirection(asset.assetId, 'BUY')}
                        className="py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] transition active:scale-95 shadow-sm"
                      >
                        Force BUY (1m)
                      </button>
                      <button
                        onClick={() => handleSetDirection(asset.assetId, 'SELL')}
                        className="py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-[11px] transition active:scale-95 shadow-sm"
                      >
                        Force SELL (1m)
                      </button>
                      <button
                        onClick={() => handleSetDirection(asset.assetId, 'AUTO')}
                        className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] transition active:scale-95"
                      >
                        AUTO
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 bg-red-950/60 rounded-xl border border-red-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Delete User Account?</h3>
                <p className="text-xs text-red-400 font-medium">Permanent & Irreversible Action</p>
              </div>
            </div>

            <p className="text-sm text-slate-300">
              Are you sure you want to permanently delete the account for:
            </p>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-amber-300 font-mono text-sm font-bold break-all">
              {userToDelete}
            </div>
            <p className="text-xs text-slate-400">
              This will remove all associated balances, trade logs, and credentials from the system database immediately.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUser(userToDelete)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-red-900/40 active:scale-95 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
