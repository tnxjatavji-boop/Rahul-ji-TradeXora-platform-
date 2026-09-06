import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  ArrowLeft, ShieldCheck, 
  ExternalLink, History
} from 'lucide-react';

export const DepositScreen: React.FC = () => {
  const navigate = useNavigate();
  const { userId, realBalance } = useAppContext();
  const [amount, setAmount] = useState('500');

  const numAmount = Number(amount) || 0;
  const checkoutUrl = `/checkout?amount=${numAmount}&userId=${encodeURIComponent(userId)}`;

  const handlePayInNewTab = () => {
    if (!numAmount || numAmount < 500) {
      alert("Minimum deposit amount is ₹500");
      return;
    }
    window.open(checkoutUrl, '_blank');
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50 font-sans pb-6 select-none">
      {/* Top Navigation Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-[max(env(safe-area-inset-top,0px),12px)] pb-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1.5 -ml-1 text-gray-700 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-black text-gray-900 flex items-center gap-1.5">
          <span>Deposit Funds</span>
        </h1>
        <Link 
          to="/history" 
          className="flex items-center gap-1 text-xs font-bold text-[#0088cc] hover:bg-blue-50 px-2.5 py-1.5 rounded-xl transition-colors"
          title="Deposit & Withdrawal History"
        >
          <History className="w-4 h-4" />
          <span>History</span>
        </Link>
      </div>

      {/* Account Balance Summary */}
      <div className="p-4 bg-white border-b border-gray-100">
        <div className="bg-gradient-to-br from-[#0088cc] to-blue-700 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xs pointer-events-none" />
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[11px] font-bold tracking-wider uppercase opacity-80">Current Real Balance</div>
              <div className="text-2xl font-black mt-0.5">
                ₹{realBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="flex items-center gap-1 bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Instant Auto-Credit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Deposit Form */}
      <div className="p-4 space-y-4 flex-1">
        {/* Quick Amount Chips */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between mb-2.5">
            <label className="block text-xs font-black text-gray-700 uppercase tracking-wider">
              Select Deposit Amount
            </label>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              Min ₹500
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {['500', '1000', '2000', '5000', '10000', '25000'].map(val => (
              <button
                type="button"
                key={val}
                onClick={() => setAmount(val)}
                className={`py-2.5 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                  amount === val 
                    ? 'border-[#0088cc] bg-blue-50 text-[#0088cc] shadow-xs' 
                    : 'border-gray-200 bg-gray-50/70 text-gray-700 hover:bg-gray-100'
                }`}
              >
                ₹{Number(val).toLocaleString('en-IN')}
              </button>
            ))}
          </div>

          {/* Custom Amount Input */}
          <div className="mt-3 relative">
            <span className="absolute left-4 top-3.5 text-gray-500 font-black text-sm">₹</span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Enter custom amount (min ₹500)"
              min="500"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-gray-900 font-black text-base focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
            />
          </div>

          {/* Pay Button: Opens Payment Page in New Tab */}
          <div className="mt-4">
            <button
              type="button"
              onClick={handlePayInNewTab}
              className="w-full bg-[#0088cc] hover:bg-[#0077b5] active:scale-[0.99] text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Pay ₹{numAmount.toLocaleString('en-IN')}</span>
              <ExternalLink className="w-4 h-4" />
            </button>
            <p className="text-[11px] text-gray-500 text-center mt-1.5">
              Clicking "Pay" opens the payment page in a new tab
            </p>
          </div>
        </div>

        {/* Security Trust Footer */}
        <div className="text-center text-[10px] text-gray-400 space-y-1 py-2">
          <div className="flex items-center justify-center gap-1 font-bold text-gray-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Guaranteed Safe Deposit & Anti-Fraud Protection</span>
          </div>
          <p>Payments are directly credited to your trading balance upon verification.</p>
        </div>
      </div>
    </div>
  );
};
