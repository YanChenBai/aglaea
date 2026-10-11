const vertexSource = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

export interface ShaderRenderer {
  resize: () => void;
  setRunning: (running: boolean) => void;
  setReducedMotion: (reduced: boolean) => void;
  dispose: () => void;
}

export function createShaderEffect(
  canvas: HTMLCanvasElement,
  fragmentSource: string,
): ShaderRenderer | undefined {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false });

  if (!gl) {
    return;
  }

  function compile(type: number, source: string): WebGLShader | undefined {
    const shader = gl!.createShader(type);

    if (!shader) {
      return;
    }

    gl!.shaderSource(shader, source);
    gl!.compileShader(shader);

    if (gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      return shader;
    }

    gl!.deleteShader(shader);
  }

  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  const buffer = gl.createBuffer();

  function release(): void {
    if (vertex) {
      gl!.deleteShader(vertex);
    }

    if (fragment) {
      gl!.deleteShader(fragment);
    }

    if (program) {
      gl!.deleteProgram(program);
    }

    if (buffer) {
      gl!.deleteBuffer(buffer);
    }
  }

  if (!vertex || !fragment || !program || !buffer) {
    release();

    return;
  }

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    release();

    return;
  }

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const resolution = gl.getUniformLocation(program, 'resolution');
  const time = gl.getUniformLocation(program, 'time');

  let frame = 0;
  let running = false;
  let reduced = false;
  let disposed = false;
  let elapsed = 0;
  let previous = 0;
  let rendered = -Infinity;
  canvas.dataset.renderer = 'webgl';

  function draw(): void {
    gl!.uniform2f(resolution, canvas.width, canvas.height);
    gl!.uniform1f(time, elapsed / 1000);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  function tick(now: number): void {
    frame = 0;

    if (disposed || !running || reduced) {
      return;
    }

    if (previous) {
      elapsed += Math.min(now - previous, 100);
    }

    previous = now;

    // 装饰光效限制为 30fps，不占用页面交互的完整帧预算。
    if (now - rendered >= 1000 / 30) {
      draw();
      rendered = now;
    }

    frame = requestAnimationFrame(tick);
  }

  function schedule(): void {
    if (disposed) {
      return;
    }

    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    canvas.dataset.animation = running && !reduced ? 'running' : 'paused';

    if (running && !reduced) {
      frame = requestAnimationFrame(tick);
    } else {
      draw();
    }
  }

  function resize(): void {
    if (disposed) {
      return;
    }

    const width = Math.max(canvas.clientWidth, 1);
    const height = Math.max(canvas.clientHeight, 1);

    // 限制高 DPI 和超宽屏的像素量，移动端无需渲染原生三倍分辨率。
    const scale = Math.min(
      window.devicePixelRatio || 1,
      1.25,
      Math.sqrt(900_000 / (width * height)),
    );

    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    gl!.viewport(0, 0, canvas.width, canvas.height);
    draw();
  }

  resize();

  return {
    resize,
    setRunning(value) {
      running = value;
      schedule();
    },
    setReducedMotion(value) {
      reduced = value;
      schedule();
    },
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      cancelAnimationFrame(frame);
      release();
      delete canvas.dataset.renderer;
      delete canvas.dataset.animation;
    },
  };
}
