import { describe, expect, it, vi } from "vitest";
import { generateFlower } from "./flower";
import { readState, stateQuery } from "./state";
import { BloomAnimation } from "./animation";

describe("결정적인 작품", () => {
  it("동일 seed의 모든 형태와 질감을 재현하고 서로 다른 seed를 구분한다", () => {
    expect(generateFlower(42)).toEqual(generateFlower(42));
    expect(generateFlower(42)).not.toEqual(generateFlower(43));
    expect(generateFlower(0).petals[0].angle).toBeCloseTo(
      1.7038211653795061,
      12,
    );
  });
  it("팔레트와 무관하게 같은 형태를 재사용한다", () => {
    const rose = readState("?v=1&seed=72&palette=rose");
    const iris = readState("?v=1&seed=72&palette=iris");
    expect(generateFlower(rose.seed)).toEqual(generateFlower(iris.seed));
    expect(Object.isFrozen(generateFlower(72).petals[0].points[0])).toBe(true);
  });
  it("1,000개 seed의 곡선 제어점이 회전 후에도 작품 여백 안에 있다", () => {
    for (let seed = 0; seed < 1000; seed++) {
      for (const petal of generateFlower(seed).petals)
        for (const [x, y] of petal.points) {
          expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
          expect(Math.hypot(x, y)).toBeLessThan(390);
        }
    }
  });
});
describe("URL 계약", () => {
  it.each([
    "-1",
    "4294967296",
    "Infinity",
    "1e3",
    "12abc",
    "1.5",
    "",
    "0000000000000000001",
  ])("잘못된 seed %s를 복구한다", (raw) => {
    expect(readState(`?seed=${raw}`).seed).toBe(104729);
  });
  it.each([0, 4294967295, 104729])("경계값 %s를 왕복 재현한다", (seed) => {
    const state = { seed, palette: "iris", v: 1 } as const;
    expect(readState(stateQuery(state))).toEqual(state);
  });
  it("프로토타입 이름과 알 수 없는 버전을 거부한다", () => {
    expect(readState("?seed=4&palette=__proto__").palette).toBe("rose");
    expect(readState("?v=99&seed=4&palette=iris")).toEqual({
      seed: 104729,
      palette: "rose",
      v: 1,
    });
  });
});
describe("애니메이션 수명", () => {
  it("빠른 재시작 후 이전 콜백이 그리거나 재예약하지 않는다", () => {
    const callbacks: FrameRequestCallback[] = [],
      draw = vi.fn(),
      cancel = vi.fn();
    const request = vi.fn((cb: FrameRequestCallback) => {
      callbacks.push(cb);
      return callbacks.length;
    });
    const animation = new BloomAnimation(draw, request, cancel);
    for (let i = 0; i < 30; i++) animation.start(false);
    draw.mockClear();
    callbacks.slice(0, -1).forEach((cb) => cb(100));
    expect(draw).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(30);
    callbacks[29](100);
    callbacks[30](3100);
    expect(draw).toHaveBeenLastCalledWith(1);
    expect(request).toHaveBeenCalledTimes(31);
  });
  it("reduced-motion은 프레임 예약 없이 완성한다", () => {
    const draw = vi.fn(),
      request = vi.fn();
    new BloomAnimation(draw, request, vi.fn()).start(true);
    expect(draw).toHaveBeenCalledWith(1);
    expect(request).not.toHaveBeenCalled();
  });
});
