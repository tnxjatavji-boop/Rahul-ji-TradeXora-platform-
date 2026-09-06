import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate, Link } from 'react-router-dom';
import { triggerHaptic } from '../utils/haptics';
import { motion } from 'motion/react';
import { 
  User, ShieldCheck, Gift, Share2, Copy, Check, LogOut, 
  ArrowUpRight, ArrowDownLeft, ChevronRight, 
  History, Wallet, Headphones, MessageSquare, ExternalLink, Send
} from 'lucide-react';

export const ProfileScreen = () => {
  const navigate = useNavigate();
  const { userId, realBalance, demoBalance, userStats, fetchBalance } = useAppContext();
  const [giftModal, setGiftModal] = useState(false);
  const [giftCodeInput, setGiftCodeInput] = useState('');
  const [giftLoading, setGiftLoading] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);

  const referralCode = userStats?.referralCode || 'TRADEX';

  const copyReferral = () => {
    triggerHaptic('success');
    navigator.clipboard.writeText(referralCode);
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2000);
  };

  const handleRedeemGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftCodeInput.trim()) {
      alert("Please enter a gift code");
      return;
    }

    setGiftLoading(true);
    try {
      const res = await fetch('/api/redeem_gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          code: giftCodeInput.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "Gift Code redeemed successfully!");
        setGiftCodeInput('');
        setGiftModal(false);
        fetchBalance();
      } else {
        alert(data.message || "Invalid or already used Gift Code.");
      }
    } catch (e) {
      alert("Failed to redeem code. Please try again.");
    } finally {
      setGiftLoading(false);
    }
  };

  const handleLogout = () => {
    triggerHaptic('heavy');
    if (confirm("Are you sure you want to log out?")) {
      localStorage.removeItem('tradexora_user');
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-gray-50/50 font-sans pb-24 select-none">
      {/* Profile Header Card */}
      <div className="bg-white border-b border-gray-100 px-5 pt-[max(env(safe-area-inset-top,0px),16px)] pb-5">
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-14 h-14 bg-gradient-to-tr from-[#0088cc] to-blue-500 rounded-2xl flex items-center justify-center text-white shadow-md font-bold text-xl uppercase">
            {userId.substring(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-gray-900 text-base sm:text-lg truncate max-w-[200px]">{userId}</h2>
              <span className="flex items-center gap-0.5 text-[10px] font-extrabold bg-emerald-50 text-[#00b067] px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                <ShieldCheck className="w-3 h-3" /> Verified
              </span>
            </div>
            <div className="text-xs text-gray-400 font-mono mt-0.5">UID: {Math.abs(userId.split('').reduce((a,b)=>(((a<<5)-a)+b.charCodeAt(0))|0, 0)).toString().padStart(8, '0')}</div>
          </div>
        </div>

        {/* Balance Overview Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-3.5">
            <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Real Account</div>
            <div className="text-xl font-black text-gray-900 mt-1">
              ₹{realBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Demo Practice</div>
            <div className="text-xl font-black text-gray-900 mt-1">
              ₹{demoBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Action Buttons: Direct Links to Dedicated Pages */}
        <div className="grid grid-cols-2 gap-2.5 mt-3.5">
          <Link
            to="/deposit"
            className="flex items-center justify-center gap-1.5 bg-[#00b067] hover:bg-[#009b5a] text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors shadow-xs"
          >
            <ArrowDownLeft className="w-4 h-4" /> Deposit
          </Link>
          <Link
            to="/withdraw"
            className="flex items-center justify-center gap-1.5 bg-[#0088cc] hover:bg-[#0088cc]/90 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors shadow-xs"
          >
            <ArrowUpRight className="w-4 h-4" /> Withdraw
          </Link>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Referral & Earn Banner */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Refer & Earn Real Cash</h3>
                <div className="text-[10px] text-gray-400">Earn lifetime commission on referrals</div>
              </div>
            </div>
            <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              {userStats?.referralCount || 0} Invites
            </span>
          </div>

          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mt-3">
            <div>
              <div className="text-[10px] text-gray-400 font-semibold uppercase">Your Referral Code</div>
              <div className="font-mono font-black text-sm text-gray-900 tracking-wider">{referralCode}</div>
            </div>
            <button
              onClick={copyReferral}
              className="flex items-center gap-1 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              {copiedReferral ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedReferral ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Menu Items List */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs divide-y divide-gray-50">
          <Link
            to="/help"
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center relative">
                <Headphones className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              </div>
              <div className="text-left">
                <div className="font-bold text-gray-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <span>Customer Support</span>
                  <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded-full">24/7 Live</span>
                </div>
                <div className="text-[10px] text-gray-400">Live chat, FAQs, ticket desk & Telegram desk</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>

          <Link
            to="/history"
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 text-[#0088cc] rounded-xl flex items-center justify-center">
                <History className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-bold text-gray-900 text-xs sm:text-sm">Transaction Records</div>
                <div className="text-[10px] text-gray-400">View deposit and withdrawal statuses</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>

          <button
            onClick={() => setGiftModal(true)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <Gift className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-bold text-gray-900 text-xs sm:text-sm">Redeem Gift Voucher</div>
                <div className="text-[10px] text-gray-400">Enter coupon code for instant bonus</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Direct Telegram Support Banner */}
        <a
          href="https://t.me/Dear_aanshiji_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3.5 bg-gradient-to-r from-[#0088cc] to-[#0077b5] text-white rounded-2xl shadow-xs hover:opacity-95 transition-opacity"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black leading-tight flex items-center gap-1.5">
                Official Telegram Live Support
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
              </div>
              <div className="text-[10px] text-blue-100 font-medium">@Dear_aanshiji_bot (Fast response)</div>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-blue-100" />
        </a>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 text-red-600 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
        >
          <LogOut className="w-4 h-4" /> Log Out Account
        </button>
      </div>

      {/* Gift Code Modal */}
      {giftModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 w-full max-w-xs shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Gift className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-gray-900 text-center mb-1">Redeem Gift Code</h3>
            <p className="text-xs text-gray-500 text-center mb-4">Enter promotional voucher code to credit funds directly.</p>

            <form onSubmit={handleRedeemGift} className="space-y-3">
              <input
                type="text"
                value={giftCodeInput}
                onChange={e => setGiftCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. TRADEX100"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-center font-mono font-bold text-sm tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setGiftModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={giftLoading}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                >
                  {giftLoading ? 'Redeeming...' : 'Apply Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
