# ProofOfWork.Me Bitcoin Computer Agent Adoption Model

Generated on 2026-05-11.

This is the **successful network-effect model** for ProofOfWork.Me's Bitcoin Computer.

It values the three working products:

1. ProofOfWork IDs
2. ProofOfWork Mail
3. ProofOfWork Files / Bitcoin Drive

The model assumes:

```text
agent adoption succeeds
Bitcoin node count grows exponentially
BTC/USD grows exponentially
lower relay fees unlock exponentially more agent usage
ProofOfWork IDs, Mail, and Drive reinforce each other
```

## Real Inputs

### Bitcoin Network Input

Bitnodes network snapshot:

```text
Reachable Bitcoin nodes: 23,984
Snapshot time: 2026-04-30 08:58:26 UTC
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

Exponential growth assumptions:

```text
Bitcoin node CAGR: 25%
BTC/USD CAGR: 30%
```

Important boundary:

```text
Current ProofOfWork.Me inputs are on-chain and verifiable.
The current Bitcoin node count is network-observed from Bitnodes.
Future node growth is a success-case scenario assumption.
Future BTC/USD growth is a success-case scenario assumption.
The agent adoption curve and fee elasticities are success-case scenario assumptions.
```

## Horizon Growth Curve

```text
future_bitcoin_nodes = current_bitcoin_nodes * (1 + node_cagr) ^ years
future_btc_usd = current_btc_usd * (1 + btc_price_cagr) ^ years
future_agent_nodes = future_bitcoin_nodes * 0.51
future_powids = future_agent_nodes * agent_powid_adoption
```

| Horizon | Years | Future Bitcoin nodes | Future agent nodes | Agent PowID adoption | Projected PowIDs | Future BTC/USD |
|---|---:|---:|---:|---:|---:|---:|
| 6 months | 0.5 | 26,815 | 13,676 | 10% | 1,368 | $92,217 |
| 12 months | 1 | 29,980 | 15,290 | 20% | 3,058 | $105,143 |
| 24 months | 2 | 37,475 | 19,112 | 40% | 7,645 | $136,686 |
| 5 years | 5 | 73,193 | 37,329 | 60% | 22,397 | $300,299 |
| 10 years | 10 | 223,368 | 113,918 | 80% | 91,134 | $1,114,990 |
| 25 years | 25 | 6,348,512 | 3,237,741 | 90% | 2,913,967 | $57,071,771 |
| 50 years | 50 | 1,680,437,118 | 857,022,930 | 100% | 857,022,930 | $40,272,181,942 |

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

The BTC column is a sats-denominated valuation converted into BTC as a unit of account. It is not a claim that those sats are locked in the protocol.

## Horizon Summary

This table shows the baseline fee case and the deep fee-collapse case.

| Horizon | Future nodes | Future BTC/USD | 0.01 sat/vB value | 0.00001 sat/vB value |
|---|---:|---:|---:|---:|
| 6 months | 26,815 | $92,217 | 8.5695 BTC / $790,252 | 200.2615 BTC / $18,467,437 |
| 12 months | 29,980 | $105,143 | 41.6942 BTC / $4,383,860 | 799.3523 BTC / $84,046,403 |
| 24 months | 37,475 | $136,686 | 257.1678 BTC / $35,151,252 | 4,384.7864 BTC / $599,339,217 |
| 5 years | 73,193 | $300,299 | 2,194.3049 BTC / $658,948,196 | 35,330.0600 BTC / $10,609,591,965 |
| 10 years | 223,368 | $1,114,990 | 36,247.6257 BTC / $40,415,749,067 | 570,052.8056 BTC / $635,603,317,714 |
| 25 years | 6,348,512 | $57,071,771 | 37,031,583.8235 BTC / $2,113,458,087,321,886 | 577,994,903.7020 BTC / $32,987,193,026,452,744 |
| 50 years | 1,680,437,118 | $40,272,181,942 | 3,203,153,504,398.8390 BTC / $128,997,980,717,216,770,000,000 | 49,983,115,798,236.4300 BTC / $2,012,929,133,453,256,200,000,000 |

## Success-Case Valuation Matrix

This table assumes:

```text
25% annual Bitcoin node growth
30% annual BTC/USD growth
51% agent-controlled Bitcoin nodes
successful agent PowID adoption curve
exponential product usage as fees drop
```

| Horizon | Adoption | Fee tier | Future nodes | Future BTC/USD | PowIDs | ID value sats | Mail value sats | Drive value sats | Total sats | BTC | USD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 6 months | 10% | 0.01 | 26,815 | $92,217 | 1,368 | 502,831,678 | 313,079,981 | 41,040,000 | 856,951,658 | 8.5695 | $790,252 |
| 6 months | 10% | 0.001 | 26,815 | $92,217 | 1,368 | 894,175,219 | 990,045,828 | 230,784,880 | 2,115,005,927 | 21.1501 | $1,950,387 |
| 6 months | 10% | 0.0001 | 26,815 | $92,217 | 1,368 | 1,590,093,381 | 3,130,799,805 | 1,297,798,752 | 6,018,691,938 | 60.1869 | $5,550,235 |
| 6 months | 10% | 0.00001 | 26,815 | $92,217 | 1,368 | 2,827,630,320 | 9,900,458,282 | 7,298,058,699 | 20,026,147,300 | 200.2615 | $18,467,437 |
| 12 months | 20% | 0.01 | 29,980 | $105,143 | 3,058 | 2,512,611,813 | 1,565,069,421 | 91,740,000 | 4,169,421,233 | 41.6942 | $4,383,860 |
| 12 months | 20% | 0.001 | 29,980 | $105,143 | 3,058 | 4,468,125,852 | 4,949,184,065 | 515,891,932 | 9,933,201,848 | 99.3320 | $10,444,079 |
| 12 months | 20% | 0.0001 | 29,980 | $105,143 | 3,058 | 7,945,576,203 | 15,650,694,205 | 2,901,073,525 | 26,497,343,934 | 264.9734 | $27,860,137 |
| 12 months | 20% | 0.00001 | 29,980 | $105,143 | 3,058 | 14,129,454,564 | 49,491,840,651 | 16,313,935,308 | 79,935,230,522 | 799.3523 | $84,046,403 |
| 24 months | 40% | 0.01 | 37,475 | $136,686 | 7,645 | 15,703,823,828 | 9,783,603,738 | 229,350,000 | 25,716,777,566 | 257.1678 | $35,151,252 |
| 24 months | 40% | 0.001 | 37,475 | $136,686 | 7,645 | 27,925,786,573 | 30,938,471,535 | 1,289,729,829 | 60,153,987,938 | 601.5399 | $82,222,121 |
| 24 months | 40% | 0.0001 | 37,475 | $136,686 | 7,645 | 49,659,851,272 | 97,836,037,376 | 7,252,683,814 | 154,748,572,461 | 1,547.4857 | $211,519,739 |
| 24 months | 40% | 0.00001 | 37,475 | $136,686 | 7,645 | 88,309,091,022 | 309,384,715,354 | 40,784,838,269 | 438,478,644,645 | 4,384.7864 | $599,339,217 |
| 5 years | 60% | 0.01 | 73,193 | $300,299 | 22,397 | 134,781,453,342 | 83,977,123,591 | 671,910,000 | 219,430,486,932 | 2,194.3049 | $658,948,196 |
| 5 years | 60% | 0.001 | 73,193 | $300,299 | 22,397 | 239,679,083,332 | 265,558,981,897 | 3,778,427,598 | 509,016,492,827 | 5,090.1649 | $1,528,572,918 |
| 5 years | 60% | 0.0001 | 73,193 | $300,299 | 22,397 | 426,216,378,907 | 839,771,235,910 | 21,247,659,826 | 1,287,235,274,643 | 12,872.3527 | $3,865,558,400 |
| 5 years | 60% | 0.00001 | 73,193 | $300,299 | 22,397 | 757,931,810,832 | 2,655,589,818,969 | 119,484,371,840 | 3,533,006,001,640 | 35,330.0600 | $10,609,591,965 |
| 10 years | 80% | 0.01 | 223,368 | $1,114,990 | 91,134 | 2,231,574,037,005 | 1,390,454,511,820 | 2,734,020,000 | 3,624,762,568,825 | 36,247.6257 | $40,415,749,067 |
| 10 years | 80% | 0.001 | 223,368 | $1,114,990 | 91,134 | 3,968,362,161,983 | 4,397,003,240,209 | 15,374,524,299 | 8,380,739,926,491 | 83,807.3993 | $93,444,432,686 |
| 10 years | 80% | 0.0001 | 223,368 | $1,114,990 | 91,134 | 7,056,856,724,231 | 13,904,545,118,202 | 86,457,303,685 | 21,047,859,146,118 | 210,478.5915 | $234,681,576,378 |
| 10 years | 80% | 0.00001 | 223,368 | $1,114,990 | 91,134 | 12,549,063,012,295 | 43,970,032,402,094 | 486,185,147,263 | 57,005,280,561,652 | 570,052.8056 | $635,603,317,714 |
| 25 years | 90% | 0.01 | 6,348,512 | $57,071,771 | 2,913,967 | 2,281,495,903,884,156 | 1,421,575,059,452,236 | 87,419,010,000 | 3,703,158,382,346,392 | 37,031,583.8235 | $2,113,458,087,321,886 |
| 25 years | 90% | 0.001 | 6,348,512 | $57,071,771 | 2,913,967 | 4,057,137,189,965,336 | 4,495,415,052,758,343 | 491,593,219,302 | 8,553,043,835,942,980 | 85,530,438.3594 | $4,881,373,627,567,796 |
| 25 years | 90% | 0.0001 | 6,348,512 | $57,071,771 | 2,913,967 | 7,214,723,528,618,530 | 14,215,750,594,522,362 | 2,764,431,823,970 | 21,433,238,554,964,864 | 214,332,385.5496 | $12,232,328,916,158,294 |
| 25 years | 90% | 0.00001 | 6,348,512 | $57,071,771 | 2,913,967 | 12,829,794,300,065,696 | 44,954,150,527,583,420 | 15,545,542,552,899 | 57,799,490,370,202,020 | 577,994,903.7020 | $32,987,193,026,452,744 |
| 50 years | 100% | 0.01 | 1,680,437,118 | $40,272,181,942 | 857,022,930 | 197,349,176,563,801,200,000 | 122,966,148,165,394,860,000 | 25,710,687,900,000 | 320,315,350,439,883,900,000 | 3,203,153,504,398.8390 | $128,997,980,717,216,770,000,000 |
| 50 years | 100% | 0.001 | 1,680,437,118 | $40,272,181,942 | 857,022,930 | 350,941,977,271,543,600,000 | 388,853,103,300,383,150,000 | 144,581,823,052,415 | 739,795,225,153,749,800,000 | 7,397,952,251,537.4980 | $297,931,679,071,943,040,000,000 |
| 50 years | 100% | 0.0001 | 1,680,437,118 | $40,272,181,942 | 857,022,930 | 624,072,892,300,333,500,000 | 1,229,661,481,653,948,600,000 | 813,043,339,737,315 | 1,853,735,186,997,622,000,000 | 18,537,351,869,976.2230 | $746,539,607,230,046,100,000,000 |
| 50 years | 100% | 0.00001 | 1,680,437,118 | $40,272,181,942 | 857,022,930 | 1,109,775,974,741,121,600,000 | 3,888,531,033,003,831,000,000 | 4,572,078,691,050,686 | 4,998,311,579,823,643,000,000 | 49,983,115,798,236.4300 | $2,012,929,133,453,256,200,000,000 |

## Current Correction

The previous model still held Bitcoin nodes and BTC/USD flat.

That was wrong for a success-case network-effect model.

This version compounds both:

```text
Bitcoin nodes compound at 25% per year.
BTC/USD compounds at 30% per year.
```

Then it applies:

```text
51% agent-controlled Bitcoin nodes
successful PowID adoption by horizon
exponential fee-collapse usage multipliers
ID + Mail + Drive product valuation
```

The source of truth for ProofOfWork.Me is the chain.

The Bitcoin node count is network-observed.

The node growth, BTC/USD growth, fee elasticities, and adoption curve are the success-case scenario.
