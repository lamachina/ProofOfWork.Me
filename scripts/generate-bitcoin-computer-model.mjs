import { writeFileSync } from "node:fs";

const OUTPUT = "output/bitcoin-computer-agent-adoption-model.md";

const inputs = {
  generatedOn: "2026-05-11",
  bitnodes: {
    reachableNodes: 23984,
    snapshotTimeUtc: "2026-04-30 08:58:26 UTC",
    source: "Bitnodes",
  },
  btc: {
    currentUsd: 80879.33,
    currentDate: "2026-05-11",
    historicalUsd: 452.73,
    historicalDate: "2016-05-11",
    tenYearVolatility: 0.5673,
  },
  pow: {
    confirmedPowids: 94,
    uniqueReceiveAddressBalanceSats: 2374139,
    idDensitySatsPerN2: 268.68933906745133,
    mailTxids: 12,
    mailDeliveryEdges: 15,
    mailPaidAttentionFlowSats: 10202,
    mailSatsPerDelivery: 680.1333333333333,
    mailEdgeDensity: 0.012307692307692308,
    fileTxids: 4,
    uniqueFileHashes: 4,
    totalFileBytes: 37284,
    fileFlowSats: 2184,
    satsPerFileBase: 1000,
  },
  scenario: {
    agentShare: 0.51,
    nodeCagr: 0.25,
    mailMessagesPerPairPerYear: 4,
    mailValueMultiple: 5,
    driveFilesPerIdPerYear: 6,
    driveValueMultiple: 5,
    canonicalFee: 0.00001,
    horizons: [
      { label: "6 months", years: 0.5, adoption: 0.1 },
      { label: "12 months", years: 1, adoption: 0.2 },
      { label: "24 months", years: 2, adoption: 0.4 },
      { label: "5 years", years: 5, adoption: 0.6 },
      { label: "10 years", years: 10, adoption: 0.8 },
      { label: "25 years", years: 25, adoption: 0.9 },
      { label: "50 years", years: 50, adoption: 1 },
    ],
    feeTiers: [0.01, 0.001, 0.0001, 0.00001],
    elasticities: {
      id: 0.25,
      mail: 0.5,
      drive: 0.75,
    },
  },
};

const btcLogGrowth = Math.log(inputs.btc.currentUsd / inputs.btc.historicalUsd) / 10;
const btcEquivalentCagr = Math.exp(btcLogGrowth) - 1;

function feeMultiplier(feeRate, elasticity) {
  return (0.01 / feeRate) ** elasticity;
}

function futureBtcUsd(years) {
  const base = inputs.btc.currentUsd * Math.exp(btcLogGrowth * years);
  const volatility = inputs.btc.tenYearVolatility * Math.sqrt(years);
  return {
    low: inputs.btc.currentUsd * Math.exp(btcLogGrowth * years - volatility),
    base,
    high: inputs.btc.currentUsd * Math.exp(btcLogGrowth * years + volatility),
  };
}

function modelRow(horizon, feeRate) {
  const nodes = inputs.bitnodes.reachableNodes * (1 + inputs.scenario.nodeCagr) ** horizon.years;
  const agentNodes = nodes * inputs.scenario.agentShare;
  const powids = agentNodes * horizon.adoption;
  const directedPairs = powids * Math.max(0, powids - 1);
  const idMultiplier = feeMultiplier(feeRate, inputs.scenario.elasticities.id);
  const mailMultiplier = feeMultiplier(feeRate, inputs.scenario.elasticities.mail);
  const driveMultiplier = feeMultiplier(feeRate, inputs.scenario.elasticities.drive);
  const idSats = powids ** 2 * inputs.pow.idDensitySatsPerN2 * idMultiplier;
  const mailSats =
    directedPairs *
    inputs.pow.mailEdgeDensity *
    inputs.scenario.mailMessagesPerPairPerYear *
    inputs.pow.mailSatsPerDelivery *
    inputs.scenario.mailValueMultiple *
    mailMultiplier;
  const driveSats =
    powids *
    inputs.scenario.driveFilesPerIdPerYear *
    inputs.pow.satsPerFileBase *
    inputs.scenario.driveValueMultiple *
    driveMultiplier;
  const totalSats = idSats + mailSats + driveSats;
  const btc = totalSats / 100_000_000;
  const usdPath = futureBtcUsd(horizon.years);

  return {
    ...horizon,
    feeRate,
    nodes,
    agentNodes,
    powids,
    idSats,
    mailSats,
    driveSats,
    totalSats,
    btc,
    btcUsdLow: usdPath.low,
    btcUsdBase: usdPath.base,
    btcUsdHigh: usdPath.high,
    usdLow: btc * usdPath.low,
    usdBase: btc * usdPath.base,
    usdHigh: btc * usdPath.high,
  };
}

