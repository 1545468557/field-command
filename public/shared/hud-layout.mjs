/**
 * HUD 摆位计算（纯函数，无 DOM 依赖）。
 *
 * 单独成模块的理由：这段算术最容易错，而它又**只能在浏览器里出效果**——
 * 以前埋在 app.mjs 内部，node 测试因为 app.mjs 顶层就摸 document 而无法 import，
 * 于是「点不到、被挡住」这类问题只能靠肉眼截图抓，回归代价极高。
 * 抽出来之后 test/hud-layout.test.mjs 可以直接钉住行为。
 */

/** 顶栏高度（aw-ui.css 里 .topbar 的通栏高度）。 */
export const TOPBAR_H = 52;
/** 底部说明栏高度（aw-hud.css 里 .command-bar）。 */
export const COMMAND_BAR_H = 30;
/** 左下角单位栏的最高占位（出现战斗预览时最高，按 96 留富余）。 */
export const UNIT_SHELF_H = 96;
/** 贴边留缝。 */
export const EDGE_GAP = 12;

/**
 * 命令菜单的中心点该落在哪儿。
 *
 * ★ 为什么贴屏幕边缘、而不贴单位：
 *   曾经的做法是「单位正下方居中」，结果正好糊在刚展开的移动范围格上，
 *   用户点目的地却点到了菜单。改成贴单位左右侧边也不行——菜单半宽约 88px，
 *   而单位格半宽只有 20px，怎么摆都会吃掉相邻格。
 *   **战场中央是移动范围的地盘，菜单只能待在外面的死区**，也就是屏幕边缘。
 *
 * ★ 为什么按「单位在哪半边」选边：
 *   贴边不挡操作，但离单位越远鼠标行程越长。单位在左半屏贴左边缘、
 *   在右半屏贴右边缘，是「不挡」和「就近」的折中；且菜单出现位置可预测。
 *
 * @param {{anchorX:number, anchorY:number, menuW:number, menuH:number, vw:number, vh:number}} input
 * @returns {{cx:number, cy:number, onLeft:boolean}} 菜单中心点（配 CSS `translate(-50%,-50%)`）
 */
export function commandMenuPosition({
  anchorX,
  anchorY,
  menuW,
  menuH,
  vw,
  vh,
  cell = 40,
}) {
  const halfW = menuW / 2,
    halfH = menuH / 2;
  const unitHalf = cell / 2;

  // ① 选边：贴**离单位近的那条边**。这一条不再因为「压住单位」而翻面——
  //    翻面的代价是菜单甩到屏幕另一端，鼠标要横穿整屏，实测比压住更难用。
  const onLeft = anchorX < vw / 2;
  const cx = onLeft ? EDGE_GAP + halfW : vw - EDGE_GAP - halfW;

  // ② 垂直：先跟住单位高度，夹紧在两个「家具」之间。
  //    上界 = 顶栏 + 余量；下界 = 说明栏 + 贴左时还要躲开单位栏。
  const shelfH = onLeft ? UNIT_SHELF_H : 0;
  const minY = TOPBAR_H + halfH + 6;
  const maxY = vh - COMMAND_BAR_H - shelfH - halfH - 6;
  // 视口太矮导致上下界打架时取中点——宁可压一点家具，也不能算出 NaN。
  const clampY = (y) =>
    maxY > minY ? Math.max(minY, Math.min(y, maxY)) : (minY + maxY) / 2;
  let cy = clampY(anchorY);

  // ③ 贴边时菜单和单位格**在水平方向必然重叠**（菜单半宽约 88px，
  //    单位格半宽只有 20px）。这时不翻面，改成**垂直错开**：
  //    推到单位格下沿之下（够不着就推到上沿之上）。
  //    菜单留在近侧边缘、离单位只差一个身位，同时不盖住它和它的邻格。
  const hOverlap = Math.abs(cx - anchorX) < halfW + unitHalf;
  if (hOverlap) {
    const below = anchorY + unitHalf + halfH + 6;
    const above = anchorY - unitHalf - halfH - 6;
    // ⚠️ 错开后仍要各自夹紧了再用。第一版漏了上面那支的夹紧——
    //    「单位贴着屏幕底部」时 above 会算出 822 > maxY(812)，
    //    菜单底部直接顶穿说明栏（测试第 8 条抓到的越界）。
    if (below <= maxY) cy = Math.max(below, minY);
    else if (above >= minY) cy = Math.min(above, maxY);
    // 两边都放不下：说明视口又矮又挤，维持 clamp 结果（会压一点，但没有更好的解）
  }

  return { cx, cy, onLeft };
}
