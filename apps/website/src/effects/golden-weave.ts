import { createShaderEffect, type ShaderRenderer } from './shader-effect.ts';

const fragmentSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 resolution;
uniform float time;

float packet(float position, float head) {
  float behind = head - position;
  float tip = min(abs(behind) / 0.012, 12.0);
  float tail = exp(-min(max(behind, 0.0) * 24.0, 12.0))
    * smoothstep(-0.008, 0.008, behind);
  return exp(-tip * tip) * 0.7 + tail * 0.45;
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  float t = clamp((uv.x - 0.08) / 0.84, 0.0, 1.0);
  float envelope = sin(t * 3.141593);
  float ends = pow(abs(t * 2.0 - 1.0), 1.65);
  float waist = exp(-pow((t - 0.5) * 5.0, 2.0));
  vec3 light = vec3(0.0);
  float alpha = 0.0;

  // 两束经线在房间中央交错成结，再展开到两侧的设备。
  for (int branch = 0; branch < 2; branch++) {
    float side = float(branch) * 2.0 - 1.0;
    for (int i = 0; i < 10; i++) {
      float strand = float(i);
      float phase = strand * 0.42 + side * 1.1;
      float braid = sin(t * 18.0 + phase) * waist;
      float y = 0.5 + side * 0.24 * ends
        + (strand - 4.5) * 0.009 * envelope
        + braid * 0.047 * envelope
        + sin(t * 8.0 + phase) * 0.015 * envelope;
      float distance = abs(uv.y - y) * resolution.y;
      float core = min(distance / 0.95, 12.0);
      float halo = min(distance / 5.0, 12.0);
      // 线路保持静止，带短尾的光点定向传递。金色同步进度，青色携带遥控指令。
      float head = fract(time * 0.18 - strand * 0.025);
      float pulse = packet(t, head);
      float incoming = 1.0 - smoothstep(0.49, 0.51, t);
      float control = packet(0.5 - t, fract(time * 0.20 - strand * 0.022) * 0.5);
      float depth = 0.4 + 0.6 * (0.5 + 0.5 * cos(t * 18.0 + phase));
      vec3 gold = vec3(1.0, 0.84, 0.52);
      vec3 jade = vec3(0.43, 0.72, 0.64);
      vec3 tone = branch == 0 ? mix(gold, jade, incoming) : gold;
      float strength = exp(-core * core) * (0.055 + pulse * 0.9) * depth
        + exp(-halo * halo) * (0.008 + pulse * 0.055);
      light += tone * strength;
      alpha += strength;
      if (branch == 1) {
        float reverse = exp(-core * core) * control * incoming * 0.35;
        light += jade * reverse;
        alpha += reverse;
      }
    }
  }
  float mask = smoothstep(0.07, 0.095, uv.x) * (1.0 - smoothstep(0.905, 0.93, uv.x));
  float opacity = min(alpha * mask, 0.9);
  gl_FragColor = vec4(light / max(alpha, 0.001) * opacity, opacity);
}
`;

export function createGoldenWeave(canvas: HTMLCanvasElement): ShaderRenderer | undefined {
  return createShaderEffect(canvas, fragmentSource);
}
