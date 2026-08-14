# Remexo – aplikace

Webová aplikace, přes kterou lidé v Brně a okolí zadávají poptávky na řemeslné
práce a řemeslníci na ně posílají nabídky. Zákazník vyfotí problém a popíše ho,
asistent Bořek z toho vytvoří srozumitelné zadání a řemeslníci z okolí se ozvou
sami s cenou a termínem.

Marketingový web je v samostatném repozitáři `web-remexo`.

## Stav projektu

**Před spuštěním.** Pilot plánujeme na podzim 2026 v Brně.

| Funguje | Zatím ne |
|---|---|
| Registrace a přihlášení, potvrzení e-mailem | Platby přes platformu |
| Zadání poptávky s fotkami | Úschova peněz (escrow) |
| Příprava zadání přes Bořka (Gemini) | Pojištění zakázek |
| Ruční zadání bez AI | Katalog řemesel |
| Tržiště zakázek – seznam i mapa | |
| Nabídky, přijetí, odmítnutí | |
| Chat mezi zákazníkem a řemeslníkem | |
| Oboustranné potvrzení dokončení | |
| Hodnocení po dokončení | |
| Ověřování řemeslníků podle IČO | |
| Administrace a audit log | |
| E-mailová upozornění | |

Do textů v aplikaci nepiš, že fungují věci z pravého sloupce. Prompt Bořka to
má výslovně zakázané a stejné pravidlo platí i pro rozhraní a podmínky použití.

## Použité technologie

* **Frontend:** HTML, CSS, JavaScript (vanilla ES6), Tailwind CSS
* **Backend a databáze:** Supabase (PostgreSQL, Auth, Storage, Realtime, pg_cron)
* **AI:** Gemini `gemini-3.5-flash` přes serverless funkci na Vercelu
* **E-maily:** Supabase Edge Function (Deno) + SMTP
* **Mapy:** Leaflet.js + OpenStreetMap
* **Hosting:** Vercel

**Vlastní backend neexistuje.** Prohlížeč mluví přímo s databází, takže veškerá
autorizace musí být vynucená v PostgreSQL. Od toho se odvíjí všechno ostatní –
kontrola ve frontendu je jen pohodlí pro uživatele, ne ochrana.

### Pozor na Tailwind

Tailwind **není** načítaný z `cdn.tailwindcss.com`. To je JIT kompilátor, který
stáhne ~400 kB JavaScriptu a CSS staví až v prohlížeči. Místo toho je
v repozitáři předpřipravený `tailwind.css`.

**Po přidání nové Tailwind třídy musíš CSS přegenerovat**, jinak se neprojeví:

```bash
npx tailwindcss -c tailwind.config.js -i input.css -o tailwind.css --minify
```

Druhá věc: **`tailwind.css` musí být v `<head>` až za Font Awesome.** Font
Awesome nastavuje ikonám `display: inline-block` a při opačném pořadí přebije
Tailwindí `.hidden` – v přepínači motivu se pak zobrazí měsíc i slunce naráz.

Třetí: **třídy nikdy neskládej řetězcem.** Zápis `'bg-' + barva + '-100'`
Tailwind při buildu nevidí a výsledek zůstane bez stylu. Používej pevný výčet.

## Struktura repozitáře

```
/api/          serverless funkce na Vercelu
  borek-ai.js    volání Gemini, ověření přihlášení, limity
/js/           klientská logika
  config.js      připojení k Supabase
  auth.js        registrace, přihlášení, obnova hesla
  ui.js          vykreslování, notifikace, karty poptávek
  chat.js        konverzace, realtime, záznam přečtení
  features.js    poptávky, nabídky, tržiště, mapa, hodnocení, profil
  templates.js   HTML šablony obrazovek
  admin.js       administrace
/supabase/functions/notifikace/
  index.ts       odesílání e-mailů (Deno)
app.js         inicializace po přihlášení
index.html     kostra aplikace, modální okna, podmínky použití
style.css      vlastní styly, mobilní rozvržení
tailwind.css   vygenerované CSS (needituj ručně)
vercel.json    bezpečnostní hlavičky včetně CSP
*.sql          zásahy do databáze (viz níže)
```

## Databáze

Všechny zásahy jsou v SQL souborech v kořeni. Na čisté databázi je spusť
v tomto pořadí:

| Soubor | Co dělá |
|---|---|
| `oprava-role.sql` | role v `profiles`, automatické zakládání profilu |
| `oprava-sloupce.sql` | spouštěče chránící vlastnictví záznamů |
| `oprava-role-duveryhodnost.sql` | **role jako důvěryhodný údaj** |
| `admin-a-overeni.sql` | tabulka adminů, ověřování řemeslníků |
| `admin-prehledy.sql` | přehledy pro administraci |
| `audit-log.sql` | auditní záznam |
| `oprava-limity.sql` | limity zápisů (poptávky, nabídky, zprávy) |
| `oprava-limit-ai.sql` | limit AI dotazů v databázi |
| `oprava-rozsah.sql`, `oprava-rozsah2.sql` | zúžení pravidel na přihlášené |
| `oprava-funkce.sql` | zamčení interních funkcí |
| `oprava-search-path.sql` | pevný `search_path` u `security definer` funkcí |
| `oprava-dokonceni.sql` | sloupec pro návrh dokončení od zákazníka |
| `notifikace.sql` | e-mailová upozornění (poptávka, nabídka) |
| `notifikace-hotovo.sql` | upozornění na dokončenou zakázku |
| `notifikace-zpravy.sql` | upozornění na nepřečtené zprávy + `pg_cron` |

