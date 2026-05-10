# ProofOfWork.Me IDs

Planning notes for the next ProofOfWork.Me phase: human-readable on-chain mail IDs, backed by Bitcoin OP_RETURN registry events.

## Developer Warning

Phase 1 is a canonical registry launch. Future developers and agents should treat this file as protocol documentation, not loose brainstorming.

Do not change these without an explicit migration plan:

- Mainnet registry address: `bc1qfwytlzyr3ym3enz2eutwtjsf9kkf6uqkjydk3e`
- Registration price: `1000` sats
- Mutation price: `546` sats for receiver updates, transfers, on-chain listings, delistings, and buyer-funded marketplace transfers
- Protocol prefix: `pwid1:`
- Registration event: `pwid1:r2:<id-base64url>:<owner-address>:<receive-address>:<pgp-public-key-base64url?>`
- Receiver update event: `pwid1:u:<id-base64url>:<receive-address>`
- Transfer event: `pwid1:t:<id-base64url>:<new-owner-address>:<new-receive-address?>`
- Listing event: `pwid1:list2:<sale-authorization-json-base64url>`
- Delisting event: `pwid1:delist2:<listing-txid>`
- Buyer-funded marketplace transfer event: `pwid1:buy2:<sale-authorization-json-base64url>:<new-owner-address>:<new-receive-address?>`
- Resolver rule: first confirmed valid registration wins
- Casing rule: IDs are case-insensitive forever
- Pending rule: pending IDs are visible but not final, and mail must not route to them
- Verification rule: X verification actions appear only for IDs owned by or routed to the connected wallet

Implementation anchors in `src/App.tsx`:

- `ID_REGISTRY_ADDRESSES`
- `fetchRegistryTransactions`
- `buildIdRegistrationPayload`
- `buildIdReceiverUpdatePayload`
- `buildIdTransferPayload`
- `buildIdListingPayload`
- `buildIdDelistingPayload`
- `buildIdMarketplaceTransferPayload`
- `parseIdEventPayload`
- `parseIdRegistrationPayload`
- `idRegistryStateFromTransactions`
- `resolveRecipientInput`
- `IdLaunchApp`
- `MarketplaceApp`
- `MarketplaceWorkspace`

## Concept

ProofOfWork.Me IDs are aliases like:

```text
user@proofofwork.me
```

They are not traditional DNS records. They are on-chain mail IDs resolved by the ProofOfWork.Me app/indexer.

- Registry events live in Bitcoin OP_RETURN outputs.
- First valid registration wins.
- Registration requires a 1,000 sat payment to the canonical registry address.
- Receiver updates, transfers, listings, delistings, and buyer-funded marketplace transfers require a 546 sat mutation payment to the same canonical registry address.
- Transfers update the current owner/receiver.
- Marketplace listings publish seller-signed sale terms on-chain, while buyer-funded transfers execute those terms.
- Future messages resolve to the current receiver.
- The app resolves IDs by scanning registry history and applying valid events in chain order.
- All registry mutations use the same canonical registry address and pay the mutation fee.

## ID Model

Ownership and message delivery should be separate.

```text
ID: user@proofofwork.me
owner: pubkey/address that controls the ID asset
receiver: pubkey/address where messages are delivered
```

This lets an owner change the receiving address without selling the ID. It also lets a buyer receive future messages after the ID is transferred.

## Current Implementation

Mainnet registry address:

```text
bc1qfwytlzyr3ym3enz2eutwtjsf9kkf6uqkjydk3e
```

Testnet and testnet4 registry addresses are not configured yet. The app only enables live ID registration on networks with a configured registry address.

Phase 1 launch surface:

```text
id.proofofwork.me
```

The ID subdomain renders a focused mainnet claim flow using the same registry address and `pwid1:r2` protocol. It is intentionally narrower than the full mail app: connect UniSat, check availability, register, view registry stats, view owned IDs, view public registry records, and verify owned/routed IDs on X. Do not put ID transfer, management, or marketplace tools on `id.proofofwork.me`; those belong in the Computer app and the standalone Marketplace app.
Inside `computer.proofofwork.me`, the IDs workspace is limited to registration, receiver updates, and direct owner transfers. Marketplace is a dedicated sidebar workspace for listing owned confirmed IDs and executing buyer-funded transfers.

