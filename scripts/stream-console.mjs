#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { URL } from "node:url";
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "@bitcoinerlab/secp256k1";

bitcoin.initEccLib(ecc);

const DEFAULT_SOURCE = "work";
const DEFAULT_DESTINATION = "bitcoin";
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_FEE_RATE = 0.5;
const DEFAULT_MIN_CONFIRMATIONS = 1;
const OUTPUT_DIR = "output/stream-console";
const SATS_PER_BTC = 100_000_000;
const DUST_SATS = 546;

const ADDRESS_ALIASES = {
  bitcoin: "1F1p9UEHuH5KTFR7Zsx93Khdrqhj6t5nFv",
  "bitcoin@proofofwork.me": "1F1p9UEHuH5KTFR7Zsx93Khdrqhj6t5nFv",
  tokens: "1L4xrDurN9VghknrbsSju2vQb6oXZe1Pbn",
  "tokens@proofofwork.me": "1L4xrDurN9VghknrbsSju2vQb6oXZe1Pbn",
  work: "1638Vn6KtmK8p5r4oGvAXq9nmZb1emU1DV",
  "work@proofofwork.me": "1638Vn6KtmK8p5r4oGvAXq9nmZb1emU1DV",
};

function usage() {
  return `
Stream Console

Local Bitcoin Core UTXO consolidation for large registry wallets.
Private keys never leave your local Bitcoin Core wallet.

Usage:
  npm run stream:console -- plan [options]
  npm run stream:console -- build [options]
  npm run stream:console -- broadcast --yes [options]

Options:
  --source <alias|address>        Source address. Default: work
  --destination <alias|address>   Destination address. Default: bitcoin
  --wallet <name>                 Bitcoin Core wallet name, or BITCOIN_RPC_WALLET
  --batch-size <n>                Inputs per consolidation tx. Default: 100
  --max-batches <n>               Batches to build/broadcast. Default: 1
  --fee-rate <sat/vB>             Consolidation fee rate. Default: 0.5
  --min-conf <n>                  Minimum confirmations. Default: 1
  --scan                          Use scantxoutset for plan-only watch scans
  --yes                           Required for broadcast

RPC env:
  BITCOIN_RPC_URL=http://127.0.0.1:8332
  BITCOIN_RPC_USER=<user>
  BITCOIN_RPC_PASSWORD=<password>
  BITCOIN_RPC_COOKIE=~/.bitcoin/.cookie
  BITCOIN_RPC_WALLET=<wallet>

Examples:
  npm run stream:console -- plan --source work --destination bitcoin --wallet main
  npm run stream:console -- build --source work --destination bitcoin --fee-rate 0.5 --batch-size 100 --wallet main
  npm run stream:console -- broadcast --yes --source work --destination bitcoin --fee-rate 0.5 --batch-size 50 --wallet main
`.trim();
}

function parseArgs(argv) {
  const parsed = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      parsed._.push(token);
      continue;
    }

    const rawKey = token.slice(2);
    const key = rawKey.replace(/-([a-z])/gu, (_, letter) =>
      letter.toUpperCase(),
    );
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function resolveAddress(value) {
  const key = String(value ?? "").trim();
  return ADDRESS_ALIASES[key.toLowerCase()] ?? key;
}

function assertMainnetAddress(address, label) {
  try {
    bitcoin.address.toOutputScript(address, bitcoin.networks.bitcoin);
  } catch {
    throw new Error(`${label} is not a valid mainnet Bitcoin address.`);
  }
}

function numberOption(value, fallback, label) {
  if (value === undefined || value === true || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a number.`);
  }
  return parsed;
}

function integerOption(value, fallback, label) {
  const parsed = Math.floor(numberOption(value, fallback, label));
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${label} must be a safe integer.`);
  }
  return parsed;
}

function expandHome(filePath) {
  const value = String(filePath ?? "");
  return value.startsWith("~/") ? path.join(os.homedir(), value.slice(2)) : value;
}

