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
})