Production domains:

```text
proofofwork.me              landing page
id.proofofwork.me           focused ID registry app
computer.proofofwork.me     full mail/computer app
desktop.proofofwork.me      public read-only file desktop
marketplace.proofofwork.me  standalone ID marketplace
```

The ID subdomain is the first onboarding experience and should stay focused on claiming/resolving IDs, not reading mail.
The Desktop subdomain can resolve confirmed IDs for public file browsing, but it must not treat pending IDs as searchable/routable identities.
The Marketplace subdomain can connect UniSat, publish on-chain listings for owned confirmed IDs, delist active listings, and execute buyer-funded `pwid1:buy2` transfers.

Local preview:

```text
http://localhost:5173/?id-launch=1
```

ID-only launch build:

```bash
VITE_ID_LAUNCH_ONLY=1 VITE_POW_API_BASE=https://id.proofofwork.me npm run build
```

Use that environment variable for the Phase 1 server so the full mail app stays hidden even if someone opens the bare IP address or a non-ID hostname.

Marketplace-only build:

```bash
VITE_MARKETPLACE_ONLY=1 VITE_POW_API_BASE=https://marketplace.proofofwork.me npm run build
```

Current registration payload:

```text
pwid1:r2:<id-base64url>:<owner-address>:<receive-address>:<pgp-public-key-base64url?>
```

Current mutation payloads:

```text
pwid1:u:<id-base64url>:<receive-address>
pwid1:t:<id-base64url>:<new-owner-address>:<new-receive-address?>
pwid1:list2:<sale-authorization-json-base64url>
pwid1:delist2:<listing-txid>
pwid1:buy2:<sale-authorization-json-base64url>:<new-owner-address>:<new-receive-address?>
```

Rules:

- `pwid1:r2` registration transactions must pay at least `1000` sats to the registry address.
- `pwid1:u`, `pwid1:t`, `pwid1:list2`, `pwid1:delist2`, and `pwid1:buy2` transactions must pay at least `546` sats to the registry address.
- The registry payment output must appear before the ID OP_RETURN output in the transaction.
- The OP_RETURN must start with `pwid1:`.
- Registrations, receiver updates, and transfers all use the same canonical registry address.
- Receiver updates and transfers must be paid from the current owner address, because the resolver verifies the current owner appears in the transaction inputs.
- `pwid1:u` changes only the receive address. The owner remains unchanged.
- `pwid1:t` changes ownership. If the new receive address is omitted, the new owner address also becomes the receive address.
- App UI may accept a confirmed ProofOfWork ID as a transfer target, but the written `pwid1:t` event must still contain resolved Bitcoin addresses.
- `pwid1:list2` publishes a signed sale authorization as an active marketplace listing. The listing txid is the listing ID.
- `pwid1:delist2` cancels an active listing by listing txid. The transaction must be funded by the current owner.
- Any confirmed ownership transfer through `pwid1:t` or `pwid1:buy2` automatically invalidates all active listings for that ID.
- `pwid1:buy2` changes ownership using an off-chain signed sale authorization from the current owner. The buyer can fund the transaction, so the seller does not need spendable sats.
- A `buy2` transaction must pay the 546 sat mutation fee before the ID OP_RETURN and must also pay the signed sale price to the current owner before the ID OP_RETURN.
- A `buy2` sale authorization uses JSON version `pwid-sale-v1` and is base64url encoded inside the OP_RETURN payload.
- The sale authorization signs canonical text with the ID, seller address, price, optional buyer lock, optional receive-address lock, nonce, and optional expiry.
- The resolver applies `buy2` only when the signature verifies for the current owner, the current owner still matches the seller, and the buyer/receiver constraints match the event.
- Sale authorizations are off-chain bearer objects. Anyone holding an open authorization can execute it by paying the signed price and mutation fee.
- IDs are case-insensitive forever. `User`, `user`, and `USER` all resolve to `user`.
- The app normalizes IDs to lowercase for writing, display, lookup, and first-claim comparisons.
- There is no arbitrary app-level ID length or character whitelist.
- Fresh registrations encode the ID field as base64url so punctuation and Unicode cannot break the colon-delimited registry format.
- The real size ceiling is the transaction's aggregate OP_RETURN data-carrier script limit of `100,000` bytes.
- Long IDs naturally cost more in bytes and fees, so the market prices them.
- Legacy `pwid1:r:<id>:...` registrations can still be read if their fields are parseable.
- New clients must write `r2`, not legacy `r`.
- First confirmed valid registration wins.
- Pending registrations can be displayed, but are not final.
- Pending transfers/receiver updates are not applied to canonical routing until confirmed.
- The compose flow must not route mail to a pending ID. IDs are sendable only after a confirmed registry record resolves to a receive address.
- Public Desktop search follows the same confirmed-only ID resolver rule.
- Duplicate confirmed registrations are ignored by the resolver.
- Registry scans must paginate full confirmed address history and merge mempool transactions before applying first-confirmed-wins. Reading only the first mempool.space address page can hide older confirmed winners and make duplicates look available or pending.
- Production registry reads should go through the ProofOfWork OP_RETURN API. The API reads confirmed state from the ProofOfWork node/indexer stack and may merge a pending mempool fallback for unconfirmed visibility.
- Registration broadcasts must re-check the full registry immediately before building/signing the PSBT.
- Owner and receive address are separate fields.
- PGP public key data is optional and base64url encoded in the registration payload.
- After broadcast, the app can open a prefilled X post that includes the ID and registry tx link as optional social proof.
- Verification actions should appear only for IDs owned by or routed to the connected wallet, never for unrelated public registry records.
- Confirmed registry rows in the Computer app can be saved as local Contacts. Pending IDs must not be saved as routable contacts.

