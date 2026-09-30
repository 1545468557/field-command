/** Original procedural pixel artwork for Frontline Command. No external assets. */
import { UNITS, TERRAINS, reachable } from "./shared/engine.mjs";
import { paintUnitArtwork } from "./unit-art.mjs";
import { paintDirectionalMotion } from "./unit-direction.mjs";
import { COMBAT_TIMING, combatDuration } from "./combat-scene.mjs";
import { deathEffectKind, paintFallingSoldier, paintVehicleBlast } from "./unit-death.mjs";
import { MOVE_STEP_MS, MOVE_TURN_MS, movementDuration, captureDuration } from "./shared/animation-timing.mjs";
import { propertyFlagPose } from "./property-flag.mjs";

export { movementDuration } from "./shared/animation-timing.mjs";

export const TEAM_COLORS = ["#ef745e", "#64b7e8", "#edcb66", "#9c8ce6"];
const TILE = 40;
export const TEAM_PALETTES = [
  ["#f79a75", "#df634c", "#a83c36", "#713134"],
  ["#91d5ef", "#4ba5d1", "#2e668f", "#29415f"],
  ["#ffe499", "#dfbd56", "#a27b33", "#6a522d"],
  ["#c2acef", "#9278ce", "#634da0", "#44385f"],
];
const GRASS = ["#76966b", "#7d9e70", "#749468", "#809d71"];
const NEUTRAL = ["#e4ddbd", "#b7b89d", "#777f74", "#505f5a"];
const hash = (x, y, k = 0) =>
  Math.abs(((x * 92837111) ^ (y * 689287499) ^ (k * 283923481)) >>> 0);
const tileKey = (x, y) => `${x},${y}`;
const palette = (owner) =>
  owner == null ? NEUTRAL : TEAM_PALETTES[((owner % 4) + 4) % 4];

function box(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}
function line(ctx, points, color, width = 1) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++)
    ctx.lineTo(points[i][0], points[i][1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}
function polygon(ctx, points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++)
    ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}
function tree(ctx, x, y, size = 1, shade = 0) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(size, size);
  box(ctx, 0, 12, 12, 4, "#627c58");
  box(ctx, 5, 9, 3, 7, "#665b41");
  box(ctx, 2, 5, 11, 7, "#315e51");
  box(ctx, 0, 2, 13, 7, shade ? "#3e7059" : "#3c6e53");
  box(ctx, 3, -1, 8, 3, "#4e805c");
  box(ctx, 1, 3, 5, 3, "#619261");
  box(ctx, 5, 0, 5, 3, "#729d69");
  box(ctx, 10, 6, 3, 5, "#2e594b");
  ctx.restore();
}
function pine(ctx, x, y, size = 1) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(size, size);
  box(ctx, 6, 15, 3, 6, "#6b6042");
  box(ctx, 0, 13, 15, 4, "#315c4c");
  box(ctx, 2, 8, 11, 5, "#376a50");
  box(ctx, 4, 4, 7, 5, "#46815c");
  box(ctx, 6, 0, 3, 5, "#669367");
  box(ctx, 3, 12, 3, 2, "#619461");
  ctx.restore();
}