async function readAuthHeader(rpcUrl) {
  if (rpcUrl.username || rpcUrl.password) {
    return `Basic ${Buffer.from(
      `${decodeURIComponent(rpcUrl.username)}:${decodeURIComponent(
        rpcUrl.password,
      )}`,
    ).toString("base64")}`;
  }

  if (process.env.BITCOIN_RPC_USER || process.env.BITCOIN_RPC_PASSWORD) {
    return `Basic ${Buffer.from(
      `${process.env.BITCOIN_RPC_USER ?? ""}:${
        process.env.BITCOIN_RPC_PASSWORD ?? ""
      }`,
    ).toString("base64")}`;
  }

  const cookiePath = expandHome(
    process.env.BITCOIN_RPC_COOKIE ?? "~/.bitcoin/.cookie",
  );
  const cookie = await fs.readFile(cookiePath, "utf8").catch(() => "");
  if (!cookie.trim()) {
    throw new Error(
      "Bitcoin Core RPC auth missing. Set BITCOIN_RPC_USER/PASSWORD or BITCOIN_RPC_COOKIE.",
    );
  }
  return `Basic ${Buffer.from(cookie.trim()).toString("base64")}`;
}

function walletRpcUrl(walletName) {
  const rpcUrl = new URL(process.env.BITCOIN_RPC_URL ?? "http://127.0.0.1:8332");
  rpcUrl.username = "";
  rpcUrl.password = "";
  if (walletName) {
    rpcUrl.pathname = `/wallet/${encodeURIComponent(walletName)}`;
  }
  return rpcUrl;
}

