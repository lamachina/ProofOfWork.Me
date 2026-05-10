# On-Chain App Anchoring

Notes for anchoring ProofOfWork.Me application releases to Bitcoin.

## Core Idea

The full ProofOfWork.Me app is probably too large to fit directly into a single OP_RETURN.

Current production build size is roughly:

```text
Raw build assets:     ~568 KB in dist/
Main JS bundle:       ~475 KB
Main CSS bundle:      ~23 KB
Gzipped JS bundle:    ~143 KB
Gzipped CSS bundle:   ~5 KB
```

That is larger than a practical 100 KB OP_RETURN target.

## Current Launch Status

The Phase 1 launch does not anchor app releases on-chain yet.

Current launch surfaces:

```text
proofofwork.me          -> landing/router page
id.proofofwork.me       -> focused mainnet ID registry onboarding
computer.proofofwork.me -> full mail/computer app
desktop.proofofwork.me  -> public read-only file desktop
```

These are served as static frontend builds. `id.proofofwork.me` and `desktop.proofofwork.me` are selected in code by hostname, with local previews available at:

```text
http://localhost:5173/?id-launch=1
http://localhost:5173/?desktop=1
```

Future on-chain app anchoring should verify releases without changing the canonical ID registry address or `pwid1:r2` format.

However, ProofOfWork.Me can still put part of the app on-chain:

- App release metadata.
- App bundle hashes.
- Content URLs.
- A small bootstrap loader.
- A minimal read-only client.

The goal is not necessarily to host the full app on-chain. The goal is to make the official app version verifiable from Bitcoin.

## Option 1: On-Chain Protocol Manifest

Store release metadata in OP_RETURN:

```text
powapp1:v1:<sha256>:<content-url>
```

The app or loader can:

1. Read the latest valid release event.
2. Fetch the app bundle from the content URL.
3. Hash the downloaded bundle.
4. Compare it to the on-chain hash.
5. Run only if the hash matches.

This gives ProofOfWork.Me a Bitcoin-anchored release trail.

## Option 2: On-Chain Loader

Create a tiny HTML/JS loader that fits under the OP_RETURN budget.

The loader would:

- Fetch the current app bundle from normal hosting, IPFS, Arweave, or another content source.
- Verify the downloaded bundle hash against an OP_RETURN release event.
- Load the verified bundle.

This is more realistic than storing the full app directly on-chain.

## Option 3: On-Chain Mini Client

Build a very small ProofOfWork.Me client that can fit on-chain.

Possible features:

- Read-only mail viewer.
- ProofOfWork.Me ID resolver.
- Protocol verifier.
- App release verifier.

Likely limitations:

- Minimal UI.
- No full mail experience.
- No large dependencies.
- No full wallet flow.

This could be a powerful proof-of-concept or emergency fallback client.

## Option 4: Chunked On-Chain App

Split a compressed app across multiple OP_RETURN transactions.

Example:

```text
powapp1:chunk:<version>:1/5:<data>
powapp1:chunk:<version>:2/5:<data>
powapp1:chunk:<version>:3/5:<data>
powapp1:chunk:<version>:4/5:<data>
powapp1:chunk:<version>:5/5:<data>
```

A loader would reassemble chunks by version and order.

This is technically possible, but it is probably not the first move.

Tradeoffs:

- More expensive.
- Slower to resolve.
- Harder to update.
- More fragile.
- More of a protocol/art flex than practical hosting.

## App Release Registry

ProofOfWork.Me can have an on-chain app registry similar to the ID registry.

Possible release events:

```text
powapp1:release:<version>:<sha256>:<content-url>
powapp1:revoke:<version>
powapp1:latest:<version>
```

Rules to preserve:

- Releases must be signed/authorized by the project release key.
- Revocations must be signed/authorized by the same release authority.
- Clients should verify bundle hashes before executing code.
- A release event should include enough data to reproduce and verify the bundle.

## Recommended Path

Start with an on-chain manifest:

```text
powapp1:release:<version>:<sha256>:<content-url>
```

Then later add:

- A verified loader.
- IPFS/Arweave mirrors.
- Release revocations.
- A tiny on-chain read-only verifier.

This gives ProofOfWork.Me the feeling of a Bitcoin-anchored app without forcing every byte of the frontend into OP_RETURN.

## Big Picture

ProofOfWork.Me can exist in layers:

```text
Bitcoin OP_RETURN
  -> app release hash / manifest
  -> ID registry
  -> mail protocol

Static hosting / IPFS / Arweave
  -> full app bundle

Browser
  -> verifies app hash
  -> runs wallet-signed mail client
```

The full app can remain fast and usable, while Bitcoin provides the source-of-truth release anchor.
