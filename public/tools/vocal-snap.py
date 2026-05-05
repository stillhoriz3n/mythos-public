#!/usr/bin/env python3
"""vocal-snap.py — snap Whisper word timings to real vocal onsets.

Whisper's word-level alignment is a best guess — it's usually within 100 ms
but sometimes drifts enough that letters light up before the vocalist starts
the word, which makes the visualizer's plinko rain miss its target. This
tool reads an mp3 + its whisper-aligned lyrics JSON, computes a per-frame
vocal-band energy signal, finds rising edges (vocal onsets), and for every
word snaps `t` to the nearest onset within ±SNAP_WINDOW. Word duration `d`
is preserved.

The gate constants mirror the runtime `vocalGate` in public/shell.js so the
offline snap and the live visualizer agree on what "singing" means.

Usage:
    python3 vocal-snap.py --mp3 song.mp3 --lyrics song.json [--apply]
    python3 vocal-snap.py --all public/music           # batch dry-run
    python3 vocal-snap.py --all public/music --apply   # commit in-place
"""

import argparse
import json
import statistics
import sys
from pathlib import Path

import librosa
import numpy as np

SR = 22050
N_FFT = 2048
HOP = 512                        # ≈ 23 ms frame hop
FRAME_DT = HOP / SR

VOCAL_HZ = (200, 1500)           # fundamental + first formant
SIBILANT_HZ = (3000, 6000)       # weighted tail for consonant edges
SIBILANT_WEIGHT = 0.35

FAST_TAU = 0.060                 # 60 ms follower
SLOW_TAU = 2.4                   # 2.4 s baseline
GATE_FLOOR = 0.05

SNAP_WINDOW = 0.150              # ±150 ms
ONSET_GATE = 0.35                # vocal gate must exceed this to count as onset
MIN_ONSET_SPACING = 0.080        # 80 ms — debounce adjacent frames


