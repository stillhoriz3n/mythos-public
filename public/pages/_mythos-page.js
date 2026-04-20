// ═══════════════════════════════════════════════════════════════════
// _mythos-page.js — Spectrum consumer (iframe side)
// ═══════════════════════════════════════════════════════════════════
//
// Consumes the shell's mythos:beat broadcast and flattens it into CSS
// custom properties on <html>. Any page that loads this script can
// declare audio-reactive visuals in pure CSS by reading the variables
// listed below.
//
// ─ VARIABLE CONTRACT ─────────────────────────────────────────────
//
//   Beat clock (sawtooths + pulses):
//     --beat-phase         0→1 per beat (sawtooth, resets on downbeat)
//     --beat-pulse         0→1 sharp attack + exp decay per beat
//     --beat-bar-phase     0→1 per 4-beat bar
//     --beat-bar-pulse     0→1 sharp attack + decay on bar downbeat
//     --beat-bpm           numeric BPM
//     --beat-sec           seconds-per-beat, for animation-duration
//     --beat-bar-sec       seconds-per-bar (4 beats)
//
//   Frequency bands (0..1, VU-ballistic):
//     --band-0 .. --band-9
//     --band-0-l .. --band-9-l   (left channel only)
//     --band-0-r .. --band-9-r   (right channel only)
//     --pan-balance              -1 (hard L) .. +1 (hard R); 0 = centered
//
//   Named band aliases (convenience):
//     --sub-bass    = band 0
//     --bass        = band 1
//     --low-mid     = band 2
//     --mid         = band 4
//     --high-mid    = band 5
//     --presence    = band 6
//     --treble      = band 7
//     --brilliance  = band 8
//     --air         = band 9
//
//   Onset pulses (rising-edge detectors, exp decay ~200ms):
//     --onset-0 .. --onset-9
//     --onset-bass   = max(onset 0..2)
//     --onset-mid    = max(onset 3..6)
//     --onset-high   = max(onset 7..9)
//     --kick         = onset 0  (sub-bass transient)
//     --snare        = onset 4  (mid transient)
//     --hat          = onset 8  (brilliance transient)
//
//   Derived:
//     --envelope     0..1 overall loudness (slow)
//     --seal-color   hex of the currently-glowing M
//     --seal-m       integer 0..4
//
// ─ DECLARATIVE HOOKS ─────────────────────────────────────────────
//
//   [data-band="N"]      — element's --band-level inherits --band-N
//   [data-band="N-M"]    — --band-level = average of --band-N..--band-M
//   [data-band-role="X"] — X ∈ {sub-bass, bass, low-mid, mid, high-mid,
//                                presence, treble, brilliance, air}
//
//   [data-tint="#hex"]   — shell viz color lerps toward hex when this
//                          element dominates the viewport
//
//   [data-reveal]        — .in-view class added on scroll-into-view
//
//   .m-meter             — utility: inject a reactive bar stripe.
//                          Pair with data-band(-role) and optional
//                          data-meter-axis="h|v" (default v) and
//                          data-meter-floor="0..1" (default 0.08).
//
// ─ PERF ──────────────────────────────────────────────────────────
//
//   - Shell broadcasts at ~60fps only while this page has subscribed.
//   - This script applies the latest payload in requestAnimationFrame
//     so CSS-var writes are batched and don't thrash layout.
//   - Page Visibility API: unsubscribes when the page is hidden.
//
(function(){
  'use strict';

  var BAND_ROLES = {
    'sub-bass': 0, 'bass': 1, 'low-mid': 2, 'low-mid-hi': 3,
    'mid': 4, 'high-mid': 5, 'presence': 6,
    'treble': 7, 'brilliance': 8, 'air': 9,
  };

  var root = document.documentElement.style;
  var latestMsg = null;
  var rafPending = false;

  function applyMsg(d) {
    if (!d) return;
    var b = d.beat;
    var playing = !!d.playing;
    if (b) {
      root.setProperty('--beat-pulse',     playing ? b.pulse.toFixed(3) : '0');
      root.setProperty('--beat-phase',     playing ? b.phase.toFixed(3) : '0');
      root.setProperty('--beat-bar-pulse', playing ? b.barPulse.toFixed(3) : '0');
      root.setProperty('--beat-bar-phase', playing ? b.bar.toFixed(3) : '0');
      root.setProperty('--beat-bpm',       b.bpm || 120);
      root.setProperty('--beat-sec',       (60 / (b.bpm || 120)).toFixed(4) + 's');
      root.setProperty('--beat-bar-sec',   (240 / (b.bpm || 120)).toFixed(4) + 's');
    }
    if (d.sealColor) root.setProperty('--seal-color', d.sealColor);
    if (typeof d.sealM === 'number') root.setProperty('--seal-m', d.sealM);
    if (typeof d.envelope === 'number') root.setProperty('--envelope', d.envelope.toFixed(3));
    if (d.bands) {
      for (var i = 0; i < d.bands.length; i++) {
        root.setProperty('--band-' + i, playing ? d.bands[i].toFixed(3) : '0');
      }
    }
    if (d.bandsL) {
      for (var i = 0; i < d.bandsL.length; i++) {
        root.setProperty('--band-' + i + '-l', playing ? d.bandsL[i].toFixed(3) : '0');
      }
    }
    if (d.bandsR) {
      for (var i = 0; i < d.bandsR.length; i++) {
        root.setProperty('--band-' + i + '-r', playing ? d.bandsR[i].toFixed(3) : '0');
      }
    }
    if (typeof d.panBalance === 'number') {
      root.setProperty('--pan-balance', playing ? d.panBalance.toFixed(3) : '0');
    }
    if (d.onsets) {
      for (var i = 0; i < d.onsets.length; i++) {
        root.setProperty('--onset-' + i, playing ? d.onsets[i].toFixed(3) : '0');
      }
      // Grouped onset maxes
      var lo = 0, mid = 0, hi = 0;
      for (var i = 0; i <= 2; i++) if (d.onsets[i] > lo) lo = d.onsets[i];
      for (var i = 3; i <= 6; i++) if (d.onsets[i] > mid) mid = d.onsets[i];
      for (var i = 7; i <= 9; i++) if (d.onsets[i] > hi) hi = d.onsets[i];
      root.setProperty('--onset-bass', playing ? lo.toFixed(3) : '0');
      root.setProperty('--onset-mid',  playing ? mid.toFixed(3) : '0');
      root.setProperty('--onset-high', playing ? hi.toFixed(3) : '0');
      root.setProperty('--kick',  playing ? d.onsets[0].toFixed(3) : '0');
      root.setProperty('--snare', playing ? d.onsets[4].toFixed(3) : '0');
      root.setProperty('--hat',   playing ? d.onsets[8].toFixed(3) : '0');
    }
    // Per-word lyric cursor (broadcast currentTime is authoritative)
    if (typeof d.currentTime === 'number' && lyricsState.containers.length) {
      updateLyricsCursor(d.currentTime, playing);
    }
  }

  function tick() {
    rafPending = false;
    applyMsg(latestMsg);
  }

  window.addEventListener('message', function(e){
    var d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type !== 'mythos:beat') return;
    latestMsg = d;
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(tick);
    }
  });

  // ─ Subscribe / unsubscribe (Visibility API) ─
  var subscribed = false;
  function subscribe() {
    if (subscribed) return;
    if (!window.parent || window.parent === window) return;
    window.parent.postMessage({ type: 'mythos:beat:subscribe' }, '*');
    subscribed = true;
  }
  function unsubscribe() {
    if (!subscribed) return;
    if (!window.parent || window.parent === window) return;
    window.parent.postMessage({ type: 'mythos:beat:unsubscribe' }, '*');
    subscribed = false;
  }
  function syncVisibility() {
    if (document.hidden) unsubscribe(); else subscribe();
  }
  document.addEventListener('visibilitychange', syncVisibility);
  subscribe();

  // ─ Section-based tint (data-tint) ─
  function setupTint() {
    var sections = document.querySelectorAll('[data-tint]');
    if (!sections.length || !('IntersectionObserver' in window)) return;
    var active = new Map();
    var lastSent = null;
    function broadcast() {
      if (!window.parent || window.parent === window) return;
      var best = null, bestR = 0;
      active.forEach(function(r, n){ if (r > bestR) { best = n; bestR = r; } });
      var key = best ? (best.getAttribute('data-tint') + '|' + (best.getAttribute('data-tint-machine') || '')) : 'none';
      if (key === lastSent) return;
      lastSent = key;
      window.parent.postMessage({
        type: 'mythos:tint',
        synth: best ? best.getAttribute('data-tint') : null,
        machine: best ? best.getAttribute('data-tint-machine') : null,
      }, '*');
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting) active.set(e.target, e.intersectionRatio);
        else active.delete(e.target);
      });
      broadcast();
    }, { threshold: [0, 0.15, 0.3, 0.5, 0.75] });
    sections.forEach(function(s){ io.observe(s); });
  }

  // ─ Scroll-reveal (data-reveal → .in-view) ─
  function setupReveal() {
    var items = document.querySelectorAll('[data-reveal]');
    if (!items.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) e.target.classList.add('in-view');
      });
    }, { threshold: 0.25 });
    items.forEach(function(r) { io.observe(r); });
  }

  // ─ Band binding (data-band, data-band-role) ─
  function resolveBand(spec) {
    if (!spec) return null;
    // Named role?
    if (BAND_ROLES.hasOwnProperty(spec)) return 'var(--band-' + BAND_ROLES[spec] + ', 0)';
    var parts = spec.split('-');
    if (parts.length === 1) {
      return 'var(--band-' + parts[0].trim() + ', 0)';
    }
    // Range "N-M"
    var lo = parseInt(parts[0], 10), hi = parseInt(parts[1], 10);
    if (isNaN(lo) || isNaN(hi)) return null;
    var terms = [];
    for (var n = lo; n <= hi; n++) terms.push('var(--band-' + n + ', 0)');
    return 'calc((' + terms.join(' + ') + ') / ' + terms.length + ')';
  }

  function setupBands() {
    document.querySelectorAll('[data-band]').forEach(function(el) {
      var v = resolveBand(el.getAttribute('data-band'));
      if (v) el.style.setProperty('--band-level', v);
    });
    document.querySelectorAll('[data-band-role]').forEach(function(el) {
      var role = el.getAttribute('data-band-role');
      if (BAND_ROLES.hasOwnProperty(role)) {
        el.style.setProperty('--band-level', 'var(--band-' + BAND_ROLES[role] + ', 0)');
      }
    });
  }

  // ─ Lyrics — per-word karaoke consumer ─
  //
  // For any <div class="m-lyrics"> on the page: fetch the lyrics JSON
  // for the currently-playing track from ../music/lyrics/<stem>.json,
  // render it, and update word classes + --word-progress each frame
  // from the shell's broadcast currentTime.
  //
  var lyricsState = {
    containers: [],      // DOM roots
    trackFile: null,     // e.g. "music/sh-1 - askJarvis.mp3"
    trackDuration: 0,    // seconds, from mythos:audio broadcast; 0 = unknown
    data: null,          // { lines: [ { t, words: [...] } ] }
    flatWords: [],       // flat index for fast cursor
    flatLineIdx: [],     // parallel line index for each flat word
    currentWordIdx: -1,
    currentLineIdx: -1,
    loadToken: 0,        // guards against stale fetches on track change
  };

  function fileStem(file) {
    if (!file) return null;
    var name = file.split('/').pop();        // "sh-1 - askJarvis.mp3"
    return name.replace(/\.[^.]+$/, '');     // "sh-1 - askJarvis"
  }

  function lyricsPath(file) {
    var stem = fileStem(file);
    if (!stem) return null;
    // Pages live at pages/*.html; lyrics live at music/lyrics/*.json
    return '../music/lyrics/' + encodeURIComponent(stem) + '.json';
  }

  function buildLyricsDom(container) {
    var windowed = container.hasAttribute('data-lyrics-window');
    // Honour data-lyrics-lines="N" by pushing it to the CSS custom property
    // the meters stylesheet reads. Without this, the attribute is dead.
    var linesAttr = container.getAttribute('data-lyrics-lines');
    var linesN = parseInt(linesAttr, 10);
    if (linesN && linesN > 0 && linesN < 50) {
      container.style.setProperty('--m-lyrics-lines', linesN);
    }
    var track = document.createElement('div');
    track.className = 'm-lyrics-track';
    container.innerHTML = '';
    if (windowed) container.appendChild(track);
    var host = windowed ? track : container;

    if (!lyricsState.data || !lyricsState.data.lines || !lyricsState.data.lines.length) {
      // Critical: reset flat indices so updateLyricsCursor doesn't try to
      // style orphaned DOM nodes from the previous track.
      lyricsState.flatWords = [];
      lyricsState.flatLineIdx = [];
      lyricsState.currentWordIdx = -1;
      lyricsState.currentLineIdx = -1;
      var empty = document.createElement('div');
      empty.className = 'm-lyrics-line is-future';
      empty.textContent = '— no lyrics —';
      host.appendChild(empty);
      return;
    }

    lyricsState.flatWords = [];
    lyricsState.flatLineIdx = [];
    lyricsState.data.lines.forEach(function(line, li) {
      var ldiv = document.createElement('div');
      ldiv.className = 'm-lyrics-line';
      ldiv.dataset.lineIdx = li;
      (line.words || []).forEach(function(w, wi) {
        var span = document.createElement('span');
        span.className = 'm-lyrics-word is-future';
        span.textContent = w.w;
        span.dataset.t = w.t;
        span.dataset.d = w.d;
        span.dataset.flat = lyricsState.flatWords.length;
        span.style.setProperty('--word-t', w.t);
        ldiv.appendChild(span);
        ldiv.appendChild(document.createTextNode(' '));
        lyricsState.flatWords.push({ t: +w.t, d: +w.d, el: span });
        lyricsState.flatLineIdx.push(li);
      });
      host.appendChild(ldiv);
    });

    // Publish line height for windowed transform math
    var first = host.querySelector('.m-lyrics-line');
    if (first && windowed) {
      container.style.setProperty('--m-lyrics-line-h',
        first.getBoundingClientRect().height + 'px');
    }
    // Seek-on-click
    host.querySelectorAll('.m-lyrics-word').forEach(function(span){
      span.addEventListener('click', function(){
        if (!window.parent || window.parent === window) return;
        window.parent.postMessage({
          type: 'mythos:audio:cmd', cmd: 'seek', time: +span.dataset.t,
        }, '*');
      });
    });
  }

  function loadLyricsForTrack(file) {
    if (lyricsState.trackFile === file) return;
    lyricsState.trackFile = file;
    var token = ++lyricsState.loadToken;
    var url = lyricsPath(file);
    if (!url) { lyricsState.data = null; lyricsState.containers.forEach(buildLyricsDom); return; }
    fetch(url).then(function(r){
      if (!r.ok) throw new Error('no-lyrics');
      return r.json();
    }).then(function(json){
      if (token !== lyricsState.loadToken) return;
      lyricsState.data = json;
      lyricsState.currentWordIdx = -1;
      lyricsState.currentLineIdx = -1;
      lyricsState.containers.forEach(buildLyricsDom);
    }).catch(function(){
      if (token !== lyricsState.loadToken) return;
      lyricsState.data = null;
      lyricsState.containers.forEach(buildLyricsDom);
    });
  }

  // Line cursor — applies is-active/is-past/is-future + windowed scroll.
  // Factored out so the low-alignment path (which drives the line index
  // directly from duration) can reuse the same DOM manipulation without
  // going through the word-level machinery.
  function applyLineCursor(newLine) {
    if (newLine === lyricsState.currentLineIdx) return;
    lyricsState.containers.forEach(function(c){
      c.querySelectorAll('.m-lyrics-line').forEach(function(ld, li){
        ld.classList.toggle('is-active', li === newLine);
        ld.classList.toggle('is-past',   li < newLine);
        ld.classList.toggle('is-future', li > newLine);
      });
      // Windowed scroll — translate so the active line lands at container centre.
      // The track is centered via `top:50%; translateY(-50% + <this>)`, which
      // puts the track's middle at the container's middle when offset is 0.
      // Measuring the active line's actual offset inside the track handles
      // wrapped lines correctly (a long lyric line that breaks across two
      // visual rows counts as two heights worth of track, not one).
      if (c.hasAttribute('data-lyrics-window') && newLine >= 0) {
        var track = c.querySelector('.m-lyrics-track');
        var activeLine = track ? track.children[newLine] : null;
        if (track && activeLine) {
          var trackH = track.offsetHeight || 0;
          var lineCenter = activeLine.offsetTop + activeLine.offsetHeight / 2;
          var offset = (trackH / 2) - lineCenter;
          c.style.setProperty('--m-lyrics-translate', offset + 'px');
        }
      }
    });
    lyricsState.currentLineIdx = newLine;
  }

  function updateLyricsCursor(t, playing) {
    if (!lyricsState.flatWords.length) return;
    var alignmentOK = !(lyricsState.data &&
                        lyricsState.data.meta &&
                        typeof lyricsState.data.meta.matched_pct === 'number' &&
                        lyricsState.data.meta.matched_pct < 30);
    // Low-alignment fallback: Whisper couldn't find the words. All the
    // per-word timings are fake 0.25s-per-word interpolations covering a
    // fraction of the real song length. Using them makes the karaoke race
    // through the whole song in the first 30–60s and stick at the end.
    // Instead, drive the LINE cursor directly from (currentTime / duration)
    // × numLines and skip the word-level machinery entirely. The .is-active
    // line lands where it should; we just don't pretend to know sub-line
    // timing. Requires knowing the real duration from the audio broadcast.
    if (!alignmentOK && lyricsState.trackDuration > 0 && lyricsState.data.lines) {
      var numLines = lyricsState.data.lines.length;
      var progressed = Math.max(0, Math.min(1, t / lyricsState.trackDuration));
      var syntheticLine = Math.min(numLines - 1, Math.floor(progressed * numLines));
      applyLineCursor(syntheticLine);
      return;
    }
    // Find the active word: greatest i where flatWords[i].t <= t
    // Use a linear scan from current position (usually advances 0-1 words per frame).
    var words = lyricsState.flatWords;
    var idx = lyricsState.currentWordIdx;
    // Reverse if we seeked backward
    if (idx >= 0 && words[idx].t > t) idx = -1;
    while (idx + 1 < words.length && words[idx + 1].t <= t) idx++;
    // End of last word's duration means it's "past" not "current"
    var activeEnd = idx >= 0 ? words[idx].t + words[idx].d : 0;
    var isCurrent = idx >= 0 && t >= words[idx].t && t <= activeEnd + 0.05;
    if (idx >= 0) {
      var w = words[idx];
      var p;
      if (alignmentOK) {
        p = w.d > 0 ? Math.max(0, Math.min(1, (t - w.t) / w.d)) : (isCurrent ? 1 : 0);
      } else {
        p = 1; // no animation — just solid illumination
      }
      w.el.style.setProperty('--word-progress', p.toFixed(3));
    }

    if (idx !== lyricsState.currentWordIdx) {
      var oldIdx = lyricsState.currentWordIdx;
      // Demote every word from old cursor through idx-1 to .is-past.
      // When ticks arrive at 1 Hz (mythos:audio fallback) or we seek, the
      // cursor can jump several words at once; without this loop, the
      // skipped-over words stay stuck as .is-future.
      var demoteStart = Math.max(0, oldIdx);
      var demoteEnd   = Math.min(words.length, idx); // exclusive
      for (var di = demoteStart; di < demoteEnd; di++) {
        var delEl = words[di].el;
        delEl.classList.remove('is-current', 'is-future');
        delEl.classList.add('is-past');
        delEl.style.setProperty('--word-progress', '1');
      }
      // Handle reverse seek: if idx < oldIdx, re-future words (idx, oldIdx].
      if (idx < oldIdx) {
        for (var ri = idx + 1; ri <= oldIdx && ri < words.length; ri++) {
          var relEl = words[ri].el;
          relEl.classList.remove('is-current', 'is-past');
          relEl.classList.add('is-future');
          relEl.style.setProperty('--word-progress', '0');
        }
      }
      // Promote new
      if (idx >= 0) {
        words[idx].el.classList.remove('is-future', 'is-past');
        words[idx].el.classList.add('is-current');
      }
      lyricsState.currentWordIdx = idx;

      // Line focus
      var newLine = idx >= 0 ? lyricsState.flatLineIdx[idx] : -1;
      applyLineCursor(newLine);
    } else if (!isCurrent && idx >= 0) {
      // Current word's duration elapsed; demote
      var el = words[idx].el;
      if (el.classList.contains('is-current')) {
        el.classList.remove('is-current');
        el.classList.add('is-past');
        el.style.setProperty('--word-progress', '1');
      }
    }
  }

  function setupLyrics() {
    lyricsState.containers = Array.prototype.slice.call(
      document.querySelectorAll('.m-lyrics'));
    if (!lyricsState.containers.length) return;
    // Ask the shell to send us the current track so we can fetch lyrics.
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'mythos:audio:subscribe' }, '*');
    }
    // Render an empty state until we know the track
    lyricsState.containers.forEach(buildLyricsDom);
  }

  // Extend the message handler for mythos:audio so lyrics auto-follow track changes.
  window.addEventListener('message', function(e){
    var d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'mythos:audio' && d.track && d.track.file) {
      if (lyricsState.containers.length) loadLyricsForTrack(d.track.file);
      // Cache duration — used by the low-alignment line-cursor fallback so
      // we can map currentTime → line index across the ACTUAL song length
      // instead of the fake 0.25s-per-word interpolated timings.
      if (typeof d.duration === 'number' && d.duration > 0) {
        lyricsState.trackDuration = d.duration;
      }
    }
  });

  // ─ Spectrogram — auto-populate bars inside .m-spectrogram elements ─
  function setupSpectrograms() {
    document.querySelectorAll('.m-spectrogram').forEach(function(el) {
      if (el.dataset.spectrogramReady) return;
      var count = parseInt(el.getAttribute('data-spectrogram-count'), 10);
      if (!count || count < 1 || count > 10) count = 10;
      var from = parseInt(el.getAttribute('data-spectrogram-from'), 10);
      if (isNaN(from)) from = 0;
      // Clear any existing children so re-init is safe
      el.innerHTML = '';
      for (var i = 0; i < count; i++) {
        var band = from + i;
        if (band > 9) band = 9;
        var span = document.createElement('span');
        span.style.setProperty('--band-level', 'var(--band-' + band + ', 0)');
        el.appendChild(span);
      }
      el.dataset.spectrogramReady = '1';
    });
  }

  // ─ Meter utility class — inject shared stylesheet once ─
  function injectMeterStyles() {
    if (document.getElementById('mythos-meters-style')) return;
    var link = document.createElement('link');
    link.id = 'mythos-meters-style';
    link.rel = 'stylesheet';
    link.href = '_mythos-meters.css';
    document.head.appendChild(link);
  }

  function init() {
    injectMeterStyles();
    setupTint();
    setupReveal();
    setupBands();
    setupSpectrograms();
    setupLyrics();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
