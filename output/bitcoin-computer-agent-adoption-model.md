# ProofOfWork.Me Bitcoin Computer Model

Generated on 2026-05-11.

This is the singular forward model for ProofOfWork.Me.

All prior standalone charts, product-only markdown models, and old projection files are deprecated. This model measures:

1. ProofOfWork IDs
2. ProofOfWork Mail
3. ProofOfWork Files / Bitcoin Drive
4. The aggregate Bitcoin Computer

The model is success-case by design:

```text
agent adoption succeeds
Bitcoin node count grows exponentially
BTC/USD follows Bitcoin's backward-facing log-growth benchmark
BTC/USD includes a one-standard-deviation volatility cone
lower relay fees unlock exponentially more agent usage
Bitcoin Computer write demand grows exponentially until today's blockspace ceiling
IDs, Mail, and Drive reinforce each other
```

## Visual Read

These visuals are generated from this same canonical model.

They are written for normal human pattern recognition: big labels, plain words, and no scientific notation.

![What is compounding](bitcoin-computer-model-compounding.png)

![Dollar growth in human words](bitcoin-computer-model-dollar-growth.png)

![IDs Mail Drive product split](bitcoin-computer-model-product-split.png)

![Blockspace ceiling](bitcoin-computer-model-blockspace.png)

![Bitcoin volatility translation](bitcoin-computer-model-volatility.png)

SVG versions:

- [What is compounding](bitcoin-computer-model-compounding.svg)
- [Dollar growth in human words](bitcoin-computer-model-dollar-growth.svg)
- [IDs Mail Drive product split](bitcoin-computer-model-product-split.svg)
- [Blockspace ceiling](bitcoin-computer-model-blockspace.svg)
- [Bitcoin volatility translation](bitcoin-computer-model-volatility.svg)

## Real Inputs

### Bitcoin Network Input

```text
Reachable Bitcoin nodes: 23,984
Snapshot time: 2026-04-30 08:58:26 UTC
Source: Bitnodes
```

Bitnodes describes its method as estimating the Bitcoin peer-to-peer network by finding reachable nodes.

Sources:

```text
https://bitnodes.io/
https://bitnodes.io/api/
```

### BTC/USD Input

```text
Current BTC/USD used: $80,879.33
Current BTC/USD date: 2026-05-11
10Y historical BTC/USD used: $452.73
10Y historical date: 2016-05-11
```

Sources:

```text
https://coinmarketcap.com/currencies/bitcoin/
https://coinmarketcap.com/historical/20160511/
https://portfolioslab.com/tools/stock-comparison/BTC-USD/SPY
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
Canonical forward sats per file: 1,000 sats
```

## Bitcoin Growth Benchmark

Backward-facing Bitcoin log growth:

```text
btc_log_growth_mu = ln(current_btc_usd / historical_btc_usd) / 10
btc_log_growth_mu = 51.85%
equivalent_cagr = e^mu - 1 = 67.96%
```

Bitcoin volatility input:

```text
btc_10y_annualized_volatility_sigma = 56.73%
```

Future BTC/USD paths:

```text
base_btc_usd(t) = current_btc_usd * e^(mu * t)
low_btc_usd(t)  = current_btc_usd * e^(mu * t - sigma * sqrt(t))
high_btc_usd(t) = current_btc_usd * e^(mu * t + sigma * sqrt(t))
```

The volatility band changes only the USD translation. It does not change the sats or BTC valuation of the Bitcoin Computer.

## Bitcoin Blockspace Ceiling

This version adds the blockspace constraint.

The success case assumes Bitcoin Computer usage compounds exponentially as agents, PowIDs, fee collapse, Mail, and Drive reinforce each other. That usage cannot grow through infinite blockspace. It compounds until it hits the current theoretical Bitcoin blockspace ceiling.

Protocol-derived ceiling:

```text
Max block weight: 4,000,000 weight units
Witness scale factor: 4
Theoretical max virtual size per block: 1,000,000 vB
Target blocks per day: 144
Annual theoretical ceiling: 52,560,000,000 vB
```

Sources:

```text
https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki
https://github.com/bitcoin/bitcoin/blob/master/src/consensus/consensus.h
```

Blockspace accounting assumptions:

```text
ID write size: 350 vB
Mail write size: 500 vB
Average current file payload: 9,321 bytes
Drive write size: 9,621 vB
```

