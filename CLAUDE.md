@AGENTS.md

# Jak odpovídat

Ke každé změně, která se má dostat na server, přidej **hotové příkazy do
konzole** — v pořadí, ve kterém se pouštějí, připravené ke zkopírování.
Ne popis kroků, ale to, co se dá vložit do terminálu.

Součástí je vždycky:

1. co spustit v Supabase (které migrace, nebo že žádné nejsou),
2. příkazy na serveru od `ssh` po restart,
3. čím se ověří, že to opravdu běží.

Server: `ssh root@37.27.249.24`, aplikace v `/opt/klidoo`, větev
`claude/shared-custody-app-cv411b`.
