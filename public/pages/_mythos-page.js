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
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
