import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { 
  Newspaper, ArrowUpRight, Clock, ChevronRight,
  Calendar, Globe, TrendingUp, Building2, Landmark,
  BarChart2
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  time: string;
  currency: string;
  countryFlag: string;
  event: string;
  impact: 'HIGH' | 'MED' | 'LOW';
  actual: string;
  forecast: string;
  previous: string;
}

const ECONOMIC_CALENDAR: CalendarEvent[] = [
  {
    id: 'c1',
    time: '14:30 IST',
    currency: 'USD',
    countryFlag: '🇺🇸',
    event: 'US Core CPI Inflation Rate (YoY)',
    impact: 'HIGH',
    actual: '3.1%',
    forecast: '3.2%',
    previous: '3.3%'
  },
  {
    id: 'c2',
    time: '16:00 IST',
    currency: 'EUR',
    countryFlag: '🇪🇺',
    event: 'ECB Monetary Policy Interest Rate Decision',
    impact: 'HIGH',
    actual: '3.25%',
    forecast: '3.25%',
    previous: '3.50%'
  },
  {
    id: 'c3',
    time: '18:00 IST',
    currency: 'USD',
    countryFlag: '🇺🇸',
    event: 'Federal Reserve FOMC Meeting Minutes',
    impact: 'HIGH',
    actual: 'Hawkish Hold',
    forecast: 'Neutral',
    previous: 'Dovish'
  },
  {
    id: 'c4',
    time: '19:30 IST',
    currency: 'USD',
    countryFlag: '🇺🇸',
    event: 'US Non-Farm Payrolls (NFP)',
    impact: 'HIGH',
    actual: '215K',
    forecast: '180K',
    previous: '165K'
  },
  {
    id: 'c5',
    time: '20:15 IST',
    currency: 'GBP',
    countryFlag: '🇬🇧',
    event: 'Bank of England Governor Speech',
    impact: 'MED',
    actual: 'Live Broadcast',
    forecast: 'Policy Outlook',
    previous: 'Stable'
  }
];

interface MarketNews {
  id: string;
  title: string;
  category: 'Stocks' | 'Economy' | 'Tech' | 'Global Market';
  timeAgo: string;
  source: string;
  summary: string;
  volatilityImpact: 'High' | 'Moderate' | 'Low';
  relatedAsset?: string;
}

const MARKET_NEWS: MarketNews[] = [
  {
    id: 'n1',
    title: 'Global Tech Rally Continues as AI Infrastructure Spending Surges',
    category: 'Tech',
    timeAgo: '15m ago',
    source: 'Financial Market Wire',
    summary: 'Major technology companies increase capex projections for data centers and specialized silicon, boosting global market indices and hardware suppliers.',
    volatilityImpact: 'High',
    relatedAsset: 'Nvidia (OTC)'
  },
  {
    id: 'n2',
    title: 'Federal Reserve Affirms Steady Path for Liquidity and Economic Growth',
    category: 'Economy',
    timeAgo: '45m ago',
    source: 'Macro Intelligence Desk',
    summary: 'Central bank leadership outlines structured approach to inflation management while maintaining strong labour market liquidity across international trading desks.',
    volatilityImpact: 'High',
    relatedAsset: 'S&P 500'
  },
  {
    id: 'n3',
    title: 'Apple Announces Next-Generation Silicon Architecture and Services Growth',
    category: 'Stocks',
    timeAgo: '1h ago',
    source: 'Equity Market Journal',
    summary: 'Record quarterly services revenue and high-margin device sales push institutional buy ratings higher as international demand hits multi-quarter highs.',
    volatilityImpact: 'Moderate',
    relatedAsset: 'Apple (OTC)'
  },
  {
    id: 'n4',
    title: 'Tesla Accelerates Autonomous Fleet Deployment and Energy Storage Milestones',
    category: 'Stocks',
    timeAgo: '2h ago',
    source: 'Global Industrial Post',
    summary: 'Energy storage megawatt installations expand by 125% year-on-year alongside expanded robotaxi testing permits across key metropolitan zones.',
    volatilityImpact: 'High',
    relatedAsset: 'Tesla (OTC)'
  },
  {
    id: 'n5',
    title: 'European Central Banks Align on Structured Fiscal Guidance',
    category: 'Global Market',
    timeAgo: '3h ago',
    source: 'European Financial Daily',
    summary: 'Cross-border monetary frameworks report stable purchasing managers index (PMI) figures across manufacturing and services sectors.',
    volatilityImpact: 'Moderate',
    relatedAsset: 'DAX 40 Germany'
  },
  {
    id: 'n6',
    title: 'Microsoft Cloud and Enterprise Ecosystem Hits New Operational Record',
    category: 'Tech',
    timeAgo: '4h ago',
    source: 'Tech Market Wire',
    summary: 'Enterprise subscription retention rates exceed expectations with rapid adoption of intelligent copilot tools across multinational client fleets.',
    volatilityImpact: 'Moderate',
    relatedAsset: 'Microsoft (OTC)'
  }
];

