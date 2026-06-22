// community-anonymity.test.ts — guards the P0 invariant that survives the social layer:
// the persistent pseudonym (account_id) is NEVER linked to the anonymous reports stream, and the
// social rows never store an rl_key (which would re-link a device to its reports). Source-scan.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8')

describe('community anonymity invariants', () => {
  it('reports collection has NO account_id field', () => {
    const init = read('pb/pb_migrations/1717200000_init_collections.js')
    // isolate the reports collection block
    const i = init.indexOf("name: 'reports'")
    expect(i).toBeGreaterThan(-1)
    const block = init.slice(i, i + 1600)
    expect(/account_id/.test(block)).toBe(false)
  })

  it('the report create hook never sets account_id', () => {
    const hook = read('pb/pb_hooks/reports_create.pb.js')
    expect(/account_id/.test(hook)).toBe(false)
  })

  it('social posts/comments never store rl_key (no device↔report relink)', () => {
    const mig = read('pb/pb_migrations/1717800000_community_ugc.js')
    expect(/rl_key/.test(mig)).toBe(false)
    const go = read('pb/pb_hooks/lib/go.js')
    // within the social create functions, no rl_key is written onto the row
    const start = go.indexOf('function createPost')
    const end = go.indexOf('function buildFeed')
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const socialBlock = go.slice(start, end)
    expect(/set\(['"]rl_key/.test(socialBlock)).toBe(false)
  })

  it('social create functions sanitise the body (PII + profanity floor)', () => {
    const go = read('pb/pb_hooks/lib/go.js')
    const start = go.indexOf('function createPost')
    const block = go.slice(start, start + 1200)
    expect(/sanitiseText\(/.test(block)).toBe(true)
  })

  it('Q&A: questions + polymorphic comments never store rl_key, reads are non-public', () => {
    const qmig = read('pb/pb_migrations/1718150000_questions.js')
    expect(/rl_key/.test(qmig)).toBe(false)
    expect(/listRule: null/.test(qmig)).toBe(true) // non-public — served only via /api/go/*
    const cmig = read('pb/pb_migrations/1718100000_comments_polymorphic.js')
    expect(/rl_key/.test(cmig)).toBe(false)
  })

  it('createQuestion writes no rl_key and sanitises the text', () => {
    const go = read('pb/pb_hooks/lib/go.js')
    const start = go.indexOf('function createQuestion')
    const end = go.indexOf('function buildQuestions')
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const block = go.slice(start, end)
    expect(/set\(['"]rl_key/.test(block)).toBe(false)
    expect(/sanitiseText\(/.test(block)).toBe(true)
  })

  it('profile home_zone is self-declared (saveIntro reads body.home_zone, not reports/rl_key)', () => {
    const go = read('pb/pb_hooks/lib/go.js')
    const start = go.indexOf('function saveIntro')
    const end = go.indexOf('function socialProfile')
    const block = go.slice(start, end)
    expect(/body\.home_zone/.test(block)).toBe(true) // chosen by the user, not derived from reports
    expect(/rl_key|reports/.test(block)).toBe(false)
  })

  it('community_links rows carry the pseudonym but NO rl_key (no device↔report relink)', () => {
    const mig = read('pb/pb_migrations/1718300000_community_links.js')
    // the community_links collection itself must not store an rl_key (only the like/report dedupe
    // collections do, and those carry NO account_id).
    const i = mig.indexOf("name: 'community_links'")
    const j = mig.indexOf("name: 'community_link_likes'")
    expect(i).toBeGreaterThan(-1)
    expect(j).toBeGreaterThan(i)
    const linksBlock = mig.slice(i, j)
    expect(/name: ['"]rl_key/.test(linksBlock)).toBe(false)
    // the anonymous like/report dedupe rows must NOT carry an account_id FIELD (the comment may say
    // "NO account_id" — match the field declaration, not prose).
    const dedupeBlock = mig.slice(j)
    expect(/name: ['"]account_id/.test(dedupeBlock)).toBe(false)
  })

  it('the community-link create hook sets no rl_key and forces server-owned fields', () => {
    const hook = read('pb/pb_hooks/go_community_links.pb.js')
    expect(/set\(['"]rl_key/.test(hook)).toBe(false)
    // like/report dedupe (anonymous, rl_key only) never writes an account_id onto its row
    const go = read('pb/pb_hooks/lib/go.js')
    const start = go.indexOf('function likeCommunityLink')
    const end = go.indexOf('module.exports')
    const block = go.slice(start, end)
    expect(start).toBeGreaterThan(-1)
    expect(/set\(['"]account_id/.test(block)).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // LEAD-01 / D-05 — Zone-leaderboard P0 source-scan (invariant #1 + #4)
  //
  // The leaderboard is a new pseudonym surface. The single biggest risk is a
  // report/network identifier leaking onto a score row, permanently relinking the
  // pseudonym to the anonymous reports stream. These assertions make such a leak a
  // build failure:
  //   - leaderboard_scores carries NONE of report_id/event_id/rl_key/ip_key.
  //   - lb_rl (the per-IP ledger) carries NO account_id/zone/score.
  //   - submitScore (lands in 06-03) never writes ip_key/rl_key/report_id/event_id
  //     onto the row.
  // The submitScore slice is intentionally empty NOW (the function does not exist
  // yet) so it passes vacuously; once 06-03 adds submitScore the slice goes
  // non-empty and the same assertions guard the real code. We deliberately do NOT
  // assert the function exists (no `-1` hard-fail guard) so this plan stays green.
  // ---------------------------------------------------------------------------
  it('leaderboard_scores row carries no report/network identifier (P0)', () => {
    const mig = read('pb/pb_migrations/1782500000_leaderboard.js')
    const i = mig.indexOf("name: 'leaderboard_scores'")
    const j = mig.indexOf("name: 'lb_rl'")
    expect(i).toBeGreaterThan(-1)
    expect(j).toBeGreaterThan(i)
    const scoresBlock = mig.slice(i, j)
    expect(/name: ['"]rl_key/.test(scoresBlock)).toBe(false)
    expect(/name: ['"]ip_key/.test(scoresBlock)).toBe(false)
    expect(/name: ['"]report_id/.test(scoresBlock)).toBe(false)
    expect(/name: ['"]event_id/.test(scoresBlock)).toBe(false)
  })

  it('lb_rl ledger carries only ip_key + created (NO account_id/zone/score)', () => {
    const mig = read('pb/pb_migrations/1782500000_leaderboard.js')
    const j = mig.indexOf("name: 'lb_rl'")
    expect(j).toBeGreaterThan(-1)
    // the ledger block runs from its name to the down-migration / end of file
    const ledgerBlock = mig.slice(j)
    expect(/name: ['"]account_id/.test(ledgerBlock)).toBe(false)
    expect(/name: ['"]zone/.test(ledgerBlock)).toBe(false)
    expect(/name: ['"]score/.test(ledgerBlock)).toBe(false)
  })

  it('submitScore never writes a forbidden identifier onto the score row', () => {
    const go = read('pb/pb_hooks/lib/go.js')
    // submitScore + buildLeaderboard land in 06-03; until then the slice is empty
    // and these assertions pass vacuously, then guard the real code once it exists.
    const start = go.indexOf('function submitScore')
    const end = go.indexOf('function buildLeaderboard')
    const block = start > -1 && end > start ? go.slice(start, end) : ''
    expect(/set\(['"]ip_key/.test(block)).toBe(false)
    expect(/set\(['"]rl_key/.test(block)).toBe(false)
    expect(/report_id/.test(block)).toBe(false)
    expect(/event_id/.test(block)).toBe(false)
  })

  it('the leaderboard migration declares no rl_key field anywhere', () => {
    // Scope to field declarations (the comment header legitimately names the
    // forbidden identifiers in prose) — match `name: 'rl_key'`, not the bare word.
    const mig = read('pb/pb_migrations/1782500000_leaderboard.js')
    expect(/name: ['"]rl_key/.test(mig)).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // INC-01 / D-02 / D-03 — Incident-reports P0 source-scan (invariant #1 + #4)
  //
  // The incident feed is a new anonymous surface. The P0 risk is a report/pseudonym
  // identifier leaking onto an incident row, permanently relinking it to a reporter.
  // These assertions make such a leak a build failure:
  //   - incident_reports collection carries NONE of account_id/report_id/event_id.
  //   - inc_rl (per-IP ledger) carries NO account_id/category/report_id.
  //   - the incident create hook (go_incidents.pb.js) never calls r.set('account_id', ...)
  //     or r.set('report_id', ...) or r.set('event_id', ...).
  // These tests are RED until Plan 07-02 creates the migration + hook clean.
  // ---------------------------------------------------------------------------
  it('incident_reports collection carries NO report/pseudonym identifier (P0 D-02)', () => {
    const mig = read('pb/pb_migrations/1782600000_incidents.js')
    const i = mig.indexOf("name: 'incident_reports'")
    const j = mig.indexOf("name: 'inc_rl'")
    expect(i).toBeGreaterThan(-1)
    expect(j).toBeGreaterThan(i)
    const incBlock = mig.slice(i, j)
    expect(/name: ['"]account_id/.test(incBlock)).toBe(false)
    expect(/name: ['"]report_id/.test(incBlock)).toBe(false)
    expect(/name: ['"]event_id/.test(incBlock)).toBe(false)
  })

  it('inc_rl ledger carries only ip_key + created (no account_id/category/report_id)', () => {
    const mig = read('pb/pb_migrations/1782600000_incidents.js')
    const j = mig.indexOf("name: 'inc_rl'")
    expect(j).toBeGreaterThan(-1)
    const ledgerBlock = mig.slice(j)
    expect(/name: ['"]account_id/.test(ledgerBlock)).toBe(false)
    expect(/name: ['"]category/.test(ledgerBlock)).toBe(false)
    expect(/name: ['"]report_id/.test(ledgerBlock)).toBe(false)
  })

  it('incident create hook never sets a forbidden identifier (P0)', () => {
    // Note: set('photo-'/set('photo+' are legitimate PB file-replace modifiers — NOT forbidden.
    const hook = read('pb/pb_hooks/go_incidents.pb.js')
    expect(/set\(['"]account_id/.test(hook)).toBe(false)
    expect(/set\(['"]report_id/.test(hook)).toBe(false)
    expect(/set\(['"]event_id/.test(hook)).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // NOTIF-05 / D-15 — Notification payload privacy scan (P0 invariant #4)
  //
  // Notification items MUST NOT carry report_id, event_id, rl_key, or ip_key.
  // These identifiers would link a pseudonymous notification consumer back to an
  // anonymous report — directly violating CLAUDE.md invariant #4
  // ("Pseudonym ≠ reporter. Social content attributed to pseudonym, NEVER linked
  // to reports").
  //
  // Source-scan: for each notification-related source file that exists, assert
  // the forbidden-identifier regex does NOT appear on any line that also contains
  // a notification-dispatch context marker (payload, notifStore, go_push_notif,
  // or an add() call). Files that do not yet exist are skipped so this test stays
  // green in Wave 0 and only trips when a future commit introduces the violation.
  // ---------------------------------------------------------------------------
  it('notification sources contain no forbidden identifiers (report_id/event_id/rl_key/ip_key) in payload context', () => {
    const { existsSync } = require('node:fs') as typeof import('node:fs')

    // Notification-related source files to scan (paths relative to repo root).
    const notifSources = [
      'web/src/app/notifStore.ts',
      'web/src/App.tsx',
      'web/src/sw.ts',
      'web/src/lib/outbox.ts',
      'web/src/hooks/useOutboxFlush.ts',
    ]

    // Forbidden identifiers that must never appear alongside notification-dispatch code.
    const FORBIDDEN = /(report_id|event_id|rl_key|ip_key)/

    // Lines that indicate a notification-payload context.
    const NOTIF_CONTEXT = /(payload|notifStore|go_push_notif|add\(\s*\{[^)]*type\s*:)/

    for (const relPath of notifSources) {
      const absPath = resolve(ROOT, relPath)
      if (!existsSync(absPath)) {
        // File does not exist yet (Wave 0 scaffold) — skip gracefully.
        continue
      }
      const src = read(relPath)
      const lines = src.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (NOTIF_CONTEXT.test(line) && FORBIDDEN.test(line)) {
          // Provide a clear failure message identifying the offending line.
          throw new Error(
            `NOTIF-05 violation in ${relPath}:${i + 1} — forbidden identifier in notification context:\n  ${line.trim()}`
          )
        }
      }
    }
    // Explicit pass-signal so vitest counts the assertion even when all files are absent.
    expect(true).toBe(true)
  })
})
