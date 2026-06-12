# Security Policy

Gambia Outage promises anonymous outage reporting. A vulnerability here is not just
a bug — it can put real people at risk. We take every report seriously and we are
grateful for them.

## What counts as a vulnerability (especially)

- Anything that **links a report to a person, device, account or pseudonym**
  (de-anonymization) — the highest-severity class for this project.
- Ways to **defeat the Sybil/trust layer** at scale (forging "confirmed" outages or
  restores beyond the documented rate caps).
- Classic web vulnerabilities in the PWA, the PocketBase hooks, or the API
  (injection, authz bypass, XSS, CSRF, SSRF…).
- Leaks of hidden fields (`rl_key`, `ip_key`) through any API path.

The honest, known residual channels are documented in
[docs/PRIVACY.md](docs/PRIVACY.md) §7 — findings that go *beyond* what is stated
there are exactly what we want to hear about.

## How to report — privately, please

1. **Preferred:** GitHub → *Security* tab → **"Report a vulnerability"**
   (GitHub Private Vulnerability Reporting). Visible only to maintainers.
2. Or email **security@gambiaoutage.com**.

Please do **not** open a public issue for security problems, and please don't test
against the production instance in ways that pollute real outage data — run your
own instance instead (it takes ~10 minutes: see CONTRIBUTING.md).

## What to expect

- **Acknowledgement within 72 hours**, an assessment within 7 days.
- Fixes for de-anonymization issues take priority over everything else.
- Credit in the changelog and on the repository if you want it (or anonymity if you
  prefer — we're good at that).
- No legal action against good-faith research. Ever.

## Scope

- This repository and the official instance at `gambiaoutage.com`.
- Out of scope: third-party platforms (Cloudflare, push relays, app stores),
  volumetric DoS, social engineering of maintainers.
