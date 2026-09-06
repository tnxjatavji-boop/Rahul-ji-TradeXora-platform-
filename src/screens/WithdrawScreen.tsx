import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  ArrowLeft, ArrowUpRight, ShieldCheck, History, 
  CreditCard, Smartphone, CheckCircle2, AlertCircle, Clock
} from 'lucide-react';

export const WithdrawScreen: React.FC = () => {
  const navigate = useNavigate();
  const { userId, realBalance, fetchBalance, userStats } = useAppContext();

  const [amount, setAmount] = useState('500');
  const [method, setMethod] = useState<'upi' | 'bank'>('upi');
  const [upiId, setUpiId] = useState('');
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    ifscCode: '',
    accountHolder: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount < 200) {
      alert("Minimum withdrawal amount is ₹200");
      return;
    }
    if (numAmount > realBalance) {
      alert("Insufficient Real Account Balance to process this withdrawal.");
      return;
    }

    let recipientDetails = "";
    if (method === 'upi') {
      if (!upiId.trim() || !upiId.includes('@')) {
        alert("Please enter a valid recipient UPI ID (e.g. yourname@oksbi / yourname@paytm)");
        return;
      }
      recipientDetails = upiId.trim();
    } else {
      if (!bankDetails.accountHolder || !bankDetails.accountNumber || !bankDetails.ifscCode) {
        alert("Please fill in all bank account fields.");
        return;
      }
      recipientDetails = `Bank: ${bankDetails.accountHolder} | Acc: ${bankDetails.accountNumber} | IFSC: ${bankDetails.ifscCode.toUpperCase().trim()}`;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: numAmount,
          upi: recipientDetails
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Withdrawal request created successfully! Funds will be transferred to your account.");
        fetchBalance();
        navigate('/history');
      } else {
        alert(data.message || "Failed to process withdrawal request.");
      }
    } catch (e) {
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
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
          <span>Withdraw Funds</span>
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

      {/* Real Withdrawable Balance Summary */}
      <div className="p-4 bg-white border-b border-gray-100">
        <div className="bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 rounded-2xl p-4 text-white shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[11px] font-bold tracking-wider uppercase text-gray-400">Withdrawable Balance</div>
              <div className="text-2xl font-black text-[#00b067] mt-0.5">
                ₹{realBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full text-[10px] font-bold text-gray-200">
              <Clock className="w-3.5 h-3.5 text-yellow-400" />
              <span>15-30 Min Payout</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Withdrawal Form */}
      <form onSubmit={handleSubmitWithdrawal} className="p-4 space-y-4 flex-1">
        {/* Quick Amount Selection */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs">
          <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2.5">
            Withdrawal Amount (₹)
          </label>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {['500', '1000', '2000', '5000', '10000'].map(val => (
              <button
                type="button"
                key={val}
                onClick={() => setAmount(val)}
                className={`py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                  amount === val 
                    ? 'border-[#0088cc] bg-blue-50 text-[#0088cc] shadow-xs' 
                    : 'border-gray-200 bg-gray-50/70 text-gray-700 hover:bg-gray-100'
                }`}
              >
                ₹{Number(val).toLocaleString('en-IN')}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAmount(Math.floor(realBalance).toString())}
              className="py-2 text-xs font-black rounded-xl border border-emerald-300 bg-emerald-50 text-[#00b067] hover:bg-emerald-100 transition-colors"
            >
              All (₹{Math.floor(realBalance)})
            </button>
          </div>

          <div className="relative">
            <span className="absolute left-4 top-3.5 text-gray-500 font-black text-sm">₹</span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Enter withdrawal amount (Min ₹200)"
              min="200"
              max={realBalance}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-gray-900 font-black text-base focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
            />
          </div>
        </div>

        {/* Payment Destination Method Selection */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-3">
          <label className="block text-xs font-black text-gray-700 uppercase tracking-wider">
            Payout Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMethod('upi')}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-black transition-all cursor-pointer ${
                method === 'upi'
                  ? 'border-[#0088cc] bg-blue-50 text-[#0088cc] shadow-xs'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>UPI Transfer</span>
            </button>

            <button
              type="button"
              onClick={() => setMethod('bank')}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-black transition-all cursor-pointer ${
                method === 'bank'
                  ? 'border-[#0088cc] bg-blue-50 text-[#0088cc] shadow-xs'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Bank IMPS / NEFT</span>
            </button>
          </div>

          {method === 'upi' ? (
            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] font-bold text-gray-600">Your UPI ID (VPA)</label>
              <input
                type="text"
                value={upiId}
                onChange={e => setUpiId(e.target.value)}
                placeholder="example@okhdfcbank / 9876543210@paytm"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
              />
            </div>
          ) : (
            <div className="space-y-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Account Holder Name</label>
                <input
                  type="text"
                  value={bankDetails.accountHolder}
                  onChange={e => setBankDetails(b => ({ ...b, accountHolder: e.target.value }))}
                  placeholder="Full name as in bank passbook"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Bank Account Number</label>
                <input
                  type="text"
                  value={bankDetails.accountNumber}
                  onChange={e => setBankDetails(b => ({ ...b, accountNumber: e.target.value }))}
                  placeholder="Enter Bank Account Number"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Bank IFSC Code</label>
                <input
                  type="text"
                  value={bankDetails.ifscCode}
                  onChange={e => setBankDetails(b => ({ ...b, ifscCode: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SBIN0001234"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900 uppercase focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit Withdrawal Button */}
        <button
          type="submit"
          disabled={loading || realBalance < 200}
          className="w-full bg-gradient-to-r from-[#0088cc] to-blue-700 hover:from-blue-700 hover:to-[#0088cc] disabled:opacity-50 active:scale-[0.99] text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <ArrowUpRight className="w-4 h-4" />
              <span>Confirm Withdrawal Request</span>
            </>
          )}
        </button>

        {/* Security & Guarantee Notes */}
        <div className="text-center text-[10px] text-gray-400 space-y-1 py-1">
          <div className="flex items-center justify-center gap-1 font-bold text-gray-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Direct IMPS Bank Gateway • 100% Payout Assurance</span>
          </div>
          <p>Minimum withdrawal is ₹200. Processing time: 15–30 minutes.</p>
        </div>
      </form>
    </div>
  );
};
