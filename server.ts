import express from "express";
import path from "path";
import fs from "fs";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
} from "firebase/firestore";

const app = express();
const PORT = 3000;
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));

// Enable CORS for external deployment targets like Netlify
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Health check endpoints for Cloud Run deployment and load balancers
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "TradeXora", timestamp: Date.now() });
});

app.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});

app.get("/download-html", (req, res) => {
  const file = path.join(process.cwd(), "public", "TradeXora_Full_App.html");
  if (fs.existsSync(file)) {
    res.download(file, "TradeXora_Full_App.html");
  } else {
    res.status(404).send("File not found");
  }
});

const BOT_TOKEN = "8698807421:AAGZpoqiDx7ALa_e0EsbPj3r_mvw8Htcl58";
const SUPPORT_BOT_TOKEN = "8624292909:AAHbgIyaC8Vw8dMwiK0-mJ8tUddxnpHcrdU";
const CHAT_ID = "8546421644";
const RENDER_PLATFORM_URL = "https://tradexora-platform-io-25nd.onrender.com";
const APP_URL = process.env.RENDER_EXTERNAL_URL || (process.env.NODE_ENV === "production" ? RENDER_PLATFORM_URL : (process.env.APP_URL || RENDER_PLATFORM_URL));

// Live Trade Tracking & Market Operating System State
interface LiveTrade {
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

interface MarketOverride {
  direction: 'AUTO' | 'BUY' | 'SELL';
  expiresAt: number;
  durationSeconds: number;
}

const activeLiveTrades = new Map<string, LiveTrade>();
const marketOverrides = new Map<string, MarketOverride>();

const DEFAULT_ASSETS = [
  // 1. Popular
  { assetId: '1', assetName: 'Casino (OTC)', symbol: 'CAS', price: 2499.07 },
  { assetId: '2', assetName: 'Bitcoin (Live)', symbol: 'BTC', price: 64200.5 },
  { assetId: '3', assetName: 'EUR/USD (OTC)', symbol: 'EURUSD', price: 1.1523 },
  { assetId: '4', assetName: 'Gold (OTC)', symbol: 'XAU', price: 2345.1 },
  { assetId: '5', assetName: 'USD/INR (OTC)', symbol: 'USDINR', price: 86.84 },
  { assetId: '6', assetName: 'Tesla (OTC)', symbol: 'TSLA', price: 215.60 },
  { assetId: '8', assetName: 'Meta (OTC)', symbol: 'META', price: 553.43 },

  // 2. Forex / Currencies (OTC pairs)
  { assetId: '9', assetName: 'GBP/USD (OTC)', symbol: 'GBPUSD', price: 1.2840 },
  { assetId: '10', assetName: 'USD/JPY (OTC)', symbol: 'USDJPY', price: 154.20 },
  { assetId: '11', assetName: 'AUD/USD (OTC)', symbol: 'AUDUSD', price: 0.6580 },
  { assetId: '12', assetName: 'USD/CAD (OTC)', symbol: 'USDCAD', price: 1.3725 },
  { assetId: '13', assetName: 'EUR/GBP (OTC)', symbol: 'EURGBP', price: 0.8540 },
  { assetId: '14', assetName: 'EUR/THB (OTC)', symbol: 'EURTHB', price: 37.79 },
  { assetId: '15', assetName: 'USD/BRL (OTC)', symbol: 'USDBRL', price: 5.4820 },
  { assetId: '16', assetName: 'USD/MXN (OTC)', symbol: 'USDMXN', price: 18.254 },
  { assetId: '17', assetName: 'USD/CHF (OTC)', symbol: 'USDCHF', price: 0.8950 },
  { assetId: '18', assetName: 'NZD/USD (OTC)', symbol: 'NZDUSD', price: 0.6120 },
  { assetId: '19', assetName: 'GBP/JPY (OTC)', symbol: 'GBPJPY', price: 198.40 },
  { assetId: '20', assetName: 'EUR/JPY (OTC)', symbol: 'EURJPY', price: 164.80 },
  { assetId: '21', assetName: 'AUD/JPY (OTC)', symbol: 'AUDJPY', price: 101.45 },
  { assetId: '22', assetName: 'CAD/JPY (OTC)', symbol: 'CADJPY', price: 112.35 },
  { assetId: '73', assetName: 'EUR/CHF (OTC)', symbol: 'EURCHF', price: 0.9420 },
  { assetId: '74', assetName: 'GBP/CAD (OTC)', symbol: 'GBPCAD', price: 1.7650 },
  { assetId: '75', assetName: 'AUD/CAD (OTC)', symbol: 'AUDCAD', price: 0.9030 },
  { assetId: '76', assetName: 'EUR/AUD (OTC)', symbol: 'EURAUD', price: 1.6320 },

  // 3. Cryptocurrencies
  { assetId: '23', assetName: 'Ethereum', symbol: 'ETH', price: 3450.8 },
  { assetId: '24', assetName: 'Solana (Live)', symbol: 'SOL', price: 148.65 },
  { assetId: '25', assetName: 'Binance Coin', symbol: 'BNB', price: 578.40 },
  { assetId: '26', assetName: 'Ripple (Live)', symbol: 'XRP', price: 0.5840 },
  { assetId: '27', assetName: 'Dogecoin', symbol: 'DOGE', price: 0.1245 },
  { assetId: '28', assetName: 'Toncoin', symbol: 'TON', price: 6.85 },
  { assetId: '29', assetName: 'Shiba Inu (OTC)', symbol: 'SHIB', price: 0.0000185 },
  { assetId: '30', assetName: 'Polygon', symbol: 'POL', price: 0.5240 },
  { assetId: '31', assetName: 'Chainlink', symbol: 'LINK', price: 12.45 },
  { assetId: '32', assetName: 'Litecoin', symbol: 'LTC', price: 74.20 },
  { assetId: '33', assetName: 'Polkadot', symbol: 'DOT', price: 5.15 },
  { assetId: '34', assetName: 'TRON (Live)', symbol: 'TRX', price: 0.1620 },
  { assetId: '35', assetName: 'Cardano', symbol: 'ADA', price: 0.4680 },
  { assetId: '36', assetName: 'Avalanche', symbol: 'AVAX', price: 28.90 },
  { assetId: '37', assetName: 'Pepe (OTC)', symbol: 'PEPE', price: 0.0000098 },
  { assetId: '77', assetName: 'NEAR Protocol', symbol: 'NEAR', price: 5.42 },
  { assetId: '78', assetName: 'Sui Network', symbol: 'SUI', price: 2.18 },
  { assetId: '79', assetName: 'Aptos', symbol: 'APT', price: 9.85 },
  { assetId: '80', assetName: 'Render Network', symbol: 'RENDER', price: 6.45 },
  { assetId: '81', assetName: 'Uniswap', symbol: 'UNI', price: 8.90 },
  { assetId: '82', assetName: 'Cosmos', symbol: 'ATOM', price: 6.75 },
  { assetId: '83', assetName: 'Arbitrum', symbol: 'ARB', price: 0.85 },
  { assetId: '84', assetName: 'Injective', symbol: 'INJ', price: 22.40 },

  // 4. Global Stocks
  { assetId: '38', assetName: 'Apple (OTC)', symbol: 'AAPL', price: 317.79 },
  { assetId: '39', assetName: 'Nvidia (OTC)', symbol: 'NVDA', price: 128.45 },
  { assetId: '40', assetName: 'Microsoft (OTC)', symbol: 'MSFT', price: 448.20 },
  { assetId: '41', assetName: 'Amazon (OTC)', symbol: 'AMZN', price: 186.75 },
  { assetId: '42', assetName: 'Alphabet / Google', symbol: 'GOOGL', price: 179.30 },
  { assetId: '43', assetName: 'AMD (OTC)', symbol: 'AMD', price: 154.60 },
  { assetId: '44', assetName: 'Intel (OTC)', symbol: 'INTC', price: 24.15 },
  { assetId: '45', assetName: 'Alibaba (OTC)', symbol: 'BABA', price: 84.30 },
  { assetId: '46', assetName: 'Coca-Cola (OTC)', symbol: 'KO', price: 68.40 },
  { assetId: '47', assetName: 'Walt Disney (OTC)', symbol: 'DIS', price: 96.20 },
  { assetId: '48', assetName: 'Visa (OTC)', symbol: 'V', price: 278.50 },
  { assetId: '49', assetName: 'Mastercard (OTC)', symbol: 'MA', price: 462.80 },
  { assetId: '50', assetName: 'Netflix (OTC)', symbol: 'NFLX', price: 672.10 },
  { assetId: '51', assetName: 'Baidu ADR (OTC)', symbol: 'BIDU', price: 108.26 },
  { assetId: '85', assetName: 'Taiwan Semi (TSMC)', symbol: 'TSM', price: 198.50 },
  { assetId: '86', assetName: 'Berkshire Hathaway', symbol: 'BRK', price: 462.10 },
  { assetId: '87', assetName: 'JPMorgan Chase', symbol: 'JPM', price: 224.30 },
  { assetId: '88', assetName: 'Walmart Inc.', symbol: 'WMT', price: 82.40 },
  { assetId: '89', assetName: 'Oracle (OTC)', symbol: 'ORCL', price: 172.90 },
  { assetId: '90', assetName: 'Broadcom (OTC)', symbol: 'AVGO', price: 178.60 },
  { assetId: '91', assetName: 'Eli Lilly (OTC)', symbol: 'LLY', price: 945.20 },
  { assetId: '92', assetName: 'Exxon Mobil', symbol: 'XOM', price: 118.40 },
  { assetId: '93', assetName: 'Costco Wholesale', symbol: 'COST', price: 912.80 },
  { assetId: '94', assetName: 'Nike (OTC)', symbol: 'NKE', price: 86.50 },
  { assetId: '95', assetName: 'Adobe Inc.', symbol: 'ADBE', price: 532.70 },
  { assetId: '96', assetName: 'Palantir (OTC)', symbol: 'PLTR', price: 42.80 },
  { assetId: '97', assetName: 'Coinbase Global', symbol: 'COIN', price: 218.40 },
  { assetId: '98', assetName: 'Spotify (OTC)', symbol: 'SPOT', price: 375.60 },
  { assetId: '99', assetName: 'Uber Technologies', symbol: 'UBER', price: 74.30 },

  // 5. Commodities & Precious Metals
  { assetId: '57', assetName: 'Silver (OTC)', symbol: 'XAG', price: 29.45 },
  { assetId: '58', assetName: 'Platinum (OTC)', symbol: 'XPT', price: 955.40 },
  { assetId: '59', assetName: 'Palladium (OTC)', symbol: 'XPD', price: 980.20 },
  { assetId: '60', assetName: 'Crude Oil Brent', symbol: 'BRENT', price: 84.60 },
  { assetId: '61', assetName: 'Crude Oil WTI', symbol: 'WTI', price: 80.25 },
  { assetId: '62', assetName: 'Natural Gas', symbol: 'NG', price: 2.15 },
  { assetId: '63', assetName: 'Copper (Live)', symbol: 'HG', price: 4.45 },
  { assetId: '100', assetName: 'Gold in EUR (OTC)', symbol: 'XAUEUR', price: 2150.80 },
  { assetId: '101', assetName: 'Silver in EUR (OTC)', symbol: 'XAGEUR', price: 27.15 },

  // 6. Indices & Market Benchmarks
  { assetId: '64', assetName: 'NASDAQ 100', symbol: 'NDX', price: 19850.0 },
  { assetId: '65', assetName: 'S&P 500', symbol: 'SPX', price: 5540.2 },
  { assetId: '66', assetName: 'Dow Jones 30', symbol: 'DJI', price: 40280.0 },
  { assetId: '69', assetName: 'DAX 40 Germany', symbol: 'GER40', price: 18650.0 },
  { assetId: '70', assetName: 'FTSE 100 UK', symbol: 'UK100', price: 8240.0 },
  { assetId: '71', assetName: 'Nikkei 225 Japan', symbol: 'JP225', price: 38250.0 },
  { assetId: '72', assetName: 'Hang Seng (OTC)', symbol: 'HSI', price: 17650.0 },
  { assetId: '102', assetName: 'CAC 40 France', symbol: 'CAC40', price: 7540.0 },
  { assetId: '103', assetName: 'Euro Stoxx 50', symbol: 'SX5E', price: 4920.0 },
  { assetId: '104', assetName: 'ASX 200 Australia', symbol: 'ASX200', price: 8120.0 },
  { assetId: '105', assetName: 'IBEX 35 Spain', symbol: 'IBEX35', price: 11650.0 }
];

// Simple JSON DB File (fallback / migration source)
const DB_FILE = path.join(process.cwd(), "db.json");

interface User {
  email: string;
  password?: string;
  name?: string;
  balance: number;
  wagerTarget: number;
  wagerCurrent: number;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  referralBonus: number;
  hasDeposited?: boolean;
  consecutiveWins?: number;
  consecutiveWinDetections?: number;
  depositLimitDetections?: number;
  isBlocked?: boolean;
  gameActive?: boolean;
  lastActionTime?: number;
  rapidActionCount?: number;
  winRate?: number;
  isRiskFree?: boolean;
}

interface DBType {
  users: Record<string, User>;
  transactions: Record<
    string,
    {
      type: "deposit" | "withdraw" | "bet" | "win" | "promo_reg" | "promo_dep" | "promo_bet";
      amount: number;
      userId: string;
      status: "pending" | "approved" | "rejected";
      utr?: string;
      upi?: string;
      date: string;
      description?: string;
    }
  >;
}

// Local DB fallback helper
function getDb(): DBType {
  if (!fs.existsSync(DB_FILE)) {
    return { users: {}, transactions: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  } catch (e) {
    console.error("Local JSON DB parse failed:", e);
    return { users: {}, transactions: {} };
  }
}

function saveDb(db: DBType) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error("Local JSON DB save failed:", e);
  }
}

// Initialize Firestore using Client SDK (which uses the API Key and is subject to security rules)
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
let firestoreDb: any = null;

try {
  if (fs.existsSync(firebaseConfigPath)) {
    const config = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    const firebaseApp = initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId
    });
    // Initialize Firestore with custom databaseId
    firestoreDb = getFirestore(firebaseApp, config.firestoreDatabaseId || "(default)");
    console.log("Firebase Firestore Client SDK initialized successfully with DB ID:", config.firestoreDatabaseId);
  } else {
    console.warn("firebase-applet-config.json not found. Firestore is running in fallback mode.");
  }
} catch (e) {
  console.error("Failed to initialize Firebase Client SDK:", e);
}

// Asynchronous Firestore / Local Fallback Database Wrapper
async function getUser(email: string): Promise<User | null> {
  const normalizedEmail = (email || "").toLowerCase().trim();
  if (!normalizedEmail) return null;
  
  if (firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "users", normalizedEmail);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const u = docSnap.data() as User;
        u.isBlocked = false;
        return u;
      }
      return null;
    } catch (e) {
      console.error(`Firestore getUser error for ${normalizedEmail}:`, e);
    }
  }
  
  // Local fallback
  const db = getDb();
  const u = db.users[normalizedEmail] || null;
  if (u) {
    u.isBlocked = false;
  }
  return u;
}

async function saveUser(email: string, user: User): Promise<void> {
  const normalizedEmail = (email || "").toLowerCase().trim();
  if (!normalizedEmail) return;
  
  if (firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "users", normalizedEmail);
      await setDoc(docRef, user, { merge: true });
      return;
    } catch (e) {
      console.error(`Firestore saveUser error for ${normalizedEmail}:`, e);
    }
  }
  
  // Local fallback
  const db = getDb();
  db.users[normalizedEmail] = user;
  saveDb(db);
}

async function deleteUser(email: string): Promise<boolean> {
  const normalizedEmail = (email || "").toLowerCase().trim();
  if (!normalizedEmail) return false;

  let deleted = false;
  if (firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "users", normalizedEmail);
      await deleteDoc(docRef);
      deleted = true;
    } catch (e) {
      console.error(`Firestore deleteUser error for ${normalizedEmail}:`, e);
    }
  }

  // Local fallback
  const db = getDb();
  if (db.users && db.users[normalizedEmail]) {
    delete db.users[normalizedEmail];
    saveDb(db);
    deleted = true;
  }
  return deleted;
}

async function addTransaction(txId: string, tx: any): Promise<void> {
  if (firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "transactions", txId);
      await setDoc(docRef, tx);
      return;
    } catch (e) {
      console.error(`Firestore addTransaction error for ${txId}:`, e);
    }
  }
  
  // Local fallback
  const db = getDb();
  if (!db.transactions) db.transactions = {};
  db.transactions[txId] = tx;
  saveDb(db);
}

async function getTransaction(txId: string): Promise<any | null> {
  if (firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "transactions", txId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (e) {
      console.error(`Firestore getTransaction error for ${txId}:`, e);
    }
  }
  
  // Local fallback
  const db = getDb();
  return db.transactions?.[txId] || null;
}

async function updateTransaction(txId: string, updates: any): Promise<void> {
  if (firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "transactions", txId);
      await updateDoc(docRef, updates);
      return;
    } catch (e) {
      console.error(`Firestore updateTransaction error for ${txId}:`, e);
    }
  }
  
  // Local fallback
  const db = getDb();
  if (db.transactions && db.transactions[txId]) {
    db.transactions[txId] = { ...db.transactions[txId], ...updates };
    saveDb(db);
  }
}

