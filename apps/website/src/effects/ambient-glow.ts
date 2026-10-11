import { createShaderEffect, type ShaderRenderer } from './shader-effect.ts';

const fragmentSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 resolution;
uniform float time;

float glow(vec2 uv, vec2 center, float radius) {
  vec2 p = (uv - center) * resolution / min(resolution.x, resolution.y);
  p /= radius;
  return exp(-dot(p, p) * 3.5);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 first = vec2(0.12 + 0.16 * sin(time * 0.18), 0.64 + 0.18 * cos(time * 0.14));
  vec2 second = vec2(0.92 + 0.12 * cos(time * 0.15), 0.24 + 0.20 * sin(time * 0.19));
  float light = glow(uv, first, 0.68) + glow(uv, second, 0.58) * 0.65;
  vec3 color = vec3(12.0 / 255.0) + vec3(0.055, 0.038, 0.015) * light;
  // 使用固定的亚像素色阶抖动打散暗部色带，不叠加可见颗粒或闪烁纹理。
  float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  color += (dither - 0.5) / 255.0;
  gl_FragColor = vec4(color, 1.0);
}
`;

export function createAmbientGlow(canvas: HTMLCanvasElement): ShaderRenderer | undefined {
  return createShaderEffect(canvas, fragmentSource);
}
