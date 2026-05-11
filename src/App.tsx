import { ChangeEvent, FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as bitcoin from "bitcoinjs-lib";
import { Buffer } from "buffer";
import {
  Archive,
  AtSign,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FilePenLine,
  FileText,
  GitBranch,
  Inbox,
  LogOut,
  Mail,
  MessageCircle,
  MessageSquareQuote,
  Monitor,
  Moon,
  Paperclip,
  PenLine,
  FolderPlus,
  RefreshCw,
  Reply,
  Search,
  Send,
  Star,
  Sun,
  Trash2,
  Upload,
  UserPlus,
  Users,
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
type Folder =
  | "inbox"
  | "incoming"
  | "sent"
  | "outbox"
  | "drafts"
  | "favorites"
  | "archive"
  | "files"
  | "desktop"
  | "ids"
  | "marketplace"
  | "contacts"
  | "custom";
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

type AttachmentPreviewKind = "image" | "audio" | "video" | "pdf" | "text" | "unsupported";

type MailRecipient = {
  address: string;
  amountSats: number;
  display: string;
  id?: string;
};

type DraftMessage = {
  network: BitcoinNetwork;
  from: string;
  recipient: string;
  ccRecipient?: string;
  amountSats: number;
  feeRate: number;
  subject?: string;
  memo: string;
  attachment?: MailAttachment;
  parentTxid?: string;
  updatedAt: string;
};

type MailPreference = {
  archived?: boolean;
  favorite?: boolean;
  folders?: string[];
};

type MailPreferences = Record<string, MailPreference>;

type CustomFolderRecord = {
  id: string;
  name: string;
  createdAt: string;
};

type ContactRecord = {
  network: BitcoinNetwork;
  name: string;
  address: string;
  powId?: string;
  source: "manual" | "registry";
  createdAt: string;
  updatedAt: string;
};

type DesktopProfile = {
  address: string;
  label: string;
  loadedAt: string;
  network: BitcoinNetwork;
  query: string;
  resolvedId?: string;
};

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
  signMessage?: (message: string, type?: string) => Promise<string>;
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
  recipients?: MailRecipient[];
  toRecipients?: MailRecipient[];
  ccRecipients?: MailRecipient[];
  amountSats: number;
  feeRate: number;
  subject?: string;
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
  recipients?: MailRecipient[];
  amountSats: number;
  subject?: string;
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

type PowIdPendingEvent = {
  amountSats: number;
  createdAt: string;
  currentOwnerAddress?: string;
  currentReceiveAddress?: string;
  id?: string;
  inputAddresses: string[];
  kind: "update" | "transfer" | "marketTransfer" | "list" | "delist";
  listingId?: string;
  network: BitcoinNetwork;
  ownerAddress?: string;
  priceSats?: number;
  receiveAddress?: string;
  sellerAddress?: string;
  txid: string;
};

type PowIdListingVersion = "list2" | "list3" | "list4";

type PowIdMarketplaceTransferVersion = "buy2" | "buy3" | "buy4";

type PowIdDelistingVersion = "delist2" | "delist3" | "delist4";

type PowIdSpentOutpoint = {
  txid: string;
  vout: number;
};

type PowIdPaymentSnapshot = {
  address: string;
  amountSats: number;
};

type PowIdListing = {
  amountSats: number;
  anchorSigHashType?: number;
  anchorSignature?: string;
  anchorScriptPubKey?: string;
  anchorTxid?: string;
  anchorType?: string;
  anchorValueSats?: number;
  anchorVout?: number;
  buyerAddress?: string;
  confirmed: boolean;
  createdAt: string;
  expiresAt?: string;
  id: string;
  listingId: string;
  listingVersion?: PowIdListingVersion;
  network: BitcoinNetwork;
  priceSats: number;
  receiveAddress?: string;
  saleAuthorization: PowIdSaleAuthorization;
  sellerAddress: string;
  sellerPublicKey?: string;
  txid: string;
};

type PowIdSaleAuthorizationDraft = {
  anchorSigHashType?: number;
  anchorSignature?: string;
  anchorScriptPubKey?: string;
  anchorTxid?: string;
  anchorType?: string;
  anchorValueSats?: number;
  anchorVout?: number;
  buyerAddress?: string;
  expiresAt?: string;
  id: string;
  nonce: string;
  priceSats: number;
  receiveAddress?: string;
  sellerAddress: string;
  sellerPublicKey?: string;
  version: "pwid-sale-v1" | "pwid-sale-v2" | "pwid-sale-v3";
};

type PowIdSaleAuthorization = PowIdSaleAuthorizationDraft & {
  signature?: string;
};

type PowIdChainOrder = {
  blockHeight?: number;
  blockIndex?: number;
};

type PowIdEvent = PowIdChainOrder &
  (
  | {
      amountSats: number;
      confirmed: boolean;
      createdAt: string;
      id: string;
      inputAddresses: string[];
      kind: "register";
      network: BitcoinNetwork;
      ownerAddress: string;
      pgpKey?: string;
      receiveAddress: string;
      txid: string;
    }
  | {
      amountSats: number;
      confirmed: boolean;
      createdAt: string;
      id: string;
      inputAddresses: string[];
      kind: "update";
      network: BitcoinNetwork;
      receiveAddress: string;
      txid: string;
    }
  | {
      amountSats: number;
      confirmed: boolean;
      createdAt: string;
      id: string;
      inputAddresses: string[];
      kind: "transfer";
      network: BitcoinNetwork;
      ownerAddress: string;
      receiveAddress: string;
      txid: string;
    }
  | {
      amountSats: number;
      confirmed: boolean;
      createdAt: string;
      id?: string;
      inputAddresses: string[];
      kind: "marketTransfer";
      listingId?: string;
      network: BitcoinNetwork;
      ownerAddress: string;
      paymentOutputs: PowIdPaymentSnapshot[];
      priceSats?: number;
      receiveAddress: string;
      saleAuthorization?: PowIdSaleAuthorization;
      sellerAddress?: string;
      spentOutpoints: PowIdSpentOutpoint[];
      transferVersion: PowIdMarketplaceTransferVersion;
      txid: string;
    }
  | {
      amountSats: number;
      confirmed: boolean;
      createdAt: string;
      id: string;
      inputAddresses: string[];
      kind: "list";
      listingAnchorPresent: boolean;
      listingVersion: PowIdListingVersion;
      network: BitcoinNetwork;
      priceSats: number;
      saleAuthorization: PowIdSaleAuthorization;
      sellerAddress: string;
      txid: string;
    }
  | {
      amountSats: number;
      confirmed: boolean;
      createdAt: string;
      delistingVersion: PowIdDelistingVersion;
      inputAddresses: string[];
      kind: "delist";
      listingId: string;
      network: BitcoinNetwork;
      spentOutpoints: PowIdSpentOutpoint[];
      txid: string;
    }
  );

type RecipientResolution = {
  displayRecipient: string;
  error?: string;
  id?: string;
  isId: boolean;
  paymentAddress: string;
  record?: PowIdRecord;
};

type PowIdOwnerResolution = {
  displayRecipient: string;
  error?: string;
  id?: string;
  isId: boolean;
  ownerAddress: string;
  receiveAddress: string;
  record?: PowIdRecord;
};

type MultiRecipientResolution = {
  duplicateCount: number;
  error?: string;
  idCount: number;
  recipients: RecipientResolution[];
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
  subject?: string;
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

type PaymentOutputSpec = {
  address?: string;
  amountSats: number;
  script?: Uint8Array;
};

type PowRegistryApiResponse = {
  listings?: PowIdListing[];
  pendingEvents?: PowIdPendingEvent[];
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
const CONTACTS_KEY = "proofofwork.contacts.v1";
const CUSTOM_FOLDERS_KEY = "proofofwork.customFolders.v1";
const THEME_KEY = "proofofwork.theme";
const BACKUP_APP = "ProofOfWork.Me";
const BACKUP_VERSION = 1;
const BACKUP_MAX_BYTES = 5 * 1024 * 1024;
const UNISAT_DOWNLOAD_URL = "https://unisat.io/download";
const DISCORD_URL = "https://discord.com/invite/mRA4zbqB";
const GITHUB_URL = "https://github.com/proofofworkme";
const X_URL = "https://x.com/proofofworkme";
const YOUTUBE_URL = "https://www.youtube.com/@proofofworkme";
const ID_APP_URL = "https://id.proofofwork.me";
const COMPUTER_APP_URL = "https://computer.proofofwork.me";
const DESKTOP_APP_URL = "https://desktop.proofofwork.me";
const MARKETPLACE_APP_URL = "https://marketplace.proofofwork.me";
const LANDING_VIDEO_EMBED_URL = "https://www.youtube-nocookie.com/embed/DLDb4NDWZVA";
const LANDING_TESTIMONIAL_TXID = "d9c41aef1e84a51bbc96fe81506f511cd9cead8ceaae8349f9f3f64bb50acd69";
const LANDING_TESTIMONIAL_TX_URL = `https://mempool.space/tx/${LANDING_TESTIMONIAL_TXID}`;
const POW_API_BASE = (import.meta.env.VITE_POW_API_BASE ?? "").trim().replace(/\/+$/u, "");
const MAX_DATA_CARRIER_BYTES = 100_000;
const MAX_ATTACHMENT_BYTES = 60_000;
const MAX_REGISTRY_TX_PAGES = 100;
const BLOCK_TXID_INDEX_CACHE = new Map<string, Promise<Map<string, number>>>();
const PROTOCOL_PREFIX = "pwm1:";

// Canonical Phase 1 ProofOfWork ID registry.
// Do not fork this address/protocol for id.proofofwork.me; the launch surface
// must use the same registry as the full mail app so first-confirmed-wins stays global.
const ID_PROTOCOL_PREFIX = "pwid1:";
const ID_REGISTRATION_PRICE_SATS = 1000;
const ID_MUTATION_PRICE_SATS = 546;
const ID_SALE_AUTH_VERSION_LEGACY = "pwid-sale-v1";
const ID_SALE_AUTH_VERSION_ANCHORED = "pwid-sale-v2";
const ID_SALE_AUTH_VERSION = "pwid-sale-v3";
const ID_LISTING_ANCHOR_TYPE_LEGACY = "p2wsh-op-true-v1";
const ID_LISTING_ANCHOR_TYPE = "seller-utxo-v1";
const ID_LISTING_ANCHOR_VALUE_SATS = 546;
const ID_LISTING_ANCHOR_VOUT = 2;
const ID_LISTING_ANCHOR_SIGHASH_TYPE = bitcoin.Transaction.SIGHASH_SINGLE | bitcoin.Transaction.SIGHASH_ANYONECANPAY;
const ID_LISTING_ANCHOR_SEAL_FEE_SATS = 500;
const ID_REGISTRY_ADDRESSES: Partial<Record<BitcoinNetwork, string>> = {
  livenet: "bc1qfwytlzyr3ym3enz2eutwtjsf9kkf6uqkjydk3e",
};
const ESTIMATED_INPUT_VBYTES = 160;
const DUST_SATS = 546;
const DEFAULT_AMOUNT_SATS = 546;
const DEFAULT_FEE_RATE = 0.1;
const DEFAULT_MEMO = "";
const MAX_RECIPIENTS = 10;

const APP_LINKS = [
  { href: "https://proofofwork.me", label: "Home" },
  { href: ID_APP_URL, label: "IDs" },
  { href: COMPUTER_APP_URL, label: "Computer" },
  { href: DESKTOP_APP_URL, label: "Desktop" },
  { href: MARKETPLACE_APP_URL, label: "Marketplace" },
];

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

function isDesktopRoute() {
  if (import.meta.env.VITE_DESKTOP_ONLY === "1") {
    return true;
  }

  const hostname = window.location.hostname.toLowerCase();
  // Production public file desktop: desktop.proofofwork.me. Local/dev preview: ?desktop=1.
  return hostname === "desktop.proofofwork.me" || window.location.search.includes("desktop=1");
}

function isMarketplaceRoute() {
  if (import.meta.env.VITE_MARKETPLACE_ONLY === "1") {
    return true;
  }

  const hostname = window.location.hostname.toLowerCase();
  // Production ID marketplace: marketplace.proofofwork.me. Local/dev preview: ?marketplace=1.
  return hostname === "marketplace.proofofwork.me" || window.location.search.includes("marketplace=1");
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
  return (
    key === SENT_KEY ||
    key === MAIL_PREFS_KEY ||
    key === CONTACTS_KEY ||
    key === CUSTOM_FOLDERS_KEY ||
    key === THEME_KEY ||
    key.startsWith(`${DRAFT_KEY_PREFIX}:`)
  );
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

    if (key === CONTACTS_KEY) {
      return Array.isArray(parsed);
    }

    if (key === CUSTOM_FOLDERS_KEY) {
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

  if (data[CONTACTS_KEY]) {
    try {
      const contacts = JSON.parse(data[CONTACTS_KEY]) as unknown;
      if (Array.isArray(contacts)) {
        details.push(`${contacts.length} contact${contacts.length === 1 ? "" : "s"}`);
      }
    } catch {
      // Already validated before this helper is used.
    }
  }

  if (data[CUSTOM_FOLDERS_KEY]) {
    try {
      const folders = JSON.parse(data[CUSTOM_FOLDERS_KEY]) as unknown;
      if (Array.isArray(folders)) {
        details.push(`${folders.length} custom folder${folders.length === 1 ? "" : "s"}`);
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

async function fetchBlockTxidIndex(blockHash: string, network: BitcoinNetwork): Promise<Map<string, number>> {
  if (!/^[0-9a-fA-F]{64}$/u.test(blockHash)) {
    return new Map();
  }

  const normalizedHash = blockHash.toLowerCase();
  const cacheKey = `${network}:${normalizedHash}`;
  if (!BLOCK_TXID_INDEX_CACHE.has(cacheKey)) {
    const promise = fetch(`${mempoolBase(network)}/api/block/${normalizedHash}/txids`, {
      headers: { Accept: "application/json" },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`mempool.space returned ${response.status}`);
        }
        return response.json();
      })
      .then((txids) => {
        const index = new Map<string, number>();
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

  return BLOCK_TXID_INDEX_CACHE.get(cacheKey)!;
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

function marketplaceLegacyAnchorWitnessScript() {
  return bitcoin.script.compile([bitcoin.opcodes.OP_TRUE]);
}

function marketplaceLegacyAnchorOutputScript(_network: BitcoinNetwork) {
  const payment = bitcoin.payments.p2wsh({
    redeem: {
      output: marketplaceLegacyAnchorWitnessScript(),
    },
  });

  if (!payment.output) {
    throw new Error("Could not build marketplace listing anchor script.");
  }

  return payment.output;
}

function marketplaceLegacyAnchorScriptPubKey(network: BitcoinNetwork) {
  return bytesToHex(marketplaceLegacyAnchorOutputScript(network));
}

function validPublicKeyHex(value: string) {
  return /^(02|03)[0-9a-fA-F]{64}$/u.test(value) || /^04[0-9a-fA-F]{128}$/u.test(value);
}

function validSignatureHex(value: string) {
  return /^[0-9a-fA-F]+$/u.test(value) && value.length >= 18 && value.length <= 146 && value.length % 2 === 0;
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
    recipients: preferred.recipients ?? fallback.recipients,
    subject: preferred.subject ?? fallback.subject,
    toRecipients: preferred.toRecipients ?? fallback.toRecipients,
    ccRecipients: preferred.ccRecipients ?? fallback.ccRecipients,
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

function pendingIdEventTouchesAddress(event: PowIdPendingEvent, targetAddress: string) {
  if (!targetAddress) {
    return false;
  }

  return [
    event.currentOwnerAddress,
    event.currentReceiveAddress,
    event.ownerAddress,
    event.receiveAddress,
    event.sellerAddress,
    ...event.inputAddresses,
  ].includes(targetAddress);
}

function pendingIdEventDirection(event: PowIdPendingEvent, targetAddress: string) {
  if (!targetAddress) {
    return "Pending";
  }

  if ((event.kind === "transfer" || event.kind === "marketTransfer") && (event.ownerAddress === targetAddress || event.receiveAddress === targetAddress)) {
    return "Incoming";
  }

  if (event.kind === "update" && event.receiveAddress === targetAddress && event.currentOwnerAddress !== targetAddress && !event.inputAddresses.includes(targetAddress)) {
    return "Incoming";
  }

  if (event.currentOwnerAddress === targetAddress || event.sellerAddress === targetAddress || event.inputAddresses.includes(targetAddress)) {
    return "Outgoing";
  }

  if (event.currentReceiveAddress === targetAddress) {
    return "Routing";
  }

  return "Pending";
}

function pendingIdEventLabel(event: PowIdPendingEvent, targetAddress: string) {
  const direction = pendingIdEventDirection(event, targetAddress);
  if (event.kind === "update") {
    return `${direction} receiver update`;
  }

  if (event.kind === "list") {
    return `${direction} listing`;
  }

  if (event.kind === "delist") {
    return `${direction} delisting`;
  }

  return `${direction} ID transfer`;
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

function resolvePowIdOwnerInput(
  value: string,
  targetNetwork: BitcoinNetwork,
  registryRecords: PowIdRecord[],
  registryAddress: string,
): PowIdOwnerResolution {
  const input = value.trim();
  if (!input) {
    return { displayRecipient: "", isId: false, ownerAddress: "", receiveAddress: "" };
  }

  if (isValidBitcoinAddress(input, targetNetwork)) {
    return {
      displayRecipient: input,
      isId: false,
      ownerAddress: input,
      receiveAddress: input,
    };
  }

  const id = normalizePowId(input);
  const displayRecipient = id ? `${id}@proofofwork.me` : input;
  if (!id) {
    return {
      displayRecipient,
      error: "Enter a valid Bitcoin address or confirmed ProofOfWork ID.",
      isId: true,
      ownerAddress: "",
      receiveAddress: "",
    };
  }

  if (!registryAddress) {
    return {
      displayRecipient,
      error: `ProofOfWork ID registry is not configured for ${networkLabel(targetNetwork)}.`,
      id,
      isId: true,
      ownerAddress: "",
      receiveAddress: "",
    };
  }

  const matchingRecords = registryRecords.filter((record) => record.network === targetNetwork && record.id === id);
  const confirmedRecord = matchingRecords.find((record) => record.confirmed);
  if (confirmedRecord) {
    return {
      displayRecipient,
      id,
      isId: true,
      ownerAddress: confirmedRecord.ownerAddress,
      receiveAddress: confirmedRecord.receiveAddress,
      record: confirmedRecord,
    };
  }

  const pendingRecord = matchingRecords.find((record) => !record.confirmed);
  if (pendingRecord) {
    return {
      displayRecipient,
      error: `${displayRecipient} is pending. Wait for confirmation before transferring to this ID.`,
      id,
      isId: true,
      ownerAddress: "",
      receiveAddress: "",
      record: pendingRecord,
    };
  }

  return {
    displayRecipient,
    error: `No confirmed ProofOfWork ID found for ${displayRecipient}.`,
    id,
    isId: true,
    ownerAddress: "",
    receiveAddress: "",
  };
}

function splitRecipientInputs(value: string) {
  return value
    .split(/[,;\n]+/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveRecipientInputs(
  value: string,
  targetNetwork: BitcoinNetwork,
  registryRecords: PowIdRecord[],
  registryAddress: string,
): MultiRecipientResolution {
  const inputs = splitRecipientInputs(value);
  if (inputs.length === 0) {
    return { duplicateCount: 0, idCount: 0, recipients: [] };
  }

  if (inputs.length > MAX_RECIPIENTS) {
    return {
      duplicateCount: 0,
      error: `Send to ${MAX_RECIPIENTS} recipients or fewer for now.`,
      idCount: 0,
      recipients: [],
    };
  }

  const recipients: RecipientResolution[] = [];
  const seen = new Set<string>();
  let duplicateCount = 0;
  let idCount = 0;

  for (const input of inputs) {
    const resolved = resolveRecipientInput(input, targetNetwork, registryRecords, registryAddress);
    if (resolved.error || !resolved.paymentAddress) {
      return {
        duplicateCount,
        error: resolved.error || "Enter valid Bitcoin addresses or confirmed ProofOfWork IDs.",
        idCount,
        recipients,
      };
    }

    if (resolved.isId) {
      idCount += 1;
    }

    const key = resolved.paymentAddress;
    if (seen.has(key)) {
      duplicateCount += 1;
      continue;
    }

    seen.add(key);
    recipients.push(resolved);
  }

  return { duplicateCount, idCount, recipients };
}

function needsRegistryResolution(value: string, targetNetwork: BitcoinNetwork) {
  return splitRecipientInputs(value).some((input) => !isValidBitcoinAddress(input, targetNetwork));
}

function recipientResolutionNote(resolution: MultiRecipientResolution) {
  if (resolution.error) {
    return resolution.error;
  }

  if (resolution.recipients.length === 0) {
    return "";
  }

  const pieces = [`${resolution.recipients.length} recipient${resolution.recipients.length === 1 ? "" : "s"}`];
  if (resolution.idCount > 0) {
    pieces.push(`${resolution.idCount} confirmed ID${resolution.idCount === 1 ? "" : "s"} resolved`);
  }

  if (resolution.duplicateCount > 0) {
    pieces.push(`${resolution.duplicateCount} duplicate${resolution.duplicateCount === 1 ? "" : "s"} skipped`);
  }

  return pieces.join(" · ");
}

function ownerResolutionNote(resolution: PowIdOwnerResolution) {
  if (resolution.error) {
    return resolution.error;
  }

  if (!resolution.ownerAddress) {
    return "";
  }

  if (resolution.isId) {
    return `${resolution.displayRecipient} resolves to owner ${shortAddress(resolution.ownerAddress)} and receiver ${shortAddress(resolution.receiveAddress)}.`;
  }

  return "Raw Bitcoin owner address.";
}

function receiveResolutionNote(resolution: RecipientResolution) {
  if (resolution.error) {
    return resolution.error;
  }

  if (!resolution.paymentAddress) {
    return "";
  }

  if (resolution.isId) {
    return `${resolution.displayRecipient} resolves to receiver ${shortAddress(resolution.paymentAddress)}.`;
  }

  return "Raw Bitcoin receive address.";
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
  return isInboundFolder(message.folder) ? message.from : recipientSummary(message.recipients, message.to);
}

function recipientSummary(recipients: MailRecipient[] | undefined, fallback: string) {
  if (!recipients || recipients.length === 0) {
    return fallback;
  }

  const first = recipients[0];
  return recipients.length === 1 ? first.display : `${first.display} +${recipients.length - 1}`;
}

function recipientListText(recipients: MailRecipient[] | undefined, fallback: string) {
  if (!recipients || recipients.length === 0) {
    return fallback;
  }

  return recipients.map((recipient) => recipient.display).join(", ");
}

function recipientInputSummary(value: string) {
  const inputs = splitRecipientInputs(value);
  if (inputs.length === 0) {
    return "No recipient";
  }

  return inputs.length === 1 ? shortAddress(inputs[0]) : `${shortAddress(inputs[0])} +${inputs.length - 1}`;
}

function totalRecipientSats(recipients: MailRecipient[]) {
  return recipients.reduce((total, recipient) => total + recipient.amountSats, 0);
}

function messageReplyAmount(message: MailMessage) {
  return message.recipients?.[0]?.amountSats ?? message.amountSats;
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

  if (folder === "marketplace") {
    return "Marketplace";
  }

  if (folder === "desktop") {
    return "Desktop";
  }

  if (folder === "contacts") {
    return "Contacts";
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

  if (folder === "marketplace") {
    return "ID listings and transfers";
  }

  if (folder === "desktop") {
    return "Public file desktop";
  }

  if (folder === "contacts") {
    return "Local address book";
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

function normalizeSubject(value: string) {
  return value.trim().replace(/\s+/gu, " ").slice(0, 180);
}

function messageSubject(message: { attachment?: MailAttachment; memo: string; subject?: string }) {
  const subject = normalizeSubject(message.subject ?? "") || mailSubject(message.memo);
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

function isAudioAttachment(attachment: MailAttachment) {
  return attachment.mime.toLowerCase().startsWith("audio/");
}

function isVideoAttachment(attachment: MailAttachment) {
  return attachment.mime.toLowerCase().startsWith("video/");
}

function isPdfAttachment(attachment: MailAttachment) {
  return attachment.mime.toLowerCase() === "application/pdf" || attachment.name.toLowerCase().endsWith(".pdf");
}

function isTextAttachment(attachment: MailAttachment) {
  const mime = attachment.mime.toLowerCase();
  const name = attachment.name.toLowerCase();

  return (
    mime.startsWith("text/") ||
    [
      "application/json",
      "application/javascript",
      "application/typescript",
      "application/xml",
      "application/yaml",
      "application/x-yaml",
      "application/toml",
      "application/sql",
      "image/svg+xml",
    ].includes(mime) ||
    /\.(c|cc|cpp|cs|css|csv|env|go|h|hpp|html|java|js|json|jsx|kt|lua|md|php|pl|py|r|rb|rs|sh|sol|sql|svelte|swift|toml|ts|tsx|txt|vue|xml|yaml|yml)$/u.test(
      name,
    )
  );
}

function attachmentPreviewKind(attachment: MailAttachment): AttachmentPreviewKind {
  if (isImageAttachment(attachment)) {
    return "image";
  }

  if (isAudioAttachment(attachment)) {
    return "audio";
  }

  if (isVideoAttachment(attachment)) {
    return "video";
  }

  if (isPdfAttachment(attachment)) {
    return "pdf";
  }

  if (isTextAttachment(attachment)) {
    return "text";
  }

  return "unsupported";
}

function attachmentText(attachment: MailAttachment) {
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(base64UrlDecodeBytes(attachment.data));
  } catch {
    return "";
  }
}

function attachmentCodeLabel(attachment: MailAttachment) {
  const mime = attachment.mime.toLowerCase();
  const extension = attachment.name.split(".").pop()?.toLowerCase();

  if (mime === "application/json" || extension === "json") {
    return "JSON";
  }

  if (extension) {
    return extension.toUpperCase();
  }

  return mime.startsWith("text/") ? "Text" : "Code";
}

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.left = "-9999px";
  textarea.style.position = "fixed";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
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

function buildProtocolPayloads(subject: string, message: string, parentTxid?: string, attachment?: MailAttachment) {
  const bodyPrefix = `${PROTOCOL_PREFIX}m:`;
  const bodyChunkBytes = maxPayloadDataBytes(bodyPrefix);
  const payloads: string[] = [];
  const trimmedSubject = normalizeSubject(subject);

  if (trimmedSubject) {
    payloads.push(`${PROTOCOL_PREFIX}s:${encodeTextBase64Url(trimmedSubject)}`);
  }

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

function buildIdReceiverUpdatePayload(id: string, receiveAddress: string) {
  return `${ID_PROTOCOL_PREFIX}u:${encodeTextBase64Url(id)}:${receiveAddress}`;
}

function buildIdTransferPayload(id: string, ownerAddress: string, receiveAddress: string) {
  const receiver = receiveAddress.trim();
  return `${ID_PROTOCOL_PREFIX}t:${encodeTextBase64Url(id)}:${ownerAddress}${receiver ? `:${receiver}` : ""}`;
}

function saleAuthorizationDraft({
  anchorSigHashType,
  anchorSignature,
  anchorScriptPubKey,
  anchorTxid,
  anchorType,
  anchorValueSats,
  anchorVout,
  buyerAddress,
  expiresAt,
  id,
  nonce,
  priceSats,
  receiveAddress,
  sellerAddress,
  sellerPublicKey,
  version = ID_SALE_AUTH_VERSION,
}: {
  anchorSigHashType?: number;
  anchorSignature?: string;
  anchorScriptPubKey?: string;
  anchorTxid?: string;
  anchorType?: string;
  anchorValueSats?: number;
  anchorVout?: number;
  buyerAddress?: string;
  expiresAt?: string;
  id: string;
  nonce: string;
  priceSats: number;
  receiveAddress?: string;
  sellerAddress: string;
  sellerPublicKey?: string;
  version?: PowIdSaleAuthorizationDraft["version"];
}): PowIdSaleAuthorizationDraft {
  const draft: PowIdSaleAuthorizationDraft = {
    buyerAddress: buyerAddress?.trim() || undefined,
    expiresAt: expiresAt?.trim() || undefined,
    id: normalizePowId(id),
    nonce,
    priceSats: Math.floor(priceSats),
    receiveAddress: receiveAddress?.trim() || undefined,
    sellerAddress: sellerAddress.trim(),
    sellerPublicKey: sellerPublicKey?.trim().toLowerCase() || undefined,
    version,
  };

  if (version === ID_SALE_AUTH_VERSION_ANCHORED || version === ID_SALE_AUTH_VERSION) {
    draft.anchorSigHashType =
      typeof anchorSigHashType === "number" && Number.isSafeInteger(anchorSigHashType)
        ? Math.floor(anchorSigHashType)
        : version === ID_SALE_AUTH_VERSION
          ? ID_LISTING_ANCHOR_SIGHASH_TYPE
          : undefined;
    draft.anchorSignature = anchorSignature?.trim().toLowerCase() || undefined;
    draft.anchorScriptPubKey = anchorScriptPubKey?.trim().toLowerCase() || undefined;
    draft.anchorTxid = anchorTxid?.trim().toLowerCase() || undefined;
    draft.anchorType = anchorType?.trim() || (version === ID_SALE_AUTH_VERSION ? ID_LISTING_ANCHOR_TYPE : ID_LISTING_ANCHOR_TYPE_LEGACY);
    draft.anchorValueSats = typeof anchorValueSats === "number" && Number.isSafeInteger(anchorValueSats) ? Math.floor(anchorValueSats) : ID_LISTING_ANCHOR_VALUE_SATS;
    draft.anchorVout = typeof anchorVout === "number" && Number.isSafeInteger(anchorVout) ? Math.floor(anchorVout) : ID_LISTING_ANCHOR_VOUT;

    if (version === ID_SALE_AUTH_VERSION_ANCHORED && !draft.anchorScriptPubKey) {
      draft.anchorScriptPubKey = marketplaceLegacyAnchorScriptPubKey("livenet");
    }
  }

  return draft;
}

function saleAuthorizationMessage(authorization: PowIdSaleAuthorizationDraft) {
  const lines = [
    "ProofOfWork.Me ID Sale",
    `version:${authorization.version}`,
    `id:${normalizePowId(authorization.id)}@proofofwork.me`,
    `seller:${authorization.sellerAddress}`,
    `priceSats:${Math.floor(authorization.priceSats)}`,
    `buyer:${authorization.buyerAddress || "*"}`,
    `receiver:${authorization.receiveAddress || "*"}`,
    `nonce:${authorization.nonce}`,
    `expiresAt:${authorization.expiresAt || ""}`,
  ];

  if (authorization.version === ID_SALE_AUTH_VERSION_ANCHORED || authorization.version === ID_SALE_AUTH_VERSION) {
    lines.push(
      `anchorType:${authorization.anchorType || ""}`,
      `anchorTxid:${authorization.anchorTxid || ""}`,
      `anchorVout:${authorization.anchorVout ?? ""}`,
      `anchorValueSats:${authorization.anchorValueSats ?? ""}`,
      `anchorScriptPubKey:${authorization.anchorScriptPubKey || ""}`,
      `anchorSigHashType:${authorization.anchorSigHashType ?? ""}`,
      `sellerPublicKey:${authorization.sellerPublicKey || ""}`,
    );
  }

  return lines.join("\n");
}

function saleAuthorizationWithoutSignature(authorization: PowIdSaleAuthorization): PowIdSaleAuthorizationDraft {
  return saleAuthorizationDraft(authorization);
}

function parseSaleAuthorizationText(value: string, targetNetwork: BitcoinNetwork): PowIdSaleAuthorization {
  const parsed = JSON.parse(value) as unknown;
  if (!isPlainRecord(parsed)) {
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
  const version =
    parsed.version === ID_SALE_AUTH_VERSION_LEGACY
      ? ID_SALE_AUTH_VERSION_LEGACY
      : parsed.version === ID_SALE_AUTH_VERSION_ANCHORED
        ? ID_SALE_AUTH_VERSION_ANCHORED
        : parsed.version === ID_SALE_AUTH_VERSION
          ? ID_SALE_AUTH_VERSION
          : "";
  const anchorType = typeof parsed.anchorType === "string" ? parsed.anchorType.trim() : "";
  const anchorSigHashType = typeof parsed.anchorSigHashType === "number" ? Math.floor(parsed.anchorSigHashType) : Number.NaN;
  const anchorSignature = typeof parsed.anchorSignature === "string" ? parsed.anchorSignature.trim().toLowerCase() : "";
  const anchorScriptPubKey = typeof parsed.anchorScriptPubKey === "string" ? parsed.anchorScriptPubKey.trim().toLowerCase() : "";
  const anchorTxid = typeof parsed.anchorTxid === "string" ? parsed.anchorTxid.trim().toLowerCase() : "";
  const anchorVout = typeof parsed.anchorVout === "number" ? Math.floor(parsed.anchorVout) : Number.NaN;
  const anchorValueSats = typeof parsed.anchorValueSats === "number" ? Math.floor(parsed.anchorValueSats) : Number.NaN;
  const sellerPublicKey = typeof parsed.sellerPublicKey === "string" ? parsed.sellerPublicKey.trim().toLowerCase() : "";

  if (!version) {
    throw new Error("Sale authorization version is not supported.");
  }

  const idError = powIdError(id);
  if (idError) {
    throw new Error(idError);
  }

  if (!isValidBitcoinAddress(sellerAddress, targetNetwork)) {
    throw new Error("Seller address is not valid for the selected network.");
  }

  if (buyerAddress && !isValidBitcoinAddress(buyerAddress, targetNetwork)) {
    throw new Error("Buyer address is not valid for the selected network.");
  }

  if (receiveAddress && !isValidBitcoinAddress(receiveAddress, targetNetwork)) {
    throw new Error("Receive address is not valid for the selected network.");
  }

  if (!Number.isSafeInteger(priceSats) || priceSats < 0) {
    throw new Error("Sale price must be zero or more sats.");
  }

  if (!nonce || nonce.length > 160) {
    throw new Error("Sale authorization nonce is missing.");
  }

  if (expiresAt && Number.isNaN(Date.parse(expiresAt))) {
    throw new Error("Sale authorization expiry is not a valid date.");
  }

  if (version === ID_SALE_AUTH_VERSION_ANCHORED) {
    if (anchorType !== ID_LISTING_ANCHOR_TYPE_LEGACY) {
      throw new Error("Listing anchor type is not supported.");
    }

    if (
      !Number.isSafeInteger(anchorVout) ||
      anchorVout < 0 ||
      !Number.isSafeInteger(anchorValueSats) ||
      anchorValueSats < DUST_SATS ||
      anchorScriptPubKey !== marketplaceLegacyAnchorScriptPubKey(targetNetwork)
    ) {
      throw new Error("Listing anchor is invalid.");
    }
  }

  if (version === ID_SALE_AUTH_VERSION) {
    if (anchorType !== ID_LISTING_ANCHOR_TYPE) {
      throw new Error("Listing anchor type is not supported.");
    }

    if (
      !/^[0-9a-f]{64}$/u.test(anchorTxid) ||
      !Number.isSafeInteger(anchorVout) ||
      anchorVout < 0 ||
      !Number.isSafeInteger(anchorValueSats) ||
      anchorValueSats < DUST_SATS ||
      !/^[0-9a-f]+$/u.test(anchorScriptPubKey) ||
      !validPublicKeyHex(sellerPublicKey) ||
      anchorSigHashType !== ID_LISTING_ANCHOR_SIGHASH_TYPE ||
      !validSignatureHex(anchorSignature)
    ) {
      throw new Error("Listing anchor is invalid.");
    }
  }

  return {
    ...saleAuthorizationDraft({
      anchorSigHashType,
      anchorSignature,
      anchorScriptPubKey,
      anchorTxid,
      anchorType,
      anchorValueSats,
      anchorVout,
      buyerAddress,
      expiresAt,
      id,
      nonce,
      priceSats,
      receiveAddress,
      sellerAddress,
      sellerPublicKey,
      version,
    }),
    signature,
  };
}

function parseSaleAuthorizationJson(value: string, targetNetwork: BitcoinNetwork): PowIdSaleAuthorization {
  return parseSaleAuthorizationText(value, targetNetwork);
}

function saleAuthorizationCanBroadcast(authorization: PowIdSaleAuthorization) {
  return (
    (authorization.version === ID_SALE_AUTH_VERSION_ANCHORED || authorization.version === ID_SALE_AUTH_VERSION) &&
    Boolean(authorization.id && authorization.nonce)
  );
}

function saleAuthorizationVerified(_authorization: PowIdSaleAuthorization) {
  // Browser builds intentionally do not bundle the Node-oriented BIP322 verifier.
  // The production API/indexer performs canonical legacy buy2 signature verification.
  return false;
}

function saleAuthorizationTermsMatch(left: PowIdSaleAuthorization, right: PowIdSaleAuthorization) {
  const leftTerms = saleAuthorizationDraft(left);
  const rightTerms = saleAuthorizationDraft(right);
  return JSON.stringify(leftTerms) === JSON.stringify(rightTerms);
}

function findMatchingActiveListing(
  listings: Map<string, PowIdListing>,
  authorization: PowIdSaleAuthorization,
  currentOwnerAddress: string,
) {
  for (const listing of listings.values()) {
    if (
      listing.listingVersion !== "list3" &&
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

function saleAuthorizationHasAnchor(authorization: PowIdSaleAuthorization): authorization is PowIdSaleAuthorization & {
  anchorSigHashType?: number;
  anchorSignature?: string;
  anchorScriptPubKey: string;
  anchorTxid?: string;
  anchorType: string;
  anchorValueSats: number;
  anchorVout: number;
  sellerPublicKey?: string;
} {
  return (
    (authorization.version === ID_SALE_AUTH_VERSION_ANCHORED || authorization.version === ID_SALE_AUTH_VERSION) &&
    (authorization.anchorType === ID_LISTING_ANCHOR_TYPE_LEGACY || authorization.anchorType === ID_LISTING_ANCHOR_TYPE) &&
    typeof authorization.anchorScriptPubKey === "string" &&
    /^[0-9a-f]+$/u.test(authorization.anchorScriptPubKey) &&
    typeof authorization.anchorVout === "number" &&
    Number.isSafeInteger(authorization.anchorVout) &&
    typeof authorization.anchorValueSats === "number" &&
    Number.isSafeInteger(authorization.anchorValueSats) &&
    authorization.anchorValueSats >= DUST_SATS
  );
}

function saleAuthorizationUsesSellerUtxoAnchor(authorization: PowIdSaleAuthorization): authorization is PowIdSaleAuthorization & {
  anchorSigHashType: number;
  anchorSignature: string;
  anchorScriptPubKey: string;
  anchorTxid: string;
  anchorType: string;
  anchorValueSats: number;
  anchorVout: number;
  sellerPublicKey: string;
} {
  return (
    saleAuthorizationHasAnchor(authorization) &&
    authorization.version === ID_SALE_AUTH_VERSION &&
    authorization.anchorType === ID_LISTING_ANCHOR_TYPE &&
    typeof authorization.anchorTxid === "string" &&
    /^[0-9a-f]{64}$/u.test(authorization.anchorTxid) &&
    typeof authorization.sellerPublicKey === "string" &&
    validPublicKeyHex(authorization.sellerPublicKey) &&
    authorization.anchorSigHashType === ID_LISTING_ANCHOR_SIGHASH_TYPE &&
    typeof authorization.anchorSignature === "string" &&
    validSignatureHex(authorization.anchorSignature)
  );
}

function listingAnchorOutpoint(listing: PowIdListing) {
  if (!saleAuthorizationHasAnchor(listing.saleAuthorization)) {
    return null;
  }

  return {
    txid: saleAuthorizationUsesSellerUtxoAnchor(listing.saleAuthorization)
      ? listing.saleAuthorization.anchorTxid
      : listing.listingId,
    vout: listing.saleAuthorization.anchorVout,
  };
}

function spendsListingAnchor(spentOutpoints: PowIdSpentOutpoint[], listing: PowIdListing) {
  const anchor = listingAnchorOutpoint(listing);
  return Boolean(anchor && spentOutpoints.some((outpoint) => outpoint.txid === anchor.txid && outpoint.vout === anchor.vout));
}

function sellerPaymentRequiredSats(listing: PowIdListing) {
  const anchorValue = saleAuthorizationHasAnchor(listing.saleAuthorization) ? listing.saleAuthorization.anchorValueSats : 0;
  return listing.priceSats + anchorValue;
}

function listingAnchorIsPresent(vout: Array<Record<string, unknown>>, authorization: PowIdSaleAuthorization) {
  if (
    !saleAuthorizationHasAnchor(authorization) ||
    authorization.version !== ID_SALE_AUTH_VERSION_ANCHORED ||
    authorization.anchorType !== ID_LISTING_ANCHOR_TYPE_LEGACY
  ) {
    return false;
  }

  const output = vout[authorization.anchorVout];
  return (
    output?.scriptpubkey === authorization.anchorScriptPubKey &&
    typeof output.value === "number" &&
    output.value === authorization.anchorValueSats
  );
}

async function listingAnchorSpent(listing: PowIdListing, network: BitcoinNetwork) {
  const anchor = listingAnchorOutpoint(listing);
  if ((listing.listingVersion !== "list3" && listing.listingVersion !== "list4") || !anchor) {
    return false;
  }

  try {
    const response = await fetch(`${mempoolBase(network)}/api/tx/${anchor.txid}/outspend/${anchor.vout}`);
    if (!response.ok) {
      return false;
    }

    const outspend = (await response.json()) as Record<string, unknown>;
    return outspend.spent === true;
  } catch {
    return false;
  }
}

async function filterSpendableListings(listings: PowIdListing[], network: BitcoinNetwork) {
  const spentStates = await Promise.all(listings.map((listing) => listingAnchorSpent(listing, network)));
  return listings.filter((_listing, index) => !spentStates[index]);
}

function saleAuthorizationExpired(authorization: PowIdSaleAuthorization, eventCreatedAt: string) {
  if (!authorization.expiresAt) {
    return false;
  }

  return Date.parse(eventCreatedAt) > Date.parse(authorization.expiresAt);
}

function compareRegistryEventOrder(left: PowIdEvent, right: PowIdEvent) {
  if (left.confirmed && right.confirmed) {
    const leftHeight = typeof left.blockHeight === "number" && Number.isSafeInteger(left.blockHeight) ? left.blockHeight : Number.POSITIVE_INFINITY;
    const rightHeight = typeof right.blockHeight === "number" && Number.isSafeInteger(right.blockHeight) ? right.blockHeight : Number.POSITIVE_INFINITY;
    if (leftHeight !== rightHeight) {
      return leftHeight - rightHeight;
    }

    const leftIndex = typeof left.blockIndex === "number" && Number.isSafeInteger(left.blockIndex) ? left.blockIndex : Number.POSITIVE_INFINITY;
    const rightIndex = typeof right.blockIndex === "number" && Number.isSafeInteger(right.blockIndex) ? right.blockIndex : Number.POSITIVE_INFINITY;
    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }
  }

  return Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.txid.localeCompare(right.txid);
}

function buildIdMarketplaceTransferPayload(
  listingId: string,
  ownerAddress: string,
  receiveAddress: string,
  version: Extract<PowIdMarketplaceTransferVersion, "buy3" | "buy4"> = "buy4",
) {
  const receiver = receiveAddress.trim();
  return `${ID_PROTOCOL_PREFIX}${version}:${listingId}:${ownerAddress}${receiver ? `:${receiver}` : ""}`;
}

function buildIdListingPayload(authorization: PowIdSaleAuthorization) {
  return `${ID_PROTOCOL_PREFIX}list4:${encodeTextBase64Url(JSON.stringify(authorization))}`;
}

function buildIdDelistingPayload(listingId: string, version: PowIdDelistingVersion = "delist4") {
  return `${ID_PROTOCOL_PREFIX}${version}:${listingId}`;
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

function storedMailRecipients(value: unknown, network: BitcoinNetwork): MailRecipient[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item): MailRecipient[] => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const recipient = item as Partial<MailRecipient>;
    if (typeof recipient.address !== "string" || !isValidBitcoinAddress(recipient.address, network)) {
      return [];
    }

    const amountSats = typeof recipient.amountSats === "number" && recipient.amountSats > 0 ? Math.floor(recipient.amountSats) : DEFAULT_AMOUNT_SATS;
    const id = typeof recipient.id === "string" ? normalizePowId(recipient.id) : "";
    const display =
      typeof recipient.display === "string" && recipient.display.trim()
        ? recipient.display.trim()
        : id
          ? `${id}@proofofwork.me`
          : recipient.address;

    return [
      {
        address: recipient.address,
        amountSats,
        display,
        id: id || undefined,
      },
    ];
  });
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
      const recipients = storedMailRecipients(sent.recipients, network);
      const toRecipients = storedMailRecipients(sent.toRecipients, network);
      const ccRecipients = storedMailRecipients(sent.ccRecipients, network);

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
          recipients: recipients.length > 0 ? recipients : undefined,
          subject: typeof sent.subject === "string" ? sent.subject.slice(0, 180) : undefined,
          toRecipients: toRecipients.length > 0 ? toRecipients : undefined,
          ccRecipients: ccRecipients.length > 0 ? ccRecipients : undefined,
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

        if (Array.isArray(preference.folders)) {
          const folders = [...new Set(preference.folders.filter((folder) => typeof folder === "string" && folder.trim()).map((folder) => folder.trim()))];
          if (folders.length > 0) {
            normalized.folders = folders;
          }
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

function normalizeFolderName(name: string) {
  return name.trim().replace(/\s+/gu, " ").slice(0, 40);
}

function customFolderId(name: string) {
  const slug = normalizeFolderName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 32);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${slug || "folder"}-${suffix}`;
}

function sortCustomFolders(folders: CustomFolderRecord[]) {
  return [...folders].sort((left, right) => left.name.localeCompare(right.name) || left.createdAt.localeCompare(right.createdAt));
}

function storedCustomFolder(value: unknown): CustomFolderRecord | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const folder = value as Partial<CustomFolderRecord>;
  const id = typeof folder.id === "string" ? folder.id.trim().slice(0, 80) : "";
  const name = typeof folder.name === "string" ? normalizeFolderName(folder.name) : "";
  if (!id || !name) {
    return undefined;
  }

  return {
    createdAt: typeof folder.createdAt === "string" && !Number.isNaN(Date.parse(folder.createdAt)) ? folder.createdAt : new Date().toISOString(),
    id,
    name,
  };
}

function loadCustomFolders(): CustomFolderRecord[] {
  try {
    const stored = localStorage.getItem(CUSTOM_FOLDERS_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortCustomFolders(parsed.flatMap((folder): CustomFolderRecord[] => {
      const normalized = storedCustomFolder(folder);
      return normalized ? [normalized] : [];
    }));
  } catch {
    return [];
  }
}

function saveCustomFolders(folders: CustomFolderRecord[]) {
  localStorage.setItem(CUSTOM_FOLDERS_KEY, JSON.stringify(sortCustomFolders(folders)));
}

function normalizeContactName(name: string, fallback: string) {
  return name.trim().replace(/\s+/gu, " ").slice(0, 80) || fallback;
}

function contactTarget(contact: Pick<ContactRecord, "address" | "powId">) {
  return contact.powId ? `${contact.powId}@proofofwork.me` : contact.address;
}

function contactKey(contact: Pick<ContactRecord, "address" | "network" | "powId">) {
  return `${contact.network}:${contact.powId ? `id:${contact.powId}` : `addr:${contact.address}`}`;
}

function registryContactKey(record: Pick<PowIdRecord, "id" | "network">) {
  return `${record.network}:id:${record.id}`;
}

function sortContacts(contacts: ContactRecord[]) {
  return [...contacts].sort((left, right) => {
    const byNetwork = left.network.localeCompare(right.network);
    if (byNetwork) {
      return byNetwork;
    }

    return left.name.localeCompare(right.name) || contactTarget(left).localeCompare(contactTarget(right));
  });
}

function storedContact(value: unknown): ContactRecord | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const contact = value as Partial<ContactRecord>;
  const network: BitcoinNetwork | undefined =
    contact.network === "livenet" || contact.network === "testnet" || contact.network === "testnet4" ? contact.network : undefined;

  if (!network || typeof contact.address !== "string" || !isValidBitcoinAddress(contact.address, network)) {
    return undefined;
  }

  const powId = typeof contact.powId === "string" ? normalizePowId(contact.powId) : "";
  const target = powId ? `${powId}@proofofwork.me` : shortAddress(contact.address);
  const createdAt = typeof contact.createdAt === "string" && !Number.isNaN(Date.parse(contact.createdAt)) ? contact.createdAt : new Date().toISOString();
  const updatedAt = typeof contact.updatedAt === "string" && !Number.isNaN(Date.parse(contact.updatedAt)) ? contact.updatedAt : createdAt;

  return {
    address: contact.address,
    createdAt,
    name: normalizeContactName(typeof contact.name === "string" ? contact.name : "", target),
    network,
    powId: powId || undefined,
    source: contact.source === "registry" ? "registry" : "manual",
    updatedAt,
  };
}

function loadContacts(): ContactRecord[] {
  try {
    const stored = localStorage.getItem(CONTACTS_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortContacts(parsed.flatMap((contact): ContactRecord[] => {
      const normalized = storedContact(contact);
      return normalized ? [normalized] : [];
    }));
  } catch {
    return [];
  }
}

function saveContacts(contacts: ContactRecord[]) {
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(sortContacts(contacts)));
}

function upsertContact(contacts: ContactRecord[], contact: ContactRecord) {
  const key = contactKey(contact);
  const next = new Map(contacts.map((current) => [contactKey(current), current]));
  const existing = next.get(key);
  next.set(key, {
    ...existing,
    ...contact,
    createdAt: existing?.createdAt ?? contact.createdAt,
    updatedAt: new Date().toISOString(),
  });
  return sortContacts([...next.values()]);
}

function contactFromRegistryRecord(record: PowIdRecord): ContactRecord {
  const target = `${record.id}@proofofwork.me`;
  return {
    address: record.receiveAddress,
    createdAt: new Date().toISOString(),
    name: target,
    network: record.network,
    powId: record.id,
    source: "registry",
    updatedAt: new Date().toISOString(),
  };
}

function contactFromInput(
  name: string,
  target: string,
  network: BitcoinNetwork,
  registryRecords: PowIdRecord[],
  registryAddress: string,
): ContactRecord {
  const trimmedTarget = target.trim();
  if (!trimmedTarget) {
    throw new Error("Enter an address or confirmed ProofOfWork ID.");
  }

  if (isValidBitcoinAddress(trimmedTarget, network)) {
    const fallback = shortAddress(trimmedTarget);
    return {
      address: trimmedTarget,
      createdAt: new Date().toISOString(),
      name: normalizeContactName(name, fallback),
      network,
      source: "manual",
      updatedAt: new Date().toISOString(),
    };
  }

  const resolved = resolveRecipientInput(trimmedTarget, network, registryRecords, registryAddress);
  if (resolved.error || !resolved.paymentAddress || !resolved.id) {
    throw new Error(resolved.error || "Enter a valid address or confirmed ProofOfWork ID.");
  }

  const fallback = `${resolved.id}@proofofwork.me`;
  return {
    address: resolved.paymentAddress,
    createdAt: new Date().toISOString(),
    name: normalizeContactName(name, fallback),
    network,
    powId: resolved.id,
    source: "registry",
    updatedAt: new Date().toISOString(),
  };
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
      ccRecipient: typeof draft.ccRecipient === "string" ? draft.ccRecipient : "",
      feeRate,
      from: address,
      memo: typeof draft.memo === "string" ? draft.memo : DEFAULT_MEMO,
      network,
      parentTxid,
      recipient: typeof draft.recipient === "string" ? draft.recipient : "",
      subject: typeof draft.subject === "string" ? draft.subject.slice(0, 180) : "",
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
      draft.ccRecipient?.trim() ||
      draft.subject?.trim() ||
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
  let subject = "";
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

    if (payload.startsWith("s:")) {
      try {
        subject = normalizeSubject(decodeTextBase64Url(payload.slice(2)));
      } catch {
        // Ignore malformed optional headers while keeping the message readable.
      }
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

  if (chunks.length === 0 && !subject && !attachmentAccumulator) {
    return null;
  }

  const protocolMessage: ProtocolMessage = {
    memo: chunks.join(""),
  };

  if (subject) {
    protocolMessage.subject = subject;
  }

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

  const fallbackOutput = vout.find(
    (output) => output.scriptpubkey_address === address && typeof output.value === "number",
  );

  return typeof fallbackOutput?.value === "number" ? fallbackOutput.value : 0;
}

function protocolPaymentOutputs(vout: Array<Record<string, unknown>>): MailRecipient[] {
  const protocolIndex = firstProtocolOutputIndex(vout);
  if (protocolIndex === -1) {
    return [];
  }

  return vout.flatMap((output, index): MailRecipient[] => {
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

function transactionSpentOutpoints(vin: Array<Record<string, unknown>>): PowIdSpentOutpoint[] {
  return vin.flatMap((input): PowIdSpentOutpoint[] => {
    const txid = typeof input.txid === "string" && /^[0-9a-fA-F]{64}$/u.test(input.txid) ? input.txid.toLowerCase() : "";
    const vout = typeof input.vout === "number" && Number.isSafeInteger(input.vout) && input.vout >= 0 ? input.vout : -1;
    return txid && vout >= 0 ? [{ txid, vout }] : [];
  });
}

function registryPaymentAmount(vout: Array<Record<string, unknown>>, registryAddress: string) {
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

function idEventMinimumPaymentSats(kind: "register" | "update" | "transfer" | "marketTransfer" | "list" | "delist") {
  return kind === "register" ? ID_REGISTRATION_PRICE_SATS : ID_MUTATION_PRICE_SATS;
}

function paymentOutputsBeforeIdProtocol(vout: Array<Record<string, unknown>>): PowIdPaymentSnapshot[] {
  const protocolIndex = firstIdProtocolOutputIndex(vout);
  return vout.flatMap((output, index): PowIdPaymentSnapshot[] => {
    if (
      typeof output.scriptpubkey_address !== "string" ||
      typeof output.value !== "number" ||
      output.value <= 0 ||
      (protocolIndex !== -1 && index >= protocolIndex)
    ) {
      return [];
    }

    return [{ address: output.scriptpubkey_address, amountSats: output.value }];
  });
}

function paymentAmountFromSnapshots(outputs: PowIdPaymentSnapshot[], address: string) {
  return outputs.reduce((total, output) => total + (output.address === address ? output.amountSats : 0), 0);
}

function paymentAmountBeforeIdProtocol(vout: Array<Record<string, unknown>>, address: string) {
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

function parseIdReceiverUpdatePayload(payload: string, targetNetwork: BitcoinNetwork) {
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
  if (powIdError(id) || !isValidBitcoinAddress(receiver, targetNetwork)) {
    return null;
  }

  return {
    id,
    receiveAddress: receiver,
  };
}

function parseIdTransferPayload(payload: string, targetNetwork: BitcoinNetwork) {
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
  if (
    powIdError(id) ||
    !isValidBitcoinAddress(owner, targetNetwork) ||
    !isValidBitcoinAddress(receiveAddress, targetNetwork)
  ) {
    return null;
  }

  return {
    id,
    ownerAddress: owner,
    receiveAddress,
  };
}

function parseIdMarketplaceTransferPayload(payload: string, targetNetwork: BitcoinNetwork) {
  const parts = payload.split(":");
  if (payload.startsWith("buy3:") || payload.startsWith("buy4:")) {
    if (parts.length < 3 || parts.length > 4 || !/^[0-9a-fA-F]{64}$/u.test(parts[1])) {
      return null;
    }

    const [, listingId, owner, receiver] = parts;
    const receiveAddress = receiver?.trim() || owner;
    if (!isValidBitcoinAddress(owner, targetNetwork) || !isValidBitcoinAddress(receiveAddress, targetNetwork)) {
      return null;
    }

    return {
      listingId: listingId.toLowerCase(),
      ownerAddress: owner,
      receiveAddress,
      transferVersion: payload.startsWith("buy4:") ? "buy4" as const : "buy3" as const,
    };
  }

  if (!payload.startsWith("buy2:")) {
    return null;
  }

  if (parts.length < 3 || parts.length > 4) {
    return null;
  }

  const [, authorizationEncoded, owner, receiver] = parts;
  let authorization: PowIdSaleAuthorization;
  try {
    authorization = parseSaleAuthorizationJson(decodeTextBase64Url(authorizationEncoded), targetNetwork);
  } catch {
    return null;
  }

  const receiveAddress = receiver?.trim() || owner;
  if (!isValidBitcoinAddress(owner, targetNetwork) || !isValidBitcoinAddress(receiveAddress, targetNetwork)) {
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
    transferVersion: "buy2" as const,
  };
}

function parseIdListingPayload(payload: string, targetNetwork: BitcoinNetwork) {
  const listingVersion: PowIdListingVersion = payload.startsWith("list4:") ? "list4" : payload.startsWith("list3:") ? "list3" : payload.startsWith("list2:") ? "list2" : "list2";
  if (!payload.startsWith("list2:") && !payload.startsWith("list3:") && !payload.startsWith("list4:")) {
    return null;
  }

  const parts = payload.split(":");
  if (parts.length !== 2) {
    return null;
  }

  const [, authorizationEncoded] = parts;
  let authorization: PowIdSaleAuthorization;
  try {
    authorization = parseSaleAuthorizationJson(decodeTextBase64Url(authorizationEncoded), targetNetwork);
  } catch {
    return null;
  }

  return {
    id: authorization.id,
    listingVersion,
    priceSats: authorization.priceSats,
    saleAuthorization: authorization,
    sellerAddress: authorization.sellerAddress,
  };
}

function parseIdDelistingPayload(payload: string) {
  const delistingVersion: PowIdDelistingVersion = payload.startsWith("delist4:") ? "delist4" : payload.startsWith("delist3:") ? "delist3" : payload.startsWith("delist2:") ? "delist2" : "delist2";
  if (!payload.startsWith("delist2:") && !payload.startsWith("delist3:") && !payload.startsWith("delist4:")) {
    return null;
  }

  const parts = payload.split(":");
  if (parts.length !== 2 || !/^[0-9a-fA-F]{64}$/u.test(parts[1])) {
    return null;
  }

  return {
    delistingVersion,
    listingId: parts[1].toLowerCase(),
  };
}

function parseIdEventPayload(payload: string, targetNetwork: BitcoinNetwork) {
  const registration = parseIdRegistrationPayload(payload, targetNetwork);
  if (registration) {
    return {
      kind: "register" as const,
      ...registration,
    };
  }

  const update = parseIdReceiverUpdatePayload(payload, targetNetwork);
  if (update) {
    return {
      kind: "update" as const,
      ...update,
    };
  }

  const transfer = parseIdTransferPayload(payload, targetNetwork);
  if (transfer) {
    return {
      kind: "transfer" as const,
      ...transfer,
    };
  }

  const marketplaceTransfer = parseIdMarketplaceTransferPayload(payload, targetNetwork);
  if (marketplaceTransfer) {
    return {
      kind: "marketTransfer" as const,
      ...marketplaceTransfer,
    };
  }

  const listing = parseIdListingPayload(payload, targetNetwork);
  if (listing) {
    return {
      kind: "list" as const,
      ...listing,
    };
  }

  const delisting = parseIdDelistingPayload(payload);
  if (delisting) {
    return {
      kind: "delist" as const,
      ...delisting,
    };
  }

  return null;
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

function transactionBlockHash(tx: Record<string, unknown>) {
  const status = tx.status as Record<string, unknown> | undefined;
  const blockHash = status?.block_hash;
  return typeof blockHash === "string" && /^[0-9a-fA-F]{64}$/u.test(blockHash) ? blockHash.toLowerCase() : "";
}

function transactionBlockHeight(tx: Record<string, unknown>) {
  const status = tx.status as Record<string, unknown> | undefined;
  const height = status?.block_height;
  return typeof height === "number" && Number.isSafeInteger(height) && height >= 0 ? height : undefined;
}

function transactionBlockIndex(tx: Record<string, unknown>) {
  const status = tx.status as Record<string, unknown> | undefined;
  const index = tx._powBlockIndex ?? status?.block_index ?? status?.block_tx_index;
  return typeof index === "number" && Number.isSafeInteger(index) && index >= 0 ? index : undefined;
}

async function annotateBlockOrder(txs: Array<Record<string, unknown>>, targetNetwork: BitcoinNetwork) {
  const blockCounts = new Map<string, number>();
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

  const blockIndexes = new Map<string, Map<string, number>>();
  await Promise.all(
    blockHashes.map(async (blockHash) => {
      const index = await fetchBlockTxidIndex(blockHash, targetNetwork).catch(() => null);
      if (index) {
        blockIndexes.set(blockHash, index);
      }
    }),
  );

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

  const txs = dedupeTransactions([...chainTxs, ...mempoolTxs, ...recentTxs]);
  return annotateBlockOrder(txs, targetNetwork);
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
      const recipients = protocolPaymentOutputs(vout);

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
        subject: protocolMessage.subject,
        attachment: protocolMessage.attachment,
        replyTo: sender === "Unknown" ? protocolMessage.replyTo ?? "Unknown" : sender,
        recipients: recipients.length > 0 ? recipients : undefined,
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
    const recipients = protocolPaymentOutputs(vout);
    const payment = recipients[0];
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
        amountSats: totalRecipientSats(recipients),
        attachment: protocolMessage.attachment,
        confirmedAt: confirmed ? createdAt : undefined,
        createdAt,
        feeRate: 0,
        from: targetAddress,
        lastCheckedAt: new Date().toISOString(),
        memo: protocolMessage.memo,
        network: targetNetwork,
        parentTxid: protocolMessage.parentTxid,
        recipients,
        subject: protocolMessage.subject,
        replyTo: targetAddress,
        status: confirmed ? "confirmed" : "pending",
        to: recipientSummary(recipients, payment.address),
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

function publicDesktopMail(inboxMessages: InboxMessage[], sentMessages: SentMessage[]): MailMessage[] {
  return [
    ...inboxMessages
      .filter((message) => message.confirmed)
      .map((message): MailMessage => ({ ...message, folder: "inbox" })),
    ...sentMessages
      .filter((message) => sentDeliveryStatus(message) === "confirmed")
      .map((message): MailMessage => ({ ...message, folder: "sent" })),
  ];
}

function idRegistryStateFromTransactions(
  txs: Array<Record<string, unknown>>,
  registryAddress: string,
  targetNetwork: BitcoinNetwork,
): { listings: PowIdListing[]; pendingEvents: PowIdPendingEvent[]; records: PowIdRecord[] } {
  const events = txs.flatMap((tx): PowIdEvent[] => {
    const vin = Array.isArray(tx.vin) ? (tx.vin as Array<Record<string, unknown>>) : [];
    const vout = Array.isArray(tx.vout) ? (tx.vout as Array<Record<string, unknown>>) : [];
    const amount = registryPaymentAmount(vout, registryAddress);
    const txid = typeof tx.txid === "string" && /^[0-9a-fA-F]{64}$/u.test(tx.txid) ? tx.txid.toLowerCase() : "";

    if (!txid || amount <= 0) {
      return [];
    }

    const eventMessage = decodedProtocolMessages(vout, ID_PROTOCOL_PREFIX)
      .map((message) => message.slice(ID_PROTOCOL_PREFIX.length))
      .map((payload) => parseIdEventPayload(payload, targetNetwork))
      .find(Boolean);
    if (!eventMessage) {
      return [];
    }

    if (amount < idEventMinimumPaymentSats(eventMessage.kind)) {
      return [];
    }

    const status = tx.status as Record<string, unknown> | undefined;
    const confirmed = Boolean(status?.confirmed);
    const blockTime = typeof status?.block_time === "number" ? status.block_time * 1000 : Date.now();
    const baseEvent = {
      amountSats: amount,
      blockHeight: transactionBlockHeight(tx),
      blockIndex: transactionBlockIndex(tx),
      confirmed,
      createdAt: new Date(blockTime).toISOString(),
      inputAddresses: transactionInputAddresses(vin),
      network: targetNetwork,
      txid,
    };
    const spentOutpoints = transactionSpentOutpoints(vin);
    const paymentOutputs = paymentOutputsBeforeIdProtocol(vout);

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
          paymentOutputs,
          priceSats: eventMessage.priceSats,
          receiveAddress: eventMessage.receiveAddress,
          saleAuthorization: eventMessage.saleAuthorization,
          sellerAddress: eventMessage.sellerAddress,
          spentOutpoints,
          transferVersion: eventMessage.transferVersion,
          listingId: eventMessage.listingId,
        },
      ];
    }

    if (eventMessage.kind === "list") {
      return [
        {
          ...baseEvent,
          id: eventMessage.id,
          kind: "list",
          listingAnchorPresent: listingAnchorIsPresent(vout, eventMessage.saleAuthorization),
          listingVersion: eventMessage.listingVersion,
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
          delistingVersion: eventMessage.delistingVersion,
          kind: "delist",
          listingId: eventMessage.listingId,
          spentOutpoints,
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
    .filter((event): event is Extract<PowIdEvent, { kind: "register" }> => !event.confirmed && event.kind === "register")
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.txid.localeCompare(right.txid));
  const records = new Map<string, PowIdRecord>();
  const listings = new Map<string, PowIdListing>();

  function invalidateListingsForId(id: string) {
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
      const anchorOk = event.delistingVersion !== "delist3" || (listing ? spendsListingAnchor(event.spentOutpoints, listing) : false);
      if (listing && current && event.inputAddresses.includes(current.ownerAddress) && anchorOk) {
        listings.delete(event.listingId);
      }
      continue;
    }

    if (event.kind === "marketTransfer") {
      if (event.transferVersion === "buy3" || event.transferVersion === "buy4") {
        const listing = event.listingId ? listings.get(event.listingId) : undefined;
        const current = listing ? records.get(listing.id) : undefined;
        const sellerPaymentSats = listing ? paymentAmountFromSnapshots(event.paymentOutputs, listing.sellerAddress) : 0;
        if (
          !listing ||
          !current ||
          (event.transferVersion === "buy3" && listing.listingVersion !== "list3") ||
          (event.transferVersion === "buy4" && listing.listingVersion !== "list4") ||
          current.ownerAddress !== listing.sellerAddress ||
          !spendsListingAnchor(event.spentOutpoints, listing) ||
          sellerPaymentSats < sellerPaymentRequiredSats(listing) ||
          saleAuthorizationExpired(listing.saleAuthorization, event.createdAt) ||
          (listing.buyerAddress && listing.buyerAddress !== event.ownerAddress) ||
          (listing.receiveAddress && listing.receiveAddress !== event.receiveAddress)
        ) {
          continue;
        }

        records.set(listing.id, {
          ...current,
          amountSats: event.amountSats,
          createdAt: event.createdAt,
          ownerAddress: event.ownerAddress,
          receiveAddress: event.receiveAddress,
          txid: event.txid,
        });
        invalidateListingsForId(listing.id);
        continue;
      }

      if (event.id && event.saleAuthorization && event.sellerAddress && typeof event.priceSats === "number") {
        const current = records.get(event.id);
        if (!current) {
          continue;
        }

        const matchingListing = findMatchingActiveListing(listings, event.saleAuthorization, current.ownerAddress);
        if (
          current.ownerAddress !== event.sellerAddress ||
          paymentAmountFromSnapshots(event.paymentOutputs, event.sellerAddress) < event.priceSats ||
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
      }
      continue;
    }

    const current = records.get(event.id);
    if (!current) {
      continue;
    }

    if (event.kind === "list") {
      if (
        current.ownerAddress !== event.sellerAddress ||
        !event.inputAddresses.includes(current.ownerAddress) ||
        saleAuthorizationExpired(event.saleAuthorization, event.createdAt) ||
        (event.listingVersion === "list3" && !event.listingAnchorPresent) ||
        (event.listingVersion === "list4" && event.saleAuthorization.version !== ID_SALE_AUTH_VERSION) ||
        (event.listingVersion === "list2" && event.saleAuthorization.version !== ID_SALE_AUTH_VERSION_LEGACY)
      ) {
        continue;
      }

      listings.set(event.txid, {
        amountSats: event.amountSats,
        anchorSigHashType: event.saleAuthorization.anchorSigHashType,
        anchorSignature: event.saleAuthorization.anchorSignature,
        anchorScriptPubKey: event.saleAuthorization.anchorScriptPubKey,
        anchorTxid: event.saleAuthorization.anchorTxid,
        anchorType: event.saleAuthorization.anchorType,
        anchorValueSats: event.saleAuthorization.anchorValueSats,
        anchorVout: event.saleAuthorization.anchorVout,
        buyerAddress: event.saleAuthorization.buyerAddress,
        confirmed: true,
        createdAt: event.createdAt,
        expiresAt: event.saleAuthorization.expiresAt,
        id: event.id,
        listingId: event.txid,
        listingVersion: event.listingVersion,
        network: event.network,
        priceSats: event.priceSats,
        receiveAddress: event.saleAuthorization.receiveAddress,
        saleAuthorization: event.saleAuthorization,
        sellerAddress: event.sellerAddress,
        sellerPublicKey: event.saleAuthorization.sellerPublicKey,
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
    .flatMap((event): PowIdPendingEvent[] => {
      if (event.kind === "delist") {
        const listing = listings.get(event.listingId);
        const current = listing ? records.get(listing.id) : undefined;
        const anchorOk = event.delistingVersion !== "delist3" || (listing ? spendsListingAnchor(event.spentOutpoints, listing) : false);
        if (!listing || !current || !event.inputAddresses.includes(current.ownerAddress) || !anchorOk) {
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

      if (event.kind === "marketTransfer") {
        if (event.transferVersion === "buy3" || event.transferVersion === "buy4") {
          const listing = event.listingId ? listings.get(event.listingId) : undefined;
          const current = listing ? records.get(listing.id) : undefined;
          const sellerPaymentSats = listing ? paymentAmountFromSnapshots(event.paymentOutputs, listing.sellerAddress) : 0;
          if (
            !listing ||
            !current ||
            (event.transferVersion === "buy3" && listing.listingVersion !== "list3") ||
            (event.transferVersion === "buy4" && listing.listingVersion !== "list4") ||
            current.ownerAddress !== listing.sellerAddress ||
            !spendsListingAnchor(event.spentOutpoints, listing) ||
            sellerPaymentSats < sellerPaymentRequiredSats(listing) ||
            saleAuthorizationExpired(listing.saleAuthorization, event.createdAt) ||
            (listing.buyerAddress && listing.buyerAddress !== event.ownerAddress) ||
            (listing.receiveAddress && listing.receiveAddress !== event.receiveAddress)
          ) {
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
              kind: "marketTransfer",
              listingId: listing.listingId,
              network: event.network,
              ownerAddress: event.ownerAddress,
              priceSats: listing.priceSats,
              receiveAddress: event.receiveAddress,
              sellerAddress: listing.sellerAddress,
              txid: event.txid,
            },
          ];
        }

        if (event.id && event.saleAuthorization && event.sellerAddress && typeof event.priceSats === "number") {
          const current = records.get(event.id);
          if (!current) {
            return [];
          }

          const matchingListing = findMatchingActiveListing(listings, event.saleAuthorization, current.ownerAddress);
          if (
            current.ownerAddress !== event.sellerAddress ||
            paymentAmountFromSnapshots(event.paymentOutputs, event.sellerAddress) < event.priceSats ||
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

        return [];
      }

      const current = records.get(event.id);
      if (!current) {
        return [];
      }

      if (event.kind === "list") {
        if (
          current.ownerAddress !== event.sellerAddress ||
          !event.inputAddresses.includes(current.ownerAddress) ||
          saleAuthorizationExpired(event.saleAuthorization, event.createdAt) ||
          (event.listingVersion === "list3" && !event.listingAnchorPresent) ||
          (event.listingVersion === "list4" && event.saleAuthorization.version !== ID_SALE_AUTH_VERSION) ||
          (event.listingVersion === "list2" && event.saleAuthorization.version !== ID_SALE_AUTH_VERSION_LEGACY)
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

function idRecordsFromTransactions(
  txs: Array<Record<string, unknown>>,
  registryAddress: string,
  targetNetwork: BitcoinNetwork,
): PowIdRecord[] {
  return idRegistryStateFromTransactions(txs, registryAddress, targetNetwork).records;
}

function idListingsFromTransactions(
  txs: Array<Record<string, unknown>>,
  registryAddress: string,
  targetNetwork: BitcoinNetwork,
): PowIdListing[] {
  return idRegistryStateFromTransactions(txs, registryAddress, targetNetwork).listings;
}

async function fetchIdRegistry(targetNetwork: BitcoinNetwork): Promise<PowIdRecord[]> {
  return (await fetchIdRegistryState(targetNetwork)).records;
}

async function fetchIdRegistryState(targetNetwork: BitcoinNetwork): Promise<{ listings: PowIdListing[]; pendingEvents: PowIdPendingEvent[]; records: PowIdRecord[] }> {
  const registryAddress = registryAddressForNetwork(targetNetwork);
  if (!registryAddress) {
    return { listings: [], pendingEvents: [], records: [] };
  }

  if (POW_API_BASE) {
    const payload = await fetchProofApiJson<PowRegistryApiResponse>("/api/v1/registry", targetNetwork);
    const listings = Array.isArray(payload.listings) ? payload.listings : [];
    return {
      listings: await filterSpendableListings(listings, targetNetwork),
      pendingEvents: Array.isArray(payload.pendingEvents) ? payload.pendingEvents : [],
      records: Array.isArray(payload.records) ? payload.records : [],
    };
  }

  const txs = await fetchRegistryTransactions(registryAddress, targetNetwork);
  const state = idRegistryStateFromTransactions(txs, registryAddress, targetNetwork);
  return {
    ...state,
    listings: await filterSpendableListings(state.listings, targetNetwork),
  };
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

async function loadUtxoPreviousOutput(utxo: MempoolUtxo, network: BitcoinNetwork) {
  const previousTxHex = await fetchTransactionHex(utxo.txid, network);
  const previousTx = bitcoin.Transaction.fromHex(previousTxHex);
  const previousOutput = previousTx.outs[utxo.vout];

  if (!previousOutput) {
    throw new Error(`Previous output ${shortAddress(utxo.txid)}:${utxo.vout} could not be read.`);
  }

  return {
    ...utxo,
    previousOutput,
    previousTxHex,
  };
}

async function chooseSellerAnchorPlan(fromAddress: string, network: BitcoinNetwork, priceSats: number) {
  const walletUtxos = await fetchUtxos(fromAddress, network);
  const confirmedUtxos = walletUtxos
    .filter((utxo) => utxo.status?.confirmed && utxo.value >= DUST_SATS)
    .sort((left, right) => left.value - right.value || left.txid.localeCompare(right.txid) || left.vout - right.vout);

  if (confirmedUtxos.length < 2) {
    throw new Error("A hardened listing needs at least two confirmed wallet UTXOs: one reserved as the sale anchor and one to publish the listing.");
  }

  const anchor = confirmedUtxos[0];
  const sealTargetSats = Math.floor(priceSats) + anchor.value + ID_LISTING_ANCHOR_SEAL_FEE_SATS;
  const fillerUtxos: MempoolUtxo[] = [];
  let totalSats = anchor.value;

  for (const utxo of confirmedUtxos.slice(1)) {
    fillerUtxos.push(utxo);
    totalSats += utxo.value;
    if (totalSats >= sealTargetSats + DUST_SATS) {
      break;
    }
  }

  if (totalSats < sealTargetSats) {
    throw new Error(`Need confirmed wallet UTXOs covering at least ${sealTargetSats.toLocaleString()} sats to create the seller anchor seal.`);
  }

  return {
    anchorUtxo: await loadUtxoPreviousOutput(anchor, network),
    sealFundingUtxos: await Promise.all(fillerUtxos.map((utxo) => loadUtxoPreviousOutput(utxo, network))),
  };
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
  baseInputCount = 0,
): UtxoSelection {
  const selected: MempoolUtxo[] = [];
  let selectedValue = 0;

  for (const utxo of utxos) {
    selected.push(utxo);
    selectedValue += utxo.value;

    const feeWithChange = Math.ceil(estimateTxVbytes(selected.length + baseInputCount, fixedOutputVbytes + changeOutputVbytes) * feeRate);
    const changeWithChange = selectedValue - amountSats - feeWithChange;
    if (changeWithChange >= DUST_SATS) {
      return {
        selected,
        feeSats: feeWithChange,
        changeSats: changeWithChange,
      };
    }

    const feeWithoutChange = Math.ceil(estimateTxVbytes(selected.length + baseInputCount, fixedOutputVbytes) * feeRate);
    const remainder = selectedValue - amountSats - feeWithoutChange;
    if (remainder >= 0) {
      return {
        selected,
        feeSats: feeWithoutChange + remainder,
        changeSats: 0,
      };
    }
  }

  const lastInputCount = Math.max(selected.length, 1) + baseInputCount;
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

function utxoInputData(utxo: MempoolUtxo & { previousOutput: bitcoin.Transaction["outs"][number]; previousTxHex: string }) {
  if (isNativeWitnessScript(utxo.previousOutput.script)) {
    return {
      witnessUtxo: {
        script: utxo.previousOutput.script,
        value: utxo.previousOutput.value,
      },
    };
  }

  return {
    nonWitnessUtxo: Buffer.from(utxo.previousTxHex, "hex"),
  };
}

async function buildPaymentPsbt({
  amountSats,
  excludeOutpoints,
  feeRate,
  fromAddress,
  network,
  payments,
  postProtocolPayments,
  requireConfirmedUtxos = true,
  protocolPayloads,
  toAddress,
}: {
  amountSats?: number;
  excludeOutpoints?: PowIdSpentOutpoint[];
  feeRate: number;
  fromAddress: string;
  network: BitcoinNetwork;
  payments?: PaymentOutputSpec[];
  postProtocolPayments?: PaymentOutputSpec[];
  requireConfirmedUtxos?: boolean;
  protocolPayloads: string[];
  toAddress?: string;
}) {
  const selectedNetwork = bitcoinNetwork(network);
  const paymentOutputs = payments ?? (toAddress && typeof amountSats === "number" ? [{ address: toAddress, amountSats }] : []);
  if (paymentOutputs.length === 0) {
    throw new Error("Add at least one recipient.");
  }

  const normalizeOutput = (payment: PaymentOutputSpec, index: number, label: string) => {
    const satoshis = Math.floor(payment.amountSats);
    if (satoshis <= 0) {
      throw new Error("Recipient amount must be greater than zero.");
    }

    if (payment.script) {
      return {
        amountSats: satoshis,
        script: payment.script,
      };
    }

    if (!payment.address) {
      throw new Error(`${label} ${index + 1} is missing an address.`);
    }

    return {
      address: payment.address,
      amountSats: satoshis,
      script: scriptForAddress(payment.address, network, `${label} ${index + 1}`),
    };
  };
  const normalizedPayments = paymentOutputs.map((payment, index) => normalizeOutput(payment, index, "Recipient"));
  const normalizedPostProtocolPayments = (postProtocolPayments ?? []).map((payment, index) => normalizeOutput(payment, index, "Post-protocol recipient"));
  const totalAmountSats = [...normalizedPayments, ...normalizedPostProtocolPayments].reduce((total, payment) => total + payment.amountSats, 0);
  const changeScript = scriptForAddress(fromAddress, network, "Connected wallet");
  const opReturnScripts = protocolOutputScripts(protocolPayloads);
  const fixedOutputVbytes =
    normalizedPayments.reduce((total, payment) => total + outputVbytesForScript(payment.script), 0) +
    opReturnScripts.reduce((total, script) => total + outputVbytesForScript(script), 0) +
    normalizedPostProtocolPayments.reduce((total, payment) => total + outputVbytesForScript(payment.script), 0);
  const changeOutputVbytes = outputVbytesForScript(changeScript);
  const walletUtxos = await fetchUtxos(fromAddress, network);
  const excluded = new Set((excludeOutpoints ?? []).map((outpoint) => `${outpoint.txid}:${outpoint.vout}`));
  const spendableWalletUtxos = walletUtxos.filter((utxo) => !excluded.has(`${utxo.txid}:${utxo.vout}`));
  const utxos = requireConfirmedUtxos ? spendableWalletUtxos.filter((utxo) => utxo.status?.confirmed) : spendableWalletUtxos;

  if (walletUtxos.length === 0) {
    throw new Error(`No spendable UTXOs found for ${shortAddress(fromAddress)} on ${networkLabel(network)}.`);
  }

  if (requireConfirmedUtxos && utxos.length === 0) {
    throw new Error(
      `No confirmed UTXOs found for ${shortAddress(fromAddress)}. Wait for wallet funds to confirm before broadcasting.`,
    );
  }

  let selection: UtxoSelection;
  try {
    selection = selectUtxos(utxos, totalAmountSats, feeRate, fixedOutputVbytes, changeOutputVbytes);
  } catch (error) {
    if (requireConfirmedUtxos && walletUtxos.length > utxos.length) {
      throw new Error(
        `${errorMessage(error, "Insufficient confirmed funds.")} Only confirmed UTXOs are used for ProofOfWork.Me broadcasts so effective fees do not get dragged down by unconfirmed ancestors.`,
      );
    }

    throw error;
  }
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

    psbt.addInput({
      ...input,
      ...utxoInputData(utxo),
    });
  }

  for (const payment of normalizedPayments) {
    if (payment.address) {
      psbt.addOutput({
        address: payment.address,
        value: BigInt(payment.amountSats),
      });
    } else {
      psbt.addOutput({
        script: payment.script,
        value: BigInt(payment.amountSats),
      });
    }
  }

  for (const script of opReturnScripts) {
    psbt.addOutput({
      script,
      value: 0n,
    });
  }

  for (const payment of normalizedPostProtocolPayments) {
    if (payment.address) {
      psbt.addOutput({
        address: payment.address,
        value: BigInt(payment.amountSats),
      });
    } else {
      psbt.addOutput({
        script: payment.script,
        value: BigInt(payment.amountSats),
      });
    }
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
    outputCount: normalizedPayments.length + opReturnScripts.length + normalizedPostProtocolPayments.length + (selection.changeSats >= DUST_SATS ? 1 : 0),
    psbtHex: psbt.toHex(),
  };
}

async function signSellerAnchorAuthorization({
  anchorUtxo,
  network,
  priceSats,
  sellerAddress,
  sellerPublicKey,
  sealFundingUtxos,
  wallet,
}: {
  anchorUtxo: MempoolUtxo & { previousOutput: bitcoin.Transaction["outs"][number]; previousTxHex: string };
  network: BitcoinNetwork;
  priceSats: number;
  sellerAddress: string;
  sellerPublicKey: string;
  sealFundingUtxos: Array<MempoolUtxo & { previousOutput: bitcoin.Transaction["outs"][number]; previousTxHex: string }>;
  wallet: UnisatWallet;
}) {
  if (!wallet.signPsbt) {
    throw new Error("UniSat signPsbt is not available. Update UniSat and try again.");
  }

  const psbt = new bitcoin.Psbt({ network: bitcoinNetwork(network) });
  psbt.addInput({
    hash: anchorUtxo.txid,
    index: anchorUtxo.vout,
    sighashType: ID_LISTING_ANCHOR_SIGHASH_TYPE,
    ...utxoInputData(anchorUtxo),
  });

  for (const utxo of sealFundingUtxos) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      ...utxoInputData(utxo),
    });
  }

  const totalInputSats = anchorUtxo.value + sealFundingUtxos.reduce((total, utxo) => total + utxo.value, 0);
  const sellerOutputSats = Math.floor(priceSats) + anchorUtxo.value;
  const changeSats = totalInputSats - sellerOutputSats - ID_LISTING_ANCHOR_SEAL_FEE_SATS;
  if (changeSats < 0) {
    throw new Error("Seller anchor seal does not have enough temporary wallet input value.");
  }

  psbt.addOutput({
    address: sellerAddress,
    value: BigInt(sellerOutputSats),
  });

  if (changeSats >= DUST_SATS) {
    psbt.addOutput({
      address: sellerAddress,
      value: BigInt(changeSats),
    });
  }

  let signedPsbtHex = "";
  try {
    signedPsbtHex = await wallet.signPsbt(psbt.toHex(), {
      autoFinalized: false,
      toSignInputs: [
        {
          address: sellerAddress,
          index: 0,
          sighashTypes: [ID_LISTING_ANCHOR_SIGHASH_TYPE],
        },
      ],
    });
  } catch (addressError) {
    try {
      signedPsbtHex = await wallet.signPsbt(psbt.toHex(), {
        autoFinalized: false,
        toSignInputs: [
          {
            index: 0,
            publicKey: sellerPublicKey,
            sighashTypes: [ID_LISTING_ANCHOR_SIGHASH_TYPE],
          },
        ],
      });
    } catch {
      throw addressError;
    }
  }
  const signedPsbt = bitcoin.Psbt.fromHex(signedPsbtHex, { network: bitcoinNetwork(network) });
  const partialSig =
    signedPsbt.data.inputs[0]?.partialSig?.find((candidate) => bytesToHex(candidate.pubkey).toLowerCase() === sellerPublicKey.toLowerCase()) ??
    signedPsbt.data.inputs[0]?.partialSig?.[0];
  const signature = partialSig?.signature;

  if (!signature || signature[signature.length - 1] !== ID_LISTING_ANCHOR_SIGHASH_TYPE) {
    throw new Error("Wallet did not return a seller anchor signature with the required sighash type.");
  }

  return bytesToHex(signature);
}

function encodeCompactSize(value: number) {
  if (value < 0xfd) {
    return Buffer.from([value]);
  }

  if (value <= 0xffff) {
    const buffer = Buffer.alloc(3);
    buffer[0] = 0xfd;
    buffer.writeUInt16LE(value, 1);
    return buffer;
  }

  if (value <= 0xffffffff) {
    const buffer = Buffer.alloc(5);
    buffer[0] = 0xfe;
    buffer.writeUInt32LE(value, 1);
    return buffer;
  }

  throw new Error("Witness stack item is too large.");
}

function witnessStackToScriptWitness(stack: Uint8Array[]) {
  return Buffer.concat([
    encodeCompactSize(stack.length),
    ...stack.flatMap((item) => [encodeCompactSize(item.length), Buffer.from(item)]),
  ]);
}

function listingAnchorDetails(listing: PowIdListing, network: BitcoinNetwork) {
  if (!saleAuthorizationHasAnchor(listing.saleAuthorization)) {
    throw new Error("This listing does not use a spendable marketplace anchor.");
  }

  if (saleAuthorizationUsesSellerUtxoAnchor(listing.saleAuthorization)) {
    return {
      scriptPubKey: listing.saleAuthorization.anchorScriptPubKey,
      signature: listing.saleAuthorization.anchorSignature,
      sighashType: listing.saleAuthorization.anchorSigHashType,
      txid: listing.saleAuthorization.anchorTxid,
      valueSats: listing.saleAuthorization.anchorValueSats,
      vout: listing.saleAuthorization.anchorVout,
      publicKey: listing.saleAuthorization.sellerPublicKey,
    };
  }

  if (listing.saleAuthorization.anchorScriptPubKey !== marketplaceLegacyAnchorScriptPubKey(network)) {
    throw new Error("This listing anchor script does not match the legacy marketplace protocol.");
  }

  return {
    script: marketplaceLegacyAnchorOutputScript(network),
    txid: listing.listingId,
    valueSats: listing.saleAuthorization.anchorValueSats,
    vout: listing.saleAuthorization.anchorVout,
    witnessScript: marketplaceLegacyAnchorWitnessScript(),
  };
}

async function assertListingAnchorUnspent(listing: PowIdListing, network: BitcoinNetwork) {
  const anchor = listingAnchorDetails(listing, network);
  const listingTxHex = await fetchTransactionHex(anchor.txid, network);
  const listingTx = bitcoin.Transaction.fromHex(listingTxHex);
  const output = listingTx.outs[anchor.vout];
  const expectedScript = "scriptPubKey" in anchor ? anchor.scriptPubKey : bytesToHex(anchor.script);

  if (!output || bytesToHex(output.script) !== expectedScript || Number(output.value) !== anchor.valueSats) {
    throw new Error("Listing anchor output does not match the on-chain listing transaction.");
  }

  const outspendResponse = await fetch(`${mempoolBase(network)}/api/tx/${anchor.txid}/outspend/${anchor.vout}`);
  if (outspendResponse.ok) {
    const outspend = (await outspendResponse.json()) as Record<string, unknown>;
    if (outspend.spent) {
      throw new Error("This listing anchor has already been spent.");
    }
  }

  return {
    ...anchor,
    previousOutput: output,
    previousTxHex: listingTxHex,
  };
}

async function buildAnchoredMarketplacePsbt({
  feeRate,
  fromAddress,
  listing,
  network,
  payments,
  protocolPayloads,
  requireConfirmedUtxos = true,
}: {
  feeRate: number;
  fromAddress: string;
  listing: PowIdListing;
  network: BitcoinNetwork;
  payments: PaymentOutputSpec[];
  protocolPayloads: string[];
  requireConfirmedUtxos?: boolean;
}) {
  const selectedNetwork = bitcoinNetwork(network);
  const anchor = await assertListingAnchorUnspent(listing, network);
  const normalizedPayments = payments.map((payment, index) => {
    const satoshis = Math.floor(payment.amountSats);
    if (satoshis <= 0) {
      throw new Error("Recipient amount must be greater than zero.");
    }

    if (!payment.address) {
      throw new Error(`Recipient ${index + 1} is missing an address.`);
    }

    return {
      address: payment.address,
      amountSats: satoshis,
      script: scriptForAddress(payment.address, network, `Recipient ${index + 1}`),
    };
  });
  const positiveOutputSats = normalizedPayments.reduce((total, payment) => total + payment.amountSats, 0);
  const walletFundedSats = Math.max(0, positiveOutputSats - anchor.valueSats);
  const changeScript = scriptForAddress(fromAddress, network, "Connected wallet");
  const opReturnScripts = protocolOutputScripts(protocolPayloads);
  const fixedOutputVbytes =
    normalizedPayments.reduce((total, payment) => total + outputVbytesForScript(payment.script), 0) +
    opReturnScripts.reduce((total, script) => total + outputVbytesForScript(script), 0);
  const changeOutputVbytes = outputVbytesForScript(changeScript);
  const walletUtxos = await fetchUtxos(fromAddress, network);
  const utxos = requireConfirmedUtxos ? walletUtxos.filter((utxo) => utxo.status?.confirmed) : walletUtxos;

  if (walletUtxos.length === 0) {
    throw new Error(`No spendable UTXOs found for ${shortAddress(fromAddress)} on ${networkLabel(network)}.`);
  }

  if (requireConfirmedUtxos && utxos.length === 0) {
    throw new Error(
      `No confirmed UTXOs found for ${shortAddress(fromAddress)}. Wait for wallet funds to confirm before broadcasting.`,
    );
  }

  let selection: UtxoSelection;
  try {
    selection = selectUtxos(utxos, walletFundedSats, feeRate, fixedOutputVbytes, changeOutputVbytes, 1);
  } catch (error) {
    if (requireConfirmedUtxos && walletUtxos.length > utxos.length) {
      throw new Error(
        `${errorMessage(error, "Insufficient confirmed funds.")} Only confirmed UTXOs are used for ProofOfWork.Me broadcasts so effective fees do not get dragged down by unconfirmed ancestors.`,
      );
    }

    throw error;
  }

  const selectedWithPreviousTx = await Promise.all(selection.selected.map((utxo) => loadUtxoPreviousOutput(utxo, network)));

  const psbt = new bitcoin.Psbt({ network: selectedNetwork });
  if ("signature" in anchor && typeof anchor.signature === "string" && typeof anchor.publicKey === "string") {
    psbt.addInput({
      hash: anchor.txid,
      index: anchor.vout,
      partialSig: [
        {
          pubkey: Buffer.from(anchor.publicKey, "hex"),
          signature: Buffer.from(anchor.signature, "hex"),
        },
      ],
      sighashType: anchor.sighashType,
      ...utxoInputData({
        txid: anchor.txid,
        value: anchor.valueSats,
        vout: anchor.vout,
        previousOutput: anchor.previousOutput,
        previousTxHex: anchor.previousTxHex,
      }),
    });
  } else {
    psbt.addInput({
      hash: anchor.txid,
      index: anchor.vout,
      witnessScript: anchor.witnessScript,
      witnessUtxo: {
        script: anchor.script,
        value: BigInt(anchor.valueSats),
      },
    });
  }

  for (const utxo of selectedWithPreviousTx) {
    const input = {
      hash: utxo.txid,
      index: utxo.vout,
    };

    psbt.addInput({
      ...input,
      ...utxoInputData(utxo),
    });
  }

  for (const payment of normalizedPayments) {
    psbt.addOutput({
      address: payment.address,
      value: BigInt(payment.amountSats),
    });
  }

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

  if ("signature" in anchor && typeof anchor.signature === "string") {
    psbt.finalizeInput(0);
  } else {
    psbt.finalizeInput(0, () => ({
      finalScriptWitness: witnessStackToScriptWitness([anchor.witnessScript]),
    }));
  }

  return {
    anchorInputCount: 1,
    changeSats: selection.changeSats,
    feeSats: selection.feeSats,
    inputCount: selection.selected.length + 1,
    outputCount: normalizedPayments.length + opReturnScripts.length + (selection.changeSats >= DUST_SATS ? 1 : 0),
    psbtHex: psbt.toHex(),
    walletInputIndexes: selection.selected.map((_, index) => index + 1),
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
  signInputIndexes,
  signingAddress,
  wallet,
}: {
  inputCount: number;
  network: BitcoinNetwork;
  psbtHex: string;
  signInputIndexes?: number[];
  signingAddress?: string;
  wallet: UnisatWallet;
}) {
  if (!wallet.signPsbt) {
    throw new Error("UniSat signPsbt is not available. Update UniSat or use a wallet that can sign PSBTs.");
  }

  let signedPsbtHex = "";
  const requestedSignInputs = signInputIndexes?.map((index) => ({
    address: signingAddress,
    index,
  }));
  try {
    signedPsbtHex = await wallet.signPsbt(
      psbtHex,
      requestedSignInputs
        ? {
            autoFinalized: true,
            toSignInputs: requestedSignInputs,
          }
        : {
            autoFinalized: true,
          },
    );
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
      toSignInputs: (signInputIndexes ?? Array.from({ length: inputCount }, (_, index) => index)).map((index) => ({
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
  const desktopRoute = isDesktopRoute();
  const marketplaceMode = isMarketplaceRoute();
  const mainnetRegistryMode = idLaunchMode || marketplaceMode;
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [hasUnisat, setHasUnisat] = useState(() => Boolean(window.unisat));
  const [network, setNetwork] = useState<BitcoinNetwork>("livenet");
  const [address, setAddress] = useState("");
  const [recipient, setRecipient] = useState("");
  const [ccRecipient, setCcRecipient] = useState("");
  const [amountSats, setAmountSats] = useState(DEFAULT_AMOUNT_SATS);
  const [feeRate, setFeeRate] = useState(DEFAULT_FEE_RATE);
  const [subject, setSubject] = useState("");
  const [memo, setMemo] = useState(DEFAULT_MEMO);
  const [attachment, setAttachment] = useState<MailAttachment | undefined>();
  const [allSent, setAllSent] = useState<SentMessage[]>(() => loadSentMessages());
  const [chainSent, setChainSent] = useState<SentMessage[]>([]);
  const [idRegistry, setIdRegistry] = useState<PowIdRecord[]>([]);
  const [idListings, setIdListings] = useState<PowIdListing[]>([]);
  const [idPendingEvents, setIdPendingEvents] = useState<PowIdPendingEvent[]>([]);
  const [lastRegisteredId, setLastRegisteredId] = useState<PowIdRecord | undefined>();
  const [idName, setIdName] = useState("");
  const [idReceiveAddress, setIdReceiveAddress] = useState("");
  const [idPgpKey, setIdPgpKey] = useState("");
  const [managedIdName, setManagedIdName] = useState("");
  const [idUpdateReceiveAddress, setIdUpdateReceiveAddress] = useState("");
  const [idTransferOwnerAddress, setIdTransferOwnerAddress] = useState("");
  const [idTransferReceiveAddress, setIdTransferReceiveAddress] = useState("");
  const [idSalePriceSats, setIdSalePriceSats] = useState(1000);
  const [idSaleBuyerAddress, setIdSaleBuyerAddress] = useState("");
  const [idSaleReceiveAddress, setIdSaleReceiveAddress] = useState("");
  const [idSaleAuthorization, setIdSaleAuthorization] = useState("");
  const [idSelectedListingId, setIdSelectedListingId] = useState("");
  const [idPurchaseOwnerAddress, setIdPurchaseOwnerAddress] = useState("");
  const [idPurchaseReceiveAddress, setIdPurchaseReceiveAddress] = useState("");
  const [mailPreferences, setMailPreferences] = useState<MailPreferences>(() => loadMailPreferences());
  const [contacts, setContacts] = useState<ContactRecord[]>(() => loadContacts());
  const [customFolders, setCustomFolders] = useState<CustomFolderRecord[]>(() => loadCustomFolders());
  const [newFolderName, setNewFolderName] = useState("");
  const [desktopQuery, setDesktopQuery] = useState("");
  const [desktopProfile, setDesktopProfile] = useState<DesktopProfile | undefined>();
  const [desktopMail, setDesktopMail] = useState<MailMessage[]>([]);
  const [desktopSelectedKey, setDesktopSelectedKey] = useState("");
  const [desktopLoading, setDesktopLoading] = useState(false);
  const [savedDraft, setSavedDraft] = useState<DraftMessage | undefined>();
  const [inbox, setInbox] = useState<InboxMessage[]>([]);
  const [activeFolder, setActiveFolder] = useState<Folder>(() => (desktopRoute ? "desktop" : mainnetRegistryMode ? "ids" : "inbox"));
  const [activeCustomFolderId, setActiveCustomFolderId] = useState("");
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
    () => buildProtocolPayloads(subject, memo, replyParentTxid, attachment),
    [attachment, memo, replyParentTxid, subject],
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
  const contactsForNetwork = useMemo(
    () => contacts.filter((contact) => contact.network === network),
    [contacts, network],
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
  const activeCustomFolder = useMemo(
    () => customFolders.find((folder) => folder.id === activeCustomFolderId),
    [activeCustomFolderId, customFolders],
  );
  const customFolderMail = useMemo(
    () =>
      activeCustomFolderId
        ? allMail.filter((message) => mailPreferences[mailKey(message)]?.folders?.includes(activeCustomFolderId))
        : [],
    [activeCustomFolderId, allMail, mailPreferences],
  );
  const customFolderCounts = useMemo(
    () =>
      new Map(
        customFolders.map((folder) => [
          folder.id,
          allMail.filter((message) => mailPreferences[mailKey(message)]?.folders?.includes(folder.id)).length,
        ]),
      ),
    [allMail, customFolders, mailPreferences],
  );
  const allFileMessages = useMemo(
    () => allMail.filter((message) => message.attachment && (message.folder !== "inbox" || message.confirmed)),
    [allMail],
  );
  const desktopFileMessages = useMemo(() => desktopMail.filter(hasAttachment), [desktopMail]);
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
                      : activeFolder === "custom"
                        ? customFolderMail
                      : [],
        sortMode,
      ),
    [activeFolder, archiveMail, customFolderMail, favoritesMail, fileMessages, inboxMail, incomingMail, outboxMail, sentMail, sortMode],
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
    () => resolveRecipientInputs(recipient, network, idRegistry, registryAddress),
    [idRegistry, network, recipient, registryAddress],
  );
  const ccRecipientResolution = useMemo(
    () => resolveRecipientInputs(ccRecipient, network, idRegistry, registryAddress),
    [ccRecipient, idRegistry, network, registryAddress],
  );
  const recipientNote = recipient.trim() ? recipientResolutionNote(recipientResolution) : "";
  const ccRecipientNote = ccRecipient.trim() ? recipientResolutionNote(ccRecipientResolution) : "";
  const totalResolvedRecipients = recipientResolution.recipients.length + ccRecipientResolution.recipients.length;
  const canSend =
    Boolean(address && recipient.trim() && amountSats > 0 && Number.isFinite(feeRate) && feeRate >= 0 && (subject.trim() || memo.trim() || attachment)) &&
    recipientResolution.recipients.length > 0 &&
    totalResolvedRecipients <= MAX_RECIPIENTS &&
    !recipientResolution.error &&
    !ccRecipientResolution.error &&
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
  const pendingIdEventCount = useMemo(() => idPendingEvents.filter((event) => event.network === network).length, [idPendingEvents, network]);
  const walletPendingIdEvents = useMemo(
    () => idPendingEvents.filter((event) => event.network === network && pendingIdEventTouchesAddress(event, address)),
    [address, idPendingEvents, network],
  );
  const existingIdRegistration = useMemo(
    () => idRegistry.find((record) => record.network === network && record.id === normalizedIdName),
    [idRegistry, network, normalizedIdName],
  );
  const canRegisterId =
    Boolean(address && registryAddress && idRegistrationPayload && !powIdError(normalizedIdName) && isValidBitcoinAddress(idReceiveAddress.trim(), network)) &&
    idRegistrationBytes <= MAX_DATA_CARRIER_BYTES &&
    !existingIdRegistration &&
    !busy;
  const ownerControlledIds = useMemo(
    () => idRegistry.filter((record) => record.network === network && record.confirmed && record.ownerAddress === address),
    [address, idRegistry, network],
  );
  const managedIdRecord = useMemo(
    () => ownerControlledIds.find((record) => record.id === managedIdName) ?? ownerControlledIds[0],
    [managedIdName, ownerControlledIds],
  );
  const receiverUpdateResolution = useMemo(
    () => resolveRecipientInput(idUpdateReceiveAddress, network, idRegistry, registryAddress),
    [idRegistry, idUpdateReceiveAddress, network, registryAddress],
  );
  const idReceiverUpdatePayload = useMemo(
    () => (managedIdRecord && receiverUpdateResolution.paymentAddress ? buildIdReceiverUpdatePayload(managedIdRecord.id, receiverUpdateResolution.paymentAddress) : ""),
    [managedIdRecord, receiverUpdateResolution.paymentAddress],
  );
  const transferOwnerResolution = useMemo(
    () => resolvePowIdOwnerInput(idTransferOwnerAddress, network, idRegistry, registryAddress),
    [idRegistry, idTransferOwnerAddress, network, registryAddress],
  );
  const transferReceiveAddress = idTransferReceiveAddress.trim();
  const transferReceiveResolution = useMemo(
    () => (transferReceiveAddress ? resolveRecipientInput(transferReceiveAddress, network, idRegistry, registryAddress) : undefined),
    [idRegistry, network, registryAddress, transferReceiveAddress],
  );
  const effectiveTransferReceiveAddress = transferReceiveResolution ? transferReceiveResolution.paymentAddress : transferOwnerResolution.receiveAddress;
  const transferPayloadReceiveAddress =
    effectiveTransferReceiveAddress && effectiveTransferReceiveAddress !== transferOwnerResolution.ownerAddress
      ? effectiveTransferReceiveAddress
      : "";
  const idTransferPayload = useMemo(
    () =>
      managedIdRecord && transferOwnerResolution.ownerAddress
        ? buildIdTransferPayload(managedIdRecord.id, transferOwnerResolution.ownerAddress, transferPayloadReceiveAddress)
        : "",
    [managedIdRecord, transferOwnerResolution.ownerAddress, transferPayloadReceiveAddress],
  );
  const parsedSaleAuthorization = useMemo(() => {
    const trimmed = idSaleAuthorization.trim();
    if (!trimmed) {
      return undefined;
    }

    try {
      return parseSaleAuthorizationText(trimmed, network);
    } catch {
      return undefined;
    }
  }, [idSaleAuthorization, network]);
  const selectedMarketplaceListing = useMemo(
    () => idListings.find((listing) => listing.listingId === idSelectedListingId && listing.network === network),
    [idListings, idSelectedListingId, network],
  );
  const idPurchasePayload = useMemo(() => {
    if (!selectedMarketplaceListing || !idPurchaseOwnerAddress.trim()) {
      return "";
    }

    try {
      return buildIdMarketplaceTransferPayload(
        selectedMarketplaceListing.listingId,
        idPurchaseOwnerAddress.trim(),
        idPurchaseReceiveAddress.trim(),
        selectedMarketplaceListing.listingVersion === "list3" ? "buy3" : "buy4",
      );
    } catch {
      return "";
    }
  }, [idPurchaseOwnerAddress, idPurchaseReceiveAddress, selectedMarketplaceListing]);
  const idReceiverUpdateBytes = useMemo(
    () => (idReceiverUpdatePayload ? dataCarrierBytesForPayload(idReceiverUpdatePayload) : 0),
    [idReceiverUpdatePayload],
  );
  const idTransferBytes = useMemo(
    () => (idTransferPayload ? dataCarrierBytesForPayload(idTransferPayload) : 0),
    [idTransferPayload],
  );
  const idPurchaseBytes = useMemo(
    () => (idPurchasePayload ? dataCarrierBytesForPayload(idPurchasePayload) : 0),
    [idPurchasePayload],
  );
  const salePriceSats = Math.floor(idSalePriceSats);
  const saleBuyerAddress = idSaleBuyerAddress.trim();
  const saleReceiveAddress = idSaleReceiveAddress.trim();
  const purchaseReceiveAddress = idPurchaseReceiveAddress.trim();
  const canCreateSaleAuthorization =
    Boolean(
      address &&
        registryAddress &&
        managedIdRecord &&
        managedIdRecord.ownerAddress === address &&
        Number.isSafeInteger(salePriceSats) &&
        salePriceSats >= 0 &&
        (!saleBuyerAddress || isValidBitcoinAddress(saleBuyerAddress, network)) &&
        (!saleReceiveAddress || isValidBitcoinAddress(saleReceiveAddress, network)),
    ) && !busy;
  const canUpdateId =
    Boolean(
      address &&
        registryAddress &&
        managedIdRecord &&
        idReceiverUpdatePayload &&
        !receiverUpdateResolution.error &&
        isValidBitcoinAddress(receiverUpdateResolution.paymentAddress, network) &&
        receiverUpdateResolution.paymentAddress !== managedIdRecord.receiveAddress,
    ) &&
    idReceiverUpdateBytes <= MAX_DATA_CARRIER_BYTES &&
    !busy;
  const canTransferId =
    Boolean(
      address &&
        registryAddress &&
        managedIdRecord &&
        idTransferPayload &&
        !transferOwnerResolution.error &&
        !transferReceiveResolution?.error &&
        isValidBitcoinAddress(transferOwnerResolution.ownerAddress, network) &&
        isValidBitcoinAddress(effectiveTransferReceiveAddress, network) &&
        (transferOwnerResolution.ownerAddress !== managedIdRecord.ownerAddress || effectiveTransferReceiveAddress !== managedIdRecord.receiveAddress),
    ) &&
    idTransferBytes <= MAX_DATA_CARRIER_BYTES &&
    !busy;
  const canPurchaseId =
    Boolean(
      address &&
        registryAddress &&
        parsedSaleAuthorization &&
        selectedMarketplaceListing &&
        (selectedMarketplaceListing.listingVersion === "list3" || selectedMarketplaceListing.listingVersion === "list4") &&
        idPurchasePayload &&
        isValidBitcoinAddress(idPurchaseOwnerAddress.trim(), network) &&
        (!purchaseReceiveAddress || isValidBitcoinAddress(purchaseReceiveAddress, network)) &&
        (!parsedSaleAuthorization.buyerAddress || parsedSaleAuthorization.buyerAddress === idPurchaseOwnerAddress.trim()) &&
        (!parsedSaleAuthorization.receiveAddress || parsedSaleAuthorization.receiveAddress === (purchaseReceiveAddress || idPurchaseOwnerAddress.trim())) &&
        saleAuthorizationCanBroadcast(parsedSaleAuthorization),
    ) &&
    idPurchaseBytes <= MAX_DATA_CARRIER_BYTES &&
    !busy;
  const refreshInProgress = refreshing || checkingBroadcasts;
  const refreshDisabled =
    activeFolder === "contacts"
      ? true
      : activeFolder === "desktop"
        ? desktopLoading || !desktopProfile
        : activeFolder === "ids" || activeFolder === "marketplace"
          ? busy || refreshInProgress || !registryAddress
          : !address || busy || refreshInProgress;

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
    saveCustomFolders(customFolders);
  }, [customFolders]);

  useEffect(() => {
    setSavedDraft(address ? loadDraft(address, network) : undefined);
  }, [address, network]);

  useEffect(() => {
    setIdReceiveAddress(address);
    setIdPurchaseOwnerAddress(address);
  }, [address, network]);

  useEffect(() => {
    if (ownerControlledIds.length === 0) {
      setManagedIdName("");
      setIdUpdateReceiveAddress("");
      return;
    }

    const selectedRecord = ownerControlledIds.find((record) => record.id === managedIdName) ?? ownerControlledIds[0];
    if (selectedRecord.id !== managedIdName) {
      setManagedIdName(selectedRecord.id);
    }
  }, [managedIdName, ownerControlledIds]);

  useEffect(() => {
    if (desktopProfile && desktopProfile.network !== network) {
      setDesktopProfile(undefined);
      setDesktopMail([]);
      setDesktopSelectedKey("");
    }
  }, [desktopProfile, network]);

  useEffect(() => {
    if (!address || !composeOpen) {
      return;
    }

    const draft: DraftMessage = {
      amountSats,
      attachment,
      ccRecipient,
      feeRate,
      from: address,
      memo,
      network,
      parentTxid: replyParentTxid,
      recipient,
      subject,
      updatedAt: new Date().toISOString(),
    };

    if (!isDraftContentful(draft)) {
      return;
    }

    saveDraft(draft);
    setSavedDraft(draft);
  }, [address, amountSats, attachment, ccRecipient, composeOpen, feeRate, memo, network, recipient, replyParentTxid, subject]);

  useEffect(() => {
    if (activeFolder === "ids" || activeFolder === "marketplace") {
      void refreshIds(true);
    }
  }, [activeFolder, network]);

  useEffect(() => {
    if (!mainnetRegistryMode) {
      return;
    }

    setNetwork("livenet");
    setActiveFolder("ids");
    void refreshIds(true);
  }, [mainnetRegistryMode]);

  useEffect(() => {
    if (!landingMode) {
      return;
    }

    setNetwork("livenet");
    void refreshIds(true);
  }, [landingMode]);

  useEffect(() => {
    if ((!needsRegistryResolution(recipient, network) && !needsRegistryResolution(ccRecipient, network)) || !registryAddress) {
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
  }, [ccRecipient, network, recipient, registryAddress]);

  useEffect(() => {
    if (landingMode || desktopRoute) {
      return;
    }

    if (!window.unisat) {
      return;
    }

    if (mainnetRegistryMode) {
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
  }, [desktopRoute, hasUnisat, landingMode, mainnetRegistryMode]);

  useEffect(() => {
    if (landingMode || desktopRoute) {
      return;
    }

    if (!window.unisat?.on) {
      return;
    }

    const syncWallet = async () => {
      const accounts = await window.unisat?.getAccounts?.().catch(() => []);
      const nextAddress = accounts?.[0] ?? "";
      const nextNetwork = mainnetRegistryMode ? "livenet" : (await getWalletNetwork(window.unisat as UnisatWallet)) ?? network;

      setAddress(nextAddress);
      setNetwork(nextNetwork);
      setInbox([]);
      setChainSent([]);
      setSelectedKey("");
      setActiveFolder(mainnetRegistryMode ? "ids" : "inbox");
      setComposeOpen(false);

      if (!nextAddress) {
        setStatus({ tone: "idle", text: "Wallet account disconnected." });
        return;
      }

      try {
        if (mainnetRegistryMode) {
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
  }, [desktopRoute, hasUnisat, landingMode, mainnetRegistryMode, network]);

  function applyDraft(draft: DraftMessage) {
    setRecipient(draft.recipient);
    setCcRecipient(draft.ccRecipient ?? "");
    setAmountSats(draft.amountSats);
    setFeeRate(draft.feeRate);
    setSubject(draft.subject ?? "");
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

  function canUseCustomFolders(message: MailMessage) {
    return canFavorite(message);
  }

  function messageFolderIds(message: MailMessage) {
    return mailPreferences[mailKey(message)]?.folders ?? [];
  }

  function setMessageCustomFolder(message: MailMessage, folderId: string, enabled: boolean) {
    if (!canUseCustomFolders(message)) {
      setStatus({ tone: "bad", text: "Only confirmed mail can be filed." });
      return;
    }

    const folder = customFolders.find((item) => item.id === folderId);
    if (!folder) {
      return;
    }

    const key = mailKey(message);
    setMailPreferences((current) => {
      const next = { ...current };
      const currentFolders = new Set(next[key]?.folders ?? []);
      if (enabled) {
        currentFolders.add(folderId);
      } else {
        currentFolders.delete(folderId);
      }

      const folders = [...currentFolders];
      const existing = next[key] ?? {};
      if (folders.length > 0) {
        next[key] = { ...existing, folders };
      } else {
        const { folders: _folders, ...rest } = existing;
        if (Object.keys(rest).length > 0) {
          next[key] = rest;
        } else {
          delete next[key];
        }
      }

      return next;
    });

    setStatus({ tone: "good", text: enabled ? `Added to ${folder.name}.` : `Removed from ${folder.name}.` });
  }

  function createCustomFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = normalizeFolderName(newFolderName);
    if (!name) {
      return;
    }

    if (customFolders.some((folder) => folder.name.toLowerCase() === name.toLowerCase())) {
      setStatus({ tone: "bad", text: `${name} already exists.` });
      return;
    }

    const folder: CustomFolderRecord = {
      createdAt: new Date().toISOString(),
      id: customFolderId(name),
      name,
    };
    setCustomFolders((current) => sortCustomFolders([...current, folder]));
    setNewFolderName("");
    setActiveFolder("custom");
    setActiveCustomFolderId(folder.id);
    setStatus({ tone: "good", text: `${name} folder created.` });
  }

  function removeCustomFolder(folderId: string) {
    const folder = customFolders.find((item) => item.id === folderId);
    if (!folder) {
      return;
    }

    setCustomFolders((current) => current.filter((item) => item.id !== folderId));
    setMailPreferences((current) => {
      const next: MailPreferences = {};
      for (const [key, preference] of Object.entries(current)) {
        const folders = (preference.folders ?? []).filter((item) => item !== folderId);
        const normalized = { ...preference, folders: folders.length > 0 ? folders : undefined };
        if (!normalized.archived && !normalized.favorite && !normalized.folders) {
          continue;
        }

        next[key] = normalized;
      }

      return next;
    });

    if (activeCustomFolderId === folderId) {
      setActiveFolder("inbox");
      setActiveCustomFolderId("");
      setSelectedKey("");
    }

    setStatus({ tone: "good", text: `${folder.name} folder removed.` });
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
      ccRecipient: recipientListText(message.ccRecipients, ""),
      feeRate: message.feeRate,
      from: message.from,
      memo: message.memo,
      network: message.network,
      parentTxid: message.parentTxid,
      recipient: recipientListText(message.toRecipients ?? message.recipients, message.to),
      subject: message.subject,
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
        setCcRecipient("");
        setSubject("");
      }

      return;
    }

    setActiveFolder(folder);
    if (folder !== "custom") {
      setActiveCustomFolderId("");
    }
    setSortMode((current) => (!["files", "desktop"].includes(folder) && ["largest", "filetype", "sender"].includes(current) ? "value" : current));
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
    setCcRecipient("");
    setAmountSats(DEFAULT_AMOUNT_SATS);
    setFeeRate(DEFAULT_FEE_RATE);
    setSubject("");
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
    setCcRecipient("");
    setAmountSats(DEFAULT_AMOUNT_SATS);
    setFeeRate(DEFAULT_FEE_RATE);
    setSubject("");
    setMemo(DEFAULT_MEMO);
    setAttachment(undefined);
    setReplyParentTxid(undefined);
    setComposeOpen(false);
    setSelectedKey("");
    setStatus({ tone: "good", text: "Draft discarded." });
  }

  function saveContact(contact: ContactRecord) {
    const nextContacts = upsertContact(contacts, contact);
    setContacts(nextContacts);
    saveContacts(nextContacts);
    setStatus({ tone: "good", text: `${contact.name} saved to Contacts.` });
  }

  function addManualContact(name: string, target: string) {
    try {
      saveContact(contactFromInput(name, target, network, idRegistry, registryAddress));
      return true;
    } catch (error) {
      setStatus({ tone: "bad", text: errorMessage(error, "Contact could not be saved.") });
      return false;
    }
  }

  function addRegistryContact(record: PowIdRecord) {
    if (!record.confirmed) {
      setStatus({ tone: "bad", text: "Only confirmed IDs can be saved as contacts." });
      return;
    }

    saveContact(contactFromRegistryRecord(record));
  }

  function removeContact(contact: ContactRecord) {
    const nextContacts = contacts.filter((current) => contactKey(current) !== contactKey(contact));
    setContacts(nextContacts);
    saveContacts(nextContacts);
    setStatus({ tone: "good", text: `${contact.name} removed from Contacts.` });
  }

  function composeToContact(contact: ContactRecord) {
    setRecipient(contactTarget(contact));
    setCcRecipient("");
    setAmountSats(DEFAULT_AMOUNT_SATS);
    setFeeRate(DEFAULT_FEE_RATE);
    setSubject("");
    setMemo(DEFAULT_MEMO);
    setAttachment(undefined);
    setReplyParentTxid(undefined);
    setActiveFolder("inbox");
    setComposeOpen(true);
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
      setContacts(loadContacts());
      setCustomFolders(loadCustomFolders());
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

  async function loadDesktopTarget(target = desktopQuery) {
    const query = target.trim();
    if (!query) {
      setStatus({ tone: "bad", text: "Enter a Bitcoin address or confirmed ProofOfWork ID." });
      return;
    }

    setDesktopLoading(true);
    setStatus({ tone: "idle", text: "Opening public desktop..." });

    try {
      let resolved = resolveRecipientInput(query, network, idRegistry, registryAddress);
      if (resolved.isId || resolved.error) {
        const records = await fetchIdRegistry(network);
        setIdRegistry(records);
        resolved = resolveRecipientInput(query, network, records, registryAddress);
      }

      if (resolved.error || !resolved.paymentAddress) {
        setStatus({ tone: "bad", text: resolved.error || "Enter a valid Bitcoin address or confirmed ProofOfWork ID." });
        return;
      }

      const { inboxMessages, sentMessages } = await fetchAddressMail(resolved.paymentAddress, network);
      const publicMail = publicDesktopMail(inboxMessages, sentMessages);
      const files = publicMail.filter(hasAttachment);
      const profile: DesktopProfile = {
        address: resolved.paymentAddress,
        label: resolved.isId ? resolved.displayRecipient : shortAddress(resolved.paymentAddress),
        loadedAt: new Date().toISOString(),
        network,
        query,
        resolvedId: resolved.id,
      };

      setDesktopQuery(query);
      setDesktopProfile(profile);
      setDesktopMail(publicMail);
      setDesktopSelectedKey(files[0] ? mailKey(files[0]) : "");
      setActiveFolder("desktop");
      setComposeOpen(false);
      setSelectedKey("");
      setStatus({
        tone: "good",
        text: `${profile.label} desktop loaded. ${files.length.toLocaleString()} public file${files.length === 1 ? "" : "s"}.`,
      });
    } catch (error) {
      setStatus({ tone: "bad", text: errorMessage(error, "Desktop search failed.") });
    } finally {
      setDesktopLoading(false);
    }
  }

  function clearDesktop() {
    setDesktopProfile(undefined);
    setDesktopMail([]);
    setDesktopSelectedKey("");
    setStatus({ tone: "idle", text: "Desktop cleared." });
  }

  function replyTo(message: MailMessage) {
    const recipientAddress = isInboundFolder(message.folder)
      ? message.replyTo
      : message.recipients?.[0]?.display ?? message.to;
    const subject = messageSubject(message);
    setRecipient(recipientAddress === "Unknown" ? "" : recipientAddress);
    setCcRecipient("");
    setAmountSats(messageReplyAmount(message));
    setSubject(`Re: ${subject}`);
    setMemo("");
    setAttachment(undefined);
    setReplyParentTxid(rootTxid(message));
    setComposeOpen(true);
  }

  function replyAllTo(message: MailMessage) {
    const targets = new Map<string, string>();

    const addTarget = (display: string, addressHint = display) => {
      if (!display || display === "Unknown" || addressHint === address) {
        return;
      }

      targets.set(addressHint, display);
    };

    if (isInboundFolder(message.folder)) {
      addTarget(message.replyTo, message.replyTo);
    }

    for (const recipientItem of message.recipients ?? []) {
      addTarget(recipientItem.display, recipientItem.address);
    }

    if (!isInboundFolder(message.folder) && (!message.recipients || message.recipients.length === 0)) {
      addTarget(message.to, message.to);
    }

    const subject = messageSubject(message);
    setRecipient([...targets.values()].join(", "));
    setCcRecipient("");
    setAmountSats(messageReplyAmount(message));
    setSubject(`Re: ${subject}`);
    setMemo("");
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
    setRecipient("");
    setCcRecipient("");
    setSubject("");
    setMemo(DEFAULT_MEMO);
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
      if (mainnetRegistryMode) {
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
      setActiveFolder(mainnetRegistryMode ? "ids" : "inbox");
      setComposeOpen(false);

      try {
        if (mainnetRegistryMode) {
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
      setIdListings([]);
      setIdPendingEvents([]);
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
      const state = await fetchIdRegistryState(network);
      setIdRegistry(state.records);
      setIdListings(state.listings);
      setIdPendingEvents(state.pendingEvents);
      if (!silent) {
        const confirmed = state.records.filter((record) => record.confirmed).length;
        const pending = state.records.length - confirmed;
        const pendingChanges = state.pendingEvents.length;
        setStatus({ tone: "good", text: `ID registry loaded. ${confirmed} confirmed, ${pending} pending, ${pendingChanges} in flight.` });
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
        requireConfirmedUtxos: true,
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

  async function broadcastIdMutation({
    expectedOwner,
    id,
    payload,
    successText,
  }: {
    expectedOwner: string;
    id: string;
    payload: string;
    successText: string;
  }) {
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

    if (expectedOwner !== address) {
      setStatus({ tone: "bad", text: "Only the current owner address can update or transfer this ID." });
      return;
    }

    if (dataCarrierBytesForPayload(payload) > MAX_DATA_CARRIER_BYTES) {
      setStatus({ tone: "bad", text: "ID registry event OP_RETURN is over 100 KB." });
      return;
    }

    setBusy(true);
    setStatus({ tone: "idle", text: `Checking current owner for ${id}@proofofwork.me...` });

    try {
      const latestRegistry = await fetchIdRegistry(network);
      setIdRegistry(latestRegistry);
      const latestRecord = latestRegistry.find((record) => record.network === network && record.id === id && record.confirmed);

      if (!latestRecord) {
        setStatus({ tone: "bad", text: `${id}@proofofwork.me is not confirmed yet.` });
        return;
      }

      if (latestRecord.ownerAddress !== address) {
        setStatus({ tone: "bad", text: `${id}@proofofwork.me is owned by ${shortAddress(latestRecord.ownerAddress)}.` });
        return;
      }

      const currentNetwork = await getWalletNetwork(window.unisat);
      if (currentNetwork !== network) {
        await switchWalletNetwork(window.unisat, network);
      }

      setStatus({ tone: "idle", text: `${successText}...` });
      const paymentPsbt = await buildPaymentPsbt({
        amountSats: ID_MUTATION_PRICE_SATS,
        feeRate,
        fromAddress: address,
        network,
        protocolPayloads: [payload],
        requireConfirmedUtxos: true,
        toAddress: registryAddress,
      });

      const txid = await signAndBroadcastPsbt({
        inputCount: paymentPsbt.inputCount,
        network,
        psbtHex: paymentPsbt.psbtHex,
        wallet: window.unisat,
      });

      setStatus({ tone: "good", text: `${successText} broadcast: ${shortAddress(txid)}.` });
      await refreshIds(true);
    } catch (error) {
      setStatus({ tone: "bad", text: errorMessage(error, "ID registry update failed.") });
    } finally {
      setBusy(false);
    }
  }

  async function prepareIdSaleAuthorization() {
    if (!window.unisat) {
      throw new Error("Connect UniSat first.");
    }

    if (!managedIdRecord) {
      throw new Error("Choose one of your confirmed IDs first.");
    }

    if (managedIdRecord.ownerAddress !== address) {
      throw new Error("Only the current owner can publish an on-chain listing.");
    }

    if (!Number.isSafeInteger(salePriceSats) || salePriceSats < 0) {
      throw new Error("Sale price must be zero or more sats.");
    }

    if (saleBuyerAddress && !isValidBitcoinAddress(saleBuyerAddress, network)) {
      throw new Error("Specific buyer address is not valid for the selected network.");
    }

    if (saleReceiveAddress && !isValidBitcoinAddress(saleReceiveAddress, network)) {
      throw new Error("Locked receive address is not valid for the selected network.");
    }

    const latestState = await fetchIdRegistryState(network);
    setIdRegistry(latestState.records);
    setIdListings(latestState.listings);
    setIdPendingEvents(latestState.pendingEvents);
    const latestRecord = latestState.records.find((record) => record.network === network && record.id === managedIdRecord.id && record.confirmed);

    if (!latestRecord) {
      throw new Error(`${managedIdRecord.id}@proofofwork.me is not confirmed yet.`);
    }

    if (latestRecord.ownerAddress !== address) {
      throw new Error(`${managedIdRecord.id}@proofofwork.me is owned by ${shortAddress(latestRecord.ownerAddress)}.`);
    }

    const currentNetwork = await getWalletNetwork(window.unisat);
    if (currentNetwork !== network) {
      await switchWalletNetwork(window.unisat, network);
    }

    setStatus({ tone: "idle", text: "Preparing hardened seller anchor..." });
    const sellerPublicKey = (await window.unisat.getPublicKey?.())?.trim().toLowerCase() ?? "";
    if (!validPublicKeyHex(sellerPublicKey)) {
      throw new Error("Could not read a seller public key from UniSat for the hardened listing anchor.");
    }

    const { anchorUtxo, sealFundingUtxos } = await chooseSellerAnchorPlan(address, network, salePriceSats);
    setStatus({ tone: "idle", text: "Approve the seller anchor seal in UniSat. This is not broadcast." });
    const anchorSignature = await signSellerAnchorAuthorization({
      anchorUtxo,
      network,
      priceSats: salePriceSats,
      sellerAddress: latestRecord.ownerAddress,
      sellerPublicKey,
      sealFundingUtxos,
      wallet: window.unisat,
    });

    const draft = saleAuthorizationDraft({
      anchorSigHashType: ID_LISTING_ANCHOR_SIGHASH_TYPE,
      anchorSignature,
      anchorScriptPubKey: bytesToHex(anchorUtxo.previousOutput.script),
      anchorTxid: anchorUtxo.txid,
      anchorType: ID_LISTING_ANCHOR_TYPE,
      anchorValueSats: anchorUtxo.value,
      anchorVout: anchorUtxo.vout,
      buyerAddress: saleBuyerAddress,
      id: latestRecord.id,
      nonce: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`,
      priceSats: salePriceSats,
      receiveAddress: saleReceiveAddress,
      sellerAddress: latestRecord.ownerAddress,
      sellerPublicKey,
      version: ID_SALE_AUTH_VERSION,
    });

    return { ...draft, signature: "" };
  }

  async function publishIdListing() {
    if (!window.unisat) {
      setStatus({ tone: "bad", text: "Connect UniSat first." });
      return;
    }

    if (!registryAddress) {
      setStatus({ tone: "bad", text: `No ProofOfWork ID registry configured for ${networkLabel(network)} yet.` });
      return;
    }

    setBusy(true);
    setStatus({ tone: "idle", text: `Checking current owner for ${managedIdRecord?.id ?? "ID"}...` });

    try {
      const authorization = await prepareIdSaleAuthorization();
      setStatus({ tone: "idle", text: `Listing terms ready. Approve the on-chain listing transaction in UniSat...` });
      const payload = buildIdListingPayload(authorization);
      if (dataCarrierBytesForPayload(payload) > MAX_DATA_CARRIER_BYTES) {
        setStatus({ tone: "bad", text: "ID listing OP_RETURN is over 100 KB." });
        return;
      }

      setStatus({ tone: "idle", text: `Publishing listing for ${authorization.id}@proofofwork.me...` });
      const paymentPsbt = await buildPaymentPsbt({
        amountSats: ID_MUTATION_PRICE_SATS,
        excludeOutpoints: saleAuthorizationUsesSellerUtxoAnchor(authorization)
          ? [{ txid: authorization.anchorTxid, vout: authorization.anchorVout }]
          : undefined,
        feeRate,
        fromAddress: address,
        network,
        protocolPayloads: [payload],
        requireConfirmedUtxos: true,
        toAddress: registryAddress,
      });

      const txid = await signAndBroadcastPsbt({
        inputCount: paymentPsbt.inputCount,
        network,
        psbtHex: paymentPsbt.psbtHex,
        wallet: window.unisat,
      });

      setIdSaleAuthorization(JSON.stringify(authorization, null, 2));
      setStatus({ tone: "good", text: `${authorization.id}@proofofwork.me listing broadcast: ${shortAddress(txid)}.` });
      await refreshIds(true);
    } catch (error) {
      setStatus({ tone: "bad", text: errorMessage(error, "ID listing failed.") });
    } finally {
      setBusy(false);
    }
  }

  async function delistIdListing(listing: PowIdListing) {
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

    if (listing.sellerAddress !== address) {
      setStatus({ tone: "bad", text: "Only the current listing seller can delist this ID." });
      return;
    }

    if (listing.listingVersion === "list3") {
      const payload = buildIdDelistingPayload(listing.listingId, "delist3");
      if (dataCarrierBytesForPayload(payload) > MAX_DATA_CARRIER_BYTES) {
        setStatus({ tone: "bad", text: "ID delisting OP_RETURN is over 100 KB." });
        return;
      }

      setBusy(true);
      setStatus({ tone: "idle", text: `Closing listing anchor for ${listing.id}@proofofwork.me...` });

      try {
        const latestState = await fetchIdRegistryState(network);
        setIdRegistry(latestState.records);
        setIdListings(latestState.listings);
        setIdPendingEvents(latestState.pendingEvents);
        const latestListing = latestState.listings.find((item) => item.listingId === listing.listingId && item.network === network);
        const latestRecord = latestState.records.find((record) => record.network === network && record.id === listing.id && record.confirmed);

        if (!latestListing || latestListing.listingVersion !== "list3") {
          setStatus({ tone: "bad", text: "This listing is no longer active." });
          return;
        }

        if (!latestRecord || latestRecord.ownerAddress !== address) {
          setStatus({ tone: "bad", text: `${listing.id}@proofofwork.me is no longer owned by this wallet.` });
          return;
        }

        const currentNetwork = await getWalletNetwork(window.unisat);
        if (currentNetwork !== network) {
          await switchWalletNetwork(window.unisat, network);
        }

        const paymentPsbt = await buildAnchoredMarketplacePsbt({
          feeRate,
          fromAddress: address,
          listing: latestListing,
          network,
          payments: [
            {
              address: latestListing.sellerAddress,
              amountSats: latestListing.anchorValueSats ?? ID_LISTING_ANCHOR_VALUE_SATS,
            },
            {
              address: registryAddress,
              amountSats: ID_MUTATION_PRICE_SATS,
            },
          ],
          protocolPayloads: [payload],
          requireConfirmedUtxos: true,
        });

        const txid = await signAndBroadcastPsbt({
          inputCount: paymentPsbt.inputCount,
          network,
          psbtHex: paymentPsbt.psbtHex,
          signInputIndexes: paymentPsbt.walletInputIndexes,
          signingAddress: address,
          wallet: window.unisat,
        });

        setStatus({ tone: "good", text: `Delisting for ${listing.id}@proofofwork.me broadcast: ${shortAddress(txid)}.` });
        await refreshIds(true);
      } catch (error) {
        setStatus({ tone: "bad", text: errorMessage(error, "ID delisting failed.") });
      } finally {
        setBusy(false);
      }
      return;
    }

    await broadcastIdMutation({
      expectedOwner: listing.sellerAddress,
      id: listing.id,
      payload: buildIdDelistingPayload(listing.listingId, listing.listingVersion === "list4" ? "delist4" : "delist2"),
      successText: `Delisting for ${listing.id}@proofofwork.me`,
    });
  }

  async function purchaseId(event: FormEvent<HTMLFormElement>) {
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

    let authorization: PowIdSaleAuthorization;
    try {
      authorization = parseSaleAuthorizationText(idSaleAuthorization.trim(), network);
    } catch (error) {
      setStatus({ tone: "bad", text: errorMessage(error, "Listing authorization is invalid.") });
      return;
    }

    const ownerAddress = idPurchaseOwnerAddress.trim();
    const receiveAddress = idPurchaseReceiveAddress.trim();
    const effectiveReceiveAddress = receiveAddress || ownerAddress;

    if (!saleAuthorizationCanBroadcast(authorization)) {
      setStatus({ tone: "bad", text: "Select an active on-chain listing first." });
      return;
    }

    const selectedListing = selectedMarketplaceListing;
    if (!selectedListing || (selectedListing.listingVersion !== "list3" && selectedListing.listingVersion !== "list4")) {
      setStatus({ tone: "bad", text: "Select an active on-chain listing first." });
      return;
    }

    if (!isValidBitcoinAddress(ownerAddress, network)) {
      setStatus({ tone: "bad", text: "New owner address is not valid for the selected network." });
      return;
    }

    if (receiveAddress && !isValidBitcoinAddress(receiveAddress, network)) {
      setStatus({ tone: "bad", text: "New receive address is not valid for the selected network." });
      return;
    }

    if (authorization.buyerAddress && authorization.buyerAddress !== ownerAddress) {
      setStatus({ tone: "bad", text: `This sale is locked to ${shortAddress(authorization.buyerAddress)}.` });
      return;
    }

    if (authorization.receiveAddress && authorization.receiveAddress !== effectiveReceiveAddress) {
      setStatus({ tone: "bad", text: `This sale is locked to receive at ${shortAddress(authorization.receiveAddress)}.` });
      return;
    }

    const payload = buildIdMarketplaceTransferPayload(
      selectedListing.listingId,
      ownerAddress,
      receiveAddress,
      selectedListing.listingVersion === "list3" ? "buy3" : "buy4",
    );
    if (dataCarrierBytesForPayload(payload) > MAX_DATA_CARRIER_BYTES) {
      setStatus({ tone: "bad", text: "ID marketplace transfer OP_RETURN is over 100 KB." });
      return;
    }

    setBusy(true);
    setStatus({ tone: "idle", text: `Checking ${authorization.id}@proofofwork.me listing terms...` });

    try {
      const latestState = await fetchIdRegistryState(network);
      setIdRegistry(latestState.records);
      setIdListings(latestState.listings);
      setIdPendingEvents(latestState.pendingEvents);
      const latestListing = latestState.listings.find((listing) => listing.network === network && listing.listingId === selectedListing.listingId);
      const latestRecord = latestState.records.find((record) => record.network === network && record.id === authorization.id && record.confirmed);

      if (!latestRecord) {
        setStatus({ tone: "bad", text: `${authorization.id}@proofofwork.me is not confirmed yet.` });
        return;
      }

      if (!latestListing || (latestListing.listingVersion !== "list3" && latestListing.listingVersion !== "list4")) {
        setStatus({ tone: "bad", text: "This listing is no longer active." });
        return;
      }

      if (latestRecord.ownerAddress !== latestListing.sellerAddress) {
        setStatus({ tone: "bad", text: `${authorization.id}@proofofwork.me is no longer owned by this seller.` });
        return;
      }

      const currentNetwork = await getWalletNetwork(window.unisat);
      if (currentNetwork !== network) {
        await switchWalletNetwork(window.unisat, network);
      }

      const payments: PaymentOutputSpec[] = [
        {
          address: latestListing.sellerAddress,
          amountSats: sellerPaymentRequiredSats(latestListing),
        },
        {
          address: registryAddress,
          amountSats: ID_MUTATION_PRICE_SATS,
        },
      ];

      setStatus({ tone: "idle", text: `Buying ${authorization.id}@proofofwork.me...` });
      const paymentPsbt = await buildAnchoredMarketplacePsbt({
        feeRate,
        fromAddress: address,
        listing: latestListing,
        network,
        payments,
        protocolPayloads: [payload],
        requireConfirmedUtxos: true,
      });

      const txid = await signAndBroadcastPsbt({
        inputCount: paymentPsbt.inputCount,
        network,
        psbtHex: paymentPsbt.psbtHex,
        signInputIndexes: paymentPsbt.walletInputIndexes,
        signingAddress: address,
        wallet: window.unisat,
      });

      setStatus({ tone: "good", text: `${authorization.id}@proofofwork.me purchase broadcast: ${shortAddress(txid)}.` });
      setIdSaleAuthorization("");
      setIdSelectedListingId("");
      setIdPurchaseReceiveAddress("");
      await refreshIds(true);
    } catch (error) {
      setStatus({ tone: "bad", text: errorMessage(error, "ID purchase failed.") });
    } finally {
      setBusy(false);
    }
  }

  async function updateIdReceiver(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!managedIdRecord) {
      setStatus({ tone: "bad", text: "Choose one of your confirmed IDs first." });
      return;
    }

    const receiveInput = idUpdateReceiveAddress.trim();
    if (!receiveInput) {
      setStatus({ tone: "bad", text: "Enter a new receive address or confirmed ProofOfWork ID." });
      return;
    }

    let latestRegistry = idRegistry;
    let resolvedReceive = resolveRecipientInput(receiveInput, network, latestRegistry, registryAddress);
    if (!isValidBitcoinAddress(receiveInput, network)) {
      const latestState = await fetchIdRegistryState(network);
      latestRegistry = latestState.records;
      setIdRegistry(latestState.records);
      setIdListings(latestState.listings);
      setIdPendingEvents(latestState.pendingEvents);
      resolvedReceive = resolveRecipientInput(receiveInput, network, latestRegistry, registryAddress);
    }

    const receiveAddress = resolvedReceive.paymentAddress;
    if (resolvedReceive.error || !isValidBitcoinAddress(receiveAddress, network)) {
      setStatus({ tone: "bad", text: resolvedReceive.error || "New receive address is not valid for the selected network." });
      return;
    }

    if (receiveAddress === managedIdRecord.receiveAddress) {
      setStatus({ tone: "bad", text: `${managedIdRecord.id}@proofofwork.me already receives at that address.` });
      return;
    }

    await broadcastIdMutation({
      expectedOwner: managedIdRecord.ownerAddress,
      id: managedIdRecord.id,
      payload: buildIdReceiverUpdatePayload(managedIdRecord.id, receiveAddress),
      successText: `Receiver update for ${managedIdRecord.id}@proofofwork.me`,
    });
  }

  async function transferId(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!managedIdRecord) {
      setStatus({ tone: "bad", text: "Choose one of your confirmed IDs first." });
      return;
    }

    const receiveInput = idTransferReceiveAddress.trim();

    let latestRegistry = idRegistry;
    let resolvedOwner = transferOwnerResolution;
    let resolvedReceive = receiveInput ? resolveRecipientInput(receiveInput, network, latestRegistry, registryAddress) : undefined;
    if (!isValidBitcoinAddress(idTransferOwnerAddress.trim(), network) || (receiveInput && !isValidBitcoinAddress(receiveInput, network))) {
      const latestState = await fetchIdRegistryState(network);
      latestRegistry = latestState.records;
      setIdRegistry(latestState.records);
      setIdListings(latestState.listings);
      setIdPendingEvents(latestState.pendingEvents);
      resolvedOwner = resolvePowIdOwnerInput(idTransferOwnerAddress, network, latestRegistry, registryAddress);
      resolvedReceive = receiveInput ? resolveRecipientInput(receiveInput, network, latestRegistry, registryAddress) : undefined;
    }

    const latestOwnerAddress = resolvedOwner.ownerAddress;
    const effectiveReceiveAddress = resolvedReceive ? resolvedReceive.paymentAddress : resolvedOwner.receiveAddress;
    const payloadReceiveAddress = effectiveReceiveAddress && effectiveReceiveAddress !== latestOwnerAddress ? effectiveReceiveAddress : "";

    if (resolvedOwner.error || !latestOwnerAddress || !isValidBitcoinAddress(latestOwnerAddress, network)) {
      setStatus({ tone: "bad", text: resolvedOwner.error || "New owner is not valid for the selected network." });
      return;
    }

    if (resolvedReceive?.error) {
      setStatus({ tone: "bad", text: resolvedReceive.error });
      return;
    }

    if (!isValidBitcoinAddress(effectiveReceiveAddress, network)) {
      setStatus({ tone: "bad", text: "New receive address is not valid for the selected network." });
      return;
    }

    if (latestOwnerAddress === managedIdRecord.ownerAddress && effectiveReceiveAddress === managedIdRecord.receiveAddress) {
      setStatus({ tone: "bad", text: "Transfer destination matches the current ID state." });
      return;
    }

    await broadcastIdMutation({
      expectedOwner: managedIdRecord.ownerAddress,
      id: managedIdRecord.id,
      payload: buildIdTransferPayload(managedIdRecord.id, latestOwnerAddress, payloadReceiveAddress),
      successText: `Transfer for ${managedIdRecord.id}@proofofwork.me`,
    });

    setIdTransferOwnerAddress("");
    setIdTransferReceiveAddress("");
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

    let resolvedRecipients = recipientResolution;
    let resolvedCcRecipients = ccRecipientResolution;
    const recipientInput = recipient.trim();
    const ccRecipientInput = ccRecipient.trim();
    const shouldResolveId = needsRegistryResolution(recipientInput, network) || needsRegistryResolution(ccRecipientInput, network);

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
        resolvedRecipients = resolveRecipientInputs(recipientInput, network, records, registryAddress);
        resolvedCcRecipients = resolveRecipientInputs(ccRecipientInput, network, records, registryAddress);
      }

      if (resolvedRecipients.error || resolvedRecipients.recipients.length === 0) {
        setStatus({ tone: "bad", text: resolvedRecipients.error || "Enter a valid Bitcoin address or confirmed ProofOfWork ID." });
        return;
      }

      if (resolvedCcRecipients.error) {
        setStatus({ tone: "bad", text: resolvedCcRecipients.error });
        return;
      }

      if (resolvedRecipients.recipients.length + resolvedCcRecipients.recipients.length > MAX_RECIPIENTS) {
        setStatus({ tone: "bad", text: `Send to ${MAX_RECIPIENTS} recipients or fewer for now.` });
        return;
      }

      setStatus({ tone: "idle", text: "Building PSBT..." });
      const currentNetwork = await getWalletNetwork(window.unisat);
      if (currentNetwork !== network) {
        await switchWalletNetwork(window.unisat, network);
      }

      const satoshis = Math.floor(amountSats);
      const toRecipients: MailRecipient[] = resolvedRecipients.recipients.map((resolved) => ({
        address: resolved.paymentAddress,
        amountSats: satoshis,
        display: resolved.isId ? resolved.displayRecipient : resolved.paymentAddress,
        id: resolved.id,
      }));
      const seenAddresses = new Set(toRecipients.map((mailRecipient) => mailRecipient.address));
      const ccRecipients: MailRecipient[] = resolvedCcRecipients.recipients.flatMap((resolved): MailRecipient[] => {
        if (seenAddresses.has(resolved.paymentAddress)) {
          return [];
        }

        seenAddresses.add(resolved.paymentAddress);
        return [
          {
            address: resolved.paymentAddress,
            amountSats: satoshis,
            display: resolved.isId ? resolved.displayRecipient : resolved.paymentAddress,
            id: resolved.id,
          },
        ];
      });
      const mailRecipients = [...toRecipients, ...ccRecipients];
      const paymentPsbt = await buildPaymentPsbt({
        feeRate,
        fromAddress: address,
        network,
        payments: mailRecipients.map((mailRecipient) => ({
          address: mailRecipient.address,
          amountSats: mailRecipient.amountSats,
        })),
        protocolPayloads,
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
        to: recipientSummary(toRecipients, recipientInput),
        recipients: mailRecipients,
        toRecipients,
        ccRecipients: ccRecipients.length > 0 ? ccRecipients : undefined,
        amountSats: totalRecipientSats(mailRecipients),
        feeRate,
        subject: normalizeSubject(subject) || undefined,
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
      setCcRecipient("");
      setSubject("");
      setReplyParentTxid(undefined);
      setSelectedKey(`sent-${network}-${txid}`);
      setStatus({
        tone: "good",
        text: `Transaction broadcast to ${mailRecipients.length} recipient${mailRecipients.length === 1 ? "" : "s"}. ${paymentPsbt.inputCount} input${paymentPsbt.inputCount === 1 ? "" : "s"}, ${paymentPsbt.outputCount} output${paymentPsbt.outputCount === 1 ? "" : "s"}.`,
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

  if (marketplaceMode) {
    return (
      <MarketplaceApp
        address={address}
        busy={busy}
        canCreateSaleAuthorization={canCreateSaleAuthorization}
        canPurchaseId={canPurchaseId}
        connectWallet={connectWallet}
        delistListing={delistIdListing}
        disconnectWallet={disconnectWallet}
        feeRate={feeRate}
        hasUnisat={hasUnisat}
        idPurchaseBytes={idPurchaseBytes}
        idPurchaseOwnerAddress={idPurchaseOwnerAddress}
        idPurchaseReceiveAddress={idPurchaseReceiveAddress}
        idSaleAuthorization={idSaleAuthorization}
        idSaleBuyerAddress={idSaleBuyerAddress}
        idSalePriceSats={idSalePriceSats}
        idSaleReceiveAddress={idSaleReceiveAddress}
        managedIdName={managedIdRecord?.id ?? ""}
        publishListing={publishIdListing}
        pendingEvents={idPendingEvents.filter((event) => event.network === "livenet")}
        registryAddress={registryAddressForNetwork("livenet")}
        registryListings={idListings.filter((listing) => listing.network === "livenet")}
        registryRecords={idRegistry.filter((record) => record.network === "livenet")}
        setIdPurchaseOwnerAddress={setIdPurchaseOwnerAddress}
        setIdPurchaseReceiveAddress={setIdPurchaseReceiveAddress}
        setIdSaleBuyerAddress={setIdSaleBuyerAddress}
        setIdSalePriceSats={setIdSalePriceSats}
        setIdSaleReceiveAddress={setIdSaleReceiveAddress}
        setFeeRate={setFeeRate}
        setManagedIdName={(id) => {
          setManagedIdName(id);
          setIdSaleAuthorization("");
          setIdSelectedListingId("");
        }}
        setTheme={setTheme}
        status={status}
        submitPurchase={purchaseId}
        theme={theme}
        useListing={(listing) => {
          setIdSaleAuthorization(JSON.stringify(listing.saleAuthorization, null, 2));
          setIdSelectedListingId(listing.listingId);
          setIdPurchaseOwnerAddress(address);
          setIdPurchaseReceiveAddress(listing.receiveAddress ?? "");
        }}
        onRefresh={() => void refreshIds()}
      />
    );
  }

  if (desktopRoute) {
    return (
      <DesktopApp
        activeNetwork={network}
        busy={desktopLoading}
        desktopQuery={desktopQuery}
        fileFilter={fileFilter}
        messages={desktopMail}
        profile={desktopProfile}
        selectedKey={desktopSelectedKey}
        setDesktopQuery={setDesktopQuery}
        setFileFilter={setFileFilter}
        setSortMode={setSortMode}
        setTheme={setTheme}
        sortMode={sortMode}
        status={status}
        theme={theme}
        onClear={clearDesktop}
        onRefresh={() => void loadDesktopTarget()}
        onSearch={(event) => {
          event.preventDefault();
          void loadDesktopTarget();
        }}
        onSelect={(message) => setDesktopSelectedKey(mailKey(message))}
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

        <DomainNav compact />

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
            onClick={() =>
              void (activeFolder === "ids" || activeFolder === "marketplace" ? refreshIds() : activeFolder === "desktop" ? loadDesktopTarget() : refreshMail(activeFolder))
            }
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
            {customFolders.map((folder) => (
              <div className="custom-folder-row" key={folder.id}>
                <button
                  aria-current={activeFolder === "custom" && activeCustomFolderId === folder.id}
                  onClick={() => {
                    setActiveFolder("custom");
                    setActiveCustomFolderId(folder.id);
                    setComposeOpen(false);
                    setSelectedKey("");
                  }}
                  type="button"
                >
                  <span className="folder-label">
                    <FolderPlus size={17} />
                    <span>{folder.name}</span>
                  </span>
                  <strong>{customFolderCounts.get(folder.id) ?? 0}</strong>
                </button>
                <button aria-label={`Remove ${folder.name}`} className="custom-folder-remove" onClick={() => removeCustomFolder(folder.id)} type="button">
                  <X size={13} />
                </button>
              </div>
            ))}
            <form className="custom-folder-form" onSubmit={createCustomFolder}>
              <input
                aria-label="New folder name"
                onChange={(event) => setNewFolderName(event.target.value)}
                placeholder="New folder"
                value={newFolderName}
              />
              <button aria-label="Create folder" className="icon-button" type="submit">
                <FolderPlus size={15} />
              </button>
            </form>
            <button aria-current={activeFolder === "files"} onClick={() => openFolder("files")} type="button">
              <span className="folder-label">
                <Paperclip size={17} />
                <span>Files</span>
              </span>
              <strong>{allFileMessages.length}</strong>
            </button>
            <button aria-current={activeFolder === "desktop"} onClick={() => openFolder("desktop")} type="button">
              <span className="folder-label">
                <Monitor size={17} />
                <span>Desktop</span>
              </span>
              <strong>{desktopFileMessages.length}</strong>
            </button>
            <button aria-current={activeFolder === "ids"} onClick={() => openFolder("ids")} type="button">
              <span className="folder-label">
                <AtSign size={17} />
                <span>IDs</span>
              </span>
              <strong>{ownedIdCount + walletPendingIdEvents.length}</strong>
            </button>
            <button aria-current={activeFolder === "marketplace"} onClick={() => openFolder("marketplace")} type="button">
              <span className="folder-label">
                <Users size={17} />
                <span>Marketplace</span>
              </span>
              <strong>{ownerControlledIds.length}</strong>
            </button>
            <button aria-current={activeFolder === "contacts"} onClick={() => openFolder("contacts")} type="button">
              <span className="folder-label">
                <Users size={17} />
                <span>Contacts</span>
              </span>
              <strong>{contactsForNetwork.length}</strong>
            </button>
            {registryAddress ? (
              <div className="registry-network-stat" aria-label="ProofOfWork ID registry network total">
                <span>Registry Network</span>
                <strong>{idRegistry.length.toLocaleString()}</strong>
                <small>
                  {confirmedIdCount.toLocaleString()} confirmed · {pendingIdCount.toLocaleString()} pending IDs
                  {pendingIdEventCount ? ` · ${pendingIdEventCount.toLocaleString()} changes` : ""}
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
            contacts={contactsForNetwork}
            feeRate={feeRate}
            idName={idName}
            idPgpKey={idPgpKey}
            idReceiveAddress={idReceiveAddress}
            idTransferBytes={idTransferBytes}
            idTransferOwnerAddress={idTransferOwnerAddress}
            idTransferReceiveAddress={idTransferReceiveAddress}
            idUpdateReceiveAddress={idUpdateReceiveAddress}
            idReceiverUpdateBytes={idReceiverUpdateBytes}
            managedIdName={managedIdRecord?.id ?? ""}
            network={network}
            pendingEvents={idPendingEvents}
            registryAddress={registryAddress}
            registryRecords={idRegistry}
            registrationBytes={idRegistrationBytes}
            lastRegisteredId={lastRegisteredId?.network === network ? lastRegisteredId : undefined}
            canTransfer={canTransferId}
            canUpdate={canUpdateId}
            setFeeRate={setFeeRate}
            setManagedIdName={(id) => {
              setManagedIdName(id);
              setIdUpdateReceiveAddress("");
              setIdTransferOwnerAddress("");
              setIdTransferReceiveAddress("");
            }}
            setIdName={setIdName}
            setIdPgpKey={setIdPgpKey}
            setIdReceiveAddress={setIdReceiveAddress}
            setIdTransferOwnerAddress={setIdTransferOwnerAddress}
            setIdTransferReceiveAddress={setIdTransferReceiveAddress}
            setIdUpdateReceiveAddress={setIdUpdateReceiveAddress}
            onAddContact={addRegistryContact}
            onRefresh={() => void refreshIds()}
            submitTransfer={transferId}
            submitUpdate={updateIdReceiver}
            submit={registerId}
          />
        ) : activeFolder === "marketplace" ? (
          <MarketplaceWorkspace
            address={address}
            busy={busy}
            canCreateSaleAuthorization={canCreateSaleAuthorization}
            canPurchaseId={canPurchaseId}
            delistListing={delistIdListing}
            feeRate={feeRate}
            idPurchaseBytes={idPurchaseBytes}
            idPurchaseOwnerAddress={idPurchaseOwnerAddress}
            idPurchaseReceiveAddress={idPurchaseReceiveAddress}
            idSaleAuthorization={idSaleAuthorization}
            idSaleBuyerAddress={idSaleBuyerAddress}
            idSalePriceSats={idSalePriceSats}
            idSaleReceiveAddress={idSaleReceiveAddress}
            managedIdName={managedIdName}
            network={network}
            pendingEvents={idPendingEvents}
            publishListing={publishIdListing}
            registryAddress={registryAddress}
            registryListings={idListings}
            registryRecords={idRegistry}
            setIdPurchaseOwnerAddress={setIdPurchaseOwnerAddress}
            setIdPurchaseReceiveAddress={setIdPurchaseReceiveAddress}
            setIdSaleBuyerAddress={setIdSaleBuyerAddress}
            setIdSalePriceSats={setIdSalePriceSats}
            setIdSaleReceiveAddress={setIdSaleReceiveAddress}
            setFeeRate={setFeeRate}
            setManagedIdName={(id) => {
              setManagedIdName(id);
              setIdSaleAuthorization("");
              setIdSelectedListingId("");
            }}
            submitPurchase={purchaseId}
            useListing={(listing) => {
              setIdSaleAuthorization(JSON.stringify(listing.saleAuthorization, null, 2));
              setIdSelectedListingId(listing.listingId);
              setIdPurchaseOwnerAddress(address);
              setIdPurchaseReceiveAddress(listing.receiveAddress ?? "");
            }}
            onRefresh={() => void refreshIds()}
          />
        ) : activeFolder === "contacts" ? (
          <ContactsWorkspace
            contacts={contactsForNetwork}
            network={network}
            onAdd={addManualContact}
            onCompose={composeToContact}
            onRemove={removeContact}
          />
        ) : activeFolder === "desktop" ? (
          <DesktopWorkspace
            activeNetwork={network}
            busy={desktopLoading}
            desktopQuery={desktopQuery}
            fileFilter={fileFilter}
            messages={desktopMail}
            profile={desktopProfile}
            selectedKey={desktopSelectedKey}
            setDesktopQuery={setDesktopQuery}
            setFileFilter={setFileFilter}
            setSortMode={setSortMode}
            sortMode={sortMode}
            onClear={clearDesktop}
            onRefresh={() => void loadDesktopTarget()}
            onSearch={(event) => {
              event.preventDefault();
              void loadDesktopTarget();
            }}
            onSelect={(message) => setDesktopSelectedKey(mailKey(message))}
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
                  <h2>{activeFolder === "custom" ? activeCustomFolder?.name ?? "Folder" : folderLabel(activeFolder)}</h2>
                  <span>{activeFolder === "custom" ? "Local folder" : folderSubtitle(activeFolder)}</span>
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
                  contacts={contactsForNetwork}
                  dataCarrierBytes={dataCarrierBytes}
                  draftMode
                  feeRate={feeRate}
                  memo={memo}
                  network={network}
                  ccRecipient={ccRecipient}
                  ccRecipientError={Boolean(ccRecipientResolution.error)}
                  ccRecipientNote={ccRecipientNote}
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
                  setCcRecipient={setCcRecipient}
                  setFeeRate={setFeeRate}
                  setMemo={setMemo}
                  setRecipient={setRecipient}
                  setSubject={setSubject}
                  subject={subject}
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
                  contacts={contactsForNetwork}
                  feeRate={feeRate}
                  memo={memo}
                  dataCarrierBytes={dataCarrierBytes}
                  network={network}
                  ccRecipient={ccRecipient}
                  ccRecipientError={Boolean(ccRecipientResolution.error)}
                  ccRecipientNote={ccRecipientNote}
                  parentTxid={replyParentTxid}
                  recipient={recipient}
                  recipientError={Boolean(recipientResolution.error)}
                  recipientNote={recipientNote}
                  sender={address}
                  setAttachment={setAttachment}
                  setAttachmentFile={(file) => void attachFile(file)}
                  setParentTxid={setReplyParentTxid}
                  setAmountSats={setAmountSats}
                  setCcRecipient={setCcRecipient}
                  setFeeRate={setFeeRate}
                  setMemo={setMemo}
                  setRecipient={setRecipient}
                  setSubject={setSubject}
                  subject={subject}
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
                  folderIds={messageFolderIds(selectedMessage)}
                  folderable={canUseCustomFolders(selectedMessage)}
                  activeCustomFolderId={activeFolder === "custom" ? activeCustomFolderId : ""}
                  customFolders={customFolders}
                  message={selectedMessage}
                  onArchiveToggle={setMessageArchived}
                  onCheckBroadcasts={() => void checkBroadcastStatuses(false)}
                  onFavoriteToggle={setMessageFavorite}
                  onFolderToggle={setMessageCustomFolder}
                  onReply={replyTo}
                  onReplyAll={replyAllTo}
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

function DomainNav({ compact = false }: { compact?: boolean }) {
  return (
    <nav className={compact ? "domain-nav compact" : "domain-nav"} aria-label="ProofOfWork.Me domains">
      {APP_LINKS.map((link) => (
        <a href={link.href} key={link.href}>
          {link.label}
        </a>
      ))}
    </nav>
  );
}

function DesktopApp({
  activeNetwork,
  busy,
  desktopQuery,
  fileFilter,
  messages,
  profile,
  selectedKey,
  setDesktopQuery,
  setFileFilter,
  setSortMode,
  setTheme,
  sortMode,
  status,
  theme,
  onClear,
  onRefresh,
  onSearch,
  onSelect,
}: {
  activeNetwork: BitcoinNetwork;
  busy: boolean;
  desktopQuery: string;
  fileFilter: FileFilter;
  messages: MailMessage[];
  profile?: DesktopProfile;
  selectedKey: string;
  setDesktopQuery: (value: string) => void;
  setFileFilter: (value: FileFilter) => void;
  setSortMode: (value: SortMode) => void;
  setTheme: (value: ThemeMode | ((current: ThemeMode) => ThemeMode)) => void;
  sortMode: SortMode;
  status: { tone: StatusTone; text: string };
  theme: ThemeMode;
  onClear: () => void;
  onRefresh: () => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onSelect: (message: MailMessage) => void;
}) {
  return (
    <main className="desktop-public-app">
      <header className="desktop-public-header">
        <a className="landing-brand" href="https://proofofwork.me" aria-label="ProofOfWork.Me home">
          <div className="brand-mark" aria-hidden="true">
            PoW
          </div>
          <div>
            <h1>ProofOfWork Desktop</h1>
            <span>Public file search</span>
          </div>
        </a>

        <div className="landing-nav">
          <DomainNav />
          <button
            aria-label={theme === "dark" ? "Use light mode" : "Use dark mode"}
            className="icon-button"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            type="button"
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </header>

      {status.tone !== "idle" ? (
        <div className={`status desktop-route-status ${status.tone}`}>
          <span className="status-dot" aria-hidden="true" />
          <span>{status.text}</span>
        </div>
      ) : null}

      <DesktopWorkspace
        activeNetwork={activeNetwork}
        busy={busy}
        desktopQuery={desktopQuery}
        fileFilter={fileFilter}
        messages={messages}
        profile={profile}
        selectedKey={selectedKey}
        setDesktopQuery={setDesktopQuery}
        setFileFilter={setFileFilter}
        setSortMode={setSortMode}
        sortMode={sortMode}
        onClear={onClear}
        onRefresh={onRefresh}
        onSearch={onSearch}
        onSelect={onSelect}
      />

      <SocialFooter />
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

        <div className="landing-nav">
          <DomainNav />
          <button
            aria-label={theme === "dark" ? "Use light mode" : "Use dark mode"}
            className="icon-button"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            type="button"
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
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
            <a className="secondary link-button" href={DESKTOP_APP_URL}>
              <span className="button-content">
                <Monitor size={17} />
                <span>Open Desktop</span>
              </span>
            </a>
          </div>
        </div>
      </section>

      <section className="landing-main" aria-label="ProofOfWork.Me onboarding">
        <section className="landing-video" aria-label="ProofOfWork.Me launch video">
          <div className="landing-video-copy">
            <span className="landing-kicker">Launch video</span>
            <h3>The Final Network</h3>
            <p>Watch the ProofOfWork.Me launch story, then claim an ID or open the Bitcoin computer.</p>
          </div>
          <div className="landing-video-frame">
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              src={`${LANDING_VIDEO_EMBED_URL}?rel=0&modestbranding=1`}
              title="ProofOfWork.Me launch video"
            />
          </div>
        </section>

        <section className="landing-testimonial" aria-label="On-chain testimonial">
          <div className="empty-icon" aria-hidden="true">
            <MessageSquareQuote size={24} />
          </div>
          <div>
            <span className="landing-kicker">On-chain testimonial</span>
            <blockquote>
              "Truth above all else. We will not yield to foolish yet powerful tyrants for the true power resides with us. We need only converge on the truth."
            </blockquote>
            <p>
              Published to Bitcoin through ProofOfWork.Me by D.D. Subject: <strong>Freedom and love</strong>.
            </p>
          </div>
          <a className="secondary link-button" href={LANDING_TESTIMONIAL_TX_URL} rel="noreferrer" target="_blank">
            <span className="button-content">
              <ArrowUpRight size={16} />
              <span>View TX</span>
            </span>
          </a>
        </section>

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

          <article className="landing-choice">
            <div className="empty-icon" aria-hidden="true">
              <Monitor size={24} />
            </div>
            <div>
              <h3>Open Desktop</h3>
              <p>Search an address or confirmed ProofOfWork ID and browse public confirmed files.</p>
            </div>
            <a className="secondary link-button" href={DESKTOP_APP_URL}>
              <span className="button-content">
                <Monitor size={16} />
                <span>Open Desktop</span>
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

        <DomainNav compact />

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
                <FeeRateControl
                  feeRate={feeRate}
                  setFeeRate={setFeeRate}
                  sidecar={
                    <label>
                      Registry
                      <input readOnly value={registryAddress} />
                    </label>
                  }
                />
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

function MarketplaceApp({
  address,
  busy,
  canCreateSaleAuthorization,
  canPurchaseId,
  connectWallet,
  delistListing,
  disconnectWallet,
  feeRate,
  hasUnisat,
  idPurchaseBytes,
  idPurchaseOwnerAddress,
  idPurchaseReceiveAddress,
  idSaleAuthorization,
  idSaleBuyerAddress,
  idSalePriceSats,
  idSaleReceiveAddress,
  managedIdName,
  pendingEvents,
  publishListing,
  registryAddress,
  registryListings,
  registryRecords,
  setIdPurchaseOwnerAddress,
  setIdPurchaseReceiveAddress,
  setIdSaleBuyerAddress,
  setIdSalePriceSats,
  setIdSaleReceiveAddress,
  setFeeRate,
  setManagedIdName,
  setTheme,
  status,
  submitPurchase,
  theme,
  useListing,
  onRefresh,
}: {
  address: string;
  busy: boolean;
  canCreateSaleAuthorization: boolean;
  canPurchaseId: boolean;
  connectWallet: () => void;
  delistListing: (listing: PowIdListing) => void;
  disconnectWallet: () => void;
  feeRate: number;
  hasUnisat: boolean;
  idPurchaseBytes: number;
  idPurchaseOwnerAddress: string;
  idPurchaseReceiveAddress: string;
  idSaleAuthorization: string;
  idSaleBuyerAddress: string;
  idSalePriceSats: number;
  idSaleReceiveAddress: string;
  managedIdName: string;
  pendingEvents: PowIdPendingEvent[];
  publishListing: () => void;
  registryAddress: string;
  registryListings: PowIdListing[];
  registryRecords: PowIdRecord[];
  setIdPurchaseOwnerAddress: (value: string) => void;
  setIdPurchaseReceiveAddress: (value: string) => void;
  setIdSaleBuyerAddress: (value: string) => void;
  setIdSalePriceSats: (value: number) => void;
  setIdSaleReceiveAddress: (value: string) => void;
  setFeeRate: (value: number) => void;
  setManagedIdName: (value: string) => void;
  setTheme: (value: ThemeMode | ((current: ThemeMode) => ThemeMode)) => void;
  status: { tone: StatusTone; text: string };
  submitPurchase: (event: FormEvent<HTMLFormElement>) => void;
  theme: ThemeMode;
  useListing: (listing: PowIdListing) => void;
  onRefresh: () => void;
}) {
  const confirmedRecords = registryRecords.filter((record) => record.confirmed);
  const pendingRecords = registryRecords.filter((record) => !record.confirmed);
  const ownerControlledIds = confirmedRecords.filter((record) => record.ownerAddress === address);
  const managedId = ownerControlledIds.find((record) => record.id === managedIdName) ?? ownerControlledIds[0];
  const walletPendingEvents = pendingEvents.filter((event) => pendingIdEventTouchesAddress(event, address));

  return (
    <main className="id-launch-app marketplace-app">
      <header className="id-launch-topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            PoW
          </div>
          <div>
            <h1>ProofOfWork Marketplace</h1>
            <span>Mainnet ID transfers</span>
          </div>
        </div>

        <DomainNav compact />

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
            <span className="id-launch-kicker">ProofOfWork ID marketplace</span>
            <h2>Transfer Bitcoin-native names.</h2>
            <p>
              Sellers publish on-chain listings. Buyers fund the seller payment plus the
              {` ${ID_MUTATION_PRICE_SATS.toLocaleString()} `}sat registry transfer in one Bitcoin transaction.
            </p>
          </div>

          <div className="id-launch-stats" aria-label="Marketplace stats">
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

        <div className="ids-content marketplace-content">
          <section className="id-card">
            <div className="id-card-head">
              <div className="empty-icon" aria-hidden="true">
                <Wallet size={24} />
              </div>
              <div>
                <h3>List an ID</h3>
                <p>Publish an on-chain listing for one of your confirmed IDs. Listings cost {ID_MUTATION_PRICE_SATS.toLocaleString()} sats.</p>
              </div>
            </div>

            {ownerControlledIds.length === 0 ? (
              <p className="field-note">{address ? "This wallet does not own any confirmed IDs yet." : "Connect the owner wallet to list confirmed IDs."}</p>
            ) : (
              <>
                <label>
                  ID
                  <select value={managedId?.id ?? ""} onChange={(event) => setManagedIdName(event.target.value)}>
                    {ownerControlledIds.map((record) => (
                      <option key={`${record.network}-${record.id}`} value={record.id}>
                        {record.id}@proofofwork.me
                      </option>
                    ))}
                  </select>
                </label>
                {managedId ? (
                  <dl className="id-manage-state">
                    <div>
                      <dt>Owner</dt>
                      <dd>{shortAddress(managedId.ownerAddress)}</dd>
                    </div>
                    <div>
                      <dt>Receives</dt>
                      <dd>{shortAddress(managedId.receiveAddress)}</dd>
                    </div>
                    <div>
                      <dt>Registry</dt>
                      <dd>{shortAddress(registryAddress)}</dd>
                    </div>
                  </dl>
                ) : null}
                <p className="field-note">The published listing includes on-chain sale terms. Delisting costs {ID_MUTATION_PRICE_SATS.toLocaleString()} sats and transfers invalidate old listings.</p>
              </>
            )}
          </section>

          <IdMarketplaceCard
            busy={busy}
            canCreateSaleAuthorization={canCreateSaleAuthorization}
            canPurchaseId={canPurchaseId}
            feeRate={feeRate}
            idPurchaseBytes={idPurchaseBytes}
            idPurchaseOwnerAddress={idPurchaseOwnerAddress}
            idPurchaseReceiveAddress={idPurchaseReceiveAddress}
            idSaleAuthorization={idSaleAuthorization}
            idSaleBuyerAddress={idSaleBuyerAddress}
            idSalePriceSats={idSalePriceSats}
            idSaleReceiveAddress={idSaleReceiveAddress}
            managedId={managedId}
            network="livenet"
            publishListing={publishListing}
            setIdPurchaseOwnerAddress={setIdPurchaseOwnerAddress}
            setIdPurchaseReceiveAddress={setIdPurchaseReceiveAddress}
            setIdSaleBuyerAddress={setIdSaleBuyerAddress}
            setIdSalePriceSats={setIdSalePriceSats}
            setIdSaleReceiveAddress={setIdSaleReceiveAddress}
            setFeeRate={setFeeRate}
            submitPurchase={submitPurchase}
          />

          <MarketplaceListingList
            address={address}
            listings={registryListings}
            onDelist={delistListing}
            onUse={useListing}
          />

          <section className="id-card">
            <div className="id-card-head">
              <div className="empty-icon" aria-hidden="true">
                <Clock size={24} />
              </div>
              <div>
                <h3>Pending Transfers</h3>
                <p>Listings, purchases, and transfers touching your wallet stay here until confirmation.</p>
              </div>
            </div>
            <PendingIdEventList
              address={address}
              events={walletPendingEvents}
              empty={address ? "No pending marketplace transfers for this wallet." : "Connect a wallet to see pending marketplace transfers."}
            />
          </section>

          <section className="id-card ids-registry-card">
            <div className="id-card-head">
              <div className="empty-icon" aria-hidden="true">
                <Inbox size={24} />
              </div>
              <div>
                <h3>Registry Supply</h3>
                <p>Confirmed IDs are the assets. The public listing book will build on the same registry.</p>
              </div>
            </div>
            <IdRecordList records={confirmedRecords} empty="No confirmed registry records found yet." />
          </section>
        </div>
      </section>

      <SocialFooter />
    </main>
  );
}

function MarketplaceWorkspace({
  address,
  busy,
  canCreateSaleAuthorization,
  canPurchaseId,
  delistListing,
  feeRate,
  idPurchaseBytes,
  idPurchaseOwnerAddress,
  idPurchaseReceiveAddress,
  idSaleAuthorization,
  idSaleBuyerAddress,
  idSalePriceSats,
  idSaleReceiveAddress,
  managedIdName,
  network,
  pendingEvents,
  publishListing,
  registryAddress,
  registryListings,
  registryRecords,
  setIdPurchaseOwnerAddress,
  setIdPurchaseReceiveAddress,
  setIdSaleBuyerAddress,
  setIdSalePriceSats,
  setIdSaleReceiveAddress,
  setFeeRate,
  setManagedIdName,
  submitPurchase,
  useListing,
  onRefresh,
}: {
  address: string;
  busy: boolean;
  canCreateSaleAuthorization: boolean;
  canPurchaseId: boolean;
  delistListing: (listing: PowIdListing) => void;
  feeRate: number;
  idPurchaseBytes: number;
  idPurchaseOwnerAddress: string;
  idPurchaseReceiveAddress: string;
  idSaleAuthorization: string;
  idSaleBuyerAddress: string;
  idSalePriceSats: number;
  idSaleReceiveAddress: string;
  managedIdName: string;
  network: BitcoinNetwork;
  pendingEvents: PowIdPendingEvent[];
  publishListing: () => void;
  registryAddress: string;
  registryListings: PowIdListing[];
  registryRecords: PowIdRecord[];
  setIdPurchaseOwnerAddress: (value: string) => void;
  setIdPurchaseReceiveAddress: (value: string) => void;
  setIdSaleBuyerAddress: (value: string) => void;
  setIdSalePriceSats: (value: number) => void;
  setIdSaleReceiveAddress: (value: string) => void;
  setFeeRate: (value: number) => void;
  setManagedIdName: (value: string) => void;
  submitPurchase: (event: FormEvent<HTMLFormElement>) => void;
  useListing: (listing: PowIdListing) => void;
  onRefresh: () => void;
}) {
  const confirmedRecords = registryRecords.filter((record) => record.network === network && record.confirmed);
  const pendingRecords = registryRecords.filter((record) => record.network === network && !record.confirmed);
  const ownerControlledIds = confirmedRecords.filter((record) => record.ownerAddress === address);
  const managedId = ownerControlledIds.find((record) => record.id === managedIdName) ?? ownerControlledIds[0];
  const walletPendingEvents = pendingEvents.filter((event) => event.network === network && pendingIdEventTouchesAddress(event, address));

  return (
    <section className="ids-workspace">
      <div className="files-toolbar">
        <div>
          <h2>Marketplace</h2>
          <span>
            {registryAddress
              ? `${confirmedRecords.length.toLocaleString()} confirmed IDs · ${pendingRecords.length.toLocaleString()} pending`
              : `No ID marketplace configured for ${networkLabel(network)}`}
          </span>
        </div>
        <button className="secondary small" disabled={busy || !registryAddress} onClick={onRefresh} type="button">
          <span className="button-content">
            <RefreshCw className={busy ? "refresh-spin" : ""} size={15} />
            <span>{busy ? "Refreshing" : "Refresh"}</span>
          </span>
        </button>
      </div>

      <div className="ids-content marketplace-content">
        <section className="id-card">
          <div className="id-card-head">
            <div className="empty-icon" aria-hidden="true">
              <Wallet size={24} />
            </div>
            <div>
              <h3>List an ID</h3>
              <p>Publish an on-chain listing for one of your confirmed IDs. Listings cost {ID_MUTATION_PRICE_SATS.toLocaleString()} sats.</p>
            </div>
          </div>

          {ownerControlledIds.length === 0 ? (
            <p className="field-note">{address ? "This wallet does not own any confirmed IDs yet." : "Connect the owner wallet to list confirmed IDs."}</p>
          ) : (
            <>
              <label>
                ID
                <select value={managedId?.id ?? ""} onChange={(event) => setManagedIdName(event.target.value)}>
                  {ownerControlledIds.map((record) => (
                    <option key={`${record.network}-${record.id}`} value={record.id}>
                      {record.id}@proofofwork.me
                    </option>
                  ))}
                </select>
              </label>
              {managedId ? (
                <dl className="id-manage-state">
                  <div>
                    <dt>Owner</dt>
                    <dd>{shortAddress(managedId.ownerAddress)}</dd>
                  </div>
                  <div>
                    <dt>Receives</dt>
                    <dd>{shortAddress(managedId.receiveAddress)}</dd>
                  </div>
                  <div>
                    <dt>Registry</dt>
                    <dd>{shortAddress(registryAddress)}</dd>
                  </div>
                </dl>
              ) : null}
              <p className="field-note">
                The published listing includes on-chain sale terms. Delisting costs {ID_MUTATION_PRICE_SATS.toLocaleString()} sats and transfers invalidate old listings.
              </p>
            </>
          )}
        </section>

        <IdMarketplaceCard
          busy={busy}
          canCreateSaleAuthorization={canCreateSaleAuthorization}
          canPurchaseId={canPurchaseId}
          feeRate={feeRate}
          idPurchaseBytes={idPurchaseBytes}
          idPurchaseOwnerAddress={idPurchaseOwnerAddress}
          idPurchaseReceiveAddress={idPurchaseReceiveAddress}
          idSaleAuthorization={idSaleAuthorization}
          idSaleBuyerAddress={idSaleBuyerAddress}
          idSalePriceSats={idSalePriceSats}
          idSaleReceiveAddress={idSaleReceiveAddress}
          managedId={managedId}
          network={network}
          publishListing={publishListing}
          setIdPurchaseOwnerAddress={setIdPurchaseOwnerAddress}
          setIdPurchaseReceiveAddress={setIdPurchaseReceiveAddress}
          setIdSaleBuyerAddress={setIdSaleBuyerAddress}
          setIdSalePriceSats={setIdSalePriceSats}
          setIdSaleReceiveAddress={setIdSaleReceiveAddress}
          setFeeRate={setFeeRate}
          submitPurchase={submitPurchase}
        />

        <MarketplaceListingList
          address={address}
          listings={registryListings.filter((listing) => listing.network === network)}
          onDelist={delistListing}
          onUse={useListing}
        />

        <section className="id-card">
          <div className="id-card-head">
            <div className="empty-icon" aria-hidden="true">
              <Clock size={24} />
            </div>
            <div>
              <h3>Pending Transfers</h3>
              <p>Listings, purchases, and transfers touching your wallet stay here until confirmation.</p>
            </div>
          </div>
          <PendingIdEventList
            address={address}
            events={walletPendingEvents}
            empty={address ? "No pending marketplace transfers for this wallet." : "Connect a wallet to see pending marketplace transfers."}
          />
        </section>

        <section className="id-card ids-registry-card">
          <div className="id-card-head">
            <div className="empty-icon" aria-hidden="true">
              <Inbox size={24} />
            </div>
            <div>
              <h3>Registry Supply</h3>
              <p>Confirmed IDs are marketplace assets. The standalone marketplace uses the same registry.</p>
            </div>
          </div>
          <IdRecordList records={confirmedRecords} empty={registryAddress ? "No confirmed registry records found yet." : "Switch to Mainnet to browse the ID marketplace."} />
        </section>
      </div>
    </section>
  );
}

function SocialFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={compact ? "app-footer compact" : "app-footer"}>
      <span>ProofOfWork.Me</span>
      <DomainNav compact={compact} />
      <nav className="social-nav" aria-label="Official ProofOfWork.Me links">
        <a href={X_URL} rel="noreferrer" target="_blank" aria-label="ProofOfWork.Me on X">
          <span className="button-content">
            <X size={14} />
            <span>X</span>
          </span>
        </a>
        <a href={YOUTUBE_URL} rel="noreferrer" target="_blank" aria-label="ProofOfWork.Me on YouTube">
          <span className="button-content">
            <span aria-hidden="true">YT</span>
            <span>YouTube</span>
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

function ContactsWorkspace({
  contacts,
  network,
  onAdd,
  onCompose,
  onRemove,
}: {
  contacts: ContactRecord[];
  network: BitcoinNetwork;
  onAdd: (name: string, target: string) => boolean;
  onCompose: (contact: ContactRecord) => void;
  onRemove: (contact: ContactRecord) => void;
}) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (onAdd(name, target)) {
      setName("");
      setTarget("");
    }
  }

  return (
    <section className="contacts-workspace">
      <div className="files-toolbar">
        <div>
          <h2>Contacts</h2>
          <span>{contacts.length.toLocaleString()} local contact{contacts.length === 1 ? "" : "s"} on {networkLabel(network)}</span>
        </div>
      </div>

      <div className="ids-content contacts-content">
        <form className="id-card contact-form" onSubmit={submit}>
          <div className="id-card-head">
            <div className="empty-icon" aria-hidden="true">
              <UserPlus size={24} />
            </div>
            <div>
              <h3>Add Contact</h3>
              <p>Save a Bitcoin address or confirmed ProofOfWork ID locally for compose.</p>
            </div>
          </div>

          <label>
            Name optional
            <input autoComplete="off" onChange={(event) => setName(event.target.value)} placeholder="Satoshi" value={name} />
          </label>

          <label>
            Address or ID
            <input
              autoComplete="off"
              onChange={(event) => setTarget(event.target.value)}
              placeholder={network === "livenet" ? "bitcoin@proofofwork.me or bc1..." : "tb1..."}
              spellCheck={false}
              value={target}
            />
          </label>

          <button className="primary" type="submit">
            <span className="button-content">
              <UserPlus size={16} />
              <span>Save Contact</span>
            </span>
          </button>
        </form>

        <section className="id-card contacts-list-card">
          <div className="id-card-head">
            <div className="empty-icon" aria-hidden="true">
              <Users size={24} />
            </div>
            <div>
              <h3>Address Book</h3>
              <p>Contacts stay in this browser and are included in backup export/import.</p>
            </div>
          </div>

          {contacts.length === 0 ? (
            <p className="field-note">No contacts saved for {networkLabel(network)} yet.</p>
          ) : (
            <div className="id-record-list">
              {contacts.map((contact) => (
                <article className="id-record contact-record" key={contactKey(contact)}>
                  <div>
                    <strong>{contact.name}</strong>
                    <span>{contact.source === "registry" ? "Registry" : "Manual"} · {networkLabel(contact.network)}</span>
                  </div>
                  <dl>
                    <div>
                      <dt>Target</dt>
                      <dd>{contactTarget(contact)}</dd>
                    </div>
                    <div>
                      <dt>Address</dt>
                      <dd>{shortAddress(contact.address)}</dd>
                    </div>
                    <div>
                      <dt>Saved</dt>
                      <dd>{formatDate(contact.updatedAt)}</dd>
                    </div>
                  </dl>
                  <div className="id-record-actions">
                    <button className="primary small" onClick={() => onCompose(contact)} type="button">
                      <span className="button-content">
                        <PenLine size={15} />
                        <span>Write</span>
                      </span>
                    </button>
                    <button className="secondary small" onClick={() => onRemove(contact)} type="button">
                      <span className="button-content">
                        <Trash2 size={15} />
                        <span>Remove</span>
                      </span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function IdsWorkspace({
  address,
  busy,
  canRegister,
  contacts,
  feeRate,
  idName,
  idPgpKey,
  idReceiveAddress,
  idReceiverUpdateBytes,
  idTransferBytes,
  idTransferOwnerAddress,
  idTransferReceiveAddress,
  idUpdateReceiveAddress,
  managedIdName,
  network,
  pendingEvents,
  registryAddress,
  registryRecords,
  registrationBytes,
  lastRegisteredId,
  canTransfer,
  canUpdate,
  setFeeRate,
  setIdName,
  setIdPgpKey,
  setIdReceiveAddress,
  setIdTransferOwnerAddress,
  setIdTransferReceiveAddress,
  setIdUpdateReceiveAddress,
  setManagedIdName,
  onAddContact,
  onRefresh,
  submitTransfer,
  submitUpdate,
  submit,
}: {
  address: string;
  busy: boolean;
  canRegister: boolean;
  contacts: ContactRecord[];
  feeRate: number;
  idName: string;
  idPgpKey: string;
  idReceiveAddress: string;
  idReceiverUpdateBytes: number;
  idTransferBytes: number;
  idTransferOwnerAddress: string;
  idTransferReceiveAddress: string;
  idUpdateReceiveAddress: string;
  managedIdName: string;
  network: BitcoinNetwork;
  pendingEvents: PowIdPendingEvent[];
  registryAddress: string;
  registryRecords: PowIdRecord[];
  registrationBytes: number;
  lastRegisteredId?: PowIdRecord;
  canTransfer: boolean;
  canUpdate: boolean;
  setFeeRate: (value: number) => void;
  setIdName: (value: string) => void;
  setIdPgpKey: (value: string) => void;
  setIdReceiveAddress: (value: string) => void;
  setIdTransferOwnerAddress: (value: string) => void;
  setIdTransferReceiveAddress: (value: string) => void;
  setIdUpdateReceiveAddress: (value: string) => void;
  setManagedIdName: (value: string) => void;
  onAddContact: (record: PowIdRecord) => void;
  onRefresh: () => void;
  submitTransfer: (event: FormEvent<HTMLFormElement>) => void;
  submitUpdate: (event: FormEvent<HTMLFormElement>) => void;
  submit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const normalizedId = normalizePowId(idName);
  const idError = powIdError(normalizedId);
  const ownedIds = ownedPowIds(registryRecords, address);
  const ownerControlledIds = registryRecords.filter((record) => record.network === network && record.confirmed && record.ownerAddress === address);
  const walletPendingEvents = pendingEvents.filter((event) => event.network === network && pendingIdEventTouchesAddress(event, address));
  const managedId = ownerControlledIds.find((record) => record.id === managedIdName) ?? ownerControlledIds[0];
  const receiverUpdateResolution = resolveRecipientInput(idUpdateReceiveAddress, network, registryRecords, registryAddress);
  const receiverUpdateNote = idUpdateReceiveAddress.trim() ? receiveResolutionNote(receiverUpdateResolution) : "";
  const transferTargetResolution = resolvePowIdOwnerInput(idTransferOwnerAddress, network, registryRecords, registryAddress);
  const transferTargetNote = idTransferOwnerAddress.trim() ? ownerResolutionNote(transferTargetResolution) : "";
  const transferReceiveResolution = idTransferReceiveAddress.trim() ? resolveRecipientInput(idTransferReceiveAddress, network, registryRecords, registryAddress) : undefined;
  const transferReceiveNote = transferReceiveResolution ? receiveResolutionNote(transferReceiveResolution) : "";

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

          <FeeRateControl
            feeRate={feeRate}
            setFeeRate={setFeeRate}
            sidecar={
              <label>
                Registry
                <input readOnly value={registryAddress || "Not configured"} />
              </label>
            }
          />

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

        <section className="id-card">
          <div className="id-card-head">
            <div className="empty-icon" aria-hidden="true">
              <Wallet size={24} />
            </div>
            <div>
              <h3>Manage ID</h3>
              <p>Current owners can update routing or transfer the asset. Each registry mutation pays {ID_MUTATION_PRICE_SATS.toLocaleString()} sats.</p>
            </div>
          </div>

          {ownerControlledIds.length === 0 ? (
            <p className="field-note">Connect the current owner wallet to manage confirmed IDs.</p>
          ) : (
            <>
              <label>
                ID
                <select value={managedId?.id ?? ""} onChange={(event) => setManagedIdName(event.target.value)}>
                  {ownerControlledIds.map((record) => (
                    <option key={`${record.network}-${record.id}`} value={record.id}>
                      {record.id}@proofofwork.me
                    </option>
                  ))}
                </select>
              </label>

              {managedId ? (
                <dl className="id-manage-state">
                  <div>
                    <dt>Owner</dt>
                    <dd>{shortAddress(managedId.ownerAddress)}</dd>
                  </div>
                  <div>
                    <dt>Receives</dt>
                    <dd>{shortAddress(managedId.receiveAddress)}</dd>
                  </div>
                  <div>
                    <dt>Last Event</dt>
                    <dd>{shortAddress(managedId.txid)}</dd>
                  </div>
                </dl>
              ) : null}

              <FeeRateControl feeRate={feeRate} setFeeRate={setFeeRate} />

              <form className="id-action-form" onSubmit={submitUpdate}>
                <label>
                  New receive address or ID
                  <input autoComplete="off" onChange={(event) => setIdUpdateReceiveAddress(event.target.value)} spellCheck={false} value={idUpdateReceiveAddress} />
                </label>
                {receiverUpdateNote ? <p className={receiverUpdateResolution.error ? "field-note bad" : "field-note good"}>{receiverUpdateNote}</p> : null}
                <div className={idReceiverUpdateBytes > MAX_DATA_CARRIER_BYTES ? "counter bad" : "counter"}>
                  {idReceiverUpdateBytes.toLocaleString()} / {MAX_DATA_CARRIER_BYTES.toLocaleString()} OP_RETURN data-carrier bytes
                </div>
                <button className="secondary" disabled={!canUpdate} type="submit">
                  <span className="button-content">
                    <RefreshCw size={15} />
                    <span>Update Receiver</span>
                  </span>
                </button>
              </form>

              <form className="id-action-form" onSubmit={submitTransfer}>
                <label>
                  New owner address or ID
                  <input autoComplete="off" onChange={(event) => setIdTransferOwnerAddress(event.target.value)} spellCheck={false} value={idTransferOwnerAddress} />
                </label>
                {transferTargetNote ? <p className={transferTargetResolution.error ? "field-note bad" : "field-note good"}>{transferTargetNote}</p> : null}
                <label>
                  New receive address or ID optional
                  <input
                    autoComplete="off"
                    onChange={(event) => setIdTransferReceiveAddress(event.target.value)}
                    placeholder="Defaults to new owner"
                    spellCheck={false}
                    value={idTransferReceiveAddress}
                  />
                </label>
                {transferReceiveNote ? <p className={transferReceiveResolution?.error ? "field-note bad" : "field-note good"}>{transferReceiveNote}</p> : null}
                <div className={idTransferBytes > MAX_DATA_CARRIER_BYTES ? "counter bad" : "counter"}>
                  {idTransferBytes.toLocaleString()} / {MAX_DATA_CARRIER_BYTES.toLocaleString()} OP_RETURN data-carrier bytes
                </div>
                <button className="primary" disabled={!canTransfer} type="submit">
                  <span className="button-content">
                    <Send size={15} />
                    <span>Transfer ID</span>
                  </span>
                </button>
              </form>
            </>
          )}
        </section>

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
          <IdRecordList records={ownedIds} allowVerification contacts={contacts} empty="No IDs for this wallet yet." onAddContact={onAddContact} />
        </section>

        <section className="id-card">
          <div className="id-card-head">
            <div className="empty-icon" aria-hidden="true">
              <Clock size={24} />
            </div>
            <div>
              <h3>Pending IDs</h3>
              <p>Incoming and outgoing ID transfers appear here until they confirm.</p>
            </div>
          </div>
          <PendingIdEventList
            address={address}
            events={walletPendingEvents}
            empty={address ? "No in-flight ID transfers for this wallet." : "Connect a wallet to see pending ID transfers."}
          />
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
          <IdRecordList
            records={registryRecords}
            contacts={contacts}
            empty={registryAddress ? "No registry records found yet." : "Registry address is not configured for this network."}
            onAddContact={onAddContact}
          />
        </section>
      </div>
    </section>
  );
}

function MarketplaceListingList({
  address,
  listings,
  onDelist,
  onUse,
}: {
  address: string;
  listings: PowIdListing[];
  onDelist: (listing: PowIdListing) => void;
  onUse: (listing: PowIdListing) => void;
}) {
  return (
    <section className="id-card ids-registry-card marketplace-listings-card">
      <div className="id-card-head">
        <div className="empty-icon" aria-hidden="true">
          <Inbox size={24} />
        </div>
        <div>
          <h3>Active Listings</h3>
          <p>On-chain listings are canceled by delisting, expiry, or any ownership transfer.</p>
        </div>
      </div>

      {listings.length === 0 ? (
        <p className="field-note">No active on-chain listings yet.</p>
      ) : (
        <div className="id-record-list marketplace-listing-list">
          {listings.map((listing) => (
            <article className="id-record" key={listing.listingId}>
              <div>
                <strong>{listing.id}@proofofwork.me</strong>
                <span>
                  {listing.priceSats.toLocaleString()} sats · {listing.listingVersion === "list4" ? "Hardened" : listing.listingVersion === "list3" ? "Anchored" : "Legacy"} · Listed {formatDate(listing.createdAt)}
                </span>
              </div>
              <dl>
                <div>
                  <dt>Seller</dt>
                  <dd>{shortAddress(listing.sellerAddress)}</dd>
                </div>
                <div>
                  <dt>Buyer</dt>
                  <dd>{listing.buyerAddress ? shortAddress(listing.buyerAddress) : "Any"}</dd>
                </div>
                <div>
                  <dt>Listing</dt>
                  <dd>{shortAddress(listing.listingId)}</dd>
                </div>
              </dl>
              <div className="id-record-actions">
                <button className="primary small" disabled={listing.listingVersion !== "list3" && listing.listingVersion !== "list4"} onClick={() => onUse(listing)} type="button">
                  <span className="button-content">
                    <Send size={15} />
                    <span>{listing.listingVersion === "list3" || listing.listingVersion === "list4" ? "Select Listing" : "Legacy"}</span>
                  </span>
                </button>
                {address && listing.sellerAddress === address ? (
                  <button className="secondary small" onClick={() => onDelist(listing)} type="button">
                    <span className="button-content">
                      <Trash2 size={15} />
                      <span>Delist</span>
                    </span>
                  </button>
                ) : null}
                <a className="secondary small link-button" href={mempoolTxUrl(listing.txid, listing.network)} rel="noreferrer" target="_blank">
                  <span className="button-content">
                    <ArrowUpRight size={15} />
                    <span>View TX</span>
                  </span>
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function FeeRateControl({
  feeRate,
  setFeeRate,
  sidecar,
}: {
  feeRate: number;
  setFeeRate: (value: number) => void;
  sidecar?: ReactNode;
}) {
  return (
    <div className="fee-control">
      <div className={sidecar ? "fee-control-grid" : undefined}>
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
        {sidecar}
      </div>
      <div className="fee-presets" aria-label="Fee presets">
        {[0.1, 0.25, 0.5, 1].map((preset) => (
          <button aria-pressed={feeRate === preset} key={preset} onClick={() => setFeeRate(preset)} type="button">
            {preset}
          </button>
        ))}
      </div>
    </div>
  );
}

function IdMarketplaceCard({
  busy,
  canCreateSaleAuthorization,
  canPurchaseId,
  feeRate,
  idPurchaseBytes,
  idPurchaseOwnerAddress,
  idPurchaseReceiveAddress,
  idSaleAuthorization,
  idSaleBuyerAddress,
  idSalePriceSats,
  idSaleReceiveAddress,
  managedId,
  network,
  publishListing,
  setIdPurchaseOwnerAddress,
  setIdPurchaseReceiveAddress,
  setIdSaleBuyerAddress,
  setIdSalePriceSats,
  setIdSaleReceiveAddress,
  setFeeRate,
  submitPurchase,
}: {
  busy: boolean;
  canCreateSaleAuthorization: boolean;
  canPurchaseId: boolean;
  feeRate: number;
  idPurchaseBytes: number;
  idPurchaseOwnerAddress: string;
  idPurchaseReceiveAddress: string;
  idSaleAuthorization: string;
  idSaleBuyerAddress: string;
  idSalePriceSats: number;
  idSaleReceiveAddress: string;
  managedId?: PowIdRecord;
  network: BitcoinNetwork;
  publishListing: () => void;
  setIdPurchaseOwnerAddress: (value: string) => void;
  setIdPurchaseReceiveAddress: (value: string) => void;
  setIdSaleBuyerAddress: (value: string) => void;
  setIdSalePriceSats: (value: number) => void;
  setIdSaleReceiveAddress: (value: string) => void;
  setFeeRate: (value: number) => void;
  submitPurchase: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const parsedSale = useMemo(() => {
    if (!idSaleAuthorization.trim()) {
      return undefined;
    }

    try {
      return parseSaleAuthorizationText(idSaleAuthorization, network);
    } catch {
      return undefined;
    }
  }, [idSaleAuthorization, network]);
  const saleIsReady = parsedSale ? saleAuthorizationCanBroadcast(parsedSale) : false;

  return (
    <section className="id-card id-marketplace-card">
      <div className="id-card-head">
        <div className="empty-icon" aria-hidden="true">
          <Users size={24} />
        </div>
        <div>
          <h3>Marketplace Transfer</h3>
          <p>Listings are anchored on-chain. Buyers settle by spending the listing anchor and paying the {ID_MUTATION_PRICE_SATS.toLocaleString()} sat registry transfer.</p>
        </div>
      </div>

      <div className="id-market-grid">
        <div className="id-action-form">
          <h4>Publish on-chain listing</h4>
          <p className="field-note">
            {managedId
              ? `Listing ${managedId.id}@proofofwork.me from ${shortAddress(managedId.ownerAddress)}.`
              : "Select an owned confirmed ID above first."}
          </p>
          <label>
            Seller price sats
            <input
              min={0}
              onChange={(event) => setIdSalePriceSats(Number(event.target.value))}
              step={1}
              type="number"
              value={idSalePriceSats}
            />
          </label>
          <label>
            Specific buyer optional
            <input
              autoComplete="off"
              onChange={(event) => setIdSaleBuyerAddress(event.target.value)}
              placeholder="Any buyer if empty"
              spellCheck={false}
              value={idSaleBuyerAddress}
            />
          </label>
          <label>
            Locked receive address optional
            <input
              autoComplete="off"
              onChange={(event) => setIdSaleReceiveAddress(event.target.value)}
              placeholder="Buyer chooses if empty"
              spellCheck={false}
              value={idSaleReceiveAddress}
            />
          </label>
          <FeeRateControl feeRate={feeRate} setFeeRate={setFeeRate} />
          <div className="id-record-actions">
            <button className="primary" disabled={!canCreateSaleAuthorization} onClick={publishListing} type="button">
              <span className="button-content">
                <Send size={15} />
                <span>{busy ? "Publishing" : "Publish On-Chain"}</span>
              </span>
            </button>
          </div>
        </div>

        <form className="id-action-form" onSubmit={submitPurchase}>
          <h4>{parsedSale ? `Buy ${parsedSale.id}@proofofwork.me` : "Select an on-chain listing"}</h4>
          <p className={parsedSale && saleIsReady ? "field-note good" : "field-note"}>
            {parsedSale && saleIsReady
              ? `Selected listing price: ${parsedSale.priceSats.toLocaleString()} sats.`
              : "Choose an active listing below. The purchase form fills from that on-chain listing."}
          </p>
          <div className="compose-grid">
            <label>
              New owner
              <input autoComplete="off" onChange={(event) => setIdPurchaseOwnerAddress(event.target.value)} spellCheck={false} value={idPurchaseOwnerAddress} />
            </label>
            <label>
              New receive optional
              <input
                autoComplete="off"
                onChange={(event) => setIdPurchaseReceiveAddress(event.target.value)}
                placeholder="Defaults to new owner"
                spellCheck={false}
                value={idPurchaseReceiveAddress}
              />
            </label>
          </div>
          <div className={idPurchaseBytes > MAX_DATA_CARRIER_BYTES ? "counter bad" : "counter"}>
            {idPurchaseBytes.toLocaleString()} / {MAX_DATA_CARRIER_BYTES.toLocaleString()} OP_RETURN data-carrier bytes
          </div>
          <FeeRateControl feeRate={feeRate} setFeeRate={setFeeRate} />
          <div className="id-record-actions">
            <button className="primary" disabled={!canPurchaseId} type="submit">
              <span className="button-content">
                <Send size={15} />
                <span>{busy ? "Buying" : "Buy Listing On-Chain"}</span>
              </span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function PendingIdEventList({
  address,
  empty,
  events,
}: {
  address: string;
  empty: string;
  events: PowIdPendingEvent[];
}) {
  if (events.length === 0) {
    return <p className="field-note">{empty}</p>;
  }

  return (
    <div className="id-record-list">
      {events.map((event) => (
        <article className="id-record" key={`${event.network}-${event.txid}-${event.kind}`}>
          <div>
            <strong>{event.id ? `${event.id}@proofofwork.me` : "Registry event"}</strong>
            <span>{pendingIdEventLabel(event, address)} · {event.amountSats.toLocaleString()} sats</span>
          </div>
          <dl>
            <div>
              <dt>Current Owner</dt>
              <dd>{event.currentOwnerAddress ? shortAddress(event.currentOwnerAddress) : "Unknown"}</dd>
            </div>
            <div>
              <dt>New Owner</dt>
              <dd>{event.ownerAddress ? shortAddress(event.ownerAddress) : event.kind === "update" ? "No change" : "Unknown"}</dd>
            </div>
            <div>
              <dt>Receives</dt>
              <dd>{event.receiveAddress ? shortAddress(event.receiveAddress) : event.currentReceiveAddress ? shortAddress(event.currentReceiveAddress) : "Unknown"}</dd>
            </div>
            <div>
              <dt>TX</dt>
              <dd>{shortAddress(event.txid)}</dd>
            </div>
          </dl>
          <div className="id-record-actions">
            <a className="secondary small link-button" href={mempoolTxUrl(event.txid, event.network)} rel="noreferrer" target="_blank">
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

function IdRecordList({
  records,
  allowVerification = false,
  contacts = [],
  empty,
  onAddContact,
}: {
  records: PowIdRecord[];
  allowVerification?: boolean;
  contacts?: ContactRecord[];
  empty: string;
  onAddContact?: (record: PowIdRecord) => void;
}) {
  if (records.length === 0) {
    return <p className="field-note">{empty}</p>;
  }

  return (
    <div className="id-record-list">
      {records.map((record) => {
        const saved = contacts.some((contact) => contactKey(contact) === registryContactKey(record));

        return (
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
              {onAddContact && record.confirmed ? (
                <button className="secondary small" disabled={saved} onClick={() => onAddContact(record)} type="button">
                  <span className="button-content">
                    <UserPlus size={15} />
                    <span>{saved ? "Saved" : "Add Contact"}</span>
                  </span>
                </button>
              ) : null}
              <a className="secondary small link-button" href={mempoolTxUrl(record.txid, record.network)} rel="noreferrer" target="_blank">
                <span className="button-content">
                  <ArrowUpRight size={15} />
                  <span>View TX</span>
                </span>
              </a>
            </div>
          </article>
        );
      })}
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
              : activeFolder === "custom"
                ? <FolderPlus size={26} />
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
                : activeFolder === "custom"
                  ? "No messages here yet"
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
                : activeFolder === "custom"
                  ? "Open confirmed mail and add it to this local folder."
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
            <strong>{recipientInputSummary(draft.recipient)}</strong>
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

function DesktopWorkspace({
  activeNetwork,
  busy,
  desktopQuery,
  fileFilter,
  messages,
  profile,
  selectedKey,
  setDesktopQuery,
  setFileFilter,
  setSortMode,
  sortMode,
  onClear,
  onRefresh,
  onSearch,
  onSelect,
}: {
  activeNetwork: BitcoinNetwork;
  busy: boolean;
  desktopQuery: string;
  fileFilter: FileFilter;
  messages: MailMessage[];
  profile?: DesktopProfile;
  selectedKey: string;
  setDesktopQuery: (value: string) => void;
  setFileFilter: (value: FileFilter) => void;
  setSortMode: (value: SortMode) => void;
  sortMode: SortMode;
  onClear: () => void;
  onRefresh: () => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onSelect: (message: MailMessage) => void;
}) {
  const fileMessages = sortMessages(
    messages
      .filter(hasAttachment)
      .filter((message) => fileFilter === "all" || attachmentKind(message.attachment) === fileFilter),
    sortMode,
  ).filter(hasAttachment);
  const selectedFile = fileMessages.find((message) => mailKey(message) === selectedKey) ?? fileMessages[0];

  if (!profile) {
    return (
      <section className="desktop-workspace">
        <div className="desktop-screensaver">
          <div className="desktop-screen-card">
            <div className="brand-mark" aria-hidden="true">
              PoW
            </div>
            <span>ProofOfWork Desktop</span>
            <h2>Open a public Bitcoin desktop.</h2>
            <form className="desktop-search desktop-search-large" onSubmit={onSearch}>
              <Search size={18} aria-hidden="true" />
              <input
                autoComplete="off"
                onChange={(event) => setDesktopQuery(event.target.value)}
                placeholder="address or user@proofofwork.me"
                spellCheck={false}
                value={desktopQuery}
              />
              <button className="primary" disabled={busy || !desktopQuery.trim()} type="submit">
                <span className="button-content">
                  <Monitor size={16} />
                  <span>{busy ? "Opening" : "Open"}</span>
                </span>
              </button>
            </form>
            <div className="desktop-signal">
              <span>{networkLabel(activeNetwork)}</span>
              <span>Confirmed files</span>
              <span>No wallet required</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="desktop-workspace">
      <div className="desktop-toolbar">
        <div>
          <h2>{profile.label} Desktop</h2>
          <span>
            {fileMessages.length.toLocaleString()} public file{fileMessages.length === 1 ? "" : "s"} · {shortAddress(profile.address)}
          </span>
        </div>
        <form className="desktop-search" onSubmit={onSearch}>
          <Search size={16} aria-hidden="true" />
          <input
            autoComplete="off"
            onChange={(event) => setDesktopQuery(event.target.value)}
            placeholder="address or user@proofofwork.me"
            spellCheck={false}
            value={desktopQuery}
          />
          <button className="secondary small" disabled={busy || !desktopQuery.trim()} type="submit">
            <span className="button-content">
              <Search size={15} />
              <span>Search</span>
            </span>
          </button>
        </form>
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
        <button className="secondary small" disabled={busy} onClick={onRefresh} type="button">
          <span className="button-content">
            <RefreshCw className={busy ? "refresh-spin" : ""} size={15} />
            <span>{busy ? "Refreshing" : "Refresh"}</span>
          </span>
        </button>
        <button className="secondary small" disabled={busy} onClick={onClear} type="button">
          <span className="button-content">
            <X size={15} />
            <span>Clear</span>
          </span>
        </button>
      </div>

      {fileMessages.length === 0 ? (
        <div className="desktop-empty">
          <div className="empty-icon" aria-hidden="true">
            <Monitor size={26} />
          </div>
          <h3>No public files</h3>
          <p>{profile.label} has no confirmed ProofOfWork.Me attachments on this network.</p>
        </div>
      ) : (
        <div className="files-browser desktop-browser">
          <div className="files-desktop" aria-label={`${profile.label} public files`}>
            {fileMessages.map((message) => (
              <FileTile
                active={selectedFile ? mailKey(selectedFile) === mailKey(message) : false}
                activeNetwork={activeNetwork}
                key={mailKey(message)}
                message={message}
                onSelect={onSelect}
              />
            ))}
          </div>

          <FileInspector activeNetwork={activeNetwork} message={selectedFile} />
        </div>
      )}
    </section>
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

function AttachmentViewer({ attachment }: { attachment: MailAttachment }) {
  const [copied, setCopied] = useState(false);
  const href = attachmentHref(attachment);
  const previewKind = attachmentPreviewKind(attachment);
  const text = previewKind === "text" ? attachmentText(attachment) : "";

  async function copyText() {
    if (!text) {
      return;
    }

    try {
      await copyTextToClipboard(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  if (previewKind === "image") {
    return (
      <section className="attachment-viewer image-viewer" aria-label={`${attachment.name} preview`}>
        <img alt={attachment.name} src={href} />
      </section>
    );
  }

  if (previewKind === "audio") {
    return (
      <section className="attachment-viewer media-viewer" aria-label={`${attachment.name} audio player`}>
        <audio controls preload="metadata" src={href}>
          <a download={attachment.name} href={href}>
            Download {attachment.name}
          </a>
        </audio>
      </section>
    );
  }

  if (previewKind === "video") {
    return (
      <section className="attachment-viewer media-viewer video-viewer" aria-label={`${attachment.name} video player`}>
        <video controls preload="metadata" src={href}>
          <a download={attachment.name} href={href}>
            Download {attachment.name}
          </a>
        </video>
      </section>
    );
  }

  if (previewKind === "pdf") {
    return (
      <section className="attachment-viewer pdf-viewer" aria-label={`${attachment.name} PDF preview`}>
        <object data={href} type="application/pdf">
          <div>
            <FileText size={34} />
            <strong>PDF preview unavailable</strong>
            <a className="secondary small link-button" download={attachment.name} href={href}>
              Download PDF
            </a>
          </div>
        </object>
      </section>
    );
  }

  if (previewKind === "text") {
    return (
      <section className="attachment-viewer text-viewer" aria-label={`${attachment.name} text preview`}>
        <div className="attachment-viewer-head">
          <span>{attachmentCodeLabel(attachment)}</span>
          <button className="secondary small" onClick={() => void copyText()} type="button">
            <span className="button-content">
              {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </span>
          </button>
        </div>
        <pre>
          <code>{text}</code>
        </pre>
      </section>
    );
  }

  return (
    <section className="attachment-viewer unsupported-viewer" aria-label={`${attachment.name} file preview`}>
      <FileText size={34} />
      <strong>No inline preview</strong>
      <p>This file type is saved on-chain. Download it to open with a local app.</p>
    </section>
  );
}

function FileInspector({
  activeNetwork,
  message,
  onOpenMessage,
}: {
  activeNetwork: BitcoinNetwork;
  message?: MailMessage & { attachment: MailAttachment };
  onOpenMessage?: (message: MailMessage) => void;
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
      <div className="file-detail-title">
        <h3>{attachment.name}</h3>
        <span>{attachment.mime}</span>
      </div>
      <AttachmentViewer attachment={attachment} />
      <div className="file-detail-actions">
        <a className="primary link-button" download={attachment.name} href={attachmentHref(attachment)}>
          <span className="button-content">
            <Download size={15} />
            <span>Download</span>
          </span>
        </a>
        {onOpenMessage ? (
          <button className="secondary" onClick={() => onOpenMessage(message)} type="button">
            <span className="button-content">
              <Mail size={15} />
              <span>Open Message</span>
            </span>
          </button>
        ) : null}
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
  ccRecipient,
  ccRecipientError,
  ccRecipientNote,
  contacts,
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
  setCcRecipient,
  setFeeRate,
  setMemo,
  setParentTxid,
  setRecipient,
  setSubject,
  subject,
  submit,
}: {
  amountSats: number;
  attachment?: MailAttachment;
  busy: boolean;
  canSend: boolean;
  ccRecipient: string;
  ccRecipientError: boolean;
  ccRecipientNote: string;
  contacts: ContactRecord[];
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
  setCcRecipient: (value: string) => void;
  setFeeRate: (value: number) => void;
  setMemo: (value: string) => void;
  setParentTxid: (value: string | undefined) => void;
  setRecipient: (value: string) => void;
  setSubject: (value: string) => void;
  subject: string;
  submit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const recipientTokens = splitRecipientInputs(recipient);
  const ccRecipientTokens = splitRecipientInputs(ccRecipient);
  const removeRecipient = (target: string) => {
    setRecipient(recipientTokens.filter((item) => item !== target).join(", "));
  };
  const removeCcRecipient = (target: string) => {
    setCcRecipient(ccRecipientTokens.filter((item) => item !== target).join(", "));
  };

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
          list="proof-contact-options"
          onChange={(event) => setRecipient(event.target.value)}
          placeholder={network === "livenet" ? "bc1... or user@proofofwork.me" : "tb1..."}
          spellCheck={false}
          value={recipient}
        />
        <datalist id="proof-contact-options">
          {contacts.map((contact) => (
            <option key={contactKey(contact)} label={contact.name} value={contactTarget(contact)} />
          ))}
        </datalist>
      </label>
      {recipientTokens.length > 0 ? (
        <div className="recipient-chip-list" aria-label="Recipients">
          {recipientTokens.map((token, index) => (
            <button className="recipient-chip" key={`${token}-${index}`} onClick={() => removeRecipient(token)} title="Remove recipient" type="button">
              <span>{shortAddress(token)}</span>
              <X size={13} />
            </button>
          ))}
        </div>
      ) : null}
      {recipientNote ? <p className={recipientError ? "field-note bad" : "field-note"}>{recipientNote}</p> : null}

      <label>
        CC
        <input
          autoComplete="off"
          list="proof-contact-options"
          onChange={(event) => setCcRecipient(event.target.value)}
          placeholder="Optional visible copies"
          spellCheck={false}
          value={ccRecipient}
        />
      </label>
      {ccRecipientTokens.length > 0 ? (
        <div className="recipient-chip-list" aria-label="CC recipients">
          {ccRecipientTokens.map((token, index) => (
            <button className="recipient-chip" key={`${token}-${index}`} onClick={() => removeCcRecipient(token)} title="Remove CC recipient" type="button">
              <span>{shortAddress(token)}</span>
              <X size={13} />
            </button>
          ))}
        </div>
      ) : null}
      {ccRecipientNote ? <p className={ccRecipientError ? "field-note bad" : "field-note"}>{ccRecipientNote}</p> : null}

      <label>
        Subject
        <input
          autoComplete="off"
          maxLength={180}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Optional subject"
          value={subject}
        />
      </label>

      <div className="compose-grid">
        <label>
          Sats each
          <input
            min={1}
            onChange={(event) => setAmountSats(Number(event.target.value))}
            type="number"
            value={amountSats}
          />
        </label>
        <FeeRateControl feeRate={feeRate} setFeeRate={setFeeRate} />
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
  activeCustomFolderId,
  activeNetwork,
  archivable,
  archived,
  checkingBroadcasts,
  customFolders,
  deliveryStatus,
  favoriteable,
  favorited,
  folderable,
  folderIds,
  message,
  onArchiveToggle,
  onCheckBroadcasts,
  onFavoriteToggle,
  onFolderToggle,
  onReply,
  onReplyAll,
  onRestoreDraft,
  threadMessages,
}: {
  activeCustomFolderId: string;
  activeNetwork: BitcoinNetwork;
  archivable: boolean;
  archived: boolean;
  checkingBroadcasts: boolean;
  customFolders: CustomFolderRecord[];
  deliveryStatus?: BroadcastStatus;
  favoriteable: boolean;
  favorited: boolean;
  folderable: boolean;
  folderIds: string[];
  message: MailMessage;
  onArchiveToggle: (message: MailMessage, archived: boolean) => void;
  onCheckBroadcasts: () => void;
  onFavoriteToggle: (message: MailMessage, favorite: boolean) => void;
  onFolderToggle: (message: MailMessage, folderId: string, enabled: boolean) => void;
  onReply: (message: MailMessage) => void;
  onReplyAll: (message: MailMessage) => void;
  onRestoreDraft: (message: MailMessage) => void;
  threadMessages: MailMessage[];
}) {
  const peerLabel = message.folder === "sent" ? "To" : "From";
  const peer = message.folder === "sent" ? recipientListText(message.toRecipients ?? message.recipients, message.to) : message.from;
  const ccRecipients = message.folder === "sent" ? message.ccRecipients ?? [] : [];
  const explorerNetwork = explorerNetworkFor(message.network, activeNetwork);
  const hasReplyAllTargets = (message.recipients?.length ?? 0) > 1 || (isInboundFolder(message.folder) && Boolean(message.recipients?.length));
  const availableFolders = customFolders.filter((folder) => !folderIds.includes(folder.id));
  const activeCustomFolder = customFolders.find((folder) => folder.id === activeCustomFolderId);

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
          {folderable && availableFolders.length > 0 ? (
            <label className="folder-action-select">
              <span>Folder</span>
              <select
                aria-label="Add to folder"
                onChange={(event) => {
                  const folderId = event.target.value;
                  event.target.value = "";
                  if (folderId) {
                    onFolderToggle(message, folderId, true);
                  }
                }}
                value=""
              >
                <option value="">Add to folder</option>
                {availableFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {folderable && activeCustomFolder && folderIds.includes(activeCustomFolder.id) ? (
            <button className="secondary small" onClick={() => onFolderToggle(message, activeCustomFolder.id, false)} type="button">
              <span className="button-content">
                <FolderPlus size={15} />
                <span>Remove</span>
              </span>
            </button>
          ) : null}
          <button className="secondary small" onClick={() => onReply(message)} type="button">
            <span className="button-content">
              <Reply size={15} />
              <span>Reply</span>
            </span>
          </button>
          {hasReplyAllTargets ? (
            <button className="secondary small" onClick={() => onReplyAll(message)} type="button">
              <span className="button-content">
                <Users size={15} />
                <span>Reply All</span>
              </span>
            </button>
          ) : null}
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
        {isInboundFolder(message.folder) && message.recipients && message.recipients.length > 1 ? (
          <div>
            <dt>To</dt>
            <dd>{recipientListText(message.recipients, message.to)}</dd>
          </div>
        ) : null}
        {ccRecipients.length > 0 ? (
          <div>
            <dt>CC</dt>
            <dd>{recipientListText(ccRecipients, "")}</dd>
          </div>
        ) : null}
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
