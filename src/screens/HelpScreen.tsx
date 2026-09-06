import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, MessageSquare, Send, ChevronDown, ChevronUp, 
  ExternalLink, CheckCircle2, Search, ArrowRight
} from 'lucide-react';

interface FAQ {
  id: string;
  category: 'Binary Trading' | 'Deposits' | 'Withdrawals' | 'Strategies' | 'Security';
  q: string;
  a: string;
  highlight?: string;
}

const FAQS: FAQ[] = [
  {
    id: 'f1',
    category: 'Binary Trading',
    q: 'How does Binary Options trading work on TradeXora?',
    a: 'Binary trading is a fixed-time contract prediction. You select an asset, choose a duration (5s to 15m), and predict whether the market price will finish HIGHER (CALL) or LOWER (PUT) than your entry strike price. A winning trade delivers up to 88% net profit credited instantly to your account.',
    highlight: 'Instant payout up to 88% per winning deal'
  },
  {
    id: 'f2',
    category: 'Strategies',
    q: 'How to accurately predict CALL vs PUT in micro-timeframe candles?',
    a: 'Professional binary traders rely on multi-indicator confluence:\n• CALL (Buy / UP): Wait for price to bounce off the Lower Bollinger Band, RSI below 30 turning upward, or EMA 9 crossing above EMA 21.\n• PUT (Sell / DOWN): Wait for price to test Upper Bollinger Band resistance, RSI above 70 turning downward, or strong rejection wicks.',
    highlight: 'Bollinger Bands (20, 2) + EMA Cross (9, 21)'
  },
  {
    id: 'f3',
    category: 'Deposits',
    q: 'How do UPI deposits work and how fast is balance credited?',
    a: 'UPI deposits via PhonePe, Google Pay, and Paytm are processed within 2 to 5 minutes. After completing the payment in your UPI app, simply copy the 12-digit UTR / Reference number from the transaction details and submit it on the deposit page.',
    highlight: 'Auto-credited in 2-5 minutes via 12-digit UTR'
  },
  {
    id: 'f4',
    category: 'Withdrawals',
    q: 'What is the minimum withdrawal limit and payout timeline?',
    a: 'The minimum withdrawal limit is ₹200. Payouts are transferred directly to your registered UPI ID or Bank Account via IMPS within 15 to 30 minutes with 0% processing fees.',
    highlight: 'Instant IMPS transfer in 15-30 minutes with 0% fee'
  },
  {
    id: 'f5',
    category: 'Binary Trading',
    q: 'How is the binary outcome determined at expiration?',
    a: 'The exact market tick at the millisecond of trade expiry is compared against your entry strike price. If predicted CALL and Expiry Price > Entry Price, you win. All quote feeds are synchronized with universal global liquidity benchmarks.',
    highlight: 'Universal tick-level precision'
  },
  {
    id: 'f6',
    category: 'Security',
    q: 'Is my fund and personal trading account secure?',
    a: 'TradeXora employs 256-bit bank-grade encryption, segregated user capital pools, and anti-tamper server verification to guarantee account integrity and instantaneous liquidity settlements.',
    highlight: '256-bit SSL + Segregated Client Funds'
  }
];

const QUICK_PROMPTS = [
  "How to predict CALL vs PUT?",
  "Best indicators for 1m trading?",
  "UPI Deposit / UTR submission help",
  "How to withdraw money to bank?",
  "What is the 2% Money Management Rule?"
];

