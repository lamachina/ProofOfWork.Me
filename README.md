# ProofOfWork.Me

Bitcoin-native mail and ProofOfWork ID registry, written to BTC OP_RETURN outputs and signed locally with UniSat.

## Phase 1 Launch

The Phase 1 launch target is the ID registry onboarding flow on:

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
- Treats ProofOfWork IDs as case-insensitive names capped by the aggregate 100 KB OP_RETURN transaction limit, not arbitrary character rules.
- Resolves ProofOfWork IDs in the compose recipient field only after a confirmed registry record exists; pending IDs cannot receive routed mail yet.
- Opens a prefilled X post to verify only IDs owned by or routed to the connected wallet.
- Renders a dedicated Phase 1 ID claim experience on `id.proofofwork.me` using the same registry protocol and address.

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

To build an ID-registration-only deployment that hides the full mail app on every hostname:

```bash
VITE_ID_LAUNCH_ONLY=1 npm run build
```

## Developer Map

Important implementation points:

- ID launch route switch: `isIdLaunchRoute()` in `src/App.tsx`.
- ID-only deploy switch: `VITE_ID_LAUNCH_ONLY=1`.
- ID registry constants: `ID_PROTOCOL_PREFIX`, `ID_REGISTRATION_PRICE_SATS`, and `ID_REGISTRY_ADDRESSES` in `src/App.tsx`.
- ID write format: `buildIdRegistrationPayload()`.
- ID read/compat parser: `parseIdRegistrationPayload()` and `idRecordsFromTransactions()`.
- Confirmed-only ID compose routing: `resolveRecipientInput()`.
- Dedicated launch UI: `IdLaunchApp`.
- Full app ID workspace: `IdsWorkspace`.
