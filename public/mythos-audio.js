/**
 * mythos-audio.js — MythOS Audio-Reactive Engine
 *
 * Standalone audio-reactive engine that populates CSS custom properties at 60fps.
 * Designed to work BOTH as:
 *   (A) a first-party engine in pages that own the AudioContext, and
 *   (B) a subscriber in iframes that receive mythos:beat postMessage from shell.js.
 *
 * Usage (owned mode, page controls its own <audio> element):
 *   import MythosAudio from './mythos-audio.js';
 *   const engine = new MythosAudio({ target: document.documentElement });
 *   engine.connect(document.getElementById('my-audio'));
 *   engine.start();          // call after a user gesture
 *
 * Usage (subscriber mode, inside an iframe driven by shell.js):
 *   import MythosAudio from './mythos-audio.js';
 *   const engine = new MythosAudio({ target: document.documentElement });
 *   engine.subscribeShell(); // listens to postMessage, writes same props
 *
 * CSS custom properties published (all on :root / target element):
 *   --band-0  .. --band-9     (0.0 – 1.0)  per-band energy, VU-ballistic
 *   --onset-0 .. --onset-9    (0.0 – 1.0)  per-band onset, exp-decay
 *   --onset-bass, --onset-mid, --onset-high (max of sub-groups)
 *   --kick                    (0.0 – 1.0)  onset of band 0 (sub-bass)
 *   --snare                   (0.0 – 1.0)  onset of band 4 (mid)
 *   --hat                     (0.0 – 1.0)  onset of band 8 (brilliance)
 *   --beat-pulse              (0.0 – 1.0)  sharp attack per-beat, exp-decay
 *   --beat-phase              (0.0 – 1.0)  sawtooth progress through beat
 *   --beat-bar-pulse          (0.0 – 1.0)  pulse on 4-beat bar downbeats
 *   --beat-bar-phase          (0.0 – 1.0)  sawtooth progress through bar
 *   --envelope                (0.0 – 1.0)  overall loudness RMS
 *   --sub-bass  (alias --band-0)
 *   --bass      (alias --band-1)
 *   --low-mid   (alias --band-2)
 *   --mid       (alias --band-4)
 *   --high-mid  (alias --band-5)
 *   --presence  (alias --band-6)
 *   --treble    (alias --band-7)
 *   --brilliance (alias --band-8)
 *   --air       (alias --band-9)
 *
 * html[data-audio-playing] is set/removed when audio is active.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.MythosAudio = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ── CONSTANTS ────────────────────────────────────────────────────────────
  var NUM_BANDS = 10;
  var FFT_SIZE  = 1024;  // 512 usable freq bins

  // Log-spaced bin windows for 10 bands.
  // Assumes 44.1kHz → binHz = 44100 / FFT_SIZE ≈ 43 Hz/bin.
  // (shell.js uses 4096; here we use 1024 so standalone pages are lighter.)
  // Bands map to the same frequency ranges by proportion.
  var BAND_BINS = [
    [1,   2],   // 0: sub-bass   23–86 Hz
    [2,   4],   // 1: bass       86–172 Hz
    [4,   8],   // 2: low-mid    172–344 Hz
    [8,  14],   // 3: mid-low    344–602 Hz
    [14,  24],  // 4: mid        602–1032 Hz
    [24,  40],  // 5: high-mid   1032–1720 Hz
    [40,  64],  // 6: presence   1720–2752 Hz
    [64,  100], // 7: treble     2752–4300 Hz
    [100, 160], // 8: brilliance 4300–6880 Hz
    [160, 256], // 9: air        6880–11008 Hz
  ];

  // VU ballistics: fast attack, slow release.
  var ATTACK_FAST   = 0.75;
  var RELEASE_SLOW  = 0.12;

  // Onset detection: delta gate per band (tuned against music).
  var ONSET_THRESHOLD = [0.14, 0.11, 0.09, 0.07, 0.07, 0.06, 0.05, 0.04, 0.04, 0.04];

  // Onset decay per frame (~200ms at 60fps).
  var ONSET_DECAY = 0.88;

  // Slow baseline pole for onset (trailing average ~500ms).
  var SLOW_POLE = 0.96;

  // Envelope smoothing.
  var ENV_POLE = 0.92;

  // Beat pulse decay per frame.
  var BEAT_DECAY = 0.85;

  // Named band aliases → index.
  var BAND_ALIASES = {
    'sub-bass':   0,
    'bass':       1,
    'low-mid':    2,
    'mid':        4,
    'high-mid':   5,
    'presence':   6,
    'treble':     7,
    'brilliance': 8,
    'air':        9,
  };

  // ── ENGINE CLASS ─────────────────────────────────────────────────────────

  function MythosAudio(opts) {
    opts = opts || {};

    // Target element for setProperty (defaults to document.documentElement).
    this._target  = (opts.target instanceof Element)
      ? opts.target
      : (typeof document !== 'undefined' ? document.documentElement : null);
    this._bpm     = opts.bpm || 120;
    this._playing = false;

    // AudioContext chain.
    this._ctx      = null;
    this._analyser = null;
    this._source   = null;
    this._freqBuf  = null;

    // Per-band state.
    this._bandSmoothed = new Float32Array(NUM_BANDS);
    this._bandSlow     = new Float32Array(NUM_BANDS);
    this._bandOnset    = new Float32Array(NUM_BANDS);
    this._envelope     = 0;

    // Beat clock state.
    this._beatPhase    = 0;
    this._beatPulse    = 0;
    this._barPhase     = 0;
    this._barPulse     = 0;
    this._lastBeatTime = 0;
    this._lastBarTime  = 0;

    // RAF handle.
    this._rafId = null;

    // Shell subscriber mode.
    this._shellListener = null;

    // Callback on each frame (optional, for canvas consumers).
    this.onFrame = opts.onFrame || null;
  }

  // ── PUBLIC API ────────────────────────────────────────────────────────────

  /**
   * Connect to an HTMLAudioElement (or MediaStream). Call after a user gesture.
   * @param {HTMLAudioElement|MediaStream} source
   */
  MythosAudio.prototype.connect = function (source) {
    if (!window.AudioContext && !window.webkitAudioContext) {
      console.warn('[MythosAudio] Web Audio API not available.');
      return;
    }
    try {
      if (!this._ctx) {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        this._ctx = new Ctx();
      }
      if (this._ctx.state === 'suspended') {
        this._ctx.resume().catch(function () {});
      }

      // Disconnect previous source if any.
      if (this._source) {
        try { this._source.disconnect(); } catch (e) {}
        this._source = null;
      }

      if (source instanceof MediaStream) {
        this._source = this._ctx.createMediaStreamSource(source);
      } else {
        // HTMLAudioElement — avoid double-wrapping.
        if (!source._mythosNode) {
          source._mythosNode = this._ctx.createMediaElementSource(source);
        }
        this._source = source._mythosNode;
      }

      if (!this._analyser) {
        this._analyser = this._ctx.createAnalyser();
        this._analyser.fftSize       = FFT_SIZE;
        this._analyser.smoothingTimeConstant = 0.78;
        this._analyser.minDecibels   = -90;
        this._analyser.maxDecibels   = -10;
        this._freqBuf = new Uint8Array(this._analyser.frequencyBinCount);
      }

      this._source.connect(this._analyser);
      this._analyser.connect(this._ctx.destination);
    } catch (e) {
      console.warn('[MythosAudio] connect failed:', e);
    }
  };

  /**
   * Set the current track BPM for beat-clock tracking.
   */
  MythosAudio.prototype.setBpm = function (bpm) {
    this._bpm = (bpm > 0) ? bpm : 120;
  };

  /**
   * Start the rAF loop (owned mode).
   */
  MythosAudio.prototype.start = function () {
    if (this._rafId) return;
    this._playing = true;
    this._tick();
  };

  /**
   * Stop the rAF loop and zero all CSS props.
   */
  MythosAudio.prototype.stop = function () {
    this._playing = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._writeZero();
    this._setPlayingAttr(false);
  };

  /**
   * Subscribe to shell.js postMessage broadcast (iframe subscriber mode).
   * The engine will NOT create an AudioContext; it just mirrors the props.
   * Call this instead of connect() + start() when inside an iframe.
   */
  MythosAudio.prototype.subscribeShell = function () {
    var self = this;
    if (this._shellListener) return; // already subscribed

    // Notify shell we want the beat stream.
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'mythos:subscribe' }, '*');
    }

    this._shellListener = function (ev) {
      if (!ev.data || typeof ev.data !== 'object') return;
      var d = ev.data;

      if (d.type === 'mythos:beat') {
        self._applyBeatMessage(d);
      } else if (d.type === 'mythos:skin') {
        // Skin palette — just propagate vars if a skin handler is set.
        if (self.onSkin) self.onSkin(d.palette);
      }
    };

    window.addEventListener('message', this._shellListener);

    // Unsubscribe on page hide, re-subscribe on show.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'mythos:unsubscribe' }, '*');
        }
      } else {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'mythos:subscribe' }, '*');
        }
      }
    });
  };

  /**
   * Unsubscribe from shell postMessage.
   */
  MythosAudio.prototype.unsubscribeShell = function () {
    if (this._shellListener) {
      window.removeEventListener('message', this._shellListener);
      this._shellListener = null;
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'mythos:unsubscribe' }, '*');
      }
    }
  };

  /**
   * Destroy the engine cleanly.
   */
  MythosAudio.prototype.destroy = function () {
    this.stop();
    this.unsubscribeShell();
    if (this._ctx) {
      this._ctx.close().catch(function () {});
      this._ctx = null;
    }
  };

  // ── INTERNAL ──────────────────────────────────────────────────────────────

  MythosAudio.prototype._tick = function () {
    var self = this;
    this._rafId = requestAnimationFrame(function () {
      self._frame();
      if (self._playing) self._tick();
    });
  };

  MythosAudio.prototype._frame = function () {
    var hasAnalyser = !!(this._analyser && this._freqBuf);
    if (hasAnalyser) {
      this._analyser.getByteFrequencyData(this._freqBuf);
    }

    // Update per-band state.
    var envSum = 0;
    for (var i = 0; i < NUM_BANDS; i++) {
      var raw = 0;
      if (hasAnalyser) {
        var s = BAND_BINS[i][0], e = BAND_BINS[i][1];
        var count = e - s;
        var sum = 0;
        for (var b = s; b < e; b++) sum += this._freqBuf[b];
        raw = count > 0 ? (sum / count) / 255 : 0;
      }

      // VU ballistics.
      if (raw > this._bandSmoothed[i]) {
        this._bandSmoothed[i] = this._bandSmoothed[i] * (1 - ATTACK_FAST) + raw * ATTACK_FAST;
      } else {
        this._bandSmoothed[i] = this._bandSmoothed[i] * (1 - RELEASE_SLOW) + raw * RELEASE_SLOW;
      }

      // Slow baseline.
      this._bandSlow[i] = this._bandSlow[i] * SLOW_POLE + raw * (1 - SLOW_POLE);

      // Onset detection.
      var delta = this._bandSmoothed[i] - this._bandSlow[i];
      if (delta > ONSET_THRESHOLD[i] && this._bandSmoothed[i] > 0.08) {
        var strength = Math.min(1, delta / ONSET_THRESHOLD[i] * 0.7);
        if (strength > this._bandOnset[i]) this._bandOnset[i] = strength;
      }
      this._bandOnset[i] *= ONSET_DECAY;

      envSum += this._bandSmoothed[i];
    }

    // Envelope.
    var envRaw = envSum / NUM_BANDS;
    this._envelope = this._envelope * ENV_POLE + envRaw * (1 - ENV_POLE);

    // Beat clock.
    this._updateBeat();

    // Write CSS props.
    this._write();

    // User callback.
    if (this.onFrame) {
      this.onFrame({
        bands:    Array.from(this._bandSmoothed),
        onsets:   Array.from(this._bandOnset),
        envelope: this._envelope,
        beat: {
          phase:    this._beatPhase,
          pulse:    this._beatPulse,
          barPhase: this._barPhase,
          barPulse: this._barPulse,
          bpm:      this._bpm,
        },
      });
    }

    this._setPlayingAttr(this._playing && this._envelope > 0.01);
  };

  MythosAudio.prototype._updateBeat = function () {
    // BPM-based beat clock — no AudioContext timing needed; runs off wall clock.
    var now = performance.now() / 1000;
    var beatSec = 60 / this._bpm;
    var barSec  = beatSec * 4;

    var beatFrac = ((now % beatSec) / beatSec);
    var barFrac  = ((now % barSec)  / barSec);

    // Rising edge of beat.
    if (beatFrac < this._beatPhase) {
      this._beatPulse = 1.0;
    }
    // Rising edge of bar.
    if (barFrac < this._barPhase) {
      this._barPulse = 1.0;
    }

    this._beatPhase = beatFrac;
    this._barPhase  = barFrac;

    // Decay pulses each frame.
    this._beatPulse *= BEAT_DECAY;
    this._barPulse  *= BEAT_DECAY;
  };

  MythosAudio.prototype._write = function () {
    if (!this._target) return;
    var s = this._target.style;
    var playing = this._playing;

    for (var i = 0; i < NUM_BANDS; i++) {
      var bv = playing ? r3(this._bandSmoothed[i]) : '0';
      var ov = playing ? r3(this._bandOnset[i])    : '0';
      s.setProperty('--band-'  + i, bv);
      s.setProperty('--onset-' + i, ov);
    }

    // Named aliases.
    for (var alias in BAND_ALIASES) {
      s.setProperty('--' + alias, playing ? r3(this._bandSmoothed[BAND_ALIASES[alias]]) : '0');
    }

    // Onset groups.
    var lo = maxOf(this._bandOnset, 0, 2);
    var mid = maxOf(this._bandOnset, 3, 6);
    var hi  = maxOf(this._bandOnset, 7, 9);
    s.setProperty('--onset-bass', playing ? r3(lo)  : '0');
    s.setProperty('--onset-mid',  playing ? r3(mid) : '0');
    s.setProperty('--onset-high', playing ? r3(hi)  : '0');
    s.setProperty('--kick',  playing ? r3(this._bandOnset[0]) : '0');
    s.setProperty('--snare', playing ? r3(this._bandOnset[4]) : '0');
    s.setProperty('--hat',   playing ? r3(this._bandOnset[8]) : '0');

    // Envelope.
    s.setProperty('--envelope', playing ? r3(this._envelope) : '0');

    // Beat clock.
    s.setProperty('--beat-phase',     playing ? r3(this._beatPhase) : '0');
    s.setProperty('--beat-pulse',     playing ? r3(this._beatPulse) : '0');
    s.setProperty('--beat-bar-phase', playing ? r3(this._barPhase)  : '0');
    s.setProperty('--beat-bar-pulse', playing ? r3(this._barPulse)  : '0');
    s.setProperty('--beat-bpm', String(this._bpm));
    s.setProperty('--beat-sec',     r3(60 / this._bpm) + 's');
    s.setProperty('--beat-bar-sec', r3(240 / this._bpm) + 's');
  };

  MythosAudio.prototype._writeZero = function () {
    if (!this._target) return;
    var s = this._target.style;
    for (var i = 0; i < NUM_BANDS; i++) {
      s.setProperty('--band-'  + i, '0');
      s.setProperty('--onset-' + i, '0');
    }
    for (var alias in BAND_ALIASES) s.setProperty('--' + alias, '0');
    var zeroProps = ['--onset-bass','--onset-mid','--onset-high',
                     '--kick','--snare','--hat','--envelope',
                     '--beat-phase','--beat-pulse',
                     '--beat-bar-phase','--beat-bar-pulse'];
    for (var p = 0; p < zeroProps.length; p++) s.setProperty(zeroProps[p], '0');
  };

  MythosAudio.prototype._setPlayingAttr = function (active) {
    if (!document || !document.documentElement) return;
    if (active) {
      document.documentElement.setAttribute('data-audio-playing', '');
    } else {
      document.documentElement.removeAttribute('data-audio-playing');
    }
  };

  /**
   * Apply a mythos:beat postMessage payload as if we ran the frame ourselves.
   * This is the subscriber-mode fast path.
   */
  MythosAudio.prototype._applyBeatMessage = function (d) {
    if (!this._target) return;
    var s    = this._target.style;
    var bands   = d.bands   || [];
    var onsets  = d.onsets  || [];
    var beat    = d.beat    || {};
    var playing = !!d.playing;
    var env     = typeof d.envelope === 'number' ? d.envelope : 0;

    for (var i = 0; i < NUM_BANDS; i++) {
      s.setProperty('--band-'  + i, playing ? r3(bands[i]  || 0) : '0');
      s.setProperty('--onset-' + i, playing ? r3(onsets[i] || 0) : '0');
    }

    // Named aliases.
    for (var alias in BAND_ALIASES) {
      s.setProperty('--' + alias, playing ? r3(bands[BAND_ALIASES[alias]] || 0) : '0');
    }

    // Onset groups.
    var lo  = maxOfArr(onsets, 0, 2);
    var mid = maxOfArr(onsets, 3, 6);
    var hi  = maxOfArr(onsets, 7, 9);
    s.setProperty('--onset-bass', playing ? r3(lo)  : '0');
    s.setProperty('--onset-mid',  playing ? r3(mid) : '0');
    s.setProperty('--onset-high', playing ? r3(hi)  : '0');
    s.setProperty('--kick',  playing ? r3(onsets[0] || 0) : '0');
    s.setProperty('--snare', playing ? r3(onsets[4] || 0) : '0');
    s.setProperty('--hat',   playing ? r3(onsets[8] || 0) : '0');

    // Envelope.
    s.setProperty('--envelope', playing ? r3(env) : '0');

    // Beat clock.
    var bpm = beat.bpm || 120;
    s.setProperty('--beat-phase',     playing ? r3(beat.phase    || 0) : '0');
    s.setProperty('--beat-pulse',     playing ? r3(beat.pulse    || 0) : '0');
    s.setProperty('--beat-bar-phase', playing ? r3(beat.bar      || 0) : '0');
    s.setProperty('--beat-bar-pulse', playing ? r3(beat.barPulse || 0) : '0');
    s.setProperty('--beat-bpm',     String(bpm));
    s.setProperty('--beat-sec',     r3(60  / bpm) + 's');
    s.setProperty('--beat-bar-sec', r3(240 / bpm) + 's');

    // Seal color + M index.
    if (d.sealColor) s.setProperty('--seal-color', d.sealColor);
    if (typeof d.sealM === 'number') s.setProperty('--seal-m', String(d.sealM));

    this._setPlayingAttr(playing && env > 0.01);

    if (this.onFrame) {
      this.onFrame({ bands: bands, onsets: onsets, envelope: env, beat: beat });
    }
  };

  // ── HELPERS ───────────────────────────────────────────────────────────────

  function r3(v) {
    return (Math.round((v || 0) * 1000) / 1000).toFixed(3);
  }

  function maxOf(arr, lo, hi) {
    var m = 0;
    for (var i = lo; i <= hi; i++) if (arr[i] > m) m = arr[i];
    return m;
  }

  function maxOfArr(arr, lo, hi) {
    var m = 0;
    for (var i = lo; i <= hi; i++) if ((arr[i] || 0) > m) m = arr[i] || 0;
    return m;
  }

  // ── SPECTROGRAM AUTO-INIT ─────────────────────────────────────────────────
  // If `_mythos-page.js` style auto-wiring is present, pages can drop
  // <div class="m-spectrogram"> and it self-populates on DOMContentLoaded.
  function initSpectrogram(el) {
    if (el._mythosInit) return;
    el._mythosInit = true;
    var count  = parseInt(el.dataset.spectrogramCount  || '10', 10);
    var from   = parseInt(el.dataset.spectrogramFrom   || '0',  10);
    var orient = el.dataset.spectrogramOrientation || 'row'; // 'row' | 'column'
    el.style.display = 'flex';
    el.style.flexDirection = orient === 'column' ? 'column' : 'row';
    el.style.alignItems = 'flex-end';
    el.innerHTML = '';
    for (var i = 0; i < count; i++) {
      var span = document.createElement('span');
      var bandIdx = Math.min(from + i, NUM_BANDS - 1);
      span.dataset.band = bandIdx;
      el.appendChild(span);
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      var specs = document.querySelectorAll('.m-spectrogram');
      for (var i = 0; i < specs.length; i++) initSpectrogram(specs[i]);
    });
  }

  return MythosAudio;
}));
