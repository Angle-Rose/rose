const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;
uniform float uScroll;
uniform float uMood;
uniform float uOpen;
uniform float uAct;
uniform float uCut;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float h11(float n) { return fract(sin(n) * 43758.5453123); }
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 5; i++) {
    v += amp * noise(p);
    p = rot * p * 2.02;
    amp *= 0.5;
  }
  return v;
}

vec3 actPalette(float idx) {
  float i = floor(idx + 0.001);
  float t = clamp(fract(idx), 0.0, 1.0);
  vec3 a, b, c, d, e;
  if (i < 0.5) {
    a = vec3(0.780, 0.651, 0.769);
    b = vec3(0.847, 0.729, 0.824);
    c = vec3(0.902, 0.800, 0.871);
    d = vec3(0.945, 0.863, 0.906);
    e = vec3(0.980, 0.937, 0.953);
  } else if (i < 1.5) {
    a = vec3(0.894, 0.749, 0.788);
    b = vec3(0.937, 0.812, 0.839);
    c = vec3(0.961, 0.863, 0.886);
    d = vec3(0.973, 0.906, 0.925);
    e = vec3(0.984, 0.949, 0.961);
  } else if (i < 2.5) {
    a = vec3(0.769, 0.651, 0.824);
    b = vec3(0.839, 0.745, 0.902);
    c = vec3(0.890, 0.824, 0.933);
    d = vec3(0.933, 0.886, 0.949);
    e = vec3(0.973, 0.945, 0.976);
  } else {
    a = vec3(0.890, 0.761, 0.824);
    b = vec3(0.937, 0.796, 0.839);
    c = vec3(0.965, 0.902, 0.800);
    d = vec3(0.984, 0.949, 0.878);
    e = vec3(1.000, 0.980, 0.949);
  }
  float s = t * 4.0;
  vec3 r = mix(a, b, clamp(s, 0.0, 1.0));
  r = mix(r, c, clamp(s - 1.0, 0.0, 1.0));
  r = mix(r, d, clamp(s - 2.0, 0.0, 1.0));
  r = mix(r, e, clamp(s - 3.0, 0.0, 1.0));
  return r;
}

vec3 blendPalettes(float uAct, float f) {
  float a = floor(clamp(uAct, 0.0, 3.0));
  float t = smoothstep(0.0, 1.0, clamp(uAct - a, 0.0, 1.0));
  return mix(actPalette(a + f), actPalette(min(a + 1.0, 3.0) + f), t);
}

float actLightness(float uAct) {
  float x = clamp(uAct, 0.0, 3.0);
  float v = 0.78;
  v = mix(v, 0.87, clamp(x, 0.0, 1.0));
  v = mix(v, 0.93, clamp(x - 1.0, 0.0, 1.0));
  v = mix(v, 1.00, clamp(x - 2.0, 0.0, 1.0));
  return v;
}

float heartField(vec2 p) {
  float x = p.x;
  float y = p.y;
  float a = x * x + y * y - 1.0;
  return a * a * a - x * x * y * y * y;
}

