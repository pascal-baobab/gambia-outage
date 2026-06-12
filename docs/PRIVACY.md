# Privacy & Anonymity — How It Actually Works

Gambia Outage asks people to report power cuts. In a small country, that only works
if reporting is **genuinely anonymous** — not "anonymous" as a marketing word, but as
a property of the system that holds even against the people who run it.

This document explains the design technically, with pointers into the actual code.
**Don't trust us — read it, test it, try to break it.** If you find a hole,
see [SECURITY.md](../SECURITY.md).

---

## The short version

- **No account, no phone number, no email, no name.** You can report a power cut the
  second you open the app. There is nothing to sign up for.
- **A report stores no identity.** It is a zone, a status (OUT/BACK), and an optional
  location *rounded to ~1.1 km* before it is written to disk.
- **The anti-abuse keys are salted hashes that die every day.** Even a full copy of
  the database cannot tell you who reported yesterday.
- **Your community pseudonym lives on your phone** and is mathematically separate
  from your reports. An automated test suite fails the build if anyone tries to
  connect the two.

---

## 1. What a report row actually contains

When you tap OUT or BACK, the server stores
([`pb/pb_hooks/reports_create.pb.js`](../pb/pb_hooks/reports_create.pb.js)):

| Field | Content | Identity risk |
|---|---|---|
| `zone` | e.g. `wcr-brikama` | none — shared by thousands |
| `type` / `severity` | out / back | none |
| `lat`, `lng` (optional) | **rounded to 2 decimals (~1.1 km)** before persisting — see "GPS privacy AT REST" in the create hook | coarse by construction; raw GPS is never written |
| `note` (optional) | free text, hard-capped at 140 chars | don't put your name in it |
| `client_uuid` | random ID generated **per report** (offline replay/dedupe key, [`web/src/lib/outbox.ts`](../web/src/lib/outbox.ts)) | not a device ID — a new one per report |
| `rl_key`, `ip_key` | salted hashes, **hidden** (never returned by any API), see §2 | daily-rotating, see below |

There is **no `account_id` field on reports** — and a test asserts the schema and the
create hook to keep it that way (§5).

## 2. The anti-abuse keys: `rl_key` and `ip_key`

Anonymous + write-open = abuse magnet, so the system needs *some* way to rate-limit
and count distinct reporters. It does this with two salted hashes
([`pb/pb_hooks/lib/go.js`](../pb/pb_hooks/lib/go.js)):

```
rl_key = sha256( IP + UserAgent[0:40] + DAILY_SALT )   // "one device today"
ip_key = sha256( 'ip:' + IP + DAILY_SALT )             // "one network egress today"
```

Properties that matter:

- **Used only for throttling, dedupe and distinct-reporter counting.** They gate how
  *many* reports get in and how much weight they carry — nothing else reads them.
- **`hidden: true`** on the collection: no API response ever contains them.
- **`DAILY_SALT` rotates every day** (cron, 00:05 Banjul time). After rotation,
  yesterday's keys cannot be recomputed — not by an attacker with a database dump,
  and not by us. Cross-day linkage of a device's reports is cryptographically dead.
- The keys are *deliberately* stable **within** one day: that is what lets the trust
  layer count "distinct reporters in the last 60 minutes" and cap Sybil attacks
  (one IP rotating browser User-Agents is capped at `distinctIPs × IP_DEVICE_MULT`).

## 3. Pseudonyms are a separate universe

The community features (posts, comments, XP, Wall of Honor) use a device-local
identity ([`web/src/lib/account.ts`](../web/src/lib/account.ts)):

```
secret     = 256 random bits          // generated on your phone, stored ONLY in localStorage
account_id = sha256(secret)           // the public pseudonym key
```

- The secret **never leaves your device**. There is no login, no phone, no email —
  the server cannot send you a password reset because it has nothing to send it to.
- Social rows carry `account_id`. Report rows carry **no** `account_id`. The two
  systems share no key, so the join "which person wrote this post AND reported that
  outage" does not exist in the data model.