def compute_vocal_gate(y: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Return (times, vocalGate) using the same model as shell.js runtime."""
    S = np.abs(librosa.stft(y, n_fft=N_FFT, hop_length=HOP)) ** 2
    freqs = librosa.fft_frequencies(sr=SR, n_fft=N_FFT)

    def band(lo_hz, hi_hz):
        lo, hi = np.searchsorted(freqs, lo_hz), np.searchsorted(freqs, hi_hz)
        return S[lo:hi].sum(axis=0)

    raw = band(*VOCAL_HZ) + SIBILANT_WEIGHT * band(*SIBILANT_HZ)
    raw /= max(raw.max(), 1e-9)  # normalize to ~[0, 1]

    fast_a = 1 - np.exp(-FRAME_DT / FAST_TAU)
    slow_a = 1 - np.exp(-FRAME_DT / SLOW_TAU)
    fast = np.zeros_like(raw)
    slow = np.zeros_like(raw)
    f, s = 0.0, 0.0
    for i, v in enumerate(raw):
        f += (v - f) * fast_a
        s += (v - s) * slow_a
        fast[i], slow[i] = f, s

    above = fast - np.maximum(GATE_FLOOR, slow * 1.05)
    denom = np.maximum(0.04, slow * 0.8 + 0.06)
    gate = np.clip(above / denom, 0.0, 1.2)

    times = np.arange(len(raw)) * FRAME_DT
    return times, gate


def find_onsets(times: np.ndarray, gate: np.ndarray) -> np.ndarray:
    """Rising edges where gate crosses ONSET_GATE upward, debounced."""
    above = gate >= ONSET_GATE
    rising = np.where(above[1:] & ~above[:-1])[0] + 1
    if len(rising) == 0:
        return np.array([], dtype=float)

    onset_times = times[rising]
    deduped = [onset_times[0]]
    for t in onset_times[1:]:
        if t - deduped[-1] >= MIN_ONSET_SPACING:
            deduped.append(t)
    return np.array(deduped)


def snap_word_times(lyrics: dict, onsets: np.ndarray) -> tuple[dict, list[dict]]:
    """Return (snapped lyrics dict, per-word snap log)."""
    out = json.loads(json.dumps(lyrics))  # deep copy
    log = []

    for li, line in enumerate(out.get("lines", [])):
        for wi, word in enumerate(line.get("words", [])):
            t0 = float(word["t"])
            if len(onsets) == 0:
                continue
            idx = np.searchsorted(onsets, t0)
            candidates = []
            if idx > 0:
                candidates.append(onsets[idx - 1])
            if idx < len(onsets):
                candidates.append(onsets[idx])
            best_t = min(candidates, key=lambda c: abs(c - t0))
            delta = best_t - t0
            if abs(delta) <= SNAP_WINDOW:
                word["t"] = float(best_t)
                log.append({
                    "line": li, "wi": wi, "w": word.get("w", ""),
                    "was": t0, "now": float(best_t), "delta": float(delta),
                })

        # Resync the line's own t to first word's t if it shifted.
        if line.get("words"):
            line["t"] = line["words"][0]["t"]

    return out, log


def snap_pair(mp3_path: Path, lyrics_path: Path, apply: bool) -> dict:
    print(f"\n── {mp3_path.name}")
    y, _ = librosa.load(str(mp3_path), sr=SR, mono=True)
    duration = len(y) / SR
    times, gate = compute_vocal_gate(y)
    onsets = find_onsets(times, gate)
    print(f"  audio {duration:.1f}s, {len(onsets)} vocal onsets detected")

    lyrics = json.loads(lyrics_path.read_text(encoding="utf-8"))
    snapped, log = snap_word_times(lyrics, onsets)

    total_words = sum(len(l.get("words", [])) for l in lyrics.get("lines", []))
    snapped_count = len(log)
    if not log:
        print(f"  no words moved — either perfectly aligned or no onsets in range")
        return {"path": str(lyrics_path), "total": total_words, "snapped": 0}

    deltas_ms = [abs(e["delta"]) * 1000 for e in log]
    print(
        f"  snapped {snapped_count}/{total_words} words  "
        f"(|Δ| mean={statistics.mean(deltas_ms):.0f}ms  "
        f"median={statistics.median(deltas_ms):.0f}ms  "
        f"max={max(deltas_ms):.0f}ms)"
    )
    # Small histogram so drift distribution is visible at a glance.
    buckets = [0, 0, 0, 0]  # <25 / <50 / <100 / <=150
    for d in deltas_ms:
        if d < 25:   buckets[0] += 1
        elif d < 50: buckets[1] += 1
        elif d < 100: buckets[2] += 1
        else:         buckets[3] += 1
    print(f"  drift: <25ms={buckets[0]}  <50ms={buckets[1]}  <100ms={buckets[2]}  ≤150ms={buckets[3]}")

    if apply:
        lyrics_path.write_text(json.dumps(snapped, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  wrote (in-place): {lyrics_path}")
    else:
        out_path = lyrics_path.with_suffix(".snapped.json")
        out_path.write_text(json.dumps(snapped, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  wrote (dry-run): {out_path}  (re-run with --apply to commit)")

    return {"path": str(lyrics_path), "total": total_words, "snapped": snapped_count,
            "mean_ms": statistics.mean(deltas_ms), "max_ms": max(deltas_ms)}


def find_pairs(music_dir: Path) -> list[tuple[Path, Path]]:
    pairs = []
    lyrics_dir = music_dir / "lyrics"
    for mp3 in sorted(music_dir.glob("*.mp3")):
        stem = mp3.stem
        # Prefer the chunker-consumed lyrics JSON, not the raw *.whisper.json.
        candidate = lyrics_dir / f"{stem}.json"
        if candidate.exists():
            pairs.append((mp3, candidate))
    return pairs


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--mp3")
    p.add_argument("--lyrics")
    p.add_argument("--all", metavar="MUSIC_DIR", help="batch mode: scan <dir>/*.mp3 + <dir>/lyrics/<stem>.json")
    p.add_argument("--apply", action="store_true", help="overwrite lyrics JSON in-place (default: write *.snapped.json)")
    args = p.parse_args()

    if args.all:
        pairs = find_pairs(Path(args.all))
        if not pairs:
            print(f"no (mp3, lyrics) pairs in {args.all}", file=sys.stderr); sys.exit(1)
        print(f"found {len(pairs)} track(s)")
        results = [snap_pair(mp3, lyr, args.apply) for mp3, lyr in pairs]
        print("\n── summary")
        for r in results:
            if r.get("snapped"):
                print(f"  {Path(r['path']).name}: {r['snapped']}/{r['total']} words, mean |Δ|={r['mean_ms']:.0f}ms, max={r['max_ms']:.0f}ms")
            else:
                print(f"  {Path(r['path']).name}: 0 words moved")
        return

    if not args.mp3 or not args.lyrics:
        p.error("either --all, or --mp3 and --lyrics are required")
    snap_pair(Path(args.mp3), Path(args.lyrics), args.apply)


if __name__ == "__main__":
    main()
