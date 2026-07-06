import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";

let faceLandmarker: FaceLandmarker | null = null;

export async function initFaceDetector(): Promise<FaceLandmarker> {
  if (faceLandmarker) return faceLandmarker;

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  faceLandmarker = await FaceLandmarker.createFromModelPath(
    vision,
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
  );

  faceLandmarker.setOptions({ runningMode: "IMAGE" });

  return faceLandmarker;
}

export interface FacePoint {
  x: number;
  y: number;
  z: number;
}

export function detectFace(
  detector: FaceLandmarker,
  image: HTMLImageElement | HTMLCanvasElement
): FacePoint[] | null {
  const result = detector.detect(image);
  if (!result.faceLandmarks || result.faceLandmarks.length === 0) return null;
  const raw = result.faceLandmarks[0];
  const points: FacePoint[] = [];
  for (let i = 0; i < raw.length; i++) {
    points.push({ x: raw[i].x, y: raw[i].y, z: raw[i].z ?? 0 });
  }
  return points;
}
