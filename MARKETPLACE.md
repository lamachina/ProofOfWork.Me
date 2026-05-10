# ProofOfWork Marketplace

## Product Boundaries

- `id.proofofwork.me` is registration-only.
- `computer.proofofwork.me` contains the authenticated Marketplace workspace.
- `marketplace.proofofwork.me` is the standalone marketplace app.
- The IDs workspace is for registration, receiver updates, and direct owner transfers only.

## Current ID Marketplace Model

The current marketplace flow uses off-chain signed listing authorizations:

1. The current ID owner chooses an owned confirmed ID.
2. The owner signs a listing authorization with price, optional buyer lock, optional receive-address lock, nonce, and optional expiry.
3. A buyer submits the signed authorization.
4. The buyer funds the seller payment plus the 546 sat registry transfer in one Bitcoin transaction.
5. The indexer accepts the transfer only if the seller is still the current owner and the signature/terms validate.

This is good for early trading because the seller does not need to broadcast a listing transaction.

## Delistings

With off-chain listings, the simplest delisting is to stop publishing the signed authorization. That is not enough once a listing JSON has been shared publicly, because an old signed authorization may still be usable if:

- the seller still owns the ID,
- the authorization has not expired,
- and the buyer satisfies the signed terms.

Near-term rule:

- Listings should use expiries.
- Owners can invalidate all old listings by transferring the ID or changing marketplace rules in a future protocol version.

Long-term rule:

- Add paid on-chain listing and delisting events.
- A listing event publishes a canonical listing ID.
- A delisting event cancels that listing ID.
- Any ownership transfer automatically invalidates active listings for that asset.

Suggested future events:

```text
pwid1:list2:<asset-json-base64url>
pwid1:delist2:<listing-id>
```

Both should pay the 546 sat mutation fee to the canonical registry/marketplace address.

## General Asset Trading

The marketplace should be asset-agnostic over time. IDs are the first asset type, but the same shell can trade:

- ProofOfWork IDs
- apps
- files
- code bundles
- NFTs or inscriptions if supported later
- other Bitcoin-native records

The future-facing design is a universal asset envelope:

```json
{
  "version": "pow-asset-v1",
  "type": "id",
  "locator": "pwid:bitcoin",
  "owner": "bc1...",
  "metadataHash": "sha256...",
  "transferMethod": "pwid1:buy2"
}
```

Listings then sign a generic marketplace envelope:

```json
{
  "version": "pow-market-v1",
  "asset": {},
  "seller": "bc1...",
  "priceSats": 100000,
  "acceptedAssets": [],
  "paymentOutputs": [],
  "nonce": "random",
  "expiresAt": "2026-05-31T00:00:00.000Z"
}
```

This keeps IDs, apps, code, and files coherent under one marketplace without forcing every asset type into the ID protocol.

## Trading Assets For Assets

Sats-for-asset is the first settlement mode.

Asset-for-asset should be designed as a later phase because true atomic swaps need both assets to be enforceable in one settlement path. For ProofOfWork-native assets, that can be done with a single transaction containing:

- seller payment or asset consideration,
- registry/marketplace mutation fee,
- OP_RETURN transfer event,
- and enough signed terms for the indexer to verify the swap.

For assets outside the ProofOfWork protocol, the marketplace should require an adapter that can prove ownership and transfer finality.
