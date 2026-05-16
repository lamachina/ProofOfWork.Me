import { useRef } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import {
  AK_LAYERS,
  akLayerPath,
  randomAkTraits,
  type AkTraits,
} from "../nftProtocol";
import { ActionRow } from "../../../shared/components/PublicLayout";

export function NftAkGenerator({
  busy,
  imageDataUrl,
  setImageBase64,
  setImageDataUrl,
  setTraits,
  traits,
}: {
  busy: boolean;
  imageDataUrl: string;
  setImageBase64: (value: string) => void;
  setImageDataUrl: (value: string) => void;
  setTraits: (value: AkTraits | ((current: AkTraits) => AkTraits)) => void;
  traits: AkTraits;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewLayers = AK_LAYERS.map((layer) => akLayerPath(layer, traits));

  const composeCurrent = async () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    canvas.width = 60;
    canvas.height = 20;
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, canvas.width, canvas.height);

    for (const source of previewLayers) {
      await new Promise<void>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve();
        };
        image.onerror = () => reject(new Error(`AK layer failed: ${source}`));
        image.src = source;
      });
    }

    const dataUrl = canvas.toDataURL("image/png");
    setImageDataUrl(dataUrl);
    setImageBase64(dataUrl.split(",")[1] ?? "");
  };

  return (
    <div className="id-launch-card product-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Generator</p>
          <h3>Visual AK</h3>
        </div>
      </div>

      <div aria-label="AK preview" className="nft-pixel-stage nft-preview-stage">
        {imageDataUrl ? (
          <img
            alt="Selected AK"
            src={imageDataUrl}
          />
        ) : (
          previewLayers.map((source, index) => (
            <img
              alt=""
              className="layer"
              key={source}
              src={source}
              style={{ zIndex: index }}
            />
          ))
        )}
      </div>

      <ActionRow>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => {
            setTraits(randomAkTraits());
            setImageDataUrl("");
            setImageBase64("");
          }}
          type="button"
        >
          <span className="button-content">
            <RefreshCw size={15} />
            <span>Generate</span>
          </span>
        </button>

        <button
          className="primary"
          disabled={busy}
          onClick={() => void composeCurrent()}
          type="button"
        >
          <span className="button-content">
            <CheckCircle2 size={16} />
            <span>Select</span>
          </span>
        </button>
      </ActionRow>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