Important boundary:

```text
The blockspace ceiling is protocol-derived.
The per-product write sizes are model accounting assumptions.
The model does not claim every block will be filled by ProofOfWork.Me.
It asks what the Bitcoin Computer can execute if demand compounds until today's ceiling is binding.
```

## Scenario Inputs

```text
Agent-controlled Bitcoin node share: 51%
Bitcoin node CAGR: 25%
Canonical fee tier: 0.00001 sat/vB
```

Adoption curve:

```text
6 months: 10%
12 months: 20%
24 months: 40%
5 years: 60%
10 years: 80%
25 years: 90%
50 years: 100%
```

Fee tiers:

```text
0.01 sat/vB
0.001 sat/vB
0.0001 sat/vB
0.00001 sat/vB
```

Fee-collapse multipliers:

```text
fee_drop_factor = 0.01 / fee_rate
product_multiplier = fee_drop_factor ^ elasticity

ID elasticity = 0.25
Mail elasticity = 0.5
Drive elasticity = 0.75
```

## Growth Engine

| Horizon | Years | Future nodes | Agent nodes | Adoption | PowIDs | BTC/USD low | BTC/USD base | BTC/USD high |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 6 months | 0.5 | 26,815 | 13,676 | 10% | 1,368 | $70,182 | $104,818 | $156,549 |
| 12 months | 1.0 | 29,980 | 15,290 | 20% | 3,058 | $77,030 | $135,843 | $239,559 |
| 24 months | 2.0 | 37,475 | 19,112 | 40% | 7,645 | $102,285 | $228,159 | $508,937 |
| 5 years | 5.0 | 73,193 | 37,329 | 60% | 22,397 | $304,036 | $1,081,027 | $3,843,691 |
| 10 years | 10.0 | 223,368 | 113,918 | 80% | 91,134 | $2,402,862 | $14,448,934 | $86,884,598 |
| 25 years | 25.0 | 6,348,512 | 3,237,741 | 90% | 2,913,967 | $2,022,818,537 | $34,501,122,304 | $588,449,936,873 |
| 50 years | 50.0 | 1,680,437,118 | 857,022,930 | 100% | 857,022,930 | $266,497,250,533,037 | $14,717,325,677,724,868 | $812,765,139,869,119,700 |

## Blockspace Constraint

This is the canonical lowest-fee success path at 0.00001 sat/vB.

```text
raw_blockspace_demand_vbytes =
  id_writes * id_write_vbytes
  + mail_writes * mail_write_vbytes
  + drive_writes * drive_write_vbytes

executable_blockspace_vbytes =
  min(raw_blockspace_demand_vbytes, annual_theoretical_blockspace_ceiling)

blockspace_usage_fulfillment_ratio =
  executable_blockspace_vbytes / raw_blockspace_demand_vbytes
```

| Horizon | Raw annual demand | Executable blockspace | Ceiling used | Usage fulfilled | Capped? |
| --- | ---: | ---: | ---: | ---: | ---: |
| 6 months | 15.5 billion vB | 15.5 billion vB | 29.48% | 100.00% | no |
| 12 months | 38.7 billion vB | 38.7 billion vB | 73.58% | 100.00% | no |
| 24 months | 124 billion vB | 52.6 billion vB | 100.00% | 42.39% | yes |
| 5 years | 620 billion vB | 52.6 billion vB | 100.00% | 8.47% | yes |
| 10 years | 7.4 trillion vB | 52.6 billion vB | 100.00% | 0.71% | yes |
| 25 years | 6.64 quadrillion vB | 52.6 billion vB | 100.00% | <0.01% | yes |
| 50 years | 572 quintillion vB | 52.6 billion vB | 100.00% | <0.01% | yes |

## Product Formulas

### IDs

```text
id_value_sats =
  projected_powids^2
  * current_id_sats_per_n2_unit
  * id_fee_multiplier
```

ID is modeled as network stock value. It is not reduced by the annual blockspace fulfillment ratio once the ID graph exists.

### Mail

```text
mail_value_sats =
  projected_powids
  * (projected_powids - 1)
  * current_mail_edge_density
  * messages_per_pair_per_year
  * sats_per_delivery
  * value_multiple
  * mail_fee_multiplier
  * blockspace_usage_fulfillment_ratio
```

### Files / Bitcoin Drive

