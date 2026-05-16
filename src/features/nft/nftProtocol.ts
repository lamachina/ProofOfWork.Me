import type { BitcoinNetwork } from "../../shared/bitcoin/networks";

export type AkLayerConfig = {
  count: number;
  folder: string;
  hasLeadingZeros: boolean;
  id: string;
  name: string;
  prefix: string;
};

export type AkTraits = Record<string, number>;

export type NftCollectionDefinition = {
  defaultOperatorAddress: string;
  description: string;
  displayName: string;
  id: string;
  maxSupply: number;
  mintProtocolPayload: string;
  name: string;
  operatorMinSats: number;
  ownerAnchorSats: number;
  slug: string;
};

export type NftCollectionRecord = NftCollectionDefinition & {
  confirmed: boolean;
  createdAt: string;
  dataBytes?: number;
  deployedHeight?: number;
  deployedTime?: number;
  deployFeeSats: number;
  genesisTag: string | null;
  imageBase64: string;
  imageDataUrl: string;
  network: BitcoinNetwork;
  operatorAddress: string;
  txid: string;
};

export type AkMintRecord = {
  collectionId?: string;
  collectionName?: string;
  confirmed: boolean;
  createdAt: string;
  dataBytes?: number;
  genesisTag: string | null;
  imageBase64: string;
  imageDataUrl: string;
  mintedHeight?: number;
  mintedTime?: number;
  network: BitcoinNetwork;
  operatorAddress: string;
  operatorSats: number;
  ownerAddress: string;
  tokenIdentifier: string;
  txid: string;
  voutIndex: number;
};

export type AkState = {
  collection?: NftCollectionDefinition;
  collections?: NftCollectionRecord[];
  indexedAt?: string;
  mints: AkMintRecord[];
  operatorAddress?: string;
  stats?: {
    confirmed?: number;
    pending?: number;
    total?: number;
  };
};

export const AK_PROTOCOL_MINT = '{"p":"nft","op":"mint","name":"ak21"}';
export const AK_OPERATOR_ADDRESS =
  "bc1qyh9pgznpass4mjcl8qj9yxs3vvl9rnrk7whapn";
export const NFT_DEPLOY_FEE_ADDRESS = AK_OPERATOR_ADDRESS;
export const NFT_DEPLOY_MIN_FEE_SATS = 1000;
export const AK_OPERATOR_MIN_SATS = 1000;
export const AK_OWNER_ANCHOR_SATS = 762;
export const AK_LAYER_BASE_PATH = "/nft/layers";
export const NFT_MINT_ASSISTANT_DEFAULT_COUNT = 3;
export const NFT_MINT_ASSISTANT_MAX_COUNT = 50;
export const NFT_MINT_ASSISTANT_DEFAULT_DELAY_MS = 1200;
export const NFT_MINT_ASSISTANT_MAX_DELAY_MS = 60_000;

export const NFT_COLLECTIONS: NftCollectionDefinition[] = [
  {
    defaultOperatorAddress: AK_OPERATOR_ADDRESS,
    description:
      "AK21 visual NFT mints with an operator payment, mint JSON, owner anchor, optional Genesis Tag, and image OP_RETURN.",
    displayName: "AK",
    id: "ak21",
    maxSupply: 1000,
    mintProtocolPayload: AK_PROTOCOL_MINT,
    name: "ak21",
    operatorMinSats: AK_OPERATOR_MIN_SATS,
    ownerAnchorSats: AK_OWNER_ANCHOR_SATS,
    slug: "ak",
  },
];

export const AK_LAYERS: AkLayerConfig[] = [
  {
    count: 34,
    folder: "1-dot",
    hasLeadingZeros: false,
    id: "dot",
    name: "Dot",
    prefix: "dot_",
  },
  {
    count: 34,
    folder: "2-frame",
    hasLeadingZeros: false,
    id: "frame",
    name: "Frame",
    prefix: "frame_",
  },
  {
    count: 34,
    folder: "3-grip",
    hasLeadingZeros: true,
    id: "grip",
    name: "Grip",
    prefix: "grip_",
  },
  {
    count: 34,
    folder: "4-metal",
    hasLeadingZeros: true,
    id: "metal",
    name: "Metal",
    prefix: "metal_",
  },
  {
    count: 34,
    folder: "5-nail",
    hasLeadingZeros: false,
    id: "nail",
    name: "Nail",
    prefix: "nail_",
  },
  {
    count: 34,
    folder: "6-rail",
    hasLeadingZeros: false,
    id: "rail",
    name: "Rail",
    prefix: "rail_",
  },
];

