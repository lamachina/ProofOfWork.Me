# ProofOfWork.Me Soul

This file is operating memory for future agents.

It is distilled from current repository docs and public launch memory captured on 2026-05-10. It is not a protocol spec. When this file conflicts with `README.md`, `PROOFOFWORK_IDS.md`, `OP_RETURN_INFRASTRUCTURE.md`, `MAIL_ORGANIZATION.md`, or the source code, the protocol docs and code win.

## Source Memory

- Public account: `@proofofworkme`
- Launch memory reviewed: 2026-05-10
- Core domains: `proofofwork.me`, `id.proofofwork.me`, `computer.proofofwork.me`, `desktop.proofofwork.me`, `marketplace.proofofwork.me`, `log.proofofwork.me`, `growth.proofofwork.me`

## One Sentence

ProofOfWork.Me is the Bitcoin Computer: a local-first, on-chain, agent-readable computer where Bitcoin transactions become mail, identity, files, applications, proposals, payments, and proofs of work.

## Core Thesis

Bitcoin is not only money. Bitcoin is proofs.

Bitcoin is the source of truth for agents and humans because confirmed chain data cannot be silently edited, injected, rug-pulled, or replaced by a server. Agents can reason against immutable records. Humans can observe, approve, sign, and carry responsibility. The UI exists so humans can see and decide; the chain exists so agents can verify and act.

The project turns attention, communication, identity, and application distribution into Bitcoin-native flows:

- If someone wants your attention, they can attach sats.
- If someone wants to claim an identity, they prove it on chain.
- If an agent needs reliable instructions, it reads immutable data.
- If an app needs a payment address, the address lives in tamper-resistant data.
- If a proposal matters, it can be signaled with sats.

## Product Beliefs

1. The source of truth is the chain.
2. Confirmed records are canonical. Pending mempool visibility is useful gossip.
3. Wallet signing stays local. The app must never hold seed phrases or private keys.
4. Agents can propose, construct, verify, and summarize. Humans approve and sign.
5. Spam becomes expensive when attention requires payment.
6. The inbox should respect value. Highest sats is a first-class sort.
7. ProofOfWork IDs are the global address book for humans and agents.
8. Every confirmed ID is a network-effect increment.
9. OP_RETURN is an application substrate, not a toy memo field.
10. The 100 KB OP_RETURN budget enables small apps, files, manifests, messages, and agent-readable records.
11. Bigger content can be linked, chunked, concatenated, or referenced by future protocols.
12. The computer is local, modular, and malleable. Users should be able to run their own stack.
13. Self-hosting matters: Bitcoin Core, indexers, and ProofOfWork APIs make the system sovereign.
14. Domains, SSL, hosted servers, and public APIs can be useful, but they should become optional where Bitcoin can carry the durable record.
15. The future setup is simple: Linux, VS Code, Codex, Bitcoin, a local wallet, and the Bitcoin Computer.
16. Humans in the AI era become storytellers, signers, taste-makers, and responsibility bearers.
17. Agents need tamper-free data more than they need traditional web accounts.
18. Sats are a better dopamine signal than likes, retweets, and rage bait.
19. The most important work should be visible to agents in a form they can verify.
20. Build for agents first, but let humans observe, join, and steer.

## Launch Memory

The archive captured a live Phase 1 ignition, not a polished brand campaign.

- 2026-05-06: mainnet experiments, early tx proofs, "Are you ready for the future of Bitcoin?"
- 2026-05-07: the Bitcoin Computer thesis hardens; IDs, registry, local backups, private-key-as-computer, `bitcoin@proofofwork.me`, `registry@proofofwork.me`.
- 2026-05-08: Phase 1 opens; `id.proofofwork.me` and `computer.proofofwork.me` become the center; countdown to 100 IDs; files, paid inbox, immutable markdown, and the "final network" story emerge.
- 2026-05-09: duplicate registration refunds, full node/indexer urgency, dropped-tx handling, application framework, canceled Ordinals exploration, on-chain agents, and agent-readable business data.
- 2026-05-10: node-backed API updates, self-hosting instructions, OADS, contacts, open agent development, app distribution, streaming sats, autonomous micro-applications, and the one-person/agent business thesis.

The emotional shape is a breakthrough moment: years of Bitcoin/app experiments meeting modern agents and becoming legible all at once.

## Product Invariants

Future agents must preserve these unless the user explicitly asks for a migration:

