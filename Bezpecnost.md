# Bezpečnostní audit Remexo

Datum: 6. 8. 2026. Rozsah: frontend (`js/`, `app.js`, `index.html`), serverless
funkce (`api/`), přístupová pravidla v `README.md`.

**Co v rozsahu nebylo:** skutečné nastavení Supabase (nemám do projektu
přístup), Storage buckety, konfigurace Vercelu, závislosti třetích stran.
U těchto bodů níže píšu, co je potřeba ověřit ručně.

---

## Opraveno v rámci auditu

### 1. XSS v seznamu konverzací — VÁŽNÉ

`js/chat.js` vkládal jméno protistrany a název poptávky do stránky bez
ošetření. Řemeslník si mohl nastavit jméno na `<img src=x onerror="...">`
a ten kód se spustil v prohlížeči každého zákazníka, kterému se zobrazil
v seznamu zpráv. Odtud jde vytáhnout přihlašovací token.

Ověřeno v prohlížeči: před opravou se kód spustil, po opravě se jméno zobrazí
jako neškodný text.

### 2. Chybějící pravidla u tabulky s kontakty — VÁŽNÉ

Tabulka `poptavka_kontakt` (telefon a ulice zákazníka) neměla v repozitáři
žádný SQL, tedy ani RLS. Filtrování běželo jen ve frontendu, takže kdokoliv
přihlášený si mohl přes API stáhnout telefony všech zákazníků.

Řeší kroky 9 a 10 v README. Ověřeno na PostgreSQL: řemeslník s čekající
nabídkou i cizí uživatel vidí 0 kontaktů, řemeslník s přijatou nabídkou vidí
jen tu svoji.

### 3. Neošetřený text na dalších dvou místech — NÍZKÉ

Odpověď Bořka (`features.js`) a názvy poptávek na nástěnce (`ui.js`) se
vkládaly syrové. Dopad byl omezený, protože jde o vlastní data uživatele,
ale opraveno taky.

---

## Nalezeno, NEOPRAVENO — vyžaduje rozhodnutí

### A. Fotky závad jsou v popisu poptávky — STŘEDNÍ až VÁŽNÉ

Fotky se neukládají do Storage. Jsou zakódované jako base64 přímo v textu
sloupce `description`, ve tvaru `||PHOTO||<base64>||MIME||`.

Důsledky:

**Soukromí.** Popis poptávky vidí na tržišti každý přihlášený uživatel, ne
jen řemeslníci a ne jen ti, kdo podali nabídku. Registrovat se může kdokoliv.
Fotky závady přitom běžně zachycují interiér bytu. Je to stejná chyba, jakou
jsme právě opravili u telefonu — data, která mají být pro vybraného
řemeslníka, se posílají všem.

**Výkon.** Base64 nafoukne data o třetinu. Pět fotek z mobilu snadno znamená
několik MB v jednom řádku databáze, a tržiště načítá popisy všech poptávek
najednou. Tohle je pravděpodobný důvod, proč je aplikace po přihlášení pomalá,
i když samotné načtení stránky je rychlé.

**Co s tím:** nahrávat fotky do Storage bucketu s neveřejným přístupem,
v poptávce držet jen odkaz, a řemeslníkům je zpřístupňovat přes dočasné
podepsané odkazy. Ve stejné logice, jakou používá `poptavka_kontakt`.

### B. Avatary v Storage — NEOVĚŘENO

`js/features.js` nahrává profilové fotky do bucketu `avatars` pod jménem
`<user_id>.jpg` a čte je přes veřejnou adresu.

Cesta je odhadnutelná. Pokud bucket nemá pravidla omezující zápis na vlastní
soubor, může kdokoliv přepsat avatar komukoliv jinému.

**Ověř ručně** v Supabase → Storage → avatars → Policies, že zápis a mazání
jsou omezené podmínkou na `auth.uid()` v názvu souboru.

### C. Systémový prompt posílá klient — STŘEDNÍ

`/api/borek-ai` bere `systemPrompt` z těla požadavku a předá ho modelu.
Přihlášený uživatel si tedy může poslat libovolné instrukce a použít vaši
Gemini kvótu na cokoliv — od psaní seminárek po generování obsahu, za který
neseš odpovědnost ty.

Limit 30 dotazů za hodinu na uživatele to zdrží, ale registrace je zdarma.

**Co s tím:** držet prompty na serveru a z klienta posílat jen typ operace,
například `{ rezim: "poptavka" }` nebo `{ rezim: "poradce" }`.

### D. Limit dotazů se ztrácí — NÍZKÉ

Počítadlo v `api/borek-ai.js` je obyčejná `Map` v paměti funkce. Vercel
serverless instance vypíná a spouští znovu, takže se limit resetuje. Kdo to ví,
obejde ho.

**Co s tím:** počítat v databázi, ne v paměti.

### E. Žádné limity na zakládání poptávek a nabídek — STŘEDNÍ

Ve frontendu ani v pravidlech není nic, co by bránilo založit tisíc poptávek
za minutu. Před spuštěním by to mělo mít strop.

---

## K ověření přímo v Supabase

Tohle z kódu nezjistím:

1. Je RLS opravdu zapnuté na všech tabulkách? Skript v README pokrývá
   `requests`, `offers`, `messages`, `hodnoceni`, `oblibene`,
   `poptavka_kontakt`. Pokud vznikly další tabulky, mají vlastní pravidla?
2. Tabulka `profiles` — kontrolní skript v README ukazoval, že ji smí číst
   kdokoliv. Jsou v ní telefony nebo e-maily?
3. Pravidla u Storage bucketů.
4. Je vypnutá veřejná registrace do rolí, které nemají být samoobslužné?

---

## Doporučené pořadí

1. Nasadit opravený `js/chat.js` (XSS) — hned.
2. Spustit kroky 9 a 10 v Supabase (kontakty) — hned.
3. Ověřit pravidla u bucketu `avatars`.
4. Přesunout fotky závad do Storage — před spuštěním ostrého provozu.
5. Přesunout systémové prompty na server.
6. Doplnit limity na zakládání poptávek.

---

## Poznámka na závěr

Tenhle audit dělal jazykový model čtením zdrojového kódu, ne bezpečnostní
specialista s testovacím prostředím. Našel jsem, co jsem našel — neznamená to,
že tam nic dalšího není. Než začnete zpracovávat skutečné adresy a telefony
lidí, stojí za zvážení nechat to projít někým, kdo tohle dělá profesionálně.
