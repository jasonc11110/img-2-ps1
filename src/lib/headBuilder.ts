import * as THREE from "three";
import Delaunator from "delaunator";
import type { FacePoint } from "./faceDetector";

const TARGET_FILL = 0.7;
const ASPECT = 4 / 3;
const DEPTH_SCALE = 0.4;
const HAIR_ROWS = 5;
const BACK_RINGS = 4;

function orderBoundary(edges: [number, number][]): number[] {
  if (edges.length === 0) return [];
  const adj = new Map<number, number[]>();
  for (const [a, b] of edges) {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push(b);
    adj.get(b)!.push(a);
  }
  const ordered: number[] = [];
  const visited = new Set<number>();
  let cur = edges[0][0];
  while (cur !== undefined && !visited.has(cur)) {
    visited.add(cur);
    ordered.push(cur);
    const next = (adj.get(cur) || []).find((n) => !visited.has(n));
    cur = next!;
  }
  return ordered;
}

interface ExtPoint {
  x: number; y: number; z: number;
  u: number; v: number;
}

function genHairExtensions(
  points: FacePoint[],
  cx: number, cy: number, scale: number
): { pts: ExtPoint[]; verts: number } {
  const sorted = points.map((p, i) => ({ p, i })).sort((a, b) => a.p.y - b.p.y);
  const topN = Math.min(40, Math.max(15, Math.floor(points.length * 0.06)));
  const top = sorted.slice(0, topN);
  const result: ExtPoint[] = [];

  for (const { p, i } of top) {
    const neighbors = points
      .map((np, ni) => ({ d: Math.hypot(np.x - p.x, np.y - p.y), ni }))
      .filter((n) => n.d > 0.001)
      .sort((a, b) => a.d - b.d)
      .slice(0, 8);
    const avgZ = neighbors.reduce((s, n) => s + points[n.ni].z, 0) / neighbors.length;

    for (let row = 1; row <= HAIR_ROWS; row++) {
      const t = row / (HAIR_ROWS + 1);
      const ey = p.y - t * 0.12;
      if (ey < 0.005) continue;
      const ex = p.x;
      const wX = (ex - cx) * 2 * scale * (1 - t * 0.25);
      const wY = -(ey - cy) * 2 * scale;
      const wZ = avgZ * DEPTH_SCALE - t * 0.25;
      result.push({
        x: wX, y: wY, z: wZ,
        u: Math.max(0, Math.min(1, ex)),
        v: Math.max(0, Math.min(1, 1 - ey)),
      });
    }
  }
  return { pts: result, verts: result.length };
}

