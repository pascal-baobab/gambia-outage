# Governance

Gambia Outage is a public good for The Gambia. This document says who decides what
today, how that changes as the community grows, and the constraints that make a
takeover — by anyone, including the founder — impossible.

## The three assets (and why they're separate)

| Asset | Today | Trajectory |
|---|---|---|
| **The code** | AGPL-3.0, belongs to everyone, irrevocably | Unchanged forever — you cannot "take back" what is already everyone's |
| **The official instance** (gambiaoutage.com + its data) | Operated by the founder | Transferable to Gambian stewardship as it matures |
| **The brand** (name, logo, domain, this GitHub org) | Held by the founder in trust | Transfers together with governance |

"Giving the project back to The Gambia" means progressively transferring rows 2
and 3, and sharing row 1. Decoupling them is what makes the promise concrete
instead of rhetorical.

## Phase A — Stewardship (now)

- The founder is the maintainer and has final say on merges and releases.
- All decisions happen **in public**: issues, pull requests and GitHub Discussions —
  not private chats.
- Substantial or privacy-relevant changes go through a public RFC (an issue with the
  `rfc` label) before implementation.

## Phase B — Maintainer team

The entry rule is mechanical, not political: **sustained, substantial contributions
over ~6 months + demonstrated respect for the privacy invariants → invitation as
maintainer**, with merge rights scoped via CODEOWNERS. Gambian and diaspora
contributors are explicitly encouraged — the bar is the same for everyone.

Maintainers who go inactive for 12 months rotate to emeritus (no hard feelings,
re-entry by the same rule).

## Phase C — Gambian stewardship

When the project has **2–3 active Gambian maintainers**, a steering group forms:

- the GitHub org becomes multi-owner (no single person can lock anyone out);
- the domain, the official instance and any funds move to the steering group or a
  neutral fiscal host (e.g. Open Collective) — never to personal accounts;
- the founder becomes one voice among several.

## Anti-capture constraints (permanent, all phases)

1. **AGPL-3.0 forever.** Anyone may fork, nobody may close. A hostile or corporate
   fork must publish its changes — the community can always merge improvements back.
2. **DCO, never a CLA.** Contributors keep their copyright. With copyright
   distributed across every contributor, *relicensing the project proprietary is
   legally impossible* — for any future steward, founder included. This is
   deliberate and permanent.
3. **No single entity — company, NGO, university or agency — may hold exclusive
   control.** Organizations are welcome to contribute maintainers and resources
   under the same rules as individuals.
4. **Decisions in public, or they didn't happen.**

## Disputes

Raised as issues, decided by the maintainer(s) after public discussion. If the
maintainers are split, the status quo holds until consensus. Code-of-conduct
matters: see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