vec4 bloomHeart(vec2 uv, float open, float t, out float halo) {
  float o = clamp(open, 0.0, 1.0);
  float ap = o * o * (3.0 - 2.0 * o);
  float scl = mix(2.7, 1.42, ap);
  float sol = smoothstep(0.70, 1.0, o);
  float gap = ap * 0.26;

  vec3 plum = vec3(0.353, 0.165, 0.353);
  vec3 peony = vec3(0.788, 0.392, 0.612);
  vec3 pink = vec3(0.965, 0.780, 0.878);
  vec3 gold = vec3(0.788, 0.631, 0.369);

  vec2 p = uv / scl;
  float f = heartField(vec2(abs(p.x) + gap, p.y));

  float cell = h21(floor((p + vec2(gap, 0.0)) * 9.0));
  float jit = h11(cell * 57.0 + floor(t * 1.6) * 13.0);
  float drift = p.y * 0.55 - t * 0.6 + jit * 2.0;
  f = mix(f, f + (jit - 0.5) * 0.9 + drift * 0.16, sol);
  f += sol * 0.09 * sin(p.x * 7.0 + t * 2.4 + cell * 6.28);

  float body = 1.0 - smoothstep(-0.34, 0.05, f);
  float rim = exp(-abs(f) * 20.0) * mix(0.4, 1.5, ap);
  halo = exp(-max(f, 0.0) * 2.6) * 0.5;

  float spark = 0.0;
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    float a = h11(fi * 3.1) * 6.2831;
    float r = 0.30 + h11(fi * 7.7) * 1.05;
    vec2 sp = vec2(cos(a) * r, sin(a) * r * 0.85 + mod(t * 0.25 + h11(fi * 2.3), 1.0) * 0.5);
    sp.x += gap * sign(sp.x + 0.0001);
    spark += exp(-length(p - sp) * 9.0) * (0.35 + 0.65 * h11(fi * 11.0));
  }
  spark *= sol * sol;

  vec3 c = mix(peony, plum, smoothstep(0.7, -0.9, p.y));
  c = mix(c, pink, 0.22 + 0.3 * (1.0 - ap));
  c = mix(c, gold, rim * 0.75);
  c += mix(pink, gold, 0.5) * spark;

  float a = body * mix(0.42, 0.92, ap);
  return vec4(c * (1.0 - smoothstep(0.88, 1.0, o)) * step(0.001, o), a);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / uRes.y;

  float mood = clamp(uMood, 0.0, 1.0);
  float act = clamp(uAct, 0.0, 3.0);
  float t = uTime * mix(0.020, 0.045, mood);
  float sc = uScroll;

  uv += uMouse * mix(0.05, 0.10, mood) * (0.40 + 0.60 * sc);

  vec2 q = vec2(
    fbm(uv * 1.10 + vec2(0.0, 0.0) + t),
    fbm(uv * 1.10 + vec2(5.2, 1.3) - t * 0.75)
  );

  vec2 r = vec2(
    fbm(uv * 1.00 + 3.2 * q + vec2(1.7, 9.2) + t * 1.05),
    fbm(uv * 1.00 + 3.2 * q + vec2(8.3, 2.8) - t * 0.85)
  );

  float f = fbm(uv + 2.8 * r);
  float d = fbm(uv * 2.4 - 1.7 * r + t * 0.6);
  float ramp = clamp(f * 0.82 + d * 0.18, 0.0, 1.0);

  vec3 dusk = mix(vec3(0.706, 0.573, 0.714), vec3(0.878, 0.741, 0.831), ramp);
  vec3 open = blendPalettes(act, ramp) * actLightness(act);

  vec3 col = mix(dusk, open, mood);

  float bloom = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 pos = vec2(
      sin(uTime * 0.10 + fi * 2.1 + fi * fi),
      cos(uTime * 0.08 + fi * 1.6)
    ) * vec2(1.10, 0.72);
    pos += vec2(uMouse.x * 0.10, uMouse.y * 0.08);
    float dist = length(uv - pos);
    bloom += 0.020 / (dist * dist + 0.020);
  }
  col -= bloom * mix(vec3(0.07, 0.03, 0.08), vec3(0.02, 0.01, 0.03), mood) * mix(1.4, 0.45, mood);

  float sheen = sin((uv.x * 0.55 + uv.y * 0.30) * 1.15 - uTime * 0.13) * 0.5 + 0.5;
  col += pow(sheen, 7.0) * 0.05 * mix(vec3(0.58, 0.44, 0.58), vec3(0.82, 0.74, 0.64), mood);

  float beat = pow(max(0.0, sin(uTime * 1.55)), 7.0) * (1.0 - mood);
  col -= beat * 0.045 * vec3(0.68, 0.48, 0.70);

  float ml = 1.0 - smoothstep(0.0, 0.85, length(uv - uMouse * 0.55));
  col -= ml * ml * mix(vec3(0.09, 0.04, 0.11), vec3(0.03, 0.01, 0.04), mood);

  float vig = smoothstep(2.10, 0.30, length(uv * vec2(0.80, 1.0)));
  col *= mix(mix(0.86, 1.0, vig), mix(0.94, 1.0, vig), mood);

  col += (hash(gl_FragCoord.xy + fract(uTime) * 137.0) - 0.5) * 0.016;

  float halo;
  vec4 heart = bloomHeart(uv, uOpen, uTime, halo);
  col = mix(col, heart.rgb, heart.a);
  col += vec3(0.72, 0.60, 0.42) * halo * 0.22 * step(0.001, uOpen) * (1.0 - smoothstep(0.85, 1.0, uOpen));

  float p = clamp(uCut, 0.0, 1.0);
  if (p > 0.001 && p < 0.999) {
    float x = p * 3.0 - 1.5;
    float band = exp(-pow((uv.x - x) * 2.6, 2.0));
    float fade = sin(p * 3.14159);
    col = mix(col, vec3(1.0, 0.94, 0.86), band * fade * 0.8);
    col += vec3(0.09, 0.05, 0.03) * band * fade;
  }

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

type Uniforms = {
  uRes: WebGLUniformLocation | null;
  uTime: WebGLUniformLocation | null;
  uMouse: WebGLUniformLocation | null;
  uScroll: WebGLUniformLocation | null;
  uMood: WebGLUniformLocation | null;
  uOpen: WebGLUniformLocation | null;
  uAct: WebGLUniformLocation | null;
  uCut: WebGLUniformLocation | null;
};

export type LoveFieldController = {
  setMood: (value: number) => void;
  setAct: (value: number) => void;
  setOpen: (value: number) => void;
  cut: () => void;
  destroy: () => void;
};

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function renderScale(w: number, h: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const s = Math.sqrt(780_000 / Math.max(1, w * h));
  return Math.max(0.5, Math.min(1.4, s * dpr));
}

