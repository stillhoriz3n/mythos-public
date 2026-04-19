#!/usr/bin/env node
/*
 * analyze-lyrics.js — Composer's-brief generator for MythOS lyric viz.
 *
 * For each track in public/music/lyrics/*.json, this script:
 *   1. Mirrors the auto-chunker logic from public/shell.js (same break
 *      thresholds, same key-phrase detection).
 *   2. Writes a human-readable analysis report alongside the lyrics:
 *        public/music/lyrics/<stem>.analysis.md
 *      listing every chunk the engine would produce, with word indices,
 *      timestamps, char counts, auto-key detection, density hotspots,
 *      and holds.
 *   3. Generates a blank direction template if one doesn't already exist:
 *        public/music/directions/<stem>.json
 *      pre-populated with an empty chunks[] array the composer can edit.
 *
 * The analyzer is the ingredients board. The direction file is the score.
 *
 * Usage:
 *   node tools/analyze-lyrics.js              # all tracks
 *   node tools/analyze-lyrics.js "rr-1*"      # glob filter
 *
 * Keep the break thresholds and key-detection rules in sync with
 * public/shell.js — the analyzer predicts what the engine will do, so
 * drift means the brief lies.
 */

const fs = require('fs');
const path = require('path');

// ── Must stay in sync with shell.js ──
const LYRIC_LEAD = 3.5;
const LYRIC_TAIL = 2.5;
const GAP_HARD = 0.50;
const GAP_STALL = 0.35;
const STALL_WORDS = 2;
const GAP_SOFT = 0.18;
const SOFT_WORDS = 6;
const MAX_CHARS = 56;

const REPO_ROOT = path.resolve(__dirname, '..');
const LYRICS_DIR = path.join(REPO_ROOT, 'public', 'music', 'lyrics');
const DIRECTIONS_DIR = path.join(REPO_ROOT, 'public', 'music', 'directions');

function flattenWords(lyricsJson) {
  const out = [];
  const lines = lyricsJson && lyricsJson.lines ? lyricsJson.lines : [];
  for (let li = 0; li < lines.length; li++) {
    const ln = lines[li];
    if (!ln || !ln.words) continue;
    for (const w of ln.words) {
      if (!w || !w.w) continue;
      out.push({ t: +w.t, d: +w.d, w: w.w, srcLine: li });
    }
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}

function chunk(words) {
  const chunks = [];
  let cur = null;
  for (let i = 0; i < words.length; i++) {
    const wRec = words[i];
    const prev = cur && cur.words.length ? cur.words[cur.words.length - 1] : null;
    const gap = prev ? wRec.t - (prev.t + prev.d) : Infinity;
    const chars = cur ? cur.chars + 1 + wRec.w.length : wRec.w.length;
    const shouldBreak = !cur
      || gap > GAP_HARD
      || (cur.words.length >= STALL_WORDS && gap > GAP_STALL)
      || (cur.words.length >= SOFT_WORDS && gap > GAP_SOFT)
      || chars > MAX_CHARS;
    if (shouldBreak) {
      cur = { words: [], chars: 0, firstWordIdx: i, breakReason: null };
      if (prev) {
        if (gap > GAP_HARD) cur.breakReason = `HARD gap ${gap.toFixed(2)}s`;
        else if (cur.words.length >= STALL_WORDS && gap > GAP_STALL) cur.breakReason = `STALL gap ${gap.toFixed(2)}s`;
        else if (cur.words.length >= SOFT_WORDS && gap > GAP_SOFT) cur.breakReason = `SOFT gap ${gap.toFixed(2)}s`;
        else if (chars > MAX_CHARS) cur.breakReason = `MAX_CHARS`;
      } else {
        cur.breakReason = 'start';
      }
      chunks.push(cur);
    }
    cur.words.push(wRec);
    cur.chars = cur.words.length === 1 ? wRec.w.length : cur.chars + 1 + wRec.w.length;
    cur.lastWordIdx = i;
  }
  // Finalize
  for (const c of chunks) {
    const first = c.words[0], last = c.words[c.words.length - 1];
    c.t = first.t;
    c.tEnd = last.t + last.d;
    c.text = c.words.map((w) => w.w).join(' ');
    c.startT = c.t - LYRIC_LEAD;
    c.endT = c.tEnd + LYRIC_TAIL;
  }
  return chunks;
}

function detectAutoKeys(chunks) {
  const textCounts = {};
  for (const c of chunks) {
    const n = c.text.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    c._ntext = n;
    textCounts[n] = (textCounts[n] || 0) + 1;
  }
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const repeated = textCounts[c._ntext] >= 3 && c._ntext.length > 2;
    const prevEnd = i > 0 ? chunks[i - 1].tEnd : -Infinity;
    const nextStart = i < chunks.length - 1 ? chunks[i + 1].t : Infinity;
    const prevGap = c.t - prevEnd;
    const nextGap = nextStart - c.tEnd;
    const isolated = prevGap >= 1.5 && nextGap >= 1.5
      && c.words.length >= 2 && c.words.length <= 6;
    c.autoKey = repeated || isolated;
    c.autoKeyReason = repeated ? `repeat×${textCounts[c._ntext]}` : (isolated ? 'isolated' : null);
  }
}

