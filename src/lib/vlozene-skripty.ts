/**
 * Skripty vložené přímo do `<head>` kořenového layoutu.
 *
 * Jsou ve vlastním souboru kvůli CSP: proxy z nich počítá otisk
 * (`sha256-…`), kterým je v aplikaci povolí. Otisk sedí jen na přesně
 * tentýž text — proto se oba čtou odsud, ne z kopie. Změna textu tady
 * se do politiky propíše sama.
 */

/**
 * Ruční volba tématu se propíše třídou na <html> ještě před prvním
 * vykreslením. Bez uložené volby rozhoduje `prefers-color-scheme` v CSS,
 * takže tmavý režim funguje i s vypnutým JavaScriptem.
 */
export const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('rp-theme');
    if (stored === 'dark' || stored === 'light') {
      document.documentElement.classList.add(stored);
    }
  } catch (e) {}
})();
`;

/**
 * Dvě věci, které musí proběhnout dřív, než se rozjede React.
 *
 * Chrome pošle `beforeinstallprompt` hned po načtení stránky. Kdyby na
 * něj čekala až komponenta, událost by v tu chvíli byla dávno pryč
 * a tlačítko „Přidat na plochu" by se neukázalo nikdy. Proto se odchytí
 * tady a schová na `window`; komponenta si pro ni přijde, až se
 * připojí, a o změně se dozví přes vlastní událost.
 *
 * A service worker se registruje pro každého, ne až při zapnutí
 * notifikací. Chrome bez něj přidání na plochu vůbec nenabídne —
 * kontrola instalovatelnosti vyžaduje service worker s `fetch`
 * obsluhovačem, a ten teď v `sw.js` je.
 */
export const INSTALACE_SCRIPT = `
(function () {
  window.__klidooVyzva = null;
  function oznam() {
    window.dispatchEvent(new Event('klidoo-instalace'));
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.__klidooVyzva = e;
    oznam();
  });
  window.addEventListener('appinstalled', function () {
    window.__klidooVyzva = null;
    oznam();
  });
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }
})();
`;
