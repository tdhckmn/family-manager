// Generates all favicon and app icon PNGs from the mountain SVG design.
// Run: npm run gen-favicons
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "../public");

// Base icon — dark background, main peak + far peak + snow cap + horizon
const BASE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="#06091a"/>
  <polygon points="74,36 96,80 52,80" fill="#1a3a5a"/>
  <polygon points="50,10 84,80 16,80" fill="#5db88a"/>
  <polygon points="50,10 56,28 44,28" fill="#dedad0" opacity="0.88"/>
  <line x1="8" y1="82" x2="92" y2="82" stroke="#5db88a" stroke-width="3.5" stroke-linecap="round" opacity="0.4"/>
</svg>`;

// Maskable icon — full background fill, mountain scaled into 80% safe zone
const MASKABLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#06091a"/>
  <g transform="translate(10,10) scale(0.8)">
    <polygon points="74,36 96,80 52,80" fill="#1a3a5a"/>
    <polygon points="50,10 84,80 16,80" fill="#5db88a"/>
    <polygon points="50,10 56,28 44,28" fill="#dedad0" opacity="0.88"/>
    <line x1="8" y1="82" x2="92" y2="82" stroke="#5db88a" stroke-width="3.5" stroke-linecap="round" opacity="0.4"/>
  </g>
</svg>`;

// Apple touch icon — opaque square background (no alpha), sized for iOS home screen
const APPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#06091a"/>
  <polygon points="74,36 96,80 52,80" fill="#1a3a5a"/>
  <polygon points="50,10 84,80 16,80" fill="#5db88a"/>
  <polygon points="50,10 56,28 44,28" fill="#dedad0" opacity="0.88"/>
  <line x1="8" y1="82" x2="92" y2="82" stroke="#5db88a" stroke-width="3.5" stroke-linecap="round" opacity="0.4"/>
</svg>`;

const OG_SVG = fs.readFileSync(path.join(PUBLIC, "og-image.svg"), "utf8");

const ICONS = [
  { file: "favicon-16.png",        svg: BASE_SVG,     size: 16  },
  { file: "favicon-32.png",        svg: BASE_SVG,     size: 32  },
  { file: "apple-touch-icon.png",  svg: APPLE_SVG,    size: 180 },
  { file: "icon-192.png",          svg: BASE_SVG,     size: 192 },
  { file: "icon-512.png",          svg: BASE_SVG,     size: 512 },
  { file: "icon-maskable-512.png", svg: MASKABLE_SVG, size: 512 },
];

const { Resvg } = await import("@resvg/resvg-js");

for (const { file, svg, size } of ICONS) {
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: size } });
  const pngBuffer = resvg.render().asPng();
  fs.writeFileSync(path.join(PUBLIC, file), pngBuffer);
  console.log(`✓ ${file} (${size}×${size})`);
}

// OG image — fixed 1200×630
const ogResvg = new Resvg(OG_SVG, { fitTo: { mode: "width", value: 1200 } });
const ogPng = ogResvg.render().asPng();
fs.writeFileSync(path.join(PUBLIC, "og-image.png"), ogPng);
console.log("✓ og-image.png (1200×630)");
