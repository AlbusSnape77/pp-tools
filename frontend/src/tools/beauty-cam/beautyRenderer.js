import { createGestureEffects, distance } from "./gestureEffects";

export const BEAUTY_DEFAULTS = Object.freeze({ skin: 48, white: 32, slim: 40, eye: 30, blush: 28 });

export const BEAUTY_FILTERS = Object.freeze([
  { id: "original", name: "原图", brightness: 1.02, saturation: 1.03, contrast: 1, wash: null },
  { id: "cream", name: "奶油", brightness: 1.08, saturation: 1.05, contrast: 0.96, wash: "rgba(255,240,214,.18)" },
  { id: "peach", name: "蜜桃", brightness: 1.06, saturation: 1.12, contrast: 1, wash: "rgba(255,213,207,.2)" },
  { id: "first-love", name: "初恋", brightness: 1.11, saturation: 1.02, contrast: 0.95, wash: "rgba(255,226,238,.2)" },
  { id: "cherry", name: "樱花", brightness: 1.06, saturation: 1.1, contrast: 1, wash: "rgba(255,217,236,.2)" },
]);

export function clampBeautySettings(settings) {
  return Object.fromEntries(Object.entries(BEAUTY_DEFAULTS).map(([key, fallback]) => [
    key,
    Math.max(0, Math.min(100, Number(settings?.[key] ?? fallback))),
  ]));
}

function getContext(canvas) {
  try {
    return canvas?.getContext?.("2d", { alpha: false }) ?? null;
  } catch {
    return null;
  }
}

