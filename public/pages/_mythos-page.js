// _mythos-page.js — shared iframe-side helper for content pages.
//
// Subscribes to the shell's beat pipe and exposes the current beat
// state as CSS custom properties on <html>:
//
//   --beat-pulse       0→1, exponential attack/decay per beat
//   --beat-phase       0→1 sawtooth per beat (0 = downbeat)
//   --beat-bar-pulse   0→1, exp decay on each bar downbeat
//   --beat-bar-phase   0→1 sawtooth per 4-beat bar
//   --beat-bpm         current track BPM
//   --seal-color       hex color of the currently-glowing M
//
// Pages then animate elements declaratively:
//   opacity: calc(0.4 + 0.6 * var(--beat-pulse, 0));
//
// Also supports section-based viz tinting via data-tint attributes on
// any element. As that element scrolls into view, the shell's
// --signal-synth var lerps toward data-tint. data-tint-machine does
// the same for --signal-machine. Release happens automatically when
// no tinted section dominates.
(function(){
  'use strict';

  var root = document.documentElement.style;
  var lastMsg = null;

  window.addEventListener('message', function(e){
    var d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type !== 'mythos:beat') return;
    lastMsg = d;
    var b = d.beat;
    if (!b) return;
    var playing = !!d.playing;
    root.setProperty('--beat-pulse', playing ? b.pulse.toFixed(3) : '0');
    root.setProperty('--beat-phase', playing ? b.phase.toFixed(3) : '0');
    root.setProperty('--beat-bar-pulse', playing ? b.barPulse.toFixed(3) : '0');
    root.setProperty('--beat-bar-phase', playing ? b.bar.toFixed(3) : '0');
    root.setProperty('--beat-bpm', b.bpm);
    if (d.sealColor) root.setProperty('--seal-color', d.sealColor);
    // 10-band VU levels — any [data-band="N"] element inherits via --band-level
    if (d.bands) {
      for (var i = 0; i < d.bands.length; i++) {
        root.setProperty('--band-' + i, playing ? d.bands[i].toFixed(3) : '0');
      }
    }
  });

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'mythos:beat:subscribe' }, '*');
  }

  // ─ Section-based viz tint ─
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
  // ─ Scroll-reveal — add `.in-view` to anything with [data-reveal] ─
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

  // ─ VU meters — [data-band="N"] binds --band-level to --band-N ─
  // Supports data-band="N" (single band) or data-band="N-M" (avg of range).
  function setupBands() {
    var items = document.querySelectorAll('[data-band]');
    items.forEach(function(el) {
      var spec = el.getAttribute('data-band');
      if (!spec) return;
      var parts = spec.split('-');
      if (parts.length === 1) {
        el.style.setProperty('--band-level', 'var(--band-' + parts[0].trim() + ', 0)');
      } else {
        // Range: average of bands. Use calc((a + b + ...) / n).
        var terms = [];
        var lo = parseInt(parts[0], 10), hi = parseInt(parts[1], 10);
        for (var n = lo; n <= hi; n++) terms.push('var(--band-' + n + ', 0)');
        el.style.setProperty('--band-level', 'calc((' + terms.join(' + ') + ') / ' + terms.length + ')');
      }
    });
  }

  function init() { setupTint(); setupReveal(); setupBands(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
