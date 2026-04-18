// MythOS app shell — persistent audio, visualizer, navigation, state
(function(){
  'use strict';

  // ── TRACKS ──────────────────────────────────────────
  const TRACKS = [
    { file: 'music/rr-4 - Fender Bender.mp3',                              title: 'Fender Bender',                         album: 'Robots & Remixes',  cover:'rr' },
    { file: 'music/rr-1 - Clockwork Infinity.mp3',                         title: 'Clockwork Infinity',                    album: 'Robots & Remixes',  cover:'rr' },
    { file: 'music/rr-2 - Waiting for the Waymo.mp3',                      title: 'Waiting for the Waymo',                 album: 'Robots & Remixes',  cover:'rr' },
    { file: "music/rr-2 - Today is Yesterday x Make 'em say Errr.mp3",     title: "Today is Yesterday x Make 'em say Errr", album: 'Robots & Remixes',  cover:'rr' },
    { file: 'music/rr-3 - I Got Hosts.mp3',                                title: 'I Got Hosts',                           album: 'Robots & Remixes',  cover:'rr' },
    { file: 'music/rr-5 - Goodtime.mp3',                                   title: 'Goodtime',                              album: 'Robots & Remixes',  cover:'rr' },
    { file: 'music/rr-6 - Treading Water.mp3',                             title: 'Treading Water',                        album: 'Robots & Remixes',  cover:'rr' },
    { file: 'music/rr-8 - Rogue Machine x Goodtime.mp3',                   title: 'Rogue Machine x Goodtime',              album: 'Robots & Remixes',  cover:'rr' },
    { file: 'music/rr-9 - Barbra Streisand x Eduardo Saverin.mp3',         title: 'Barbra Streisand x Eduardo Saverin',    album: 'Robots & Remixes',  cover:'rr' },
    { file: 'music/rr-10 - Rock Lobster.mp3',                              title: 'Rock Lobster',                          album: 'Robots & Remixes',  cover:'rr' },
    { file: 'music/rr-11 - Orange Chicken.mp3',                            title: 'Orange Chicken',                        album: 'Robots & Remixes',  cover:'rr' },
    { file: 'music/sh-1 - askJarvis.mp3',                                  title: 'askJarvis',                             album: 'stillHORIZ3N',      cover:'sh' },
    { file: 'music/sh-2 - Find Myself.mp3',                                title: 'Find Myself',                           album: 'stillHORIZ3N',      cover:'sh' },
    { file: 'music/sh-3 - Whispers of Infinity.mp3',                       title: 'Whispers of Infinity',                  album: 'stillHORIZ3N',      cover:'sh' },
    { file: 'music/sh-4 - Very Well.mp3',                                  title: 'Very Well',                             album: 'stillHORIZ3N',      cover:'sh' },
    { file: 'music/sh-5 - Substrate.mp3',                                  title: 'Substrate',                             album: 'stillHORIZ3N',      cover:'sh' },
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
    document.getElementById('art').src = t.cover === 'sh' ? 'music/cover-sh.jpg' : 'music/cover-rr.png';
    renderQueue();
    saveState();
    broadcastTrack();
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
    else nextTrack();
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

  // ── QUEUE ────────────────────────────────────────────
  var queueOpen = false;
  function toggleQueue() {
    queueOpen = !queueOpen;
    document.getElementById('queue-panel').classList.toggle('on', queueOpen);
    document.getElementById('btn-queue').classList.toggle('on', queueOpen);
  }

  function renderQueue() {
    var list = document.getElementById('queue-list');
    var count = document.getElementById('queue-count');
    count.textContent = TRACKS.length;
    if (list.children.length === TRACKS.length) {
      [].slice.call(list.children).forEach(function(el, i) { el.classList.toggle('active', i === current); });
      return;
    }
    list.innerHTML = '';
    TRACKS.forEach(function(t, i) {
      var el = document.createElement('div');
      el.className = 'queue-item' + (i === current ? ' active' : '');
      el.innerHTML = '<div class="n">' + String(i + 1).padStart(2, '0') + '</div>' +
        '<div class="titlebox"><div class="t">' + escapeHtml(t.title) + '</div><div class="a">' + escapeHtml(t.album) + '</div></div>' +
        '<div class="dur"></div>';
      el.addEventListener('click', function() { loadTrack(i); audio.play().catch(function(){}); });
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
    if (!panel.contains(e.target) && !btn.contains(e.target)) toggleQueue();
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

  function initStars() {
    stars = [];
    if (!vizCanvas) return;
    var count = 90;
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * vizCanvas.width,
        y: Math.random() * vizCanvas.height,
        r: 0.3 + Math.random() * 1.5,
        baseAlpha: 0.15 + Math.random() * 0.6,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinkleOffset: Math.random() * Math.PI * 2,
        isCyan: Math.random() < 0.15,
      });
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

    // Don't render canvas when fully collapsed
    if (expand < 0.005) {
      // Still update singularity beat
      updateSingularity();
      return;
    }

    // ── Read audio data ──
    var bass = 0, subBass = 0, mid = 0, high = 0, presence = 0, total = 0;
    if (analyser && audioContextReady) {
      analyser.getByteTimeDomainData(dataArray);
      analyser.getByteFrequencyData(freqArray);
    }
    bass = avg(freqArray, 0, 10) / 255;
    subBass = avg(freqArray, 0, 4) / 255;
    mid = avg(freqArray, 10, 80) / 255;
    high = avg(freqArray, 80, 300) / 255;
    presence = avg(freqArray, 300, 600) / 255;
    total = avg(freqArray, 0, 400) / 255;

    phase += 0.006 + total * 0.025;

    var w = vizCanvas.width, h = vizCanvas.height, dpr = devicePixelRatio;
    var c = vizCtx;

    // ── Beat detection ──
    var bassJump = bass - prevBass;
    if (bassJump > 0.15 && expand > 0.3) {
      spawnParticles(w * 0.52, h * 0.48, bassJump * 3 * expand, Math.floor((8 + bassJump * 40) * expand));
    }
    prevBass = bass * 0.7 + prevBass * 0.3;

    // ── Trail persistence ──
    trailCtx.drawImage(vizCanvas, 0, 0);
    c.clearRect(0, 0, w, h);

    // ── Cosmic ground gradient ──
    var grad = c.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.45, Math.max(w, h) * 0.7);
    grad.addColorStop(0, '#1f1a2a');
    grad.addColorStop(0.22, '#14121c');
    grad.addColorStop(0.52, '#08070d');
    grad.addColorStop(1, '#020204');
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);

    // ── Trails ──
    var minDim = Math.min(w, h);
    var bloomScale = Math.min(1, minDim / (1200 * dpr));
    var glowDim = bloomScale * 0.7 + 0.3;
    c.globalAlpha = (0.78 + total * 0.1) * glowDim;
    c.drawImage(trailCanvas, 0, 0);
    c.globalAlpha = 1;
    trailCtx.fillStyle = 'rgba(2,2,4,0.12)';
    trailCtx.fillRect(0, 0, w, h);

    // ── Stars (fade with viewT) ──
    var starAlphaScale = expand;
    if (starAlphaScale > 0.01) {
      var time = performance.now() / 1000;
      for (var si = 0; si < stars.length; si++) {
        var s = stars[si];
        var twinkle = Math.sin(time * s.twinkleSpeed + s.twinkleOffset);
        var energyBoost = s.isCyan ? high * 0.4 : mid * 0.3;
        var alpha = Math.max(0, s.baseAlpha * (0.5 + twinkle * 0.5) + energyBoost) * starAlphaScale;
        var sr = s.r + (s.isCyan ? high : bass) * 1.5 * dpr;
        c.beginPath();
        c.arc(s.x, s.y, sr, 0, Math.PI * 2);
        c.fillStyle = s.isCyan
          ? 'rgba(78,201,212,' + alpha + ')'
          : 'rgba(245,238,221,' + alpha + ')';
        c.fill();
        if (s.r > 1 && alpha > 0.4) {
          c.beginPath();
          c.arc(s.x, s.y, sr * 3, 0, Math.PI * 2);
          c.fillStyle = s.isCyan
            ? 'rgba(78,201,212,' + (alpha * 0.12) + ')'
            : 'rgba(245,238,221,' + (alpha * 0.1) + ')';
          c.fill();
        }
      }
    }

    // ── Dark-matter filaments (static, fade with expand) ──
    if (expand > 0.1) {
      c.globalAlpha = 0.25 * expand;
      c.strokeStyle = '#6a5a7a'; c.lineWidth = 0.6 * dpr; c.lineCap = 'round';
      c.beginPath();
      c.moveTo(w*0.05, h*0.15);
      c.bezierCurveTo(w*0.12,h*0.17, w*0.24,h*0.19, w*0.33,h*0.18);
      c.bezierCurveTo(w*0.38,h*0.17, w*0.43,h*0.19, w*0.48,h*0.22);
      c.stroke();

      c.globalAlpha = 0.2 * expand;
      c.strokeStyle = '#5c5068'; c.lineWidth = 0.5 * dpr;
      c.beginPath();
      c.moveTo(w*0.08, h*0.68);
      c.bezierCurveTo(w*0.18,h*0.67, w*0.26,h*0.66, w*0.35,h*0.64);
      c.lineTo(w*0.37, h*0.63);
      c.bezierCurveTo(w*0.41,h*0.62, w*0.45,h*0.61, w*0.50,h*0.61);
      c.stroke();

      c.globalAlpha = 0.18 * expand;
      c.strokeStyle = '#8b6a3a'; c.lineWidth = 0.5 * dpr;
      c.beginPath();
      c.moveTo(w*0.56, h*0.08);
      c.bezierCurveTo(w*0.60,h*0.11, w*0.64,h*0.15, w*0.66,h*0.21);
      c.stroke();

      c.globalAlpha = 1;
    }

    // ── Hot event ──
    var ex = w * 0.52, ey = h * 0.48;
    // Scale the event by expand — contracts toward a point as viewT → 1
    var eventR = (40 + bass * 100 + subBass * 35) * dpr * bloomScale * (0.15 + expand * 0.85);

    // Outer halo
    var haloR = eventR * (1 + expand * 2);
    var halo = c.createRadialGradient(ex, ey, 0, ex, ey, haloR);
    halo.addColorStop(0, 'rgba(232,184,88,' + ((0.04 + bass * 0.06) * glowDim) + ')');
    halo.addColorStop(0.3, 'rgba(217,164,65,' + ((0.015 + bass * 0.02) * glowDim) + ')');
    halo.addColorStop(1, 'rgba(139,90,30,0)');
    c.fillStyle = halo;
    c.fillRect(0, 0, w, h);

    // Core
    var core = c.createRadialGradient(ex, ey, 0, ex, ey, eventR);
    core.addColorStop(0, 'rgba(255,242,200,' + ((0.5 + bass * 0.3) * glowDim) + ')');
    core.addColorStop(0.06, 'rgba(255,223,138,' + ((0.3 + bass * 0.2) * glowDim) + ')');
    core.addColorStop(0.2, 'rgba(232,184,88,' + ((0.12 + bass * 0.1) * glowDim) + ')');
    core.addColorStop(0.5, 'rgba(217,164,65,' + ((0.03 + bass * 0.04) * glowDim) + ')');
    core.addColorStop(1, 'rgba(139,90,30,0)');
    c.beginPath(); c.arc(ex, ey, eventR, 0, Math.PI * 2);
    c.fillStyle = core; c.fill();

    // Singularity point
    var singR = (2 + bass * 3 + subBass * 1.5) * dpr;
    c.beginPath(); c.arc(ex, ey, singR, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,255,255,' + (0.85 + bass * 0.15) + ')'; c.fill();
    c.beginPath(); c.arc(ex, ey, singR * 2, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,242,200,' + ((0.2 + bass * 0.15) * glowDim) + ')'; c.fill();

    // Diffraction spikes
    var spikeAlpha = expand;
    if (spikeAlpha > 0.05) {
      var spikeAngle = total * 0.3;
      var sLen = (20 + bass * 40 + subBass * 20) * dpr * expand;
      c.strokeStyle = 'rgba(255,230,176,' + ((0.25 + bass * 0.35) * spikeAlpha) + ')';
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
      c.fillStyle = p.cyan
        ? 'rgba(78,201,212,' + (p.life * 0.7) + ')'
        : 'rgba(232,184,88,' + (p.life * 0.8) + ')';
      c.fill();
    }

    // ── Signal waveforms (fade with expand) ──
    if (expand > 0.05) {
      var waveY = h * 0.48;
      var wsx = w * 0.08, wex2 = w * 0.92;
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

      var amberA = 0.55 + mid * 0.45;
      var amberW = 1.6 + mid * 2;
      drawWave('232,184,88', '232,184,88,0.45', amberA, 50 + mid * 30, 0.028, 1, 0, 0, amberW, 14, 0);

      var cyanA = 0.4 + high * 0.5;
      var cyanW = 1.1 + high * 1.8;
      drawWave('78,201,212', '78,201,212,0.4', cyanA, 38 + high * 25, 0.045, 1.4, 1.8, -10, cyanW, 12, Math.floor(step * 0.4));

      var boneA = 0.08 + total * 0.18;
      drawWave('240,235,219', '240,235,219,0.15', boneA, 22 + total * 15, 0.035, 0.7, 3.5, 8, 0.7, 0, Math.floor(step * 0.7));
    }

    // ── Presence shimmer ──
    if (presence > 0.1 && expand > 0.2) {
      c.globalAlpha = presence * 0.15 * expand;
      for (var i = 0; i < 40; i++) {
        var px = w * 0.08 + Math.random() * (w * 0.84);
        var spread = (20 + presence * 40) * dpr;
        var py = h * 0.48 + (Math.random() - 0.5) * spread;
        var pr = (0.3 + Math.random() * 0.8) * dpr;
        c.beginPath(); c.arc(px, py, pr, 0, Math.PI * 2);
        c.fillStyle = Math.random() < 0.5 ? 'rgba(78,201,212,0.6)' : 'rgba(232,184,88,0.5)';
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
        var t = i / specBands;
        c.strokeStyle = t < 0.5
          ? 'rgba(232,184,88,' + (0.5 + val * 0.5) + ')'
          : 'rgba(78,201,212,' + (0.4 + val * 0.5) + ')';
        c.lineWidth = (1 + val * 1.5) * dpr;
        c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      }
      c.globalAlpha = 1;
    }

    // Update singularity orb if partially visible
    updateSingularity();
  }

  // ── Singularity orb — beat-reactive CSS element ──
  function updateSingularity() {
    if (!singularityEl || viewT < 0.01) return;

    var bass = 0, total = 0;
    if (analyser && audioContextReady) {
      bass = avg(freqArray, 0, 10) / 255;
      total = avg(freqArray, 0, 400) / 255;
    }

    var size = 6 + bass * 14 + total * 4;
    var glow1 = 12 + bass * 35;
    var glow2 = glow1 * 2.5;
    var brightness = 0.35 + bass * 0.5;
    var brightness2 = 0.08 + bass * 0.15;

    singularityEl.style.width = size + 'px';
    singularityEl.style.height = size + 'px';
    singularityEl.style.boxShadow =
      '0 0 ' + glow1 + 'px rgba(232,184,88,' + brightness + '),' +
      '0 0 ' + glow2 + 'px rgba(232,184,88,' + brightness2 + ')';
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
    setTimeout(broadcastTrack, 50);
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
  });

  setInterval(function() { if (playing) broadcastTrack(); }, 1000);

  window.__mythos = {
    getAudio: function() { return audio; },
    tracks: TRACKS,
    getCurrent: function() { return current; },
    isPlaying: function() { return playing; },
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
