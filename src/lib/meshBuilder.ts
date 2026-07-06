import * as THREE from "three";
import Delaunator from "delaunator";
import type { FacePoint } from "./faceDetector";

const TARGET_FILL = 0.7;
const ASPECT = 4 / 3;
const DEPTH_SCALE = 0.4;

export function buildFaceGeometry(points: FacePoint[]): THREE.BufferGeometry {
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const faceW = maxX - minX;
  const faceH = maxY - minY;

  const centroidX = (minX + maxX) / 2;
  const centroidY = (minY + maxY) / 2;

  const maxWorldW = 2 * ASPECT * TARGET_FILL;
  const maxWorldH = 2 * TARGET_FILL;
  const sx = faceW > 0 ? maxWorldW / (faceW * 2) : 1;
  const sy = faceH > 0 ? maxWorldH / (faceH * 2) : 1;
  const scale = Math.min(sx, sy);

  const coords: number[] = [];
  for (const p of points) coords.push(p.x, p.y);
  const delaunay = new Delaunator(new Float64Array(coords));

  const positions: number[] = [];
  const uvs: number[] = [];

  for (const p of points) {
    positions.push(
      (p.x - centroidX) * 2 * scale,
      -(p.y - centroidY) * 2 * scale,
      p.z * DEPTH_SCALE
    );
    uvs.push(p.x, 1 - p.y);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(Array.from(delaunay.triangles));
  geo.computeVertexNormals();
  return geo;
}
