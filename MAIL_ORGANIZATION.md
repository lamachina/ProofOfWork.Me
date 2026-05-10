# Mail Organization

Notes for mailbox features that make ProofOfWork.Me feel like a normal mail app while respecting Bitcoin permanence.

## Current Launch Status

The Phase 1 public launch surfaces are:

```text
proofofwork.me              landing page
id.proofofwork.me           focused ProofOfWork ID registry onboarding app
computer.proofofwork.me     full mailbox/computer app
```

Mail organization features that are already implemented in the full app:

- Incoming vs Inbox split for unconfirmed/confirmed inbound mail.
- Outbox vs Sent split for pending/dropped/confirmed sent mail.
- Drafts in local storage.
- Archive and Favorites in local storage.
- Contacts in local storage.
- User-created custom folders in local storage.
- Optional Subjects written into the OP_RETURN mail protocol.
- CC compose support for visible additional recipients.
- Multi-recipient compose with removable recipient chips.
- Reply All for multi-recipient mail.
- Files view for confirmed attachments.
- Export/import for local drafts, archive/favorite preferences, theme, and sent/outbox tracking.
- Confirmed-only ID routing in compose: pending IDs must not receive routed mail.
- First-party OP_RETURN API reads for production mainnet mail, files, registry, and tx status when `VITE_POW_API_BASE` is configured.

Future developers should keep `id.proofofwork.me` narrow. Do not pull the full mailbox UI into the Phase 1 registry launch unless the launch scope explicitly changes.

## Core Idea

Messages written to Bitcoin are permanent. The app should not pretend users can delete them from the chain.

Instead, ProofOfWork.Me can provide local mailbox organization:

- Archive messages to remove them from Inbox.
- Favorite important messages.
- File confirmed messages into user-created local folders.
- Keep All Mail available so archived messages are still reachable.
- Keep Sent as local sent history.
- Send one message to multiple recipients without duplicating the OP_RETURN payload.

This gives users normal mail hygiene without misrepresenting what happens on-chain.

## Suggested Folders

```text
Incoming
Inbox
Sent
Outbox
Drafts
Files
Favorites
Archive
Custom folders
All Mail
```

Folder behavior:

- Incoming shows inbound messages that are visible in mempool but not confirmed.
- Inbox shows confirmed received messages that are not archived.
- Sent shows confirmed messages sent by the connected account, recovered from chain data when possible.
- Outbox shows local or chain-detected sent attempts that are pending in mempool or dropped.
- Drafts shows the connected account's local unsent message.
- Files shows confirmed messages from Inbox and Sent that contain attachments.
- Favorites shows starred confirmed Inbox and Sent messages, including archived favorites.
- Archive shows archived messages.
- Custom folders show confirmed mail the user filed locally under that folder name.
- All Mail shows everything the app knows about, including archived messages.

## Files

Files is a derived view, not a separate storage layer.

The app should scan confirmed known mail and show only messages with attachments. Pending Incoming messages or pending/dropped Outbox attempts should not appear in Files by default because they are not durable on-chain records.

The default Files experience should feel more like a desktop/file manager than an email reader:

- Browse attachments across Inbox and Sent.
- Display files in a desktop-style icon grid.
- Show image thumbnails when possible.
- Show clean file icons for PDFs, documents, and other files.
- Filter by file type: all files, images, PDFs, documents, and other.
- Sort by highest sats, newest, oldest, thread, largest file, file type, or address.
- Select a file to see a details inspector.
- Download from the inspector.
- Keep `Open Message` as an explicit option for viewing the source mail/thread.

This creates a Finder/Gmail/Google Drive style attachment surface while staying serverless. The file bytes still come from valid ProofOfWork.Me OP_RETURN payloads, and the source message remains available without dominating the Files view.

## Outbox

Outbox is local broadcast tracking for transactions that have not become durable on-chain mail yet.

Broadcast attempts should have one of these statuses:

