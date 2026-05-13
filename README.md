# ProofOfWork.Me

Bitcoin-native mail and ProofOfWork ID registry, written to BTC OP_RETURN outputs and signed locally with UniSat.

## For Agents

Before modifying ProofOfWork.Me, read `SOUL.md`.

This repository is built for agent collaboration. `SOUL.md` explains the project's voice, thesis, and long-term direction. Protocol behavior lives in `README.md`, `PROOFOFWORK_IDS.md`, `MARKETPLACE.md`, and the source code.

## Phase 1 Launch

The public front door is:

```text
www.proofofwork.me
```

The apex domain redirects permanently to the canonical `www` front door:

```text
proofofwork.me -> https://www.proofofwork.me/
```

The front door renders a focused landing page that routes users to the production apps:

```text
id.proofofwork.me
computer.proofofwork.me
desktop.proofofwork.me
browser.proofofwork.me
marketplace.proofofwork.me
log.proofofwork.me
growth.proofofwork.me
```

Production app roles:

- `www.proofofwork.me` is the canonical landing/router page.
- `proofofwork.me` redirects to `https://www.proofofwork.me/`.
- `id.proofofwork.me` is the focused Phase 1 ID registry onboarding app.
- `computer.proofofwork.me` is the full ProofOfWork.Me mail/computer app.
- `desktop.proofofwork.me` is the standalone public read-only file search engine for addresses or confirmed ProofOfWork IDs.
- `browser.proofofwork.me` is the standalone public HTML viewer for ProofOfWork message bodies or verified file attachments by txid.
- `marketplace.proofofwork.me` is the standalone ProofOfWork ID listing and buyer-funded transfer app.
- `log.proofofwork.me` is the standalone public Bitcoin Computer log for tx-backed ProofOfWork actions.
- `growth.proofofwork.me` is the standalone public growth dashboard comparing modeled Bitcoin Computer network value with real confirmed chain value in sats and USD.
- The root landing page can feature public on-chain social proof, with testimonial links pointing directly to their Bitcoin transactions.
- The landing page links to the current public PowerPoint deck at `/proofofwork-general-deck.pptx`.

Every public app header and footer should expose the current public surfaces: Home, IDs, Computer, Desktop, Browser, Marketplace, Log, and Growth. Public social links should include X, YouTube, GitHub, and Discord.

Official YouTube:

