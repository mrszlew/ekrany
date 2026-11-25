/**
 * EKRANY WNEiZ UMK - skrypt arkusza (Google Apps Script)
 *
 * 1. Arkusz Google > Rozszerzenia > Apps Script > wklej cały ten plik zamiast domyślnego kodu.
 * 2. Wybierz u góry funkcję "przygotujArkusz" i kliknij Uruchom (za pierwszym razem Google poprosi o zgody).
 * 3. Wdróż > Nowe wdrożenie > Aplikacja internetowa: "Wykonuj jako: Ja", "Kto ma dostęp: Wszyscy".
 * 4. Skopiowany adres (kończy się na /exec) wklej do pliku config.js na serwerze.
 * Po każdej zmianie TEGO kodu: Wdróż > Zarządzaj wdrożeniami > ołówek > Wersja: Nowa wersja > Wdróż.
 */

var PIN_DOMYSLNY = '950524';
var FOLDER_GRAFIK = 'Ekrany WNEiZ - grafiki';
var ARK = {slajdy: 'Slajdy', wydarzenia: 'Wydarzenia', ustawienia: 'Ustawienia'};

/* ---------------- odczyt (ekran i panel) ---------------- */
function doGet(e) {
  try {
    return json_(dane_());
  } catch (err) {
    return json_({ok: false, error: String(err && err.message || err)});
  }
}

function dane_() {
  var cache = CacheService.getScriptCache(), c = cache.get('dane');
  if (c) return JSON.parse(c);
  var ss = SpreadsheetApp.getActive();
  var d = {
    ok: true,
    slajdy: tabela_(ss.getSheetByName(ARK.slajdy)),
    wydarzenia: tabela_(ss.getSheetByName(ARK.wydarzenia)),
    ustawienia: ustawienia_(ss.getSheetByName(ARK.ustawienia))
  };
  d.rev = hash_(JSON.stringify([d.slajdy, d.wydarzenia, d.ustawienia]));
  d.updated = PropertiesService.getScriptProperties().getProperty('ZAPIS') || '';
  var s = JSON.stringify(d);
  if (s.length < 90000) cache.put('dane', s, 15);
  return d;
}

/* wiersze jako obiekty {nagłówek: tekst widoczny w komórce} */
function tabela_(sh) {
  if (!sh || sh.getLastRow() < 2) return [];
  var v = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getDisplayValues();
  var h = v[0].map(function (x) { return String(x).trim(); }), out = [];
  for (var r = 1; r < v.length; r++) {
    if (!v[r].join('').trim()) continue;
    var o = {};
    h.forEach(function (k, i) { if (k) o[k] = v[r][i]; });
    out.push(o);
  }
  return out;
}

function ustawienia_(sh) {
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 2).getDisplayValues()
    .filter(function (r) { return String(r[0]).trim(); });
}

/* ---------------- zapis (panel) ---------------- */
function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); } catch (x) { return json_({ok: false, error: 'zapytanie', message: 'Nieprawidłowe zapytanie.'}); }
  try {
    var blad = sprawdzPin_(req.pin);
    if (blad) return json_(blad);
    if (req.a === 'sprawdz') return json_({ok: true, rev: dane_().rev});
    if (req.a === 'zapisz') return json_(zapisz_(req));
    if (req.a === 'grafika') return json_(grafika_(req));
    if (req.a === 'pin') return json_(zmienPin_(req));
    return json_({ok: false, error: 'akcja', message: 'Nieznana akcja.'});
  } catch (err) {
    return json_({ok: false, error: 'wyjatek', message: String(err && err.message || err)});
  }
}