```text
drive_value_sats =
  projected_powids
  * files_per_id_per_year
  * sats_per_file
  * value_multiple
  * drive_fee_multiplier
  * blockspace_usage_fulfillment_ratio
```

### Bitcoin Computer

```text
bitcoin_computer_value_sats =
  id_value_sats
  + mail_value_sats
  + drive_value_sats
```

The BTC column is a sats-denominated valuation converted into BTC as a unit of account. It is not a claim that those sats are locked in the protocol.

## Canonical Product Growth

This is the canonical lowest-fee success path at 0.00001 sat/vB.

| Horizon | PowIDs | ID sats | Mail sats | Drive sats | Total sats | BTC | Base USD | Volatility USD range |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 6 months | 1,368 | 2,825,816,985 | 9,894,106,884 | 7,295,718,233 | 20,015,642,102 | 200.1564 | $20,980,073 ($21 million) | $14 million to $31.3 million |
| 12 months | 3,058 | 14,129,084,927 | 49,490,545,697 | 16,313,721,914 | 79,933,352,538 | 799.3335 | $108,583,891 ($109 million) | $61.6 million to $191 million |
| 24 months | 7,645 | 88,306,780,793 | 131,157,082,183 | 17,290,092,559 | 236,753,955,535 | 2,367.54 | $540,174,953 ($540 million) | $242 million to $1.2 billion |
| 5 years | 22,397 | 757,943,179,259 | 224,978,327,420 | 10,122,494,193 | 993,044,000,873 | 9,930.44 | $10,735,077,216 ($10.7 billion) | $3.02 billion to $38.2 billion |
| 10 years | 91,134 | 12,549,148,322,130 | 312,280,441,792 | 3,452,933,469 | 12,864,881,697,390 | 128,648.82 | $1,858,838,302,981 ($1.86 trillion) | $309 billion to $11.2 trillion |
| 25 years | 2,913,967 | 12,829,794,126,672,018 | 355,867,242,854 | 123,062,039 | 12,830,150,116,976,910 | 128,301,501.17 | $4,426,545,783,590,368,000 ($4.43 quintillion) | $260 quadrillion to $75.5 quintillion |
| 50 years | 857,022,930 | 1,109,775,975,759,818,300,000 | 357,472,578,281 | 420,311 | 1,109,775,976,117,291,200,000 | 11,097,759,761,172.91 | $163,329,344,698,331,880,000,000,000,000 ($163 octillion) | $2.96 octillion to $9.02 nonillion |

## Aggregate Fee Sensitivity

This is still one model. Fee tier is a variable inside the model, not a separate model.

Every fee tier also runs through the same annual blockspace ceiling.

