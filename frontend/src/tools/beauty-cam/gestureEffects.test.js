import { describe, expect, it } from "vitest";
import { getGestureSnapshot, isPalmOpen, isPinch, palmCenter } from "./gestureEffects";

function makeHand({ open = false, pinch = false, offset = 0 } = {}) {
  const hand = Array.from({ length: 21 }, (_, index) => ({
    x: offset + (index % 5) * 0.02,
    y: 0.6 - Math.floor(index / 5) * 0.03,
    z: 0,
  }));
  hand[0] = { x: offset + 0.2, y: 0.8, z: 0 };
  hand[9] = { x: offset + 0.2, y: 0.6, z: 0 };
  for (const [tip, base] of [[8, 5], [12, 9], [16, 13], [20, 17]]) {
    hand[base] = { x: offset + tip * 0.002, y: 0.62, z: 0 };
    hand[tip] = { x: offset + tip * 0.002, y: open ? 0.18 : 0.56, z: 0 };
  }
  hand[4] = pinch
    ? { x: hand[8].x + 0.01, y: hand[8].y + 0.01, z: 0 }
    : { x: offset + 0.02, y: 0.45, z: 0 };
  return hand;
}

describe("gestureEffects", () => {
  it("识别张开手掌和捏合动作", () => {
    expect(isPalmOpen(makeHand({ open: true }))).toBe(true);
    expect(isPalmOpen(makeHand())).toBe(false);
    expect(isPinch(makeHand({ pinch: true }))).toBe(true);
  });

  it("计算手掌中心并汇总双手状态", () => {
    const left = makeHand({ open: true, offset: 0.05 });
    const right = makeHand({ open: true, offset: 0.55 });
    expect(palmCenter(left)).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
    expect(getGestureSnapshot([left, right])).toEqual(expect.objectContaining({
      openCount: 2,
      bothOpen: true,
    }));
  });
});