async function rpc(method, params = [], walletName = "") {
  const rpcUrl = walletRpcUrl(walletName);
  const auth = await readAuthHeader(
    new URL(process.env.BITCOIN_RPC_URL ?? "http://127.0.0.1:8332"),
  );
  const response = await fetch(rpcUrl, {
    body: JSON.stringify({
      id: "stream-console",
      jsonrpc: "1.0",
      method,
      params,
    }),
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Bitcoin Core RPC returned non-JSON for ${method}: ${text}`);
  }

  if (!response.ok || payload.error) {
    throw new Error(
      payload.error?.message ??
        `Bitcoin Core RPC ${method} returned HTTP ${response.status}`,
    );
  }

  return payload.result;
}

function btcToSats(value) {
  return Math.round(Number(value) * SATS_PER_BTC);
}

function satsToBtcString(sats) {
  return (Math.floor(sats) / SATS_PER_BTC).toFixed(8);
}

function scriptInputVbytes(scriptPubKey = "") {
  const script = String(scriptPubKey).toLowerCase();
  if (script.startsWith("76a914") && script.endsWith("88ac")) {
    return 148;
  }
  if (script.startsWith("0014")) {
    return 68;
  }
  if (script.startsWith("a914")) {
    return 91;
  }
  if (script.startsWith("5120")) {
    return 58;
  }
  return 160;
}

function outputVbytes(address) {
  const script = bitcoin.address.toOutputScript(address, bitcoin.networks.bitcoin);
  return 8 + varIntSize(script.length) + script.length;
}

function varIntSize(value) {
  if (value < 0xfd) return 1;
  if (value <= 0xffff) return 3;
  if (value <= 0xffffffff) return 5;
  return 9;
}

function normalizeUtxo(utxo) {
  return {
    address: String(utxo.address ?? ""),
    amountSats: btcToSats(utxo.amount),
    confirmations: Number(utxo.confirmations ?? 0),
    desc: typeof utxo.desc === "string" ? utxo.desc : "",
    safe: utxo.safe !== false,
    scriptPubKey: String(utxo.scriptPubKey ?? ""),
    solvable: utxo.solvable !== false,
    spendable: utxo.spendable !== false,
    txid: String(utxo.txid ?? "").toLowerCase(),
    vout: Number(utxo.vout),
  };
}

function normalizeScanUtxo(utxo, source) {
  return {
    address: source,
    amountSats: btcToSats(utxo.amount),
    confirmations: 0,
    desc: typeof utxo.desc === "string" ? utxo.desc : "",
    safe: true,
    scriptPubKey: String(utxo.scriptPubKey ?? ""),
    solvable: false,
    spendable: false,
    txid: String(utxo.txid ?? "").toLowerCase(),
    vout: Number(utxo.vout),
  };
}

async function loadWalletUtxos({ minConfirmations, source, walletName }) {
  const raw = await rpc(
    "listunspent",
    [minConfirmations, 9_999_999, [source], true],
    walletName,
  );
  return raw.map(normalizeUtxo).filter(validUtxo);
}

async function scanAddressUtxos({ source }) {
  const result = await rpc("scantxoutset", [
    "start",
    [{ desc: `addr(${source})` }],
  ]);
  const unspents = Array.isArray(result?.unspents) ? result.unspents : [];
  return unspents.map((utxo) => normalizeScanUtxo(utxo, source)).filter(validUtxo);
}

function validUtxo(utxo) {
  return (
    /^[0-9a-f]{64}$/u.test(utxo.txid) &&
    Number.isSafeInteger(utxo.vout) &&
    utxo.vout >= 0 &&
    Number.isSafeInteger(utxo.amountSats) &&
    utxo.amountSats > 0
  );
}

function spendableUtxos(utxos) {
  return utxos.filter((utxo) => utxo.spendable && utxo.solvable && utxo.safe);
}

function sortForConsolidation(utxos) {
  return utxos.slice().sort((left, right) => {
    return (
      left.amountSats - right.amountSats ||
      left.txid.localeCompare(right.txid) ||
      left.vout - right.vout
    );
  });
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function estimateBatch(batch, destination, feeRate) {
  const inputVbytes = batch.reduce(
    (total, utxo) => total + scriptInputVbytes(utxo.scriptPubKey),
    0,
  );
  const vbytes = 10 + inputVbytes + outputVbytes(destination);
  const inputSats = batch.reduce((total, utxo) => total + utxo.amountSats, 0);
  const feeSats = Math.ceil(vbytes * feeRate);
  return {
    feeSats,
    inputSats,
    outputSats: inputSats - feeSats,
    vbytes,
  };
}

function percentile(sortedValues, ratio) {
  if (sortedValues.length === 0) return 0;
  return sortedValues[Math.floor((sortedValues.length - 1) * ratio)];
}

function summarizeUtxos(allUtxos, selectedUtxos) {
  const selectedValues = selectedUtxos.map((utxo) => utxo.amountSats).sort((a, b) => a - b);
  return {
    allCount: allUtxos.length,
    selectedCount: selectedUtxos.length,
    selectedTotalSats: selectedValues.reduce((total, value) => total + value, 0),
    unspendableCount: allUtxos.length - selectedUtxos.length,
    valueStats: {
      max: selectedValues.at(-1) ?? 0,
      median: percentile(selectedValues, 0.5),
      min: selectedValues[0] ?? 0,
      p25: percentile(selectedValues, 0.25),
      p75: percentile(selectedValues, 0.75),
    },
  };
}

function printPlan(plan) {
  console.log("\nStream Console plan");
  console.log(`source:      ${plan.source}`);
  console.log(`destination: ${plan.destination}`);
  console.log(`wallet:      ${plan.walletName || "(default RPC wallet)"}`);
  console.log(`fee rate:    ${plan.feeRate} sat/vB`);
  console.log(`batch size:  ${plan.batchSize} inputs`);
  console.log(`UTXOs:       ${plan.summary.selectedCount}/${plan.summary.allCount} usable`);
  console.log(`total:       ${plan.summary.selectedTotalSats.toLocaleString()} sats`);
  console.log(
    `values:      min ${plan.summary.valueStats.min.toLocaleString()} / median ${plan.summary.valueStats.median.toLocaleString()} / max ${plan.summary.valueStats.max.toLocaleString()} sats`,
  );
  console.log("\nfirst batches:");
  for (const batch of plan.batches.slice(0, plan.maxBatches)) {
    console.log(
      `  #${batch.index}: ${batch.inputCount} inputs, ${batch.inputSats.toLocaleString()} in, ~${batch.feeSats.toLocaleString()} fee, ~${batch.outputSats.toLocaleString()} out`,
    );
  }
  console.log("");
}

