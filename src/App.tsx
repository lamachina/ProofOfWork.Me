import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as bitcoin from "bitcoinjs-lib";
import { Buffer } from "buffer";
import {
  Archive,
  AtSign,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Download,
  FilePenLine,
  FileText,
  GitBranch,
  Inbox,
  LogOut,
  Mail,
  MessageCircle,
  Moon,
  Paperclip,
  PenLine,
  RefreshCw,
  Reply,
  Send,
  Star,
  Sun,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import * as ecc from "@bitcoinerlab/secp256k1";

bitcoin.initEccLib(ecc);

const globalWithBuffer = globalThis as typeof globalThis & { Buffer?: typeof Buffer };
if (!globalWithBuffer.Buffer) {
  globalWithBuffer.Buffer = Buffer;
}

type BitcoinNetwork = "livenet" | "testnet" | "testnet4";
type LegacyBitcoinNetwork = "livenet" | "testnet";
type UniSatChain = "BITCOIN_MAINNET" | "BITCOIN_TESTNET" | "BITCOIN_TESTNET4";
type UniSatEvent = "accountsChanged" | "networkChanged" | "chainChanged";
type StatusTone = "idle" | "good" | "bad";
type Folder = "inbox" | "incoming" | "sent" | "outbox" | "drafts" | "favorites" | "archive" | "files" | "ids";
type SortMode = "value" | "newest" | "oldest" | "thread" | "largest" | "filetype" | "sender";
type FileFilter = "all" | "image" | "pdf" | "document" | "other";
type ThemeMode = "light" | "dark";
type BroadcastStatus = "pending" | "confirmed" | "dropped" | "unknown";

type MailAttachment = {
  name: string;
  mime: string;
  size: number;
  sha256: string;
  data: string;
};

type DraftMessage = {
  network: BitcoinNetwork;
  from: string;
  recipient: string;
  amountSats: number;
  feeRate: number;
  memo: string;
  attachment?: MailAttachment;
  parentTxid?: string;
  updatedAt: string;
};

type MailPreference = {
  archived?: boolean;
  favorite?: boolean;
};

type MailPreferences = Record<string, MailPreference>;

type LocalBackupPayload = {
  app: "ProofOfWork.Me";
  version: 1;
  exportedAt: string;
  data: Record<string, string>;
};

type UnisatWallet = {
  requestAccounts?: () => Promise<string[]>;
  getAccounts?: () => Promise<string[]>;
  getChain?: () => Promise<{ enum?: string; network?: string }>;
  getNetwork?: () => Promise<string>;
  getPublicKey?: () => Promise<string>;
  disconnect?: () => Promise<void>;
  switchChain?: (chain: UniSatChain) => Promise<{ enum?: string; network?: string }>;
  switchNetwork?: (network: LegacyBitcoinNetwork) => Promise<string>;
  on?: (event: UniSatEvent, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: UniSatEvent, listener: (...args: unknown[]) => void) => void;
  sendBitcoin?: (
    toAddress: string,
    satoshis: number,
    options?: {
      feeRate?: number;
      memo?: string;
      memos?: string[];
    },
  ) => Promise<string>;
  signPsbt?: (
    psbtHex: string,
    options?: {
      autoFinalized?: boolean;
      toSignInputs?: Array<{
        index: number;
        address?: string;
        publicKey?: string;
        sighashTypes?: number[];
        disableTweakSigner?: boolean;
        useTweakedSigner?: boolean;
      }>;
    },
  ) => Promise<string>;
  pushPsbt?: (psbtHex: string) => Promise<string>;
};

type SentMessage = {
  txid: string;
  network: BitcoinNetwork;
  from: string;
  to: string;
  amountSats: number;
  feeRate: number;
  memo: string;
  attachment?: MailAttachment;
  status?: BroadcastStatus;
  lastCheckedAt?: string;
  confirmedAt?: string;
  droppedAt?: string;
  replyTo: string;
  parentTxid?: string;
  createdAt: string;
};

type BroadcastCheckResult = {
  from: string;
  network: BitcoinNetwork;
  status?: BroadcastStatus;
  txid: string;
};

type BroadcastCheckSummary = {
  checkedAt: string;
  confirmed: number;
  dropped: number;
  failed: number;
  pending: number;
  results: BroadcastCheckResult[];
};

type InboxMessage = {
  txid: string;
  network: BitcoinNetwork;
  from: string;
  to: string;
  amountSats: number;
  memo: string;
  attachment?: MailAttachment;
  replyTo: string;
  parentTxid?: string;
  confirmed: boolean;
  createdAt: string;
};

type PowIdRecord = {
  id: string;
  ownerAddress: string;
  receiveAddress: string;
  pgpKey?: string;
  txid: string;
  network: BitcoinNetwork;
  amountSats: number;
  confirmed: boolean;
  createdAt: string;
};

type RecipientResolution = {
  displayRecipient: string;
  error?: string;
  id?: string;
  isId: boolean;
  paymentAddress: string;
  record?: PowIdRecord;
};

type MailMessage =
  | (InboxMessage & {
      folder: "inbox";
    })
  | (InboxMessage & {
      folder: "incoming";
    })
  | (SentMessage & {
      folder: "sent";
    });

type ProtocolMessage = {
  memo: string;
  attachment?: MailAttachment;
  parentTxid?: string;
  replyTo?: string;
};

type AttachmentAccumulator = {
  chunks: string[];
  mime: string;
  name: string;
  sha256: string;
  size: number;
  total: number;
};

type MempoolUtxo = {
  txid: string;
  vout: number;
  value: number;
  status?: {
    confirmed?: boolean;
  };
};

type UtxoSelection = {
  selected: MempoolUtxo[];
  feeSats: number;
  changeSats: number;
};

type PowRegistryApiResponse = {
  records?: PowIdRecord[];
};

type PowMailApiResponse = {
  inboxMessages?: InboxMessage[];
  sentMessages?: SentMessage[];
};

type PowTxStatusApiResponse = {
  status?: BroadcastStatus;
};

declare global {
  interface Window {
    unisat?: UnisatWallet;
  }
}

const SENT_KEY = "proofofwork.sent.v5";
const DRAFT_KEY_PREFIX = "proofofwork.draft.v1";
const MAIL_PREFS_KEY = "proofofwork.mailPrefs.v1";
const THEME_KEY = "proofofwork.theme";
const BACKUP_APP = "ProofOfWork.Me";
const BACKUP_VERSION = 1;
const BACKUP_MAX_BYTES = 5 * 1024 * 1024;
const UNISAT_DOWNLOAD_URL = "https://unisat.io/download";
const DISCORD_URL = "https://discord.com/invite/mRA4zbqB";
const GITHUB_URL = "https://github.com/proofofworkme";
const X_URL = "https://x.com/proofofworkme";
const ID_APP_URL = "https://id.proofofwork.me";
const COMPUTER_APP_URL = "https://computer.proofofwork.me";
const POW_API_BASE = (import.meta.env.VITE_POW_API_BASE ?? "").trim().replace(/\/+$/u, "");
const MAX_DATA_CARRIER_BYTES = 100_000;
const MAX_ATTACHMENT_BYTES = 60_000;
const MAX_REGISTRY_TX_PAGES = 100;
const PROTOCOL_PREFIX = "pwm1:";

// Canonical Phase 1 ProofOfWork ID registry.
// Do not fork this address/protocol for id.proofofwork.me; the launch surface
// must use the same registry as the full mail app so first-confirmed-wins stays global.
const ID_PROTOCOL_PREFIX = "pwid1:";
const ID_REGISTRATION_PRICE_SATS = 1000;
const ID_REGISTRY_ADDRESSES: Partial<Record<BitcoinNetwork, string>> = {
  livenet: "bc1qfwytlzyr3ym3enz2eutwtjsf9kkf6uqkjydk3e",
};
const ESTIMATED_INPUT_VBYTES = 160;
const DUST_SATS = 546;
const DEFAULT_AMOUNT_SATS = 546;
const DEFAULT_FEE_RATE = 0.1;
const DEFAULT_MEMO = "";

function isIdLaunchRoute() {
  if (import.meta.env.VITE_ID_LAUNCH_ONLY === "1") {
    return true;
  }

  const hostname = window.location.hostname.toLowerCase();
  // Production subdomain: id.proofofwork.me. Local/dev preview: ?id-launch=1.
  return hostname === "id.proofofwork.me" || window.location.search.includes("id-launch=1");
}

function isLandingRoute() {
  if (import.meta.env.VITE_LANDING_ONLY === "1") {
    return true;
  }

  const hostname = window.location.hostname.toLowerCase();
  // Production front door: proofofwork.me. Local/dev preview: ?landing=1.
  return hostname === "proofofwork.me" || hostname === "www.proofofwork.me" || window.location.search.includes("landing=1");
}

function loadTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isBackupStorageKey(key: string) {
  return key === SENT_KEY || key === MAIL_PREFS_KEY || key === THEME_KEY || key.startsWith(`${DRAFT_KEY_PREFIX}:`);
}

function validateBackupValue(key: string, value: string) {
  if (key === THEME_KEY) {
    return value === "light" || value === "dark";
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (key === SENT_KEY) {
      return Array.isArray(parsed);
    }

    return isPlainRecord(parsed);
  } catch {
    return false;
  }
}

function collectBackupData() {
  const data: Record<string, string> = {};

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || !isBackupStorageKey(key)) {
      continue;
    }

    const value = localStorage.getItem(key);
    if (typeof value === "string" && validateBackupValue(key, value)) {
      data[key] = value;
    }
  }

  return data;
}

