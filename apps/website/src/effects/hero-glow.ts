import { createShaderEffect, type ShaderRenderer } from './shader-effect.ts';

const fragmentSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 resolution;
uniform float time;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  float aspect = resolution.x / resolution.y;
  float portrait = 1.0 - smoothstep(0.75, 1.2, aspect);
  vec2 center = mix(vec2(0.73, 0.51), vec2(0.95, 0.66), portrait);
  vec2 p = (uv - center) * vec2(aspect, 1.0);
  p.x += 0.035 * sin(time * 0.16);
  p.y += 0.03 * cos(time * 0.13);
  p = mat2(0.94, -0.34, 0.34, 0.94) * p;
  vec2 q = p * vec2(0.85, 1.28);
  float angle = atan(q.y, q.x);
  float radius = length(q);
  float glow = 0.0;

  for (int i = 0; i < 9; i++) {
    float strand = float(i);
    float wave = 0.035 * sin(angle * 3.0 + time * 0.25 + strand * 0.24)
      + 0.022 * cos(angle * 5.0 - time * 0.18 + strand * 0.32);
    float contour = mix(0.27, 0.20, portrait) + strand * 0.007 + wave;
    // 使用有界的像素距离，避免手机 mediump 将较大的高斯系数溢出成色带。
    float distance = abs(radius - contour) * resolution.y;
    float core = min(distance / 1.15, 12.0);
    float halo = min(distance / 7.0, 12.0);
    float light = pow(0.5 + 0.5 * sin(angle * 2.0 - time * 0.3 + strand * 0.35), 3.0);
    glow += exp(-core * core) * (0.10 + 0.75 * light);
    glow += exp(-halo * halo) * 0.028 * light;
  }

  float veil = exp(-length(p * vec2(0.7, 1.2)) * 4.0) * 0.075;
  float edge = smoothstep(0.12, 0.52, uv.x)
    * smoothstep(0.0, 0.14, uv.y) * (1.0 - smoothstep(0.84, 1.0, uv.y));
  vec3 gold = mix(vec3(0.72, 0.48, 0.19), vec3(0.95, 0.83, 0.57), min(glow, 1.0));
  float alpha = min((glow * 0.65 + veil) * edge, 0.72) * mix(1.0, 0.48, portrait);
  gl_FragColor = vec4(gold * alpha, alpha);
}
`;

export type HeroGlowRenderer = ShaderRenderer;

export function createHeroGlow(canvas: HTMLCanvasElement): HeroGlowRenderer | undefined {
  return createShaderEffect(canvas, fragmentSource);
}