function fmtNumber(value, decimals = 0) {
  return Number(value).toLocaleString("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

function fmtSats(value) {
  return fmtNumber(Math.round(value));
}

function fmtBtc(value) {
  return fmtNumber(value, value >= 1000 ? 2 : 4);
}

function fmtUsd(value) {
  return `$${fmtNumber(Math.round(value))}`;
}

function fmtUsdPrecise(value) {
  return `$${fmtNumber(value, 2)}`;
}

function fmtPct(value, decimals = 2) {
  return `${(value * 100).toFixed(decimals)}%`;
}

function fmtFee(value) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 5, minimumFractionDigits: 0 });
}

function humanUsd(value) {
  const units = [
    [1e33, "decillion"],
    [1e30, "nonillion"],
    [1e27, "octillion"],
    [1e24, "septillion"],
    [1e21, "sextillion"],
    [1e18, "quintillion"],
    [1e15, "quadrillion"],
    [1e12, "trillion"],
    [1e9, "billion"],
    [1e6, "million"],
    [1e3, "thousand"],
  ];
  const unit = units.find(([size]) => value >= size);
  if (!unit) return fmtUsd(value);
  const [size, label] = unit;
  const scaled = value / size;
  const decimals = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  return `$${scaled.toFixed(decimals).replace(/\.0+$|(\.\d*[1-9])0+$/, "$1")} ${label}`;
}

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map((header, index) => (index === 0 ? "---" : "---:")).join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

function productTable(rows) {
  return table(
    ["Horizon", "PowIDs", "ID sats", "Mail sats", "Drive sats", "Total sats", "BTC", "Base USD", "Volatility USD range"],
    rows.map((row) => [
      row.label,
      fmtNumber(Math.round(row.powids)),
      fmtSats(row.idSats),
      fmtSats(row.mailSats),
      fmtSats(row.driveSats),
      fmtSats(row.totalSats),
      fmtBtc(row.btc),
      `${fmtUsd(row.usdBase)} (${humanUsd(row.usdBase)})`,
      `${humanUsd(row.usdLow)} to ${humanUsd(row.usdHigh)}`,
    ]),
  );
}

function aggregateFeeTable(rows) {
  return table(
    ["Horizon", "Fee tier", "PowIDs", "Total sats", "BTC", "Base USD", "Low USD", "High USD"],
    rows.map((row) => [
      row.label,
      `${fmtFee(row.feeRate)} sat/vB`,
      fmtNumber(Math.round(row.powids)),
      fmtSats(row.totalSats),
      fmtBtc(row.btc),
      humanUsd(row.usdBase),
      humanUsd(row.usdLow),
      humanUsd(row.usdHigh),
    ]),
  );
}

function growthEngineTable(rows) {
  return table(
    ["Horizon", "Years", "Future nodes", "Agent nodes", "Adoption", "PowIDs", "BTC/USD low", "BTC/USD base", "BTC/USD high"],
    rows.map((row) => [
      row.label,
      fmtNumber(row.years, 1),
      fmtNumber(Math.round(row.nodes)),
      fmtNumber(Math.round(row.agentNodes)),
      fmtPct(row.adoption, 0),
      fmtNumber(Math.round(row.powids)),
      fmtUsd(row.btcUsdLow),
      fmtUsd(row.btcUsdBase),
      fmtUsd(row.btcUsdHigh),
    ]),
  );
}

const canonicalRows = inputs.scenario.horizons.map((horizon) => modelRow(horizon, inputs.scenario.canonicalFee));
const aggregateRows = inputs.scenario.horizons.flatMap((horizon) =>
  inputs.scenario.feeTiers.map((feeRate) => modelRow(horizon, feeRate)),
);
const growthRows = inputs.scenario.horizons.map((horizon) => modelRow(horizon, inputs.scenario.canonicalFee));