```text
https://www.youtube.com/@proofofworkme
```

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
- Sends BTC to one or more recipient addresses or confirmed ProofOfWork IDs.
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
- Supports an optional Subject field written into the ProofOfWork.Me OP_RETURN protocol.
- Replies to a message by embedding the parent txid so messages can form threads.
- Supports Reply All for multi-recipient messages.
- Supports CC in compose as visible additional payment-output recipients. The sender's local app preserves To/CC roles for sent mail; the chain itself only exposes recipients as payment outputs.
- Infers the sender from transaction inputs instead of storing an address in OP_RETURN.
- Shows self-sends in Incoming/Inbox and Outbox/Sent based on confirmation state.
- Auto-saves one local draft per wallet and network until the message is broadcast or discarded.
- Favorites confirmed mail locally so important messages stay easy to find.
- Archives messages locally so they leave Inbox/Sent without deleting the on-chain record.
- Lets users create local custom folders and file confirmed mail into any folder name.
- Saves local Contacts for addresses or confirmed ProofOfWork IDs.
- Adds confirmed registry IDs to Contacts from the Computer app's ID registry rows.
- Uses saved Contacts as compose suggestions.
- Accepts multiple compose recipients separated by commas, semicolons, or new lines, with removable recipient chips.
- Exports and imports local app data backups for contacts, drafts, archives, favorites, custom folders, theme, and broadcast tracking.
- Supports one small attachment per message, capped at 60,000 bytes before encoding.
- Adds a desktop-style Files section for confirmed attachment-only browsing, filtering, sorting, in-app previews, download, and opening the source message.
- Previews images, PDFs, audio, video, text, Markdown, JSON, and code files directly in the app, with copy support for text/code content.
- Adds a standalone public Desktop app that searches any Bitcoin address or confirmed ProofOfWork ID and displays/previews confirmed public attachments without a wallet connection.
- Adds a standalone public Browser app that loads a txid, renders HTML from a message body or verified `text/html` attachment in a sandbox, and exposes a Computer-native HTML template.
- Exposes Browser as a first-class Computer sidebar workspace, so HTML pages are part of the Bitcoin Computer and not only a standalone subdomain.
- Pins the canonical `Welcome to ProofOfWork.Me.html` Bitcoin Computer page as a default system file in Files/Desktop, opening through Browser by txid.
- Projects Browser-readable HTML message bodies into Files/Desktop as virtual `.html` files, so users can send HTML as a message body without needing an attachment.
- Supports fractional fee rates, including sub-1 sat/vB values like `0.1`.
- Uses the correct mempool.space explorer path for the connected chain, including `/testnet4`.
- Registers and scans mainnet ProofOfWork IDs through the canonical registry address.
- Searches ID registry records, owned IDs, pending ID events, marketplace listings, and registry supply views across the app.
- Lets current ID owners update the receive address or transfer ownership through paid on-chain registry events.
- Resolves confirmed ProofOfWork IDs as direct transfer targets, so ownership can be sent to an ID's current owner/receiver instead of manually pasting the raw address.
- Lets ID management receive fields accept confirmed ProofOfWork IDs, resolving them to raw Bitcoin receive addresses before writing registry events.
- Lets current ID owners publish on-chain marketplace listings, delist them, and execute buyer-funded ID transfers.
- Shows pending ID receiver updates, direct transfers, listings, delistings, and marketplace buys to wallets touched by the event, so both sender and receiver can track in-flight ID changes before confirmation.
- Exposes Marketplace as a first-class Computer sidebar workspace, not just a buried ID panel.
- Exposes Growth as a public dashboard for modeled Bitcoin Computer network value versus real confirmed registry, log, file, and marketplace value metrics.
- Keeps the IDs workspace limited to registration, receiver updates, and direct owner transfers.
- Keeps `id.proofofwork.me` registration-only. ID management and marketplace flows live in the Computer app and the standalone Marketplace app.
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
https://www.proofofwork.me/api/*
https://id.proofofwork.me/api/*
https://computer.proofofwork.me/api/*
https://desktop.proofofwork.me/api/*
https://browser.proofofwork.me/api/*
https://marketplace.proofofwork.me/api/*
https://log.proofofwork.me/api/*
https://growth.proofofwork.me/api/*
```

Current production behavior:

- Confirmed mainnet registry, mail, files, and tx status are read through the ProofOfWork node/indexer stack.
- The node stack does not hold funds, seed phrases, private keys, or wallet authority.
- Browser wallets still sign locally.
- Unconfirmed transactions are mempool gossip, not global truth.
- For pending visibility, the API merges the local node/indexer view with `PENDING_MEMPOOL_BASE`, which currently defaults to public `https://mempool.space`.
- Confirmed records remain canonical; pending records are visible but not final.
- Pending ID mutation events are exposed separately from confirmed records. They are UI status only until confirmation.
- Marketplace ID sale count and seller-price volume are derived from resolver-accepted `buy5` sale-ticket purchases, with confirmed sales canonical and pending sales shown as mempool visibility. Older legacy buy events remain replayable protocol history but do not seed the public marketplace stats.
- The log API exposes a normalized Bitcoin Computer feed for registrations, receiver updates, direct transfers, listings, seals, delistings, buyer-funded marketplace purchases, messages, replies, files, and attachments discovered from the ProofOfWork address graph. Address, confirmed ID, or txid search narrows that same log surface to a specific account or transaction. The log also reports total indexed ProofOfWork protocol bytes across all `pwm1:` and `pwid1:` OP_RETURN records.
- Browser renders ProofOfWork HTML by txid from either the `pwm1:m` message body or a verified `pwm1:a` file attachment. It does not introduce an outside protocol; attachments keep the same size/SHA-256 verification as Files/Desktop, and message-body HTML remains bound to the transaction that carries it.
- Files/Desktop treat Browser-readable `pwm1:m` HTML bodies as derived `.html` files for navigation and opening, while the original transaction remains a message-body record on-chain.
- The canonical welcome page is pinned by txid `8c2fd17b10a6550896035b9f725054d3c6e10c314911808d8f7aaa2955c3015b` as the default Bitcoin Computer file. It appears in Files/Desktop as a system artifact and opens in Browser so the transaction remains the source of truth.
- Growth reads the same registry and log endpoints, then auto-refreshes real confirmed network value against the canonical `output/bitcoin-computer-agent-adoption-model.md` sats/USD assumptions. New products should enter the model with real inputs, a usage rate, a value assumption, a fee elasticity, and blockspace accounting.
- ProofOfWork.Me broadcasts intentionally spend confirmed wallet UTXOs only across mail, files, ID registry actions, and marketplace actions. This prevents a selected fee rate from being dragged down by low-fee unconfirmed ancestors, which mempool.space reports as a lower effective fee rate.
- A tx status can be `confirmed`, `pending`, or `dropped`.
- A dropped tx is not treated as durable mail. Users can rebuild/resend from local draft data when available.