async function writeArtifact(name, contents) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const filePath = path.join(OUTPUT_DIR, name);
  await fs.writeFile(filePath, contents);
  return filePath;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/gu, "-");
}

async function walletCreateFundedPsbtWithFallback({
  batch,
  destination,
  feeRate,
  walletName,
}) {
  const inputSats = batch.reduce((total, utxo) => total + utxo.amountSats, 0);
  const inputs = batch.map((utxo) => ({
    txid: utxo.txid,
    vout: utxo.vout,
  }));
  const outputs = [{ [destination]: satsToBtcString(inputSats) }];
  const baseOptions = {
    add_inputs: false,
    changePosition: -1,
    lockUnspents: false,
    replaceable: true,
    subtractFeeFromOutputs: [0],
  };

  try {
    return await rpc(
      "walletcreatefundedpsbt",
      [inputs, outputs, 0, { ...baseOptions, fee_rate: feeRate }, true],
      walletName,
    );
  } catch (error) {
    if (!String(error.message).includes("fee_rate")) {
      throw error;
    }

    return rpc(
      "walletcreatefundedpsbt",
      [
        inputs,
        outputs,
        0,
        {
          ...baseOptions,
          feeRate: satsToBtcString(Math.ceil(feeRate * 1000)),
        },
        true,
      ],
      walletName,
    );
  }
}

