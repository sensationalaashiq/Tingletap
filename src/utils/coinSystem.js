// src/utils/coinSystem.js
// Core coin wallet and transaction system for TingleTap

import {
  doc, getDoc, setDoc, updateDoc, addDoc, collection,
  serverTimestamp, runTransaction, query, where, orderBy,
  limit, getDocs, onSnapshot, increment
} from 'firebase/firestore';
import { db } from '../firebase/config';

/* ══════════════════════════════════════════════════
   DEFAULT CONFIG (seeded on first admin load)
══════════════════════════════════════════════════ */
export const DEFAULT_COIN_PACKAGES = [
  { id: 'pkg_100',  coins: 100,  price: 9,    label: '100 Coins',  popular: false, bonus: 0 },
  { id: 'pkg_250',  coins: 250,  price: 19,   label: '250 Coins',  popular: false, bonus: 0 },
  { id: 'pkg_500',  coins: 500,  price: 39,   label: '500 Coins',  popular: true,  bonus: 25 },
  { id: 'pkg_1000', coins: 1000, price: 79,   label: '1000 Coins', popular: false, bonus: 75 },
  { id: 'pkg_2500', coins: 2500, price: 179,  label: '2500 Coins', popular: false, bonus: 250 },
  { id: 'pkg_5000', coins: 5000, price: 349,  label: '5000 Coins', popular: false, bonus: 750 },
];

export const DEFAULT_COIN_CONFIG = {
  packages: DEFAULT_COIN_PACKAGES,
  upiId: '',
  upiEnabled: false,
  commissionPct: 20,
  updatedAt: null,
};

/* ══════════════════════════════════════════════════
   CONFIG DOC (settings/coinConfig)
══════════════════════════════════════════════════ */

export const getCoinConfigRef = () => doc(db, 'settings', 'coinConfig');

export async function fetchCoinConfig() {
  const snap = await getDoc(getCoinConfigRef());
  if (!snap.exists()) {
    await setDoc(getCoinConfigRef(), { ...DEFAULT_COIN_CONFIG, updatedAt: serverTimestamp() });
    return DEFAULT_COIN_CONFIG;
  }
  return snap.data();
}

export function subscribeCoinConfig(callback) {
  return onSnapshot(getCoinConfigRef(), (snap) => {
    if (snap.exists()) callback(snap.data());
    else callback(DEFAULT_COIN_CONFIG);
  });
}

export async function updateCoinConfig(updates) {
  await setDoc(getCoinConfigRef(), { ...updates, updatedAt: serverTimestamp() }, { merge: true });
}

/* ══════════════════════════════════════════════════
   WALLET (coinWallets/{uid})
══════════════════════════════════════════════════ */

export const getWalletRef = (uid) => doc(db, 'coinWallets', uid);

