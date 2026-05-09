# ProofOfWork ID Refund Log

Operational notes for refunds issued against duplicate or failed ProofOfWork ID registry payments.

## 2026-05-09 Confirmed Refund Batch

These refunds were reported as issued by the project operator after running the ID registry audit.

| Refund address | Amount | Count | IDs |
| --- | ---: | ---: | --- |
| `bc1q568xckhc4j0grkd0qjh23wl3ulqsufv2drrn6d` | 7,000 sats | 7 | `x`, `btc`, `bitcoin`, `pepe`, `sats`, `bitcoin`, `pow` |
| `bc1p7kf50cf89xhjatzssjp67wjcs6m05d3y68jjcfkyn699yw2j2h8sh5pewc` | 6,000 sats | 6 | `okx`, `4`, `4`, `cz`, `okx`, `ai` |
| `bc1p8m24m3ycx2awggnlp4ljh0m8l54985scfwshet9zdg4qtf80udhqkwrx0c` | 1,000 sats | 1 | `trump` |

Total issued in this batch: **14,000 sats**.

## 2026-05-09 Refund Notice Email

After issuing the refunds above, the project operator sent an on-chain ProofOfWork.Me mail notice to `bitcoin@proofofwork.me`.

- Notice tx: `d27483346c1f12fb3f46d288ce265a6e6d684c6f1ffb39cc729acfb80ace5676`
- Explorer: `https://mempool.space/tx/d27483346c1f12fb3f46d288ce265a6e6d684c6f1ffb39cc729acfb80ace5676`

## Audit Command

Run this command to generate a fresh duplicate/refund report:

```bash
npm run audit:ids
```

Confirmed duplicate rows may still appear in future audit output because the Bitcoin registry history is permanent. Check this refund log before treating an old duplicate as unpaid.