## Social Verification

X verification is not part of consensus. It is a public attestation layer.

The chain remains canonical:

- The ID is owned by the first confirmed valid registry transaction.
- The X post only proves the registrant chose to publicly associate an account with that transaction.
- The app can generate a prefilled post with the ID and mempool transaction link only from the owner's/routed wallet view.
- Future profile metadata can store an X proof URL on-chain with a `pwid1:meta` event.

## Future Metaprotocol

Everything below this point is future planning. It must not silently change Phase 1 behavior.

The metaprotocol is marketplace-ready from the start. Live events are repeated here for context; future events must remain compatible with the live registry rules above.

Possible registry events:

```text
pwid1:r2:<id-base64url>:<owner>:<receiver>:<pgp-public-key-base64url?>
pwid1:u:<id-base64url>:<receiver>
pwid1:t:<id-base64url>:<new-owner>:<new-receiver?>
pwid1:list2:<sale-authorization-json-base64url>
pwid1:delist2:<listing-txid>
pwid1:buy2:<sale-authorization-json-base64url>:<new-owner>:<new-receiver?>
pwid1:k:<id-base64url>:<pgp-public-key-base64url>
pwid1:bid:<id-base64url>:<bidder>:<price>:<currency>
pwid1:accept:<id-base64url>:<bid-txid>
pwid1:meta:<id-base64url>:<metadata>
```

Rules to preserve:

- All event ID fields should be base64url encoded and normalized case-insensitively by resolvers.
- `r2` is valid only if the ID is unclaimed.
- `r2` requires at least `1000` sats to the registry address.
- `u`, `t`, `k`, `list2`, `delist2`, and `accept` are valid only from the current owner.
- `u`, `t`, `list2`, `delist2`, and `buy2` require at least `546` sats to the registry address.
- `u`, `t`, `list2`, `delist2`, and `buy2` are live registry events.
- `buy2` is valid only with a current-owner sale authorization and matching seller payment.
- `buy2` is valid only against current ownership; marketplace UIs should prefer active `list2` listings.
- Marketplace events should be verifiable from chain history.
- The resolver should expose both current owner and current receiver.

