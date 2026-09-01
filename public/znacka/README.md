# Značka Klidoo — soubory ke stažení

Hotové obrázky pro místa, kam se logo nahrává ručně: Stripe, fakturační
systém, sociální sítě, tiskoviny. V aplikaci a na webu se logo kreslí
z kódu (`src/components/ui/logo.tsx`), tyhle soubory jsou pro okolní svět.

| Soubor | Rozměr | Kde použít |
| --- | --- | --- |
| `ikona-512.png` | 512 × 512 | Stripe *icon*, profilovky, favicon do cizích služeb |
| `logo-svetle.png` | 1024 × 256 | Stripe *logo*, faktury, cokoli na bílém |
| `logo-pruhledne.png` | 1024 × 256 | vlastní podklad — pozadí je průhledné |
| `logo-tmave.png` | 1024 × 256 | tmavý podklad (`#211f1d`) |

## Barvy

- rodič A `#2c8671`, rodič B `#cf7b66`, průnik `#24412d`
- podklad ikony `#fdf7f0`, text loga `#2a2724` (na tmavém `#f7f2ec`)
- barva značky do formulářů (Stripe „brand color"): `#2c8671`

Průnik koleček vzniká v aplikaci prolnutím barev (multiply na světlém,
screen na tmavém). V `logo-pruhledne.png` prolnout nejde — pod obrázkem
není nic, s čím by se prolínalo — a průnik je proto vybarvený napevno
výslednou barvou. Kdyby se barvy značky měnily, je potřeba přepočítat
i `#24412d`.

Písmo nápisu je **Baloo 2, řez 600**, stejné jako v aplikaci.
