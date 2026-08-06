# Remexo – aplikace

Webová aplikace, přes kterou lidé v Brně a okolí zadávají poptávky na řemeslné
práce a řemeslníci na ně posílají nabídky. Zákazník vyfotí problém a popíše ho,
asistent Bořek z toho vytvoří srozumitelné zadání a řemeslníci z okolí se ozvou
sami s cenou a termínem.

Marketingový web je v samostatném repozitáři `web-remexo`.

## Stav projektu

**Před spuštěním.** Ostrý provoz plánujeme na podzim 2026, začínáme v Brně.

Aby README nesvádělo k představě hotového produktu, tady je rozdělené, co
opravdu běží a co je teprve rozdělané:

| Funguje | Zatím ne |
|---|---|
| Registrace a přihlášení (Supabase Auth) | Ověřování řemeslníků (zatím jen kontrola IČO ručně) |
| Zadání poptávky s fotkami | Platby přes platformu |
| Příprava zadání přes Bořka (Gemini) | Úschova peněz (escrow) – v rozhraní je, ale bez napojení |
| Tržiště zakázek se seznamem a mapou | Pojištění zakázek |
| Nabídky řemeslníků a jejich výběr | Katalog řemesel |
| Chat mezi zákazníkem a řemeslníkem | |
| Hodnocení po dokončení | |
| Profily uživatelů | |

Do textů v aplikaci nepiš, že fungují věci z pravého sloupce. Systémový prompt
Bořka to má výslovně zakázané a stejné pravidlo platí i pro rozhraní.

## Použité technologie

* **Frontend:** HTML, CSS, JavaScript (vanilla ES6), Tailwind CSS
* **Backend a databáze:** Supabase (PostgreSQL, Auth, Storage, Realtime)
* **AI:** Gemini `gemini-3.5-flash` přes vlastní serverless funkci na Vercelu
* **Mapy:** Leaflet.js + OpenStreetMap
* **Ikony:** Font Awesome 6
* **Hosting:** Vercel

### Pozor na Tailwind

Tailwind **není** načítaný z `cdn.tailwindcss.com`. To je JIT kompilátor, který
stáhne zhruba 400 kB JavaScriptu a CSS staví až v prohlížeči — na mobilu to
stálo vteřiny navíc. Místo toho je v repozitáři předpřipravený `tailwind.css`.

**Když přidáš novou Tailwind třídu, musíš CSS přegenerovat**, jinak se
neprojeví:

```bash
npx tailwindcss -c tailwind.config.js -i input.css -o tailwind.css --minify
```

Konfigurace (barvy `remexo`, `darkMode: "class"`) musí odpovídat tomu, co bylo
dřív inline v `index.html`.

Druhá věc: **`tailwind.css` musí být v `<head>` až za Font Awesome.** Font
Awesome nastavuje ikonám `display: inline-block` a při opačném pořadí přebije
Tailwindí `.hidden` — v přepínači motivu se pak zobrazí měsíc i slunce naráz.

## Struktura repozitáře

```
/api/          serverless funkce (borek-ai.js – volání Gemini včetně limitů)
/js/           klientská logika
  config.js      připojení k Supabase
  auth.js        registrace, přihlášení, obnova hesla
  ui.js          vykreslování, notifikace, přepínání záložek, karty poptávek
  chat.js        konverzace a zprávy
  features.js    poptávky, nabídky, tržiště, mapa, hodnocení, Bořek jako poradce
  templates.js   HTML šablony obrazovek pro zákazníka a řemeslníka
/sql/          zásahy do databáze (viz níže)
index.html     kostra aplikace, modální okna, hlavička
app.js         inicializace po přihlášení
style.css      vlastní styly nad rámec Tailwindu, včetně mobilního rozvržení
tailwind.css   vygenerované Tailwind CSS (needituj ručně)
```

## Databáze

