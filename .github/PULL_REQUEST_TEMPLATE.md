## What & why

<!-- What does this change, and what problem does it solve? Link any issue. -->

## Privacy invariants checklist

This project promises anonymous reporting. Confirm the ones that apply:

- [ ] This PR does **not** write `account_id`, `rl_key`, `ip_key` or any stable
      device identifier onto report rows (or join social/profile/XP data with them).
- [ ] This PR does **not** weaken rate-limiting, the Sybil cap, or distinct-IP floors.
- [ ] If it touches `pb/pb_hooks/`, I've read `docs/PRIVACY.md` and the change keeps
      the invariants in `web/src/lib/community-anonymity.test.ts` passing.

## Quality checklist

- [ ] Commits are signed off (`git commit -s` — DCO).
- [ ] `pnpm -C web test` passes locally.
- [ ] UI changes include a 390×844 mobile screenshot below.
- [ ] No new English-only user-facing strings (EN/FR/AR i18n contract respected).
- [ ] No secrets, hostnames, or personal data added.

## Screenshots (for UI changes)

<!-- 390×844 mobile viewport, on seed data (never real users' content). -->
