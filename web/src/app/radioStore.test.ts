import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useRadio, __setAudioFactory } from './radioStore'
import { RADIO_URL, RADIO_STATIONS } from '@/lib/constants'

// A fake audio element with manual event emission — no jsdom needed.
function makeFakeAudio() {
  const listeners: Record<string, Array<() => void>> = {}
  return {
    src: '',
    preload: '',
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    addEventListener: (e: string, cb: () => void) => {
      ;(listeners[e] ||= []).push(cb)
    },
    emit: (e: string) => (listeners[e] || []).forEach((f) => f()),
  }
}

let fake: ReturnType<typeof makeFakeAudio>

beforeEach(() => {
  fake = makeFakeAudio()
  __setAudioFactory(() => fake)
  // Reset store state (the audio singleton is reset by __setAudioFactory).
  useRadio.setState({ status: 'idle', collapseSignal: 0, stationIndex: 0, favorites: [] })
})

describe('radioStore', () => {
  it('toggle from idle plays and bumps collapseSignal (radio takes over)', () => {
    expect(useRadio.getState().status).toBe('idle')
    useRadio.getState().toggle()
    expect(fake.play).toHaveBeenCalledTimes(1)
    expect(useRadio.getState().status).toBe('loading')
    expect(useRadio.getState().collapseSignal).toBe(1)
  })

  it('play() sets src to the fixed station URL', () => {
    useRadio.getState().play()
    expect(fake.src).toBe(RADIO_URL)
  })

  it('playing event → status playing; toggle pauses → status idle', () => {
    useRadio.getState().play()
    fake.emit('playing')
    expect(useRadio.getState().status).toBe('playing')
    useRadio.getState().toggle()
    expect(fake.pause).toHaveBeenCalledTimes(1)
    expect(useRadio.getState().status).toBe('idle')
  })

  it('pause() and videoTookOver() do NOT bump collapseSignal', () => {
    useRadio.getState().play() // collapseSignal → 1
    const after = useRadio.getState().collapseSignal
    useRadio.getState().pause()
    useRadio.getState().videoTookOver()
    expect(useRadio.getState().collapseSignal).toBe(after)
    expect(fake.pause).toHaveBeenCalled()
  })

  it('error event → status error', () => {
    useRadio.getState().play()
    fake.emit('error')
    expect(useRadio.getState().status).toBe('error')
  })

  it('nextStation cycles the selected station (wraps)', () => {
    expect(useRadio.getState().stationIndex).toBe(0)
    useRadio.getState().nextStation()
    expect(useRadio.getState().stationIndex).toBe(1 % RADIO_STATIONS.length)
    // wrap back to 0 after walking the whole list
    for (let i = 1; i < RADIO_STATIONS.length; i++) useRadio.getState().nextStation()
    expect(useRadio.getState().stationIndex).toBe(0)
  })

  it('play() uses the SELECTED station url', () => {
    if (RADIO_STATIONS.length < 2) return
    useRadio.setState({ stationIndex: 1 })
    useRadio.getState().play()
    expect(fake.src).toBe(RADIO_STATIONS[1].url)
  })

  it('toggleFavorite adds then removes a station url', () => {
    const url = RADIO_STATIONS[0].url
    expect(useRadio.getState().favorites).not.toContain(url)
    useRadio.getState().toggleFavorite(url)
    expect(useRadio.getState().favorites).toContain(url)
    useRadio.getState().toggleFavorite(url)
    expect(useRadio.getState().favorites).not.toContain(url)
  })

  it('setStation while playing retunes live WITHOUT bumping collapseSignal', () => {
    if (RADIO_STATIONS.length < 2) return
    useRadio.getState().play() // station 0, collapseSignal → 1
    fake.emit('playing')
    const sig = useRadio.getState().collapseSignal
    useRadio.getState().setStation(1)
    expect(fake.src).toBe(RADIO_STATIONS[1].url)
    expect(fake.play).toHaveBeenCalledTimes(2) // initial + retune
    expect(useRadio.getState().collapseSignal).toBe(sig) // not re-collapsed
  })
})
