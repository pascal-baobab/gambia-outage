#!/usr/bin/env node
/**
 * token-audit.mjs — Gambia Outage Phase 1 Design Pack
 *
 * Audits returned Claude Design prototype files (.jsx / .svg) for hex colour literals
 * that are NOT in the approved ds.jsx whitelist. Any disallowed hex is a blocking audit
 * failure — Claude Design must revise the file before it lands in the repo.
 *
 * Usage:
 *   node scripts/token-audit.mjs <file...>
 *   node scripts/token-audit.mjs design/calculator.jsx
 *   node scripts/token-audit.mjs design/avatar-picker.jsx design/notification-center.jsx
 *
 * Exit codes:
 *   0 — all files clean (only whitelist hex values found)
 *   1 — one or more files contain disallowed hex values (audit FAIL)
 *   2 — called with no file arguments (usage error)
 *
 * IMPORTANT — sync rule:
 *   The ALLOWED_COLORS set below is derived directly from design/ds.jsx.
 *   If ds.jsx gains new tokens, add them here too. The whitelist is the single source
 *   of truth for what Claude Design may reference in returned prototypes.
 */

import { readFileSync } from 'fs';

// ── Hex extraction regex ──────────────────────────────────────────────────
// Matches 3-digit (#RGB), 4-digit (#RGBA), 6-digit (#RRGGBB), and 8-digit (#RRGGBBAA) hex.
// Word boundary \b prevents matching longer hex strings by accident.
const hexRe = /#[0-9a-fA-F]{3,8}\b/g;

// ── Approved colour whitelist ─────────────────────────────────────────────
// All values are stored lowercase for case-insensitive comparison.
// Source: design/ds.jsx (post Plan-02 additions) + UI-SPEC.md ALLOWED_COLORS seed.

const ALLOWED_COLORS = new Set([
  // ── GPT_T neutrals ────────────────────────────────────────────────────
  '#11161c', // ink
  '#3b454f', // ink70
  '#69737e', // ink45
  '#9aa4ae', // ink25
  '#e4e8ec', // line
  '#eef1f4', // line2
  '#ffffff', // paper
  '#f6f8fa', // wash
  '#0f1722', // panel (dark shell — may appear in PhoneShell wrapper, not as light bg)
  '#27313f', // panelLine
  '#f4f7fa', // panelInk
  '#9daab8', // panelInk60
  '#f4f1ea', // paper2
  // New tokens — LOCKED 2026-06-10 (visual direction approved)
  '#eaeef2', // keyDigit — calculator digit key background
  '#ffe5b4', // keyOp — calculator operator key background (warm amber tint)
  '#f0f4f8', // tileAnchor — Photo-Crush tile base

  // ── THEMES.standard ───────────────────────────────────────────────────
  '#2c3743', // out
  '#161e27', // outDeep
  '#e7ebef', // outBg
  '#c2cad3', // outLine
  '#3c4856', // partial
  '#202a35', // partialDeep
  '#e9edf1', // partialBg
  '#c7cfd8', // partialLine
  '#e08a00', // on (operator active state — used in calculator keypad)
  '#8a5400', // onDeep
  '#fff3d6', // onBg
  '#f2cf86', // onLine
  '#8a94a6', // nodata
  '#5a6271', // nodataDeep
  '#eef1f5', // nodataBg
  '#d5dbe3', // nodataLine
  '#4a5260', // estimated
  '#2a303a', // estimatedDeep
  '#e8eaee', // estimatedBg
  '#c8cdd6', // estimatedLine

  // ── THEMES.sunlight ───────────────────────────────────────────────────
  '#212a34', // out
  '#0e141b', // outDeep
  '#dfe4ea', // outBg
  '#aeb8c2', // outLine
  '#2e3845', // partial
  // '#161e27' — already listed above (shared value)
  '#e1e6ec', // partialBg
  '#b6c0cb', // partialLine
  '#b86e00', // on
  '#7a4a00', // onDeep
  '#fbe9c2', // onBg
  '#e6bc6b', // onLine
  // '#5a6271' — already listed above (shared value)
  '#3a404b', // nodataDeep (sunlight)
  '#e4e8ee', // nodataBg (sunlight)
  '#b8c0cc', // nodataLine (sunlight)
  '#39424e', // estimated (sunlight)
  '#1c232c', // estimatedDeep
  '#dee2e8', // estimatedBg
  '#aeb7c2', // estimatedLine

  // ── FLAG (Gambian flag) ───────────────────────────────────────────────
  '#ce1126', // red
  // '#ffffff' — already listed above (FLAG.white = GPT_T.paper)
  '#0e50a0', // blue
  '#0a3b78', // blueDeep
  '#3a7728', // green
  '#2c5c1e', // greenDeep

  // ── ACCENT ────────────────────────────────────────────────────────────
  '#ffd700', // star — XP/honors gold
  '#e0245e', // live — LIVE/heart/notification badge
  '#e5484d', // danger — destructive actions
  '#1877f2', // facebook brand
  '#25d366', // whatsapp brand
  '#d97706', // amber (ambassador)
  '#b45309', // amberDeep
  '#fef3c7', // amberBg
  // New game tile accents — LOCKED 2026-06-10
  '#a855f7', // tile4 — purple (baobab/mysticism)
  '#0ea5e9', // tile5 — sky blue (River Gambia)

  // ── Universals ────────────────────────────────────────────────────────
  '#fff',    // shorthand white (permitted alias)
  '#000',    // shorthand black (permitted alias)
]);

// ── rgba / rgb expressions are allowed (not hex literals) ────────────────
// We only flag #hex literals. rgba/rgb values are not extracted by hexRe.
// 'transparent' is a CSS keyword, not a hex — also always allowed.

// ── Main ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/token-audit.mjs <file...>');
  console.error('');
  console.error('  Audits .jsx/.svg files for hex colour literals outside the ds.jsx whitelist.');
  console.error('  Exit 0 = all clean. Exit 1 = disallowed hex found. Exit 2 = no args.');
  console.error('');
  console.error('  Example:');
  console.error('    node scripts/token-audit.mjs design/calculator.jsx');
  process.exit(2);
}

let anyFail = false;

for (const filePath of args) {
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`ERROR: cannot read "${filePath}": ${err.message}`);
    anyFail = true;
    continue;
  }

  const lines = content.split('\n');
  const disallowed = [];

  lines.forEach((line, i) => {
    const matches = line.match(hexRe);
    if (!matches) return;
    for (const hex of matches) {
      const lower = hex.toLowerCase();
      if (!ALLOWED_COLORS.has(lower)) {
        disallowed.push({ line: i + 1, hex });
      }
    }
  });

  if (disallowed.length === 0) {
    console.log(`PASS  ${filePath} — ${countHexOccurrences(content)} hex literal(s), all whitelisted`);
  } else {
    console.error(`FAIL  ${filePath} — ${disallowed.length} disallowed hex value(s):`);
    for (const { line, hex } of disallowed) {
      console.error(`      line ${line}: ${hex}`);
    }
    anyFail = true;
  }
}

process.exit(anyFail ? 1 : 0);

// ── Helpers ───────────────────────────────────────────────────────────────

function countHexOccurrences(content) {
  const m = content.match(hexRe);
  return m ? m.length : 0;
}