function fmtTime(t) {
  const m = Math.floor(t / 60);
  const s = (t - m * 60).toFixed(2);
  return `${m}:${s.padStart(5, '0')}`;
}

function rangeOfWords(chunks, chunk) {
  const first = chunk.firstWordIdx, last = chunk.lastWordIdx;
  return `[${first}, ${last}]`;
}

function densityHotspots(words, windowSec = 2.0, threshold = 14) {
  // Count letters per rolling `windowSec`. Report spans with ≥ threshold.
  const hotspots = [];
  let start = 0;
  for (let i = 0; i < words.length; i++) {
    while (start < i && words[i].t - words[start].t > windowSec) start++;
    let letters = 0;
    for (let j = start; j <= i; j++) letters += words[j].w.length;
    if (letters >= threshold) {
      if (hotspots.length === 0 || words[i].t - hotspots[hotspots.length - 1].tEnd > 1.0) {
        hotspots.push({ t: words[start].t, tEnd: words[i].t + words[i].d, letters });
      } else {
        const last = hotspots[hotspots.length - 1];
        last.tEnd = words[i].t + words[i].d;
        last.letters = Math.max(last.letters, letters);
      }
    }
  }
  return hotspots;
}

function longHolds(words, minHoldSec = 1.2) {
  // A "hold" = a word whose `d` (sung duration) exceeds minHoldSec.
  return words
    .map((w, i) => ({ idx: i, ...w }))
    .filter((w) => w.d >= minHoldSec);
}

function jsonLineBoundaries(words) {
  // Detect where JSON lines change.
  const boundaries = [];
  for (let i = 1; i < words.length; i++) {
    if (words[i].srcLine !== words[i - 1].srcLine) {
      boundaries.push({ wordIdx: i, t: words[i].t, fromLine: words[i - 1].srcLine, toLine: words[i].srcLine });
    }
  }
  return boundaries;
}

