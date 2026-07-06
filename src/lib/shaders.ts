export const ps1VertexShader = `
uniform vec2 uSnapRes;
uniform vec3 uLightDir;
uniform float uFlat;

varying vec2 vUv;
varying float vLight;

void main() {
  vUv = uv;

  if (uFlat < 0.5) {
    vec3 n = normalize(normalMatrix * normal);
    vec3 l = normalize(normalMatrix * uLightDir);
    float diff = max(0.0, dot(n, l));
    vLight = 0.35 + 0.65 * diff;
  } else {
    vLight = 1.0;
  }

  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vec4 clipPos = projectionMatrix * mvPos;
  vec3 ndc = clipPos.xyz / clipPos.w;
  ndc.xy = floor(ndc.xy * uSnapRes) / uSnapRes;
  gl_Position = vec4(ndc.xyz * clipPos.w, clipPos.w);
}
`;

export const ps1FragmentShader = `
uniform sampler2D uTexture;
uniform float uColorBits;
uniform float uDitherIntensity;
uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform float uExposure;
uniform float uShadows;
uniform float uVibrance;
uniform float uFlat;

varying vec2 vUv;
varying float vLight;

const float BAYER[64] = float[64](
   0.0, 48.0, 12.0, 60.0,  3.0, 51.0, 15.0, 63.0,
  32.0, 16.0, 44.0, 28.0, 35.0, 19.0, 47.0, 31.0,
   8.0, 56.0,  4.0, 52.0, 11.0, 59.0,  7.0, 55.0,
  40.0, 24.0, 36.0, 20.0, 43.0, 27.0, 39.0, 23.0,
   2.0, 50.0, 14.0, 62.0,  1.0, 49.0, 13.0, 61.0,
  34.0, 18.0, 46.0, 30.0, 33.0, 17.0, 45.0, 29.0,
  10.0, 58.0,  6.0, 54.0,  9.0, 57.0,  5.0, 53.0,
  42.0, 26.0, 38.0, 22.0, 41.0, 25.0, 37.0, 21.0
);

void main() {
  vec4 color = texture2D(uTexture, vUv);

  // Image preprocessing
  color.rgb *= uExposure;
  color.rgb = (color.rgb - 0.5) * uContrast + 0.5;
  color.rgb += uBrightness;

  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  float graySat = gray;
  float satMix = uSaturation;
  if (uVibrance != 1.0) {
    float spread = max(abs(color.r - gray), max(abs(color.g - gray), abs(color.b - gray)));
    satMix = mix(uVibrance, uVibrance, spread * 2.0);
    satMix = mix(1.0, satMix, 0.5);
  }
  color.rgb = mix(vec3(gray), color.rgb, satMix);

  if (uShadows > 0.0) {
    float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    float shadow = clamp(1.0 - luma * 2.0, 0.0, 1.0);
    color.rgb += shadow * uShadows * 0.3;
  }

  color.rgb *= vLight;

  float levels = floor(pow(2.0, uColorBits));
  vec3 quantized = floor(color.rgb * levels) / levels;

  int x = int(mod(gl_FragCoord.x, 8.0));
  int y = int(mod(gl_FragCoord.y, 8.0));
  float threshold = (BAYER[y * 8 + x] + 0.5) / 65.0;

  vec3 dithered = floor(color.rgb * levels + threshold) / levels;

  vec3 final = mix(quantized, dithered, uDitherIntensity);

  gl_FragColor = vec4(final, 1.0);
}
`;
