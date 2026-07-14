import { FaceLandmarker, FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

function joinAssetPath(baseUrl, path) {
  const base = String(baseUrl || "").replace(/\/+$/, "");
  const suffix = String(path || "").replace(/^\/+/, "");
  return base ? `${base}/${suffix}` : `/${suffix}`;
}

export function buildVisionPaths(assetBaseUrl = "") {
  return {
    wasm: joinAssetPath(assetBaseUrl, "vision/wasm"),
    face: joinAssetPath(assetBaseUrl, "vision/models/face_landmarker.task"),
    hand: joinAssetPath(assetBaseUrl, "vision/models/hand_landmarker.task"),
  };
}

export function createAdaptiveDetectionScheduler({
  minInterval = 16,
  maxInterval = 100,
  initialInterval = 33,
} = {}) {
  let interval = initialInterval;
  let lastDetectionAt = -Infinity;

  return {
    shouldDetect(timestamp) {
      if (timestamp - lastDetectionAt < interval) return false;
      lastDetectionAt = timestamp;
      return true;
    },
    recordDuration(duration) {
      const next = Math.round(Number(duration) * 1.5);
      interval = Math.max(minInterval, Math.min(maxInterval, Number.isFinite(next) ? next : maxInterval));
    },
    getInterval() {
      return interval;
    },
  };
}

export async function createVisionRuntime(assetBaseUrl = "") {
  const paths = buildVisionPaths(assetBaseUrl);
  const fileset = await FilesetResolver.forVisionTasks(paths.wasm);
  const [faceLandmarker, handLandmarker] = await Promise.all([
    FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: paths.face },
      runningMode: "VIDEO",
      numFaces: 1,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    }),
    HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: paths.hand },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.55,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    }),
  ]);
  const scheduler = createAdaptiveDetectionScheduler();
  let latest = { faceLandmarks: null, hands: [] };

  return {
    detect(video, timestamp) {
      if (!scheduler.shouldDetect(timestamp)) return latest;
      const startedAt = performance.now();
      try {
        const faceResult = faceLandmarker.detectForVideo(video, timestamp);
        const handResult = handLandmarker.detectForVideo(video, timestamp);
        latest = {
          faceLandmarks: faceResult.faceLandmarks?.[0] ?? null,
          hands: handResult.landmarks ?? [],
        };
      } finally {
        scheduler.recordDuration(performance.now() - startedAt);
      }
      return latest;
    },
    close() {
      faceLandmarker.close();
      handLandmarker.close();
      latest = { faceLandmarks: null, hands: [] };
    },
  };
}