## 4. XP without linkage: the claim nonce

Reports earn XP — which sounds like it requires linking reports to accounts. It
doesn't. The flow (`mintGrant` / `claimGrant` in `go.js`):

1. Your device generates a random **claim nonce** and sends it with the report.
2. The server mints an `xp_grants` row containing **only**
   `{ nonce_hash, xp, kind, badge, week_id }`. The code comment is the contract:
   *"NEVER store report id / client_uuid / rl_key here."*
3. Later, your device redeems the nonce against your `account_id`.

The redemption joins *nonce → account*. The grant row never pointed at the report,
so the chain *report → account* has a missing link — by construction.

## 5. Enforced by tests, not promises

[`web/src/lib/community-anonymity.test.ts`](../web/src/lib/community-anonymity.test.ts)
runs in CI on every change and asserts, against the real migrations and hooks:

- the `reports` collection has **no** `account_id` field;
- the report create hook never sets one;
- social posts, comments, questions and answers never store `rl_key`;
- user-generated text passes PII/profanity sanitisation.

A pull request that breaks any invariant does not merge.

## 6. Push notifications

Zone alerts use the standard Web Push API. A subscription row is
**(push endpoint, zone)** — no account, no name. The per-IP subscription
rate-limit ledger (`sub_rl`) stores *only* `ip_key + created` — no endpoint, no
zone — so even within one day it cannot correlate a push subscription to a network
address. Push payloads transit Apple/Google/Mozilla relays encrypted (standard Web
Push encryption).

## 7. What the server CAN see — the honest section

Claims of perfect anonymity are how trust dies. Here is the residual surface,
stated plainly:

- **Transient IPs.** Like every web server, the machine sees your IP while serving a
  request (via Cloudflare's `CF-Connecting-IP`). It is hashed into the daily keys
  and not stored raw on reports. Standard infrastructure logs are kept minimal and
  rotate.
- **Same-day grouping is a feature.** Within one salt window, your reports share an
  `rl_key` *by design* — that's the anti-abuse mechanism. The protection is
  **cross-day unlinkability** and **no identity attached**, not invisibility inside
  a single day.
- **A malicious live operator** (as opposed to a database thief) knows *today's*
  salt, and The Gambia's IP space is small — within the current day, keys are
  brute-forceable back to IPs *by the operator*. The design defends against leaks,
  dumps, subpoenas-after-the-fact and outsiders; inside the live window you are
  trusting the operator — which is exactly why this code is open and self-hostable.
- **Timing correlation.** An XP grant is minted at the same instant as its report.
  An operator correlating row-creation timestamps with a later claim could
  *probabilistically* link an account to a report in low-traffic periods. No durable
  key links them, but timestamps exist. We state this openly; researchers are
  invited to probe it (and propose mitigations — e.g. claim batching/jitter).
- **The platform layer sees what platforms see.** Cloudflare terminates TLS in front
  of the origin; push relays see opaque encrypted payloads.

## 8. What lives on YOUR device

Everything identity-shaped is client-side, in `localStorage` / IndexedDB:
the account secret and id (`go_account_secret`, `go_account_id`), language and UI
preferences, the offline report outbox. Clearing the browser/app data erases your
pseudonym permanently — there is nothing server-side to recover it from (unless you
explicitly set a recovery password, which stores only a hash, still zero PII).

## 9. Verify it yourself

Read, in this order:

1. `pb/pb_hooks/reports_create.pb.js` — what gets stored on a report (GPS rounding, caps, geo-gate)
2. `pb/pb_hooks/lib/go.js` — key derivation, salt rotation, trust counting, XP mint/claim
3. `web/src/lib/account.ts` — the device-local pseudonym
4. `web/src/lib/community-anonymity.test.ts` — the invariants under test
5. `pb/pb_migrations/` — the actual schemas (check for yourself that `reports` has no identity field)

Run the suite: `pnpm -C web test`.

Found something? **[SECURITY.md](../SECURITY.md)** — private disclosure, please.