export const HelpScreen = () => {
  const [supportUrl, setSupportUrl] = useState<string>('https://t.me/Dear_aanshiji_bot');
  const [tab, setTab] = useState<'chat' | 'knowledge' | 'ticket'>('chat');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFaq, setActiveFaq] = useState<string | null>('f1');

  // Support Ticket Form State
  const [ticketCategory, setTicketCategory] = useState('Deposit / UTR Verification');
  const [ticketRef, setTicketRef] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketSubmitted, setTicketSubmitted] = useState<string | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: 'Welcome to TradeXora Official Support & AI Trading Desk.\n\nHow may I assist you today? You can ask about binary trade strategies (CALL/PUT), technical indicators, UPI deposit UTR verification, or instant withdrawals.',
      time: 'Just now'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/support')
      .then(res => res.json())
      .then(data => {
        if (data.url) setSupportUrl(data.url);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, tab]);

  const generateSmartReply = (userQuery: string): string => {
    const q = userQuery.toLowerCase();

    if (q.includes('call') || q.includes('put') || q.includes('predict') || q.includes('strategy') || q.includes('kaise')) {
      return "📊 Binary Trading Precision Strategy:\n\n1. CALL (Green / UP):\n• Wait for price candle to touch Lower Bollinger Band.\n• Confirm RSI (14) is oversold (< 35) and turning upward.\n• Strike 1-minute CALL.\n\n2. PUT (Red / DOWN):\n• Wait for price candle to test Upper Bollinger Band resistance.\n• Confirm RSI (14) is overbought (> 65) with bearish reversal wick.\n• Strike 1-minute PUT.\n\nRule: Always trade in the direction of the dominant trend!";
    }

    if (q.includes('deposit') || q.includes('utr') || q.includes('paisa') || q.includes('upi')) {
      return "💳 UPI Deposit & UTR Verification:\n\n1. Go to Trade > Deposit.\n2. Choose amount (₹100 to ₹50,000) and scan the QR with PhonePe / GPay / Paytm.\n3. Open payment receipt, copy the 12-digit UTR Number (e.g. 423871982341).\n4. Paste into the UTR field and tap 'Verify Deposit'.\n\nBalance is automatically credited in 2 to 5 minutes.";
    }

    if (q.includes('withdraw') || q.includes('bank') || q.includes('nikalna') || q.includes('payout')) {
      return "💸 Instant Withdrawal Process:\n\n• Minimum Limit: ₹200\n• Fee: 0%\n• Speed: 15 to 30 minutes via IMPS / UPI.\n\nTo request: Go to Profile > Withdraw > Enter UPI ID or Bank Account (IFSC + Account Number) > Submit.";
    }

    if (q.includes('indicator') || q.includes('ema') || q.includes('bollinger') || q.includes('chart')) {
      return "📈 Recommended Chart Indicators:\n\n• Bollinger Bands (20, 2): Spot overbought and oversold dynamic channels.\n• EMA Cross (9 & 21): Identifies fast trend momentum.\n• RSI (14): Gauges momentum strength and divergence.\n\nTip: You can customize all indicators directly on the chart using the 'Indicators' button on top!";
    }

    if (q.includes('rule') || q.includes('money') || q.includes('loss') || q.includes('risk')) {
      return "🛡️ The 2% Professional Capital Rule:\n\nNever invest more than 2% to 5% of your total balance on a single trade. This protects your account against micro-volatility swings and ensures long-term compounding profitability.";
    }

    return "Thank you for reaching out! Our quantitative trading engine is built to deliver precision and fair liquidity execution. For dedicated account review or live agent chat, you can connect directly with our Official Telegram Support: @Dear_aanshiji_bot";
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query) return;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { sender: 'user', text: query, time: now }]);
    if (!textToSend) setInputMessage('');

    setTimeout(() => {
      const reply = generateSmartReply(query);
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 400);
  };

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketDesc.trim()) return;

    const ticketId = `TX-${Math.floor(100000 + Math.random() * 900000)}`;
    setTicketSubmitted(ticketId);
  };

  const filteredFaqs = FAQS.filter(f => {
    const matchesCat = activeCategory === 'All' || f.category === activeCategory;
    const matchesSearch = f.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.a.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans overflow-hidden select-none">
      {/* Top Header */}
      <div className="px-4 pt-[max(env(safe-area-inset-top,0px),12px)] pb-2.5 bg-white border-b border-gray-100 shrink-0">
        <div className="flex justify-between items-center mb-2.5">
          <div>
            <h1 className="text-base font-black text-gray-900 tracking-tight leading-none">
              Help & Support
            </h1>
            <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              24/7 Support Desk
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-gray-100 p-0.5 rounded-lg text-xs font-bold">
            <button
              onClick={() => setTab('chat')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${tab === 'chat' ? 'bg-[#0088cc] text-white shadow-xs' : 'text-gray-600'}`}
            >
              Live Chat
            </button>
            <button
              onClick={() => setTab('knowledge')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${tab === 'knowledge' ? 'bg-[#0088cc] text-white shadow-xs' : 'text-gray-600'}`}
            >
              FAQs
            </button>
            <button
              onClick={() => setTab('ticket')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${tab === 'ticket' ? 'bg-[#0088cc] text-white shadow-xs' : 'text-gray-600'}`}
            >
              Ticket
            </button>
          </div>
        </div>

        {/* Telegram Direct Support Banner */}
        <a 
          href={supportUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-between bg-gradient-to-r from-[#0088cc] to-blue-600 hover:from-blue-600 hover:to-[#0088cc] text-white px-3 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-xs">Official Telegram Live Support</div>
              <div className="text-[10px] text-blue-100">@Dear_aanshiji_bot • 24/7 Instant Response</div>
            </div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-blue-200" />
        </a>
      </div>

      {/* Tab 1: AI & Live Chat Assistant */}
      {tab === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
          {/* Chat Stream */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-lg bg-[#0088cc]/10 text-[#0088cc] flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs whitespace-pre-line shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-[#0088cc] text-white rounded-tr-xs font-medium'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-xs leading-relaxed font-normal'
                  }`}
                >
                  <div>{msg.text}</div>
                  <div
                    className={`text-[9px] mt-1.5 text-right font-semibold ${
                      msg.sender === 'user' ? 'text-blue-100' : 'text-gray-400'
                    }`}
                  >
                    {msg.time}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Pills */}
          <div className="px-3 py-1.5 bg-white border-t border-gray-100 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                className="whitespace-nowrap bg-blue-50/80 hover:bg-blue-100 text-[#0088cc] border border-blue-200 text-[11px] font-bold px-3 py-1 rounded-full transition-colors cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 bg-white border-t border-gray-200 flex gap-2 items-center shrink-0"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about CALL/PUT rules, indicators, deposit UTR..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="bg-[#0088cc] disabled:opacity-40 hover:bg-[#0077b5] text-white p-2 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Knowledge Base & FAQs */}
      {tab === 'knowledge' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search FAQs, strategies, deposit rules..."
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc] shadow-xs"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {(['All', 'Binary Trading', 'Strategies', 'Deposits', 'Withdrawals', 'Security'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                  activeCategory === cat 
                    ? 'bg-gray-900 text-white shadow-xs' 
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* FAQ Accordion List */}
          <div className="space-y-2">
            {filteredFaqs.map(faq => {
              const isOpen = activeFaq === faq.id;
              return (
                <div 
                  key={faq.id} 
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs transition-all"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : faq.id)}
                    className="w-full p-3.5 text-left flex justify-between items-center hover:bg-gray-50/60 transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-blue-50 text-[#0088cc] border border-blue-100">
                          {faq.category}
                        </span>
                        {faq.highlight && (
                          <span className="text-[10px] text-emerald-600 font-bold">
                            • {faq.highlight}
                          </span>
                        )}
                      </div>
                      <div className="font-extrabold text-xs text-gray-900 leading-snug">
                        {faq.q}
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-3.5 pb-3.5 pt-1 text-xs text-gray-600 leading-relaxed border-t border-gray-100 whitespace-pre-line bg-gray-50/40">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Submit Support Ticket */}
      {tab === 'ticket' && (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
          {ticketSubmitted ? (
            <div className="bg-white border border-emerald-200 rounded-2xl p-5 text-center shadow-xs space-y-3 animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-900">Support Ticket Created</h3>
                <p className="text-xs text-gray-500 mt-0.5">Ticket ID: <strong className="text-[#0088cc]">{ticketSubmitted}</strong></p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-600 text-left space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-400">Category:</span>
                  <span className="font-bold text-gray-800">{ticketCategory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className="font-bold text-amber-600">● In Queue (&lt; 15 min response)</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setTicketSubmitted(null);
                  setTicketRef('');
                  setTicketDesc('');
                }}
                className="w-full bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitTicket} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div>
                <h2 className="text-sm font-black text-gray-900">Submit Priority Support Ticket</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">Get direct assistance from our operations desk.</p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Issue Category</label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20"
                >
                  <option>Deposit / UTR Verification</option>
                  <option>Withdrawal Payout Status</option>
                  <option>Trade Execution / Candle Query</option>
                  <option>Account Verification / KYC</option>
                  <option>Other General Inquiries</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Transaction Ref / UTR Number (Optional)</label>
                <input
                  type="text"
                  value={ticketRef}
                  onChange={(e) => setTicketRef(e.target.value)}
                  placeholder="e.g. 429819283401"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Detailed Description</label>
                <textarea
                  rows={4}
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  placeholder="Please describe your query with relevant details..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#0088cc] hover:bg-[#0077b5] text-white font-black text-xs py-2.5 rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Submit Ticket</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