Important launch invariant:

```text
Confirmed history is canonical. Pending mempool visibility is best-effort.
Every app-created broadcast spends confirmed inputs only.
```

## OP_RETURN Protocol

Only OP_RETURN payloads that start with this prefix are read into mail views:

```text
pwm1:
```

The app writes OP_RETURN as:

```text
pwm1:s:<subject-base64url>
pwm1:m:<message-chunk>
```

Recipients are not stored in OP_RETURN. They are represented by normal Bitcoin payment outputs before the first ProofOfWork.Me OP_RETURN output. Multi-recipient mail uses one shared OP_RETURN payload and one BTC output per recipient.
CC recipients are also normal payment outputs. To/CC labels are local sender-side organization metadata, not a chain-enforced privacy or delivery primitive.

Replies are written as:

```text
pwm1:s:<subject-base64url>
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

ID owners can mutate confirmed IDs through the same canonical registry address:

```text
pwid1:u:<id-base64url>:<receive-address>
pwid1:t:<id-base64url>:<new-owner-address>:<new-receive-address?>
pwid1:list5:<sale-ticket-json-base64url>
pwid1:seal5:<listing-txid>:<sealed-sale-ticket-json-base64url>
pwid1:delist5:<listing-txid>
pwid1:buy5:<listing-txid>:<new-owner-address>:<new-receive-address?>
```

`pwid1:r2` registrations require a 1,000 sat registry payment. `pwid1:u` and `pwid1:t` require a 546 sat mutation payment and must be spent from the current owner address. If a transfer omits the new receive address, the new owner also becomes the receiver.
The UI may accept confirmed ProofOfWork IDs in owner/receive fields, but `pwid1:u` and `pwid1:t` always write resolved Bitcoin addresses on-chain.
`pwid1:list5` publishes sale terms as a `pwid-sale-v4` JSON object and creates a 546 sat seller-controlled sale-ticket UTXO in the listing transaction. `pwid1:seal5` publishes the seller's `SIGHASH_SINGLE|ANYONECANPAY` signature for that ticket after the listing txid exists, and the seal must name the listing txid as its `anchorTxid`. `pwid1:buy5` must spend that same ticket, pay the seller price plus ticket value, and pay the 546 sat mutation fee before the ID OP_RETURN. Because every valid buyer spends the same sale ticket, competing purchases conflict at the Bitcoin UTXO layer instead of both paying.
`pwid1:delist5` cancels a listing by spending the sale ticket and paying the mutation fee. Historical `list2`/`buy2`/`delist2`, `list3`/`buy3`/`delist3`, and `list4`/`buy4`/`delist4` events remain readable for replay, but new marketplace writes use `list5`/`seal5`/`buy5`/`delist5`.
Pending `pwid1:u`, `pwid1:t`, `pwid1:list5`, `pwid1:seal5`, `pwid1:delist5`, and `pwid1:buy5` events are exposed as in-flight changes for touched wallets. They do not change canonical owner/receiver routing until confirmed.

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

To preview the public Desktop locally:

```text
http://localhost:5173/?desktop=1
```

To preview the public Browser locally:

```text
http://localhost:5173/?browser=1
```

To preview the standalone ID Marketplace locally:

```text
http://localhost:5173/?marketplace=1
```

To preview the public Log locally:

```text
http://localhost:5173/?log=1
```

To preview the public Growth dashboard locally:

```text
http://localhost:5173/?growth=1
```

When running on `localhost`, shared app navigation stays local instead of jumping to production domains:

```text
Home -> /?landing=1
IDs -> /?id-launch=1
Computer -> /
Desktop -> /?desktop=1
Browser -> /?browser=1
Marketplace -> /?marketplace=1
Log -> /?log=1
Growth -> /?growth=1
```

To build a landing-page-only deployment for `proofofwork.me`:

```bash
VITE_LANDING_ONLY=1 VITE_POW_API_BASE=https://www.proofofwork.me npm run build
```

To build an ID-registration-only deployment that hides the full mail app on every hostname:

```bash
VITE_ID_LAUNCH_ONLY=1 VITE_POW_API_BASE=https://id.proofofwork.me npm run build
```

To build the full computer app for production:

```bash
VITE_POW_API_BASE=https://computer.proofofwork.me npm run build
```

To build the public Desktop app for production:

```bash
VITE_DESKTOP_ONLY=1 VITE_POW_API_BASE=https://desktop.proofofwork.me npm run build
```

To build the public Browser app for production:

```bash
VITE_BROWSER_ONLY=1 VITE_POW_API_BASE=https://browser.proofofwork.me npm run build
```

To build the standalone ID Marketplace app for production:

```bash
VITE_MARKETPLACE_ONLY=1 VITE_POW_API_BASE=https://marketplace.proofofwork.me npm run build
```

To build the standalone Log app for production:

```bash
VITE_LOG_ONLY=1 VITE_POW_API_BASE=https://log.proofofwork.me npm run build
```

To build the standalone Growth app for production:

```bash
VITE_GROWTH_ONLY=1 VITE_POW_API_BASE=https://growth.proofofwork.me npm run build
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

