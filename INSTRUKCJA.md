# Ekrany WNEiZ UMK: arkusz + panel na serwerze

## Jak to działa

```
Arkusz Google (Slajdy, Wydarzenia, Ustawienia)
        ↑ zapis                      ↓ odczyt co 60 s
   panel.html  ── skrypt Apps Script ──  ekran.html (komputery przy monitorach)
```

- Treści są w jednym **Arkuszu Google**. Można je zmieniać na dwa sposoby: w **panelu** (wygodnie, z podglądem) albo **bezpośrednio w arkuszu**.
- **Ekran** co minutę sprawdza arkusz i podmienia treść **bez przeładowania strony**. Pełny ekran zostaje włączony, a nowe treści pojawiają się od następnego slajdu.
- Do panelu wchodzi każdy, kto zna **PIN** (domyślnie `950524`, zmienisz go w panelu). PIN jest sprawdzany przez skrypt, więc nie widać go w kodzie strony.
- Jeśli internet na chwilę zniknie, ekran wyświetla ostatnią pobraną treść i sam wraca, gdy połączenie wróci.

## Zawartość paczki

| Plik / folder | Do czego służy |
|---|---|
| `ekran.html` | strona do otwarcia na komputerach przy monitorach |
| `panel.html` | panel edycji dla zespołu |
| `config.js` | **tu wklejasz adres skryptu** (jedyny plik do zmiany) |
| `silnik.js`, `ekrany.css` | wygląd i logika slajdów (wspólne dla ekranu i panelu) |
| `img/`, `fonts/` | logo WNEiZ, logotypy AACSB i AMBA, font Lato (działa bez Google Fonts) |
| `grafiki/` | obecne grafiki z pętli (w arkuszu wpisane jako `grafiki/grafika-1.webp` itd.) |
| `Kod.gs` | kod skryptu do wklejenia w Arkuszu Google |
| `demo.js` | przykładowe dane, używane tylko, gdy `config.js` jest pusty |

## Uruchomienie (jednorazowo, ok. 10 minut)

### 1. Arkusz i skrypt
1. Utwórz nowy **Arkusz Google**, np. „Ekrany WNEiZ”, na koncie, które ma zostać właścicielem (najlepiej konto wydziałowe, a nie prywatne).
2. **Rozszerzenia > Apps Script**. Usuń domyślny kod, wklej całą zawartość `Kod.gs`, zapisz (ikona dyskietki).
3. U góry wybierz funkcję **`przygotujArkusz`** i kliknij **Uruchom**. Google poprosi o zgody (Zaawansowane > Przejdź do projektu). Funkcja tworzy zakładki Slajdy, Wydarzenia, Ustawienia z listami wyboru i wpisuje obecne treści.
4. **Wdróż > Nowe wdrożenie** > typ **Aplikacja internetowa**:
   - Wykonuj jako: **Ja**
   - Kto ma dostęp: **Wszyscy**
5. Skopiuj **adres aplikacji** (kończy się na `/exec`).

### 2. Pliki na serwerze
1. Otwórz `config.js` i wklej adres w `url: '...'`. Opcjonalnie wklej adres arkusza w `arkusz: '...'` - w panelu pojawi się przycisk „Arkusz”.
2. Wgraj **cały folder** na serwer wydziału, np. jako `econ.umk.pl/ekrany/`.
3. Panel: `…/ekrany/panel.html`, ekran: `…/ekrany/ekran.html`.

### 3. Komputery przy monitorach
- Otwórz `ekran.html` i kliknij „Pełny ekran” (albo klawisz **F**).
- Najwygodniej w trybie kiosku Chrome (bez pasków, sam wraca po restarcie):
  `chrome --kiosk --autoplay-policy=no-user-gesture-required "https://…/ekrany/ekran.html?kiosk"`
  Skrót do tej komendy warto dodać do autostartu systemu.
