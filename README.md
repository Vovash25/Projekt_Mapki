# Mapa uczelni – WIMiM ZUT

Aplikacja z mapą jednego budynku:
**Wydział Inżynierii Mechanicznej i Mechatroniki (hala technologiczna „stara”/dydaktyczny)**,
ul. Sikorskiego 38, 70-323 Szczecin.

Na zdjęciu satelitarnym budynku są nakładki: wyszukiwarka (sale, wykładowcy) i panele
z informacjami o sali oraz jej planem zajęć.

---

## Spis treści

1. [Szybki start](#1-szybki-start)
2. [Struktura projektu](#2-struktura-projektu)
3. [Dane: Excel → baza](#3-dane-excel--baza)
4. [Baza danych](#4-baza-danych)
5. [Serwer i API](#5-serwer-i-api)
6. [Frontend](#6-frontend)
7. [Plan sali – ZAŚLEPKA](#7-plan-sali--zaślepka)
8. [Popularne w wyszukiwarce](#8-popularne-w-wyszukiwarce)
9. [Integracja z mapą (fallback)](#9-integracja-z-mapą-fallback)
10. [Co jest wymyślone, a co prawdziwe](#10-co-jest-wymyślone-a-co-prawdziwe)
11. [Do zrobienia / do ustalenia](#11-do-zrobienia--do-ustalenia)

---

## 1. Szybki start

Wymagany Python 3.10+.

```
pip install -r requirements.txt
python baza_danych/create_db.py
python backend/server.py
```

Potem w przeglądarce: **http://localhost:5000**
Z telefonu w tej samej sieci Wi-Fi: `http://<IP komputera>:5000`.

`create_db.py` trzeba uruchomić tylko po zmianie plików Excel (baza `uczelnia.db` jest już w projekcie).

Samo otwarcie `frontend/index.html` bez serwera pokaże mapę i wyszukiwarkę,
ale panele sali i „Popularne” nie dostaną danych.

---

## 2. Struktura projektu

```
projekt/
├── excel_do_wypelniania/
│   ├── sale.xlsx              dane sal (edytowane w Excelu)
│   └── wykladowcy.xlsx        dane wykładowców (edytowane w Excelu)
├── baza_danych/
│   ├── schema.sql             struktura tabel
│   ├── create_db.py           Excel -> baza + generowanie listy do wyszukiwarki
│   ├── room_info.py           get_room_info(), get_building_info()
│   ├── popular.py             log_selection(), get_popular()
│   └── uczelnia.db            baza SQLite
├── backend/
│   ├── server.py              serwer Flask: strona + API
│   └── schedule.py            plan sali (ZAŚLEPKA – patrz rozdział 7)
├── frontend/
│   ├── index.html             strona
│   ├── style.css              wygląd
│   ├── app.js                 mapa
│   ├── search.js              wyszukiwarka
│   ├── room-panel.js          panele sali
│   └── search-data.js         GENEROWANY przez create_db.py – nie edytować ręcznie
├── requirements.txt           openpyxl, flask
└── README.md
```

---

## 3. Dane: Excel → baza

Sale i wykładowcy są w plikach Excel w `excel_do_wypelniania/`. Każdy plik ma dwa arkusze:

- **pierwszy** (`Sale` / `Wykładowcy`) – dane, jeden wiersz = jeden wpis, pierwszy wiersz to nazwy kolumn (nie zmieniać),
- **Instrukcja** – opis kolumn z przykładami.

### Jak zmienić dane

1. Otwórz plik w Excelu, popraw / dopisz wiersze, zapisz (zwykłe „Zapisz”, format .xlsx).
2. Uruchom `python baza_danych/create_db.py`.

Skrypt:
1. tworzy tabele (jeśli ich nie ma),
2. wpisuje dane budynku,
3. **zastępuje** sale i wykładowców w bazie tym, co jest w plikach Excel
   (usunięty wiersz w Excelu = usunięty z bazy),
4. generuje `frontend/search-data.js` – listę dla wyszukiwarki.

Historia wyborów w wyszukiwarce (`search_log`) zostaje nietknięta.

Skrypt zatrzyma się z komunikatem, jeśli w pliku brakuje kolumny albo to samo `id` występuje dwa razy.

### `sale.xlsx`

| Kolumna | Co wpisać | Przykład |
|---|---|---|
| `id` | ID sali – **takie samo jak ID sali na mapie**, unikalne | `301` |
| `number` | numer wyświetlany w aplikacji | `301` |
| `wing` | skrzydło | `A` |
| `floor` | piętro (0 = parter) | `3` |
| `capacity` | liczba miejsc | `60` |
| `owner` | właściciel / opiekun sali | `Wydział Inżynierii Mechanicznej i Mechatroniki` |
| `room_type` | rodzaj sali | `wykładowa`, `ćwiczeniowa`, `laboratorium`, `komputerowa` |
| `equipment` | wyposażenie | `rzutnik, tablica` |
| `notes` | inne informacje (opcjonalnie) | |

### `wykladowcy.xlsx`

| Kolumna | Co wpisać | Przykład |
|---|---|---|
| `id` | ID wykładowcy, unikalne | `w1` |
| `name` | imię i nazwisko z tytułem (tak widać w wyszukiwarce) | `dr inż. Jan Kowalski` |
| `room_id` | gabinet = `id` sali z `sale.xlsx` (opcjonalnie) | `102` |
| `notes` | inne informacje (opcjonalnie) | |

Kolumny z numerami (`id`, `number`, `room_id`) mają w Excelu format „tekst”, żeby Excel nie ucinał zer
na początku. Zielone trójkąciki „liczba zapisana jako tekst” są więc zamierzone.

### Dane budynku

Są w `baza_danych/create_db.py`, w słowniku `BUILDING` (adres, kierownicy obiektu, dojazd, wejścia,
dostępność, parking, pies asystujący, tłumacz języka migowego). Po zmianie: uruchomić `create_db.py`.

---

## 4. Baza danych

SQLite, plik `baza_danych/uczelnia.db`. Struktura w `baza_danych/schema.sql`.

| Tabela | Zawartość | Skąd |
|---|---|---|
| `building` | dokładnie jeden wiersz: dane budynku | `create_db.py` (`BUILDING`) |
| `rooms` | sale | `sale.xlsx` |
| `lecturers` | wykładowcy | `wykladowcy.xlsx` |
| `search_log` | każdy wybór w wyszukiwarce (typ, id, nazwa, czas UTC) | aplikacja, sama |

Pola tak/nie w `building` (winda, pochylnia, toaleta dla osób niepełnosprawnych itd.) są zapisane jako 1/0,
a funkcje Pythona zwracają je jako `True`/`False`.

**Zmiana `schema.sql`** – `CREATE TABLE IF NOT EXISTS` nie zmienia istniejących tabel, więc po zmianie
struktury trzeba usunąć `uczelnia.db` i uruchomić `create_db.py` (historia `search_log` przepadnie).

### Funkcje Pythona

```python
from room_info import get_room_info, get_building_info
from popular import get_popular, log_selection

get_room_info("301")
# {"room": {...dane sali...}, "building": {...dane budynku...}}  albo None, jeśli nie ma sali

get_building_info()
# {...dane budynku...}

log_selection("wykladowca", "w2", "Wykładowca 2")   # zapis wyboru
get_popular()                    # top 5 z ostatnich 30 dni (sale + wykładowcy)
get_popular("wykladowca", limit=10, days=7)
```

Z linii poleceń (z głównego folderu):

```
python baza_danych/popular.py              top 5
python baza_danych/popular.py wykladowca   top 5 wykładowców
```

---

## 5. Serwer i API

`backend/server.py` (Flask) robi dwie rzeczy: serwuje stronę z `frontend/` i udostępnia API,
które wywołuje funkcje z `baza_danych/` i `backend/schedule.py`.
Przeglądarka nie może wywołać funkcji Pythona bezpośrednio – dlatego potrzebny jest serwer.

Uruchomienie: `python backend/server.py` (port 5000, dostęp także z innych urządzeń w sieci).

| Metoda i adres | Co zwraca | Funkcja |
|---|---|---|
| `GET /api/rooms/<id>` | dane sali + budynku; 404, jeśli nie ma sali | `get_room_info` |
| `GET /api/rooms/<id>/schedule` | plan sali na dziś; `?date=RRRR-MM-DD` – inny dzień | `get_schedule` |
| `GET /api/building` | dane budynku | `get_building_info` |
| `GET /api/popular?limit=5&type=&days=30` | „Popularne” | `get_popular` |
| `POST /api/search-log` | zapis wyboru, body: `{"type": "sala"/"wykladowca", "id": "...", "label": "..."}`; 204 albo 400 | `log_selection` |

Błędy API wracają jako JSON: `{"error": "opis"}`.

---

## 6. Frontend

Czysty HTML/CSS/JS, bez frameworka. Mapa: [Leaflet](https://leafletjs.com) + zdjęcia satelitarne Esri.

### Nakładki na mapę

Wszystko leży w kontenerze `#app` z `position: relative`. Mapa wypełnia go w całości (`z-index: 1`),
a nakładki mają klasę `.overlay` (`position: absolute; z-index: 100`), więc rysują się nad mapą.
Kolejność warstw od dołu: mapa → panele sali → panel wyszukiwania → search bar.

### Mapa (`app.js`)

- Na start widać cały budynek, możliwie jak największy. `BUILDING_BOUNDS` to prostokąt obejmujący budynek
  (kształt U z dziedzińcem); Leaflet dobiera zoom tak, żeby się zmieścił (`zoomSnap: 0` – zoom ułamkowy,
  więc budynek wypełnia ekran dokładnie).
- Na górze jest margines 80 px na search bar.
- Po zmianie rozmiaru (obrót telefonu, zmiana okna, pasek adresu) widok dopasowuje się ponownie
  (`ResizeObserver`).
- Gdy otwarty jest panel sali, budynek przesuwa się tak, żeby nie był pod panelem (`setMapInset`).
- Wysokość strony to `100dvh` – na telefonie bez „skakania” przez pasek adresu.

### Wyszukiwarka (`search.js`)

- Klik w pole → panel na cały ekran. Klawiatura to zwykła klawiatura systemu (Android pokazuje ją sam).
- Puste pole → „Popularne” z bazy; jeśli jeszcze ich nie ma – podpowiedź.
- Wpisywanie → wyniki na żywo. Wielkość liter i polskie znaki nie mają znaczenia
  (`wykladowca` = `Wykładowca`), można wpisać kilka słów.
- Kolejność wyników: najpierw dokładne trafienie w nazwę, potem nazwy zaczynające się od zapytania,
  na końcu trafienia tylko w dopisek (np. „Gabinet 102”).
- Enter = pierwszy wynik, × czyści pole.
- Wybór **sali** → panel sali. Wybór **wykładowcy** → panel jego gabinetu (jeśli ma `room_id`).
- Każdy wybór jest wysyłany do `POST /api/search-log` (z tego liczą się „Popularne”).
- Zamykanie: strzałka ←, Esc albo systemowe „wstecz” na Androidzie (wyszukiwarka zamyka się,
  zamiast wychodzić z aplikacji).

Lista do wyszukiwania jest w `search-data.js` – generuje go `create_db.py` z bazy.

### Panele sali (`room-panel.js`)

`showRoom(id)` pokazuje dwie karty:

1. **Informacje o sali** – numer, rodzaj, piętro, skrzydło, pojemność, wyposażenie, właściciel, adres budynku.
   Jeśli sala jest wyżej niż parter, a budynek nie ma windy – ostrzeżenie, że prowadzą tylko schody.
2. **Plan sali na dziś** – zajęcia po kolei; minione są wyszarzone, trwające oznaczone „teraz”.

Duży ekran (≥ 700 px): karty po prawej. Telefon: panel wysuwany od dołu.
Zamykanie: ×, Esc, „wstecz” na Androidzie. Obsłużone stany: ładowanie, brak sali w bazie, brak połączenia.

---

## 7. Plan sali – ZAŚLEPKA

> **Plan zajęć, który widać teraz w aplikacji, jest WYMYŚLONY.**

Kod, który pobiera prawdziwy plan sali z uczelni, napisał kolega i nie jest jeszcze podłączony.
Do tego czasu `backend/schedule.py` generuje plan sam:

- `USE_DEMO = True` → funkcja `get_schedule()` nie pyta uczelni, tylko składa plan:
  - bierze stałe godziny zajęć: 08:00–09:30, 09:45–11:15, 11:30–13:00, 13:15–14:45, 15:00–16:30,
  - ok. 3/4 z nich wypełnia przedmiotem z listy (`Matematyka`, `Automatyka`, `Mechanika techniczna`…)
    i „Wykładowca N”,
  - „losowość” zależy od numeru sali i daty – ta sama sala w ten sam dzień ma zawsze ten sam plan,
  - w weekend brak zajęć.
- Przedmioty i wykładowcy w planie **nie pochodzą** z bazy ani z Excela.

### Jak podłączyć prawdziwy plan

W `backend/schedule.py`:

1. ustawić `USE_DEMO = False`,
2. w funkcji `get_schedule(room_id, day)`, zamiast `return []` na końcu, wywołać kod kolegi.

Funkcja musi zwracać listę zajęć w tym formacie (brakujące pola mogą być `None`):

```python
[
    {"date": "2026-10-12", "start": "08:00", "end": "09:30",
     "title": "Matematyka", "lecturer": "dr inż. Jan Kowalski", "group": "MiBM 1"},
    ...
]
```

Nic więcej nie trzeba zmieniać – API i panel w aplikacji już używają tej funkcji.

---

## 8. Popularne w wyszukiwarce

„Popularne” to prawdziwa statystyka, nie lista wpisana na sztywno:

1. Ktoś wybiera w wyszukiwarce np. „Wykładowca 2” → frontend wysyła to do `POST /api/search-log`.
2. `log_selection()` zapisuje wiersz w tabeli `search_log` (typ, id, nazwa, czas).
3. Przy otwarciu wyszukiwarki frontend pyta `GET /api/popular`.
4. `get_popular()` liczy, co wybierano najczęściej w ostatnich 30 dniach i zwraca top 5.
   Przy remisie wyżej jest to, co wybrano ostatnio. Jeśli nazwa się zmieniła (np. nowy tytuł),
   pokazuje się najnowsza.

Na starcie tabela jest pusta, więc „Popularne” pojawią się dopiero, gdy ludzie zaczną korzystać z wyszukiwarki.

---

## 9. Integracja z mapą (fallback)

Gdy użytkownik kliknie salę na mapie, wystarczy wywołać w JavaScript:

```js
showRoom("301");
```

`"301"` to `id` sali – musi być takie samo jak w kolumnie `id` w `sale.xlsx`.
Opcjonalnie można dodać nagłówek nad numerem sali:

```js
showRoom("102", { title: "Gabinet: dr inż. Jan Kowalski" });
```

Zamknięcie panelu z kodu: `closeRoom()`.

---

## 10. Co jest wymyślone, a co prawdziwe

| Element | Stan |
|---|---|
| Dane budynku (adres, kierownicy, dojazd, dostępność, parking…) | **prawdziwe** |
| Położenie i obrys budynku na mapie | **prawdziwe** (zdjęcie satelitarne Esri) |
| Sale 101–105, 201–205, 301–305 w `sale.xlsx` | wymyślone – do zastąpienia |
| Wykładowca 1–10 w `wykladowcy.xlsx` | wymyślone – do zastąpienia |
| Plan sali | **wymyślony** – zaślepka, rozdział 7 |
| „Popularne” | prawdziwe (liczone z wyborów w aplikacji) |

---

## 11. Do zrobienia / do ustalenia

- [ ] Podłączyć kod kolegi z planem sali (rozdział 7).
- [ ] Wpisać prawdziwe sale i wykładowców do plików Excel.
- [ ] Ustalić, jakie ID sali przekazuje mapa (fallback) – musi pasować do `id` w `sale.xlsx`.
- [ ] Ustalić, co pokazywać po wyborze wykładowcy (teraz: jego gabinet).
- [ ] Ustalić, czym jest „Nr dziennika” w wyszukiwarce – teraz nieobsługiwany.
- [ ] Sprawdzić na telefonie z Androidem (WebView czy przeglądarka).