function paintGround(ctx, tile) {
  const { x, y } = tile;
  box(ctx, 0, 0, TILE, TILE, GRASS[hash(x, y) % GRASS.length]);
  for (let i = 0; i < 12; i++) {
    const px = 2 + (hash(x, y, i + 2) % 36);
    const py = 2 + (hash(y, x, i + 30) % 35);
    box(ctx, px, py, 2 + (i % 2), 1, i % 3 ? "#86a675" : "#6b8b62");
    if (i % 4 === 0) box(ctx, px + 1, py - 1, 1, 1, "#91ac7c");
  }
}
function paintWater(ctx, tile, neighbors) {
  box(ctx, 0, 0, TILE, TILE, "#578f9c");
  box(ctx, 0, 0, TILE, 2, "#609aa4");
  const land = (t) => t && t.type !== "water" && t.type !== "bridge";
  if (land(neighbors.up)) {
    box(ctx, 0, 0, TILE, 5, "#a7b185");
    box(ctx, 0, 5, TILE, 2, "#8fb4ad");
    box(ctx, 4, 3, 9, 2, "#bdbe8d");
    box(ctx, 26, 3, 8, 2, "#bdbe8d");
  }
  if (land(neighbors.down)) {
    box(ctx, 0, 35, TILE, 5, "#a7b185");
    box(ctx, 0, 33, TILE, 2, "#8fb4ad");
  }
  if (land(neighbors.left)) {
    box(ctx, 0, 0, 5, TILE, "#a7b185");
    box(ctx, 5, 0, 2, TILE, "#8fb4ad");
  }
  if (land(neighbors.right)) {
    box(ctx, 35, 0, 5, TILE, "#a7b185");
    box(ctx, 33, 0, 2, TILE, "#8fb4ad");
  }
}
function paintRoad(ctx, neighbors, bridge = false) {
  const connects = (t) =>
    t && ["road", "bridge", "city", "factory", "hq"].includes(t.type);
  let u = connects(neighbors.up),
    d = connects(neighbors.down);
  let l = connects(neighbors.left),
    r = connects(neighbors.right);
  if (!u && !d && !l && !r) l = r = true;
  const surface = bridge ? "#b5b298" : "#b4ad89";
  const edge = bridge ? "#5e6862" : "#8d9272";
  box(ctx, 7, 7, 26, 26, edge);
  box(ctx, 9, 9, 22, 22, surface);
  if (u) {
    box(ctx, 7, 0, 26, 20, edge);
    box(ctx, 9, 0, 22, 20, surface);
  }
  if (d) {
    box(ctx, 7, 20, 26, 20, edge);
    box(ctx, 9, 20, 22, 20, surface);
  }
  if (l) {
    box(ctx, 0, 7, 20, 26, edge);
    box(ctx, 0, 9, 20, 22, surface);
  }
  if (r) {
    box(ctx, 20, 7, 20, 26, edge);
    box(ctx, 20, 9, 20, 22, surface);
  }
  if (bridge) {
    const horizontal = (l || r) && !(u || d);
    if (horizontal) {
      box(ctx, 0, 5, 40, 3, "#d8d4ae");
      box(ctx, 0, 32, 40, 3, "#464f4c");
      for (let x = 0; x < 40; x += 8) {
        box(ctx, x, 5, 2, 5, "#e2dab4");
        box(ctx, x, 30, 2, 6, "#979780");
      }
      for (let x = 4; x < 40; x += 8) box(ctx, x, 11, 1, 18, "#a09f89");
    } else {
      box(ctx, 5, 0, 3, 40, "#d8d4ae");
      box(ctx, 32, 0, 3, 40, "#464f4c");
      for (let y = 0; y < 40; y += 8) {
        box(ctx, 5, y, 5, 2, "#e2dab4");
        box(ctx, 30, y, 6, 2, "#979780");
      }
      for (let y = 4; y < 40; y += 8) box(ctx, 11, y, 18, 1, "#a09f89");
    }
  } else {
    if (u) box(ctx, 19, 2, 2, 5, "#d6cfac");
    if (d) box(ctx, 19, 34, 2, 4, "#d6cfac");
    if (l) box(ctx, 2, 19, 5, 2, "#d6cfac");
    if (r) box(ctx, 34, 19, 4, 2, "#d6cfac");
    box(ctx, 12, 13, 2, 1, "#c4bd99");
    box(ctx, 26, 25, 3, 1, "#a49f81");
  }
}
function paintMountain(ctx, tile) {
  const flip = hash(tile.x, tile.y) % 2;
  if (flip) {
    ctx.translate(40, 0);
    ctx.scale(-1, 1);
  }
  polygon(
    ctx,
    [
      [3, 34],
      [3, 30],
      [7, 30],
      [7, 24],
      [12, 24],
      [12, 17],
      [16, 17],
      [16, 10],
      [20, 10],
      [20, 5],
      [23, 5],
      [23, 10],
      [27, 10],
      [27, 17],
      [31, 17],
      [31, 25],
      [35, 25],
      [35, 31],
      [38, 31],
      [38, 36],
    ],
    "#536a56",
  );
  polygon(
    ctx,
    [
      [5, 32],
      [9, 24],
      [14, 24],
      [18, 15],
      [21, 8],
      [23, 8],
      [23, 31],
      [33, 35],
      [10, 35],
    ],
    "#a7aa84",
  );
  polygon(
    ctx,
    [
      [23, 8],
      [26, 15],
      [28, 20],
      [31, 26],
      [36, 33],
      [25, 34],
      [20, 30],
    ],
    "#7c8a70",
  );
  polygon(
    ctx,
    [
      [16, 17],
      [20, 9],
      [21, 5],
      [23, 5],
      [26, 14],
      [27, 17],
      [23, 15],
      [21, 18],
      [19, 15],
    ],
    "#e4dfbd",
  );
  box(ctx, 10, 28, 5, 2, "#bdba91");
  box(ctx, 15, 23, 3, 3, "#c6c29b");
  box(ctx, 27, 29, 3, 2, "#607660");
}
function paintBuilding(ctx, tile) {
  const p = palette(tile.owner);
  box(ctx, 3, 10, 34, 28, "#78876e");
  box(ctx, 4, 9, 32, 27, "#b2b294");
  box(ctx, 7, 12, 26, 21, "#c3c1a2");
  box(ctx, 29, 17, 7, 19, "#8b917b");
  if (tile.type === "factory") {
    box(ctx, 6, 16, 27, 17, "#777f70");
    box(ctx, 6, 12, 8, 6, p[2]);
    box(ctx, 14, 9, 8, 9, p[1]);
    box(ctx, 22, 12, 11, 6, p[2]);
    box(ctx, 7, 12, 7, 2, p[0]);
    box(ctx, 15, 9, 7, 2, p[0]);
    box(ctx, 23, 12, 9, 2, p[0]);
    box(ctx, 10, 22, 19, 11, "#394f4a");
    box(ctx, 12, 22, 15, 2, "#a6af9e");
    box(ctx, 12, 26, 15, 1, "#7f9585");
    box(ctx, 12, 29, 15, 1, "#7f9585");
    box(ctx, 29, 4, 4, 10, "#6f7a6a");
    box(ctx, 28, 3, 6, 3, "#b5b59a");
    box(ctx, 29, 4, 4, 1, "#455b50");
    box(ctx, 5, 32, 28, 3, "#d9cd9a");
    for (let x = 7; x < 32; x += 6) box(ctx, x, 33, 3, 2, "#8a835f");
  } else if (tile.type === "hq") {
    box(ctx, 8, 14, 23, 19, "#d5ccb0");
    box(ctx, 7, 12, 25, 5, p[2]);
    box(ctx, 10, 10, 19, 3, p[1]);
    box(ctx, 14, 6, 11, 5, p[0]);
    box(ctx, 9, 17, 3, 13, "#f3e3b7");
    box(ctx, 27, 17, 3, 13, "#b2b498");
    box(ctx, 17, 22, 7, 10, "#3e5855");
    box(ctx, 16, 18, 9, 2, "#799187");
    box(ctx, 7, 32, 26, 3, "#eddfb6");
    box(ctx, 5, 35, 30, 2, "#c7bd96");
    // The two-tone star is a distinct command-post insignia.
    box(ctx, 19, 10, 3, 6, "#ffe7aa");
    box(ctx, 17, 12, 7, 2, "#ffe7aa");
  } else {
    box(ctx, 7, 13, 12, 18, "#e3d5b0");
    box(ctx, 6, 10, 14, 6, p[2]);
    box(ctx, 8, 8, 10, 3, p[1]);
    box(ctx, 8, 9, 10, 1, p[0]);
    box(ctx, 21, 18, 12, 15, "#cecaab");
    box(ctx, 20, 15, 14, 5, p[2]);
    box(ctx, 22, 13, 10, 3, p[1]);
    box(ctx, 22, 14, 10, 1, p[0]);
    for (const [x, y] of [
      [9, 18],
      [15, 18],
      [9, 24],
      [23, 22],
      [29, 22],
    ]) {
      box(ctx, x, y, 3, 4, "#587575");
      box(ctx, x, y, 3, 1, "#385655");
    }
    box(ctx, 14, 25, 4, 7, "#6d7968");
    box(ctx, 25, 28, 4, 5, "#6d7968");
    box(ctx, 4, 33, 31, 2, "#d4c8a3");
  }
}
function paintTile(ctx, tile, neighbors) {
  ctx.save();
  ctx.translate(tile.x * TILE, tile.y * TILE);
  paintGround(ctx, tile);
  switch (tile.type) {
    case "water":
      paintWater(ctx, tile, neighbors);
      break;
    case "bridge":
      paintWater(ctx, tile, neighbors);
      paintRoad(ctx, neighbors, true);
      break;
    case "road":
      paintRoad(ctx, neighbors);
      break;
    case "forest":
      tree(ctx, 22, 4, 1, 1);
      tree(ctx, 2, 2);
      pine(ctx, 14, 12);
      tree(ctx, 2, 20, 0.9, 1);
      tree(ctx, 26, 24, 0.8);
      break;
    case "mountain":
      paintMountain(ctx, tile);
      break;
    case "city":
    case "factory":
    case "hq":
      paintBuilding(ctx, tile);
      break;
    default:
      if (hash(tile.x, tile.y, 5) % 9 === 0) {
        box(ctx, 29, 30, 3, 2, "#b9b68b");
        box(ctx, 31, 29, 3, 2, "#a7a87c");
      }
  }
  // Fine tile seams stay quiet even beneath deployment overlays.
  box(ctx, 39, 0, 1, 40, "rgba(31,59,51,.08)");
  box(ctx, 0, 39, 40, 1, "rgba(31,59,51,.08)");
  ctx.restore();
}

