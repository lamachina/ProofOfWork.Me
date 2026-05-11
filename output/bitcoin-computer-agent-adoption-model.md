# ProofOfWork.Me Bitcoin Computer Agent Adoption Model

Generated on 2026-05-11.

This model values the three working ProofOfWork.Me products:

1. ProofOfWork IDs
2. ProofOfWork Mail
3. ProofOfWork Files / Bitcoin Drive

The goal is to model the Bitcoin Computer in sats, BTC, and USD under an agent-node adoption scenario.

## Real Inputs

### Bitcoin Network Input

Bitnodes network snapshot:

```text
Reachable Bitcoin nodes: 24,947
Snapshot time: 2026-02-13 14:28:32 UTC
Source: Bitnodes
```

Bitnodes describes its method as estimating the Bitcoin peer-to-peer network by finding reachable nodes.

Source:

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

## Scenario Inputs

Agent node assumption:

```text
51% of reachable Bitcoin nodes are agent-controlled.
Every participating agent node can have one PowID.
```

Computed from the Bitnodes snapshot:

```text
Bitcoin nodes = 24,947
Agent share = 51%
Agent nodes = 12,723
```

Agent PowID adoption levels:

```text
10%, 20%, 30%, 40%, 50%, 60%, 70%, 80%, 90%, 100%
```

Time horizons:

```text
6 months
12 months
24 months
5 years
10 years
25 years
50 years
```

Fee tiers:

```text
0.01 sat/vB
0.001 sat/vB
0.0001 sat/vB
0.00001 sat/vB
```

Important: fee tiers are treated as relay-cost conditions, not valuation multipliers. There is no confirmed on-chain elasticity yet proving that a 10x lower relay fee creates a specific 10x, 100x, or 1000x increase in ProofOfWork.Me activity. This model does not fabricate that multiplier.

## Product Formulas

### ID Network

```text
id_value_sats = projected_powids^2 * current_id_sats_per_n2_unit
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

## Adoption Valuation Table

This table holds the Bitnodes node count constant and asks:

```text
What is the Bitcoin Computer worth if X% of agent-controlled Bitcoin nodes have PowIDs?
```

| Agent PowID adoption | Projected PowIDs | ID value sats | Mail value sats | Drive value sats | Total sats | BTC | USD |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 10% | 1,272 | 434,735,052 | 270,665,778 | 38,160,000 | 743,560,829 | 7.4356 | $601,387 |
| 20% | 2,545 | 1,740,307,566 | 1,083,940,840 | 76,350,000 | 2,900,598,407 | 29.0060 | $2,345,985 |
| 30% | 3,817 | 3,914,666,370 | 2,438,547,458 | 114,510,000 | 6,467,723,828 | 64.6772 | $5,231,052 |
| 40% | 5,089 | 6,958,495,277 | 4,334,911,542 | 152,670,000 | 11,446,076,818 | 114.4608 | $9,257,510 |
| 50% | 6,362 | 10,875,212,821 | 6,775,162,975 | 190,860,000 | 17,841,235,796 | 178.4124 | $14,429,872 |
| 60% | 7,634 | 15,658,665,480 | 9,755,467,898 | 229,020,000 | 25,643,153,378 | 256.4315 | $20,740,011 |
| 70% | 8,906 | 21,311,588,242 | 13,277,530,287 | 267,180,000 | 34,856,298,529 | 348.5630 | $28,191,541 |
| 80% | 10,178 | 27,833,981,107 | 17,341,350,141 | 305,340,000 | 45,480,671,248 | 454.8067 | $36,784,462 |
| 90% | 11,451 | 35,231,997,330 | 21,950,761,319 | 343,530,000 | 57,526,288,649 | 575.2629 | $46,526,877 |
| 100% | 12,723 | 43,494,013,947 | 27,098,522,014 | 381,690,000 | 70,974,225,960 | 709.7423 | $57,403,478 |

## Horizon Use

The horizons are adoption target dates.

Because this version uses the real current Bitnodes count as a fixed network input, the valuation for a given adoption percentage is the same at every horizon unless one of these changes:

```text
Bitcoin node count
agent share
PowID adoption percentage
on-chain value density
mail edge density
file write rate
BTC/USD
```

Read the table like this:

```text
If 30% of agent-controlled Bitcoin nodes have PowIDs by 12 months,
the base Bitcoin Computer valuation is 64.6772 BTC, or about $5.23M.

If 100% of agent-controlled Bitcoin nodes have PowIDs by 10 years,
the base Bitcoin Computer valuation is 709.7423 BTC, or about $57.40M.
```

The same adoption table applies to:

```text
6 months
12 months
24 months
5 years
10 years
25 years
50 years
```

Future versions can add measured node-count growth or measured activity growth once those are real observed inputs.

## Fee Tier Treatment

The fee tiers are:

```text
0.01 sat/vB
0.001 sat/vB
0.0001 sat/vB
0.00001 sat/vB
```

They lower relay/miner fee cost for agent activity.

They do not change the ProofOfWork.Me value calculation by themselves because current value is anchored to:

```text
confirmed ID balances
confirmed mail sats flow
confirmed file sats flow
confirmed graph density
```

The honest statement is:

```text
Lower relay fees make agent-scale mail and file traffic cheaper.
They do not prove a specific activity multiplier until the chain shows that traffic.
```

## Current Base Read

Using the real Bitnodes snapshot and the current ProofOfWork.Me on-chain density:

```text
If 51% of Bitcoin nodes are agents:
12,723 agent nodes.

If 100% of those agent nodes have PowIDs:
12,723 PowIDs.

Bitcoin Computer valuation:
70,974,225,960 sats
709.7423 BTC
~$57.40M
```

Product split at 100% agent-node PowID adoption:

```text
ID network: 43,494,013,947 sats
Mail:       27,098,522,014 sats
Drive:         381,690,000 sats
```

The source of truth for ProofOfWork.Me is the chain.

The Bitcoin node count is network-observed.

The agent adoption curve is the scenario.
