# VISION — Gambia Outage beyond outage reporting

> Free-flow product vision captured 2026-06-10 (owner's notes, structured into phases).
> Status: **aspirational roadmap** — nothing here is committed work. Each phase must be
> re-validated against the core invariants in `CLAUDE.md` (anonymity, rl_key isolation,
> mobile-first lite mode) before implementation.

## North Star

Gambia Outage started as "Report the Dark" — but the real spirit is **social aggregation
for The Gambia and Senegal**: a zero-barrier platform where people find each other,
trade services, move around, share art, and understand their own country. The long-term
dream: a system that, with AI assistance, becomes **self-sustaining and community-maintained**.

---

## Phase 1 — Engage & retain (in-app utilities, low backend risk)

Small, self-contained features that make the app worth opening daily even when the power is on.

### 1.1 Avatar & visual identity refresh
- Current avatar set ("ushers" graphics) is good but needs polish.
- **Create at least 30 new avatars.**
- ⚠ Palette correction: current art leans too heavily on black/dark tones, which blends
  into the dark UI and doesn't flatter dark skin tones. Shift to **white / cream / light
  backgrounds** and brighter accents so faces and figures read clearly.

### 1.2 Notification center (top corner)
- Replace the current top-corner element (DIEYE) with a **Notifications button**.
- Single bell: app notifications + (later) message/contact notifications from other users.
- This is the UI anchor that Phase 2 messaging will plug into.

### 1.3 Full-screen calculator
- Very simple iPhone-style calculator **with memory (M+, M-, MR, MC)**, full screen.
- Pure frontend; zero backend cost; useful in markets/shops.

### 1.4 Photo-Crush mini-game
- Very simple Candy-Crush-style match game, **personalizable**: the user pre-loads their
  own photos and the board uses them as tiles.
- Entertainment during outages (offline-capable fits the PWA).

---

## Phase 2 — Real user-to-user interaction

The pivot from "broadcast app" to "social app". **Hardest privacy phase** — every feature
here must preserve invariant #4 (pseudonym ≠ reporter, no rl_key on social rows).

### 2.1 Direct messaging
- User-to-user messages, building on the existing GitHub project **myb-chat**
  (already online — evaluate reuse vs. port into the PB stack).
- Notifications surface in the Phase 1.2 bell.

### 2.2 Ephemeral media uploads
- Users can upload **photos, videos, and PDFs**.
- **Hard TTL: max 1 week**, then auto-deleted (cron purge — same pattern as `go_decay`).
- Keeps storage bounded and lowers moderation burden; moderator hard-delete
  (`go.modDelete`) must cover media from day one.

---

## Phase 3 — Community marketplace & culture

### 3.1 Service/business cards ("schede")
- Per-person listing cards for people offering work: car/machine repairs, goods for
  sale, trades, services.
- Goal: multiply micro-communities around real local economy, not just outages.
- Attribution to pseudonym only; needs `ip_key`-style anti-abuse like community links.

### 3.2 Artists section
- Artists post their **concerts, YouTube releases, performances**.
- Build the music & arts community — there is currently **no aggregator** for art in
  The Gambia. This is a gap the app can own.

---

## Phase 4 — Civic transparency (the investigative pillar)

- A section exposing **official government documents** with plain explanations of real
  costs: import/export operations, residency/regularization, obtaining documents.
- Genuine investigations and analysis — the owner has observed The Gambia closely for
  4 years and can produce meaningful analysis.
- **Tone guardrail:** not anti-government — the goal is *understanding through evidence*,
  AI-assisted curation, social aggregation around facts. (Matches the existing copy rule:
  neutral / evidence-based.)
- Long-term dream: AI-managed, **community-self-maintained** knowledge system that grows
  over months as AI capability grows.

---

## Phase 5 — TukTukLife (transport platform)

The most ambitious standalone product. Tuk-tuks are the only transport in The Gambia with
a **well-defined fixed price**, hundreds of registered vehicles.

- Drivers register their tuk-tuk inside Gambia Outage (they're all officially registered,
  so onboarding maps to a real registry).
- Riders call a tuk-tuk via **GPS** to their location at the known fixed price —
  Uber/Yango-style (cf. Yango in Senegal), but price-deterministic.
- **Infra reality check:** real-time GPS dispatch needs its **own dedicated server** —
  do not co-host with the PB instance. Put in pipeline now, build later.
- Rollout: **free at launch to test adoption**; monetization reasoning deferred.

---

## Phase 6 — Superlumo bridge & social initiatives

- Existing GitHub project **superlumo.com** could one day connect via **competitions
  ("gare")** and social initiatives.
- Same spirit: aggregate people across Gambia **and Senegal** through shared events.
- Deliberately last: depends on the social fabric built in Phases 2–4.

---

## Cross-cutting constraints (apply to every phase)

| Constraint | Why |
|---|---|
| Anonymity invariants (CLAUDE.md #1–#4) hold everywhere | Messaging/marketplace must never link back to outage reports |
| Mobile-first, aggressive-lite | Everything must work on cheap phones / 3G |
| EN/FR/AR i18n from day one per feature | Existing contract (`en.ts`) — no English-only social surfaces |
| Moderation coverage | Every new content type joins `go.modDelete` + `mod_log` |
| Storage discipline | Media TTL (1 week), quotas per `ip_key`, dedicated infra for TukTukLife |
| Light palette direction | More white/cream surfaces; dark-on-dark art doesn't serve users with dark skin |

## Suggested sequencing logic

1. **Phase 1** is shippable piecemeal with today's stack (frontend-only or tiny hooks).
2. **Phase 2** unlocks everything social — do it before marketplace/artists so those
   sections launch with messaging built in.
3. **Phases 3–4** are content/community plays on the same infra.
4. **Phase 5** waits for dedicated infrastructure and a monetization decision.
5. **Phase 6** is the horizon bet.