async function getUserTransactions(
  userId: string,
  limitCount: number = 500,
  filterType?: string[]
): Promise<any[]> {
  const normalizedUserId = (userId || "").toLowerCase().trim();
  if (!normalizedUserId) return [];

  if (firestoreDb) {
    try {
      const txsRef = collection(firestoreDb, "transactions");
      let q;
      if (filterType && filterType.length > 0) {
        q = query(
          txsRef,
          where("userId", "==", normalizedUserId),
          where("type", "in", filterType),
          orderBy("date", "desc"),
          limit(limitCount)
        );
      } else {
        q = query(
          txsRef,
          where("userId", "==", normalizedUserId),
          orderBy("date", "desc"),
          limit(limitCount)
        );
      }
      const querySnapshot = await getDocs(q);
      const txs: any[] = [];
      querySnapshot.forEach((doc) => {
        txs.push({ id: doc.id, ...(doc.data() as any) });
      });
      return txs;
    } catch (e) {
      console.warn("Firestore indexed getUserTransactions query failed, falling back to basic query:", e);
      try {
        const txsRef = collection(firestoreDb, "transactions");
        const q = query(txsRef, where("userId", "==", normalizedUserId));
        const querySnapshot = await getDocs(q);
        let txs: any[] = [];
        querySnapshot.forEach((doc) => {
          txs.push({ id: doc.id, ...(doc.data() as any) });
        });
        if (filterType && filterType.length > 0) {
          txs = txs.filter((tx: any) => filterType.includes(tx.type));
        }
        txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return txs.slice(0, limitCount);
      } catch (err) {
        console.error("Firestore basic transaction fallback query failed:", err);
      }
    }
  }
  
  // Local fallback
  const db = getDb();
  const txs = Object.entries(db.transactions || {})
    .map(([id, tx]) => ({ id, ...tx }))
    .filter((tx) => tx.userId === normalizedUserId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  if (filterType && filterType.length > 0) {
    return txs.filter((tx) => filterType.includes(tx.type)).slice(0, limitCount);
  }
  return txs.slice(0, limitCount);
}

async function getUserTotalDeposit(userId: string): Promise<number> {
  const txs = await getUserTransactions(userId, 1000, ["deposit"]);
  return txs
    .filter((tx) => tx.status === "approved")
    .reduce((sum, tx) => sum + tx.amount, 0);
}

// Global Auto-Profit Algorithm Configuration
interface AutoProfitConfig {
  enabled: boolean;
  targetMargin: number; // e.g. 0.25 (25% net house profit)
  mode: 'AUTO' | 'RECOVERY' | 'BALANCED';
  forceProfitTrigger?: boolean;
}

let autoProfitConfig: AutoProfitConfig = {
  enabled: true,
  targetMargin: 0.25, // 25% target house edge
  mode: 'AUTO'
};

// Master Demo Account Configuration & Global Candlestick Driver
interface MasterAccountConfig {
  email: string;
  enabled: boolean;
  driveGlobalCandles: boolean; // When master trades CALL -> global BUY/Green; PUT -> global SELL/Red
  winRate: number; // 1.0 = 100% win rate
}

let masterAccountConfig: MasterAccountConfig = {
  email: "tnxjatavji@gmail.com",
  enabled: true,
  driveGlobalCandles: true,
  winRate: 1.0
};

async function getAllUsers(): Promise<User[]> {
  if (firestoreDb) {
    try {
      const usersRef = collection(firestoreDb, "users");
      const snap = await getDocs(usersRef);
      const list: User[] = [];
      snap.forEach((docSnap) => {
        list.push({ ...(docSnap.data() as User), email: docSnap.id });
      });
      return list;
    } catch (e) {
      console.error("Firestore getAllUsers error:", e);
    }
  }
  const db = getDb();
  return Object.entries(db.users || {}).map(([email, u]) => ({ ...u, email }));
}

async function getAllTransactionsList(limitCount: number = 2000): Promise<any[]> {
  if (firestoreDb) {
    try {
      const txsRef = collection(firestoreDb, "transactions");
      const snap = await getDocs(txsRef);
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      return list.slice(0, limitCount);
    } catch (e) {
      console.error("Firestore getAllTransactionsList error:", e);
    }
  }
  const db = getDb();
  return Object.entries(db.transactions || {})
    .map(([id, tx]) => ({ id, ...tx }))
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, limitCount);
}

async function calculatePlatformAnalytics() {
  const users = await getAllUsers();
  const txs = await getAllTransactionsList(2500);
  const now = new Date();

  // Midnight today (local / UTC)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  // 1st of current month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let todayDeposits = 0;
  let todayWithdrawals = 0;
  let todayPendingWithdrawals = 0;
  let monthlyDeposits = 0;
  let monthlyWithdrawals = 0;
  let lifetimeDeposits = 0;
  let lifetimeWithdrawals = 0;
  let todayBets = 0;
  let todayWins = 0;

  const todayActiveUserSet = new Set<string>();

  txs.forEach((tx) => {
    const txTime = new Date(tx.date || 0).getTime();
    const isApproved = tx.status === 'approved';
    const isPending = tx.status === 'pending';
    const amt = Number(tx.amount || 0);

    if (txTime >= startOfToday) {
      if (tx.userId) todayActiveUserSet.add(tx.userId.toLowerCase());
      if (tx.type === 'deposit' && isApproved) todayDeposits += amt;
      if (tx.type === 'withdraw') {
        if (isApproved) todayWithdrawals += amt;
        if (isPending) todayPendingWithdrawals += amt;
      }
      if (tx.type === 'bet' && isApproved) todayBets += amt;
      if (tx.type === 'win' && isApproved) todayWins += amt;
    }

    if (txTime >= startOfMonth) {
      if (tx.type === 'deposit' && isApproved) monthlyDeposits += amt;
      if (tx.type === 'withdraw' && isApproved) monthlyWithdrawals += amt;
    }

    if (tx.type === 'deposit' && isApproved) lifetimeDeposits += amt;
    if (tx.type === 'withdraw' && isApproved) lifetimeWithdrawals += amt;
  });

  // Also include users who have open live trades right now
  for (const trade of activeLiveTrades.values()) {
    if (trade.userId) {
      todayActiveUserSet.add(trade.userId.toLowerCase());
    }
  }

  // Exclude demo master accounts from user balances liability
  const masterEmailClean = (masterAccountConfig.email || "").toLowerCase().trim();
  const totalUserBalances = users
    .filter(u => u.email.toLowerCase().trim() !== masterEmailClean)
    .reduce((sum, u) => sum + (Number(u.balance) || 0), 0);

  // Platform Net Profit = Lifetime Deposits - (Lifetime Withdrawals + User Balances Liability)
  const platformNetProfit = Number((lifetimeDeposits - (lifetimeWithdrawals + totalUserBalances)).toFixed(2));
  const isProfit = platformNetProfit >= 0;
  const currentMargin = lifetimeDeposits > 0 
    ? Number(((platformNetProfit / lifetimeDeposits) * 100).toFixed(1))
    : 100;

  // Auto-Profit Algorithm Engine:
  // Dynamically regulates baseline binary options win-rate across the platform
  // to ensure house profitability is strictly preserved and losses are instantly recovered.
  let dynamicAlgorithmWinRate = 0.45;
  let algorithmStatus = "PROFITABLE - HEALTHY HOUSE EDGE";
  let algorithmAction = "Maintaining standard organic house odds (~45% win rate)";

  if (!autoProfitConfig.enabled) {
    algorithmStatus = "DISABLED (MANUAL CONTROL ONLY)";
    algorithmAction = "Default fair odds active";
    dynamicAlgorithmWinRate = 0.48;
  } else if (platformNetProfit < 0 || (lifetimeDeposits > 500 && currentMargin < 8)) {
    // Loss detected! The algorithm automatically steps in to bring platform into profit
    algorithmStatus = "⚡ LOSS RECOVERY ACTIVE (AUTOMATIC PROFIT ENFORCEMENT)";
    algorithmAction = "Dynamic outcome bias engaged (30% win rate) to bring house back to net profit";
    dynamicAlgorithmWinRate = 0.30;
  } else if (currentMargin < (autoProfitConfig.targetMargin * 100)) {
    // Margin below target
    algorithmStatus = "🛡️ HOUSE EDGE STABILIZER ACTIVE";
    algorithmAction = `Dynamic calibration (38% win rate) to achieve target +${Math.round(autoProfitConfig.targetMargin * 100)}% profit margin`;
    dynamicAlgorithmWinRate = 0.38;
  } else {
    algorithmStatus = `🟢 SECURE NET PROFIT (MARGIN: +${currentMargin}%)`;
    algorithmAction = "House edge healthy and profitable. Standard trading conditions active.";
    dynamicAlgorithmWinRate = 0.45;
  }

  return {
    totalUsers: users.length,
    activeTradersToday: Math.max(todayActiveUserSet.size, activeLiveTrades.size > 0 ? activeLiveTrades.size : users.length > 0 ? 1 : 0),
    openLiveTradesCount: activeLiveTrades.size,
    todayDeposits: Number(todayDeposits.toFixed(2)),
    todayWithdrawals: Number(todayWithdrawals.toFixed(2)),
    todayPendingWithdrawals: Number(todayPendingWithdrawals.toFixed(2)),
    todayNetInflow: Number((todayDeposits - todayWithdrawals).toFixed(2)),
    monthlyDeposits: Number(monthlyDeposits.toFixed(2)),
    monthlyWithdrawals: Number(monthlyWithdrawals.toFixed(2)),
    monthlyNetInflow: Number((monthlyDeposits - monthlyWithdrawals).toFixed(2)),
    lifetimeDeposits: Number(lifetimeDeposits.toFixed(2)),
    lifetimeWithdrawals: Number(lifetimeWithdrawals.toFixed(2)),
    totalUserBalances: Number(totalUserBalances.toFixed(2)),
    platformNetProfit,
    isProfit,
    currentMargin,
    masterAccount: masterAccountConfig,
    autoProfitAlgorithm: {
      enabled: autoProfitConfig.enabled,
      targetMargin: autoProfitConfig.targetMargin,
      currentStatus: algorithmStatus,
      action: algorithmAction,
      dynamicWinRate: dynamicAlgorithmWinRate
    },
    usersSummary: users.map(u => ({
      email: u.email,
      name: u.name || u.email.split('@')[0],
      balance: Number(u.balance || 0),
      hasDeposited: !!u.hasDeposited,
      winRate: u.winRate,
      isRiskFree: !!u.isRiskFree,
      isBlocked: !!u.isBlocked,
      referralCount: u.referralCount || 0,
      referralBonus: u.referralBonus || 0,
      wagerTarget: u.wagerTarget || 0,
      wagerCurrent: u.wagerCurrent || 0
    })),
    recentTransactions: txs.slice(0, 100)
  };
}

function formatTelegramAnalyticsReport(analytics: any): { text: string; keyboard: any } {
  const isProfit = analytics.isProfit;
  const profitSymbol = isProfit ? "🟢" : "🔴";
  const profitStatusText = isProfit ? "NET PROFIT" : "DEFICIT (AUTO-RECOVERY ENGAGED)";
  const formattedProfit = `₹${Math.abs(analytics.platformNetProfit).toLocaleString('en-IN')}`;
  const operatingLink = `${APP_URL}/admin/control`;

  const text = 
    `📊 <b>TRADEXORA EXECUTIVE PROFIT & FINANCIAL REPORT</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🏦 <b>House State:</b> ${profitSymbol} <b>${profitStatusText}</b>\n` +
    `📈 <b>Net House Profit:</b> <code>${isProfit ? '+' : '-'}${formattedProfit}</code> (<b>${analytics.currentMargin}% margin</b>)\n` +
    `👥 <b>Active Traders Today:</b> <b>${analytics.activeTradersToday}</b> Traders\n` +
    `🔥 <b>Open Live Deals:</b> <b>${analytics.openLiveTradesCount}</b> Positions\n` +
    `👤 <b>Registered Users:</b> <b>${analytics.totalUsers}</b> Accounts\n\n` +
    `📅 <b>TODAY'S CASH FLOW</b>\n` +
    `• <b>Deposits:</b> ₹${analytics.todayDeposits.toLocaleString('en-IN')}\n` +
    `• <b>Withdrawals:</b> ₹${analytics.todayWithdrawals.toLocaleString('en-IN')}${analytics.todayPendingWithdrawals > 0 ? ` <i>(Pending: ₹${analytics.todayPendingWithdrawals})</i>` : ''}\n` +
    `• <b>Net Inflow:</b> <b>₹${analytics.todayNetInflow.toLocaleString('en-IN')}</b>\n\n` +
    `🗓️ <b>MONTHLY CASH FLOW</b>\n` +
    `• <b>Deposits:</b> ₹${analytics.monthlyDeposits.toLocaleString('en-IN')}\n` +
    `• <b>Withdrawals:</b> ₹${analytics.monthlyWithdrawals.toLocaleString('en-IN')}\n` +
    `• <b>Net Inflow:</b> <b>₹${analytics.monthlyNetInflow.toLocaleString('en-IN')}</b>\n\n` +
    `💎 <b>LIFETIME TOTALS & RESERVES</b>\n` +
    `• <b>Total Deposits Inflow:</b> ₹${analytics.lifetimeDeposits.toLocaleString('en-IN')}\n` +
    `• <b>Total Withdrawals Paid:</b> ₹${analytics.lifetimeWithdrawals.toLocaleString('en-IN')}\n` +
    `• <b>Active User Balances:</b> ₹${analytics.totalUserBalances.toLocaleString('en-IN')}\n\n` +
    `👑 <b>MASTER DEMO DRIVER:</b> ${masterAccountConfig.enabled ? '✅ <b>ACTIVE</b>' : '❌ <b>DISABLED</b>'}\n` +
    `• <b>Account:</b> <code>${masterAccountConfig.email}</code>\n` +
    `• <b>Candlestick Driver:</b> ${masterAccountConfig.driveGlobalCandles ? '🟢 Active (Master trades steer ALL user charts)' : '⚪ Off'}\n` +
    `<i>(Master/Demo balances are 100% excluded from House Liabilities)</i>\n\n` +
    `🛡️ <b>AUTO-PROFIT ENGINE:</b> ${analytics.autoProfitAlgorithm.enabled ? '✅ <b>ACTIVE</b>' : '❌ <b>OFF</b>'}\n` +
    `• <i>${analytics.autoProfitAlgorithm.currentStatus}</i>\n` +
    `• <i>${analytics.autoProfitAlgorithm.action}</i>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔗 <b>Full A-to-Z Master Portal:</b>\n${operatingLink}`;

  const keyboard = [
    [
      { text: "📊 Open Live A-to-Z Master Portal", url: operatingLink }
    ],
    [
      { text: "⚡ Auto-Profit: " + (analytics.autoProfitAlgorithm.enabled ? "ON (25%)" : "OFF"), callback_data: "toggle_autoprofit" },
      { text: "🔄 Refresh Live PnL", callback_data: "refresh_analytics" }
    ],
    [
      { text: "📱 Open TradeXora Trading App", url: APP_URL }
    ]
  ];

  return { text, keyboard };
}

async function isReferralCodeUnique(code: string): Promise<boolean> {
  const upperCode = code.toUpperCase().trim();
  if (firestoreDb) {
    try {
      const usersRef = collection(firestoreDb, "users");
      const q = query(usersRef, where("referralCode", "==", upperCode), limit(1));
      const snap = await getDocs(q);
      return snap.empty;
    } catch (e) {
      console.error("Firestore referral code check failed:", e);
    }
  }
  const db = getDb();
  return !Object.values(db.users).some((u) => u.referralCode === upperCode);
}

async function getUserByReferralCode(code: string): Promise<User | null> {
  const upperCode = code.toUpperCase().trim();
  if (firestoreDb) {
    try {
      const usersRef = collection(firestoreDb, "users");
      const q = query(usersRef, where("referralCode", "==", upperCode), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as User;
      }
      return null;
    } catch (e) {
      console.error("Firestore getUserByReferralCode failed:", e);
    }
  }
  const db = getDb();
  const referrer = Object.values(db.users).find(
    (u) => u.referralCode === upperCode
  );
  return referrer || null;
}

interface GiftCode {
  code: string;
  amount: number;
  isUsed: boolean;
  usedBy?: string;
  usedAt?: string;
  createdAt: string;
}

// Config db helper
async function getAboutText(): Promise<string> {
  const defaultAboutText = "Welcome to Mines Game! Enjoy a premium Mines betting game with an interactive grid, automated multiplier logic, robust security features, and a layered promotion network. Play responsibly and have fun!";
  if (firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "configs", "about");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return (docSnap.data() as any).text || defaultAboutText;
      }
    } catch (e) {
      console.error("Firestore getAboutText error:", e);
    }
  }
  const db = getDb() as any;
  return db.configs?.about?.text || defaultAboutText;
}

async function saveAboutText(text: string): Promise<void> {
  if (firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "configs", "about");
      await setDoc(docRef, { text });
      return;
    } catch (e) {
      console.error("Firestore saveAboutText error:", e);
    }
  }
  const db = getDb() as any;
  if (!db.configs) db.configs = {};
  db.configs.about = { text };
  saveDb(db);
}

// Gift codes helpers
async function getGiftCode(code: string): Promise<GiftCode | null> {
  const normalizedCode = (code || "").toUpperCase().trim();
  if (!normalizedCode) return null;
  if (firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "gift_codes", normalizedCode);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as GiftCode;
      }
      return null;
    } catch (e) {
      console.error("Firestore getGiftCode error:", e);
    }
  }
  const db = getDb() as any;
  return db.giftCodes?.[normalizedCode] || null;
}

