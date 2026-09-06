import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { BottomNav } from './components/BottomNav';
import { TradeScreen } from './screens/TradeScreen';
import { AssetSelectorScreen } from './screens/AssetSelectorScreen';
import { DealsScreen } from './screens/DealsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { LoginScreen } from './screens/LoginScreen';
import { NewsScreen } from './screens/NewsScreen';
import { HelpScreen } from './screens/HelpScreen';
import { DepositScreen } from './screens/DepositScreen';
import { WithdrawScreen } from './screens/WithdrawScreen';
import { TransactionHistoryScreen } from './screens/TransactionHistoryScreen';
import { AdminControlScreen } from './screens/AdminControlScreen';
import { CheckoutScreen } from './screens/CheckoutScreen';
import { AnimatePresence, motion } from 'motion/react';

const PageTransition = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.99 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex-1 min-h-0 w-full h-full relative flex flex-col"
    >
      {children}
    </motion.div>
  );
};

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="h-full w-full relative max-w-md md:max-w-lg mx-auto bg-white shadow-2xl sm:rounded-3xl sm:border sm:border-slate-200/80 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar bg-slate-50 relative flex flex-col">
        <PageTransition>{children}</PageTransition>
      </div>
      <BottomNav />
    </div>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} className="h-full w-full absolute inset-0">
        <Routes location={location}>
          {/* Primary Trading Dashboard */}
          <Route path="/" element={<MainLayout><TradeScreen /></MainLayout>} />
          
          {/* Dedicated Navigation Screens */}
          <Route path="/assets" element={<div className="h-full w-full relative max-w-md md:max-w-lg mx-auto bg-white shadow-2xl sm:rounded-3xl sm:border sm:border-slate-200/80 overflow-y-auto"><PageTransition><AssetSelectorScreen /></PageTransition></div>} />
          <Route path="/deals" element={<MainLayout><DealsScreen /></MainLayout>} />
          <Route path="/news" element={<MainLayout><NewsScreen /></MainLayout>} />
          <Route path="/help" element={<MainLayout><HelpScreen /></MainLayout>} />
          <Route path="/me" element={<MainLayout><ProfileScreen /></MainLayout>} />

          {/* Dedicated Financial Pages */}
          <Route path="/deposit" element={<div className="h-full w-full relative max-w-md md:max-w-lg mx-auto bg-white shadow-2xl sm:rounded-3xl sm:border sm:border-slate-200/80 overflow-y-auto"><PageTransition><DepositScreen /></PageTransition></div>} />
          <Route path="/checkout" element={<div className="h-full w-full relative overflow-y-auto"><CheckoutScreen /></div>} />
          <Route path="/withdraw" element={<div className="h-full w-full relative max-w-md md:max-w-lg mx-auto bg-white shadow-2xl sm:rounded-3xl sm:border sm:border-slate-200/80 overflow-y-auto"><PageTransition><WithdrawScreen /></PageTransition></div>} />
          <Route path="/history" element={<div className="h-full w-full relative max-w-md md:max-w-lg mx-auto bg-white shadow-2xl sm:rounded-3xl sm:border sm:border-slate-200/80 overflow-y-auto"><PageTransition><TransactionHistoryScreen /></PageTransition></div>} />

          {/* Admin Operating System & Live Monitor */}
          <Route path="/admin" element={<div className="h-full w-full relative max-w-md sm:max-w-3xl lg:max-w-5xl mx-auto bg-[#0d131f] shadow-2xl sm:rounded-2xl sm:border sm:border-slate-800 overflow-y-auto"><PageTransition><AdminControlScreen /></PageTransition></div>} />
          <Route path="/admin/control" element={<div className="h-full w-full relative max-w-md sm:max-w-3xl lg:max-w-5xl mx-auto bg-[#0d131f] shadow-2xl sm:rounded-2xl sm:border sm:border-slate-800 overflow-y-auto"><PageTransition><AdminControlScreen /></PageTransition></div>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

export default function App() {
  const [userId, setUserId] = useState<string>(() => {
    try {
      return localStorage.getItem('tradexora_user') || "";
    } catch {
      return "";
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem('tradexora_user');
    } catch {
      return false;
    }
  });

  const handleLoginSuccess = (id: string) => {
    try {
      localStorage.setItem('tradexora_user', id);
    } catch {}
    setUserId(id);
    setIsAuthenticated(true);
  };

  if (window.location.pathname.startsWith('/admin')) {
    return (
      <Router>
        <div className="h-screen w-full bg-[#0d131f] flex items-center justify-center font-sans p-0 sm:p-4">
          <div className="w-full max-w-md sm:max-w-3xl lg:max-w-5xl h-full bg-[#0d131f] shadow-2xl sm:rounded-2xl sm:border sm:border-slate-800 relative overflow-y-auto no-scrollbar flex flex-col">
            <AnimatedRoutes />
          </div>
        </div>
      </Router>
    );
  }

  if (window.location.pathname.startsWith('/checkout')) {
    return (
      <Router>
        <div className="min-h-screen w-full bg-slate-900 overflow-y-auto">
          <CheckoutScreen />
        </div>
      </Router>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen w-full bg-slate-100 flex items-center justify-center p-0 sm:p-4 font-sans">
        <div className="w-full max-w-md md:max-w-lg h-full sm:h-auto sm:max-h-[94vh] bg-white shadow-2xl sm:rounded-3xl sm:border sm:border-slate-200/80 relative overflow-hidden flex flex-col">
          <LoginScreen onLogin={handleLoginSuccess} />
        </div>
      </div>
    );
  }

  return (
    <AppProvider userId={userId}>
      <div className="h-[100dvh] min-h-screen w-full bg-slate-100 flex items-center justify-center font-sans p-0 sm:p-3 overflow-hidden">
        <Router>
          <AnimatedRoutes />
        </Router>
      </div>
    </AppProvider>
  );
}
