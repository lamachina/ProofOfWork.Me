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
IDs, Mail, and Drive reinforce each other
```

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

## Product Formulas

### IDs

```text
id_value_sats =
  projected_powids^2
  * current_id_sats_per_n2_unit
  * id_fee_multiplier
```

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
| 24 months | 7,645 | 88,306,780,793 | 309,376,621,098 | 40,784,304,785 | 438,467,706,676 | 4,384.68 | $1,000,402,601 ($1 billion) | $448 million to $2.23 billion |
| 5 years | 22,397 | 757,943,179,259 | 2,655,629,651,780 | 119,485,267,926 | 3,533,058,098,965 | 35,330.58 | $38,193,324,230 ($38.2 billion) | $10.7 billion to $136 billion |
| 10 years | 91,134 | 12,549,148,322,130 | 43,970,331,316,585 | 486,186,799,829 | 57,005,666,438,544 | 570,056.66 | $8,236,711,285,455 ($8.24 trillion) | $1.37 trillion to $49.5 trillion |
| 25 years | 2,913,967 | 12,829,794,126,672,018 | 44,954,149,920,031,460 | 15,545,542,447,850 | 57,799,489,589,151,320 | 577,994,895.89 | $19,941,472,593,994,720,000 ($19.9 quintillion) | $1.17 quintillion to $340 quintillion |
| 50 years | 857,022,930 | 1,109,775,975,759,818,300,000 | 3,888,531,036,573,231,000,000 | 4,572,078,693,149,111 | 4,998,311,584,411,743,000,000 | 49,983,115,844,117.43 | $735,617,794,265,326,200,000,000,000,000 ($736 octillion) | $13.3 octillion to $40.6 nonillion |

## Aggregate Fee Sensitivity

This is still one model. Fee tier is a variable inside the model, not a separate model.

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
| 24 months | 0.00001 sat/vB | 7,645 | 438,467,706,676 | 4,384.68 | $1 billion | $448 million | $2.23 billion |
| 5 years | 0.01 sat/vB | 22,397 | 219,433,773,220 | 2,194.34 | $2.37 billion | $667 million | $8.43 billion |
| 5 years | 0.001 sat/vB | 22,397 | 509,024,099,458 | 5,090.24 | $5.5 billion | $1.55 billion | $19.6 billion |
| 5 years | 0.0001 sat/vB | 22,397 | 1,287,254,423,170 | 12,872.54 | $13.9 billion | $3.91 billion | $49.5 billion |
| 5 years | 0.00001 sat/vB | 22,397 | 3,533,058,098,965 | 35,330.58 | $38.2 billion | $10.7 billion | $136 billion |
| 10 years | 0.01 sat/vB | 91,134 | 3,624,787,201,096 | 36,247.87 | $524 billion | $87.1 billion | $3.15 trillion |
| 10 years | 0.001 sat/vB | 91,134 | 8,380,796,847,537 | 83,807.97 | $1.21 trillion | $201 billion | $7.28 trillion |
| 10 years | 0.0001 sat/vB | 91,134 | 21,048,001,938,298 | 210,480.02 | $3.04 trillion | $506 billion | $18.3 trillion |
| 10 years | 0.00001 sat/vB | 91,134 | 57,005,666,438,544 | 570,056.66 | $8.24 trillion | $1.37 trillion | $49.5 trillion |
| 25 years | 0.01 sat/vB | 2,913,967 | 3,703,158,332,299,081 | 37,031,583.32 | $1.28 quintillion | $74.9 quadrillion | $21.8 quintillion |
| 25 years | 0.001 sat/vB | 2,913,967 | 8,553,043,720,352,566 | 85,530,437.20 | $2.95 quintillion | $173 quadrillion | $50.3 quintillion |
| 25 years | 0.0001 sat/vB | 2,913,967 | 21,433,238,265,314,948 | 214,332,382.65 | $7.39 quintillion | $434 quadrillion | $126 quintillion |
| 25 years | 0.00001 sat/vB | 2,913,967 | 57,799,489,589,151,320 | 577,994,895.89 | $19.9 quintillion | $1.17 quintillion | $340 quintillion |
| 50 years | 0.01 sat/vB | 857,022,930 | 320,315,350,733,911,000,000 | 3,203,153,507,339.11 | $47.1 octillion | $854 septillion | $2.6 nonillion |
| 50 years | 0.001 sat/vB | 857,022,930 | 739,795,225,832,830,100,000 | 7,397,952,258,328.30 | $109 octillion | $1.97 octillion | $6.01 nonillion |
| 50 years | 0.0001 sat/vB | 857,022,930 | 1,853,735,188,699,220,800,000 | 18,537,351,886,992.21 | $273 octillion | $4.94 octillion | $15.1 nonillion |
| 50 years | 0.00001 sat/vB | 857,022,930 | 4,998,311,584,411,743,000,000 | 49,983,115,844,117.43 | $736 octillion | $13.3 octillion | $40.6 nonillion |

## Plain Read

At the canonical deep-fee success path:

```text
6 months:
20,015,642,102 sats
200.1564 BTC
$21 million base USD
$14 million to $31.3 million volatility range

10 years:
57,005,666,438,544 sats
570,056.66 BTC
$8.24 trillion base USD
$1.37 trillion to $49.5 trillion volatility range

50 years:
4,998,311,584,411,743,000,000 sats
49,983,115,844,117.43 BTC
$736 octillion base USD
$13.3 octillion to $40.6 nonillion volatility range
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

The node growth, agent share, agent adoption curve, fee tiers, and fee elasticities are success-case scenario assumptions.
