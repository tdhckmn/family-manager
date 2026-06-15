// Generates public/og-image.svg and public/og-image.png for Equanimity share cards.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "../public");

// Pine tree: three layered triangles + trunk
function tree(cx, base, h, col = "#030b18") {
  const p = (x, y) => `${Math.round(x)},${Math.round(y)}`;
  return [
    `<polygon points="${p(cx - h * 0.40, base)} ${p(cx + h * 0.40, base)} ${p(cx, base - h * 0.38)}" fill="${col}"/>`,
    `<polygon points="${p(cx - h * 0.29, base - h * 0.28)} ${p(cx + h * 0.29, base - h * 0.28)} ${p(cx, base - h * 0.63)}" fill="${col}"/>`,
    `<polygon points="${p(cx - h * 0.19, base - h * 0.53)} ${p(cx + h * 0.19, base - h * 0.53)} ${p(cx, base - h)}" fill="${col}"/>`,
  ].join("\n    ");
}

const STARS = [
  [55, 38, 1.2, 0.8], [130, 22, 0.9, 0.65], [195, 58, 1.4, 0.85],
  [280, 30, 1.0, 0.7], [355, 15, 1.3, 0.9], [440, 50, 0.8, 0.6],
  [520, 28, 1.5, 0.8], [600, 65, 1.1, 0.7], [680, 22, 1.3, 0.85],
  [760, 48, 0.9, 0.65], [840, 18, 1.4, 0.9], [75, 120, 1.0, 0.65],
  [160, 105, 1.2, 0.75], [245, 135, 0.8, 0.6], [330, 115, 1.3, 0.8],
  [415, 140, 1.0, 0.7], [500, 95, 1.1, 0.65], [565, 140, 1.4, 0.8],
  [635, 115, 0.9, 0.7], [710, 145, 1.2, 0.75], [785, 110, 0.8, 0.6],
  [38, 195, 1.1, 0.65], [118, 178, 1.3, 0.75], [210, 200, 0.9, 0.6],
  [300, 185, 1.2, 0.8], [390, 205, 1.0, 0.65], [480, 175, 1.4, 0.8],
  [1060, 35, 1.2, 0.8], [1110, 68, 0.9, 0.65], [1155, 28, 1.5, 0.9],
  [1185, 95, 1.0, 0.7], [1025, 115, 1.3, 0.75], [1070, 150, 0.8, 0.6],
  [1130, 140, 1.4, 0.8], [1175, 185, 1.0, 0.7], [875, 155, 1.2, 0.75],
  [940, 120, 0.9, 0.65], [995, 175, 1.1, 0.7],
];

// Near trees (foreground)
const NEAR_TREES = [
  [32, 540, 88], [88, 540, 108], [148, 540, 78], [206, 540, 98],
  [270, 540, 68], [338, 540, 92], [408, 540, 80], [482, 540, 72],
  [558, 540, 100], [636, 540, 84], [714, 540, 74], [792, 540, 96],
  [868, 540, 70], [942, 540, 90], [1018, 540, 82], [1090, 540, 98],
  [1155, 540, 73], [1195, 540, 92],
];

// Mid trees (smaller, between hills and near trees)
const MID_TREES = [
  [110, 502, 52], [235, 500, 46], [370, 503, 55], [505, 500, 48],
  [645, 502, 58], [785, 500, 50], [928, 502, 56], [1065, 500, 48],
];

const starsEl = STARS.map(([x, y, r, o]) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="#dedad0" opacity="${o}"/>`
).join("\n  ");

const nearTreesEl = NEAR_TREES.map(([cx, b, h]) => tree(cx, b, h, "#030b18")).join("\n    ");
const midTreesEl = MID_TREES.map(([cx, b, h]) => tree(cx, b, h, "#040e1e")).join("\n    ");

const SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#020510"/>
      <stop offset="60%" stop-color="#050c22"/>
      <stop offset="100%" stop-color="#07152e"/>
    </linearGradient>
    <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#c8d8e8" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#c8d8e8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="horizonGlow" cx="50%" cy="85%" r="65%">
      <stop offset="0%" stop-color="#5db88a" stop-opacity="0.22"/>
      <stop offset="55%" stop-color="#5db88a" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#5db88a" stop-opacity="0"/>
    </radialGradient>
    <mask id="moonMask">
      <rect width="1200" height="630" fill="white"/>
      <circle cx="998" cy="95" r="56" fill="black"/>
    </mask>
  </defs>

  <!-- Sky -->
  <rect width="1200" height="630" fill="url(#sky)"/>
  <rect width="1200" height="630" fill="url(#horizonGlow)"/>

  <!-- Stars -->
  ${starsEl}

  <!-- Moon -->
  <circle cx="972" cy="112" r="92" fill="url(#moonGlow)"/>
  <circle cx="972" cy="112" r="54" fill="#e0dcd0" opacity="0.88" mask="url(#moonMask)"/>

  <!-- Far mountains -->
  <path d="M0,430 L0,268 L72,240 L148,286 L228,218 L315,268 L408,192 L505,248 L608,178 L708,224 L812,182 L912,238 L1012,172 L1110,228 L1200,192 L1200,430 Z" fill="#0a1630" opacity="0.95"/>

  <!-- Mid mountains -->
  <path d="M0,495 L0,365 L95,335 L178,385 L285,305 L382,368 L492,290 L602,338 L714,298 L835,368 L942,318 L1055,368 L1155,328 L1200,352 L1200,495 Z" fill="#071020" opacity="0.97"/>

  <!-- Near hills -->
  <path d="M0,548 Q80,518 180,530 Q320,546 468,505 Q618,464 775,512 Q935,562 1090,514 Q1152,500 1200,524 L1200,548 Z" fill="#050c1a"/>

  <!-- Mid trees (background layer) -->
  ${midTreesEl}

  <!-- Near trees (foreground) -->
  ${nearTreesEl}

  <!-- Ground -->
  <rect y="540" width="1200" height="90" fill="#030814"/>

  <!-- Branding — lower left, above the treeline on the left gap -->
  <text x="64" y="474" font-family="Georgia, 'Times New Roman', serif" font-size="48" font-weight="bold" fill="#dedad0" opacity="0.92" letter-spacing="2">Equanimity</text>
  <text x="66" y="508" font-family="Arial, Helvetica, sans-serif" font-size="19" fill="#8a9eb0" opacity="0.82" letter-spacing="0.5">Household management for a steady mind.</text>
</svg>`;

const svgOut = path.join(PUBLIC, "og-image.svg");
fs.writeFileSync(svgOut, SVG);
console.log("✓ og-image.svg");

try {
  const { Resvg } = await import("@resvg/resvg-js");
  const resvg = new Resvg(SVG, { fitTo: { mode: "width", value: 1200 } });
  const rendered = resvg.render();
  const pngBuffer = rendered.asPng();
  fs.writeFileSync(path.join(PUBLIC, "og-image.png"), pngBuffer);
  console.log("✓ og-image.png");
} catch (err) {
  console.error("PNG conversion failed:", err.message);
  console.log("Run: npx svgexport public/og-image.svg public/og-image.png 1200:");
}
