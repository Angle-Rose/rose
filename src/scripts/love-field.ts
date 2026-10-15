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

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

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

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / uRes.y;

  float mood = clamp(uMood, 0.0, 1.0);
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
  f = f * 0.82 + d * 0.18;

  vec3 plum    = vec3(0.353, 0.165, 0.353);
  vec3 mauve   = vec3(0.753, 0.561, 0.753);
  vec3 dusky   = vec3(0.918, 0.780, 0.847);

  vec3 sealed = mix(plum, mauve, smoothstep(0.20, 0.55, f));
  sealed = mix(sealed, dusky, smoothstep(0.55, 0.88, f + 0.12 * r.y));

  vec3 pearl = vec3(1.000, 0.980, 0.988);
  vec3 blush = vec3(0.996, 0.925, 0.945);
  vec3 rose  = vec3(0.965, 0.800, 0.863);
  vec3 peony = vec3(0.902, 0.663, 0.780);
  vec3 lilac = vec3(0.749, 0.663, 0.878);
  vec3 champ = vec3(0.929, 0.867, 0.682);

  vec3 open = mix(pearl, blush, smoothstep(0.08, 0.38, f));
  open = mix(open, rose,   smoothstep(0.32, 0.55, f + 0.10 * q.x));
  open = mix(open, peony,  smoothstep(0.46, 0.67, f + 0.16 * r.y));
  open = mix(open, lilac,  smoothstep(0.62, 0.84, f + 0.10 * q.y));
  open = mix(open, champ,  pow(smoothstep(0.70, 1.0, f), 4.0) * 0.55);

  vec3 col = mix(sealed, open, mood);

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
  col += bloom * mix(vec3(0.62, 0.42, 0.62), vec3(0.10, 0.04, 0.12), mood) * mix(0.45, 0.22, mood);

  float sweep = sin((uv.x * 0.55 + uv.y * 0.30) * 1.15 - uTime * 0.13) * 0.5 + 0.5;
  col += pow(sweep, 7.0) * 0.075 * mix(vec3(0.85, 0.70, 0.85), vec3(1.0, 0.96, 0.90), mood);

  float beat = pow(max(0.0, sin(uTime * 1.55)), 7.0) * (1.0 - mood);
  col += beat * 0.055 * vec3(0.78, 0.58, 0.80);

  float ml = 1.0 - smoothstep(0.0, 0.85, length(uv - uMouse * 0.55));
  col += ml * ml * mix(vec3(0.18, 0.08, 0.20), vec3(0.05, 0.02, 0.07), mood);

  float vig = smoothstep(2.10, 0.30, length(uv * vec2(0.80, 1.0)));
  col *= mix(mix(0.70, 1.0, vig), mix(0.90, 1.0, vig), mood);

  col += (hash(gl_FragCoord.xy + fract(uTime) * 137.0) - 0.5) * mix(0.022, 0.012, mood);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

type Uniforms = {
  uRes: WebGLUniformLocation | null;
  uTime: WebGLUniformLocation | null;
  uMouse: WebGLUniformLocation | null;
  uScroll: WebGLUniformLocation | null;
  uMood: WebGLUniformLocation | null;
};

export type LoveFieldController = {
  setMood: (value: number) => void;
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

  if (!gl) {
    canvas.dataset.webgl = 'off';
    return { setMood: () => {}, destroy: () => {} };
  }

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();

  if (!vs || !fs || !prog) {
    canvas.dataset.webgl = 'off';
    return { setMood: () => {}, destroy: () => {} };
  }

  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    canvas.dataset.webgl = 'off';
    return { setMood: () => {}, destroy: () => {} };
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
  };

  let scale = 1;
  let w = 0;
  let h = 0;
  let raf = 0;
  let running = true;
  let visible = !document.hidden;
  let lost = false;

  let moodTarget = 0;
  let mood = 0;

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

    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform1f(u.uTime, now / 1000);
    gl.uniform2f(u.uMouse, smooth.x, smooth.y);
    gl.uniform1f(u.uScroll, scrollSmooth);
    gl.uniform1f(u.uMood, mood);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    raf = requestAnimationFrame(frame);
  };

  resize();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);

  gl.uniform2f(u.uRes, canvas.width, canvas.height);
  gl.uniform1f(u.uTime, 0);
  gl.uniform2f(u.uMouse, 0, 0);
  gl.uniform1f(u.uScroll, 0);
  gl.uniform1f(u.uMood, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

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