function writeReport(stem, words, chunks, holds, hotspots, boundaries) {
  const out = [];
  out.push(`# ${stem} — composer's brief\n`);
  out.push(`_Auto-generated by \`tools/analyze-lyrics.js\`. Edit the direction file, not this report._\n`);
  out.push(`\n## Summary\n`);
  out.push(`- Words: **${words.length}**`);
  out.push(`- Auto-chunks: **${chunks.length}**`);
  const autoKeys = chunks.filter((c) => c.autoKey);
  out.push(`- Auto-detected keys: **${autoKeys.length}**`);
  out.push(`- Rapid-fire hotspots (≥14 letters / 2s): **${hotspots.length}**`);
  out.push(`- Long holds (≥1.2s sustained word): **${holds.length}**`);
  out.push(`- JSON line boundaries: **${boundaries.length}**`);
  out.push(``);

  if (autoKeys.length > 0) {
    out.push(`\n## Auto-detected KEY phrases\n`);
    out.push(`These will render centered big-dark-amber automatically. If any shouldn't, override with \`"kind":"ribbon"\` in direction.json.\n`);
    for (const c of autoKeys) {
      out.push(`- **${rangeOfWords(chunks, c)}** @ ${fmtTime(c.t)} — _${c.autoKeyReason}_ — "${c.text}"`);
    }
  }

  if (hotspots.length > 0) {
    out.push(`\n## Rapid-fire hotspots\n`);
    out.push(`Dense passages where \`"kind":"rapidfire"\` with \`maxWordsPerChunk: 2\` may read better than default chunking.\n`);
    for (const h of hotspots) {
      out.push(`- ${fmtTime(h.t)} → ${fmtTime(h.tEnd)} (${(h.tEnd - h.t).toFixed(1)}s, peak ${h.letters} letters/2s)`);
    }
  }

  if (holds.length > 0) {
    out.push(`\n## Long holds (sustained words)\n`);
    out.push(`Candidate moments for \`"kind":"hold"\` — single sustained word, don't split.\n`);
    for (const h of holds) {
      out.push(`- word **#${h.idx}** @ ${fmtTime(h.t)} — "${h.w}" (${h.d.toFixed(2)}s)`);
    }
  }

  out.push(`\n## Full auto-chunk listing\n`);
  out.push(`| # | wordRange | start | end | chars | key? | break | text |`);
  out.push(`|---|-----------|-------|-----|-------|------|-------|------|`);
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const key = c.autoKey ? '★' : '';
    const txt = c.text.replace(/\|/g, '\\|');
    out.push(`| ${i} | ${rangeOfWords(chunks, c)} | ${fmtTime(c.t)} | ${fmtTime(c.tEnd)} | ${c.chars} | ${key} | ${c.breakReason || ''} | ${txt} |`);
  }

  out.push(`\n## Composition cheatsheet\n`);
  out.push(`Add entries to \`public/music/directions/${stem}.json\` → \`chunks\`:\n`);
  out.push('```json');
  out.push(`{ "wordRange": [14, 21], "kind": "key", "note": "the hook" }`);
  out.push(`{ "wordRange": [45, 60], "kind": "rapidfire", "maxWordsPerChunk": 2 }`);
  out.push(`{ "wordRange": [80, 80], "kind": "hold", "emphasis": 1.6 }`);
  out.push(`{ "wordRange": [100, 112], "kind": "couplet-pair", "preferBands": [1, 4] }`);
  out.push(`{ "wordRange": [180, 186], "kind": "eclipse", "note": "the break" }`);
  out.push('```');

  return out.join('\n') + '\n';
}

function writeBlankDirection(stem) {
  return JSON.stringify({
    track: stem,
    notes: 'Composer notes here. Read the .analysis.md alongside this file. Empty chunks[] = full auto.',
    defaults: { intensity: 1.0, colorBias: 'neutral' },
    chunks: [],
    moments: [],
  }, null, 2) + '\n';
}

function main() {
  const globFilter = process.argv[2];
  if (!fs.existsSync(LYRICS_DIR)) {
    console.error('No lyrics dir:', LYRICS_DIR);
    process.exit(1);
  }
  fs.mkdirSync(DIRECTIONS_DIR, { recursive: true });

  const files = fs.readdirSync(LYRICS_DIR)
    .filter((f) => f.endsWith('.json') && !f.endsWith('.whisper.json') && !f.endsWith('.analysis.json'));

  const matches = globFilter
    ? files.filter((f) => {
        // naïve glob: supports * at end only ("rr-1*")
        if (globFilter.endsWith('*')) return f.startsWith(globFilter.slice(0, -1));
        return f.startsWith(globFilter);
      })
    : files;

  if (matches.length === 0) {
    console.error('No matching lyrics found.');
    process.exit(1);
  }

  console.log(`Analyzing ${matches.length} track${matches.length === 1 ? '' : 's'}...`);
  for (const f of matches) {
    const stem = f.replace(/\.json$/, '');
    const lyricsPath = path.join(LYRICS_DIR, f);
    const lyricsJson = JSON.parse(fs.readFileSync(lyricsPath, 'utf8'));
    const words = flattenWords(lyricsJson);
    const chunks = chunk(words);
    detectAutoKeys(chunks);
    const holds = longHolds(words);
    const hotspots = densityHotspots(words);
    const boundaries = jsonLineBoundaries(words);

    const report = writeReport(stem, words, chunks, holds, hotspots, boundaries);
    const reportPath = path.join(LYRICS_DIR, `${stem}.analysis.md`);
    fs.writeFileSync(reportPath, report);

    const directionPath = path.join(DIRECTIONS_DIR, `${stem}.json`);
    if (!fs.existsSync(directionPath)) {
      fs.writeFileSync(directionPath, writeBlankDirection(stem));
      console.log(`  ${stem}: report + blank direction`);
    } else {
      console.log(`  ${stem}: report (direction exists — not overwritten)`);
    }
  }
  console.log('Done.');
}

main();