function sprawdzPin_(pin) {
  var cache = CacheService.getScriptCache();
  var proby = +(cache.get('bledy') || 0);
  if (proby >= 10) return {ok: false, error: 'blokada', message: 'Zbyt wiele błędnych prób PIN-u. Spróbuj ponownie za 5 minut.'};
  var wlasciwy = PropertiesService.getScriptProperties().getProperty('PIN') || PIN_DOMYSLNY;
  if (String(pin || '') !== String(wlasciwy)) {
    cache.put('bledy', String(proby + 1), 300);
    Utilities.sleep(600);
    return {ok: false, error: 'pin', message: 'Nieprawidłowy PIN.'};
  }
  return null;
}

function zapisz_(req) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return {ok: false, error: 'zajete', message: 'Ktoś inny właśnie zapisuje. Spróbuj za chwilę.'};
  try {
    CacheService.getScriptCache().remove('dane');
    var teraz = dane_();
    if (!req.wymus && req.rev && req.rev !== teraz.rev) {
      return {ok: false, error: 'konflikt', message: 'W międzyczasie ktoś zmienił treści (w panelu albo bezpośrednio w arkuszu).', rev: teraz.rev};
    }
    var d = req.dane || {}, ss = SpreadsheetApp.getActive();
    if (d.slajdy) zapiszTabele_(arkusz_(ss, ARK.slajdy), d.slajdy.headers, d.slajdy.rows);
    if (d.wydarzenia) {
      var sh = arkusz_(ss, ARK.wydarzenia);
      zapiszTabele_(sh, d.wydarzenia.headers, d.wydarzenia.rows);
    }
    if (d.ustawienia) zapiszUstawienia_(arkusz_(ss, ARK.ustawienia), d.ustawienia);
    formatuj_(ss);
    SpreadsheetApp.flush();
    var kto = String(req.kto || '').slice(0, 60);
    PropertiesService.getScriptProperties().setProperty('ZAPIS', Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd HH:mm') + (kto ? ' (' + kto + ')' : ''));
    CacheService.getScriptCache().remove('dane');
    var nowe = dane_();
    return {ok: true, rev: nowe.rev, updated: nowe.updated};
  } finally {
    lock.releaseLock();
  }
}

function arkusz_(ss, nazwa) { return ss.getSheetByName(nazwa) || ss.insertSheet(nazwa); }

function zapiszTabele_(sh, headers, rows) {
  if (!headers || !headers.length) return;
  rows = (rows || []).map(function (r) { var x = r.slice(0, headers.length); while (x.length < headers.length) x.push(''); return x.map(function (v) { return v == null ? '' : String(v); }); });
  var last = Math.max(sh.getLastRow(), 1), cols = Math.max(sh.getLastColumn(), headers.length);
  sh.getRange(1, 1, last, cols).clearContent();
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length) {
    var rg = sh.getRange(2, 1, rows.length, headers.length);
    rg.setNumberFormat('@');           // zapis jako zwykły tekst: daty i godziny nie zmienią formatu
    rg.setValues(rows);
  }
}

function zapiszUstawienia_(sh, pary) {
  var opis = {};
  if (sh.getLastRow() >= 2) sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues().forEach(function (r) { opis[r[0]] = r[2]; });
  var last = Math.max(sh.getLastRow(), 1);
  sh.getRange(1, 1, last, Math.max(sh.getLastColumn(), 3)).clearContent();
  sh.getRange(1, 1, 1, 3).setValues([['Ustawienie', 'Wartość', 'Opis']]);
  var rows = pary.map(function (p) { return [String(p[0]), p[1] == null ? '' : String(p[1]), opis[p[0]] || OPISY_[p[0]] || '']; });
  if (rows.length) { var rg = sh.getRange(2, 1, rows.length, 3); rg.setNumberFormat('@'); rg.setValues(rows); }
}