Všechny zásahy do Supabase jsou na konci tohoto souboru v sekci
[SQL skripty](#sql-skripty), aby se daly dohledat a aby šla databáze obnovit,
kdyby se s projektem něco stalo.

Na čisté databázi je spusť v Supabase → SQL Editor v tomto pořadí:

| Krok | Co dělá |
|---|---|
| [1 – Oblíbené](#1--oblíbené-uložené-poptávky) | Tabulka uložených poptávek (řemeslníkovy záložky) |
| [3 – Jedna nabídka](#3--jeden-řemeslník--jedna-nabídka-na-poptávku) | Jeden řemeslník = jedna nabídka na poptávku |
| [4 – Pokusy](#4--počítadlo-pokusů-o-nabídku) | Počítadlo pokusů o nabídku po odmítnutí |
| [5 – Hodnocení](#5--hodnocení-řemeslníků) | Tabulka hodnocení (hvězdičky + komentář) |
| [6 – RLS](#6--zpřísnění-přístupu-k-datům-rls) | **Přístupová pravidla — nejdůležitější krok** |
| [7 – Doplnit řemeslníky](#7--doplnění-řemeslníka-u-starších-zakázek) | Dopočítání řemeslníka u starších zakázek |
| [8 – Dokončení](#8--řemeslník-navrhne-dokončení-zákazník-potvrdí) | Řemeslník hlásí hotovo, zákazník potvrzuje |

[Kontrolní skript](#kontrola--co-je-v-tabulce-profiles) nic nemění, jen vypíše,
co je v tabulce `profiles` a jestli tam nejsou citlivé údaje.

> **Krok 2 chybí.** Sloupce `craftsman_id` a `craftsman_name` v tabulce
> `requests` aplikace používá, ale skript, který je zakládá, se v repozitáři
> nedochoval. Na čisté databázi je tedy potřeba je doplnit ručně, než se pustí
> krok 7.

### Zabezpečení

Klíč `anon` ve frontendu je u Supabase běžný a sám o sobě není problém. Ochrana
stojí a padá s pravidly RLS, ne s utajením klíče.

| Tabulka | Kdo smí číst | Kdo smí zapisovat |
|---|---|---|
| `requests` | volné poptávky vidí každý přihlášený; svoje vidí zákazník a přidělený řemeslník | zakládá zákazník, mění zákazník nebo přidělený řemeslník |
| `offers` | řemeslník svoje, zákazník ty na svoji poptávku | podává řemeslník, přijímá/odmítá zákazník |
| `messages` | jen zákazník a přidělený řemeslník dané zakázky | jen sám za sebe a jen do své konverzace |
| `hodnoceni` | veřejné (jsou to reference) | jen zákazník, jen svoji zakázku, jen jednou |
| `oblibene` | jen vlastní | jen vlastní |

Po každé změně pravidel je dobré ověřit, že RLS je pořád zapnuté na všech
tabulkách.

## Známé nedodělky

**Kontaktní údaje jsou v popisu poptávky.** Telefon a adresa jsou součástí
textu, který se do aplikace posílá celý. Zobrazení je sice omezené — řemeslník
před přijetím vidí jen město — ale kdo si otevře vývojářskou konzoli, dostane
se k celému textu. Skrývání tedy zdrží běžného uživatele, ne motivovaného.

Správné řešení je uložit kontakty do samostatných sloupců a uvolnit je až
vybranému řemeslníkovi.

**Escrow je v rozhraní, ale nefunguje.** Záložka Platby i dlaždice „V escrow"
na nástěnce ukazují nuly a nejsou na nic napojené. Než se spustí ostrý provoz,
je potřeba je buď dodělat, nebo z rozhraní odstranit — teď působí jako hotová
funkce, kterou nemáme.

---

## SQL skripty

Spouštěj je v Supabase → SQL Editor v pořadí, v jakém tu jsou.
Každý blok je samostatný a dá se pustit celý najednou.

### 1 – Oblíbené (uložené) poptávky

```sql
-- =====================================================
-- REMEXO: tabulka pro oblíbené (uložené) poptávky
-- Spusť celé najednou v Supabase → SQL Editor → Run
-- =====================================================

-- 1) Vytvoření tabulky
-- Typ sloupce request_id se automaticky přizpůsobí tomu,
-- jaký typ má id v tabulce requests (uuid / bigint / ...)
do $$
declare
  typ_id text;
begin
  select data_type into typ_id
    from information_schema.columns
   where table_schema = 'public'
     and table_name   = 'requests'
     and column_name  = 'id';

  if typ_id is null then
    raise exception 'Tabulka public.requests nebyla nalezena.';
  end if;

  execute format('
    create table if not exists public.oblibene (
      id          uuid primary key default gen_random_uuid(),
      user_id     uuid not null references auth.users(id) on delete cascade,
      request_id  %s   not null references public.requests(id) on delete cascade,
      created_at  timestamptz not null default now(),
      unique (user_id, request_id)
    )', typ_id);
end $$;

-- 2) Rychlejší vyhledávání podle uživatele
create index if not exists oblibene_user_idx on public.oblibene (user_id);

-- 3) Zabezpečení – každý vidí a mění jen své vlastní oblíbené
alter table public.oblibene enable row level security;

drop policy if exists "Uzivatel vidi sve oblibene"   on public.oblibene;
drop policy if exists "Uzivatel prida oblibene"      on public.oblibene;
drop policy if exists "Uzivatel smaze sve oblibene"  on public.oblibene;

create policy "Uzivatel vidi sve oblibene"
  on public.oblibene for select
  using (auth.uid() = user_id);

create policy "Uzivatel prida oblibene"
  on public.oblibene for insert
  with check (auth.uid() = user_id);

create policy "Uzivatel smaze sve oblibene"
  on public.oblibene for delete
  using (auth.uid() = user_id);

-- Hotovo. Kontrola:
select 'Tabulka oblibene je pripravena' as vysledek;
```

### 3 – Jeden řemeslník = jedna nabídka na poptávku

```sql
-- =====================================================
-- REMEXO: jeden řemeslník = jedna nabídka na poptávku
-- Spusť celé najednou v Supabase → SQL Editor → Run
-- =====================================================

-- 1) Nejdřív uklidíme případné duplicity, které už v databázi jsou.
--    U každé dvojice (poptávka + řemeslník) necháme tu nejstarší nabídku.
delete from public.offers a
using public.offers b
where a.request_id   = b.request_id
  and a.craftsman_id = b.craftsman_id
  and a.ctid > b.ctid;

-- 2) Od teď databáze druhou nabídku od stejného řemeslníka nepřijme
create unique index if not exists offers_jedna_nabidka_na_poptavku
  on public.offers (request_id, craftsman_id);

-- Kontrola: kolik nabídek zůstalo
select count(*) as pocet_nabidek from public.offers;
```

### 4 – Počítadlo pokusů o nabídku

```sql
-- =====================================================
-- REMEXO: počítadlo pokusů o nabídku
-- Spusť v Supabase → SQL Editor → Run
-- =====================================================

-- Kolikátý je to pokus daného řemeslníka u dané poptávky.
-- Po odmítnutí se nabídka přepíše novou a počítadlo se zvýší.
alter table public.offers
  add column if not exists pokusy integer not null default 1;

-- Kontrola
select request_id, craftsman_name, status, pokusy
  from public.offers
 order by created_at desc
 limit 20;
```

### 5 – Hodnocení řemeslníků

```sql
-- =====================================================
-- REMEXO: hodnocení řemeslníků
-- Doteď se hodnocení nikam neukládalo – zákazník ho vyplnil,
-- appka poděkovala a hvězdičky zahodila.
-- Spusť v Supabase → SQL Editor → Run
-- =====================================================

do $$
declare
  typ_id text;
begin
  select data_type into typ_id
    from information_schema.columns
   where table_schema = 'public' and table_name = 'requests' and column_name = 'id';

  if typ_id is null then
    raise exception 'Tabulka public.requests nebyla nalezena.';
  end if;

  execute format('
    create table if not exists public.hodnoceni (
      id            uuid primary key default gen_random_uuid(),
      request_id    %s   not null references public.requests(id) on delete cascade,
      craftsman_id  uuid not null references auth.users(id) on delete cascade,
      customer_id   uuid not null references auth.users(id) on delete cascade,
      hvezdicky     integer not null check (hvezdicky between 1 and 5),
      komentar      text,
      created_at    timestamptz not null default now(),
      unique (request_id)
    )', typ_id);
end $$;

create index if not exists hodnoceni_craftsman_idx on public.hodnoceni (craftsman_id);

-- Zabezpečení
alter table public.hodnoceni enable row level security;

drop policy if exists "Hodnoceni vidi vsichni"        on public.hodnoceni;
drop policy if exists "Zakaznik prida hodnoceni"      on public.hodnoceni;

-- Hodnocení jsou veřejná – jsou to reference řemeslníka
create policy "Hodnoceni vidi vsichni"
  on public.hodnoceni for select
  using (true);

-- Hodnotit smí jen zákazník, a jen svoji zakázku
create policy "Zakaznik prida hodnoceni"
  on public.hodnoceni for insert
  with check (auth.uid() = customer_id);

select 'Tabulka hodnoceni je pripravena' as vysledek;
```

### 6 – Zpřísnění přístupu k datům (RLS)

```sql
-- =====================================================
-- REMEXO: zpřísnění přístupu k datům (RLS)
--
-- PROČ: tabulky messages a offers mají pravidlo "Allow all for
-- authenticated" s podmínkou using(true). To znamená, že KAŽDÝ
-- přihlášený uživatel si může přes API stáhnout všechny zprávy
-- všech konverzací a měnit cizí nabídky. V appce to vidět není,
-- ale přes vývojářskou konzoli ano.
--
-- POZOR: tohle je zásah do funkčního systému. Spusť to a hned
-- otestuj celý průchod (poptávka → nabídka → přijetí → chat →
-- dokončení). Kdyby něco přestalo fungovat, dole je návod na
-- vrácení zpět.
-- =====================================================

-- ---------- ZPRÁVY ----------
alter table public.messages enable row level security;
drop policy if exists "Allow all for authenticated" on public.messages;
drop policy if exists "Zpravy vidi jen ucastnici"   on public.messages;
drop policy if exists "Zpravu posila jen ucastnik"  on public.messages;

-- Číst smí jen zákazník a přidělený řemeslník dané zakázky
create policy "Zpravy vidi jen ucastnici"
  on public.messages for select
  using (
    exists (
      select 1 from public.requests r
      where r.id::text = messages.conversation_id
        and (r.customer_id = auth.uid() or r.craftsman_id = auth.uid())
    )
  );

-- Psát smí jen sám za sebe a jen do své konverzace
create policy "Zpravu posila jen ucastnik"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.requests r
      where r.id::text = messages.conversation_id
        and (r.customer_id = auth.uid() or r.craftsman_id = auth.uid())
    )
  );

-- ---------- NABÍDKY ----------
alter table public.offers enable row level security;
drop policy if exists "Allow all for authenticated" on public.offers;
drop policy if exists "Nabidky vidi ucastnici"      on public.offers;
drop policy if exists "Nabidku podava remeslnik"    on public.offers;
drop policy if exists "Nabidku meni ucastnici"      on public.offers;
drop policy if exists "Nabidku maze ucastnik"       on public.offers;

-- Řemeslník vidí svoje, zákazník ty na svoji poptávku
create policy "Nabidky vidi ucastnici"
  on public.offers for select
  using (
    craftsman_id = auth.uid()
    or exists (select 1 from public.requests r
               where r.id = offers.request_id and r.customer_id = auth.uid())
  );

create policy "Nabidku podava remeslnik"
  on public.offers for insert
  with check (craftsman_id = auth.uid());

-- Řemeslník opravuje svoji, zákazník přijímá/odmítá na svoji poptávku
create policy "Nabidku meni ucastnici"
  on public.offers for update
  using (
    craftsman_id = auth.uid()
    or exists (select 1 from public.requests r
               where r.id = offers.request_id and r.customer_id = auth.uid())
  );

create policy "Nabidku maze ucastnik"
  on public.offers for delete
  using (
    craftsman_id = auth.uid()
    or exists (select 1 from public.requests r
               where r.id = offers.request_id and r.customer_id = auth.uid())
  );

-- ---------- POPTÁVKY ----------
alter table public.requests enable row level security;
drop policy if exists "Allow all for authenticated" on public.requests;
drop policy if exists "Poptavky na trzisti"        on public.requests;
drop policy if exists "Poptavku zaklada zakaznik"  on public.requests;
drop policy if exists "Poptavku meni ucastnik"     on public.requests;
drop policy if exists "Poptavku maze zakaznik"     on public.requests;

-- Volné poptávky vidí řemeslníci (tržiště), svoje vidí obě strany
create policy "Poptavky na trzisti"
  on public.requests for select
  using (
    status = 'waiting'
    or customer_id = auth.uid()
    or craftsman_id = auth.uid()
  );

create policy "Poptavku zaklada zakaznik"
  on public.requests for insert
  with check (customer_id = auth.uid());

-- Zákazník mění svoji; řemeslník potřebuje zápis při přijetí nabídky
create policy "Poptavku meni ucastnik"
  on public.requests for update
  using (customer_id = auth.uid() or craftsman_id = auth.uid());

create policy "Poptavku maze zakaznik"
  on public.requests for delete
  using (customer_id = auth.uid());

select 'Pravidla nastavena – otestuj prosím celý průchod appkou' as vysledek;

-- =====================================================
-- NÁVRAT ZPĚT (kdyby něco přestalo fungovat):
--
-- drop policy if exists "Zpravy vidi jen ucastnici"  on public.messages;
-- drop policy if exists "Zpravu posila jen ucastnik" on public.messages;
-- create policy "Allow all for authenticated" on public.messages
--   for all to authenticated using (true) with check (true);
--
-- (totéž pro offers a requests)
-- =====================================================
```

### 7 – Doplnění řemeslníka u starších zakázek

```sql
-- =====================================================
-- REMEXO: doplnění řemeslníka u starších zakázek
--
-- PROČ: sloupec craftsman_id v tabulce requests jsme přidali
-- teprve nedávno. U zakázek přijatých dřív je prázdný – a nová
-- pravidla přístupu podle něj poznávají, kdo smí číst chat.
-- Bez tohoto kroku by řemeslník u starších zakázek neviděl zprávy.
--
-- Spusť v Supabase → SQL Editor → Run
-- =====================================================

update public.requests r
   set craftsman_id = o.craftsman_id,
       craftsman_name = coalesce(r.craftsman_name, o.craftsman_name)
  from public.offers o
 where o.request_id = r.id
   and o.status = 'accepted'
   and r.craftsman_id is null;

-- Kontrola: zůstala nějaká přidělená zakázka bez řemeslníka?
select count(*) as zakazky_bez_remeslnika
  from public.requests
 where status in ('active', 'done')
   and craftsman_id is null;
```

### 8 – Řemeslník navrhne dokončení, zákazník potvrdí

```sql
-- =====================================================
-- REMEXO: řemeslník navrhne dokončení, zákazník potvrdí
--
-- Doteď mohl dokončení potvrdit jen zákazník. Když přestal
-- reagovat, zakázka visela navždy a řemeslník nedostal hodnocení.
--
-- Spusť v Supabase → SQL Editor → Run
-- =====================================================

alter table public.requests
  add column if not exists dokonceni_navrzeno timestamptz;

-- Kontrola
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and table_name   = 'requests'
   and column_name  = 'dokonceni_navrzeno';
```

### Kontrola – co je v tabulce profiles

```sql
-- =====================================================
-- REMEXO: co je vlastně v tabulce profiles?
--
-- Kontrola ukázala, že profiles smí číst kdokoliv (podmínka "true").
-- Jestli tam jsou telefony nebo e-maily, je to únik. Jestli je tabulka
-- prázdná a nepoužívaná, stačí ji smazat.
--
-- Spusť v Supabase → SQL Editor → Run. Nic to nemění.
-- =====================================================

-- 1) Jaké sloupce tabulka má
select column_name as sloupec, data_type as typ
  from information_schema.columns
 where table_schema = 'public' and table_name = 'profiles'
 order by ordinal_position;

-- 2) Kolik je v ní záznamů
select count(*) as pocet_zaznamu from public.profiles;

-- 3) Ukázka dat (ať víme, jestli tam jsou citlivé údaje)
select * from public.profiles limit 5;
```