function paintUnit(ctx, unit, x, y, motion) {
  const p = palette(unit.owner);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  const resting = motion.action === "idle";
  if (unit.acted && resting) ctx.globalAlpha = 0.74;
  box(ctx, 6, 29, 29, 4, "rgba(24,45,42,.25)");
  box(ctx, 10, 33, 20, 1, "rgba(24,45,42,.15)");
  paintDirectionalMotion(ctx, unit.type, p, motion.direction || "right", motion.phase, motion.action);
  ctx.globalAlpha = 1;
  if (unit.acted && resting) {
    box(ctx, 3, 4, 9, 7, "rgba(27,48,43,.85)");
    box(ctx, 5, 7, 2, 2, "#d4ddbb");
    box(ctx, 7, 5, 3, 2, "#d4ddbb");
  }
  // Show the whole unit's strength, including the full 10/10 state.
  box(ctx, 9, 32, 29, 7, "#253f3e");
  box(ctx, 10, 33, Math.max(1, Math.ceil((27 * unit.hp) / 10)), 1, p[0]);
  ctx.fillStyle = unit.hp <= 3 ? "#ffad87" : "#fff2cf";
  ctx.font = "bold 8px ui-monospace, monospace";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.ceil(unit.hp)}/10`, 23.5, 36.5);
  if (unit.cargo) {
    box(ctx, 3, 27, 7, 8, "#263f3b");
    box(ctx, 5, 28, 3, 2, "#ffe4a3");
    box(ctx, 4, 31, 5, 3, "#ffe4a3");
  }
  if (unit.ammo === 0 || unit.fuel === 0) {
    box(ctx, 30, 3, 7, 8, "#ffe1a2");
    box(ctx, 33, 4, 1, 4, "#9c503d");
    box(ctx, 33, 9, 1, 1, "#9c503d");
  }
  ctx.restore();
}

function corners(ctx, x, y, color, inset = 1, length = 7, thickness = 2) {
  const s = TILE - inset * 2;
  x += inset;
  y += inset;
  for (const [cx, cy, dx, dy] of [
    [x, y, 1, 1],
    [x + s, y, -1, 1],
    [x, y + s, 1, -1],
    [x + s, y + s, -1, -1],
  ]) {
    box(
      ctx,
      dx < 0 ? cx - length : cx,
      dy < 0 ? cy - thickness : cy,
      length,
      thickness,
      color,
    );
    box(
      ctx,
      dx < 0 ? cx - thickness : cx,
      dy < 0 ? cy - length : cy,
      thickness,
      length,
      color,
    );
  }
}
function rangeTile(ctx, x, y, isTarget, index) {
  const ox = x * TILE,
    oy = y * TILE;
  box(
    ctx,
    ox + 1,
    oy + 1,
    38,
    38,
    isTarget ? "rgba(237,99,75,.30)" : "rgba(74,216,204,.23)",
  );
  const c = isTarget ? "rgba(255,153,122,.9)" : "rgba(150,248,222,.62)";
  corners(ctx, ox, oy, c, 2, isTarget ? 5 : 3, 1);
  if (isTarget) {
    box(ctx, ox + 17, oy + 4, 6, 1, "#ffd5b4");
    box(ctx, ox + 4, oy + 17, 1, 6, "#ffd5b4");
  } else if (index % 2 === 0)
    box(ctx, ox + 19, oy + 19, 2, 2, "rgba(199,255,232,.36)");
}

function heading(from, to) {
  if (to.x > from.x) return "right";
  if (to.x < from.x) return "left";
  return to.y > from.y ? "down" : "up";
}

export function movementPosition(path, elapsed, startFacing = "right") {
  if (!path?.length) return null;
  if (path.length === 1)
    return { ...path[0], direction: startFacing, turning: false, done: true };
  let remaining = Math.max(0, elapsed), previous = startFacing;
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i], to = path[i + 1];
    const direction = heading(from, to);
    if (direction !== previous) {
      if (remaining < MOVE_TURN_MS)
        return {
          x: from.x, y: from.y,
          direction: remaining < MOVE_TURN_MS / 2 ? previous : direction,
          turning: true, done: false,
        };
      remaining -= MOVE_TURN_MS;
    }
    if (remaining < MOVE_STEP_MS) {
      const local = remaining / MOVE_STEP_MS;
      const eased = local - (Math.sin(local * Math.PI * 2) * .35) / (Math.PI * 2);
      return {
        x: from.x + (to.x - from.x) * eased,
        y: from.y + (to.y - from.y) * eased,
        direction, turning: false, done: false,
      };
    }
    remaining -= MOVE_STEP_MS;
    previous = direction;
  }
  return { ...path[path.length - 1], direction: previous, turning: false, done: true };
}

// Reconstruct one exchange from consecutive authoritative game states. This also
// works for AI and LAN actions, where the local client has no pending command.
export function capturesFromStates(before, after) {
  if (!before || !after || before.mapId !== after.mapId) return [];
  const oldUnits = new Map(before.units.map((unit) => [unit.id, unit]));
  const oldTiles = new Map((before.tiles || []).map((tile) => [tileKey(tile.x, tile.y), tile]));
  const tiles = new Map((after.tiles || []).map((tile) => [tileKey(tile.x, tile.y), tile]));
  return after.units.flatMap((unit) => {
    const old = oldUnits.get(unit.id);
    const key = tileKey(unit.x, unit.y);
    const tile = tiles.get(key), previous = oldTiles.get(key);
    if (!old || old.acted || !unit.acted || !UNITS[unit.type]?.capture ||
      !tile || !previous || !["city", "factory", "hq"].includes(tile.type)) return [];
    if (tile.capture === previous.capture && tile.captureBy === previous.captureBy &&
      tile.owner === previous.owner) return [];
    return [{ unit, tile, previousTile: previous }];
  });
}

export function combatFromStates(before, after) {
  if (!before || !after || before.mapId !== after.mapId) return null;
  const capturing = new Set(capturesFromStates(before, after).map(({ unit }) => unit.id));
  const next = new Map(after.units.map((unit) => [unit.id, unit]));
  const damaged = before.units.filter((unit) => {
    const current = next.get(unit.id);
    return !current || current.hp < unit.hp;
  });
  const actors = before.units.filter((unit) => {
    const current = next.get(unit.id);
    return !unit.acted && (current?.acted || (!current && damaged.length > 1));
  });
  for (const attacker of actors) {
    if (capturing.has(attacker.id)) continue;
    const current = next.get(attacker.id);
    const definition = UNITS[attacker.type];
    for (const defender of damaged) {
      if (defender.owner === attacker.owner || defender.id === attacker.id)
        continue;
      const inRange = (position) => {
        const distance = Math.abs(position.x - defender.x) + Math.abs(position.y - defender.y);
        return distance >= definition.minRange && distance <= definition.maxRange;
      };
      let origin = current || attacker;
      if (!inRange(origin) && !current && before.players && before.tiles)
        origin = reachable(before, attacker.id).find(inRange);
      if (origin && !inRange(origin)) origin = null;
      if (!origin) continue;
      const defenderAfter = next.get(defender.id);
      return {
        attacker: { ...attacker, x: origin.x, y: origin.y, hpAfter: current?.hp ?? 0 },
        defender: { ...defender, hpAfter: defenderAfter?.hp ?? 0 },
        damage: defender.hp - (defenderAfter?.hp ?? 0),
        counter: attacker.hp - (current?.hp ?? 0),
      };
    }
  }
  return null;
}

// Keep the old sprite and HP on the map until that side is hit in the duel.
export function combatDisplayUnits(state, visual, time) {
  if (!visual || time >= visual.endAt) return state.units;
  const units = state.units.slice();
  for (const { unit, hitAt } of [
    { unit: visual.attacker, hitAt: visual.counterHitAt },
    { unit: visual.defender, hitAt: visual.defenderHitAt },
  ]) {
    if (time >= hitAt) continue;
    const index = units.findIndex((item) => item.id === unit.id);
    if (index < 0) units.push({ ...unit });
    else units[index] = { ...units[index], hp: unit.hp, acted: unit.acted };
  }
  return units;
}

export function createRenderer(
  canvas,
  { onTile = () => {}, onHover = () => {}, onHold = () => {}, onDrag = () => {}, onDragEnd = () => {}, onCombat = () => {}, onCapture = () => {}, paintPropertyFlag = null, previewUnitMotion = null } = {},
) {
  if (!canvas || typeof canvas.getContext !== "function")
    throw new Error("需要 Canvas 画布");
  const ctx = canvas.getContext("2d", { alpha: false });
  const terrainCanvas = document.createElement("canvas");
  const terrainCtx = terrainCanvas.getContext("2d", { alpha: false });
  let scene = {
    state: null,
    selectedId: null,
    reachable: [],
    targets: [],
    hoverTile: null,
    preview: null,
    hoverPreview: null,
    arrowPath: null,
    arrowTone: "own",
  };
  let frame = null,
    destroyed = false,
    terrainDirty = true,
    lastFrameTime = 0;
  let logicalWidth = 0,
    logicalHeight = 0,
    dpr = 1,
    lastPointerKey = null;
  // 长按/拖拽：按住不动 HOLD_MS 进入箭头模式，此后拖动即拉出箭头。
  //
  // 阈值调参依据（2026-09-30 实测，别凭感觉改）：
  //  - HOLD_MS：原 120ms 会让「快手」(按下到抬起 50~110ms) 全部漏掉。
  //    实测 50/70/90/110ms 四次快抬手，旧阈值 4 个全漏。
  //    人的极快点击（mousedown→mouseup）约 40~90ms，而「意图长按」一般在 100ms 后就稳定。
  //    取 60ms：快点击边缘能覆盖，同时常规点击(>60ms)不会误触发拖拽。
  //  - HOLD_SLOP：原 6px 太小，按住时手/鼠标的轻微抖动(4~12px)会把长按取消掉。
  //    实测 4px 和 12px 抖动各取消过一次。放到 14px：
  //    既容得下手抖，又能在「明显想滑动」时正常取消。
  const HOLD_MS = 60,
    HOLD_SLOP = 14;
  let pressTimer = null,
    pressOrigin = { x: 0, y: 0 },
    pressTile = null,
    longPressed = false,
    suppressClick = false,
    dragPath = null,
    dragging = false,
    // 拖拽上报去重用的「上一次光标格」。与 dragPath（渲染结果）分开，
    // 见 pressMove 里的说明。
    lastDragKey = null;
  function cancelPressTimer() {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  }
  let previousState = null;
  let movement = new Map();
  let explosions = [];
  let actionEvents = [];
  let captureVisuals = new Map();
  let combatVisual = null;
  let unitById = new Map();
  let lastTerrainSignature = "";
  const reducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
  canvas.style.imageRendering = "pixelated";
  canvas.style.touchAction = "manipulation";
  canvas.style.display = "block";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "战术地图，点击格子选择单位与行动");

  function size() {
    if (!scene.state) return;
    const width = scene.state.width * TILE,
      height = scene.state.height * TILE;
    const newDpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    if (width !== logicalWidth || height !== logicalHeight || dpr !== newDpr) {
      logicalWidth = width;
      logicalHeight = height;
      dpr = newDpr;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.aspectRatio = `${width} / ${height}`;
      terrainCanvas.width = width;
      terrainCanvas.height = height;
      terrainDirty = true;
    }
    ctx.imageSmoothingEnabled = false;
  }
  function rebuildTerrain() {
    const state = scene.state;
    if (!state) return;
    terrainCtx.imageSmoothingEnabled = false;
    terrainCtx.fillStyle = "#789669";
    terrainCtx.fillRect(0, 0, logicalWidth, logicalHeight);
    const lookup = new Map(state.tiles.map((t) => [tileKey(t.x, t.y), t]));
    for (const tile of state.tiles) {
      const visual = captureVisuals.get(tileKey(tile.x, tile.y));
      const paintedTile = visual?.completed
        ? { ...tile, owner: visual.previousOwner } : tile;
      paintTile(terrainCtx, paintedTile, {
        up: lookup.get(tileKey(tile.x, tile.y - 1)),
        down: lookup.get(tileKey(tile.x, tile.y + 1)),
        left: lookup.get(tileKey(tile.x - 1, tile.y)),
        right: lookup.get(tileKey(tile.x + 1, tile.y)),
      });
    }
    terrainDirty = false;
  }
  function setScene(next) {
    if (destroyed) return;
    const state = next.state || scene.state;
    if (state && state !== previousState) {
      const now = performance.now();
      if (
        !reducedMotion &&
        previousState &&
        previousState.mapId === state.mapId &&
        previousState.width === state.width
      ) {
        const exchange = combatFromStates(previousState, state);
        const oldUnits = new Map(previousState.units.map((u) => [u.id, u]));
        for (const u of state.units) {
          const old = oldUnits.get(u.id);
          if (old && (old.x !== u.x || old.y !== u.y)) {
            const route = reachable(previousState, old.id).find(
              (cell) => cell.x === u.x && cell.y === u.y,
            );
            if (route?.path.length > 1)
              movement.set(u.id, {
                path: route.path,
                start: now,
                startFacing: "right",
                duration: movementDuration(route.path),
              });
          }
          if (old && old.type === "apc" && !old.acted && u.acted) {
            const move = movement.get(u.id);
            const delay = move ? Math.max(0, move.start + move.duration - now) : 0;
            actionEvents.push({ id: u.id, action: "supply", start: now + delay, duration: 1050 });
          }
        }
        for (const { unit, tile, previousTile } of capturesFromStates(previousState, state)) {
          const move = movement.get(unit.id);
          const delay = move ? Math.max(0, move.start + move.duration - now) : 0;
          const completed = tile.owner === unit.owner && previousTile.owner !== unit.owner;
          const capture = {
            owner: unit.owner,
            previousOwner: previousTile.owner,
            progressBefore: previousTile.captureBy === unit.owner ? 20 - previousTile.capture : 0,
            progressAfter: completed ? 20 : 20 - tile.capture,
            completed,
            start: now + delay,
            duration: captureDuration(completed),
          };
          captureVisuals.set(tileKey(tile.x, tile.y), capture);
          if (completed) terrainDirty = true;
          onCapture({
            unit,
            tile,
            previousOwner: capture.previousOwner,
            progressBefore: capture.progressBefore,
            progressAfter: capture.progressAfter,
            completed,
            delay,
            duration: capture.duration,
          });
        }
        const attackingMove = exchange ? movement.get(exchange.attacker.id) : null;
        const travelDelay = attackingMove
          ? Math.max(0, attackingMove.start + attackingMove.duration - now)
          : 0;
        const battleStart = now + travelDelay;
        if (exchange) {
          const attackerAt = state.units.find((unit) => unit.id === exchange.attacker.id) || exchange.attacker;
          const terrainAt = (unit) => state.tiles.find((tile) => tile.x === unit.x && tile.y === unit.y)?.type || "plain";
          combatVisual = {
            attacker: { ...exchange.attacker, x: attackerAt.x, y: attackerAt.y },
            defender: exchange.defender,
            defenderHitAt: battleStart + COMBAT_TIMING.firstHit,
            counterHitAt: exchange.counter > 0 ? battleStart + COMBAT_TIMING.counterHit : Infinity,
            endAt: battleStart + combatDuration(exchange.counter),
          };
          onCombat({
            ...exchange,
            attackerTerrain: terrainAt(attackerAt),
            defenderTerrain: terrainAt(exchange.defender),
            delay: travelDelay,
          });
        }
        if (exchange) {
          const { attacker, defender, counter } = exchange;
          const attackerAt = state.units.find((unit) => unit.id === attacker.id) || attacker;
          actionEvents.push({
            id: attacker.id, action: "attack", start: battleStart + COMBAT_TIMING.firstFire - 180, duration: 450,
            direction: heading(attackerAt, defender),
          });
          actionEvents.push({ id: defender.id, action: "hit", start: combatVisual.defenderHitAt, duration: 500 });
          if (counter > 0) {
            actionEvents.push({
              id: defender.id, action: "attack", start: battleStart + COMBAT_TIMING.counterFire - 180, duration: 450,
              direction: heading(defender, attackerAt),
            });
            actionEvents.push({ id: attacker.id, action: "hit", start: combatVisual.counterHitAt, duration: 500 });
          }
        }
        for (const u of state.units) {
          const old = oldUnits.get(u.id);
          if (old && old.hp > u.hp) {
            const start = exchange?.defender.id === u.id
              ? combatVisual.defenderHitAt
              : exchange?.attacker.id === u.id && exchange.counter > 0
                ? combatVisual.counterHitAt : now;
            explosions.push({ x: u.x, y: u.y, start, destroyed: false });
          }
        }
        for (const old of oldUnits.values()) {
          if (exchange && (old.id === exchange.attacker.id || old.id === exchange.defender.id) &&
            !state.units.some((u) => u.id === old.id)) {
            const position = old.id === exchange.attacker.id ? combatVisual.attacker : old;
            explosions.push({
              x: position.x, y: position.y, type: old.type, owner: old.owner, destroyed: true,
              start: exchange?.defender.id === old.id
                ? combatVisual.defenderHitAt
                : exchange?.attacker.id === old.id && exchange.counter > 0
                  ? combatVisual.counterHitAt : now,
            });
          }
        }
        for (const id of movement.keys())
          if (!state.units.some((u) => u.id === id) && combatVisual?.attacker.id !== id) movement.delete(id);
      } else {
        movement.clear();
        explosions = [];
        actionEvents = [];
        captureVisuals.clear();
        combatVisual = null;
      }
      unitById = new Map(state.units.map((u) => [u.id, u]));
      previousState = state;
    }
    scene = { ...scene, ...next, state };
    if (state) {
      const signature =
        `${state.width}:${state.height}:` +
        state.tiles.map((t) => `${t.type}:${t.owner ?? "-"}`).join("|");
      if (signature !== lastTerrainSignature) {
        terrainDirty = true;
        lastTerrainSignature = signature;
      }
      size();
      canvas.setAttribute(
        "aria-label",
        `战术地图 ${state.width} 列 ${state.height} 行，第 ${state.day || 1} 天。点击格子选择单位与行动。`,
      );
    }
    draw(performance.now());
  }
  function paintDynamics(time) {
    const state = scene.state;
    for (const tile of state.tiles) {
      const x = tile.x * TILE,
        y = tile.y * TILE;
      if (tile.type === "water" || tile.type === "bridge") {
        if (tile.type === "water") {
          const wave = Math.floor(time / 700 + (hash(tile.x, tile.y) % 5)) % 4;
          const shift = wave > 1 ? 2 : 0;
          box(ctx, x + 12 + shift, y + 12, 8, 1, "#7ab0b4");
          box(ctx, x + 18 + shift, y + 13, 4, 1, "#689fa9");
          box(ctx, x + 23 - shift, y + 28, 7, 1, "#79afb4");
          box(ctx, x + 9, y + 31, 3, 1, "#4e8796");
        }
      }
      if (["city", "factory", "hq"].includes(tile.type)) {
        if (paintPropertyFlag?.(ctx, tile, time) !== true) {
          const pose = propertyFlagPose(tile, captureVisuals.get(tileKey(tile.x, tile.y)), time);
          if (pose.owner != null) {
            const p = palette(pose.owner);
            const fy = Math.round(y + pose.offset);
            box(ctx, x + 4, y - 17, 2, 35, "#304b43");
            box(ctx, x + 3, y - 18, 4, 2, "#eee1ba");
            box(ctx, x + 6, fy, 11, 7, p[2]);
            box(ctx, x + 6, fy, 10, 3, p[0]);
            box(ctx, x + 14, fy + 3, 4, 3, p[1]);
            box(ctx, x + 6, fy + 6, 8, 1, p[3]);
          }
        }
        if (tile.capture < 20 && tile.captureBy != null) {
          box(ctx, x + 5, y + 36, 30, 3, "#324d44");
          box(
            ctx,
            x + 5,
            y + 36,
            Math.round((30 * (20 - tile.capture)) / 20),
            3,
            TEAM_COLORS[tile.captureBy % 4],
          );
        }
      }
    }
  }
  // 拉拽箭头配色：己方用本作已有的红（与「可攻击目标」同色系），敌方只读用灰。
  const ARROW_TONES = {
    own: {
      core: "#e0523f",
      edge: "rgba(90,22,14,.85)",
      head: "#ffd5b4",
      tail: "#ffe8d6",
    },
    enemy: {
      core: "rgba(148,158,156,.9)",
      edge: "rgba(38,48,47,.8)",
      head: "#d6dedc",
      tail: "#e6ecea",
    },
  };
  function arrowTone() {
    return ARROW_TONES[scene.arrowTone] || ARROW_TONES.own;
  }
  /**
   * 画「移动箭头」——《高级战争》那套红色路线箭头。
   * 优先用上层钉住/正在拖拽的 arrowPath；没有时退回旧的 preview 单点逻辑。
   */
  function paintPath() {
    const pinned = scene.arrowPath;
    let points = null;
    if (pinned && pinned.length >= 2) {
      points = pinned.map((t) => [t.x * TILE + 20, t.y * TILE + 20]);
    } else {
      const preview = scene.preview;
      if (!preview || !scene.selectedId) return;
      const unit = unitById.get(scene.selectedId);
      if (!unit) return;
      const destination = scene.reachable?.find(
        (t) => t.x === preview.x && t.y === preview.y,
      );
      const raw = destination?.path || [];
      const path = raw.length
        ? [{ x: unit.x, y: unit.y }, ...raw]
        : [{ x: unit.x, y: unit.y }, preview];
      if (path.length < 2) return;
      points = path.map((t) => [t.x * TILE + 20, t.y * TILE + 20]);
    }
    const tone = arrowTone();
    // 先画深色描边，再压上亮色芯线 —— 保证在青色范围格上也看得清。
    line(ctx, points, tone.edge, 7);
    line(ctx, points, tone.core, 4);
    // 起点圆点：单位所在位置
    const [startX, startY] = points[0];
    box(ctx, startX - 4, startY - 4, 8, 8, tone.edge);
    box(ctx, startX - 3, startY - 3, 6, 6, tone.tail);
    // 末端三角箭头，指向最后一个拐点（单格时朝右）
    const [endX, endY] = points[points.length - 1];
    const [prevX, prevY] = points[points.length - 2] || [endX - TILE, endY];
    arrowHead(ctx, prevX, prevY, endX, endY, tone);
  }
  /** 在 (toX,toY) 处画一个指向方向的三角箭头。 */
  function arrowHead(ctx, fromX, fromY, toX, toY, tone) {
    let dx = toX - fromX,
      dy = toY - fromY;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const size = 11,
      spread = 7;
    const tipX = toX + dx * size,
      tipY = toY + dy * size;
    const leftX = toX - dy * spread,
      leftY = toY + dx * spread;
    const rightX = toX + dy * spread,
      rightY = toY - dx * spread;
    // 描边三角（略大一圈）
    polygon(
      ctx,
      [
        [tipX + dx * 2, tipY + dy * 2],
        [leftX - dx * 1 - dy * 2, leftY - dy * 1 + dx * 2],
        [rightX - dx * 1 + dy * 2, rightY - dy * 1 - dx * 2],
      ],
      tone.edge,
    );
    polygon(
      ctx,
      [
        [tipX, tipY],
        [leftX, leftY],
        [rightX, rightY],
      ],
      tone.head,
    );
  }
  function draw(time = performance.now()) {
    if (destroyed || !scene.state || !logicalWidth) return;
    if (reducedMotion) time = 0;
    const state = scene.state;
    for (const [key, visual] of captureVisuals)
      if (time >= visual.start + visual.duration) {
        captureVisuals.delete(key);
        if (visual.completed) terrainDirty = true;
      }
    if (terrainDirty) rebuildTerrain();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(terrainCanvas, 0, 0);
    paintDynamics(time);
    for (let i = 0; i < (scene.reachable?.length || 0); i++) {
      const t = scene.reachable[i];
      rangeTile(ctx, t.x, t.y, false, i);
    }
    for (let i = 0; i < (scene.hoverPreview?.length || 0); i++) {
      const t = scene.hoverPreview[i];
      rangeTile(ctx, t.x, t.y, false, i);
    }
    for (const target of scene.targets || []) {
      const u = typeof target === "string" ? unitById.get(target) : target;
      if (u) rangeTile(ctx, u.x, u.y, true, 0);
    }
    paintPath();
    actionEvents = actionEvents.filter((event) => time < event.start + event.duration);
    if (combatVisual && time >= combatVisual.endAt) combatVisual = null;
    const displayUnits = combatDisplayUnits(state, combatVisual, time);
    const loadedIds = new Set(
      state.units
        .filter((u) => u.cargo)
        .map((u) => (typeof u.cargo === "string" ? u.cargo : u.cargo.id)),
    );
    const units = displayUnits
      .filter((u) => !loadedIds.has(u.id) && !u.carriedBy && !u.transportId)
      .slice()
      .sort((a, b) => a.y - b.y || a.x - b.x);
    for (const u of units) {
      let ux = u.x * TILE,
        uy = u.y * TILE;
      let motion = {
        action: "idle",
        phase: (time / (u.type === "mech" ? 2100 : 1500) + (hash(u.x, u.y) % 7) / 7) % 1,
        direction: "right",
      };
      const move = movement.get(u.id);
      let moving = false;
      if (move) {
        const elapsed = Math.max(0, time - move.start);
        const position = movementPosition(move.path, elapsed, move.startFacing);
        ux = position.x * TILE;
        uy = position.y * TILE;
        if (position.done) movement.delete(u.id);
        else {
          const gaitMs = u.type === "mech" ? 600
            : u.type === "infantry" ? 480 : 400;
          motion = {
            action: position.turning ? "turn" : "move",
            phase: (elapsed % gaitMs) / gaitMs,
            direction: position.direction,
          };
          moving = true;
        }
      }
      const event = [...actionEvents].reverse().find((item) =>
        item.id === u.id && time >= item.start && time < item.start + item.duration,
      );
      if (event && !moving)
        motion = {
          action: event.action,
          phase: (time - event.start) / event.duration,
          direction: event.direction || "right",
        };
      paintUnit(ctx, u, ux, uy, previewUnitMotion?.(u, time) || motion);
    }
    explosions = explosions.filter((e) => time - e.start < (e.destroyed ? 1450 : 430));
    for (const e of explosions) {
      if (time < e.start) continue;
      if (e.destroyed) {
        const age = time - e.start;
        if (deathEffectKind(e.type) === "fall")
          paintFallingSoldier(ctx, e.type, palette(e.owner), age, e.x * TILE, e.y * TILE);
        else
          paintVehicleBlast(ctx, age, e.x * TILE + 20, e.y * TILE + 20, .55);
        continue;
      }
      const t = (time - e.start) / 430;
      const cx = e.x * TILE + 20,
        cy = e.y * TILE + 20;
      ctx.globalAlpha = 1 - t;
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        box(
          ctx,
          cx + Math.cos(angle) * t * 20 - 2,
          cy + Math.sin(angle) * t * 20 - 2,
          4,
          4,
          i % 2 ? "#ffdc90" : "#fff4ce",
        );
      }
      if (t < 0.4) {
        box(ctx, cx - 4, cy - 12, 8, 24, "#ffdf9c");
        box(ctx, cx - 12, cy - 4, 24, 8, "#fff0ba");
      }
      ctx.globalAlpha = 1;
    }
    const selected = scene.selectedId ? unitById.get(scene.selectedId) : null;
    if (selected) {
      const inset = Math.floor(time / 360) % 2 ? 0 : 2;
      corners(
        ctx,
        selected.x * TILE,
        selected.y * TILE,
        "#264b42",
        inset,
        10,
        4,
      );
      corners(
        ctx,
        selected.x * TILE,
        selected.y * TILE,
        "#fff2c0",
        inset + 1,
        8,
        2,
      );
      box(ctx, selected.x * TILE + 17, selected.y * TILE - 1, 6, 3, "#fff2c0");
    }
    if (scene.preview)
      corners(
        ctx,
        scene.preview.x * TILE,
        scene.preview.y * TILE,
        "#edffe0",
        2,
        9,
        2,
      );
    if (
      scene.hoverTile &&
      (!selected ||
        scene.hoverTile.x !== selected.x ||
        scene.hoverTile.y !== selected.y)
    ) {
      const t = scene.hoverTile;
      corners(ctx, t.x * TILE, t.y * TILE, "rgba(255,246,210,.8)", 1, 7, 1);
    }
    // A slim map-edge bevel anchors the board without obstructing tiles.
    box(ctx, 0, 0, logicalWidth, 1, "rgba(229,236,190,.3)");
    box(ctx, 0, logicalHeight - 1, logicalWidth, 1, "rgba(23,47,44,.25)");
  }
  function tick(time) {
    if (destroyed) return;
    // 帧率上限：原为 `> 32`（约 30fps），是「极速拖动时画面跟不上手」的原因之一。
    // 实测单帧 draw() 仅 0.115ms（地形走离屏缓存），完全没有压到 30fps 的必要。
    // 放到 `> 8`（约 120fps）——不是要跑满 120，而是让每个 rAF 都能刷新，
    // 由浏览器自己的 vsync 决定实际帧率（通常 60fps）。这消除的是「人为降帧」，
    // 真正的渲染成本仍由单帧 0.115ms 决定，不会因此吃满 CPU。
    if (
      !reducedMotion &&
      time - lastFrameTime > 8 &&
      !document.hidden &&
      (!canvas.getClientRects || canvas.getClientRects().length)
    ) {
      draw(time);
      lastFrameTime = time;
    }
    frame = requestAnimationFrame(tick);
  }
  function eventTile(event) {
    const state = scene.state;
    if (!state) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    // CSS may constrain the element's height independently from its width.
    // Hit testing follows the actual object-fit content, excluding letterboxes.
    const style =
      typeof getComputedStyle === "function" ? getComputedStyle(canvas) : null;
    const px = (name) => parseFloat(style?.[name]) || 0;
    const leftInset = px("borderLeftWidth") + px("paddingLeft");
    const topInset = px("borderTopWidth") + px("paddingTop");
    const boxWidth =
      rect.width - leftInset - px("borderRightWidth") - px("paddingRight");
    const boxHeight =
      rect.height - topInset - px("borderBottomWidth") - px("paddingBottom");
    let contentWidth = boxWidth,
      contentHeight = boxHeight;
    let contentLeft = rect.left + leftInset,
      contentTop = rect.top + topInset;
    if (
      style?.objectFit === "contain" ||
      style?.objectFit === "cover" ||
      style?.objectFit === "scale-down"
    ) {
      const ratios = [boxWidth / logicalWidth, boxHeight / logicalHeight];
      const ratio =
        style.objectFit === "cover" ? Math.max(...ratios) : Math.min(...ratios);
      contentWidth = logicalWidth * ratio;
      contentHeight = logicalHeight * ratio;
      const position = (style.objectPosition || "50% 50%").split(/\s+/);
      const offset = (value, space) => {
        if (value === "left" || value === "top") return 0;
        if (value === "right" || value === "bottom") return space;
        if (!value || value === "center") return space / 2;
        return value.endsWith("%")
          ? ((parseFloat(value) || 0) * space) / 100
          : parseFloat(value) || 0;
      };
      contentLeft += offset(position[0], boxWidth - contentWidth);
      contentTop += offset(position[1], boxHeight - contentHeight);
    }
    const x = Math.floor(
      ((event.clientX - contentLeft) / contentWidth) * state.width,
    );
    const y = Math.floor(
      ((event.clientY - contentTop) / contentHeight) * state.height,
    );
    if (x < 0 || y < 0 || x >= state.width || y >= state.height) return null;
    return { x, y };
  }
  function click(event) {
    if (suppressClick) return;
    const tile = eventTile(event);
    if (tile) onTile(tile.x, tile.y);
  }
  function hover(event) {
    if (event.pointerType === "touch") return;
    const tile = eventTile(event);
    const key = tile ? tileKey(tile.x, tile.y) : null;
    if (key === lastPointerKey) return;
    lastPointerKey = key;
    if (tile) onHover(tile.x, tile.y);
    else {
      scene.hoverTile = null;
      draw();
    }
  }
  function leave() {
    lastPointerKey = null;
    scene.hoverTile = null;
    draw();
  }
  // 长按/拖拽：按住不动 HOLD_MS 进入箭头模式，此后拖动即拉出箭头。
  function pressStart(event) {
    if (event.button != null && event.button !== 0) return;
    const tile = eventTile(event);
    if (!tile) return;
    pressOrigin = { x: event.clientX, y: event.clientY };
    pressTile = tile;
    dragPath = null;
    dragging = false;
    lastDragKey = null;
    cancelPressTimer();
    pressTimer = setTimeout(() => {
      pressTimer = null;
      longPressed = true;
      dragging = true;
      canvas.classList.add("dragging");
      onHold(tile.x, tile.y);
    }, HOLD_MS);
  }
  function pressMove(event) {
    if (pressTimer) {
      // 还没进入箭头模式：移动超过容差即视为滑动，取消长按
      if (
        Math.abs(event.clientX - pressOrigin.x) > HOLD_SLOP ||
        Math.abs(event.clientY - pressOrigin.y) > HOLD_SLOP
      )
        cancelPressTimer();
      return;
    }
    if (!dragging) return;
    // 已进入箭头模式：拖动不再取消，转为把光标位置喂给上层算箭头。
    //
    // ★ 去重口径（2026-09-30 修正，这里原先是「极速拖动没反应」的元凶）：
    // 旧代码用 `dragPath` 的**终点**去重。但上层 setArrowPath 存进 dragPath 的是
    // 「回退后的合法落点」——快速划过一片不可达区域时，连续多次 pointermove 算出的
    // 合法落点完全相同 → 第 2 次起全被 return 掉。实测 100 次 move 只过了 4 次。
    //
    // 正确口径：按**光标所在格**去重。光标格真的变了就必须上报，
    // 否则上层没法更新「玩家现在指哪儿」。用独立的 lastDragKey 记录，
    // 不再和 dragPath（那是渲染结果）混用。
    const tile = eventTile(event);
    if (!tile) return;
    const key = tileKey(tile.x, tile.y);
    if (key === lastDragKey) return;
    lastDragKey = key;
    onDrag(tile.x, tile.y);
  }
  function pressEnd() {
    const wasDragging = dragging;
    // ★ 抑制 click 的真实判据：这次按下**是否真的拖拽过**（光标是否移动过）。
    //
    // 原先用 `longPressed`（=是否进入过长按模式）当判据，在 HOLD_MS 降到 60ms 后出问题：
    // 一次普通的「慢慢点击」（按住 80~150ms）也会被判成长按 → suppressClick=true
    // → 紧随其后的 click 被吃掉 → 表现成「点一下没反应，兵不走 / 取消不了选择」。
    //
    // 正确口径：只有「长按 + 光标确实移动过」才算拖拽，才需要抑制 click。
    // 单纯按住不动再松手（没拖）= 仍然是一次点击，必须放行。
    const reallyDragged = wasDragging && lastDragKey !== null;
    cancelPressTimer();
    dragging = false;
    longPressed = false;
    dragPath = null;
    lastDragKey = null;
    canvas.classList.remove("dragging");
    // 长按且真的拖动过时，抑制紧随其后的 click（避免被当成"点了一下"）
    if (reallyDragged) {
      suppressClick = true;
      setTimeout(() => {
        suppressClick = false;
      }, 0);
    }
    if (wasDragging) onDragEnd();
  }
  canvas.addEventListener("click", click);
  canvas.addEventListener("pointermove", hover);
  canvas.addEventListener("pointermove", pressMove);
  canvas.addEventListener("pointerleave", leave);
  canvas.addEventListener("pointerdown", pressStart);
  canvas.addEventListener("pointerup", pressEnd);
  canvas.addEventListener("pointercancel", pressEnd);
  const observer =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          size();
          draw();
        })
      : null;
  observer?.observe(canvas);
  const onWindowResize = () => {
    size();
    draw();
  };
  window.addEventListener("resize", onWindowResize);
  frame = requestAnimationFrame(tick);
  return {
    setScene,
    setHoverPreview(cells) {
      if (destroyed) return;
      const next = cells && cells.length ? cells : null;
      const prev = scene.hoverPreview;
      if (!next && !prev) return;
      if (
        next &&
        prev &&
        next.length === prev.length &&
        next[0]?.x === prev[0]?.x &&
        next[0]?.y === prev[0]?.y &&
        next[next.length - 1]?.x === prev[prev.length - 1]?.x &&
        next[next.length - 1]?.y === prev[prev.length - 1]?.y
      )
        return;
      scene.hoverPreview = next;
      draw(performance.now());
    },
    setArrowPath(path, tone = "own") {
      if (destroyed) return;
      const next = path && path.length >= 2 ? path : null;
      scene.arrowPath = next;
      scene.arrowTone = tone;
      // 记录给拖拽去重使用
      dragPath = next;
      draw(performance.now());
    },
    render: () => draw(performance.now()),
    resize: () => {
      size();
      draw(performance.now());
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      cancelPressTimer();
      dragging = false;
      dragPath = null;
      lastDragKey = null;
      canvas.classList.remove("dragging");
      observer?.disconnect();
      canvas.removeEventListener("click", click);
      canvas.removeEventListener("pointermove", hover);
      canvas.removeEventListener("pointermove", pressMove);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("pointerdown", pressStart);
      canvas.removeEventListener("pointerup", pressEnd);
      canvas.removeEventListener("pointercancel", pressEnd);
      window.removeEventListener("resize", onWindowResize);
      movement.clear();
      explosions = [];
      actionEvents = [];
      captureVisuals.clear();
    },
  };
}