async function saveGiftCode(code: string, gift: GiftCode): Promise<void> {
  const normalizedCode = (code || "").toUpperCase().trim();
  if (!normalizedCode) return;
  if (firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "gift_codes", normalizedCode);
      await setDoc(docRef, gift);
      return;
    } catch (e) {
      console.error("Firestore saveGiftCode error:", e);
    }
  }
  const db = getDb() as any;
  if (!db.giftCodes) db.giftCodes = {};
  db.giftCodes[normalizedCode] = gift;
  saveDb(db);
}

// Database Full Wipe & Zero State Initializer (for fresh public release)
async function wipeAllDatabaseData() {
  try {
    // 1. Reset local JSON database
    saveDb({ users: {}, transactions: {} });
    console.log("Local JSON database wiped to zero.");

    // 2. Wipe Firestore collections if active
    if (firestoreDb) {
      const collectionsToWipe = ["users", "transactions", "gift_codes"];
      for (const colName of collectionsToWipe) {
        try {
          const colRef = collection(firestoreDb, colName);
          const snapshot = await getDocs(colRef);
          for (const d of snapshot.docs) {
            await deleteDoc(d.ref);
          }
          console.log(`Firestore collection '${colName}' cleared.`);
        } catch (err) {
          console.warn(`Firestore clear for ${colName} warning:`, err);
        }
      }
    }
    console.log("Trading platform database completely reset to 0 for public launch.");
  } catch (e) {
    console.error("Database wipe error:", e);
  }
}

// Auto migration of local database records to Firebase Firestore
async function migrateDbToFirestore() {
  if (!firestoreDb) return;
  try {
    const db = getDb();
    if (!db || !db.users) return;
    
    console.log("Checking DB records to migrate to Firestore...");
    
    // Migrate Users
    for (const [email, user] of Object.entries(db.users)) {
      const normalizedEmail = email.toLowerCase().trim();
      const existing = await getUser(normalizedEmail);
      if (!existing) {
        console.log(`Migrating user account: ${normalizedEmail}`);
        const userToSave = {
          ...(user as any),
          email: normalizedEmail,
          balance: Number(user.balance || 0),
          wagerTarget: Number(user.wagerTarget || 0),
          wagerCurrent: Number(user.wagerCurrent || 0),
          referralCount: Number(user.referralCount || 0),
          referralBonus: Number(user.referralBonus || 0),
          isBlocked: !!user.isBlocked,
          hasDeposited: !!user.hasDeposited,
        };
        await saveUser(normalizedEmail, userToSave);
      }
    }
    
    // Migrate Transactions
    if (db.transactions) {
      for (const [txId, tx] of Object.entries(db.transactions)) {
        const existingTx = await getTransaction(txId);
        if (!existingTx) {
          console.log(`Migrating transaction record: ${txId}`);
          await addTransaction(txId, {
            ...tx,
            userId: tx.userId.toLowerCase().trim(),
            amount: Number(tx.amount || 0),
          });
        }
      }
    }
    console.log("Database synchronization check completed.");
  } catch (e) {
    console.error("Database migration to Firestore failed:", e);
  }
}

// Telegram Helpers
async function sendTelegramMessage(text: string, inlineKeyboard?: any, customChatId?: string) {
  if (!BOT_TOKEN) return false;
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const body: any = {
    chat_id: customChatId || CHAT_ID,
    text: text,
    parse_mode: "HTML",
  };
  if (inlineKeyboard) {
    body.reply_markup = { inline_keyboard: inlineKeyboard };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data: any = await res.json();
    if (data && data.ok) return data;
    // Fallback if HTML parsing failed
    if (data && !data.ok && (data.description?.includes("entities") || data.description?.includes("parse"))) {
      console.warn("Retrying sendTelegramMessage without HTML parse_mode...");
      delete body.parse_mode;
      body.text = text.replace(/<[^>]*>/g, "");
      const retry = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return await retry.json();
    }
    return data;
  } catch (e) {
    console.error("Telegram send error", e);
    return false;
  }
}

async function sendTelegramPhoto(photoUrl: string, caption: string, inlineKeyboard?: any, customChatId?: string) {
  if (!BOT_TOKEN) return false;
  const chatId = customChatId || CHAT_ID;
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
  const body: any = {
    chat_id: chatId,
    photo: photoUrl,
    caption: caption,
    parse_mode: "HTML",
  };
  if (inlineKeyboard) {
    body.reply_markup = { inline_keyboard: inlineKeyboard };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data: any = await res.json();
    if (data && data.ok) {
      return data;
    }
    // If sending photo failed (bad URL, 302 redirect, invalid format), immediately fall back to text message!
    console.warn("Telegram sendPhoto failed, falling back to sendTelegramMessage text:", data?.description || data);
    return await sendTelegramMessage(caption, inlineKeyboard, chatId);
  } catch (e) {
    console.error("Telegram sendPhoto error, falling back to sendTelegramMessage:", e);
    return await sendTelegramMessage(caption, inlineKeyboard, chatId);
  }
}

async function sendTelegramLogoPhoto(caption: string, inlineKeyboard?: any, customChatId?: string) {
  if (!BOT_TOKEN) return false;
  try {
    const filePath = path.join(process.cwd(), "public", "tradexora_logo.jpg");
    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      const blob = new Blob([fileBuffer], { type: "image/jpeg" });
      const formData = new FormData();
      formData.append("chat_id", customChatId || CHAT_ID);
      formData.append("photo", blob, "tradexora_logo.jpg");
      formData.append("caption", caption);
      formData.append("parse_mode", "HTML");
      if (inlineKeyboard) {
        formData.append("reply_markup", JSON.stringify({ inline_keyboard: inlineKeyboard }));
      }
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: "POST",
        body: formData,
      });
      const data: any = await res.json();
      if (data && data.ok) return true;
    }
  } catch (e) {
    console.error("sendTelegramLogoPhoto failed:", e);
  }
  // Fallback to text message
  return await sendTelegramMessage(caption, inlineKeyboard, customChatId);
}

async function sendTelegramDocument(documentUrl: string, caption: string, inlineKeyboard?: any, customChatId?: string) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`;
  const body: any = {
    chat_id: customChatId || CHAT_ID,
    document: documentUrl,
    caption: caption,
    parse_mode: "HTML",
  };
  if (inlineKeyboard) {
    body.reply_markup = { inline_keyboard: inlineKeyboard };
  }
  return await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch((e) => console.error("Telegram sendDocument error", e));
}

async function answerCallbackQuery(callbackQueryId: string, text: string) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  }).catch((e) => console.error("Telegram answer cb error", e));
}

// =======================================================
// TradeXora Official Support Bot Helpers (@Dear_aanshiji_bot)
// =======================================================
async function sendSupportTelegramMessage(chatId: string | number, text: string, inlineKeyboard?: any) {
  if (!SUPPORT_BOT_TOKEN) return false;
  const url = `https://api.telegram.org/bot${SUPPORT_BOT_TOKEN}/sendMessage`;
  const body: any = {
    chat_id: String(chatId),
    text: text,
    parse_mode: "HTML",
  };
  if (inlineKeyboard) {
    body.reply_markup = { inline_keyboard: inlineKeyboard };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data: any = await res.json();
    if (data && data.ok) return true;

    // Retry without HTML parse mode if entities failed
    if (data && !data.ok && (data.description?.includes("entities") || data.description?.includes("parse"))) {
      console.warn("Retrying sendSupportTelegramMessage without HTML parse_mode...");
      delete body.parse_mode;
      body.text = text.replace(/<[^>]*>/g, "");
      const retry = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const retryData: any = await retry.json();
      return retryData && retryData.ok;
    }
    console.error("Support bot sendMessage failed:", data);
    return false;
  } catch (e) {
    console.error("Support bot sendMessage error:", e);
    return false;
  }
}

async function sendSupportTelegramPhoto(chatId: string | number, photo: string, caption?: string, inlineKeyboard?: any) {
  if (!SUPPORT_BOT_TOKEN) return false;
  const url = `https://api.telegram.org/bot${SUPPORT_BOT_TOKEN}/sendPhoto`;
  const body: any = {
    chat_id: String(chatId),
    photo: photo,
    caption: caption || "",
    parse_mode: "HTML",
  };
  if (inlineKeyboard) {
    body.reply_markup = { inline_keyboard: inlineKeyboard };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data: any = await res.json();
    if (data && data.ok) return true;

    console.warn("Support bot sendPhoto failed, falling back to message:", data?.description || data);
    return await sendSupportTelegramMessage(chatId, caption || "Photo", inlineKeyboard);
  } catch (e) {
    return await sendSupportTelegramMessage(chatId, caption || "Photo", inlineKeyboard);
  }
}

async function answerSupportCallbackQuery(callbackQueryId: string, text?: string) {
  if (!SUPPORT_BOT_TOKEN) return;
  const url = `https://api.telegram.org/bot${SUPPORT_BOT_TOKEN}/answerCallbackQuery`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text: text || "" }),
  }).catch(() => {});
}

// =======================================================
// Platform Power & Silent Keep-Alive Engine (UptimeRobot Replacement)
// =======================================================
interface KeepAliveStats {
  targetUrl: string;
  totalPings: 0 | number;
  successfulPings: 0 | number;
  failedPings: 0 | number;
  lastPingTime: number;
  lastStatus: string;
  lastLatencyMs: number;
}

const keepAliveStats: KeepAliveStats = {
  targetUrl: RENDER_PLATFORM_URL,
  totalPings: 0,
  successfulPings: 0,
  failedPings: 0,
  lastPingTime: 0,
  lastStatus: "Initializing 24/7 worker",
  lastLatencyMs: 0,
};

function startSilentKeepAlive() {
  const PING_INTERVAL_MS = 2 * 60 * 1000; // Ping every 2 minutes (Render free spins down after 15m)

  const doSilentPing = async () => {
    const start = Date.now();
    try {
      const res = await fetch(`${RENDER_PLATFORM_URL}/api/ping`, {
        headers: { "User-Agent": "TradeXora-SupportBot-PowerWorker/2.0" },
        signal: AbortSignal.timeout(20000),
      });
      const latency = Date.now() - start;
      keepAliveStats.totalPings++;
      keepAliveStats.lastPingTime = Date.now();
      keepAliveStats.lastLatencyMs = latency;
      if (res.ok) {
        keepAliveStats.successfulPings++;
        keepAliveStats.lastStatus = `200 OK (${latency}ms)`;
      } else {
        keepAliveStats.failedPings++;
        keepAliveStats.lastStatus = `HTTP ${res.status} (${latency}ms)`;
      }
    } catch (e: any) {
      keepAliveStats.totalPings++;
      keepAliveStats.failedPings++;
      keepAliveStats.lastPingTime = Date.now();
      keepAliveStats.lastStatus = `Timeout/Error: ${e?.message || "unreachable"}`;
    }
  };

  // Immediate first ping after 2 seconds
  setTimeout(doSilentPing, 2000);
  // Recurring ping every 2 minutes
  setInterval(doSilentPing, PING_INTERVAL_MS);
}

// Lightweight keepalive & monitoring endpoints
app.get("/api/ping", (req, res) => {
  res.status(200).json({
    status: "alive",
    service: "TradeXora 24/7 Platform & Support Bot Engine",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: Date.now(),
  });
});

app.get("/api/keepalive", (req, res) => {
  res.status(200).json({
    status: "ok",
    stats: keepAliveStats,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: Date.now(),
  });
});

// Direct APK Download Routes with Custom Headers & Platform Name
app.get(["/TradeXora.apk", "/tradexora.apk", "/app.apk", "/api/download-apk", "/download/apk"], (req, res) => {
  const customApkPath = path.join(process.cwd(), "public", "TradeXora.apk");
  if (fs.existsSync(customApkPath)) {
    res.setHeader("Content-Disposition", 'attachment; filename="TradeXora.apk"');
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    return res.sendFile(customApkPath);
  }
  const fallbackPath = path.join(process.cwd(), "public", "minesgame.apk");
  if (fs.existsSync(fallbackPath)) {
    res.setHeader("Content-Disposition", 'attachment; filename="TradeXora.apk"');
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    return res.sendFile(fallbackPath);
  }
  res.status(404).send("TradeXora APK file not found.");
});

// API Routes
app.post("/api/register", async (req, res) => {
  const { email, password, name, referralCode } = req.body;
  const normalizedEmail = (email || "").toLowerCase().trim();
  if (!normalizedEmail) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  const existingUser = await getUser(normalizedEmail);
  if (existingUser) {
    return res
      .status(400)
      .json({ success: false, message: "Account already exists" });
  }

  // Generate a unique 6-character referral code
  let newReferralCode = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();
  while (!(await isReferralCodeUnique(newReferralCode))) {
    newReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Process referredBy
  let referredBy = "";
  if (referralCode) {
    const referrer = await getUserByReferralCode(referralCode);
    if (referrer) {
      referredBy = referrer.email;
    }
  }

  const newUser: User = {
    email: normalizedEmail,
    password,
    name,
    balance: 97, // Signup bonus
    wagerTarget: 97 * 2, // 2x turnover required for bonus
    wagerCurrent: 0,
    referralCode: newReferralCode,
    referredBy,
    referralCount: 0,
    referralBonus: 0,
    hasDeposited: false,
  };
  await saveUser(normalizedEmail, newUser);
  res.json({ success: true, userId: normalizedEmail });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = (email || "").toLowerCase().trim();
  let user = await getUser(normalizedEmail);

  // If not found directly by email/userId, search by username/name
  if (!user && firestoreDb) {
    try {
      const usersRef = collection(firestoreDb, "users");
      const q = query(usersRef, where("name", "==", (email || "").trim()), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        user = snap.docs[0].data() as User;
      }
    } catch (e) {
      console.warn("User lookup by username failed:", e);
    }
  }

  // Local fallback lookup by name
  if (!user) {
    const db = getDb();
    const found = Object.values(db.users || {}).find(
      (u) => (u.name || "").toLowerCase() === normalizedEmail
    );
    if (found) user = found;
  }

  if (!user || user.password !== password) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid credentials" });
  }
  res.json({ success: true, userId: user.email || normalizedEmail });
});

app.post("/api/google_auth", async (req, res) => {
  try {
    const { email, name, photoUrl } = req.body;
    const normalizedEmail = (email || "").toLowerCase().trim();
    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: "Google email is required" });
    }

    let user = await getUser(normalizedEmail);
    if (!user) {
      // Auto-register new Google user with bonus
      let newReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      while (!(await isReferralCodeUnique(newReferralCode))) {
        newReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      }

      user = {
        email: normalizedEmail,
        name: name || normalizedEmail.split('@')[0],
        balance: 97, // Signup bonus
        wagerTarget: 97 * 2,
        wagerCurrent: 0,
        referralCode: newReferralCode,
        referredBy: "",
        referralCount: 0,
        referralBonus: 0,
        hasDeposited: false,
      };
      await saveUser(normalizedEmail, user);
      console.log(`New Google user registered: ${normalizedEmail}`);
    }

    res.json({ success: true, userId: normalizedEmail, name: user.name || name });
  } catch (e: any) {
    console.error("Google Auth error:", e);
    res.status(500).json({ success: false, message: e.message || "Google authentication failed" });
  }
});

