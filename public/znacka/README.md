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
- barva akce (tlačítka) `#2c8671` — stejná jako `--brand` v `globals.css`

## Nastavení Stripe

Stripe má dvě dvojice polí a jejich názvy pletou:

| Pole | Co obarví | Naše hodnota |
| --- | --- | --- |
| Brand color | tlačítka na účtenkách, fakturách a v zákaznickém portálu | `#2c8671` |
| Accent color | **podklad** e-mailů a stránek, ne tlačítko | `#fdf7f0` |
| Checkout → Button color | tlačítko „Zaplatit" | `#2c8671` |
| Checkout → Background color | podklad platební stránky | `#fdf7f0` |

Terakota do Stripe nepatří. Ve značce je to barva druhého rodiče, ne barva
akce — a na tlačítku má s bílým textem kontrast 3,14 : 1, což je pod hranicí
čitelnosti. Zelená má 4,42 : 1.

Průnik koleček vzniká v aplikaci prolnutím barev (multiply na světlém,
screen na tmavém). V `logo-pruhledne.png` prolnout nejde — pod obrázkem
není nic, s čím by se prolínalo — a průnik je proto vybarvený napevno
výslednou barvou. Kdyby se barvy značky měnily, je potřeba přepočítat
i `#24412d`.

Písmo nápisu je **Baloo 2, řez 600**, stejné jako v aplikaci.
