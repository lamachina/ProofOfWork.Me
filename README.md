# ProofOfWork.Me

Bitcoin-native mail and ProofOfWork ID registry, written to BTC OP_RETURN outputs and signed locally with UniSat.

## Phase 1 Launch

The public front door is:

```text
proofofwork.me
```

The root domain renders a focused landing page that routes users to the two production apps:

```text
id.proofofwork.me
computer.proofofwork.me
```

Production app roles:

- `proofofwork.me` is the landing/router page.
- `id.proofofwork.me` is the focused Phase 1 ID registry onboarding app.
- `computer.proofofwork.me` is the full ProofOfWork.Me mail/computer app.

The Phase 1 registry onboarding flow is:

```text
id.proofofwork.me
```

This subdomain renders a focused mainnet ProofOfWork ID claim app from the same codebase. It must use the canonical registry address and the same `pwid1:r2` protocol as the full mail app.

Canonical mainnet registry:

```text
bc1qfwytlzyr3ym3enz2eutwtjsf9kkf6uqkjydk3e
```

Launch invariants for future developers/agents:

- Do not create a second registry address for Phase 1.
- Do not create a separate ID protocol for `id.proofofwork.me`.
- Do not make pending IDs routable in compose.
- Do not show X verification actions for unrelated public registry rows.
- Keep wallet signing local. The app must not handle seed phrases or private keys.
- Keep IDs case-insensitive and normalized to lowercase for comparisons.
- Keep the real ID size cap tied to the aggregate 100 KB OP_RETURN data-carrier limit, not arbitrary character rules.

## What It Does

- Connects UniSat.
- Switches UniSat between testnet4, testnet3, and mainnet.
- Sends BTC to a recipient address.
- Builds a PSBT with BTC, ProofOfWork.Me OP_RETURN outputs, and change.
- Uses UniSat to sign the PSBT, then broadcasts to the selected mempool.space network route.
- Shows the txid and a mempool.space link.
- Scans the connected address for incoming and sent ProofOfWork.Me OP_RETURN payments.
- Refreshes on demand to rescan address mail and check pending transaction statuses.
- Keeps unconfirmed inbound mail in Incoming until it confirms.
- Shows confirmed inbound mail in Inbox.
- Tracks local broadcast attempts as pending, confirmed, or dropped.
- Keeps pending and dropped broadcasts in Outbox.
- Checks pending broadcasts with the full transaction lookup so missing txs become dropped instead of staying pending forever.
- Lets dropped broadcasts be rebuilt from their local draft data; users must sign a fresh transaction to resend.
- Recovers confirmed sent mail from chain data, so Sent and Files do not depend only on browser history.
- Sorts Incoming, Inbox, and Sent by highest sats, newest, oldest, or thread.
- Replies to a message by embedding the parent txid so messages can form threads.
- Infers the sender from transaction inputs instead of storing an address in OP_RETURN.
- Shows self-sends in Incoming/Inbox and Outbox/Sent based on confirmation state.
- Auto-saves one local draft per wallet and network until the message is broadcast or discarded.
- Favorites confirmed mail locally so important messages stay easy to find.
- Archives messages locally so they leave Inbox/Sent without deleting the on-chain record.
- Exports and imports local app data backups for drafts, archives, favorites, theme, and broadcast tracking.
- Supports one small attachment per message, capped at 60,000 bytes before encoding.
- Adds a desktop-style Files section for confirmed attachment-only browsing, filtering, sorting, previews, download, and opening the source message.
- Supports fractional fee rates, including sub-1 sat/vB values like `0.1`.
- Uses the correct mempool.space explorer path for the connected chain, including `/testnet4`.
- Registers and scans mainnet ProofOfWork IDs through the canonical registry address.
- Paginates the ID registry's confirmed transaction history and separately merges mempool transactions before applying first-confirmed-wins.
- Can read registry, mail, files, and transaction status from a first-party ProofOfWork OP_RETURN API when `VITE_POW_API_BASE` is configured.
- Treats ProofOfWork IDs as case-insensitive names capped by the aggregate 100 KB OP_RETURN transaction limit, not arbitrary character rules.
- Resolves ProofOfWork IDs in the compose recipient field only after a confirmed registry record exists; pending IDs cannot receive routed mail yet.
- Re-checks the full registry immediately before broadcasting an ID registration to block stale duplicate claims.
- Opens a prefilled X post to verify only IDs owned by or routed to the connected wallet.
- Renders a dedicated Phase 1 ID claim experience on `id.proofofwork.me` using the same registry protocol and address.

## Production OP_RETURN API

Production builds are wired to a first-party ProofOfWork OP_RETURN API.

The API entrypoint is:

```text
server/proof-api.mjs
```

Production routes the API through the same app domains:

```text
https://proofofwork.me/api/*
https://id.proofofwork.me/api/*
https://computer.proofofwork.me/api/*
```

Current production behavior:

- Confirmed mainnet registry, mail, files, and tx status are read through the ProofOfWork node/indexer stack.
- The node stack does not hold funds, seed phrases, private keys, or wallet authority.
- Browser wallets still sign locally.
- Unconfirmed transactions are mempool gossip, not global truth.
- For pending visibility, the API merges the local node/indexer view with `PENDING_MEMPOOL_BASE`, which currently defaults to public `https://mempool.space`.
- Confirmed records remain canonical; pending records are visible but not final.
- A tx status can be `confirmed`, `pending`, or `dropped`.
- A dropped tx is not treated as durable mail. Users can rebuild/resend from local draft data when available.