- Klawisze na ekranie: **spacja** pauza, **strzałki** poprzedni/następny slajd.
- Raz na dobę (o 4:00) ekran sam się przeładowuje dla porządku.

## Praca na co dzień

**W panelu:** PIN > zmiany > **Zapisz zmiany** (albo Ctrl+S). Ekrany pokażą je najpóźniej po minucie.
- **Slajdy:** kafelki z podglądem, przeciąganie zmienia kolejność, przełącznik włącza i wyłącza slajd bez usuwania. Dla każdego slajdu można ustawić okres wyświetlania (od dnia / do dnia).
- **Wydarzenia:** data, godzina, tytuł, opis, miejsce. Ekran pokazuje po 4 na slajdzie, od najbliższego. Wydarzenie znika 90 minut po rozpoczęciu. Przycisk „Usuń minione” czyści listę.
- **Pilny komunikat:** pasek na dole wszystkich ekranów i osobny slajd co 3 slajdy. Można ustawić automatyczne wyłączenie.
- **Ustawienia:** dolny pasek (przewijany tekst / akredytacje AACSB i AMBA / nic), czasy slajdów, kopia zapasowa JSON, zmiana PIN-u.
- **Kilka osób naraz:** jeśli ktoś zapisał zmiany w międzyczasie, panel to wykryje i zapyta, czy pobrać najnowszą wersję, czy nadpisać.

**Bezpośrednio w arkuszu:** każdy wiersz w „Slajdy” to jeden slajd. Daty wpisuj jako `RRRR-MM-DD` (np. `2026-12-01`), godziny jako `GG:MM`. Ekran zauważy zmianę sam, bez klikania czegokolwiek.

**Rodzaje slajdów:** Grafika (gotowa 1920×1080), Komunikat, Powitanie, Liczba, Odliczanie, Kod QR, Zdjęcie z tekstem. W arkuszu są przykłady każdego rodzaju (wyłączone) - wystarczy je włączyć i zmienić tekst.

## Grafiki: trzy sposoby

1. **Wgraj plik w panelu** - trafi na Dysk Google właściciela arkusza (folder „Ekrany WNEiZ - grafiki”) i dostanie link. Panel sam zmniejsza plik do 1920 px.
2. **Wklej link** - do pliku na Dysku Google (udostępnionego „każdy, kto ma link”) albo do obrazka na dowolnej stronie.
3. **Wgraj plik na serwer** do folderu `grafiki/` i wpisz w panelu `grafiki/nazwa.jpg`. To najpewniejsza droga.

> **Uwaga:** jeśli arkusz jest na koncie UMK, a domena blokuje udostępnianie plików na zewnątrz, panel o tym powie przy wgrywaniu. Wtedy użyj sposobu 3 albo załóż arkusz na koncie, które pozwala na udostępnianie linkiem.

## Dobrze wiedzieć

- **Zmiana kodu skryptu** (`Kod.gs`) wymaga nowej wersji wdrożenia: Wdróż > Zarządzaj wdrożeniami > ołówek > Wersja: **Nowa wersja** > Wdróż. Adres `/exec` się nie zmienia. Zmiana treści w arkuszu niczego takiego nie wymaga.
- **Dostęp do arkusza:** osoby, które mają edytować bezpośrednio w arkuszu, dodaj przez „Udostępnij”. Do pracy w panelu wystarczy PIN.
- **Własne kolumny** dodane w arkuszu zostaną usunięte przy zapisie z panelu - panel zapisuje stały zestaw kolumn.
- **Zablokowany PIN:** po 10 błędnych próbach panel blokuje się na 5 minut.
- **Limity Google:** ekran pyta arkusz raz na minutę, więc nawet kilkanaście ekranów mieści się w darmowych limitach z dużym zapasem.
- **Sprawdzenie skryptu:** adres `/exec` otwarty w przeglądarce powinien pokazać tekst zaczynający się od `{"ok":true`.