## Marketplace Readiness

IDs should behave like transferable assets.

- Owners can list IDs for sale.
- Buyers can purchase listed IDs.
- Seller-funded direct transfers use `pwid1:t`.
- On-chain listings use `pwid1:list2` plus a signed `pwid-sale-v1` authorization.
- Buyer-funded purchases use `pwid1:buy2`.
- Bidders can place offers.
- Owners can accept bids.
- Owners can delist IDs with `pwid1:delist2`.
- Marketplaces can verify current ownership from the chain.
- The current receiver determines where new mail is delivered.

## Node Purpose

The node is only for ProofOfWork.Me infrastructure.

- It does not hold funds.
- It does not hold private keys.
- It does not sign transactions.
- Users keep funds in UniSat or other wallets.
- Users sign locally in the browser.
- The backend/node reads, indexes, verifies, and optionally broadcasts already-signed transactions.

## Architecture

Current app can remain static/browser-first. The future node/indexer improves reliability, privacy, and sovereignty.

```text
Static frontend
  -> ProofOfWork.Me API/indexer
  -> Bitcoin Core node
```

Transaction flow:

```text
User wallet signs locally
  -> ProofOfWork.Me API receives signed tx
  -> Bitcoin Core broadcasts/verifies
  -> Indexer watches blocks/mempool
```

## Why Run A Node

Current ProofOfWork.Me works with UniSat and mempool.space. A dedicated node/indexer would improve:

- Reliability.
- Privacy.
- Broadcast control.
- Registry indexing.
- Alias resolution.
- Independence from public APIs.

Bitcoin Core alone does not provide an easy address-history or OP_RETURN protocol-search API. ProofOfWork.Me should use Bitcoin Core with an indexer.

Possible indexer approaches:

- Esplora/electrs for general address and transaction APIs.
- A custom ProofOfWork.Me indexer for `pwid1:` registry events and `pwm1:` mail events.

The custom indexer/API has started as `server/proof-api.mjs`. It reads from the private mempool/electrs stack, parses ProofOfWork OP_RETURN protocols, and exposes browser-ready endpoints for registry state, mail state, and transaction status.

Production apps can opt into it with:

```bash
VITE_POW_API_BASE=<production-api-url>
```

For ID safety, production should prefer this API over public mempool.space reads. If the first-party API is unavailable, it is safer for ID registration/routing to fail closed than to create duplicates from incomplete public API state.

Phase 1 production uses same-origin API proxies:

```text
https://proofofwork.me/api/*
https://id.proofofwork.me/api/*
https://computer.proofofwork.me/api/*
https://desktop.proofofwork.me/api/*
```

Pending registry records are useful for network visibility, but first-confirmed-wins only becomes final after block confirmation. Pending IDs must never be routable in compose.

## VPS Specs

Suggested infrastructure sizes:

| Use | Specs |
| --- | --- |
| Bare full node | 2 vCPU, 4 GB RAM, 1 TB SSD |
| Comfortable node | 4 vCPU, 8 GB RAM, 1-2 TB NVMe |
| ProofOfWork.Me node + indexer | 4-8 vCPU, 16 GB RAM, 2 TB NVMe |

Recommended starting point:

```text
4 vCPU
8 GB RAM
2 TB NVMe
Unmetered bandwidth
```

Important notes:

- Use SSD/NVMe, not HDD.
- Do not expose Bitcoin Core RPC publicly.
- Open port `8333` only for Bitcoin P2P/inbound peers.
- Do not prune if complete historical registry/mail indexing matters.
- Use `txindex=1` or a dedicated indexer depending on final backend design.

## Big Picture

ProofOfWork.Me can stay simple and browser-native while becoming more sovereign over time.

- Today: static client, UniSat signing, mempool.space APIs.
- Next: ProofOfWork.Me IDs with an OP_RETURN registry.
- Later: custom node/indexer for reliable mail and ID resolution.
- Marketplace-ready IDs can become transferable on-chain assets.
- The backend improves data access without becoming custodial.
