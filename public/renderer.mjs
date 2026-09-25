/** Original procedural pixel artwork for Frontline Command. No external assets. */
import { UNITS, TERRAINS } from "./shared/engine.mjs";

export const TEAM_COLORS = ["#ef745e", "#64b7e8", "#edcb66", "#9c8ce6"];
const TILE = 40;
const TEAM_PALETTES = [
  ["#f79a75", "#df634c", "#a83c36", "#713134"],
  ["#91d5ef", "#4ba5d1", "#2e668f", "#29415f"],
  ["#ffe499", "#dfbd56", "#a27b33", "#6a522d"],
  ["#c2acef", "#9278ce", "#634da0", "#44385f"],
];
const GRASS = ["#76966b", "#7d9e70", "#749468", "#809d71"];
const INK = "#233f40";
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

function shadow(ctx, wide = false) {
  box(ctx, wide ? 3 : 8, 28, wide ? 33 : 24, 5, "rgba(24,45,42,.27)");
  box(ctx, wide ? 6 : 11, 32, wide ? 27 : 18, 2, "rgba(24,45,42,.14)");
}
function tracks(ctx, heavy = false) {
  const left = heavy ? 5 : 8,
    right = heavy ? 29 : 27;
  box(ctx, left, 12, 6, 19, "#263e3e");
  box(ctx, right, 12, 6, 19, "#263e3e");
  for (let y = 13; y < 30; y += 4) {
    box(ctx, left + 1, y, 4, 2, "#71837b");
    box(ctx, right + 1, y, 4, 2, "#647971");
  }
}
function wheels(ctx) {
  box(ctx, 6, 16, 5, 6, "#283f3e");
  box(ctx, 6, 26, 5, 6, "#283f3e");
  box(ctx, 29, 16, 5, 6, "#283f3e");
  box(ctx, 29, 26, 5, 6, "#283f3e");
  box(ctx, 7, 17, 2, 3, "#738075");
  box(ctx, 30, 27, 2, 3, "#738075");
}
function soldier(ctx, p, x, y, mech = false) {
  box(ctx, x + 3, y + 15, 4, 6, INK);
  box(ctx, x + 10, y + 15, 4, 6, INK);
  box(ctx, x + 3, y + 20, 6, 2, "#273c39");
  box(ctx, x + 10, y + 20, 6, 2, "#273c39");
  box(ctx, x + 1, y + 7, 14, 10, p[2]);
  box(ctx, x + 3, y + 6, 10, 9, p[1]);
  box(ctx, x + 3, y + 7, 4, 5, p[0]);
  box(ctx, x + 4, y + 2, 9, 7, "#dcb995");
  box(ctx, x + 11, y + 5, 3, 2, "#374b43");
  box(ctx, x + 2, y, 12, 5, p[2]);
  box(ctx, x + 4, y - 2, 8, 4, p[1]);
  box(ctx, x + 4, y - 1, 6, 1, p[0]);
  box(ctx, x + 2, y + 4, 13, 2, p[3]);
  if (mech) {
    box(ctx, x + 9, y + 9, 13, 5, "#344d48");
    box(ctx, x + 10, y + 8, 10, 2, "#9aa892");
    box(ctx, x + 21, y + 8, 3, 7, "#344b44");
    box(ctx, x + 1, y + 8, 4, 8, "#788968");
  } else {
    box(ctx, x + 10, y + 11, 12, 2, "#293f3c");
    box(ctx, x + 10, y + 13, 4, 3, "#455349");
    box(ctx, x + 12, y + 10, 3, 2, "#e4c29c");
  }
}
function paintUnit(ctx, unit, x, y, time, selected = false) {
  const p = palette(unit.owner);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (unit.acted) ctx.globalAlpha = 0.74;
  shadow(ctx, ["heavy", "rocket"].includes(unit.type));
  switch (unit.type) {
    case "infantry":
      soldier(ctx, p, 6, 10);
      break;
    case "mech":
      soldier(ctx, p, 5, 9, true);
      break;
    case "recon":
      wheels(ctx);
      box(ctx, 10, 12, 20, 18, p[3]);
      box(ctx, 10, 13, 18, 15, p[1]);
      box(ctx, 12, 10, 14, 5, p[0]);
      box(ctx, 12, 16, 14, 5, "#344d49");
      box(ctx, 13, 16, 5, 3, "#a9cac0");
      box(ctx, 20, 16, 5, 3, "#779d93");
      box(ctx, 12, 22, 14, 6, p[0]);
      box(ctx, 13, 24, 12, 2, p[1]);
      box(ctx, 11, 28, 4, 2, "#f5ddb0");
      box(ctx, 24, 28, 4, 2, "#f5ddb0");
      box(ctx, 25, 7, 1, 6, INK);
      break;
    case "heavy":
    case "tank": {
      const heavy = unit.type === "heavy";
      tracks(ctx, heavy);
      box(ctx, heavy ? 10 : 12, 11, heavy ? 20 : 16, 20, p[3]);
      box(ctx, heavy ? 10 : 12, 12, heavy ? 19 : 15, 16, p[1]);
      box(ctx, heavy ? 10 : 12, 12, heavy ? 18 : 14, 3, p[0]);
      box(ctx, heavy ? 11 : 13, 26, heavy ? 17 : 13, 3, p[2]);
      box(ctx, heavy ? 12 : 14, 15, heavy ? 17 : 13, 10, p[3]);
      box(ctx, heavy ? 12 : 14, 14, heavy ? 16 : 12, 9, p[1]);
      box(ctx, heavy ? 13 : 15, 14, heavy ? 13 : 9, 2, p[0]);
      box(ctx, 17, 16, 6, 5, p[2]);
      box(ctx, 18, 16, 4, 2, p[0]);
      box(ctx, 23, 17, heavy ? 15 : 13, heavy ? 5 : 4, p[3]);
      box(ctx, 24, 17, heavy ? 13 : 11, heavy ? 3 : 2, p[0]);
      if (heavy) {
        box(ctx, 12, 27, 4, 3, "#efdda9");
        box(ctx, 24, 27, 4, 3, "#efdda9");
      }
      break;
    }
    case "artillery":
      tracks(ctx);
      box(ctx, 12, 12, 17, 18, p[3]);
      box(ctx, 12, 13, 16, 14, p[1]);
      box(ctx, 12, 13, 16, 3, p[0]);
      box(ctx, 13, 18, 13, 8, p[2]);
      box(ctx, 14, 17, 11, 4, p[1]);
      // Long, stepped diagonal barrel distinguishes the indirect gun.
      box(ctx, 21, 14, 5, 9, p[3]);
      box(ctx, 24, 11, 5, 8, p[3]);
      box(ctx, 27, 8, 5, 7, p[3]);
      box(ctx, 30, 5, 5, 7, p[3]);
      box(ctx, 22, 14, 3, 7, p[0]);
      box(ctx, 25, 11, 3, 6, p[0]);
      box(ctx, 28, 8, 3, 5, p[0]);
      box(ctx, 31, 5, 3, 5, p[0]);
      box(ctx, 30, 4, 6, 3, "#324d46");
      break;
    case "rocket":
      wheels(ctx);
      box(ctx, 10, 11, 20, 20, p[3]);
      box(ctx, 11, 12, 17, 17, p[1]);
      box(ctx, 12, 24, 15, 6, p[0]);
      box(ctx, 13, 25, 13, 3, "#4c6a65");
      box(ctx, 11, 7, 19, 16, p[2]);
      box(ctx, 11, 7, 17, 14, p[0]);
      for (let rx = 13; rx <= 25; rx += 6) {
        box(ctx, rx, 6, 3, 13, "#445e54");
        box(ctx, rx, 7, 2, 10, "#d6d7b6");
        box(ctx, rx, 4, 3, 3, "#4b6054");
      }
      box(ctx, 11, 20, 19, 3, p[3]);
      break;
    case "apc":
      tracks(ctx);
      box(ctx, 11, 11, 19, 20, p[3]);
      box(ctx, 11, 11, 18, 17, p[1]);
      box(ctx, 12, 11, 16, 4, p[0]);
      box(ctx, 13, 16, 13, 9, p[2]);
      box(ctx, 14, 17, 11, 7, p[1]);
      box(ctx, 18, 17, 3, 7, "#ece3bd");
      box(ctx, 16, 19, 7, 3, "#ece3bd");
      box(ctx, 12, 28, 4, 2, "#efd3a1");
      box(ctx, 24, 28, 4, 2, "#efd3a1");
      break;
    default:
      soldier(ctx, p, 6, 10);
  }
  ctx.globalAlpha = 1;
  if (unit.acted) {
    box(ctx, 3, 4, 9, 7, "rgba(27,48,43,.85)");
    box(ctx, 5, 7, 2, 2, "#d4ddbb");
    box(ctx, 7, 5, 3, 2, "#d4ddbb");
  }
  // Always-visible, quiet team bar makes full-health units unambiguous.
  box(ctx, 11, 34, 20, 2, "#29443f");
  box(ctx, 11, 34, Math.max(1, Math.ceil((20 * unit.hp) / 10)), 2, p[0]);
  if (unit.hp < 10) {
    box(ctx, 28, 27, 10, 10, "#253f3e");
    ctx.fillStyle = unit.hp <= 3 ? "#ffad87" : "#fff2cf";
    ctx.font = "bold 9px ui-monospace, monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(String(Math.ceil(unit.hp)), 33, 32);
  }
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

export function createRenderer(
  canvas,
  { onTile = () => {}, onHover = () => {} } = {},
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
  };
  let frame = null,
    destroyed = false,
    terrainDirty = true,
    lastFrameTime = 0;
  let logicalWidth = 0,
    logicalHeight = 0,
    dpr = 1,
    lastPointerKey = null;
  let previousState = null;
  let movement = new Map();
  let explosions = [];
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
      paintTile(terrainCtx, tile, {
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
        const oldUnits = new Map(previousState.units.map((u) => [u.id, u]));
        movement = new Map();
        for (const u of state.units) {
          const old = oldUnits.get(u.id);
          if (old && (old.x !== u.x || old.y !== u.y))
            movement.set(u.id, {
              x: old.x,
              y: old.y,
              start: now,
              duration: Math.min(
                440,
                140 + (Math.abs(old.x - u.x) + Math.abs(old.y - u.y)) * 45,
              ),
            });
          if (old && old.hp > u.hp)
            explosions.push({ x: u.x, y: u.y, start: now });
        }
        for (const old of oldUnits.values()) {
          if (!state.units.some((u) => u.id === old.id))
            explosions.push({ x: old.x, y: old.y, start: now });
        }
      } else {
        movement.clear();
        explosions = [];
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
        const p = palette(tile.owner);
        const flutter = Math.floor(time / 420 + tile.x + tile.y) % 2;
        box(ctx, x + 4, y + 3, 1, 14, "#344f43");
        box(ctx, x + 5, y + 3, 8, 5, p[2]);
        box(ctx, x + 5, y + 3, 7, 3, p[0]);
        box(ctx, x + 11, y + 3 + flutter, 3, 4, p[1]);
        box(ctx, x + 3, y + 2, 3, 2, "#e3dab0");
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
  function paintPath() {
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
    const points = path.map((t) => [t.x * TILE + 20, t.y * TILE + 20]);
    line(ctx, points, "rgba(25,66,57,.75)", 5);
    line(ctx, points, "#dcf5ce", 2);
    const [endX, endY] = points[points.length - 1];
    box(ctx, endX - 3, endY - 3, 6, 6, "#edffe0");
    box(ctx, endX - 1, endY - 1, 2, 2, "#72a690");
  }
  function draw(time = performance.now()) {
    if (destroyed || !scene.state || !logicalWidth) return;
    if (reducedMotion) time = 0;
    const state = scene.state;
    if (terrainDirty) rebuildTerrain();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(terrainCanvas, 0, 0);
    paintDynamics(time);
    for (let i = 0; i < (scene.reachable?.length || 0); i++) {
      const t = scene.reachable[i];
      rangeTile(ctx, t.x, t.y, false, i);
    }
    for (const target of scene.targets || []) {
      const u = typeof target === "string" ? unitById.get(target) : target;
      if (u) rangeTile(ctx, u.x, u.y, true, 0);
    }
    paintPath();
    const loadedIds = new Set(
      state.units
        .filter((u) => u.cargo)
        .map((u) => (typeof u.cargo === "string" ? u.cargo : u.cargo.id)),
    );
    const units = state.units
      .filter((u) => !loadedIds.has(u.id) && !u.carriedBy && !u.transportId)
      .slice()
      .sort((a, b) => a.y - b.y || a.x - b.x);
    for (const u of units) {
      let ux = u.x * TILE,
        uy = u.y * TILE;
      const move = movement.get(u.id);
      if (move) {
        const t = Math.min(1, Math.max(0, (time - move.start) / move.duration));
        const eased = 1 - Math.pow(1 - t, 2);
        ux = (move.x + (u.x - move.x) * eased) * TILE;
        uy = (move.y + (u.y - move.y) * eased) * TILE;
        if (t >= 1) movement.delete(u.id);
      }
      paintUnit(ctx, u, ux, uy, time, scene.selectedId === u.id);
    }
    explosions = explosions.filter((e) => time - e.start < 430);
    for (const e of explosions) {
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
    if (
      !reducedMotion &&
      time - lastFrameTime > 32 &&
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
  canvas.addEventListener("click", click);
  canvas.addEventListener("pointermove", hover);
  canvas.addEventListener("pointerleave", leave);
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
    render: () => draw(performance.now()),
    resize: () => {
      size();
      draw(performance.now());
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      canvas.removeEventListener("click", click);
      canvas.removeEventListener("pointermove", hover);
      canvas.removeEventListener("pointerleave", leave);
      window.removeEventListener("resize", onWindowResize);
      movement.clear();
      explosions = [];
    },
  };
}
