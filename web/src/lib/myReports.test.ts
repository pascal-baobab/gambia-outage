// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { listMyReports, addMyReport, removeMyReport, type MyReport } from './myReports'

beforeEach(() => localStorage.clear())

const mk = (zoneId: string, over: Partial<MyReport> = {}): MyReport => ({
  zoneId,
  name: 'Bijilo',
  region: 'kanifing',
  type: 'out',
  at: Date.now(),
  ...over,
})

describe('myReports', () => {
  it('appends entries (newest last)', () => {
    addMyReport(mk('a'))
    addMyReport(mk('b'))
    const list = listMyReports()
    expect(list.map((e) => e.zoneId)).toEqual(['a', 'b'])
  })

  it('dedups by zoneId — newest wins, moved to the end', () => {
    addMyReport(mk('a', { type: 'out', at: 1 }))
    addMyReport(mk('b', { at: 2 }))
    addMyReport(mk('a', { type: 'back', at: 3 }))
    const list = listMyReports()
    expect(list.map((e) => e.zoneId)).toEqual(['b', 'a'])
    expect(list.find((e) => e.zoneId === 'a')!.type).toBe('back')
    expect(list.find((e) => e.zoneId === 'a')!.at).toBe(3)
  })

  it('caps at the most-recent 50', () => {
    for (let i = 0; i < 60; i++) addMyReport(mk(`z${i}`, { at: i }))
    const list = listMyReports()
    expect(list).toHaveLength(50)
    expect(list[0].zoneId).toBe('z10') // oldest 10 dropped
    expect(list[49].zoneId).toBe('z59')
  })

  it('removeMyReport drops the matching zone', () => {
    addMyReport(mk('a'))
    addMyReport(mk('b'))
    removeMyReport('a')
    expect(listMyReports().map((e) => e.zoneId)).toEqual(['b'])
  })

  it('survives empty + corrupt storage', () => {
    expect(listMyReports()).toEqual([])
    localStorage.setItem('go_my_reports', '{not json')
    expect(listMyReports()).toEqual([])
  })

  it('contains NO network calls in the source', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const src = readFileSync(resolve(here, 'myReports.ts'), 'utf8')
    expect(/\bfetch\b/.test(src)).toBe(false)
    expect(/XMLHttpRequest|navigator\.sendBeacon|EventSource|WebSocket/.test(src)).toBe(false)
  })
})
