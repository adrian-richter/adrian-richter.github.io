'use strict';

/**
 * Optional shared WG storage. The public website remains functional offline
 * until a PRIVATE, HTTPS PHP/SQLite API has been configured separately.
 * No shared token or personal data is embedded in this publicly served file.
 */
const WG_SYNC_SETTINGS='toepferkurs.sync.settings.v1';
const WG_SYNC_BASE='toepferkurs.sync.base.v1';
const WG_PRE_SYNC_BACKUP='toepferkurs.sync.local-backup.v1';
const wgSync={
  cfg:null,revision:0,base:null,active:false,pending:false,sending:false,
  busy:false,checking:false,status:'local',changed:0,timer:null,poll:null,
  candidate:null,lastError:''
};
function wgClone(x){return JSON.parse(JSON.stringify(x))}
function wgEqual(a,b){return JSON.stringify(a)===JSON.stringify(b)}
function wgLoadJson(key){
 try{const value=localStorage.getItem(key);return value?JSON.parse(value):null}catch(_){return null}
}
function wgUrl(value){
 const candidate=String(value||'').trim();
 const url=new URL(candidate);
 if(url.protocol!=='https:' && !(url.protocol==='http:' && ['localhost','127.0.0.1'].includes(url.hostname)))throw Error('Bitte eine HTTPS-Adresse verwenden.');
 if(url.username||url.password||url.search||url.hash)throw Error('API-Adresse ohne Zugangsdaten oder URL-Parameter eingeben.');
 return url.href.replace(/\/+$/,'');
}
function wgValidCode(s){return typeof s==='string'&&s.length>=20&&s.length<=200}
function wgBanner(){
 const el=document.getElementById('sync-banner');if(!el)return;
 const labels={
  local:['📱','Nur auf diesem Gerät','Die Einträge sind noch nicht zwischen PC und Handy verbunden.'],
  busy:['🔄','WG-Verbindung läuft','Verbindung zum gemeinsamen Speicher wird geprüft …'],
  online:['🌐','WG-Daten verbunden','Alle Geräte mit diesem WG-Code sehen denselben Datenbestand.'],
  pending:['⏳','Synchronisierung läuft','Änderungen werden gerade übertragen.'],
  offline:['⚠️','WG-Speicher nicht erreichbar','Änderungen bleiben hier erhalten und werden beim Wiederverbinden übertragen.'],
  error:['🔒','Verbindung prüfen','Der WG-Speicher ist nicht erreichbar oder der Zugangscode stimmt nicht.']
 };
 const [icon,title,subtitle]=labels[wgSync.status]||labels.local;
 const label=wgSync.active?'Einstellungen':'WG-Speicher verbinden';
 el.className='sync-banner sync-'+wgSync.status;
 el.innerHTML='<span class="sync-symbol" aria-hidden="true">'+icon+'</span><div class="sync-text"><strong>'+title+'</strong><small>'+subtitle+'</small></div>'+
 '<button type="button" class="btn tiny secondary" data-action="sync-settings">⚙️ '+label+'</button>';
}
function wgWriteMirror(){
 try{localStorage.setItem(KEY,JSON.stringify(state))}catch(err){toast('⚠️ Lokaler Speicher ist voll. Bitte Backup sichern.');console.error(err)}
 updateNav();
}
function wgSaveBase(){
 if(!wgSync.cfg||!wgSync.base)return;
 try{
  localStorage.setItem(WG_SYNC_SETTINGS,JSON.stringify(wgSync.cfg));
  localStorage.setItem(WG_SYNC_BASE,JSON.stringify({url:wgSync.cfg.url,revision:wgSync.revision,base:wgSync.base}));
 }catch(err){console.warn('WG-Synchronisierungsstand konnte nicht gemerkt werden',err)}
}
function wgBackupBeforeSwitch(){
 try{
  localStorage.setItem(WG_PRE_SYNC_BACKUP,JSON.stringify({time:new Date().toISOString(),state:wgClone(state)}));
  return true;
 }catch(err){console.warn('Lokaler Zustand konnte nicht zusätzlich gesichert werden',err);return false}
}
function wgDownloadOldLocal(){
 const backup=wgLoadJson(WG_PRE_SYNC_BACKUP);
 if(!backup||!backup.state){toast('💾 Es gibt noch keinen gespeicherten früheren Gerätestand.');return}
 const data=new Blob([JSON.stringify(backup.state,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(data);
 const link=document.createElement('a');
 link.href=url;link.download='toepferkurs-alter-geraetestand.json';
 document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 toast('💾 Der alte lokale Stand wurde als Backup exportiert.');
}
function wgStageStatus(next,err=''){wgSync.status=next;wgSync.lastError=err;wgBanner()}

async function wgRequest(cfg,method='GET',payload){
 const headers={'Authorization':'Bearer '+cfg.code,'Accept':'application/json'};
 if(payload!==undefined)headers['Content-Type']='application/json';
 const abort=new AbortController();
 const timeout=setTimeout(()=>abort.abort(),12000);
 try{
  const resp=await fetch(cfg.url,{
   method,mode:'cors',cache:'no-store',headers,
   body:payload===undefined?undefined:JSON.stringify(payload),
   signal:abort.signal
  });
  let json;
  try{json=await resp.json()}catch(_){throw Error('Der Server liefert keine gültige JSON-Antwort.')}
  if(!resp.ok&&resp.status!==409)throw Error((json&&json.error)||'HTTP '+resp.status);
  if(!json||typeof json.revision!=='number'||(json.state!==null&&typeof json.state!=='object'))throw Error('Ungültige Antwort des WG-Servers.');
  if(json.state!==null)json.state=safeState(json.state);
  return {status:resp.status,revision:json.revision,state:json.state};
 }catch(err){
  if(err.name==='AbortError')throw Error('Verbindung zum Server hat zu lange gedauert.');
  throw err;
 }finally{clearTimeout(timeout)}
}
// Merge only edits that differ from the last confirmed server snapshot.
// Each item ID is a stable key. Independent edits from Ben and Adrian survive.
function wgMergeThreeWay(base,local,remote){
 const result=wgClone(remote),keys=['shopping','pantry','events','chores','receipts','meals'];
 for(const key of keys){
  const before=new Map((base[key]||[]).map(x=>[x.id,x]));
  const ours=new Map((local[key]||[]).map(x=>[x.id,x]));
  const theirs=new Map((remote[key]||[]).map(x=>[x.id,x]));
  const ids=new Set([...theirs.keys(),...ours.keys(),...before.keys()]);
  const merged=[];
  for(const id of ids){
   const hasBase=before.has(id),hasLocal=ours.has(id);
   const localChanged=hasBase?!wgEqual(hasLocal?ours.get(id):null,before.get(id)):hasLocal;
   const chosen=localChanged?(hasLocal?ours.get(id):null):theirs.get(id);
   if(chosen)merged.push(wgClone(chosen));
  }
  result[key]=merged;
 }
 result.choreCatalogVersion=Math.max(Number(local.choreCatalogVersion)||0,Number(remote.choreCatalogVersion)||0);
 return safeState(result);
}
// When combining previously independent devices, deduplicate pantry/chores
// by logical name, rather than adding duplicate seeded tasks.
function wgMergeInitial(local,remote){
 const result=wgClone(remote);
 const identity=(item,key)=>{
  const n=String(item.name||item.title||item.store||'').trim().toLocaleLowerCase('de-DE');
  if(key==='shopping')return n+'|'+item.owner+'|'+!!item.done;
  if(key==='pantry')return n+'|'+item.owner;
  if(key==='chores')return n;
  if(key==='events')return (item.date||'')+'|'+n+'|'+(item.owner||'');
  if(key==='receipts')return (item.date||'')+'|'+n+'|'+(item.total||'')+'|'+item.payer;
  return (item.date||'')+'|'+n+'|'+item.owner;
 };
 for(const key of ['shopping','pantry','events','chores','receipts','meals']){
  const arr=result[key]||[];
  for(const item of local[key]||[]){
   const other=arr.find(x=>x.id===item.id||identity(x,key)===identity(item,key));
   if(!other){arr.push(wgClone(item));continue}
   if(key==='pantry'&&other.status==='unknown'&&item.status!=='unknown'){other.status=item.status;other.count=item.count;other.updated=item.updated}
   if(key==='chores'&&item.history&&item.history.length){
    const known=new Set((other.history||[]).map(x=>JSON.stringify(x)));
    other.history=other.history||[];
    for(const h of item.history)if(!known.has(JSON.stringify(h))){other.history.push(h);known.add(JSON.stringify(h))}
   }
  }
  result[key]=arr;
 }
 result.choreCatalogVersion=Math.max(Number(local.choreCatalogVersion)||0,Number(remote.choreCatalogVersion)||0);
 return safeState(result);
}
function wgApplyState(newState){
 state=safeState(newState);
 hydrateChoreCatalog(state);
 ensureMandatoryBeer();
 wgWriteMirror();
 render();
 wgBanner();
}
function wgRememberConnected(cfg,response){
 wgSync.cfg=cfg;wgSync.revision=response.revision;wgSync.base=wgClone(response.state);
 wgSync.active=true;wgSync.pending=false;
 wgSaveBase();wgStageStatus('online');
 if(!wgSync.poll){
  wgSync.poll=setInterval(()=>{if(wgSync.active){if(wgSync.pending)wgFlush();else wgPull()}},8000);
 }
}
async function wgPublish(){
 const candidate=wgSync.candidate;if(!candidate||candidate.response.state!==null)return;
 wgStageStatus('busy');
 try{
  const local=wgClone(state);
  const res=await wgRequest(candidate.cfg,'PUT',{base_revision:0,state:local});
  if(res.status===409){
   wgSync.candidate={cfg:candidate.cfg,response:res};
   wgShowChoice(candidate.cfg,res);
   return;
  }
  wgRememberConnected(candidate.cfg,res);
  wgSync.candidate=null;closeModal();toast('🌐 PC-Einträge sind jetzt im gemeinsamen WG-Speicher!');
 }catch(err){wgStageStatus('error',err.message);toast('⚠️ '+err.message)}
}
function wgJoin(mode){
 const candidate=wgSync.candidate;
 if(!candidate||!candidate.response.state)return;
 const {cfg,response}=candidate;
 const next=mode==='merge'?wgMergeInitial(state,response.state):response.state;
 if(!wgBackupBeforeSwitch()){toast('⚠️ Lokaler Sicherheitsstand konnte nicht gesichert werden. Bitte erst ein JSON-Backup exportieren.');return}
 wgRememberConnected(cfg,response);
 wgApplyState(next);
 wgSync.candidate=null;closeModal();
 if(mode==='merge'&&!wgEqual(next,response.state)){
  wgSync.pending=true;wgSync.changed++;wgStageStatus('pending');wgSchedule();
  toast('🤝 Lokale und gemeinsame Einträge werden zusammengeführt.');
 }else toast('🌐 Gemeinsamer WG-Stand geladen!');
}
function wgShowChoice(cfg,response){
 wgSync.candidate={cfg,response};
 if(response.state===null){
  modalOpen(modalHead('🌐 GEMEINSAME DATEN','DIE WG IST NOCH LEER','Auf dem Server sind noch keine Daten gespeichert.')+
   '<div class="notice"><span>💻</span><div><strong>Wichtig: zuerst am PC!</strong> Wenn deine bisherigen Einträge auf dem PC sind, verbinde dich dort und veröffentliche diesen PC-Stand als erstes. Sonst müsst ihr später zusammenführen.</div></div>'+
   '<div class="btn-row"><button class="btn" data-action="sync-publish">⬆️ DIESE GERÄTEDATEN ALS WG-STAND SPEICHERN</button><button class="btn ghost" data-action="sync-settings">Zurück</button></div>');
  return;
 }
 modalOpen(modalHead('🌐 GEMEINSAME DATEN','WELCHER STAND SOLL GELTEN?','Auf dem WG-Server gibt es bereits Einträge. Deine bisherigen lokalen Einträge werden bei der Übernahme zusätzlich als Sicherheitskopie gespeichert.')+
  '<div class="card lime"><strong>🌐 WG-Stand: Revision '+response.revision+'</strong><p class="small">Der zentrale Datenbestand enthält '+response.state.shopping.length+' Einkaufspositionen und '+response.state.events.length+' Termine.</p></div>'+
  '<div class="btn-row"><button class="btn" data-action="sync-adopt">⬇️ WG-Stand übernehmen</button><button class="btn secondary" data-action="sync-merge">🤝 Beide Stände zusammenführen</button></div>'+
  '<p class="small muted" style="margin-top:15px">Wenn du bereits Einträge auf dem PC gemacht hast, ist „Beide Stände zusammenführen“ sinnvoll. Für ein neues Handy ohne eigene Daten reicht „WG-Stand übernehmen“.</p>');
}
async function wgConnect(url,code,automatic=false){
 let cfg;
 try{cfg={url:wgUrl(url),code:String(code||'').trim()};if(!wgValidCode(cfg.code))throw Error('Der WG-Zugangscode muss mindestens 20 Zeichen lang sein.')}
 catch(err){toast('⚠️ '+err.message);return}
 if(wgSync.checking)return;
 wgSync.checking=true;wgStageStatus('busy');
 try{
  const response=await wgRequest(cfg);
  if(response.status!==200)throw Error('Der WG-Server ist nicht erreichbar.');
  const meta=wgLoadJson(WG_SYNC_BASE);
  if(automatic&&response.state&&meta&&meta.url===cfg.url&&meta.base&&Number.isFinite(meta.revision)){
   // Preserve offline local changes across page reloads.
   const merged=wgMergeThreeWay(meta.base,state,response.state);
   wgRememberConnected(cfg,response);
   const changed=!wgEqual(merged,response.state);
   wgApplyState(merged);
   if(changed){
    wgSync.pending=true;wgSync.changed++;wgStageStatus('pending');wgSchedule();
   }
  }else wgShowChoice(cfg,response);
 }catch(err){
  wgSync.cfg=cfg;
  const meta=wgLoadJson(WG_SYNC_BASE);
  if(automatic&&meta&&meta.url===cfg.url&&meta.base){
   wgSync.revision=meta.revision;wgSync.base=meta.base;wgSync.active=true;
   wgSync.pending=!wgEqual(state,meta.base);
   wgStageStatus('offline',err.message);
   if(!wgSync.poll)wgSync.poll=setInterval(()=>{if(wgSync.active){if(wgSync.pending)wgFlush();else wgPull()}},8000);
  }else wgStageStatus('error',err.message);
  if(!automatic)toast('⚠️ '+err.message);
 }finally{wgSync.checking=false;wgBanner()}
}
function wgSchedule(){
 if(!wgSync.active)return;
 clearTimeout(wgSync.timer);
 wgSync.timer=setTimeout(()=>wgFlush(),450);
}
function syncLocalSave(){
 if(!wgSync.active)return;
 wgSync.changed++;
 wgSync.pending=true;
 if(wgSync.status!=='offline')wgStageStatus('pending');
 wgSchedule();
}
function syncIsConnected(){return wgSync.active}
async function wgFlush(){
 if(!wgSync.active||!wgSync.pending||wgSync.sending)return;
 wgSync.sending=true;
 const sentCounter=wgSync.changed,sent=wgClone(state),base=wgClone(wgSync.base),rev=wgSync.revision;
 try{
  const res=await wgRequest(wgSync.cfg,'PUT',{base_revision:rev,state:sent});
  if(res.status===409){
   if(!res.state)throw Error('Ungültiger Konfliktstand vom WG-Server.');
   // First merge remote edits against what was sent; then include edits
   // made locally while the network request was in flight.
   let merged=wgMergeThreeWay(base,sent,res.state);
   if(wgSync.changed!==sentCounter)merged=wgMergeThreeWay(sent,state,merged);
   wgSync.base=wgClone(res.state);wgSync.revision=res.revision;
   wgApplyState(merged);wgSaveBase();wgSync.pending=true;wgStageStatus('pending');
  }else{
   wgSync.base=wgClone(sent);wgSync.revision=res.revision;wgSaveBase();
   wgSync.pending=wgSync.changed!==sentCounter;
   wgStageStatus(wgSync.pending?'pending':'online');
  }
 }catch(err){
  wgSync.pending=true;wgStageStatus('offline',err.message);
 }finally{
  wgSync.sending=false;
  if(wgSync.pending&&wgSync.status!=='offline')wgSchedule();
 }
}
async function wgPull(){
 if(!wgSync.active||wgSync.sending||wgSync.busy)return;
 wgSync.busy=true;
 try{
  const res=await wgRequest(wgSync.cfg);
  if(res.state===null)throw Error('Auf dem Server fehlen die WG-Daten.');
  if(res.revision!==wgSync.revision){
   const merged=wgMergeThreeWay(wgSync.base,state,res.state);
   const changed=!wgEqual(merged,res.state);
   wgSync.base=wgClone(res.state);wgSync.revision=res.revision;wgSaveBase();
   wgApplyState(merged);
   if(changed){wgSync.pending=true;wgSync.changed++;wgStageStatus('pending');wgSchedule()}
   else wgStageStatus('online');
  }else wgStageStatus(wgSync.pending?'pending':'online');
 }catch(err){wgStageStatus('offline',err.message)}
 finally{wgSync.busy=false}
}
function wgDisconnect(){
 if(wgSync.pending&&!confirm('Es gibt noch nicht synchronisierte Änderungen. Wirklich trennen?'))return;
 clearTimeout(wgSync.timer);clearInterval(wgSync.poll);
 Object.assign(wgSync,{cfg:null,revision:0,base:null,active:false,pending:false,sending:false,busy:false,checking:false,status:'local',candidate:null,timer:null,poll:null});
 localStorage.removeItem(WG_SYNC_SETTINGS);localStorage.removeItem(WG_SYNC_BASE);
 closeModal();wgBanner();toast('📱 Verbindung getrennt. Einträge bleiben auf diesem Gerät.');
}
function openSyncSettings(){
 if(wgSync.active){
  modalOpen(modalHead('🌐 WG-SYNCHRONISIERUNG','EINE WG. EIN DATENBESTAND.','Ben, Adrian und das Kühlschrank-Tablet können denselben Datenbestand verwenden.')+
  '<div class="notice"><span>🌐</span><div><strong>'+ (wgSync.status==='online'?'Verbunden':wgSync.status==='pending'?'Änderungen werden übertragen':'Verbindung vorübergehend gestört')+'</strong><div class="small">Stand: Revision '+wgSync.revision+' · Server: '+esc(wgSync.cfg.url)+'</div></div></div>'+
  '<div class="btn-row"><button class="btn" data-action="sync-now">🔄 Jetzt synchronisieren</button><button class="btn danger" data-action="sync-disconnect">🔌 Verbindung trennen</button></div>'+
  '<p class="small muted" style="margin-top:16px">Der WG-Zugangscode wird auf diesem Gerät gespeichert. Bitte nur auf euren eigenen Geräten einrichten.</p>'+ 
  (wgLoadJson(WG_PRE_SYNC_BACKUP)?'<button class="btn ghost tiny" data-action="sync-old-backup">💾 Vorherigen lokalen Stand herunterladen</button>':''));
  return;
 }
 const saved=wgLoadJson(WG_SYNC_SETTINGS)||wgSync.cfg||{};
 modalOpen(modalHead('🌐 WG-SYNCHRONISIERUNG','EINE WG. EIN DATENBESTAND.','Sobald eure private WG-API auf einem Server läuft, tragen alle Geräte dieselben Daten ein.')+
 '<div class="notice"><span>💻</span><div><strong>Erst den PC mit den gestrigen Einträgen verbinden.</strong> Damit bestehende Einkaufslisten, Termine und der Putzclub nicht verloren gehen. Danach könnt ihr Ben und das Handy anschließen.</div></div>'+
 '<form data-form="sync-connect" class="sync-connect-form"><div class="form-grid">'+
 '<div class="field full"><label for="wg-api-url">Adresse des eigenen WG-Servers (HTTPS)</label><input id="wg-api-url" type="url" name="url" placeholder="https://dein-server.de/wg-api/" value="'+attr(saved.url||'')+'" required></div>'+
 '<div class="field full"><label for="wg-api-code">Gemeinsamer WG-Zugangscode</label><input id="wg-api-code" type="password" name="code" minlength="20" maxlength="200" autocomplete="off" value="'+attr(saved.code||'')+'" required></div></div>'+
 '<div class="btn-row"><button class="btn" type="submit">🌐 VERBINDUNG PRÜFEN</button></div></form>'+
 '<p class="small muted" style="margin-top:14px">Hier werden keine neuen Benutzerkonten erstellt. Ohne laufenden Server bleiben eure Einträge wie bisher lokal; GitHub Pages allein kann keine Datenbank speichern.</p>');
}
function wgHandleButton(action){
 if(action==='sync-publish'){wgPublish();return true}
 if(action==='sync-adopt'){wgJoin('adopt');return true}
 if(action==='sync-merge'){wgJoin('merge');return true}
 if(action==='sync-now'){wgSync.pending?wgFlush():wgPull();toast('🔄 WG-Daten werden geprüft.');return true}
 if(action==='sync-disconnect'){wgDisconnect();return true}
 if(action==='sync-old-backup'){wgDownloadOldLocal();return true}
 return false;
}
document.body.addEventListener('click',e=>{
 const target=e.target.closest('[data-action]');if(!target)return;
 wgHandleButton(target.dataset.action);
});
document.body.addEventListener('submit',e=>{
 const form=e.target.closest('[data-form="sync-connect"]');
 if(!form)return;e.preventDefault();
 const data=new FormData(form);
 wgConnect(String(data.get('url')||''),String(data.get('code')||''));
});
window.addEventListener('focus',()=>{
 if(wgSync.active){if(wgSync.pending)wgFlush();else wgPull()}
});
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='visible'&&wgSync.active){if(wgSync.pending)wgFlush();else wgPull()}
});
window.addEventListener('online',()=>{
 if(wgSync.active){if(wgSync.pending)wgFlush();else wgPull()}
});
function wgBoot(){
 wgBanner();
 const cfg=wgLoadJson(WG_SYNC_SETTINGS);
 if(cfg&&cfg.url&&cfg.code){wgConnect(cfg.url,cfg.code,true)}
}
wgBoot();
