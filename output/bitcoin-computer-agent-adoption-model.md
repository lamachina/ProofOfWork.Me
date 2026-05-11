# ProofOfWork.Me Bitcoin Computer Agent Adoption Model

Generated on 2026-05-11.

This is the **successful network-effect model** for ProofOfWork.Me's Bitcoin Computer.

It values the three working products:

1. ProofOfWork IDs
2. ProofOfWork Mail
3. ProofOfWork Files / Bitcoin Drive

The model assumes agent adoption succeeds, lower relay fees unlock exponentially more activity, and the three products reinforce each other.

## Real Inputs

### Bitcoin Network Input

Bitnodes network snapshot:

```text
Reachable Bitcoin nodes: 23,984
Snapshot time: 2026-04-30 01:22:25 UTC
Source: Bitnodes
```

Bitnodes describes its method as estimating the Bitcoin peer-to-peer network by finding reachable nodes.

Sources:

```text
https://bitnodes.io/nodes/
https://bitnodes.io/api/
```

### BTC/USD Input

```text
BTC/USD used: $80,879.33
Source: CoinMarketCap BTC/USD, 2026-05-11
```

Source:

```text
https://coinmarketcap.com/currencies/bitcoin/
```

### ProofOfWork.Me On-Chain Inputs

These are from confirmed ProofOfWork.Me registry/mail/file data already modeled in this repo.

```text
Confirmed PowIDs: 94
Current n^2: 8,836
Unique receive-address balance: 2,374,139 sats
ID value density: 268.68933906745133 sats per n^2 unit
```

Mail:

```text
Confirmed protocol txids: 12
Confirmed delivery edges: 15
Paid attention flow: 10,202 sats
Average sats per delivery: 680.13 sats
Current address-level mail edge density: 1.2308%
```

Files / Bitcoin Drive:

```text
Confirmed file txids: 4
Unique file hashes: 4
Total file bytes: 37,284
File-bearing payment flow: 2,184 sats
Average sats per file: 546 sats
```

## Success-Case Scenario Inputs

Agent node assumption:

```text
51% of reachable Bitcoin nodes are agent-controlled.
Every participating agent node can have one PowID.
```

Computed from the Bitnodes snapshot:

```text
Bitcoin nodes = 23,984
Agent share = 51%
Agent nodes = 12,232
```

Successful adoption curve:

| Horizon | Agent PowID adoption | Projected PowIDs |
|---|---:|---:|
| 6 months | 10% | 1,223 |
| 12 months | 20% | 2,446 |
| 24 months | 40% | 4,893 |
| 5 years | 60% | 7,339 |
| 10 years | 80% | 9,786 |
| 25 years | 90% | 11,009 |
| 50 years | 100% | 12,232 |

Fee tiers:

```text
0.01 sat/vB
0.001 sat/vB
0.0001 sat/vB
0.00001 sat/vB
```

## Fee Collapse Multiplier

This version assumes successful network effect.

Lower fees do not merely reduce cost. They unlock exponentially more agent usage.

```text
fee_drop_factor = 0.01 / fee_rate
product_multiplier = fee_drop_factor ^ elasticity
```

Elasticities:

```text
ID elasticity = 0.25
Mail elasticity = 0.50
Drive elasticity = 0.75
```

Reasoning:

```text
IDs are the least fee-elastic because each agent only needs a few durable identity actions.
Mail is more fee-elastic because agents can send many messages, replies, and paid-attention edges.
Drive is the most fee-elastic because agents can publish many manifests, files, proofs, app records, and state snapshots.
```

Fee multipliers:

| Fee tier | ID multiplier | Mail multiplier | Drive multiplier |
|---:|---:|---:|---:|
| 0.01 sat/vB | 1.0000x | 1.0000x | 1.0000x |
| 0.001 sat/vB | 1.7783x | 3.1623x | 5.6234x |
| 0.0001 sat/vB | 3.1623x | 10.0000x | 31.6228x |
| 0.00001 sat/vB | 5.6234x | 31.6228x | 177.8279x |

Important boundary:

```text
The ProofOfWork.Me inputs are on-chain and verifiable.
The Bitnodes count is network-observed.
The agent adoption curve and fee elasticities are success-case scenario assumptions.
```

## Product Formulas

### ID Network

```text
id_value_sats =
  projected_powids^2
  * current_id_sats_per_n2_unit
  * id_fee_multiplier
```

Where:

```text
current_id_sats_per_n2_unit = 268.68933906745133
```

### Mail