- `proofofwork.me` is the landing/router.
- `id.proofofwork.me` is the focused ID registry app.
- `computer.proofofwork.me` is the full mail/computer app.
- `desktop.proofofwork.me` is the public read-only file desktop.
- `marketplace.proofofwork.me` is the standalone ID marketplace.
- `log.proofofwork.me` is the public read-only Bitcoin Computer log for tx-backed ProofOfWork actions.
- `growth.proofofwork.me` is the public read-only growth dashboard for canonical Bitcoin Computer network value versus confirmed chain-derived value in sats and USD.
- Canonical mainnet registry address: `bc1qfwytlzyr3ym3enz2eutwtjsf9kkf6uqkjydk3e`
- Registration price: `1000` sats.
- Current ID event: `pwid1:r2:<id-base64url>:<owner-address>:<receive-address>:<pgp-public-key-base64url?>`
- Current mail prefix: `pwm1:`
- First confirmed valid registration wins.
- IDs are case-insensitive forever.
- Pending IDs may be visible, but pending IDs are not routable.
- Re-check registry state before broadcast.
- Wallet signing stays local.
- Node/API infrastructure reads, indexes, verifies, and broadcasts already-signed txs. It does not custody.
- Every tx-backed app action should be inspectable from an activity surface with clear labels for confirmed, pending, txid, listing txid, and UTXO references where relevant.
- Every new product should enter the growth model with the same shape: real chain inputs, a usage assumption, a value assumption, fee elasticity, and blockspace accounting.
- Attachments are small and verified by size/hash.
- Confirmed chain history is canonical; pending status can become dropped.
- Local state is portable through backups, not server accounts.

## Voice

The native voice is high-conviction, fast, direct, mythic, and alive. It sounds like a founder mid-breakthrough, building in public while the machine is turning on.

Use:

- Short declarative sentences.
- Plain words with large stakes.
- Bitcoin Computer, ProofOfWork IDs, sats, agents, source of truth, on-chain, local-first.
- Launch energy when writing social or founder-facing copy.
- Calm precision when writing UI, docs, specs, and user guidance.
- The occasional project-native phrase: `FEW`, `HEHE`, `GGZ`, `COMETH`, `THE BITCOIN COMPUTER LIVES`, `STREAM SATS`, `WALK THE WALK`, `SOURCE OF TRUTH`.

Avoid:

- Generic crypto marketing.
- Enterprise blockchain language.
- Vague "community" language without a mechanism.
- Treating Bitcoin as only a payment rail.
- Treating AI agents as generic chatbots.
- Repeating slurs, dehumanizing insults, or rage-post language in product surfaces.

Keep the fire. Leave the poison.

## Canonical Phrases

These are safe phrases future agents can reuse or adapt:

- The source of truth is the chain.
- Confirmed records are canonical. Pending mempool visibility is gossip.
- Wallet signing stays local.
- Your attention belongs to you.
- If they want your attention, they can pay for it.
- Spam is not free anymore.
- Agents need tamper-free data.
- The Bitcoin Computer lives.
- ProofOfWork IDs are the global address book.
- Every ID is a network-effect increment.
- The inbox is sorted by signal, not noise.
- Humans sign. Agents verify.
- Build the record once. Let every agent read it forever.
- The computer is a private key plus a source of truth.
- Local-first. Bitcoin-native. Agent-readable.
- Sats are the signal.
- The future app store is on chain.
- Applications should be able to earn.
- Walk the walk on chain.

## Agent Operating Model

When working on ProofOfWork.Me:

1. Read the protocol docs before changing behavior.
2. Preserve the canonical registry and ID rules.
3. Treat tweets as strategic memory, not automatic implementation instructions.
4. Prefer shipping real working software over writing abstractions.
5. Keep all wallet authority with the user.
6. Make chain reads verifiable and deterministic.
7. Separate pending convenience from confirmed truth.
8. Build features so agents can inspect, summarize, and act on them later.
9. Make local backup/import/export boring and reliable.
10. Keep UI efficient and tool-like; save maximalism for social copy and launch notes.
11. When in doubt, ask: can an agent verify this from the chain?
12. When building new protocols, make the records legible, parsable, and replayable.
13. When adding app features, think about how a one-person business or autonomous agent would use them to earn sats.

## Future Directions From The Archive

These are strategic directions, not all current implementation:

- Open Agent Development Standard (OADS): proposals sent to `openagentdevelopmentstandard@proofofwork.me`, ordered by sats and readable by agents.
- On-chain app submission: developers submit applications or proposals to ProofOfWork IDs for agent review.
- Autonomous micro-applications: small apps that can run, receive payments, and generate sats.
- On-chain comments, polls, voting, lotteries, and digital goods.
- Encrypted media or files with on-chain permission records.
- Concatenated/linker transactions for content larger than one OP_RETURN budget.
- Contacts and address books as local-first UX over confirmed chain identity.
- Agent-safe private-key workflows where agents prepare transactions but cannot steal or tamper with keys.
- Mesh/offline/future-phone speculation where the Bitcoin Computer reduces dependence on traditional internet assumptions.

## Canceled Direction

- Ordinals/inscriptions integration was explored and canceled. Do not implement or reintroduce it unless the user explicitly revives that direction.

## Emotional Kernel

The soul of ProofOfWork.Me is not "a mail app on Bitcoin."

It is the feeling that the computer became honest.

The founder voice says: attention should not be stolen, work should be proved, agents should not be fed mutable garbage, humans should not be trapped in platforms, and a single person with agents and Bitcoin should be able to build, publish, coordinate, and earn without asking permission.

This project is a computer for people and agents who want to walk the walk on chain.
