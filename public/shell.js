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
    '_lyrics-preview.html':                       { title: 'Lyrics (preview)',        group: 'Transmissions', dark: true, hidden: true },
    '_labeler.html':                              { title: 'Section Labeler',         group: 'Transmissions', dark: true, hidden: true },
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
  let analyserL = null, analyserR = null, splitterNode = null;
  let audioContextReady = false;
  let vizCanvas, vizCtx, trailCanvas, trailCtx;
  let dataArray = new Uint8Array(4096);
  let freqArray = new Uint8Array(2048);
  let freqArrayL = new Uint8Array(2048);
  let freqArrayR = new Uint8Array(2048);
  let phase = 0, particles = [], stars = [], prevBass = 0, waveVis = 0;
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

  // ── LYRIC RIBBON — invisible lyrics revealed by conducted rain ─────
  //
  // The word-timed lyric JSON (whisper-aligned to canonical text) drives
  // a right-to-left ribbon along a slow-following copy of the amber wave.
  // Words are INVISIBLE by default. A conductor layer fires plinko drops
  // aimed at currently-singing words; drops that splash a word's glyphs
  // raise per-letter reveal energy. Revealed glyphs emit amber light +
  // spawn splash particles; a fraction of splash particles get promoted
  // into the star-field, accelerating toward the camera.
  //
  // Design constraints (2026-04-19):
  //   - Trust whisper-merged timings (word.t, word.d) exactly — no fuzzy
  //     search at render time.
  //   - Smooth ribbon y, don't track the raw wave (words would be seasick).
  //   - Per-glyph reveal, measured once per word at enqueue time (no
  //     per-frame font measurement).
  //   - Rain aimed at words during their sing window; rate proportional to
  //     instantaneous mid-band energy (vocal range).
  //
  var lyricState = {
    trackFile: null,
    loadToken: 0,
    lines: null,          // [{ t, text, words: [{t,d,w}] }]
    sprites: [],          // active LINE sprites — one per lyric line
    lineCursor: 0,        // next line index to spawn
  };

  // Two-strip ribbon: alternating amber + cyan reading strips. Each strip
  // has its own slow-follow wave buffer anchored at a different y center.
  // stripIdx 0 = amber (upper), stripIdx 1 = cyan (lower).
  var lyricWaveBufs = [null, null]; // Float32Array[2]
  var lyricWaveBufStride = 40;      // one sample every N canvas px
  var LYRIC_STRIP_OFFSET = 0.09;    // strip y centers = h*(0.5 ± offset)

  // Splash particles (distinct from the existing `particles` array so we
  // can cheaply promote a fraction of them into `stars` without polluting
  // general-purpose particle behavior).
  var splashParticles = [];

  // ── Lyric loader ────────────────────────────────────
  // Lyrics live at music/lyrics/<stem>.json. Stem = audio file basename
  // minus .mp3. Fetched once per track change; failure is quiet (tracks
  // without lyrics just don't ribbon).
  function loadLyricsForTrack(file) {
    if (lyricState.trackFile === file) return;
    lyricState.trackFile = file;
    lyricState.lines = null;
    lyricState.sprites = [];
    lyricState.lineCursor = 0;
    if (!file) return;
    var token = ++lyricState.loadToken;
    var stem = file.replace(/^.*\//, '').replace(/\.mp3$/i, '');
    var url = 'music/lyrics/' + encodeURIComponent(stem) + '.json';
    fetch(url).then(function(r){ if (!r.ok) throw 0; return r.json(); })
      .then(function(json) {
        if (token !== lyricState.loadToken) return;
        var raw = json && json.lines ? json.lines : null;
        if (!raw) return;
        // Normalize: each line must have t + words[]. Sort defensively.
        var lines = [];
        for (var li = 0; li < raw.length; li++) {
          var ln = raw[li];
          if (!ln || !ln.words || !ln.words.length) continue;
          var words = ln.words.map(function(w){ return { t:+w.t, d:+w.d, w: w.w || '' }; });
          words.sort(function(a,b){ return a.t - b.t; });
          var last = words[words.length - 1];
          lines.push({
            t: +ln.t,
            tEnd: last.t + last.d,
            text: ln.text || words.map(function(w){return w.w;}).join(' '),
            words: words,
          });
        }
        lines.sort(function(a,b){ return a.t - b.t; });
        lyricState.lines = lines;
      }).catch(function(){ /* quiet */ });
  }

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
      // Stereo side-chain: splitter → per-channel analysers for --band-N-l/-r
      // and --pan-balance. Silent output (not connected to destination) so
      // it can't double the signal; mono sources leave channel 1 silent,
      // which is detected below and folded back to L.
      splitterNode = actx.createChannelSplitter(2);
      analyserL = actx.createAnalyser();
      analyserR = actx.createAnalyser();
      analyserL.fftSize = 4096; analyserL.smoothingTimeConstant = 0.78;
      analyserR.fftSize = 4096; analyserR.smoothingTimeConstant = 0.78;
      sourceNode.connect(splitterNode);
      splitterNode.connect(analyserL, 0);
      splitterNode.connect(analyserR, 1);
      dataArray = new Uint8Array(analyser.fftSize);
      freqArray = new Uint8Array(analyser.frequencyBinCount);
      freqArrayL = new Uint8Array(analyserL.frequencyBinCount);
      freqArrayR = new Uint8Array(analyserR.frequencyBinCount);
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
    loadLyricsForTrack(t.file);

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
  audio.addEventListener('play', function() { playing = true; document.documentElement.setAttribute('data-audio-playing', '1'); updatePlayIcon(); broadcastTrack(); });
  audio.addEventListener('pause', function() { playing = false; document.documentElement.removeAttribute('data-audio-playing'); updatePlayIcon(); saveState(); broadcastTrack(); });
  audio.addEventListener('seeked', function() {
    // Flush ribbon state; updateLyricSprites will rebuild cursor next frame.
    lyricState.sprites = [];
    lyricState.lineCursor = 0;
  });
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

  var STAR_COUNT = 1800;
  var STAR_DEPTH = 2000;
  function initStars() {
    stars = [];
    if (!vizCanvas) return;
    for (var i = 0; i < STAR_COUNT; i++) {
      stars.push(makeStar(Math.random() * STAR_DEPTH));
    }
  }
  function makeStar(z) {
    // Spread sized so stars uniformly fill the viewport at the far plane.
    // Projection: sx = x * focalLen / z; at z = STAR_DEPTH, target |sx| ~ 0.65 * w
    // so edges get a little overfill and the field doesn't vignette into a cone.
    var w = vizCanvas ? vizCanvas.width : 1920;
    var h = vizCanvas ? vizCanvas.height : 1080;
    var focalLen = Math.min(w, h) * 0.35;
    var xMax = (w * 0.65) * STAR_DEPTH / focalLen;
    var yMax = (h * 0.65) * STAR_DEPTH / focalLen;
    return {
      x: (Math.random() - 0.5) * 2 * xMax,
      y: (Math.random() - 0.5) * 2 * yMax,
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

  // ── LYRIC RIBBON: spawn / layout / render ─────────────
  //
  // The ribbon scrolls right-to-left at a constant pixel velocity. Each
  // word is given a LEAD of LYRIC_LEAD seconds (spawned at the right edge
  // that many seconds before its sung time), reaches center-stage at its
  // sung time, and trails off the left edge LYRIC_TAIL seconds after.
  // Velocity px/sec = screenWidth / (LEAD + TAIL).
  //
  // Per-glyph layout is measured at spawn time (one canvas.measureText per
  // letter) and cached on the sprite. The sprite's (x, y) updates each
  // frame; letter offsets are constant.
  //
  var LYRIC_LEAD = 3.5;       // seconds before line's first word the line appears on right
  var LYRIC_TAIL = 2.5;       // seconds after line's last word the line persists on left
  var LYRIC_FONT_PX = 24;     // base size in CSS pixels (multiplied by dpr inside)
  var LYRIC_TRAVEL_SECS = LYRIC_LEAD + LYRIC_TAIL;
  // Ribbon font: JetBrains Mono. Monospace = deterministic measurement
  // regardless of web-font load timing.
  var LYRIC_FONT = '"JetBrains Mono", monospace';
  // Reading anchor: fraction of viewport width where the currently-sung
  // letter is pinned. 0 = left, 1 = right. Tune this to taste.
  var LYRIC_ANCHOR_FRAC = 0.76;

  // Layout a whole lyric LINE as one sprite. Words within the line are
  // laid out left-to-right with a single-space gap; each letter carries
  // its owning word index + its sung time so the conductor can fire
  // letter-timed drops for the word being sung right now.
  // stripIdx: 0 = amber (upper), 1 = cyan (lower). Alternates per line.
  function spawnLineSprite(line, c, dpr, w, h, stripIdx) {
    // Auto-scale: on narrow viewports, ensure the line fits ~90% of width
    // so there's always at least a short in-viewport reading window.
    var baseFontPx = LYRIC_FONT_PX * dpr;
    var prevFont = c.font;
    var prevAlign = c.textAlign;
    // Measure at base size first.
    c.font = '500 ' + baseFontPx + 'px ' + LYRIC_FONT;
    var spaceW = c.measureText(' ').width;
    var measureTotal = 0;
    for (var mi = 0; mi < line.words.length; mi++) {
      measureTotal += c.measureText(line.words[mi].w || '').width;
      if (mi < line.words.length - 1) measureTotal += spaceW;
    }
    var fontPx = baseFontPx;
    var maxW = w * 0.9;
    if (measureTotal > maxW && measureTotal > 0) {
      fontPx = Math.max(baseFontPx * 0.55, baseFontPx * (maxW / measureTotal));
    }
    // Re-measure at final size for accurate letter positions.
    c.font = '500 ' + fontPx + 'px ' + LYRIC_FONT;
    c.textAlign = 'left';
    spaceW = c.measureText(' ').width;

    var letters = [];
    var xOff = 0;
    for (var wi = 0; wi < line.words.length; wi++) {
      var word = line.words[wi];
      var text = word.w || '';
      // Per-letter sung-time slice within this word.
      var n = text.length || 1;
      for (var ci = 0; ci < text.length; ci++) {
        var ch = text[ci];
        var m = c.measureText(ch);
        var sungAt = word.t + (word.d * (ci + 0.5) / n);
        letters.push({
          ch: ch,
          x: xOff,
          y: 0,
          w: m.width,
          h: fontPx,
          wordIdx: wi,
          sungAt: sungAt,
          revealed: 0,
        });
        xOff += m.width;
      }
      if (wi < line.words.length - 1) xOff += spaceW;
    }
    var totalW = xOff;

    c.font = prevFont;
    c.textAlign = prevAlign;

    // Flight ≈ 0.7s. Primary strike per letter: fire at sungAt - flightTime.
    var flightTime = 0.7;
    var hits = [];
    for (var li = 0; li < letters.length; li++) {
      hits.push({
        fireAt: letters[li].sungAt - flightTime,
        letterIdx: li,
        fired: false,
        kind: 'primary',
      });
    }
    hits.sort(function(a,b){ return a.fireAt - b.fireAt; });

    // Sprite travel window: from (firstWord.t - LEAD) to (lastWord.tEnd + TAIL).
    // Travel uses the same global TRAVEL_SECS so velocity is identical for
    // every line — they just spawn at different times.
    lyricState.sprites.push({
      text: line.text,
      t: line.t,
      tEnd: line.tEnd,
      startT: line.t - LYRIC_LEAD,
      endT:   line.tEnd + LYRIC_TAIL,
      letters: letters,
      totalW: totalW,
      fontPx: fontPx,
      stripIdx: stripIdx | 0,
      hits: hits,
      extrasAccum: 0,
      x: 0, y: 0,
      splashEnergy: 0,
    });
  }

  function updateLyricSprites(audioTime, c, w, h, dpr) {
    if (!lyricState.lines || !lyricState.lines.length) return;

    // First-run / big-seek: fast-forward cursor past lines whose ribbon
    // window already ended, so we don't spawn thousands of stale sprites.
    if (lyricState.lineCursor === 0 && lyricState.sprites.length === 0) {
      for (var fi = 0; fi < lyricState.lines.length; fi++) {
        if (lyricState.lines[fi].tEnd + LYRIC_TAIL >= audioTime - 0.5) {
          lyricState.lineCursor = fi;
          break;
        }
      }
    }

    // Spawn any lines that have entered their LEAD window.
    // Alternate strips: even-indexed lines go amber (strip 0), odd go cyan.
    while (lyricState.lineCursor < lyricState.lines.length) {
      var next = lyricState.lines[lyricState.lineCursor];
      if (audioTime >= next.t - LYRIC_LEAD - 0.1) {
        spawnLineSprite(next, c, dpr, w, h, lyricState.lineCursor & 1);
        lyricState.lineCursor++;
      } else break;
    }

    // Seek backward handler.
    if (lyricState.sprites.length > 0) {
      var first = lyricState.sprites[0];
      if (audioTime < first.startT - 0.5) {
        lyricState.sprites = [];
        lyricState.lineCursor = 0;
        for (var i = 0; i < lyricState.lines.length; i++) {
          if (lyricState.lines[i].tEnd + LYRIC_TAIL >= audioTime - 0.5) {
            lyricState.lineCursor = i;
            break;
          }
        }
      }
    }

    // Update positions + retire.
    // Anchor model: at any audioTime in the line's sung window, position
    // the sprite so the currently-sung letter sits at the READING ANCHOR
    // (LYRIC_ANCHOR_FRAC of viewport width). Before the line starts the
    // sprite ramps in from the right edge over LEAD; after it ends it
    // ramps out to the left over TAIL. Words being sung stay in a
    // consistent reading zone regardless of line length or viewport.
    var anchorFrac = LYRIC_ANCHOR_FRAC;
    for (var i = lyricState.sprites.length - 1; i >= 0; i--) {
      var s = lyricState.sprites[i];
      if (audioTime > s.endT + 0.3) {
        lyricState.sprites.splice(i, 1);
        continue;
      }
      var anchorX = w * anchorFrac;
      var sungX;   // local x within the sprite that should sit at anchorX
      if (audioTime <= s.t) {
        // Pre-sing: the first letter is the target. Ramp from off-right.
        sungX = 0;
        var leadU = Math.max(0, Math.min(1, (audioTime - s.startT) / LYRIC_LEAD));
        // At leadU=0: sprite off-screen right (x = w). At leadU=1: first
        // letter at anchorX.
        s.x = w * (1 - leadU) + (anchorX - sungX) * leadU;
      } else if (audioTime >= s.tEnd) {
        // Post-sing: the last letter is the anchor. Ramp it off to left.
        sungX = s.totalW;
        var tailU = Math.max(0, Math.min(1, (audioTime - s.tEnd) / LYRIC_TAIL));
        var posAtEnd = anchorX - sungX;
        // At tailU=1: sprite fully past left (x = -totalW).
        s.x = posAtEnd * (1 - tailU) + (-s.totalW) * tailU;
      } else {
        // In sung window: find the letter being sung right now and pin
        // it at anchorX.
        var target = s.letters[0];
        for (var li = 0; li < s.letters.length; li++) {
          if (s.letters[li].sungAt >= audioTime) { target = s.letters[li]; break; }
          target = s.letters[li];
        }
        sungX = target.x + target.w * 0.5;
        s.x = anchorX - sungX;
      }
      var cx = s.x + s.totalW * 0.5;
      s.y = sampleLyricWave(cx, w, h, s.stripIdx);
    }
  }

  // Slow-follower wave samplers. Two strips, each heavily-attenuated copy
  // of the amber wave anchored at a y center offset from middle. Reading
  // strips breathe like paper — tight amplitude + clamp so they don't surf.
  function updateLyricWaveBuf(w, h, dpr) {
    var samples = Math.max(8, Math.floor(w / lyricWaveBufStride));
    for (var strip = 0; strip < 2; strip++) {
      if (!lyricWaveBufs[strip] || lyricWaveBufs[strip].length !== samples) {
        lyricWaveBufs[strip] = new Float32Array(samples);
        var initY = h * (0.5 + (strip === 0 ? -LYRIC_STRIP_OFFSET : LYRIC_STRIP_OFFSET));
        lyricWaveBufs[strip].fill(initY);
      }
    }
    var ampCap = Math.min(h * 0.035, 30 * dpr);
    for (var strip = 0; strip < 2; strip++) {
      var buf = lyricWaveBufs[strip];
      var anchorY = h * (0.5 + (strip === 0 ? -LYRIC_STRIP_OFFSET : LYRIC_STRIP_OFFSET));
      var yMin = anchorY - ampCap * 1.6;
      var yMax = anchorY + ampCap * 1.6;
      // Strips phase-shift slightly: cyan reads a time-offset sample so
      // the two strips don't undulate identically (feels more alive).
      var phaseShift = strip === 1 ? 0.35 : 0;
      for (var i = 0; i < samples; i++) {
        var frac = i / (samples - 1);
        var shifted = Math.max(0, Math.min(1, frac + phaseShift * 0.08));
        var binIdx = Math.floor(shifted * (dataArray.length - 1));
        var sample = (dataArray[binIdx] - 128) / 128;
        var env = Math.sin(frac * Math.PI);
        var target = anchorY + sample * ampCap * env;
        buf[i] += (target - buf[i]) * 0.035;
        if (buf[i] < yMin) buf[i] = yMin;
        if (buf[i] > yMax) buf[i] = yMax;
      }
    }
  }

  function sampleLyricWave(px, w, h, stripIdx) {
    var buf = lyricWaveBufs[stripIdx || 0];
    if (!buf || !buf.length) {
      return h * (0.5 + ((stripIdx || 0) === 0 ? -LYRIC_STRIP_OFFSET : LYRIC_STRIP_OFFSET));
    }
    var frac = Math.max(0, Math.min(1, px / w));
    var idxF = frac * (buf.length - 1);
    var i0 = Math.floor(idxF);
    var i1 = Math.min(buf.length - 1, i0 + 1);
    var f = idxF - i0;
    return buf[i0] * (1 - f) + buf[i1] * f;
  }

  // ── RAIN CONDUCTOR — aim drops at singing words ──────
  //
  // Two layers:
  //   1. PRIMARY — each sprite has a hit schedule built at spawn time
  //      (one primary per letter, timed to land on the letter's slice of
  //      the word's sung duration). Guarantees ~100% letter coverage.
  //   2. EXTRAS — mid-band energy adds bonus drops aimed at random
  //      letters in active words, for density + audio-reactivity.
  //
  // Primary fire timing accounts for ~0.7s drop flight: we fire at
  // (sungAt - 0.7s) so the splash lands on the beat.
  //
  function fireAimedDrop(sprite, letterIdx, w, dpr, brightness) {
    var letter = sprite.letters[letterIdx];
    if (!letter) return;
    // By splash time (~0.7s from fire) the target letter will be pinned
    // at the reading anchor. Aim the drop there, not at the letter's
    // current x — drops fired earlier land exactly where the letter
    // will be, not where it was.
    var targetX = w * LYRIC_ANCHOR_FRAC;
    var targetY = sprite.y + letter.y;
    if (targetX < 20 || targetX > w - 20) return;

    var colW = w / PLINKO_COLS;
    var col = Math.max(0, Math.min(PLINKO_COLS - 1, Math.floor(targetX / colW)));
    var fallDist = Math.max(1, targetY);
    var fallTime = 0.68 + Math.random() * 0.08;
    var speed = fallDist / (fallTime * 60);
    var dLen = 5 + Math.floor(Math.random() * 6);
    var chars = [];
    for (var k = 0; k < dLen; k++) {
      chars.push(matrixChars[Math.floor(Math.random() * matrixChars.length)]);
    }
    plinkoDrops.push({
      col: col,
      x: targetX,
      y: 0,
      speed: speed,
      len: dLen,
      chars: chars,
      life: 1,
      brightness: brightness,
      aimedAt: sprite,
      aimedLetterIdx: letterIdx,
      targetY: targetY,
      splashed: false,
    });
  }

  // Pick a letter index whose sungAt is near audioTime (within ±0.5s if
  // possible, else the closest). Keeps extras riding the current word.
  function pickNearbyLetter(sprite, audioTime) {
    var best = 0, bestDist = Infinity;
    for (var i = 0; i < sprite.letters.length; i++) {
      var dist = Math.abs(sprite.letters[i].sungAt - audioTime);
      if (dist < bestDist) { bestDist = dist; best = i; }
      if (dist < 0.3) {
        // Good enough — pick among the close ones uniformly.
        var near = [];
        for (var j = i; j < sprite.letters.length; j++) {
          if (Math.abs(sprite.letters[j].sungAt - audioTime) < 0.5) near.push(j);
          else if (sprite.letters[j].sungAt > audioTime + 0.5) break;
        }
        if (near.length) return near[Math.floor(Math.random() * near.length)];
      }
    }
    return best;
  }

  function conductRain(audioTime, w, h, dpr, midEnergy, now) {
    if (!lyricState.sprites.length) return;

    for (var i = 0; i < lyricState.sprites.length; i++) {
      var s = lyricState.sprites[i];

      // ── PRIMARY: fire any hits whose time has arrived ──
      if (s.hits && s.hits.length) {
        for (var hi = 0; hi < s.hits.length; hi++) {
          var h0 = s.hits[hi];
          if (h0.fired) continue;
          if (audioTime >= h0.fireAt) {
            h0.fired = true;
            // Only fire if the sprite is actually on-screen.
            var letter = s.letters[h0.letterIdx];
            if (!letter) continue;
            var tx = s.x + letter.x + letter.w * 0.5;
            if (tx > 0 && tx < w) {
              fireAimedDrop(s, h0.letterIdx, w, dpr, 0.9);
            }
          }
        }
      }

      // ── EXTRAS: mid-driven bonus drops on active sprites ──
      // While the LINE is being sung, decorate whichever letter(s) belong
      // to the currently-singing word(s). Primaries still guarantee one
      // strike per letter; extras pile on when mids pump.
      if (audioTime >= s.t - 0.05 && audioTime <= s.tEnd + 0.1) {
        var extraPerSec = midEnergy * 14;
        s.extrasAccum += extraPerSec / 60;
        while (s.extrasAccum >= 1) {
          s.extrasAccum -= 1;
          if (!s.letters.length) continue;
          // Prefer letters whose sungAt is near audioTime — keeps extras
          // "on the word being sung" rather than spraying the whole line.
          var li = pickNearbyLetter(s, audioTime);
          fireAimedDrop(s, li, w, dpr, 0.7 + Math.random() * 0.2);
        }
      }
    }
  }

  // ── SPLASH DETECTION ─────────────────────────────────
  // Called once per frame from the render loop. For any drop marked as
  // lyric-conducted that has crossed its targetY, splash its aimed sprite.
  function processSplashes(c, w, h, dpr) {
    if (!plinkoDrops.length) return;
    for (var i = 0; i < plinkoDrops.length; i++) {
      var d = plinkoDrops[i];
      if (!d.aimedAt || d.splashed) continue;
      if (d.y < d.targetY) continue;
      d.splashed = true;
      var s = d.aimedAt;
      // Prefer the explicit letter index the drop was aimed at. Fall back
      // to spatial lookup only if the index is missing.
      var hitLetter = null;
      if (typeof d.aimedLetterIdx === 'number') {
        hitLetter = s.letters[d.aimedLetterIdx] || null;
      }
      if (!hitLetter) {
        var hitX = d.x - s.x;
        for (var li = 0; li < s.letters.length; li++) {
          var L = s.letters[li];
          if (hitX >= L.x - 2 && hitX <= L.x + L.w + 2) { hitLetter = L; break; }
        }
      }
      if (hitLetter) {
        // Saturate reveal faster — primaries should fully light the letter.
        hitLetter.revealed = Math.min(1, hitLetter.revealed + 0.75 + d.brightness * 0.25);
        s.splashEnergy = Math.min(1, s.splashEnergy + 0.15);
        spawnSplashParticles(d.x, d.targetY, d.brightness, dpr, w, h, s.stripIdx | 0);
      }
    }
  }

  // ── SPLASH PARTICLES + STAR PROMOTION ────────────────
  function spawnSplashParticles(cx, cy, energy, dpr, w, h, stripIdx) {
    var count = 10 + Math.floor(energy * 16);
    var isCyan = (stripIdx | 0) === 1;
    for (var i = 0; i < count; i++) {
      // Initial burst outward + slight upward bias (splash)
      var angle = -Math.PI + (Math.random() - 0.5) * Math.PI * 0.7;
      if (Math.random() < 0.35) angle = Math.random() * Math.PI * 2;
      var speed = (2 + Math.random() * 5) * dpr * (0.6 + energy);
      splashParticles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 0.15 * dpr,
        life: 1,
        decay: 0.01 + Math.random() * 0.015,
        r: (0.9 + Math.random() * 1.6) * dpr,
        isCyan: isCyan,          // inherit from sprite — amber or cyan splash
        promoted: false,
        promoteAt: 0.55 + Math.random() * 0.25,
        promoteChance: 0.35,
      });
    }
  }

  function drawAndPromoteSplashParticles(c, w, h, dpr) {
    if (!splashParticles.length) return;
    var mT = matrixT;
    for (var i = splashParticles.length - 1; i >= 0; i--) {
      var p = splashParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.97;
      p.life -= p.decay;

      if (p.life <= 0) { splashParticles.splice(i, 1); continue; }

      // Promotion to star: once per particle, some fraction get warped
      // into the starfield and zoom toward the camera. Strip color flows
      // through — amber splash → amber-ish (white) star, cyan splash →
      // cyan star. Makes the starfield "become" the lyric colors.
      if (!p.promoted && p.life < p.promoteAt) {
        p.promoted = true;
        if (Math.random() < p.promoteChance) {
          var focalLen = Math.min(w, h) * 0.35;
          var startZ = STAR_DEPTH * (0.45 + Math.random() * 0.25);
          var worldX = (p.x - w * 0.5) * startZ / focalLen;
          var worldY = (p.y - h * 0.5) * startZ / focalLen;
          stars.push({
            x: worldX,
            y: worldY,
            z: startZ,
            isCyan: p.isCyan,
            baseAlpha: 0.7 + Math.random() * 0.3,
          });
          splashParticles.splice(i, 1);
          continue;
        }
      }

      c.beginPath();
      c.arc(p.x, p.y, p.r * Math.max(0.3, p.life), 0, Math.PI * 2);
      if (mT > 0.5) {
        c.fillStyle = 'rgba(180,255,180,' + (p.life * 0.9) + ')';
      } else if (p.isCyan) {
        c.fillStyle = 'rgba(180,235,245,' + (p.life * 0.85) + ')';
      } else {
        c.fillStyle = 'rgba(255,232,180,' + (p.life * 0.85) + ')';
      }
      c.fill();
    }
  }

  // ── LYRIC RIBBON RENDER ──────────────────────────────
  function drawLyricRibbon(c, w, h, dpr, expand) {
    if (!lyricState.sprites.length) return;
    var prevFont = c.font;
    var prevAlign = c.textAlign;
    var prevBaseline = c.textBaseline;
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    var mT = matrixT;

    for (var i = 0; i < lyricState.sprites.length; i++) {
      var s = lyricState.sprites[i];
      if (s.x + s.totalW < -20 || s.x > w + 20) continue;
      c.font = '500 ' + s.fontPx + 'px ' + LYRIC_FONT;

      // Per-strip colors (matrix mode folds both to green).
      // Strip 0 = amber (synth); strip 1 = cyan (machine).
      var glowRGB, fillRGB;
      if (mT > 0.5) {
        glowRGB = '120,255,140';
        fillRGB = '180,255,180';
      } else if (s.stripIdx === 1) {
        glowRGB = '78,201,212';
        fillRGB = '188,238,245';
      } else {
        glowRGB = '232,184,88';
        fillRGB = '255,232,188';
      }

      for (var li = 0; li < s.letters.length; li++) {
        var L = s.letters[li];
        var rev = L.revealed;
        if (rev <= 0.01) continue;
        var lx = s.x + L.x;
        var ly = s.y + L.y;

        // Fade reveal slowly over time — splashed words eventually return
        // to ink, screen stays readable.
        L.revealed = Math.max(0, L.revealed - 0.0025);

        var amberA = Math.min(1, rev * 1.1) * expand;
        var glowR = 18 * dpr * rev;

        c.shadowColor = 'rgba(' + glowRGB + ',' + (amberA * 0.85) + ')';
        c.shadowBlur = glowR;
        c.fillStyle = 'rgba(' + fillRGB + ',' + (amberA * 0.95) + ')';
        c.fillText(L.ch, lx, ly);
        c.shadowBlur = 0;
      }
    }
    c.font = prevFont;
    c.textAlign = prevAlign;
    c.textBaseline = prevBaseline;
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

    // Don't render canvas when fully collapsed — but spectrum propagation
    // (CSS vars + iframe broadcast) must still run, otherwise paper pages
    // and the shell chrome (pills) go lifeless.
    if (expand < 0.005) {
      updateSingularity();
      updateTintLerp();
      broadcastBeat();
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

    // ── Lyric ribbon prep + rain conductor ──
    // Slow-follow wave buffer → sprite layout → aim drops at sung words.
    // Must run BEFORE updatePlinko so splash detection has current drop
    // positions AFTER plinko integrates.
    if (playing && expand > 0.05 && lyricState.lines) {
      var audioTime = audio.currentTime || 0;
      updateLyricWaveBuf(w, h, dpr);
      updateLyricSprites(audioTime, c, w, h, dpr);
      conductRain(audioTime, w, h, dpr, mid, performance.now());
    }

    // ── Spectrum Plinko ──
    // drawPlinko integrates d.y += d.speed each frame; splash detection
    // must run AFTER integration (so aimed drops are caught the frame
    // they cross targetY) but BEFORE the next frame's integration, so we
    // call it right after drawPlinko.
    if (playing && expand > 0.05) {
      updatePlinko(freqArray, w, h, dpr);
      drawPlinko(c, w, h);
      processSplashes(c, w, h, dpr);
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

    // Outer halo — ripples outward on each bar downbeat so it breathes
    // instead of hanging as a static gamma. On bar start: small + bright.
    // Over the bar: expands outward and fades. Idle (not playing): static.
    var haloBreathe = playing ? (1 + 1.2 * (1 - beat.barPulse)) : 1;
    var haloAlphaMul = playing ? (0.25 + 0.75 * beat.barPulse) : 1;
    var haloR = eventR * (1 + expand * 2) * haloBreathe;
    var halo = c.createRadialGradient(ex, ey, 0, ex, ey, haloR);
    halo.addColorStop(0, 'rgba(' + haloInner + ',' + ((0.04 + bass * 0.06) * glowDim * haloAlphaMul) + ')');
    halo.addColorStop(0.3, 'rgba(' + haloMid + ',' + ((0.015 + bass * 0.02) * glowDim * haloAlphaMul) + ')');
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

    // ── Lyric ribbon (revealed glyphs) + splash particles ──
    // Drawn under the signal waveforms so the amber wave kisses the
    // ribbon visually. Only visible when playing + lyrics loaded.
    if (expand > 0.05 && lyricState.sprites.length) {
      drawLyricRibbon(c, w, h, dpr, expand);
    }
    drawAndPromoteSplashParticles(c, w, h, dpr);

    // ── Signal waveforms ──
    // These are *signal* — they visualize playing audio. When nothing is
    // playing they collapse to flat horizontals haunting the middle of the
    // viewport. Smooth-fade their visibility on the playing signal so they
    // exist iff there is audio to show.
    waveVis += ((playing && total > 0.02 ? 1 : 0) - waveVis) * 0.06;
    if (expand > 0.05 && waveVis > 0.01) {
      var waveY = h * 0.5;
      var wsx = 0, wex2 = w;
      var ww = wex2 - wsx;
      var pts = 300;
      var step = Math.floor(dataArray.length / pts);
      var waveAlpha = expand * waveVis;

      function drawWave(color, glowColor, alpha, amplitude, freqMul, phaseMul, phaseOff, yOff, lineW, glowR, dataOff) {
        c.beginPath();
        c.lineWidth = lineW * dpr * expand;
        c.strokeStyle = 'rgba(' + color + ',' + (alpha * waveAlpha) + ')';
        c.shadowColor = 'rgba(' + glowColor + ')';
        c.shadowBlur = glowR * dpr * expand;
        var xPts = [], yPts = [];
        for (var i = 0; i < pts; i++) {
          var x = wsx + (i / pts) * ww;
          var idx = Math.min(i * step + dataOff, dataArray.length - 1);
          var sample = (dataArray[idx] - 128) / 128;
          var env = Math.sin((i / pts) * Math.PI);
          var envEdge = Math.pow(env, 0.8);
          var drift = Math.sin(phase * phaseMul + i * freqMul + phaseOff) * 14 * dpr * bloomScale * expand;
          var y = waveY + yOff * dpr + sample * amplitude * dpr * bloomScale * envEdge * expand + drift;
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

    // Lerp section tints + broadcast beat to subscribed iframe
    updateTintLerp();
    broadcastBeat();
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

  // ── BEAT + TINT PIPE ────────────────────────────────
  //
  // Pages can opt into two live feeds from the shell:
  //
  //   mythos:beat — per-frame beat clock (phase, bar, pulse, barPulse,
  //     bpm, raw), current Radiant-Seal M index + color, matrix mode.
  //     Subscribe with { type: 'mythos:beat:subscribe' }. Broadcasts
  //     only while something is subscribed to save cycles.
  //
  //   mythos:tint — pages can tint the shell's --signal-synth /
  //     --signal-machine CSS vars as the reader scrolls through
  //     sections. Post { type: 'mythos:tint', synth: '#hex',
  //     machine: '#hex' } or pass nulls to release. Shell lerps
  //     toward target over ~0.8s so transitions breathe.
  //
  // Subscriber state resets on nav() so a new page starts clean.
  var beatSubscribed = false;

  function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return null;
    var m = hex.match(/^#([0-9a-f]{6})$/i);
    if (!m) return null;
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // Base synth/machine colors per mode (targets when no tint is active)
  function baseSynthRGB() { return matrixMode ? [0,255,65] : [232,184,88]; }
  function baseMachineRGB() { return matrixMode ? [0,255,65] : [78,201,212]; }

  var tintTargetSynth = null;    // [r,g,b] or null = use base
  var tintTargetMachine = null;
  var tintActualSynth = baseSynthRGB();
  var tintActualMachine = baseMachineRGB();

  function updateTintLerp() {
    var rootSynth = tintTargetSynth || baseSynthRGB();
    var rootMachine = tintTargetMachine || baseMachineRGB();
    var k = 0.05; // ~0.8s to settle at 60fps
    var changed = false;
    for (var i = 0; i < 3; i++) {
      var ds = rootSynth[i] - tintActualSynth[i];
      if (Math.abs(ds) > 0.5) { tintActualSynth[i] += ds * k; changed = true; }
      else tintActualSynth[i] = rootSynth[i];
      var dm = rootMachine[i] - tintActualMachine[i];
      if (Math.abs(dm) > 0.5) { tintActualMachine[i] += dm * k; changed = true; }
      else tintActualMachine[i] = rootMachine[i];
    }
    if (changed) {
      var synthStr = 'rgb(' + Math.round(tintActualSynth[0]) + ',' + Math.round(tintActualSynth[1]) + ',' + Math.round(tintActualSynth[2]) + ')';
      var machineStr = 'rgb(' + Math.round(tintActualMachine[0]) + ',' + Math.round(tintActualMachine[1]) + ',' + Math.round(tintActualMachine[2]) + ')';
      document.documentElement.style.setProperty('--signal-synth', synthStr);
      document.documentElement.style.setProperty('--signal-machine', machineStr);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // ── SPECTRUM BROADCAST ─ FFT-as-design-system ─────────────────────
  // ═══════════════════════════════════════════════════════════════════
  //
  // Per-frame FFT state gets flattened into primitives that CSS can
  // consume as custom properties. This is the backbone of the site's
  // audio-reactive design system. The contract is documented in
  // docs/SPECTRUM.md; summary:
  //
  //   bands[10]       — log-spaced energy 0..1 per band with analog-VU
  //                     ballistics (fast attack, slow release)
  //   onsets[10]      — transient pulse 0..1 per band (exp decay after
  //                     each rising-edge detection). Fires on attacks.
  //   envelope        — overall loudness 0..1, slowly averaged
  //   beat, sealColor — already in message
  //
  // Band index → rough frequency (fftSize 4096, 48kHz):
  //   0: ~23-46 Hz      (sub-bass)
  //   1: ~46-93 Hz      (bass)
  //   2: ~93-186 Hz     (low-mid)
  //   3: ~186-373 Hz    (mid)
  //   4: ~373-746 Hz    (mid)
  //   5: ~746-1492 Hz   (high-mid)
  //   6: ~1492-2985 Hz  (presence)
  //   7: ~2985-5970 Hz  (treble)
  //   8: ~5970-11940 Hz (brilliance)
  //   9: ~11940-23880Hz (air)
  var NUM_BANDS = 10;
  var bandSmoothed = new Array(NUM_BANDS);
  var bandSmoothedL = new Array(NUM_BANDS); // stereo side-chain (left)
  var bandSmoothedR = new Array(NUM_BANDS); // stereo side-chain (right)
  var bandSlow = new Array(NUM_BANDS);     // baseline for onset detection
  var bandOnset = new Array(NUM_BANDS);    // current onset decay value
  for (var _i = 0; _i < NUM_BANDS; _i++) {
    bandSmoothed[_i] = 0; bandSmoothedL[_i] = 0; bandSmoothedR[_i] = 0;
    bandSlow[_i] = 0; bandOnset[_i] = 0;
  }
  var envelopeSmoothed = 0;
  var panBalanceSmoothed = 0; // -1 (hard L) .. +1 (hard R); 0 = centered or mono
  var monoFrames = 0;         // consecutive frames with silent R → treat as mono
  var ONSET_THRESHOLD = [0.10, 0.09, 0.07, 0.06, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05]; // per-band delta gate

  function updateBands() {
    if (!freqArray || !freqArray.length) return;
    // Pull stereo side-chain when available.
    var haveStereo = !!(analyserL && analyserR && freqArrayL.length && freqArrayR.length);
    if (haveStereo) {
      analyserL.getByteFrequencyData(freqArrayL);
      analyserR.getByteFrequencyData(freqArrayR);
    }
    var minBin = 2;
    var maxBin = freqArray.length;
    var logMin = Math.log(minBin);
    var logSpan = Math.log(maxBin) - logMin;
    var envSum = 0, envCount = 0;
    var sumL = 0, sumR = 0;
    for (var i = 0; i < NUM_BANDS; i++) {
      var s = Math.floor(Math.exp(logMin + logSpan * (i / NUM_BANDS)));
      var e = Math.max(s + 1, Math.floor(Math.exp(logMin + logSpan * ((i + 1) / NUM_BANDS))));
      if (e > freqArray.length) e = freqArray.length;
      var sum = 0, count = e - s;
      for (var b = s; b < e; b++) sum += freqArray[b] || 0;
      var raw = count > 0 ? (sum / count) / 255 : 0;
      envSum += raw; envCount++;
      // VU ballistics (mono mixdown)
      if (raw > bandSmoothed[i]) bandSmoothed[i] = bandSmoothed[i] * 0.25 + raw * 0.75;
      else bandSmoothed[i] = bandSmoothed[i] * 0.88 + raw * 0.12;
      // Slow baseline for onset detection
      bandSlow[i] = bandSlow[i] * 0.96 + raw * 0.04;
      // Onset fires on delta; then exp-decays each frame
      var delta = bandSmoothed[i] - bandSlow[i];
      if (delta > ONSET_THRESHOLD[i] && bandSmoothed[i] > 0.08) {
        bandOnset[i] = Math.max(bandOnset[i], Math.min(1, delta / ONSET_THRESHOLD[i] * 0.7));
      }
      bandOnset[i] *= 0.88; // decay ~200ms

      // Stereo per-band VU — same ballistics, separate channels.
      if (haveStereo) {
        var sumLb = 0, sumRb = 0;
        for (var bb = s; bb < e; bb++) {
          sumLb += freqArrayL[bb] || 0;
          sumRb += freqArrayR[bb] || 0;
        }
        var rawL = count > 0 ? (sumLb / count) / 255 : 0;
        var rawR = count > 0 ? (sumRb / count) / 255 : 0;
        if (rawL > bandSmoothedL[i]) bandSmoothedL[i] = bandSmoothedL[i] * 0.25 + rawL * 0.75;
        else bandSmoothedL[i] = bandSmoothedL[i] * 0.88 + rawL * 0.12;
        if (rawR > bandSmoothedR[i]) bandSmoothedR[i] = bandSmoothedR[i] * 0.25 + rawR * 0.75;
        else bandSmoothedR[i] = bandSmoothedR[i] * 0.88 + rawR * 0.12;
        sumL += rawL; sumR += rawR;
      }
    }
    var envRaw = envCount > 0 ? envSum / envCount : 0;
    envelopeSmoothed = envelopeSmoothed * 0.92 + envRaw * 0.08;

    // Mono-fallback: if R is silent while L is not, fold L into R so
    // designs using --band-N-r stay alive on mono sources.
    if (haveStereo) {
      if (sumR < 0.005 && sumL > 0.02) monoFrames++;
      else if (sumR > 0.01) monoFrames = 0;
      if (monoFrames > 60) { // ~1s of silent R
        for (var k = 0; k < NUM_BANDS; k++) bandSmoothedR[k] = bandSmoothedL[k];
        sumR = sumL;
      }
      // Pan balance: -1 (hard L) .. +1 (hard R). Smooth over ~150 ms.
      var denom = sumL + sumR;
      var rawPan = denom > 0.01 ? (sumR - sumL) / denom : 0;
      panBalanceSmoothed = panBalanceSmoothed * 0.88 + rawPan * 0.12;
    }
  }

  // Shell-local CSS var writer — lets elements INSIDE the shell chrome
  // (pills, brand mark, player) consume the same audio-reactive props as
  // iframe pages. Called every frame regardless of iframe subscription.
  var shellRoot = document.documentElement.style;
  function applyShellSpectrum(beat, bandsRounded, onsetsRounded, envRounded, playing) {
    shellRoot.setProperty('--beat-pulse',     playing ? beat.pulse.toFixed(3) : '0');
    shellRoot.setProperty('--beat-phase',     playing ? beat.phase.toFixed(3) : '0');
    shellRoot.setProperty('--beat-bar-pulse', playing ? beat.barPulse.toFixed(3) : '0');
    shellRoot.setProperty('--beat-bar-phase', playing ? beat.bar.toFixed(3) : '0');
    shellRoot.setProperty('--envelope',       playing ? envRounded.toFixed(3) : '0');
    for (var i = 0; i < NUM_BANDS; i++) {
      shellRoot.setProperty('--band-' + i,  playing ? bandsRounded[i].toFixed(3) : '0');
      shellRoot.setProperty('--onset-' + i, playing ? onsetsRounded[i].toFixed(3) : '0');
    }
    var lo = 0, mid = 0, hi = 0;
    for (var a = 0; a <= 2; a++) if (onsetsRounded[a] > lo) lo = onsetsRounded[a];
    for (var b = 3; b <= 6; b++) if (onsetsRounded[b] > mid) mid = onsetsRounded[b];
    for (var c = 7; c <= 9; c++) if (onsetsRounded[c] > hi) hi = onsetsRounded[c];
    shellRoot.setProperty('--onset-bass', playing ? lo.toFixed(3) : '0');
    shellRoot.setProperty('--onset-mid',  playing ? mid.toFixed(3) : '0');
    shellRoot.setProperty('--onset-high', playing ? hi.toFixed(3) : '0');
    shellRoot.setProperty('--kick',  playing ? onsetsRounded[0].toFixed(3) : '0');
    shellRoot.setProperty('--snare', playing ? onsetsRounded[4].toFixed(3) : '0');
    shellRoot.setProperty('--hat',   playing ? onsetsRounded[8].toFixed(3) : '0');
  }

  function broadcastBeat() {
    try {
      updateBands();
      var beat = playing ? getBeat() : { phase:0, half:0, quarter:0, bar:0, pulse:0, barPulse:0, bpm: TRACKS[current] ? (TRACKS[current].bpm||120) : 120, raw:0 };
      var mColor = SEAL_MS[sealCurrentM].color;
      var bandsRounded = new Array(NUM_BANDS);
      var bandsLRounded = new Array(NUM_BANDS);
      var bandsRRounded = new Array(NUM_BANDS);
      var onsetsRounded = new Array(NUM_BANDS);
      for (var i = 0; i < NUM_BANDS; i++) {
        bandsRounded[i] = Math.round(bandSmoothed[i] * 1000) / 1000;
        bandsLRounded[i] = Math.round(bandSmoothedL[i] * 1000) / 1000;
        bandsRRounded[i] = Math.round(bandSmoothedR[i] * 1000) / 1000;
        onsetsRounded[i] = Math.round(bandOnset[i] * 1000) / 1000;
      }
      var envRounded = Math.round(envelopeSmoothed * 1000) / 1000;
      applyShellSpectrum(beat, bandsRounded, onsetsRounded, envRounded, playing);
      if (beatSubscribed && frame.contentWindow) {
        frame.contentWindow.postMessage({
          type: 'mythos:beat',
          beat: beat,
          bands: bandsRounded,
          bandsL: bandsLRounded,
          bandsR: bandsRRounded,
          panBalance: Math.round(panBalanceSmoothed * 1000) / 1000,
          onsets: onsetsRounded,
          envelope: envRounded,
          playing: playing,
          sealM: sealCurrentM,
          sealColor: mColor,
          matrixMode: matrixMode,
          currentTime: audio.currentTime || 0, // needed for per-word lyric karaoke
        }, '*');
      }
    } catch(e){}
  }


  // ── NAVIGATION ───────────────────────────────────────
  function nav(page, opts) {
    opts = opts || {};
    if (!PAGE_META[page]) { console.warn('unknown page', page); return; }
    if (page === currentPage && !opts.force) return;
    currentPage = page;
    loader.classList.add('on');

    // Reset cross-frame subscriptions + tint state for the incoming page
    beatSubscribed = false;
    tintTargetSynth = null;
    tintTargetMachine = null;

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
      track: { title: t.title, album: t.album, cover: t.cover, index: current, file: t.file, bpm: t.bpm },
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
    else if (d.type === 'mythos:beat:subscribe') {
      beatSubscribed = true;
    }
    else if (d.type === 'mythos:beat:unsubscribe') {
      beatSubscribed = false;
    }
    else if (d.type === 'mythos:tint') {
      tintTargetSynth = hexToRgb(d.synth);
      tintTargetMachine = hexToRgb(d.machine);
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
