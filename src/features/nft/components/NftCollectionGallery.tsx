import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { mempoolTxUrl } from "../../../shared/bitcoin/networks";
import { shortAddress } from "../../../functions";
import type { AkMintRecord, NftCollectionDefinition } from "../nftProtocol";
import {
  DataList,
  ResponsiveGrid,
} from "../../../shared/components/PublicLayout";

export function NftCollectionGallery({
  collection,
  confirmedCount,
  mints,
  operatorAddress,
}: {
  collection: NftCollectionDefinition;
  confirmedCount: number;
  mints: AkMintRecord[];
  operatorAddress: string;
}) {
  const [selectedTokenIdentifier, setSelectedTokenIdentifier] = useState("");
  const selectedMint =
    mints.find((mint) => mint.tokenIdentifier === selectedTokenIdentifier) ??
    mints[0] ??
    null;

  return (
    <section className="id-launch-card product-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Explorer</p>
          <h3>{collection.displayName} indexer</h3>
        </div>
        <strong>{confirmedCount.toLocaleString()} confirmed</strong>
      </div>
      <DataList
        items={[
          { label: "Operator", value: shortAddress(operatorAddress) },
          { label: "Collection", value: collection.id },
        ]}
      />

      {mints.length === 0 ? (
        <div className="empty-state">
          <strong>No valid {collection.displayName} mints indexed yet.</strong>
          <span>Change operator address or refresh after a mint confirms.</span>
        </div>
      ) : (
        <>
          {selectedMint ? (
            <div className="nft-gallery-feature">
              <div className="nft-pixel-stage nft-gallery-image">
                <img
                  alt={`${collection.displayName} selected NFT`}
                  src={selectedMint.imageDataUrl}
                />
              </div>

              <div className="nft-gallery-copy">
                <div>
                  <p className="eyebrow">Selected NFT</p>
                  <h3>
                    {collection.displayName} #
                    {String(
                      Math.max(
                        1,
                        mints.findIndex(
                          (mint) =>
                            mint.tokenIdentifier ===
                            selectedMint.tokenIdentifier,
                        ) + 1,
                      ),
                    ).padStart(4, "0")}
                  </h3>
                </div>
                <DataList
                  items={[
                    {
                      label: "Genesis Tag",
                      value: selectedMint.genesisTag || "No Genesis Tag",
                    },
                    {
                      label: "Owner",
                      value: shortAddress(selectedMint.ownerAddress),
                    },
                    { label: "Token", value: selectedMint.tokenIdentifier },
                  ]}
                />
                <a
                  className="secondary small link-button"
                  href={mempoolTxUrl(selectedMint.txid, selectedMint.network)}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="button-content">
                    <span>Open tx</span>
                    <ArrowUpRight size={14} />
                  </span>
                </a>
              </div>
            </div>
          ) : null}

          <ResponsiveGrid variant="tight">
            {mints.map((mint, index) => (
              <button
                className={`nft-mint-tile${
                  selectedMint?.tokenIdentifier === mint.tokenIdentifier
                    ? " is-selected"
                    : ""
                }`}
                key={mint.tokenIdentifier}
                onClick={() => setSelectedTokenIdentifier(mint.tokenIdentifier)}
                type="button"
              >
                <div className="nft-pixel-stage nft-gallery-image">
                  <img
                    alt={`${collection.displayName} ${shortAddress(mint.txid)}`}
                    src={mint.imageDataUrl}
                  />
                </div>
                <strong>
                  {collection.displayName} #{String(index + 1).padStart(4, "0")}
                </strong>
                <span>{mint.confirmed ? "Confirmed" : "Pending"}</span>
                <span>{mint.genesisTag || shortAddress(mint.ownerAddress)}</span>
              </button>
            ))}
          </ResponsiveGrid>
        </>
      )}
    </section>
  );
}
