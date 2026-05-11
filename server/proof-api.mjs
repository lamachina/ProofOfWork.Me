#!/usr/bin/env node

import http from "node:http";
import net from "node:net";
import { URL } from "node:url";
import bip322 from "bip322-js";
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "@bitcoinerlab/secp256k1";

bitcoin.initEccLib(ecc);
const { Verifier } = bip322;

const HOST = process.env.HOST ?? "127.0.0.1";
const PORT = Number(process.env.PORT ?? 8081);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";
const MEMPOOL_BASE_MAINNET = stripTrailingSlash(process.env.MEMPOOL_BASE ?? "http://127.0.0.1:8080");
const PENDING_MEMPOOL_BASE_MAINNET = stripTrailingSlash(process.env.PENDING_MEMPOOL_BASE ?? "https://mempool.space");
const MEMPOOL_BASE_TESTNET = stripTrailingSlash(process.env.MEMPOOL_BASE_TESTNET ?? "https://mempool.space/testnet");
const MEMPOOL_BASE_TESTNET4 = stripTrailingSlash(process.env.MEMPOOL_BASE_TESTNET4 ?? "https://mempool.space/testnet4");
const ELECTRUM_HOST = process.env.ELECTRUM_HOST ?? "127.0.0.1";
const ELECTRUM_PORT = Number(process.env.ELECTRUM_PORT ?? 50001);
const MAX_REGISTRY_TX_PAGES = Number(process.env.MAX_REGISTRY_TX_PAGES ?? 250);
const MAX_ADDRESS_TX_PAGES = Number(process.env.MAX_ADDRESS_TX_PAGES ?? 50);
const TX_FETCH_CONCURRENCY = Number(process.env.TX_FETCH_CONCURRENCY ?? 8);
const BLOCK_TXID_FETCH_CONCURRENCY = Number(process.env.BLOCK_TXID_FETCH_CONCURRENCY ?? 4);

const PROTOCOL_PREFIX = "pwm1:";
const ID_PROTOCOL_PREFIX = "pwid1:";
const ID_REGISTRATION_PRICE_SATS = 1000;
const ID_MUTATION_PRICE_SATS = 546;
const ID_SALE_AUTH_VERSION = "pwid-sale-v1";
const MAX_ATTACHMENT_BYTES = 60_000;
const ID_REGISTRY_ADDRESSES = {
  livenet: "bc1qfwytlzyr3ym3enz2eutwtjsf9kkf6uqkjydk3e",
};

const NETWORKS = new Set(["livenet", "testnet", "testnet4"]);
const BLOCK_TXID_INDEX_CACHE = new Map();

function stripTrailingSlash(value) {
  return String(value).replace(/\/+$/u, "");
}

function jsonResponse(response, statusCode, payload, cacheControl = "no-store") {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Access-Control-Allow-Headers": "Accept, Authorization, Cache-Control, Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    "Cache-Control": cacheControl,
    "Content-Length": Buffer.byteLength(body),
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(body);
}

function errorResponse(response, statusCode, message, details) {
  jsonResponse(response, statusCode, {
    details,
    error: message,
    ok: false,
  });
}

function networkFromSearch(searchParams) {
  const network = searchParams.get("network") ?? "livenet";
  if (!NETWORKS.has(network)) {
    throw new Error("Unsupported network.");
  }

  return network;
}

function mempoolBase(network) {
  if (network === "testnet4") {
    return MEMPOOL_BASE_TESTNET4;
  }

  if (network === "testnet") {
    return MEMPOOL_BASE_TESTNET;
  }

  return MEMPOOL_BASE_MAINNET;
}

function pendingMempoolBases(network) {
  if (network !== "livenet") {
    return [mempoolBase(network)];
  }

  return [...new Set([MEMPOOL_BASE_MAINNET, PENDING_MEMPOOL_BASE_MAINNET].filter(Boolean))];
}

function registryAddressForNetwork(network) {
  return ID_REGISTRY_ADDRESSES[network] ?? "";
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${url} returned ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }

  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${url} returned ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }

  return response.text();
}

async function fetchBlockTxidIndex(blockHash, network) {
  if (!/^[0-9a-fA-F]{64}$/u.test(blockHash)) {
    return new Map();
  }

  const normalizedHash = blockHash.toLowerCase();
  const cacheKey = `${network}:${normalizedHash}`;
  if (!BLOCK_TXID_INDEX_CACHE.has(cacheKey)) {
    const promise = fetchJson(`${mempoolBase(network)}/api/block/${normalizedHash}/txids`)
      .then((txids) => {
        const index = new Map();
        if (Array.isArray(txids)) {
          txids.forEach((txid, position) => {
            if (typeof txid === "string" && /^[0-9a-fA-F]{64}$/u.test(txid)) {
              index.set(txid.toLowerCase(), position);
            }
          });
        }
        return index;
      })
      .catch((error) => {
        BLOCK_TXID_INDEX_CACHE.delete(cacheKey);
        throw error;
      });
    BLOCK_TXID_INDEX_CACHE.set(cacheKey, promise);
  }

  return BLOCK_TXID_INDEX_CACHE.get(cacheKey);
}

async function fetchAddressTransactionsPage(address, network, path) {
  const transactions = await fetchJson(`${mempoolBase(network)}/api/address/${address}/${path}`);
  return Array.isArray(transactions) ? transactions : [];
}

async function fetchAddressTransactionsPageFromBase(baseUrl, address, path) {
  const transactions = await fetchJson(`${baseUrl}/api/address/${address}/${path}`);
  return Array.isArray(transactions) ? transactions : [];
}

async function fetchAddressMempoolTransactions(address, network) {
  const pages = await Promise.allSettled(
    pendingMempoolBases(network).map((baseUrl) => fetchAddressTransactionsPageFromBase(baseUrl, address, "txs/mempool")),
  );

  return dedupeTransactions(pages.flatMap((page) => (page.status === "fulfilled" ? page.value : [])));
}

function bitcoinNetwork(network) {
  return network === "livenet" ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
}

function isValidBitcoinAddress(address, network) {
  try {
    bitcoin.address.toOutputScript(address, bitcoinNetwork(network));
    return true;
  } catch {
    return false;
  }
}

function scriptHashForAddress(address, network) {
  const script = bitcoin.address.toOutputScript(address, bitcoinNetwork(network));
  return Buffer.from(bitcoin.crypto.sha256(script)).reverse().toString("hex");
}