| Horizon | Fee tier | PowIDs | Total sats | BTC | Base USD | Low USD | High USD |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 6 months | 0.01 sat/vB | 1,368 | 856,415,186 | 8.5642 | $898 thousand | $601 thousand | $1.34 million |
| 6 months | 0.001 sat/vB | 1,368 | 2,113,723,349 | 21.1372 | $2.22 million | $1.48 million | $3.31 million |
| 6 months | 0.0001 sat/vB | 1,368 | 6,015,247,536 | 60.1525 | $6.31 million | $4.22 million | $9.42 million |
| 6 months | 0.00001 sat/vB | 1,368 | 20,015,642,102 | 200.1564 | $21 million | $14 million | $31.3 million |
| 12 months | 0.01 sat/vB | 3,058 | 4,169,313,351 | 41.6931 | $5.66 million | $3.21 million | $9.99 million |
| 12 months | 0.001 sat/vB | 3,058 | 9,932,948,716 | 99.3295 | $13.5 million | $7.65 million | $23.8 million |
| 12 months | 0.0001 sat/vB | 3,058 | 26,496,688,624 | 264.9669 | $36 million | $20.4 million | $63.5 million |
| 12 months | 0.00001 sat/vB | 3,058 | 79,933,352,538 | 799.3335 | $109 million | $61.6 million | $191 million |
| 24 months | 0.01 sat/vB | 7,645 | 25,716,107,780 | 257.1611 | $58.7 million | $26.3 million | $131 million |
| 24 months | 0.001 sat/vB | 7,645 | 60,152,431,083 | 601.5243 | $137 million | $61.5 million | $306 million |
| 24 months | 0.0001 sat/vB | 7,645 | 154,744,618,827 | 1,547.45 | $353 million | $158 million | $788 million |
| 24 months | 0.00001 sat/vB | 7,645 | 236,753,955,535 | 2,367.54 | $540 million | $242 million | $1.2 billion |
| 5 years | 0.01 sat/vB | 22,397 | 219,433,773,220 | 2,194.34 | $2.37 billion | $667 million | $8.43 billion |
| 5 years | 0.001 sat/vB | 22,397 | 509,024,099,458 | 5,090.24 | $5.5 billion | $1.55 billion | $19.6 billion |
| 5 years | 0.0001 sat/vB | 22,397 | 701,529,546,133 | 7,015.30 | $7.58 billion | $2.13 billion | $27 billion |
| 5 years | 0.00001 sat/vB | 22,397 | 993,044,000,873 | 9,930.44 | $10.7 billion | $3.02 billion | $38.2 billion |
| 10 years | 0.01 sat/vB | 91,134 | 2,580,731,295,692 | 25,807.31 | $373 billion | $62 billion | $2.24 trillion |
| 10 years | 0.001 sat/vB | 91,134 | 4,311,391,239,022 | 43,113.91 | $623 billion | $104 billion | $3.75 trillion |
| 10 years | 0.0001 sat/vB | 91,134 | 7,389,522,555,853 | 73,895.23 | $1.07 trillion | $178 billion | $6.42 trillion |
| 10 years | 0.00001 sat/vB | 91,134 | 12,864,881,697,390 | 128,648.82 | $1.86 trillion | $309 billion | $11.2 trillion |
| 25 years | 0.01 sat/vB | 2,913,967 | 2,281,853,083,891,574 | 22,818,530.84 | $787 quadrillion | $46.2 quadrillion | $13.4 quintillion |
| 25 years | 0.001 sat/vB | 2,913,967 | 4,057,494,140,403,167 | 40,574,941.40 | $1.4 quintillion | $82.1 quadrillion | $23.9 quintillion |
| 25 years | 0.0001 sat/vB | 2,913,967 | 7,215,080,070,526,115 | 72,150,800.71 | $2.49 quintillion | $146 quadrillion | $42.5 quintillion |
| 25 years | 0.00001 sat/vB | 2,913,967 | 12,830,150,116,976,910 | 128,301,501.17 | $4.43 quintillion | $260 quadrillion | $75.5 quintillion |
| 50 years | 0.01 sat/vB | 857,022,930 | 197,349,177,102,431,100,000 | 1,973,491,771,024.31 | $29 octillion | $526 septillion | $1.6 nonillion |
| 50 years | 0.001 sat/vB | 857,022,930 | 350,941,977,951,160,240,000 | 3,509,419,779,511.60 | $51.6 octillion | $935 septillion | $2.85 nonillion |
| 50 years | 0.0001 sat/vB | 857,022,930 | 624,072,893,230,664,100,000 | 6,240,728,932,306.64 | $91.8 octillion | $1.66 octillion | $5.07 nonillion |
| 50 years | 0.00001 sat/vB | 857,022,930 | 1,109,775,976,117,291,200,000 | 11,097,759,761,172.91 | $163 octillion | $2.96 octillion | $9.02 nonillion |

## Plain Read

At the canonical deep-fee success path:

```text
6 months:
20,015,642,102 sats
200.1564 BTC
$21 million base USD
$14 million to $31.3 million volatility range

10 years:
12,864,881,697,390 sats
128,648.82 BTC
$1.86 trillion base USD
$309 billion to $11.2 trillion volatility range

50 years:
1,109,775,976,117,291,200,000 sats
11,097,759,761,172.91 BTC
$163 octillion base USD
$2.96 octillion to $9.02 nonillion volatility range
```

## Canonical Status

This markdown is the singular ProofOfWork.Me Bitcoin Computer model going forward.

Deprecated:

```text
old standalone ID models
old standalone Mail models
old standalone Drive models
old projection charts
old graphics
old modeling-data exports
```

The source of truth for ProofOfWork.Me is the chain.

The Bitcoin node count is network-observed.

The Bitcoin price benchmark is backward-facing historical log growth with volatility.

The node growth, agent share, agent adoption curve, fee tiers, fee elasticities, and per-product blockspace usage assumptions are success-case scenario assumptions.
