









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

  float t = uTime * 0.055;
  float sc = uScroll;

  uv += uMouse * 0.09 * (0.35 + 0.65 * sc);

  vec2 q = vec2(
    fbm(uv * 1.20 + vec2(0.0, 0.0) + t),
    fbm(uv * 1.20 + vec2(5.2, 1.3) - t * 0.70)
  );

  vec2 r = vec2(
    fbm(uv * 1.10 + 3.0 * q + vec2(1.7, 9.2) + t * 1.10),
    fbm(uv * 1.10 + 3.0 * q + vec2(8.3, 2.8) - t * 0.90)
  );

  float f = fbm(uv + 2.6 * r);

  vec3 deep    = vec3(0.070, 0.012, 0.038);
  vec3 wine    = vec3(0.361, 0.027, 0.110);
  vec3 crimson = vec3(0.847, 0.078, 0.239);
  vec3 rose    = vec3(1.000, 0.239, 0.451);
  vec3 pink    = vec3(1.000, 0.549, 0.702);
  vec3 blush   = vec3(1.000, 0.812, 0.871);
  vec3 gold    = vec3(1.000, 0.804, 0.541);

  vec3 col = mix(deep, wine,    smoothstep(0.15, 0.45, f));
  col      = mix(col,  crimson, smoothstep(0.38, 0.60, f));
  col      = mix(col,  rose,    smoothstep(0.52, 0.72, f + 0.12 * q.x));
  col      = mix(col,  pink,    smoothstep(0.66, 0.86, f + 0.18 * r.y));
  col      = mix(col,  blush,   smoothstep(0.80, 1.05, f + 0.10 * q.y));

  float sheen = pow(smoothstep(0.55, 1.0, f), 3.0);
  col = mix(col, gold, sheen * 0.35);

  float glow = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 pos = vec2(
      sin(uTime * 0.12 + fi * 2.3 + fi * fi),
      cos(uTime * 0.09 + fi * 1.7)
    ) * vec2(1.15, 0.78);
    pos += vec2(uMouse.x * 0.12, uMouse.y * 0.10);
    pos.y += 0.10 * sin(uTime * 0.20 + fi);
    float d = length(uv - pos);
    glow += 0.016 / (d * d + 0.012);
  }
  col += glow * vec3(1.0, 0.45, 0.62) * 0.55;

  float ml = 1.0 - smoothstep(0.0, 0.85, length(uv - uMouse * 0.55));
  col += ml * ml * vec3(0.28, 0.05, 0.12) * (0.5 + 0.5 * sc);

  float vig = smoothstep(1.75, 0.35, length(uv * vec2(0.78, 1.0)));
  col *= mix(0.42, 1.0, vig);
  col += smoothstep(0.90, -0.20, uv.y) * vec3(0.16, 0.02, 0.07);

  col += (hash(gl_FragCoord.xy + fract(uTime) * 137.0) - 0.5) * 0.035;

  gl_FragColor = vec4(pow(max(col, 0.0), vec3(0.92)), 1.0);
}
`;

type Uniforms = {
  uRes: WebGLUniformLocation | null;
  uTime: WebGLUniformLocation | null;
  uMouse: WebGLUniformLocation | null;
  uScroll: WebGLUniformLocation | null;
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

export function initLoveField(canvas: HTMLCanvasElement) {
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
    return () => {};
  }

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();

  if (!vs || !fs || !prog) {
    canvas.dataset.webgl = 'off';
    return () => {};
  }

  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    canvas.dataset.webgl = 'off';
    return () => {};
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
  };

  let scale = 1;
  let w = 0;
  let h = 0;
  let raf = 0;
  let running = true;
  let visible = !document.hidden;

  const target = { x: 0, y: 0 };
  const smooth = { x: 0, y: 0 };
  let scrollTarget = 0;
  let scrollSmooth = 0;

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
  let last = performance.now();

  const frame = (now: number) => {
    if (!running || !visible) return;

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

    const k = reduced ? 1 : 1 - Math.pow(0.0015, dt / 1000);
    smooth.x += (target.x - smooth.x) * k;
    smooth.y += (target.y - smooth.y) * k;
    scrollSmooth += (scrollTarget - scrollSmooth) * k;

    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform1f(u.uTime, now / 1000);
    gl.uniform2f(u.uMouse, smooth.x, smooth.y);
    gl.uniform1f(u.uScroll, scrollSmooth);

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
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  if (!reduced) raf = requestAnimationFrame(frame);

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('visibilitychange', onVisibility);
    gl.deleteProgram(prog);
    gl.deleteBuffer(buf);
  };
}