function backupFileName() {
  return `proofofwork-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

function parseBackup(text: string) {
  const parsed = JSON.parse(text) as unknown;
  if (!isPlainRecord(parsed) || parsed.app !== BACKUP_APP || parsed.version !== BACKUP_VERSION || !isPlainRecord(parsed.data)) {
    throw new Error("Backup file is not a supported ProofOfWork.Me backup.");
  }

  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (!isBackupStorageKey(key)) {
      continue;
    }

    if (typeof value !== "string" || !validateBackupValue(key, value)) {
      throw new Error(`Backup contains invalid data for ${key}.`);
    }

    data[key] = value;
  }

  if (Object.keys(data).length === 0) {
    throw new Error("Backup does not contain any supported local app data.");
  }

  return data;
}

function backupDataSummary(data: Record<string, string>) {
  const details: string[] = [];

  if (data[SENT_KEY]) {
    try {
      const sent = JSON.parse(data[SENT_KEY]) as unknown;
      if (Array.isArray(sent)) {
        details.push(`${sent.length} sent/outbox message${sent.length === 1 ? "" : "s"}`);
      }
    } catch {
      // Already validated before this helper is used.
    }
  }

  if (data[MAIL_PREFS_KEY]) {
    try {
      const preferences = JSON.parse(data[MAIL_PREFS_KEY]) as unknown;
      if (isPlainRecord(preferences)) {
        const count = Object.keys(preferences).length;
        details.push(`${count} mail preference${count === 1 ? "" : "s"}`);
      }
    } catch {
      // Already validated before this helper is used.
    }
  }

  const draftCount = Object.keys(data).filter((key) => key.startsWith(`${DRAFT_KEY_PREFIX}:`)).length;
  if (draftCount > 0) {
    details.push(`${draftCount} draft${draftCount === 1 ? "" : "s"}`);
  }

  if (data[THEME_KEY]) {
    details.push(`${data[THEME_KEY]} theme`);
  }

  return details.join(", ");
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sha256Hex(bytes: Uint8Array) {
  return bytesToHex(bitcoin.crypto.sha256(Buffer.from(bytes)));
}

function base64UrlFromBase64(value: string) {
  return value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function base64FromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
}

function base64UrlEncodeBytes(bytes: Uint8Array) {
  return base64UrlFromBase64(Buffer.from(bytes).toString("base64"));
}

function base64UrlDecodeBytes(value: string) {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) {
    throw new Error("Invalid base64url data.");
  }

  return new Uint8Array(Buffer.from(base64FromBase64Url(value), "base64"));
}

function encodeTextBase64Url(value: string) {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function decodeTextBase64Url(value: string) {
  return new TextDecoder("utf-8", { fatal: false }).decode(base64UrlDecodeBytes(value));
}

function chunkAscii(value: string, maxBytes: number) {
  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += maxBytes) {
    chunks.push(value.slice(index, index + maxBytes));
  }

  return chunks.length ? chunks : [""];
}

function chunkUtf8(value: string, maxBytes: number) {
  const chunks: string[] = [];
  let current = "";

  for (const character of value) {
    const next = `${current}${character}`;
    if (byteLength(next) > maxBytes) {
      chunks.push(current);
      current = character;
      continue;
    }

    current = next;
  }

  if (current || chunks.length === 0) {
    chunks.push(current);
  }

  return chunks;
}

function opReturnScriptForPayload(payload: string) {
  const output = bitcoin.payments.embed({ data: [Buffer.from(payload, "utf8")] }).output;
  if (!output) {
    throw new Error("Could not build OP_RETURN output.");
  }

  return output;
}

function dataCarrierBytesForPayload(payload: string) {
  return opReturnScriptForPayload(payload).length;
}

function dataCarrierBytesForPayloads(payloads: string[]) {
  return payloads.reduce((total, payload) => total + dataCarrierBytesForPayload(payload), 0);
}

function maxPayloadDataBytes(prefix: string) {
  let low = 0;
  let high = Math.max(0, MAX_DATA_CARRIER_BYTES - byteLength(prefix));

  while (low < high) {
    const candidate = Math.ceil((low + high) / 2);
    const payload = `${prefix}${"x".repeat(candidate)}`;

    if (dataCarrierBytesForPayload(payload) <= MAX_DATA_CARRIER_BYTES) {
      low = candidate;
    } else {
      high = candidate - 1;
    }
  }

  return low;
}

function mempoolBase(network: BitcoinNetwork) {
  if (network === "testnet4") {
    return "https://mempool.space/testnet4";
  }

  if (network === "testnet") {
    return "https://mempool.space/testnet";
  }

  return "https://mempool.space";
}

function mempoolTxUrl(txid: string, network: BitcoinNetwork) {
  return `${mempoolBase(network)}/tx/${txid}`;
}

function proofApiUrl(path: string, network: BitcoinNetwork) {
  const separator = path.includes("?") ? "&" : "?";
  return `${POW_API_BASE}${path}${separator}network=${encodeURIComponent(network)}`;
}

async function fetchProofApiJson<T>(path: string, network: BitcoinNetwork): Promise<T> {
  const response = await fetch(proofApiUrl(path, network), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(responseText || `ProofOfWork API returned ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

function xVerificationUrl(record: PowIdRecord) {
  const action = record.confirmed ? "registered" : "submitted a registration for";
  const text = [
    `I ${action} ${record.id}@proofofwork.me on Bitcoin.`,
    `Registry tx: ${mempoolTxUrl(record.txid, record.network)}`,
    "ProofOfWork.Me IDs are on-chain mail identities.",
  ].join("\n\n");

  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

function registryAddressForNetwork(network: BitcoinNetwork) {
  return ID_REGISTRY_ADDRESSES[network] ?? "";
}

function bitcoinNetwork(network: BitcoinNetwork) {
  return network === "livenet" ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
}

function varIntSize(value: number) {
  if (value < 0xfd) {
    return 1;
  }

  if (value <= 0xffff) {
    return 3;
  }

  if (value <= 0xffffffff) {
    return 5;
  }

  return 9;
}

function outputVbytesForScript(script: Uint8Array) {
  return 8 + varIntSize(script.length) + script.length;
}

function scriptForAddress(address: string, network: BitcoinNetwork, fieldName: string) {
  try {
    return bitcoin.address.toOutputScript(address, bitcoinNetwork(network));
  } catch {
    throw new Error(`${fieldName} is not a valid ${networkLabel(network)} address.`);
  }
}

function isValidBitcoinAddress(address: string, network: BitcoinNetwork) {
  try {
    bitcoin.address.toOutputScript(address, bitcoinNetwork(network));
    return true;
  } catch {
    return false;
  }
}

function chainForNetwork(network: BitcoinNetwork) {
  if (network === "testnet4") {
    return "BITCOIN_TESTNET4";
  }

  return network === "livenet" ? "BITCOIN_MAINNET" : "BITCOIN_TESTNET";
}

function networkLabel(network: BitcoinNetwork) {
  if (network === "testnet4") {
    return "Testnet4";
  }

  return network === "livenet" ? "Mainnet" : "Testnet3";
}

function shortAddress(value: string) {
  if (!value) {
    return "Unknown";
  }

  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-8)}` : value;
}

function mailKey(message: MailMessage) {
  return `${message.folder}-${message.network}-${message.txid}`;
}

function sentMessageKey(message: Pick<SentMessage, "from" | "network" | "txid">) {
  return `${message.network}-${message.from}-${message.txid}`;
}

function broadcastStatusRank(status: BroadcastStatus) {
  if (status === "confirmed") {
    return 4;
  }

  if (status === "pending") {
    return 3;
  }

  if (status === "unknown") {
    return 2;
  }

  return 1;
}

function preferSentMessage(candidate: SentMessage, current: SentMessage) {
  const byStatus = broadcastStatusRank(sentDeliveryStatus(candidate)) - broadcastStatusRank(sentDeliveryStatus(current));
  if (byStatus !== 0) {
    return byStatus > 0;
  }

  if (Boolean(candidate.attachment) !== Boolean(current.attachment)) {
    return Boolean(candidate.attachment);
  }

  return Date.parse(candidate.createdAt) > Date.parse(current.createdAt);
}

function mergeSentRecord(preferred: SentMessage, fallback: SentMessage): SentMessage {
  return {
    ...fallback,
    ...preferred,
    attachment: preferred.attachment ?? fallback.attachment,
    confirmedAt: preferred.confirmedAt ?? fallback.confirmedAt,
    droppedAt: preferred.droppedAt ?? fallback.droppedAt,
    feeRate: preferred.feeRate || fallback.feeRate,
    lastCheckedAt: preferred.lastCheckedAt ?? fallback.lastCheckedAt,
    parentTxid: preferred.parentTxid ?? fallback.parentTxid,
  };
}

function mergeSentMessages(messages: SentMessage[]) {
  const merged = new Map<string, SentMessage>();

  for (const message of messages) {
    const key = sentMessageKey(message);
    const current = merged.get(key);

    if (!current) {
      merged.set(key, message);
      continue;
    }

    merged.set(
      key,
      preferSentMessage(message, current)
        ? mergeSentRecord(message, current)
        : mergeSentRecord(current, message),
    );
  }

  return [...merged.values()];
}

function ownedPowIds(records: PowIdRecord[], ownerOrReceiverAddress: string) {
  if (!ownerOrReceiverAddress) {
    return [];
  }

  return records.filter((record) => record.ownerAddress === ownerOrReceiverAddress || record.receiveAddress === ownerOrReceiverAddress);
}

function resolveRecipientInput(
  value: string,
  targetNetwork: BitcoinNetwork,
  registryRecords: PowIdRecord[],
  registryAddress: string,
): RecipientResolution {
  const input = value.trim();
  if (!input) {
    return { displayRecipient: "", isId: false, paymentAddress: "" };
  }

  if (isValidBitcoinAddress(input, targetNetwork)) {
    return { displayRecipient: input, isId: false, paymentAddress: input };
  }

  const id = normalizePowId(input);
  const displayRecipient = id ? `${id}@proofofwork.me` : input;
  if (!id) {
    return {
      displayRecipient,
      error: "Enter a valid Bitcoin address or ProofOfWork ID.",
      isId: true,
      paymentAddress: "",
    };
  }

  if (!registryAddress) {
    return {
      displayRecipient,
      error: `ProofOfWork ID registry is not configured for ${networkLabel(targetNetwork)}.`,
      id,
      isId: true,
      paymentAddress: "",
    };
  }

  const matchingRecords = registryRecords.filter((record) => record.network === targetNetwork && record.id === id);
  const confirmedRecord = matchingRecords.find((record) => record.confirmed);
  if (confirmedRecord) {
    return {
      displayRecipient,
      id,
      isId: true,
      paymentAddress: confirmedRecord.receiveAddress,
      record: confirmedRecord,
    };
  }

  // Pending IDs are deliberately not routable. A pending tx can be replaced,
  // dropped, or beaten by another valid registration before confirmation.
  const pendingRecord = matchingRecords.find((record) => !record.confirmed);
  if (pendingRecord) {
    return {
      displayRecipient,
      error: `${displayRecipient} is pending. Wait for confirmation before sending to this ID.`,
      id,
      isId: true,
      paymentAddress: "",
      record: pendingRecord,
    };
  }

  return {
    displayRecipient,
    error: `No confirmed ProofOfWork ID found for ${displayRecipient}.`,
    id,
    isId: true,
    paymentAddress: "",
  };
}

function explorerNetworkFor(messageNetwork: BitcoinNetwork, activeNetwork: BitcoinNetwork) {
  if (messageNetwork === "livenet" || activeNetwork === "livenet") {
    return messageNetwork;
  }

  return activeNetwork;
}

function rootTxid(message: MailMessage) {
  return message.parentTxid ?? message.txid;
}

function isInboundFolder(folder: MailMessage["folder"]) {
  return folder === "inbox" || folder === "incoming";
}

function peerAddress(message: MailMessage) {
  return isInboundFolder(message.folder) ? message.from : message.to;
}

function hasAttachment(message: MailMessage): message is MailMessage & { attachment: MailAttachment } {
  return Boolean(message.attachment);
}

function normalizeBroadcastStatus(status: unknown): BroadcastStatus {
  if (status === "confirmed" || status === "pending" || status === "dropped") {
    return status;
  }

  return "unknown";
}

function sentDeliveryStatus(message: Pick<SentMessage, "status">) {
  return normalizeBroadcastStatus(message.status);
}

function deliveryLabel(status: BroadcastStatus) {
  if (status === "confirmed") {
    return "Confirmed";
  }

  if (status === "dropped") {
    return "Dropped";
  }

  return status === "pending" ? "Pending" : "Checking";
}

function isVisibleSentStatus(status: BroadcastStatus) {
  return status === "confirmed" || status === "unknown";
}

function isOutboxStatus(status: BroadcastStatus) {
  return status === "pending" || status === "dropped";
}

function folderLabel(folder: Folder) {
  if (folder === "inbox") {
    return "Inbox";
  }

  if (folder === "incoming") {
    return "Incoming";
  }

  if (folder === "sent") {
    return "Sent";
  }

  if (folder === "outbox") {
    return "Outbox";
  }

  if (folder === "drafts") {
    return "Drafts";
  }

  if (folder === "favorites") {
    return "Favorites";
  }

  if (folder === "ids") {
    return "IDs";
  }

  return folder === "archive" ? "Archive" : "Files";
}

function folderSubtitle(folder: Folder) {
  if (folder === "inbox") {
    return "Confirmed received mail";
  }

  if (folder === "incoming") {
    return "Pending received mail";
  }

  if (folder === "sent") {
    return "Confirmed and recovered sent mail";
  }

  if (folder === "outbox") {
    return "Pending and dropped broadcasts";
  }

  if (folder === "drafts") {
    return "Local unsent mail";
  }

  if (folder === "favorites") {
    return "Starred confirmed mail";
  }

  if (folder === "ids") {
    return "ProofOfWork ID registry";
  }

  return folder === "archive" ? "Local archived mail" : "Attachments across mail";
}

function mailboxSummary(inboxMessages: InboxMessage[], sentMessages: SentMessage[]) {
  const inboxCount = inboxMessages.filter((message) => message.confirmed).length;
  const incomingCount = inboxMessages.length - inboxCount;
  const sentCount = sentMessages.filter((message) => isVisibleSentStatus(sentDeliveryStatus(message))).length;
  const outboxCount = sentMessages.filter((message) => isOutboxStatus(sentDeliveryStatus(message))).length;
  return `${inboxCount} inbox, ${incomingCount} incoming, ${sentCount} sent, ${outboxCount} outbox`;
}

function selectedInboundKey(folder: Folder, inboxMessages: InboxMessage[]) {
  if (folder !== "inbox" && folder !== "incoming") {
    return "";
  }

  const confirmed = folder === "inbox";
  const message = inboxMessages.find((inboxMessage) => inboxMessage.confirmed === confirmed);
  return message ? mailKey({ ...message, folder }) : "";
}

function mailSubject(memo: string) {
  const firstLine = memo
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine ? firstLine.slice(0, 90) : "OP_RETURN message";
}

function messageSubject(message: { attachment?: MailAttachment; memo: string }) {
  const subject = mailSubject(message.memo);
  if (subject !== "OP_RETURN message") {
    return subject;
  }

  return message.attachment ? `Attachment: ${message.attachment.name}` : subject;
}

function mailPreview(message: { attachment?: MailAttachment; memo: string }) {
  const preview = message.memo.replace(/\s+/g, " ").trim().slice(0, 180);
  if (preview) {
    return preview;
  }

  return message.attachment ? `${message.attachment.name} (${formatBytes(message.attachment.size)})` : "";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  return `${(bytes / 1024).toFixed(bytes < 1024 * 10 ? 1 : 0)} KB`;
}

function attachmentHref(attachment: MailAttachment) {
  return `data:${attachment.mime};base64,${base64FromBase64Url(attachment.data)}`;
}

function attachmentKind(attachment: MailAttachment): FileFilter {
  const mime = attachment.mime.toLowerCase();
  const name = attachment.name.toLowerCase();

  if (mime.startsWith("image/")) {
    return "image";
  }

  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    return "pdf";
  }

  if (
    mime.includes("document") ||
    mime.includes("msword") ||
    mime.includes("opendocument") ||
    mime.startsWith("text/") ||
    /\.(doc|docx|odt|rtf|txt|md|csv)$/u.test(name)
  ) {
    return "document";
  }

  return "other";
}

function isImageAttachment(attachment: MailAttachment) {
  return attachment.mime.toLowerCase().startsWith("image/");
}

function fileFilterLabel(filter: FileFilter) {
  if (filter === "image") {
    return "Images";
  }

  if (filter === "pdf") {
    return "PDFs";
  }

  if (filter === "document") {
    return "Documents";
  }

  return filter === "other" ? "Other" : "All files";
}

function normalizeAttachmentName(name: string) {
  return name.trim().replace(/\s+/g, " ").slice(0, 120) || "attachment";
}

function normalizeAttachmentMime(mime: string) {
  return mime.trim().slice(0, 120) || "application/octet-stream";
}

async function attachmentFromFile(file: File): Promise<MailAttachment> {
  if (file.size <= 0) {
    throw new Error("Attachment is empty.");
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`Attachment must be ${formatBytes(MAX_ATTACHMENT_BYTES)} or smaller.`);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  return {
    data: base64UrlEncodeBytes(bytes),
    mime: normalizeAttachmentMime(file.type),
    name: normalizeAttachmentName(file.name),
    sha256: sha256Hex(bytes),
    size: bytes.byteLength,
  };
}

function buildAttachmentPayloads(attachment: MailAttachment) {
  const metadataPrefix = `${PROTOCOL_PREFIX}a:${encodeTextBase64Url(attachment.mime)}:${encodeTextBase64Url(
    attachment.name,
  )}:${attachment.size}:${attachment.sha256}:`;
  const maxChunkBytes = maxPayloadDataBytes(`${metadataPrefix}999/999:`);
  const chunks = chunkAscii(attachment.data, Math.max(1, maxChunkBytes));

  return chunks.map((chunk, index) => `${metadataPrefix}${index}/${chunks.length}:${chunk}`);
}

function buildProtocolPayloads(message: string, parentTxid?: string, attachment?: MailAttachment) {
  const bodyPrefix = `${PROTOCOL_PREFIX}m:`;
  const bodyChunkBytes = maxPayloadDataBytes(bodyPrefix);
  const payloads: string[] = [];

  if (parentTxid) {
    payloads.push(`${PROTOCOL_PREFIX}r:${parentTxid}`);
  }

  for (const chunk of chunkUtf8(message, bodyChunkBytes)) {
    payloads.push(`${bodyPrefix}${chunk}`);
  }

  if (attachment) {
    payloads.push(...buildAttachmentPayloads(attachment));
  }

  return payloads;
}

function normalizePowId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^@/u, "")
    .replace(/@proofofwork\.me$/u, "")
    .trim();
}

function powIdError(id: string) {
  if (!id) {
    return "Enter an ID.";
  }

  return "";
}

function buildIdRegistrationPayload(id: string, ownerAddress: string, receiveAddress: string, pgpKey: string) {
  const pgp = pgpKey.trim();
  return `${ID_PROTOCOL_PREFIX}r2:${encodeTextBase64Url(id)}:${ownerAddress}:${receiveAddress}${pgp ? `:${encodeTextBase64Url(pgp)}` : ""}`;
}

function protocolOutputScripts(payloads: string[]) {
  const scripts = payloads.map((payload) => {
    const script = opReturnScriptForPayload(payload);
    if (script.length > MAX_DATA_CARRIER_BYTES) {
      throw new Error("One OP_RETURN data-carrier output is over 100 KB.");
    }

    return script;
  });

  const aggregateBytes = scripts.reduce((total, script) => total + script.length, 0);
  if (aggregateBytes > MAX_DATA_CARRIER_BYTES) {
    throw new Error(
      `OP_RETURN data-carrier scripts use ${aggregateBytes.toLocaleString()} bytes; limit is ${MAX_DATA_CARRIER_BYTES.toLocaleString()} bytes.`,
    );
  }

  return scripts;
}

function parseProtocolMemo(memo: string): ProtocolMessage | null {
  return memo.startsWith(PROTOCOL_PREFIX) ? { memo, replyTo: "" } : null;
}

function sortMessages(messages: MailMessage[], sortMode: SortMode) {
  const sorted = [...messages];
  const threadActivity = new Map<string, number>();

  for (const message of sorted) {
    const thread = rootTxid(message);
    const previous = threadActivity.get(thread) ?? 0;
    threadActivity.set(thread, Math.max(previous, Date.parse(message.createdAt)));
  }

  sorted.sort((left, right) => {
    if (sortMode === "value") {
      return right.amountSats - left.amountSats || Date.parse(right.createdAt) - Date.parse(left.createdAt);
    }

    if (sortMode === "newest") {
      return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    }

    if (sortMode === "oldest") {
      return Date.parse(left.createdAt) - Date.parse(right.createdAt);
    }

    if (sortMode === "thread") {
      const byActivity = (threadActivity.get(rootTxid(right)) ?? 0) - (threadActivity.get(rootTxid(left)) ?? 0);
      if (byActivity !== 0) {
        return byActivity;
      }

      const byThread = rootTxid(left).localeCompare(rootTxid(right));
      return byThread || Date.parse(left.createdAt) - Date.parse(right.createdAt);
    }

    if (sortMode === "largest") {
      return (right.attachment?.size ?? 0) - (left.attachment?.size ?? 0) || Date.parse(right.createdAt) - Date.parse(left.createdAt);
    }

    if (sortMode === "filetype") {
      const byType = (left.attachment?.mime ?? "").localeCompare(right.attachment?.mime ?? "");
      return byType || (left.attachment?.name ?? "").localeCompare(right.attachment?.name ?? "");
    }

    if (sortMode === "sender") {
      return peerAddress(left).localeCompare(peerAddress(right)) || Date.parse(right.createdAt) - Date.parse(left.createdAt);
    }

    return right.amountSats - left.amountSats || Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });

  return sorted;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error) {
    return error;
  }

  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

async function getWalletNetwork(wallet: UnisatWallet): Promise<BitcoinNetwork | undefined> {
  const chain = await wallet.getChain?.().catch(() => undefined);
  if (chain?.enum === "BITCOIN_MAINNET") {
    return "livenet";
  }
  if (chain?.enum === "BITCOIN_TESTNET") {
    return "testnet";
  }
  if (chain?.enum === "BITCOIN_TESTNET4") {
    return "testnet4";
  }

  const walletNetwork = await wallet.getNetwork?.().catch(() => undefined);
  return walletNetwork === "livenet" || walletNetwork === "testnet" ? walletNetwork : undefined;
}

async function switchWalletNetwork(wallet: UnisatWallet, network: BitcoinNetwork) {
  if (wallet.switchChain) {
    await wallet.switchChain(chainForNetwork(network));
    return;
  }

  if (wallet.switchNetwork) {
    if (network === "testnet4") {
      throw new Error("This UniSat version cannot switch to testnet4 through the legacy switchNetwork API.");
    }

    await wallet.switchNetwork(network);
  }
}

function loadSentMessages(): SentMessage[] {
  try {
    const stored = localStorage.getItem(SENT_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((message): SentMessage[] => {
      if (!message || typeof message !== "object") {
        return [];
      }

      const sent = message as Partial<SentMessage>;
      if (
        typeof sent.txid !== "string" ||
        typeof sent.from !== "string" ||
        typeof sent.to !== "string" ||
        typeof sent.memo !== "string" ||
        !/^[0-9a-fA-F]{64}$/.test(sent.txid)
      ) {
        return [];
      }

      const network: BitcoinNetwork =
        sent.network === "livenet" || sent.network === "testnet" || sent.network === "testnet4" ? sent.network : "livenet";

      return [
        {
          amountSats: typeof sent.amountSats === "number" ? sent.amountSats : DEFAULT_AMOUNT_SATS,
          attachment: storedAttachment(sent.attachment),
          confirmedAt: typeof sent.confirmedAt === "string" ? sent.confirmedAt : undefined,
          createdAt: typeof sent.createdAt === "string" ? sent.createdAt : new Date().toISOString(),
          droppedAt: typeof sent.droppedAt === "string" ? sent.droppedAt : undefined,
          feeRate: typeof sent.feeRate === "number" ? sent.feeRate : DEFAULT_FEE_RATE,
          from: sent.from,
          lastCheckedAt: typeof sent.lastCheckedAt === "string" ? sent.lastCheckedAt : undefined,
          memo: sent.memo,
          network,
          parentTxid: typeof sent.parentTxid === "string" ? sent.parentTxid : undefined,
          replyTo: typeof sent.replyTo === "string" ? sent.replyTo : sent.from,
          status: normalizeBroadcastStatus(sent.status),
          to: sent.to,
          txid: sent.txid.toLowerCase(),
        },
      ];
    });
  } catch {
    return [];
  }
}

function saveSentMessages(messages: SentMessage[]) {
  localStorage.setItem(SENT_KEY, JSON.stringify(messages));
}

function loadMailPreferences(): MailPreferences {
  try {
    const stored = localStorage.getItem(MAIL_PREFS_KEY);
    if (!stored) {
      return {};
    }

    const parsed = JSON.parse(stored) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([key, value]) => {
        if (!value || typeof value !== "object") {
          return [];
        }

        const preference = value as MailPreference;
        const normalized: MailPreference = {};
        if (preference.archived) {
          normalized.archived = true;
        }

        if (preference.favorite) {
          normalized.favorite = true;
        }

        return Object.keys(normalized).length > 0 ? [[key, normalized]] : [];
      }),
    );
  } catch {
    return {};
  }
}

function saveMailPreferences(preferences: MailPreferences) {
  localStorage.setItem(MAIL_PREFS_KEY, JSON.stringify(preferences));
}

function draftKey(address: string, network: BitcoinNetwork) {
  return `${DRAFT_KEY_PREFIX}:${network}:${address}`;
}

function storedAttachment(value: unknown): MailAttachment | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const attachment = value as Partial<MailAttachment>;
  if (
    typeof attachment.name !== "string" ||
    typeof attachment.mime !== "string" ||
    typeof attachment.data !== "string" ||
    typeof attachment.sha256 !== "string" ||
    typeof attachment.size !== "number" ||
    attachment.size <= 0 ||
    attachment.size > MAX_ATTACHMENT_BYTES ||
    !/^[0-9a-f]{64}$/i.test(attachment.sha256)
  ) {
    return undefined;
  }

  return {
    data: attachment.data,
    mime: normalizeAttachmentMime(attachment.mime),
    name: normalizeAttachmentName(attachment.name),
    sha256: attachment.sha256.toLowerCase(),
    size: attachment.size,
  };
}

function loadDraft(address: string, network: BitcoinNetwork): DraftMessage | undefined {
  try {
    const stored = localStorage.getItem(draftKey(address, network));
    if (!stored) {
      return undefined;
    }

    const draft = JSON.parse(stored) as Partial<DraftMessage>;
    const amountSats = typeof draft.amountSats === "number" && Number.isFinite(draft.amountSats) ? draft.amountSats : DEFAULT_AMOUNT_SATS;
    const feeRate = typeof draft.feeRate === "number" && Number.isFinite(draft.feeRate) ? draft.feeRate : DEFAULT_FEE_RATE;
    const parentTxid = typeof draft.parentTxid === "string" && /^[0-9a-fA-F]{64}$/.test(draft.parentTxid) ? draft.parentTxid.toLowerCase() : undefined;
    const updatedAt = typeof draft.updatedAt === "string" && !Number.isNaN(Date.parse(draft.updatedAt)) ? draft.updatedAt : new Date().toISOString();

    return {
      amountSats,
      attachment: storedAttachment(draft.attachment),
      feeRate,
      from: address,
      memo: typeof draft.memo === "string" ? draft.memo : DEFAULT_MEMO,
      network,
      parentTxid,
      recipient: typeof draft.recipient === "string" ? draft.recipient : "",
      updatedAt,
    };
  } catch {
    return undefined;
  }
}

function saveDraft(draft: DraftMessage) {
  localStorage.setItem(draftKey(draft.from, draft.network), JSON.stringify(draft));
}

function clearDraft(address: string, network: BitcoinNetwork) {
  localStorage.removeItem(draftKey(address, network));
}

function isDraftContentful(draft: DraftMessage) {
  return Boolean(
    draft.recipient.trim() ||
      draft.memo.trim() ||
      draft.attachment ||
      draft.parentTxid ||
      draft.amountSats !== DEFAULT_AMOUNT_SATS ||
      draft.feeRate !== DEFAULT_FEE_RATE,
  );
}

function decodeHex(hex: string) {
  if (!hex || hex.length % 2 !== 0) {
    return "";
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function decodedOpReturnMessages(vout: Array<Record<string, unknown>>) {
  return vout
    .filter((output) => output.scriptpubkey_type === "op_return")
    .map((output) => String(output.scriptpubkey_asm ?? ""))
    .map((asm) =>
      asm
        .split(" ")
        .slice(1)
        .filter((token) => /^[0-9a-fA-F]+$/.test(token))
        .map(decodeHex)
        .join(""),
    )
    .filter(Boolean);
}

function decodedProtocolMessages(vout: Array<Record<string, unknown>>, prefix: string) {
  return decodedOpReturnMessages(vout).filter((message) => message.startsWith(prefix));
}

function firstProtocolOutputIndex(vout: Array<Record<string, unknown>>) {
  return vout.findIndex((output) => {
    if (output.scriptpubkey_type !== "op_return") {
      return false;
    }

    return decodedOpReturnMessages([output]).some((message) => message.startsWith(PROTOCOL_PREFIX));
  });
}

function firstIdProtocolOutputIndex(vout: Array<Record<string, unknown>>) {
  return vout.findIndex((output) => {
    if (output.scriptpubkey_type !== "op_return") {
      return false;
    }

    return decodedProtocolMessages([output], ID_PROTOCOL_PREFIX).length > 0;
  });
}

function parseAttachmentPayload(payload: string, current: AttachmentAccumulator | undefined) {
  const parts = payload.split(":");
  if (parts.length !== 7) {
    return current;
  }

  const [, mimeEncoded, nameEncoded, sizeText, sha256, partText, chunk] = parts;
  const size = Number(sizeText);
  const part = partText.match(/^(\d+)\/(\d+)$/);

  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_ATTACHMENT_BYTES || !/^[0-9a-f]{64}$/i.test(sha256) || !part) {
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

function attachmentFromAccumulator(accumulator: AttachmentAccumulator | undefined): MailAttachment | undefined {
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

function extractProtocolMemo(vout: Array<Record<string, unknown>>) {
  const decodedMessages = decodedOpReturnMessages(vout);
  let replyTo = "";
  let parentTxid: string | undefined;
  let attachmentAccumulator: AttachmentAccumulator | undefined;
  const chunks: string[] = [];

  for (const decodedMessage of decodedMessages) {
    const parsed = parseProtocolMemo(decodedMessage);
    if (!parsed) {
      continue;
    }

    const payload = decodedMessage.slice(PROTOCOL_PREFIX.length);
    if (payload.startsWith("f:")) {
      replyTo = payload.slice(2);
      continue;
    }

    const reply = payload.match(/^r:([0-9a-fA-F]{64})$/);
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

  if (chunks.length === 0) {
    return null;
  }

  const protocolMessage: ProtocolMessage = {
    memo: chunks.join(""),
  };

  if (replyTo) {
    protocolMessage.replyTo = replyTo;
  }

  if (parentTxid) {
    protocolMessage.parentTxid = parentTxid;
  }

  const attachment = attachmentFromAccumulator(attachmentAccumulator);
  if (attachment) {
    protocolMessage.attachment = attachment;
  }

  return protocolMessage;
}

function receivedPaymentAmount(vout: Array<Record<string, unknown>>, address: string) {
  const protocolIndex = firstProtocolOutputIndex(vout);
  const paymentOutput = vout.find((output, index) => {
    if (output.scriptpubkey_address !== address || typeof output.value !== "number") {
      return false;
    }

    return protocolIndex === -1 || index < protocolIndex;
  });

  if (paymentOutput && typeof paymentOutput.value === "number") {
    return paymentOutput.value;
  }

  if (protocolIndex !== -1) {
    return 0;
  }

  const fallbackOutput = vout.find(
    (output) => output.scriptpubkey_address === address && typeof output.value === "number",
  );

  return typeof fallbackOutput?.value === "number" ? fallbackOutput.value : 0;
}

function senderAddress(vin: Array<Record<string, unknown>>, targetAddress: string) {
  const inputAddresses = vin
    .map((input) => {
      const prevout = input.prevout as Record<string, unknown> | undefined;
      return typeof prevout?.scriptpubkey_address === "string" ? prevout.scriptpubkey_address : "";
    })
    .filter(Boolean);

  return inputAddresses.find((inputAddress) => inputAddress !== targetAddress) ?? inputAddresses[0] ?? "Unknown";
}

function transactionInputAddresses(vin: Array<Record<string, unknown>>) {
  return vin
    .map((input) => {
      const prevout = input.prevout as Record<string, unknown> | undefined;
      return typeof prevout?.scriptpubkey_address === "string" ? prevout.scriptpubkey_address : "";
    })
    .filter(Boolean);
}

function protocolPaymentOutput(vout: Array<Record<string, unknown>>) {
  const protocolIndex = firstProtocolOutputIndex(vout);
  if (protocolIndex === -1) {
    return undefined;
  }

  const paymentOutput = vout.find((output, index) => {
    return (
      index < protocolIndex &&
      output.scriptpubkey_type !== "op_return" &&
      typeof output.scriptpubkey_address === "string" &&
      typeof output.value === "number" &&
      output.value > 0
    );
  });

  if (typeof paymentOutput?.scriptpubkey_address !== "string" || typeof paymentOutput.value !== "number") {
    return undefined;
  }

  return {
    address: paymentOutput.scriptpubkey_address,
    value: paymentOutput.value,
  };
}

function registryPaymentAmount(vout: Array<Record<string, unknown>>, registryAddress: string) {
  const protocolIndex = firstIdProtocolOutputIndex(vout);
  const paymentOutput = vout.find((output, index) => {
    return (
      output.scriptpubkey_address === registryAddress &&
      typeof output.value === "number" &&
      output.value >= ID_REGISTRATION_PRICE_SATS &&
      (protocolIndex === -1 || index < protocolIndex)
    );
  });

  return typeof paymentOutput?.value === "number" ? paymentOutput.value : 0;
}

function parseIdRegistrationPayload(payload: string, targetNetwork: BitcoinNetwork) {
  let rawId = "";
  let ownerAddress = "";
  let receiveAddress = "";
  let pgpEncoded = "";

  // r2 is the canonical launch format. The ID is base64url encoded so
  // punctuation/Unicode cannot corrupt the colon-delimited registry envelope.
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
    // Legacy reader compatibility only. New writes must use r2.
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
  if (powIdError(id) || !isValidBitcoinAddress(ownerAddress, targetNetwork) || !isValidBitcoinAddress(receiveAddress, targetNetwork)) {
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

async function fetchAddressTransactionsPage(targetAddress: string, targetNetwork: BitcoinNetwork, path: string) {
  const response = await fetch(`${mempoolBase(targetNetwork)}/api/address/${targetAddress}/${path}`);
  if (!response.ok) {
    throw new Error(`mempool.space returned ${response.status}`);
  }

  const transactions = await response.json();
  return Array.isArray(transactions) ? (transactions as Array<Record<string, unknown>>) : [];
}

async function fetchAddressTransactions(targetAddress: string, targetNetwork: BitcoinNetwork) {
  return fetchAddressTransactionsPage(targetAddress, targetNetwork, "txs");
}

function transactionTxid(tx: Record<string, unknown>) {
  return typeof tx.txid === "string" && /^[0-9a-fA-F]{64}$/u.test(tx.txid) ? tx.txid.toLowerCase() : "";
}

function transactionConfirmed(tx: Record<string, unknown>) {
  const status = tx.status as Record<string, unknown> | undefined;
  return Boolean(status?.confirmed);
}

function oldestConfirmedTxid(txs: Array<Record<string, unknown>>) {
  const confirmedTxs = txs.filter(transactionConfirmed);
  return confirmedTxs.length > 0 ? transactionTxid(confirmedTxs[confirmedTxs.length - 1]) : "";
}

function dedupeTransactions(txs: Array<Record<string, unknown>>) {
  const merged = new Map<string, Record<string, unknown>>();

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

async function fetchRegistryTransactions(registryAddress: string, targetNetwork: BitcoinNetwork) {
  const recentTxs = await fetchAddressTransactions(registryAddress, targetNetwork);
  const mempoolTxs = await fetchAddressTransactionsPage(registryAddress, targetNetwork, "txs/mempool");

  let chainPage: Array<Record<string, unknown>>;
  try {
    chainPage = await fetchAddressTransactionsPage(registryAddress, targetNetwork, "txs/chain");
  } catch {
    chainPage = recentTxs.filter(transactionConfirmed);
  }

  if (chainPage.length === 0) {
    chainPage = recentTxs.filter(transactionConfirmed);
  }

  const chainTxs = [...chainPage];
  const cursors = new Set<string>();
  let cursor = oldestConfirmedTxid(chainPage);

  for (let page = 0; cursor && page < MAX_REGISTRY_TX_PAGES; page += 1) {
    if (cursors.has(cursor)) {
      break;
    }

    cursors.add(cursor);
    const nextPage = await fetchAddressTransactionsPage(registryAddress, targetNetwork, `txs/chain/${cursor}`);
    if (nextPage.length === 0) {
      break;
    }

    chainTxs.push(...nextPage);
    cursor = oldestConfirmedTxid(nextPage);
  }

  return dedupeTransactions([...chainTxs, ...mempoolTxs, ...recentTxs]);
}

function inboxMessagesFromTransactions(
  txs: Array<Record<string, unknown>>,
  targetAddress: string,
  targetNetwork: BitcoinNetwork,
): InboxMessage[] {
  return txs
    .flatMap((tx): InboxMessage[] => {
      const vin = Array.isArray(tx.vin) ? (tx.vin as Array<Record<string, unknown>>) : [];
      const vout = Array.isArray(tx.vout) ? (tx.vout as Array<Record<string, unknown>>) : [];
      const protocolMessage = extractProtocolMemo(vout);
      const amount = receivedPaymentAmount(vout, targetAddress);

      if (!protocolMessage || amount <= 0) {
        return [];
      }

      const status = tx.status as Record<string, unknown> | undefined;
      const blockTime = typeof status?.block_time === "number" ? status.block_time * 1000 : Date.now();
      const sender = senderAddress(vin, targetAddress);

      const message: InboxMessage = {
        txid: String(tx.txid),
        network: targetNetwork,
        from: sender,
        to: targetAddress,
        amountSats: amount,
        memo: protocolMessage.memo,
        attachment: protocolMessage.attachment,
        replyTo: sender === "Unknown" ? protocolMessage.replyTo ?? "Unknown" : sender,
        confirmed: Boolean(status?.confirmed),
        createdAt: new Date(blockTime).toISOString(),
      };

      if (protocolMessage.parentTxid) {
        message.parentTxid = protocolMessage.parentTxid;
      }

      return [message];
    });
}

function sentMessagesFromTransactions(
  txs: Array<Record<string, unknown>>,
  targetAddress: string,
  targetNetwork: BitcoinNetwork,
): SentMessage[] {
  return txs.flatMap((tx): SentMessage[] => {
    const vin = Array.isArray(tx.vin) ? (tx.vin as Array<Record<string, unknown>>) : [];
    const vout = Array.isArray(tx.vout) ? (tx.vout as Array<Record<string, unknown>>) : [];
    const inputAddresses = transactionInputAddresses(vin);

    if (!inputAddresses.includes(targetAddress)) {
      return [];
    }

    const protocolMessage = extractProtocolMemo(vout);
    const payment = protocolPaymentOutput(vout);
    const txid = typeof tx.txid === "string" && /^[0-9a-fA-F]{64}$/.test(tx.txid) ? tx.txid.toLowerCase() : "";

    if (!protocolMessage || !payment || !txid) {
      return [];
    }

    const status = tx.status as Record<string, unknown> | undefined;
    const confirmed = Boolean(status?.confirmed);
    const blockTime = typeof status?.block_time === "number" ? status.block_time * 1000 : Date.now();
    const createdAt = new Date(blockTime).toISOString();

    return [
      {
        amountSats: payment.value,
        attachment: protocolMessage.attachment,
        confirmedAt: confirmed ? createdAt : undefined,
        createdAt,
        feeRate: 0,
        from: targetAddress,
        lastCheckedAt: new Date().toISOString(),
        memo: protocolMessage.memo,
        network: targetNetwork,
        parentTxid: protocolMessage.parentTxid,
        replyTo: targetAddress,
        status: confirmed ? "confirmed" : "pending",
        to: payment.address,
        txid,
      },
    ];
  });
}

async function fetchAddressMail(targetAddress: string, targetNetwork: BitcoinNetwork) {
  if (POW_API_BASE) {
    const payload = await fetchProofApiJson<PowMailApiResponse>(`/api/v1/address/${encodeURIComponent(targetAddress)}/mail`, targetNetwork);
    return {
      inboxMessages: Array.isArray(payload.inboxMessages) ? payload.inboxMessages : [],
      sentMessages: Array.isArray(payload.sentMessages) ? payload.sentMessages : [],
    };
  }

  const txs = await fetchAddressTransactions(targetAddress, targetNetwork);
  return {
    inboxMessages: inboxMessagesFromTransactions(txs, targetAddress, targetNetwork),
    sentMessages: sentMessagesFromTransactions(txs, targetAddress, targetNetwork),
  };
}

function idRecordsFromTransactions(
  txs: Array<Record<string, unknown>>,
  registryAddress: string,
  targetNetwork: BitcoinNetwork,
): PowIdRecord[] {
  const rawRecords = txs.flatMap((tx): PowIdRecord[] => {
    const vout = Array.isArray(tx.vout) ? (tx.vout as Array<Record<string, unknown>>) : [];
    const amount = registryPaymentAmount(vout, registryAddress);
    const txid = typeof tx.txid === "string" && /^[0-9a-fA-F]{64}$/u.test(tx.txid) ? tx.txid.toLowerCase() : "";

    if (!txid || amount < ID_REGISTRATION_PRICE_SATS) {
      return [];
    }

    const registerMessage = decodedProtocolMessages(vout, ID_PROTOCOL_PREFIX)
      .map((message) => message.slice(ID_PROTOCOL_PREFIX.length))
      .find((payload) => payload.startsWith("r2:") || payload.startsWith("r:"));
    const registration = registerMessage ? parseIdRegistrationPayload(registerMessage, targetNetwork) : null;
    if (!registration) {
      return [];
    }

    const status = tx.status as Record<string, unknown> | undefined;
    const confirmed = Boolean(status?.confirmed);
    const blockTime = typeof status?.block_time === "number" ? status.block_time * 1000 : Date.now();

    return [
      {
        amountSats: amount,
        confirmed,
        createdAt: new Date(blockTime).toISOString(),
        id: registration.id,
        network: targetNetwork,
        ownerAddress: registration.ownerAddress,
        pgpKey: registration.pgpKey || undefined,
        receiveAddress: registration.receiveAddress,
        txid,
      },
    ];
  });

  const confirmedRecords = rawRecords
    .filter((record) => record.confirmed)
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.txid.localeCompare(right.txid));
  const pendingRecords = rawRecords
    .filter((record) => !record.confirmed)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.txid.localeCompare(right.txid));
  const claimed = new Set<string>();
  const accepted: PowIdRecord[] = [];

  for (const record of confirmedRecords) {
    if (claimed.has(record.id)) {
      continue;
    }

    claimed.add(record.id);
    accepted.push(record);
  }

  for (const record of pendingRecords) {
    if (!claimed.has(record.id)) {
      accepted.push(record);
    }
  }

  return accepted;
}

async function fetchIdRegistry(targetNetwork: BitcoinNetwork): Promise<PowIdRecord[]> {
  const registryAddress = registryAddressForNetwork(targetNetwork);
  if (!registryAddress) {
    return [];
  }

  if (POW_API_BASE) {
    const payload = await fetchProofApiJson<PowRegistryApiResponse>("/api/v1/registry", targetNetwork);
    return Array.isArray(payload.records) ? payload.records : [];
  }

  const txs = await fetchRegistryTransactions(registryAddress, targetNetwork);
  return idRecordsFromTransactions(txs, registryAddress, targetNetwork);
}

async function fetchUtxos(ownerAddress: string, ownerNetwork: BitcoinNetwork): Promise<MempoolUtxo[]> {
  const response = await fetch(`${mempoolBase(ownerNetwork)}/api/address/${ownerAddress}/utxo`);
  if (!response.ok) {
    throw new Error(`Could not load wallet UTXOs: mempool.space returned ${response.status}.`);
  }

  const rawUtxos = (await response.json()) as Array<Record<string, unknown>>;
  return rawUtxos
    .flatMap((utxo): MempoolUtxo[] => {
      const txid = typeof utxo.txid === "string" ? utxo.txid : "";
      const vout = typeof utxo.vout === "number" ? utxo.vout : -1;
      const value = typeof utxo.value === "number" ? utxo.value : 0;

      if (!/^[0-9a-fA-F]{64}$/.test(txid) || vout < 0 || value <= 0) {
        return [];
      }

      const status = utxo.status as MempoolUtxo["status"] | undefined;
      return [{ txid, vout, value, status }];
    })
    .sort((left, right) => {
      const byConfirmation = Number(Boolean(right.status?.confirmed)) - Number(Boolean(left.status?.confirmed));
      return byConfirmation || right.value - left.value;
    });
}

async function fetchTransactionHex(txid: string, ownerNetwork: BitcoinNetwork) {
  const response = await fetch(`${mempoolBase(ownerNetwork)}/api/tx/${txid}/hex`);
  if (!response.ok) {
    throw new Error(`Could not load previous transaction ${shortAddress(txid)}.`);
  }

  return response.text();
}

async function fetchBroadcastStatus(txid: string, ownerNetwork: BitcoinNetwork): Promise<BroadcastStatus> {
  if (POW_API_BASE) {
    const payload = await fetchProofApiJson<PowTxStatusApiResponse>(`/api/v1/tx/${encodeURIComponent(txid)}/status`, ownerNetwork);
    return normalizeBroadcastStatus(payload.status);
  }

  const response = await fetch(`${mempoolBase(ownerNetwork)}/api/tx/${txid}`);
  if (response.status === 404) {
    return "dropped";
  }

  if (!response.ok) {
    throw new Error(`Could not check transaction ${shortAddress(txid)}.`);
  }

  const tx = (await response.json()) as Record<string, unknown>;
  const txStatus = tx.status as Record<string, unknown> | undefined;
  return txStatus?.confirmed ? "confirmed" : "pending";
}

function broadcastTargetsFor(
  ownerAddress: string,
  ownerNetwork: BitcoinNetwork,
  localSent: SentMessage[],
  recoveredSent: SentMessage[],
) {
  return mergeSentMessages(
    [...localSent, ...recoveredSent].filter(
      (message) => message.from === ownerAddress && message.network === ownerNetwork && sentDeliveryStatus(message) !== "confirmed",
    ),
  );
}

async function checkBroadcastTargets(targets: SentMessage[]): Promise<BroadcastCheckSummary> {
  const checkedAt = new Date().toISOString();
  const results = await Promise.all(
    targets.map(async (message): Promise<BroadcastCheckResult> => {
      try {
        const nextStatus = await fetchBroadcastStatus(message.txid, message.network);
        return {
          from: message.from,
          network: message.network,
          status: nextStatus,
          txid: message.txid,
        };
      } catch {
        return {
          from: message.from,
          network: message.network,
          status: undefined,
          txid: message.txid,
        };
      }
    }),
  );

  const confirmed = results.filter((result) => result.status === "confirmed").length;
  const dropped = results.filter((result) => result.status === "dropped").length;
  const pending = results.filter((result) => result.status === "pending").length;

  return {
    checkedAt,
    confirmed,
    dropped,
    failed: results.length - confirmed - dropped - pending,
    pending,
    results,
  };
}

function applyBroadcastCheckResults<T extends SentMessage>(messages: T[], summary: BroadcastCheckSummary) {
  return messages.map((message) => {
    const result = summary.results.find(
      (item) => item.txid === message.txid && item.network === message.network && item.from === message.from,
    );

    if (!result?.status) {
      return message;
    }

    return {
      ...message,
      confirmedAt: result.status === "confirmed" ? message.confirmedAt ?? summary.checkedAt : message.confirmedAt,
      droppedAt: result.status === "dropped" ? message.droppedAt ?? summary.checkedAt : undefined,
      lastCheckedAt: summary.checkedAt,
      status: result.status,
    };
  });
}

function broadcastCheckSummaryText(summary: BroadcastCheckSummary) {
  return `${summary.pending} pending, ${summary.confirmed} confirmed, ${summary.dropped} dropped${
    summary.failed ? `, ${summary.failed} unavailable` : ""
  }`;
}

function estimateTxVbytes(inputCount: number, outputVbytes: number) {
  return 10 + inputCount * ESTIMATED_INPUT_VBYTES + outputVbytes;
}

function selectUtxos(
  utxos: MempoolUtxo[],
  amountSats: number,
  feeRate: number,
  fixedOutputVbytes: number,
  changeOutputVbytes: number,
): UtxoSelection {
  const selected: MempoolUtxo[] = [];
  let selectedValue = 0;

  for (const utxo of utxos) {
    selected.push(utxo);
    selectedValue += utxo.value;

    const feeWithChange = Math.ceil(estimateTxVbytes(selected.length, fixedOutputVbytes + changeOutputVbytes) * feeRate);
    const changeWithChange = selectedValue - amountSats - feeWithChange;
    if (changeWithChange >= DUST_SATS) {
      return {
        selected,
        feeSats: feeWithChange,
        changeSats: changeWithChange,
      };
    }

    const feeWithoutChange = Math.ceil(estimateTxVbytes(selected.length, fixedOutputVbytes) * feeRate);
    const remainder = selectedValue - amountSats - feeWithoutChange;
    if (remainder >= 0) {
      return {
        selected,
        feeSats: feeWithoutChange + remainder,
        changeSats: 0,
      };
    }
  }

  const lastInputCount = Math.max(selected.length, 1);
  const estimatedFee = Math.ceil(estimateTxVbytes(lastInputCount, fixedOutputVbytes + changeOutputVbytes) * feeRate);
  throw new Error(
    `Insufficient funds. Need about ${(amountSats + estimatedFee).toLocaleString()} sats for amount plus fee.`,
  );
}

function isNativeWitnessScript(script: Uint8Array) {
  const version = script[0];
  const pushLength = script[1];
  return script.length >= 4 && (version === 0x00 || version === 0x51) && pushLength === script.length - 2;
}

async function buildPaymentPsbt({
  amountSats,
  feeRate,
  fromAddress,
  network,
  protocolPayloads,
  toAddress,
}: {
  amountSats: number;
  feeRate: number;
  fromAddress: string;
  network: BitcoinNetwork;
  protocolPayloads: string[];
  toAddress: string;
}) {
  const selectedNetwork = bitcoinNetwork(network);
  const paymentScript = scriptForAddress(toAddress, network, "Recipient");
  const changeScript = scriptForAddress(fromAddress, network, "Connected wallet");
  const opReturnScripts = protocolOutputScripts(protocolPayloads);
  const fixedOutputVbytes =
    outputVbytesForScript(paymentScript) + opReturnScripts.reduce((total, script) => total + outputVbytesForScript(script), 0);
  const changeOutputVbytes = outputVbytesForScript(changeScript);
  const utxos = await fetchUtxos(fromAddress, network);

  if (utxos.length === 0) {
    throw new Error(`No spendable UTXOs found for ${shortAddress(fromAddress)} on ${networkLabel(network)}.`);
  }

  const selection = selectUtxos(utxos, amountSats, feeRate, fixedOutputVbytes, changeOutputVbytes);
  const selectedWithPreviousTx = await Promise.all(
    selection.selected.map(async (utxo) => {
      const previousTxHex = await fetchTransactionHex(utxo.txid, network);
      const previousTx = bitcoin.Transaction.fromHex(previousTxHex);
      const previousOutput = previousTx.outs[utxo.vout];

      if (!previousOutput) {
        throw new Error(`Previous output ${shortAddress(utxo.txid)}:${utxo.vout} could not be read.`);
      }

      return {
        ...utxo,
        previousTxHex,
        previousOutput,
      };
    }),
  );

  const psbt = new bitcoin.Psbt({ network: selectedNetwork });

  for (const utxo of selectedWithPreviousTx) {
    const input = {
      hash: utxo.txid,
      index: utxo.vout,
    };

    if (isNativeWitnessScript(utxo.previousOutput.script)) {
      psbt.addInput({
        ...input,
        witnessUtxo: {
          script: utxo.previousOutput.script,
          value: utxo.previousOutput.value,
        },
      });
    } else {
      psbt.addInput({
        ...input,
        nonWitnessUtxo: Buffer.from(utxo.previousTxHex, "hex"),
      });
    }
  }

  psbt.addOutput({
    address: toAddress,
    value: BigInt(amountSats),
  });

  for (const script of opReturnScripts) {
    psbt.addOutput({
      script,
      value: 0n,
    });
  }

  if (selection.changeSats >= DUST_SATS) {
    psbt.addOutput({
      address: fromAddress,
      value: BigInt(selection.changeSats),
    });
  }

  return {
    changeSats: selection.changeSats,
    feeSats: selection.feeSats,
    inputCount: selection.selected.length,
    outputCount: 1 + opReturnScripts.length + (selection.changeSats >= DUST_SATS ? 1 : 0),
    psbtHex: psbt.toHex(),
  };
}

async function broadcastRawTransaction(rawTx: string, ownerNetwork: BitcoinNetwork) {
  const response = await fetch(`${mempoolBase(ownerNetwork)}/api/tx`, {
    body: rawTx,
    method: "POST",
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(responseText || `Broadcast failed with HTTP ${response.status}.`);
  }

  return response.text();
}

async function signAndBroadcastPsbt({
  inputCount,
  network,
  psbtHex,
  wallet,
}: {
  inputCount: number;
  network: BitcoinNetwork;
  psbtHex: string;
  wallet: UnisatWallet;
}) {
  if (!wallet.signPsbt) {
    throw new Error("UniSat signPsbt is not available. Update UniSat or use a wallet that can sign PSBTs.");
  }

  let signedPsbtHex = "";
  try {
    signedPsbtHex = await wallet.signPsbt(psbtHex, {
      autoFinalized: true,
    });
  } catch (error) {
    const signFailure = errorMessage(error, "");
    if (!/(tosigninput|sign input|matched|current address)/i.test(signFailure)) {
      throw error;
    }

    const publicKey = await wallet.getPublicKey?.().catch(() => "");
    if (!publicKey) {
      throw error;
    }

    signedPsbtHex = await wallet.signPsbt(psbtHex, {
      autoFinalized: true,
      toSignInputs: Array.from({ length: inputCount }, (_, index) => ({
        index,
        publicKey,
      })),
    });
  }

  let rawTx = "";
  try {
    const signedPsbt = bitcoin.Psbt.fromHex(signedPsbtHex, { network: bitcoinNetwork(network) });
    rawTx = signedPsbt.extractTransaction().toHex();
  } catch (error) {
    if (wallet.pushPsbt) {
      return wallet.pushPsbt(signedPsbtHex);
    }

    throw error;
  }

  return broadcastRawTransaction(rawTx, network);
}

export default function App() {
  const idLaunchMode = isIdLaunchRoute();
  const landingMode = isLandingRoute();
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [hasUnisat, setHasUnisat] = useState(() => Boolean(window.unisat));
  const [network, setNetwork] = useState<BitcoinNetwork>("livenet");
  const [address, setAddress] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amountSats, setAmountSats] = useState(DEFAULT_AMOUNT_SATS);
  const [feeRate, setFeeRate] = useState(DEFAULT_FEE_RATE);
  const [memo, setMemo] = useState(DEFAULT_MEMO);
  const [attachment, setAttachment] = useState<MailAttachment | undefined>();
  const [allSent, setAllSent] = useState<SentMessage[]>(() => loadSentMessages());
  const [chainSent, setChainSent] = useState<SentMessage[]>([]);
  const [idRegistry, setIdRegistry] = useState<PowIdRecord[]>([]);
  const [lastRegisteredId, setLastRegisteredId] = useState<PowIdRecord | undefined>();
  const [idName, setIdName] = useState("");
  const [idReceiveAddress, setIdReceiveAddress] = useState("");
  const [idPgpKey, setIdPgpKey] = useState("");
  const [mailPreferences, setMailPreferences] = useState<MailPreferences>(() => loadMailPreferences());
  const [savedDraft, setSavedDraft] = useState<DraftMessage | undefined>();
  const [inbox, setInbox] = useState<InboxMessage[]>([]);
  const [activeFolder, setActiveFolder] = useState<Folder>("inbox");
  const [sortMode, setSortMode] = useState<SortMode>("value");
  const [fileFilter, setFileFilter] = useState<FileFilter>("all");
  const [selectedKey, setSelectedKey] = useState("");
  const [composeOpen, setComposeOpen] = useState(true);
  const [replyParentTxid, setReplyParentTxid] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: StatusTone; text: string }>({
    tone: "idle",
    text: "Ready",
  });
  const [refreshing, setRefreshing] = useState(false);
  const [checkingBroadcasts, setCheckingBroadcasts] = useState(false);
  const allSentRef = useRef(allSent);
  const chainSentRef = useRef(chainSent);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const protocolPayloads = useMemo(
    () => buildProtocolPayloads(memo, replyParentTxid, attachment),
    [attachment, memo, replyParentTxid],
  );
  const dataCarrierBytes = useMemo(
    () => dataCarrierBytesForPayloads(protocolPayloads),
    [protocolPayloads],
  );
  const archivedKeys = useMemo(
    () => new Set(Object.entries(mailPreferences).filter(([, preference]) => preference.archived).map(([key]) => key)),
    [mailPreferences],
  );
  const favoriteKeys = useMemo(
    () => new Set(Object.entries(mailPreferences).filter(([, preference]) => preference.favorite).map(([key]) => key)),
    [mailPreferences],
  );
  const inboxMailAll = useMemo<MailMessage[]>(
    () => inbox.filter((message) => message.confirmed).map((message) => ({ ...message, folder: "inbox" })),
    [inbox],
  );
  const incomingMailAll = useMemo<MailMessage[]>(
    () => inbox.filter((message) => !message.confirmed).map((message) => ({ ...message, folder: "incoming" })),
    [inbox],
  );
  const sentForAccount = useMemo(
    () =>
      address
        ? mergeSentMessages([
            ...allSent.filter((message) => message.from === address && message.network === network),
            ...chainSent.filter((message) => message.from === address && message.network === network),
          ])
        : [],
    [address, allSent, chainSent, network],
  );
  const sentMailAll = useMemo<Array<SentMessage & { folder: "sent" }>>(
    () => sentForAccount.map((message) => ({ ...message, folder: "sent" })),
    [sentForAccount],
  );
  const visibleSentMailAll = useMemo(
    () => sentMailAll.filter((message) => isVisibleSentStatus(sentDeliveryStatus(message))),
    [sentMailAll],
  );
  const outboxMailAll = useMemo(
    () => sentMailAll.filter((message) => isOutboxStatus(sentDeliveryStatus(message))),
    [sentMailAll],
  );
  const allMail = useMemo(() => [...inboxMailAll, ...visibleSentMailAll], [inboxMailAll, visibleSentMailAll]);
  const threadMail = useMemo(() => [...incomingMailAll, ...allMail, ...outboxMailAll], [allMail, incomingMailAll, outboxMailAll]);
  const inboxMail = useMemo(() => inboxMailAll.filter((message) => !archivedKeys.has(mailKey(message))), [archivedKeys, inboxMailAll]);
  const incomingMail = useMemo(() => incomingMailAll, [incomingMailAll]);
  const sentMail = useMemo(() => visibleSentMailAll.filter((message) => !archivedKeys.has(mailKey(message))), [archivedKeys, visibleSentMailAll]);
  const outboxMail = useMemo(() => outboxMailAll.filter((message) => !archivedKeys.has(mailKey(message))), [archivedKeys, outboxMailAll]);
  const favoritesMail = useMemo(() => allMail.filter((message) => favoriteKeys.has(mailKey(message))), [allMail, favoriteKeys]);
  const archiveMail = useMemo(() => allMail.filter((message) => archivedKeys.has(mailKey(message))), [allMail, archivedKeys]);
  const allFileMessages = useMemo(
    () => allMail.filter((message) => message.attachment && (message.folder !== "inbox" || message.confirmed)),
    [allMail],
  );
  const fileMessages = useMemo(
    () => allFileMessages.filter((message) => message.attachment && (fileFilter === "all" || attachmentKind(message.attachment) === fileFilter)),
    [allFileMessages, fileFilter],
  );
  const activeMessages = useMemo(
    () =>
      sortMessages(
        activeFolder === "inbox"
          ? inboxMail
          : activeFolder === "incoming"
            ? incomingMail
            : activeFolder === "sent"
              ? sentMail
              : activeFolder === "outbox"
                ? outboxMail
                : activeFolder === "favorites"
                  ? favoritesMail
                  : activeFolder === "archive"
                    ? archiveMail
                    : activeFolder === "files"
                      ? fileMessages
                      : [],
        sortMode,
      ),
    [activeFolder, archiveMail, favoritesMail, fileMessages, inboxMail, incomingMail, outboxMail, sentMail, sortMode],
  );
  const selectedMessage = activeMessages.find((message) => mailKey(message) === selectedKey) ?? activeMessages[0];
  const threadMessages = selectedMessage
    ? sortMessages(
        threadMail.filter((message) => rootTxid(message) === rootTxid(selectedMessage)),
        "oldest",
      )
    : [];
  const registryAddress = registryAddressForNetwork(network);
  const recipientResolution = useMemo(
    () => resolveRecipientInput(recipient, network, idRegistry, registryAddress),
    [idRegistry, network, recipient, registryAddress],
  );
  const recipientNote = recipient.trim() && recipientResolution.isId
    ? recipientResolution.error || `${recipientResolution.displayRecipient} resolves to ${shortAddress(recipientResolution.paymentAddress)}.`
    : "";
  const canSend =
    Boolean(address && recipient.trim() && amountSats > 0 && Number.isFinite(feeRate) && feeRate >= 0 && (memo.trim() || attachment)) &&
    Boolean(recipientResolution.paymentAddress) &&
    !recipientResolution.error &&
    dataCarrierBytes <= MAX_DATA_CARRIER_BYTES &&
    !busy;
  const normalizedIdName = normalizePowId(idName);
  const idRegistrationPayload = useMemo(
    () => (address && idReceiveAddress && normalizedIdName ? buildIdRegistrationPayload(normalizedIdName, address, idReceiveAddress.trim(), idPgpKey) : ""),
    [address, idPgpKey, idReceiveAddress, normalizedIdName],
  );
  const idRegistrationBytes = useMemo(
    () => (idRegistrationPayload ? dataCarrierBytesForPayload(idRegistrationPayload) : 0),
    [idRegistrationPayload],
  );
  const ownedIdCount = useMemo(() => ownedPowIds(idRegistry, address).length, [address, idRegistry]);
  const confirmedIdCount = useMemo(() => idRegistry.filter((record) => record.confirmed).length, [idRegistry]);
  const pendingIdCount = idRegistry.length - confirmedIdCount;
  const existingIdRegistration = useMemo(
    () => idRegistry.find((record) => record.network === network && record.id === normalizedIdName),
    [idRegistry, network, normalizedIdName],
  );
  const canRegisterId =
    Boolean(address && registryAddress && idRegistrationPayload && !powIdError(normalizedIdName) && isValidBitcoinAddress(idReceiveAddress.trim(), network)) &&
    idRegistrationBytes <= MAX_DATA_CARRIER_BYTES &&
    !existingIdRegistration &&
    !busy;
  const refreshInProgress = refreshing || checkingBroadcasts;
  const refreshDisabled = activeFolder === "ids" ? busy || refreshInProgress || !registryAddress : !address || busy || refreshInProgress;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const detectWallet = () => setHasUnisat(Boolean(window.unisat));
    detectWallet();
    const interval = window.setInterval(detectWallet, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    allSentRef.current = allSent;
    saveSentMessages(allSent);
  }, [allSent]);

  useEffect(() => {
    chainSentRef.current = chainSent;
  }, [chainSent]);

  const checkBroadcastStatuses = useCallback(
    async (silent = false) => {
      if (!address) {
        return;
      }

      const targets = broadcastTargetsFor(address, network, allSentRef.current, chainSentRef.current);

      if (targets.length === 0) {
        if (!silent) {
          setStatus({ tone: "idle", text: "No pending broadcasts to check." });
        }
        return;
      }

      setCheckingBroadcasts(true);

      try {
        const summary = await checkBroadcastTargets(targets);

        setAllSent((current) => applyBroadcastCheckResults(current, summary));
        setChainSent((current) => applyBroadcastCheckResults(current, summary));

        if (!silent) {
          setStatus({
            tone: summary.failed === summary.results.length ? "bad" : "good",
            text: `Outbox checked. ${broadcastCheckSummaryText(summary)}.`,
          });
        }
      } finally {
        setCheckingBroadcasts(false);
      }
    },
    [address, network],
  );

  useEffect(() => {
    if (!address) {
      return;
    }

    void checkBroadcastStatuses(true);
    const interval = window.setInterval(() => {
      void checkBroadcastStatuses(true);
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [address, checkBroadcastStatuses, network]);

  useEffect(() => {
    saveMailPreferences(mailPreferences);
  }, [mailPreferences]);

  useEffect(() => {
    setSavedDraft(address ? loadDraft(address, network) : undefined);
  }, [address, network]);

  useEffect(() => {
    setIdReceiveAddress(address);
  }, [address, network]);

  useEffect(() => {
    if (!address || !composeOpen) {
      return;
    }

    const draft: DraftMessage = {
      amountSats,
      attachment,
      feeRate,
      from: address,
      memo,
      network,
      parentTxid: replyParentTxid,
      recipient,
      updatedAt: new Date().toISOString(),
    };

    if (!isDraftContentful(draft)) {
      return;
    }

    saveDraft(draft);
    setSavedDraft(draft);
  }, [address, amountSats, attachment, composeOpen, feeRate, memo, network, recipient, replyParentTxid]);

  useEffect(() => {
    if (activeFolder === "ids") {
      void refreshIds(true);
    }
  }, [activeFolder, network]);

  useEffect(() => {
    if (!idLaunchMode) {
      return;
    }

    setNetwork("livenet");
    setActiveFolder("ids");
    void refreshIds(true);
  }, [idLaunchMode]);

  useEffect(() => {
    if (!landingMode) {
      return;
    }

    setNetwork("livenet");
    void refreshIds(true);
  }, [landingMode]);

  useEffect(() => {
    const trimmedRecipient = recipient.trim();
    if (!trimmedRecipient || isValidBitcoinAddress(trimmedRecipient, network) || !registryAddress) {
      return undefined;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      fetchIdRegistry(network)
        .then((records) => {
          if (!cancelled) {
            setIdRegistry(records);
          }
        })
        .catch(() => undefined);
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [network, recipient, registryAddress]);

  useEffect(() => {
    if (landingMode) {
      return;
    }

    if (!window.unisat) {
      return;
    }

    if (idLaunchMode) {
      setNetwork("livenet");
      return;
    }

    getWalletNetwork(window.unisat)
      .then((walletNetwork) => {
        if (walletNetwork) {
          setNetwork(walletNetwork);
        }
      })
      .catch(() => undefined);
  }, [hasUnisat, idLaunchMode, landingMode]);

  useEffect(() => {
    if (landingMode) {
      return;
    }

    if (!window.unisat?.on) {
      return;
    }

    const syncWallet = async () => {
      const accounts = await window.unisat?.getAccounts?.().catch(() => []);
      const nextAddress = accounts?.[0] ?? "";
      const nextNetwork = idLaunchMode ? "livenet" : (await getWalletNetwork(window.unisat as UnisatWallet)) ?? network;

      setAddress(nextAddress);
      setNetwork(nextNetwork);
      setInbox([]);
      setChainSent([]);
      setSelectedKey("");
      setActiveFolder(idLaunchMode ? "ids" : "inbox");
      setComposeOpen(false);

      if (!nextAddress) {
        setStatus({ tone: "idle", text: "Wallet account disconnected." });
        return;
      }

      try {
        if (idLaunchMode) {
          await switchWalletNetwork(window.unisat as UnisatWallet, "livenet");
          const records = await fetchIdRegistry("livenet");
          setIdRegistry(records);
          setStatus({ tone: "good", text: `${shortAddress(nextAddress)} connected. ProofOfWork ID registry ready.` });
          return;
        }

        const { inboxMessages, sentMessages } = await fetchAddressMail(nextAddress, nextNetwork);
        setInbox(inboxMessages);
        setChainSent(sentMessages);
        setSelectedKey(selectedInboundKey("inbox", inboxMessages));
        setStatus({ tone: "good", text: `${shortAddress(nextAddress)} loaded. ${mailboxSummary(inboxMessages, sentMessages)}.` });
      } catch (error) {
        setStatus({ tone: "bad", text: errorMessage(error, "Address scan failed.") });
      }
    };

    const accountsChanged = () => {
      void syncWallet();
    };
    const networkChanged = () => {
      void syncWallet();
    };
    const chainChanged = () => {
      void syncWallet();
    };

    window.unisat.on("accountsChanged", accountsChanged);
    window.unisat.on("networkChanged", networkChanged);
    window.unisat.on("chainChanged", chainChanged);

    return () => {
      window.unisat?.removeListener?.("accountsChanged", accountsChanged);
      window.unisat?.removeListener?.("networkChanged", networkChanged);
      window.unisat?.removeListener?.("chainChanged", chainChanged);
    };
  }, [hasUnisat, idLaunchMode, landingMode, network]);

  function applyDraft(draft: DraftMessage) {
    setRecipient(draft.recipient);
    setAmountSats(draft.amountSats);
    setFeeRate(draft.feeRate);
    setMemo(draft.memo);
    setAttachment(draft.attachment);
    setReplyParentTxid(draft.parentTxid);
    setActiveFolder("drafts");
    setComposeOpen(true);
    setSelectedKey("draft");
  }

  function isArchived(message: MailMessage) {
    return archivedKeys.has(mailKey(message));
  }

  function isFavorite(message: MailMessage) {
    return favoriteKeys.has(mailKey(message));
  }

  function canArchive(message: MailMessage) {
    return message.folder === "inbox" || (message.folder === "sent" && sentDeliveryStatus(message) === "confirmed");
  }

  function canFavorite(message: MailMessage) {
    return message.folder === "inbox" || (message.folder === "sent" && sentDeliveryStatus(message) === "confirmed");
  }

  function setMessageFavorite(message: MailMessage, favorite: boolean) {
    if (!canFavorite(message)) {
      setStatus({ tone: "bad", text: "Only confirmed mail can be favorited." });
      return;
    }

    const key = mailKey(message);
    setMailPreferences((current) => {
      const next = { ...current };
      if (favorite) {
        next[key] = { ...next[key], favorite: true };
      } else {
        const { favorite: _favorite, ...rest } = next[key] ?? {};
        if (Object.keys(rest).length > 0) {
          next[key] = rest;
        } else {
          delete next[key];
        }
      }

      return next;
    });

    setStatus({ tone: "good", text: favorite ? "Message added to Favorites." : "Message removed from Favorites." });
  }

  function setMessageArchived(message: MailMessage, archived: boolean) {
    if (!canArchive(message)) {
      setStatus({ tone: "bad", text: "Only confirmed mail can be archived." });
      return;
    }

    const key = mailKey(message);
    setMailPreferences((current) => {
      const next = { ...current };
      if (archived) {
        next[key] = { ...next[key], archived: true };
      } else {
        const { archived: _archived, ...rest } = next[key] ?? {};
        if (Object.keys(rest).length > 0) {
          next[key] = rest;
        } else {
          delete next[key];
        }
      }

      return next;
    });

    setSelectedKey("");
    setComposeOpen(false);
    setStatus({ tone: "good", text: archived ? "Message archived." : "Message returned to mail." });
  }

  function restoreSentAsDraft(message: MailMessage) {
    if (message.folder !== "sent") {
      return;
    }

    const draft: DraftMessage = {
      amountSats: message.amountSats,
      attachment: message.attachment,
      feeRate: message.feeRate,
      from: message.from,
      memo: message.memo,
      network: message.network,
      parentTxid: message.parentTxid,
      recipient: message.to,
      updatedAt: new Date().toISOString(),
    };

    saveDraft(draft);
    setSavedDraft(draft);
    applyDraft(draft);
    setStatus({ tone: "good", text: "Dropped message restored as a draft. Review it, then send to sign a fresh transaction." });
  }

  function openFolder(folder: Folder) {
    if (folder === "drafts") {
      const draft = address ? loadDraft(address, network) : savedDraft;
      setSavedDraft(draft);
      setActiveFolder("drafts");
      setSortMode((current) => (["largest", "filetype", "sender"].includes(current) ? "value" : current));
      setSelectedKey("");

      if (draft) {
        applyDraft(draft);
        setStatus({ tone: "idle", text: `Draft restored. Last saved ${formatDate(draft.updatedAt)}.` });
      } else {
        setComposeOpen(false);
        setReplyParentTxid(undefined);
        setAttachment(undefined);
      }

      return;
    }

    setActiveFolder(folder);
    setSortMode((current) => (folder !== "files" && ["largest", "filetype", "sender"].includes(current) ? "value" : current));
    setComposeOpen(false);
    setReplyParentTxid(undefined);
    setAttachment(undefined);
    setSelectedKey("");
  }

  function openSourceMessage(message: MailMessage) {
    setActiveFolder(isArchived(message) ? "archive" : message.folder);
    setSortMode((current) => (["largest", "filetype", "sender"].includes(current) ? "value" : current));
    setComposeOpen(false);
    setReplyParentTxid(undefined);
    setAttachment(undefined);
    setSelectedKey(mailKey(message));
  }

  function composeNew() {
    setRecipient("");
    setAmountSats(DEFAULT_AMOUNT_SATS);
    setFeeRate(DEFAULT_FEE_RATE);
    setMemo(DEFAULT_MEMO);
    setAttachment(undefined);
    setReplyParentTxid(undefined);
    setActiveFolder("inbox");
    setComposeOpen(true);
  }

  function discardDraft() {
    if (address) {
      clearDraft(address, network);
    }

    setSavedDraft(undefined);
    setRecipient("");
    setAmountSats(DEFAULT_AMOUNT_SATS);
    setFeeRate(DEFAULT_FEE_RATE);
    setMemo(DEFAULT_MEMO);
    setAttachment(undefined);
    setReplyParentTxid(undefined);
    setComposeOpen(false);
    setSelectedKey("");
    setStatus({ tone: "good", text: "Draft discarded." });
  }

  function exportBackup() {
    const data = collectBackupData();
    const keyCount = Object.keys(data).length;
    if (keyCount === 0) {
      setStatus({ tone: "idle", text: "No local app data to export yet." });
      return;
    }

    const payload: LocalBackupPayload = {
      app: BACKUP_APP,
      data,
      exportedAt: new Date().toISOString(),
      version: BACKUP_VERSION,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = backupFileName();
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);

    const summary = backupDataSummary(data);
    setStatus({
      tone: "good",
      text: `Backup exported with ${keyCount} data group${keyCount === 1 ? "" : "s"}${summary ? `: ${summary}` : ""}.`,
    });
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";

    if (!file) {
      return;
    }

    if (file.size > BACKUP_MAX_BYTES) {
      setStatus({ tone: "bad", text: "Backup file is too large." });
      return;
    }

    try {
      const data = parseBackup(await file.text());
      for (const [key, value] of Object.entries(data)) {
        localStorage.setItem(key, value);
      }

      setTheme(loadTheme());
      setAllSent(loadSentMessages());
      setMailPreferences(loadMailPreferences());
      setSavedDraft(address ? loadDraft(address, network) : undefined);

      const keyCount = Object.keys(data).length;
      const summary = backupDataSummary(data);
      setStatus({
        tone: "good",
        text: `Backup imported. ${keyCount} data group${keyCount === 1 ? "" : "s"} restored${summary ? `: ${summary}` : ""}.`,
      });
    } catch (error) {
      setStatus({ tone: "bad", text: errorMessage(error, "Backup import failed.") });
    }
  }

  function replyTo(message: MailMessage) {
    const recipientAddress = isInboundFolder(message.folder) ? message.replyTo : message.to;
    const subject = messageSubject(message);
    setRecipient(recipientAddress === "Unknown" ? "" : recipientAddress);
    setAmountSats(message.amountSats);
    setMemo(`Re: ${subject}\n\n`);
    setAttachment(undefined);
    setReplyParentTxid(rootTxid(message));
    setComposeOpen(true);
  }

  function clearWalletSession() {
    setAddress("");
    setInbox([]);
    setChainSent([]);
    setSavedDraft(undefined);
    setSelectedKey("");
    setActiveFolder("inbox");
    setComposeOpen(true);
    setAttachment(undefined);
    setReplyParentTxid(undefined);
  }

  async function attachFile(file: File) {
    setStatus({ tone: "idle", text: `Reading ${file.name}...` });

    try {
      const nextAttachment = await attachmentFromFile(file);
      setAttachment(nextAttachment);
      setStatus({ tone: "good", text: `${nextAttachment.name} attached. ${formatBytes(nextAttachment.size)} before encoding.` });
    } catch (error) {
      setAttachment(undefined);
      setStatus({ tone: "bad", text: errorMessage(error, "Attachment could not be read.") });
    }
  }

  async function connectWallet() {
    if (!window.unisat) {
      setHasUnisat(false);
      setStatus({ tone: "bad", text: "UniSat is not installed." });
      return;
    }

    setBusy(true);
    setStatus({ tone: "idle", text: "Opening UniSat..." });

    try {
      const accounts = window.unisat.requestAccounts
        ? await window.unisat.requestAccounts()
        : await window.unisat.getAccounts?.();

      const firstAddress = accounts?.[0];
      if (!firstAddress) {
        throw new Error("UniSat did not return an address.");
      }

      const walletNetwork = await getWalletNetwork(window.unisat);
      if (idLaunchMode) {
        if (walletNetwork !== "livenet") {
          await switchWalletNetwork(window.unisat, "livenet");
        }
        setNetwork("livenet");
      } else if (walletNetwork) {
        setNetwork(walletNetwork);
      }

      setAddress(firstAddress);
      setInbox([]);
      setChainSent([]);
      setSelectedKey("");
      setActiveFolder(idLaunchMode ? "ids" : "inbox");
      setComposeOpen(false);

      try {
        if (idLaunchMode) {
          const records = await fetchIdRegistry("livenet");
          setIdRegistry(records);
          setStatus({ tone: "good", text: `UniSat connected. ProofOfWork ID registry ready.` });
          return;
        }

        const { inboxMessages, sentMessages } = await fetchAddressMail(firstAddress, walletNetwork ?? network);
        setInbox(inboxMessages);
        setChainSent(sentMessages);
        setSelectedKey(selectedInboundKey("inbox", inboxMessages));
        setStatus({ tone: "good", text: `UniSat connected. ${mailboxSummary(inboxMessages, sentMessages)}.` });
      } catch (error) {
        setStatus({ tone: "bad", text: errorMessage(error, "UniSat connected, but address scan failed.") });
      }
    } catch (error) {
      setStatus({ tone: "bad", text: errorMessage(error, "Could not connect UniSat.") });
    } finally {
      setBusy(false);
    }
  }

  async function disconnectWallet() {
    setBusy(true);
    setStatus({ tone: "idle", text: "Disconnecting UniSat..." });

    try {
      await window.unisat?.disconnect?.();
      clearWalletSession();
      setStatus({ tone: "good", text: "Wallet disconnected." });
    } catch (error) {
      clearWalletSession();
      setStatus({ tone: "bad", text: `Local account cleared. ${errorMessage(error, "Wallet disconnect failed.")}` });
    } finally {
      setBusy(false);
    }
  }

  async function chooseNetwork(nextNetwork: BitcoinNetwork) {
    setNetwork(nextNetwork);
    setInbox([]);
    setChainSent([]);
    setSelectedKey("");

    if (!window.unisat?.switchChain && !window.unisat?.switchNetwork) {
      setStatus({ tone: "idle", text: `${networkLabel(nextNetwork)} selected.` });
      return;
    }

    setBusy(true);
    setStatus({ tone: "idle", text: `Switching to ${networkLabel(nextNetwork)}...` });

    try {
      await switchWalletNetwork(window.unisat, nextNetwork);
      const activeWalletNetwork = (await getWalletNetwork(window.unisat)) ?? nextNetwork;
      const accounts = window.unisat.getAccounts ? await window.unisat.getAccounts() : [];
      const nextAddress = accounts[0] ?? address;
      setNetwork(activeWalletNetwork);
      setAddress(nextAddress);
      setInbox([]);
      setChainSent([]);
      setSelectedKey("");

      if (!nextAddress) {
        setStatus({ tone: "good", text: `${networkLabel(activeWalletNetwork)} ready.` });
        return;
      }

      const { inboxMessages, sentMessages } = await fetchAddressMail(nextAddress, activeWalletNetwork);
      setInbox(inboxMessages);
      setChainSent(sentMessages);
      setSelectedKey(selectedInboundKey("inbox", inboxMessages));
      setStatus({ tone: "good", text: `${networkLabel(activeWalletNetwork)} ready. ${mailboxSummary(inboxMessages, sentMessages)}.` });
    } catch (error) {
      setStatus({ tone: "bad", text: errorMessage(error, "Network switch failed.") });
    } finally {
      setBusy(false);
    }
  }

  async function refreshIds(silent = false) {
    if (!registryAddress) {
      setIdRegistry([]);
      if (!silent) {
        setStatus({ tone: "idle", text: `No ProofOfWork ID registry configured for ${networkLabel(network)} yet.` });
      }
      return;
    }

    setBusy(true);
    if (!silent) {
      setStatus({ tone: "idle", text: "Scanning ProofOfWork ID registry..." });
    }

    try {
      const records = await fetchIdRegistry(network);
      setIdRegistry(records);
      if (!silent) {
        const confirmed = records.filter((record) => record.confirmed).length;
        const pending = records.length - confirmed;
        setStatus({ tone: "good", text: `ID registry loaded. ${confirmed} confirmed, ${pending} pending.` });
      }
    } catch (error) {
      setStatus({ tone: "bad", text: errorMessage(error, "ID registry scan failed.") });
    } finally {
      setBusy(false);
    }
  }

  async function registerId(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!window.unisat) {
      setStatus({ tone: "bad", text: "Connect UniSat first." });
      return;
    }

    if (!window.unisat.signPsbt) {
      setStatus({ tone: "bad", text: "UniSat signPsbt is not available. Update UniSat and try again." });
      return;
    }

    if (!registryAddress) {
      setStatus({ tone: "bad", text: `No ProofOfWork ID registry configured for ${networkLabel(network)} yet.` });
      return;
    }

    const idError = powIdError(normalizedIdName);
    if (idError) {
      setStatus({ tone: "bad", text: idError });
      return;
    }

    if (!isValidBitcoinAddress(idReceiveAddress.trim(), network)) {
      setStatus({ tone: "bad", text: "Receive address is not valid for the selected network." });
      return;
    }

    if (idRegistrationBytes > MAX_DATA_CARRIER_BYTES) {
      setStatus({ tone: "bad", text: "ID registration OP_RETURN is over 100 KB." });
      return;
    }

    setBusy(true);
    setStatus({ tone: "idle", text: `Checking ${normalizedIdName}@proofofwork.me against the full registry...` });

    try {
      const latestRegistry = await fetchIdRegistry(network);
      setIdRegistry(latestRegistry);

      const existingRecord = latestRegistry.find((record) => record.network === network && record.id === normalizedIdName);
      if (existingRecord?.confirmed) {
        setStatus({ tone: "bad", text: `${normalizedIdName}@proofofwork.me is already registered.` });
        return;
      }

      if (existingRecord) {
        setStatus({ tone: "bad", text: `${normalizedIdName}@proofofwork.me is already pending. Wait for confirmation before retrying.` });
        return;
      }

      setStatus({ tone: "idle", text: `Registering ${normalizedIdName}@proofofwork.me...` });

      const currentNetwork = await getWalletNetwork(window.unisat);
      if (currentNetwork !== network) {
        await switchWalletNetwork(window.unisat, network);
      }

      const paymentPsbt = await buildPaymentPsbt({
        amountSats: ID_REGISTRATION_PRICE_SATS,
        feeRate,
        fromAddress: address,
        network,
        protocolPayloads: [idRegistrationPayload],
        toAddress: registryAddress,
      });

      const txid = await signAndBroadcastPsbt({
        inputCount: paymentPsbt.inputCount,
        network,
        psbtHex: paymentPsbt.psbtHex,
        wallet: window.unisat,
      });
      const registeredRecord: PowIdRecord = {
        amountSats: ID_REGISTRATION_PRICE_SATS,
        confirmed: false,
        createdAt: new Date().toISOString(),
        id: normalizedIdName,
        network,
        ownerAddress: address,
        pgpKey: idPgpKey.trim() || undefined,
        receiveAddress: idReceiveAddress.trim(),
        txid,
      };

      setLastRegisteredId(registeredRecord);
      setIdRegistry((current) => current.some((record) => record.txid === txid) ? current : [registeredRecord, ...current]);
      setIdName("");
      setIdPgpKey("");
      setStatus({ tone: "good", text: `${normalizedIdName}@proofofwork.me registration broadcast: ${shortAddress(txid)}.` });
      await refreshIds(true);
      setIdRegistry((current) => current.some((record) => record.txid === txid) ? current : [registeredRecord, ...current]);
    } catch (error) {
      setStatus({ tone: "bad", text: errorMessage(error, "ID registration failed.") });
    } finally {
      setBusy(false);
    }
  }

  async function sendOpReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!window.unisat) {
      setStatus({ tone: "bad", text: "Connect UniSat first." });
      return;
    }

    if (!window.unisat.signPsbt) {
      setStatus({ tone: "bad", text: "UniSat signPsbt is not available. Update UniSat and try again." });
      return;
    }

    if (dataCarrierBytes > MAX_DATA_CARRIER_BYTES) {
      setStatus({ tone: "bad", text: "Aggregate OP_RETURN data-carrier scripts are over 100 KB." });
      return;
    }

    let resolvedRecipient = recipientResolution;
    const recipientInput = recipient.trim();
    const shouldResolveId = Boolean(recipientInput && !isValidBitcoinAddress(recipientInput, network));

    setBusy(true);
    setStatus({ tone: "idle", text: shouldResolveId ? "Checking ProofOfWork ID registry..." : "Building PSBT..." });

    try {
      if (shouldResolveId) {
        if (!registryAddress) {
          setStatus({ tone: "bad", text: `ProofOfWork ID registry is not configured for ${networkLabel(network)}.` });
          return;
        }

        const records = await fetchIdRegistry(network);
        setIdRegistry(records);
        resolvedRecipient = resolveRecipientInput(recipientInput, network, records, registryAddress);
      }

      if (resolvedRecipient.error || !resolvedRecipient.paymentAddress) {
        setStatus({ tone: "bad", text: resolvedRecipient.error || "Enter a valid Bitcoin address or confirmed ProofOfWork ID." });
        return;
      }

      setStatus({ tone: "idle", text: "Building PSBT..." });
      const currentNetwork = await getWalletNetwork(window.unisat);
      if (currentNetwork !== network) {
        await switchWalletNetwork(window.unisat, network);
      }

      const satoshis = Math.floor(amountSats);
      const paymentPsbt = await buildPaymentPsbt({
        amountSats: satoshis,
        feeRate,
        fromAddress: address,
        network,
        protocolPayloads,
        toAddress: resolvedRecipient.paymentAddress,
      });

      setStatus({
        tone: "idle",
        text: `Waiting for UniSat signature. Fee estimate: ${paymentPsbt.feeSats.toLocaleString()} sats.`,
      });

      const txid = await signAndBroadcastPsbt({
        inputCount: paymentPsbt.inputCount,
        network,
        psbtHex: paymentPsbt.psbtHex,
        wallet: window.unisat,
      });

      const sentMessage: SentMessage = {
        txid,
        network,
        from: address,
        to: resolvedRecipient.isId ? resolvedRecipient.displayRecipient : resolvedRecipient.paymentAddress,
        amountSats: satoshis,
        feeRate,
        memo,
        attachment,
        status: "pending",
        lastCheckedAt: new Date().toISOString(),
        replyTo: address,
        parentTxid: replyParentTxid,
        createdAt: new Date().toISOString(),
      };

      clearDraft(address, network);
      setSavedDraft(undefined);
      setAllSent((current) => [sentMessage, ...current]);
      setActiveFolder("outbox");
      setComposeOpen(false);
      setAttachment(undefined);
      setReplyParentTxid(undefined);
      setSelectedKey(`sent-${network}-${txid}`);
      setStatus({
        tone: "good",
        text: `Transaction broadcast. ${paymentPsbt.inputCount} input${paymentPsbt.inputCount === 1 ? "" : "s"}, ${paymentPsbt.outputCount} output${paymentPsbt.outputCount === 1 ? "" : "s"}.`,
      });
    } catch (error) {
      setStatus({ tone: "bad", text: errorMessage(error, "Transaction failed.") });
    } finally {
      setBusy(false);
    }
  }

  async function refreshMail(nextFolder: Folder = activeFolder) {
    if (!address) {
      setStatus({ tone: "bad", text: "Connect UniSat first." });
      return;
    }

    setBusy(true);
    setRefreshing(true);
    setCheckingBroadcasts(true);
    setStatus({ tone: "idle", text: "Refreshing mail and transaction statuses..." });

    try {
      const { inboxMessages, sentMessages } = await fetchAddressMail(address, network);
      const targets = broadcastTargetsFor(address, network, allSentRef.current, sentMessages);
      const summary = targets.length ? await checkBroadcastTargets(targets) : undefined;
      const checkedSentMessages = summary ? applyBroadcastCheckResults(sentMessages, summary) : sentMessages;

      setInbox(inboxMessages);
      setChainSent(checkedSentMessages);
      if (summary) {
        setAllSent((current) => applyBroadcastCheckResults(current, summary));
      }

      setActiveFolder(nextFolder);
      if (nextFolder !== "drafts") {
        setComposeOpen(false);
      }
      setSelectedKey(selectedInboundKey(nextFolder, inboxMessages));
      setStatus({
        tone: summary && summary.failed === summary.results.length ? "bad" : "good",
        text: `Refreshed. ${mailboxSummary(inboxMessages, checkedSentMessages)}${
          summary ? `. ${broadcastCheckSummaryText(summary)}` : ""
        }.`,
      });
    } catch (error) {
      setStatus({ tone: "bad", text: errorMessage(error, "Refresh failed.") });
    } finally {
      setCheckingBroadcasts(false);
      setRefreshing(false);
      setBusy(false);
    }
  }

  if (landingMode) {
    return (
      <LandingApp
        registryRecords={idRegistry.filter((record) => record.network === "livenet")}
        setTheme={setTheme}
        theme={theme}
        onRefresh={() => void refreshIds()}
      />
    );
  }

  if (idLaunchMode) {
    return (
      <IdLaunchApp
        address={address}
        busy={busy}
        canRegister={canRegisterId}
        connectWallet={connectWallet}
        disconnectWallet={disconnectWallet}
        feeRate={feeRate}
        hasUnisat={hasUnisat}
        idName={idName}
        idPgpKey={idPgpKey}
        idReceiveAddress={idReceiveAddress}
        lastRegisteredId={lastRegisteredId?.network === "livenet" ? lastRegisteredId : undefined}
        registryAddress={registryAddressForNetwork("livenet")}
        registryRecords={idRegistry.filter((record) => record.network === "livenet")}
        registrationBytes={idRegistrationBytes}
        setFeeRate={setFeeRate}
        setIdName={setIdName}
        setIdPgpKey={setIdPgpKey}
        setIdReceiveAddress={setIdReceiveAddress}
        setTheme={setTheme}
        status={status}
        submit={registerId}
        theme={theme}
        onRefresh={() => void refreshIds()}
      />
    );
  }

  return (
    <main className="mail-app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            PoW
          </div>
          <div>
            <h1>ProofOfWork.Me</h1>
            <span>{networkLabel(network)}</span>
          </div>
        </div>

        <div className="topbar-controls">
          <button
            aria-label={theme === "dark" ? "Use light mode" : "Use dark mode"}
            className="icon-button"
            disabled={busy}
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            type="button"
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button
            className="secondary"
            disabled={refreshDisabled}
            onClick={() => void (activeFolder === "ids" ? refreshIds() : refreshMail(activeFolder))}
            title="Refresh mail and transaction statuses"
            type="button"
          >
            <span className="button-content">
              <RefreshCw className={refreshInProgress ? "refresh-spin" : ""} size={16} />
              <span>{refreshInProgress ? "Refreshing" : "Refresh"}</span>
            </span>
          </button>
          <div className="network-tabs" aria-label="Bitcoin network">
            <button
              aria-pressed={network === "testnet4"}
              disabled={busy}
              onClick={() => chooseNetwork("testnet4")}
              type="button"
            >
              Testnet4
            </button>
            <button
              aria-pressed={network === "testnet"}
              disabled={busy}
              onClick={() => chooseNetwork("testnet")}
              type="button"
            >
              Testnet3
            </button>
            <button
              aria-pressed={network === "livenet"}
              disabled={busy}
              onClick={() => chooseNetwork("livenet")}
              type="button"
            >
              Mainnet
            </button>
          </div>
          {hasUnisat ? (
            <button className="secondary" disabled={busy} onClick={connectWallet} type="button">
              <span className="button-content">
                <Wallet size={16} />
                <span>{address ? shortAddress(address) : "Connect UniSat"}</span>
              </span>
            </button>
          ) : (
            <a className="secondary link-button" href={UNISAT_DOWNLOAD_URL} rel="noreferrer" target="_blank">
              <span className="button-content">
                <Wallet size={16} />
                <span>Install UniSat</span>
                <ArrowUpRight size={15} />
              </span>
            </a>
          )}
          {address ? (
            <button className="secondary" disabled={busy} onClick={disconnectWallet} type="button">
              <span className="button-content">
                <LogOut size={16} />
                <span>Disconnect</span>
              </span>
            </button>
          ) : null}
        </div>
      </header>

      <div className={`status ${status.tone}`}>
        <span className="status-dot" aria-hidden="true" />
        <span>{status.text}</span>
      </div>

      <section className={`mail-layout ${address ? "" : "is-onboarding"}`}>
        <aside className="sidebar">
          <button className="compose-button" onClick={composeNew} type="button">
            <span className="button-content">
              <PenLine size={17} />
              <span>Compose</span>
            </span>
          </button>

          <nav className="folders" aria-label="Folders">
            <button aria-current={activeFolder === "inbox"} onClick={() => openFolder("inbox")} type="button">
              <span className="folder-label">
                <Inbox size={17} />
                <span>Inbox</span>
              </span>
              <strong>{inboxMail.length}</strong>
            </button>
            <button aria-current={activeFolder === "incoming"} onClick={() => openFolder("incoming")} type="button">
              <span className="folder-label">
                <Mail size={17} />
                <span>Incoming</span>
              </span>
              <strong>{incomingMail.length}</strong>
            </button>
            <button aria-current={activeFolder === "sent"} onClick={() => openFolder("sent")} type="button">
              <span className="folder-label">
                <Send size={17} />
                <span>Sent</span>
              </span>
              <strong>{sentMail.length}</strong>
            </button>
            <button aria-current={activeFolder === "outbox"} onClick={() => openFolder("outbox")} type="button">
              <span className="folder-label">
                <Clock size={17} />
                <span>Outbox</span>
              </span>
              <strong>{outboxMail.length}</strong>
            </button>
            <button aria-current={activeFolder === "drafts"} onClick={() => openFolder("drafts")} type="button">
              <span className="folder-label">
                <FilePenLine size={17} />
                <span>Drafts</span>
              </span>
              <strong>{savedDraft ? 1 : 0}</strong>
            </button>
            <button aria-current={activeFolder === "favorites"} onClick={() => openFolder("favorites")} type="button">
              <span className="folder-label">
                <Star size={17} />
                <span>Favorites</span>
              </span>
              <strong>{favoritesMail.length}</strong>
            </button>
            <button aria-current={activeFolder === "archive"} onClick={() => openFolder("archive")} type="button">
              <span className="folder-label">
                <Archive size={17} />
                <span>Archive</span>
              </span>
              <strong>{archiveMail.length}</strong>
            </button>
            <button aria-current={activeFolder === "files"} onClick={() => openFolder("files")} type="button">
              <span className="folder-label">
                <Paperclip size={17} />
                <span>Files</span>
              </span>
              <strong>{allFileMessages.length}</strong>
            </button>
            <button aria-current={activeFolder === "ids"} onClick={() => openFolder("ids")} type="button">
              <span className="folder-label">
                <AtSign size={17} />
                <span>IDs</span>
              </span>
              <strong>{ownedIdCount}</strong>
            </button>
            {registryAddress ? (
              <div className="registry-network-stat" aria-label="ProofOfWork ID registry network total">
                <span>Registry Network</span>
                <strong>{idRegistry.length.toLocaleString()}</strong>
                <small>
                  {confirmedIdCount.toLocaleString()} confirmed · {pendingIdCount.toLocaleString()} pending
                </small>
              </div>
            ) : null}
          </nav>

          <div className="account-box">
            <span>Account</span>
            <code>{address || "Not connected"}</code>
            <div className="backup-actions" aria-label="Local data backup">
              <button className="secondary small" onClick={exportBackup} type="button">
                <span className="button-content">
                  <Download size={15} />
                  <span>Export</span>
                </span>
              </button>
              <button className="secondary small" onClick={() => backupInputRef.current?.click()} type="button">
                <span className="button-content">
                  <Upload size={15} />
                  <span>Import</span>
                </span>
              </button>
            </div>
            <input
              ref={backupInputRef}
              accept="application/json,.json"
              className="backup-file-input"
              onChange={(event) => void importBackup(event)}
              type="file"
            />
            <SocialFooter compact />
          </div>
        </aside>

        {activeFolder === "ids" ? (
          <IdsWorkspace
            address={address}
            busy={busy}
            canRegister={canRegisterId}
            feeRate={feeRate}
            idName={idName}
            idPgpKey={idPgpKey}
            idReceiveAddress={idReceiveAddress}
            network={network}
            registryAddress={registryAddress}
            registryRecords={idRegistry}
            registrationBytes={idRegistrationBytes}
            lastRegisteredId={lastRegisteredId?.network === network ? lastRegisteredId : undefined}
            setFeeRate={setFeeRate}
            setIdName={setIdName}
            setIdPgpKey={setIdPgpKey}
            setIdReceiveAddress={setIdReceiveAddress}
            onRefresh={() => void refreshIds()}
            submit={registerId}
          />
        ) : activeFolder === "files" ? (
          <FilesWorkspace
            activeKey={selectedMessage ? mailKey(selectedMessage) : ""}
            activeNetwork={network}
            busy={busy || refreshInProgress}
            connected={Boolean(address)}
            fileFilter={fileFilter}
            messages={activeMessages}
            refreshing={refreshInProgress}
            selectedMessage={selectedMessage && hasAttachment(selectedMessage) ? selectedMessage : undefined}
            setFileFilter={setFileFilter}
            setSortMode={setSortMode}
            sortMode={sortMode}
            onOpenInbox={() => openFolder("inbox")}
            onOpenMessage={openSourceMessage}
            onRefresh={() => void refreshMail("files")}
            onSelect={(message) => {
              setComposeOpen(false);
              setSelectedKey(mailKey(message));
            }}
          />
        ) : (
          <>
            <section className="message-column">
              <div className="list-toolbar">
                <div>
                  <h2>{folderLabel(activeFolder)}</h2>
                  <span>{folderSubtitle(activeFolder)}</span>
                </div>
                {activeFolder === "drafts" ? null : (
                  <label className="sort-control">
                    Sort
                    <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
                      <option value="value">Highest sats</option>
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                      <option value="thread">Thread</option>
                    </select>
                  </label>
                )}
                {activeFolder !== "drafts" ? (
                  <button className="secondary small" disabled={refreshDisabled} onClick={() => void refreshMail(activeFolder)} type="button">
                    <span className="button-content">
                      <RefreshCw className={refreshInProgress ? "refresh-spin" : ""} size={15} />
                      <span>{refreshInProgress ? "Refreshing" : "Refresh"}</span>
                    </span>
                  </button>
                ) : null}
              </div>

              {activeFolder === "drafts" ? (
                <DraftList
                  draft={savedDraft}
                  onCompose={composeNew}
                  onDiscard={discardDraft}
                  onOpen={(draft) => {
                    applyDraft(draft);
                    setStatus({ tone: "idle", text: `Draft restored. Last saved ${formatDate(draft.updatedAt)}.` });
                  }}
                />
              ) : (
                <MessageList
                  activeKey={selectedMessage ? mailKey(selectedMessage) : ""}
                  activeNetwork={network}
                  activeFolder={activeFolder}
                  favoriteKeys={favoriteKeys}
                  inboxCount={inboxMail.length}
                  messages={activeMessages}
                  onOpenInbox={() => openFolder("inbox")}
                  onSelect={(message) => {
                    setComposeOpen(false);
                    setSelectedKey(mailKey(message));
                  }}
                />
              )}
            </section>

            <section className="reader-pane">
              {!address ? (
                <OnboardingPane busy={busy} hasUnisat={hasUnisat} network={network} onConnect={connectWallet} />
              ) : activeFolder === "drafts" && composeOpen ? (
                <ComposePane
                  amountSats={amountSats}
                  attachment={attachment}
                  busy={busy}
                  canSend={canSend}
                  dataCarrierBytes={dataCarrierBytes}
                  draftMode
                  feeRate={feeRate}
                  memo={memo}
                  network={network}
                  onDiscardDraft={discardDraft}
                  parentTxid={replyParentTxid}
                  recipient={recipient}
                  recipientError={Boolean(recipientResolution.error)}
                  recipientNote={recipientNote}
                  sender={address}
                  setAttachment={setAttachment}
                  setAttachmentFile={(file) => void attachFile(file)}
                  setParentTxid={setReplyParentTxid}
                  setAmountSats={setAmountSats}
                  setFeeRate={setFeeRate}
                  setMemo={setMemo}
                  setRecipient={setRecipient}
                  submit={sendOpReturn}
                />
              ) : activeFolder === "drafts" ? (
                <div className="empty-reader">
                  <div className="empty-icon" aria-hidden="true">
                    <FilePenLine size={26} />
                  </div>
                  <h3>No draft selected</h3>
                  <button className="compose-button" onClick={composeNew} type="button">
                    <span className="button-content">
                      <PenLine size={17} />
                      <span>Compose</span>
                    </span>
                  </button>
                </div>
              ) : composeOpen ? (
                <ComposePane
                  amountSats={amountSats}
                  attachment={attachment}
                  busy={busy}
                  canSend={canSend}
                  feeRate={feeRate}
                  memo={memo}
                  dataCarrierBytes={dataCarrierBytes}
                  network={network}
                  parentTxid={replyParentTxid}
                  recipient={recipient}
                  recipientError={Boolean(recipientResolution.error)}
                  recipientNote={recipientNote}
                  sender={address}
                  setAttachment={setAttachment}
                  setAttachmentFile={(file) => void attachFile(file)}
                  setParentTxid={setReplyParentTxid}
                  setAmountSats={setAmountSats}
                  setFeeRate={setFeeRate}
                  setMemo={setMemo}
                  setRecipient={setRecipient}
                  submit={sendOpReturn}
                />
              ) : selectedMessage ? (
                <Reader
                  activeNetwork={network}
                  archivable={canArchive(selectedMessage)}
                  archived={isArchived(selectedMessage)}
                  checkingBroadcasts={checkingBroadcasts}
                  deliveryStatus={selectedMessage.folder === "sent" ? sentDeliveryStatus(selectedMessage) : undefined}
                  favoriteable={canFavorite(selectedMessage)}
                  favorited={isFavorite(selectedMessage)}
                  message={selectedMessage}
                  onArchiveToggle={setMessageArchived}
                  onCheckBroadcasts={() => void checkBroadcastStatuses(false)}
                  onFavoriteToggle={setMessageFavorite}
                  onReply={replyTo}
                  onRestoreDraft={restoreSentAsDraft}
                  threadMessages={threadMessages}
                />
              ) : (
                <div className="empty-reader">
                  <div className="empty-icon" aria-hidden="true">
                    <Mail size={26} />
                  </div>
                  <h3>Select a message</h3>
                  <button className="compose-button" onClick={composeNew} type="button">
                    <span className="button-content">
                      <PenLine size={17} />
                      <span>Compose</span>
                    </span>
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function LandingApp({
  registryRecords,
  setTheme,
  theme,
  onRefresh,
}: {
  registryRecords: PowIdRecord[];
  setTheme: (value: ThemeMode | ((current: ThemeMode) => ThemeMode)) => void;
  theme: ThemeMode;
  onRefresh: () => void;
}) {
  const confirmedRecords = registryRecords.filter((record) => record.confirmed);
  const pendingRecords = registryRecords.filter((record) => !record.confirmed);
  const registryAddress = registryAddressForNetwork("livenet");

  return (
    <main className="landing-app">
      <header className="landing-topbar">
        <a className="landing-brand" href="https://proofofwork.me" aria-label="ProofOfWork.Me home">
          <div className="brand-mark" aria-hidden="true">
            PoW
          </div>
          <div>
            <h1>ProofOfWork.Me</h1>
            <span>The final network</span>
          </div>
        </a>

        <nav className="landing-nav" aria-label="ProofOfWork.Me apps">
          <a href={ID_APP_URL}>IDs</a>
          <a href={COMPUTER_APP_URL}>Computer</a>
          <button
            aria-label={theme === "dark" ? "Use light mode" : "Use dark mode"}
            className="icon-button"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            type="button"
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-content">
          <span className="landing-kicker">Bitcoin-native identity, mail, and files</span>
          <h2>ProofOfWork.Me</h2>
          <p>
            Claim a permanent on-chain ID, then use it as your Bitcoin-native inbox across the open network.
          </p>
          <div className="landing-actions">
            <a className="primary link-button" href={ID_APP_URL}>
              <span className="button-content">
                <AtSign size={17} />
                <span>Claim an ID</span>
              </span>
            </a>
            <a className="secondary link-button" href={COMPUTER_APP_URL}>
              <span className="button-content">
                <Mail size={17} />
                <span>Open Computer</span>
              </span>
            </a>
          </div>
        </div>
      </section>

      <section className="landing-main" aria-label="ProofOfWork.Me onboarding">
        <section className="landing-stats" aria-label="ProofOfWork ID registry stats">
          <div>
            <span>Total IDs</span>
            <strong>{registryRecords.length.toLocaleString()}</strong>
          </div>
          <div>
            <span>Confirmed</span>
            <strong>{confirmedRecords.length.toLocaleString()}</strong>
          </div>
          <div>
            <span>Pending</span>
            <strong>{pendingRecords.length.toLocaleString()}</strong>
          </div>
          <button className="secondary" onClick={onRefresh} type="button">
            <span className="button-content">
              <RefreshCw size={16} />
              <span>Refresh Registry</span>
            </span>
          </button>
        </section>

        <section className="landing-choice-grid" aria-label="Choose an app">
          <article className="landing-choice">
            <div className="empty-icon" aria-hidden="true">
              <AtSign size={24} />
            </div>
            <div>
              <h3>Claim Your ID</h3>
              <p>
                Register <code>user@proofofwork.me</code> to your Bitcoin receive address through the canonical mainnet registry.
              </p>
            </div>
            <a className="primary link-button" href={ID_APP_URL}>
              <span className="button-content">
                <AtSign size={16} />
                <span>Go to IDs</span>
              </span>
            </a>
          </article>

          <article className="landing-choice">
            <div className="empty-icon" aria-hidden="true">
              <Mail size={24} />
            </div>
            <div>
              <h3>Open Computer</h3>
              <p>Send and receive Bitcoin-native mail, replies, and small files with local drafts, archive, favorites, and backups.</p>
            </div>
            <a className="secondary link-button" href={COMPUTER_APP_URL}>
              <span className="button-content">
                <Mail size={16} />
                <span>Open App</span>
              </span>
            </a>
          </article>
        </section>

        <section className="landing-protocol">
          <div>
            <span className="landing-kicker">Canonical registry</span>
            <h3>{shortAddress(registryAddress)}</h3>
            <p>
              ProofOfWork IDs are resolved from Bitcoin. First confirmed valid registration wins, and the app only routes mail to confirmed IDs.
            </p>
          </div>
          <a className="secondary link-button" href={`https://mempool.space/address/${registryAddress}`} rel="noreferrer" target="_blank">
            <span className="button-content">
              <ArrowUpRight size={16} />
              <span>View Registry</span>
            </span>
          </a>
        </section>
      </section>

      <SocialFooter />
    </main>
  );
}

