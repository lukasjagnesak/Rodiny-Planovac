-- ═══════════════════════════════════════════════════════════════════
--  Střídání podle sudého a lichého kalendářního týdne
--
--  V Česku se rozvrhy péče často zapisují jako „sudý týden táta,
--  lichý máma“. Číslo týdne je podle ISO 8601 — stejné, jaké ukazuje
--  školní rozvrh i většina kalendářů.
--
--  U tohoto vzoru se `anchor_side` čte jako „strana, která má SUDÝ
--  týden“; lichý pak automaticky připadá druhé straně. `anchor_date`
--  se nepoužívá.
-- ═══════════════════════════════════════════════════════════════════

alter type pattern_kind add value if not exists 'iso_week_parity';