export function initLoveField(canvas: HTMLCanvasElement): LoveFieldController {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const attrs: WebGLContextAttributes = {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
    preserveDrawingBuffer: false,
  };

  const gl =
    (canvas.getContext('webgl', attrs) as WebGLRenderingContext | null) ??
    (canvas.getContext('experimental-webgl', attrs) as WebGLRenderingContext | null);

  const noop: LoveFieldController = {
    setMood: () => {},
    setAct: () => {},
    setOpen: () => {},
    cut: () => {},
    destroy: () => {},
  };

  if (!gl) {
    canvas.dataset.webgl = 'off';
    return noop;
  }

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();

  if (!vs || !fs || !prog) {
    canvas.dataset.webgl = 'off';
    return noop;
  }

  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    canvas.dataset.webgl = 'off';
    return noop;
  }

  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u: Uniforms = {
    uRes: gl.getUniformLocation(prog, 'uRes'),
    uTime: gl.getUniformLocation(prog, 'uTime'),
    uMouse: gl.getUniformLocation(prog, 'uMouse'),
    uScroll: gl.getUniformLocation(prog, 'uScroll'),
    uMood: gl.getUniformLocation(prog, 'uMood'),
    uOpen: gl.getUniformLocation(prog, 'uOpen'),
    uAct: gl.getUniformLocation(prog, 'uAct'),
    uCut: gl.getUniformLocation(prog, 'uCut'),
  };

  let scale = 1;
  let w = 0;
  let h = 0;
  let raf = 0;
  let running = true;
  let visible = !document.hidden;
  let lost = false;

  let moodTarget = 0;
  let actTarget = 0;
  let openTarget = 0;
  let cutStart = -1;
  let mood = 0;
  let act = 0;
  let open = 0;
  let cut = 0;

  const target = { x: 0, y: 0 };
  const smooth = { x: 0, y: 0 };
  let scrollTarget = 0;
  let scrollSmooth = 0;

  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
    cancelAnimationFrame(raf);
    canvas.dataset.webgl = 'off';
  };

  const onRestored = () => {
    window.location.reload();
  };

  canvas.addEventListener('webglcontextlost', onLost, false);
  canvas.addEventListener('webglcontextrestored', onRestored, false);

  const resize = () => {
    w = window.innerWidth;
    h = window.innerHeight;
    scale = renderScale(w, h);
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const onPointer = (e: PointerEvent) => {
    target.x = (e.clientX / w) * 2 - 1;
    target.y = -((e.clientY / h) * 2 - 1);
  };

  const onScroll = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    scrollTarget = Math.min(1, window.scrollY / max);
  };

  const onVisibility = () => {
    visible = !document.hidden;
    if (visible) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    } else {
      cancelAnimationFrame(raf);
    }
  };

  let slowFrames = 0;
  let downgraded = false;
  let stalled = 0;
  let last = performance.now();

  const frame = (now: number) => {
    if (!running || !visible || lost) return;

    const dt = now - last;
    last = now;

    if (!downgraded && dt > 26) {
      if (++slowFrames > 90) {
        downgraded = true;
        scale *= 0.72;
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    } else {
      slowFrames = 0;
    }

    if (downgraded && dt > 200) {
      if (++stalled > 10) {
        canvas.dataset.webgl = 'off';
        running = false;
        return;
      }
    }

    const k = reduced ? 1 : 1 - Math.pow(0.0015, dt / 1000);
    smooth.x += (target.x - smooth.x) * k;
    smooth.y += (target.y - smooth.y) * k;
    scrollSmooth += (scrollTarget - scrollSmooth) * k;
    mood += (moodTarget - mood) * Math.min(1, k * 0.55);
    act += (actTarget - act) * Math.min(1, k * 0.5);
    open += (openTarget - open) * Math.min(1, k * 0.42);

    if (cutStart >= 0) {
      const p = (now - cutStart) / 900;
      if (p >= 1) {
        cutStart = -1;
        cut = 0;
      } else {
        cut = p;
      }
    }

    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform1f(u.uTime, now / 1000);
    gl.uniform2f(u.uMouse, smooth.x, smooth.y);
    gl.uniform1f(u.uScroll, scrollSmooth);
    gl.uniform1f(u.uMood, mood);
    gl.uniform1f(u.uAct, act);
    gl.uniform1f(u.uOpen, open);
    gl.uniform1f(u.uCut, cut);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    raf = requestAnimationFrame(frame);
  };

  resize();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);

  const paint = () => {
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform1f(u.uTime, 0);
    gl.uniform2f(u.uMouse, 0, 0);
    gl.uniform1f(u.uScroll, 0);
    gl.uniform1f(u.uMood, mood);
    gl.uniform1f(u.uAct, act);
    gl.uniform1f(u.uOpen, open);
    gl.uniform1f(u.uCut, cut);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  paint();

  if (gl.getError() === gl.NO_ERROR && !gl.isContextLost()) {
    canvas.dataset.ready = 'true';
  } else {
    canvas.dataset.webgl = 'off';
  }

  if (!reduced) raf = requestAnimationFrame(frame);

  return {
    setMood(value: number) {
      moodTarget = Math.max(0, Math.min(1, value));
    },
    setAct(value: number) {
      actTarget = Math.max(0, Math.min(3, value));
    },
    setOpen(value: number) {
      openTarget = Math.max(0, Math.min(1, value));
    },
    cut() {
      cutStart = performance.now();
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
    },
  };
}