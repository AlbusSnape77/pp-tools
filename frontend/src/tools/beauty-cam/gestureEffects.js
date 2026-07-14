const PALM_POINTS = [0, 5, 9, 13, 17];

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function palmCenter(landmarks) {
  const total = PALM_POINTS.reduce((point, index) => ({
    x: point.x + landmarks[index].x,
    y: point.y + landmarks[index].y,
  }), { x: 0, y: 0 });
  return { x: total.x / PALM_POINTS.length, y: total.y / PALM_POINTS.length };
}

export function isPalmOpen(landmarks) {
  if (!landmarks?.[20]) return false;
  const wrist = landmarks[0];
  return [[8, 5], [12, 9], [16, 13], [20, 17]].every(
    ([tip, base]) => distance(wrist, landmarks[tip]) > distance(wrist, landmarks[base]) * 1.7,
  );
}

export function isPinch(landmarks) {
  if (!landmarks?.[9]) return false;
  return distance(landmarks[4], landmarks[8]) < distance(landmarks[0], landmarks[9]) * 0.45;
}

export function getGestureSnapshot(hands = []) {
  const entries = hands.map((landmarks) => ({
    landmarks,
    center: palmCenter(landmarks),
    open: isPalmOpen(landmarks),
    pinch: isPinch(landmarks),
  }));
  const openCount = entries.filter((entry) => entry.open).length;
  return { entries, openCount, bothOpen: openCount >= 2 };
}

export function createGestureEffects() {
  const particles = [];
  let previous = [];

  function addBurst(x, y, type, count) {
    for (let index = 0; index < count && particles.length < 260; index += 1) {
      particles.push({
        x,
        y,
        type,
        size: 4 + Math.random() * 8,
        vx: (Math.random() - 0.5) * 3,
        vy: -(0.5 + Math.random() * 2.2),
        gravity: 0.025,
        life: 1,
        color: ["#ff7eb3", "#7fe3de", "#d8b8ff", "#ffe6a0"][index % 4],
      });
    }
  }

  function update(hands, width, height) {
    const snapshot = getGestureSnapshot(hands);
    snapshot.entries.forEach((entry, index) => {
      const point = { x: (1 - entry.center.x) * width, y: entry.center.y * height };
      if (entry.open && !previous[index]?.open) addBurst(point.x, point.y, "heart", 18);
      if (entry.pinch && !previous[index]?.pinch) addBurst(point.x, point.y, "sparkle", 12);
    });
    if (snapshot.bothOpen && previous.filter((entry) => entry.open).length < 2) {
      addBurst(width / 2, height / 2, "heart", 26);
    }
    previous = snapshot.entries.map(({ open, pinch }) => ({ open, pinch }));
    return snapshot;
  }

  function draw(context) {
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += particle.gravity;
      particle.life -= 0.018;
      if (particle.life <= 0) {
        particles.splice(index, 1);
        continue;
      }
      context.save();
      context.globalAlpha = particle.life;
      context.fillStyle = particle.color;
      context.shadowColor = particle.color;
      context.shadowBlur = 12;
      context.translate(particle.x, particle.y);
      if (particle.type === "heart") {
        const size = particle.size;
        context.beginPath();
        context.moveTo(0, size * 0.35);
        context.bezierCurveTo(-size, -size * 0.25, -size * 0.7, -size, 0, -size * 0.35);
        context.bezierCurveTo(size * 0.7, -size, size, -size * 0.25, 0, size * 0.35);
        context.fill();
      } else {
        context.rotate(Math.PI / 4);
        context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
      }
      context.restore();
    }
  }

  return { update, draw, reset: () => { particles.length = 0; previous = []; } };
}
