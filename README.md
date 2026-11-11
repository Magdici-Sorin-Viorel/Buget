# Buget Familie

Bugetul casei, ținut pe calculatorul tău. Fără cont, fără abonament, fără internet — și fără ca datele tale să plece undeva.

Scrii cheltuielile și veniturile, iar aplicația îți arată cât ai, pe ce se duc banii, cât rămâne la sfârșit de lună și cum arată lucrurile de la an la an.

---

## Unde îți stau datele

**Într-un fișier de pe calculatorul tău**, pe care îl alegi tu la prima pornire — de obicei `buget-familie.json`. Aplicația scrie în el singură, după fiecare modificare.

Asta înseamnă două lucruri importante:

- **Nu există server.** Nimeni, nici autorul aplicației, nu are acces la banii tăi. Nu se colectează nimic, nu se trimite nimic. Poți verifica singur — tot codul e aici.
- **Datele nu dispar dacă cureți browserul.** Fișierul e al tău, ca orice alt document. Dacă ștergi istoricul, reinstalezi Windows sau schimbi browserul, îl deschizi din nou și ai tot.

> **Sfat:** pune fișierul într-un folder din **Google Drive** sau **OneDrive**. Așa ai automat și o copie în cloud, și îți poți deschide bugetul de pe alt calculator.

Pe lângă fișierul principal, aplicația ține:
- **copii datate** în subfolderul `copii` (ultimele 14 zile);
- **o copie pe zi în browser** (ultimele 20), pentru revenirea rapidă după o greșeală;
- **export în Excel** pentru orice an, iar fișierul Excel conține și o copie completă a datelor, din care se pot reface toate.

---

## Cum o folosești

1. Deschide aplicația: **[link-ul GitHub Pages al proiectului]**
2. La prima pornire, un ghid scurt te întreabă unde ții fișierul și cine aduce venit în casă. Durează sub un minut.
3. **Instaleaz-o** din iconița din bara de adrese (Chrome sau Edge). Pornește apoi ca un program obișnuit, din Start Menu, și își păstrează singură legătura cu fișierul tău.

Dacă preferi, poți descărca proiectul și să-l deschizi local — vezi mai jos.

---

## De ce ai nevoie

| | |
|---|---|
| **Merge perfect** | Google Chrome sau Microsoft Edge, pe Windows, macOS sau Linux |
| **Merge, dar salvezi manual** | Firefox și Safari — aceste browsere nu permit aplicațiilor web să scrie direct într-un fișier, deci salvezi și încarci copia cu un buton |
| **Nu e gândită pentru** | telefon și tabletă — interfața e făcută pentru ecran mare |

---

## Ce trebuie să știi înainte să te bazezi pe ea

Fiind o aplicație care ține totul la tine, responsabilitatea copiilor de siguranță e tot a ta:

- **Dacă pierzi fișierul și n-ai nicio copie, datele sunt pierdute.** Nu există „recuperare cont", pentru că nu există cont.
- **Nu lucra în același timp pe două calculatoare** cu același fișier sincronizat prin Drive. Aplicația te avertizează când observă că fișierul a fost modificat în altă parte și te lasă să alegi ce păstrezi, dar nu îmbină automat două variante.
- **Nu există parolă.** Oricine deschide calculatorul și aplicația vede bugetul.
- Dacă nu alegi un fișier, datele rămân doar în browser — și atunci chiar se pierd la curățarea lui. Aplicația îți spune asta printr-o bandă galbenă, până alegi unul.

---

## Ce are

- **Cheltuieli** — introducere rapidă a bonurilor: aduni sumă după sumă ca pe un calculator de mână și salvezi tot bonul dintr-o dată.
- **Venituri** — pe persoane și pe tipuri de venit.
- **Buget pe categorii** (opțional) — sume puse deoparte, bare de progres, alerte de depășire.
- **Statistici** — evoluție lunară, cheltuieli pe categorii cu medie pe zi, încasări pe luni, tabel anual și comparație între ani.
- **Economii și investiții** — aur, valută, acțiuni, teren, cu împărțire pe persoane, cursuri scrise de tine și calcul corect de profit/pierdere la vânzare.
- **Așezare liberă a cardurilor** — muți și redimensionezi fiecare card, pe fiecare pagină.
- **Export în Excel** și copii de siguranță în `.json`.

Interfața e în română.

---

## Pentru cine vrea să umble la cod

Aplicație statică: HTML, CSS și JavaScript simplu, fără framework, fără pași de build, fără dependențe de instalat.

```
index.html              pagina
css/style.css           tot stilul
js/cats.js              categoriile implicite, lunile
js/storage.js           unde se salvează datele (fișier + IndexedDB)
js/core.js              datele aplicației și calculele
js/ui.js                navigare, ferestre, grafice, așezarea cardurilor
js/dashboard.js … js/savings.js    paginile
js/welcome.js           ghidul de prima pornire
js/exportxls.js         export în Excel
js/app.js               pornirea
sw.js                   funcționarea offline
lib/                    Chart.js, SheetJS, Font Awesome
```

Ca să o rulezi local, ai nevoie de un server (scrierea în fișier și service worker-ul nu merg de pe `file://`):

```bash
python3 -m http.server 8080
# apoi deschizi http://localhost:8080
```

Publicarea pe GitHub Pages: Settings → Pages → Source: `main` / root. Nu e nevoie de nimic altceva.

---

## Licență

Codul: [MIT](LICENSE) — folosește-l, modifică-l, publică-l, cu sau fără schimbări.

Bibliotecile incluse își păstrează licențele lor; vezi [CREDITE.md](CREDITE.md).

Aplicația vine **fără nicio garanție**. Îți ține socoteala banilor, nu răspunde de ei.
