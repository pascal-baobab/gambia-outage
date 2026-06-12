// screen-project.jsx — "About this project": open-source, independence & governance (#/project).
// Trust-first copy for everyone (non-technical), with technical depth (licence, contribute) below.
// Reuses the AboutScreen Block pattern + ds.jsx tokens — no new colours or components.
// Exports: ProjectScreen.

function ProjectScreen({ onBack }) {
  const th = useTheme();
  const REPO = 'https://github.com/pascal-baobab/gambia-outage';

  const Block = ({ icon, title, children }) => (
    <div style={{ padding: '16px 18px', borderBottom: `8px solid ${GPT_T.wash}`, background: GPT_T.paper }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: GPT_T.wash, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><GPTIcon name={icon} size={19} color={GPT_T.ink70} /></span>
        <span style={{ fontSize: 16.5, fontWeight: 800, color: GPT_T.ink }}>{title}</span>
      </div>
      <div style={{ fontSize: 14.5, color: GPT_T.ink70, lineHeight: 1.55, fontWeight: 500 }}>{children}</div>
    </div>
  );

  const linkRow = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '11px 13px', marginTop: 9, borderRadius: 12, background: GPT_T.wash, border: 'none', color: GPT_T.ink, fontFamily: GPT_FONT, fontSize: 14.5, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', width: '100%', textAlign: 'left' };
  const ExtLink = ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" style={linkRow}>
      <span>{children}</span><GPTIcon name="share" size={15} color={GPT_T.ink45} />
    </a>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, flexShrink: 0 }}>
        <IconBtn icon="back" onClick={onBack} label="Back" />
        <div style={{ flex: 1, fontSize: 17, fontWeight: 800, color: GPT_T.ink }}>About this project</div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {/* hero — mission / stewardship (trust, plain language) */}
        <div style={{ background: GPT_T.panel, color: '#fff', padding: '22px 20px 24px', position: 'relative', overflow: 'hidden' }}>
          <FlagBg opacity={0.2} scrim="linear-gradient(180deg, rgba(15,23,34,0.6), rgba(15,23,34,0.9))" />
          <div style={{ position: 'relative' }}>
            <Logo size={19} mono variant="full" />
            <div style={{ fontSize: 21, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginTop: 16, letterSpacing: -0.3 }}>
              Built for The Gambia,<br/>as a public good.
            </div>
            <div style={{ fontSize: 15, color: GPT_T.panelInk, fontWeight: 500, lineHeight: 1.55, marginTop: 10 }}>
              Gambia Outage is open source so that no one — not a company, an NGO, or even its makers — can ever own it or shut it down.
            </div>
          </div>
        </div>

        <Block icon="shield" title="Open — so you can trust it">
          The code that runs this app is <b style={{ color: GPT_T.ink }}>public</b>. Anyone can read it and confirm for themselves that reporting really is anonymous — there is no hidden tracking, because there is nothing to hide.
          <ExtLink href={REPO}>View the code on GitHub</ExtLink>
        </Block>

        <Block icon="info" title="Independent & community-run">
          No company, party or institution controls this map. It’s run independently and built with the community. The long-term goal is <b style={{ color: GPT_T.ink }}>Gambian stewardship</b> — as local maintainers step up, they take it over.
        </Block>

        <Block icon="lock" title="It can’t be locked up">
          Released under the <b style={{ color: GPT_T.ink }}>AGPL-3.0</b> licence. In plain terms: anyone can use, study and improve the app — but if they run a changed version for others, they must share their changes too. That’s what stops anyone from quietly taking it private.
        </Block>

        <Block icon="list" title="Help build it">
          You don’t need to be a programmer. The most wanted help: <b style={{ color: GPT_T.ink }}>Wolof &amp; Mandinka translations</b>, reporting missing neighbourhoods, and testing the app. Developers welcome too.
          <ExtLink href={REPO}>Contribute on GitHub</ExtLink>
        </Block>

        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontFamily: GPT_FONT, fontSize: 12.5, color: GPT_T.ink45, fontWeight: 600 }}>AGPL-3.0 · open source · gambiaoutage.com</div>
        </div>
      </div>
      <div style={{ padding: '11px 14px calc(11px + env(safe-area-inset-bottom))', background: GPT_T.paper, borderTop: `1px solid ${GPT_T.line}`, flexShrink: 0 }}>
        <a href={REPO} target="_blank" rel="noopener noreferrer" style={{ width: '100%', minHeight: 54, borderRadius: 15, border: 'none', background: GPT_T.ink, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', textDecoration: 'none' }}>
          <GPTIcon name="shield" size={20} color="#fff" /> View the code on GitHub
        </a>
      </div>
    </div>
  );
}

Object.assign(window, { ProjectScreen });
