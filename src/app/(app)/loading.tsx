/**
 * Co se ukáže, než dorazí data další obrazovky.
 *
 * Bez tohohle souboru Next po kliknutí nedělá nic viditelného: čeká, až
 * server pošle celou stránku, a teprve pak přepne. Na mobilu to znamená
 * několik vteřin, kdy zůstává stará obrazovka a aplikace vypadá, že se
 * zasekla — člověk klikne podruhé a potřetí.
 *
 * S ním se přepne okamžitě a čeká se nad kostrou, která má tvar toho, co
 * přijde. Vedle dojmu je tu i měřitelný důvod: `<Link>` u dynamických
 * stránek předem stahuje právě tuhle hranici, takže se část cesty ujde
 * dřív, než člověk vůbec klikne.
 *
 * Kostra je schválně obecná — jedna pro celou aplikaci. Přesná kopie
 * každé obrazovky by se rozešla s pravdou při první změně a blikala by
 * víc, než pomohla.
 */
export default function Nacitani() {
  return (
    <div className="animate-pop-in space-y-4" aria-busy aria-label="Načítá se">
      <div className="space-y-2">
        <div className="skeleton h-7 w-48 rounded-lg" />
        <div className="skeleton h-4 w-32 rounded-md" />
      </div>

      <div className="skeleton h-20 rounded-2xl" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="skeleton h-28 rounded-2xl" />
        <div className="skeleton h-28 rounded-2xl" />
      </div>

      <div className="skeleton h-56 rounded-2xl" />
      <div className="skeleton h-40 rounded-2xl" />
    </div>
  );
}
