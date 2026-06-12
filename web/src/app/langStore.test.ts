// @vitest-environment jsdom
// langStore.test.ts — the language store: persistence, RTL dir toggle, lazy dict load.
import { describe, it, expect, beforeEach } from 'vitest'
import { useLang, detectLang } from './langStore'
import { en } from '@/i18n/en'

describe('langStore', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('dir')
    document.documentElement.removeAttribute('lang')
    useLang.setState({ lang: 'en', dict: en })
  })

  it('defaults to English with the eager dict', () => {
    expect(useLang.getState().lang).toBe('en')
    expect(useLang.getState().dict.brand.name).toBe('Gambia Outage')
  })

  it('switching to ar loads the dict, persists, and sets RTL', async () => {
    await useLang.getState().setLang('ar')
    expect(useLang.getState().lang).toBe('ar')
    expect(useLang.getState().dict.status.out).toBe('انقطاع')
    expect(localStorage.getItem('go_lang')).toBe('ar')
    expect(document.documentElement.dir).toBe('rtl')
    expect(document.documentElement.lang).toBe('ar')
  })

  it('switching to fr sets LTR', async () => {
    await useLang.getState().setLang('fr')
    expect(document.documentElement.dir).toBe('ltr')
    expect(useLang.getState().dict.profile.edit).toBe('Modifier')
  })

  it('detectLang ignores an unsupported persisted value and falls back to en', () => {
    localStorage.setItem('go_lang', 'zz')
    expect(detectLang()).toBe('en')
  })

  it('detectLang honours a valid persisted value', () => {
    localStorage.setItem('go_lang', 'ar')
    expect(detectLang()).toBe('ar')
  })
})
