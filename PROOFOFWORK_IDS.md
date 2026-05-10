# ProofOfWork.Me IDs

Planning notes for the next ProofOfWork.Me phase: human-readable on-chain mail IDs, backed by Bitcoin OP_RETURN registry events.

## Developer Warning

Phase 1 is a canonical registry launch. Future developers and agents should treat this file as protocol documentation, not loose brainstorming.

Do not change these without an explicit migration plan:

- Mainnet registry address: `bc1qfwytlzyr3ym3enz2eutwtjsf9kkf6uqkjydk3e`
- Registration price: `1000` sats
- Protocol prefix: `pwid1:`
- Registration event: `pwid1:r2:<id-base64url>:<owner-address>:<receive-address>:<pgp-public-key-base64url?>`
- Resolver rule: first confirmed valid registration wins
- Casing rule: IDs are case-insensitive forever
- Pending rule: pending IDs are visible but not final, and mail must not route to them
- Verification rule: X verification actions appear only for IDs owned by or routed to the connected wallet

Implementation anchors in `src/App.tsx`:

- `ID_REGISTRY_ADDRESSES`
- `fetchRegistryTransactions`
- `buildIdRegistrationPayload`
- `parseIdRegistrationPayload`
- `idRecordsFromTransactions`
- `resolveRecipientInput`
- `IdLaunchApp`

## Concept

ProofOfWork.Me IDs are aliases like:

```text
user@proofofwork.me
```

They are not traditional DNS records. They are on-chain mail IDs resolved by the ProofOfWork.Me app/indexer.

- Registry events live in Bitcoin OP_RETURN outputs.
- First valid registration wins.
- Registration requires a 1,000 sat payment to the canonical registry address.
- Transfers update the current owner/receiver.
- Future messages resolve to the current receiver.
- The app resolves IDs by scanning registry history and applying valid events in chain order.

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

The ID subdomain renders a focused mainnet claim flow using the same registry address and `pwid1:r2` protocol. It is intentionally narrower than the full mail app: connect UniSat, check availability, register, view registry stats, view owned IDs, view public registry records, and verify owned/routed IDs on X.

Production domains:

```text
proofofwork.me              landing page
id.proofofwork.me           focused ID registry app
computer.proofofwork.me     full mail/computer app
```

The ID subdomain is the first onboarding experience and should stay focused on claiming/resolving IDs, not reading mail.

Local preview:

```text
http://localhost:5173/?id-launch=1
```

ID-only launch build:

```bash
VITE_ID_LAUNCH_ONLY=1 VITE_POW_API_BASE=https://id.proofofwork.me npm run build
```

Use that environment variable for the Phase 1 server so the full mail app stays hidden even if someone opens the bare IP address or a non-ID hostname.

Current registration payload:

```text
pwid1:r2:<id-base64url>:<owner-address>:<receive-address>:<pgp-public-key-base64url?>
```

Rules:

- The transaction must pay at least `1000` sats to the registry address.
- The registry payment output must appear before the ID OP_RETURN output in the transaction.
- The OP_RETURN must start with `pwid1:`.
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
- The compose flow must not route mail to a pending ID. IDs are sendable only after a confirmed registry record resolves to a receive address.
- Duplicate confirmed registrations are ignored by the resolver.
- Registry scans must paginate full confirmed address history and merge mempool transactions before applying first-confirmed-wins. Reading only the first mempool.space address page can hide older confirmed winners and make duplicates look available or pending.
- Production registry reads should go through the ProofOfWork OP_RETURN API. The API reads confirmed state from the ProofOfWork node/indexer stack and may merge a pending mempool fallback for unconfirmed visibility.
- Registration broadcasts must re-check the full registry immediately before building/signing the PSBT.
- Owner and receive address are separate fields.
- PGP public key data is optional and base64url encoded in the registration payload.
- After broadcast, the app can open a prefilled X post that includes the ID and registry tx link as optional social proof.
- Verification actions should appear only for IDs owned by or routed to the connected wallet, never for unrelated public registry records.

## Social Verification

X verification is not part of consensus. It is a public attestation layer.

The chain remains canonical:

- The ID is owned by the first confirmed valid registry transaction.
- The X post only proves the registrant chose to publicly associate an account with that transaction.
- The app can generate a prefilled post with the ID and mempool transaction link only from the owner's/routed wallet view.
- Future profile metadata can store an X proof URL on-chain with a `pwid1:meta` event.

## Future Metaprotocol

Everything below this point is future planning. It must not silently change Phase 1 behavior.

The metaprotocol should be marketplace-ready from the start, even if marketplace UI comes later.

Possible registry events:

```text
pwid1:r2:<id-base64url>:<owner>:<receiver>:<pgp-public-key-base64url?>
pwid1:u:<id-base64url>:<receiver>
pwid1:t:<id-base64url>:<new-owner>:<new-receiver?>
pwid1:k:<id-base64url>:<pgp-public-key-base64url>
pwid1:list:<id-base64url>:<price>:<currency>
pwid1:unlist:<id-base64url>
pwid1:bid:<id-base64url>:<bidder>:<price>:<currency>
pwid1:accept:<id-base64url>:<bid-txid>
pwid1:buy:<id-base64url>:<listing-txid>
pwid1:meta:<id-base64url>:<metadata>
```

Rules to preserve:

- All event ID fields should be base64url encoded and normalized case-insensitively by resolvers.
- `r2` is valid only if the ID is unclaimed.
- `u`, `t`, `k`, `list`, `unlist`, and `accept` are valid only from the current owner.
- `buy` is valid only against an active listing.
- Marketplace events should be verifiable from chain history.
- The resolver should expose both current owner and current receiver.

## Marketplace Readiness

IDs should behave like transferable assets.

- Owners can list IDs for sale.
- Buyers can purchase listed IDs.
- Bidders can place offers.
- Owners can accept bids.
- Owners can unlist IDs.
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
