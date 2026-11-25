/* Ekrany WNEiZ - wspólny silnik ekranu i panelu.
   Dane pochodzą z Arkusza Google przez skrypt Apps Script (adres w config.js). */
(function(){
'use strict';
var E = window.Ekrany = {};
var CFG = window.EKRANY_CONFIG || {};
E.cfg = CFG;

/* ---------- słowniki arkusza ---------- */
E.SLIDE_COLS = [
  ['ID','id'],['Kolejność','order'],['Aktywny','active'],['Typ','type'],['Tło','bg'],['Etykieta','chip'],
  ['Tytuł','title'],['Wyróżnienie','accent'],['Treść','body'],['Grafika / zdjęcie (link)','image'],
  ['Liczba','number'],['Odliczaj do','target'],['Link do kodu QR','qr'],['Termin','term'],['Miejsce','place'],
  ['Więcej','more'],['Czas (s)','duration'],['Wyświetlaj od','from'],['Wyświetlaj do','until']
];
E.EVENT_COLS = [['ID','id'],['Aktywne','active'],['Data','date'],['Godzina','time'],['Tytuł','title'],['Opis','desc'],['Miejsce','place']];
E.TYPES = [
  ['image','Grafika'],['info','Komunikat'],['welcome','Powitanie'],['number','Liczba'],
  ['countdown','Odliczanie'],['qr','Kod QR'],['photo','Zdjęcie z tekstem']
];
E.BGS = [['blue','Niebieskie'],['white','Białe']];
E.SETTINGS = [
  ['bar','Dolny pasek','Przewijany tekst','Przewijany tekst / Akredytacje / Brak'],
  ['barLabel','Etykieta paska','INFO','Napis w niebieskim polu po lewej stronie paska'],
  ['barText','Tekst paska','','Kolejne komunikaty oddziel znakiem |'],
  ['barOnImages','Pasek także na grafikach','NIE','TAK albo NIE'],
  ['evEvery','Slajd z wydarzeniami co ile slajdów','3','Liczba slajdów, po których wraca lista wydarzeń'],
  ['evDur','Czas slajdu z wydarzeniami (s)','14',''],
  ['evDays','Pokazuj wydarzenia na ile dni naprzód','60',''],
  ['imgDur','Domyślny czas grafiki (s)','10','Gdy w kolumnie Czas nic nie wpisano'],
  ['infoDur','Domyślny czas komunikatu (s)','12','Gdy w kolumnie Czas nic nie wpisano'],
  ['alertOn','Pilny komunikat włączony','NIE','TAK albo NIE'],
  ['alertLabel','Pilny komunikat: etykieta','PILNE',''],
  ['alertText','Pilny komunikat: treść','',''],
  ['alertFull','Pilny komunikat: także jako cały slajd','TAK','TAK albo NIE'],
  ['alertUntil','Pilny komunikat: wyłącz automatycznie','','Data i godzina, np. 2026-12-01 16:00'],
  ['alertSince','Pilny komunikat: ogłoszono','','Uzupełnia się samo przy zapisie z panelu']
];
function typeCode(v){ v = String(v||'').trim().toLowerCase(); for (var i=0;i<E.TYPES.length;i++){ if (E.TYPES[i][1].toLowerCase()===v || E.TYPES[i][0]===v) return E.TYPES[i][0]; } if (/graf|obraz/.test(v)) return 'image'; if (/zdj|foto/.test(v)) return 'photo'; if (/qr/.test(v)) return 'qr'; if (/odlicz/.test(v)) return 'countdown'; if (/licz/.test(v)) return 'number'; if (/witam|powit/.test(v)) return 'welcome'; return 'info'; }
function typeLabel(c){ for (var i=0;i<E.TYPES.length;i++) if (E.TYPES[i][0]===c) return E.TYPES[i][1]; return 'Komunikat'; }
E.typeLabel = typeLabel;
function yes(v, dflt){ if (v===true||v===false) return v; v = String(v==null?'':v).trim().toLowerCase(); if (!v) return !!dflt; return /^(tak|t|true|1|yes|y|x|✓)$/.test(v); }
E.yes = yes;

/* ---------- pomocnicze ---------- */
var pad = E.pad = function(n){ return (n<10?'0':'')+n; };
var esc = E.esc = function(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
var nl2br = function(s){ return s.replace(/\n/g,'<br>'); };
var MON = ['stycznia','lutego','marca','kwietnia','maja','czerwca','lipca','sierpnia','września','października','listopada','grudnia'];
var MONS = ['STY','LUT','MAR','KWI','MAJ','CZE','LIP','SIE','WRZ','PAŹ','LIS','GRU'];
var DAYS = ['niedziela','poniedziałek','wtorek','środa','czwartek','piątek','sobota'];
E.MON = MON; E.MONS = MONS; E.DAYS = DAYS;
var ymd = E.ymd = function(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); };
var hm = E.hm = function(d){ d=d||new Date(); return pad(d.getHours())+':'+pad(d.getMinutes()); };
E.dateStr = function(d){ d=d||new Date(); return DAYS[d.getDay()]+', '+d.getDate()+' '+MON[d.getMonth()]; };
var num = function(v, lo, hi, d){ v = parseInt(v,10); if (isNaN(v)) return d; return Math.max(lo, Math.min(hi, v)); };
/* data z arkusza: "2026-11-04", "2026-11-04T10:00", "4.11.2026", "4.11.2026 10:00" */
function parseDate(v){
  if (!v) return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  var s = String(v).trim(), m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2}))?/))) return new Date(+m[1], m[2]-1, +m[3], +(m[4]||0), +(m[5]||0));
  if ((m = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})(?:,?\s+(\d{1,2}):(\d{2}))?/))) return new Date(+m[3], m[2]-1, +m[1], +(m[4]||0), +(m[5]||0));
  var d = new Date(s); return isNaN(d) ? null : d;
}
E.parseDate = parseDate;
function normTime(v){ var m = String(v||'').match(/(\d{1,2})[:.](\d{2})/); return m ? pad(+m[1])+':'+m[2] : ''; }
function normDay(v){ var d = parseDate(v); return d ? ymd(d) : ''; }
function normDT(v){ var d = parseDate(v); if (!d) return ''; return ymd(d) + (d.getHours()||d.getMinutes() ? 'T'+hm(d) : 'T00:00'); }
E.normDay = normDay; E.normDT = normDT; E.normTime = normTime;
/* link do Dysku Google -> adres obrazka */
E.imgUrl = function(u){
  u = String(u||'').trim(); if (!u) return '';
  var m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{20,})/) || u.match(/docs\.google\.com\/uc\?.*id=([\w-]{20,})/);
  if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w1920';
  return u;
};
E.uid = function(){ return Math.random().toString(36).slice(2,8) + Date.now().toString(36).slice(-4); };