/* ---------------- grafiki na Dysku ---------------- */
function grafika_(req) {
  if (!req.data) return {ok: false, error: 'plik', message: 'Brak pliku.'};
  var mime = String(req.mime || 'image/jpeg');
  if (!/^image\/(jpeg|png|webp|gif)$/.test(mime)) return {ok: false, error: 'plik', message: 'Dozwolone są tylko obrazy JPG, PNG, WebP i GIF.'};
  var bytes = Utilities.base64Decode(String(req.data).replace(/^data:[^,]+,/, ''));
  if (bytes.length > 8 * 1024 * 1024) return {ok: false, error: 'plik', message: 'Plik jest za duży (limit 8 MB).'};
  var it = DriveApp.getFoldersByName(FOLDER_GRAFIK);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_GRAFIK);
  var nazwa = String(req.name || 'grafika').replace(/[^\w.\- ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, '_').slice(0, 80);
  var f = folder.createFile(Utilities.newBlob(bytes, mime, nazwa));
  var udostepniono = true;
  try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
  catch (x) { udostepniono = false; }
  return {ok: true, id: f.getId(), url: 'https://drive.google.com/thumbnail?id=' + f.getId() + '&sz=w1920', udostepniono: udostepniono};
}

function zmienPin_(req) {
  var nowy = String(req.nowy || '');
  if (!/^\d{4,12}$/.test(nowy)) return {ok: false, error: 'pin', message: 'Nowy PIN musi mieć od 4 do 12 cyfr.'};
  PropertiesService.getScriptProperties().setProperty('PIN', nowy);
  return {ok: true};
}

/* ---------------- pomocnicze ---------------- */
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function hash_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, s, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('').slice(0, 16);
}

