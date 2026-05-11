# ProofOfWork.Me Mail App Value Model

Generated from live confirmed `pwm1:` mail activity on 2026-05-11.

Confirmed chain data is canonical. Pending mempool data is not included in the value snapshot.

## Current Mail App Snapshot

| Metric | Value |
|---|---:|
| Confirmed PowIDs | 94 |
| Current receive addresses | 26 |
| Directed ID pair potential | 8,742 |
| Directed receive-address pair potential | 650 |
| Confirmed protocol txids touching PowID receive addresses | 12 |
| Confirmed delivery edges | 15 |
| Unique PowID-address directed pairs used | 8 |
| Current address-level edge density | 1.2308% |
| Paid attention flow so far | 10,202 sats |
| Paid attention flow so far | 0.00010202 BTC |
| Paid attention flow so far | ~$8.25 |
| Average sats per delivery | 680.13 sats |
| Median sats per delivery | 546 sats |
| Attachments | 4 |
| Replies | 5 |
| Multi-recipient txids | 1 |
| Annualized current flow | 827,152 sats |
| Annualized current flow | 0.00827152 BTC |
| Annualized current flow | ~$669.10 |

## Formula

```text
annual_flow_sats =
  directed_pairs
  * edge_density
  * messages_per_pair_per_year
  * sats_per_delivery

network_value_sats =
  annual_flow_sats * flow_multiple
```

The default value multiple is `5x` annual paid attention flow.

## Scenarios

| Scenario | Edge density | Messages per pair per year | Sats per delivery | Value multiple |
|---|---:|---:|---:|---:|
| Conservative | 0.5% | 1 | 546 | 5x |
| Base current density | 1.2308% | 4 | 680.13 | 5x |
| Paid inbox monthly | 5% | 12 | 1,000 | 5x |

## 24 Month Read

| Growth model | Scenario | 24 month value |
|---|---|---:|
| Recent pace | Conservative | 12.54 BTC / ~$1.01M |
| Recent pace | Base current density | 153.76 BTC / ~$12.44M |
| Recent pace | Paid inbox monthly | 2,755.30 BTC / ~$222.88M |
| Launch average | Conservative | 46.30 BTC / ~$3.74M |
| Launch average | Base current density | 567.83 BTC / ~$45.93M |
| Launch average | Paid inbox monthly | 10,175.02 BTC / ~$823.07M |

## Data

- [Mail app model JSON](modeling-data/powid-mail-app-model-2026-05-11.json)
- [Mail app projection CSV](modeling-data/powid-mail-app-projection-scenarios-2026-05-11.csv)