export function nftCollectionById(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    NFT_COLLECTIONS.find(
      (collection) =>
        collection.id.toLowerCase() === normalized ||
        collection.name.toLowerCase() === normalized ||
        collection.slug.toLowerCase() === normalized,
    ) ?? NFT_COLLECTIONS[0]
  );
}

export function nftSyntheticCollectionDefinition(
  name: string,
  operatorAddress = "",
): NftCollectionDefinition {
  const normalizedName = (name.trim() || "nft").toLowerCase();
  return {
    defaultOperatorAddress: operatorAddress || AK_OPERATOR_ADDRESS,
    description: `${name.trim() || "NFT"} NFT collection.`,
    displayName: name.trim() || "NFT",
    id: normalizedName,
    maxSupply: 0,
    mintProtocolPayload: JSON.stringify({
      p: "nft",
      op: "mint",
      name: normalizedName,
    }),
    name: name.trim() || normalizedName,
    operatorMinSats: AK_OPERATOR_MIN_SATS,
    ownerAnchorSats: AK_OWNER_ANCHOR_SATS,
    slug: normalizedName,
  };
}

export function nftCollectionByNameAndOperator(
  value: string,
  operatorAddress: string,
) {
  const normalized = value.trim().toLowerCase();
  const normalizedOperator = operatorAddress.trim().toLowerCase();
  if (!normalized) {
    return NFT_COLLECTIONS[0];
  }
  const matches = NFT_COLLECTIONS.filter(
    (collection) =>
      collection.id.toLowerCase() === normalized ||
      collection.name.toLowerCase() === normalized ||
      collection.slug.toLowerCase() === normalized,
  );

  if (normalizedOperator) {
    const operatorMatch = matches.find(
      (collection) =>
        collection.defaultOperatorAddress.toLowerCase() === normalizedOperator,
    );
    if (operatorMatch) {
      return operatorMatch;
    }
  }

  return (
    matches[0] ??
    NFT_COLLECTIONS.find(
      (collection) =>
        normalizedOperator &&
        collection.defaultOperatorAddress.toLowerCase() === normalizedOperator,
    ) ??
    nftSyntheticCollectionDefinition(value, operatorAddress)
  );
}

export function nftRouteCollection() {
  if (typeof window === "undefined") {
    return NFT_COLLECTIONS[0];
  }

  const params = new URLSearchParams(window.location.search);
  return nftCollectionById(params.get("collection") ?? params.get("c") ?? "");
}

export function nftRouteCollectionId() {
  if (typeof window === "undefined") {
    return "";
  }

  const params = new URLSearchParams(window.location.search);
  return (params.get("collection") ?? params.get("c") ?? "").trim();
}

export function nftRouteOperatorAddress(
  collection: NftCollectionDefinition,
) {
  if (typeof window === "undefined") {
    return collection.defaultOperatorAddress;
  }

  const params = new URLSearchParams(window.location.search);
  return (
    params.get("operator") ??
    params.get("operatorAddress") ??
    collection.defaultOperatorAddress
  ).trim();
}

export function nftRouteOperatorParam() {
  if (typeof window === "undefined") {
    return "";
  }

  const params = new URLSearchParams(window.location.search);
  return (params.get("operator") ?? params.get("operatorAddress") ?? "").trim();
}

export function nftCollectionUrl(
  collection: NftCollectionDefinition,
  operatorAddress = collection.defaultOperatorAddress,
) {
  const params = new URLSearchParams();
  params.set("nft", "1");
  params.set("collection", collection.name);
  params.set("operator", operatorAddress || collection.defaultOperatorAddress);
  return `/?${params.toString()}`;
}

export function akLayerFilename(layer: AkLayerConfig, index: number) {
  const suffix = layer.hasLeadingZeros ? String(index).padStart(2, "0") : index;
  return `${layer.prefix}${suffix}.png`;
}

export function akLayerPath(layer: AkLayerConfig, traits: AkTraits) {
  const index = Math.max(
    0,
    Math.min(layer.count - 1, Math.floor(traits[layer.id] ?? 0)),
  );
  return `${AK_LAYER_BASE_PATH}/${layer.folder}/${akLayerFilename(layer, index)}`;
}

export function randomAkTraits(): AkTraits {
  return Object.fromEntries(
    AK_LAYERS.map((layer) => [
      layer.id,
      Math.floor(Math.random() * layer.count),
    ]),
  );
}