/* ---------- normalizacja danych z arkusza ---------- */
function rowToObj(row, cols){
  var o = {};
  cols.forEach(function(c){ var v = row[c[0]]; o[c[1]] = v==null ? '' : (v instanceof Date ? v : String(v)); });
  return o;
}
E.normalize = function(raw){
  raw = raw || {};
  var st = {rev: raw.rev || '', updated: raw.updated || '', slides: [], events: [], settings: {}};
  (raw.slajdy || []).forEach(function(r, i){
    var o = rowToObj(r, E.SLIDE_COLS);
    var empty = !String(o.title||'').trim() && !String(o.image||'').trim() && !String(o.body||'').trim() && !String(o.number||'').trim() && !String(o.qr||'').trim();
    if (empty) return;
    o.type = typeCode(o.type || (o.image && !o.title ? 'image' : 'info'));
    o.bg = /bia|white/i.test(o.bg) ? 'white' : 'blue';
    o.active = yes(o.active, true);
    o.order = parseFloat(String(o.order).replace(',','.')); if (isNaN(o.order)) o.order = 1000 + i;
    o._row = i;
    o.duration = String(o.duration||'').trim();
    o.target = normDT(o.target); o.from = normDay(o.from); o.until = normDay(o.until);
    o.id = String(o.id||'').trim() || ('w' + i);
    st.slides.push(o);
  });
  st.slides.sort(function(a,b){ return a.order - b.order || a._row - b._row; });
  (raw.wydarzenia || []).forEach(function(r, i){
    var o = rowToObj(r, E.EVENT_COLS);
    if (!String(o.title||'').trim() || !normDay(o.date)) return;
    o.active = yes(o.active, true); o.date = normDay(o.date); o.time = normTime(o.time);
    o.id = String(o.id||'').trim() || ('e' + i);
    st.events.push(o);
  });
  var given = {};
  (raw.ustawienia || []).forEach(function(kv){ if (kv && kv[0]!=null) given[String(kv[0]).trim().toLowerCase()] = kv[1]; });
  E.SETTINGS.forEach(function(s){
    var v = given[s[1].toLowerCase()];
    st.settings[s[0]] = (v===undefined || v===null || String(v).trim()==='') && s[0]!=='barText' && s[0]!=='alertText' && s[0]!=='alertUntil' && s[0]!=='alertSince' ? s[2] : (v instanceof Date ? normDT(v) : String(v==null?'':v));
  });
  st.settings.alertUntil = normDT(st.settings.alertUntil); st.settings.alertSince = String(st.settings.alertSince||'');
  return st;
};
/* stan -> format zapisu do arkusza */
E.denormalize = function(st){
  var sh = E.SLIDE_COLS.map(function(c){ return c[0]; });
  var srows = st.slides.map(function(o, i){
    return E.SLIDE_COLS.map(function(c){
      var k = c[1], v = o[k];
      if (k==='order') return i+1;
      if (k==='active') return o.active===false ? 'NIE' : 'TAK';
      if (k==='type') return typeLabel(o.type);
      if (k==='bg') return o.bg==='white' ? 'Białe' : 'Niebieskie';
      if (k==='target') return o.target ? o.target.replace('T',' ') : '';
      return v==null ? '' : String(v);
    });
  });
  var eh = E.EVENT_COLS.map(function(c){ return c[0]; });
  var erows = st.events.map(function(o){ return E.EVENT_COLS.map(function(c){ var k=c[1]; if (k==='active') return o.active===false?'NIE':'TAK'; return o[k]==null?'':String(o[k]); }); });
  var set = E.SETTINGS.map(function(s){ var v = st.settings[s[0]]; if (s[0]==='alertUntil' && v) v = v.replace('T',' '); return [s[1], v==null?'':String(v)]; });
  return {slajdy:{headers:sh, rows:srows}, wydarzenia:{headers:eh, rows:erows}, ustawienia:set};
};