```text
mail_value_sats =
  directed_pairs
  * current_mail_edge_density
  * messages_per_pair_per_year
  * sats_per_delivery
  * value_multiple
  * mail_fee_multiplier
```

Base mail assumptions from current product model:

```text
current_mail_edge_density = 0.012307692307692308
messages_per_pair_per_year = 4
sats_per_delivery = 680.1333333333333
value_multiple = 5
```

### Files / Bitcoin Drive

```text
drive_value_sats =
  projected_powids
  * files_per_id_per_year
  * sats_per_file
  * value_multiple
  * drive_fee_multiplier
```

Base drive-light assumptions from current product model:

```text
files_per_id_per_year = 6
sats_per_file = 1,000
value_multiple = 5
```

### Bitcoin Computer

```text
bitcoin_computer_value_sats =
  id_value_sats
  + mail_value_sats
  + drive_value_sats
```

## Success-Case Valuation Matrix

This table assumes the successful adoption curve above and applies the exponential fee multiplier.

| Horizon | Adoption | Fee tier | PowIDs | ID value sats | Mail value sats | Drive value sats | Total sats | BTC | USD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 6 months | 10% | 0.01 | 1,223 | 401,886,436 | 250,206,362 | 36,690,000 | 688,782,799 | 6.8878 | $557,083 |
| 6 months | 10% | 0.001 | 1,223 | 714,666,375 | 791,221,990 | 206,323,032 | 1,712,211,398 | 17.1221 | $1,384,825 |
| 6 months | 10% | 0.0001 | 1,223 | 1,270,876,500 | 2,502,063,625 | 1,160,239,674 | 4,933,179,798 | 49.3318 | $3,989,923 |
| 6 months | 10% | 0.00001 | 1,223 | 2,259,973,512 | 7,912,219,904 | 6,524,507,155 | 16,696,700,572 | 166.9670 | $13,504,180 |
| 12 months | 20% | 0.01 | 2,446 | 1,607,545,746 | 1,001,234,953 | 73,380,000 | 2,682,160,699 | 26.8216 | $2,169,314 |
| 12 months | 20% | 0.001 | 2,446 | 2,858,665,500 | 3,166,182,924 | 412,646,064 | 6,437,494,489 | 64.3749 | $5,206,602 |
| 12 months | 20% | 0.0001 | 2,446 | 5,083,505,999 | 10,012,349,529 | 2,320,479,347 | 17,416,334,875 | 174.1633 | $14,086,215 |
| 12 months | 20% | 0.00001 | 2,446 | 9,039,894,050 | 31,661,829,240 | 13,049,014,311 | 53,750,737,601 | 537.5074 | $43,473,236 |
| 24 months | 40% | 0.01 | 4,893 | 6,432,812,108 | 4,007,396,830 | 146,790,000 | 10,586,998,938 | 105.8700 | $8,562,694 |
| 24 months | 40% | 0.001 | 4,893 | 11,439,337,321 | 12,672,501,470 | 825,460,831 | 24,937,299,622 | 249.3730 | $20,169,121 |
| 24 months | 40% | 0.0001 | 4,893 | 20,342,338,022 | 40,073,968,297 | 4,641,907,377 | 65,058,213,696 | 650.5821 | $52,618,647 |
| 24 months | 40% | 0.00001 | 4,893 | 36,174,360,856 | 126,725,014,701 | 26,103,363,460 | 189,002,739,017 | 1,890.0274 | $152,864,149 |
| 5 years | 60% | 0.01 | 7,339 | 14,471,855,265 | 9,016,028,612 | 220,170,000 | 23,708,053,877 | 237.0805 | $19,174,915 |
| 5 years | 60% | 0.001 | 7,339 | 25,735,002,243 | 28,511,185,864 | 1,238,106,896 | 55,484,295,003 | 554.8430 | $44,875,326 |
| 5 years | 60% | 0.0001 | 7,339 | 45,764,024,606 | 90,160,286,123 | 6,962,386,724 | 142,886,697,454 | 1,428.8670 | $115,565,804 |
| 5 years | 60% | 0.00001 | 7,339 | 81,381,222,677 | 285,111,858,642 | 39,152,377,771 | 405,645,459,090 | 4,056.4546 | $328,083,329 |
| 10 years | 80% | 0.01 | 9,786 | 25,731,248,433 | 16,031,225,666 | 293,580,000 | 42,056,054,098 | 420.5605 | $34,014,655 |
| 10 years | 80% | 0.001 | 9,786 | 45,757,349,282 | 50,695,186,789 | 1,650,921,662 | 98,103,457,733 | 981.0346 | $79,345,419 |
| 10 years | 80% | 0.0001 | 9,786 | 81,369,352,086 | 160,312,256,660 | 9,283,814,755 | 250,965,423,501 | 2,509.6542 | $202,979,153 |
| 10 years | 80% | 0.00001 | 9,786 | 144,697,443,423 | 506,951,867,886 | 52,206,726,920 | 703,856,038,229 | 7,038.5604 | $569,274,048 |
| 25 years | 90% | 0.01 | 11,009 | 32,564,632,280 | 20,288,828,858 | 330,270,000 | 53,183,731,138 | 531.8373 | $43,014,645 |
| 25 years | 90% | 0.001 | 11,009 | 57,909,015,079 | 64,158,910,249 | 1,857,244,695 | 123,925,170,023 | 1,239.2517 | $100,229,847 |
| 25 years | 90% | 0.0001 | 11,009 | 102,978,409,171 | 202,888,288,582 | 10,444,054,428 | 316,310,752,181 | 3,163.1075 | $255,830,017 |
| 25 years | 90% | 0.00001 | 11,009 | 183,124,384,707 | 641,589,102,491 | 58,731,234,075 | 883,444,721,274 | 8,834.4472 | $714,524,171 |
| 50 years | 100% | 0.01 | 12,232 | 40,201,789,001 | 25,047,254,278 | 366,960,000 | 65,616,003,279 | 656.1600 | $53,069,784 |
| 50 years | 100% | 0.001 | 12,232 | 71,490,013,627 | 79,206,372,653 | 2,063,567,727 | 152,759,954,006 | 1,527.5995 | $123,551,227 |
| 50 years | 100% | 0.0001 | 12,232 | 127,129,219,255 | 250,472,542,783 | 11,604,294,102 | 389,206,056,140 | 3,892.0606 | $314,787,251 |
| 50 years | 100% | 0.00001 | 12,232 | 226,071,273,016 | 792,063,726,528 | 65,255,741,231 | 1,083,390,740,775 | 10,833.9074 | $876,239,172 |

