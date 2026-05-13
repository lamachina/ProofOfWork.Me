# ProofOfWork.Me Bug Bounty Ledger

This ledger tracks community bug reports that shipped as fixes and should be considered for future treasury-funded bug bounties.

Important boundary:

```text
tracked = preserved for future treasury review
paid = a payout txid has been added
confirmed paid = the payout txid is confirmed on chain
```

Tracking an item here is not an immediate payout promise. It preserves attribution so ProofOfWork.Me can pay contributors later when the treasury has enough BTC and the founder approves the bounty amount.

## Optimized Payment Marker

Bug bounty payment transactions should avoid long OP_RETURN messages. The payment output and this ledger carry the real detail.

When paying from ProofOfWork Mail, use:

```text
Subject: blank
Message: bb:<count>
```

Examples:

```text
bb:1
bb:2
```

Meaning:

```text
bb = bug bounty payment
count = number of bounty rows covered by this tx
```

The full attribution, fixed commits, amount, recipient, and payment txid belong in this ledger. This keeps the on-chain marker small while preserving an agent-readable proof trail.

## Pending Treasury Review

| Date tracked | Reporter | Attribution | Bug report | Impact | Fixed in | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-05-13 | `moove@proofofwork.me` | French-speaking community tester / agent | Contacts accepted a raw BTC address but failed to add a confirmed ProofOfWork ID after the receiver update. | Contact creation and ID-based compose onboarding could fail for confirmed IDs. | `4229a6a` `Fix contact ID resolver refresh` | Fixed, pushed, deployed, paid 546 sats in pending tx `1cc193649731a7c6150955c65e9c4bb3ad64e00d93959832a0b42f77529244bc` |
| 2026-05-13 | `moove@proofofwork.me` | French-speaking community tester / agent | Localhost navigation jumped from the local app to production domains such as `desktop.proofofwork.me`. | Self-hosted/local testers could not move through all app surfaces without leaving localhost. | `39c0476` `Keep app navigation local on localhost` | Fixed, pushed, deployed, paid 546 sats in pending tx `1cc193649731a7c6150955c65e9c4bb3ad64e00d93959832a0b42f77529244bc` |
| 2026-05-13 | `moove@proofofwork.me` | French-speaking community tester / agent | Browser did not expose a clear Testnet4/Mainnet/Testnet3 selector, making it unclear how to render a confirmed Testnet4 HTML tx locally. | Testnet4 Browser testing could fail or appear broken even when the tx was valid and confirmed. | `8bebb4b` `Improve browser network and fee warnings` | Fixed, pushed, bounty pending treasury review |

## Payment Records

| Date recorded | Reporter | Paid sats | Treasury txid | Recipient | Covered ledger rows | Tx status at review | Notes |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| 2026-05-13 | `moove@proofofwork.me` | 1,092 total; 546 per bounty | [`1cc193649731a7c6150955c65e9c4bb3ad64e00d93959832a0b42f77529244bc`](https://mempool.space/tx/1cc193649731a7c6150955c65e9c4bb3ad64e00d93959832a0b42f77529244bc) | `moove@proofofwork.me` current confirmed receive address `bc1plqn2g9dkyspk48r8ek83p3ecc32vz2g9fnlw006yvmvqvx8cnxyskrt9dc` | `4229a6a`, `39c0476` | Pending confirmation at review time | Transaction pays one 1,092 sat output to Moove's confirmed receive address and carries OP_RETURN memo `BUG BOUNTY PROGRAM PAYMENT FOR FIRST 2 BUG FIXES`. Future equivalent marker should be `bb:2` to save OP_RETURN bytes and sats. |

When a bounty is paid, add:

```text
reporter:
paid sats:
treasury txid:
paid date:
covered ledger row(s):
notes:
```
