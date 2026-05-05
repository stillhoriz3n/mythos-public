#!/usr/bin/env node
/*
 * validate-directions.js — Sanity-check direction files against lyrics.
 *
 * For each direction.json in public/music/directions/, verifies:
 *   - Referenced lyrics exist
 *   - Every chunks[].wordRange [a, b] is valid (0 ≤ a ≤ b < wordCount)
 *   - Prints the actual text each wordRange selects so the composer can
 *     verify they picked the right words
 *   - Warns on overlapping wordRanges (one directive clobbers another)
 *   - Warns on unknown kinds or out-of-bounds emphasis values
 *
 * Run after editing a direction file; the output is a composer-friendly
 * reality check before pushing.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const LYRICS_DIR = path.join(REPO_ROOT, 'public', 'music', 'lyrics');
const DIRECTIONS_DIR = path.join(REPO_ROOT, 'public', 'music', 'directions');
const VALID_KINDS = new Set(['key', 'hold', 'ribbon', 'eclipse', 'rapidfire', 'couplet-pair']);
const VALID_COLORS = new Set(['amber', 'cyan', 'mixed', 'auto', null, undefined]);

function flattenWords(lyricsJson) {
  const out = [];
  const lines = (lyricsJson && lyricsJson.lines) || [];
  for (const ln of lines) for (const w of (ln.words || [])) if (w && w.w) out.push(w.w);
  return out;
}

function fmtTime(t) {
  const m = Math.floor(t / 60);
  const s = (t - m * 60).toFixed(2);
  return `${m}:${s.padStart(5, '0')}`;
}

function check(stem) {
  const directionPath = path.join(DIRECTIONS_DIR, `${stem}.json`);
  const lyricsPath = path.join(LYRICS_DIR, `${stem}.json`);
  if (!fs.existsSync(directionPath)) return null;
  if (!fs.existsSync(lyricsPath)) {
    return { stem, errors: [`no lyrics file at ${lyricsPath}`], warnings: [], chunks: [] };
  }
  let direction, lyrics;
  try { direction = JSON.parse(fs.readFileSync(directionPath, 'utf8')); }
  catch (e) { return { stem, errors: [`direction JSON parse: ${e.message}`], warnings: [], chunks: [] }; }
  try { lyrics = JSON.parse(fs.readFileSync(lyricsPath, 'utf8')); }
  catch (e) { return { stem, errors: [`lyrics JSON parse: ${e.message}`], warnings: [], chunks: [] }; }

  const words = [];
  for (const ln of (lyrics.lines || [])) for (const w of (ln.words || [])) if (w && w.w) words.push({ w: w.w, t: +w.t });

  const errors = [];
  const warnings = [];
  const chunkReports = [];

  const chunks = direction.chunks || [];
  const ranges = [];
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const report = { idx: i, ok: true };
    chunkReports.push(report);

    if (!Array.isArray(c.wordRange) || c.wordRange.length !== 2) {
      report.ok = false;
      errors.push(`chunks[${i}]: wordRange must be [a, b]`);
      continue;
    }
    const [a, b] = c.wordRange.map((n) => n | 0);
    if (a < 0 || b >= words.length || a > b) {
      report.ok = false;
      errors.push(`chunks[${i}]: wordRange [${a}, ${b}] out of bounds (0..${words.length - 1})`);
      continue;
    }
    if (c.kind && !VALID_KINDS.has(c.kind)) {
      warnings.push(`chunks[${i}]: unknown kind "${c.kind}" — engine will default to ribbon`);
    }
    if (c.color !== undefined && !VALID_COLORS.has(c.color)) {
      warnings.push(`chunks[${i}]: unknown color "${c.color}"`);
    }
    if (typeof c.emphasis === 'number' && (c.emphasis < 0.6 || c.emphasis > 2.0)) {
      warnings.push(`chunks[${i}]: emphasis ${c.emphasis} outside [0.6, 2.0] — will be clamped`);
    }

    const text = words.slice(a, b + 1).map((w) => w.w).join(' ');
    const tStart = words[a].t;
    const tEnd = words[b].t;
    report.range = [a, b];
    report.kind = c.kind || 'ribbon';
    report.text = text;
    report.tStart = tStart;
    report.note = c.note || '';
    ranges.push({ a, b, i });
  }

  // Overlap detection
  ranges.sort((x, y) => x.a - y.a);
  for (let i = 1; i < ranges.length; i++) {
    if (ranges[i].a <= ranges[i - 1].b) {
      warnings.push(`chunks[${ranges[i - 1].i}] and chunks[${ranges[i].i}] wordRanges overlap — later clobbers`);
    }
  }

  return { stem, errors, warnings, chunks: chunkReports, wordCount: words.length };
}

function main() {
  if (!fs.existsSync(DIRECTIONS_DIR)) {
    console.error('No directions dir:', DIRECTIONS_DIR);
    process.exit(1);
  }
  const files = fs.readdirSync(DIRECTIONS_DIR).filter((f) => f.endsWith('.json'));
  const filter = process.argv[2];
  const matches = filter
    ? files.filter((f) => f.startsWith(filter.replace(/\*$/, '')))
    : files;

  let anyErrors = false;
  for (const f of matches) {
    const stem = f.replace(/\.json$/, '');
    const r = check(stem);
    if (!r) continue;

    console.log(`\n— ${stem} (${r.wordCount} words) —`);
    if (r.errors.length) {
      anyErrors = true;
      for (const e of r.errors) console.log(`  ERROR: ${e}`);
    }
    for (const w of r.warnings) console.log(`  warn:  ${w}`);
    if (r.chunks.length === 0) {
      console.log(`  (no chunks — auto-compose)`);
      continue;
    }
    for (const c of r.chunks) {
      if (!c.ok) continue;
      const note = c.note ? ` — ${c.note}` : '';
      console.log(`  [${c.range[0]}, ${c.range[1]}] ${c.kind} @ ${fmtTime(c.tStart)}  "${c.text}"${note}`);
    }
  }
  if (anyErrors) process.exit(1);
}

main();
