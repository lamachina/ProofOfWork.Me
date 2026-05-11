# ProofOfWork Marketplace

## Product Boundaries

- `id.proofofwork.me` is registration-only.
- `computer.proofofwork.me` contains the authenticated Marketplace workspace.
- `marketplace.proofofwork.me` is the standalone marketplace app.
- The IDs workspace is for registration, receiver updates, and direct owner transfers only.

## Current ID Marketplace Model

The marketplace flow uses on-chain listings backed by owner-funded OP_RETURN sale terms and a spendable Bitcoin anchor:

1. The current ID owner chooses an owned confirmed ID.
2. The owner enters sale terms with price, optional buyer lock, optional receive-address lock, nonce, and optional expiry.
3. The owner publishes those terms in a `pwid1:list3` registry transaction that pays the 546 sat mutation fee and creates a 546 sat P2WSH listing anchor.
4. The listing txid becomes the listing ID.
5. A buyer can use the listing to fund the seller payment, refund the anchor, pay the 546 sat registry transfer, and spend the anchor in one `pwid1:buy3` transaction.
6. The indexer accepts the transfer only if the seller is still the current owner, the buy references an active listing, the transaction spends the listing anchor, and the buyer/receiver constraints match.

The listing anchor is the scarce settlement point. Competing buyers must spend the same outpoint, so only one purchase can confirm. Historical `list2`/`buy2`/`delist2` events remain readable for replay, but new marketplace writes use `list3`/`buy3`/`delist3`.

## Delistings

Delistings are also on-chain registry events:

```text
pwid1:list3:<sale-authorization-json-base64url>
pwid1:delist3:<listing-id>
```

Both pay the 546 sat mutation fee to the canonical registry address. A `delist3` transaction must be funded by the current owner, spend the listing anchor, and cancels the listing by txid.

Automatic invalidation rules:

- Any confirmed `pwid1:t` ownership transfer cancels all active listings for that ID.
- Any valid confirmed `pwid1:buy3` marketplace transfer cancels all active listings for that ID.
- Expired sale authorizations are ignored by the resolver.
- Pending listings and delistings are visible mempool intent only; confirmed history is canonical.

Pending marketplace events are displayed separately from confirmed ownership:

- sellers see pending listings and delistings they funded,
- buyers see pending buyer-funded transfers they broadcast,
- new owners/receivers see incoming pending transfers that target their wallet,
- confirmed registry state remains the only source of truth for active listings and ownership.

Marketplace broadcasts spend confirmed wallet UTXOs only. This prevents the visible fee rate on a new listing, delisting, or purchase from being pulled down by low-fee unconfirmed ancestors in the transaction package. If the wallet only has unconfirmed spendable coins, the UI should ask the user to wait for confirmation before publishing marketplace state.

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
  "transferMethod": "pwid1:buy3"
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
