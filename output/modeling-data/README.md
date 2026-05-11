# PowID Modeling Data

Public artifacts for the 2026-05-11 ProofOfWork ID network-effect model.

Confirmed chain data is canonical. Pending records are included only where explicitly labeled.

## Sources

- `powid-transaction-ranking-2026-05-11T17-50-33Z.json`
- `powid-transaction-ranking-2026-05-11T17-50-33Z.csv`
- `powid-transaction-ranking-by-address-2026-05-11T17-50-33Z.csv`
- `powid-network-model-2026-05-11.json`
- `powid-projection-scenarios-2026-05-11.csv`
- `powid-mail-app-model-2026-05-11.json`
- `powid-mail-app-projection-scenarios-2026-05-11.csv`

## Model

```text
n = confirmed, routable PowIDs
network_potential = n^2
modeled_value_sats = network_potential * sats_per_n2_unit
```

Current density anchors:

```text
Unique receive-address balance density: 268.68933906745133 sats per n^2 unit
ID-weighted balance density: 726.1411272068809 sats per n^2 unit
BTC/USD used for projections: 80879.34
```

The model measures network-effect value density. It is not a guarantee of market price.

## Mail App Model

The mail app model values confirmed `pwm1:` paid attention flow across the current PowID graph:

```text
annual_flow_sats = directed_pairs * edge_density * messages_per_pair_per_year * sats_per_delivery
network_value_sats = annual_flow_sats * flow_multiple
```

Current snapshot:

```text
12 confirmed protocol txids
15 confirmed delivery edges
10,202 sats of paid attention flow
4 attachments
5 replies
```
