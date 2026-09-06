import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  ShieldCheck, Lock, Copy, Check, CheckCircle2, QrCode, 
  ExternalLink, ArrowLeft, ArrowUpRight
} from 'lucide-react';

export const CheckoutScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  
  const amountParam = searchParams.get('amount') || '500';
  const queryUserId = searchParams.get('userId') || '';
  
  const [userId] = useState(() => {
    if (queryUserId) return queryUserId;
    try {
      return localStorage.getItem('tradexora_user') || 'user';
    } catch {
      return 'user';
    }
  });

  const amount = Number(amountParam) || 500;
  const [utrNumber, setUtrNumber] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const SECURE_UPI_ID = "TradeXora@freecharge";

  // Standard UPI deep link URL
  const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(SECURE_UPI_ID)}&pn=TradeXora&am=${amount}&cu=INR&tn=TradeXora%20Deposit%20${userId}`;

  // QR Code URL based on amount
  const getQrUrl = () => {
    if (amount === 500) return "https://files.catbox.moe/4ozrpk.jpg";
    if (amount === 1000) return "https://files.catbox.moe/jrozrr.jpg";
    if (amount === 2000) return "https://files.catbox.moe/f6ljj0.jpg";
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=8&data=${encodeURIComponent(upiIntentUrl)}`;
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(SECURE_UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUtr = utrNumber.trim();
    if (!cleanUtr || cleanUtr.length < 6) {
      alert("Please enter the 12-digit UTR / Reference ID from your UPI payment receipt.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId || 'user',
          amount,
          utr: cleanUtr
        })
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        alert(data.message || "Failed to submit deposit verification.");
      }
    } catch (err) {
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start p-3 sm:p-6 font-sans select-none text-gray-900">
      
      {/* Top Header */}
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-4 mb-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0088cc] flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black text-gray-900">TradeXora Payment</h1>
            <p className="text-[11px] text-gray-500 font-medium">Secure UPI Gateway</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.close()}
          className="text-xs font-bold text-gray-500 hover:text-gray-900 px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
        >
          Close Tab
        </button>
      </div>

      {/* Main Payment Card */}
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-5 space-y-4">
        
        {/* Amount Summary */}
        <div className="bg-gradient-to-br from-[#0088cc] to-blue-700 rounded-xl p-4 text-white text-center">
          <div className="text-xs uppercase font-bold tracking-wider opacity-90">Amount to Pay</div>
          <div className="text-3xl font-black mt-0.5">
            ₹{amount.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] opacity-80 mt-1">
            Account: {userId}
          </div>
        </div>

        {!submitted ? (
          <>
            {/* Quick 1-Click Pay Buttons */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-gray-700">Pay directly with UPI App:</div>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={upiIntentUrl}
                  className="flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#0088cc] rounded-xl py-2.5 px-3 text-xs font-bold transition-all text-center cursor-pointer"
                >
                  <span>PhonePe / GPay</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
                <a
                  href={upiIntentUrl}
                  className="flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl py-2.5 px-3 text-xs font-bold transition-all text-center cursor-pointer"
                >
                  <span>Paytm / Any UPI</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <div className="text-xs font-bold text-gray-800 mb-2">
                Scan QR Code to Pay ₹{amount.toLocaleString('en-IN')}
              </div>

              <div className="bg-white p-2 rounded-xl shadow-xs border border-gray-200 inline-block">
                <img 
                  src={getQrUrl()} 
                  alt={`QR ₹${amount}`} 
                  className="w-44 h-44 object-contain rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://files.catbox.moe/4ozrpk.jpg";
                  }}
                />
              </div>

              <div className="text-[11px] text-gray-500 mt-2.5 font-medium">
                Open GPay, PhonePe, Paytm or any UPI App to scan.
              </div>

              {/* Copy UPI ID */}
              <div className="mt-3 w-full">
                <div className="text-[11px] text-gray-600 font-semibold mb-1 text-left">
                  Or pay to UPI ID:
                </div>
                <div className="flex items-center justify-between bg-white px-3.5 py-2 rounded-xl border border-gray-200">
                  <span className="font-mono text-xs font-bold text-gray-800 select-all">
                    {SECURE_UPI_ID}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="flex items-center gap-1 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2: UTR Submission */}
            <form onSubmit={handleSubmitDeposit} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Enter 12-Digit UTR / Reference ID:
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={utrNumber}
                  onChange={e => setUtrNumber(e.target.value)}
                  placeholder="Enter 12-digit UTR from receipt"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
                />
              </div>

              <button
                type="submit"
                disabled={loading || utrNumber.trim().length < 6}
                className="w-full bg-[#0088cc] hover:bg-[#0077b5] disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Deposit Confirmation</span>
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          /* Submission Success State */
          <div className="py-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">Deposit Request Submitted!</h2>
              <p className="text-xs text-gray-600 mt-1">
                Your payment of <strong>₹{amount.toLocaleString('en-IN')}</strong> with UTR <strong>{utrNumber}</strong> has been submitted. It will be credited as soon as verified.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.close()}
              className="mt-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold py-2.5 px-6 rounded-xl transition-all cursor-pointer"
            >
              Close this Tab
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-[10px] text-gray-400 pt-2 border-t border-gray-100 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Guaranteed Safe Deposit & Anti-Fraud Protection</span>
        </div>

      </div>
    </div>
  );
};
