# NFT Protocol

NFT is a mainnet-only ProofOfWork.Me app for minting and indexing Bitcoin-native NFT collections from transaction records. V1 ships with AK as the first supported collection and treats each collection as a decoder rule set plus an operator address to scan.

Launch credit: `machina@proofofwork.me` should be credited in public NFT docs and launch copy. This is creator/product provenance, not a protocol ownership rule; canonical NFT state still comes from confirmed Bitcoin transactions.

## Collection Subpages

Collection views are addressable by collection name and operator address. The pair is the collection identity because multiple operators can use the same collection name.

```text
/?nft=1&collection=ak21&operator=<operator-address>
/api/v1/nft?network=livenet&collection=ak21&operator=<operator-address>
```

The collection name selects the decoding rules. The operator address selects the transaction history to visualize. Minting remains restricted to the canonical AK operator in V1; custom operators are read-only collection views. `/?nft=1&collection=ak21` without an operator is not a canonical collection subpage.

## Collection Deploy Record

Valid deploy:

```text
vout0  OP_RETURN {"p":"nft","op":"deploy","name":"<collection-name>","amt":"<max-supply>"}
vout1  OP_RETURN <genesis-tag>
vout2  OP_RETURN <image-payload>
any    payment >= 1000 sats to bc1qyh9pgznpass4mjcl8qj9yxs3vvl9rnrk7whapn
```

The operator address is derived from `vin0.prevout.scriptpubkey_address`. Extra outputs, including unrelated fee/payment/change outputs, are ignored. The deploy fee payment to `bc1qyh9pgznpass4mjcl8qj9yxs3vvl9rnrk7whapn` is required in V1.

Deploy and mint transactions can contain multiple OP_RETURN payloads. The NFT app signs and finalizes those transactions locally, then submits the final raw transaction hex through the ProofOfWork Slipstream broadcast proxy instead of the normal mempool.space broadcast path.

## AK Collection Mint Record

The AK collection recognizes this exact mint payload:

```text
{"p":"nft","op":"mint","name":"ak21"}
```

Operator address:

```text
bc1qyh9pgznpass4mjcl8qj9yxs3vvl9rnrk7whapn
```

Valid mint with Genesis Tag:

```text
vout0  payment >= 1000 sats to operator address
vout1  OP_RETURN {"p":"nft","op":"mint","name":"ak21"}
vout2  payment >= 762 sats to initial owner address
vout3  OP_RETURN <genesis-tag>
vout4  OP_RETURN <image-payload>
vout5  optional change
```

Valid mint without Genesis Tag:

```text
vout0  payment >= 1000 sats to operator address
vout1  OP_RETURN {"p":"nft","op":"mint","name":"ak21"}
vout2  payment >= 762 sats to initial owner address
vout3  OP_RETURN <image-payload>
vout4  optional change
```

Image payloads are valid when they are either a `data:image/...;base64,` URL or raw PNG base64 beginning with `iVBORw0KGgo`. Readers normalize images to `data:image/png;base64,...` when needed.

## Indexed Shape

```ts
type AkMintRecord = {
  collectionId: "ak21";
  collectionName: "AK";
  txid: string;
  tokenIdentifier: string; // `${txid}:2`
  voutIndex: 2;
  ownerAddress: string;
  operatorAddress: string;
  operatorSats: number;
  genesisTag: string | null;
  imageBase64: string;
  imageDataUrl: string;
  confirmed: boolean;
  mintedHeight?: number;
  mintedTime?: number;
  createdAt: string;
  network: BitcoinNetwork;
  dataBytes: number;
};
```

## V1 Exclusions

Transfers, marketplace actions, burns, metadata mutation, founder outputs, server-side signing, custody, and `opstream.live` dependency are out of scope. Confirmed Bitcoin history is canonical; pending mempool records are visibility only.