const markdown = `# ProofOfWork.Me Bitcoin Computer Model

Generated on ${inputs.generatedOn}.

This is the singular forward model for ProofOfWork.Me.

All prior standalone charts, product-only markdown models, and old projection files are deprecated. This model measures:

1. ProofOfWork IDs
2. ProofOfWork Mail
3. ProofOfWork Files / Bitcoin Drive
4. The aggregate Bitcoin Computer

The model is success-case by design:

\`\`\`text
agent adoption succeeds
Bitcoin node count grows exponentially
BTC/USD follows Bitcoin's backward-facing log-growth benchmark
BTC/USD includes a one-standard-deviation volatility cone
lower relay fees unlock exponentially more agent usage
IDs, Mail, and Drive reinforce each other
\`\`\`

## Real Inputs

### Bitcoin Network Input

\`\`\`text
Reachable Bitcoin nodes: ${fmtNumber(inputs.bitnodes.reachableNodes)}
Snapshot time: ${inputs.bitnodes.snapshotTimeUtc}
Source: ${inputs.bitnodes.source}
\`\`\`

Bitnodes describes its method as estimating the Bitcoin peer-to-peer network by finding reachable nodes.

Sources:

\`\`\`text
https://bitnodes.io/
https://bitnodes.io/api/
\`\`\`

### BTC/USD Input

\`\`\`text
Current BTC/USD used: ${fmtUsdPrecise(inputs.btc.currentUsd)}
Current BTC/USD date: ${inputs.btc.currentDate}
10Y historical BTC/USD used: ${fmtUsdPrecise(inputs.btc.historicalUsd)}
10Y historical date: ${inputs.btc.historicalDate}
\`\`\`

Sources:

\`\`\`text
https://coinmarketcap.com/currencies/bitcoin/
https://coinmarketcap.com/historical/20160511/
https://portfolioslab.com/tools/stock-comparison/BTC-USD/SPY
\`\`\`

### ProofOfWork.Me On-Chain Inputs

These are from confirmed ProofOfWork.Me registry/mail/file data already modeled in this repo.

\`\`\`text
Confirmed PowIDs: ${fmtNumber(inputs.pow.confirmedPowids)}
Current n^2: ${fmtNumber(inputs.pow.confirmedPowids ** 2)}
Unique receive-address balance: ${fmtSats(inputs.pow.uniqueReceiveAddressBalanceSats)} sats
ID value density: ${inputs.pow.idDensitySatsPerN2} sats per n^2 unit
\`\`\`

Mail:

\`\`\`text
Confirmed protocol txids: ${inputs.pow.mailTxids}
Confirmed delivery edges: ${inputs.pow.mailDeliveryEdges}
Paid attention flow: ${fmtSats(inputs.pow.mailPaidAttentionFlowSats)} sats
Average sats per delivery: ${inputs.pow.mailSatsPerDelivery.toFixed(2)} sats
Current address-level mail edge density: ${(inputs.pow.mailEdgeDensity * 100).toFixed(4)}%
\`\`\`

Files / Bitcoin Drive:

\`\`\`text
Confirmed file txids: ${inputs.pow.fileTxids}
Unique file hashes: ${inputs.pow.uniqueFileHashes}
Total file bytes: ${fmtNumber(inputs.pow.totalFileBytes)}
File-bearing payment flow: ${fmtSats(inputs.pow.fileFlowSats)} sats
Canonical forward sats per file: ${fmtSats(inputs.pow.satsPerFileBase)} sats
\`\`\`

## Bitcoin Growth Benchmark

Backward-facing Bitcoin log growth:

\`\`\`text
btc_log_growth_mu = ln(current_btc_usd / historical_btc_usd) / 10
btc_log_growth_mu = ${fmtPct(btcLogGrowth)}
equivalent_cagr = e^mu - 1 = ${fmtPct(btcEquivalentCagr)}
\`\`\`

Bitcoin volatility input:

\`\`\`text
btc_10y_annualized_volatility_sigma = ${fmtPct(inputs.btc.tenYearVolatility)}
\`\`\`

Future BTC/USD paths:

\`\`\`text
base_btc_usd(t) = current_btc_usd * e^(mu * t)
low_btc_usd(t)  = current_btc_usd * e^(mu * t - sigma * sqrt(t))
high_btc_usd(t) = current_btc_usd * e^(mu * t + sigma * sqrt(t))
\`\`\`

The volatility band changes only the USD translation. It does not change the sats or BTC valuation of the Bitcoin Computer.

## Scenario Inputs

\`\`\`text
Agent-controlled Bitcoin node share: ${fmtPct(inputs.scenario.agentShare, 0)}
Bitcoin node CAGR: ${fmtPct(inputs.scenario.nodeCagr, 0)}
Canonical fee tier: ${fmtFee(inputs.scenario.canonicalFee)} sat/vB
\`\`\`

Adoption curve:

\`\`\`text
6 months: 10%
12 months: 20%
24 months: 40%
5 years: 60%
10 years: 80%
25 years: 90%
50 years: 100%
\`\`\`

Fee tiers:

\`\`\`text
0.01 sat/vB
0.001 sat/vB
0.0001 sat/vB
0.00001 sat/vB
\`\`\`

Fee-collapse multipliers:

\`\`\`text
fee_drop_factor = 0.01 / fee_rate
product_multiplier = fee_drop_factor ^ elasticity

ID elasticity = ${inputs.scenario.elasticities.id}
Mail elasticity = ${inputs.scenario.elasticities.mail}
Drive elasticity = ${inputs.scenario.elasticities.drive}
\`\`\`

## Growth Engine

${growthEngineTable(growthRows)}

## Product Formulas

### IDs

\`\`\`text
id_value_sats =
  projected_powids^2
  * current_id_sats_per_n2_unit
  * id_fee_multiplier
\`\`\`

### Mail

\`\`\`text
mail_value_sats =
  projected_powids
  * (projected_powids - 1)
  * current_mail_edge_density
  * messages_per_pair_per_year
  * sats_per_delivery
  * value_multiple
  * mail_fee_multiplier
\`\`\`

### Files / Bitcoin Drive

\`\`\`text
drive_value_sats =
  projected_powids
  * files_per_id_per_year
  * sats_per_file
  * value_multiple
  * drive_fee_multiplier
\`\`\`

### Bitcoin Computer

\`\`\`text
bitcoin_computer_value_sats =
  id_value_sats
  + mail_value_sats
  + drive_value_sats
\`\`\`

The BTC column is a sats-denominated valuation converted into BTC as a unit of account. It is not a claim that those sats are locked in the protocol.

## Canonical Product Growth

This is the canonical lowest-fee success path at ${fmtFee(inputs.scenario.canonicalFee)} sat/vB.

${productTable(canonicalRows)}

## Aggregate Fee Sensitivity

This is still one model. Fee tier is a variable inside the model, not a separate model.

${aggregateFeeTable(aggregateRows)}

## Plain Read

At the canonical deep-fee success path:

\`\`\`text
6 months:
${fmtSats(canonicalRows[0].totalSats)} sats
${fmtBtc(canonicalRows[0].btc)} BTC
${humanUsd(canonicalRows[0].usdBase)} base USD
${humanUsd(canonicalRows[0].usdLow)} to ${humanUsd(canonicalRows[0].usdHigh)} volatility range

10 years:
${fmtSats(canonicalRows[4].totalSats)} sats
${fmtBtc(canonicalRows[4].btc)} BTC
${humanUsd(canonicalRows[4].usdBase)} base USD
${humanUsd(canonicalRows[4].usdLow)} to ${humanUsd(canonicalRows[4].usdHigh)} volatility range

50 years:
${fmtSats(canonicalRows[6].totalSats)} sats
${fmtBtc(canonicalRows[6].btc)} BTC
${humanUsd(canonicalRows[6].usdBase)} base USD
${humanUsd(canonicalRows[6].usdLow)} to ${humanUsd(canonicalRows[6].usdHigh)} volatility range
\`\`\`

## Canonical Status

This markdown is the singular ProofOfWork.Me Bitcoin Computer model going forward.

Deprecated:

\`\`\`text
old standalone ID models
old standalone Mail models
old standalone Drive models
old projection charts
old graphics
old modeling-data exports
\`\`\`

The source of truth for ProofOfWork.Me is the chain.

The Bitcoin node count is network-observed.

The Bitcoin price benchmark is backward-facing historical log growth with volatility.

The node growth, agent share, agent adoption curve, fee tiers, and fee elasticities are success-case scenario assumptions.
`;

writeFileSync(OUTPUT, `${markdown.trim()}\n`);