function electrumRequest(method, params) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: ELECTRUM_HOST, port: ELECTRUM_PORT });
    const requestId = Date.now();
    let settled = false;
    let buffer = "";

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      reject(new Error(`Electrum request timed out: ${method}`));
    }, 30_000);

    socket.on("connect", () => {
      socket.write(`${JSON.stringify({ id: requestId, method, params })}\n`);
    });

    socket.on("data", (data) => {
      buffer += data.toString("utf8");
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex === -1 || settled) {
        return;
      }

      const line = buffer.slice(0, newlineIndex);
      settled = true;
      clearTimeout(timer);
      socket.end();

      try {
        const parsed = JSON.parse(line);
        if (parsed.error) {
          reject(new Error(parsed.error.message ?? `Electrum error for ${method}`));
          return;
        }

        resolve(parsed.result);
      } catch (error) {
        reject(error);
      }
    });

    socket.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = Array.from({ length: items.length });
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function fetchTransaction(txid, network) {
  return fetchJson(`${mempoolBase(network)}/api/tx/${txid}`);
}

async function fetchTransactionFromBase(baseUrl, txid) {
  const response = await fetch(`${baseUrl}/api/tx/${txid}`);
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Transaction lookup returned ${response.status}`);
  }

  return response.json();
}

async function fetchTransactionWithPendingFallback(txid, network) {
  for (const baseUrl of pendingMempoolBases(network)) {
    const tx = await fetchTransactionFromBase(baseUrl, txid).catch(() => null);
    if (tx) {
      return tx;
    }
  }

  return null;
}

async function fetchAddressTransactionsFromElectrum(address, network) {
  const scripthash = scriptHashForAddress(address, network);
  const history = await electrumRequest("blockchain.scripthash.get_history", [scripthash]);
  const entries = Array.isArray(history) ? history : [];
  const txids = [
    ...new Set(
      entries
        .map((entry) => entry?.tx_hash)
        .filter((txid) => typeof txid === "string" && /^[0-9a-fA-F]{64}$/u.test(txid))
        .map((txid) => txid.toLowerCase()),
    ),
  ];

  const txs = await mapWithConcurrency(txids, TX_FETCH_CONCURRENCY, async (txid) => {
    try {
      return await fetchTransaction(txid, network);
    } catch {
      return null;
    }
  });

  return dedupeTransactions(txs.filter(Boolean));
}

function transactionTxid(tx) {
  return typeof tx.txid === "string" && /^[0-9a-fA-F]{64}$/u.test(tx.txid) ? tx.txid.toLowerCase() : "";
}

function transactionConfirmed(tx) {
  return Boolean(tx.status?.confirmed);
}

function transactionBlockHash(tx) {
  const blockHash = tx.status?.block_hash;
  return typeof blockHash === "string" && /^[0-9a-fA-F]{64}$/u.test(blockHash) ? blockHash.toLowerCase() : "";
}

function transactionBlockHeight(tx) {
  const height = tx.status?.block_height;
  return Number.isSafeInteger(height) && height >= 0 ? height : undefined;
}

function transactionBlockIndex(tx) {
  const index = tx._powBlockIndex ?? tx.status?.block_index ?? tx.status?.block_tx_index;
  return Number.isSafeInteger(index) && index >= 0 ? index : undefined;
}

async function annotateBlockOrder(txs, network) {
  const blockCounts = new Map();
  for (const tx of txs) {
    if (!transactionConfirmed(tx)) {
      continue;
    }

    const blockHash = transactionBlockHash(tx);
    if (blockHash) {
      blockCounts.set(blockHash, (blockCounts.get(blockHash) ?? 0) + 1);
    }
  }

  const blockHashes = [...blockCounts].filter(([, count]) => count > 1).map(([blockHash]) => blockHash);

  if (blockHashes.length === 0) {
    return txs;
  }

  const blockIndexes = new Map();
  await mapWithConcurrency(blockHashes, BLOCK_TXID_FETCH_CONCURRENCY, async (blockHash) => {
    const index = await fetchBlockTxidIndex(blockHash, network).catch(() => null);
    if (index) {
      blockIndexes.set(blockHash, index);
    }
  });

  if (blockIndexes.size === 0) {
    return txs;
  }

  return txs.map((tx) => {
    const txid = transactionTxid(tx);
    const blockHash = transactionBlockHash(tx);
    const index = blockIndexes.get(blockHash)?.get(txid);
    return Number.isSafeInteger(index) ? { ...tx, _powBlockIndex: index } : tx;
  });
}

function oldestConfirmedTxid(txs) {
  const confirmedTxs = txs.filter(transactionConfirmed);
  return confirmedTxs.length > 0 ? transactionTxid(confirmedTxs[confirmedTxs.length - 1]) : "";
}

function dedupeTransactions(txs) {
  const merged = new Map();

  for (const tx of txs) {
    const txid = transactionTxid(tx);
    if (!txid) {
      continue;
    }

    const current = merged.get(txid);
    if (!current || (transactionConfirmed(tx) && !transactionConfirmed(current))) {
      merged.set(txid, tx);
    }
  }

  return [...merged.values()];
}

async function fetchAddressTransactionsViaMempoolPagination(address, network, maxPages = MAX_ADDRESS_TX_PAGES) {
  const recentTxs = await fetchAddressTransactionsPage(address, network, "txs");
  const mempoolTxs = await fetchAddressMempoolTransactions(address, network).catch(() => []);

  let chainPage = [];
  try {
    chainPage = await fetchAddressTransactionsPage(address, network, "txs/chain");
  } catch {
    chainPage = recentTxs.filter(transactionConfirmed);
  }

  if (chainPage.length === 0) {
    chainPage = recentTxs.filter(transactionConfirmed);
  }

  const chainTxs = [...chainPage];
  const cursors = new Set();
  let cursor = oldestConfirmedTxid(chainPage);

  for (let page = 0; cursor && page < maxPages; page += 1) {
    if (cursors.has(cursor)) {
      break;
    }

    cursors.add(cursor);
    let nextPage = [];
    try {
      nextPage = await fetchAddressTransactionsPage(address, network, `txs/chain/${cursor}`);
    } catch {
      break;
    }

    if (nextPage.length === 0) {
      break;
    }

    chainTxs.push(...nextPage);
    cursor = oldestConfirmedTxid(nextPage);
  }

  return dedupeTransactions([...chainTxs, ...mempoolTxs, ...recentTxs]);
}

async function fetchAddressTransactions(address, network, maxPages = MAX_ADDRESS_TX_PAGES) {
  if (network === "livenet" && ELECTRUM_HOST && ELECTRUM_PORT) {
    try {
      const [historyTxs, mempoolTxs] = await Promise.all([
        fetchAddressTransactionsFromElectrum(address, network),
        fetchAddressMempoolTransactions(address, network).catch(() => []),
      ]);

      return dedupeTransactions([...historyTxs, ...mempoolTxs]);
    } catch {
      return fetchAddressTransactionsViaMempoolPagination(address, network, maxPages);
    }
  }

  return fetchAddressTransactionsViaMempoolPagination(address, network, maxPages);
}

async function fetchRegistryTransactions(registryAddress, network) {
  const txs = await fetchAddressTransactions(registryAddress, network, MAX_REGISTRY_TX_PAGES);
  return annotateBlockOrder(txs, network);
}

function decodeHex(hex) {
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/u.test(hex)) {
    return "";
  }

  return Buffer.from(hex, "hex").toString("utf8");
}

function decodedOpReturnMessages(vout) {
  return vout
    .filter((output) => output.scriptpubkey_type === "op_return")
    .map((output) => String(output.scriptpubkey_asm ?? ""))
    .map((asm) =>
      asm
        .split(" ")
        .slice(1)
        .filter((token) => /^[0-9a-fA-F]+$/u.test(token))
        .map(decodeHex)
        .join(""),
    )
    .filter(Boolean);
}

function decodedProtocolMessages(vout, prefix) {
  return decodedOpReturnMessages(vout).filter((message) => message.startsWith(prefix));
}

function firstProtocolOutputIndex(vout) {
  return vout.findIndex((output) => {
    if (output.scriptpubkey_type !== "op_return") {
      return false;
    }

    return decodedProtocolMessages([output], PROTOCOL_PREFIX).length > 0;
  });
}

function firstIdProtocolOutputIndex(vout) {
  return vout.findIndex((output) => {
    if (output.scriptpubkey_type !== "op_return") {
      return false;
    }

    return decodedProtocolMessages([output], ID_PROTOCOL_PREFIX).length > 0;
  });
}

function base64FromBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
}

function base64UrlDecodeBytes(value) {
  if (!/^[A-Za-z0-9_-]*$/u.test(value)) {
    throw new Error("Invalid base64url data.");
  }

  return Buffer.from(base64FromBase64Url(value), "base64");
}

function decodeTextBase64Url(value) {
  return base64UrlDecodeBytes(value).toString("utf8");
}

function normalizeSubject(value) {
  return String(value).trim().replace(/\s+/gu, " ").slice(0, 180);
}

function sha256Hex(bytes) {
  return Buffer.from(bitcoin.crypto.sha256(Buffer.from(bytes))).toString("hex");
}

function normalizeAttachmentName(name) {
  return name.trim().replace(/\s+/gu, " ").slice(0, 120) || "attachment";
}

function normalizeAttachmentMime(mime) {
  return mime.trim().slice(0, 120) || "application/octet-stream";
}

function parseAttachmentPayload(payload, current) {
  const parts = payload.split(":");
  if (parts.length !== 7) {
    return current;
  }

  const [, mimeEncoded, nameEncoded, sizeText, sha256, partText, chunk] = parts;
  const size = Number(sizeText);
  const part = partText.match(/^(\d+)\/(\d+)$/u);

  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_ATTACHMENT_BYTES || !/^[0-9a-f]{64}$/iu.test(sha256) || !part) {
    return current;
  }

  const index = Number(part[1]);
  const total = Number(part[2]);
  if (!Number.isSafeInteger(index) || !Number.isSafeInteger(total) || total < 1 || index < 0 || index >= total) {
    return current;
  }

  let mime = "";
  let name = "";
  try {
    mime = normalizeAttachmentMime(decodeTextBase64Url(mimeEncoded));
    name = normalizeAttachmentName(decodeTextBase64Url(nameEncoded));
  } catch {
    return current;
  }

  const accumulator =
    current && current.mime === mime && current.name === name && current.size === size && current.sha256 === sha256.toLowerCase() && current.total === total
      ? current
      : {
          chunks: Array.from({ length: total }, () => ""),
          mime,
          name,
          sha256: sha256.toLowerCase(),
          size,
          total,
        };

  accumulator.chunks[index] = chunk;
  return accumulator;
}

function attachmentFromAccumulator(accumulator) {
  if (!accumulator || accumulator.chunks.some((chunk) => !chunk)) {
    return undefined;
  }

  const data = accumulator.chunks.join("");
  try {
    const bytes = base64UrlDecodeBytes(data);
    if (bytes.byteLength !== accumulator.size || sha256Hex(bytes) !== accumulator.sha256) {
      return undefined;
    }
  } catch {
    return undefined;
  }

  return {
    data,
    mime: accumulator.mime,
    name: accumulator.name,
    sha256: accumulator.sha256,
    size: accumulator.size,
  };
}

function extractProtocolMemo(vout) {
  const decodedMessages = decodedOpReturnMessages(vout);
  let replyTo = "";
  let parentTxid;
  let attachmentAccumulator;
  let subject = "";
  const chunks = [];

  for (const decodedMessage of decodedMessages) {
    if (!decodedMessage.startsWith(PROTOCOL_PREFIX)) {
      continue;
    }

    const payload = decodedMessage.slice(PROTOCOL_PREFIX.length);
    if (payload.startsWith("f:")) {
      replyTo = payload.slice(2);
      continue;
    }

    if (payload.startsWith("s:")) {
      try {
        subject = normalizeSubject(decodeTextBase64Url(payload.slice(2)));
      } catch {
        // Ignore malformed optional subjects while still allowing body/attachments through.
      }
      continue;
    }

    const reply = payload.match(/^r:([0-9a-fA-F]{64})$/u);
    if (reply) {
      parentTxid = reply[1].toLowerCase();
      continue;
    }

    if (payload.startsWith("m:")) {
      chunks.push(payload.slice(2));
      continue;
    }

    if (payload.startsWith("a:")) {
      attachmentAccumulator = parseAttachmentPayload(payload, attachmentAccumulator);
    }
  }

  if (chunks.length === 0 && !subject && !attachmentAccumulator) {
    return null;
  }

  const protocolMessage = {
    memo: chunks.join(""),
  };

  if (replyTo) {
    protocolMessage.replyTo = replyTo;
  }

  if (parentTxid) {
    protocolMessage.parentTxid = parentTxid;
  }

  if (subject) {
    protocolMessage.subject = subject;
  }

  const attachment = attachmentFromAccumulator(attachmentAccumulator);
  if (attachment) {
    protocolMessage.attachment = attachment;
  }

  return protocolMessage;
}

function receivedPaymentAmount(vout, address) {
  const protocolIndex = firstProtocolOutputIndex(vout);
  const amount = vout.reduce((total, output, index) => {
    if (output.scriptpubkey_address !== address || typeof output.value !== "number") {
      return total;
    }

    return protocolIndex === -1 || index < protocolIndex ? total + output.value : total;
  }, 0);

  if (amount > 0) {
    return amount;
  }

  if (protocolIndex !== -1) {
    return 0;
  }

  const fallbackOutput = vout.find((output) => output.scriptpubkey_address === address && typeof output.value === "number");
  return typeof fallbackOutput?.value === "number" ? fallbackOutput.value : 0;
}

function protocolPaymentOutputs(vout) {
  const protocolIndex = firstProtocolOutputIndex(vout);
  if (protocolIndex === -1) {
    return [];
  }

  return vout.flatMap((output, index) => {
    if (
      index >= protocolIndex ||
      output.scriptpubkey_type === "op_return" ||
      typeof output.scriptpubkey_address !== "string" ||
      typeof output.value !== "number" ||
      output.value <= 0
    ) {
      return [];
    }

    return [
      {
        address: output.scriptpubkey_address,
        amountSats: output.value,
        display: output.scriptpubkey_address,
      },
    ];
  });
}

function inputAddresses(vin) {
  return vin
    .map((input) => input?.prevout?.scriptpubkey_address)
    .filter((address) => typeof address === "string" && address.length > 0);
}

function senderAddress(vin, targetAddress) {
  const addresses = inputAddresses(vin);
  return addresses.find((inputAddress) => inputAddress !== targetAddress) ?? addresses[0] ?? "Unknown";
}

function registryPaymentAmount(vout, registryAddress) {
  const protocolIndex = firstIdProtocolOutputIndex(vout);
  return vout.reduce((total, output, index) => {
    if (
      output.scriptpubkey_address === registryAddress &&
      typeof output.value === "number" &&
      output.value > 0 &&
      (protocolIndex === -1 || index < protocolIndex)
    ) {
      return total + output.value;
    }

    return total;
  }, 0);
}

function idEventMinimumPaymentSats(kind) {
  return kind === "register" ? ID_REGISTRATION_PRICE_SATS : ID_MUTATION_PRICE_SATS;
}

function paymentAmountBeforeIdProtocol(vout, address) {
  const protocolIndex = firstIdProtocolOutputIndex(vout);
  return vout.reduce((total, output, index) => {
    if (
      output.scriptpubkey_address === address &&
      typeof output.value === "number" &&
      output.value > 0 &&
      (protocolIndex === -1 || index < protocolIndex)
    ) {
      return total + output.value;
    }

    return total;
  }, 0);
}

function normalizePowId(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^@/u, "")
    .replace(/@proofofwork\.me$/u, "")
    .trim();
}

function parseIdRegistrationPayload(payload, network) {
  let rawId = "";
  let ownerAddress = "";
  let receiveAddress = "";
  let pgpEncoded = "";

  if (payload.startsWith("r2:")) {
    const parts = payload.split(":");
    if (parts.length < 4 || parts.length > 5) {
      return null;
    }

    const [, idEncoded, owner, receiver, pgp] = parts;
    try {
      rawId = decodeTextBase64Url(idEncoded);
    } catch {
      return null;
    }

    ownerAddress = owner;
    receiveAddress = receiver;
    pgpEncoded = pgp ?? "";
  } else if (payload.startsWith("r:")) {
    const parts = payload.split(":");
    if (parts.length < 4 || parts.length > 5) {
      return null;
    }

    const [, id, owner, receiver, pgp] = parts;
    rawId = id;
    ownerAddress = owner;
    receiveAddress = receiver;
    pgpEncoded = pgp ?? "";
  } else {
    return null;
  }

  const id = normalizePowId(rawId);
  if (!id || !isValidBitcoinAddress(ownerAddress, network) || !isValidBitcoinAddress(receiveAddress, network)) {
    return null;
  }

  let pgpKey = "";
  if (pgpEncoded) {
    try {
      pgpKey = decodeTextBase64Url(pgpEncoded).trim();
    } catch {
      return null;
    }
  }

  return {
    id,
    ownerAddress,
    pgpKey,
    receiveAddress,
  };
}

function parseIdReceiverUpdatePayload(payload, network) {
  if (!payload.startsWith("u:")) {
    return null;
  }

  const parts = payload.split(":");
  if (parts.length !== 3) {
    return null;
  }

  const [, idEncoded, receiver] = parts;
  let rawId = "";
  try {
    rawId = decodeTextBase64Url(idEncoded);
  } catch {
    return null;
  }

  const id = normalizePowId(rawId);
  if (!id || !isValidBitcoinAddress(receiver, network)) {
    return null;
  }

  return {
    id,
    receiveAddress: receiver,
  };
}

function parseIdTransferPayload(payload, network) {
  if (!payload.startsWith("t:")) {
    return null;
  }

  const parts = payload.split(":");
  if (parts.length < 3 || parts.length > 4) {
    return null;
  }

  const [, idEncoded, owner, receiver] = parts;
  let rawId = "";
  try {
    rawId = decodeTextBase64Url(idEncoded);
  } catch {
    return null;
  }

  const receiveAddress = receiver?.trim() || owner;
  const id = normalizePowId(rawId);
  if (!id || !isValidBitcoinAddress(owner, network) || !isValidBitcoinAddress(receiveAddress, network)) {
    return null;
  }

  return {
    id,
    ownerAddress: owner,
    receiveAddress,
  };
}

function saleAuthorizationDraft({ buyerAddress, expiresAt, id, nonce, priceSats, receiveAddress, sellerAddress }) {
  return {
    buyerAddress: buyerAddress?.trim() || undefined,
    expiresAt: expiresAt?.trim() || undefined,
    id: normalizePowId(id),
    nonce,
    priceSats: Math.floor(priceSats),
    receiveAddress: receiveAddress?.trim() || undefined,
    sellerAddress: sellerAddress.trim(),
    version: ID_SALE_AUTH_VERSION,
  };
}

function saleAuthorizationMessage(authorization) {
  return [
    "ProofOfWork.Me ID Sale",
    `version:${authorization.version}`,
    `id:${normalizePowId(authorization.id)}@proofofwork.me`,
    `seller:${authorization.sellerAddress}`,
    `priceSats:${Math.floor(authorization.priceSats)}`,
    `buyer:${authorization.buyerAddress || "*"}`,
    `receiver:${authorization.receiveAddress || "*"}`,
    `nonce:${authorization.nonce}`,
    `expiresAt:${authorization.expiresAt || ""}`,
  ].join("\n");
}

function parseSaleAuthorizationJson(value, network) {
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Sale authorization must be a JSON object.");
  }

  const id = normalizePowId(typeof parsed.id === "string" ? parsed.id : "");
  const sellerAddress = typeof parsed.sellerAddress === "string" ? parsed.sellerAddress.trim() : "";
  const buyerAddress = typeof parsed.buyerAddress === "string" ? parsed.buyerAddress.trim() : "";
  const receiveAddress = typeof parsed.receiveAddress === "string" ? parsed.receiveAddress.trim() : "";
  const signature = typeof parsed.signature === "string" ? parsed.signature.trim() : "";
  const nonce = typeof parsed.nonce === "string" ? parsed.nonce.trim() : "";
  const expiresAt = typeof parsed.expiresAt === "string" ? parsed.expiresAt.trim() : "";
  const priceSats = typeof parsed.priceSats === "number" ? Math.floor(parsed.priceSats) : Number.NaN;

  if (parsed.version !== ID_SALE_AUTH_VERSION || !id || !isValidBitcoinAddress(sellerAddress, network)) {
    throw new Error("Sale authorization is invalid.");
  }

  if (buyerAddress && !isValidBitcoinAddress(buyerAddress, network)) {
    throw new Error("Sale buyer address is invalid.");
  }

  if (receiveAddress && !isValidBitcoinAddress(receiveAddress, network)) {
    throw new Error("Sale receive address is invalid.");
  }

  if (!Number.isSafeInteger(priceSats) || priceSats < 0 || !nonce || nonce.length > 160) {
    throw new Error("Sale authorization terms are invalid.");
  }

  if (expiresAt && Number.isNaN(Date.parse(expiresAt))) {
    throw new Error("Sale authorization expiry is invalid.");
  }

  return {
    ...saleAuthorizationDraft({
      buyerAddress,
      expiresAt,
      id,
      nonce,
      priceSats,
      receiveAddress,
      sellerAddress,
    }),
    signature,
  };
}

function saleAuthorizationMessageDraft(authorization) {
  return saleAuthorizationDraft(authorization);
}

function saleAuthorizationVerified(authorization) {
  if (!authorization.signature) {
    return false;
  }

  try {
    return Verifier.verifySignature(
      authorization.sellerAddress,
      saleAuthorizationMessage(saleAuthorizationMessageDraft(authorization)),
      authorization.signature,
    );
  } catch {
    return false;
  }
}

function saleAuthorizationTermsMatch(left, right) {
  return JSON.stringify(saleAuthorizationDraft(left)) === JSON.stringify(saleAuthorizationDraft(right));
}

function findMatchingActiveListing(listings, authorization, currentOwnerAddress) {
  for (const listing of listings.values()) {
    if (
      listing.id === authorization.id &&
      listing.sellerAddress === authorization.sellerAddress &&
      listing.sellerAddress === currentOwnerAddress &&
      saleAuthorizationTermsMatch(listing.saleAuthorization, authorization)
    ) {
      return listing;
    }
  }

  return undefined;
}

function saleAuthorizationExpired(authorization, eventCreatedAt) {
  if (!authorization.expiresAt) {
    return false;
  }

  return Date.parse(eventCreatedAt) > Date.parse(authorization.expiresAt);
}

function compareRegistryEventOrder(left, right) {
  if (left.confirmed && right.confirmed) {
    const leftHeight = Number.isSafeInteger(left.blockHeight) ? left.blockHeight : Number.POSITIVE_INFINITY;
    const rightHeight = Number.isSafeInteger(right.blockHeight) ? right.blockHeight : Number.POSITIVE_INFINITY;
    if (leftHeight !== rightHeight) {
      return leftHeight - rightHeight;
    }

    const leftIndex = Number.isSafeInteger(left.blockIndex) ? left.blockIndex : Number.POSITIVE_INFINITY;
    const rightIndex = Number.isSafeInteger(right.blockIndex) ? right.blockIndex : Number.POSITIVE_INFINITY;
    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }
  }

  return Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.txid.localeCompare(right.txid);
}

function parseIdMarketplaceTransferPayload(payload, network) {
  if (!payload.startsWith("buy2:")) {
    return null;
  }

  const parts = payload.split(":");
  if (parts.length < 3 || parts.length > 4) {
    return null;
  }

  const [, authorizationEncoded, owner, receiver] = parts;
  let authorization;
  try {
    authorization = parseSaleAuthorizationJson(decodeTextBase64Url(authorizationEncoded), network);
  } catch {
    return null;
  }

  const receiveAddress = receiver?.trim() || owner;
  if (!isValidBitcoinAddress(owner, network) || !isValidBitcoinAddress(receiveAddress, network)) {
    return null;
  }

  if (authorization.buyerAddress && authorization.buyerAddress !== owner) {
    return null;
  }

  if (authorization.receiveAddress && authorization.receiveAddress !== receiveAddress) {
    return null;
  }

  return {
    id: authorization.id,
    ownerAddress: owner,
    priceSats: authorization.priceSats,
    receiveAddress,
    saleAuthorization: authorization,
    sellerAddress: authorization.sellerAddress,
  };
}

function parseIdListingPayload(payload, network) {
  if (!payload.startsWith("list2:")) {
    return null;
  }

  const parts = payload.split(":");
  if (parts.length !== 2) {
    return null;
  }

  const [, authorizationEncoded] = parts;
  let authorization;
  try {
    authorization = parseSaleAuthorizationJson(decodeTextBase64Url(authorizationEncoded), network);
  } catch {
    return null;
  }

  return {
    id: authorization.id,
    priceSats: authorization.priceSats,
    saleAuthorization: authorization,
    sellerAddress: authorization.sellerAddress,
  };
}

function parseIdDelistingPayload(payload) {
  if (!payload.startsWith("delist2:")) {
    return null;
  }

  const parts = payload.split(":");
  if (parts.length !== 2 || !/^[0-9a-fA-F]{64}$/u.test(parts[1])) {
    return null;
  }

  return {
    listingId: parts[1].toLowerCase(),
  };
}

function parseIdEventPayload(payload, network) {
  const registration = parseIdRegistrationPayload(payload, network);
  if (registration) {
    return {
      kind: "register",
      ...registration,
    };
  }

  const update = parseIdReceiverUpdatePayload(payload, network);
  if (update) {
    return {
      kind: "update",
      ...update,
    };
  }

  const transfer = parseIdTransferPayload(payload, network);
  if (transfer) {
    return {
      kind: "transfer",
      ...transfer,
    };
  }

  const marketplaceTransfer = parseIdMarketplaceTransferPayload(payload, network);
  if (marketplaceTransfer) {
    return {
      kind: "marketTransfer",
      ...marketplaceTransfer,
    };
  }

  const listing = parseIdListingPayload(payload, network);
  if (listing) {
    return {
      kind: "list",
      ...listing,
    };
  }

  const delisting = parseIdDelistingPayload(payload);
  if (delisting) {
    return {
      kind: "delist",
      ...delisting,
    };
  }

  return null;
}

function idRegistryStateFromTransactions(txs, registryAddress, network) {
  const events = txs.flatMap((tx) => {
    const vin = Array.isArray(tx.vin) ? tx.vin : [];
    const vout = Array.isArray(tx.vout) ? tx.vout : [];
    const amount = registryPaymentAmount(vout, registryAddress);
    const txid = transactionTxid(tx);

    if (!txid || amount <= 0) {
      return [];
    }

    const eventMessage = decodedProtocolMessages(vout, ID_PROTOCOL_PREFIX)
      .map((message) => message.slice(ID_PROTOCOL_PREFIX.length))
      .map((payload) => parseIdEventPayload(payload, network))
      .find(Boolean);
    if (!eventMessage) {
      return [];
    }

    if (amount < idEventMinimumPaymentSats(eventMessage.kind)) {
      return [];
    }

    const blockTime = typeof tx.status?.block_time === "number" ? tx.status.block_time * 1000 : Date.now();
    const baseEvent = {
      amountSats: amount,
      blockHeight: transactionBlockHeight(tx),
      blockIndex: transactionBlockIndex(tx),
      confirmed: transactionConfirmed(tx),
      createdAt: new Date(blockTime).toISOString(),
      inputAddresses: inputAddresses(vin),
      network,
      txid,
    };

    if (eventMessage.kind === "register") {
      return [
        {
          ...baseEvent,
          id: eventMessage.id,
          kind: "register",
          ownerAddress: eventMessage.ownerAddress,
          pgpKey: eventMessage.pgpKey || undefined,
          receiveAddress: eventMessage.receiveAddress,
        },
      ];
    }

    if (eventMessage.kind === "update") {
      return [
        {
          ...baseEvent,
          id: eventMessage.id,
          kind: "update",
          receiveAddress: eventMessage.receiveAddress,
        },
      ];
    }

    if (eventMessage.kind === "marketTransfer") {
      return [
        {
          ...baseEvent,
          id: eventMessage.id,
          kind: "marketTransfer",
          ownerAddress: eventMessage.ownerAddress,
          priceSats: eventMessage.priceSats,
          receiveAddress: eventMessage.receiveAddress,
          saleAuthorization: eventMessage.saleAuthorization,
          sellerAddress: eventMessage.sellerAddress,
          sellerPaymentSats: paymentAmountBeforeIdProtocol(vout, eventMessage.sellerAddress),
        },
      ];
    }

    if (eventMessage.kind === "list") {
      return [
        {
          ...baseEvent,
          id: eventMessage.id,
          kind: "list",
          priceSats: eventMessage.priceSats,
          saleAuthorization: eventMessage.saleAuthorization,
          sellerAddress: eventMessage.sellerAddress,
        },
      ];
    }

    if (eventMessage.kind === "delist") {
      return [
        {
          ...baseEvent,
          kind: "delist",
          listingId: eventMessage.listingId,
        },
      ];
    }

    return [
      {
        ...baseEvent,
        id: eventMessage.id,
        kind: "transfer",
        ownerAddress: eventMessage.ownerAddress,
        receiveAddress: eventMessage.receiveAddress,
      },
    ];
  });

  const confirmedEvents = events
    .filter((event) => event.confirmed)
    .sort(compareRegistryEventOrder);
  const pendingRegistrations = events
    .filter((event) => !event.confirmed && event.kind === "register")
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.txid.localeCompare(right.txid));
  const records = new Map();
  const listings = new Map();

  function invalidateListingsForId(id) {
    for (const [listingId, listing] of listings) {
      if (listing.id === id) {
        listings.delete(listingId);
      }
    }
  }

  for (const event of confirmedEvents) {
    if (event.kind === "register") {
      const current = records.get(event.id);
      if (current) {
        continue;
      }

      records.set(event.id, {
        amountSats: event.amountSats,
        confirmed: true,
        createdAt: event.createdAt,
        id: event.id,
        network: event.network,
        ownerAddress: event.ownerAddress,
        pgpKey: event.pgpKey,
        receiveAddress: event.receiveAddress,
        txid: event.txid,
      });
      continue;
    }

    if (event.kind === "delist") {
      const listing = listings.get(event.listingId);
      const current = listing ? records.get(listing.id) : undefined;
      if (listing && current && event.inputAddresses.includes(current.ownerAddress)) {
        listings.delete(event.listingId);
      }
      continue;
    }

    const current = records.get(event.id);
    if (!current) {
      continue;
    }

    if (event.kind === "marketTransfer") {
      const matchingListing = findMatchingActiveListing(listings, event.saleAuthorization, current.ownerAddress);
      if (
        current.ownerAddress !== event.sellerAddress ||
        event.sellerPaymentSats < event.priceSats ||
        saleAuthorizationExpired(event.saleAuthorization, event.createdAt) ||
        (!matchingListing && !saleAuthorizationVerified(event.saleAuthorization))
      ) {
        continue;
      }

      records.set(event.id, {
        ...current,
        amountSats: event.amountSats,
        createdAt: event.createdAt,
        ownerAddress: event.ownerAddress,
        receiveAddress: event.receiveAddress,
        txid: event.txid,
      });
      invalidateListingsForId(event.id);
      continue;
    }

    if (event.kind === "list") {
      if (
        current.ownerAddress !== event.sellerAddress ||
        !event.inputAddresses.includes(current.ownerAddress) ||
        saleAuthorizationExpired(event.saleAuthorization, event.createdAt)
      ) {
        continue;
      }

      listings.set(event.txid, {
        amountSats: event.amountSats,
        buyerAddress: event.saleAuthorization.buyerAddress,
        confirmed: true,
        createdAt: event.createdAt,
        expiresAt: event.saleAuthorization.expiresAt,
        id: event.id,
        listingId: event.txid,
        network: event.network,
        priceSats: event.priceSats,
        receiveAddress: event.saleAuthorization.receiveAddress,
        saleAuthorization: event.saleAuthorization,
        sellerAddress: event.sellerAddress,
        txid: event.txid,
      });
      continue;
    }

    if (!event.inputAddresses.includes(current.ownerAddress)) {
      continue;
    }

    if (event.kind === "update") {
      records.set(event.id, {
        ...current,
        amountSats: event.amountSats,
        createdAt: event.createdAt,
        receiveAddress: event.receiveAddress,
        txid: event.txid,
      });
      continue;
    }

    records.set(event.id, {
      ...current,
      amountSats: event.amountSats,
      createdAt: event.createdAt,
      ownerAddress: event.ownerAddress,
      receiveAddress: event.receiveAddress,
      txid: event.txid,
    });
    invalidateListingsForId(event.id);
  }

  const accepted = [...records.values()];
  const pendingEvents = events
    .filter((event) => !event.confirmed && event.kind !== "register")
    .flatMap((event) => {
      if (event.kind === "delist") {
        const listing = listings.get(event.listingId);
        const current = listing ? records.get(listing.id) : undefined;
        if (!listing || !current || !event.inputAddresses.includes(current.ownerAddress)) {
          return [];
        }

        return [
          {
            amountSats: event.amountSats,
            createdAt: event.createdAt,
            currentOwnerAddress: current.ownerAddress,
            currentReceiveAddress: current.receiveAddress,
            id: listing.id,
            inputAddresses: event.inputAddresses,
            kind: "delist",
            listingId: event.listingId,
            network: event.network,
            sellerAddress: listing.sellerAddress,
            txid: event.txid,
          },
        ];
      }

      const current = records.get(event.id);
      if (!current) {
        return [];
      }

      if (event.kind === "marketTransfer") {
        const matchingListing = findMatchingActiveListing(listings, event.saleAuthorization, current.ownerAddress);
        if (
          current.ownerAddress !== event.sellerAddress ||
          event.sellerPaymentSats < event.priceSats ||
          saleAuthorizationExpired(event.saleAuthorization, event.createdAt) ||
          (!matchingListing && !saleAuthorizationVerified(event.saleAuthorization))
        ) {
          return [];
        }

        return [
          {
            amountSats: event.amountSats,
            createdAt: event.createdAt,
            currentOwnerAddress: current.ownerAddress,
            currentReceiveAddress: current.receiveAddress,
            id: event.id,
            inputAddresses: event.inputAddresses,
            kind: "marketTransfer",
            network: event.network,
            ownerAddress: event.ownerAddress,
            priceSats: event.priceSats,
            receiveAddress: event.receiveAddress,
            sellerAddress: event.sellerAddress,
            txid: event.txid,
          },
        ];
      }

      if (event.kind === "list") {
        if (
          current.ownerAddress !== event.sellerAddress ||
          !event.inputAddresses.includes(current.ownerAddress) ||
          saleAuthorizationExpired(event.saleAuthorization, event.createdAt)
        ) {
          return [];
        }

        return [
          {
            amountSats: event.amountSats,
            createdAt: event.createdAt,
            currentOwnerAddress: current.ownerAddress,
            currentReceiveAddress: current.receiveAddress,
            id: event.id,
            inputAddresses: event.inputAddresses,
            kind: "list",
            network: event.network,
            priceSats: event.priceSats,
            sellerAddress: event.sellerAddress,
            txid: event.txid,
          },
        ];
      }

      if (!event.inputAddresses.includes(current.ownerAddress)) {
        return [];
      }

      if (event.kind === "update") {
        return [
          {
            amountSats: event.amountSats,
            createdAt: event.createdAt,
            currentOwnerAddress: current.ownerAddress,
            currentReceiveAddress: current.receiveAddress,
            id: event.id,
            inputAddresses: event.inputAddresses,
            kind: "update",
            network: event.network,
            receiveAddress: event.receiveAddress,
            txid: event.txid,
          },
        ];
      }

      return [
        {
          amountSats: event.amountSats,
          createdAt: event.createdAt,
          currentOwnerAddress: current.ownerAddress,
          currentReceiveAddress: current.receiveAddress,
          id: event.id,
          inputAddresses: event.inputAddresses,
          kind: "transfer",
          network: event.network,
          ownerAddress: event.ownerAddress,
          receiveAddress: event.receiveAddress,
          txid: event.txid,
        },
      ];
    })
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.txid.localeCompare(right.txid));

  for (const event of pendingRegistrations) {
    if (!records.has(event.id)) {
      accepted.push({
        amountSats: event.amountSats,
        confirmed: false,
        createdAt: event.createdAt,
        id: event.id,
        network: event.network,
        ownerAddress: event.ownerAddress,
        pgpKey: event.pgpKey,
        receiveAddress: event.receiveAddress,
        txid: event.txid,
      });
    }
  }

  return {
    listings: [...listings.values()].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.txid.localeCompare(right.txid)),
    pendingEvents,
    records: accepted,
  };
}

function idRecordsFromTransactions(txs, registryAddress, network) {
  return idRegistryStateFromTransactions(txs, registryAddress, network).records;
}

function inboxMessagesFromTransactions(txs, address, network) {
  return txs.flatMap((tx) => {
    const vin = Array.isArray(tx.vin) ? tx.vin : [];
    const vout = Array.isArray(tx.vout) ? tx.vout : [];
    const protocolMessage = extractProtocolMemo(vout);
    const amount = receivedPaymentAmount(vout, address);
    const recipients = protocolPaymentOutputs(vout);

    if (!protocolMessage || amount <= 0) {
      return [];
    }

    const blockTime = typeof tx.status?.block_time === "number" ? tx.status.block_time * 1000 : Date.now();
    const sender = senderAddress(vin, address);
    const message = {
      amountSats: amount,
      attachment: protocolMessage.attachment,
      confirmed: transactionConfirmed(tx),
      createdAt: new Date(blockTime).toISOString(),
      from: sender,
      memo: protocolMessage.memo,
      network,
      recipients: recipients.length > 0 ? recipients : undefined,
      replyTo: sender === "Unknown" ? protocolMessage.replyTo ?? "Unknown" : sender,
      subject: protocolMessage.subject,
      to: address,
      txid: transactionTxid(tx),
    };

    if (!message.txid) {
      return [];
    }

    if (protocolMessage.parentTxid) {
      message.parentTxid = protocolMessage.parentTxid;
    }

    return [message];
  });
}

function sentMessagesFromTransactions(txs, address, network) {
  return txs.flatMap((tx) => {
    const vin = Array.isArray(tx.vin) ? tx.vin : [];
    const vout = Array.isArray(tx.vout) ? tx.vout : [];
    if (!inputAddresses(vin).includes(address)) {
      return [];
    }

    const protocolMessage = extractProtocolMemo(vout);
    const recipients = protocolPaymentOutputs(vout);
    const payment = recipients[0];
    const txid = transactionTxid(tx);
    if (!protocolMessage || !payment || !txid) {
      return [];
    }

    const confirmed = transactionConfirmed(tx);
    const blockTime = typeof tx.status?.block_time === "number" ? tx.status.block_time * 1000 : Date.now();
    const createdAt = new Date(blockTime).toISOString();

    return [
      {
        amountSats: recipients.reduce((total, recipient) => total + recipient.amountSats, 0),
        attachment: protocolMessage.attachment,
        confirmedAt: confirmed ? createdAt : undefined,
        createdAt,
        feeRate: 0,
        from: address,
        lastCheckedAt: new Date().toISOString(),
        memo: protocolMessage.memo,
        network,
        parentTxid: protocolMessage.parentTxid,
        recipients,
        replyTo: address,
        subject: protocolMessage.subject,
        status: confirmed ? "confirmed" : "pending",
        to: recipients.length === 1 ? payment.display : `${payment.display} +${recipients.length - 1}`,
        txid,
      },
    ];
  });
}

async function registryPayload(network) {
  const registryAddress = registryAddressForNetwork(network);
  if (!registryAddress) {
    return {
      indexedAt: new Date().toISOString(),
      network,
      records: [],
      registryAddress: "",
      stats: {
        confirmed: 0,
        pending: 0,
        total: 0,
      },
    };
  }

  const txs = await fetchRegistryTransactions(registryAddress, network);
  const { listings, pendingEvents, records } = idRegistryStateFromTransactions(txs, registryAddress, network);
  const confirmed = records.filter((record) => record.confirmed).length;
  const pendingRecords = records.length - confirmed;

  return {
    indexedAt: new Date().toISOString(),
    listings,
    network,
    pendingEvents,
    records,
    registryAddress,
    source: mempoolBase(network),
    stats: {
      confirmed,
      pending: pendingRecords + pendingEvents.length,
      pendingChanges: pendingEvents.length,
      pendingRecords,
      total: records.length,
      transactions: txs.length,
    },
  };
}

async function mailPayload(address, network) {
  const txs = await fetchAddressTransactions(address, network);
  const inboxMessages = inboxMessagesFromTransactions(txs, address, network);
  const sentMessages = sentMessagesFromTransactions(txs, address, network);

  return {
    address,
    inboxMessages,
    indexedAt: new Date().toISOString(),
    network,
    sentMessages,
    source: mempoolBase(network),
    stats: {
      inbox: inboxMessages.filter((message) => message.confirmed).length,
      incoming: inboxMessages.filter((message) => !message.confirmed).length,
      scannedTransactions: txs.length,
      sent: sentMessages.filter((message) => message.status === "confirmed").length,
      outbox: sentMessages.filter((message) => message.status !== "confirmed").length,
    },
  };
}

async function txStatusPayload(txid, network) {
  const tx = await fetchTransactionWithPendingFallback(txid, network);
  if (!tx) {
    return {
      confirmed: false,
      indexedAt: new Date().toISOString(),
      network,
      status: "dropped",
      txid,
    };
  }

  const confirmed = transactionConfirmed(tx);
  return {
    confirmed,
    indexedAt: new Date().toISOString(),
    network,
    status: confirmed ? "confirmed" : "pending",
    txid,
  };
}

async function healthPayload() {
  let tipHeight = null;
  let backend = null;
  try {
    const tip = await fetchText(`${MEMPOOL_BASE_MAINNET}/api/blocks/tip/height`);
    tipHeight = Number(tip);
  } catch {
    tipHeight = null;
  }

  try {
    const info = await fetchJson(`${MEMPOOL_BASE_MAINNET}/api/v1/backend-info`);
    backend = info?.backend ?? null;
  } catch {
    backend = null;
  }

  return {
    backend,
    indexedAt: new Date().toISOString(),
    mempoolBase: MEMPOOL_BASE_MAINNET,
    ok: true,
    service: "proofofwork-op-return-api",
    tipHeight,
  };
}

async function handleRequest(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Headers": "Accept, Authorization, Cache-Control, Content-Type",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Origin": CORS_ORIGIN,
    });
    response.end();
    return;
  }

  if (request.method !== "GET") {
    errorResponse(response, 405, "Method not allowed.");
    return;
  }

  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const pathParts = url.pathname.split("/").filter(Boolean);

  try {
    if (url.pathname === "/health" || url.pathname === "/api/v1/health") {
      jsonResponse(response, 200, await healthPayload(), "no-store");
      return;
    }

    const network = networkFromSearch(url.searchParams);

    if (url.pathname === "/api/v1/registry" || url.pathname === "/api/v1/ids") {
      jsonResponse(response, 200, await registryPayload(network), "public, max-age=15");
      return;
    }

    if (pathParts.length === 4 && pathParts[0] === "api" && pathParts[1] === "v1" && pathParts[2] === "ids") {
      const id = normalizePowId(decodeURIComponent(pathParts[3]));
      const registry = await registryPayload(network);
      const records = registry.records.filter((record) => record.id === id);
      const confirmed = records.find((record) => record.confirmed);
      const pending = records.find((record) => !record.confirmed);
      jsonResponse(response, 200, {
        id,
        indexedAt: registry.indexedAt,
        network,
        record: confirmed ?? pending ?? null,
        routable: Boolean(confirmed),
        status: confirmed ? "confirmed" : pending ? "pending" : "available",
      });
      return;
    }

    if (pathParts.length === 5 && pathParts[0] === "api" && pathParts[1] === "v1" && pathParts[2] === "address" && pathParts[4] === "mail") {
      const address = decodeURIComponent(pathParts[3]);
      if (!isValidBitcoinAddress(address, network)) {
        errorResponse(response, 400, "Invalid address for network.");
        return;
      }

      jsonResponse(response, 200, await mailPayload(address, network), "public, max-age=10");
      return;
    }

    if (pathParts.length === 5 && pathParts[0] === "api" && pathParts[1] === "v1" && pathParts[2] === "tx" && pathParts[4] === "status") {
      const txid = pathParts[3].toLowerCase();
      if (!/^[0-9a-f]{64}$/u.test(txid)) {
        errorResponse(response, 400, "Invalid txid.");
        return;
      }

      jsonResponse(response, 200, await txStatusPayload(txid, network), "no-store");
      return;
    }

    errorResponse(response, 404, "Not found.");
  } catch (error) {
    errorResponse(response, 500, error instanceof Error ? error.message : "Unexpected server error.");
  }
}

const server = http.createServer((request, response) => {
  void handleRequest(request, response);
});

server.listen(PORT, HOST, () => {
  console.log(`ProofOfWork OP_RETURN API listening on http://${HOST}:${PORT}`);
  console.log(`Mainnet mempool source: ${MEMPOOL_BASE_MAINNET}`);
});
