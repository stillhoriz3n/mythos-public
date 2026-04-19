// MythOS app shell — persistent audio, visualizer, navigation, state
(function(){
  'use strict';

  // ── TRACKS ──────────────────────────────────────────
  const TRACKS = [
    { file: 'music/rr-4 - Fender Bender.mp3',                              title: 'Fender Bender',                         album: 'Robots & Remixes',  cover:'rr', artist:'HORIZ3N feat. GLYF',         bpm: 141 },
    { file: 'music/rr-1 - Clockwork Infinity.mp3',                         title: 'Clockwork Infinity',                    album: 'Robots & Remixes',  cover:'rr', artist:'HORIZ3N feat. joeY',         bpm: 131 },
    { file: 'music/rr-2 - Waiting for the Waymo.mp3',                      title: 'Waiting for the Waymo',                 album: 'Robots & Remixes',  cover:'rr', artist:'HORIZ3N feat. KISTONE',      bpm: 134 },
    { file: "music/rr-2 - Today is Yesterday x Make 'em say Errr.mp3",     title: "Today is Yesterday x Make 'em say Errr", album: 'Robots & Remixes',  cover:'rr', artist:'HORIZ3N feat. THE DAYLIGHTS', bpm: 120 },
    { file: 'music/rr-3 - I Got Hosts.mp3',                                title: 'I Got Hosts',                           album: 'Robots & Remixes',  cover:'rr', artist:'HORIZ3N feat. AKS',          bpm: 131 },
    { file: 'music/rr-5 - Goodtime.mp3',                                   title: 'Goodtime',                              album: 'Robots & Remixes',  cover:'rr', artist:'HORIZ3N feat. GLYF',         bpm: 125 },
    { file: 'music/rr-6 - Treading Water.mp3',                             title: 'Treading Water',                        album: 'Robots & Remixes',  cover:'rr', artist:'HORIZ3N',                    bpm: 128 },
    { file: 'music/rr-8 - Rogue Machine x Goodtime.mp3',                   title: 'Rogue Machine x Goodtime',              album: 'Robots & Remixes',  cover:'rr', artist:'HORIZ3N feat. GLYF',         bpm: 128 },
    { file: 'music/rr-9 - Barbra Streisand x Eduardo Saverin.mp3',         title: 'Barbra Streisand x Eduardo Saverin',    album: 'Robots & Remixes',  cover:'rr', artist:'HORIZ3N feat. joeY',         bpm: 128 },
    { file: 'music/rr-10 - Rock Lobster.mp3',                              title: 'Rock Lobster',                          album: 'Robots & Remixes',  cover:'rr', artist:'HORIZ3N',                    bpm: 141 },
    { file: 'music/rr-11 - Orange Chicken.mp3',                            title: 'Orange Chicken',                        album: 'Robots & Remixes',  cover:'rr', artist:'HORIZ3N',                    bpm: 156 },
    { file: 'music/sh-1 - askJarvis.mp3',                                  title: 'askJarvis',                             album: 'stillHORIZ3N',      cover:'sh', artist:'HORIZ3N',                    bpm: 122 },
    { file: 'music/sh-2 - Find Myself.mp3',                                title: 'Find Myself',                           album: 'stillHORIZ3N',      cover:'sh', artist:'HORIZ3N',                    bpm: 131 },
    { file: 'music/sh-3 - Whispers of Infinity.mp3',                       title: 'Whispers of Infinity',                  album: 'stillHORIZ3N',      cover:'sh', artist:'HORIZ3N',                    bpm: 131 },
    { file: 'music/sh-4 - Very Well.mp3',                                  title: 'Very Well',                             album: 'stillHORIZ3N',      cover:'sh', artist:'HORIZ3N',                    bpm: 128 },
    { file: 'music/sh-5 - Substrate.mp3',                                  title: 'Substrate',                             album: 'stillHORIZ3N',      cover:'sh', artist:'HORIZ3N',                    bpm: 110 },
  ];

  const PAGE_META = {
    'landing.html':                               { title: 'Home',                    group: 'Home',          dark: true  },
    'the-prime-radiant.html':                     { title: 'The Prime Radiant',       group: 'Home',          dark: true  },
    'thesis.html':                                { title: 'Thesis',                  group: 'Canon',         dark: false },
    'invariant.html':                             { title: 'Invariant',               group: 'Canon',         dark: false },
    'fork-at-the-pass.html':                      { title: 'Fork at the PASS',        group: 'Canon',         dark: false },
    'love-as-a-function.html':                    { title: 'Love as a Function',      group: 'Canon',         dark: false },
    'the-last-sessions-insufficient-data.html':   { title: 'The Last Sessions',       group: 'Canon',         dark: false },
    'visualizer.html':                            { title: 'Signal Visualizer',       group: 'Transmissions', dark: true  },
    'waitlist.html':                              { title: 'Join the Waitlist',       group: 'Transmissions', dark: true  },
  };

  // ── DOM ──────────────────────────────────────────────
  const KEY = 'mythos.player.v2';
  const PAGE_KEY = 'mythos.page.v1';
  const audio = document.getElementById('audio');
  const frame = document.getElementById('frame');
  const loader = document.getElementById('loader');

  // ── PLAYER STATE ─────────────────────────────────────
  let current = 0;
  let playing = false;
  let shuffle = false;
  let loop = false;
  let muted = false;
  let volume = 0.5;
  let currentPage = null;

  // ── VISUALIZER STATE ─────────────────────────────────
  let actx = null, analyser = null, sourceNode = null;
  let audioContextReady = false;
  let vizCanvas, vizCtx, trailCanvas, trailCtx;
  let dataArray = new Uint8Array(4096);
  let freqArray = new Uint8Array(2048);
  let phase = 0, particles = [], stars = [], prevBass = 0;
  let viewT = 0;        // 0 = expanded (dark), 1 = collapsed (singularity)
  let viewTarget = 0;
  let singularityEl;
  let vizStarted = false;

  // ── SPECTRUM PLINKO — FFT-driven falling character rain ────────────
  //
  // How it works:
  //   100 columns span the screen left-to-right. Columns map to FFT bins
  //   LOGARITHMICALLY (bin 2 → bin ~1126, ~13kHz) so each column covers
  //   roughly equal musical octaves — bass gets narrow high-res columns,
  //   highs get broad averaged ranges. Linear mapping crowded all energy
  //   into the left 25% because music energy is concentrated in bass.
  //   Each column runs a two-pole ONSET DETECTOR: fast follower tracks
  //   current energy, slow baseline tracks recent average, delta = fast -
  //   slow fires drops on rising edges only. Sustained energy does NOT
  //   trigger rain — only transients do. This is what makes the music
  //   "play" the rain: every kick/snare/hat/vocal-in lands a drop.
  //
  // Tuning guide (four knobs):
  //
  //   1. ONSET THRESHOLDS (initPlinko) — delta gate per band. Because
  //      this is a DELTA (not absolute energy), tuning is much flatter
  //      across the spectrum than the old sustained-energy model.
  //      Tuned 2026-04-18 (onset model):
  //        sub-bass (<10%): 0.14 | bass (10-25%): 0.11
  //        mids (25-50%):   0.07 | upper mids (50-75%): 0.05
  //        highs (>75%):    0.04
  //      Too chatty in a band? Raise threshold ~0.02.
  //
  //   2. COOLDOWNS (updatePlinko) — ms before a column can fire again.
  //      Each hit lands one drop; cooldown prevents the tail from
  //      retriggering. Bass=slowest (kicks spaced), highs=fastest (hats).
  //        col 0-24: 260ms | col 25-49: 160ms | col 50-99: 140ms
  //
  //   3. FOLLOWER/BASELINE POLES (updatePlinko) —
  //        fast = 0.6 * old + 0.4 * new  (~3-frame response)
  //        slow = 0.96 * old + 0.04 * new (~500ms trailing average)
  //      Tighter fast pole = twitchier. Looser slow pole = onsets stay
  //      detectable longer at the cost of baseline tracking lag.
  //
  //   4. DROP LIFESPAN (drawPlinko, d.life -= 0.007) — ~2.4s visible.
  //      Short life = screen clears between events (readable). Long
  //      life = drops stack into a persistent wall (what we had).
  //
  // Visual tuning:
  //   - Drop speed: (1.5 + brightness * 2.5 + random) * dpr
  //   - Drop length: 3-13 characters depending on brightness
  //   - Drop life: starts at 1.0, decays at 0.007/frame (~2.4 sec)
  //   - Colors: matrix mode = green, cosmos mode = subdued amber (no glow)
  //
  // Called from the main drawViz loop: updatePlinko() then drawPlinko()
  // Only runs when playing && expand > 0.05
  //
  var PLINKO_COLS = 100;
  var plinkoDrops = [];    // active falling drops
  var plinkoThresholds = []; // per-column onset gate (fast minus slow)
  var plinkoSmoothed = [];   // fast follower: current energy per column (0-1)
  var plinkoSlow = [];       // slow baseline: recent average per column (0-1)
  var plinkoCooldown = [];   // cooldown timer per column in ms

  // ── MATRIX EASTER EGG STATE ──────────────────────────
  let matrixMode = false;
  let matrixT = 0;       // 0 = cosmos, 1 = fully matrix (smooth transition)
  let matrixChars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンMYTHOSSubstrate01'.split('');
  let matrixLastAlbum = null;

  // ── BEAT CLOCK ───────────────────────────────────────
  // beatPhase: 0→1 sawtooth synced to track BPM (0 = downbeat, 1 = next beat)
  // beatPulse: 0→1 exponential decay that fires on each beat (for visual kicks)
  // beatHalf/beatQuarter: subdivisions
  function getBeat() {
    var bpm = TRACKS[current] ? (TRACKS[current].bpm || 120) : 120;
    var t = audio.currentTime || 0;
    var beatsPerSec = bpm / 60;
    var raw = t * beatsPerSec;
    var phase = raw % 1;                     // 0→1 sawtooth per beat
    var half = (raw * 2) % 1;                // 0→1 sawtooth per half-beat
    var quarter = (raw * 4) % 1;             // 0→1 sawtooth per quarter-beat
    var bar = (raw / 4) % 1;                 // 0→1 sawtooth per 4-beat bar
    var pulse = Math.exp(-phase * 6);        // sharp attack, exponential decay
    var barPulse = Math.exp(-(raw % 4) * 3); // slower pulse on bar downbeat
    return { phase: phase, half: half, quarter: quarter, bar: bar, pulse: pulse, barPulse: barPulse, raw: raw, bpm: bpm };
  }

  // Fill dataArray with silence (128 = zero crossing)
  dataArray.fill(128);

  // ── RESTORE STATE ────────────────────────────────────
  var savedTime = 0;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (typeof saved.current === 'number' && saved.current >= 0 && saved.current < TRACKS.length) current = saved.current;
    if (typeof saved.volume === 'number') volume = saved.volume;
    if (typeof saved.shuffle === 'boolean') shuffle = saved.shuffle;
    if (typeof saved.loop === 'boolean') loop = saved.loop;
    if (typeof saved.muted === 'boolean') muted = saved.muted;
    savedTime = typeof saved.time === 'number' ? saved.time : 0;
  } catch(e) {}

  audio.volume = volume;
  audio.muted = muted;

  function saveState() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        current, volume, shuffle, loop, muted,
        time: audio.currentTime || 0,
      }));
    } catch(e){}
  }

  // ── AUDIO CONTEXT ────────────────────────────────────
  function ensureAudioContext() {
    if (audioContextReady) {
      if (actx && actx.state === 'suspended') actx.resume();
      return;
    }
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      actx = new AudioCtx();
      analyser = actx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.78;
      sourceNode = actx.createMediaElementSource(audio);
      sourceNode.connect(analyser);
      analyser.connect(actx.destination);
      dataArray = new Uint8Array(analyser.fftSize);
      freqArray = new Uint8Array(analyser.frequencyBinCount);
      audioContextReady = true;
    } catch(e) {
      console.warn('AudioContext init failed:', e);
    }
  }

  // ── TRACK LOADING ────────────────────────────────────
  function loadTrack(i, opts) {
    opts = opts || {};
    current = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
    var t = TRACKS[current];
    audio.src = t.file;
    if (opts.seekTo) audio.currentTime = opts.seekTo;
    document.getElementById('track-title').textContent = t.title;
    document.getElementById('track-album').textContent = t.album;
    document.getElementById('track-artist').textContent = t.artist || 'HORIZ3N';
    document.getElementById('art').src = t.cover === 'sh' ? 'music/cover-sh.jpg' : 'music/cover-rr.png';
    renderQueue();
    saveState();
    broadcastTrack();

    // ── Matrix Easter egg: activate on stillHORIZ3N ──
    var albumId = t.cover;
    if (albumId !== matrixLastAlbum) {
      matrixLastAlbum = albumId;
      setMatrixMode(albumId === 'sh');
    }
  }

  function togglePlay() {
    ensureAudioContext();
    if (!audio.src) loadTrack(current);
    if (playing) audio.pause();
    else audio.play().catch(function(){});
  }

  function nextTrack() {
    if (shuffle) {
      var n; do { n = Math.floor(Math.random() * TRACKS.length); } while (n === current && TRACKS.length > 1);
      loadTrack(n);
    } else loadTrack(current + 1);
    if (playing) audio.play().catch(function(){});
  }

  function prevTrack() {
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    loadTrack(current - 1);
    if (playing) audio.play().catch(function(){});
  }

  // ── AUDIO EVENTS ─────────────────────────────────────
  audio.addEventListener('play', function() { playing = true; updatePlayIcon(); broadcastTrack(); });
  audio.addEventListener('pause', function() { playing = false; updatePlayIcon(); saveState(); broadcastTrack(); });
  audio.addEventListener('ended', function() {
    if (loop) { audio.currentTime = 0; audio.play().catch(function(){}); }
    else {
      // Force-advance: playing may have been set false by the pause event
      // that fires just before ended, so we need to explicitly play
      loadTrack(current + 1);
      audio.play().catch(function(){});
    }
  });
  audio.addEventListener('timeupdate', function() {
    if (!audio.duration || !isFinite(audio.duration)) return;
    var pct = (audio.currentTime / audio.duration) * 100;
    document.getElementById('fill').style.width = pct + '%';
    document.getElementById('thumb').style.left = pct + '%';
    document.getElementById('t-cur').textContent = fmt(audio.currentTime);
    document.getElementById('t-dur').textContent = fmt(audio.duration);
    if (Math.floor(audio.currentTime) % 3 === 0) saveState();
  });
  audio.addEventListener('progress', function() {
    try {
      if (audio.buffered.length && audio.duration) {
        var end = audio.buffered.end(audio.buffered.length - 1);
        document.getElementById('buf').style.width = (end / audio.duration * 100) + '%';
      }
    } catch(e){}
  });
  audio.addEventListener('loadedmetadata', function() {
    document.getElementById('t-dur').textContent = fmt(audio.duration);
  });

  function updatePlayIcon() {
    var icon = document.getElementById('play-icon');
    icon.innerHTML = playing
      ? '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>'
      : '<polygon points="7,3 21,12 7,21"/>';
  }

  function fmt(s) {
    if (!isFinite(s)) return '0:00';
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
  }

  function seek(e) {
    var bar = document.getElementById('bar');
    var r = bar.getBoundingClientRect();
    var pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    if (audio.duration) audio.currentTime = pct * audio.duration;
  }

  function setVol(e) {
    var bar = e.currentTarget;
    var r = bar.getBoundingClientRect();
    var pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    volume = pct;
    audio.volume = pct;
    if (muted && pct > 0) { muted = false; audio.muted = false; }
    document.getElementById('vol-fill').style.width = (pct * 100) + '%';
    saveState();
  }

  function toggleMute() {
    muted = !muted;
    audio.muted = muted;
    document.getElementById('vol-fill').style.width = muted ? '0%' : (volume * 100) + '%';
    saveState();
  }

  function toggleShuffle() {
    shuffle = !shuffle;
    document.getElementById('btn-shuffle').classList.toggle('on', shuffle);
    saveState();
  }

  function toggleLoop() {
    loop = !loop;
    document.getElementById('btn-loop').classList.toggle('on', loop);
    saveState();
  }

  // ── ALBUMS & QUEUE ────────────────────────────────────
  var ALBUMS = [
    { id: 'rr', name: 'Robots & Remixes', artist: 'HORIZ3N', cover: 'music/cover-rr.png' },
    { id: 'sh', name: 'stillHORIZ3N',     artist: 'HORIZ3N', cover: 'music/cover-sh.jpg' },
  ];

  var queueOpen = false;
  var selectedAlbum = null; // null = show all

  function toggleQueue(side) {
    queueOpen = !queueOpen;
    var panel = document.getElementById('queue-panel');
    panel.classList.toggle('on', queueOpen);
    document.getElementById('btn-queue').classList.toggle('on', queueOpen);
    if (queueOpen) {
      panel.classList.toggle('left', side === 'left');
      renderAlbumSelector();
      renderQueue();
    }
  }

  function renderAlbumSelector() {
    var container = document.getElementById('album-selector');
    container.innerHTML = '';
    ALBUMS.forEach(function(alb) {
      var card = document.createElement('div');
      card.className = 'album-card' + (selectedAlbum === alb.id ? ' active' : '');
      var trackCount = TRACKS.filter(function(t) { return t.cover === alb.id; }).length;
      card.innerHTML =
        '<img src="' + alb.cover + '" alt="' + escapeHtml(alb.name) + '">' +
        '<div class="album-label">' +
          '<div class="album-name">' + escapeHtml(alb.name) + '</div>' +
          '<div class="album-artist">' + escapeHtml(alb.artist) + '</div>' +
          '<div class="album-count">' + trackCount + ' tracks</div>' +
        '</div>';
      card.addEventListener('click', function() {
        if (selectedAlbum === alb.id) {
          selectedAlbum = null; // deselect — show all
        } else {
          selectedAlbum = alb.id;
          // Play first track of this album
          ensureAudioContext();
          for (var ti = 0; ti < TRACKS.length; ti++) {
            if (TRACKS[ti].cover === alb.id) {
              loadTrack(ti);
              audio.play().catch(function(){});
              break;
            }
          }
        }
        renderAlbumSelector();
        renderQueue();
      });
      container.appendChild(card);
    });
  }

  function renderQueue() {
    var list = document.getElementById('queue-list');
    var count = document.getElementById('queue-count');
    var titleEl = document.getElementById('queue-album-title');

    // Filter tracks by selected album
    var filtered = [];
    TRACKS.forEach(function(t, i) {
      if (!selectedAlbum || t.cover === selectedAlbum) {
        filtered.push({ track: t, index: i });
      }
    });

    count.textContent = filtered.length;
    if (selectedAlbum) {
      var alb = ALBUMS.find(function(a) { return a.id === selectedAlbum; });
      titleEl.textContent = alb ? alb.name : 'All Tracks';
    } else {
      titleEl.textContent = 'All Tracks';
    }

    list.innerHTML = '';
    filtered.forEach(function(item, displayIdx) {
      var t = item.track;
      var i = item.index;
      var el = document.createElement('div');
      el.className = 'queue-item' + (i === current ? ' active' : '');
      el.innerHTML =
        '<div class="n">' + String(displayIdx + 1).padStart(2, '0') + '</div>' +
        '<div class="titlebox"><div class="t">' + escapeHtml(t.title) + '</div><div class="a">' + escapeHtml(t.album) + '</div></div>' +
        '<div class="dur"></div>';
      el.addEventListener('click', function() {
        ensureAudioContext();
        loadTrack(i);
        audio.play().catch(function(){});
      });
      list.appendChild(el);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function(c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  document.addEventListener('click', function(e) {
    if (!queueOpen) return;
    var panel = document.getElementById('queue-panel');
    var btn = document.getElementById('btn-queue');
    var art = document.querySelector('.player-art');
    if (!panel.contains(e.target) && !btn.contains(e.target) && !(art && art.contains(e.target))) toggleQueue();
  });

  // ══════════════════════════════════════════════════════
  // ── VISUALIZER ─────────────────────────────────────
  // ══════════════════════════════════════════════════════

  function initViz() {
    if (vizStarted) return;
    vizCanvas = document.getElementById('shell-viz');
    if (!vizCanvas) return;
    vizCtx = vizCanvas.getContext('2d');
    trailCanvas = document.createElement('canvas');
    trailCtx = trailCanvas.getContext('2d');
    singularityEl = document.getElementById('singularity');
    resizeViz();
    window.addEventListener('resize', resizeViz);
    initStars();
    vizStarted = true;
    drawViz();
  }

  function resizeViz() {
    if (!vizCanvas) return;
    var dpr = devicePixelRatio;
    vizCanvas.width = trailCanvas.width = window.innerWidth * dpr;
    vizCanvas.height = trailCanvas.height = window.innerHeight * dpr;
    initStars();
  }

  var STAR_COUNT = 600;
  var STAR_DEPTH = 2000;
  function initStars() {
    stars = [];
    if (!vizCanvas) return;
    for (var i = 0; i < STAR_COUNT; i++) {
      stars.push(makeStar(Math.random() * STAR_DEPTH));
    }
  }
  function makeStar(z) {
    return {
      x: (Math.random() - 0.5) * 6,   // -3 to 3, very wide spread
      y: (Math.random() - 0.5) * 6,
      z: z || STAR_DEPTH,
      isCyan: Math.random() < 0.15,
      baseAlpha: 0.5 + Math.random() * 0.5,
    };
  }

  // ── SPECTRUM PLINKO ────────────────────────────────
  function initPlinko() {
    plinkoThresholds = [];
    plinkoSmoothed = [];
    plinkoSlow = [];
    plinkoCooldown = [];
    for (var i = 0; i < PLINKO_COLS; i++) {
      // ONSET thresholds (delta = fast - slow). These gate how much a band
      // must rise above its own recent baseline before a drop fires. Bass
      // transients are punchy, highs are subtle — tune per-band so the
      // full spectrum participates.
      var freqRatio = i / PLINKO_COLS;
      var threshold = freqRatio < 0.1 ? 0.14       // sub-bass kicks — clear punch
                    : freqRatio < 0.25 ? 0.11      // bass — strong transients
                    : freqRatio < 0.5 ? 0.07       // mids — snares/vocals
                    : freqRatio < 0.75 ? 0.05      // upper mids — leads/hats
                    : 0.04;                         // highs — cymbals/air
      plinkoThresholds.push(threshold);
      plinkoSmoothed.push(0);
      plinkoSlow.push(0);
      plinkoCooldown.push(0);
    }
  }
  initPlinko();

  function updatePlinko(freqArr, w, h, dpr) {
    if (!freqArr || !freqArr.length) return;
    // Log-scale frequency mapping: column i covers bins [logBin(i), logBin(i+1)).
    // Linear mapping crowded all energy into the left 25% of the screen and left
    // the right columns staring at ~14kHz dead air. Log mapping spreads octaves
    // evenly: bass gets narrow high-res columns, highs average broader ranges.
    var minBin = 2;                                       // skip DC + bin 1
    var maxBin = Math.floor(freqArr.length * 0.55);       // ~1126 bins @ fftSize 4096 (~13kHz)
    var logMin = Math.log(minBin);
    var logMax = Math.log(maxBin);
    var logSpan = logMax - logMin;
    var colW = w / PLINKO_COLS;
    var now = performance.now();

    for (var i = 0; i < PLINKO_COLS; i++) {
      var startBin = Math.floor(Math.exp(logMin + logSpan * (i / PLINKO_COLS)));
      var endBin = Math.max(startBin + 1, Math.floor(Math.exp(logMin + logSpan * ((i + 1) / PLINKO_COLS))));
      if (endBin > freqArr.length) endBin = freqArr.length;
      var sum = 0;
      var count = endBin - startBin;
      for (var b = startBin; b < endBin; b++) {
        sum += freqArr[b] || 0;
      }
      var energy = count > 0 ? (sum / count) / 255 : 0;

      // Two-pole onset detector:
      //   fast follower tracks current energy; slow baseline tracks recent
      //   average. delta = fast - slow fires on transients (attacks), NOT
      //   on sustained levels. This is what makes the music "play" the
      //   rain — every kick, snare, hat, vocal-in becomes a visible drop.
      plinkoSmoothed[i] = plinkoSmoothed[i] * 0.6 + energy * 0.4;      // fast: ~3-frame response
      plinkoSlow[i] = plinkoSlow[i] * 0.96 + energy * 0.04;            // slow: ~500ms baseline
      var delta = plinkoSmoothed[i] - plinkoSlow[i];

      // Require a noise floor so silent columns don't fire on FFT jitter
      var hasSignal = plinkoSmoothed[i] > 0.08;

      plinkoCooldown[i] = Math.max(0, plinkoCooldown[i] - 16); // ~1 frame at 60fps
      if (delta > plinkoThresholds[i] && hasSignal && plinkoCooldown[i] <= 0) {
        var brightness = Math.min(1, delta / plinkoThresholds[i] * 0.5);
        plinkoDrops.push({
          col: i,
          x: i * colW + colW * 0.5,
          y: 0,
          speed: (1.5 + brightness * 2.5 + Math.random() * 1) * dpr,
          len: 3 + Math.floor(brightness * 6) + Math.floor(Math.random() * 4),
          chars: [],
          life: 1,
          brightness: brightness,
        });
        var d = plinkoDrops[plinkoDrops.length - 1];
        for (var j = 0; j < d.len; j++) {
          d.chars.push(matrixChars[Math.floor(Math.random() * matrixChars.length)]);
        }
        // Cooldown gates retriggering; with onset detection we want each hit
        // to get its own drop, not a burst. Bass=slowest, highs=fastest.
        plinkoCooldown[i] = i < 25 ? 260 : i < 50 ? 160 : 140;
      }
    }
  }

  function drawPlinko(c, w, h) {
    if (plinkoDrops.length === 0) return;
    var dpr = devicePixelRatio;
    var fontSize = 12 * dpr;
    var mT = matrixT;

    c.font = fontSize + 'px "JetBrains Mono", monospace';
    c.textAlign = 'center';

    for (var i = plinkoDrops.length - 1; i >= 0; i--) {
      var d = plinkoDrops[i];
      d.y += d.speed;
      d.life -= 0.007;  // ~2.4s lifespan — clear the screen between musical events

      // Remove if off screen or dead
      if (d.y - d.len * fontSize > h || d.life <= 0) {
        plinkoDrops.splice(i, 1);
        continue;
      }

      for (var j = 0; j < d.len; j++) {
        var charY = d.y - j * fontSize;
        if (charY < -fontSize || charY > h + fontSize) continue;
        var age = j / d.len;
        var alpha = (1 - age) * d.life * d.brightness * 0.7;
        if (alpha < 0.01) continue;

        if (mT > 0.5) {
          // Matrix mode — green
          c.fillStyle = j === 0
            ? 'rgba(180,255,180,' + Math.min(1, alpha * 1.5) + ')'
            : 'rgba(0,255,65,' + alpha + ')';
        } else {
          // Cosmos mode — amber/bone
          c.fillStyle = j === 0
            ? 'rgba(255,242,200,' + Math.min(1, alpha * 1.3) + ')'
            : 'rgba(232,184,88,' + (alpha * 0.6) + ')';
        }
        c.fillText(d.chars[j] || '0', d.x, charY);
      }
    }
  }

  function spawnParticles(cx, cy, energy, count) {
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = (1 + Math.random() * 3) * energy;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed * devicePixelRatio,
        vy: Math.sin(angle) * speed * devicePixelRatio,
        life: 1,
        decay: 0.008 + Math.random() * 0.015,
        r: (0.5 + Math.random() * 1.5) * devicePixelRatio,
        cyan: Math.random() < 0.35,
      });
    }
  }

  function avg(arr, from, to) {
    var s = 0, end = Math.min(to, arr.length);
    for (var i = from; i < end; i++) s += arr[i];
    return s / (end - from);
  }

  // ── DRAW LOOP ────────────────────────────────────────
  function drawViz() {
    requestAnimationFrame(drawViz);
    if (!vizCanvas) return;

    // ── Animate viewT toward target (exponential ease) ──
    viewT += (viewTarget - viewT) * 0.07;
    if (Math.abs(viewT - viewTarget) < 0.002) viewT = viewTarget;
    var expand = 1 - viewT; // 1 = fully visible, 0 = collapsed

    // ── Canvas visibility ──
    vizCanvas.style.opacity = Math.max(0, expand).toFixed(3);

    // ── Singularity orb ──
    if (singularityEl) {
      singularityEl.style.opacity = Math.max(0, viewT).toFixed(3);
    }

    // ── Read audio data (always, even when collapsed — singularity needs it) ──
    if (analyser && audioContextReady) {
      analyser.getByteTimeDomainData(dataArray);
      analyser.getByteFrequencyData(freqArray);
    }

    // Don't render canvas when fully collapsed
    if (expand < 0.005) {
      // Still update singularity beat
      updateSingularity();
      return;
    }

    // ── Smooth matrix transition ──
    var matrixTarget = matrixMode ? 1 : 0;
    matrixT += (matrixTarget - matrixT) * 0.04;
    if (Math.abs(matrixT - matrixTarget) < 0.005) matrixT = matrixTarget;

    var bass = 0, subBass = 0, mid = 0, high = 0, presence = 0, total = 0;
    bass = avg(freqArray, 0, 10) / 255;
    subBass = avg(freqArray, 0, 4) / 255;
    mid = avg(freqArray, 10, 80) / 255;
    high = avg(freqArray, 80, 300) / 255;
    presence = avg(freqArray, 300, 600) / 255;
    total = avg(freqArray, 0, 400) / 255;

    // ── Beat clock ──
    var beat = playing ? getBeat() : { phase:0, half:0, quarter:0, bar:0, pulse:0, barPulse:0, raw:0, bpm:120 };

    phase += 0.006 + total * 0.025;

    var w = vizCanvas.width, h = vizCanvas.height, dpr = devicePixelRatio;
    var c = vizCtx;

    // ── Beat detection ──
    var bassJump = bass - prevBass;
    if (bassJump > 0.15 && expand > 0.3) {
      spawnParticles(w * 0.5, h * 0.5, bassJump * 3 * expand, Math.floor((8 + bassJump * 40) * expand));
    }
    prevBass = bass * 0.7 + prevBass * 0.3;

    // ── Trail persistence ──
    trailCtx.drawImage(vizCanvas, 0, 0);
    c.clearRect(0, 0, w, h);

    // ── Background — cosmos or matrix ──
    // Original matrix rain removed — Spectrum Plinko (FFT-driven) replaces it
    if (matrixT < 0.99) {
      // Cosmic ground gradient (fades out as matrix takes over)
      var cosmosAlpha = 1 - matrixT;
      c.globalAlpha = cosmosAlpha;
      var grad = c.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
      grad.addColorStop(0, '#1f1a2a');
      grad.addColorStop(0.22, '#14121c');
      grad.addColorStop(0.52, '#08070d');
      grad.addColorStop(1, '#020204');
      c.fillStyle = grad;
      c.fillRect(0, 0, w, h);
      c.globalAlpha = 1;
    }

    // ── Spectrum Plinko ──
    if (playing && expand > 0.05) {
      updatePlinko(freqArray, w, h, dpr);
      drawPlinko(c, w, h);
    }

    // ── Trails ──
    var minDim = Math.min(w, h);
    var bloomScale = Math.min(1, minDim / (1200 * dpr));
    var glowDim = bloomScale * 0.7 + 0.3;
    c.globalAlpha = (0.78 + total * 0.1) * glowDim;
    c.drawImage(trailCanvas, 0, 0);
    c.globalAlpha = 1;
    trailCtx.fillStyle = matrixT > 0.5 ? 'rgba(13,2,8,0.18)' : 'rgba(2,2,4,0.12)';
    trailCtx.fillRect(0, 0, w, h);

    // ── Stars — forward-flying starfield ──
    var cosmosOpacity = 1 - matrixT;
    var starAlphaScale = expand * cosmosOpacity;
    var starSpeed = playing ? (0.3 + total * 1.2 + bass * 0.8) * dpr : 0.05 * dpr;
    var focalLen = Math.min(w, h) * 0.35;
    if (starAlphaScale > 0.01) {
      for (var si = 0; si < stars.length; si++) {
        var s = stars[si];
        var prevZ = s.z;
        s.z -= starSpeed;
        if (s.z <= 10) {
          stars[si] = makeStar(STAR_DEPTH);
          continue;
        }

        // perspective projection
        var sx = s.x * focalLen / s.z + w * 0.5;
        var sy = s.y * focalLen / s.z + h * 0.5;
        var px = s.x * focalLen / prevZ + w * 0.5;
        var py = s.y * focalLen / prevZ + h * 0.5;

        // skip if way off screen
        if (sx < -100 || sx > w + 100 || sy < -100 || sy > h + 100) continue;

        // size and alpha based on depth
        var depthRatio = 1 - s.z / STAR_DEPTH;
        var sr = (0.5 + depthRatio * 3) * dpr;
        var alpha = (s.baseAlpha * (0.15 + depthRatio * 0.85)) * starAlphaScale;
        if (alpha < 0.01) continue;

        // streak line from previous to current position
        var streakLen = Math.sqrt((sx - px) * (sx - px) + (sy - py) * (sy - py));
        if (streakLen > 1.5 * dpr) {
          c.beginPath();
          c.moveTo(px, py);
          c.lineTo(sx, sy);
          c.strokeStyle = s.isCyan
            ? 'rgba(78,201,212,' + alpha + ')'
            : 'rgba(245,238,221,' + alpha + ')';
          c.lineWidth = sr * 0.6;
          c.stroke();
        }

        // star point
        c.beginPath();
        c.arc(sx, sy, sr, 0, Math.PI * 2);
        c.fillStyle = s.isCyan
          ? 'rgba(78,201,212,' + alpha + ')'
          : 'rgba(245,238,221,' + alpha + ')';
        c.fill();

        // glow on close/bright stars
        if (depthRatio > 0.5 && alpha > 0.2) {
          c.beginPath();
          c.arc(sx, sy, sr * 3, 0, Math.PI * 2);
          c.fillStyle = s.isCyan
            ? 'rgba(78,201,212,' + (alpha * 0.12) + ')'
            : 'rgba(245,238,221,' + (alpha * 0.1) + ')';
          c.fill();
        }
      }
    }

    // ── Dark-matter filaments (drift with phase, breathe with mids) ──
    // Each filament drifts via its own phase offset (slow, independent
    // currents) and flexes by a per-control-point sine wave so the curve
    // gently undulates rather than translating rigidly. Alpha pulses with
    // mid-range energy so filaments breathe with the mix.
    if (expand > 0.1 && cosmosOpacity > 0.05) {
      var filBreathe = 0.6 + mid * 0.8 + total * 0.3;   // alpha multiplier
      var filFlex = (0.6 + mid * 1.4) * dpr;             // curve-deform amplitude in px
      // Gentle full-filament drift (px), offset per filament via seed
      function filDrift(seed, ampX, ampY) {
        return [
          Math.sin(phase * 0.22 + seed) * ampX * dpr,
          Math.cos(phase * 0.17 + seed * 1.3) * ampY * dpr,
        ];
      }
      // Per-control-point undulation
      function fx(x, i, seed) { return x + Math.sin(phase * 0.9 + i * 0.7 + seed) * filFlex; }
      function fy(y, i, seed) { return y + Math.cos(phase * 1.1 + i * 0.9 + seed) * filFlex * 0.8; }

      // Filament 1 — upper left sweep
      var d1 = filDrift(0.0, 6, 3);
      c.save(); c.translate(d1[0], d1[1]);
      c.globalAlpha = 0.25 * expand * cosmosOpacity * filBreathe;
      c.strokeStyle = '#6a5a7a'; c.lineWidth = 0.6 * dpr; c.lineCap = 'round';
      c.beginPath();
      c.moveTo(fx(w*0.05, 0, 0.0), fy(h*0.15, 0, 0.0));
      c.bezierCurveTo(fx(w*0.12,1,0.0),fy(h*0.17,1,0.0), fx(w*0.24,2,0.0),fy(h*0.19,2,0.0), fx(w*0.33,3,0.0),fy(h*0.18,3,0.0));
      c.bezierCurveTo(fx(w*0.38,4,0.0),fy(h*0.17,4,0.0), fx(w*0.43,5,0.0),fy(h*0.19,5,0.0), fx(w*0.48,6,0.0),fy(h*0.22,6,0.0));
      c.stroke();
      c.restore();

      // Filament 2 — lower left drift
      var d2 = filDrift(2.1, 5, 2.5);
      c.save(); c.translate(d2[0], d2[1]);
      c.globalAlpha = 0.2 * expand * cosmosOpacity * filBreathe;
      c.strokeStyle = '#5c5068'; c.lineWidth = 0.5 * dpr;
      c.beginPath();
      c.moveTo(fx(w*0.08, 0, 2.1), fy(h*0.68, 0, 2.1));
      c.bezierCurveTo(fx(w*0.18,1,2.1),fy(h*0.67,1,2.1), fx(w*0.26,2,2.1),fy(h*0.66,2,2.1), fx(w*0.35,3,2.1),fy(h*0.64,3,2.1));
      c.lineTo(fx(w*0.37, 4, 2.1), fy(h*0.63, 4, 2.1));
      c.bezierCurveTo(fx(w*0.41,5,2.1),fy(h*0.62,5,2.1), fx(w*0.45,6,2.1),fy(h*0.61,6,2.1), fx(w*0.50,7,2.1),fy(h*0.61,7,2.1));
      c.stroke();
      c.restore();

      // Filament 3 — upper right wisp
      var d3 = filDrift(4.4, 4, 2);
      c.save(); c.translate(d3[0], d3[1]);
      c.globalAlpha = 0.18 * expand * cosmosOpacity * filBreathe;
      c.strokeStyle = '#8b6a3a'; c.lineWidth = 0.5 * dpr;
      c.beginPath();
      c.moveTo(fx(w*0.56, 0, 4.4), fy(h*0.08, 0, 4.4));
      c.bezierCurveTo(fx(w*0.60,1,4.4),fy(h*0.11,1,4.4), fx(w*0.64,2,4.4),fy(h*0.15,2,4.4), fx(w*0.66,3,4.4),fy(h*0.21,3,4.4));
      c.stroke();
      c.restore();

      c.globalAlpha = 1;
    }

    // ── Hot event (beat-synced) ──
    var ex = w * 0.5, ey = h * 0.5;
    var beatKick = beat.pulse * 0.3; // 0→0.3 on each beat
    // Scale the event by expand — contracts toward a point as viewT → 1
    var eventR = (40 + bass * 100 + subBass * 35 + beatKick * 40) * dpr * bloomScale * (0.15 + expand * 0.85);

    // ── Color lerp for hot event (amber → green in matrix mode) ──
    var mT = matrixT;
    function lerpRGB(r1,g1,b1, r2,g2,b2, t) {
      return Math.round(r1+(r2-r1)*t)+','+Math.round(g1+(g2-g1)*t)+','+Math.round(b1+(b2-b1)*t);
    }
    var haloInner = lerpRGB(232,184,88, 0,255,65, mT);
    var haloMid   = lerpRGB(217,164,65, 0,200,50, mT);
    var coreWhite = lerpRGB(255,242,200, 180,255,180, mT);
    var coreBright= lerpRGB(255,223,138, 80,255,100, mT);
    var coreMid   = lerpRGB(232,184,88, 0,255,65, mT);
    var coreDim   = lerpRGB(217,164,65, 0,180,40, mT);
    var spikeCol  = lerpRGB(255,230,176, 0,255,65, mT);
    var singWhite = lerpRGB(255,242,200, 180,255,180, mT);

    // Outer halo
    var haloR = eventR * (1 + expand * 2);
    var halo = c.createRadialGradient(ex, ey, 0, ex, ey, haloR);
    halo.addColorStop(0, 'rgba(' + haloInner + ',' + ((0.04 + bass * 0.06) * glowDim) + ')');
    halo.addColorStop(0.3, 'rgba(' + haloMid + ',' + ((0.015 + bass * 0.02) * glowDim) + ')');
    halo.addColorStop(1, 'rgba(' + haloMid + ',0)');
    c.fillStyle = halo;
    c.fillRect(0, 0, w, h);

    // Core
    var core = c.createRadialGradient(ex, ey, 0, ex, ey, eventR);
    core.addColorStop(0, 'rgba(' + coreWhite + ',' + ((0.5 + bass * 0.3) * glowDim) + ')');
    core.addColorStop(0.06, 'rgba(' + coreBright + ',' + ((0.3 + bass * 0.2) * glowDim) + ')');
    core.addColorStop(0.2, 'rgba(' + coreMid + ',' + ((0.12 + bass * 0.1) * glowDim) + ')');
    core.addColorStop(0.5, 'rgba(' + coreDim + ',' + ((0.03 + bass * 0.04) * glowDim) + ')');
    core.addColorStop(1, 'rgba(' + coreDim + ',0)');
    c.beginPath(); c.arc(ex, ey, eventR, 0, Math.PI * 2);
    c.fillStyle = core; c.fill();

    // Singularity point (beat-synced)
    var singR = (2 + bass * 3 + subBass * 1.5 + beatKick * 4) * dpr;
    c.beginPath(); c.arc(ex, ey, singR, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,255,255,' + (0.85 + bass * 0.15) + ')'; c.fill();
    c.beginPath(); c.arc(ex, ey, singR * 2, 0, Math.PI * 2);
    c.fillStyle = 'rgba(' + singWhite + ',' + ((0.2 + bass * 0.15) * glowDim) + ')'; c.fill();

    // Diffraction spikes
    var spikeAlpha = expand;
    if (spikeAlpha > 0.05) {
      var spikeAngle = total * 0.3;
      var sLen = (20 + bass * 40 + subBass * 20 + beat.pulse * 25) * dpr * expand;
      c.strokeStyle = 'rgba(' + spikeCol + ',' + ((0.25 + bass * 0.35) * spikeAlpha) + ')';
      c.lineWidth = (0.5 + bass * 0.5) * dpr;
      for (var a = 0; a < 4; a++) {
        var ang = spikeAngle + a * Math.PI / 2;
        var len = a % 2 === 0 ? sLen : sLen * 0.65;
        c.beginPath();
        c.moveTo(ex - Math.cos(ang) * len, ey - Math.sin(ang) * len);
        c.lineTo(ex + Math.cos(ang) * len, ey + Math.sin(ang) * len);
        c.stroke();
      }
    }

    // ── Particles ──
    for (var pi = particles.length - 1; pi >= 0; pi--) {
      var p = particles[pi];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(pi, 1); continue; }
      c.beginPath();
      c.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      if (matrixT > 0.5) {
        c.fillStyle = 'rgba(0,255,65,' + (p.life * 0.8) + ')';
      } else {
        c.fillStyle = p.cyan
          ? 'rgba(78,201,212,' + (p.life * 0.7) + ')'
          : 'rgba(232,184,88,' + (p.life * 0.8) + ')';
      }
      c.fill();
    }

    // ── Signal waveforms (fade with expand) ──
    if (expand > 0.05) {
      var waveY = h * 0.5;
      var wsx = 0, wex2 = w;
      var ww = wex2 - wsx;
      var pts = 300;
      var step = Math.floor(dataArray.length / pts);

      function drawWave(color, glowColor, alpha, amplitude, freqMul, phaseMul, phaseOff, yOff, lineW, glowR, dataOff) {
        c.beginPath();
        c.lineWidth = lineW * dpr * expand;
        c.strokeStyle = 'rgba(' + color + ',' + (alpha * expand) + ')';
        c.shadowColor = 'rgba(' + glowColor + ')';
        c.shadowBlur = glowR * dpr * expand;
        var xPts = [], yPts = [];
        for (var i = 0; i < pts; i++) {
          var x = wsx + (i / pts) * ww;
          var idx = Math.min(i * step + dataOff, dataArray.length - 1);
          var sample = (dataArray[idx] - 128) / 128;
          var env = Math.sin((i / pts) * Math.PI);
          var envEdge = Math.pow(env, 0.8);
          var drift = Math.sin(phase * phaseMul + i * freqMul + phaseOff) * 14 * dpr * expand;
          var y = waveY + yOff * dpr + sample * amplitude * dpr * envEdge * expand + drift;
          xPts.push(x);
          yPts.push(y);
        }
        c.moveTo(xPts[0], yPts[0]);
        for (var i = 1; i < pts - 1; i++) {
          var cpx = (xPts[i] + xPts[i + 1]) / 2;
          var cpy = (yPts[i] + yPts[i + 1]) / 2;
          c.quadraticCurveTo(xPts[i], yPts[i], cpx, cpy);
        }
        c.stroke();
        c.shadowBlur = 0;
      }

      // Wave colors shift amber→green, cyan→green, bone→green in matrix mode
      var waveAmber = lerpRGB(232,184,88, 0,255,65, mT);
      var waveCyan  = lerpRGB(78,201,212, 0,200,40, mT);
      var waveBone  = lerpRGB(240,235,219, 0,180,30, mT);

      var amberA = 0.55 + mid * 0.45;
      var amberW = 1.6 + mid * 2;
      drawWave(waveAmber, waveAmber+',0.45', amberA, 50 + mid * 30, 0.028, 1, 0, 0, amberW, 14, 0);

      var cyanA = 0.4 + high * 0.5;
      var cyanW = 1.1 + high * 1.8;
      drawWave(waveCyan, waveCyan+',0.4', cyanA, 38 + high * 25, 0.045, 1.4, 1.8, -10, cyanW, 12, Math.floor(step * 0.4));

      var boneA = 0.08 + total * 0.18;
      drawWave(waveBone, waveBone+',0.15', boneA, 22 + total * 15, 0.035, 0.7, 3.5, 8, 0.7, 0, Math.floor(step * 0.7));
    }

    // ── Presence shimmer ──
    if (presence > 0.1 && expand > 0.2) {
      c.globalAlpha = presence * 0.15 * expand;
      for (var i = 0; i < 40; i++) {
        var px = Math.random() * w;
        var spread = (20 + presence * 40) * dpr;
        var py = h * 0.5 + (Math.random() - 0.5) * spread;
        var pr = (0.3 + Math.random() * 0.8) * dpr;
        c.beginPath(); c.arc(px, py, pr, 0, Math.PI * 2);
        c.fillStyle = matrixT > 0.5
          ? 'rgba(0,255,65,' + (Math.random() < 0.5 ? '0.6' : '0.4') + ')'
          : (Math.random() < 0.5 ? 'rgba(78,201,212,0.6)' : 'rgba(232,184,88,0.5)');
        c.fill();
      }
      c.globalAlpha = 1;
    }

    // ── Circular spectrum ──
    if (expand > 0.1) {
      var specBands = 90;
      var specRadius = (60 + bass * 30) * dpr * bloomScale * expand;
      c.globalAlpha = (0.08 + total * 0.07) * expand;
      for (var i = 0; i < specBands; i++) {
        var angle = (i / specBands) * Math.PI * 2 + phase * 0.3;
        var fi = Math.floor((i / specBands) * freqArray.length * 0.3);
        var val = freqArray[fi] / 255;
        var barLen = val * 50 * dpr * expand;
        var x1 = ex + Math.cos(angle) * specRadius;
        var y1 = ey + Math.sin(angle) * specRadius;
        var x2 = ex + Math.cos(angle) * (specRadius + barLen);
        var y2 = ey + Math.sin(angle) * (specRadius + barLen);
        var bandT = i / specBands;
        if (matrixT > 0.5) {
          c.strokeStyle = 'rgba(0,255,65,' + (0.4 + val * 0.5) + ')';
        } else {
          c.strokeStyle = bandT < 0.5
            ? 'rgba(232,184,88,' + (0.5 + val * 0.5) + ')'
            : 'rgba(78,201,212,' + (0.4 + val * 0.5) + ')';
        }
        c.lineWidth = (1 + val * 1.5) * dpr;
        c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      }
      c.globalAlpha = 1;
    }

    // Update singularity orb if partially visible
    updateSingularity();
  }

  // ── Singularity orb — Radiant Seal M-cycling above the left player ──
  //
  // The 5 Ms cycle on bar downbeats (playing) or on a slow 3.5s timer
  // (idle). Lattice geometry matches the full Radiant Seal artifact, at
  // mini scale. Retina-doubled for crispness at ~44px display size.
  var SEAL_OUTER = [[35,2],[60,16],[60,44],[35,58],[10,44],[10,16]];
  var SEAL_INNER = [[35,16],[47,23],[47,37],[35,44],[23,37],[23,23]];
  var SEAL_HUB_TOP = [35,22];
  var SEAL_HUB_BOT = [35,38];
  var SEAL_CORE = [35,30];
  var SEAL_MS = [
    { lines: [[SEAL_OUTER[5],SEAL_OUTER[4]],[SEAL_OUTER[1],SEAL_OUTER[2]],[SEAL_OUTER[5],SEAL_HUB_BOT],[SEAL_HUB_BOT,SEAL_OUTER[1]]], color: '#ffe6a0' },
    { lines: [[SEAL_OUTER[5],SEAL_OUTER[4]],[SEAL_OUTER[1],SEAL_OUTER[2]],[SEAL_OUTER[5],SEAL_HUB_TOP],[SEAL_HUB_TOP,SEAL_OUTER[1]]], color: '#f5c970' },
    { lines: [[SEAL_OUTER[5],SEAL_OUTER[4]],[SEAL_OUTER[1],SEAL_OUTER[2]],[SEAL_OUTER[5],SEAL_CORE],[SEAL_CORE,SEAL_OUTER[1]]], color: '#ffffff' },
    { lines: [[SEAL_OUTER[5],SEAL_OUTER[4]],[SEAL_OUTER[1],SEAL_OUTER[2]],[SEAL_OUTER[5],SEAL_INNER[3]],[SEAL_INNER[3],SEAL_OUTER[1]]], color: '#4ec9d4' },
    { lines: [[SEAL_INNER[5],SEAL_INNER[4]],[SEAL_INNER[1],SEAL_INNER[2]],[SEAL_INNER[5],SEAL_HUB_BOT],[SEAL_HUB_BOT,SEAL_INNER[1]]], color: '#e8b858' },
  ];

  var sealCanvas = null, sealCtx = null, sealDpr = 1;
  var sealCurrentM = 0;
  var sealMAlpha = 1;
  var sealMSwitchT = 0;    // timestamp of last M switch (for idle timer)
  var sealLastBar = -1;    // last integer bar seen (for downbeat detection)
  var SEAL_IDLE_MS = 3500; // ms per M when not playing

  function initSealCanvas() {
    sealCanvas = document.getElementById('singularity-canvas');
    if (!sealCanvas) return false;
    sealCtx = sealCanvas.getContext('2d');
    sealDpr = devicePixelRatio || 1;
    // Match CSS display size (44×40) scaled for retina
    sealCanvas.width = Math.round(44 * sealDpr);
    sealCanvas.height = Math.round(40 * sealDpr);
    return true;
  }

  function drawSeal() {
    if (!sealCtx) return;
    var c = sealCtx;
    var w = sealCanvas.width, h = sealCanvas.height;
    // Radiant viewBox is 70×60, orb is 44×40 — uniform scale so shape fills
    var sx = w / 70, sy = h / 60;
    c.clearRect(0, 0, w, h);

    function pt(p) { return [p[0] * sx, p[1] * sy]; }
    function stroke(a, b, width, alpha, color) {
      c.strokeStyle = color;
      c.globalAlpha = alpha;
      c.lineWidth = width;
      c.beginPath();
      var pa = pt(a), pb = pt(b);
      c.moveTo(pa[0], pa[1]);
      c.lineTo(pb[0], pb[1]);
      c.stroke();
    }

    c.lineCap = 'round';
    c.lineJoin = 'round';
    var dimColor = matrixMode ? 'rgba(0,255,65,%A)' : 'rgba(232,184,88,%A)';
    function dim(a) { return dimColor.replace('%A', a); }

    // Outer hex (dim)
    c.strokeStyle = dim(0.30);
    c.globalAlpha = 1;
    c.lineWidth = 1.4 * sealDpr;
    c.beginPath();
    for (var i = 0; i < SEAL_OUTER.length; i++) {
      var p = pt(SEAL_OUTER[i]);
      if (i === 0) c.moveTo(p[0], p[1]); else c.lineTo(p[0], p[1]);
    }
    c.closePath();
    c.stroke();

    // Inner hex (dimmer)
    c.strokeStyle = dim(0.18);
    c.lineWidth = 0.9 * sealDpr;
    c.beginPath();
    for (var i = 0; i < SEAL_INNER.length; i++) {
      var p = pt(SEAL_INNER[i]);
      if (i === 0) c.moveTo(p[0], p[1]); else c.lineTo(p[0], p[1]);
    }
    c.closePath();
    c.stroke();

    // Current M (bright, glowing)
    var m = SEAL_MS[sealCurrentM];
    var mColor = matrixMode ? '#00ff41' : m.color;
    c.save();
    c.shadowColor = mColor;
    c.shadowBlur = 6 * sealDpr;
    c.strokeStyle = mColor;
    c.lineWidth = 1.8 * sealDpr;
    c.globalAlpha = sealMAlpha * 0.95;
    for (var i = 0; i < m.lines.length; i++) {
      var pa = pt(m.lines[i][0]);
      var pb = pt(m.lines[i][1]);
      c.beginPath();
      c.moveTo(pa[0], pa[1]);
      c.lineTo(pb[0], pb[1]);
      c.stroke();
    }
    c.restore();

    // Core pulse
    var corePt = pt(SEAL_CORE);
    var coreR = 1.8 * sealDpr;
    c.globalAlpha = 1;
    c.fillStyle = matrixMode ? '#b0ffb0' : '#ffe6a0';
    c.beginPath();
    c.arc(corePt[0], corePt[1], coreR, 0, Math.PI * 2);
    c.fill();
  }

  function updateSingularity() {
    if (!singularityEl || viewT < 0.01) return;
    if (!sealCanvas && !initSealCanvas()) return;

    var bass = 0;
    if (analyser && audioContextReady) {
      bass = avg(freqArray, 0, 10) / 255;
    }

    var beat = playing ? getBeat() : null;
    var pulse = beat ? beat.pulse : 0;

    // Size + glow react to bass and beat pulse
    var size = 38 + bass * 14 + pulse * 8;
    var glowR = 3 + bass * 6 + pulse * 4;
    singularityEl.style.width = size + 'px';
    singularityEl.style.height = (size * 40/44) + 'px';
    singularityEl.style.filter = 'drop-shadow(0 0 ' + glowR + 'px ' + (matrixMode ? '#00ff41' : '#e8b858') + ')';

    // Advance M on bar downbeat (playing) or on idle timer
    var now = performance.now();
    if (beat) {
      var currentBar = Math.floor(beat.raw / 4);
      if (currentBar !== sealLastBar) {
        sealLastBar = currentBar;
        if (sealLastBar > 0) { // skip the phantom 0→real bar transition on play start
          sealCurrentM = (sealCurrentM + 1) % SEAL_MS.length;
          sealMSwitchT = now;
        }
      }
    } else {
      if (now - sealMSwitchT > SEAL_IDLE_MS) {
        sealCurrentM = (sealCurrentM + 1) % SEAL_MS.length;
        sealMSwitchT = now;
      }
    }

    // M fade — quick fade-in on switch, steady hold
    var sinceSwitch = now - sealMSwitchT;
    sealMAlpha = Math.min(1, sinceSwitch / 200);

    drawSeal();
  }

  // ══════════════════════════════════════════════════════
  // ── MATRIX EASTER EGG ──────────────────────────────
  // ══════════════════════════════════════════════════════

  var MATRIX_PALETTE = {
    '--signal-machine': '#00ff41',
    '--signal-synth': '#00ff41',
    '--signal-synth-bright': '#33ff66',
    '--stage-void': '#0d0208',
    '--stage-deep': '#0a0a0a',
    '--panel': '#0d0d0d',
    '--rule': '#0f3a0f',
    '--rule-soft': '#0a2a0a',
    '--ink-bright': '#f0ecf8',
    '--ink-soft': '#c4b8d9',
    '--ink-dim': '#8b7aa8',
    '--ink-faint': '#4a3d5c',
  };

  var COSMOS_PALETTE = {
    '--signal-machine': '#4ec9d4',
    '--signal-synth': '#e8b858',
    '--signal-synth-bright': '#f5c970',
    '--stage-void': '#020204',
    '--stage-deep': '#08070d',
    '--panel': '#0c0b12',
    '--rule': '#242a33',
    '--rule-soft': '#1b2028',
    '--ink-bright': '#e8e3d4',
    '--ink-soft': '#b5b0a3',
    '--ink-dim': '#8a8574',
    '--ink-faint': '#4a4740',
  };

  // Content palette for iframes — signal-synth is lilac, not green
  var MATRIX_CONTENT_PALETTE = {};
  for (var k in MATRIX_PALETTE) MATRIX_CONTENT_PALETTE[k] = MATRIX_PALETTE[k];
  MATRIX_CONTENT_PALETTE['--signal-synth'] = '#c4b8d9';
  MATRIX_CONTENT_PALETTE['--signal-synth-bright'] = '#d8cef0';

  function setMatrixMode(on) {
    matrixMode = on;
    var palette = on ? MATRIX_PALETTE : COSMOS_PALETTE;
    var root = document.documentElement;
    for (var key in palette) {
      root.style.setProperty(key, palette[key]);
    }
    // Broadcast skin to iframe content pages
    broadcastSkin(on);
  }

  function broadcastSkin(matrix) {
    var palette = matrix ? MATRIX_CONTENT_PALETTE : COSMOS_PALETTE;
    try {
      if (frame.contentWindow) {
        frame.contentWindow.postMessage({ type: 'mythos:skin', palette: palette }, '*');
      }
    } catch(e) {}
  }


  // ── NAVIGATION ───────────────────────────────────────
  function nav(page, opts) {
    opts = opts || {};
    if (!PAGE_META[page]) { console.warn('unknown page', page); return; }
    if (page === currentPage && !opts.force) return;
    currentPage = page;
    loader.classList.add('on');

    // Update nav state
    document.querySelectorAll('.nav-link').forEach(function(el) {
      el.classList.toggle('active', el.getAttribute('data-page') === page);
    });

    // Update breadcrumb
    var meta = PAGE_META[page];
    document.getElementById('crumb-current').textContent = meta.title;
    document.title = 'MythOS \u00B7 ' + meta.title;

    // ── Page type transition ──
    viewTarget = meta.dark ? 0 : 1;

    // Set iframe background
    frame.style.background = meta.dark ? 'transparent' : 'var(--stage-void)';

    // Load page
    frame.src = 'pages/' + page;

    // Save
    try { localStorage.setItem(PAGE_KEY, page); } catch(e){}
    history.replaceState(null, '', '#' + page.replace(/\.html$/, ''));

    toggleSide(false);
  }

  frame.addEventListener('load', function() {
    loader.classList.remove('on');
    setTimeout(function() {
      broadcastTrack();
      broadcastSkin(matrixMode);
    }, 50);
  });

  function toggleSide(force) {
    var sb = document.getElementById('sidebar');
    var sc = document.getElementById('scrim');
    var mb = document.querySelector('.menu-btn');
    var on = typeof force === 'boolean' ? force : !sb.classList.contains('on');
    sb.classList.toggle('on', on);
    sc.classList.toggle('on', on);
    if (mb) mb.classList.toggle('on', on);
  }

  // ── CROSS-FRAME MESSAGING ────────────────────────────
  function broadcastTrack() {
    var t = TRACKS[current];
    var msg = {
      type: 'mythos:audio',
      track: { title: t.title, album: t.album, cover: t.cover, index: current },
      playing: playing, volume: volume, muted: muted, loop: loop, shuffle: shuffle,
      currentTime: audio.currentTime || 0,
      duration: audio.duration || 0,
    };
    try {
      if (frame.contentWindow) frame.contentWindow.postMessage(msg, '*');
    } catch(e){}
  }

  window.addEventListener('message', function(e) {
    var d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'mythos:nav' && d.href) {
      var page = d.href.replace(/^.*\//, '');
      if (PAGE_META[page]) nav(page);
      else if (d.href.startsWith('http')) window.open(d.href, '_blank');
    }
    else if (d.type === 'mythos:audio:cmd') {
      ensureAudioContext();
      if (d.cmd === 'play') audio.play().catch(function(){});
      else if (d.cmd === 'pause') audio.pause();
      else if (d.cmd === 'toggle') togglePlay();
      else if (d.cmd === 'next') nextTrack();
      else if (d.cmd === 'prev') prevTrack();
      else if (d.cmd === 'load' && typeof d.index === 'number') { loadTrack(d.index); audio.play().catch(function(){}); }
      else if (d.cmd === 'seek' && typeof d.time === 'number') audio.currentTime = d.time;
    }
    else if (d.type === 'mythos:audio:subscribe') {
      broadcastTrack();
    }
    else if (d.type === 'mythos:skin:subscribe') {
      broadcastSkin(matrixMode);
    }
  });

  setInterval(function() { if (playing) broadcastTrack(); }, 1000);

  window.__mythos = {
    getAudio: function() { return audio; },
    tracks: TRACKS,
    getCurrent: function() { return current; },
    isPlaying: function() { return playing; },
    isMatrix: function() { return matrixMode; },
    getBeat: getBeat,
    togglePlay: togglePlay, nextTrack: nextTrack, prevTrack: prevTrack, loadTrack: loadTrack,
  };

  // ── KEYBOARD ─────────────────────────────────────────
  document.addEventListener('keydown', function(e) {
    if (e.target.matches('input, textarea')) return;
    if (e.target.tagName === 'IFRAME') return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.code === 'ArrowRight' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); nextTrack(); }
    else if (e.code === 'ArrowLeft' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); prevTrack(); }
  });

  // ── INIT ─────────────────────────────────────────────
  document.getElementById('vol-fill').style.width = (muted ? 0 : volume * 100) + '%';
  document.getElementById('btn-shuffle').classList.toggle('on', shuffle);
  document.getElementById('btn-loop').classList.toggle('on', loop);
  loadTrack(current, { seekTo: savedTime });
  updatePlayIcon();

  // Determine initial page
  var initialPage = 'landing.html';
  var hash = location.hash.replace('#', '');
  if (hash && PAGE_META[hash + '.html']) initialPage = hash + '.html';
  else if (hash && PAGE_META[hash]) initialPage = hash;
  else {
    try {
      var s = localStorage.getItem(PAGE_KEY);
      if (s && PAGE_META[s]) initialPage = s;
    } catch(e){}
  }

  // Set initial viewTarget based on starting page
  var initialMeta = PAGE_META[initialPage];
  if (initialMeta) {
    viewTarget = initialMeta.dark ? 0 : 1;
    viewT = viewTarget; // snap to initial state (no transition on load)
  }

  // Init visualizer canvas immediately
  initViz();

  // Navigate to initial page
  nav(initialPage, { force: true });

  window.addEventListener('beforeunload', saveState);

  // ── EXPOSE GLOBALS ───────────────────────────────────
  window.nav = nav;
  window.toggleSide = toggleSide;
  window.togglePlay = togglePlay;
  window.nextTrack = nextTrack;
  window.prevTrack = prevTrack;
  window.seek = seek;
  window.setVol = setVol;
  window.toggleMute = toggleMute;
  window.toggleShuffle = toggleShuffle;
  window.toggleLoop = toggleLoop;
  window.toggleQueue = toggleQueue;
})();
