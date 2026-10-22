# Remexo – aplikace

Webová aplikace (PWA), přes kterou lidé v Olomouci a okolí (do 35 km) zadávají
poptávky na řemeslné práce a řemeslníci na ně posílají nabídky. Zákazník vyfotí
problém a popíše ho, asistent Bořek z toho vytvoří srozumitelné zadání a řemeslníci
z okolí se ozvou sami s cenou a termínem.

Běží na **app.remexo.cz**. Marketingový web (remexo.cz) je v samostatném
repozitáři `web-remexo`. Přihlášení probíhá vždy v aplikaci, ne na webu.

> **Pro nezávislého posuzovatele (člověka i AI):** začni v `STAV_APLIKACE.md`.
> Je tam shrnutí, architektura, rizika a konkrétní otázky, na které chceme
> poctivou odpověď. Tenhle soubor je technický popis repozitáře.

## Stav projektu

**Před veřejným spuštěním.** Pilot v Olomouci je plánovaný na týden od
26. 10. 2026 (středa 28. 10. je státní svátek). Kód je hotový pro uzavřený
provoz; na tržišti zatím nejsou skuteční řemeslníci mimo zakládající pětici,
kterou teprve oslovujeme.

| Funguje | Zatím ne |
|---|---|
| Registrace a přihlášení e-mailem (s potvrzením) a přes Google | Přihlášení přes Facebook (kód hotový, tlačítko skryté – čeká na schválení Meta) |
| Zadání poptávky s fotkami | Platby přes platformu |
| Příprava zadání přes Bořka (Gemini) | Úschova peněz (escrow) |
| Ruční zadání bez AI | Pojištění zakázek |
| Tržiště zakázek – seznam i mapa | Katalog řemesel |
| Omezení na Olomouc a okolí (35 km od centra) | Placení řemeslníků za poptávky (cena zatím nerozhodnutá) |
| Nabídky, přijetí, odmítnutí, opravná nabídka (omezený počet pokusů) | |
| Chat mezi zákazníkem a řemeslníkem (realtime) | |
| Oboustranné potvrzení dokončení | |
| Zrušení poptávky zákazníkem, odstoupení řemeslníka ze zakázky | |
| Hodnocení po dokončení | |
| Oblíbené poptávky u řemeslníka (uloženo v DB) | |
| Ověřování řemeslníků podle IČO (schvaluje admin) | |
| Administrace a audit log | |
| E-mailová upozornění (poptávka, nabídka, dokončení, zprávy) | |
| Stránky Soukromí a Smazání dat (`/soukromi.html`, `/smazani-dat.html`) | |

Do textů v aplikaci nepiš, že fungují věci z pravého sloupce. Prompt Bořka to
má výslovně zakázané a stejné pravidlo platí pro rozhraní a podmínky použití.

### Obchodní model (jak se to projeví v kódu)

* Žádná provize ze zakázek.
* Pět zakládajících řemeslníků z Olomouce má aplikaci zdarma natrvalo.
* Ostatní řemeslníci mají platit za poptávky, které jim něco přinesou. **Cena
  ani mechanismus placení zatím nejsou rozhodnuté a v kódu nejsou** – dnes je
  přístup k poptávkám pro všechny zdarma. Záložka Výdělky v aplikaci říká, že
  platby přes Remexo připravujeme.

## Použité technologie

* **Frontend:** HTML, CSS, JavaScript (vanilla ES6, bez frameworku), Tailwind CSS
* **Backend a databáze:** Supabase (PostgreSQL, Auth, Storage, Realtime, pg_cron)
* **AI:** Gemini `gemini-3.5-flash` přes serverless funkci na Vercelu
* **E-maily:** Supabase Edge Function (Deno) + SMTP
* **Mapy:** Leaflet.js + OpenStreetMap
* **Hosting:** Vercel

**Vlastní backend neexistuje.** Prohlížeč mluví přímo s databází, takže veškerá
autorizace musí být vynucená v PostgreSQL. Od toho se odvíjí všechno ostatní –
kontrola ve frontendu je jen pohodlí pro uživatele, ne ochrana.

### Pozor na Tailwind

