-- ═══════════════════════════════════════════════════════════════════
--  Výchozí předání přehozeno z večera na ráno
--
--  `predavka_vecer = true` (dosavadní výchozí hodnota) znamená: dítě
--  spí poslední noc pobytu už u přebírajícího rodiče — takže den,
--  který rodič v rozpisu zaškrtne jako svůj první, je ve skutečnosti
--  až DRUHÝ den jeho pobytu; první noc "ukradne" předchozímu dni.
--  V kalendáři se to kreslí jako přepůlený den PŘED tím, co si rodič
--  zaškrtl — a `day-sheet.tsx` mu k tomu ještě napíše „Tenhle den se
--  předává", i když on žádný takový den nezaškrtával.
--
--  Nikde v appce není políčko, kterým by si rodina `predavka_vecer`
--  sama nastavila — `wizard.tsx` i `custody-settings.tsx` ho při
--  ukládání vzoru vůbec neposílají a spoléhají na výchozí hodnotu
--  sloupce. Nikdo si tedy `true` nikdy nezvolil, jen ho každý dostal.
--
--  Rodina zadá „u nás jsou děti od čtvrtka do pondělí" tak, že ve
--  vzoru zaškrtne čtvrtek až pondělí jako svoje dny. Přirozené čtení
--  je: čtvrtek je první den pobytu, i ta noc už je jejich. Tomu
--  odpovídá `predavka_vecer = false` — proto se mění výchozí hodnota
--  i všechny stávající vzory, které si nikdo vědomě nenastavil jinak.
-- ═══════════════════════════════════════════════════════════════════

alter table custody_patterns alter column predavka_vecer set default false;

update custody_patterns set predavka_vecer = false where predavka_vecer = true;

comment on column custody_patterns.predavka_vecer is
  'true = zaškrtnutý den je až druhý den pobytu, první noc patří ještě '
  'odcházejícímu rodiči (předává se večer). '
  'false (výchozí) = zaškrtnutý den je celý včetně noci u přebírajícího '
  'rodiče — přesně jak si ho rodina v rozpisu zaškrtla.';