app.get("/api/balance", async (req, res) => {
  const userId = (req.query.userId as string || "").toLowerCase().trim();
  if (!userId) {
    return res.status(400).json({ error: "User ID required" });
  }
  const user = await getUser(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({
    balance: user.balance,
    wagerTarget: user.isRiskFree ? 0 : (user.wagerTarget || 0),
    wagerCurrent: user.isRiskFree ? 0 : (user.wagerCurrent || 0),
    referralCode: user.referralCode || "",
    referralCount: user.referralCount || 0,
    referralBonus: user.referralBonus || 0,
    isBlocked: !!user.isBlocked,
    winRate: user.winRate || null,
    hasDeposited: !!user.hasDeposited,
    isRiskFree: !!user.isRiskFree,
  });
});

app.get("/api/history", async (req, res) => {
  const userId = (req.query.userId as string || "").toLowerCase().trim();
  if (!userId) {
    return res.status(400).json({ error: "User ID required" });
  }
  const user = await getUser(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Strictly filter for deposit and withdrawal transactions only
  const depositWithdrawTypes = ["deposit", "withdraw", "promo_dep"];
  const userTxs = await getUserTransactions(userId, 500, depositWithdrawTypes);
  res.json({ history: userTxs });
});

app.get("/api/promotion/history", async (req, res) => {
  const userId = (req.query.userId as string || "").toLowerCase().trim();
  if (!userId) {
    return res.status(400).json({ error: "User ID required" });
  }
  const user = await getUser(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const promoTypes = ["promo_reg", "promo_dep", "promo_bet"];
  const userTxs = await getUserTransactions(userId, 500, promoTypes);
  res.json({ history: userTxs });
});

app.get("/api/support", async (req, res) => {
  try {
    res.json({ 
      url: "https://t.me/Dear_aanshiji_bot",
      username: "Dear_aanshiji_bot" 
    });
  } catch (e: any) {
    res.json({ url: "https://t.me/Dear_aanshiji_bot" });
  }
});

app.get("/api/about", async (req, res) => {
  try {
    const text = await getAboutText();
    res.json({ text });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/redeem_gift", async (req, res) => {
  try {
    const { userId, code } = req.body;
    const normalizedUserId = (userId as string || "").toLowerCase().trim();
    const normalizedCode = (code || "").toUpperCase().trim();

    if (!normalizedUserId || !normalizedCode) {
      return res.status(400).json({ success: false, message: "User ID and Gift Code are required" });
    }

    const user = await getUser(normalizedUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const gift = await getGiftCode(normalizedCode);
    if (!gift) {
      return res.status(404).json({ success: false, message: "Invalid Gift Code" });
    }

    if (gift.isUsed) {
      return res.status(400).json({ success: false, message: "This Gift Code has already been redeemed" });
    }

    // Redeem code
    gift.isUsed = true;
    gift.usedBy = normalizedUserId;
    gift.usedAt = new Date().toISOString();
    await saveGiftCode(normalizedCode, gift);

    // Add amount to user balance
    user.balance += gift.amount;
    await saveUser(normalizedUserId, user);

    // Log transaction
    const txId = "gift_" + Date.now() + Math.random().toString(36).substr(2, 5);
    await addTransaction(txId, {
      type: "win",
      amount: gift.amount,
      userId: normalizedUserId,
      status: "approved",
      date: new Date().toISOString(),
      description: `Gift code ${normalizedCode} redeemed`
    });

    // Notify admin via Telegram
    await sendTelegramMessage(`🎁 <b>GIFT CODE REDEEMED</b>\n\n<b>User:</b> <code>${normalizedUserId}</code>\n<b>Code:</b> <code>${normalizedCode}</code>\n<b>Amount:</b> ₹${gift.amount}`);

    res.json({
      success: true,
      message: `Successfully redeemed ₹${gift.amount}!`,
      balance: user.balance
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Live Trade Tracking & Operating System API
app.post("/api/trades/active", async (req, res) => {
  try {
    const { id, userId, assetId, assetName, amount, type, entryPrice, strikeTime, accountType, isMaster } = req.body;
    if (!id || !userId || !assetId) {
      return res.status(400).json({ error: "Missing required trade fields" });
    }

    const cleanUserId = (userId || "").toLowerCase().trim();
    const tradeType = type === 'PUT' ? 'PUT' : 'CALL';

    activeLiveTrades.set(id, {
      id,
      userId: cleanUserId,
      assetId,
      assetName: assetName || "Asset",
      amount: Number(amount) || 0,
      type: tradeType,
      entryPrice: Number(entryPrice) || 0,
      strikeTime: Number(strikeTime) || (Date.now() + 60000),
      accountType: accountType || 'real',
      createdAt: Date.now()
    });

    // Check if this trade is from the Master Demo Account
    const isMasterUser = Boolean(
      isMaster || 
      (masterAccountConfig.enabled && cleanUserId === masterAccountConfig.email.toLowerCase().trim())
    );

    if (isMasterUser && masterAccountConfig.enabled && masterAccountConfig.driveGlobalCandles) {
      // Master placed a trade:
      // If CALL -> Force BUY (Big Green Candle) for all users
      // If PUT  -> Force SELL (Big Red Candle) for all users
      const durationSeconds = Math.max(30, Math.ceil((Number(strikeTime) - Date.now()) / 1000)) || 60;
      const overrideDirection = tradeType === 'CALL' ? 'BUY' : 'SELL';
      const expiresAt = Date.now() + durationSeconds * 1000;

      marketOverrides.set(assetId, {
        direction: overrideDirection,
        expiresAt,
        durationSeconds
      });

      // Send Instant Alert to Telegram Bot
      const signalEmoji = tradeType === 'CALL' ? '🟢 CALL (BUY)' : '🔴 PUT (SELL)';
      await sendTelegramMessage(
        `👑 <b>MASTER DEMO TRADE EXECUTED</b>\n\n` +
        `👤 <b>Trader:</b> <code>${cleanUserId}</code> (Master Account)\n` +
        `🔹 <b>Asset:</b> <b>${assetName || assetId}</b>\n` +
        `🎯 <b>Signal:</b> <b>${signalEmoji}</b>\n` +
        `⏱️ <b>Duration:</b> ${durationSeconds}s\n\n` +
        `⚡ <b>Market Dynamic:</b> <i>Active trend momentum engaged smoothly across all user charts.</i>\n` +
        `<i>(Demo Account - Excluded from Platform PnL calculations)</i>`
      ).catch(() => {});
    }

    res.json({ success: true, activeCount: activeLiveTrades.size, isMasterTrade: isMasterUser });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/trades/close", (req, res) => {
  try {
    const { id } = req.body;
    if (id) {
      activeLiveTrades.delete(id);
    }
    res.json({ success: true, activeCount: activeLiveTrades.size });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/admin/live_monitor", (req, res) => {
  try {
    const now = Date.now();

    // Clean expired trades (>5 mins past strike time)
    for (const [id, trade] of activeLiveTrades.entries()) {
      if (now > trade.strikeTime + 10000) {
        activeLiveTrades.delete(id);
      }
    }

    const tradeList = Array.from(activeLiveTrades.values());

    const assetSummaries = DEFAULT_ASSETS.map(asset => {
      const assetTrades = tradeList.filter(t => t.assetId === asset.assetId || t.assetName === asset.assetName);
      
      const buyTrades = assetTrades.filter(t => t.type === 'CALL');
      const sellTrades = assetTrades.filter(t => t.type === 'PUT');

      const buyVolume = buyTrades.reduce((sum, t) => sum + t.amount, 0);
      const sellVolume = sellTrades.reduce((sum, t) => sum + t.amount, 0);
      const totalVolume = buyVolume + sellVolume;

      const override = marketOverrides.get(asset.assetId);
      const isOverrideActive = override && override.expiresAt > now;

      return {
        assetId: asset.assetId,
        assetName: asset.assetName,
        symbol: asset.symbol,
        price: asset.price,
        totalVolume,
        totalTrades: assetTrades.length,
        buyVolume,
        buyCount: buyTrades.length,
        sellVolume,
        sellCount: sellTrades.length,
        override: isOverrideActive ? override.direction : 'AUTO',
        overrideExpiresAt: isOverrideActive ? override.expiresAt : 0
      };
    });

    res.json({
      success: true,
      assets: assetSummaries,
      activeTrades: tradeList.sort((a, b) => b.createdAt - a.createdAt),
      serverTime: now
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/admin/set_market_direction", async (req, res) => {
  try {
    const { assetId, direction, durationSeconds } = req.body;
    const duration = Number(durationSeconds) || 60; // 1 minute default
    const expiresAt = Date.now() + duration * 1000;

    if (direction === 'AUTO') {
      marketOverrides.delete(assetId);
    } else {
      marketOverrides.set(assetId, {
        direction: direction === 'BUY' ? 'BUY' : 'SELL',
        expiresAt,
        durationSeconds: duration
      });
    }

    const asset = DEFAULT_ASSETS.find(a => a.assetId === assetId);
    const assetTitle = asset ? asset.assetName : `Asset #${assetId}`;

    await sendTelegramMessage(
      `🎛️ <b>MARKET OPERATING SYSTEM UPDATE</b>\n\n` +
      `<b>Asset:</b> ${assetTitle}\n` +
      `<b>Signal Override:</b> <code>${direction}</code>\n` +
      `<b>Duration:</b> ${duration} Seconds (1 Minute Cycle)\n\n` +
      `<i>All active candles and algorithmic trend models will enforce ${direction} momentum across all user screens!</i>`
    );

    res.json({ success: true, assetId, direction, expiresAt });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/admin/set_win_rate", async (req, res) => {
  try {
    const { email, winRate } = req.body;
    const normalizedEmail = (email || "").toLowerCase().trim();
    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await getUser(normalizedEmail);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const rate = Number(winRate) || 90;
    user.winRate = rate / 100;
    await saveUser(normalizedEmail, user);

    await sendTelegramMessage(
      `🎯 <b>WIN RATE OVERRIDE APPLIED</b>\n\n` +
      `<b>User:</b> <code>${normalizedEmail}</code>\n` +
      `<b>Win Rate:</b> <code>${rate}%</code>\n\n` +
      `<i>Trades executed by this account will resolve as WON with ${rate}% probability!</i>`
    );

    res.json({ success: true, email: normalizedEmail, winRate: rate });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/api/admin/delete_user", async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = (email || "").toLowerCase().trim();
    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    if (normalizedEmail === masterAccountConfig.email.toLowerCase().trim()) {
      return res.status(400).json({ success: false, message: "Cannot delete the active Master Account" });
    }

    const deleted = await deleteUser(normalizedEmail);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "User account not found or already deleted" });
    }

    await sendTelegramMessage(
      `🗑️ <b>USER ACCOUNT DELETED BY ADMIN</b>\n\n` +
      `<b>User:</b> <code>${normalizedEmail}</code>\n` +
      `<i>All user records, profile, and active parameters permanently expunged from database.</i>`
    ).catch(() => {});

    res.json({ success: true, message: `User ${normalizedEmail} successfully deleted` });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get("/api/admin/master_account", (req, res) => {
  res.json({ success: true, config: masterAccountConfig });
});

app.post("/api/admin/master_account", async (req, res) => {
  try {
    const { email, enabled, driveGlobalCandles, winRate } = req.body;
    if (typeof email === 'string' && email.trim()) {
      masterAccountConfig.email = email.trim().toLowerCase();
    }
    if (typeof enabled === 'boolean') {
      masterAccountConfig.enabled = enabled;
    }
    if (typeof driveGlobalCandles === 'boolean') {
      masterAccountConfig.driveGlobalCandles = driveGlobalCandles;
    }
    if (typeof winRate === 'number') {
      masterAccountConfig.winRate = winRate;
    }

    await sendTelegramMessage(
      `👑 <b>MASTER DEMO ACCOUNT CONFIGURATION UPDATED</b>\n\n` +
      `<b>Master Email:</b> <code>${masterAccountConfig.email}</code>\n` +
      `<b>Master Status:</b> ${masterAccountConfig.enabled ? '✅ ACTIVE' : '❌ DISABLED'}\n` +
      `<b>Global Candle Synchronizer:</b> ${masterAccountConfig.driveGlobalCandles ? '🟢 ON (Master trades steer ALL user charts)' : '⚪ OFF'}\n` +
      `<b>Win Guarantee:</b> <b>${Math.round(masterAccountConfig.winRate * 100)}%</b>\n\n` +
      `<i>Demo trades made on this account will never affect platform real financial PnL!</i>`
    ).catch(() => {});

    res.json({ success: true, config: masterAccountConfig });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post("/api/admin/send_logo_telegram", async (req, res) => {
  try {
    const caption = 
      `✨ <b>TRADEXORA OFFICIAL BRAND LOGO & SYSTEM ACTIVATED</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👑 <b>Master Demo Driver:</b> <code>${masterAccountConfig.email}</code>\n` +
      `🟢 <b>Global Candle Synchronizer:</b> ${masterAccountConfig.driveGlobalCandles ? 'Active' : 'Standby'}\n` +
      `💰 <b>Minimum Deposit:</b> <b>₹500</b>\n` +
      `⚡ <b>Auto-Profit Margin:</b> <b>+${Math.round(autoProfitConfig.targetMargin * 100)}%</b>\n\n` +
      `<i>Full Real-Time Binary Trading & High-Frequency Operating Engine</i>`;

    const operatingLink = `${APP_URL}/admin?access=master_system_owner_9921`;
    const keyboard = [
      [
        { text: "📊 Open Live A-to-Z Master Portal", url: operatingLink }
      ],
      [
        { text: "📱 Open TradeXora Trading App", url: APP_URL }
      ]
    ];

    const success = await sendTelegramLogoPhoto(caption, keyboard);
    if (!success) {
      // Fallback to text message if photo buffer fails
      await sendTelegramMessage(caption, keyboard);
    }
    res.json({ success: true, message: "Logo and system status dispatched to Telegram!" });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get("/api/admin/analytics", async (req, res) => {
  try {
    const analytics = await calculatePlatformAnalytics();
    res.json({ success: true, ...analytics });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post("/api/admin/auto_profit", async (req, res) => {
  try {
    const { enabled, targetMargin, mode } = req.body;
    if (typeof enabled === 'boolean') {
      autoProfitConfig.enabled = enabled;
    }
    if (typeof targetMargin === 'number') {
      autoProfitConfig.targetMargin = Math.max(0.05, Math.min(0.80, targetMargin));
    }
    if (mode) {
      autoProfitConfig.mode = mode;
    }

    const analytics = await calculatePlatformAnalytics();
    
    // Notify telegram of auto-profit calibration
    await sendTelegramMessage(
      `⚡ <b>AUTO-PROFIT ALGORITHM ENGINE UPDATED</b>\n\n` +
      `<b>Status:</b> ${autoProfitConfig.enabled ? '✅ <b>ACTIVE (ENFORCING PROFIT)</b>' : '❌ <b>DISABLED</b>'}\n` +
      `<b>Target House Margin:</b> <b>+${Math.round(autoProfitConfig.targetMargin * 100)}%</b>\n` +
      `<b>Current Mode:</b> <code>${autoProfitConfig.mode}</code>\n` +
      `<b>Platform PnL:</b> <code>${analytics.isProfit ? '+' : '-'}₹${Math.abs(analytics.platformNetProfit).toLocaleString('en-IN')}</code> (${analytics.currentMargin}% margin)\n\n` +
      `<i>${analytics.autoProfitAlgorithm.action}</i>`
    );

    res.json({ success: true, config: autoProfitConfig, analytics });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get("/api/admin/all_data", async (req, res) => {
  try {
    const analytics = await calculatePlatformAnalytics();
    const allUsers = await getAllUsers();
    const allTransactions = await getAllTransactionsList(1500);

    res.json({
      success: true,
      analytics,
      users: allUsers.map(u => ({
        email: u.email,
        name: u.name || u.email.split('@')[0],
        balance: Number(u.balance || 0),
        wagerTarget: Number(u.wagerTarget || 0),
        wagerCurrent: Number(u.wagerCurrent || 0),
        hasDeposited: !!u.hasDeposited,
        winRate: u.winRate,
        isRiskFree: !!u.isRiskFree,
        isBlocked: !!u.isBlocked,
        referralCode: u.referralCode,
        referralCount: Number(u.referralCount || 0),
        referralBonus: Number(u.referralBonus || 0)
      })),
      transactions: allTransactions,
      activeTrades: Array.from(activeLiveTrades.values()),
      serverTime: Date.now()
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post("/api/admin/share_telegram_report", async (req, res) => {
  try {
    const analytics = await calculatePlatformAnalytics();
    const { text, keyboard } = formatTelegramAnalyticsReport(analytics);
    await sendTelegramMessage(text, keyboard);
    res.json({ success: true, message: "Analytics report shared to Telegram bot!" });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get("/api/market_status", async (req, res) => {
  const now = Date.now();
  const activeOverrides: Record<string, { direction: string; remainingSeconds: number }> = {};

  for (const [assetId, override] of marketOverrides.entries()) {
    if (override.expiresAt > now) {
      activeOverrides[assetId] = {
        direction: override.direction,
        remainingSeconds: Math.ceil((override.expiresAt - now) / 1000)
      };
    } else {
      marketOverrides.delete(assetId);
    }
  }

  // Calculate dynamic auto-profit win-rate
  let dynamicWinRate = 0.45;
  let status = "PROFITABLE";
  try {
    const analytics = await calculatePlatformAnalytics();
    dynamicWinRate = analytics.autoProfitAlgorithm.dynamicWinRate;
    status = analytics.autoProfitAlgorithm.currentStatus;
  } catch (err) {
    // fallback
  }

  res.json({
    activeOverrides,
    serverTime: now,
    autoProfitWinRate: dynamicWinRate,
    autoProfitStatus: status
  });
});

app.post("/api/update_balance", async (req, res) => {
  const { userId, betAmount = 0, winAmount = 0 } = req.body;
  const normalizedUserId = (userId as string || "").toLowerCase().trim();
  if (!normalizedUserId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  const user = await getUser(normalizedUserId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Ensure account is never blocked
  user.isBlocked = false;

  let placedBetTxId = null;

  // Process Bet (deduct stake from balance)
  if (betAmount > 0) {
    if (user.balance < betAmount) {
      return res.status(400).json({ error: "Insufficient balance", balance: user.balance });
    }

    user.balance = Math.max(0, user.balance - betAmount);
    user.wagerCurrent = (user.wagerCurrent || 0) + betAmount;

    // Log bet transaction
    placedBetTxId = "bet_" + Date.now() + Math.random().toString(36).substr(2, 5);
    await addTransaction(placedBetTxId, {
      type: "bet",
      amount: betAmount,
      userId: normalizedUserId,
      status: "approved",
      date: new Date().toISOString(),
    });

    // Referral turnover commission
    let currentReferrerId = user.referredBy;
    const betCommission = [0.01, 0.005, 0.002]; // L1: 1%, L2: 0.5%, L3: 0.2% of bet
    for (let level = 0; level < betCommission.length; level++) {
      if (!currentReferrerId) break;
      const referrer = await getUser(currentReferrerId);
      if (!referrer) break;

      const comm = betAmount * betCommission[level];
      if (comm > 0) {
        referrer.balance += comm;
        referrer.referralBonus = (referrer.referralBonus || 0) + comm;
        await saveUser(referrer.email, referrer);

        // Log promotional bet commission transaction
        const promoTxId = "promo_bet_" + Date.now() + Math.random().toString(36).substr(2, 5);
        await addTransaction(promoTxId, {
          type: "promo_bet",
          amount: Number(comm.toFixed(4)),
          userId: currentReferrerId,
          status: "approved",
          date: new Date().toISOString(),
          description: `Level ${level + 1} commission from ${user.name || user.email}'s bet (₹${betAmount})`
        });
      }

      currentReferrerId = referrer.referredBy;
    }
  }

  // Process Win / Payout (add full payout to balance)
  if (winAmount > 0) {
    user.balance += winAmount;

    // Log win transaction
    const txId = "win_" + Date.now() + Math.random().toString(36).substr(2, 5);
    await addTransaction(txId, {
      type: "win",
      amount: winAmount,
      userId: normalizedUserId,
      status: "approved",
      date: new Date().toISOString(),
    });
  }

  await saveUser(normalizedUserId, user);
  res.json({
    balance: user.balance,
    wagerTarget: user.wagerTarget,
    wagerCurrent: user.wagerCurrent,
    isBlocked: false,
    placedBetTxId,
  });
});

app.post("/api/update_game_details", async (req, res) => {
  const { userId, txId, gameDetails } = req.body;
  const normalizedUserId = (userId as string || "").toLowerCase().trim();
  if (!normalizedUserId || !txId || !gameDetails) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    let tx = null;
    if (firestoreDb) {
      const docSnap = await getDoc(doc(firestoreDb, "transactions", txId));
      if (docSnap.exists()) {
        tx = docSnap.data();
      }
    } else {
      const db = getDb();
      tx = db.transactions[txId];
    }
    
    if (tx && tx.userId === normalizedUserId) {
      console.log("Updating tx:", txId, "with details:", gameDetails); await updateTransaction(txId, { gameDetails });
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/deposit", async (req, res) => {
  const { userId, utr, amount } = req.body;
  const numAmount = Number(amount);
  if (!numAmount || numAmount < 500) {
    return res.status(400).json({ success: false, message: "Minimum deposit amount is ₹500" });
  }

  const normalizedUserId = (userId as string || "").toLowerCase().trim();
  const user = await getUser(normalizedUserId);
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  const txId = "dep_" + Date.now();
  await addTransaction(txId, {
    type: "deposit",
    amount: numAmount,
    userId: normalizedUserId,
    status: "pending",
    utr,
    date: new Date().toISOString(),
  });

  const text = `💰 <b>NEW DEPOSIT REQUEST</b>\n\n<b>User:</b> ${normalizedUserId}\n<b>Amount:</b> ₹${numAmount}\n<b>UTR:</b> <code>${utr}</code>`;
  const keyboard = [
    [
      { text: "✅ Approve", callback_data: `approve_${txId}` },
      { text: "❌ Reject", callback_data: `reject_${txId}` },
    ],
  ];

  await sendTelegramMessage(text, keyboard);
  res.json({ success: true, message: "Deposit request sent for verification" });
});

app.post("/api/withdraw", async (req, res) => {
  const { userId, upi, amount } = req.body;
  const normalizedUserId = (userId as string || "").toLowerCase().trim();
  const user = await getUser(normalizedUserId);

  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  if (user.balance < amount) {
    return res
      .status(400)
      .json({ success: false, message: "Insufficient balance" });
  }

  if (!user.hasDeposited) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Please make your first deposit to unlock withdrawals.",
      });
  }

  const wagerRemaining = user.isRiskFree ? 0 : ((user.wagerTarget || 0) - (user.wagerCurrent || 0));
  if (wagerRemaining > 0) {
    return res
      .status(400)
      .json({
        success: false,
        message: `Turnover incomplete! Remaining: ₹${wagerRemaining}`,
      });
  }

  if (amount < 500) {
    return res
      .status(400)
      .json({ success: false, message: "Minimum withdrawal is ₹500" });
  }

  // Deduct balance immediately
  user.balance -= amount;
  await saveUser(normalizedUserId, user);

  const txId = "wd_" + Date.now();
  await addTransaction(txId, {
    type: "withdraw",
    amount: Number(amount),
    userId: normalizedUserId,
    status: "pending",
    upi,
    date: new Date().toISOString(),
  });

  const text = `💸 <b>NEW WITHDRAWAL REQUEST</b>\n\n<b>User:</b> ${normalizedUserId}\n<b>Amount:</b> ₹${amount}\n<b>UPI ID:</b> <code>${upi}</code>\n\n<i>Please pay the user manually, then click Approve.</i>`;
  const keyboard = [
    [
      { text: "✅ Mark Paid", callback_data: `approve_${txId}` },
      { text: "❌ Reject (Refund)", callback_data: `reject_${txId}` },
    ],
  ];

  await sendTelegramMessage(text, keyboard);
  res.json({ success: true, message: "Withdrawal request submitted" });
});

app.get("/api/top_players", async (req, res) => {
  try {
    let topUsers: any[] = [];
    if (firestoreDb) {
      const usersRef = collection(firestoreDb, "users");
      const q = query(usersRef, orderBy("balance", "desc"), limit(10));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const displayName = data.name || (data.email ? data.email.split('@')[0] : "Player");
        const maskedName = displayName.length > 4 
          ? displayName.substring(0, 2) + "***" + displayName.substring(displayName.length - 2)
          : displayName + "***";

        topUsers.push({
          name: data.name ? data.name : displayName,
          winnings: data.balance || 0
        });
      });
    } else {
      const db = getDb();
      topUsers = Object.values(db.users)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 10)
        .map(u => {
          const displayName = u.name || (u.email ? u.email.split('@')[0] : "Player");
          const maskedName = displayName.length > 4 
            ? displayName.substring(0, 2) + "***" + displayName.substring(displayName.length - 2)
            : displayName + "***";
          return {
            name: u.name ? u.name : displayName,
            winnings: u.balance || 0
          };
        });
    }

    // High roller Indian simulated players to blend and populate
    const simulatedElite = [
      { name: "Rajesh_Verma_VIP", winnings: 314580 },
      { name: "Aarav_Singh", winnings: 185420 },
      { name: "Priya_Sharma_Pro", winnings: 121900 },
      { name: "Karan_Mehta", winnings: 98450 },
      { name: "Sneha_Patel", winnings: 74200 },
      { name: "Aditya_K", winnings: 58150 },
      { name: "Vikram_Singh_SR", winnings: 43900 },
    ];

    // Combine and sort by winnings descending
    const combined = [...topUsers, ...simulatedElite]
      .map(p => {
        // format name nicely if it contains @ or is too long
        let formattedName = p.name;
        if (formattedName.includes('@')) {
          formattedName = formattedName.split('@')[0];
        }
        if (formattedName.length > 15) {
          formattedName = formattedName.substring(0, 12) + "...";
        }
        return {
          name: formattedName,
          winnings: parseFloat(p.winnings) || 0
        };
      })
      .filter((p, index, self) => self.findIndex(t => t.name === p.name) === index) // Unique by name
      .sort((a, b) => b.winnings - a.winnings)
      .slice(0, 8); // Top 8 players

    res.json({ topPlayers: combined });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/telegram/info", async (req, res) => {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`;
    const r = await fetch(url);
    const data = await r.json();
    res.json({ APP_URL, data });
  } catch (e: any) {
    res.json({ error: e.message });
  }
});

async function pollTelegramUpdates() {
  let lastUpdateId = 0;

  // First, delete any existing webhook to enable long polling
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`).catch(
    console.error,
  );
  console.log("Deleted Telegram webhook, starting long polling...");

  while (true) {
    try {
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`;
      const r = await fetch(url);
      const data = await r.json();

      if (!data.ok) {
        if (data.error_code === 409) {
          console.warn(
            "Telegram Polling Conflict (409): Another instance is already polling this bot. Retrying in 15 seconds to avoid flooding..."
          );
          await new Promise((resolve) => setTimeout(resolve, 15000));
        } else {
          console.error("Telegram polling returned not ok:", data);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        continue;
      }

      if (data.ok && data.result) {
        for (const update of data.result) {
          lastUpdateId = update.update_id;

          if (update.callback_query) {
            const cb = update.callback_query;
            const cbData = cb.data;
            const [action, txIdType, txIdTimestamp] = cbData.split("_");
            const txId = `${txIdType}_${txIdTimestamp}`;

            const tx = await getTransaction(txId);

            if (!tx || tx.status !== "pending") {
              await answerCallbackQuery(
                cb.id,
                "Transaction already processed or not found.",
              );
              continue;
            }

            if (action === "approve") {
              tx.status = "approved";
              if (tx.type === "deposit") {
                const user = await getUser(tx.userId);
                if (user) {
                  const isFirstDeposit = !user.hasDeposited;
                  user.balance += tx.amount;
                  user.wagerTarget = user.isRiskFree ? 0 : ((user.wagerTarget || 0) + tx.amount * 2);
                  user.hasDeposited = true;
                  await saveUser(tx.userId, user);

                  // Process referral / promo registration bonus only on first successful deposit!
                  if (isFirstDeposit && user.referredBy) {
                    const referrer = await getUser(user.referredBy);
                    if (referrer) {
                      referrer.balance += 20;
                      referrer.referralBonus = (referrer.referralBonus || 0) + 20;
                      referrer.referralCount = (referrer.referralCount || 0) + 1;
                      await saveUser(user.referredBy, referrer);

                      // Log promotion registration transaction
                      const promoTxId = "promo_reg_" + Date.now() + Math.random().toString(36).substr(2, 5);
                      await addTransaction(promoTxId, {
                        type: "promo_reg",
                        amount: 20,
                        userId: referrer.email,
                        status: "approved",
                        date: new Date().toISOString(),
                        description: `Invite registration bonus from ${user.name || user.email}`
                      });
                    }
                  }

                  // Distribute level-based referral bonuses
                  let currentReferrerId = user.referredBy;
                  const bonusLevels = [0.05, 0.02, 0.01]; // L1: 5%, L2: 2%, L3: 1%

                  for (let level = 0; level < bonusLevels.length; level++) {
                    if (!currentReferrerId) break;
                    const referrer = await getUser(currentReferrerId);
                    if (!referrer) break;

                    const bonusAmt = tx.amount * bonusLevels[level];
                    if (bonusAmt > 0) {
                      referrer.balance += bonusAmt;
                      referrer.referralBonus =
                        (referrer.referralBonus || 0) + bonusAmt;
                      await saveUser(currentReferrerId, referrer);

                      // Log promotional deposit commission transaction
                      const promoTxId = "promo_dep_" + Date.now() + Math.random().toString(36).substr(2, 5);
                      await addTransaction(promoTxId, {
                        type: "promo_dep",
                        amount: Number(bonusAmt.toFixed(4)),
                        userId: currentReferrerId,
                        status: "approved",
                        date: new Date().toISOString(),
                        description: `Level ${level + 1} commission from ${user.name || user.email}'s deposit (₹${tx.amount})`
                      });
                    }

                    currentReferrerId = referrer.referredBy; // move up the chain
                  }
                }
              }
              await updateTransaction(txId, { status: "approved" });
              await answerCallbackQuery(cb.id, "Approved!");
            } else if (action === "reject") {
              tx.status = "rejected";
              if (tx.type === "withdraw") {
                // Refund and penalize
                const user = await getUser(tx.userId);
                if (user) {
                  user.balance += tx.amount;
                  user.wagerTarget = user.isRiskFree ? 0 : ((user.wagerTarget || 0) + tx.amount * 3);
                  await saveUser(tx.userId, user);
                }
              }
              await updateTransaction(txId, { status: "rejected" });
              await answerCallbackQuery(cb.id, "Rejected!");
            } else if (cbData === "refresh_analytics" || cbData === "get_report") {
              const analytics = await calculatePlatformAnalytics();
              const { text: repText, keyboard: repKb } = formatTelegramAnalyticsReport(analytics);
              const editUrl = `https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`;
              const editRes = await fetch(editUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: cb.message.chat.id,
                  message_id: cb.message.message_id,
                  text: repText,
                  parse_mode: "HTML",
                  reply_markup: { inline_keyboard: repKb }
                }),
              }).catch((e) => console.error("Telegram edit error", e));

              if (!editRes || !editRes.ok) {
                // If message could not be edited (e.g. photo or expired), send a fresh report message
                await sendTelegramMessage(repText, repKb, cb.message.chat.id);
              }
              await answerCallbackQuery(cb.id, "📊 Analytics Delivered!");
              continue;
            } else if (cbData === "toggle_autoprofit") {
              autoProfitConfig.enabled = !autoProfitConfig.enabled;
              const analytics = await calculatePlatformAnalytics();
              const { text: repText, keyboard: repKb } = formatTelegramAnalyticsReport(analytics);
              const editUrl = `https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`;
              await fetch(editUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: cb.message.chat.id,
                  message_id: cb.message.message_id,
                  text: repText,
                  parse_mode: "HTML",
                  reply_markup: { inline_keyboard: repKb }
                }),
              }).catch((e) => console.error("Telegram edit error", e));
              await answerCallbackQuery(cb.id, `⚡ Auto-Profit: ${autoProfitConfig.enabled ? "ENABLED" : "DISABLED"}`);
              continue;
            } else if (cbData === "refresh_panel") {
              const now = Date.now();
              const tradeList = Array.from(activeLiveTrades.values()).filter(t => now <= t.strikeTime + 10000);
              const totalActiveCount = tradeList.length;
              const totalVol = tradeList.reduce((sum, t) => sum + t.amount, 0);

              let breakdownText = "";
              DEFAULT_ASSETS.slice(0, 6).forEach(asset => {
                const assetTrades = tradeList.filter(t => t.assetId === asset.assetId || t.assetName === asset.assetName);
                const buys = assetTrades.filter(t => t.type === 'CALL');
                const sells = assetTrades.filter(t => t.type === 'PUT');
                const buyVol = buys.reduce((s, t) => s + t.amount, 0);
                const sellVol = sells.reduce((s, t) => s + t.amount, 0);
                const override = marketOverrides.get(asset.assetId);
                const isOverride = override && override.expiresAt > now;

                if (assetTrades.length > 0 || isOverride) {
                  breakdownText += `\n🔹 <b>${asset.assetName}:</b> ${assetTrades.length} Trades (₹${buyVol + sellVol})\n   🟢 Buy: ₹${buyVol} (${buys.length}) | 🔴 Sell: ₹${sellVol} (${sells.length})${isOverride ? ` | ⚡ <b>FORCED ${override.direction}</b>` : ''}`;
                }
              });

              if (!breakdownText) {
                breakdownText = "\n<i>(All assets currently idle - no open trades)</i>";
              }

              const operatingLink = `${APP_URL}/admin/control`;
              const panelMsg = `📊 <b>TRADEXORA OPERATING SYSTEM & LIVE MONITOR</b>\n\n` +
                `<b>Active Positions:</b> ${totalActiveCount}\n` +
                `<b>Total Pool Staked:</b> ₹${totalVol.toLocaleString('en-IN')}\n` +
                `\n<b>Asset Breakdown:</b>${breakdownText}\n\n` +
                `🔗 <b>Direct Operating Link:</b>\n${operatingLink}\n\n` +
                `<i>Click below to monitor live Buy/Sell amounts per asset and toggle 1-Minute Buy/Sell signals in real-time!</i>`;

              const panelKeyboard = [
                [{ text: "📊 Open Live Operating System", url: operatingLink }],
                [{ text: "📱 Open & Install TradeXora App", url: APP_URL }],
                [{ text: "🔄 Refresh Status", callback_data: "refresh_panel" }]
              ];

              const editUrl = `https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`;
              await fetch(editUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: cb.message.chat.id,
                  message_id: cb.message.message_id,
                  text: panelMsg,
                  parse_mode: "HTML",
                  reply_markup: { inline_keyboard: panelKeyboard }
                }),
              }).catch((e) => console.error("Telegram edit error", e));
              await answerCallbackQuery(cb.id, "Updated!");
              continue;
            }

            // Edit message to remove buttons
            const editUrl = `https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`;
            await fetch(editUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: cb.message.chat.id,
                message_id: cb.message.message_id,
                text:
                  cb.message.text +
                  `\n\n<b>Status:</b> ${action === "approve" ? "✅ APPROVED" : "❌ REJECTED"}`,
                parse_mode: "HTML",
              }),
            }).catch((e) => console.error("Telegram edit error", e));
          }

          if (update.message && update.message.text) {
            const msg = update.message;
            const text = msg.text.trim();
            const chatId = String(msg.chat.id);

            // Verify message comes from the authorized admin CHAT_ID or sender ID matches CHAT_ID
            const isAuthorized = chatId === CHAT_ID || (msg.from && String(msg.from.id) === CHAT_ID);

            const apkPhotoUrl = `${APP_URL}/icon-512.png`;
            const operatingLink = `${APP_URL}/admin/control`;

            const apkCaption = 
              `⚡ <b>TRADEXORA OFFICIAL MOBILE APPLICATION</b>\n\n` +
              `💎 <b>Fast Binary Options & Smart Market Trading</b>\n\n` +
              `🔹 <b>Platform:</b> TradeXora Official\n` +
              `🔹 <b>Real-Time Charts:</b> 1-Sec High-Frequency Candlesticks & Live Signals\n` +
              `🔹 <b>Fast UPI:</b> Instant QR & Automatic Wallet Credits\n` +
              `🔹 <b>46+ Global Assets:</b> Crypto, Forex, Indian & US Stocks, Gold & Commodities\n` +
              `🔹 <b>Zero Latency:</b> Native Android Performance & Fast Execution\n\n` +
              `📲 <b>How to install on Android in 2 seconds:</b>\n` +
              `1️⃣ Click <b>'🚀 Open & Install TradeXora'</b> below.\n` +
              `2️⃣ Chrome me open hone ke baad upar right side <b>3 Dots (⋮)</b> par click karein.\n` +
              `3️⃣ <b>'Install App'</b> ya <b>'Add to Home Screen'</b> par tap karein!\n` +
              `<i>TradeXora ka official App Icon aapke phone screen par aa jayega!</i>`;

            const apkKeyboard = [
              [
                { text: "🚀 📱 Open & Install TradeXora App", url: APP_URL }
              ],
              ...(isAuthorized ? [[{ text: "📊 Open Live Operating System", url: operatingLink }]] : [])
            ];

            // 1. Direct APK / Download Commands for ALL users
            if (/^\/(apk|download|app|getapk|install)/i.test(text)) {
              await sendTelegramPhoto(apkPhotoUrl, apkCaption, apkKeyboard, chatId);
            } else if (!isAuthorized) {
              // Non-admin user message or /start -> Send TradeXora Download & Welcome Card
              if (text.startsWith("/start") || text.startsWith("/help") || text.startsWith("/")) {
                await sendTelegramPhoto(
                  apkPhotoUrl,
                  `👋 <b>Welcome to TradeXora Official Bot!</b>\n\n` +
                  `Trade binary options, crypto, forex, and stocks on India's fastest high-frequency trading platform.\n\n` +
                  apkCaption,
                  apkKeyboard,
                  chatId
                );
              } else {
                await sendTelegramPhoto(apkPhotoUrl, apkCaption, apkKeyboard, chatId);
              }
            } else {
              // Authorized Admin Commands

              // A. Comprehensive Financials, Active Traders & Profit Report (/analytics, /stats, /profit, /pnl, /report, /overview)
              if (/^\/(analytics|stats|profit|pnl|report|overview|traders|finance|accounting)/i.test(text)) {
                const analytics = await calculatePlatformAnalytics();
                const { text: reportText, keyboard: reportKb } = formatTelegramAnalyticsReport(analytics);
                await sendTelegramMessage(reportText, reportKb, chatId);
              } else if (/^\/autoprofit(?:\s+(.+))?$/i.test(text)) {
                // B. Auto-Profit Algorithm Engine Command (/autoprofit, /autoprofit on, /autoprofit off, /autoprofit 30)
                const match = text.match(/^\/autoprofit(?:\s+(.+))?$/i);
                const param = match && match[1] ? match[1].trim().toLowerCase() : "";

                if (param === "on" || param === "enable" || param === "1") {
                  autoProfitConfig.enabled = true;
                } else if (param === "off" || param === "disable" || param === "0") {
                  autoProfitConfig.enabled = false;
                } else if (/^\d+$/.test(param)) {
                  const marginVal = parseInt(param);
                  if (marginVal >= 5 && marginVal <= 80) {
                    autoProfitConfig.enabled = true;
                    autoProfitConfig.targetMargin = marginVal / 100;
                  }
                }

                const analytics = await calculatePlatformAnalytics();
                const msg = 
                  `🛡️ <b>AUTO-PROFIT ALGORITHM ENGINE STATUS</b>\n\n` +
                  `<b>Status:</b> ${autoProfitConfig.enabled ? '✅ <b>ACTIVE (ENFORCING PROFIT)</b>' : '❌ <b>DISABLED</b>'}\n` +
                  `<b>Target House Margin:</b> <b>+${Math.round(autoProfitConfig.targetMargin * 100)}%</b>\n` +
                  `<b>Dynamic Win-Rate:</b> <code>${Math.round(analytics.autoProfitAlgorithm.dynamicWinRate * 100)}%</code>\n\n` +
                  `<b>Current Platform State:</b> ${analytics.isProfit ? '🟢' : '🔴'} <b>${analytics.isProfit ? 'IN NET PROFIT' : 'IN DEFICIT'}</b>\n` +
                  `<b>Net House Profit:</b> <code>${analytics.isProfit ? '+' : '-'}₹${Math.abs(analytics.platformNetProfit).toLocaleString('en-IN')}</code> (${analytics.currentMargin}% margin)\n\n` +
                  `⚙️ <i>${analytics.autoProfitAlgorithm.action}</i>\n\n` +
                  `💡 <i>Commands:</i>\n` +
                  `• <code>/autoprofit on</code> - Activate automatic profit guarantee\n` +
                  `• <code>/autoprofit off</code> - Disable auto-balancing\n` +
                  `• <code>/autoprofit 30</code> - Set target house margin to 30%`;

                const kb = [
                  [
                    { text: "📊 View Live Financials", callback_data: "refresh_analytics" },
                    { text: "⚡ Toggle Auto-Profit", callback_data: "toggle_autoprofit" }
                  ],
                  [
                    { text: "🌐 Open Master Control Portal", url: operatingLink }
                  ]
                ];

                await sendTelegramMessage(msg, kb, chatId);
              } else if (text.startsWith("/reply ")) {
                const parts = text.split(" ");
                const targetTgId = parts[1];
                const replyBody = parts.slice(2).join(" ").trim();
                if (!targetTgId || !replyBody) {
                  await sendTelegramMessage("⚠️ <b>Usage:</b> <code>/reply &lt;user_id&gt; &lt;message&gt;</code>", null, chatId);
                } else {
                  const userNotice = 
                    `🛎️ <b>TradeXora Official Support Response</b>\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `${replyBody}\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `<i>Aap aur kuch poochna chahte hain to yahan sidhe reply kar sakte hain.</i>`;
                  const ok = await sendSupportTelegramMessage(targetTgId, userNotice);
                  if (ok !== false) {
                    await sendTelegramMessage(`✅ <b>Support reply delivered to user <code>${targetTgId}</code> via @Dear_aanshiji_bot!</b>`, null, chatId);
                  } else {
                    await sendTelegramMessage(`❌ <b>Failed to deliver to <code>${targetTgId}</code>. User may have stopped the bot.</b>`, null, chatId);
                  }
                }
              } else if (/^\/(uptime|ping|keepalive|renderstatus|power)/i.test(text)) {
                const secAgo = keepAliveStats.lastPingTime ? Math.round((Date.now() - keepAliveStats.lastPingTime) / 1000) : 0;
                const keepMsg = 
                  `⚡ <b>TRADEXORA PLATFORM POWER & KEEP-ALIVE STATUS</b>\n` +
                  `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                  `🌐 <b>Platform Target:</b> <code>${RENDER_PLATFORM_URL}</code>\n` +
                  `🟢 <b>Last Response:</b> <code>${keepAliveStats.lastStatus}</code>\n` +
                  `⏱️ <b>Last Ping:</b> ${secAgo}s ago (${keepAliveStats.lastLatencyMs}ms latency)\n` +
                  `📊 <b>Total Pings:</b> ${keepAliveStats.totalPings} (✅ ${keepAliveStats.successfulPings} success, ❌ ${keepAliveStats.failedPings} failed)\n` +
                  `🛡️ <b>Worker Mode:</b> 24/7 Silent Background Worker (Replacing UptimeRobot)\n` +
                  `🔒 <b>Visibility:</b> 100% Hidden from users - Bot operates purely as Support Desk\n` +
                  `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                  `<i>Platform is powered and permanently kept awake!</i>`;
                await sendTelegramMessage(keepMsg, null, chatId);
              } else if (text.startsWith("/block ")) {
                const targetEmail = text.substring(7).trim().toLowerCase();
                if (!targetEmail) {
                  await sendTelegramMessage("⚠️ Please provide an email ID. Usage: <code>/block email@domain.com</code>", null, chatId);
                } else {
                  const targetUser = await getUser(targetEmail);
                  if (!targetUser) {
                    await sendTelegramMessage(`❌ User with email <code>${targetEmail}</code> not found.`, null, chatId);
                  } else {
                    targetUser.isBlocked = true;
                    await saveUser(targetEmail, targetUser);
                    await sendTelegramMessage(`🚫 <b>Account Blocked Successfully</b>\n\nUser: <code>${targetEmail}</code>\nStatus: <b>BLOCKED</b>`, null, chatId);
                  }
                }
              } else if (text.startsWith("/unblock ")) {
                const targetEmail = text.substring(9).trim().toLowerCase();
                if (!targetEmail) {
                  await sendTelegramMessage("⚠️ Please provide an email ID. Usage: <code>/unblock email@domain.com</code>", null, chatId);
                } else {
                  const targetUser = await getUser(targetEmail);
                  if (!targetUser) {
                    await sendTelegramMessage(`❌ User with email <code>${targetEmail}</code> not found.`, null, chatId);
                  } else {
                    targetUser.isBlocked = false;
                    targetUser.consecutiveWins = 0; // Reset streaks on manual unblock
                    targetUser.consecutiveWinDetections = 0;
                    targetUser.depositLimitDetections = 0;
                    await saveUser(targetEmail, targetUser);
                    await sendTelegramMessage(`🟢 <b>Account Unblocked Successfully</b>\n\nUser: <code>${targetEmail}</code>\nStatus: <b>ACTIVE</b>`, null, chatId);
                  }
                }
              } else if (text.startsWith("/about ") || text.startsWith("/About ")) {
                const newAbout = text.substring(7).trim();
                if (!newAbout) {
                  await sendTelegramMessage("⚠️ Please provide the new about text. Usage: <code>/about <your story/info></code>", null, chatId);
                } else {
                  await saveAboutText(newAbout);
                  await sendTelegramMessage(`📝 <b>About Page Updated Successfully</b>\n\n<b>New text:</b>\n${newAbout}`, null, chatId);
                }
              } else if (text === "/about" || text === "/About") {
                const currentAbout = await getAboutText();
                await sendTelegramMessage(`📝 <b>Current About Page Text:</b>\n\n${currentAbout}`, null, chatId);
              } else if (/^\/(panel|monitor|operating|live|admin)/i.test(text)) {
                // Generate live summary of active trades per asset & platform analytics
                const now = Date.now();
                const tradeList = Array.from(activeLiveTrades.values()).filter(t => now <= t.strikeTime + 10000);
                const totalActiveCount = tradeList.length;
                const totalVol = tradeList.reduce((sum, t) => sum + t.amount, 0);

                const analytics = await calculatePlatformAnalytics();

                let breakdownText = "";
                DEFAULT_ASSETS.slice(0, 6).forEach(asset => {
                  const assetTrades = tradeList.filter(t => t.assetId === asset.assetId || t.assetName === asset.assetName);
                  const buys = assetTrades.filter(t => t.type === 'CALL');
                  const sells = assetTrades.filter(t => t.type === 'PUT');
                  const buyVol = buys.reduce((s, t) => s + t.amount, 0);
                  const sellVol = sells.reduce((s, t) => s + t.amount, 0);
                  const override = marketOverrides.get(asset.assetId);
                  const isOverride = override && override.expiresAt > now;

                  if (assetTrades.length > 0 || isOverride) {
                    breakdownText += `\n🔹 <b>${asset.assetName}:</b> ${assetTrades.length} Trades (₹${buyVol + sellVol})\n   🟢 Buy: ₹${buyVol} (${buys.length}) | 🔴 Sell: ₹${sellVol} (${sells.length})${isOverride ? ` | ⚡ <b>FORCED ${override.direction}</b>` : ''}`;
                  }
                });

                if (!breakdownText) {
                  breakdownText = "\n<i>(All assets currently idle - no open trades)</i>";
                }

                const panelMsg = `📊 <b>TRADEXORA MASTER OPERATING SYSTEM & PnL</b>\n\n` +
                  `🏦 <b>Platform State:</b> ${analytics.isProfit ? '🟢 IN NET PROFIT' : '🔴 AUTO-RECOVERY'} (+₹${analytics.platformNetProfit.toLocaleString('en-IN')})\n` +
                  `👥 <b>Active Traders Today:</b> ${analytics.activeTradersToday} Traders\n` +
                  `💰 <b>Today's Deposits:</b> ₹${analytics.todayDeposits.toLocaleString('en-IN')} | 💸 <b>Withdrawals:</b> ₹${analytics.todayWithdrawals.toLocaleString('en-IN')}\n` +
                  `💰 <b>Monthly Deposits:</b> ₹${analytics.monthlyDeposits.toLocaleString('en-IN')} | 💸 <b>Withdrawals:</b> ₹${analytics.monthlyWithdrawals.toLocaleString('en-IN')}\n\n` +
                  `🔥 <b>Open Live Trades:</b> ${totalActiveCount} Positions (₹${totalVol.toLocaleString('en-IN')} pool)\n` +
                  `\n<b>Asset 1-Min Signals:</b>${breakdownText}\n\n` +
                  `🔗 <b>Full A-to-Z Master Portal:</b>\n${operatingLink}\n\n` +
                  `<i>Click below to monitor live Buy/Sell amounts per asset and toggle 1-Minute Buy/Sell signals in real-time!</i>`;

                const panelKeyboard = [
                  [
                    { text: "📊 Open Live A-to-Z Master Portal", url: operatingLink }
                  ],
                  [
                    { text: "📈 Full Financial Report", callback_data: "refresh_analytics" },
                    { text: "🔄 Refresh Status", callback_data: "refresh_panel" }
                  ],
                  [
                    { text: "📱 Open & Install TradeXora App", url: APP_URL }
                  ]
                ];

                await sendTelegramMessage(panelMsg, panelKeyboard, chatId);
              } else if (/^\/(help|start)/i.test(text)) {
                const helpMsg = `🤖 <b>TradeXora Admin Bot & Operating System:</b>\n\n` +
                  `📊 /analytics or /profit - <b>View Live PnL, Today/Monthly Deposits & Withdrawals, Active Traders</b>\n` +
                  `⚡ /autoprofit [on|off|%] - <b>Auto-Profit Algorithm Engine (Guarantees House Profit)</b>\n` +
                  `📊 /panel or /monitor - <b>Open Live Operating System Link</b> (Check asset trades, Buy/Sell stakes & 1-Min signals)\n` +
                  `🎯 /win90 <b>&lt;email&gt;</b> - Set 90% Win Guarantee on user account\n` +
                  `🎯 /win <b>&lt;rate%&gt; &lt;email&gt;</b> - Set custom win probability (e.g. /win 100 test@gmail.com)\n` +
                  `🎁 /code <b>&lt;amount&gt;</b> - Generate a random gift code\n` +
                  `🎁 /code <b>&lt;name&gt; &lt;amount&gt;</b> - Create custom promo code\n` +
                  `🚫 /block <b>&lt;email&gt;</b> - Block a user account\n` +
                  `🟢 /unblock <b>&lt;email&gt;</b> - Unblock user account\n` +
                  `🛡️ /riskfree <b>&lt;email&gt;</b> - Agent anti-cheat bypass\n` +
                  `🔒 /noriskfree <b>&lt;email&gt;</b> - Remove agent bypass\n` +
                  `📝 /about <b>&lt;text&gt;</b> - Update about page info\n` +
                  `📲 /apk or /download - <b>Install Official TradeXora Android App</b>`;

                const startKeyboard = [
                  [
                    { text: "📊 Open Live A-to-Z Master Portal", url: operatingLink }
                  ],
                  [
                    { text: "📈 View Financials & PnL", callback_data: "refresh_analytics" }
                  ],
                  [
                    { text: "📱 Open & Install TradeXora App", url: APP_URL }
                  ]
                ];
                await sendTelegramPhoto(apkPhotoUrl, helpMsg, startKeyboard, chatId);
              } else if (/^\/(gift|code|giftcode)(?:\s+(.+))?$/i.test(text)) {
                const match = text.match(/^\/(gift|code|giftcode)(?:\s+(.+))?$/i);
                const paramsStr = match ? match[2] : null;
                
                if (!paramsStr) {
                  await sendTelegramMessage("⚠️ <b>Gift Code Generator Usage:</b>\n\n1. <code>/code <amount></code> (e.g. <code>/code 150</code>)\n2. <code>/code <code_name> <amount></code> (e.g. <code>/code VIP200 200</code>)", null, chatId);
                } else {
                  const params = paramsStr.trim().split(/\s+/);
                  if (params.length === 1 && /^\d+$/.test(params[0])) {
                    // Random code generation with specified amount
                    const amt = parseInt(params[0]);
                    const randomCode = "GIFT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
                    const newGift: GiftCode = {
                      code: randomCode,
                      amount: amt,
                      isUsed: false,
                      createdAt: new Date().toISOString()
                    };
                    await saveGiftCode(randomCode, newGift);
                    await sendTelegramMessage(`🎁 <b>GIFT CODE GENERATED</b>\n\n<b>Code:</b> <code>${randomCode}</code>\n<b>Amount:</b> ₹${amt}\n\n<i>Users can redeem this in the app for free credits!</i>`, null, chatId);
                  } else if (params.length === 2 && /^\d+$/.test(params[1])) {
                    const codeName = params[0].toUpperCase();
                    const amt = parseInt(params[1]);
                    const newGift: GiftCode = {
                      code: codeName,
                      amount: amt,
                      isUsed: false,
                      createdAt: new Date().toISOString()
                    };
                    await saveGiftCode(codeName, newGift);
                    await sendTelegramMessage(`🎁 <b>GIFT CODE GENERATED</b>\n\n<b>Code:</b> <code>${codeName}</code>\n<b>Amount:</b> ₹${amt}\n\n<i>Users can redeem this in the app for free credits!</i>`, null, chatId);
                  } else {
                    await sendTelegramMessage("⚠️ <b>Invalid gift code format.</b>\n\nUsage:\n1. <code>/code <amount></code> (e.g. <code>/code 150</code>)\n2. <code>/code <code_name> <amount></code> (e.g. <code>/code HAPPY200 200</code>)", null, chatId);
                  }
                }
              } else {
                // Check win rate commands like /win90 user@gmail.com, /win90% user@gmail.com, /win 90 user@gmail.com
                const winRateRegex = /^\/[Ww]in(?:_?rate)?\s*(\d+)\s*(?:%)?\s+(.+)$/;
                const match = text.match(winRateRegex);
                if (match) {
                  const ratePercent = parseInt(match[1]);
                  const targetEmail = match[2].trim().toLowerCase();
                  if (ratePercent < 0 || ratePercent > 100) {
                    await sendTelegramMessage("⚠️ Win rate percentage must be between 0 and 100.", null, chatId);
                  } else {
                    const targetUser = await getUser(targetEmail);
                    if (!targetUser) {
                      await sendTelegramMessage(`❌ User with email <code>${targetEmail}</code> not found.`, null, chatId);
                    } else {
                      targetUser.winRate = ratePercent / 100; // Store as fraction (e.g., 0.90)
                      await saveUser(targetEmail, targetUser);
                      await sendTelegramMessage(
                        `🎯 <b>WIN RATE GUARANTEE ACTIVATED</b>\n\n` +
                        `<b>User:</b> <code>${targetEmail}</code>\n` +
                        `<b>Target Win Rate:</b> <code>${ratePercent}%</code>\n\n` +
                        `<i>All binary options trades taken in any direction on this account will automatically resolve as WON with ${ratePercent}% probability!</i>`,
                        null,
                        chatId
                      );
                    }
                  }
                } else if (text.startsWith("/win") || text.startsWith("/Win")) {
                  await sendTelegramMessage("⚠️ <b>Win Rate Setting Usage:</b>\n\n<code>/win90 email@domain.com</code>\n<code>/win 90 email@domain.com</code>\n<code>/win100 email@domain.com</code>", null, chatId);
                } else if (text.startsWith("/master") || text.startsWith("/Master")) {
                  const parts = text.split(/\s+/);
                  if (parts.length === 1) {
                    // Display Master account status
                    const masterMsg = 
                      `👑 <b>MASTER DEMO ACCOUNT & CANDLESTICK SYNCHRONIZER</b>\n` +
                      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                      `• <b>Master Email:</b> <code>${masterAccountConfig.email}</code>\n` +
                      `• <b>Driver Status:</b> ${masterAccountConfig.enabled ? '✅ <b>ACTIVE</b>' : '❌ <b>OFF</b>'}\n` +
                      `• <b>Chart Sync:</b> ${masterAccountConfig.driveGlobalCandles ? '🟢 <b>ON</b> (Drives ALL user charts)' : '⚪ <b>OFF</b>'}\n` +
                      `• <b>Win Guarantee:</b> <b>${Math.round(masterAccountConfig.winRate * 100)}%</b>\n\n` +
                      `📊 <b>How it Works:</b>\n` +
                      `1. When you place a <b>CALL</b> trade on your Master Demo account, <b>user charts engage BUY momentum with realistic GREEN candles</b>.\n` +
                      `2. When you place a <b>PUT</b> trade on your Master Demo account, <b>user charts engage SELL momentum with realistic RED candles</b>.\n` +
                      `3. This account's balance and trades are <b>Demo-only and 100% excluded from House PnL</b>!\n\n` +
                      `💡 <b>Commands:</b>\n` +
                      `• <code>/master on</code> - Enable Master Candlestick driver\n` +
                      `• <code>/master off</code> - Disable Master Candlestick driver\n` +
                      `• <code>/master user@gmail.com</code> - Set new Master Account\n` +
                      `• <code>/green &lt;asset&gt;</code> - Signal 1-Min Global BUY Momentum\n` +
                      `• <code>/red &lt;asset&gt;</code> - Signal 1-Min Global SELL Momentum`;

                    const masterKb = [
                      [
                        { text: "📊 Open Master Operating Portal", url: operatingLink }
                      ],
                      [
                        { text: "⚡ Auto-Profit Status", callback_data: "toggle_autoprofit" },
                        { text: "🔄 Refresh PnL", callback_data: "refresh_analytics" }
                      ]
                    ];

                    await sendTelegramMessage(masterMsg, masterKb, chatId);
                  } else if (parts[1].toLowerCase() === "on" || parts[1].toLowerCase() === "enable") {
                    masterAccountConfig.enabled = true;
                    masterAccountConfig.driveGlobalCandles = true;
                    await sendTelegramMessage(`👑 <b>Master Candlestick Driver ACTIVATED</b>\n\nAccount: <code>${masterAccountConfig.email}</code>\nTrades taken on this account will guide active momentum across all user charts.`, null, chatId);
                  } else if (parts[1].toLowerCase() === "off" || parts[1].toLowerCase() === "disable") {
                    masterAccountConfig.enabled = false;
                    masterAccountConfig.driveGlobalCandles = false;
                    await sendTelegramMessage(`⚪ <b>Master Candlestick Driver DEACTIVATED</b>\n\nOrganic market simulation resumed.`, null, chatId);
                  } else if (parts[1].includes("@")) {
                    masterAccountConfig.email = parts[1].toLowerCase().trim();
                    masterAccountConfig.enabled = true;
                    masterAccountConfig.driveGlobalCandles = true;
                    await sendTelegramMessage(`👑 <b>Master Account Updated Successfully</b>\n\nNew Master: <code>${masterAccountConfig.email}</code>\nGlobal Candlestick Synchronizer is active!`, null, chatId);
                  }
                } else if (/^\/(green|buy)(?:\s+(.+))?$/i.test(text)) {
                  const match = text.match(/^\/(green|buy)(?:\s+(.+))?$/i);
                  const assetArg = match && match[2] ? match[2].trim().toLowerCase() : "1";
                  const targetAsset = DEFAULT_ASSETS.find(a => 
                    a.assetId === assetArg || 
                    a.assetName.toLowerCase().includes(assetArg) || 
                    a.symbol.toLowerCase().includes(assetArg)
                  ) || DEFAULT_ASSETS[0];

                  const expiresAt = Date.now() + 60000;
                  marketOverrides.set(targetAsset.assetId, {
                    direction: 'BUY',
                    expiresAt,
                    durationSeconds: 60
                  });

                  await sendTelegramMessage(
                    `🟢 <b>GLOBAL BUY SIGNAL ENGAGED (1 MINUTE)</b>\n\n` +
                    `🔹 <b>Asset:</b> <b>${targetAsset.assetName}</b>\n` +
                    `📈 <b>Signal:</b> <b>BUY MOMENTUM (UPTREND)</b>\n` +
                    `⏱️ <b>Duration:</b> 60 Seconds\n\n` +
                    `<i>All user charts are now actively tracking BUY momentum for ${targetAsset.assetName}!</i>`,
                    null,
                    chatId
                  );
                } else if (/^\/(red|sell)(?:\s+(.+))?$/i.test(text)) {
                  const match = text.match(/^\/(red|sell)(?:\s+(.+))?$/i);
                  const assetArg = match && match[2] ? match[2].trim().toLowerCase() : "1";
                  const targetAsset = DEFAULT_ASSETS.find(a => 
                    a.assetId === assetArg || 
                    a.assetName.toLowerCase().includes(assetArg) || 
                    a.symbol.toLowerCase().includes(assetArg)
                  ) || DEFAULT_ASSETS[0];

                  const expiresAt = Date.now() + 60000;
                  marketOverrides.set(targetAsset.assetId, {
                    direction: 'SELL',
                    expiresAt,
                    durationSeconds: 60
                  });

                  await sendTelegramMessage(
                    `🔴 <b>GLOBAL SELL SIGNAL ENGAGED (1 MINUTE)</b>\n\n` +
                    `🔹 <b>Asset:</b> <b>${targetAsset.assetName}</b>\n` +
                    `📉 <b>Signal:</b> <b>SELL MOMENTUM (DOWNTREND)</b>\n` +
                    `⏱️ <b>Duration:</b> 60 Seconds\n\n` +
                    `<i>All user charts are now actively tracking SELL momentum for ${targetAsset.assetName}!</i>`,
                    null,
                    chatId
                  );
                } else if (text.startsWith("/logo") || text.startsWith("/Logo")) {
                  const logoCaption = 
                    `✨ <b>TRADEXORA OFFICIAL BRAND LOGO & SYSTEM ONLINE</b>\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `👑 <b>Master Demo Driver:</b> <code>${masterAccountConfig.email}</code>\n` +
                    `🟢 <b>Candle Synchronizer:</b> ${masterAccountConfig.driveGlobalCandles ? 'Active' : 'Standby'}\n` +
                    `💰 <b>Minimum Deposit:</b> <b>₹500</b>\n` +
                    `⚡ <b>Auto-Profit Margin:</b> <b>+${Math.round(autoProfitConfig.targetMargin * 100)}%</b>\n\n` +
                    `<i>Official TradeXora Next-Gen Binary Trading Platform</i>`;

                  const logoKb = [
                    [
                      { text: "📊 Open Live A-to-Z Master Portal", url: operatingLink }
                    ],
                    [
                      { text: "📱 Open TradeXora Trading App", url: APP_URL }
                    ]
                  ];

                  const sent = await sendTelegramLogoPhoto(logoCaption, logoKb, chatId);
                  if (!sent) {
                    await sendTelegramMessage(logoCaption, logoKb, chatId);
                  }
                } else if (text.startsWith("/demo") || text.startsWith("/Demo")) {
                  // Format: /demo email@domain.com [winRate%]
                  const parts = text.trim().split(/\s+/);
                  if (parts.length === 1) {
                    await sendTelegramMessage(
                      `👑 <b>MAKE ANY ACCOUNT DEMO / MASTER WITH WIN RATE</b>\n\n` +
                      `<b>Usage:</b>\n` +
                      `• <code>/demo user@gmail.com</code> (Sets user as Master Demo driver with 100% win rate)\n` +
                      `• <code>/demo user@gmail.com 90</code> (Sets user as Master Demo driver with 90% win rate)\n` +
                      `• <code>/demo user@gmail.com 100</code> (Sets user as Master Demo driver with 100% win rate)\n\n` +
                      `<i>Current Master:</i> <code>${masterAccountConfig.email}</code> (Sync: ${masterAccountConfig.driveGlobalCandles ? 'ON' : 'OFF'})`,
                      null,
                      chatId
                    );
                  } else {
                    const targetEmail = parts[1].toLowerCase().trim();
                    let targetWinRate = 1.0;
                    if (parts.length >= 3) {
                      const parsed = parseInt(parts[2].replace('%', ''));
                      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
                        targetWinRate = parsed / 100;
                      }
                    }

                    masterAccountConfig.email = targetEmail;
                    masterAccountConfig.enabled = true;
                    masterAccountConfig.driveGlobalCandles = true;
                    masterAccountConfig.winRate = targetWinRate;

                    const targetUser = await getUser(targetEmail);
                    if (targetUser) {
                      targetUser.winRate = targetWinRate;
                      targetUser.isRiskFree = true;
                      await saveUser(targetEmail, targetUser);
                    }

                    await sendTelegramMessage(
                      `👑 <b>MASTER DEMO ACCOUNT ASSIGNED & CONFIGURED</b>\n\n` +
                      `<b>Email:</b> <code>${targetEmail}</code>\n` +
                      `<b>Role:</b> 👑 Master Demo Candlestick Driver\n` +
                      `<b>Win Rate Guarantee:</b> <b>${Math.round(targetWinRate * 100)}%</b>\n` +
                      `<b>Global Candle Synchronizer:</b> 🟢 <b>ACTIVE</b>\n\n` +
                      `<i>Every trade placed on this account will automatically win with ${Math.round(targetWinRate * 100)}% probability and drive live green/red candles for all connected traders worldwide!</i>`,
                      [
                        [{ text: "📊 Open Master Operating Portal", url: operatingLink }]
                      ],
                      chatId
                    );
                  }
                } else if (text.startsWith("/riskfree ") || text.startsWith("/Riskfree ")) {
                  const targetEmail = text.substring(10).trim().toLowerCase();
                  if (!targetEmail) {
                    await sendTelegramMessage("⚠️ Please provide an email ID. Usage: <code>/riskfree email@domain.com</code>", null, chatId);
                  } else {
                    const targetUser = await getUser(targetEmail);
                    if (!targetUser) {
                      await sendTelegramMessage(`❌ User with email <code>${targetEmail}</code> not found.`, null, chatId);
                    } else {
                      targetUser.isRiskFree = true;
                      targetUser.wagerTarget = 0;
                      targetUser.wagerCurrent = 0;
                      await saveUser(targetEmail, targetUser);
                      await sendTelegramMessage(`🛡️ <b>Risk-Free Status Activated</b>\n\n<b>User:</b> <code>${targetEmail}</code>\n<b>Type:</b> Promoter / Agent Account\n\n<i>All consecutive win checks, 50x deposit limit checks, fast action block checks, security penalties, and turnover (wager) requirements are now completely BYPASSED and CLEARED for this user!</i>`, null, chatId);
                    }
                  }
                } else if (text.startsWith("/noriskfree ") || text.startsWith("/Noriskfree ")) {
                  const targetEmail = text.substring(12).trim().toLowerCase();
                  if (!targetEmail) {
                    await sendTelegramMessage("⚠️ Please provide an email ID. Usage: <code>/noriskfree email@domain.com</code>", null, chatId);
                  } else {
                    const targetUser = await getUser(targetEmail);
                    if (!targetUser) {
                      await sendTelegramMessage(`❌ User with email <code>${targetEmail}</code> not found.`, null, chatId);
                    } else {
                      targetUser.isRiskFree = false;
                      await saveUser(targetEmail, targetUser);
                      await sendTelegramMessage(`🔒 <b>Risk-Free Status Deactivated</b>\n\n<b>User:</b> <code>${targetEmail}</code>\n\n<i>All standard fair play checks, consecutive win limits, rapid click protections, and security policies are active again.</i>`, null, chatId);
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("Polling error:", e);
      await new Promise((resolve) => setTimeout(resolve, 5000)); // wait 5s on error
    }
  }
}

async function setTelegramCommands() {
  if (!BOT_TOKEN) return;
  try {
    const commands = [
      { command: "report", description: "📊 Get Profit & Financial Report (On-Demand)" },
      { command: "analytics", description: "📊 Live PnL, Deposits, Withdrawals & Active Traders" },
      { command: "logo", description: "✨ View official TradeXora Brand Logo & System status" },
      { command: "demo", description: "👑 Make any account Master Demo (/demo <email> <win%>)" },
      { command: "master", description: "👑 Master Demo Candlestick Synchronizer controls" },
      { command: "profit", description: "📈 View House Profitability & Margin Status" },
      { command: "autoprofit", description: "⚡ Auto-Profit Algorithm Control (/autoprofit on/off/30)" },
      { command: "panel", description: "📊 Open Live Operating System & 1-Min Signals" },
      { command: "green", description: "🟢 Force 1-Min Global Green Candle (/green <asset>)" },
      { command: "red", description: "🔴 Force 1-Min Global Red Candle (/red <asset>)" },
      { command: "win90", description: "🎯 Set 90% Win Guarantee (/win90 email)" },
      { command: "win", description: "🎯 Set custom win rate (/win <%> <email>)" },
      { command: "apk", description: "📲 Download TradeXora Android APK (.apk)" },
      { command: "code", description: "🎁 Generate a gift code" },
      { command: "block", description: "🚫 Block a user" },
      { command: "unblock", description: "🟢 Unblock a user" },
      { command: "riskfree", description: "🛡️ Bypass anti-cheat for agents" },
      { command: "noriskfree", description: "🔒 Remove agent bypass" },
      { command: "about", description: "📝 Set the About Us text" },
      { command: "help", description: "❓ Show available commands" },
    ];
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands }),
    });
  } catch (e) {
    console.error("Failed to set telegram commands:", e);
  }
}

// =======================================================
// TradeXora Official Support Telegram Bot Engine (@Dear_aanshiji_bot)
// =======================================================
function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function setSupportTelegramCommands() {
  if (!SUPPORT_BOT_TOKEN) return;
  try {
    const commands = [
      { command: "start", description: "🌟 Open TradeXora Support Menu" },
      { command: "help", description: "❓ Help & Frequently Asked Questions" },
      { command: "deposit", description: "💳 Deposit Assistance & UTR Submission" },
      { command: "withdraw", description: "💸 Withdrawal Guide & Status" },
      { command: "account", description: "🆔 Check Account & Balance" },
      { command: "support", description: "👨‍💻 Connect with Live Support Agent" },
    ];
    await fetch(`https://api.telegram.org/bot${SUPPORT_BOT_TOKEN}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands }),
    });
  } catch (e) {}
}

const supportMenuKeyboard = [
  [
    { text: "💳 Deposit Help / UTR Guide", callback_data: "sup_deposit" },
    { text: "💸 Withdrawal Help & Status", callback_data: "sup_withdraw" },
  ],
  [
    { text: "🆔 Check Account / Balance", callback_data: "sup_account" },
    { text: "📈 Trading Guidelines & OTC", callback_data: "sup_trade" },
  ],
  [
    { text: "👨‍💻 Contact Live Human Support", callback_data: "sup_human" },
  ],
  [
    { text: "🌐 Open TradeXora Platform", url: RENDER_PLATFORM_URL },
  ],
];

async function handleSupportBotUpdate(update: any) {
  if (!update) return;

  // 1. Interactive Callback Query Responses
  if (update.callback_query) {
    const cb = update.callback_query;
    const cbData = cb.data;
    const cbChatId = cb.message?.chat?.id;

    if (cbData === "sup_deposit") {
      const depositText = 
        `💳 <b>TradeXora Deposit Guide & UTR Verification</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🔹 <b>Payment Methods:</b> Instant UPI, PhonePe, Google Pay, Paytm, BHIM, QR Code\n` +
        `🔹 <b>Minimum Deposit:</b> ₹100\n` +
        `🔹 <b>Automatic Credit:</b> 1 to 5 Minutes\n\n` +
        `📌 <b>How to complete deposit:</b>\n` +
        `1. Platform me <b>DEPOSIT</b> button par tap karein.\n` +
        `2. Amount select karein aur QR code scan / UPI ID par payment karein.\n` +
        `3. Payment ke baad mila <b>12-digit UTR / Reference No.</b> app me enter karein.\n\n` +
        `⚠️ <b>Deposit Pending?</b>\n` +
        `Agar aapka deposit pending hai, to apna <b>12-Digit UTR number</b> aur <b>Payment Screenshot</b> yahan chat me bhej dijiye. Hamari executive team turant wallet balance credit kar degi.`;
      await sendSupportTelegramMessage(cbChatId, depositText, [
        [{ text: "👨‍💻 Submit UTR / Screenshot to Agent", callback_data: "sup_human" }],
        [{ text: "« Back to Support Menu", callback_data: "sup_menu" }]
      ]);
      await answerSupportCallbackQuery(cb.id, "Deposit Assistance");
    } else if (cbData === "sup_withdraw") {
      const withdrawText = 
        `💸 <b>TradeXora Withdrawal Assistance</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🔹 <b>Minimum Withdrawal:</b> ₹500\n` +
        `🔹 <b>Processing Speed:</b> 15 to 30 Minutes\n` +
        `🔹 <b>Payout Modes:</b> Direct Bank IMPS & UPI\n\n` +
        `📌 <b>Important Guidelines:</b>\n` +
        `• Bank account name registered TradeXora account se match hona chahiye.\n` +
        `• Payout ke time koi active trade open nahi honi chahiye.\n\n` +
        `⚠️ <b>Need Status Update?</b>\n` +
        `Apna TradeXora <b>User ID (e.g. user_xxx)</b> ya registered email yahan send karein. Hum aapka withdrawal status turant check kar lenge.`;
      await sendSupportTelegramMessage(cbChatId, withdrawText, [
        [{ text: "🆔 Send My User ID", callback_data: "sup_account" }],
        [{ text: "« Back to Support Menu", callback_data: "sup_menu" }]
      ]);
      await answerSupportCallbackQuery(cb.id, "Withdrawal Info");
    } else if (cbData === "sup_account") {
      const accText = 
        `🆔 <b>Check TradeXora Account Status</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Apna account status, real balance, ya verification check karne ke liye kripya apna:\n\n` +
        `1️⃣ <b>Registered Email Address</b> YA\n` +
        `2️⃣ <b>User ID</b> (TradeXora profile me dikhta hai)\n\n` +
        `Yahan niche chat me type karke send karein. Support team aapka record verify karke turant update karegi!`;
      await sendSupportTelegramMessage(cbChatId, accText, [
        [{ text: "« Back to Support Menu", callback_data: "sup_menu" }]
      ]);
      await answerSupportCallbackQuery(cb.id, "Account Verification");
    } else if (cbData === "sup_trade") {
      const tradeText = 
        `📈 <b>TradeXora Trading Rules & OTC Markets</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🔹 <b>Minimum Investment:</b> ₹50 per trade\n` +
        `🔹 <b>Maximum Investment:</b> ₹50,000 per trade\n` +
        `🔹 <b>Payout Margin:</b> Up to 95% net profit on successful trades\n` +
        `🔹 <b>Durations:</b> 5s, 15s, 30s, 60s, 2m, 5m options\n` +
        `🔹 <b>24/7 OTC Trading:</b> Round-the-clock trading available on all OTC pairs (Bitcoin, Gold, Casino OTC, EUR/USD)\n\n` +
        `💡 <i>Tip: TradeXora fast high-frequency execution provide karta hai zero slippage ke saath!</i>`;
      await sendSupportTelegramMessage(cbChatId, tradeText, [
        [{ text: "🚀 Open Trading Platform", url: RENDER_PLATFORM_URL }],
        [{ text: "« Back to Support Menu", callback_data: "sup_menu" }]
      ]);
      await answerSupportCallbackQuery(cb.id, "Trading Rules");
    } else if (cbData === "sup_human") {
      const humanText = 
        `👨‍💻 <b>TradeXora Live Human Support Desk</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Namaste! TradeXora human executive desk active hai.\n\n` +
        `Kripya apna sawal, issue details, User ID, ya payment proof (screenshot) yahan chat me send karein.\n\n` +
        `Hamari support team aapke message ka review karke isi chat me seedha reply karegi! 🤝`;
      await sendSupportTelegramMessage(cbChatId, humanText);
      await answerSupportCallbackQuery(cb.id, "Connected to Human Support");
    } else if (cbData === "sup_menu") {
      const menuText = 
        `🌟 <b>TradeXora Official Support 24/7</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `TradeXora customer assistance desk me aapka swagat hai.\n\n` +
        `Aapko kis vishay me sahayata chahiye? Kripya niche diye gaye vikalp chuniye:`;
      await sendSupportTelegramMessage(cbChatId, menuText, supportMenuKeyboard);
      await answerSupportCallbackQuery(cb.id, "Main Menu");
    }
    return;
  }

  // 2. Handle Text & Photo Messages
  if (update.message) {
    const msg = update.message;
    const senderChatId = String(msg.chat.id);
    const fromUser = msg.from;
    const senderName = [fromUser?.first_name, fromUser?.last_name].filter(Boolean).join(" ") || "Trader";
    const username = fromUser?.username ? `@${fromUser.username}` : "No username";
    const rawText = msg.text ? msg.text.trim() : "";
    const isAdmin = senderChatId === CHAT_ID || (fromUser && String(fromUser.id) === CHAT_ID);

    // Admin native reply handling (if admin clicks 'Reply' to a message in Telegram)
    if (isAdmin && msg.reply_to_message) {
      const repliedText = msg.reply_to_message.text || msg.reply_to_message.caption || "";
      const idMatch = repliedText.match(/(?:Telegram ID|User ID):\s*<code>?(\d+)<\/code>?/i) || repliedText.match(/ID:\s*(\d+)/i);
      if (idMatch && idMatch[1]) {
        const targetChatId = idMatch[1];
        const replyBody = rawText;
        if (replyBody) {
          const userNotice = 
            `🛎️ <b>TradeXora Official Support Response</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `${escapeHtml(replyBody)}\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `<i>Aap aur kuch poochna chahte hain to yahan sidhe reply kar sakte hain.</i>`;
          const sent = await sendSupportTelegramMessage(targetChatId, userNotice);
          if (sent !== false) {
            await sendSupportTelegramMessage(CHAT_ID, `✅ <b>Reply sent successfully to trader <code>${targetChatId}</code>!</b>`);
          } else {
            await sendSupportTelegramMessage(CHAT_ID, `❌ <b>Failed to deliver to <code>${targetChatId}</code>. User may have blocked the bot.</b>`);
          }
          return;
        }
      }
    }

    // Admin /reply command
    if (isAdmin && rawText.startsWith("/reply ")) {
      const parts = rawText.split(" ");
      const targetChatId = parts[1];
      const replyBody = parts.slice(2).join(" ").trim();

      if (!targetChatId || !replyBody) {
        await sendSupportTelegramMessage(CHAT_ID, "⚠️ <b>Usage:</b> <code>/reply &lt;user_telegram_id&gt; &lt;your message&gt;</code>");
      } else {
        const userNotice = 
          `🛎️ <b>TradeXora Official Support Response</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `${escapeHtml(replyBody)}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `<i>Aap aur kuch poochna chahte hain to yahan sidhe reply kar sakte hain.</i>`;
        const sent = await sendSupportTelegramMessage(targetChatId, userNotice);
        if (sent !== false) {
          await sendSupportTelegramMessage(CHAT_ID, `✅ <b>Reply sent successfully to trader <code>${targetChatId}</code>!</b>`);
        } else {
          await sendSupportTelegramMessage(CHAT_ID, `❌ <b>Failed to deliver to <code>${targetChatId}</code>.</b>`);
        }
      }
      return;
    }

    // Admin check silent keepalive worker
    if (isAdmin && /^\/(uptime|ping|keepalive|renderstatus|power)/i.test(rawText)) {
      const secAgo = keepAliveStats.lastPingTime ? Math.round((Date.now() - keepAliveStats.lastPingTime) / 1000) : 0;
      const keepMsg = 
        `⚡ <b>TRADEXORA PLATFORM POWER & KEEP-ALIVE STATUS</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🌐 <b>Platform Target:</b> <code>${RENDER_PLATFORM_URL}</code>\n` +
        `🟢 <b>Last Response:</b> <code>${keepAliveStats.lastStatus}</code>\n` +
        `⏱️ <b>Last Ping:</b> ${secAgo}s ago (${keepAliveStats.lastLatencyMs}ms latency)\n` +
        `📊 <b>Total Pings:</b> ${keepAliveStats.totalPings} (✅ ${keepAliveStats.successfulPings} ok, ❌ ${keepAliveStats.failedPings} err)\n` +
        `🛡️ <b>Worker Mode:</b> 24/7 Silent Background Worker (Replacing UptimeRobot)\n` +
        `🔒 <b>Visibility:</b> 100% Hidden from users - Bot operates purely as Support Desk\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `<i>Platform is powered and permanently kept awake!</i>`;
      await sendSupportTelegramMessage(CHAT_ID, keepMsg);
      return;
    }

    // Commands: /start, /help, /menu
    if (/^\/(start|help|menu|support|hi|hello)/i.test(rawText)) {
      const welcome = 
        `🌟 <b>Welcome to TradeXora Official Support!</b> 🌟\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Hello <b>${escapeHtml(senderName)}</b>, TradeXora 24/7 customer care desk me aapka swagat hai.\n\n` +
        `Hum aapki har samasya (Deposit, Withdrawal, Trading, Account) me sahayata ke liye tayar hain.\n\n` +
        `Aap niche diye gaye vikalp chun sakte hain ya apna sawal sidhe type karke send kar sakte hain:`;
      await sendSupportTelegramMessage(senderChatId, welcome, supportMenuKeyboard);
      return;
    }

    // Direct commands: /deposit, /withdraw, /account
    if (/^\/deposit/i.test(rawText)) {
      const depositText = 
        `💳 <b>TradeXora Deposit Assistance</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🔹 <b>Minimum Deposit:</b> ₹100\n` +
        `🔹 <b>Methods:</b> UPI, QR Code, PhonePe, Paytm, GPay\n\n` +
        `Agar aapka deposit pending hai, to apna <b>12-digit UTR</b> aur <b>payment screenshot</b> yahan chat me bhej dijiye. Hamari team turant wallet me balance add kar degi!`;
      await sendSupportTelegramMessage(senderChatId, depositText, [
        [{ text: "👨‍💻 Talk to Human Support", callback_data: "sup_human" }],
        [{ text: "« Support Menu", callback_data: "sup_menu" }]
      ]);
      return;
    }

    if (/^\/withdraw/i.test(rawText)) {
      const withdrawText = 
        `💸 <b>TradeXora Withdrawal Guide</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🔹 <b>Minimum Withdrawal:</b> ₹500\n` +
        `🔹 <b>Processing Time:</b> 15 to 30 Minutes\n\n` +
        `Apna withdrawal verify karne ke liye apna <b>User ID ya registered email</b> yahan bhej dijiye!`;
      await sendSupportTelegramMessage(senderChatId, withdrawText, [
        [{ text: "👨‍💻 Talk to Human Support", callback_data: "sup_human" }],
        [{ text: "« Support Menu", callback_data: "sup_menu" }]
      ]);
      return;
    }

    if (/^\/account/i.test(rawText)) {
      const accText = 
        `🆔 <b>TradeXora Account Lookup</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Kripya apna TradeXora User ID (e.g. user_xxx) ya registered email yahan message karein. Support desk verify karke turant response karega.`;
      await sendSupportTelegramMessage(senderChatId, accText, [
        [{ text: "« Support Menu", callback_data: "sup_menu" }]
      ]);
      return;
    }

    // If user sent a photo (e.g. payment receipt / screenshot)
    if (msg.photo && msg.photo.length > 0) {
      const largestPhoto = msg.photo[msg.photo.length - 1];
      const fileId = largestPhoto.file_id;
      const caption = msg.caption ? escapeHtml(msg.caption) : "Payment / Issue Screenshot";

      // 1. Acknowledge user
      await sendSupportTelegramMessage(
        senderChatId,
        `✅ <b>Screenshot Received!</b>\n\n` +
        `Aapka screenshot hamari support team ke paas register ho gaya hai. Support executive ise verify karke jald hi yahan update bhejenge.`
      );

      // 2. Forward to Admin
      const adminCaption = 
        `📸 <b>NEW SUPPORT SCREENSHOT</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 <b>User:</b> ${escapeHtml(senderName)} (${username})\n` +
        `🆔 <b>Telegram ID:</b> <code>${senderChatId}</code>\n` +
        `📝 <b>Caption:</b> ${caption}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 <i>Reply to this user:</i>\n` +
        `<code>/reply ${senderChatId} &lt;your reply&gt;</code>`;

      await sendSupportTelegramPhoto(CHAT_ID, fileId, adminCaption);
      return;
    }

    // If user sent normal text query / issue / UTR / email
    if (rawText) {
      // 1. Acknowledge user
      await sendSupportTelegramMessage(
        senderChatId,
        `✅ <b>Message Received!</b>\n\n` +
        `Aapka message TradeXora Support Desk me register ho gaya hai. Hamare live agent iska jaanch karke aapko isi chat me turant reply karenge.\n\n` +
        `<i>Support Team: 24/7 Online & Active</i>`
      );

      // 2. Forward to Admin Desk
      const adminTicket = 
        `📩 <b>NEW SUPPORT QUERY TICKET</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 <b>Trader:</b> ${escapeHtml(senderName)} (${username})\n` +
        `🆔 <b>Telegram ID:</b> <code>${senderChatId}</code>\n` +
        `💬 <b>Query:</b>\n<i>${escapeHtml(rawText)}</i>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 <i>To reply to user, send:</i>\n` +
        `<code>/reply ${senderChatId} &lt;your response&gt;</code>`;

      await sendSupportTelegramMessage(CHAT_ID, adminTicket);
    }
  }
}

async function pollSupportBotUpdates() {
  if (!SUPPORT_BOT_TOKEN) return;
  let lastUpdateId = 0;

  console.log("Starting Support Bot polling for @Dear_aanshiji_bot...");

  while (true) {
    try {
      const url = `https://api.telegram.org/bot${SUPPORT_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`;
      const r = await fetch(url);
      const data: any = await r.json();

      if (!data.ok) {
        if (data.error_code === 409) {
          // Another instance is running, sleep 15s to back off cleanly
          await new Promise((resolve) => setTimeout(resolve, 15000));
        } else {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        continue;
      }

      if (data.ok && data.result) {
        for (const update of data.result) {
          lastUpdateId = update.update_id;
          await handleSupportBotUpdate(update).catch((e) => console.error("Support update error:", e));
        }
      }
    } catch (e) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

// Telegram Support Bot Webhook Endpoint
app.post("/api/telegram-support-webhook", express.json(), async (req, res) => {
  res.status(200).send("OK");
  try {
    if (req.body) {
      await handleSupportBotUpdate(req.body);
    }
  } catch (e) {
    console.error("Support bot webhook handler error:", e);
  }
});

// Admin Webhook Sync & Clear Routes
app.all(["/api/sync-webhooks", "/api/setup-webhooks"], async (req, res) => {
  const targetBase = RENDER_PLATFORM_URL;
  const results: any = {};
  try {
    const supportWebhookUrl = `${targetBase}/api/telegram-support-webhook`;
    const r2 = await fetch(`https://api.telegram.org/bot${SUPPORT_BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: supportWebhookUrl,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: false,
      }),
    });
    results.supportBot = await r2.json();
  } catch (e: any) {
    results.supportBotError = e.message;
  }
  res.json({ success: true, targetBase, results });
});

app.all(["/api/delete-webhooks", "/api/clear-webhooks"], async (req, res) => {
  const results: any = {};
  try {
    const r2 = await fetch(`https://api.telegram.org/bot${SUPPORT_BOT_TOKEN}/deleteWebhook`);
    results.supportBot = await r2.json();
  } catch (e: any) {
    results.supportBot = e.message;
  }
  try {
    const r1 = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
    results.mainBot = await r1.json();
  } catch (e: any) {
    results.mainBot = e.message;
  }
  res.json({ success: true, results });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error("Failed to start Vite middleware:", e);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.send("<!DOCTYPE html><html><head><title>TradeXora</title></head><body><div id='root'></div></body></html>");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);

    // Launch background services asynchronously without delaying server port binding
    pollTelegramUpdates().catch((e) => console.error("Telegram polling error:", e));
    setTelegramCommands().catch((e) => console.error("Telegram commands setup error:", e));

    // Launch Support Bot (@Dear_aanshiji_bot) polling & command setup
    pollSupportBotUpdates().catch((e) => console.error("Support bot polling error:", e));
    setSupportTelegramCommands().catch((e) => console.error("Support bot commands setup error:", e));

    // Launch Silent Platform Power Worker (replacing UptimeRobot, keeping Render alive 24/7)
    startSilentKeepAlive();
  });
}

startServer();
