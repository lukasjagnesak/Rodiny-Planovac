// Ikona 512×512 a úvodní grafika 1024×500 pro Google Play → mobil/obchody/
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const cil = path.join(__dirname, "..", "obchody");
fs.mkdirSync(cil, { recursive: true });
const kruhy = (cx1, cx2, cy, r) => `
  <defs><clipPath id="z"><circle cx="${cx1}" cy="${cy}" r="${r}"/></clipPath></defs>
  <circle cx="${cx1}" cy="${cy}" r="${r}" fill="#2c8671"/>
  <circle cx="${cx2}" cy="${cy}" r="${r}" fill="#cf7b66"/>
  <circle cx="${cx2}" cy="${cy}" r="${r}" fill="#24412d" clip-path="url(#z)"/>`;
(async () => {
  await sharp(path.join(__dirname, "..", "assets", "icon-only.png")).resize(512).png().toFile(path.join(cil, "ikona-512.png"));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500">
    <rect width="1024" height="500" fill="#fdf7f0"/>
    ${kruhy(190, 270, 250, 115)}
    <text x="430" y="225" font-family="DejaVu Sans, sans-serif" font-size="68" font-weight="700" fill="#2b2521">Klidoo</text>
    <text x="432" y="290" font-family="DejaVu Sans, sans-serif" font-size="34" fill="#5c534c">Dvě domácnosti. Jedno dětství.</text>
    <text x="432" y="340" font-family="DejaVu Sans, sans-serif" font-size="24" fill="#7a7068">Kalendář péče, předávky, kroužky a výdaje</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(cil, "uvodni-grafika-1024x500.png"));
  console.log("hotovo");
})();
