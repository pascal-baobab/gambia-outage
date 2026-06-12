import { describe, it, expect } from 'vitest'
import { providerFor, splitStreamTitle, parseZeno, parseAzuracast, parseRadioco, parseFip } from './nowPlaying'
import { RADIO_STATIONS } from './constants'

describe('providerFor — every station maps to its live-metadata source', () => {
  it('maps Zeno stations to their SSE mount', () => {
    expect(providerFor('https://stream.zeno.fm/9reuhyz8up8uv')).toEqual({ kind: 'zeno', mount: '9reuhyz8up8uv' })
    expect(providerFor('https://stream-154.zeno.fm/t8gcyq6ts0quv')).toEqual({ kind: 'zeno', mount: 't8gcyq6ts0quv' })
  })
  it('maps AzuraCast stations to their nowplaying API (incl. the itsshort.info → live.afro.radio host override)', () => {
    expect(providerFor('https://radio.lagosjumpradio.com/listen/lagosjump_radio/radio.mp3')).toEqual({
      kind: 'poll',
      api: 'https://radio.lagosjumpradio.com/api/nowplaying/lagosjump_radio',
      parse: 'azuracast',
    })
    expect(providerFor('https://itsshort.info/listen/afroradio/radio.mp3')).toEqual({
      kind: 'poll',
      api: 'https://live.afro.radio/api/nowplaying/afroradio',
      parse: 'azuracast',
    })
  })
  it('maps Radio.co stations to the public status API', () => {
    expect(providerFor('https://streaming.radio.co/s92f890821/listen')).toEqual({
      kind: 'poll',
      api: 'https://public.radio.co/stations/s92f890821/status',
      parse: 'radioco',
    })
  })
  it('maps the FIP webradios to their livemeta station ids', () => {
    expect(providerFor('https://icecast.radiofrance.fr/fipjazz-midfi.mp3')).toEqual({
      kind: 'poll',
      api: 'https://api.radiofrance.fr/livemeta/pull/65',
      parse: 'fip',
    })
    expect(providerFor('https://icecast.radiofrance.fr/fipworld-midfi.mp3')).toEqual({
      kind: 'poll',
      api: 'https://api.radiofrance.fr/livemeta/pull/69',
      parse: 'fip',
    })
    expect(providerFor('https://icecast.radiofrance.fr/fipreggae-midfi.mp3')).toEqual({
      kind: 'poll',
      api: 'https://api.radiofrance.fr/livemeta/pull/71',
      parse: 'fip',
    })
  })
  it('Dakar City (ICY-only, no browser-reachable API) → none', () => {
    expect(providerFor('https://stream.radiodakarcity.com/')).toEqual({ kind: 'none' })
  })
  it('every station in RADIO_STATIONS except Dakar City has a live source', () => {
    for (const s of RADIO_STATIONS) {
      const p = providerFor(s.url)
      if (s.name === 'Radio Dakar City') expect(p.kind).toBe('none')
      else expect(p.kind).not.toBe('none')
    }
  })
})

describe('splitStreamTitle — free-text "Artist - Title" convention', () => {
  it('splits on the first " - "', () => {
    expect(splitStreamTitle('Youssou Ndour - Baykat')).toEqual({ artist: 'Youssou Ndour', title: 'Baykat' })
    expect(splitStreamTitle('Baaba Maal & Mbassou - 01 -  Taara 1')).toEqual({ artist: 'Baaba Maal & Mbassou', title: '01 -  Taara 1' })
  })
  it('no separator → title only', () => {
    expect(splitStreamTitle('Abou jouba maky sal ari')).toEqual({ artist: '', title: 'Abou jouba maky sal ari' })
  })
  it('strips the "Now On Air:" station prefix (Love FM)', () => {
    expect(splitStreamTitle('Now On Air:Mia Guisse, Viviane Chidid - On a pas le temps')).toEqual({
      artist: 'Mia Guisse, Viviane Chidid',
      title: 'On a pas le temps',
    })
  })
  it('trims whitespace (Radio.co sends trailing spaces)', () => {
    expect(splitStreamTitle('E.L - M.I.A ')).toEqual({ artist: 'E.L', title: 'M.I.A' })
  })
})

describe('parseZeno — SSE payload', () => {
  it('splits streamTitle and has no artwork', () => {
    expect(parseZeno({ mount: 'x', streamTitle: 'Youssou Ndour - Baykat' })).toEqual({
      artist: 'Youssou Ndour',
      title: 'Baykat',
    })
  })
  it('falls back to the streamUrl artist param when streamTitle has no separator', () => {
    expect(parseZeno({ mount: 'x', streamTitle: 'Abou jouba maky sal ari', streamUrl: '&artist=Baaba Maal&album=Baayo' })).toEqual({
      artist: 'Baaba Maal',
      title: 'Abou jouba maky sal ari',
    })
  })
  it('empty/missing streamTitle → null', () => {
    expect(parseZeno({ mount: 'x', streamTitle: '' })).toBeNull()
    expect(parseZeno({ mount: 'x' })).toBeNull()
  })
})

describe('parseAzuracast — structured song + art', () => {
  it('reads artist/title/art from now_playing.song', () => {
    expect(
      parseAzuracast({ now_playing: { song: { artist: 'Patoranking', title: 'Abule', art: 'https://x/art.jpg' } } }),
    ).toEqual({ artist: 'Patoranking', title: 'Abule', artwork: 'https://x/art.jpg' })
  })
  it('missing song → null', () => {
    expect(parseAzuracast({})).toBeNull()
    expect(parseAzuracast({ now_playing: { song: { artist: '', title: '' } } })).toBeNull()
  })
})

describe('parseRadioco — current_track free text + artwork', () => {
  it('splits the title and prefers the large artwork', () => {
    expect(
      parseRadioco({ current_track: { title: 'E.L - M.I.A ', artwork_url: 'https://x/100.jpg', artwork_url_large: 'https://x/600.jpg' } }),
    ).toEqual({ artist: 'E.L', title: 'M.I.A', artwork: 'https://x/600.jpg' })
  })
  it('missing track → null', () => {
    expect(parseRadioco({})).toBeNull()
  })
})

describe('parseFip — livemeta steps windowed on now', () => {
  const steps = {
    a: { title: 'Vanillochocolat', authors: 'Big Famili', performers: '', start: 1000, end: 1200, embedType: 'song', visual: 'https://x/v.jpg' },
    b: { title: 'Other', authors: 'X', start: 1200, end: 1400, embedType: 'song' },
  }
  it('picks the step covering now, artist from performers||authors, artwork from visual, refresh at end', () => {
    expect(parseFip({ steps }, 1100)).toEqual({
      np: { artist: 'Big Famili', title: 'Vanillochocolat', artwork: 'https://x/v.jpg' },
      refreshInSec: 100,
    })
  })
  it('prefers performers when present', () => {
    const s = { steps: { a: { ...steps.a, performers: 'The Band' } } }
    expect(parseFip(s, 1100).np?.artist).toBe('The Band')
  })
  it('no step covering now → null np, default refresh', () => {
    expect(parseFip({ steps }, 5000)).toEqual({ np: null, refreshInSec: null })
  })
})