export const NewsScreen = () => {
  const { assets, setCurrentAsset } = useAppContext();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'news' | 'calendar'>('news');
  const [selectedTag, setSelectedTag] = useState<'All' | 'Stocks' | 'Economy' | 'Tech' | 'Global Market'>('All');

  const handleTradeAsset = (assetName?: string) => {
    if (!assetName) {
      navigate('/assets');
      return;
    }
    const matched = assets.find(a => 
      a.name.toLowerCase().includes(assetName.toLowerCase()) || 
      assetName.toLowerCase().includes(a.name.toLowerCase())
    );
    if (matched) {
      setCurrentAsset(matched);
      navigate('/');
    } else {
      navigate('/assets');
    }
  };

  const filteredNews = selectedTag === 'All'
    ? MARKET_NEWS
    : MARKET_NEWS.filter(n => n.category === selectedTag);

  return (
    <div className="flex flex-col min-h-full bg-slate-50 font-sans pb-24 select-none">
      {/* Top Header */}
      <div className="px-4 pt-[max(env(safe-area-inset-top,0px),12px)] pb-3 bg-white border-b border-gray-100 sticky top-0 z-30 shadow-xs">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0088cc]/10 flex items-center justify-center text-[#0088cc]">
              <Newspaper className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black text-gray-900 tracking-tight leading-none">
                Market News
              </h1>
              <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Financial Feed
              </div>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex bg-gray-100 p-0.5 rounded-lg text-xs font-bold">
            <button
              onClick={() => setTab('news')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${tab === 'news' ? 'bg-[#0088cc] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
            >
              News Wire
            </button>
            <button
              onClick={() => setTab('calendar')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${tab === 'calendar' ? 'bg-[#0088cc] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Calendar
            </button>
          </div>
        </div>

        {/* Filter Tags (Only for News tab) */}
        {tab === 'news' && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {(['All', 'Stocks', 'Economy', 'Tech', 'Global Market'] as const).map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                  selectedTag === tag 
                    ? 'bg-gray-900 text-white shadow-xs' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="p-3.5 space-y-3">
        
        {/* Market Overview Brief */}
        <div className="bg-white border border-gray-100 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
              <Globe className="w-4 h-4 text-[#0088cc]" />
              Global Financial Headlines & Macro Wire
            </div>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-blue-50 text-[#0088cc] border border-blue-200 rounded">
              Updated Live
            </span>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed">
            Real-time economic developments, corporate earnings, central bank announcements, and institutional market drivers.
          </p>
        </div>

        {/* Tab 1: Curated News Feed */}
        {tab === 'news' && (
          <div className="space-y-3">
            {filteredNews.map(item => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs transition-all hover:border-[#0088cc]/30">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-[#0088cc] uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {item.category}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      • {item.source}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {item.timeAgo}
                  </span>
                </div>

                <h3 className="font-extrabold text-gray-900 text-sm leading-snug mb-2">
                  {item.title}
                </h3>
                
                <p className="text-xs text-gray-600 leading-relaxed mb-3">
                  {item.summary}
                </p>

                <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="text-gray-400 flex items-center gap-1">
                    Impact: <strong className={item.volatilityImpact === 'High' ? 'text-[#ff3b30]' : 'text-amber-600'}>● {item.volatilityImpact}</strong>
                  </span>

                  {item.relatedAsset && (
                    <button 
                      onClick={() => handleTradeAsset(item.relatedAsset)}
                      className="text-[#0088cc] font-bold hover:underline flex items-center gap-1 cursor-pointer bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <span>Trade {item.relatedAsset}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Economic Calendar */}
        {tab === 'calendar' && (
          <div className="space-y-3">
            <div className="bg-white border border-gray-100 rounded-2xl p-3.5 shadow-xs">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#0088cc]" />
                  Today's Economic Calendar
                </h2>
                <span className="text-[10px] text-gray-400 font-bold">IST Timezone</span>
              </div>

              <div className="space-y-2.5">
                {ECONOMIC_CALENDAR.map(ev => (
                  <div key={ev.id} className="p-3 bg-gray-50/70 border border-gray-200/80 rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{ev.countryFlag}</span>
                        <div>
                          <div className="font-black text-xs text-gray-900 leading-snug">{ev.event}</div>
                          <div className="text-[10px] text-gray-400 font-bold">{ev.currency} • {ev.time}</div>
                        </div>
                      </div>

                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                        ev.impact === 'HIGH' 
                          ? 'bg-red-50 text-[#ff3b30] border border-red-200' 
                          : 'bg-amber-50 text-amber-600 border border-amber-200'
                      }`}>
                        {ev.impact} Impact
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] pt-1">
                      <div className="bg-white p-1.5 rounded border border-gray-100">
                        <span className="text-gray-400 block text-[9px]">Actual</span>
                        <span className="font-black text-emerald-600">{ev.actual}</span>
                      </div>
                      <div className="bg-white p-1.5 rounded border border-gray-100">
                        <span className="text-gray-400 block text-[9px]">Forecast</span>
                        <span className="font-bold text-gray-700">{ev.forecast}</span>
                      </div>
                      <div className="bg-white p-1.5 rounded border border-gray-100">
                        <span className="text-gray-400 block text-[9px]">Previous</span>
                        <span className="font-bold text-gray-400">{ev.previous}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