export function createBeautyRenderer(canvas, video) {
  const context = getContext(canvas);
  if (!context) return null;
  const base = document.createElement("canvas");
  const baseContext = getContext(base);
  const eyeCanvas = document.createElement("canvas");
  const eyeContext = getContext(eyeCanvas);
  const effects = createGestureEffects();
  if (!baseContext || !eyeContext) return null;

  function resize() {
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = base.width = width;
      canvas.height = base.height = height;
    }
    return { width, height };
  }

  function point(landmarks, index, width, height) {
    return { x: (1 - landmarks[index].x) * width, y: landmarks[index].y * height };
  }

  function drawBigEye(center, eyeWidth, amount) {
    if (amount < 3) return;
    const scale = 1 + amount / 500;
    const sourceWidth = eyeWidth * 1.9;
    const sourceHeight = eyeWidth * 1.22;
    const sourceX = Math.max(0, center.x - sourceWidth / 2);
    const sourceY = Math.max(0, center.y - sourceHeight / 2);
    const width = Math.min(sourceWidth, base.width - sourceX);
    const height = Math.min(sourceHeight, base.height - sourceY);
    if (width < 8 || height < 8) return;
    eyeCanvas.width = Math.round(width * scale);
    eyeCanvas.height = Math.round(height * scale);
    eyeContext.clearRect(0, 0, eyeCanvas.width, eyeCanvas.height);
    eyeContext.drawImage(base, sourceX, sourceY, width, height, 0, 0, eyeCanvas.width, eyeCanvas.height);
    context.save();
    context.globalAlpha = 0.82;
    context.drawImage(eyeCanvas, center.x - eyeCanvas.width / 2, center.y - eyeCanvas.height / 2);
    context.restore();
  }

  function applySlimFace(landmarks, amount, width, height) {
    if (amount < 3) return;
    const left = point(landmarks, 234, width, height);
    const right = point(landmarks, 454, width, height);
    const leftEye = point(landmarks, 159, width, height);
    const rightEye = point(landmarks, 386, width, height);
    const chin = point(landmarks, 152, width, height);
    const centerX = (left.x + right.x) / 2;
    const halfWidth = Math.max(20, distance(left, right) / 2);
    const top = (leftEye.y + rightEye.y) / 2 + (chin.y - (leftEye.y + rightEye.y) / 2) * 0.12;
    const bottom = Math.min(height, chin.y + 8);
    const strength = amount / 100 * 0.13;
    for (let y = top; y < bottom; y += 5) {
      const progress = (y - top) / Math.max(1, bottom - top);
      const squeeze = strength * Math.sin(progress * Math.PI);
      const rowHalfWidth = halfWidth * (1 - 0.28 * progress);
      const gap = rowHalfWidth * squeeze;
      const rowHeight = Math.min(5, bottom - y);
      context.drawImage(base, centerX - rowHalfWidth, y, rowHalfWidth, rowHeight, centerX - rowHalfWidth + gap, y, rowHalfWidth - gap, rowHeight);
      context.drawImage(base, centerX, y, rowHalfWidth, rowHeight, centerX, y, rowHalfWidth - gap, rowHeight);
    }
  }

  function applyFaceEffects(landmarks, settings, width, height) {
    if (!landmarks?.[454]) return;
    applySlimFace(landmarks, settings.slim, width, height);
    const left = point(landmarks, 234, width, height);
    const right = point(landmarks, 454, width, height);
    const faceWidth = distance(left, right);
    const blushAlpha = settings.blush / 250;
    for (const index of [50, 280]) {
      const cheek = point(landmarks, index, width, height);
      const gradient = context.createRadialGradient(cheek.x, cheek.y, 0, cheek.x, cheek.y, faceWidth * 0.16);
      gradient.addColorStop(0, `rgba(255,128,168,${blushAlpha})`);
      gradient.addColorStop(1, "rgba(255,128,168,0)");
      context.fillStyle = gradient;
      context.fillRect(cheek.x - faceWidth * 0.18, cheek.y - faceWidth * 0.18, faceWidth * 0.36, faceWidth * 0.36);
    }
    const leftEyeA = point(landmarks, 33, width, height);
    const leftEyeB = point(landmarks, 133, width, height);
    const rightEyeA = point(landmarks, 263, width, height);
    const rightEyeB = point(landmarks, 362, width, height);
    drawBigEye({ x: (leftEyeA.x + leftEyeB.x) / 2, y: (leftEyeA.y + leftEyeB.y) / 2 }, distance(leftEyeA, leftEyeB), settings.eye);
    drawBigEye({ x: (rightEyeA.x + rightEyeB.x) / 2, y: (rightEyeA.y + rightEyeB.y) / 2 }, distance(rightEyeA, rightEyeB), settings.eye);
  }

  function render({ settings: rawSettings, filterId, compare, faceLandmarks, hands }) {
    const settings = clampBeautySettings(rawSettings);
    const { width, height } = resize();
    const filter = BEAUTY_FILTERS.find((item) => item.id === filterId) ?? BEAUTY_FILTERS[1];
    const active = compare ? BEAUTY_FILTERS[0] : filter;
    baseContext.clearRect(0, 0, width, height);
    baseContext.save();
    baseContext.filter = `brightness(${active.brightness + settings.white / 650}) saturate(${active.saturation}) contrast(${active.contrast})`;
    baseContext.translate(width, 0);
    baseContext.scale(-1, 1);
    baseContext.drawImage(video, 0, 0, width, height);
    baseContext.restore();
    if (!compare && settings.skin > 0) {
      baseContext.save();
      baseContext.globalCompositeOperation = "screen";
      baseContext.globalAlpha = settings.skin / 260;
      baseContext.filter = `blur(${1 + settings.skin / 16}px) brightness(1.04)`;
      baseContext.translate(width, 0);
      baseContext.scale(-1, 1);
      baseContext.drawImage(video, 0, 0, width, height);
      baseContext.restore();
    }
    if (!compare && active.wash) {
      baseContext.fillStyle = active.wash;
      baseContext.fillRect(0, 0, width, height);
    }
    context.clearRect(0, 0, width, height);
    context.drawImage(base, 0, 0);
    if (!compare) applyFaceEffects(faceLandmarks, settings, width, height);
    const gesture = effects.update(hands ?? [], width, height);
    effects.draw(context);
    return gesture;
  }

  return {
    render,
    capture: () => canvas.toDataURL("image/png"),
    reset: () => effects.reset(),
  };
}
