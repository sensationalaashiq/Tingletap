---
name: Coin system Firestore rules
description: Security rules and idempotency patterns for the client-side gift/wallet/payment system
---

## Rules design

`deductCoinsForGift()` is a client-side `runTransaction` that writes to:
- `coinWallets/{fromUid}` (debit — own wallet)
- `coinWallets/{toUid}` (credit — another user's wallet)
- `coinTransactions/{senderTx}` (uid == fromUid)
- `coinTransactions/{receiverTx}` (fromUid == auth.uid, type == gift_received)
- `rjEarnings/{rjUid}`
- `giftRecords/{newDoc}` (fromUid == auth.uid)

### coinWallets
Two separate `allow update` rules:
1. Own wallet (request.auth.uid == uid) — full write (for debits)
2. Another's wallet (uid != auth.uid) — additive-only: balance/totalReceived must not decrease, only credit fields can change

**Why:** Prevents theft (can't decrease another's balance) while allowing the gift credit half of the transaction.

### coinTransactions
Two separate `allow create` rules:
1. `request.resource.data.uid == request.auth.uid` — sender's own record
2. `request.resource.data.fromUid == request.auth.uid && type == gift_received && coins > 0` — receiver's record written by sender

### giftRecords
`allow create` requires `fromUid == request.auth.uid && coins > 0`

### rjEarnings
`allow create/update` only if totalCoins and pendingCoins never decrease (additive-only from users); staff can write freely.

## verifyPaymentOrder idempotency

Always use `orderSnap.data()` (not caller-supplied `orderData`) inside the transaction for uid/coins/orderId/price. Check `status === 'verified'` first and return early — prevents double-credit on retry.

## GiftPanel RTDB listener (useEffect cleanup)

Dynamic `import('firebase/database')` is async; cleanup must use an `active` flag + `detach` closure:
```js
let active = true, detach = null;
import('firebase/database').then(({ ref, onChildAdded, off }) => {
  if (!active) return;
  const feedRef = ref(rtdb, path);
  onChildAdded(feedRef, handler);
  detach = () => { try { off(feedRef); } catch {} };
  if (!active) detach();
});
return () => { active = false; if (detach) detach(); };
```