Tailwind **není** načítaný z `cdn.tailwindcss.com` (CSP aplikace by ho navíc
zablokovala). V repozitáři je předpřipravený `tailwind.css`.

**Po přidání nové Tailwind třídy musíš CSS přegenerovat**, jinak se neprojeví:

```bash
npx tailwindcss -c tailwind.config.js -i input.css -o tailwind.css --minify
```

* `tailwind.css` musí být v `<head>` až za Font Awesome (jinak FA přebije `.hidden`).
* Třídy nikdy neskládej řetězcem (`'bg-' + barva`) – build je nevidí.
* Samostatné stránky `soukromi.html` a `smazani-dat.html` Tailwind nepoužívají;
  mají vlastní inline CSS.

## Struktura repozitáře

```
/api/          serverless funkce na Vercelu
  borek-ai.js    volání Gemini, ověření přihlášení, limity
/js/           klientská logika
  config.js      připojení k Supabase
  auth.js        registrace, přihlášení (e-mail, Google, Facebook), obnova hesla
  ui.js          vykreslování, notifikace, karty poptávek
  chat.js        konverzace, realtime, záznam přečtení
  features.js    poptávky, nabídky, tržiště, mapa, hodnocení, profil, oblíbené
  templates.js   HTML šablony obrazovek
  admin.js       administrace
/supabase/functions/notifikace/
  index.ts       odesílání e-mailů (Deno)
app.js         inicializace po přihlášení
index.html     kostra aplikace, modální okna, podmínky použití
soukromi.html  zásady ochrany osobních údajů (samostatná stránka)
smazani-dat.html  postup smazání dat (samostatná stránka)
style.css      vlastní styly, mobilní rozvržení
tailwind.css   vygenerované CSS (needituj ručně)
vercel.json    bezpečnostní hlavičky včetně CSP
*.sql          zásahy do databáze (viz níže)
```

## Zeměpisné omezení (Olomouc)

Zadání poptávky a adresa v profilu jsou omezené na okolí Olomouce.
`isNearBrno()` v `js/features.js` (název je historický, funkce počítá vzdálenost
od Olomouce) porovnává souřadnice adresy se středem města
(`BRNO_LAT = 49.5938`, `BRNO_LON = 17.2509`) a limitem 35 km. Mimo okruh
aplikace zobrazí „Momentálně fungujeme jen v Olomouci a okolí (do 35 km)".

**Je to kontrola ve frontendu.** Databáze město ani vzdálenost nevynucuje – kdo
obejde prohlížeč, může založit poptávku odkudkoliv. Pro MVP to bereme jako
přijatelné (nejde o bezpečnostní hranici), ale je to vědomé omezení.

## Přihlášení

* **E-mail + heslo** s potvrzením e-mailem.
* **Google** – funguje.
* **Facebook** – technicky zapojené (Supabase provider, Meta aplikace „Remexo"
  v režimu Development). Veřejně ho **nejde zapnout**, dokud Meta nedokončí
  ověření firmy; tlačítko je proto v `index.html` skryté (`display:none`) a
  přihlásit se přes něj mohou jen testeři v Meta aplikaci.
* Profilová fotka z Googlu/Facebooku se bere z `user_metadata.avatar_url`.
  Facebookové odkazy jsou podepsané a vyprší, proto má avatar záložní obrázek
  při chybě načtení (`onerror`).

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

**Upozornění:** tabulky a sloupce `poptavka_kontakt`, `odstoupeni`, `hodnoceni`,
`oblibene`, `requests.zruseno_kym/zruseno_kdy/zruseno_duvod` a
`offers.pokusy` v databázi existují (ověřeno kontrolou 22. 10. 2026), ale
**v seznamu SQL skriptů výše nejsou uvedené** – část vznikla přímo
v SQL editoru Supabase a skripty se do repozitáře nedostaly. Repozitář tedy
zřejmě nestačí k přesnému znovuvytvoření
databáze; to je známý dluh (viz níže). Aktuální skutečnou konfiguraci vyexportuje
`export-konfigurace.sql`.