Ostatní skripty jsou jednorázové nebo pomocné:

| Soubor | Účel |
|---|---|
| `oprava.sql`, `oprava-storage.sql` | jednorázové opravy z dřívějších auditů |
| `oboustranne-dokonceni.sql` | starší varianta, nahrazena `oprava-dokonceni.sql` |
| `diagnostika-role.sql`, `vypis-storage.sql` | jen vypisují, nic nemění |
| `vycistit-data.sql` | smaže všechna data pro test načisto — **nevratné** |

Storage se nastavuje přes rozhraní, ne SQL – viz `FOTKY-NASTAVENI.md`
a `FOTKY-ZUZENI.md`.

### Kontrola a testy

| Soubor | Účel |
|---|---|
| `bezpecnostni-testy.sql` | 31 útočných testů proti pravidlům |
| `storage-testy.sql` | 12 testů pro Storage |
| `kontrola.sql`, `kontrola2.sql` | kontrola konfigurace |
| `export-konfigurace.sql` | export nastavení k posouzení, bez dat |
| `session-testy.js` | testy přihlášení (konzole prohlížeče) |

**Testy spouštěj po každé změně**, která přidá tabulku, funkci nebo spouštěč –
ne jen při auditu. Čtyři reálné díry se našly právě takhle, a všechny vznikly
z čerstvě psaného kódu.

## Zabezpečení

Podrobně v `SECURITY_AUDIT.md` a `SECURITY_TESTS.md`. Tady to podstatné.

### Kdo se k čemu dostane

| Data | Přístup |
|---|---|
| Poptávky se stavem `waiting` | každý přihlášený (jsou na tržišti) |
| Telefon a adresa zákazníka | jen řemeslník s **přijatou** nabídkou |
| Fotky poptávky | zákazník; řemeslník u poptávek na tržišti, u svých nabídek a přidělených zakázek |
| Chat | jen zákazník a přidělený řemeslník |
| Hodnocení, veřejné profily | veřejné záměrně |
| Audit log, admini, nastavení, počítadlo AI | přes API nedostupné vůbec |

### Role není v tokenu

`user_metadata.role` si uživatel může sám přepsat přes
`supabase.auth.updateUser`. **O přístupu proto rozhoduje `profiles.role`**
a funkce `je_remeslnik()`; role v tokenu slouží jen k tomu, aby rozhraní
vypadalo správně.

Změnu role provádí `zmen_roli()`, která povoluje jen `customer` a `craftsman`.
Přímý zápis do sloupce blokuje spouštěč. **Admin zůstává výhradně v tabulce
`admini`** a přes aplikaci se nastavit nedá.

Tohle bylo dlouho špatně: Storage pravidlo pro fotky se ptalo role v tokenu,
takže se každý zákazník mohl prohlásit za řemeslníka a dostat se k fotkám všech
poptávek. Nedělej to znovu.

### Kontakty na zákazníka

Telefon a ulice **nikdy nepatří do popisu poptávky** – popis se posílá do
aplikace celý. Žijí v tabulce `poptavka_kontakt` a databáze je vydá jen
zákazníkovi a řemeslníkovi s přijatou nabídkou.

### Prostředí na Vercelu

`api/borek-ai.js` vyžaduje `SUPABASE_URL` a `SUPABASE_ANON_KEY` v proměnných
prostředí. Bez nich vrátí chybu – záložní hodnoty tam schválně nejsou, aby
chybějící nastavení nezůstalo nepovšimnuté.

Po změně proměnných je nutné **znovu nasadit**, jinak se nepromítnou.

## Známé nedodělky

**Obsah nahraných souborů se nekontroluje.** Limity bucketů hlídají hlavičku od
prohlížeče, ne skutečný obsah. Zmírňuje to, že bucket není veřejný a soubory se
nikdy nespouštějí jako stránka.

**E-maily chodí z osobní schránky na Seznamu.** Předmět proto nemůže obsahovat
diakritiku – použitá knihovna ji kóduje chybně a v poště se objeví hlavička
jako text. Řeší přechod na Resend s doménovou schránkou.

**Registrace se dá zneužít k obcházení limitů** – deset účtů, deset limitů.
Zmírněno potvrzováním e-mailu a omezením registrací z jedné IP.

**Aplikace neprošla externím posouzením.** Veškeré ověřování dělal jazykový
model, který ji zároveň upravoval.

## Provozní poznámky

**Admina přidáš jen v SQL editoru:**

```sql
insert into public.admini (uzivatel_id, poznamka)
select id, 'zakladatel' from auth.users where email = 'TVUJ@EMAIL'
on conflict (uzivatel_id) do nothing;
```

**Edge Function se nasazuje přes CLI**, ne přes web:

```bash
supabase functions deploy notifikace --no-verify-jwt
```

**Plánovaná úloha** pro nepřečtené zprávy běží každou půlhodinu přes `pg_cron`.
První upozornění tedy může přijít až po třiceti minutách.
