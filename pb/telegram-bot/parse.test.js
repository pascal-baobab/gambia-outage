// parse.test.js — run with `node --test`. Covers the pure ingest parser.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseIngest, detectSource, detectPlatform, extractOg, isJunkTitle } from './parse.js'

test('returns null without a URL', () => {
  assert.equal(parseIngest('just some text, no link'), null)
  assert.equal(parseIngest(''), null)
})

test('extracts URL, title and snippet', () => {
  const r = parseIngest('NAWEC update\nScheduled maintenance tonight in Kanifing.\nhttps://facebook.com/post/123')
  assert.equal(r.url, 'https://facebook.com/post/123')
  assert.equal(r.title, 'NAWEC update')
  assert.equal(r.snippet, 'Scheduled maintenance tonight in Kanifing.')
  assert.equal(r.source, 'facebook')
})

test('single-line caption -> title only, url stripped', () => {
  const r = parseIngest('Power back in Serrekunda https://fb.me/abc')
  assert.equal(r.url, 'https://fb.me/abc')
  assert.equal(r.title, 'Power back in Serrekunda')
  assert.equal(r.snippet, '')
  assert.equal(r.source, 'facebook')
})

test('non-facebook host -> link', () => {
  assert.equal(detectSource('https://example.com/x'), 'link')
  assert.equal(detectSource('https://www.facebook.com/x'), 'facebook')
  assert.equal(detectSource('not a url'), 'link')
})

test('detectPlatform maps known hosts (for the LIVE strip embed)', () => {
  assert.equal(detectPlatform('https://www.facebook.com/100064343606254/videos/2101635607061722'), 'facebook')
  assert.equal(detectPlatform('https://fb.watch/abc'), 'facebook')
  assert.equal(detectPlatform('https://www.tiktok.com/@x/live'), 'tiktok')
  assert.equal(detectPlatform('https://www.instagram.com/x/live'), 'instagram')
  assert.equal(detectPlatform('https://youtu.be/xyz'), 'youtube')
  assert.equal(detectPlatform('https://www.youtube.com/watch?v=xyz'), 'youtube')
  assert.equal(detectPlatform('https://example.com/x'), 'link')
  assert.equal(detectPlatform('not a url'), 'link')
})

test('trailing punctuation trimmed from URL', () => {
  const r = parseIngest('see (https://facebook.com/p/9).')
  assert.equal(r.url, 'https://facebook.com/p/9')
})

test('extractOg pulls og:image/title/description and decodes entities', () => {
  const html = `<head>
    <meta property="og:title" content="NAWEC &amp; the grid" />
    <meta content="https://cdn/x.jpg?a=1&amp;b=2" property="og:image">
    <meta name="og:description" content="line one &quot;quote&quot;">
  </head>`
  const og = extractOg(html)
  assert.equal(og.title, 'NAWEC & the grid')
  assert.equal(og.image, 'https://cdn/x.jpg?a=1&b=2') // attr order-agnostic + entity-decoded
  assert.equal(og.description, 'line one "quote"')
})

test('extractOg returns empty strings when absent', () => {
  const og = extractOg('<html><body>no meta</body></html>')
  assert.deepEqual(og, { image: '', title: '', description: '' })
})

test('extractOg decodes numeric + hex entities (emoji, smart quotes)', () => {
  const html = `<head>
    <meta property="og:title" content="EYE Africa TV">
    <meta property="og:description" content="Power is back &#x1f923; &#8220;finally&#8221; &amp; thanks">
  </head>`
  const og = extractOg(html)
  assert.equal(og.title, 'EYE Africa TV')
  assert.equal(og.description, 'Power is back 🤣 “finally” & thanks')
})

test('isJunkTitle flags FB login-wall titles', () => {
  assert.equal(isJunkTitle('Facebook'), true)
  assert.equal(isJunkTitle('Log in to continue'), true)
  assert.equal(isJunkTitle(''), true)
  assert.equal(isJunkTitle('NAWEC maintenance tonight'), false)
})