/* ---------------- przygotowanie arkusza (uruchom raz) ---------------- */
function przygotujArkusz() {
  var ss = SpreadsheetApp.getActive();
  var S = START_;
  [[ARK.slajdy, S.SC, S.slajdy], [ARK.wydarzenia, S.EC, S.wydarzenia]].forEach(function (t) {
    var sh = arkusz_(ss, t[0]);
    if (sh.getLastRow() < 2) zapiszTabele_(sh, t[1], t[2].map(function (o) { return t[1].map(function (k) { return o[k] || ''; }); }));
  });
  var u = arkusz_(ss, ARK.ustawienia);
  if (u.getLastRow() < 2) zapiszUstawienia_(u, S.ustawienia);
  var def = ss.getSheetByName('Arkusz1') || ss.getSheetByName('Sheet1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 3) ss.deleteSheet(def);
  formatuj_(ss);
  if (!PropertiesService.getScriptProperties().getProperty('PIN')) PropertiesService.getScriptProperties().setProperty('PIN', PIN_DOMYSLNY);
  CacheService.getScriptCache().remove('dane');
  try { SpreadsheetApp.getUi().alert('Gotowe. Teraz: Wdróż > Nowe wdrożenie > Aplikacja internetowa (Wykonuj jako: Ja, Kto ma dostęp: Wszyscy).'); } catch (x) {}
}

/* wygląd i listy wyboru - wywoływane też po każdym zapisie */
function formatuj_(ss) {
  var niebieski = '#0050aa';
  var tak = SpreadsheetApp.newDataValidation().requireValueInList(['TAK', 'NIE'], true).setAllowInvalid(true).build();
  var sh = ss.getSheetByName(ARK.slajdy);
  if (sh) {
    var h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var n = Math.max(sh.getMaxRows() - 1, 1);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, h.length).setBackground(niebieski).setFontColor('#ffffff').setFontWeight('bold');
    var kol = function (nazwa) { return h.indexOf(nazwa) + 1; };
    if (kol('Aktywny')) sh.getRange(2, kol('Aktywny'), n).setDataValidation(tak);
    if (kol('Typ')) sh.getRange(2, kol('Typ'), n).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Grafika', 'Komunikat', 'Powitanie', 'Liczba', 'Odliczanie', 'Kod QR', 'Zdjęcie z tekstem'], true).setAllowInvalid(true).build());
    if (kol('Tło')) sh.getRange(2, kol('Tło'), n).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Niebieskie', 'Białe'], true).setAllowInvalid(true).build());
    if (!sh.getRange(1, 1).getNote()) {
      sh.getRange(1, 1).setNote('Każdy wiersz to jeden slajd. Kolejność wyświetlania wg kolumny Kolejność. Daty wpisuj jako RRRR-MM-DD (np. 2026-12-01). Puste pola są pomijane.');
      sh.setColumnWidths(1, h.length, 140);
      if (kol('Tytuł')) sh.setColumnWidth(kol('Tytuł'), 320);
      if (kol('Treść')) sh.setColumnWidth(kol('Treść'), 360);
      if (kol('Grafika / zdjęcie (link)')) sh.setColumnWidth(kol('Grafika / zdjęcie (link)'), 280);
    }
  }
  var ev = ss.getSheetByName(ARK.wydarzenia);
  if (ev) {
    var eh = ev.getRange(1, 1, 1, ev.getLastColumn()).getValues()[0];
    ev.setFrozenRows(1);
    ev.getRange(1, 1, 1, eh.length).setBackground(niebieski).setFontColor('#ffffff').setFontWeight('bold');
    var ia = eh.indexOf('Aktywne') + 1;
    if (ia) ev.getRange(2, ia, Math.max(ev.getMaxRows() - 1, 1)).setDataValidation(tak);
    if (!ev.getRange(1, 1).getNote()) {
      ev.getRange(1, 1).setNote('Data: RRRR-MM-DD, godzina: GG:MM (może być pusta). Wydarzenie znika z ekranu 90 minut po rozpoczęciu (bez godziny - po końcu dnia).');
      ev.setColumnWidths(1, eh.length, 130);
      if (eh.indexOf('Tytuł') >= 0) ev.setColumnWidth(eh.indexOf('Tytuł') + 1, 340);
      if (eh.indexOf('Opis') >= 0) ev.setColumnWidth(eh.indexOf('Opis') + 1, 300);
      if (eh.indexOf('Miejsce') >= 0) ev.setColumnWidth(eh.indexOf('Miejsce') + 1, 220);
    }
  }
  var u = ss.getSheetByName(ARK.ustawienia);
  if (u) {
    u.setFrozenRows(1);
    u.getRange(1, 1, 1, 3).setBackground(niebieski).setFontColor('#ffffff').setFontWeight('bold');
    u.setColumnWidth(1, 330); u.setColumnWidth(2, 420); u.setColumnWidth(3, 380);
    var opisy = u.getRange(1, 3, u.getMaxRows()); opisy.setFontColor('#5d7aa6');
    var nm = u.getRange(2, 1, Math.max(u.getLastRow() - 1, 1), 1).getValues();
    nm.forEach(function (r, i) {
      var c = u.getRange(i + 2, 2);
      if (r[0] === 'Dolny pasek') c.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Przewijany tekst', 'Akredytacje', 'Brak'], true).setAllowInvalid(true).build());
      else if (/włączony|na grafikach|cały slajd/.test(r[0])) c.setDataValidation(tak);
    });
  }
}

var OPISY_ = {
 "Dolny pasek": "Przewijany tekst / Akredytacje / Brak",
 "Etykieta paska": "Napis w niebieskim polu po lewej stronie paska",
 "Tekst paska": "Kolejne komunikaty oddziel znakiem |",
 "Pasek także na grafikach": "TAK albo NIE",
 "Slajd z wydarzeniami co ile slajdów": "Liczba slajdów, po których wraca lista wydarzeń",
 "Czas slajdu z wydarzeniami (s)": "",
 "Pokazuj wydarzenia na ile dni naprzód": "",
 "Domyślny czas grafiki (s)": "Gdy w kolumnie Czas nic nie wpisano",
 "Domyślny czas komunikatu (s)": "Gdy w kolumnie Czas nic nie wpisano",
 "Pilny komunikat włączony": "TAK albo NIE",
 "Pilny komunikat: etykieta": "",
 "Pilny komunikat: treść": "",
 "Pilny komunikat: także jako cały slajd": "TAK albo NIE",
 "Pilny komunikat: wyłącz automatycznie": "Data i godzina, np. 2026-12-01 16:00",
 "Pilny komunikat: ogłoszono": "Uzupełnia się samo przy zapisie z panelu",
 "h": "s"
};

