# Fixit.cz – Profesionální řemesla 🛠️

Fixit.cz je moderní webová aplikace, která pomocí umělé inteligence propojuje zákazníky s ověřenými řemeslníky. Poptávající stačí vyfotit závadu a náš AI asistent Bořek automaticky připraví profesionální zadání.

## 🚀 Hlavní funkce

* **AI Asistent Bořek:** Automatická analýza fotografie závady (přes Gemini 4o API) a návrh řešení.
* **Tržiště a Interaktivní Mapa:** Zobrazení zakázek v okolí (Leaflet & OpenStreetMap) s filtrací dle oboru.
* **Real-time Chat:** Okamžitá komunikace mezi zákazníkem a řemeslníkem (Supabase Realtime).
* **Správa Nabídek:** Řemeslník pošle nabídku s cenou a zákazník si vybere ideálního kandidáta.
* **Hodnocení:** Po dokončení opravy může zákazník řemeslníka ohodnotit (1-5 hvězdiček).
* **Uživatelské Profily:** Správa osobních údajů, telefonu, referencí a profilových fotek.

## 💻 Použité technologie

* **Frontend:** HTML5, CSS3, JavaScript (Vanilla ES6), Tailwind CSS
* **Backend & Databáze:** Supabase (PostgreSQL, Auth, Storage, Realtime)
* **Umělá inteligence:** Node.js (Serverless Function), GPT-4o / Gemini API
* **Mapy:** Leaflet.js
* **Ikony:** FontAwesome 6

## ⚙️ Struktura repozitáře

Projekt je rozdělen do modulů pro snadnou údržbu:
- `/api/` - Serverless funkce pro komunikaci s AI
- `/js/` - Klientská logika (`auth.js`, `ui.js`, `chat.js`, `features.js`, `config.js`)
- `index.html` - Struktura webu
- `style.css` - Custom design nad rámec Tailwindu
- `app.js` - Hlavní inicializace aplikace po načtení

# Databáze Remexo

Tady jsou všechny zásahy do Supabase databáze, aby byly dohledatelné
v repozitáři a nežily jen v hlavě nebo v historii SQL editoru.

## Proč to tu je

Bez těchto souborů nešlo z repozitáře nijak ověřit, jestli je databáze
zabezpečená — a nešlo by ji ani obnovit, kdyby se s projektem něco stalo.

## Jak to spustit na čisté databázi

V Supabase → SQL Editor, v tomhle pořadí:

| Soubor | Co dělá |
|---|---|
| `01_oblibene.sql` | Tabulka uložených poptávek (řemeslníkovy záložky) |
| `02_requests_craftsman.sql` | Sloupce `craftsman_id` a `craftsman_name` u poptávky |
| `03_jedna_nabidka.sql` | Jeden řemeslník = jedna nabídka na poptávku |
| `04_pokusy.sql` | Počítadlo pokusů o nabídku po odmítnutí |
| `05_hodnoceni.sql` | Tabulka hodnocení (hvězdičky + komentář) |
| `06_rls_zabezpeceni.sql` | **Přístupová pravidla — nejdůležitější soubor** |
| `07_doplnit_remeslniky.sql` | Dopočítání řemeslníka u starších zakázek |
| `08_dokonceni_navrzeno.sql` | Řemeslník hlásí hotovo, zákazník potvrzuje |

Kontrolní skript `00_kontrola_zabezpeceni.sql` nic nemění — jen vypíše,
jak je na tom zabezpečení. Spusť ho po každé změně pravidel.

## Zabezpečení v kostce

Klíč `anon` ve frontendu je u Supabase běžný a sám o sobě není problém.
Ochrana stojí a padá s pravidly (RLS), ne s utajením klíče.

Co je nastavené:

| Tabulka | Kdo smí číst | Kdo smí zapisovat |
|---|---|---|
| `requests` | volné poptávky vidí každý přihlášený; svoje vidí zákazník a přidělený řemeslník | zakládá zákazník, mění zákazník nebo přidělený řemeslník |
| `offers` | řemeslník svoje, zákazník ty na svoji poptávku | podává řemeslník, přijímá/odmítá zákazník |
| `messages` | jen zákazník a přidělený řemeslník dané zakázky | jen sám za sebe a jen do své konverzace |
| `hodnoceni` | veřejné (jsou to reference) | jen zákazník, jen svoji zakázku, jen jednou |
| `oblibene` | jen vlastní | jen vlastní |

## Co ještě není dořešené

**Kontaktní údaje jsou v popisu poptávky.** Telefon a adresa jsou součástí
textu, který se posílá do appky celý. Zobrazení je sice omezené (řemeslník
před přijetím vidí jen město), ale kdo si otevře vývojářskou konzoli,
dostane se k celému textu.

Správné řešení je uložit kontakty do samostatných sloupců a uvolnit je
až vybranému řemeslníkovi. Do té doby platí, že skrývání zdrží běžného
uživatele, ne motivovaného.

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