export async function fetchWallet(uid) {
  const snap = await getDoc(getWalletRef(uid));
  if (!snap.exists()) {
    const initial = {
      balance: 0,
      totalPurchased: 0,
      totalGifted: 0,
      totalReceived: 0,
      totalTransactions: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(getWalletRef(uid), initial);
    return initial;
  }
  return snap.data();
}

export function subscribeWallet(uid, callback) {
  return onSnapshot(getWalletRef(uid), async (snap) => {
    if (!snap.exists()) {
      const initial = {
        balance: 0, totalPurchased: 0, totalGifted: 0,
        totalReceived: 0, totalTransactions: 0,
      };
      await setDoc(getWalletRef(uid), { ...initial, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      callback(initial);
    } else {
      callback(snap.data());
    }
  });
}

/* ══════════════════════════════════════════════════
   COIN TRANSACTIONS
══════════════════════════════════════════════════ */

export function subscribeUserTransactions(uid, callback, limitCount = 50) {
  const q = query(
    collection(db, 'coinTransactions'),
    where('uid', '==', uid),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

/* Add coins to wallet (purchase) — called by admin after verifying payment */
export async function creditCoins({ uid, coins, orderId, note = '' }) {
  await runTransaction(db, async (tx) => {
    const walletRef = getWalletRef(uid);
    const walletSnap = await tx.get(walletRef);

    if (!walletSnap.exists()) {
      tx.set(walletRef, {
        balance: coins,
        totalPurchased: coins,
        totalGifted: 0,
        totalReceived: 0,
        totalTransactions: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      tx.update(walletRef, {
        balance: increment(coins),
        totalPurchased: increment(coins),
        totalTransactions: increment(1),
        updatedAt: serverTimestamp(),
      });
    }

    const txRef = doc(collection(db, 'coinTransactions'));
    tx.set(txRef, {
      uid,
      type: 'purchase',
      coins,
      orderId,
      note,
      timestamp: serverTimestamp(),
      status: 'completed',
    });
  });
}

/* Deduct coins for gift (atomic) */
export async function deductCoinsForGift({ fromUid, toUid, coins, giftId, giftName, roomId, rjUid }) {
  await runTransaction(db, async (tx) => {
    const fromRef = getWalletRef(fromUid);
    const toRef = getWalletRef(toUid);

    const fromSnap = await tx.get(fromRef);
    const fromBalance = fromSnap.exists() ? (fromSnap.data().balance || 0) : 0;

    if (fromBalance < coins) throw new Error('Insufficient coins');

    // Deduct from sender
    if (!fromSnap.exists()) {
      throw new Error('Wallet not found');
    }
    tx.update(fromRef, {
      balance: increment(-coins),
      totalGifted: increment(coins),
      totalTransactions: increment(1),
      updatedAt: serverTimestamp(),
    });

    // Credit to receiver
    const toSnap = await tx.get(toRef);
    if (!toSnap.exists()) {
      tx.set(toRef, {
        balance: coins,
        totalPurchased: 0,
        totalGifted: 0,
        totalReceived: coins,
        totalTransactions: 1,
        lastGiftFromUid: fromUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      tx.update(toRef, {
        balance: increment(coins),
        totalReceived: increment(coins),
        totalTransactions: increment(1),
        lastGiftFromUid: fromUid,
        updatedAt: serverTimestamp(),
      });
    }

    // Sender transaction
    const senderTxRef = doc(collection(db, 'coinTransactions'));
    tx.set(senderTxRef, {
      uid: fromUid,
      type: 'gift_sent',
      coins: -coins,
      toUid,
      giftId,
      giftName,
      roomId: roomId || '',
      rjUid: rjUid || '',
      timestamp: serverTimestamp(),
      status: 'completed',
    });

    // Receiver transaction
    const receiverTxRef = doc(collection(db, 'coinTransactions'));
    tx.set(receiverTxRef, {
      uid: toUid,
      type: 'gift_received',
      coins,
      fromUid,
      giftId,
      giftName,
      roomId: roomId || '',
      rjUid: rjUid || '',
      timestamp: serverTimestamp(),
      status: 'completed',
    });

    // RJ Earnings update
    if (rjUid) {
      const rjEarningsRef = doc(db, 'rjEarnings', rjUid);
      const rjSnap = await tx.get(rjEarningsRef);
      const now = new Date();
      const todayKey = now.toISOString().slice(0, 10);
      const weekKey = getWeekKey(now);
      const monthKey = now.toISOString().slice(0, 7);

      if (!rjSnap.exists()) {
        tx.set(rjEarningsRef, {
          totalCoins: coins,
          totalGifts: 1,
          pendingCoins: coins,
          paidCoins: 0,
          todayCoins: coins,
          todayKey,
          weekCoins: coins,
          weekKey,
          monthCoins: coins,
          monthKey,
          lastGiftFromUid: fromUid,
          lastUpdated: serverTimestamp(),
        });
      } else {
        const d = rjSnap.data();
        const todayCoins = (d.todayKey === todayKey ? (d.todayCoins || 0) : 0) + coins;
        const weekCoins = (d.weekKey === weekKey ? (d.weekCoins || 0) : 0) + coins;
        const monthCoins = (d.monthKey === monthKey ? (d.monthCoins || 0) : 0) + coins;
        tx.update(rjEarningsRef, {
          totalCoins: increment(coins),
          totalGifts: increment(1),
          pendingCoins: increment(coins),
          todayCoins,
          todayKey,
          weekCoins,
          weekKey,
          monthCoins,
          monthKey,
          lastGiftFromUid: fromUid,
          lastUpdated: serverTimestamp(),
        });
      }
    }

    // Leaderboard gift record
    const giftRecordRef = doc(collection(db, 'giftRecords'));
    tx.set(giftRecordRef, {
      fromUid,
      toUid,
      coins,
      giftId,
      giftName,
      rjUid: rjUid || '',
      roomId: roomId || '',
      timestamp: serverTimestamp(),
    });
  });
}

/* ══════════════════════════════════════════════════
   PAYMENT ORDERS
══════════════════════════════════════════════════ */

export async function createPaymentOrder({ uid, displayName, coins, price, packageId, upiId }) {
  const orderId = `TT-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const orderRef = await addDoc(collection(db, 'paymentOrders'), {
    uid,
    displayName,
    coins,
    price,
    packageId,
    orderId,
    upiId,
    status: 'pending', // pending | submitted | verified | failed
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { orderId, orderDocId: orderRef.id };
}

export async function markOrderSubmitted(orderDocId) {
  await updateDoc(doc(db, 'paymentOrders', orderDocId), {
    status: 'submitted',
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function subscribePaymentOrders(callback) {
  const q = query(
    collection(db, 'paymentOrders'),
    orderBy('createdAt', 'desc'),
    limit(200)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function verifyPaymentOrder(orderDocId, orderData) {
  // Idempotent: run everything inside a single transaction so a retry
  // that arrives after a partial write doesn't double-credit the wallet.
  await runTransaction(db, async (tx) => {
    const orderRef = doc(db, 'paymentOrders', orderDocId);
    const orderSnap = await tx.get(orderRef);

    if (!orderSnap.exists()) throw new Error('Payment order not found');
    // Already processed — bail out safely without touching the wallet.
    if (orderSnap.data().status === 'verified') return;

    // Always use authoritative stored values — never trust caller-supplied data.
    const { uid, coins, orderId, price } = orderSnap.data();
    const walletRef = getWalletRef(uid);
    const walletSnap = await tx.get(walletRef);

    if (!walletSnap.exists()) {
      tx.set(walletRef, {
        balance: coins,
        totalPurchased: coins,
        totalGifted: 0,
        totalReceived: 0,
        totalTransactions: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      tx.update(walletRef, {
        balance: increment(coins),
        totalPurchased: increment(coins),
        totalTransactions: increment(1),
        updatedAt: serverTimestamp(),
      });
    }

    const txRef = doc(collection(db, 'coinTransactions'));
    tx.set(txRef, {
      uid,
      type: 'purchase',
      coins,
      orderId,
      note: `Coin purchase — ₹${price}`,
      timestamp: serverTimestamp(),
      status: 'completed',
    });

    tx.update(orderRef, {
      status: 'verified',
      verifiedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function rejectPaymentOrder(orderDocId) {
  await updateDoc(doc(db, 'paymentOrders', orderDocId), {
    status: 'failed',
    updatedAt: serverTimestamp(),
  });
}

/* ══════════════════════════════════════════════════
   RJ EARNINGS & PAYMENTS
══════════════════════════════════════════════════ */

export function subscribeRJEarnings(rjUid, callback) {
  return onSnapshot(doc(db, 'rjEarnings', rjUid), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

export function subscribeAllRJEarnings(callback) {
  return onSnapshot(collection(db, 'rjEarnings'), (snap) => {
    callback(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
  });
}

export async function fetchRJWithdrawalInfo(rjUid) {
  const snap = await getDoc(doc(db, 'rjWithdrawalInfo', rjUid));
  return snap.exists() ? snap.data() : null;
}

export async function saveRJWithdrawalInfo(rjUid, info) {
  await setDoc(doc(db, 'rjWithdrawalInfo', rjUid), {
    ...info,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export function subscribeRJPayments(callback) {
  const q = query(
    collection(db, 'rjPayments'),
    orderBy('createdAt', 'desc'),
    limit(200)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function createRJPayment({ rjUid, rjName, coins, commissionPct, upiId, notes }) {
  const commissionCoins = Math.floor(coins * (commissionPct / 100));
  const finalCoins = coins - commissionCoins;
  const pricePerCoin = 0.07; // ₹0.07 per coin (approx ₹9 for 100 coins)
  const commissionAmount = +(commissionCoins * pricePerCoin).toFixed(2);
  const finalAmount = +(finalCoins * pricePerCoin).toFixed(2);

  const ref = await addDoc(collection(db, 'rjPayments'), {
    rjUid,
    rjName,
    coins,
    commissionPct,
    commissionCoins,
    commissionAmount,
    finalCoins,
    finalAmount,
    upiId,
    notes: notes || '',
    status: 'pending', // pending | processing | paid | failed
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateRJPaymentStatus(paymentId, status, notes = '') {
  const updates = { status, updatedAt: serverTimestamp() };
  if (status === 'paid') updates.paidAt = serverTimestamp();
  if (notes) updates.notes = notes;
  await updateDoc(doc(db, 'rjPayments', paymentId), updates);

  // If paid, update rjEarnings paidCoins
  if (status === 'paid') {
    const paySnap = await getDoc(doc(db, 'rjPayments', paymentId));
    if (paySnap.exists()) {
      const { rjUid, coins } = paySnap.data();
      await updateDoc(doc(db, 'rjEarnings', rjUid), {
        pendingCoins: increment(-coins),
        paidCoins: increment(coins),
      });
    }
  }
}

/* ══════════════════════════════════════════════════
   LEADERBOARDS
══════════════════════════════════════════════════ */

export function subscribeLeaderboard(type, period, callback) {
  // type: 'senders' | 'receivers'
  // period: 'today' | 'week' | 'month' | 'all'
  const collId = type === 'senders' ? 'coinTransactions' : 'coinTransactions';
  const txType = type === 'senders' ? 'gift_sent' : 'gift_received';

  let q = query(
    collection(db, 'coinTransactions'),
    where('type', '==', txType),
    orderBy('timestamp', 'desc'),
    limit(500)
  );

  return onSnapshot(q, (snap) => {
    const txs = snap.docs.map(d => d.data());
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now); monthStart.setDate(1);

    // Filter by period
    const filtered = txs.filter(tx => {
      if (!tx.timestamp) return false;
      const ts = tx.timestamp.toDate ? tx.timestamp.toDate() : new Date(tx.timestamp);
      if (period === 'today') return ts.toISOString().slice(0, 10) === todayKey;
      if (period === 'week') return ts >= weekStart;
      if (period === 'month') return ts >= monthStart;
      return true; // all
    });

    // Aggregate by uid
    const map = {};
    filtered.forEach(tx => {
      const uid = tx.uid;
      if (!map[uid]) map[uid] = { uid, coins: 0, gifts: 0 };
      map[uid].coins += Math.abs(tx.coins);
      map[uid].gifts += 1;
    });

    const sorted = Object.values(map).sort((a, b) => b.coins - a.coins).slice(0, 20);
    callback(sorted);
  });
}

/* ══════════════════════════════════════════════════
   HELPER UTILS
══════════════════════════════════════════════════ */

function getWeekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

export function generateOrderId() {
  return `TT-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export function formatCoins(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function coinsToRupees(coins, commissionPct = 0) {
  const pricePerCoin = 0.07;
  const raw = coins * pricePerCoin;
  const commission = raw * (commissionPct / 100);
  return {
    gross: +raw.toFixed(2),
    commission: +commission.toFixed(2),
    net: +(raw - commission).toFixed(2),
  };
}
