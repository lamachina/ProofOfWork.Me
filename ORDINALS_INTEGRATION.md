# Ordinals Integration

ProofOfWork.Me should treat Ordinals as a second Bitcoin-native data carrier for the same ProofOfWork protocol, not as a separate product with a separate identity.

The core idea:

```text
ProofOfWork protocol
├── OP_RETURN carrier
│   ├── pwm1: mail
│   ├── pwid1: IDs
│   └── future prefixes
└── Ordinals carrier
    ├── pwm1 mail inscriptions
    ├── pwid1 ID inscriptions, if useful later
    └── richer file/media/content inscriptions
```

## Product Direction

The app should keep one Apple-level ProofOfWork Computer UI and apply it to both protocol carriers.

Users should feel like they are using one Bitcoin-native computer:

```text
ProofOfWork Computer
├── Mail
├── Files
├── IDs
├── Ordinals
└── Settings
```

The UI language should stay consistent across OP_RETURN and Ordinals:

- Same navbar, sidebar, split views, detail panels, light/dark mode, and file desktop.
- Same account and address treatment.
- Same status badges, sats/value display, refresh behavior, and explorer links.
- Same mental model: Bitcoin data appears as mail, files, IDs, and activity.

The protocol layer changes, but the product should not feel fragmented.

## Why Ordinals

OP_RETURN is excellent for small direct messages, registry records, and compact files. Ordinals are better for richer on-chain artifacts because inscription content can be larger, transferable, and indexed by inscription-aware infrastructure.

Ordinals should become the high-capacity, media-rich version of the same ProofOfWork protocol.

## Important Technical Distinction

OP_RETURN stores data in an unspendable transaction output.

Ordinal inscriptions store content in Taproot witness data during a reveal transaction, then an indexer tracks the inscribed sat as it moves through outputs.

From the app perspective, both can be normalized as ProofOfWork records:

```text
ProofOfWork record
├── carrier: op_return | ordinal
├── protocol: pwm1 | pwid1 | future prefix
├── txid
├── owner / sender
├── receiver
├── value sats
├── content
└── status
```

## ProofOfWork Mail On Ordinals

Ordinals mail should still use the `pwm1` protocol identity.

Possible compact inscription body:

```text
pwm1:{"t":"mail","to":"user@proofofwork.me","s":"Subject","b":"Body text","r":"reply_tx_or_inscription_id"}
```

Possible richer inscription format:

```json
{
  "v": 1,
  "type": "mail",
  "to": "user@proofofwork.me",
  "from": "sender@proofofwork.me",
  "subject": "Subject",
  "body": "Body text",
  "replyTo": "txid_or_inscription_id",
  "attachments": []
}
```

The app can identify it as ProofOfWork mail because it uses the same `pwm1` protocol, even though the carrier is Ordinals instead of OP_RETURN.

## ProofOfWork Files On Ordinals

Ordinals can become the stronger file layer:

- Images
- PDFs
- Audio
- HTML/SVG
- Rich media
- Larger documents
- Permanent artifacts

The existing Files desktop UI can show both OP_RETURN files and Ordinal files together, with carrier badges:

```text
README.md       OP_RETURN
image.png       Ordinal
audio.mp3       Ordinal
```

Users should not have to care about the carrier unless they want to inspect technical details.

## Infrastructure

The long-term infrastructure stack should be:

```text
Bitcoin Core full node
        |
        |-- mempool stack
        |     transaction status, fee market, explorer, raw tx/block APIs
        |
        |-- ord server/indexer
              inscriptions, inscription IDs, content, ownership, recursive endpoints
```

Bitcoin Core should run with `txindex=1` so Ordinals infrastructure can index properly.

Mempool gives ProofOfWork.Me strong Bitcoin transaction visibility. `ord` gives the app inscription-specific visibility.

## Read Path

The app should normalize records from both systems into one internal model:

```text
OP_RETURN scan -> ProofOfWork record
Ordinals scan  -> ProofOfWork record
```

Then the UI decides where each record belongs:

- Mail
- Files
- IDs
- Activity
- Future marketplace views

This keeps the frontend coherent and avoids building two separate computers.

## Write Path

Start with read-only Ordinals support.

Later, add writing/inscribing after the infrastructure and wallet flow are proven.

Inscribing is more complex than OP_RETURN because it involves commit/reveal transactions, fee handling, inscription ownership, and wallet compatibility. It should be added carefully after the read path is stable.

## Phased Plan

### Phase 1: Infrastructure

- Finish Bitcoin Core setup with `txindex=1`.
- Add mempool stack.
- Add `ord` server/indexer.
- Keep services isolated and observable.

### Phase 2: Read-Only Ordinals Computer

- Add Ordinals section to the existing ProofOfWork Computer UI.
- Show inscriptions owned by the connected address.
- Display inscription content, content type, inscription ID, txid, owner, value, and explorer links.
- Use the same Files desktop visual system where possible.

### Phase 3: Protocol-Aware Ordinal Records

- Detect inscriptions whose content starts with ProofOfWork protocol prefixes like `pwm1:`.
- Surface `pwm1` ordinal inscriptions inside Mail.
- Surface file-like ordinal inscriptions inside Files.
- Add carrier badges so users can distinguish OP_RETURN vs Ordinal when needed.

### Phase 4: Inscription Creation

- Add a disciplined inscription composer.
- Support ProofOfWork mail/file inscription formats.
- Handle commit/reveal status tracking.
- Prevent confusing partial states by using clear pending, revealed, confirmed, and failed statuses.

## Guiding Principle

ProofOfWork.Me is the protocol and the computer.

OP_RETURN and Ordinals are carriers.

The user experience should feel like one coherent Bitcoin-native operating system for messages, identities, files, and artifacts.