```text
Pending
Confirmed
Dropped
Checking
```

Behavior:

- New broadcasts enter Outbox as Pending.
- The app checks the txid through the selected mempool.space network route.
- Confirmed txs move into Sent.
- Confirmed sent mail is also reconstructed from the connected address transaction history, so Sent and Files survive stale local browser state.
- Dropped txs remain in Outbox with a restore-to-draft action.
- Dropped txs should not appear in Sent or Files.
- Pending txs should not appear in Files by default.
- Pending visibility is best-effort because mempool transactions are gossip. The API can merge local node/indexer mempool state with a pending fallback, but confirmation is the only durable state.
- Older local sent records without a known status can appear as Checking until the txid is verified.

This prevents the app from treating dropped mempool transactions as permanent mail.

## Incoming

Incoming is the inbound mirror of Outbox.

Behavior:

- Unconfirmed inbound ProofOfWork.Me payments appear in Incoming.
- Once confirmed, inbound mail moves into Inbox.
- Incoming messages can be viewed and replied to, but should not be archived as permanent mail until confirmed.
- Incoming attachments should not appear in Files until the transaction confirms.
- Self-sends can appear in both Incoming and Outbox while pending, then Inbox and Sent once confirmed.

## Refresh

Refresh is a single on-demand sync action for the connected account.

Behavior:

- Rescan the connected address for incoming and sent ProofOfWork.Me protocol transactions.
- Rebuild Incoming, Inbox, Sent, and Files from the latest chain/mempool view.
- Check pending, dropped, and checking Outbox txids against the selected mempool.space route.
- Move confirmed inbound mail into Inbox, and confirmed broadcasts into Sent and Files.
- Keep pending Incoming or pending/dropped Outbox records out of Files until they become durable chain records.
- Show a concise status summary after refresh.

## Local State

Drafts, archive, and favorite state can stay serverless at first.

Drafts:

- Store one draft per wallet address and network at first.
- Save recipient, CC recipient, subject, sats, fee rate, message body, attachment, reply parent txid, and update time.
- Keep drafts in `localStorage`; they are not written on-chain.
- Clear the draft after successful broadcast or explicit discard.
- Key drafts by `network + address`.

Archive and favorite preferences:

Store local message preferences and custom folder assignments in `localStorage`, keyed by:

```text
folder-network-txid
```

Example shape:

```json
{
  "inbox-testnet4-e3760f38...": {
    "archived": true,
    "favorite": false,
    "folders": ["projects"]
  }
}
```

When the app scans inbox or loads sent mail, it should merge blockchain/local messages with these local flags.

Custom folders:

- Store the folder list locally in `localStorage`.
- Folder membership is local metadata keyed to known message txids.
- Only confirmed Inbox/Sent mail should be fileable so folders do not imply dropped or temporary mempool data is durable.
- Custom folder names should remain user-controlled; the app only normalizes whitespace and keeps the local UX tidy.

Contacts:

- Store contacts locally in `localStorage`.
- A contact can be a Bitcoin address or a confirmed `user@proofofwork.me` ID resolved to its receive address.
- Pending IDs should not be saved as routable contacts.
- Confirmed registry rows can expose an `Add Contact` action next to `View TX`.
- Compose should offer saved contacts as suggestions.
- Contacts are convenience metadata only; they do not change on-chain mail routing.

Multi-recipient mail:

- Compose accepts addresses, confirmed ProofOfWork IDs, and saved Contacts separated by commas, semicolons, or new lines.
- The To field and CC field both resolve through the same confirmed-ID/address logic.
- Each resolved recipient gets a normal BTC payment output before the first `pwm1:` OP_RETURN output.
- The OP_RETURN payload is written once per transaction, so all recipients share the same txid and thread root.
- The reader derives recipients from payment outputs, not OP_RETURN data.
- To/CC labels are local sender-side organization metadata. Recipients can see payment outputs on-chain, but the protocol does not currently make role labels authoritative for every recipient.
- Reply targets the sender; Reply All targets the sender plus other payment-output recipients, excluding the connected wallet address.
- Keep the current cap at 10 recipients until wallet signing UX and fee estimates have more production mileage.

