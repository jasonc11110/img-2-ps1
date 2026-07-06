# img-2-ps1

Turn your photos into PlayStation 1-era 3D portraits. Upload a face photo, get a low-poly 3D head with PS1 shader effects — viewable and rotatable in the browser.

## Features

- **3D head mesh** — parametric head built from 478 face landmarks, deformable to match any face
- **PS1 shader** — vertex snapping (polygon wobble), color quantization, 8×8 Bayer dithering
- **Interactive** — drag to rotate, scroll to zoom (OrbitControls)
- **Image controls** — brightness, contrast, saturation, exposure, shadows, vibrance
- **PS1 controls** — texture size, snap resolution, color bits, dither intensity, render resolution
- **All client-side** — no server, no upload, no AI APIs. Uses MediaPipe for face detection

## Usage

```bash
npm install
npm run dev
```

1. Upload a portrait photo
2. Wait for face detection (~2s on first load, downloads MediaPipe model)
3. Drag to rotate the 3D head
4. Tweak controls on the right panel
5. Download as PNG

## How it works

| Step | What |
|---|---|
| Face detection | MediaPipe FaceLandmarker → 478 3D landmarks |
| Mesh generation | Parametric head ellipsoid → deformed to match landmarks + hair extension points |
| Texture mapping | Photo mapped onto front face via landmark UVs, stretched around sides/back |
| PS1 rendering | Vertex snapping → Gouraud lighting → color quantization → Bayer dithering |
| Output | Rendered at 320×240 to low-res render target, displayed with nearest-neighbor upscale |

## Stack

Vite + React + TypeScript + Three.js + MediaPipe

## License

MIT
