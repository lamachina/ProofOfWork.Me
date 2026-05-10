# ProofOfWork OP_RETURN Infrastructure

ProofOfWork.Me has a first-party OP_RETURN API layer for the existing `pwm1:` mail/files protocol and `pwid1:` ID registry protocol.

The current product direction is OP_RETURN only. Future protocol work should improve this OP_RETURN indexer and API before introducing any new carrier.

## Current Shape

```text
Browser app
  -> same-origin ProofOfWork OP_RETURN API proxy
  -> private mempool/electrs API
  -> Bitcoin Core full node
```

The browser still signs locally with UniSat. The API never receives seed phrases, private keys, or unsigned wallet authority.

Production domains:

```text
proofofwork.me              -> landing page
id.proofofwork.me           -> ID registry app
computer.proofofwork.me     -> full mail/computer app
desktop.proofofwork.me      -> public read-only file desktop
```

Each production domain proxies these paths to the ProofOfWork OP_RETURN API:

```text
/api/*
/health
```

This intentionally avoids depending on a separate `api.proofofwork.me` DNS record during Phase 1.

## Server

The API entrypoint is:

```text
server/proof-api.mjs
```

Run locally:

```bash
npm run proof-api
```

Default configuration:

```text
HOST=127.0.0.1
PORT=8081
MEMPOOL_BASE=http://127.0.0.1:8080
PENDING_MEMPOOL_BASE=https://mempool.space
```

The default `MEMPOOL_BASE` is designed for the node server where mempool is already bound privately on localhost.

`PENDING_MEMPOOL_BASE` is optional. It exists because unconfirmed transactions are gossip, not canonical chain state. Two honest nodes can temporarily see different mempools. Production uses the local node/indexer for confirmed history and uses the pending mempool base as a visibility fallback for unconfirmed records.

## Frontend Switch

The frontend uses the API only when this env var is present:

```bash
VITE_POW_API_BASE=https://computer.proofofwork.me npm run build
```

Without `VITE_POW_API_BASE`, the app keeps using the previous browser-side mempool.space readers. This keeps local development simple while allowing production to use ProofOfWork-owned infrastructure.

Production builds:

```bash
VITE_LANDING_ONLY=1 VITE_POW_API_BASE=https://proofofwork.me npm run build
VITE_ID_LAUNCH_ONLY=1 VITE_POW_API_BASE=https://id.proofofwork.me npm run build
VITE_POW_API_BASE=https://computer.proofofwork.me npm run build
VITE_POW_API_BASE=https://desktop.proofofwork.me npm run build
```

## Endpoints

```text
GET /health
GET /api/v1/registry?network=livenet
GET /api/v1/ids?network=livenet
GET /api/v1/ids/:id?network=livenet
GET /api/v1/address/:address/mail?network=livenet
GET /api/v1/tx/:txid/status?network=livenet
```

The registry endpoint:

- Scans the canonical registry address.
- Paginates confirmed transaction history.
- Merges mempool transactions from local infrastructure and the pending fallback.
- Applies first-confirmed-wins.
- Keeps pending IDs visible but not routable.

The mail endpoint:

- Scans address history.
- Reads only OP_RETURN outputs that follow ProofOfWork protocol prefixes.
- Derives recipients from normal BTC payment outputs before the first `pwm1:` OP_RETURN output.
- Reconstructs optional `pwm1:s` subject fields.
- Reconstructs `pwm1:m` message chunks.
- Reconstructs `pwm1:a` attachments after size and SHA-256 checks.
- Separates confirmed inbox/sent records from pending records.

The tx status endpoint:

- Returns `confirmed`, `pending`, or `dropped`.
- Checks local infrastructure first and the pending fallback second.
- Lets Outbox stop showing dropped transactions as forever-pending.

## Confirmed vs Pending

Confirmed Bitcoin history is canonical. Pending mempool state is not.

Production rules:

- Confirmed registry/mail/file history should come from the ProofOfWork node/indexer stack.
- Public Desktop reads should use the same confirmed mail/file API path as Computer.
- Pending registry/mail/outbox visibility should merge all configured mempool views.
- Pending IDs must never be routable.
- Pending mail can be shown in Incoming/Outbox, but it must not be treated as durable mail.
- Files should only show durable confirmed attachments by default in the UI.
- Dropped txs are txids that are not confirmed and are not visible in the configured mempool views at check time.

This means a tx can move:

```text
pending -> confirmed
pending -> dropped
dropped -> pending
```

The last case can happen if a tx reappears in a mempool view after being temporarily unavailable. The UI should treat dropped as a recoverable local state, not as chain consensus.

## Protocols Indexed

Mail/files:

```text
pwm1:s:<subject-base64url>
pwm1:m:<message-chunk>
pwm1:r:<parent-txid>
pwm1:a:<mime-base64url>:<name-base64url>:<size>:<sha256>:<index>/<total>:<data-base64url-chunk>
```

Recipient roles:

- Delivery recipients are normal BTC payment outputs before the first `pwm1:` output.
- Multi-recipient and CC mail share one OP_RETURN payload and one txid.
- To/CC labels are local sender-side metadata in the browser app; the API reconstructs payment-output recipients but does not infer authoritative CC roles from chain data.

IDs:

```text
pwid1:r2:<id-base64url>:<owner-address>:<receive-address>:<pgp-public-key-base64url?>
```

Mainnet canonical registry:

```text
bc1qfwytlzyr3ym3enz2eutwtjsf9kkf6uqkjydk3e
```

## Launch Rule

For production, ID resolution should prefer the ProofOfWork API over public mempool.space. If the API is unavailable, it is safer to fail closed than to route or register IDs from incomplete public API state.

The only exception is pending visibility: the API itself may use `PENDING_MEMPOOL_BASE` as a fallback because pending txs are non-canonical gossip. This fallback must not override confirmed first-confirmed-wins resolution.

## Production Verification Checklist

After changing the API or production build, verify:

- `/health` returns `service: proofofwork-op-return-api`.
- ID registry count matches the node-backed API and includes pending records when visible.
- `bitcoin@proofofwork.me` resolves only if confirmed.
- Duplicate/pending IDs cannot be routed.
- Sent, inbox, incoming, files, outbox, and dropped status all work through the API.
- Public Desktop can search a raw address or confirmed ProofOfWork ID and returns only confirmed attachments.
- Known attachment transactions reconstruct with valid size and SHA-256.
- Known pending txs return `pending`.
- Known dropped txs return `dropped`.