export function buildHeadGeometry(points: FacePoint[]): THREE.BufferGeometry {
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

  const toWX = (x: number) => (x - centroidX) * 2 * scale;
  const toWY = (y: number) => -(y - centroidY) * 2 * scale;
  const toWZ = (z: number) => z * DEPTH_SCALE;

  // ---- Generate hair extension points ----
  const ext = genHairExtensions(points, centroidX, centroidY, scale);
  const extPts = ext.pts;
  const ec = extPts.length;

  // ---- Combined point set for Delaunay ----
  const allPts: { x: number; y: number; u: number; v: number; wX: number; wY: number; wZ: number }[] = [];
  for (const p of points) {
    allPts.push({
      x: p.x, y: p.y,
      u: p.x, v: 1 - p.y,
      wX: toWX(p.x), wY: toWY(p.y), wZ: toWZ(p.z),
    });
  }
  for (const e of extPts) {
    // The x/y for Delaunay must be in photo space
    // But we only stored world coords. Derive photo coords from world coords.
    // Actually, we stored u/v which ARE the photo coords. Let me use those.
    // For Delaunay, we need the original photo x/y.
    // We stored ex = p.x + small adjustment, ey = p.y - offset
    // We can compute photo x/y from uv.
    const photoX = e.u;
    const photoY = 1 - e.v;
    allPts.push({
      x: photoX, y: photoY,
      u: e.u, v: e.v,
      wX: e.x, wY: e.y, wZ: e.z,
    });
  }

  const fc = points.length;
  const tc = allPts.length;

  // ---- Delaunay triangulation on combined points ----
  const coords: number[] = [];
  for (const p of allPts) coords.push(p.x, p.y);
  const delaunay = new Delaunator(new Float64Array(coords));
  const nt = delaunay.triangles.length / 3;

  // ---- Find boundary edges of the full mesh ----
  const edgeCount = new Map<string, number>();
  for (let i = 0; i < nt; i++) {
    const t0 = delaunay.triangles[i * 3];
    const t1 = delaunay.triangles[i * 3 + 1];
    const t2 = delaunay.triangles[i * 3 + 2];
    const push = (a: number, b: number) => {
      const k = `${Math.min(a, b)}-${Math.max(a, b)}`;
      edgeCount.set(k, (edgeCount.get(k) || 0) + 1);
    };
    push(t0, t1);
    push(t1, t2);
    push(t2, t0);
  }
  const boundaryEdges: [number, number][] = [];
  for (const [k, c] of edgeCount) if (c === 1) {
    const [a, b] = k.split("-").map(Number);
    boundaryEdges.push([a, b]);
  }
  const bv = orderBoundary(boundaryEdges);
  const bc = bv.length;

  // ---- Build vertex arrays ----
  const totalVerts = tc + bc * BACK_RINGS;
  const pos = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);

  for (let i = 0; i < tc; i++) {
    pos[i * 3] = allPts[i].wX;
    pos[i * 3 + 1] = allPts[i].wY;
    pos[i * 3 + 2] = allPts[i].wZ;
    uvs[i * 2] = allPts[i].u;
    uvs[i * 2 + 1] = allPts[i].v;
  }

  // Boundary center for back-of-head
  let bcX = 0, bcY = 0, bcZ = 0;
  for (let i = 0; i < bc; i++) {
    const idx = bv[i];
    bcX += pos[idx * 3];
    bcY += pos[idx * 3 + 1];
    bcZ += pos[idx * 3 + 2];
  }
  bcX /= bc; bcY /= bc; bcZ /= bc;

  // ---- Back rings ----
  for (let r = 0; r < BACK_RINGS; r++) {
    const t = (r + 1) / BACK_RINGS;
    const backDepth = 0.35 + t * 0.2;
    const shrink = 1 - t * 0.55;

    for (let i = 0; i < bc; i++) {
      const idx = bv[i];
      const vi = tc + r * bc + i;
      const lx = pos[idx * 3], ly = pos[idx * 3 + 1], lz = pos[idx * 3 + 2];

      // Curved back
      const dx = lx - bcX, dy = ly - bcY;
      const curve = 1 + t * 0.6;
      pos[vi * 3] = bcX + dx * (1 - t * 0.35);
      pos[vi * 3 + 1] = bcY + dy * shrink + (dy > 0 ? -t * 0.12 : t * 0.08);
      pos[vi * 3 + 2] = lz - backDepth;

      // UV from nearby face vertices (inverse distance)
      let tw = 0, tu = 0, tv = 0;
      const hx = pos[vi * 3], hy = pos[vi * 3 + 1], hz = pos[vi * 3 + 2];
      for (let j = 0; j < tc; j++) {
        const dx = hx - pos[j * 3], dy = hy - pos[j * 3 + 1], dz = hz - pos[j * 3 + 2];
        const dsq = dx * dx + dy * dy + dz * dz;
        if (dsq > 0.35) continue;
        const w = 1 / (dsq + 0.001);
        tw += w;
        tu += w * uvs[j * 2];
        tv += w * uvs[j * 2 + 1];
      }
      if (tw > 0.001) {
        uvs[vi * 2] = Math.max(0, Math.min(1, tu / tw));
        uvs[vi * 2 + 1] = Math.max(0, Math.min(1, tv / tw));
      } else {
        uvs[vi * 2] = uvs[idx * 2];
        uvs[vi * 2 + 1] = uvs[idx * 2 + 1];
      }
    }
  }

  // ---- Triangle indices ----
  const ind: number[] = [];
  for (let i = 0; i < nt; i++) {
    ind.push(delaunay.triangles[i * 3], delaunay.triangles[i * 3 + 1], delaunay.triangles[i * 3 + 2]);
  }

  const ri = (r: number, i: number) => {
    if (r < 0) return bv[i];
    return tc + r * bc + i;
  };
  for (let r = -1; r < BACK_RINGS - 1; r++) {
    for (let i = 0; i < bc; i++) {
      const ni = (i + 1) % bc;
      const a = ri(r, i), b = ri(r, ni), c = ri(r + 1, i), d = ri(r + 1, ni);
      ind.push(a, c, b);
      ind.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(Array.from(pos), 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(Array.from(uvs), 2));
  geo.setIndex(ind);
  geo.computeVertexNormals();
  return geo;
}
