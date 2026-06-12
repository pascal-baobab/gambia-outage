// social.test.ts — fetchSocial client: correct URL + unwraps { links }.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchSocial, likeSocial } from './api'
import type { SocialLink } from './types'

afterEach(() => { vi.restoreAllMocks() })

describe('fetchSocial', () => {
  it('requests /api/go/social with a limit and returns { lives, links }', async () => {
    const links: SocialLink[] = [
      { id: 'a', url: 'https://facebook.com/p/1', title: 'Hi', author: 'InsideGambia.com', snippet: '', image: '', source: 'facebook', pinned: true, likes: 3, isLive: false, platform: 'facebook', liveExpiresAt: '', created: '2026-06-04 10:00:00Z', ago: '2h ago' },
    ]
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ links }), { status: 200, headers: { 'content-type': 'application/json' } }),
    )
    const out = await fetchSocial(30)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(String((spy.mock.calls[0] as unknown[])[0])).toBe('/api/go/social?limit=30')
    expect(out).toEqual({ lives: [], links })
  })

  it('throws on a non-OK response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 500 }))
    await expect(fetchSocial()).rejects.toThrow()
  })
})

describe('likeSocial', () => {
  it('POSTs the id to /api/go/social/like and returns the fresh count', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'a', likes: 13, liked: true }), { status: 200, headers: { 'content-type': 'application/json' } }),
    )
    const out = await likeSocial('a')
    expect(spy).toHaveBeenCalledTimes(1)
    const [url, init] = spy.mock.calls[0] as [string, RequestInit]
    expect(String(url)).toBe('/api/go/social/like')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ id: 'a' })
    expect(out).toEqual({ id: 'a', likes: 13, liked: true })
  })
})