For public accounting, duplicate or failed registration payments should be treated as refund liabilities, not net registry revenue. Gross registry flow can include every confirmed paid registry event, but net registry revenue should subtract refunded or refund-owed non-canonical registrations.

## Developer Map

Important implementation points:

- Agent bootstrap: `SOUL.md`, `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.cursor/rules/proofofwork-soul.mdc`, and `.github/copilot-instructions.md`.
- ID launch route switch: `isIdLaunchRoute()` in `src/App.tsx`.
- Root landing route switch: `isLandingRoute()` in `src/App.tsx`.
- Public Desktop route switch: `isDesktopRoute()` in `src/App.tsx`.
- Public Browser route switch: `isBrowserRoute()` in `src/App.tsx`.
- Standalone Marketplace route switch: `isMarketplaceRoute()` in `src/App.tsx`.
- Landing-only deploy switch: `VITE_LANDING_ONLY=1`.
- ID-only deploy switch: `VITE_ID_LAUNCH_ONLY=1`.
- Browser-only deploy switch: `VITE_BROWSER_ONLY=1`.
- Marketplace-only deploy switch: `VITE_MARKETPLACE_ONLY=1`.
- Growth-only deploy switch: `VITE_GROWTH_ONLY=1`.
- ID registry constants: `ID_PROTOCOL_PREFIX`, `ID_REGISTRATION_PRICE_SATS`, `ID_MUTATION_PRICE_SATS`, and `ID_REGISTRY_ADDRESSES` in `src/App.tsx`.
- Local contacts storage: `CONTACTS_KEY`, `loadContacts()`, `saveContacts()`, and `ContactsWorkspace` in `src/App.tsx`.
- Public Desktop UI: `DesktopApp`, `DesktopWorkspace`, `publicDesktopMail()`, and `fetchAddressMail()` in `src/App.tsx`.
- Public Browser UI: `BrowserApp`, `fetchBrowserPage()`, `browserPageFromTransaction()`, and `browserTemplateHtml()` in `src/App.tsx`.
- In-app file preview UI: `AttachmentViewer`, `FileInspector`, `attachmentPreviewKind()`, and `attachmentText()` in `src/App.tsx`.
- ID write format: `buildIdRegistrationPayload()`.
- ID mutation formats: `buildIdReceiverUpdatePayload()` and `buildIdTransferPayload()`.
- ID registry history fetcher: `fetchRegistryTransactions()`. It must continue paginating confirmed history with `txs/chain/:last_seen_txid` and merging `txs/mempool`.
- ID read/compat parser: `parseIdEventPayload()`, `parseIdRegistrationPayload()`, and `idRecordsFromTransactions()`.
- Confirmed-only ID compose routing: `resolveRecipientInput()`.
- Multi-recipient compose routing: `resolveRecipientInputs()` and `buildPaymentPsbt()` payment outputs.
- Dedicated registration-only launch UI: `IdLaunchApp`.
- Full app ID workspace: `IdsWorkspace`.
- Standalone marketplace UI: `MarketplaceApp`.
- Computer marketplace workspace: `MarketplaceWorkspace`.
- Standalone growth dashboard: `GrowthApp`.
- OP_RETURN API: `server/proof-api.mjs`.
- OP_RETURN infrastructure notes: `OP_RETURN_INFRASTRUCTURE.md`.
- ID refund log: `ID_REFUNDS.md`.
- Marketplace protocol notes: `MARKETPLACE.md`.
