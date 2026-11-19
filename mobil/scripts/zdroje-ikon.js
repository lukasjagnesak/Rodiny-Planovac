// Zdrojové obrázky pro @capacitor/assets z ikony Klidoo (public/icons/icon.svg).
// Průnik kruhů je nakreslený výslovně — librsvg neumí mix-blend-mode.
const sharp = require("sharp");
const kruhy = (cx1, cx2, cy, r) => `
  <defs><clipPath id="z"><circle cx="${cx1}" cy="${cy}" r="${r}"/></clipPath></defs>
  <circle cx="${cx1}" cy="${cy}" r="${r}" fill="#2c8671"/>
  <circle cx="${cx2}" cy="${cy}" r="${r}" fill="#cf7b66"/>
  <circle cx="${cx2}" cy="${cy}" r="${r}" fill="#24412d" clip-path="url(#z)"/>`;
// Kruhy v souřadnicích 512 → měřítko s.
const logo = (stred, s) => kruhy(stred - 51 * s, stred + 51 * s, stred, 126 * s);
const svg = (w, obsah, pozadi) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w}" viewBox="0 0 ${w} ${w}">${pozadi ? `<rect width="${w}" height="${w}" fill="${pozadi}"/>` : ""}${obsah}</svg>`);
(async () => {
  await sharp(svg(1024, logo(512, 2), "#fdf7f0")).flatten({ background: "#fdf7f0" }).png().toFile("assets/icon-only.png");
  // Adaptivní ikona Androidu: bezpečná zóna je vnitřních 66 %.
  await sharp(svg(1024, logo(512, 1.45))).png().toFile("assets/icon-foreground.png");
  await sharp(svg(1024, "", "#fdf7f0")).png().toFile("assets/icon-background.png");
  await sharp(svg(2732, logo(1366, 2.2), "#fdf7f0")).png().toFile("assets/splash.png");
  await sharp(svg(2732, logo(1366, 2.2), "#1d2a26")).png().toFile("assets/splash-dark.png");
  console.log("hotovo");
})();
