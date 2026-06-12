// StormBackdrop.tsx — ambient, infinitely-looping lightning + thunder backdrop for dark surfaces.
// Monochrome (black & white) storm — dark thunder blackout pulses + white lightning bolts — with
// occasional amber/yellow flash accents ("splashes of yellow"). The Gambian flag sits dim in the
// background and LIGHTS UP (flares its tricolour) on each lightning strike, synced to the same cycle.
// Purely decorative (aria-hidden); sits BEHIND content. One shared 6s master cycle drives every layer
// so the loop stays in sync and seamless. Honours prefers-reduced-motion: static dim wash, no strikes.
import type { CSSProperties } from 'react'
import { FLAG } from '@/lib/tokens'

// A white-blue lightning bolt with an amber halo (the splash of yellow rides the strike).
function Bolt({ cls }: { cls: string }) {
  return (
    <svg className={`goStorm-bolt ${cls}`} viewBox="0 0 40 120" aria-hidden="true">
      <polygon points="25,0 5,54 19,54 11,120 37,42 21,42" fill="#f4f8ff" />
    </svg>
  )
}

export function StormBackdrop({ style }: { style?: CSSProperties }) {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', ...style }}>
      <style>{STORM_CSS}</style>
      <div className="goStorm-thunder" />
      <div className="goStorm-flash" />
      <div className="goStorm-amber" />
      {/* Gambian flag — dim by default, flares bright on each strike */}
      <div className="goStorm-flag">
        <i style={{ flex: 6, background: FLAG.red }} />
        <i style={{ flex: 0.8, background: FLAG.white }} />
        <i style={{ flex: 4, background: FLAG.blue }} />
        <i style={{ flex: 0.8, background: FLAG.white }} />
        <i style={{ flex: 6, background: FLAG.green }} />
      </div>
      <Bolt cls="b1" />
      <Bolt cls="b2" />
      <Bolt cls="b3" />
    </div>
  )
}

// 6s master cycle, 3 strikes: ~10% (top-left, mono), ~42% (top-right, AMBER splash), ~72% (centre, mono).
const STORM_CSS = `
  .goStorm-thunder{position:absolute;inset:0;background:#04070c;opacity:0;animation:goStormThunder 6000ms ease-out infinite;}
  .goStorm-flash{position:absolute;inset:0;background:#eef4ff;opacity:0;animation:goStormFlash 6000ms ease-out infinite;mix-blend-mode:screen;}
  .goStorm-amber{position:absolute;inset:0;
    background:radial-gradient(60% 50% at 72% 26%, rgba(224,138,0,0.85), rgba(224,138,0,0.18) 45%, transparent 72%);
    opacity:0;animation:goStormAmber 6000ms ease-out infinite;mix-blend-mode:screen;}
  .goStorm-flag{position:absolute;inset:0;display:flex;flex-direction:column;opacity:.05;
    animation:goStormFlag 6000ms ease-out infinite;}
  .goStorm-flag i{display:block;width:100%;}
  .goStorm-bolt{position:absolute;width:40px;opacity:0;
    filter:drop-shadow(0 0 8px rgba(255,255,255,0.95)) drop-shadow(0 0 16px rgba(224,138,0,0.55));}
  .goStorm-bolt.b1{top:-6%;left:16%;transform:rotate(8deg);animation:goStormB1 6000ms steps(1,end) infinite;}
  .goStorm-bolt.b2{top:-8%;right:13%;width:46px;transform:rotate(-10deg);animation:goStormB2 6000ms steps(1,end) infinite;}
  .goStorm-bolt.b3{top:14%;left:50%;width:52px;margin-left:-26px;transform:rotate(3deg);animation:goStormB3 6000ms steps(1,end) infinite;}

  /* thunder: a low ambient murk + a hard blackout beat right after each strike */
  @keyframes goStormThunder{
    0%{opacity:.06;}9%{opacity:.06;}11%{opacity:.62;}16%{opacity:.12;}
    41%{opacity:.08;}43%{opacity:.66;}49%{opacity:.12;}
    71%{opacity:.08;}73%{opacity:.6;}79%{opacity:.1;}100%{opacity:.06;}
  }
  /* white strike flashes (brief double-flicker at each strike) */
  @keyframes goStormFlash{
    0%,9%{opacity:0;}9.6%{opacity:.85;}10.6%{opacity:.15;}11.4%{opacity:.75;}13%{opacity:0;}
    41%{opacity:0;}41.6%{opacity:.8;}42.6%{opacity:.12;}43.4%{opacity:.7;}45%{opacity:0;}
    71%{opacity:0;}71.6%{opacity:.82;}72.6%{opacity:.14;}73.4%{opacity:.72;}75%{opacity:0;}
    100%{opacity:0;}
  }
  /* amber splash — strong on strike 2, a faint kiss on strike 3 */
  @keyframes goStormAmber{
    0%,41%{opacity:0;}42%{opacity:.6;}48%{opacity:.12;}52%{opacity:0;}
    71%{opacity:0;}72.4%{opacity:.22;}76%{opacity:0;}100%{opacity:0;}
  }
  /* flag: barely-there base, flares vivid in time with each strike */
  @keyframes goStormFlag{
    0%{opacity:.05;}9%{opacity:.05;}9.6%{opacity:.55;}11%{opacity:.42;}13%{opacity:.1;}
    41%{opacity:.07;}41.6%{opacity:.6;}43.4%{opacity:.46;}45%{opacity:.1;}
    71%{opacity:.07;}71.6%{opacity:.56;}73.4%{opacity:.42;}75%{opacity:.09;}100%{opacity:.05;}
  }
  @keyframes goStormB1{0%,9%{opacity:0;}9.6%{opacity:1;}10.6%{opacity:.25;}11.4%{opacity:1;}13%{opacity:0;}100%{opacity:0;}}
  @keyframes goStormB2{0%,41%{opacity:0;}41.6%{opacity:1;}42.6%{opacity:.25;}43.4%{opacity:1;}45%{opacity:0;}100%{opacity:0;}}
  @keyframes goStormB3{0%,71%{opacity:0;}71.6%{opacity:1;}72.6%{opacity:.25;}73.4%{opacity:1;}75%{opacity:0;}100%{opacity:0;}}

  @media (prefers-reduced-motion: reduce){
    .goStorm-thunder{animation:none;opacity:.18;}
    .goStorm-flag{animation:none;opacity:.1;}
    .goStorm-flash,.goStorm-amber,.goStorm-bolt{animation:none;opacity:0;}
  }
`
