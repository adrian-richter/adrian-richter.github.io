'use strict';
const KEY='toepferkurs.wg.v1';
const DEFAULT_STOCK=[
  ['Kackpappe','🧻','shared'],['Gewürzgurken','🥒','shared'],['Fleisch für Ben','🥩','ben'],
  ['Milch','🥛','shared'],['Butter','🧈','shared'],['Kaffee','☕','shared'],
  ['Eier','🥚','shared'],['Nudeln','🍝','shared'],['Brot','🍞','shared'],
  ['Käse','🧀','shared'],['Spüli','🧽','shared'],['Müllbeutel','🗑️','shared']
];
const defaultState=()=>({
  version:1,
  shopping:[],
  pantry:DEFAULT_STOCK.map(([name,emoji,owner])=>({id:uid(),name,emoji,owner,status:'unknown',count:0,updated:''})),
  events:[],
  chores:[
    {id:uid(),name:'Bad schrubben',emoji:'🚽',owner:'ben',cycle:7,due:offsetDay(2),history:[]},
    {id:uid(),name:'Küche retten',emoji:'🍽️',owner:'adrian',cycle:7,due:offsetDay(3),history:[]},
    {id:uid(),name:'Staubsaugen',emoji:'🧹',owner:'ben',cycle:7,due:offsetDay(4),history:[]},
    {id:uid(),name:'Müll rausbringen',emoji:'🗑️',owner:'adrian',cycle:4,due:offsetDay(1),history:[]}
  ],
  receipts:[]
});
function uid(){return 'x'+Math.random().toString(36).slice(2,10)+Date.now().toString(36)}
function pad(n){return String(n).padStart(2,'0')}
function dayISO(d=new Date()){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function offsetDay(n){const d=new Date();d.setDate(d.getDate()+n);return dayISO(d)}
function parseDay(s){return new Date((s||dayISO())+'T12:00:00')}
function dateLabel(s,opts){if(!s)return '–';return parseDay(s).toLocaleDateString('de-DE',opts||{day:'2-digit',month:'short',year:'numeric'})}
function money(v){return (Number(v)||0).toLocaleString('de-DE',{style:'currency',currency:'EUR'})}
function num(v){return Number(String(v??'').replace(/\s/g,'').replace(/\./g,'').replace(',','.'))}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function attr(v){return esc(v)}
function ownerName(v){return v==='ben'?'Ben':v==='adrian'?'Adrian':'Gemeinsam'}
function ownerTag(v){return '<span class="chip '+(v==='ben'?'ben':v==='adrian'?'adrian':'both')+'">'+(v==='ben'?'🥩 Ben':v==='adrian'?'🎨 Adrian':'🤝 Gemeinsam')+'</span>'}
function stockEmoji(name){const n=String(name).toLowerCase();for(const [part,e] of [['kack','🧻'],['papier','🧻'],['gurk','🥒'],['fleisch','🥩'],['steak','🥩'],['hack','🥩'],['hähn','🍗'],['wurst','🌭'],['milch','🥛'],['butter','🧈'],['kaffee','☕'],['eier','🥚'],['ei','🥚'],['nudel','🍝'],['brot','🍞'],['käse','🧀'],['spül','🧽'],['müll','🗑️'],['bier','🍺'],['wasser','💧'],['cola','🥤'],['salat','🥗'],['tomat','🍅'],['reis','🍚'],['kartoffel','🥔'],['apfel','🍎']]){if(n.includes(part))return e}return '🛍️'}
function meat(name){return /fleisch|steak|rind|schwein|hack|hähn|huhn|pute|schnitzel|speck|bacon|salami|wurst|schinken|frikadelle|leberkäs|bratwurst/i.test(name)}
function safeState(input){
 if(!input||!Array.isArray(input.shopping)||!Array.isArray(input.pantry)||!Array.isArray(input.events)||!Array.isArray(input.chores)||!Array.isArray(input.receipts))throw Error('Keine gültige Töpferkurs-Sicherung');
 return {version:1,shopping:input.shopping.slice(0,1000),pantry:input.pantry.slice(0,1000),events:input.events.slice(0,1000),chores:input.chores.slice(0,1000),receipts:input.receipts.slice(0,1000)};
}
function load(){
 try{const raw=localStorage.getItem(KEY);return raw?safeState(JSON.parse(raw)):defaultState()}
 catch(e){console.warn('Speicher nicht verfügbar:',e);return defaultState()}
}
let state=load();
let ui={page:'home',shopTab:'all',quiz:-1,quizAdded:0,month:new Date().getMonth(),year:new Date().getFullYear(),chosenDate:dayISO(),stockFilter:'all',modal:'',receiptText:''};
const main=document.getElementById('main');
const modal=document.getElementById('modal');
const toastEl=document.getElementById('toast');
let toastTimer;
function save(){
 try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){toast('⚠️ Speicher voll oder blockiert. Bitte Backup exportieren.');console.error(e)}
 updateNav();
}
function toast(message){toastEl.textContent=message;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('show'),2800)}
function updateNav(){
 const count=state.shopping.filter(x=>!x.done).length;
 const pill=document.getElementById('nav-shop-count');
 pill.textContent=count;pill.classList.toggle('hidden',count===0);
 document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.page===ui.page));
}
function navigate(page){ui.page=page;closeModal();render();window.scrollTo({top:0,behavior:'smooth'})}
function render(){updateNav();main.innerHTML=({home:homePage,shopping:shoppingPage,pantry:pantryPage,calendar:calendarPage,chores:choresPage,money:moneyPage}[ui.page]||homePage)()}
function empty(emoji,title,subtitle){return '<div class="empty"><div class="empty-emoji">'+emoji+'</div><strong>'+title+'</strong><div>'+subtitle+'</div></div>'}
function pageIntro(kicker,title,subtitle,buttons=''){return '<div class="page-intro"><div><div class="eyebrow">'+kicker+'</div><h1>'+title+'</h1><p>'+subtitle+'</p></div>'+(buttons?'<div class="page-actions">'+buttons+'</div>':'')+'</div>'}
function button(action,label,kind='secondary',other=''){return '<button class="btn '+kind+'" data-action="'+action+'" '+other+'>'+label+'</button>'}
function drawDudes(){
return `<svg viewBox="0 0 400 285" xmlns="http://www.w3.org/2000/svg" aria-label="Zwei chaotische Strichmännchen in der WG" role="img">
<ellipse cx="198" cy="265" rx="158" ry="14" fill="#0d101a"/>
<path d="M28 231Q50 186 88 219M310 244Q342 190 382 224" fill="none" stroke="#ffa7b9" stroke-width="8" stroke-linecap="round"/>
<path d="M37 56Q96 13 174 29" stroke="#d6ff67" stroke-width="4" fill="none" stroke-linecap="round"/>
<path d="M260 25Q322 7 363 65" stroke="#98cbff" stroke-width="4" fill="none" stroke-linecap="round"/>
<rect x="121" y="235" width="157" height="17" rx="8" fill="#ffaa68" stroke="#fff" stroke-width="3"/>
<path d="M139 170L117 235M177 169L194 235M241 169L230 235M270 170L293 235" stroke="#fffdf8" stroke-width="9" stroke-linecap="round"/>
<path d="M136 97Q155 86 180 101L181 179L130 179Z" fill="#98cbff" stroke="#10121c" stroke-width="5"/>
<path d="M228 98Q253 83 277 103L277 179L224 179Z" fill="#ffa7b9" stroke="#10121c" stroke-width="5"/>
<path d="M136 114L96 152L66 139M177 112L198 148L229 137M228 114L195 139M273 114L307 150L335 132" stroke="#fffdf8" stroke-width="9" stroke-linecap="round" fill="none"/>
<circle cx="155" cy="61" r="36" fill="#ffcfaa" stroke="#10121c" stroke-width="5"/>
<circle cx="251" cy="61" r="36" fill="#ffcfaa" stroke="#10121c" stroke-width="5"/>
<path d="M120 51Q125 7 155 19Q186 14 191 53M215 47Q232 12 250 21Q280 8 285 50" fill="#171a26" stroke="#171a26" stroke-width="7" stroke-linecap="round"/>
<circle cx="144" cy="61" r="3.5" fill="#151923"/><circle cx="168" cy="61" r="3.5" fill="#151923"/><path d="M148 76Q157 84 166 75" stroke="#151923" stroke-width="3" fill="none" stroke-linecap="round"/>
<circle cx="241" cy="61" r="3.5" fill="#151923"/><circle cx="264" cy="61" r="3.5" fill="#151923"/><path d="M239 78Q252 89 267 76" stroke="#151923" stroke-width="3" fill="none"/>
<rect x="119" y="179" width="60" height="14" rx="7" fill="#d6ff67" stroke="#10121c" stroke-width="3"/>
<rect x="224" y="179" width="55" height="14" rx="7" fill="#d6ff67" stroke="#10121c" stroke-width="3"/>
<text x="150" y="189" font-family="sans-serif" font-weight="900" font-size="11" text-anchor="middle" fill="#171a26">BEN</text>
<text x="251" y="189" font-family="sans-serif" font-weight="900" font-size="11" text-anchor="middle" fill="#171a26">ADRIAN</text>
<g transform="translate(43 157) rotate(-12)"><rect width="72" height="57" rx="6" fill="#fffdf8" stroke="#171a26" stroke-width="4"/><text x="36" y="38" font-size="32" text-anchor="middle">🧻</text></g>
<g transform="translate(302 156) rotate(11)"><rect width="60" height="66" rx="8" fill="#d6ff67" stroke="#171a26" stroke-width="4"/><text x="30" y="42" font-size="32" text-anchor="middle">🥒</text></g>
<text x="13" y="27" font-size="18" font-family="sans-serif" font-weight="900" fill="#d6ff67" transform="rotate(-10 13 27)">WO IST DAS SPÜLI?!</text>
<text x="269" y="14" font-size="18" font-family="sans-serif" font-weight="900" fill="#ffa7b9" transform="rotate(9 269 14)">🍻 MOIN!</text>
</svg>`;
}
function homePage(){
 const pending=state.shopping.filter(x=>!x.done);
 const low=state.pantry.filter(x=>x.status==='low'||x.status==='empty');
 const upcoming=state.events.filter(x=>x.date>=dayISO()).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start)).slice(0,4);
 const month=dayISO().slice(0,7),spent=state.receipts.filter(x=>(x.date||'').startsWith(month)).reduce((n,x)=>n+(Number(x.total)||0),0);
 const due=state.chores.filter(x=>x.due<=offsetDay(2));
 const greeting=new Date().getHours()<11?'Moin, Frühaufsteher!':new Date().getHours()<17?'Moin, ihr Nasen!':'Na, ihr Chaoten!';
 return `<section class="hero">
  <div><div class="eyebrow">TÖPFERSTRASSE · SCHLESWIG</div><h1>${greeting}<br><span style="color:var(--lime)">WILLKOMMEN</span> IM TÖPFERKURS.</h1><p>Die Kommandozentrale für zwei erwachsene Männer, die versuchen, Gewürzgurken, Kackpappe und ihr Leben im Griff zu behalten. 🥒🧻🍻</p>
  <div class="btn-row">${button('start-quiz','🚀 EINKAUFS-CHECK','lime')}${button('open-event','📅 TERMIN REINKLOPPEN','secondary')}</div></div>
  <div class="hero-art"><span class="sparkle sp1">✨</span>${drawDudes()}<span class="sparkle sp2">🍕</span></div>
 </section>
 <section class="section grid cols-4">
  <div class="card lime stretch"><div class="card-head"><h3>Auf dem Zettel</h3><span class="card-emoji">🛒</span></div><div class="stat-number">${pending.length}</div><div class="stat-label">Dinge, die der Kühlschrank vermisst</div><button class="card-link" data-page="shopping">Zur Einkaufsliste →</button></div>
  <div class="card pink stretch"><div class="card-head"><h3>Vorrat-Alarm</h3><span class="card-emoji">🚨</span></div><div class="stat-number">${low.length}</div><div class="stat-label">Dinge auf dünnem Eis</div><button class="card-link" data-page="pantry">Vorräte prüfen →</button></div>
  <div class="card blue stretch"><div class="card-head"><h3>WG-Ausgaben</h3><span class="card-emoji">💸</span></div><div class="stat-number" style="font-size:clamp(2rem,4vw,2.9rem)">${money(spent)}</div><div class="stat-label">Dieser Monat · eingetragen</div><button class="card-link" data-page="money">Kassensturz →</button></div>
  <div class="card orange stretch"><div class="card-head"><h3>Putzen, Leute!</h3><span class="card-emoji">🧽</span></div><div class="stat-number">${due.length}</div><div class="stat-label">Putzjobs jetzt oder bald fällig</div><button class="card-link" data-page="chores">Zum Putzclub →</button></div>
 </section>
 <section class="section quick-check"><div><div class="eyebrow">DER LEGENDÄRE WG-CHECK</div><h2>Ist noch genug Kackpappe da? 🧻</h2><p>12 schnelle Fragen zu euren Vorräten. Alles, was fehlt, landet direkt auf dem Einkaufszettel. Benns Fleisch bleibt bei Ben. 🥩</p></div>${button('start-quiz','JA, LASS CHECKEN →','dark')}</section>
 <section class="section grid cols-2">
 <div class="card"><div class="card-head"><div><h2>📅 Was geht ab?</h2><p class="muted small">Die nächsten Termine und Eskalationen</p></div><button class="icon-btn" data-page="calendar" aria-label="Kalender öffnen">↗</button></div>
 ${upcoming.length?upcoming.map(x=>eventRow(x,false)).join(''):empty('🦗','Noch nix los','Tragt Arbeit, Termine oder die nächste Sause ein.')}</div>
 <div class="card"><div class="card-head"><div><h2>📦 Das fehlt noch</h2><p class="muted small">Euer virtueller Kühlschrankzettel</p></div><button class="icon-btn" data-page="shopping" aria-label="Einkaufsliste öffnen">↗</button></div>
 ${pending.length?pending.slice(0,5).map(x=>'<div class="summary-mini"><span class="emoji">'+esc(x.emoji||stockEmoji(x.name))+'</span><div style="flex:1"><b>'+esc(x.name)+'</b><small>'+esc(x.qty||'1x')+' · '+ownerName(x.owner)+'</small></div><button class="icon-btn" data-action="toggle-shopping" data-id="'+attr(x.id)+'" aria-label="Abhaken">✓</button></div>').join(''):empty('🥳','Liste ist leer','Du kannst jetzt offiziell die Couch heiraten.')}
 ${pending.length>5?'<p class="muted small">+ '+(pending.length-5)+' weitere auf der Liste</p>':''}
 </div></section>
 <section class="section meme-box"><span class="big">🤝</span><div><strong>Ben + Adrian = eine großartige Idee.</strong><div class="small">Keine Paartherapie, nur praktische WG-Organisation. Das Chaos ist inklusive. 🏺</div></div></section>`;
}
function shoppingPage(){
 const pending=state.shopping.filter(x=>!x.done);
 const bought=state.shopping.filter(x=>x.done);
 const filtered=pending.filter(x=>ui.shopTab==='all'||x.owner===ui.shopTab);
 return pageIntro('🥒 EINKAUFEN ODER VERHUNGERN','DER FRESSZETTEL.','Alles, was fehlt. Getrennt nach WG-Kram und Benns höchstpersönlichem Fleischimperium.',button('start-quiz','🧻 Vorrats-Check','pink')+button('finish-shop','✅ Einkauf abschließen','secondary'))+
 `<div class="grid cols-2"><div class="card shadow">
 <h2>🖊️ Was fehlt?</h2><p class="muted small">Rein damit. „Steak“ & Co. ordnen wir automatisch Ben zu. 🥩</p>
 <form data-form="add-shopping">
 <div class="form-grid"><div class="field full"><label for="shop-name">Produkt</label><input id="shop-name" name="name" placeholder="z.B. 2x Gewürzgurken 🥒" maxlength="90" required autofocus></div>
 <div class="field"><label for="shop-qty">Menge</label><input id="shop-qty" name="qty" placeholder="z.B. 2 Gläser" maxlength="40" value="1x"></div>
 <div class="field"><label for="shop-owner">Für wen?</label><select id="shop-owner" name="owner"><option value="shared">🤝 Für die WG</option><option value="ben">🥩 Nur Ben</option><option value="adrian">🎨 Nur Adrian</option></select></div></div>
 <div class="btn-row"><button class="btn" type="submit">➕ AUF DEN ZETTEL</button></div></form></div>
 <div class="card dark"><div class="card-head"><h2>🥩 BEN-ONLY-ZONE</h2><span class="card-emoji">🚫🥬</span></div><p>Fleisch und persönliche Einkäufe wandern in die Ben-Spalte. Gemeinsame Sachen stehen zusammen. Kein halbes Rinderfilet auf Adrians Rechnung.</p>
 <div class="stickers"><span class="sticker">🧀 Gemeinsam</span><span class="sticker">🥩 Ben</span><span class="sticker">🎨 Adrian</span></div><p class="small" style="margin-top:20px;color:#c1c6d0">Tipp: Nach dem Einkauf gekaufte Produkte abhaken und „Einkauf abschließen“ drücken. Dann geht's auch in die Vorräte.</p></div>
 </div>
 <section class="section"><div class="section-head"><div><h2>🛒 Noch zu besorgen <span class="chip">${pending.length}</span></h2><p>Tippe auf ✓, wenn etwas im Wagen liegt.</p></div></div>
 <div class="tabs">${[['all','🛒 Alle'],['shared','🤝 WG'],['ben','🥩 Ben'],['adrian','🎨 Adrian']].map(([id,label])=>'<button class="tab '+(ui.shopTab===id?'active':'')+'" data-action="shop-tab" data-value="'+id+'">'+label+'</button>').join('')}</div>
 <div class="list">${filtered.length?filtered.map(itemRow).join(''):empty('🎉','Alles erledigt!','Oder die andere Kategorie ist noch voll.')}</div></section>
 <section class="section"><div class="section-head"><div><h2>✅ Im Einkaufswagen <span class="chip">${bought.length}</span></h2><p>Nach dem Bezahlen auf „Einkauf abschließen“.</p></div>${bought.length?button('finish-shop','💸 Kassenzettel erfassen','secondary'):''}</div>
 <div class="list">${bought.length?bought.map(itemRow).join(''):empty('🛍️','Noch nichts abgehakt','Hakt eure gekauften Sachen oben ab.')}</div></section>`;
}
function itemRow(x){
 return '<div class="list-row '+(x.done?'checked':'')+'"><button class="check-btn" data-action="toggle-shopping" data-id="'+attr(x.id)+'" aria-label="'+(x.done?'Zurück auf die Liste':'Abhaken')+'">'+(x.done?'✓':'')+'</button><span class="list-icon">'+esc(x.emoji||stockEmoji(x.name))+'</span><div class="list-main"><div class="item-name">'+esc(x.name)+'</div><div class="item-sub">'+esc(x.qty||'1x')+'</div></div><div class="list-right">'+ownerTag(x.owner)+'<button class="icon-btn" data-action="delete-shopping" data-id="'+attr(x.id)+'" aria-label="Löschen">🗑</button></div></div>'
}
function pantryPage(){
 const filtered=state.pantry.filter(x=>ui.stockFilter==='all'||x.owner===ui.stockFilter||ui.stockFilter==='low'&&(x.status==='low'||x.status==='empty'));
 return pageIntro('🥫 KÜHLSCHRANK-MANAGEMENT','WAS IST NOCH DA?','Ihr seid die lebende Inventur. Wenn was leer ist, direkt auf den Einkaufszettel damit.',button('start-quiz','🚀 Rundgang starten','pink')+button('open-stock','➕ Produkt anlegen'))+
 `<div class="notice"><span>🧠</span><div><strong>Keine Zauberei:</strong> Die App weiß nur, was ihr eintragt. Status und Mengen könnt ihr jederzeit aktualisieren. Beim Einkauf wandern abgehakte Sachen automatisch ins Vorratsregal.</div></div>
 <section class="section"><div class="tabs">${[['all','🥫 Alles'],['low','🚨 Fast leer'],['shared','🤝 WG'],['ben','🥩 Ben'],['adrian','🎨 Adrian']].map(([id,label])=>'<button class="tab '+(ui.stockFilter===id?'active':'')+'" data-action="stock-filter" data-value="'+id+'">'+label+'</button>').join('')}</div>
 <div class="category-grid">${filtered.length?filtered.map(x=>{
 const statusLabel={good:'✅ Genug da',low:'⚠️ Wenig',empty:'❌ Leer',unknown:'❔ Ungeprüft'}[x.status]||'❔ Ungeprüft';
 return '<div class="category-card"><div class="em">'+esc(x.emoji||stockEmoji(x.name))+'</div><div class="content"><div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap"><strong>'+esc(x.name)+'</strong>'+ownerTag(x.owner)+'</div><small>'+statusLabel+' · '+(Number(x.count)||0)+' Einheit(en)</small><div class="status-buttons"><button class="'+(x.status==='good'?'selected':'')+'" data-action="stock-status" data-id="'+attr(x.id)+'" data-value="good">👍 Genug</button><button class="'+(x.status==='low'?'selected':'')+'" data-action="stock-status" data-id="'+attr(x.id)+'" data-value="low">😬 Wenig</button><button class="'+(x.status==='empty'?'selected':'')+'" data-action="stock-status" data-id="'+attr(x.id)+'" data-value="empty">🚨 Leer</button><button data-action="consume" data-id="'+attr(x.id)+'" title="Eine Einheit verbraucht">➖ 1</button><button data-action="add-unit" data-id="'+attr(x.id)+'" title="Eine Einheit ergänzt">➕ 1</button></div></div><button class="icon-btn" data-action="delete-stock" data-id="'+attr(x.id)+'" aria-label="Produkt entfernen">✕</button></div>';
 }).join(''):empty('🥫','Kein Produkt hier','Leg einfach ein neues an.')}</div></section>
 <section class="section meme-box"><span class="big">🍳</span><div><strong>Geplündert? Einmal auf „➖ 1“.</strong><div class="small">Bei null rutscht das Produkt automatisch auf den Einkaufszettel. Einfache Mengenführung für den Kühlschrank am Tablet.</div></div></section>`;
}
function eventEmoji(t){return ({work:'💼',party:'🍻',event:'🎉',appointment:'📍',misc:'📌'})[t]||'📌'}
function eventRow(x,withDelete=true){
 return '<div class="event-row"><span class="event-date"><b>'+esc(parseDay(x.date).getDate())+'</b><small>'+esc(parseDay(x.date).toLocaleDateString('de-DE',{month:'short'}).toUpperCase())+'</small></span><div class="event-data"><strong>'+eventEmoji(x.type)+' '+esc(x.title)+'</strong><small>'+esc(x.start||'ganztägig')+(x.end?' – '+esc(x.end):'')+' · '+ownerName(x.owner)+(x.notes?' · '+esc(x.notes):'')+'</small></div>'+(withDelete?'<button class="icon-btn" data-action="delete-event" data-id="'+attr(x.id)+'" aria-label="Termin löschen">✕</button>':'')+'</div>'
}
function calendarPage(){
 const monthStart=new Date(ui.year,ui.month,1),mEnd=new Date(ui.year,ui.month+1,0);
 const lead=(monthStart.getDay()+6)%7,days=mEnd.getDate(),numCells=Math.ceil((lead+days)/7)*7;
 const calendarDays=['Mo','Di','Mi','Do','Fr','Sa','So'].map(t=>'<div class="cal-week">'+t+'</div>').join('');
 let dayCells='';
 for(let i=0;i<numCells;i++){
  const d=new Date(ui.year,ui.month,1-lead+i),iso=dayISO(d),same=d.getMonth()===ui.month;
  const events=state.events.filter(x=>x.date===iso).sort((a,b)=>(a.start||'').localeCompare(b.start||''));
  dayCells+='<button class="cal-day '+(same?'':'outside ')+(iso===dayISO()?'today ':'')+(iso===ui.chosenDate?'selected':'')+'" data-action="calendar-day" data-value="'+iso+'" aria-label="'+dateLabel(iso)+'"><span class="cal-day-number">'+d.getDate()+'</span>'+events.slice(0,2).map(e=>'<span class="cal-event '+attr(e.type)+'">'+eventEmoji(e.type)+esc(e.title)+'</span>').join('')+(events.length>2?'<span class="cal-more">+'+(events.length-2)+' mehr</span>':'')+'</button>';
 }
 const selected=state.events.filter(x=>x.date===ui.chosenDate).sort((a,b)=>(a.start||'').localeCompare(b.start||''));
 const future=state.events.filter(x=>x.date>=dayISO()).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start)).slice(0,7);
 return pageIntro('🗓️ ALLES AUSSER LANGWEILIG','WANN GEHT WAS?','Schichten, Arzt, Festivals, Feierabendbier und eskalierende Wochenenden. Alles an einem Ort.',button('open-event','➕ Termin eintragen'))+
 `<div class="calendar-layout"><section class="card shadow"><div class="month-head"><div><h2>${monthStart.toLocaleDateString('de-DE',{month:'long',year:'numeric'}).toUpperCase()}</h2><div class="small muted">Euer WG-Fahrplan 🏎️</div></div><div class="month-controls"><button class="icon-btn" data-action="prev-month" aria-label="Vormonat">❮</button><button class="icon-btn" data-action="next-month" aria-label="Nächster Monat">❯</button></div></div>
 <div class="cal-grid">${calendarDays}${dayCells}</div><div class="legend"><span><i class="dot"></i> 💼 Arbeit</span><span><i class="dot pink"></i> 🍻 Party</span><span><i class="dot lime"></i> 🎉 Events</span></div></section>
 <section class="card"><div class="card-head"><div><h2>📌 ${dateLabel(ui.chosenDate,{weekday:'long',day:'numeric',month:'long'})}</h2><p class="small muted">Was steht an diesem Tag an?</p></div><button class="icon-btn" data-action="open-event" aria-label="Termin hinzufügen">＋</button></div>
 ${selected.length?selected.map(x=>eventRow(x)).join(''):empty('🌴','Frei wie ein Vogel','Noch nichts geplant. Die Couch winkt.')}
 <div class="btn-row">${button('open-event','➕ Für diesen Tag', 'secondary')}</div></section></div>
 <section class="section card"><div class="card-head"><div><h2>🔮 Was demnächst geht</h2><p class="muted small">Chronologisch, ohne Diskussionen.</p></div></div>
 ${future.length?future.map(x=>eventRow(x)).join(''):empty('🍻','Die Zukunft ist noch frei','Legt Termine an, bevor Ben spontan einen 12-Stunden-Rave plant.')}</section>`;
}
function choresPage(){
 const sorted=state.chores.slice().sort((a,b)=>a.due.localeCompare(b.due));
 const history=state.chores.flatMap(x=>(x.history||[]).map(h=>({...h,name:x.name,emoji:x.emoji}))).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
 return pageIntro('🧽 WER HAT DAS BAD VERSAUT?','DER PUTZCLUB.','Faire Verteilung ohne passiv-aggressive Zettel an der Kühlschranktür.',button('open-chore','➕ Putzjob hinzufügen'))+
 `<div class="grid cols-2"><div class="card shadow"><h2>🧹 Wer ist dran?</h2><p class="muted small">Erledigen drücken → Aufgabe wird neu terminiert und wandert zum anderen.</p>
 <div class="list">${sorted.map(x=>{
 const overdue=x.due<dayISO(),today=x.due===dayISO();
 return '<div class="list-row"><span class="list-icon">'+esc(x.emoji||'🧹')+'</span><div class="list-main"><div class="item-name">'+esc(x.name)+'</div><div class="item-sub">'+(overdue?'🚨 Überfällig · ':today?'📣 Heute · ':'📆 '+dateLabel(x.due)+' · ')+'alle '+Number(x.cycle||7)+' Tage</div></div>'+ownerTag(x.owner)+'<button class="btn tiny" data-action="do-chore" data-id="'+attr(x.id)+'">✅</button><button class="icon-btn" data-action="delete-chore" data-id="'+attr(x.id)+'" aria-label="Entfernen">✕</button></div>';
 }).join('')||empty('🫧','Alles blitzblank','Noch keine Putzaufgaben angelegt.')}</div></div>
 <div class="card"><h2>🏆 Die Ruhmeshalle</h2><p class="muted small">Wer war zuletzt der Held mit dem Wischmopp?</p>
 ${history.length?history.map(h=>'<div class="summary-mini"><span class="emoji">'+esc(h.emoji||'🧹')+'</span><div style="flex:1"><b>'+esc(h.name)+'</b><small>'+ownerName(h.by)+' · '+dateLabel(h.date)+'</small></div><span>🏅</span></div>').join(''):empty('🛋️','Noch keine Heldentaten','Hier landen eure erledigten Putzjobs.')}
 <div class="panel-note" style="margin-top:17px">⚖️ <strong>WG-Vertrag, Artikel 1:</strong> Wer die letzte Klopapierrolle nimmt, meldet sie im Vorratsregal. Mit sofortiger Wirkung.</div></div></div>`;
}
function splitBalance(){
 let paidBen=0,paidAdrian=0,owedBen=0,owedAdrian=0;
 for(const x of state.receipts){
  const total=Number(x.total)||0;
  if(x.payer==='ben')paidBen+=total;else paidAdrian+=total;
  if(x.scope==='ben')owedBen+=total;else if(x.scope==='adrian')owedAdrian+=total;else{owedBen+=total/2;owedAdrian+=total/2}
 }
 return {paidBen,paidAdrian,owedBen,owedAdrian,netAdrian:paidAdrian-owedAdrian};
}
function moneyPage(){
 const total=state.receipts.reduce((t,x)=>t+(Number(x.total)||0),0);
 const month=dayISO().slice(0,7),thisMonth=state.receipts.filter(x=>(x.date||'').startsWith(month)).reduce((t,x)=>t+(Number(x.total)||0),0);
 const balance=splitBalance(),net=balance.netAdrian;
 const sorted=state.receipts.slice().sort((a,b)=>b.date.localeCompare(a.date));
 return pageIntro('💸 RECHNUNG BITTE!','DIE WG-KASSE.','Wer hat wie viel ausgegeben? Wir zählen mit, ohne jeden Einkaufswagen zu verhören.',button('open-receipt','🧾 Einkauf eintragen','pink'))+
 `<div class="grid cols-3">
 <div class="card lime"><div class="card-head"><h3>Insgesamt ausgegeben</h3><span class="card-emoji">💰</span></div><div class="stat-number" style="font-size:2.7rem">${money(total)}</div><span class="stat-label">Alle erfassten Einkäufe</span></div>
 <div class="card blue"><div class="card-head"><h3>Diesen Monat</h3><span class="card-emoji">📈</span></div><div class="stat-number" style="font-size:2.7rem">${money(thisMonth)}</div><span class="stat-label">${dateLabel(dayISO(),{month:'long',year:'numeric'})}</span></div>
 <div class="card pink"><div class="card-head"><h3>WG-Ausgleich</h3><span class="card-emoji">🤝</span></div><div class="stat-number" style="font-size:2.55rem">${money(Math.abs(net))}</div><span class="stat-label">${Math.abs(net)<.005?'Alles ausgeglichen 🎉':net>0?'Ben schuldet Adrian':'Adrian schuldet Ben'}</span></div></div>
 <section class="section grid cols-2"><div class="card"><h2>🧮 Wer hat gelöhnt?</h2>
 <div class="summary-mini"><div><b>🥩 Ben hat bezahlt</b><small>Alles, auch persönliche Einkäufe</small></div><strong>${money(balance.paidBen)}</strong></div>
 <div class="summary-mini"><div><b>🎨 Adrian hat bezahlt</b><small>Alles, auch persönliche Einkäufe</small></div><strong>${money(balance.paidAdrian)}</strong></div>
 <div class="summary-mini"><div><b>🥩 Benns Anteil</b><small>Halbe WG-Kosten + nur Ben</small></div><strong>${money(balance.owedBen)}</strong></div>
 <div class="summary-mini"><div><b>🎨 Adrians Anteil</b><small>Halbe WG-Kosten + nur Adrian</small></div><strong>${money(balance.owedAdrian)}</strong></div>
 <div class="panel-note" style="margin-top:12px">📌 Der Ausgleich ist nur eine Rechnung auf Basis eurer Einträge. Bereits privat beglichene Ausgleiche sind nicht automatisch berücksichtigt.</div></div>
 <div class="card dark"><h2>🧾 Die Belegmaschine</h2><p>Kassenzettel per Kamera auswählen, erkannte Beträge überprüfen und den Einkauf speichern. Die automatische Texterkennung klappt nur, falls euer Browser die experimentelle Funktion unterstützt.</p><p class="small" style="color:#c1c5cd">Kein externes OCR, kein Upload auf einen fremden Server. Wenn automatische Erkennung nicht möglich ist, könnt ihr Betrag und Produkte selbst eintragen.</p>
 <div class="stickers"><span class="sticker">📷 Handy-Kamera</span><span class="sticker">🔒 Lokal</span><span class="sticker">✅ Kontrolle</span></div><div class="btn-row">${button('open-receipt','📷 BELEG ERFASSEN','secondary')}</div></div></section>
 <section class="section"><div class="section-head"><div><h2>🛍️ Letzte Einkäufe</h2><p>Historie, Beträge, Bezahler und persönliche Extras.</p></div></div>
 <div class="card">${sorted.length?sorted.map(x=>'<div class="receipt-row"><span class="icon">🧾</span><div><strong>'+esc(x.store||'Einkauf')+'</strong><small>'+dateLabel(x.date)+' · '+ownerName(x.payer)+' bezahlt · '+(x.scope==='ben'?'nur Ben':x.scope==='adrian'?'nur Adrian':'WG 50/50')+'</small>'+(x.items?'<small>'+esc(x.items).slice(0,220)+'</small>':'')+'</div><span class="sum">'+money(x.total)+'</span><button class="icon-btn" data-action="delete-receipt" data-id="'+attr(x.id)+'" aria-label="Einkauf löschen">✕</button></div>').join(''):empty('🛒','Noch keine Beute','Den ersten Kassenzettel bitte hier eintragen.')}</div></section>`;
}
function modalOpen(html){ui.modal='open';document.getElementById('modal-content').innerHTML=html;modal.classList.remove('hidden');document.body.style.overflow='hidden'}
function closeModal(){ui.modal='';modal.classList.add('hidden');document.body.style.overflow='';document.getElementById('modal-content').innerHTML=''}
function modalHead(label,head,body=''){return '<div class="eyebrow">'+label+'</div><h2 id="modal-title">'+head+'</h2>'+(body?'<p class="muted">'+body+'</p>':'')}
function openEvent(){
 modalOpen(modalHead('📅 PLANUNG IST HALBES LEBEN','TERMIN REINKLOPPEN','Von Schichtbeginn bis Steilgehen. Alles darf rein.')+
 `<form data-form="add-event"><div class="form-grid">
 <div class="field full"><label>Titel</label><input name="title" maxlength="100" placeholder="z.B. Freitag steil gehen 🍻" required></div>
 <div class="field"><label>Art</label><select name="type"><option value="appointment">📍 Termin</option><option value="work">💼 Arbeit / Schicht</option><option value="party">🍻 Steilgehen</option><option value="event">🎉 Veranstaltung</option><option value="misc">📌 Sonstiges</option></select></div>
 <div class="field"><label>Für wen?</label><select name="owner"><option value="shared">🤝 Beide</option><option value="ben">🥩 Ben</option><option value="adrian">🎨 Adrian</option></select></div>
 <div class="field"><label>Datum</label><input type="date" name="date" value="${attr(ui.chosenDate||dayISO())}" required></div><div class="field"><label>Startzeit</label><input type="time" name="start"></div>
 <div class="field"><label>Endzeit (optional)</label><input type="time" name="end"></div><div class="field"><label>Notiz</label><input name="notes" maxlength="200" placeholder="Ort, Dresscode, Sonstiges"></div></div>
 <div class="btn-row"><button type="submit" class="btn">📌 SPEICHERN</button><button type="button" class="btn ghost" data-action="close-modal">Abbrechen</button></div></form>`);
}
function openStock(){
 modalOpen(modalHead('🥫 NEUES PRODUKT','AB INS REGAL','Ihr könnt beliebige Produkte erfassen und später ihren Status ändern.')+
 `<form data-form="add-stock"><div class="form-grid">
 <div class="field full"><label>Produktname</label><input name="name" maxlength="90" placeholder="z.B. Senf" required></div>
 <div class="field"><label>Für wen?</label><select name="owner"><option value="shared">🤝 Gemeinsam</option><option value="ben">🥩 Ben</option><option value="adrian">🎨 Adrian</option></select></div>
 <div class="field"><label>Menge / Einheiten</label><input name="count" type="number" min="0" max="999" step="1" value="0"></div>
 <div class="field full"><label>Status</label><select name="status"><option value="unknown">❔ Noch ungeprüft</option><option value="good">👍 Genug da</option><option value="low">😬 Wenig</option><option value="empty">🚨 Leer</option></select></div></div>
 <div class="btn-row"><button class="btn" type="submit">➕ PRODUKT ANLEGEN</button></div></form>`);
}
function openChore(){
 modalOpen(modalHead('🧹 PUTZCLUB','NEUER PUTZJOB','Saubermachen, bevor die WG eine eigene Lebensform entwickelt.')+
 `<form data-form="add-chore"><div class="form-grid"><div class="field full"><label>Was muss gemacht werden?</label><input name="name" maxlength="90" placeholder="z.B. Herd entfetten" required></div>
 <div class="field"><label>Wer fängt an?</label><select name="owner"><option value="ben">🥩 Ben</option><option value="adrian">🎨 Adrian</option></select></div>
 <div class="field"><label>Alle wie viele Tage?</label><input name="cycle" type="number" min="1" max="365" value="7" required></div>
 <div class="field full"><label>Nächste Fälligkeit</label><input name="due" type="date" value="${offsetDay(1)}" required></div></div>
 <div class="btn-row"><button type="submit" class="btn">🧽 IN DEN PUTZPLAN</button></div></form>`);
}
function openReceipt(fromCheckout=false){
 const checked=fromCheckout?state.shopping.filter(x=>x.done):[];
 const items=checked.map(x=>x.name+(x.qty&&x.qty!=='1x'?' ('+x.qty+')':'')).join('\n');
 modalOpen(modalHead('🧾 DIE BELEG-MASCHINE','EINKAUF EINTRAGEN','Beleg fotografieren (optional), Betrag kontrollieren und festhalten, wer bezahlt hat.')+
 `<form data-form="add-receipt">
 <div class="form-grid">
 <div class="field full"><label>📷 Kassenzettel fotografieren / hochladen</label><input id="receipt-photo" type="file" name="photo" accept="image/*" capture="environment"><div class="field-hint">Bild bleibt im Browser. Texterkennung ist nur verfügbar, wenn dein Browser TextDetector unterstützt.</div><div id="receipt-photo-status" class="small muted"></div><img id="receipt-photo-preview" class="receipt-preview hidden" alt="Vorschau des Kassenzettels"></div>
 <div class="field full"><label>Markt / Geschäft</label><input name="store" maxlength="100" placeholder="z.B. REWE, EDEKA, Aldi"></div>
 <div class="field"><label>Gesamtbetrag in €</label><input id="receipt-total" name="total" inputmode="decimal" placeholder="z.B. 38,49" required></div>
 <div class="field"><label>Datum</label><input name="date" type="date" value="${dayISO()}" required></div>
 <div class="field"><label>Wer hat bezahlt?</label><select name="payer"><option value="adrian">🎨 Adrian</option><option value="ben">🥩 Ben</option></select></div>
 <div class="field"><label>Wem wird's angerechnet?</label><select name="scope"><option value="shared">🤝 50/50 WG</option><option value="ben">🥩 Nur Ben</option><option value="adrian">🎨 Nur Adrian</option></select></div>
 <div class="field full"><label>Gekaufte Produkte (eine Zeile pro Produkt)</label><textarea id="receipt-items" name="items" placeholder="Gurken\nMilch\nKaffee">${esc(items)}</textarea></div>
 <div class="field full"><label>Optional: abgetippten Belegtext auswerten</label><textarea id="receipt-raw" name="raw" placeholder="Hier Kassenzetteltext einfügen, die App sucht eine Endsumme und Produktzeilen."></textarea><button class="btn tiny secondary" type="button" data-action="parse-receipt">🔎 Text auswerten</button></div></div>
 <div class="receipt-help">💡 <strong>Hinweis:</strong> Ein fotografierter Beleg wird nicht in der Datenbank gespeichert – es gibt bisher keine gemeinsame Server-Datenbank. Hier wird nur dein bestätigter Betrag und die Produktliste gespeichert.</div>
 <div class="btn-row"><button class="btn" type="submit">💸 EINKAUF SPEICHERN</button><button type="button" class="btn ghost" data-action="close-modal">Abbrechen</button></div></form>`);
}
function openBackup(){
 modalOpen(modalHead('💾 DATEN SICHERN','WG-ÜBERLEBENSKIT','Diese erste Version speichert Daten nur auf deinem Gerät. Mit Export und Import könnt ihr Daten manuell übertragen.')+
 `<div class="notice"><span>⚠️</span><div><strong>Keine Live-Synchronisierung:</strong> Eintrag auf Adrians Handy erscheint noch nicht automatisch bei Ben. Für echte gemeinsame Daten braucht es später ein Backend mit Zugangsschutz.</div></div>
 <div class="btn-row">${button('export-backup','⬇️ JSON-Backup','secondary')}${button('import-backup','⬆️ Backup importieren','pink')}</div>
 <p class="small muted" style="margin-top:19px">Ein Backup enthält Einkaufsliste, Vorräte, Termine, Putzplan und Ausgaben. Import ersetzt die vorhandenen Daten auf diesem Gerät. Bitte vertraulich behandeln.</p>`);
}
function openAbout(){
 modalOpen(modalHead('🏺 ÜBER UNSERE WG-ZENTRALE','TÖPFERKURS.','Ben + Adrian · Töpferstraße · Schleswig')+
 `<p>🥒 Einkaufszettel · 🥩 Fleisch-Extra für Ben · 🧻 Vorrats-Quiz · 🗓️ Termine & Arbeit · 🧹 Putzrotation · 💸 Kassenzettel & Ausgleich.</p>
 <div class="notice"><span>🔒</span><div><strong>Aktuell ein lokaler Prototyp:</strong> Die Website ist über einen Link erreichbar. Eure Einträge bleiben aber im Speicher des jeweiligen Browsers. Kein Login, kein gemeinsamer Server und keine automatische Synchronisierung. Deshalb hier noch keine sensiblen Daten eintragen, solange wir keinen geschützten Zugang gebaut haben.</div></div>
 <p class="small muted" style="margin-top:16px">Gebaut ohne externe App-Plattform, Tracking-Dienste und externe OCR-Dienstleister. Ein Kassenzettelfoto wird nicht hochgeladen; automatische Erkennung gibt es experimentell nur bei Browser-Unterstützung.</p>
 ${button('backup','💾 Backup öffnen','secondary')}`);
}
function addShopping(name,qty='1x',owner='shared'){
 const clean=String(name||'').trim();
 if(!clean)return false;
 let who=owner==='shared'&&meat(clean)?'ben':owner;
 const same=state.shopping.find(x=>!x.done&&x.name.toLocaleLowerCase('de-DE')===clean.toLocaleLowerCase('de-DE')&&x.owner===who);
 if(same)return false;
 state.shopping.push({id:uid(),name:clean,qty:qty||'1x',owner:who,emoji:stockEmoji(clean),done:false,created:dayISO()});return true;
}
function setStockStatus(x,status){
 x.status=status;x.updated=dayISO();
 if(status==='good'&&(!x.count||x.count<1))x.count=1;
 if(status==='empty')x.count=0;
 if(status==='low'||status==='empty')addShopping(x.name,'1x',x.owner);
}
function startQuiz(){ui.quiz=0;ui.quizAdded=0;renderQuiz()}
function renderQuiz(){
 const total=state.pantry.length;
 if(ui.quiz>=total){
  modalOpen(modalHead('🎉 KÜHLSCHRANK GEPRÜFT','MISSION ERLEDIGT!','Ihr habt eure Vorräte gecheckt. Was fehlt, steht auf dem Einkaufszettel.')+
  '<div class="card lime"><div class="stat-number">'+ui.quizAdded+'</div><strong>neue Produkte auf der Einkaufsliste 🛒</strong></div><div class="btn-row">'+button('go-shopping','🛒 ZUM FRESSZETTEL','dark')+button('close-modal','🏠 Fertig','secondary')+'</div>');
  return;
 }
 const x=state.pantry[ui.quiz];
 modalOpen('<div class="question-number">VORRATS-CHECK · FRAGE '+(ui.quiz+1)+' / '+total+'</div><div class="meter"><div class="progress"><span style="width:'+Math.round(ui.quiz/total*100)+'%"></span></div></div><span class="question-icon">'+esc(x.emoji||stockEmoji(x.name))+'</span><h2 class="question-title" id="modal-title">Ist noch genug<br><span class="highlight">'+esc(x.name)+'</span> da?</h2><p>'+ownerTag(x.owner)+'</p><div class="step-actions"><button data-action="quiz-answer" data-value="yes">✅ JO, REICHT!</button><button data-action="quiz-answer" data-value="no">🚨 NÖ, FEHLT!</button><button class="skip" data-action="quiz-answer" data-value="skip">🤷 Keine Ahnung, nächste Frage</button></div>');
}
function quizAnswer(answer){
 const x=state.pantry[ui.quiz];if(!x)return;
 if(answer==='yes'){setStockStatus(x,'good')}
 else if(answer==='no'){const before=state.shopping.length;setStockStatus(x,'low');if(state.shopping.length>before)ui.quizAdded++}
 ui.quiz++;save();renderQuiz();
}
function restock(items){
 for(const item of items){
  const name=String(item.name||'').trim();if(!name)continue;
  const owner=item.owner||'shared';
  let product=state.pantry.find(p=>p.name.toLocaleLowerCase('de-DE')===name.toLocaleLowerCase('de-DE')&&p.owner===owner);
  if(!product){product={id:uid(),name,owner,emoji:stockEmoji(name),status:'good',count:0,updated:dayISO()};state.pantry.push(product)}
  const quantity=Math.max(1,Math.floor(parseFloat(String(item.qty||'1').replace(',','.')))||1);
  product.count=(Number(product.count)||0)+quantity;
  product.status='good';product.updated=dayISO();
 }
}
function detectReceipt(raw){
 const lines=String(raw||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 let total=null;
 const amounts=[];
 for(const line of lines){
  const matches=[...line.matchAll(/(\d{1,5}[,.]\d{2})\s*(?:€|EUR)?/gi)];
  if(matches.length){
   const amt=num(matches[matches.length-1][1]);
   if(Number.isFinite(amt)&&amt>=0&&amt<100000){
    amounts.push(amt);
    if(/gesamt|summe|betrag|zu zahlen|endbetrag|total|zu bezahlen|kassenbon/i.test(line))total=amt;
   }
  }
 }
 if(total===null&&amounts.length)total=Math.max(...amounts);
 const items=lines.filter(x=>/(\d{1,5}[,.]\d{2})/.test(x)&&!/(gesamt|summe|betrag|total|steuer|mwst|ust|netto|brutto|bezahlt|gegeben|rückgeld|ec-karte|karte|mastercard|visa|kreditkarte|barzahlung|girocard|debit|zahlung)/i.test(x))
 .map(x=>x.replace(/\s+\d{1,5}[,.]\d{2}\s*(?:€|EUR)?\s*$/i,'').trim()).filter(x=>x.length>1).slice(0,70);
 return {total,items};
}
function applyReceiptText(raw){
 const res=detectReceipt(raw);
 const amt=document.getElementById('receipt-total'),items=document.getElementById('receipt-items');
 if(res.total!==null)amt.value=res.total.toFixed(2).replace('.',',');
 if(res.items.length){const current=items.value.trim();items.value=current?current+'\n'+res.items.join('\n'):res.items.join('\n')}
 toast('🔎 '+(res.total!==null?'Betrag gefunden. ':'Kein sicherer Betrag. ')+res.items.length+' Produktzeilen erkannt – bitte kontrollieren!');
}
function handleAction(action,el){
 const id=el.dataset.id,val=el.dataset.value;
 if(action==='close-modal'){closeModal();return}
 if(action==='about'){openAbout();return}
 if(action==='backup'){openBackup();return}
 if(action==='open-event'){openEvent();return}
 if(action==='open-stock'){openStock();return}
 if(action==='open-chore'){openChore();return}
 if(action==='open-receipt'){openReceipt(false);return}
 if(action==='start-quiz'){startQuiz();return}
 if(action==='quiz-answer'){quizAnswer(val);return}
 if(action==='go-shopping'){navigate('shopping');return}
 if(action==='shop-tab'){ui.shopTab=val;render();return}
 if(action==='stock-filter'){ui.stockFilter=val;render();return}
 if(action==='finish-shop'){if(!state.shopping.some(x=>x.done)){toast('🛒 Erst gekaufte Produkte abhaken!');return}openReceipt(true);return}
 if(action==='toggle-shopping'){const x=state.shopping.find(x=>x.id===id);if(x){x.done=!x.done;save();render()}return}
 if(action==='delete-shopping'){state.shopping=state.shopping.filter(x=>x.id!==id);save();render();return}
 if(action==='stock-status'){const x=state.pantry.find(x=>x.id===id);if(x){setStockStatus(x,val);save();render();toast(val==='good'?'👍 Bestens, ist noch da!':'🛒 Bei Bedarf auf dem Einkaufszettel!')}return}
 if(action==='add-unit'){const x=state.pantry.find(x=>x.id===id);if(!x)return;x.count=(Number(x.count)||0)+1;x.status='good';x.updated=dayISO();save();render();toast('📦 Eine Einheit ergänzt!');return}
 if(action==='consume'){
  const x=state.pantry.find(x=>x.id===id);if(!x)return;
  x.count=Math.max(0,(Number(x.count)||0)-1);
  if(x.count===0){setStockStatus(x,'empty');toast('🚨 '+x.name+' ist leer und auf dem Einkaufszettel!')}
  else{x.status=x.count===1?'low':'good';x.updated=dayISO();if(x.status==='low')addShopping(x.name,'1x',x.owner);toast('🍳 Eine Einheit verbraucht')}
  save();render();return;
 }
 if(action==='delete-stock'){if(!confirm('Produkt aus Vorräten entfernen?'))return;state.pantry=state.pantry.filter(x=>x.id!==id);save();render();return}
 if(action==='prev-month'||action==='next-month'){const d=new Date(ui.year,ui.month+(action==='next-month'?1:-1),1);ui.year=d.getFullYear();ui.month=d.getMonth();ui.chosenDate=dayISO(d);render();return}
 if(action==='calendar-day'){ui.chosenDate=val;render();return}
 if(action==='delete-event'){if(!confirm('Termin löschen?'))return;state.events=state.events.filter(x=>x.id!==id);save();render();return}
 if(action==='do-chore'){
  const x=state.chores.find(x=>x.id===id);if(!x)return;
  const by=x.owner;x.history=x.history||[];x.history.push({by,date:dayISO()});x.history=x.history.slice(-50);
  const newDue=parseDay(x.due>dayISO()?x.due:dayISO());newDue.setDate(newDue.getDate()+Math.max(1,Number(x.cycle)||7));
  x.due=dayISO(newDue);x.owner=by==='ben'?'adrian':'ben';
  save();render();toast('🏅 '+ownerName(by)+' hat '+x.name+' erledigt!');return;
 }
 if(action==='delete-chore'){if(!confirm('Putzaufgabe löschen?'))return;state.chores=state.chores.filter(x=>x.id!==id);save();render();return}
 if(action==='delete-receipt'){if(!confirm('Einkauf endgültig löschen?'))return;state.receipts=state.receipts.filter(x=>x.id!==id);save();render();return}
 if(action==='parse-receipt'){applyReceiptText(document.getElementById('receipt-raw').value);return}
 if(action==='export-backup'){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download='toepferkurs-backup-'+dayISO()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),1000);toast('💾 Backup gespeichert!');return}
 if(action==='import-backup'){document.getElementById('import-file').click();return}
}
document.body.addEventListener('click',e=>{
 const page=e.target.closest('[data-page]');
 if(page){e.preventDefault();navigate(page.dataset.page);return}
 const a=e.target.closest('[data-action]');
 if(a){e.preventDefault();handleAction(a.dataset.action,a)}
});
document.body.addEventListener('submit',e=>{
 const form=e.target.closest('form[data-form]');if(!form)return;e.preventDefault();
 const data=Object.fromEntries(new FormData(form).entries());
 const type=form.dataset.form;
 if(type==='add-shopping'){
  const name=String(data.name||'').trim();if(!name)return;
  if(addShopping(name,String(data.qty||'1x').trim(),data.owner)){save();render();toast('🛒 '+name+' steht auf dem Zettel!')}
  else toast('🧐 Steht schon auf dem Zettel.');return;
 }
 if(type==='add-stock'){
  const name=String(data.name||'').trim();if(!name)return;
  const owner=meat(name)&&data.owner==='shared'?'ben':data.owner;
  if(state.pantry.some(x=>x.name.toLowerCase()===name.toLowerCase()&&x.owner===owner)){toast('📦 Produkt ist schon da!');return}
  const x={id:uid(),name,emoji:stockEmoji(name),owner,status:data.status,count:Math.max(0,Number(data.count)||0),updated:dayISO()};
  state.pantry.push(x);if(x.status==='empty'||x.status==='low')setStockStatus(x,x.status);
  save();closeModal();render();toast('🥫 Ab ins Regal!');return;
 }
 if(type==='add-event'){
  const title=String(data.title||'').trim();if(!title||!data.date)return;
  if(data.start&&data.end&&data.end<data.start){toast('⏰ Endzeit vor Startzeit? Bitte prüfen.');return}
  state.events.push({id:uid(),title,type:data.type,owner:data.owner,date:data.date,start:data.start||'',end:data.end||'',notes:String(data.notes||'').trim()});
  ui.chosenDate=data.date;const d=parseDay(data.date);ui.month=d.getMonth();ui.year=d.getFullYear();
  save();closeModal();render();toast('📅 Termin eingetragen!');return;
 }
 if(type==='add-chore'){
  const name=String(data.name||'').trim();if(!name)return;
  state.chores.push({id:uid(),name,emoji:/bad|klo|wc/i.test(name)?'🚽':/müll/i.test(name)?'🗑️':/küche|geschirr/i.test(name)?'🍽️':'🧹',owner:data.owner,due:data.due,cycle:Math.max(1,Number(data.cycle)||7),history:[]});
  save();closeModal();render();toast('🧹 Ab in den Putzplan!');return;
 }
 if(type==='add-receipt'){
  const total=num(data.total);if(!Number.isFinite(total)||total<0||total>99999){toast('💸 Bitte einen gültigen Betrag eintragen.');return}
  const lines=String(data.items||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  state.receipts.push({id:uid(),store:String(data.store||'Einkauf').trim().slice(0,100),date:data.date||dayISO(),total:Math.round(total*100)/100,payer:data.payer,scope:data.scope,items:lines.join(', ').slice(0,3000)});
  const checked=state.shopping.filter(x=>x.done);
  if(checked.length){
   restock(checked);state.shopping=state.shopping.filter(x=>!x.done);
  }else if(lines.length){
   restock(lines.map(name=>({name,owner:meat(name)?'ben':'shared',qty:'1x'})));
  }
  save();closeModal();render();toast('🥳 Einkauf gespeichert, Bestände aktualisiert!');return;
 }
});
document.getElementById('import-file').addEventListener('change',async e=>{
 const f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;
 if(f.size>10*1024*1024){toast('❌ Backup ist zu groß.');return}
 try{
  const incoming=safeState(JSON.parse(await f.text()));
  if(!confirm('ACHTUNG: Alle aktuellen Daten auf diesem Gerät durch dieses Backup ersetzen?'))return;
  state=incoming;save();closeModal();render();toast('📦 Backup erfolgreich eingespielt!');
 }catch(err){toast('❌ Keine gültige Töpferkurs-Datei.')}
});
document.body.addEventListener('change',async e=>{
 if(e.target.id!=='receipt-photo')return;
 const f=e.target.files&&e.target.files[0];if(!f)return;
 const status=document.getElementById('receipt-photo-status');
 const img=document.getElementById('receipt-photo-preview');
 if(!f.type.startsWith('image/')){status.textContent='Bitte ein Bild auswählen.';return}
 if(f.size>12*1024*1024){status.textContent='Foto zu groß (max. 12 MB).';return}
 const url=URL.createObjectURL(f);img.src=url;img.classList.remove('hidden');
 img.onload=()=>setTimeout(()=>URL.revokeObjectURL(url),1000);
 status.textContent='📸 Foto ausgewählt. Prüfe, ob Texterkennung im Browser möglich ist ...';
 if(!('TextDetector' in window)){status.textContent='📸 Foto bereit. Dieser Browser unterstützt keine automatische Beleg-Texterkennung. Betrag bitte selbst eintragen.';return}
 try{
  const detector=new window.TextDetector();
  const bitmap=await createImageBitmap(f);
  const results=await detector.detect(bitmap);bitmap.close();
  const raw=results.map(x=>x.rawValue).join('\n');
  document.getElementById('receipt-raw').value=raw;
  if(raw.trim()){applyReceiptText(raw);status.textContent='🔎 Browser hat Text gelesen. Bitte die Erkennung und den Gesamtbetrag prüfen.'}
  else status.textContent='📸 Kein lesbarer Text erkannt. Bitte Betrag selbst eintragen.';
 }catch(err){status.textContent='📸 Texterkennung nicht verfügbar. Betrag bitte manuell eintragen.'}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.classList.contains('hidden'))closeModal()});
window.addEventListener('storage',e=>{if(e.key===KEY){state=load();render();toast('🔄 Daten in anderem Tab geändert.')}});
render();
if(typeof navigator!=='undefined'&&'serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Offline-Modus nicht verfügbar:',err))}