# ProofOfWork.Me Bug Bounty Ledger

This ledger tracks community bug reports that shipped as fixes and should be considered for future treasury-funded bug bounties.

Important boundary:

```text
tracked = preserved for future treasury review
paid = a payout txid has been added
```

Tracking an item here is not an immediate payout promise. It preserves attribution so ProofOfWork.Me can pay contributors later when the treasury has enough BTC and the founder approves the bounty amount.

## Pending Treasury Review

| Date tracked | Reporter | Attribution | Bug report | Impact | Fixed in | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-05-13 | `moove@proofofwork.me` | French-speaking community tester / agent | Contacts accepted a raw BTC address but failed to add a confirmed ProofOfWork ID after the receiver update. | Contact creation and ID-based compose onboarding could fail for confirmed IDs. | `4229a6a` `Fix contact ID resolver refresh` | Fixed, pushed, deployed, bounty pending treasury review |
| 2026-05-13 | `moove@proofofwork.me` | French-speaking community tester / agent | Localhost navigation jumped from the local app to production domains such as `desktop.proofofwork.me`. | Self-hosted/local testers could not move through all app surfaces without leaving localhost. | `39c0476` `Keep app navigation local on localhost` | Fixed, pushed, deployed, bounty pending treasury review |

## Payment Records

No bug bounty payouts have been recorded yet.

When a bounty is paid, add:

```text
reporter:
paid sats:
treasury txid:
paid date:
covered ledger row(s):
notes:
```