/* ---------- połączenie ze skryptem ---------- */
E.connected = function(){ return /^https?:\/\/\S+$/.test(String(CFG.url||'').trim()); };
E.load = function(){
  if (!E.connected()) return Promise.resolve(E.normalize(window.EKRANY_DEMO || {}));
  return fetch(CFG.url + (CFG.url.indexOf('?')<0?'?':'&') + 'a=dane&t=' + Date.now(), {cache:'no-store', redirect:'follow'})
    .then(function(r){ if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(j){ if (!j || j.ok===false) throw new Error((j && j.error) || 'Błąd skryptu'); return E.normalize(j); });
};
E.post = function(body){
  if (!E.connected()) return Promise.reject(Object.assign(new Error('Brak połączenia z arkuszem: uzupełnij adres skryptu w pliku config.js.'), {code:'offline'}));
  return fetch(CFG.url, {method:'POST', redirect:'follow', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify(body)})
    .then(function(r){ if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(j){ if (!j || j.ok===false){ var e = new Error((j && j.message) || 'Błąd skryptu'); e.code = j && j.error; e.data = j; throw e; } return j; });
};

/* ---------- logika wydarzeń i pętli ---------- */
function evStart(e){ var d = parseDate(e.date); if (!d) return null; var t = (e.time||'').split(':'); if (e.time) d.setHours(+t[0]||0, +t[1]||0); return d; }
function evEnd(e){ var s = evStart(e); if (!s) return new Date(0); return e.time ? new Date(s.getTime()+90*60000) : new Date(s.getFullYear(), s.getMonth(), s.getDate(), 23, 59); }
E.evStart = evStart; E.evEnd = evEnd;
E.upcoming = function(st, now){
  var lim = new Date(now.getTime() + num(st.settings.evDays,1,365,60)*864e5);
  return st.events.filter(function(e){ return e.active!==false && evEnd(e) >= now && evStart(e) <= lim; })
    .sort(function(a,b){ return evStart(a) - evStart(b); });
};
function rel(e, now){
  var s = evStart(e); if (e.time && now >= s) return {t:'Trwa teraz', hot:true};
  var dd = Math.round((new Date(s.getFullYear(),s.getMonth(),s.getDate()) - new Date(now.getFullYear(),now.getMonth(),now.getDate()))/864e5);
  if (dd<=0) return {t:'Dziś', hot:true}; if (dd===1) return {t:'Jutro'}; if (dd===2) return {t:'Pojutrze'}; return {t:'Za '+dd+' dni'};
}
E.rel = rel;
E.alertOn = function(st, now){
  var s = st.settings; if (!yes(s.alertOn) || !String(s.alertText||'').trim()) return false;
  if (s.alertUntil){ var u = parseDate(s.alertUntil); if (u && now >= u) return false; }
  return true;
};
E.visible = function(o, now){
  if (o.active===false) return false;
  var today = ymd(now);
  if (o.from && o.from > today) return false;
  if (o.until && o.until < today) return false;
  if (o.type==='countdown' && o.target){ var t = parseDate(o.target); if (t && t <= now) return false; }
  if (o.type==='image' && !String(o.image||'').trim()) return false;
  return true;
};
E.playlist = function(st, now){
  var s = st.settings, out = [];
  var items = st.slides.filter(function(o){ return E.visible(o, now); });
  var evs = E.upcoming(st, now), pages = [];
  for (var i=0;i<evs.length;i+=4) pages.push(evs.slice(i,i+4));
  var evSlides = pages.map(function(p,k){ return {key:'ev'+k+':'+p.map(function(e){return e.id;}).join(','), kind:'events', events:p, page:k+1, pages:pages.length, duration:num(s.evDur,4,120,14)}; });
  var every = num(s.evEvery,1,30,3);
  items.forEach(function(o, idx){
    var d = num(o.duration, 3, 600, num(o.type==='image' ? s.imgDur : s.infoDur, 3, 600, 10));
    out.push({key:o.id, kind:'slide', item:o, duration:d});
    if ((idx+1)%every===0 && evSlides.length) out = out.concat(evSlides);
  });
  if (evSlides.length && (items.length===0 || items.length%every!==0)) out = out.concat(evSlides);
  if (E.alertOn(st, now) && yes(s.alertFull, true)){
    var al = {key:'alert', kind:'alert', duration:12}, mixed = [al];
    out.forEach(function(e, i){ mixed.push(e); if ((i+1)%3===0 && i<out.length-1) mixed.push({key:'alert'+i, kind:'alert', duration:12}); });
    out = mixed;
  }
  if (!out.length) out.push({key:'idle', kind:'idle', duration:30});
  return out;
};

/* ---------- renderowanie slajdów ---------- */
var LOGO = CFG.logo || 'img/logo-wneiz.png';
function top(){
  return '<div class="ek-top"><img src="'+esc(LOGO)+'" alt="Uniwersytet Mikołaja Kopernika w Toruniu, Wydział Nauk Ekonomicznych i Zarządzania">'+
    '<div class="ek-topr"><div class="ek-site">econ.umk.pl</div><div class="ek-sep"></div><div class="ek-clock"><b class="js-time">'+hm()+'</b><span class="js-date">'+E.dateStr()+'</span></div></div></div>';
}
var CIRCLES = '<div class="ek-circles"><i class="c3"></i><i class="c2"></i><i class="c1"></i><b></b></div>';
function titleHTML(o, cls, n){
  var t = esc(String(o.title||'').trim()), a = esc(String(o.accent||'').trim());
  return '<h1 class="ek-title '+(cls||'')+'" data-in="'+(n||2)+'">'+nl2br(t)+(a ? (t?' ':'')+'<span class="ek-acc">'+nl2br(a)+'</span>' : '')+'</h1>';
}
function chip(o, dflt, n){ var c = String(o.chip||'').trim() || dflt || ''; return c ? '<div class="ek-chip" data-in="'+(n||1)+'">'+esc(c)+'</div>' : ''; }
function body(o, n){ var b = String(o.body||'').trim(); return b ? '<div class="ek-rule" data-in="'+n+'"></div><p class="ek-body" data-in="'+n+'">'+nl2br(esc(b))+'</p>' : ''; }
function facts(o, n){
  var f = [['Termin',o.term],['Miejsce',o.place],['Więcej',o.more]].filter(function(x){ return String(x[1]||'').trim(); });
  if (!f.length) return '';
  return '<div class="ek-facts" data-in="'+n+'">'+f.map(function(x){ return '<div class="ek-fact"><small>'+x[0]+'</small><span>'+esc(x[1])+'</span></div>'; }).join('')+'</div>';
}
function cdParts(ms){ ms = Math.max(0, ms||0); var s = Math.floor(ms/1000); return {d:String(Math.floor(s/86400)), h:pad(Math.floor(s%86400/3600)), m:pad(Math.floor(s%3600/60)), s:pad(s%60)}; }
function makeQR(box, text){
  if (!box) return; text = String(text||'').trim();
  if (!text){ box.textContent = 'Wpisz adres w kolumnie „Link do kodu QR”'; return; }
  if (typeof QRCode === 'undefined'){ box.textContent = text; return; }
  try { new QRCode(box, {text:text, width:430, height:430, colorDark:'#0b1f3a', colorLight:'#ffffff', correctLevel:QRCode.CorrectLevel.M}); box.removeAttribute('title'); }
  catch(e){ box.textContent = text; }
}
E.slideEl = function(entry, st, now){
  now = now || new Date();
  var el = document.createElement('div'), h = '', s = st.settings;
  el.className = 'ek-slide';
  if (entry.kind==='slide'){
    var o = entry.item, white = o.bg==='white' && o.type!=='photo';
    var F = '<div class="ek-field'+(white?' white':'')+'">';
    if (o.type==='image'){
      el.className += ' ek-image';
      var src = E.imgUrl(o.image);
      h = '<img alt="" src="'+esc(src)+'" style="animation-duration:'+(entry.duration+3)+'s" onerror="this.style.display=\'none\';this.nextSibling.hidden=false"><div class="ek-missing" hidden>Nie udało się wczytać grafiki<small>'+esc(o.image)+'</small></div>';
    } else if (o.type==='photo'){
      el.className += ' ek-photo-slide';
      var ps = E.imgUrl(o.image);
      h = top() + F + '<div class="ek-photo">'+(ps?'<img alt="" src="'+esc(ps)+'" onerror="this.remove()">':'')+'</div><div class="ek-shade"></div>'+
        '<div class="ek-content" data-ts="104" data-tb="34">'+chip(o,'',1)+
        (o.place?'<div class="ek-where" data-in="2" style="color:#fff;font-weight:700">'+esc(o.place)+'</div>':'')+
        titleHTML(o,'',3)+(o.term?'<div class="ek-when" data-in="4">'+esc(o.term)+'</div>':'')+
        (o.body?'<p class="ek-body" data-in="5">'+nl2br(esc(o.body))+'</p>':'')+'</div></div>';
    } else if (o.type==='welcome'){
      h = top() + F + CIRCLES + '<div class="ek-content" data-ts="150" data-tb="34">'+chip(o,'Witamy uczestników',1)+titleHTML(o,'ek-big',2)+
        (o.term?'<div class="ek-when" data-in="3">'+esc(o.term).replace(/\s*\|\s*/g,'<i>|</i>')+'</div>':'')+
        (o.place?'<div class="ek-where" data-in="4">'+esc(o.place)+'</div>':'')+
        (o.body?'<p class="ek-body" data-in="5">'+nl2br(esc(o.body))+'</p>':'')+'</div></div>';
    } else if (o.type==='number'){
      var n = String(o.number||'').trim() || '0', ns = n.length<=4?320:n.length<=6?260:n.length<=9?200:150;
      h = top() + F + CIRCLES + '<div class="ek-content" data-ts="84" data-tb="34">'+chip(o,'',1)+
        '<div class="ek-num js-count" data-in="2" data-v="'+esc(n)+'" style="font-size:'+ns+'px">'+esc(n)+'</div>'+
        ((o.title||o.accent)?titleHTML(o,'',3):'')+body(o,4)+'</div></div>';
    } else if (o.type==='countdown'){
      var tg = parseDate(o.target), cp = cdParts(tg ? tg-now : 0);
      h = top() + F + CIRCLES + '<div class="ek-content" data-ts="92" data-tb="32">'+chip(o,'Odliczanie',1)+titleHTML(o,'',2)+
        '<div class="ek-cd js-cd" data-in="3" data-t="'+(tg?tg.getTime():0)+'">'+
        [['d','dni'],['h','godz.'],['m','min'],['s','sek']].map(function(x){ return '<div><b class="cd-'+x[0]+'">'+cp[x[0]]+'</b><span>'+x[1]+'</span></div>'; }).join('')+'</div>'+
        (tg?'<div class="ek-where" data-in="4">'+DAYS[tg.getDay()]+', '+tg.getDate()+' '+MON[tg.getMonth()]+', godz. '+hm(tg)+(o.place?' · '+esc(o.place):'')+'</div>':'')+'</div></div>';
    } else if (o.type==='qr'){
      el.className += ' ek-qr';
      h = top() + F + '<div class="ek-content" data-ts="100" data-tb="34">'+chip(o,'Zeskanuj kod',1)+titleHTML(o,'',2)+body(o,3)+facts(o,4)+'</div>'+
        '<div class="ek-qrcard" data-in="3"><div class="ek-qrbox"></div><span>Zeskanuj telefonem</span></div></div>';
    } else {
      h = top() + F + CIRCLES + '<div class="ek-content">'+chip(o,'',1)+titleHTML(o,'',2)+body(o,3)+facts(o,4)+'</div></div>';
    }
  } else if (entry.kind==='events'){
    el.className += ' ek-events';
    var evs = entry.events;
    h = top() + '<div class="ek-field">' + CIRCLES.replace('<b></b>','') +
      '<div class="ek-evl"><div class="ek-chip" data-in="1">Kalendarz</div><h2 data-in="2">Nadchodzące<em>wydarzenia</em></h2>'+(entry.pages>1?'<p data-in="3">'+entry.page+' / '+entry.pages+'</p>':'')+'</div><div class="ek-evr">'+
      evs.map(function(e, i){
        var sd = evStart(e), r = rel(e, now), meta = [DAYS[sd.getDay()]]; if (e.time) meta.push('godz. '+e.time); if (e.place) meta.push(e.place);
        return '<div class="ek-ev" data-in="'+(2+i)+'"><div class="ek-evd"><b>'+sd.getDate()+'</b><span>'+MONS[sd.getMonth()]+'</span></div>'+
          '<div class="ek-evt"><h3>'+esc(e.title)+'</h3><p><span class="ek-rel'+(r.hot?' hot':'')+'">'+r.t+'</span>'+esc(meta.join(' · '))+'</p>'+(e.desc?'<p>'+esc(e.desc)+'</p>':'')+'</div></div>';
      }).join('')+'</div></div>';
  } else if (entry.kind==='alert'){
    el.className += ' ek-alert';
    var lbl = String(s.alertLabel||'').trim() || 'PILNE', since = parseDate(s.alertSince), sl = '';
    if (since && !isNaN(since)) sl = (ymd(since)===ymd(now) ? 'Ogłoszono dziś o ' + hm(since) : 'Ogłoszono ' + since.getDate() + ' ' + MON[since.getMonth()] + ', ' + hm(since));
    h = top() + '<div class="ek-field">' + CIRCLES + '<div class="ek-stripe"></div><div class="ek-content" data-ts="112">'+
      '<div class="ek-chip" data-in="1">'+esc(lbl)+'</div>'+(sl?'<div class="ek-since" data-in="2">'+esc(sl)+'</div>':'')+
      '<h1 class="ek-title" data-in="3">'+nl2br(esc(String(s.alertText||'').trim()))+'</h1></div></div>';
  } else {
    el.className += ' ek-idle';
    h = top() + '<div class="ek-field">' + CIRCLES + '<div class="ek-content"><div class="ek-num js-time" data-in="1">'+hm()+'</div><div class="ek-where js-date" data-in="2">'+E.dateStr()+'</div></div></div>';
  }
  el.innerHTML = h;
  if (entry.kind==='slide' && entry.item.type==='qr') makeQR(el.querySelector('.ek-qrbox'), entry.item.qr);
  return el;
};
/* dopasowanie wielkości tekstu do miejsca */
E.fit = function(el){
  var c = el.querySelector('.ek-content'); if (!c || !c.clientHeight) return;
  var t = c.querySelector('.ek-title'), b = c.querySelector('.ek-body');
  var ts = +c.getAttribute('data-ts') || 118, tb = +c.getAttribute('data-tb') || 38, min = Math.round(ts*0.45), g = 0;
  if (t) t.style.setProperty('--ts', ts+'px'); if (b) b.style.setProperty('--tb', tb+'px');
  while (c.scrollHeight > c.clientHeight + 2 && g++ < 60){
    if (t && ts > min){ ts -= 4; t.style.setProperty('--ts', ts+'px'); }
    else if (b && tb > 24){ tb -= 2; b.style.setProperty('--tb', tb+'px'); }
    else break;
  }
};
var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
E.animateIn = function(el, delay){
  if (REDUCED || !el.animate) return;
  el.querySelectorAll('[data-in]').forEach(function(n){
    var k = +n.getAttribute('data-in');
    n.animate([{opacity:0, transform:'translateY(48px)'},{opacity:1, transform:'translateY(0)'}], {duration:760, delay:delay+k*110, easing:'cubic-bezier(.16,.84,.24,1)', fill:'backwards'});
  });
  el.querySelectorAll('.ek-circles i, .ek-circles b').forEach(function(n, j){
    n.animate([{opacity:0, transform:'scale(.7)'},{opacity:1, transform:'scale(1)'}], {duration:1200, delay:delay+70*j, easing:'cubic-bezier(.16,.84,.24,1)', fill:'backwards', composite:'add'});
  });
  el.querySelectorAll('.js-count').forEach(function(n){ countUp(n, delay+380); });
};
function countUp(node, delay){
  var v = node.getAttribute('data-v') || '', m = v.match(/^(\D*?)(\d{1,3}(?:[  ]\d{3})+|\d+)(.*)$/);
  if (!m || /^[.,]\d/.test(m[3])) return;
  var pre = m[1], suf = m[3], target = parseInt(m[2].replace(/\D/g,''),10), sep = /[  ]/.test(m[2]);
  if (!target) return;
  function fmt(x){ var s = String(x); return sep ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : s; }
  node.textContent = pre + '0' + suf;
  var t0 = performance.now() + delay;
  (function step(t){ if (!node.isConnected) return; var k = Math.min(1, Math.max(0, (t-t0)/1500)), e = 1-Math.pow(1-k,3); node.textContent = pre + fmt(Math.round(target*e)) + suf; if (k<1) requestAnimationFrame(step); else node.textContent = v; })(performance.now());
}

/* ---------- skalowanie sceny ---------- */
var ro = ('ResizeObserver' in window) ? new ResizeObserver(function(list){
  list.forEach(function(en){
    var st = en.target.querySelector(':scope > .ek-stage'); if (!st) return; var s = Math.min(en.contentRect.width/1920, en.contentRect.height/1080);
    if (s>0){ st.style.setProperty('--s', s); var sl = st.querySelector(':scope > .ek-slide[data-fit="0"]'); if (sl){ sl.setAttribute('data-fit','1'); E.fit(sl); } }
  });
}) : null;
E.observe = function(host){ if (ro) ro.observe(host); else { var r = host.getBoundingClientRect(); host.firstChild.style.setProperty('--s', Math.min(r.width/1920, r.height/1080)); } };
E.unobserve = function(host){ if (ro) ro.unobserve(host); };
/* miniatura slajdu (panel) */
E.mini = function(host, entry, st){
  host.classList.add('ek-view');
  host.innerHTML = '<div class="ek-stage"></div>';
  var stage = host.firstChild, sl = E.slideEl(entry, st);
  sl.setAttribute('data-fit','0'); stage.appendChild(sl); E.observe(host);
  if (host.offsetWidth){ sl.setAttribute('data-fit','1'); E.fit(sl); }
};

/* ---------- odtwarzacz ---------- */
var WIPES = [
  [[{transform:'translateX(-101%)'},{transform:'translateX(0)'}],[{transform:'translateX(0)'},{transform:'translateX(101%)'}]],
  [[{transform:'translateY(101%)'},{transform:'translateY(0)'}],[{transform:'translateY(0)'},{transform:'translateY(-101%)'}]],
  [[{transform:'translateX(101%)'},{transform:'translateX(0)'}],[{transform:'translateX(0)'},{transform:'translateX(-101%)'}]]
];
function Player(host, getState, opts){
  this.host = host; this.getState = getState; this.opts = opts || {};
  host.classList.add('ek-view');
  host.innerHTML = '<div class="ek-stage"><div class="ek-layers"></div><div class="ek-foot" hidden><div class="ek-prog"><i></i></div><div class="ek-frow"></div></div><div class="ek-wipe"><i class="w1"></i><i class="w3"></i></div></div>';
  this.layers = host.querySelector('.ek-layers'); this.foot = host.querySelector('.ek-foot'); this.wipe = host.querySelector('.ek-wipe');
  this.idx = -1; this.list = []; this.timer = null; this.paused = false; this.token = 0; this.tc = 0; this.alive = true; this.resumed = false;
  E.observe(host);
}
E.Player = Player;
Player.prototype.start = function(){
  if (this.opts.persist){
    try {
      var pos = JSON.parse(sessionStorage.getItem('ek-pos')||'null');
      if (pos && pos.key && Date.now() - pos.t < 15*60000){
        var list = E.playlist(this.getState(), new Date());
        for (var k=0;k<list.length;k++) if (list[k].key===pos.key){ this.list = list; this.idx = k; this.resumed = true; this.show(list[k], true); return; }
      }
    } catch(e){}
  }
  this.go(1, true);
};
Player.prototype.destroy = function(){ this.alive = false; clearTimeout(this.timer); E.unobserve(this.host); };
Player.prototype.togglePause = function(){
  this.paused = !this.paused; var self = this;
  if (this.paused){ clearTimeout(this.timer); if (this.prog) this.prog.pause(); }
  else { if (this.prog) this.prog.play(); var left = this.prog && this.prog.effect ? this.prog.effect.getTiming().duration - (this.prog.currentTime||0) : 3000; this.timer = setTimeout(function(){ self.go(1); }, Math.max(500,left)); }
  return this.paused;
};
Player.prototype.go = function(dir, first){
  if (!this.alive) return; clearTimeout(this.timer);
  var prev = this.list[this.idx] && this.list[this.idx].key;
  this.list = E.playlist(this.getState(), new Date());
  var n = this.list.length, i = -1;
  if (prev) for (var k=0;k<n;k++) if (this.list[k].key===prev){ i = k; break; }
  if (i<0) i = Math.min(Math.max(this.idx,-1), n-1);
  this.idx = first ? 0 : ((i+dir)%n+n)%n;
  this.show(this.list[this.idx], first || (n===1 && prev===this.list[0].key));
};
Player.prototype.show = function(entry, instant){
  var self = this, token = ++this.token, st = this.getState();
  if (this.opts.persist){ try { sessionStorage.setItem('ek-pos', JSON.stringify({key:entry.key, t:Date.now()})); } catch(e){} }
  var el = E.slideEl(entry, st, new Date());
  function swap(){ if (token!==self.token) return; self.layers.replaceChildren(el); E.fit(el); self.renderFoot(entry); }
  function sched(){ if (token!==self.token || !self.alive) return; self.startProg(entry); if (!self.paused) self.timer = setTimeout(function(){ self.go(1); }, entry.duration*1000); }
  if (instant || REDUCED || !this.wipe.animate){ swap(); if (!REDUCED) E.animateIn(el, 80); sched(); return; }
  var w = WIPES[this.tc++ % WIPES.length], a = this.wipe.children[0], b = this.wipe.children[1], ease = 'cubic-bezier(.76,0,.24,1)';
  [a,b].forEach(function(x){ x.getAnimations().forEach(function(an){ an.cancel(); }); });
  a.animate(w[0], {duration:600, easing:ease, fill:'forwards'});
  b.animate(w[0], {duration:600, delay:110, easing:ease, fill:'forwards'}).finished.then(function(){
    if (token!==self.token) return;
    swap();
    b.animate(w[1], {duration:620, easing:ease, fill:'forwards'});
    a.animate(w[1], {duration:620, delay:110, easing:ease, fill:'forwards'});
    E.animateIn(el, 240); sched();
  }).catch(function(){ swap(); sched(); });
};
Player.prototype.refreshFoot = function(){ var e = this.list[this.idx]; if (e) this.renderFoot(e); };
Player.prototype.renderFoot = function(entry){
  var st = this.getState(), s = st.settings, now = new Date(), urgent = E.alertOn(st, now);
  var mode = /akred/i.test(s.bar) ? 'acc' : /brak|wył|nie/i.test(s.bar) ? 'none' : 'text';
  var isImg = entry.kind==='slide' && entry.item.type==='image';
  var show = urgent || (mode!=='none' && (!isImg || yes(s.barOnImages)));
  this.foot.hidden = !show; this.foot.classList.toggle('urgent', urgent);
  var row = this.foot.querySelector('.ek-frow'), self = this;
  if (!show) return;
  if (urgent){
    var ut = esc(String(s.alertText).trim()).replace(/\n+/g,'<span class="sep"></span>');
    row.innerHTML = '<span class="ek-ftag">'+esc(String(s.alertLabel||'').trim()||'PILNE')+'</span><div class="ek-ftrack"><div class="ek-ftext">'+ut+'</div></div>';
    marquee(row, ut, 150);
  } else if (mode==='acc'){
    row.innerHTML = '<div class="ek-facc"><div>Jesteśmy <b>w gronie 6% najlepszych szkół biznesu świata</b> - dzięki akredytacjom AACSB i AMBA</div><span><img src="img/aacsb.png" alt="AACSB Accredited"><img src="img/amba.png" alt="AMBA Accredited"></span></div>';
  } else {
    var txt = String(s.barText||'').trim(), label = String(s.barLabel||'').trim() || 'INFO', parts;
    if (txt) parts = txt.split(/\s*[|·]\s*/).filter(Boolean).map(esc).join('<span class="sep"></span>');
    else {
      var nx = E.upcoming(st, now)[0];
      if (nx && entry.kind!=='events'){ var r = rel(nx, now), sd = evStart(nx); label = 'Najbliżej'; parts = '<b>'+esc(nx.title)+'</b><span class="sep"></span>'+r.t+(r.hot?'':', '+sd.getDate()+' '+MON[sd.getMonth()])+(nx.time?', godz. '+nx.time:'')+(nx.place?'<span class="sep"></span>'+esc(nx.place):''); }
      else { label = 'WNEiZ UMK'; parts = 'Wydział Nauk Ekonomicznych i Zarządzania<span class="sep"></span>ul. Gagarina 13a, Toruń<span class="sep"></span>econ.umk.pl'; }
    }
    row.innerHTML = '<span class="ek-ftag">'+esc(label)+'</span><div class="ek-ftrack"><div class="ek-ftext">'+parts+'</div></div>';
    marquee(row, parts, 110);
  }
  function marquee(r, html, speed){
    requestAnimationFrame(function(){
      var t = r.querySelector('.ek-ftext'), tr = r.querySelector('.ek-ftrack'); if (!t || !tr) return;
      if (t.scrollWidth > tr.clientWidth - 40){ var unit = html + '<span class="sep"></span>'; t.innerHTML = unit + unit; t.classList.add('marq'); t.style.animationDuration = Math.max(12, (t.scrollWidth/2)/speed) + 's'; }
    });
  }
};
Player.prototype.startProg = function(entry){
  var i = this.foot.querySelector('.ek-prog i'); this.prog = null;
  if (i && i.animate){ this.prog = i.animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}], {duration:entry.duration*1000, easing:'linear', fill:'forwards'}); if (this.paused) this.prog.pause(); }
};

/* zegar i odliczanie */
setInterval(function(){
  var t = hm(), d = E.dateStr(), i;
  document.querySelectorAll('.js-time').forEach(function(n){ if (n.textContent!==t) n.textContent = t; });
  document.querySelectorAll('.js-date').forEach(function(n){ if (n.textContent!==d) n.textContent = d; });
  var now = Date.now();
  document.querySelectorAll('.js-cd').forEach(function(cd){
    var tg = +cd.getAttribute('data-t'); if (!tg) return; var p = cdParts(tg - now);
    ['d','h','m','s'].forEach(function(k){ var n = cd.querySelector('.cd-'+k); if (!n || n.textContent===p[k]) return; n.textContent = p[k]; if (!REDUCED && n.animate) n.animate([{transform:'translateY(-16px)', opacity:.3},{transform:'none', opacity:1}], {duration:300}); });
  });
}, 1000);
})();
