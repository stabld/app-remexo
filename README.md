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
