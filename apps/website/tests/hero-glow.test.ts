import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { createHeroGlow } from '../src/effects/hero-glow.ts';

function setup() {
  const gl = {
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => ({})),
    createBuffer: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    useProgram: vi.fn(),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    getUniformLocation: vi.fn(() => ({})),
    uniform2f: vi.fn(),
    uniform1f: vi.fn(),
    drawArrays: vi.fn(),
    viewport: vi.fn(),
    deleteProgram: vi.fn(),
    deleteBuffer: vi.fn(),
  };

  const canvas = {
    getContext: vi.fn(() => gl),
    clientWidth: 1920,
    clientHeight: 1080,
    width: 0,
    height: 0,
    dataset: {},
  };

  const request = vi.fn(() => 42);
  const cancel = vi.fn();
  vi.stubGlobal('window', { devicePixelRatio: 3 });
  vi.stubGlobal('requestAnimationFrame', request);
  vi.stubGlobal('cancelAnimationFrame', cancel);

  return {
    gl,
    canvas,
    request,
    cancel,
    renderer: createHeroGlow(canvas as unknown as HTMLCanvasElement)!,
  };
}

afterEach(() => vi.unstubAllGlobals());
describe('hero glow lifecycle', () => {
  it('degrades safely when WebGL is unavailable', () => {
    expect(
      createHeroGlow({ getContext: () => null } as unknown as HTMLCanvasElement),
    ).toBeUndefined();
  });
  it('pauses rendering for reduced motion and resumes only while visible', () => {
    const { renderer, request, cancel, canvas } = setup();
    renderer.setRunning(true);
    expect(request).toHaveBeenCalledTimes(1);
    renderer.setReducedMotion(true);
    expect(cancel).toHaveBeenCalledWith(42);
    expect(canvas.dataset).toMatchObject({ animation: 'paused' });
    renderer.setRunning(false);
    renderer.setReducedMotion(false);
    expect(request).toHaveBeenCalledTimes(1);
    renderer.setRunning(true);
    expect(request).toHaveBeenCalledTimes(2);
    renderer.dispose();
  });
  it('caps pixel cost and releases resources once on unmount', () => {
    const { renderer, gl, canvas, request } = setup();
    expect(canvas.width * canvas.height).toBeLessThan(902000);
    renderer.setRunning(true);
    renderer.dispose();
    renderer.dispose();
    renderer.setRunning(true);
    renderer.resize();
    expect(gl.deleteShader).toHaveBeenCalledTimes(2);
    expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
    expect(gl.deleteBuffer).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(1);
    expect(canvas.dataset).toEqual({});
  });
});
