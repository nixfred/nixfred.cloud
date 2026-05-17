/* nixfred.cloud — "Cold Boot Into The Storm"
 * One engine, four layers, one cursor.
 *   A  WebGL volumetric storm cloud   (cursor = wind)
 *   B  snow particles + accumulation  (cursor = current)
 *   C  constellation subdomain hub    (cursor = gravity)
 *   D  cold-boot cold-open            (plays once, localStorage-gated)
 * CSP: external file, no eval, no inline. Hand-rolled — zero dependencies.
 */
(function () {
  'use strict';

  /* ---- subdomain hub data: add { name, label } as services come online --- */
  var SUBS = [
    // { name: 'lab', label: 'lab' },
  ];

  var body = document.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* reduced motion / no-canvas: reveal the static hero and stop. */
  if (reduce) { body.classList.add('revealed'); return; }

  /* ---------------------------------------------------------------- refs */
  var cloudCanvas = document.getElementById('cloud');
  var fxCanvas    = document.getElementById('fx');
  var cursorEl    = document.getElementById('cursor');
  var bootEl      = document.getElementById('boot');
  var bootLog     = document.getElementById('bootlog');
  var wordmark    = document.getElementById('wordmark');

  var W = 0, H = 0, DPR = 1;
  var coarse = window.matchMedia('(pointer: coarse)').matches;

  /* ------------------------------------------------------- shared input */
  var input = {
    x: window.innerWidth / 2, y: window.innerHeight / 2,
    px: window.innerWidth / 2, py: window.innerHeight / 2,
    vx: 0, vy: 0, speed: 0,
    down: false, idle: 0, charge: 0, moved: false
  };
  var wind = { x: 0, y: 0 };       /* smoothed atmospheric wind */
  var tilt = { x: 0, y: 0 };       /* device-orientation wind (mobile) */

  /* ----------------------------------------------------------- helpers */
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }

  /* ========================================================== LAYER A
   * WebGL volumetric storm cloud — domain-warped fbm noise.
   * ================================================================== */
  var gl = null, prog = null, uni = {}, webglOK = false;

  var VERT =
    'attribute vec2 a_pos;' +
    'void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }';

  var FRAG =
    'precision highp float;' +
    'uniform vec2  u_res;' +
    'uniform float u_time;' +
    'uniform vec2  u_mouse;' +
    'uniform vec2  u_wind;' +
    'uniform float u_flash;' +
    'uniform float u_calm;' +
    'uniform float u_reveal;' +
    'float hash(vec2 p){' +
    '  p = fract(p * vec2(123.34, 456.21));' +
    '  p += dot(p, p + 45.32);' +
    '  return fract(p.x * p.y);' +
    '}' +
    'float noise(vec2 p){' +
    '  vec2 i = floor(p), f = fract(p);' +
    '  vec2 u = f*f*(3.0-2.0*f);' +
    '  float a = hash(i);' +
    '  float b = hash(i+vec2(1.0,0.0));' +
    '  float c = hash(i+vec2(0.0,1.0));' +
    '  float d = hash(i+vec2(1.0,1.0));' +
    '  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);' +
    '}' +
    'float fbm(vec2 p){' +
    '  float v = 0.0, a = 0.5;' +
    '  for(int i=0;i<6;i++){ v += a*noise(p); p = p*2.02 + 7.0; a *= 0.5; }' +
    '  return v;' +
    '}' +
    'void main(){' +
    '  vec2 uv = gl_FragCoord.xy / u_res;' +
    '  vec2 p = uv; p.x *= u_res.x / u_res.y;' +
    '  float t = u_time * 0.04;' +
    '  vec2 w = u_wind * 0.0011;' +
    '  vec2 q = vec2(fbm(p*3.0 + vec2(t, t*0.6) + w),' +
    '                fbm(p*3.0 + vec2(5.2, 1.3) - w));' +
    '  vec2 r = vec2(fbm(p*3.0 + 3.0*q + vec2(1.7, 9.2) + t*1.2),' +
    '                fbm(p*3.0 + 3.0*q + vec2(8.3, 2.8) - t));' +
    '  float d = fbm(p*3.0 + 3.5*r);' +
    '  d = pow(d, 1.6);' +
    '  float band = smoothstep(1.15, -0.15, uv.y);' +
    '  d *= mix(0.55, 1.28, band);' +
    '  vec2 mpx = gl_FragCoord.xy - u_mouse;' +
    '  float md = length(mpx) / u_res.y;' +
    '  float carve = smoothstep(0.22, 0.0, md);' +
    '  d -= carve * 0.45; d = max(d, 0.0);' +
    '  vec3 voidc = vec3(0.024, 0.031, 0.051);' +
    '  vec3 char1 = vec3(0.10, 0.12, 0.16);' +
    '  vec3 char2 = vec3(0.21, 0.23, 0.30);' +
    '  vec3 col = mix(voidc, char1, smoothstep(0.05, 0.55, d));' +
    '  col = mix(col, char2, smoothstep(0.55, 1.05, d));' +
    '  col *= mix(0.82, 1.0, u_calm);' +
    '  vec3 flash = mix(vec3(1.0,0.95,0.9), vec3(1.0,0.32,0.28), 0.55);' +
    '  col += u_flash * flash * (0.25 + d*0.9);' +
    '  col += vec3(0.17,0.03,0.03) * smoothstep(0.8,1.2,d) * (0.35 + 0.65*u_calm);' +
    '  float vig = smoothstep(1.30, 0.25, length(uv-0.5));' +
    '  col *= mix(0.55, 1.0, vig);' +
    '  col *= u_reveal;' +
    '  gl_FragColor = vec4(col, 1.0);' +
    '}';

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('shader:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function initWebGL() {
    try {
      gl = cloudCanvas.getContext('webgl') ||
           cloudCanvas.getContext('experimental-webgl');
    } catch (e) { gl = null; }
    if (!gl) return false;

    var vs = compile(gl.VERTEX_SHADER, VERT);
    var fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;

    prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('link:', gl.getProgramInfoLog(prog));
      return false;
    }
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    ['u_res', 'u_time', 'u_mouse', 'u_wind', 'u_flash', 'u_calm', 'u_reveal']
      .forEach(function (n) { uni[n] = gl.getUniformLocation(prog, n); });
    return true;
  }

  function renderCloud(time, calm, reveal, flash) {
    if (!webglOK) return;
    gl.viewport(0, 0, cloudCanvas.width, cloudCanvas.height);
    gl.uniform2f(uni.u_res, cloudCanvas.width, cloudCanvas.height);
    gl.uniform1f(uni.u_time, time);
    gl.uniform2f(uni.u_mouse, input.x * DPR, (H - input.y) * DPR);
    gl.uniform2f(uni.u_wind, wind.x, wind.y);
    gl.uniform1f(uni.u_flash, flash);
    gl.uniform1f(uni.u_calm, calm);
    gl.uniform1f(uni.u_reveal, reveal);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* ========================================================== LAYER B/C
   * 2D canvas — snow, accumulation drift, lightning, constellation hub.
   * ==================================================================== */
  var ctx = fxCanvas.getContext('2d');
  var GLYPHS = 'abcdef0123456789/~$.-λ#@'.split('');
  var snow = [];
  var SNOW_MAX = 0;
  var ground = [];          /* accumulation heightmap */
  var GCELLS = 0, gcellW = 0;
  var bolts = [];
  var shake = 0;

  function makeFlake(fromTop) {
    return {
      x: rand(0, W),
      y: fromTop ? rand(-H * 0.3, 0) : rand(0, H),
      vx: rand(-6, 6),
      vy: rand(14, 42),
      g: GLYPHS[(Math.random() * GLYPHS.length) | 0],
      size: rand(8, 16),
      sway: rand(0, 6.28),
      bright: 0
    };
  }

  function resetSnow() {
    SNOW_MAX = Math.min(300, Math.round(W * H / 7600));
    snow = [];
    for (var i = 0; i < SNOW_MAX; i++) snow.push(makeFlake(false));
  }

  function resetGround() {
    GCELLS = Math.max(24, Math.round(W / 14));
    gcellW = W / GCELLS;
    ground = [];
    for (var i = 0; i < GCELLS; i++) ground.push(0);
  }

  function depositSnow(x, amount) {
    var c = clamp((x / gcellW) | 0, 0, GCELLS - 1);
    var cap = H * 0.20;
    ground[c] = Math.min(cap, ground[c] + amount);
    if (c > 0) ground[c - 1] = Math.min(cap, ground[c - 1] + amount * 0.35);
    if (c < GCELLS - 1) ground[c + 1] = Math.min(cap, ground[c + 1] + amount * 0.35);
  }

  function updateSnow(dt, energy, snowOn) {
    var spawn = snowOn ? 1 : 0;
    for (var i = 0; i < snow.length; i++) {
      var f = snow[i];
      f.sway += dt * 2.0;
      f.x += (f.vx + wind.x * 0.10 + Math.sin(f.sway) * 8) * dt;
      f.y += f.vy * dt * (0.6 + energy * 0.7) * spawn;

      /* cursor is a current — it drags and brightens nearby flakes */
      var dx = f.x - input.x, dy = f.y - input.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 130) {
        var k = 1 - dist / 130;
        f.vx += input.vx * 0.9 * k * dt;
        f.vy = lerp(f.vy, 18, k * 0.4);
        f.bright = Math.max(f.bright, k);
      }
      f.bright *= 0.94;
      if (f.x < -20) f.x = W + 20;
      if (f.x > W + 20) f.x = -20;

      var gh = ground[clamp((f.x / gcellW) | 0, 0, GCELLS - 1)] || 0;
      if (f.y >= H - gh) {
        depositSnow(f.x, 0.7);
        snow[i] = makeFlake(true);
      } else if (f.y > H + 30) {
        snow[i] = makeFlake(true);
      }
    }
    /* drift melts slowly and settles, and the cursor carves it */
    for (var c = 0; c < GCELLS; c++) {
      ground[c] *= 0.9993;
      var cx = c * gcellW + gcellW / 2;
      if (Math.abs(cx - input.x) < 46 && input.y > H - ground[c] - 50) {
        ground[c] *= 0.86;
      }
    }
  }

  function drawSnow() {
    /* accumulation drift */
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var c = 0; c < GCELLS; c++) {
      ctx.lineTo(c * gcellW + gcellW / 2, H - ground[c]);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    var g = ctx.createLinearGradient(0, H - H * 0.22, 0, H);
    g.addColorStop(0, 'rgba(230,237,243,0.0)');
    g.addColorStop(1, 'rgba(230,237,243,0.22)');
    ctx.fillStyle = g;
    ctx.fill();

    /* flakes */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var i = 0; i < snow.length; i++) {
      var f = snow[i];
      var a = 0.18 + f.bright * 0.7;
      ctx.font = f.size + 'px ui-monospace, Menlo, Consolas, monospace';
      if (f.bright > 0.25) {
        ctx.fillStyle = 'rgba(77,208,225,' + (0.5 + f.bright * 0.5) + ')';
        ctx.shadowColor = 'rgba(77,208,225,0.9)';
        ctx.shadowBlur = 8 * f.bright;
      } else {
        ctx.fillStyle = 'rgba(230,237,243,' + a + ')';
        ctx.shadowBlur = 0;
      }
      ctx.fillText(f.g, f.x, f.y);
    }
    ctx.shadowBlur = 0;
  }

  /* ---- lightning ------------------------------------------------------- */
  function jagged(x1, y1, x2, y2, displace, out) {
    if (displace < 3) { out.push([x2, y2]); return; }
    var mx = (x1 + x2) / 2 + rand(-displace, displace);
    var my = (y1 + y2) / 2 + rand(-displace, displace);
    jagged(x1, y1, mx, my, displace / 2, out);
    jagged(mx, my, x2, y2, displace / 2, out);
  }

  function strike(tx, ty, tIdx) {
    var ox = clamp(tx + rand(-W * 0.12, W * 0.12), 20, W - 20);
    var oy = H * 0.06;
    var pts = [[ox, oy]];
    jagged(ox, oy, tx, ty, Math.min(W, H) * 0.12, pts);
    var branches = [];
    for (var b = 0; b < 2; b++) {
      var idx = (rand(0.3, 0.7) * pts.length) | 0;
      var sp = pts[idx];
      var bp = [[sp[0], sp[1]]];
      jagged(sp[0], sp[1], sp[0] + rand(-W * 0.18, W * 0.18),
             sp[1] + rand(H * 0.1, H * 0.3), Math.min(W, H) * 0.06, bp);
      branches.push(bp);
    }
    bolts.push({ pts: pts, branches: branches, life: 1 });
    cloudFlash = 1;
    shake = 7;
    thunder(tIdx);
    /* the strike makes it snow harder */
    for (var i = 0; i < 26; i++) {
      var f = makeFlake(true);
      f.x = ox + rand(-60, 60); f.y = oy + rand(0, 40); f.vy = rand(60, 120);
      snow.push(f);
    }
    if (snow.length > SNOW_MAX + 120) snow.splice(0, snow.length - SNOW_MAX - 120);
  }

  function drawBolts(dt) {
    for (var i = bolts.length - 1; i >= 0; i--) {
      var bo = bolts[i];
      bo.life -= dt * 5.2;
      if (bo.life <= 0) { bolts.splice(i, 1); continue; }
      var a = bo.life;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      /* red glow */
      ctx.strokeStyle = 'rgba(248,81,73,' + (a * 0.55) + ')';
      ctx.shadowColor = 'rgba(248,81,73,0.95)';
      ctx.shadowBlur = 26 * a;
      ctx.lineWidth = 6 * a;
      strokePath(bo.pts);
      bo.branches.forEach(strokePath);
      /* white core */
      ctx.strokeStyle = 'rgba(255,255,255,' + a + ')';
      ctx.shadowBlur = 10 * a;
      ctx.lineWidth = 2;
      strokePath(bo.pts);
      bo.branches.forEach(strokePath);
      ctx.shadowBlur = 0;
    }
  }
  function strokePath(pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }

  /* ---- constellation hub (Layer C) ------------------------------------ */
  var nodes = [];
  function buildHub() {
    nodes = [];
    for (var i = 0; i < SUBS.length; i++) {
      var ang = (i / Math.max(1, SUBS.length)) * Math.PI * 2 - Math.PI / 2;
      nodes.push({
        name: SUBS[i].name, label: SUBS[i].label,
        ang: ang, orbit: 92, x: 0, y: 0, r: 5, hover: 0
      });
    }
  }
  var hub = { x: 0, y: 0, cx: 0, cy: 0, pulse: 0 };

  function updateHub(dt, t) {
    hub.x = W / 2; hub.y = H * 0.72;
    /* core leans toward the cursor — gravity well */
    var lx = clamp((input.x - hub.x) * 0.05, -34, 34);
    var ly = clamp((input.y - hub.y) * 0.05, -22, 22);
    hub.cx = lerp(hub.cx, hub.x + lx, 0.06);
    hub.cy = lerp(hub.cy, hub.y + ly, 0.06);
    hub.pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      n.ang += dt * 0.12;
      n.x = hub.cx + Math.cos(n.ang) * n.orbit;
      n.y = hub.cy + Math.sin(n.ang) * n.orbit * 0.6;
      var d = Math.hypot(n.x - input.x, n.y - input.y);
      n.hover = lerp(n.hover, d < 26 ? 1 : 0, 0.2);
    }
  }

  function drawHub(reveal) {
    if (reveal <= 0.01) return;
    ctx.globalAlpha = reveal;
    /* faint orbit ring */
    ctx.strokeStyle = 'rgba(139,148,158,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(hub.cx, hub.cy, 92, 92 * 0.6, 0, 0, Math.PI * 2);
    ctx.stroke();

    /* edges + nodes */
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      ctx.strokeStyle = 'rgba(77,208,225,' + (0.25 + n.hover * 0.5) + ')';
      ctx.lineWidth = 1 + n.hover;
      ctx.beginPath();
      ctx.moveTo(hub.cx, hub.cy);
      ctx.lineTo(n.x, n.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + n.hover * 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(77,208,225,' + (0.7 + n.hover * 0.3) + ')';
      ctx.shadowColor = 'rgba(77,208,225,0.9)';
      ctx.shadowBlur = 8 + n.hover * 14;
      ctx.fill();
      ctx.shadowBlur = 0;

      if (n.hover > 0.05) {
        ctx.globalAlpha = reveal * n.hover;
        ctx.fillStyle = '#e6edf3';
        ctx.font = '12px ui-monospace, Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(n.label + '.nixfred.cloud', n.x, n.y - 16);
        ctx.globalAlpha = reveal;
      }
    }

    /* core node */
    var cr = 6 + hub.pulse * 3;
    ctx.beginPath();
    ctx.arc(hub.cx, hub.cy, cr, 0, Math.PI * 2);
    ctx.fillStyle = '#f85149';
    ctx.shadowColor = 'rgba(248,81,73,0.95)';
    ctx.shadowBlur = 20 + hub.pulse * 16;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(248,81,73,' + (0.4 - hub.pulse * 0.3) + ')';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(hub.cx, hub.cy, cr + 8 + hub.pulse * 14, 0, Math.PI * 2);
    ctx.stroke();

    if (nodes.length === 0) {
      ctx.fillStyle = 'rgba(139,148,158,0.7)';
      ctx.font = '11px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('awaiting nodes', hub.cx, hub.cy + 116);
    }
    ctx.globalAlpha = 1;
  }

  function hubHit(x, y) {
    for (var i = 0; i < nodes.length; i++) {
      if (Math.hypot(nodes[i].x - x, nodes[i].y - y) < 24) return nodes[i];
    }
    return null;
  }

  /* ============================================================ LAYER D
   * Cold-boot cold-open. Plays once; localStorage-gated.
   * ==================================================================== */
  var BOOT_KEY = 'nf_boot_v2';
  var BOOT_LINES = [
    { t: '<span class="dim">red:~$</span> connect nixfred.cloud', d: 220 },
    { t: '<span class="ok">[  ok  ]</span> resolving via cloudflare edge', d: 260 },
    { t: '<span class="ok">[  ok  ]</span> artemis tunnel <span class="dim">............</span> up', d: 300 },
    { t: '<span class="ok">[  ok  ]</span> mounting /nixfred <span class="dim">.........</span> cloud', d: 300 },
    { t: '<span class="ok">[  ok  ]</span> seeding entropy from atmosphere', d: 280 },
    { t: '<span class="warn">[ warn ]</span> precipitation imminent', d: 360 }
  ];
  var ASCII = [
    '',
    '            .--._.--.',
    '         .-(            ).-.',
    '        (   .  nixfred  .   )',
    '         \'-(   .cloud   ).-\'',
    '            \'--._.--._.\'',
    '             \'  :  \'  :',
    '              :  \'  :  \'',
    ''
  ];

  function runBoot(done) {
    if (localStorage.getItem(BOOT_KEY)) { bootEl.classList.add('gone'); done(true); return; }
    var html = '';
    var i = 0;
    function nextLine() {
      if (i < BOOT_LINES.length) {
        html += BOOT_LINES[i].t + '\n';
        bootLog.innerHTML = html + '<span class="cur"> </span>';
        var d = BOOT_LINES[i].d;
        i++;
        setTimeout(nextLine, d);
      } else {
        var j = 0;
        function nextAscii() {
          if (j < ASCII.length) {
            html += '<span class="dim">' + ASCII[j] + '</span>\n';
            bootLog.innerHTML = html + '<span class="cur"> </span>';
            j++;
            setTimeout(nextAscii, 90);
          } else {
            try { localStorage.setItem(BOOT_KEY, '1'); } catch (e) {}
            setTimeout(function () {
              bootEl.classList.add('gone');
              done(false);
            }, 520);
          }
        }
        nextAscii();
      }
    }
    nextLine();
  }

  /* ============================================================ SEQUENCER
   * BOOT -> IGNITE -> SNOW -> HUB -> STEADY
   * ==================================================================== */
  var seq = { state: 'BOOT', t: 0 };
  var cloudFlash = 0;
  var energy = 1, calm = 1, reveal = 0, hubReveal = 0, snowOn = false;
  var stormMode = 'rage', snowForce = null, termOpen = false;  /* rage at load */

  function advance(name) { seq.state = name; seq.t = 0; }

  function updateSequencer(dt, time) {
    seq.t += dt;
    switch (seq.state) {
      case 'IGNITE':
        reveal = clamp(seq.t / 0.8, 0, 1);
        if (seq.t > 0.45 && !seq._struck) { seq._struck = true; strike(W * 0.5, H * 0.46); }
        if (seq.t >= 0.85) advance('SNOW');
        break;
      case 'SNOW':
        reveal = 1; snowOn = true;
        if (seq.t >= 0.7) advance('HUB');
        break;
      case 'HUB':
        reveal = 1; snowOn = true;
        body.classList.add('revealed');
        hubReveal = clamp(seq.t / 0.7, 0, 1);
        if (seq.t >= 0.75) advance('STEADY');
        break;
      case 'STEADY':
        reveal = 1; snowOn = true; hubReveal = 1;
        body.classList.add('revealed');
        /* re-measure letters once the hero has settled into place */
        if (!seq._measured) { seq._measured = true; setTimeout(measureLetters, 450); }
        /* ambient lightning when the storm has energy */
        if (energy > 0.5 && Math.random() < dt * (stormMode === 'rage' ? 0.6 : 0.10)) {
          strike(rand(W * 0.2, W * 0.8), rand(H * 0.3, H * 0.6));
        }
        break;
    }
  }

  /* ============================================================ AUDIO
   * Procedural storm audio — synthesized thunder + ambient rumble.
   * Hand-rolled Web Audio, zero samples. Starts on first user gesture.
   * ==================================================================== */
  var audio = { ctx: null, master: null, amb: null, noise: null, on: true,
                ready: false, lastThunder: -1 };

  function startAudio() {
    if (audio.ready) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { audio.ctx = new AC(); } catch (e) { return; }
    var ctx = audio.ctx;

    audio.master = ctx.createGain();
    audio.master.gain.value = audio.on ? 0.7 : 0.0001;
    var comp = ctx.createDynamicsCompressor();   /* tame overlapping booms */
    audio.master.connect(comp);
    comp.connect(ctx.destination);

    /* shared brown-noise buffer */
    var len = Math.floor(ctx.sampleRate * 2);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0), last = 0;
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.4;
    }
    audio.noise = buf;

    /* ambient rumble bed — looping low noise, gain tracks storm energy */
    var amb = ctx.createBufferSource();
    amb.buffer = buf; amb.loop = true;
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 110;
    var ag = ctx.createGain(); ag.gain.value = 0.0001;
    amb.connect(lp); lp.connect(ag); ag.connect(audio.master);
    amb.start();
    audio.amb = ag;

    audio.ready = true;
    if (ctx.state === 'suspended') ctx.resume();
  }

  /* --- thunder building blocks ------------------------------------------ */
  function aCrack(t, peak, rate, hpf) {              /* bright noise snap */
    var ctx = audio.ctx;
    var s = ctx.createBufferSource();
    s.buffer = audio.noise; s.playbackRate.value = rate;
    var hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = hpf;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    s.connect(hp); hp.connect(g); g.connect(audio.master);
    s.start(t); s.stop(t + 0.34);
  }
  function aBoom(t, peak, dur, f0, rate) {           /* low rolling rumble */
    var ctx = audio.ctx;
    var s = ctx.createBufferSource();
    s.buffer = audio.noise; s.loop = true; s.playbackRate.value = rate;
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(f0, t);
    lp.frequency.exponentialRampToValueAtTime(60, t + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(lp); lp.connect(g); g.connect(audio.master);
    s.start(t); s.stop(t + dur + 0.2);
  }
  function aSub(t, peak, f0, dur) {                  /* falling sine gut-punch */
    var ctx = audio.ctx;
    var o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(24, t + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.07);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(audio.master);
    o.start(t); o.stop(t + dur + 0.1);
  }
  function aSizzle(t, peak, dur) {                   /* electric zap */
    var ctx = audio.ctx;
    var s = ctx.createBufferSource();
    s.buffer = audio.noise; s.playbackRate.value = rand(1.2, 1.8);
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 6;
    bp.frequency.setValueAtTime(2600, t);
    bp.frequency.linearRampToValueAtTime(1400, t + dur * 0.5);
    bp.frequency.linearRampToValueAtTime(3200, t + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp); bp.connect(g); g.connect(audio.master);
    s.start(t); s.stop(t + dur + 0.1);
  }

  /* seven distinct strike voices */
  var THUNDERS = [
    function (t) {                                   /* 1 — close crack */
      aCrack(t, rand(0.45, 0.6), rand(1.0, 1.4), 1100);
      aBoom(t + 0.05, rand(0.4, 0.55), rand(1.4, 2.0), 480, rand(0.8, 1.0));
      aSub(t + 0.05, 0.4, rand(64, 84), 0.9);
    },
    function (t) {                                   /* 2 — distant roll */
      aBoom(t, rand(0.32, 0.44), rand(2.6, 3.6), 220, rand(0.6, 0.8));
    },
    function (t) {                                   /* 3 — the boomer */
      aCrack(t, 0.3, 0.8, 700);
      aBoom(t + 0.04, rand(0.55, 0.7), rand(2.4, 3.2), 360, rand(0.6, 0.85));
      aSub(t + 0.04, rand(0.5, 0.62), rand(70, 92), 1.3);
    },
    function (t) {                                   /* 4 — sizzle strike */
      aSizzle(t, rand(0.26, 0.36), rand(0.3, 0.5));
      aCrack(t + 0.06, 0.35, 1.3, 1400);
      aBoom(t + 0.12, rand(0.38, 0.5), rand(1.6, 2.2), 420, 0.9);
    },
    function (t) {                                   /* 5 — rolling thunder */
      var n = 3 + (Math.random() * 2 | 0);
      for (var i = 0; i < n; i++) {
        aBoom(t + i * rand(0.22, 0.42), rand(0.3, 0.5) * (1 - i * 0.13),
              rand(1.2, 2.0), 320 - i * 40, rand(0.65, 0.95));
      }
      aSub(t, 0.42, 78, 1.0);
    },
    function (t) {                                   /* 6 — double-crack */
      aCrack(t, rand(0.4, 0.55), rand(1.1, 1.4), 1200);
      aCrack(t + rand(0.07, 0.13), rand(0.35, 0.5), rand(1.0, 1.3), 1000);
      aBoom(t + 0.18, rand(0.4, 0.52), rand(1.6, 2.2), 440, 0.9);
      aSub(t + 0.18, 0.4, 72, 0.9);
    },
    function (t) {                                   /* 7 — deep grumble */
      aBoom(t, rand(0.4, 0.52), rand(3.0, 4.2), 170, rand(0.5, 0.7));
      aSub(t + 0.1, rand(0.46, 0.58), rand(48, 62), 1.8);
    }
  ];

  function thunder(idx) {
    if (!audio.ready || !audio.on) return;
    var ctx = audio.ctx;
    if (ctx.state === 'suspended') ctx.resume();
    var t0 = ctx.currentTime + rand(0.1, 0.5);   /* see the flash, then hear it */
    var i;
    if (typeof idx === 'number' && idx >= 0 && idx < THUNDERS.length) {
      i = idx;
    } else {
      i = Math.random() * THUNDERS.length | 0;
      if (i === audio.lastThunder) i = (i + 1) % THUNDERS.length;  /* no repeats */
    }
    audio.lastThunder = i;
    THUNDERS[i](t0);
  }

  function updateAudio(en) {
    if (!audio.ready || !audio.amb) return;
    var target = audio.on ? (0.02 + en * 0.05) : 0.0001;
    var g = audio.amb.gain;
    g.value += (target - g.value) * 0.02;
  }

  function setSound(on) {
    audio.on = on;
    if (audio.master && audio.ctx) {
      audio.master.gain.setTargetAtTime(on ? 0.7 : 0.0001, audio.ctx.currentTime, 0.04);
    }
    var btn = document.getElementById('snd');
    if (btn) {
      btn.classList.toggle('off', !on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  function initSoundUI() {
    var btn = document.getElementById('snd');
    if (!btn) return;
    btn.addEventListener('click', function () {
      startAudio();
      setSound(!audio.on);
    });
  }

  /* ============================================================ TERMINAL
   * A *nix console embedded in the storm. Backtick toggles it; commands
   * drive the weather. The storm keeps running behind the panel.
   * ==================================================================== */
  function initTerminal() {
    var term = document.getElementById('term');
    var out  = document.getElementById('termout');
    var inp  = document.getElementById('terminput');
    if (!term || !out || !inp) return;

    var history = [], hpos = 0, greeted = false;

    function print(text, cls) {
      var l = document.createElement('span');
      l.className = 'l' + (cls ? ' ' + cls : '');
      l.textContent = text;
      out.appendChild(l);
      out.scrollTop = out.scrollHeight;
    }

    var CMD = {
      help: function () {
        print('nixfred.cloud console — commands', 'hi');
        [' help             this list',
         ' ls               list subdomains',
         ' storm rage|calm  drive the storm  (storm auto to release)',
         ' lightning [1-7]  call bolts — 1-7 picks one of 7 thunder voices',
         ' snow on|off      force precipitation  (snow auto to release)',
         ' mute / unmute    storm audio  (thunder syncs to lightning)',
         ' whoami           who runs this',
         ' red              about the box',
         ' reboot           replay the cold-boot sequence',
         ' open <sub>       jump to a subdomain',
         ' clear            clear the console',
         ' exit             close the console'].forEach(function (s) { print(s, 'dim'); });
      },
      ls: function () {
        if (!SUBS.length) { print('no subdomains online — the hub awaits nodes', 'dim'); return; }
        SUBS.forEach(function (s) { print('  ' + s.name + '.nixfred.cloud', 'ok'); });
      },
      storm: function (a) {
        var m = (a[0] || '').toLowerCase();
        if (m === 'rage' || m === 'calm' || m === 'auto') {
          stormMode = m; print('storm mode → ' + m, 'red');
        } else { print('storm is "' + stormMode + '" — usage: storm rage|calm|auto', 'dim'); }
      },
      lightning: function (a) {
        var n = parseInt(a[0], 10);
        if (n >= 1 && n <= 7) {
          strike(rand(W * 0.3, W * 0.7), rand(H * 0.25, H * 0.5), n - 1);
          print('⚡ strike — thunder voice ' + n + '/7', 'red');
        } else {
          [0, 1, 2].forEach(function (i) {
            setTimeout(function () {
              strike(rand(W * 0.2, W * 0.8), rand(H * 0.22, H * 0.55));
            }, i * 150);
          });
          print('⚡ triple strike — random thunder', 'red');
        }
      },
      snow: function (a) {
        var m = (a[0] || '').toLowerCase();
        if (m === 'on') { snowForce = true; print('precipitation: forced on', 'ok'); }
        else if (m === 'off') { snowForce = false; print('precipitation: off', 'dim'); }
        else if (m === 'auto') { snowForce = null; print('precipitation: auto', 'dim'); }
        else { print('usage: snow on|off|auto', 'dim'); }
      },
      whoami: function () {
        print('fred "spike" nix', 'hi');
        print('AI infrastructure architect · atlanta, ga', 'dim');
      },
      red: function () {
        print('red', 'hi');
        print('ubuntu x86_64 · tailnet node · nginx + cloudflared tunnel', 'dim');
        print('this storm is served straight off the box.', 'dim');
      },
      reboot: function () {
        print('rebooting — replaying cold boot...', 'red');
        try { localStorage.removeItem(BOOT_KEY); } catch (e) {}
        setTimeout(function () { location.reload(); }, 700);
      },
      open: function (a) {
        var s = (a[0] || '').replace(/\.nixfred\.cloud$/i, '').replace(/[^a-z0-9-]/gi, '');
        if (!s) { print('usage: open <sub>', 'dim'); return; }
        print('opening ' + s + '.nixfred.cloud ...', 'ok');
        setTimeout(function () { location.href = 'https://' + s + '.nixfred.cloud'; }, 550);
      },
      nix: function () {
        print('snowing nix ❄', 'ok');
        for (var i = 0; i < 70; i++) {
          var f = makeFlake(true); f.x = rand(0, W); f.vy = rand(50, 130); snow.push(f);
        }
        if (snow.length > SNOW_MAX + 200) snow.splice(0, snow.length - SNOW_MAX - 200);
      },
      echo: function (a) { print(a.join(' ')); },
      sudo: function () { print('nice try. you are already root of the storm.', 'red'); },
      date: function () { print(new Date().toString(), 'dim'); },
      mute: function () { setSound(false); print('sound muted', 'dim'); },
      unmute: function () { startAudio(); setSound(true); print('sound on — thunder armed', 'ok'); },
      sound: function () { print('sound is ' + (audio.on ? 'on' : 'off') + ' — use mute / unmute', 'dim'); },
      clear: function () { out.innerHTML = ''; },
      exit: function () { toggle(false); }
    };
    var ALIAS = { cls: 'clear', strike: 'lightning', bolt: 'lightning',
                  ssh: 'open', cd: 'open', uname: 'red', host: 'red',
                  who: 'whoami', '?': 'help', man: 'help', quit: 'exit', q: 'exit' };

    function run(raw) {
      var line = raw.trim();
      print('fred@red:~$ ' + line, 'dim');
      if (!line) return;
      history.push(line); hpos = history.length;
      var parts = line.split(/\s+/);
      var name = parts[0].toLowerCase();
      name = ALIAS[name] || name;
      var fn = CMD[name];
      if (fn) { try { fn(parts.slice(1)); } catch (e) { print('error: ' + e.message, 'red'); } }
      else { print('command not found: ' + parts[0] + "  — type 'help'", 'red'); }
    }

    function complete() {
      var v = inp.value.trim().toLowerCase();
      if (!v || /\s/.test(v)) return;
      var names = Object.keys(CMD).concat(Object.keys(ALIAS));
      var hits = names.filter(function (n) { return n.indexOf(v) === 0; });
      if (hits.length === 1) { inp.value = hits[0] + ' '; }
      else if (hits.length > 1) { print(hits.sort().join('   '), 'dim'); }
    }

    function toggle(force) {
      termOpen = (typeof force === 'boolean') ? force : !termOpen;
      term.classList.toggle('open', termOpen);
      term.setAttribute('aria-hidden', termOpen ? 'false' : 'true');
      if (termOpen) {
        if (!greeted) {
          greeted = true;
          print('nixfred.cloud console', 'hi');
          print("type 'help' for commands · esc or ` to close", 'dim');
          print(' ');
        }
        setTimeout(function () { inp.focus(); }, 70);
      } else { inp.blur(); }
    }

    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        run(inp.value); inp.value = '';
      } else if (e.key === 'ArrowUp') {
        if (hpos > 0) { hpos--; inp.value = history[hpos] || ''; }
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        if (hpos < history.length) { hpos++; inp.value = history[hpos] || ''; }
        e.preventDefault();
      } else if (e.key === 'Tab') {
        e.preventDefault(); complete();
      }
    });

    window.addEventListener('keydown', function (e) {
      startAudio();
      if (e.key === '`' || e.key === '~') { e.preventDefault(); toggle(); }
      else if (e.key === 'Escape' && termOpen) { toggle(false); }
    });

    var hint = document.getElementById('termhint');
    if (hint) hint.addEventListener('click', function () { toggle(true); });
  }

  /* ============================================================ WORDMARK
   * Split into per-letter spans; the cursor blows them like vapor.
   * ==================================================================== */
  var letters = [];
  var baseCenters = [];

  function splitWordmark() {
    var kids = Array.prototype.slice.call(wordmark.children);
    kids.forEach(function (kid) {
      if (kid.classList.contains('dot')) {
        kid.classList.add('letter');
        letters.push(kid);
        return;
      }
      var text = kid.textContent;
      kid.textContent = '';
      for (var i = 0; i < text.length; i++) {
        var s = document.createElement('span');
        s.className = 'letter';
        s.textContent = text[i];
        kid.appendChild(s);
        letters.push(s);
      }
    });
  }

  function measureLetters() {
    baseCenters = letters.map(function (el) {
      el.style.transform = '';
      var r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
  }

  function updateWordmark() {
    if (!body.classList.contains('revealed')) return;
    for (var i = 0; i < letters.length; i++) {
      var c = baseCenters[i];
      if (!c) continue;
      var dx = c.x - input.x, dy = c.y - input.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var R = 150;
      if (dist < R) {
        var k = (1 - dist / R);
        var push = k * k * 46;
        var ox = (dx / (dist || 1)) * push;
        var oy = (dy / (dist || 1)) * push;
        letters[i].style.transform =
          'translate(' + ox.toFixed(1) + 'px,' + oy.toFixed(1) + 'px) ' +
          'rotate(' + (ox * 0.4).toFixed(1) + 'deg)';
        letters[i].style.opacity = (1 - k * 0.55).toFixed(2);
      } else {
        letters[i].style.transform = '';
        letters[i].style.opacity = '1';
      }
    }
  }

  /* ================================================================ SIZE */
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 2);

    cloudCanvas.width = Math.floor(W * DPR);
    cloudCanvas.height = Math.floor(H * DPR);
    fxCanvas.width = Math.floor(W * DPR);
    fxCanvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    resetSnow();
    resetGround();
    measureLetters();
  }

  /* ================================================================ INPUT */
  function onMove(x, y) {
    input.x = x; input.y = y; input.moved = true;
  }
  window.addEventListener('pointermove', function (e) {
    onMove(e.clientX, e.clientY);
  }, { passive: true });

  window.addEventListener('pointerdown', function (e) {
    input.down = true;
    startAudio();
    onMove(e.clientX, e.clientY);
    if (termOpen || (e.target && e.target.id === 'snd')) return;  /* console / UI */
    var hit = hubHit(e.clientX, e.clientY);
    if (hit) { window.location.href = 'https://' + hit.name + '.nixfred.cloud'; return; }
    /* charged (fine pointer) or any tap (coarse) discharges lightning */
    if (coarse || input.charge > 0.55) strike(e.clientX, e.clientY);
  }, { passive: true });

  window.addEventListener('pointerup', function () { input.down = false; }, { passive: true });

  window.addEventListener('deviceorientation', function (e) {
    if (e.gamma == null) return;
    tilt.x = clamp(e.gamma, -45, 45) * 4;
    tilt.y = clamp(e.beta != null ? e.beta - 45 : 0, -45, 45) * 2;
  }, { passive: true });

  window.addEventListener('resize', resize);

  /* ================================================================= LOOP */
  var last = performance.now();
  var startT = last;

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    var time = (now - startT) / 1000;

    /* --- input velocity, idle, charge --- */
    input.vx = lerp(input.vx, input.x - input.px, 0.35);
    input.vy = lerp(input.vy, input.y - input.py, 0.35);
    input.px = input.x; input.py = input.y;
    input.speed = Math.sqrt(input.vx * input.vx + input.vy * input.vy);

    if (input.speed > 0.6) { input.idle = 0; }
    else { input.idle += dt; }
    var still = input.idle > 0.25 && !coarse;
    input.charge = clamp(input.charge + (still ? dt / 1.3 : -dt * 3), 0, 1);

    /* wind: cursor velocity + ambient drift + device tilt */
    wind.x = lerp(wind.x, input.vx * 6 + Math.sin(time * 0.2) * 30 + tilt.x, 0.05);
    wind.y = lerp(wind.y, input.vy * 4 + tilt.y, 0.05);

    /* energy: presence drives the storm; the console can override */
    var targetE = clamp(1 - input.idle * 0.35, 0.2, 1);
    if (stormMode === 'rage') targetE = 1;
    else if (stormMode === 'calm') targetE = 0.16;
    energy = lerp(energy, targetE, stormMode === 'auto' ? 0.04 : 0.09);
    calm = energy;
    updateAudio(energy);

    cloudFlash = Math.max(0, cloudFlash - dt * 3.4);
    shake = Math.max(0, shake - dt * 26);

    updateSequencer(dt, time);
    if (snowForce !== null) snowOn = snowForce;

    /* --- render cloud (Layer A) --- */
    renderCloud(time, calm, reveal, cloudFlash);

    /* --- render fx canvas (B/C) --- */
    ctx.clearRect(0, 0, W, H);
    if (!webglOK) {
      var bg = ctx.createRadialGradient(W / 2, H * 0.32, 0, W / 2, H * 0.32, H);
      bg.addColorStop(0, '#11161f');
      bg.addColorStop(1, '#06080d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.save();
    if (shake > 0.1) {
      ctx.translate(rand(-shake, shake), rand(-shake, shake));
    }
    updateSnow(dt, energy, snowOn);
    drawSnow();
    updateHub(dt, time);
    drawHub(hubReveal);
    drawBolts(dt);
    ctx.restore();

    /* --- cursor + wordmark --- */
    if (!coarse) {
      cursorEl.style.transform = 'translate(' + input.x + 'px,' + input.y + 'px)';
      if (input.charge > 0.6) cursorEl.classList.add('charging');
      else cursorEl.classList.remove('charging');
    }
    updateWordmark();

    requestAnimationFrame(frame);
  }

  /* ================================================================= BOOT */
  function start() {
    webglOK = initWebGL();
    resize();
    splitWordmark();
    measureLetters();
    buildHub();
    initTerminal();
    initSoundUI();

    runBoot(function (returning) {
      if (returning) {
        /* repeat visit — skip the cold-open, land in the live storm */
        advance('STEADY');
        reveal = 1; hubReveal = 1; snowOn = true;
        body.classList.add('revealed');
      } else {
        advance('IGNITE');
      }
    });

    requestAnimationFrame(frame);
  }

  start();
})();
