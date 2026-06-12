# Contributing to Gambia Outage

Thank you — this project exists for The Gambia and gets better with every pair of
hands, **coder or not**.

## Ways to contribute without writing code

- **Translations.** The app ships in English, French and Arabic. **Wolof and
  Mandinka are the most wanted contributions in the whole project.** The i18n
  system is contract-based: `web/src/i18n/en.ts` defines every key; a new language
  implements the same keys (the build fails if one is missing). Open an issue with
  the `translation` label and we'll help you get set up — no programming needed,
  it's a list of sentences.
- **Zone coverage.** Know a quarter, village or neighbourhood that's missing or
  misnamed? Open an issue with the place name and where it is — the search alias
  index (`data/`) is built for exactly this.
- **Field testing.** Use the app on your phone, on your network. Screenshots of
  anything broken, confusing or slow are genuinely valuable bug reports.
- **Spreading it.** An outage map is only as good as its reporters.

## Developer setup (~10 minutes)

```bash
pnpm -C web install && pnpm -C web dev     # frontend on :5173
cd pb && ./setup.sh                         # PocketBase + migrations
./pocketbase serve --http 127.0.0.1:8090    # backend
pnpm -C data seed                           # Gambia zones + demo data
pnpm -C web test                            # run the test suite
```

Copy `.env.example` to `.env` for local configuration. The frontend dev server
proxies API calls to `127.0.0.1:8090`.

## The rules that are not negotiable

This app promises anonymity to people reporting in a small country. Two invariants
guard that promise, and **no PR that weakens them will merge**, however good it is
otherwise:

1. **Nothing may link a report to an identity.** No `account_id`, `rl_key`, `ip_key`
   or any stable device identifier may be written to, or joined with, report rows
   from social/profile/XP code. `web/src/lib/community-anonymity.test.ts` enforces
   this in CI — read it before touching `pb/pb_hooks/`.
2. **Mobile-first, lite-first.** The target device is a cheap Android phone on a 3G
   connection with data-saver on. Features must degrade gracefully: map optional,
   list-first, small payloads.

Also enforced by CI: the EN/FR/AR i18n contract (a missing key fails the build) and
secret scanning.

## Pull requests

- Branch from `main`; keep PRs focused and small.
- Sign your commits with the **DCO** (`git commit -s`, adds `Signed-off-by`). This
  keeps copyright distributed across all contributors — it's part of the project's
  anti-capture design (no CLA, ever — see GOVERNANCE.md).
- PRs touching `pb/pb_hooks/` (the trust/anonymity layer) get extra-careful review.
  Expect questions; it's not distrust, it's the job.
- UI changes: include a 390×844 mobile screenshot. That's the canonical viewport.
- First response within 7 days — usually faster. This is a small project; patience
  appreciated.

## Issues

Use the templates (bug / feature / translation / zone-coverage). `good first issue`
and `non-code` labels mark the easiest entry points. For anything security- or
privacy-sensitive: **[SECURITY.md](SECURITY.md), not a public issue.**