async function buildBatch({
  batch,
  batchIndex,
  destination,
  feeRate,
  shouldBroadcast,
  shouldSign,
  walletName,
}) {
  const funded = await walletCreateFundedPsbtWithFallback({
    batch,
    destination,
    feeRate,
    walletName,
  });
  let psbt = funded.psbt;
  let complete = false;
  let hex = "";

  if (shouldSign) {
    const processed = await rpc(
      "walletprocesspsbt",
      [psbt, true, "ALL", true],
      walletName,
    );
    psbt = processed.psbt;
    const finalized = await rpc("finalizepsbt", [psbt, true], walletName);
    complete = Boolean(finalized.complete);
    hex = String(finalized.hex ?? "");
  }

  const baseName = `${timestamp()}-batch-${String(batchIndex).padStart(3, "0")}`;
  const psbtPath = await writeArtifact(`${baseName}.psbt`, psbt);
  let hexPath = "";
  if (hex) {
    hexPath = await writeArtifact(`${baseName}.hex`, `${hex}\n`);
  }

  const metadata = {
    batchIndex,
    complete,
    destination,
    feeBtc: funded.fee,
    feeRate,
    inputCount: batch.length,
    inputSats: batch.reduce((total, utxo) => total + utxo.amountSats, 0),
    outputPath: {
      hex: hexPath,
      psbt: psbtPath,
    },
    selectedOutpoints: batch.map((utxo) => `${utxo.txid}:${utxo.vout}`),
  };

  if (hex) {
    const accepted = await rpc("testmempoolaccept", [[hex]], walletName).catch(
      (error) => [{ allowed: false, "reject-reason": error.message }],
    );
    metadata.testMempoolAccept = accepted;
    const allowed = accepted?.[0]?.allowed === true;
    if (shouldBroadcast) {
      if (!allowed) {
        throw new Error(
          `Batch ${batchIndex} failed testmempoolaccept: ${
            accepted?.[0]?.["reject-reason"] ?? "unknown reject reason"
          }`,
        );
      }
      metadata.txid = await rpc("sendrawtransaction", [hex], walletName);
    }
  }

  const jsonPath = await writeArtifact(
    `${baseName}.json`,
    `${JSON.stringify(metadata, null, 2)}\n`,
  );
  return { ...metadata, outputPath: { ...metadata.outputPath, json: jsonPath } };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] ?? "plan";
  if (args.help || args.h || command === "help") {
    console.log(usage());
    return;
  }

  if (!["plan", "build", "broadcast"].includes(command)) {
    throw new Error(`Unknown command "${command}".\n\n${usage()}`);
  }

  const source = resolveAddress(args.source ?? DEFAULT_SOURCE);
  const destination = resolveAddress(args.destination ?? DEFAULT_DESTINATION);
  const walletName = String(args.wallet ?? process.env.BITCOIN_RPC_WALLET ?? "");
  const batchSize = integerOption(args.batchSize, DEFAULT_BATCH_SIZE, "batch size");
  const maxBatches = integerOption(args.maxBatches, 1, "max batches");
  const minConfirmations = integerOption(
    args.minConf,
    DEFAULT_MIN_CONFIRMATIONS,
    "min confirmations",
  );
  const feeRate = numberOption(args.feeRate, DEFAULT_FEE_RATE, "fee rate");

  if (batchSize < 1 || batchSize > 500) {
    throw new Error("Batch size must be between 1 and 500 inputs.");
  }
  if (maxBatches < 1) {
    throw new Error("Max batches must be at least 1.");
  }
  if (feeRate <= 0) {
    throw new Error("Fee rate must be greater than 0.");
  }

  assertMainnetAddress(source, "Source");
  assertMainnetAddress(destination, "Destination");

  const allUtxos =
    args.scan && command === "plan"
      ? await scanAddressUtxos({ source })
      : await loadWalletUtxos({ minConfirmations, source, walletName });
  const selectedUtxos =
    args.scan && command === "plan"
      ? sortForConsolidation(allUtxos)
      : sortForConsolidation(spendableUtxos(allUtxos));
  const batchGroups = chunk(selectedUtxos, batchSize);
  const batches = batchGroups.map((batch, index) => ({
    ...estimateBatch(batch, destination, feeRate),
    index: index + 1,
    inputCount: batch.length,
  }));
  const plan = {
    batchSize,
    batches,
    destination,
    feeRate,
    maxBatches,
    minConfirmations,
    source,
    summary: summarizeUtxos(allUtxos, selectedUtxos),
    walletName,
  };

  printPlan(plan);
  await writeArtifact("latest-plan.json", `${JSON.stringify(plan, null, 2)}\n`);

  if (command === "plan") {
    return;
  }

  if (selectedUtxos.length === 0) {
    throw new Error("No usable UTXOs found for this source address.");
  }

  const shouldBroadcast = command === "broadcast";
  if (shouldBroadcast && !args.yes) {
    throw new Error("Broadcast refused. Re-run with --yes after reviewing the plan.");
  }

  const results = [];
  for (const [index, batch] of batchGroups.slice(0, maxBatches).entries()) {
    const estimate = estimateBatch(batch, destination, feeRate);
    if (estimate.outputSats < DUST_SATS) {
      throw new Error(
        `Batch ${index + 1} would produce dust after fees. Lower fee rate or increase batch size.`,
      );
    }
    results.push(
      await buildBatch({
        batch,
        batchIndex: index + 1,
        destination,
        feeRate,
        shouldBroadcast,
        shouldSign: true,
        walletName,
      }),
    );
  }

  console.log("built batches:");
  for (const result of results) {
    console.log(
      `  #${result.batchIndex}: complete=${result.complete} psbt=${result.outputPath.psbt}${
        result.txid ? ` txid=${result.txid}` : ""
      }`,
    );
  }
}

main().catch((error) => {
  console.error(`Stream Console error: ${error.message}`);
  process.exitCode = 1;
});
