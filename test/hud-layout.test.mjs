import test from "node:test";
import assert from "node:assert/strict";
import {
  commandMenuPosition,
  TOPBAR_H,
  COMMAND_BAR_H,
  EDGE_GAP,
  UNIT_SHELF_H,
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
const overlaps = (a, b) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

test("单位在左半屏 → 菜单贴左边缘", () => {
  for (const ax of [40, 120, 300]) {
    const p = place(ax, 400);
    assert.equal(p.onLeft, true);
    assert.equal(box(p).left, EDGE_GAP);
  }
});

test("单位在右半屏 → 菜单贴右边缘", () => {
  for (const ax of [900, 1100, 1390]) {
    const p = place(ax, 400);
    assert.equal(p.onLeft, false);
    assert.equal(box(p).right, VW - EDGE_GAP);
  }
});

test("两个半屏的分界按中心判定，边界值不翻面", () => {
  assert.equal(place(VW / 2 - 1, 400).onLeft, true);
  assert.equal(place(VW / 2, 400).onLeft, false);
});

// ★ 本轮返工的核心约束：菜单不能压住单位所在格。
//   移动范围从单位四周展开，压住单位格 = 玩家点不到自己脚下那格。
//   注意实现方式：**靠垂直错开**，不是把菜单甩到屏幕对面。
test("菜单矩形与单位格不相交", () => {
  for (const ax of [40, 120, 300, 700, 1100, 1390]) {
    for (const ay of [200, 450, 700]) {
      const b = box(place(ax, ay));
      const unit = { left: ax - 20, right: ax + 20, top: ay - 20, bottom: ay + 20 };
      assert.equal(
        overlaps(b, unit),
        false,
        `单位(${ax},${ay}) 被盖住：菜单 [${b.left},${b.top},${b.right},${b.bottom}]`,
      );
    }
  }
});

// ★ 这条钉住「不许翻面」：曾经的做法是一旦压住单位就翻到对面，
//   结果单位在左侧时菜单跑到屏幕最右（实测 cx 从 100 变 1218），
//   鼠标要横穿整屏 —— 比压住还难用。
test("贴边时也不翻到屏幕对面", () => {
  const left = place(40, 400);
  assert.equal(left.onLeft, true, "单位在左，菜单必须留在左侧");
  assert.equal(box(left).left, EDGE_GAP);

  const right = place(1390, 400);
  assert.equal(right.onLeft, false, "单位在右，菜单必须留在右侧");
  assert.equal(box(right).right, VW - EDGE_GAP);
});

test("垂直错开优先往下，下方放不下才往上", () => {
  // 中段：下方有空间 → 推向单位格之下
  const mid = place(40, 400);
  assert.ok(box(mid).top >= 400 + 20, `没往下错开：top=${box(mid).top}`);
  // 贴近底部且贴左：下方被说明栏+单位栏占满 → 往上错开
  const low = place(40, 760);
  assert.ok(box(low).bottom <= 760 - 20, `没往上错开：bottom=${box(low).bottom}`);
});

test("菜单始终完整落在顶栏与说明栏之间", () => {
  for (const ay of [0, 60, 450, 860, 1000]) {
    const b = box(place(300, ay));
    assert.ok(b.top >= TOPBAR_H, `顶部落到 ${b.top}`);
    assert.ok(b.bottom <= VH - COMMAND_BAR_H, `底部落到 ${b.bottom}`);
  }
});

test("贴左时避开左下角单位栏，贴右时不需要", () => {
  const left = box(place(40, 900));
  assert.ok(
    left.bottom <= VH - COMMAND_BAR_H - UNIT_SHELF_H,
    `未让位，落在 ${left.bottom}`,
  );
  const right = box(place(1390, 900));
  assert.ok(right.bottom > left.bottom);
});

test("垂直方向跟住单位，但不越界", () => {
  const mid = place(300, 400);
  assert.equal(mid.cy, 400);
  assert.ok(box(place(300, 60)).top >= TOPBAR_H);
  assert.ok(box(place(300, 880)).bottom <= VH - COMMAND_BAR_H - UNIT_SHELF_H);
});

test("视口过矮时退化为取中点，不产生 NaN", () => {
  const p = place(300, 400, { vh: 200 });
  assert.ok(Number.isFinite(p.cx) && Number.isFinite(p.cy));
  assert.ok(Number.isFinite(box(p).top));
});

test("宽菜单下不压单位，且完整落在视口内", () => {
  for (const ax of [300, 1100]) {
    const p = place(ax, 400, { menuW: 400 });
    const b = box(p, 400);
    assert.ok(b.left >= 0 && b.right <= VW, `越界：[${b.left}, ${b.right}]`);
    const unit = { left: ax - 20, right: ax + 20, top: 400 - 20, bottom: 400 + 20 };
    assert.equal(overlaps(b, unit), false, `单位 x=${ax} 被宽菜单盖住`);
  }
});

test("真实格宽（cover 放大到 101px）下仍然不压单位", () => {
  // 实测：1440×900 视口用 cover 铺满 15×11 的地图时，一格约 101px，
  // 比逻辑值 40 大一倍多 —— 那时的重叠判定必须用真实 cell。
  const cell = 101;
  const unitHalf = cell / 2;
  for (const ax of [151, 352, 1200]) {
    for (const ay of [151, 352, 600]) {
      const p = place(ax, ay, { cell });
      const b = box(p);
      const unit = {
        left: ax - unitHalf, right: ax + unitHalf,
        top: ay - unitHalf, bottom: ay + unitHalf,
      };
      assert.equal(
        overlaps(b, unit),
        false,
        `cell=${cell} 单位(${ax},${ay}) 被盖住：菜单 [${b.left},${b.top},${b.right},${b.bottom}]`,
      );
    }
  }
});