Storage se nastavuje přes rozhraní, ne SQL – viz `FOTKY-NASTAVENI.md`
a `FOTKY-ZUZENI.md`.

### E-mail o nové poptávce

Spouštěč `notif_nova_poptavka()` (`security definer`, pevný `search_path`)
vybere všechny řemeslníky s `chce_emaily` a vyplněným e-mailem a zavolá
`posli_notifikaci('nova_poptavka', …)`. Filtr podle města byl záměrně odstraněn
(dřív byl pevně na Brno; pro pilot dostanou e-mail všichni řemeslníci, protože
celá aplikace je jen pro Olomouc). Při růstu bude potřeba filtr vrátit.

### Kontrola a testy

| Soubor | Účel |
|---|---|
| `bezpecnostni-testy.sql` | 31 útočných testů proti pravidlům |
| `storage-testy.sql` | 12 testů pro Storage |
| `audit-rpc.sql` | 22 testů volatelnosti funkcí |
| `kontrola.sql`, `kontrola2.sql`, `audit-funkci.sql` | kontrola konfigurace |
| `kontrola-kontakty-zruseni.sql` | jen čte: existují tabulky/sloupce, je zapnuté RLS, nemá pravidlo `true`, není telefon v popisech (poslední běh 22. 10. 2026: vše OK) |
| `export-konfigurace.sql` | export nastavení k posouzení, bez dat |
| `session-testy.js` | testy přihlášení (konzole prohlížeče) |

**Testy spouštěj po každé změně**, která přidá tabulku, funkci nebo spouštěč –
ne jen při auditu. Osm reálných děr se našlo právě takhle, a polovina z nich
vznikla z čerstvě psaného kódu.

**Poctivě:** velké sady testů naposledy běžely 14. 8. 2026. Od té doby přibyly
tabulky (`oblibene`, `odstoupeni`, `hodnoceni`), sloupce a funkce a sady nebyly
znovu spuštěné ani rozšířené. Viz `SECURITY_TESTS.md`.

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

### Content Security Policy

`vercel.json` nastavuje přísnou CSP: skripty jen z vlastního původu
(`'unsafe-inline'` je povolené kvůli inline skriptům v `index.html`) a
z jsDelivr/unpkg, obrázky z povoleného seznamu (Supabase, mapové dlaždice,
Google a Facebook avatary). Nová externí zdroj = nutno doplnit do CSP, jinak
ho prohlížeč zablokuje.

### Prostředí na Vercelu

`api/borek-ai.js` vyžaduje `SUPABASE_URL` a `SUPABASE_ANON_KEY` v proměnných
prostředí (a klíč ke Gemini). Bez nich vrátí chybu – záložní hodnoty tam
schválně nejsou, aby chybějící nastavení nezůstalo nepovšimnuté.

Po změně proměnných je nutné **znovu nasadit**, jinak se nepromítnou.

## Známé nedodělky

**Obsah nahraných souborů se nekontroluje.** Limity bucketů hlídají hlavičku od
prohlížeče, ne skutečný obsah. Zmírňuje to, že bucket není veřejný a soubory se
nikdy nespouštějí jako stránka.

**E-maily chodí z osobní schránky na Seznamu.** Předmět proto nemůže obsahovat
diakritiku – použitá knihovna ji kóduje chybně. Zhoršuje to doručitelnost.
Řeší přechod na Resend s doménovou schránkou.

**Edge Function `notifikace` v repozitáři je novější než nasazená.** Změna
výchozího města na Olomouc (kosmetika v textu e-mailu) je v `index.ts`, ale
nasazuje se přes CLI a zatím nasazená nebyla.

**Registrace se dá zneužít k obcházení limitů** – deset účtů, deset limitů.
Zmírněno potvrzováním e-mailu a omezením registrací z jedné IP.

**Geografické omezení je jen ve frontendu** (viz výše).

**SQL skripty pravděpodobně nepokrývají celou databázi** (viz upozornění v sekci Databáze).

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

**Nasazení** běží přes Vercel napojený na repozitář. Soubory se do
repozitáře nahrávají přes webové rozhraní GitHubu – při přepisu zkontroluj,
že se nahrál soubor pod správným názvem.
