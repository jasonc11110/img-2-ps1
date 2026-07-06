import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ps1VertexShader, ps1FragmentShader } from "./shaders";
import { buildHeadGeometry } from "./headBuilder";
import type { FacePoint } from "./faceDetector";

const LIGHT_DIR = new THREE.Vector3(-0.3, 0.5, 0.5).normalize();

export interface PSSettings {
  textureSize: number;
  snapResolution: number;
  colorBits: number;
  ditherIntensity: number;
  renderResolution: number;
  brightness: number;
  contrast: number;
  saturation: number;
  exposure: number;
  shadows: number;
  vibrance: number;
}

export const DEFAULT_SETTINGS: PSSettings = {
  textureSize: 128,
  snapResolution: 320,
  colorBits: 5,
  ditherIntensity: 0.7,
  renderResolution: 320,
  brightness: 0,
  contrast: 1,
  saturation: 1,
  exposure: 1,
  shadows: 0,
  vibrance: 1,
};

const displayVert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const displayFrag = `
uniform sampler2D tDiffuse;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(tDiffuse, vUv);
}
`;

export class PS1Renderer {
  readonly renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  private faceMesh: THREE.Mesh | null = null;
  private meshMaterial: THREE.ShaderMaterial | null = null;
  private lowResTarget: THREE.WebGLRenderTarget;
  private quadScene: THREE.Scene;
  private quadCamera: THREE.OrthographicCamera;
  private displayMat: THREE.ShaderMaterial;
  private currentSettings: PSSettings;
  private animId = 0;
  private running = false;

  constructor(container: HTMLElement, settings?: Partial<PSSettings>) {
    this.currentSettings = { ...DEFAULT_SETTINGS, ...settings };

    const w = container.clientWidth || 640;
    const h = container.clientHeight || 480;

    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(w, h);
    this.renderer.setClearColor(0x111111, 1);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 10);
    this.camera.position.set(0, 0.2, 2.5);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    const rw = this.currentSettings.renderResolution;
    const rh = Math.round(rw * 0.75);
    this.lowResTarget = new THREE.WebGLRenderTarget(rw, rh);
    this.lowResTarget.texture.magFilter = THREE.NearestFilter;
    this.lowResTarget.texture.minFilter = THREE.NearestFilter;

    this.quadScene = new THREE.Scene();
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.displayMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: this.lowResTarget.texture } },
      vertexShader: displayVert,
      fragmentShader: displayFrag,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.displayMat);
    this.quadScene.add(quad);

    this.startLoop();
  }

  private startLoop() {
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.animId = requestAnimationFrame(loop);
      this.controls.update();
      this.renderer.setRenderTarget(this.lowResTarget);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.quadScene, this.quadCamera);
    };
    loop();
  }

  load(image: HTMLImageElement, points: FacePoint[]) {
    const ts = this.currentSettings.textureSize;
    const canvas = document.createElement("canvas");
    canvas.width = ts;
    canvas.height = ts;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0, ts, ts);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;

    const snap = this.currentSettings.snapResolution / 2;
    this.meshMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: tex },
        uSnapRes: { value: new THREE.Vector2(snap, snap) },
        uColorBits: { value: this.currentSettings.colorBits },
        uDitherIntensity: { value: this.currentSettings.ditherIntensity },
        uLightDir: { value: LIGHT_DIR.clone() },
        uFlat: { value: 0 },
        uBrightness: { value: this.currentSettings.brightness },
        uContrast: { value: this.currentSettings.contrast },
        uSaturation: { value: this.currentSettings.saturation },
        uExposure: { value: this.currentSettings.exposure },
        uShadows: { value: this.currentSettings.shadows },
        uVibrance: { value: this.currentSettings.vibrance },
      },
      vertexShader: ps1VertexShader,
      fragmentShader: ps1FragmentShader,
      side: THREE.DoubleSide,
    });

    const faceGeo = buildHeadGeometry(points);
    this.faceMesh = new THREE.Mesh(faceGeo, this.meshMaterial);
    this.scene.clear();
    this.scene.add(this.faceMesh);
  }

  updateSettings(settings: Partial<PSSettings>) {
    Object.assign(this.currentSettings, settings);
    const s = this.currentSettings;

    if (settings.renderResolution) {
      const rw = s.renderResolution;
      const rh = Math.round(rw * 0.75);
      this.lowResTarget.setSize(rw, rh);
      this.displayMat.uniforms.tDiffuse.value = this.lowResTarget.texture;
    }

    const snap = s.snapResolution / 2;
    if (this.meshMaterial) {
      const u = this.meshMaterial.uniforms;
      u.uSnapRes.value.set(snap, snap);
      u.uColorBits.value = s.colorBits;
      u.uDitherIntensity.value = s.ditherIntensity;
      u.uBrightness.value = s.brightness;
      u.uContrast.value = s.contrast;
      u.uSaturation.value = s.saturation;
      u.uExposure.value = s.exposure;
      u.uShadows.value = s.shadows;
      u.uVibrance.value = s.vibrance;
    }
  }

  snapshotLowRes(): string {
    const w = this.lowResTarget.width;
    const h = this.lowResTarget.height;
    this.renderer.setRenderTarget(this.lowResTarget);
    this.renderer.render(this.scene, this.camera);
    const pixels = new Uint8Array(w * h * 4);
    this.renderer.readRenderTargetPixels(this.lowResTarget, 0, 0, w, h, pixels);
    this.renderer.setRenderTarget(null);

    const flipped = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const si = (y * w + x) * 4;
        const di = ((h - 1 - y) * w + x) * 4;
        flipped[di] = pixels[si];
        flipped[di + 1] = pixels[si + 1];
        flipped[di + 2] = pixels[si + 2];
        flipped[di + 3] = pixels[si + 3];
      }
    }
    const cvs = document.createElement("canvas");
    cvs.width = w;
    cvs.height = h;
    const ctx = cvs.getContext("2d")!;
    ctx.putImageData(new ImageData(flipped, w, h), 0, 0);
    return cvs.toDataURL("image/png");
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.running = false;
    cancelAnimationFrame(this.animId);
    this.controls.dispose();
    this.renderer.dispose();
  }
}
