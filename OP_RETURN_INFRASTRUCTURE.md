# ProofOfWork OP_RETURN Infrastructure

ProofOfWork.Me now has a first-party OP_RETURN API layer for the existing `pwm1:` mail/files protocol and `pwid1:` ID registry protocol.

This is the bridge between the browser-only app and the future multi-carrier indexer. Ordinals should be added later as a second carrier after this OP_RETURN layer is stable.

## Current Shape

```text
Browser app
  -> ProofOfWork OP_RETURN API
  -> private mempool/electrs API
  -> Bitcoin Core full node
```

The browser still signs locally with UniSat. The API never receives seed phrases, private keys, or unsigned wallet authority.

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
```

The default `MEMPOOL_BASE` is designed for the node server where mempool is already bound privately on localhost.

## Frontend Switch

The frontend uses the API only when this env var is present:

```bash
VITE_POW_API_BASE=https://api.proofofwork.me npm run build
```

Without `VITE_POW_API_BASE`, the app keeps using the previous browser-side mempool.space readers. This keeps local development simple while allowing production to use ProofOfWork-owned infrastructure.

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
- Merges mempool transactions.
- Applies first-confirmed-wins.
- Keeps pending IDs visible but not routable.

The mail endpoint:

- Scans address history.
- Reads only OP_RETURN outputs that follow ProofOfWork protocol prefixes.
- Reconstructs `pwm1:m` message chunks.
- Reconstructs `pwm1:a` attachments after size and SHA-256 checks.
- Separates confirmed inbox/sent records from pending records.

The tx status endpoint:

- Returns `confirmed`, `pending`, or `dropped`.
- Lets Outbox stop showing dropped transactions as forever-pending.

## Protocols Indexed

Mail/files:

```text
pwm1:m:<message-chunk>
pwm1:r:<parent-txid>
pwm1:a:<mime-base64url>:<name-base64url>:<size>:<sha256>:<index>/<total>:<data-base64url-chunk>
```

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

## Next Step

After the OP_RETURN API is running behind HTTPS, deploy the frontend with:

```bash
VITE_POW_API_BASE=<production-api-url>
```

Then test:

- ID registry count matches the node-backed API.
- `bitcoin@proofofwork.me` resolves only if confirmed.
- Duplicate/pending IDs cannot be routed.
- Sent, inbox, incoming, files, outbox, and dropped status all work through the API.