function IdLaunchApp({
  address,
  busy,
  canRegister,
  connectWallet,
  disconnectWallet,
  feeRate,
  hasUnisat,
  idName,
  idPgpKey,
  idReceiveAddress,
  lastRegisteredId,
  registryAddress,
  registryRecords,
  registrationBytes,
  setFeeRate,
  setIdName,
  setIdPgpKey,
  setIdReceiveAddress,
  setTheme,
  status,
  submit,
  theme,
  onRefresh,
}: {
  address: string;
  busy: boolean;
  canRegister: boolean;
  connectWallet: () => void;
  disconnectWallet: () => void;
  feeRate: number;
  hasUnisat: boolean;
  idName: string;
  idPgpKey: string;
  idReceiveAddress: string;
  lastRegisteredId?: PowIdRecord;
  registryAddress: string;
  registryRecords: PowIdRecord[];
  registrationBytes: number;
  setFeeRate: (value: number) => void;
  setIdName: (value: string) => void;
  setIdPgpKey: (value: string) => void;
  setIdReceiveAddress: (value: string) => void;
  setTheme: (value: ThemeMode | ((current: ThemeMode) => ThemeMode)) => void;
  status: { tone: StatusTone; text: string };
  submit: (event: FormEvent<HTMLFormElement>) => void;
  theme: ThemeMode;
  onRefresh: () => void;
}) {
  const [showAllRegistryRecords, setShowAllRegistryRecords] = useState(false);
  const normalizedId = normalizePowId(idName);
  const ownedIds = ownedPowIds(registryRecords, address);
  const confirmedRecords = registryRecords.filter((record) => record.confirmed);
  const pendingRecords = registryRecords.filter((record) => !record.confirmed);
  const visibleRegistryRecords = showAllRegistryRecords ? registryRecords : registryRecords.slice(0, 12);
  const hiddenRegistryRecordCount = Math.max(0, registryRecords.length - visibleRegistryRecords.length);
  const confirmedMatch = normalizedId ? confirmedRecords.find((record) => record.id === normalizedId) : undefined;
  const pendingMatch = normalizedId ? pendingRecords.find((record) => record.id === normalizedId) : undefined;
  const availabilityTone = !normalizedId ? "idle" : confirmedMatch ? "bad" : pendingMatch ? "idle" : "good";
  const availabilityTitle = !normalizedId
    ? "Search any ID"
    : confirmedMatch
      ? `${normalizedId}@proofofwork.me is taken`
      : pendingMatch
        ? `${normalizedId}@proofofwork.me is pending`
        : `${normalizedId}@proofofwork.me is open`;
  const availabilityText = !normalizedId
    ? "Enter a name to check the Bitcoin registry before you claim."
    : confirmedMatch
      ? `First confirmed registration won in ${shortAddress(confirmedMatch.txid)}.`
      : pendingMatch
        ? "Pending is not final. First confirmed valid registration wins."
        : "Claimable now. Registration pays 1,000 sats to the canonical registry.";

  return (
    <main className="id-launch-app">
      <header className="id-launch-topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            PoW
          </div>
          <div>
            <h1>ProofOfWork IDs</h1>
            <span>Mainnet registry</span>
          </div>
        </div>

        <div className="topbar-controls">
          <button
            aria-label={theme === "dark" ? "Use light mode" : "Use dark mode"}
            className="icon-button"
            disabled={busy}
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            type="button"
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button className="secondary" disabled={busy} onClick={onRefresh} type="button">
            <span className="button-content">
              <RefreshCw className={busy ? "refresh-spin" : ""} size={16} />
              <span>{busy ? "Refreshing" : "Refresh"}</span>
            </span>
          </button>
          {hasUnisat ? (
            <button className="secondary" disabled={busy} onClick={connectWallet} type="button">
              <span className="button-content">
                <Wallet size={16} />
                <span>{address ? shortAddress(address) : "Connect UniSat"}</span>
              </span>
            </button>
          ) : (
            <a className="secondary link-button" href={UNISAT_DOWNLOAD_URL} rel="noreferrer" target="_blank">
              <span className="button-content">
                <Wallet size={16} />
                <span>Install UniSat</span>
                <ArrowUpRight size={15} />
              </span>
            </a>
          )}
          {address ? (
            <button className="secondary" disabled={busy} onClick={disconnectWallet} type="button">
              <span className="button-content">
                <LogOut size={16} />
                <span>Disconnect</span>
              </span>
            </button>
          ) : null}
        </div>
      </header>

      <div className={`status ${status.tone}`}>
        <span className="status-dot" aria-hidden="true" />
        <span>{status.text}</span>
      </div>

      <section className="id-launch-main">
        <div className="id-launch-hero">
          <div>
            <span className="id-launch-kicker">Bitcoin-native identity</span>
            <h2>Claim your ProofOfWork ID.</h2>
            <p>
              Register a permanent on-chain mail identity that resolves to your Bitcoin receive address.
              First confirmed valid registration wins.
            </p>
          </div>

          <div className="id-launch-stats" aria-label="Registry stats">
            <div>
              <strong>{registryRecords.length.toLocaleString()}</strong>
              <span>Total IDs</span>
            </div>
            <div>
              <strong>{confirmedRecords.length.toLocaleString()}</strong>
              <span>Confirmed</span>
            </div>
            <div>
              <strong>{pendingRecords.length.toLocaleString()}</strong>
              <span>Pending</span>
            </div>
          </div>
        </div>

        <div className="id-launch-grid">
          <form className="id-launch-card id-claim-card" onSubmit={submit}>
            <div className="id-card-head">
              <div className="empty-icon" aria-hidden="true">
                <AtSign size={24} />
              </div>
              <div>
                <h3>Register ID</h3>
                <p>Pay {ID_REGISTRATION_PRICE_SATS.toLocaleString()} sats to the canonical registry address.</p>
              </div>
            </div>

            <label>
              ID
              <div className="id-input-row">
                <input autoComplete="off" onChange={(event) => setIdName(event.target.value)} placeholder="user" spellCheck={false} value={idName} />
                <span>@proofofwork.me</span>
              </div>
            </label>

            <div className={`id-availability ${availabilityTone}`}>
              <strong>{availabilityTitle}</strong>
              <span>{availabilityText}</span>
            </div>

            <div className="compose-grid">
              <label>
                Owner
                <input readOnly value={address || "Connect UniSat"} />
              </label>
              <label>
                Receive address
                <input autoComplete="off" onChange={(event) => setIdReceiveAddress(event.target.value)} spellCheck={false} value={idReceiveAddress} />
              </label>
            </div>

            <details className="id-advanced">
              <summary>Advanced options</summary>
              <div className="id-advanced-content">
                <label>
                  PGP public key optional
                  <textarea onChange={(event) => setIdPgpKey(event.target.value)} placeholder="Paste an armored public key later when encryption is ready." value={idPgpKey} />
                </label>
                <div className="compose-grid">
                  <label>
                    Fee sat/vB
                    <input min={0} onChange={(event) => setFeeRate(Number(event.target.value))} step={0.01} type="number" value={feeRate} />
                  </label>
                  <label>
                    Registry
                    <input readOnly value={registryAddress} />
                  </label>
                </div>
              </div>
            </details>

            <div className={registrationBytes > MAX_DATA_CARRIER_BYTES ? "counter bad" : "counter"}>
              {registrationBytes.toLocaleString()} / {MAX_DATA_CARRIER_BYTES.toLocaleString()} OP_RETURN data-carrier bytes
            </div>

            <button className="primary" disabled={!canRegister} type="submit">
              <span className="button-content">
                <AtSign size={16} />
                <span>{busy ? "Registering" : "Register for 1,000 sats"}</span>
              </span>
            </button>
          </form>

          <aside className="id-launch-side">
            {lastRegisteredId ? (
              <section className="id-launch-card id-verify-card">
                <div className="id-card-head">
                  <div className="empty-icon" aria-hidden="true">
                    <AtSign size={24} />
                  </div>
                  <div>
                    <h3>Verify on X</h3>
                    <p>Post public proof for {lastRegisteredId.id}@proofofwork.me.</p>
                  </div>
                </div>
                <div className="id-record-actions">
                  <a className="primary link-button" href={xVerificationUrl(lastRegisteredId)} rel="noreferrer" target="_blank">
                    <span className="button-content">
                      <ArrowUpRight size={16} />
                      <span>Verify on X</span>
                    </span>
                  </a>
                  <a className="secondary link-button" href={mempoolTxUrl(lastRegisteredId.txid, lastRegisteredId.network)} rel="noreferrer" target="_blank">
                    <span className="button-content">
                      <ArrowUpRight size={16} />
                      <span>View TX</span>
                    </span>
                  </a>
                </div>
              </section>
            ) : null}

            <section className="id-launch-card">
              <h3>Canonical Registry</h3>
              <dl className="file-detail-list">
                <div>
                  <dt>Network</dt>
                  <dd>Mainnet</dd>
                </div>
                <div>
                  <dt>Address</dt>
                  <dd>{registryAddress}</dd>
                </div>
                <div>
                  <dt>Protocol</dt>
                  <dd>{ID_PROTOCOL_PREFIX}r2</dd>
                </div>
              </dl>
            </section>

            <section className="id-launch-card">
              <h3>Your IDs</h3>
              <IdRecordList records={ownedIds} allowVerification empty={address ? "No IDs for this wallet yet." : "Connect UniSat to see your IDs."} />
            </section>
          </aside>
        </div>

        <section className="id-launch-card">
          <div className="id-launch-section-head">
            <div>
              <h3>Public Registry</h3>
              <p>Global records create the network effect. Verification actions only appear for your own IDs.</p>
            </div>
            <button className="secondary small" disabled={busy} onClick={onRefresh} type="button">
              <span className="button-content">
                <RefreshCw className={busy ? "refresh-spin" : ""} size={15} />
                <span>Refresh</span>
              </span>
            </button>
          </div>
          <IdRecordList records={visibleRegistryRecords} empty="No registry records found yet." />
          {registryRecords.length > 12 ? (
            <button className="secondary registry-expand-button" onClick={() => setShowAllRegistryRecords((current) => !current)} type="button">
              <span className="button-content">
                <span>
                  {showAllRegistryRecords
                    ? "Show fewer IDs"
                    : `Show all IDs (${hiddenRegistryRecordCount.toLocaleString()} more)`}
                </span>
              </span>
            </button>
          ) : null}
        </section>
      </section>

      <SocialFooter />
    </main>
  );
}

function SocialFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={compact ? "app-footer compact" : "app-footer"}>
      <span>ProofOfWork.Me</span>
      <nav aria-label="Official ProofOfWork.Me links">
        <a href={X_URL} rel="noreferrer" target="_blank" aria-label="ProofOfWork.Me on X">
          <span className="button-content">
            <X size={14} />
            <span>X</span>
          </span>
        </a>
        <a href={GITHUB_URL} rel="noreferrer" target="_blank" aria-label="ProofOfWork.Me on GitHub">
          <span className="button-content">
            <GitBranch size={14} />
            <span>GitHub</span>
          </span>
        </a>
        <a href={DISCORD_URL} rel="noreferrer" target="_blank" aria-label="ProofOfWork.Me Discord">
          <span className="button-content">
            <MessageCircle size={14} />
            <span>Discord</span>
          </span>
        </a>
      </nav>
    </footer>
  );
}

function IdsWorkspace({
  address,
  busy,
  canRegister,
  feeRate,
  idName,
  idPgpKey,
  idReceiveAddress,
  network,
  registryAddress,
  registryRecords,
  registrationBytes,
  lastRegisteredId,
  setFeeRate,
  setIdName,
  setIdPgpKey,
  setIdReceiveAddress,
  onRefresh,
  submit,
}: {
  address: string;
  busy: boolean;
  canRegister: boolean;
  feeRate: number;
  idName: string;
  idPgpKey: string;
  idReceiveAddress: string;
  network: BitcoinNetwork;
  registryAddress: string;
  registryRecords: PowIdRecord[];
  registrationBytes: number;
  lastRegisteredId?: PowIdRecord;
  setFeeRate: (value: number) => void;
  setIdName: (value: string) => void;
  setIdPgpKey: (value: string) => void;
  setIdReceiveAddress: (value: string) => void;
  onRefresh: () => void;
  submit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const normalizedId = normalizePowId(idName);
  const idError = powIdError(normalizedId);
  const ownedIds = ownedPowIds(registryRecords, address);

  return (
    <section className="ids-workspace">
      <div className="files-toolbar">
        <div>
          <h2>ProofOfWork IDs</h2>
          <span>{registryAddress ? `${registryRecords.length} total registry record${registryRecords.length === 1 ? "" : "s"} · ${ownedIds.length} yours` : `No registry configured for ${networkLabel(network)}`}</span>
        </div>
        <button className="secondary small" disabled={busy || !registryAddress} onClick={onRefresh} type="button">
          <span className="button-content">
            <RefreshCw className={busy ? "refresh-spin" : ""} size={15} />
            <span>{busy ? "Refreshing" : "Refresh"}</span>
          </span>
        </button>
      </div>

      <div className="ids-content">
        <form className="id-card" onSubmit={submit}>
          <div className="id-card-head">
            <div className="empty-icon" aria-hidden="true">
              <AtSign size={24} />
            </div>
            <div>
              <h3>Register ID</h3>
              <p>First confirmed valid claim wins. Registration pays {ID_REGISTRATION_PRICE_SATS.toLocaleString()} sats to the registry.</p>
            </div>
          </div>

          <label>
            ID
            <div className="id-input-row">
              <input autoComplete="off" onChange={(event) => setIdName(event.target.value)} placeholder="user" spellCheck={false} value={idName} />
              <span>@proofofwork.me</span>
            </div>
          </label>
          {normalizedId && idError ? <p className="field-note bad">{idError}</p> : null}

          <label>
            Owner
            <input readOnly value={address || "Connect UniSat"} />
          </label>

          <label>
            Receive address
            <input autoComplete="off" onChange={(event) => setIdReceiveAddress(event.target.value)} spellCheck={false} value={idReceiveAddress} />
          </label>

          <label>
            PGP public key optional
            <textarea onChange={(event) => setIdPgpKey(event.target.value)} placeholder="Paste an armored public key later when encryption is ready." value={idPgpKey} />
          </label>

          <div className="compose-grid">
            <label>
              Fee sat/vB
              <input min={0} onChange={(event) => setFeeRate(Number(event.target.value))} step={0.01} type="number" value={feeRate} />
            </label>
            <label>
              Registry
              <input readOnly value={registryAddress || "Not configured"} />
            </label>
          </div>

          <div className={registrationBytes > MAX_DATA_CARRIER_BYTES ? "counter bad" : "counter"}>
            {registrationBytes.toLocaleString()} / {MAX_DATA_CARRIER_BYTES.toLocaleString()} OP_RETURN data-carrier bytes
          </div>

          <button className="primary" disabled={!canRegister} type="submit">
            <span className="button-content">
              <AtSign size={16} />
              <span>{busy ? "Registering" : "Register ID"}</span>
            </span>
          </button>
        </form>

        {lastRegisteredId ? (
          <section className="id-card id-verify-card">
            <div className="id-card-head">
              <div className="empty-icon" aria-hidden="true">
                <AtSign size={24} />
              </div>
              <div>
                <h3>Verify on X</h3>
                <p>Post a public proof for {lastRegisteredId.id}@proofofwork.me with the registry transaction link.</p>
              </div>
            </div>
            <div className="id-record-actions">
              <a className="primary link-button" href={xVerificationUrl(lastRegisteredId)} rel="noreferrer" target="_blank">
                <span className="button-content">
                  <ArrowUpRight size={16} />
                  <span>Verify on X</span>
                </span>
              </a>
              <a className="secondary link-button" href={mempoolTxUrl(lastRegisteredId.txid, lastRegisteredId.network)} rel="noreferrer" target="_blank">
                <span className="button-content">
                  <ArrowUpRight size={16} />
                  <span>View TX</span>
                </span>
              </a>
            </div>
          </section>
        ) : null}

        <section className="id-card">
          <div className="id-card-head">
            <div className="empty-icon" aria-hidden="true">
              <Star size={24} />
            </div>
            <div>
              <h3>Your IDs</h3>
              <p>IDs owned by or routed to the connected address.</p>
            </div>
          </div>
          <IdRecordList records={ownedIds} allowVerification empty="No IDs for this wallet yet." />
        </section>

        <section className="id-card ids-registry-card">
          <div className="id-card-head">
            <div className="empty-icon" aria-hidden="true">
              <Inbox size={24} />
            </div>
            <div>
              <h3>Registry</h3>
              <p>Confirmed records are final. Pending records can still change before confirmation.</p>
            </div>
          </div>
          <IdRecordList records={registryRecords} empty={registryAddress ? "No registry records found yet." : "Registry address is not configured for this network."} />
        </section>
      </div>
    </section>
  );
}

function IdRecordList({ records, allowVerification = false, empty }: { records: PowIdRecord[]; allowVerification?: boolean; empty: string }) {
  if (records.length === 0) {
    return <p className="field-note">{empty}</p>;
  }

  return (
    <div className="id-record-list">
      {records.map((record) => (
        <article className="id-record" key={`${record.network}-${record.txid}-${record.id}`}>
          <div>
            <strong>{record.id}@proofofwork.me</strong>
            <span>{record.confirmed ? "Confirmed" : "Pending"} · {record.amountSats.toLocaleString()} sats</span>
          </div>
          <dl>
            <div>
              <dt>Owner</dt>
              <dd>{shortAddress(record.ownerAddress)}</dd>
            </div>
            <div>
              <dt>Receives</dt>
              <dd>{shortAddress(record.receiveAddress)}</dd>
            </div>
            <div>
              <dt>PGP</dt>
              <dd>{record.pgpKey ? "Registered" : "None"}</dd>
            </div>
            <div>
              <dt>TX</dt>
              <dd>{shortAddress(record.txid)}</dd>
            </div>
          </dl>
          <div className="id-record-actions">
            {allowVerification ? (
              <a className="secondary small link-button" href={xVerificationUrl(record)} rel="noreferrer" target="_blank">
                <span className="button-content">
                  <ArrowUpRight size={15} />
                  <span>Verify on X</span>
                </span>
              </a>
            ) : null}
            <a className="secondary small link-button" href={mempoolTxUrl(record.txid, record.network)} rel="noreferrer" target="_blank">
              <span className="button-content">
                <ArrowUpRight size={15} />
                <span>View TX</span>
              </span>
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}

function MessageList({
  activeKey,
  activeFolder,
  activeNetwork,
  favoriteKeys,
  inboxCount,
  messages,
  onOpenInbox,
  onSelect,
}: {
  activeKey: string;
  activeFolder: Folder;
  activeNetwork: BitcoinNetwork;
  favoriteKeys: Set<string>;
  inboxCount: number;
  messages: MailMessage[];
  onOpenInbox: () => void;
  onSelect: (message: MailMessage) => void;
}) {
  if (messages.length === 0) {
    const emptyIcon =
      activeFolder === "inbox"
        ? <Inbox size={26} />
        : activeFolder === "incoming"
          ? <Mail size={26} />
          : activeFolder === "outbox"
            ? <Clock size={26} />
            : activeFolder === "favorites"
              ? <Star size={26} />
            : activeFolder === "archive"
              ? <Archive size={26} />
              : <Send size={26} />;
    const emptyTitle =
      activeFolder === "inbox"
        ? "No Inbox messages"
        : activeFolder === "incoming"
          ? "No Incoming messages"
          : activeFolder === "outbox"
            ? "Outbox clear"
            : activeFolder === "favorites"
              ? "No favorites"
              : activeFolder === "archive"
                ? "No archived messages"
                : "No Sent messages";
    const emptyCopy =
      activeFolder === "inbox"
        ? "Confirmed received mail will land here after the next scan."
        : activeFolder === "incoming"
          ? "Pending inbound transactions will appear here until they confirm."
          : activeFolder === "outbox"
            ? "Pending and dropped broadcasts will appear here."
            : activeFolder === "favorites"
              ? "Star confirmed mail to keep it close."
              : activeFolder === "archive"
                ? "Archived mail will appear here."
                : "Confirmed sent mail appears here after a scan.";

    return (
      <div className="empty-state empty-list">
        <div className="empty-icon" aria-hidden="true">
          {emptyIcon}
        </div>
        <h3>{emptyTitle}</h3>
        <p>{emptyCopy}</p>
        {activeFolder === "sent" && inboxCount > 0 ? (
          <button className="secondary small" onClick={onOpenInbox} type="button">
            Open Inbox ({inboxCount})
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => {
        const key = mailKey(message);
        const peer = peerAddress(message);
        const explorerNetwork = explorerNetworkFor(message.network, activeNetwork);

        return (
          <button
            aria-current={activeKey === key}
            className="message-row"
            key={key}
            onClick={() => onSelect(message)}
            type="button"
          >
            <div className="message-row-top">
              <strong>{shortAddress(peer)}</strong>
              <span>{formatDate(message.createdAt)}</span>
            </div>
            <div className="message-subject">{messageSubject(message)}</div>
            <div className="message-preview">{mailPreview(message)}</div>
            <div className="message-meta">
              <span>{message.amountSats.toLocaleString()} sats</span>
              {message.folder === "sent" ? <span>{deliveryLabel(sentDeliveryStatus(message))}</span> : null}
              {message.folder === "incoming" ? <span>Pending</span> : null}
              {favoriteKeys.has(key) ? <span>Favorite</span> : null}
              {message.attachment ? <span>Attachment</span> : null}
              {message.parentTxid ? <span>Reply</span> : null}
              <span>{networkLabel(explorerNetwork)}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DraftList({
  draft,
  onCompose,
  onDiscard,
  onOpen,
}: {
  draft?: DraftMessage;
  onCompose: () => void;
  onDiscard: () => void;
  onOpen: (draft: DraftMessage) => void;
}) {
  if (!draft) {
    return (
      <div className="empty-state empty-list">
        <div className="empty-icon" aria-hidden="true">
          <FilePenLine size={26} />
        </div>
        <h3>No drafts</h3>
        <p>Messages stay local here until you broadcast them.</p>
        <button className="secondary small" onClick={onCompose} type="button">
          Compose
        </button>
      </div>
    );
  }

  return (
    <div className="message-list">
      <article className="message-row draft-row" data-current="true">
        <button className="draft-open" onClick={() => onOpen(draft)} type="button">
          <div className="message-row-top">
            <strong>{draft.recipient ? shortAddress(draft.recipient) : "No recipient"}</strong>
            <span>{formatDate(draft.updatedAt)}</span>
          </div>
          <div className="message-subject">{messageSubject(draft)}</div>
          <div className="message-preview">{mailPreview(draft) || "Unsent ProofOfWork.Me mail"}</div>
          <div className="message-meta">
            <span>{draft.amountSats.toLocaleString()} sats</span>
            {draft.attachment ? <span>Attachment</span> : null}
            {draft.parentTxid ? <span>Reply</span> : null}
            <span>{networkLabel(draft.network)}</span>
          </div>
        </button>
        <button className="secondary small" onClick={onDiscard} type="button">
          <span className="button-content">
            <X size={15} />
            <span>Discard</span>
          </span>
        </button>
      </article>
    </div>
  );
}

function FilesWorkspace({
  activeKey,
  activeNetwork,
  busy,
  connected,
  fileFilter,
  messages,
  refreshing,
  selectedMessage,
  setFileFilter,
  setSortMode,
  sortMode,
  onOpenInbox,
  onOpenMessage,
  onRefresh,
  onSelect,
}: {
  activeKey: string;
  activeNetwork: BitcoinNetwork;
  busy: boolean;
  connected: boolean;
  fileFilter: FileFilter;
  messages: MailMessage[];
  refreshing: boolean;
  selectedMessage?: MailMessage & { attachment: MailAttachment };
  setFileFilter: (value: FileFilter) => void;
  setSortMode: (value: SortMode) => void;
  sortMode: SortMode;
  onOpenInbox: () => void;
  onOpenMessage: (message: MailMessage) => void;
  onRefresh: () => void;
  onSelect: (message: MailMessage) => void;
}) {
  const fileMessages = messages.filter(hasAttachment);
  const selectedFile = selectedMessage ?? fileMessages[0];

  if (fileMessages.length === 0) {
    return (
      <section className="files-workspace">
        <FilesToolbar
          busy={busy}
          connected={connected}
          fileFilter={fileFilter}
          fileCount={0}
          refreshing={refreshing}
          setFileFilter={setFileFilter}
          setSortMode={setSortMode}
          sortMode={sortMode}
          onRefresh={onRefresh}
        />
        <div className="empty-state files-empty">
          <div className="empty-icon" aria-hidden="true">
            <Paperclip size={26} />
          </div>
          <h3>{connected ? (fileFilter === "all" ? "No files" : `No ${fileFilterLabel(fileFilter).toLowerCase()}`) : "Connect to view files"}</h3>
          <p>Attachments from Inbox and Sent will appear here as a desktop-style file space.</p>
          <button className="secondary small" onClick={onOpenInbox} type="button">
            Open Inbox
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="files-workspace">
      <FilesToolbar
        busy={busy}
        connected={connected}
        fileFilter={fileFilter}
        fileCount={fileMessages.length}
        refreshing={refreshing}
        setFileFilter={setFileFilter}
        setSortMode={setSortMode}
        sortMode={sortMode}
        onRefresh={onRefresh}
      />

      <div className="files-browser">
        <div className="files-desktop" aria-label="Attachments">
          {fileMessages.map((message) => (
            <FileTile
              active={activeKey === mailKey(message)}
              activeNetwork={activeNetwork}
              key={mailKey(message)}
              message={message}
              onSelect={onSelect}
            />
          ))}
        </div>

        <FileInspector
          activeNetwork={activeNetwork}
          message={selectedFile}
          onOpenMessage={onOpenMessage}
        />
      </div>
    </section>
  );
}

function FilesToolbar({
  busy,
  connected,
  fileFilter,
  fileCount,
  refreshing,
  setFileFilter,
  setSortMode,
  sortMode,
  onRefresh,
}: {
  busy: boolean;
  connected: boolean;
  fileFilter: FileFilter;
  fileCount: number;
  refreshing: boolean;
  setFileFilter: (value: FileFilter) => void;
  setSortMode: (value: SortMode) => void;
  sortMode: SortMode;
  onRefresh: () => void;
}) {
  return (
    <div className="files-toolbar">
      <div>
        <h2>Files</h2>
        <span>
          {fileCount.toLocaleString()} attachment{fileCount === 1 ? "" : "s"} across mail
        </span>
      </div>
      <label className="sort-control">
        Type
        <select value={fileFilter} onChange={(event) => setFileFilter(event.target.value as FileFilter)}>
          <option value="all">All files</option>
          <option value="image">Images</option>
          <option value="pdf">PDFs</option>
          <option value="document">Documents</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="sort-control">
        Sort
        <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
          <option value="value">Highest sats</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="largest">Largest</option>
          <option value="filetype">File type</option>
          <option value="sender">Address</option>
          <option value="thread">Thread</option>
        </select>
      </label>
      <button className="secondary small" disabled={busy || !connected} onClick={onRefresh} type="button">
        <span className="button-content">
          <RefreshCw className={refreshing ? "refresh-spin" : ""} size={15} />
          <span>{refreshing ? "Refreshing" : "Refresh"}</span>
        </span>
      </button>
    </div>
  );
}

function FileTile({
  active,
  activeNetwork,
  message,
  onSelect,
}: {
  active: boolean;
  activeNetwork: BitcoinNetwork;
  message: MailMessage & { attachment: MailAttachment };
  onSelect: (message: MailMessage) => void;
}) {
  const attachment = message.attachment;
  const explorerNetwork = explorerNetworkFor(message.network, activeNetwork);

  return (
    <button aria-current={active} className="file-tile" onClick={() => onSelect(message)} type="button">
      <FilePreview attachment={attachment} />
      <strong title={attachment.name}>{attachment.name}</strong>
      <span>
        {formatBytes(attachment.size)} · {fileFilterLabel(attachmentKind(attachment)).replace(/s$/u, "")}
      </span>
      <div className="file-tile-meta">
        <span>{message.amountSats.toLocaleString()} sats</span>
        <span>{networkLabel(explorerNetwork)}</span>
      </div>
    </button>
  );
}

function FilePreview({ attachment }: { attachment: MailAttachment }) {
  if (isImageAttachment(attachment)) {
    return (
      <span className="file-preview is-image">
        <img alt="" src={attachmentHref(attachment)} />
      </span>
    );
  }

  return (
    <span className="file-preview">
      <FileText size={34} />
    </span>
  );
}

function FileInspector({
  activeNetwork,
  message,
  onOpenMessage,
}: {
  activeNetwork: BitcoinNetwork;
  message?: MailMessage & { attachment: MailAttachment };
  onOpenMessage: (message: MailMessage) => void;
}) {
  if (!message) {
    return (
      <aside className="file-inspector">
        <div className="empty-icon" aria-hidden="true">
          <Paperclip size={24} />
        </div>
        <h3>Select a file</h3>
      </aside>
    );
  }

  const attachment = message.attachment;
  const peer = peerAddress(message);
  const explorerNetwork = explorerNetworkFor(message.network, activeNetwork);

  return (
    <aside className="file-inspector">
      <FilePreview attachment={attachment} />
      <div className="file-detail-title">
        <h3>{attachment.name}</h3>
        <span>{attachment.mime}</span>
      </div>
      <div className="file-detail-actions">
        <a className="primary link-button" download={attachment.name} href={attachmentHref(attachment)}>
          <span className="button-content">
            <Download size={15} />
            <span>Download</span>
          </span>
        </a>
        <button className="secondary" onClick={() => onOpenMessage(message)} type="button">
          <span className="button-content">
            <Mail size={15} />
            <span>Open Message</span>
          </span>
        </button>
        <a className="secondary link-button" href={mempoolTxUrl(message.txid, explorerNetwork)} rel="noreferrer" target="_blank">
          <span className="button-content">
            <ArrowUpRight size={15} />
            <span>View TX</span>
          </span>
        </a>
      </div>
      <dl className="file-detail-list">
        <div>
          <dt>Size</dt>
          <dd>{formatBytes(attachment.size)}</dd>
        </div>
        <div>
          <dt>{isInboundFolder(message.folder) ? "From" : "To"}</dt>
          <dd>{peer}</dd>
        </div>
        <div>
          <dt>Value</dt>
          <dd>{message.amountSats.toLocaleString()} sats</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{formatDate(message.createdAt)}</dd>
        </div>
        <div>
          <dt>SHA-256</dt>
          <dd>{attachment.sha256}</dd>
        </div>
      </dl>
    </aside>
  );
}

function OnboardingPane({
  busy,
  hasUnisat,
  network,
  onConnect,
}: {
  busy: boolean;
  hasUnisat: boolean;
  network: BitcoinNetwork;
  onConnect: () => void;
}) {
  return (
    <section className="onboarding-pane">
      <div className="onboarding-panel">
        <div className="onboarding-icon" aria-hidden="true">
          <Mail size={30} />
        </div>
        <div>
          <h2>{hasUnisat ? "Open ProofOfWork.Me" : "Install UniSat"}</h2>
          <p>
            {hasUnisat
              ? `Connect UniSat to read and send Bitcoin mail on ${networkLabel(network)}.`
              : "ProofOfWork.Me needs UniSat to sign Bitcoin mail transactions locally."}
          </p>
        </div>
        <div className="onboarding-checks" aria-label="Setup">
          <span>
            <CheckCircle2 size={16} />
            {hasUnisat ? "Wallet signed" : "Official wallet link"}
          </span>
          <span>
            <CheckCircle2 size={16} />
            No account server
          </span>
          <span>
            <CheckCircle2 size={16} />
            OP_RETURN native
          </span>
        </div>
        {hasUnisat ? (
          <button className="primary" disabled={busy} onClick={onConnect} type="button">
            <span className="button-content">
              <Wallet size={17} />
              <span>{busy ? "Connecting" : "Connect UniSat"}</span>
            </span>
          </button>
        ) : (
          <a className="primary link-button" href={UNISAT_DOWNLOAD_URL} rel="noreferrer" target="_blank">
            <span className="button-content">
              <Wallet size={17} />
              <span>Download UniSat</span>
              <ArrowUpRight size={15} />
            </span>
          </a>
        )}
      </div>
    </section>
  );
}

function ComposePane({
  amountSats,
  attachment,
  busy,
  canSend,
  dataCarrierBytes,
  draftMode = false,
  feeRate,
  memo,
  network,
  onDiscardDraft,
  parentTxid,
  recipient,
  recipientError,
  recipientNote,
  sender,
  setAttachment,
  setAttachmentFile,
  setAmountSats,
  setFeeRate,
  setMemo,
  setParentTxid,
  setRecipient,
  submit,
}: {
  amountSats: number;
  attachment?: MailAttachment;
  busy: boolean;
  canSend: boolean;
  dataCarrierBytes: number;
  draftMode?: boolean;
  feeRate: number;
  memo: string;
  network: BitcoinNetwork;
  onDiscardDraft?: () => void;
  parentTxid?: string;
  recipient: string;
  recipientError: boolean;
  recipientNote: string;
  sender: string;
  setAttachment: (value: MailAttachment | undefined) => void;
  setAttachmentFile: (file: File) => void;
  setAmountSats: (value: number) => void;
  setFeeRate: (value: number) => void;
  setMemo: (value: string) => void;
  setParentTxid: (value: string | undefined) => void;
  setRecipient: (value: string) => void;
  submit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="compose-pane" onSubmit={submit}>
      <div className="pane-head">
        <div>
          <h2>{draftMode ? "Draft" : parentTxid ? "Reply" : "New Message"}</h2>
          {parentTxid ? <span>Thread: {shortAddress(parentTxid)}</span> : null}
        </div>
        <div className="reader-actions">
          {draftMode && onDiscardDraft ? (
            <button className="secondary small" disabled={busy} onClick={onDiscardDraft} type="button">
              <span className="button-content">
                <X size={15} />
                <span>Discard</span>
              </span>
            </button>
          ) : null}
          <button className="primary" disabled={!canSend} type="submit">
            <span className="button-content">
              <Send size={16} />
              <span>{busy ? "Sending" : "Send"}</span>
            </span>
          </button>
        </div>
      </div>

      {parentTxid ? (
        <div className="reply-banner">
          <Reply size={16} aria-hidden="true" />
          <span>
            Replying to <code>{parentTxid}</code>
          </span>
          <button className="secondary small" onClick={() => setParentTxid(undefined)} type="button">
            Remove
          </button>
        </div>
      ) : null}

      <label>
        From
        <input readOnly value={sender || "Not connected"} />
      </label>

      <label>
        To
        <input
          autoComplete="off"
          onChange={(event) => setRecipient(event.target.value)}
          placeholder={network === "livenet" ? "bc1... or user@proofofwork.me" : "tb1..."}
          spellCheck={false}
          value={recipient}
        />
      </label>
      {recipientNote ? <p className={recipientError ? "field-note bad" : "field-note"}>{recipientNote}</p> : null}

      <div className="compose-grid">
        <label>
          Sats
          <input
            min={1}
            onChange={(event) => setAmountSats(Number(event.target.value))}
            type="number"
            value={amountSats}
          />
        </label>
        <label>
          Fee sat/vB
          <input
            min={0}
            onChange={(event) => setFeeRate(Number(event.target.value))}
            step={0.01}
            type="number"
            value={feeRate}
          />
        </label>
      </div>

      <div className="fee-presets" aria-label="Fee presets">
        {[0.1, 0.25, 0.5, 1].map((preset) => (
          <button aria-pressed={feeRate === preset} key={preset} onClick={() => setFeeRate(preset)} type="button">
            {preset}
          </button>
        ))}
      </div>

      <label className="memo-field">
        Message
        <textarea onChange={(event) => setMemo(event.target.value)} value={memo} />
      </label>

      <div className="attachment-control">
        <label className="attachment-picker">
          <input
            className="file-input"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) {
                setAttachmentFile(file);
              }
            }}
            type="file"
          />
          <span className="button-content">
            <Paperclip size={16} />
            <span>{attachment ? "Replace attachment" : "Attach file"}</span>
          </span>
        </label>
        <span>One file, {formatBytes(MAX_ATTACHMENT_BYTES)} max before encoding.</span>
      </div>

      {attachment ? <AttachmentCard attachment={attachment} onRemove={() => setAttachment(undefined)} /> : null}

      <div className={dataCarrierBytes > MAX_DATA_CARRIER_BYTES ? "counter bad" : "counter"}>
        {dataCarrierBytes.toLocaleString()} / {MAX_DATA_CARRIER_BYTES.toLocaleString()} OP_RETURN data-carrier bytes
      </div>
    </form>
  );
}

function AttachmentCard({
  attachment,
  onRemove,
}: {
  attachment: MailAttachment;
  onRemove?: () => void;
}) {
  return (
    <div className="attachment-card">
      <div className="attachment-icon" aria-hidden="true">
        <FileText size={20} />
      </div>
      <div className="attachment-info">
        <strong>{attachment.name}</strong>
        <span>
          {attachment.mime} · {formatBytes(attachment.size)}
        </span>
        <code>{shortAddress(attachment.sha256)}</code>
      </div>
      <div className="attachment-actions">
        {onRemove ? (
          <button className="secondary small" onClick={onRemove} type="button">
            <span className="button-content">
              <X size={15} />
              <span>Remove</span>
            </span>
          </button>
        ) : (
          <a className="secondary small link-button" download={attachment.name} href={attachmentHref(attachment)}>
            <span className="button-content">
              <Download size={15} />
              <span>Download</span>
            </span>
          </a>
        )}
      </div>
    </div>
  );
}

function Reader({
  activeNetwork,
  archivable,
  archived,
  checkingBroadcasts,
  deliveryStatus,
  favoriteable,
  favorited,
  message,
  onArchiveToggle,
  onCheckBroadcasts,
  onFavoriteToggle,
  onReply,
  onRestoreDraft,
  threadMessages,
}: {
  activeNetwork: BitcoinNetwork;
  archivable: boolean;
  archived: boolean;
  checkingBroadcasts: boolean;
  deliveryStatus?: BroadcastStatus;
  favoriteable: boolean;
  favorited: boolean;
  message: MailMessage;
  onArchiveToggle: (message: MailMessage, archived: boolean) => void;
  onCheckBroadcasts: () => void;
  onFavoriteToggle: (message: MailMessage, favorite: boolean) => void;
  onReply: (message: MailMessage) => void;
  onRestoreDraft: (message: MailMessage) => void;
  threadMessages: MailMessage[];
}) {
  const peerLabel = isInboundFolder(message.folder) ? "From" : "To";
  const peer = isInboundFolder(message.folder) ? message.from : message.to;
  const explorerNetwork = explorerNetworkFor(message.network, activeNetwork);

  return (
    <article className="reader">
      <div className="pane-head">
        <div>
          <h2>{messageSubject(message)}</h2>
          <span>{formatDate(message.createdAt)}{message.parentTxid ? " · Reply" : ""}</span>
        </div>
        <div className="reader-actions">
          {deliveryStatus && deliveryStatus !== "confirmed" ? (
            <button className="secondary small" disabled={checkingBroadcasts} onClick={onCheckBroadcasts} type="button">
              <span className="button-content">
                <RefreshCw size={15} />
                <span>{checkingBroadcasts ? "Checking" : "Check TX"}</span>
              </span>
            </button>
          ) : null}
          {deliveryStatus === "dropped" ? (
            <button className="secondary small" onClick={() => onRestoreDraft(message)} type="button">
              <span className="button-content">
                <FilePenLine size={15} />
                <span>Rebuild Draft</span>
              </span>
            </button>
          ) : null}
          {favoriteable ? (
            <button className="secondary small" onClick={() => onFavoriteToggle(message, !favorited)} type="button">
              <span className="button-content">
                <Star className={favorited ? "star-filled" : ""} size={15} />
                <span>{favorited ? "Unfavorite" : "Favorite"}</span>
              </span>
            </button>
          ) : null}
          {archivable ? (
            <button className="secondary small" onClick={() => onArchiveToggle(message, !archived)} type="button">
              <span className="button-content">
                <Archive size={15} />
                <span>{archived ? "Unarchive" : "Archive"}</span>
              </span>
            </button>
          ) : null}
          <button className="secondary small" onClick={() => onReply(message)} type="button">
            <span className="button-content">
              <Reply size={15} />
              <span>Reply</span>
            </span>
          </button>
          <a className="secondary small link-button" href={mempoolTxUrl(message.txid, explorerNetwork)} rel="noreferrer" target="_blank">
            <span className="button-content">
              <ArrowUpRight size={15} />
              <span>View TX</span>
            </span>
          </a>
        </div>
      </div>

      <dl className="headers">
        <div>
          <dt>{peerLabel}</dt>
          <dd>{peer}</dd>
        </div>
        <div>
          <dt>Value</dt>
          <dd>{message.amountSats.toLocaleString()} sats</dd>
        </div>
        <div>
          <dt>Network</dt>
          <dd>{networkLabel(explorerNetwork)}</dd>
        </div>
        {deliveryStatus ? (
          <div>
            <dt>Status</dt>
            <dd>{deliveryLabel(deliveryStatus)}</dd>
          </div>
        ) : message.folder === "incoming" ? (
          <div>
            <dt>Status</dt>
            <dd>Pending</dd>
          </div>
        ) : null}
        {message.folder === "sent" && message.lastCheckedAt ? (
          <div>
            <dt>Last Checked</dt>
            <dd>{formatDate(message.lastCheckedAt)}</dd>
          </div>
        ) : null}
        {message.parentTxid ? (
          <div>
            <dt>Reply To</dt>
            <dd>{message.parentTxid}</dd>
          </div>
        ) : null}
      </dl>

      <pre>{message.memo}</pre>

      {message.attachment ? <AttachmentCard attachment={message.attachment} /> : null}

      {threadMessages.length > 1 ? (
        <section className="thread-panel">
          <h3>Thread</h3>
          {threadMessages.map((threadMessage) => (
            <article className="thread-item" key={mailKey(threadMessage)}>
              <div>
                <strong>{isInboundFolder(threadMessage.folder) ? "From" : "To"} {shortAddress(peerAddress(threadMessage))}</strong>
                <span>{formatDate(threadMessage.createdAt)} · {threadMessage.amountSats.toLocaleString()} sats</span>
              </div>
              <p>{mailPreview(threadMessage)}</p>
            </article>
          ))}
        </section>
      ) : null}

      <div className="txid">
        <span>TXID</span>
        <code>{message.txid}</code>
      </div>
    </article>
  );
}
