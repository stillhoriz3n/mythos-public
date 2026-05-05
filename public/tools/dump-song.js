#!/usr/bin/env node
/*
 * dump-song.js — pretty-print a track's word timeline for composition.
 *
 * For each word: index, time, duration. Flags long-duration words (holds,
 * pauses) and long inter-word gaps. Shows JSON line breaks as blank rows.
 *
 * Run: node tools/dump-song.js "<stem-prefix>"
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const LYRICS_DIR = path.join(REPO_ROOT, 'public', 'music', 'lyrics');

function fmtTime(t) {
  const m = Math.floor(t / 60);
  const s = (t - m * 60).toFixed(2);
  return `${m}:${s.padStart(5, '0')}`;
}

function main() {
  const prefix = process.argv[2];
  if (!prefix) { console.error('usage: dump-song.js <prefix>'); process.exit(1); }
  const files = fs.readdirSync(LYRICS_DIR)
    .filter((f) => f.endsWith('.json') && !f.endsWith('.whisper.json') && !f.endsWith('.analysis.json') && f.startsWith(prefix));
  if (files.length === 0) { console.error('no match'); process.exit(1); }
  for (const f of files) {
    const stem = f.replace(/\.json$/, '');
    console.log(`\n═══ ${stem} ═══`);
    const d = JSON.parse(fs.readFileSync(path.join(LYRICS_DIR, f), 'utf8'));
    let idx = 0;
    let prevEnd = null;
    let prevLine = -1;
    for (let li = 0; li < d.lines.length; li++) {
      const ln = d.lines[li];
      if (!ln || !ln.words) continue;
      if (li !== prevLine) {
        console.log(`\n  L${li}: ${ln.text || ''}`);
        prevLine = li;
      }
      for (const w of ln.words) {
        if (!w || !w.w) continue;
        const gap = prevEnd !== null ? w.t - prevEnd : 0;
        const flags = [];
        if (w.d >= 1.0) flags.push(`HOLD ${w.d.toFixed(2)}s`);
        if (gap >= 1.0) flags.push(`GAP ${gap.toFixed(2)}s`);
        if (gap >= 0.5 && gap < 1.0) flags.push(`gap ${gap.toFixed(2)}s`);
        if (w.d >= 0.6 && w.d < 1.0) flags.push(`hold ${w.d.toFixed(2)}s`);
        const flagStr = flags.length ? `  ← ${flags.join(', ')}` : '';
        console.log(`    ${String(idx).padStart(3, ' ')}  ${fmtTime(w.t)}  ${w.w.padEnd(20, ' ')} ${flagStr}`);
        idx++;
        prevEnd = w.t + w.d;
      }
    }
  }
}

main();