Important launch invariant:

```text
Confirmed history is canonical. Pending mempool visibility is best-effort.
```

## OP_RETURN Protocol

Only OP_RETURN payloads that start with this prefix are read into mail views:

```text
pwm1:
```

The app writes OP_RETURN as:

```text
pwm1:m:<message-chunk>
```

Replies are written as:

```text
pwm1:r:<parent-txid>
pwm1:m:<message-chunk>
```

Replies are sent back to the sender inferred from the transaction inputs.

Attachments are written as base64url chunks:

```text
pwm1:a:<mime-base64url>:<name-base64url>:<size>:<sha256>:<index>/<total>:<data-base64url-chunk>
```

Attachment bytes are verified by size and SHA-256 before the reader exposes a download link.

Protocol OP_RETURN data-carrier script bytes are limited to 100,000 bytes, matching Bitcoin Core 30.0's default `-datacarriersize`.
The app enforces this as an aggregate transaction limit across all ProofOfWork.Me OP_RETURN outputs, including OP_RETURN and pushdata script overhead for each output.
The app uses PSBT construction instead of UniSat's `sendBitcoin` memo helper, so protocol payloads are not limited by the wallet helper's small memo field.

ProofOfWork ID registrations are written as:

```text
pwid1:r2:<id-base64url>:<owner-address>:<receive-address>:<pgp-public-key-base64url?>
```

ID lookup normalizes casing, so `User`, `user`, and `USER` resolve to the same record. New registrations encode the ID field as base64url, which keeps punctuation and Unicode parseable while the aggregate OP_RETURN limit keeps total size bounded.

## Run

```bash
npm install
npm run dev
```

To preview the ID launch flow locally:

```text
http://localhost:5173/?id-launch=1
```

To preview the root landing page locally:

```text
http://localhost:5173/?landing=1
```

To build a landing-page-only deployment for `proofofwork.me`:

```bash
VITE_LANDING_ONLY=1 VITE_POW_API_BASE=https://proofofwork.me npm run build
```

To build an ID-registration-only deployment that hides the full mail app on every hostname:

```bash
VITE_ID_LAUNCH_ONLY=1 VITE_POW_API_BASE=https://id.proofofwork.me npm run build
```

To build the full computer app for production:

```bash
VITE_POW_API_BASE=https://computer.proofofwork.me npm run build
```

To run localhost against the production API:

```bash
VITE_POW_API_BASE=https://computer.proofofwork.me npm run dev
```

To build against a self-hosted ProofOfWork OP_RETURN API:

```bash
VITE_POW_API_BASE=https://your-api-domain.example npm run build
```

To run the OP_RETURN API on the node server or locally:

```bash
npm run proof-api
```

Useful API environment variables:

```text
HOST=127.0.0.1
PORT=8081
MEMPOOL_BASE=http://127.0.0.1:8080
PENDING_MEMPOOL_BASE=https://mempool.space
```

`MEMPOOL_BASE` should point at the local private mempool/electrs HTTP API. `PENDING_MEMPOOL_BASE` is optional and exists because unconfirmed tx gossip can differ between nodes.

## Registry Audit

To find duplicate or failed ProofOfWork ID registrations for refund review:

```bash
npm run audit:ids
```

The audit scans the full canonical registry history, merges mempool transactions, applies first-confirmed-wins, and writes JSON/CSV reports to `/tmp`. Confirmed duplicates are listed as refund candidates. Pending duplicates are listed separately as a watchlist until they confirm or drop.

Before issuing refunds, check `ID_REFUNDS.md` so old confirmed duplicates that were already refunded are not paid twice.

## Developer Map

Important implementation points:

- ID launch route switch: `isIdLaunchRoute()` in `src/App.tsx`.
- Root landing route switch: `isLandingRoute()` in `src/App.tsx`.
- Landing-only deploy switch: `VITE_LANDING_ONLY=1`.
- ID-only deploy switch: `VITE_ID_LAUNCH_ONLY=1`.
- ID registry constants: `ID_PROTOCOL_PREFIX`, `ID_REGISTRATION_PRICE_SATS`, and `ID_REGISTRY_ADDRESSES` in `src/App.tsx`.
- ID write format: `buildIdRegistrationPayload()`.
- ID registry history fetcher: `fetchRegistryTransactions()`. It must continue paginating confirmed history with `txs/chain/:last_seen_txid` and merging `txs/mempool`.
- ID read/compat parser: `parseIdRegistrationPayload()` and `idRecordsFromTransactions()`.
- Confirmed-only ID compose routing: `resolveRecipientInput()`.
- Dedicated launch UI: `IdLaunchApp`.
- Full app ID workspace: `IdsWorkspace`.
- OP_RETURN API: `server/proof-api.mjs`.
- OP_RETURN infrastructure notes: `OP_RETURN_INFRASTRUCTURE.md`.
- ID refund log: `ID_REFUNDS.md`.