Subject:

- Write optional subjects as `pwm1:s:<subject-base64url>`.
- Keep subjects short in the UI, but let the aggregate OP_RETURN transaction cap remain the hard protocol limit.
- Fall back to the first message line or attachment name for older mail without a subject field.

## Product Language

Use:

```text
Archive
Favorite
Unarchive
Remove favorite
All Mail
```

Avoid:

```text
Delete
Trash
Erase
Remove from chain
```

The user can hide messages from views, but the app should be honest that on-chain messages remain permanent.

## Backup And Import

Local state should be portable because ProofOfWork.Me is serverless.

Backup should export a versioned JSON file containing only supported app-local data:

- Drafts keyed by wallet address and network.
- Archive and favorite preferences.
- Custom folder definitions and folder membership.
- Local contacts.
- Local sent/outbox broadcast tracking.
- Theme preference.

Import should validate the JSON before writing anything, ignore unsupported keys, and restore only ProofOfWork.Me local storage keys. It must not include wallet private keys, seed phrases, UniSat connection state, or anything outside app-local UX data.

## UI Notes

Useful controls:

- Archive button in the reader toolbar.
- Favorite star in the reader toolbar.
- Favorite marker in message rows.
- Sidebar counts for Inbox, Sent, Favorites, and Archive.
- Sidebar count for Drafts.
- Sidebar count for Files.
- Empty states for Favorites and Archive.
- Empty state for Files when no attachments are available.

Useful sorting:

- Highest sats.
- Newest.
- Oldest.
- Thread.
- Favorites first, if needed later.
- Largest attachment and file type for Files.

## Sync Considerations

At first, archive/favorite state is local to the browser.

That means:

- It is private.
- It is simple.
- It works without a server.
- It does not follow the user across browsers/devices.

Later options:

- Export/import mailbox preferences.
- Encrypted backup tied to a ProofOfWork.Me ID.
- Optional server-side encrypted preference sync.
- Optional wallet-signed preference records.

The first implementation should stay local and simple.

## Leaderboard

ProofOfWork.Me can add a leaderboard to show which accounts or IDs receive the most sats through messages.

This turns paid mail into a visible attention market:

- More sats received means more value, attention, or signal.
- Public rankings make the app feel alive.
- Users can discover high-signal accounts.
- Recipients have an incentive to share their ProofOfWork.Me address or ID.
- It adds a game layer without changing the core mail protocol.

Possible leaderboard views:

```text
Top Receivers
Top ProofOfWork.Me IDs
Most Messages Received
Highest Single Message
Most Replies
Trending This Week
```

Possible ranking windows:

```text
Today
7 days
30 days
All time
```

Possible ranking metrics:

- Total sats received.
- Number of messages received.
- Highest single message value.
- Number of unique senders.
- Reply activity.
- Thread activity.

Before ProofOfWork.Me IDs exist, the leaderboard can rank raw Bitcoin addresses.

After IDs exist, the leaderboard should prefer names like:

```text
user@proofofwork.me
```

The leaderboard can still fall back to raw addresses when no ID is registered.

Important design note:

- The leaderboard should only count valid ProofOfWork.Me protocol messages.
- It should not count random payments or unrelated OP_RETURN transactions.
- Archived/favorited local state should not affect public ranking.
- The leaderboard should be computed from indexed chain data, not local browser state.

## Big Picture

Archive, Favorites, and Files make ProofOfWork.Me feel like a real mail client.

They also fit the Bitcoin model:

- Bitcoin keeps the permanent record.
- The app gives users a personal view over that record.
- No delete fiction is needed.
- Leaderboards make paid attention visible and social.
