export const palettes = {
  rose: {
    name: "로즈",
    colors: ["#c87579", "#e9b698", "#b45f7b", "#d59b83"],
    line: "#855d56",
  },
  iris: {
    name: "아이리스",
    colors: ["#8e85b9", "#bcc3d3", "#c098bd", "#838fad"],
    line: "#645e82",
  },
  meadow: {
    name: "세이지",
    colors: ["#8aab93", "#c5c18f", "#7e9f95", "#d8b985"],
    line: "#5c7967",
  },
} as const;
export type Palette = keyof typeof palettes;
export type Point = readonly [number, number];
export interface Petal {
  readonly points: readonly Point[];
  readonly angle: number;
  readonly layer: number;
  readonly tone: number;
  readonly alpha: number;
}
export interface Flower {
  readonly seed: number;
  readonly petals: readonly Petal[];
  readonly grain: readonly Point[];
}
export function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function generateFlower(seed: number): Flower {
  const rng = random(seed),
    petals: Petal[] = [];
  const rotation = rng() * Math.PI * 2;
  const layers = 3 + Math.floor(rng() * 2);
  const baseCount = 7 + Math.floor(rng() * 4);
  for (let layer = 0; layer < layers; layer++) {
    const count = baseCount + layer * 2;
    const radius = (310 - layer * 57) * (0.9 + rng() * 0.12);
    for (let i = 0; i < count; i++) {
      const length = radius * (0.86 + rng() * 0.14);
      const width = length * (0.28 + rng() * 0.19);
      const bend = (rng() - 0.5) * length * 0.3;
      const points: Point[] = [
        [0, 16],
        [-width, -length * 0.22],
        [bend - width, -length * 0.86],
        [bend, -length],
        [bend + width, -length * 0.92],
        [width, -length * 0.27],
        [0, 16],
      ];
      petals.push(
        Object.freeze({
          points: Object.freeze(points.map((p) => Object.freeze(p))),
          angle:
            rotation +
            (i / count) * Math.PI * 2 +
            layer * 0.49 +
            (rng() - 0.5) * 0.2,
          layer,
          tone: Math.floor(rng() * 4),
          alpha: 0.12 + rng() * 0.12,
        }),
      );
    }
  }
  const grainRandom = random(seed ^ 0xabcde);
  const grain = Array.from({ length: 12000 }, (): Point =>
    Object.freeze([grainRandom() * 1000, grainRandom() * 1000]),
  );
  return Object.freeze({
    seed,
    petals: Object.freeze(petals),
    grain: Object.freeze(grain),
  });
}
export function renderFlower(
  ctx: CanvasRenderingContext2D,
  flower: Flower,
  palette: Palette,
  progress: number,
) {
  const size = ctx.canvas.width;
  ctx.resetTransform();
  ctx.clearRect(0, 0, size, ctx.canvas.height);
  ctx.save();
  ctx.scale(size / 1000, ctx.canvas.height / 1000);
  ctx.fillStyle = "#f5f1e8";
  ctx.fillRect(0, 0, 1000, 1000);
  ctx.fillStyle = "#806d5112";
  for (const [x, y] of flower.grain) ctx.fillRect(x, y, 0.7, 0.7);
  const colors = palettes[palette];
  ctx.translate(500, 485);
  for (const petal of flower.petals) {
    const t = Math.min(1, Math.max(0, (progress - petal.layer * 0.09) / 0.73));
    const ease = 1 - Math.pow(1 - t, 3);
    if (!t) continue;
    ctx.save();
    ctx.rotate(petal.angle + (1 - ease) * 0.32);
    ctx.scale(0.12 + 0.88 * ease, 0.12 + 0.88 * ease);
    const p = petal.points;
    ctx.beginPath();
    ctx.moveTo(...p[0]);
    ctx.bezierCurveTo(...p[1], ...p[2], ...p[3]);
    ctx.bezierCurveTo(...p[4], ...p[5], ...p[6]);
    ctx.closePath();
    ctx.globalAlpha = petal.alpha * ease;
    ctx.fillStyle = colors.colors[petal.tone];
    ctx.fill();
    ctx.globalAlpha = 0.35 * ease;
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.globalAlpha = 0.12 * ease;
    ctx.lineWidth = 0.45;
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(0, 9);
      ctx.bezierCurveTo(
        k * 14,
        p[3][1] * 0.25,
        p[3][0] + k * 18,
        p[3][1] * 0.7,
        ...p[3],
      );
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}