/* treści startowe (przeniesione z dotychczasowego panelu) */
var START_ = {
 "SC": [
  "ID",
  "Kolejność",
  "Aktywny",
  "Typ",
  "Tło",
  "Etykieta",
  "Tytuł",
  "Wyróżnienie",
  "Treść",
  "Grafika / zdjęcie (link)",
  "Liczba",
  "Odliczaj do",
  "Link do kodu QR",
  "Termin",
  "Miejsce",
  "Więcej",
  "Czas (s)",
  "Wyświetlaj od",
  "Wyświetlaj do"
 ],
 "EC": [
  "ID",
  "Aktywne",
  "Data",
  "Godzina",
  "Tytuł",
  "Opis",
  "Miejsce"
 ],
 "slajdy": [
  {
   "ID": "fr8hwpo7q1",
   "Kolejność": "1",
   "Aktywny": "NIE",
   "Typ": "Komunikat",
   "Tło": "Białe",
   "Etykieta": "",
   "Tytuł": "Rector's Hours",
   "Wyróżnienie": "",
   "Treść": "By decision of the Rector of Nicolaus Copernicus University, Rector's Hours will be in effect on Friday, October 30, starting at 2:00 p.m.",
   "Grafika / zdjęcie (link)": "",
   "Liczba": "",
   "Odliczaj do": "",
   "Link do kodu QR": "",
   "Termin": "",
   "Miejsce": "",
   "Więcej": "",
   "Czas (s)": "10",
   "Wyświetlaj od": "",
   "Wyświetlaj do": ""
  },
  {
   "ID": "pop46zypml",
   "Kolejność": "2",
   "Aktywny": "TAK",
   "Typ": "Kod QR",
   "Tło": "Niebieskie",
   "Etykieta": "Rusza kolejna edycja programu!",
   "Tytuł": "Zgłoś się do grona Ambasadorów naszego Wydziału!",
   "Wyróżnienie": "",
   "Treść": "Lubisz działać w mediach społecznościowych? Chcesz sprawdzić się przed kamerą? Czekamy na Ciebie!",
   "Grafika / zdjęcie (link)": "",
   "Liczba": "",
   "Odliczaj do": "",
   "Link do kodu QR": "https://www.econ.umk.pl/wiadomosci/?id=47262",
   "Termin": "",
   "Miejsce": "",
   "Więcej": "",
   "Czas (s)": "10",
   "Wyświetlaj od": "",
   "Wyświetlaj do": ""
  },
  {
   "ID": "scpx44slqj",
   "Kolejność": "3",
   "Aktywny": "TAK",
   "Typ": "Grafika",
   "Tło": "",
   "Etykieta": "",
   "Tytuł": "",
   "Wyróżnienie": "",
   "Treść": "",
   "Grafika / zdjęcie (link)": "grafiki/grafika-1.webp",
   "Liczba": "",
   "Odliczaj do": "",
   "Link do kodu QR": "",
   "Termin": "",
   "Miejsce": "",
   "Więcej": "",
   "Czas (s)": "5",
   "Wyświetlaj od": "",
   "Wyświetlaj do": ""
  },
  {
   "ID": "i2",
   "Kolejność": "4",
   "Aktywny": "TAK",
   "Typ": "Komunikat",
   "Tło": "Niebieskie",
   "Etykieta": "Biuro Karier",
   "Tytuł": "Dyżur doradcy kariery w każdy wtorek, godz. 12:30 - 14:30",
   "Wyróżnienie": "",
   "Treść": "Konsultacje CV i przygotowanie do rozmów rekrutacyjnych.\nPrzeszklona sala przy BIZNESHUBIE.",
   "Grafika / zdjęcie (link)": "",
   "Liczba": "",
   "Odliczaj do": "",
   "Link do kodu QR": "",
   "Termin": "",
   "Miejsce": "",
   "Więcej": "",
   "Czas (s)": "10",
   "Wyświetlaj od": "",
   "Wyświetlaj do": ""
  },
  {
   "ID": "w7g0xd2lrc",
   "Kolejność": "5",
   "Aktywny": "TAK",
   "Typ": "Grafika",
   "Tło": "",
   "Etykieta": "",
   "Tytuł": "",
   "Wyróżnienie": "",
   "Treść": "",
   "Grafika / zdjęcie (link)": "grafiki/grafika-2.webp",
   "Liczba": "",
   "Odliczaj do": "",
   "Link do kodu QR": "",
   "Termin": "",
   "Miejsce": "",
   "Więcej": "",
   "Czas (s)": "5",
   "Wyświetlaj od": "",
   "Wyświetlaj do": ""
  },
  {
   "ID": "lodtrfpls6",
   "Kolejność": "6",
   "Aktywny": "TAK",
   "Typ": "Grafika",
   "Tło": "",
   "Etykieta": "",
   "Tytuł": "",
   "Wyróżnienie": "",
   "Treść": "",
   "Grafika / zdjęcie (link)": "grafiki/grafika-3.webp",
   "Liczba": "",
   "Odliczaj do": "",
   "Link do kodu QR": "",
   "Termin": "",
   "Miejsce": "",
   "Więcej": "",
   "Czas (s)": "3",
   "Wyświetlaj od": "",
   "Wyświetlaj do": ""
  },
  {
   "ID": "ddqevdolsy",
   "Kolejność": "7",
   "Aktywny": "TAK",
   "Typ": "Grafika",
   "Tło": "",
   "Etykieta": "",
   "Tytuł": "",
   "Wyróżnienie": "",
   "Treść": "",
   "Grafika / zdjęcie (link)": "grafiki/grafika-4.webp",
   "Liczba": "",
   "Odliczaj do": "",
   "Link do kodu QR": "",
   "Termin": "",
   "Miejsce": "",
   "Więcej": "",
   "Czas (s)": "5",
   "Wyświetlaj od": "",
   "Wyświetlaj do": ""
  },
  {
   "ID": "przyklad-powitanie",
   "Kolejność": "8",
   "Aktywny": "NIE",
   "Typ": "Powitanie",
   "Tło": "",
   "Etykieta": "Witamy uczestników",
   "Tytuł": "Konferencja",
   "Wyróżnienie": "Kół Naukowych 2026",
   "Treść": "",
   "Grafika / zdjęcie (link)": "",
   "Liczba": "",
   "Odliczaj do": "",
   "Link do kodu QR": "",
   "Termin": "12 grudnia 2026 | godz. 9:00",
   "Miejsce": "Aula A, ul. Gagarina 13a",
   "Więcej": "",
   "Czas (s)": "12",
   "Wyświetlaj od": "",
   "Wyświetlaj do": ""
  },
  {
   "ID": "przyklad-liczba",
   "Kolejność": "9",
   "Aktywny": "NIE",
   "Typ": "Liczba",
   "Tło": "",
   "Etykieta": "Wydział w liczbach",
   "Tytuł": "najlepszych szkół biznesu",
   "Wyróżnienie": "na świecie",
   "Treść": "Tyle uczelni ma jednocześnie akredytacje AACSB i AMBA.",
   "Grafika / zdjęcie (link)": "",
   "Liczba": "6%",
   "Odliczaj do": "",
   "Link do kodu QR": "",
   "Termin": "",
   "Miejsce": "",
   "Więcej": "",
   "Czas (s)": "10",
   "Wyświetlaj od": "",
   "Wyświetlaj do": ""
  },
  {
   "ID": "przyklad-odliczanie",
   "Kolejność": "10",
   "Aktywny": "NIE",
   "Typ": "Odliczanie",
   "Tło": "",
   "Etykieta": "Już niedługo",
   "Tytuł": "Piernikowe",
   "Wyróżnienie": "Targi Pracy",
   "Treść": "",
   "Grafika / zdjęcie (link)": "",
   "Liczba": "",
   "Odliczaj do": "2027-03-18 10:00",
   "Link do kodu QR": "",
   "Termin": "",
   "Miejsce": "Hol główny",
   "Więcej": "",
   "Czas (s)": "10",
   "Wyświetlaj od": "",
   "Wyświetlaj do": ""
  },
  {
   "ID": "przyklad-zdjecie",
   "Kolejność": "11",
   "Aktywny": "NIE",
   "Typ": "Zdjęcie z tekstem",
   "Tło": "",
   "Etykieta": "Relacja",
   "Tytuł": "Tak było na Kosmicznym Meczu Ekonomisty",
   "Wyróżnienie": "",
   "Treść": "",
   "Grafika / zdjęcie (link)": "grafiki/grafika-1.webp",
   "Liczba": "",
   "Odliczaj do": "",
   "Link do kodu QR": "",
   "Termin": "18 listopada 2026",
   "Miejsce": "UCS Toruń",
   "Więcej": "",
   "Czas (s)": "10",
   "Wyświetlaj od": "",
   "Wyświetlaj do": ""
  }
 ],
 "wydarzenia": [
  {
   "ID": "dpi5pj92pj",
   "Aktywne": "TAK",
   "Data": "2026-11-04",
   "Godzina": "10:00",
   "Tytuł": "Event z każdej strony #8",
   "Opis": "",
   "Miejsce": "Hotel Bulwar"
  },
  {
   "ID": "oak3sticnn",
   "Aktywne": "TAK",
   "Data": "2026-11-04",
   "Godzina": "",
   "Tytuł": "Architekci biznesu #2",
   "Opis": "",
   "Miejsce": ""
  },
  {
   "ID": "qqw15jh1u4",
   "Aktywne": "TAK",
   "Data": "2026-11-18",
   "Godzina": "19:30",
   "Tytuł": "Kosmiczny Mecz Ekonomisty",
   "Opis": "Turniej studenci vs. drużyna Dziekan",
   "Miejsce": "UCS, ul. św. Józefa 18"
  }
 ],
 "ustawienia": [
  [
   "Dolny pasek",
   "Przewijany tekst"
  ],
  [
   "Etykieta paska",
   "DZIEŃ DOBRY"
  ],
  [
   "Tekst paska",
   "Witamy na Wydziale Nauk Ekonomicznych i Zarządzania UMK w Toruniu | Obserwuj nas w mediach społecznościowych, by być na bieżąco z aktualnościami z naszego Wydziału: @wneiz.umk"
  ],
  [
   "Pasek także na grafikach",
   "NIE"
  ],
  [
   "Slajd z wydarzeniami co ile slajdów",
   "3"
  ],
  [
   "Czas slajdu z wydarzeniami (s)",
   "14"
  ],
  [
   "Pokazuj wydarzenia na ile dni naprzód",
   "60"
  ],
  [
   "Domyślny czas grafiki (s)",
   "10"
  ],
  [
   "Domyślny czas komunikatu (s)",
   "10"
  ],
  [
   "Pilny komunikat włączony",
   "NIE"
  ],
  [
   "Pilny komunikat: etykieta",
   "UWAGA"
  ],
  [
   "Pilny komunikat: treść",
   "Decyzją JM Rektora UMK w piątek 30 października od godz. 14:00 będą obowiązywać godziny rektorskie"
  ],
  [
   "Pilny komunikat: także jako cały slajd",
   "TAK"
  ],
  [
   "Pilny komunikat: wyłącz automatycznie",
   ""
  ],
  [
   "Pilny komunikat: ogłoszono",
   "2026-10-29 14:42"
  ]
 ]
};
