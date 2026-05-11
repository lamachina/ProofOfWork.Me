# ProofOfWork.Me Files App Value Model

Generated from live confirmed `pwm1:a` attachment activity on 2026-05-11.

This is the Google Drive-shaped surface of the Bitcoin Computer: confirmed file writes, public Desktop search, durable hashes, and sats-weighted file distribution.

## Current Files Snapshot

| Metric | Value |
|---|---:|
| Confirmed PowIDs | 94 |
| Current receive addresses | 26 |
| Confirmed file txids | 4 |
| Confirmed files | 4 |
| Unique file hashes | 4 |
| Unique MIME types | 2 |
| Total file bytes | 37,284 bytes |
| Total file size | 36.41 KB |
| Median file size | 8,552.5 bytes |
| File-bearing payment flow | 2,184 sats |
| File-bearing payment flow | 0.00002184 BTC |
| File-bearing payment flow | ~$1.77 |
| Average sats per file | 546 sats |
| Storage density | 59.96 sats per KB |

## Formula

```text
annual_flow_sats =
  projected_ids
  * files_per_id_per_year
  * sats_per_file

network_value_sats =
  annual_flow_sats * flow_multiple
```

The default value multiple is `5x` annual file-write flow.

## Scenarios

| Scenario | Files per ID per year | Sats per file | Value multiple |
|---|---:|---:|---:|
| Archive | 1 | 1,000 | 5x |
| Drive light | 6 | 1,000 | 5x |
| Agent workspace | 24 | 2,000 | 5x |

## 24 Month Read

| Growth model | Scenario | 24 month value |
|---|---|---:|
| Recent pace | Archive | 0.48 BTC / ~$38.76K |
| Recent pace | Drive light | 2.88 BTC / ~$232.58K |
| Recent pace | Agent workspace | 23.00 BTC / ~$1.86M |
| Launch average | Archive | 0.92 BTC / ~$74.49K |
| Launch average | Drive light | 5.53 BTC / ~$446.93K |
| Launch average | Agent workspace | 44.20 BTC / ~$3.58M |

## Data

- [Files app model JSON](modeling-data/powid-files-app-model-2026-05-11.json)
- [Files app projection CSV](modeling-data/powid-files-app-projection-scenarios-2026-05-11.csv)
