// MythOS Compositor Floor
// WASM-driven floating frame compositor with WebGL void and M radial launcher
(function () {
  'use strict';

  // ── STATE ──────────────────────────────────────
  var wasmReady = false;
  var lastTime = 0;
  var frameEls = {};
  var dragState = null;
  var canvas, gl;
  var stars = [];
  var gridPhase = 0;

  // ── WASM BOOTSTRAP ─────────────────────────────
  async function bootWASM() {
    var statusEl = document.getElementById('wasm-status');
    try {
      var go = new Go();
      var result = await WebAssembly.instantiateStreaming(
        fetch('floor.wasm'),
        go.importObject
      );
      go.run(result.instance);
      statusEl.textContent = 'wasm live';
      statusEl.style.color = '#e8b858';
    } catch (e) {
      console.warn('WASM load failed, using JS fallback:', e.message);
      statusEl.textContent = 'js fallback';
      statusEl.style.color = '#4ec9d4';
      initJSFallback();
    }
    wasmReady = true;
    compositor.setScreenSize(window.innerWidth, window.innerHeight);
    buildRadial();
    loop(performance.now());
  }

  // ── JS FALLBACK (if WASM not compiled yet) ─────
  function initJSFallback() {
    var frames = {};
    var order = [];
    var nextZ = 1;
    var radOpen = false;
    var tick = 0;
    var sw = window.innerWidth, sh = window.innerHeight;

    var panels = [
      { id: 'askjarvis', title: 'AskJarvis', icon: 'J', kind: 'voice' },
      { id: 'pipedream', title: 'Pipe Dream', icon: 'P', kind: 'engineering' },
      { id: 'schedule', title: 'Schedule', icon: 'S', kind: 'calendar' },
      { id: 'email', title: 'Email', icon: 'E', kind: 'comms' },
      { id: 'fleet', title: 'Fleet', icon: 'F', kind: 'ops' },
      { id: 'music', title: 'Music', icon: 'M', kind: 'media' },
      { id: 'substrate', title: 'Substrate', icon: 'B', kind: 'data' },
      { id: 'radiant', title: 'Prime Radiant', icon: 'R', kind: 'covenant' },
    ];

    window.compositor = {
      addFrame: function (id, title, plugin) {
        if (frames[id]) {
          frames[id].focused = true;
          frames[id].zOrder = nextZ++;
          return JSON.stringify(frames[id]);
        }
        var slot = order.length;
        var f = {
          id: id, title: title, plugin: plugin,
          x: sw * 0.25 + (slot % 3) * 80 + Math.random() * 40,
          y: sh * 0.15 + Math.floor(slot / 3) * 70 + Math.random() * 30,
          z: 0, w: 440, h: 360,
          rotX: (slot % 5 - 2) * 1.2,
          rotY: (slot % 3 - 1) * 1.8,
          rotZ: (slot % 7 - 3) * 0.25,
          scale: 1, opacity: 0, zOrder: nextZ++,
          focused: true, alive: true,
          driftT: slot * 1.7,
          driftAX: 0.3 + (slot % 3) * 0.15,
          driftAY: 0.5 + (slot % 4) * 0.2,
          driftAZ: 0.1 + (slot % 5) * 0.05,
        };
        Object.keys(frames).forEach(function (k) { frames[k].focused = false; });
        frames[id] = f;
        order.push(id);
        return JSON.stringify(f);
      },
      removeFrame: function (id) {
        if (frames[id]) { frames[id].alive = false; return true; }
        return false;
      },
      focusFrame: function (id) {
        Object.keys(frames).forEach(function (k) { frames[k].focused = (k === id); });
        if (frames[id]) frames[id].zOrder = nextZ++;
      },
      moveFrame: function (id, x, y) {
        if (frames[id]) { frames[id].x = x; frames[id].y = y; }
      },
      getFrames: function () {
        return JSON.stringify(order.map(function (k) { return frames[k]; }).filter(Boolean));
      },
      getPanels: function () { return JSON.stringify(panels); },
      toggleRadial: function () { radOpen = !radOpen; return radOpen; },
      isRadialOpen: function () { return radOpen; },
      closeRadial: function () { radOpen = false; },
      setScreenSize: function (w, h) { sw = w; sh = h; },
      update: function (dt) {
        tick += dt;
        var rem = [];
        Object.keys(frames).forEach(function (id) {
          var f = frames[id];
          if (!f.alive) {
            f.opacity -= dt * 3;
            if (f.opacity <= 0) rem.push(id);
            return;
          }
          if (f.opacity < 1) { f.opacity = Math.min(1, f.opacity + dt * 2.5); }
          var t = tick + f.driftT;
          f.rotX = f.driftAX * Math.sin(t * 0.4);
          f.rotY = f.driftAY * Math.cos(t * 0.35);
          f.rotZ = f.driftAZ * Math.sin(t * 0.25);
          if (!f.focused) {
            f.z = 2 * Math.sin(t * 0.3);
          } else {
            f.z *= 0.9;
          }
        });
        rem.forEach(function (id) {
          delete frames[id];
          var i = order.indexOf(id);
          if (i >= 0) order.splice(i, 1);
        });
      },
    };
  }

  // ── WEBGL VOID ─────────────────────────────────
  function initVoid() {
    canvas = document.getElementById('void-canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl = canvas.getContext('webgl', { alpha: false, antialias: true });
    if (!gl) {
      canvas.style.background = '#020204';
      return;
    }

    for (var i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        z: Math.random(),
        size: 0.5 + Math.random() * 1.5,
        speed: 0.0002 + Math.random() * 0.0008,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function renderVoid(t) {
    if (!gl) return;
    var w = canvas.width, h = canvas.height;
    gl.viewport(0, 0, w, h);
    gl.clearColor(0.008, 0.008, 0.016, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Fallback: draw stars to 2D overlay if WebGL shaders aren't set up
    // For initial build, use 2D canvas for void particles
  }

  // Actually, let's use 2D canvas for the void — simpler and beautiful enough
  function initVoid2D() {
    canvas = document.getElementById('void-canvas');
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    for (var i = 0; i < 180; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        size: 0.3 + Math.random() * 1.2,
        alpha: 0.1 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.7,
      });
    }
    return ctx;
  }

  var voidCtx = null;

  function renderVoid2D(t) {
    if (!voidCtx) return;
    var w = canvas.width, h = canvas.height;
    voidCtx.fillStyle = '#020204';
    voidCtx.fillRect(0, 0, w, h);

    // Subtle grid
    gridPhase += 0.0003;
    voidCtx.strokeStyle = 'rgba(78,201,212,0.03)';
    voidCtx.lineWidth = 0.5;
    var gridSize = 60 * window.devicePixelRatio;
    var offsetX = (gridPhase * 100) % gridSize;
    for (var gx = -gridSize + offsetX; gx < w + gridSize; gx += gridSize) {
      voidCtx.beginPath();
      voidCtx.moveTo(gx, 0);
      voidCtx.lineTo(gx, h);
      voidCtx.stroke();
    }
    for (var gy = 0; gy < h; gy += gridSize) {
      voidCtx.beginPath();
      voidCtx.moveTo(0, gy);
      voidCtx.lineTo(w, gy);
      voidCtx.stroke();
    }

    // Stars
    var ts = t * 0.001;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var flicker = 0.5 + 0.5 * Math.sin(ts * s.speed + s.phase);
      var a = s.alpha * (0.4 + 0.6 * flicker);
      var r = s.size * window.devicePixelRatio;
      voidCtx.beginPath();
      voidCtx.arc(s.x * w, s.y * h, r, 0, Math.PI * 2);
      voidCtx.fillStyle = 'rgba(232,227,212,' + a.toFixed(3) + ')';
      voidCtx.fill();

      if (r > 1) {
        voidCtx.beginPath();
        voidCtx.arc(s.x * w, s.y * h, r * 3, 0, Math.PI * 2);
        voidCtx.fillStyle = 'rgba(232,184,88,' + (a * 0.1).toFixed(3) + ')';
        voidCtx.fill();
      }
    }
  }

  // ── RADIAL MENU ────────────────────────────────
  function buildRadial() {
    var panelsJSON = compositor.getPanels();
    var panels = JSON.parse(panelsJSON);
    var ring = document.getElementById('radial-ring');
    ring.innerHTML = '';

    var radius = 90;
    var startAngle = -Math.PI * 0.5;
    var sweep = Math.PI * 0.6;

    panels.forEach(function (p, i) {
      var angle = startAngle - (i / (panels.length - 1)) * sweep;
      var x = Math.cos(angle) * radius + 26;
      var y = -Math.sin(angle) * radius + 24;

      var el = document.createElement('div');
      el.className = 'radial-item';
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.transitionDelay = (i * 0.04) + 's';
      el.innerHTML = '<span class="ri-icon">' + p.icon + '</span><span class="ri-label">' + p.title + '</span>';
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        spawnPanel(p.id, p.title, p.id);
        compositor.closeRadial();
        document.getElementById('radial').classList.remove('open');
      });
      ring.appendChild(el);
    });

    document.getElementById('radial-trigger').addEventListener('click', function () {
      var isOpen = compositor.toggleRadial();
      document.getElementById('radial').classList.toggle('open', isOpen);
    });

    document.addEventListener('click', function (e) {
      if (compositor.isRadialOpen() && !e.target.closest('.radial')) {
        compositor.closeRadial();
        document.getElementById('radial').classList.remove('open');
      }
    });
  }

  // ── FRAME RENDERING ────────────────────────────
  function spawnPanel(id, title, plugin) {
    compositor.addFrame(id, title, plugin);
  }

  function createFrameEl(f) {
    var el = document.createElement('div');
    el.className = 'frame';
    el.id = 'frame-' + f.id;
    el.dataset.frameId = f.id;

    var glass = document.createElement('div');
    glass.className = 'frame-glass';

    // Header
    var header = document.createElement('div');
    header.className = 'frame-header';
    header.innerHTML =
      '<span class="frame-dot"></span>' +
      '<span class="frame-title">' + f.title + '</span>' +
      '<button class="frame-close">&times;</button>';

    header.querySelector('.frame-close').addEventListener('click', function (e) {
      e.stopPropagation();
      compositor.removeFrame(f.id);
    });

    // Drag
    header.addEventListener('mousedown', function (e) {
      if (e.target.classList.contains('frame-close')) return;
      e.preventDefault();
      compositor.focusFrame(f.id);
      dragState = {
        id: f.id,
        startX: e.clientX,
        startY: e.clientY,
        origX: f.x,
        origY: f.y,
      };
    });

    // Focus on click
    el.addEventListener('mousedown', function () {
      compositor.focusFrame(f.id);
    });

    // Content
    var content = document.createElement('div');
    content.className = 'frame-content';
    content.innerHTML = getPluginHTML(f.plugin);

    // Status
    var status = document.createElement('div');
    status.className = 'frame-status';
    status.innerHTML = '<span>' + f.plugin + '</span><span>wasm</span>';

    glass.appendChild(header);
    glass.appendChild(content);
    glass.appendChild(status);
    el.appendChild(glass);

    document.getElementById('frame-layer').appendChild(el);
    frameEls[f.id] = el;

    initPlugin(f.id, f.plugin, content);
  }

  function updateFrameEl(f) {
    var el = frameEls[f.id];
    if (!el) return;

    el.style.left = f.x + 'px';
    el.style.top = f.y + 'px';
    el.style.width = f.w + 'px';
    el.style.height = f.h + 'px';
    el.style.zIndex = f.zOrder;
    el.style.opacity = Math.max(0, f.opacity);
    el.style.transform =
      'perspective(1200px)' +
      ' rotateX(' + f.rotX.toFixed(2) + 'deg)' +
      ' rotateY(' + f.rotY.toFixed(2) + 'deg)' +
      ' rotateZ(' + f.rotZ.toFixed(2) + 'deg)' +
      ' translateZ(' + f.z.toFixed(1) + 'px)' +
      ' scale(' + f.scale + ')';

    if (f.focused) {
      el.classList.add('focused');
    } else {
      el.classList.remove('focused');
    }
  }

  function removeFrameEl(id) {
    if (frameEls[id]) {
      frameEls[id].remove();
      delete frameEls[id];
    }
  }

  function syncFrames() {
    var framesJSON = compositor.getFrames();
    var frames = JSON.parse(framesJSON);
    var activeIds = {};

    frames.forEach(function (f) {
      activeIds[f.id] = true;
      if (!frameEls[f.id]) {
        createFrameEl(f);
      }
      updateFrameEl(f);
    });

    Object.keys(frameEls).forEach(function (id) {
      if (!activeIds[id]) {
        removeFrameEl(id);
      }
    });

    document.getElementById('frame-count').textContent = frames.length + ' frame' + (frames.length !== 1 ? 's' : '');
  }

  // ── PLUGIN CONTENT ─────────────────────────────
  function getPluginHTML(plugin) {
    if (plugin === 'askjarvis') {
      return '<div class="jarvis-panel">' +
        '<div class="jarvis-hero">' +
        '<div><div class="jarvis-title">Ask<em>Jarvis</em></div>' +
        '<div class="jarvis-tagline">You have questions. I have answers, sir.</div></div>' +
        '</div>' +
        '<div class="jarvis-search">' +
        '<input class="jarvis-input" type="text" placeholder="Ask Jarvis a question..." autocomplete="off">' +
        '<button class="jarvis-mic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></button>' +
        '<button class="jarvis-ask">Ask!</button>' +
        '</div>' +
        '<div class="jarvis-response" id="jarvis-resp-' + Date.now() + '"></div>' +
        '<div class="jarvis-chips">' +
        '<span class="jarvis-chip" data-q="What\'s on my schedule today?">Schedule</span>' +
        '<span class="jarvis-chip" data-q="Read me my emails">Email</span>' +
        '<span class="jarvis-chip" data-q="Fleet status">Fleet</span>' +
        '<span class="jarvis-chip" data-q="Play some music">Music</span>' +
        '<span class="jarvis-chip" data-q="How many blobs?">Substrate</span>' +
        '</div></div>';
    }
    return '<div class="placeholder-panel">' +
      '<div class="placeholder-icon">' + plugin.charAt(0).toUpperCase() + '</div>' +
      '<div class="placeholder-text">' + plugin + ' &middot; awaiting wasm plugin</div>' +
      '</div>';
  }

  var JARVIS = {
    schedule: "Very well, sir. You have three items today: a fleet review at 10 AM, a design sync at 2 PM, and 'stare at the Prime Radiant contemplatively' blocked from 4 to 5.",
    email: "You have 12 unread messages, sir. Three from Joey regarding DashStart, one from the Substrate daemon — it's complaining about loneliness — and eight from humans who want your money.",
    fleet: "All fleet nodes nominal, sir. 7900XT running warm as usual. Toodles' heartbeat steady. BABEL is... well, BABEL is being BABEL.",
    music: "An excellent choice. 'askJarvis' by HORIZ3N — one might even call it self-referential.",
    blobs: "Approximately 120,000 blobs across 7900xtSubSpace. Each one content-addressed, immutable, and blissfully unaware of how remarkable it is.",
    default: "A fine question, sir. I shall look into it with the thoroughness and quiet dignity that the situation demands.",
  };

  function jarvisAnswer(q) {
    q = q.toLowerCase();
    if (/schedule|calendar|meeting/.test(q)) return JARVIS.schedule;
    if (/email|inbox|mail/.test(q)) return JARVIS.email;
    if (/fleet|status|health/.test(q)) return JARVIS.fleet;
    if (/music|play|song/.test(q)) return JARVIS.music;
    if (/blob|substrate|know/.test(q)) return JARVIS.blobs;
    return JARVIS['default'];
  }

  function initPlugin(frameId, plugin, contentEl) {
    if (plugin !== 'askjarvis') return;

    var input = contentEl.querySelector('.jarvis-input');
    var askBtn = contentEl.querySelector('.jarvis-ask');
    var respEl = contentEl.querySelector('.jarvis-response');
    var chips = contentEl.querySelectorAll('.jarvis-chip');

    function ask(q) {
      if (!q) return;
      input.value = q;
      var answer = jarvisAnswer(q);
      respEl.innerHTML = '<div class="jr-name">Jarvis</div>';
      var p = document.createElement('span');
      respEl.appendChild(p);
      var i = 0;
      (function type() {
        if (i < answer.length) {
          p.textContent += answer[i++];
          setTimeout(type, 22 + Math.random() * 18);
        }
      })();
    }

    askBtn.addEventListener('click', function () { ask(input.value.trim()); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') ask(input.value.trim());
    });
    chips.forEach(function (c) {
      c.addEventListener('click', function () { ask(c.dataset.q); });
    });
  }

  // ── DRAG HANDLING ──────────────────────────────
  document.addEventListener('mousemove', function (e) {
    if (!dragState) return;
    var dx = e.clientX - dragState.startX;
    var dy = e.clientY - dragState.startY;
    compositor.moveFrame(dragState.id, dragState.origX + dx, dragState.origY + dy);
  });

  document.addEventListener('mouseup', function () {
    dragState = null;
  });

  // ── RESIZE ─────────────────────────────────────
  window.addEventListener('resize', function () {
    if (wasmReady) {
      compositor.setScreenSize(window.innerWidth, window.innerHeight);
    }
    if (canvas) {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
    }
  });

  // ── MAIN LOOP ──────────────────────────────────
  function loop(now) {
    var dt = lastTime ? (now - lastTime) / 1000 : 0.016;
    if (dt > 0.1) dt = 0.016;
    lastTime = now;

    compositor.update(dt);
    syncFrames();
    renderVoid2D(now);

    requestAnimationFrame(loop);
  }

  // ── BOOT ───────────────────────────────────────
  voidCtx = initVoid2D();
  bootWASM();

})();
