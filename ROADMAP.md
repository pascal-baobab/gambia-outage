# Roadmap

Direction, not deadlines. The long-range product vision lives in
[docs/VISION.md](docs/VISION.md) — phases there graduate into this file as they
firm up. Dates are deliberately absent: this is a volunteer-run public good.

## Now (active)

- **Open-sourcing & community bootstrap** — this repository, contributor docs,
  good-first-issues, translations infrastructure.
- **Reliability of the core loop** — report → trust layer → live status → push
  alerts, hardened against abuse (see `docs/PRIVACY.md` for the model).

## Next

- **Wolof & Mandinka translations** (community-led — see CONTRIBUTING.md; the i18n
  contract is ready for them).
- **Self-hosting guide** (`SELF_HOSTING.md`) + `docker-compose` one-command setup.
- **Zone coverage growth** — more quarters/villages in the search index, driven by
  user reports of missing places.
- **In-app notification center** — single anchor for app + community notifications.

## Later (from the vision, not yet committed)

- **Utility & engagement features** — offline-friendly tools that make the app worth
  opening when the power is on (see VISION.md Phase 1).
- **Richer community layer** — user-to-user messaging with the same privacy
  invariants (public RFC required before any implementation).
- **Local economy & culture** — service cards, artists/events aggregation.
- **Civic transparency** — plain-language explanations of public documents and
  costs; strictly neutral, evidence-based.
- **Replication beyond The Gambia** — the model (zones, Sybil-resistant trust layer,
  lite-first PWA) is designed to port; a Senegal instance is the dream fork.

## How things move between lanes

Substantial features start as a public RFC (issue with the `rfc` label). Anything
touching the privacy invariants additionally needs the analysis described in
CONTRIBUTING.md. Small improvements: just open a PR.
