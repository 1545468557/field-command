import test from "node:test";
import assert from "node:assert/strict";
import {
  commandMenuPosition,
  TOPBAR_H,
  COMMAND_BAR_H,
  EDGE_GAP,
} from "../public/shared/hud-layout.mjs";

// 一组典型参数：1440×900 下，两行中文按钮的命令菜单量出来约 176×104。
const VW = 1440,
  VH = 900,
  MENU_W = 176,
  MENU_H = 104;
const box = (p, w = MENU_W) => ({
  left: p.cx - w / 2,
  right: p.cx + w / 2,
  top: p.cy - MENU_H / 2,
  bottom: p.cy + MENU_H / 2,
});
const place = (anchorX, anchorY, over = {}) =>
  commandMenuPosition({
    anchorX,
    anchorY,
    menuW: MENU_W,
    menuH: MENU_H,
    vw: VW,
    vh: VH,
    ...over,
  });

test("单位在左半屏 → 菜单贴左边缘", () => {
  const p = place(300, 400);
  assert.equal(p.onLeft, true);
  assert.equal(box(p).left, EDGE_GAP);
});

test("单位在右半屏 → 菜单贴右边缘", () => {
  const p = place(1100, 400);
  assert.equal(p.onLeft, false);
  assert.equal(box(p).right, VW - EDGE_GAP);
});

test("两个半屏的分界按中心判定，边界值不翻面", () => {
  assert.equal(place(VW / 2 - 1, 400).onLeft, true);
  assert.equal(place(VW / 2, 400).onLeft, false);
});

// ★ 这条是这次返工的核心回归：菜单绝不能压住单位所在格。
//   移动范围是从单位四周展开的，只要菜单挨着单位就必然切掉一块。
test("菜单与单位格在水平方向不相交（单位贴边时也一样）", () => {
  for (const ax of [40, 120, 300, 700, 1100, 1390]) {
    for (const ay of [100, 450, 800]) {
      const p = place(ax, ay);
      const b = box(p);
      const unitLeft = ax - 20,
        unitRight = ax + 20;
      const overlap = b.left < unitRight && b.right > unitLeft;
      assert.equal(overlap, false, `单位 x=${ax} 被菜单盖住：菜单 [${b.left}, ${b.right}]`);
    }
  }
});

test("菜单始终完整落在顶栏与说明栏之间", () => {
  for (const ay of [0, 60, 450, 860, 1000]) {
    const b = box(place(300, ay));
    assert.ok(b.top >= TOPBAR_H, `顶部落到 ${b.top}`);
    assert.ok(b.bottom <= VH - COMMAND_BAR_H, `底部落到 ${b.bottom}`);
  }
});

test("贴左时避开左下角单位栏，贴右时不需要", () => {
  // 单位在左半屏且贴到屏幕底部 → 菜单被上推，给单位栏让位
  const left = box(place(300, 900));
  assert.ok(left.bottom <= VH - COMMAND_BAR_H - 96, `未让位，落在 ${left.bottom}`);
  // 同样高度但在右半屏 → 下方没有单位栏，可以压得更低
  const right = box(place(1100, 900));
  assert.ok(right.bottom > left.bottom);
});

test("垂直方向跟住单位，但不越界", () => {
  const mid = place(300, 400);
  assert.equal(mid.cy, 400);
  const high = place(300, 60);
  assert.ok(box(high).top >= TOPBAR_H);
  const low = place(300, 880);
  assert.ok(box(low).bottom <= VH - COMMAND_BAR_H - 96);
});

test("视口过矮时退化为取中点，不产生 NaN", () => {
  const p = place(300, 400, { vh: 200 });
  assert.ok(Number.isFinite(p.cx) && Number.isFinite(p.cy));
  assert.ok(Number.isFinite(box(p).top));
});

test("单位贴到屏幕边缘时，菜单翻到对面而不是压住它", () => {
  // 单位在最左：贴左边缘会盖住它（菜单半宽 88 > 单位半格 20），必须翻面
  const p = place(40, 400);
  assert.equal(p.onLeft, false);
  assert.equal(box(p).right, VW - EDGE_GAP);
  // 同样地，单位贴最右 → 翻到左侧
  const q = place(1390, 400);
  assert.equal(q.onLeft, true);
  assert.equal(box(q).left, EDGE_GAP);
});

test("宽菜单下不压单位，且完整落在视口内", () => {
  for (const ax of [300, 1100]) {
    const p = place(ax, 400, { menuW: 400 });
    const b = box(p, 400);
    assert.ok(b.left >= 0 && b.right <= VW, `越界：[${b.left}, ${b.right}]`);
    const overlap = b.left < ax + 20 && b.right > ax - 20;
    assert.equal(overlap, false, `单位 x=${ax} 被宽菜单盖住`);
  }
});
