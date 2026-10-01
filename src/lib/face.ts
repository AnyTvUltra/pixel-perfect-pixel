// Face engine wrapper — swap this module to change the recognition engine.
import type { Person } from "./db";

type FaceApi = typeof import("@vladmandic/face-api");
let api: FaceApi | null = null;
let loading: Promise<FaceApi> | null = null;
const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model";

export function loadFace(): Promise<FaceApi> {
  if (api) return Promise.resolve(api);
  if (!loading) {
    loading = (async () => {
      const f = await import("@vladmandic/face-api");
      await Promise.all([
        f.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        f.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        f.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      api = f;
      return f;
    })();
  }
  return loading;
}

export async function describeImage(el: HTMLImageElement | HTMLCanvasElement) {
  const f = await loadFace();
  const r = await f
    .detectSingleFace(el, new f.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  return r ? Array.from(r.descriptor) : null;
}

export async function detectAll(video: HTMLVideoElement) {
  const f = await loadFace();
  return f
    .detectAllFaces(video, new f.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();
}

function dist(a: number[], b: ArrayLike<number>) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

export function matchFace(desc: ArrayLike<number>, persons: Person[], threshold: number) {
  let best: Person | null = null;
  let bestD = Infinity;
  for (const p of persons) {
    if (!p.tracking) continue;
    for (const d of p.descriptors) {
      const v = dist(d, desc);
      if (v < bestD) {
        bestD = v;
        best = p;
      }
    }
  }
  const confidence = Math.max(0, Math.min(1, 1 - bestD));
  return bestD <= threshold ? { person: best, confidence } : { person: null, confidence };
}

export function fileToDataUrl(file: File, max = 480): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = img.width * s;
      c.height = img.height * s;
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}
