-- ═══════════════════════════════════════════════════════════════════
--  Přístup zdarma pro rodiny, které pošle mediátor, advokát, OSPOD
--  nebo soud.
--
--  Rodina, která přijde přes partnerský kód, má období zdarma
--  `zdarma_mesicu` měsíců od založení (výchozí 12). U OSPOD a soudů
--  bez provize — veřejná instituce provizi brát nemůže a nesmí to ani
--  tak vypadat. Proto `provize_procento` 0 a typ, podle kterého se to
--  pozná i za rok.
--
--  Prodloužení dělá server (`/api/doporuceni`) hned po zapsání
--  doporučení. Platící rodině ani rodině s delším obdobím se nic
--  nezkracuje.
--
--  Spustit lze opakovaně.
-- ═══════════════════════════════════════════════════════════════════

alter table partneri
  add column if not exists zdarma_mesicu int not null default 12;

alter table partneri drop constraint if exists partneri_typ_check;
-- Ručně založení partneři mohli dostat jiný popis typu; nic se neztratí,
-- jen se z něj stane „jiny".
update partneri set typ = 'jiny'
where typ not in ('mediator', 'advokat', 'ospod', 'soud', 'poradna', 'jiny');
alter table partneri
  add constraint partneri_typ_check
  check (typ in ('mediator', 'advokat', 'ospod', 'soud', 'poradna', 'jiny'));

alter table partneri drop constraint if exists partneri_zdarma_check;
alter table partneri
  add constraint partneri_zdarma_check check (zdarma_mesicu between 0 and 36);

-- Rodinám, které už přes partnera přišly, se období dopočítá stejně.
update predplatna p
set plati_do = f.created_at + make_interval(months => pa.zdarma_mesicu),
    updated_at = now()
from doporuceni d
join partneri pa on pa.id = d.partner_id
join families f on f.id = d.family_id
where p.family_id = d.family_id
  and p.stav in ('zkusebni', 'vyprsel')
  and p.stripe_subscription_id is null
  and f.created_at + make_interval(months => pa.zdarma_mesicu) > p.plati_do;

update predplatna p
set stav = 'zkusebni'
from doporuceni d
where p.family_id = d.family_id
  and p.stav = 'vyprsel'
  and p.plati_do > now();