## Lowest-Fee Adoption Sensitivity

At `0.00001 sat/vB`, agent usage is highly unlocked:

| Agent PowID adoption | Projected PowIDs | Total sats | BTC | USD |
|---:|---:|---:|---:|---:|
| 10% | 1,223 | 16,696,700,572 | 166.9670 | $13,504,180 |
| 20% | 2,446 | 53,750,737,601 | 537.5074 | $43,473,236 |
| 30% | 3,670 | 111,217,383,665 | 1,112.1738 | $89,951,875 |
| 40% | 4,893 | 189,002,739,017 | 1,890.0274 | $152,864,149 |
| 50% | 6,116 | 287,145,430,825 | 2,871.4543 | $232,241,301 |
| 60% | 7,339 | 405,645,459,090 | 4,056.4546 | $328,083,329 |
| 70% | 8,562 | 544,502,823,812 | 5,445.0282 | $440,390,236 |
| 80% | 9,786 | 703,856,038,229 | 7,038.5604 | $569,274,048 |
| 90% | 11,009 | 883,444,721,274 | 8,834.4472 | $714,524,171 |
| 100% | 12,232 | 1,083,390,740,775 | 10,833.9074 | $876,239,172 |

## Current Success-Case Read

Using the current Bitnodes snapshot and current ProofOfWork.Me on-chain density:

```text
If 51% of reachable Bitcoin nodes are agents:
12,232 agent nodes.

If 100% of those agent nodes have PowIDs:
12,232 PowIDs.
```

At baseline low fee, `0.01 sat/vB`:

```text
65,616,003,279 sats
656.1600 BTC
~$53.07M
```

At deep fee collapse, `0.00001 sat/vB`:

```text
1,083,390,740,775 sats
10,833.9074 BTC
~$876.24M
```

Product split at 100% agent-node PowID adoption and `0.00001 sat/vB`:

```text
ID network: 226,071,273,016 sats
Mail:       792,063,726,528 sats
Drive:       65,255,741,231 sats
```

## Interpretation

The earlier conservative model was wrong because it treated fee drops as passive.

This corrected model assumes the successful network effect:

```text
More agent PowIDs create more addressable agents.
More addressable agents create more mail edges.
More mail edges create more files, proofs, manifests, and app records.
More agent-readable records create more reason to own and use PowIDs.
Lower fees increase the frequency of every agent action.
```

The source of truth for ProofOfWork.Me is the chain.

The Bitcoin node count is network-observed.

The fee elasticities and adoption curve are the success-case scenario.
