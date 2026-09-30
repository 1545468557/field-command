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

  // 水平上会不会压住单位所在格（留 4px 缝）
  const collides = (x) => Math.abs(x - anchorX) < halfW + unitHalf + 4;

  // 先按「单位在哪半边」选边；但如果那个位置正好压住单位本身
  // （单位贴着屏幕边缘时必然发生），就翻到对面去。
  // 对面也压住的话就维持原样——那是「视口太窄 + 菜单太宽」，
  // 已经没有更好的位置了，硬翻只会更难看。
  let onLeft = anchorX < vw / 2;
  let cx = onLeft ? EDGE_GAP + halfW : vw - EDGE_GAP - halfW;
  if (collides(cx)) {
    const other = onLeft ? vw - EDGE_GAP - halfW : EDGE_GAP + halfW;
    if (!collides(other)) {
      onLeft = !onLeft;
      cx = other;
    }
  }

  // 垂直：跟住单位高度，但夹紧在两个「家具」之间。
  //   上界 = 顶栏 + 余量；下界 = 说明栏 + 贴左时还要躲开单位栏。
  const shelfH = onLeft ? UNIT_SHELF_H : 0;
  const minY = TOPBAR_H + halfH + 6;
  const maxY = vh - COMMAND_BAR_H - shelfH - halfH - 6;
  // 视口太矮导致上下界打架时，取中点——宁可压一点家具，也不能算出 NaN。
  const cy =
    maxY > minY
      ? Math.max(minY, Math.min(anchorY, maxY))
      : (minY + maxY) / 2;

  return { cx, cy, onLeft };
}
