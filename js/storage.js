// Buget Familie — storage.js
// Where the data lives:
//   1. IndexedDB, inside the browser — the working copy, so the app opens instantly and keeps
//      working even if the file is momentarily out of reach.
//   2. A JSON file the user picks, in a folder they choose (ideally inside Google Drive or
//      OneDrive, so they also get a copy in the cloud). That file is the real home of the data:
//      clearing the browser does not touch it.
// Chrome and Edge can write that file directly. Firefox cannot, so there the app falls back to
// loading and saving the file by hand.

var DATA_FILE   = "buget-familie.json";
var BACKUP_DIR  = "copii";   // dated copies live here, next to the data file
var BACKUP_KEEP = 14;        // dated copies kept in the folder
var SNAP_KEEP   = 20;        // daily copies kept inside the browser

var STG = {
  mode:   "none",   // "folder" | "file" | "manual" | "none"
  state:  "new",    // "new" | "ok" | "ask" | "nofile" | "conflict" | "error"
  name:   "",       // what the user sees: the file name
  folder: "",       // folder name, when we have one
  lastSaved: 0,     // ms, last successful write to the file
  stamp:  0,        // lastModified of the file as we left it (to spot changes from elsewhere)
  err:    "",
  snaps:  [],       // dates of the daily copies kept in the browser
  dirty:  false,
  writing:false,
  backupDay:"",
  supported: false,
  frameBlocked: false
};
// Writing to a file needs a secure context and a page that is not inside someone else's frame
// (a preview pane, for instance). We work that out once, at load.
(function(){
  if(typeof window==="undefined") return;
  var inFrame=false;
  try{ inFrame = window.top!==window.self && window.top.location.origin!==location.origin; }
  catch(e){ inFrame = true; }
  STG.frameBlocked = inFrame;
  STG.supported = !!window.showDirectoryPicker && !!window.isSecureContext && !inFrame;
})();

// ───────────────────────── a very small IndexedDB key/value store ─────────────────────────
var IDB_NAME="bugetFamilie", IDB_STORE="kv", _idb=null;

function idbOpen(){
  if(_idb) return Promise.resolve(_idb);
  return new Promise(function(res,rej){
    var r=indexedDB.open(IDB_NAME,1);
    r.onupgradeneeded=function(){ if(!r.result.objectStoreNames.contains(IDB_STORE)) r.result.createObjectStore(IDB_STORE); };
    r.onsuccess=function(){ _idb=r.result; res(_idb); };
    r.onerror=function(){ rej(r.error); };
  });
}
function idbDo(mode, fn){
  return idbOpen().then(function(db){
    return new Promise(function(res,rej){
      var tx=db.transaction(IDB_STORE,mode), st=tx.objectStore(IDB_STORE), rq=fn(st);
      tx.oncomplete=function(){ res(rq?rq.result:undefined); };
      tx.onerror=function(){ rej(tx.error); };
    });
  });
}
function idbGet(k){ return idbDo("readonly", function(st){ return st.get(k); }); }
function idbSet(k,v){ return idbDo("readwrite", function(st){ return st.put(v,k); }); }
function idbDel(k){ return idbDo("readwrite", function(st){ return st.delete(k); }); }
function idbKeys(){ return idbDo("readonly", function(st){ return st.getAllKeys(); }); }

// ───────────────────────── start-up ─────────────────────────
// Reads the working copy, then tries to reconnect to the file chosen last time.
function stgInit(){
  return idbGet("data").then(function(d){
    if(d) adoptData(d);
    return idbKeys();
  }).then(function(ks){
    STG.snaps=(ks||[]).filter(function(k){ return String(k).indexOf("snap:")===0; })
                      .map(function(k){ return String(k).slice(5); }).sort().reverse();
    return idbGet("place");
  }).then(function(p){
    if(!p || !p.handle){ STG.state = hasAnyData() ? "nofile" : "new"; return; }
    STG.mode=p.mode; STG.name=p.name||DATA_FILE; STG.folder=p.folder||""; STG.stamp=p.stamp||0;
    STG.handle=p.handle;
    return p.handle.queryPermission({mode:"readwrite"}).then(function(st){
      // "granted" happens on its own in an installed app; in a plain tab the user confirms once
      if(st==="granted"){ STG.state="ok"; return stgSyncFromFile(); }
      STG.state="ask";
    });
  }).catch(function(e){
    STG.state="error"; STG.err=e && e.message || String(e);
  });
}

// True when the app holds something worth saving.
function hasAnyData(){
  return !!(D && ((D.expenses&&D.expenses.length) || (D.incomes&&D.incomes.length) ||
                  (D.savings&&D.savings.length) || (D.settings&&D.settings.people&&D.settings.people.length)));
}

// ───────────────────────── choosing where the data lives ─────────────────────────
// A folder is the better choice: the app can keep dated copies next to the data file.
function stgPickFolder(){
  if(!STG.supported) return Promise.resolve(false);
  return window.showDirectoryPicker({mode:"readwrite", id:"bugetFamilie", startIn:"documents"})
    .then(function(dir){
      STG.dir=dir; STG.folder=dir.name;
      return dir.getFileHandle(DATA_FILE,{create:true});
    })
    .then(function(fh){ STG.handle=fh; STG.mode="folder"; STG.name=DATA_FILE; return stgAfterPick(); })
    .catch(stgPickError);
}
// Fallback: a single file, with no room for dated copies beside it.
function stgPickFile(create){
  if(!window.showSaveFilePicker) return Promise.resolve(false);
  var opts={suggestedName:DATA_FILE, id:"bugetFamilie", startIn:"documents",
            types:[{description:"Buget Familie", accept:{"application/json":[".json"]}}]};
  var p = create ? window.showSaveFilePicker(opts)
                 : window.showOpenFilePicker({id:"bugetFamilie", startIn:"documents", multiple:false,
                     types:[{description:"Buget Familie", accept:{"application/json":[".json"]}}]}).then(function(a){ return a[0]; });
  return p.then(function(fh){ STG.dir=null; STG.handle=fh; STG.mode="file"; STG.name=fh.name; STG.folder=""; return stgAfterPick(); })
          .catch(stgPickError);
}
function stgPickError(e){
  if(e && (e.name==="AbortError" || e.name==="NotAllowedError")) return false;  // the user closed the dialog
  STG.state="error"; STG.err=e && e.message || String(e); stgPaint(); return false;
}

// After a file is chosen: if it already holds a budget, offer to load it instead of overwriting.
function stgAfterPick(){
  return STG.handle.getFile().then(function(f){
    if(!f.size) return stgRemember().then(function(){ return stgFlush(true); }).then(function(){ return true; });
    return f.text().then(function(t){
      var o=null; try{ o=JSON.parse(t); }catch(e){}
      if(!o || !o.expenses){ return stgRemember().then(function(){ return stgFlush(true); }).then(function(){ return true; }); }
      return new Promise(function(res){
        var n=(o.expenses||[]).length+(o.incomes||[]).length;
        choiceBox('În fișierul ales există deja un buget ('+n+' înregistrări salvate). Ce facem cu el?',
          "Încarcă-l în aplicație", function(){ adoptData(o); STG.stamp=f.lastModified; stgRemember().then(function(){ res(true); }); },
          "Înlocuiește-l cu ce am aici", function(){ stgRemember().then(function(){ return stgFlush(true); }).then(function(){ res(true); }); });
      });
    });
  }).then(function(r){ STG.state="ok"; stgPaint(); return r; });
}
function stgRemember(){
  return idbSet("place", {mode:STG.mode, name:STG.name, folder:STG.folder, stamp:STG.stamp,
                          handle:STG.mode==="folder"?STG.dir:STG.handle})
    .catch(function(){ /* remembering the place is a convenience; never let it break a save */ });
}

// Asking again for permission needs a click from the user, so this is wired to a button.
function stgReconnect(){
  return idbGet("place").then(function(p){
    if(!p || !p.handle) return stgPickFolder();
    return p.handle.requestPermission({mode:"readwrite"}).then(function(st){
      if(st!=="granted"){ STG.state="ask"; stgPaint(); return false; }
      if(p.mode==="folder"){ STG.dir=p.handle; return p.handle.getFileHandle(DATA_FILE,{create:true}); }
      return p.handle;
    }).then(function(fh){
      if(!fh) return false;
      STG.handle=fh; STG.mode=p.mode; STG.name=p.name||DATA_FILE; STG.folder=p.folder||"";
      STG.state="ok";
      return stgSyncFromFile().then(function(){ stgPaint(); render(); return true; });
    });
  }).catch(stgPickError);
}

// ───────────────────────── reading and writing the file ─────────────────────────
// On start-up: if the file is newer than what we left behind, another computer wrote it.
function stgSyncFromFile(){
  if(!STG.handle) return Promise.resolve();
  return STG.handle.getFile().then(function(f){
    if(!f.size) return stgFlush(true);
    if(STG.stamp && f.lastModified <= STG.stamp + 2000) return;   // nothing new
    return f.text().then(function(t){
      var o=null; try{ o=JSON.parse(t); }catch(e){}
      if(!o || !o.expenses) return;
      adoptData(o); STG.stamp=f.lastModified;
      return idbSet("data", JSON.parse(JSON.stringify(D)));
    });
  }).catch(function(e){ STG.state="error"; STG.err=e.message; });
}

// Called after every change: the working copy is written at once, the file a moment later.
var _flushT=null;
function stgTouch(){
  STG.dirty=true;
  try{ idbSet("data", JSON.parse(JSON.stringify(D))); }catch(e){}
  stgSnapshot();
  if(_flushT) clearTimeout(_flushT);
  _flushT=setTimeout(function(){ stgFlush(); }, 1200);
  stgPaint();
}

function stgFlush(force){
  if(!STG.handle || STG.writing) return Promise.resolve(false);
  if(!STG.dirty && !force) return Promise.resolve(true);
  STG.writing=true;
  var json=JSON.stringify(D);
  return STG.handle.getFile().then(function(f){
    // changed by another computer since we last wrote: do not overwrite silently
    if(!force && STG.stamp && f.size && f.lastModified > STG.stamp + 2000){
      STG.writing=false; STG.state="conflict"; stgPaint(); stgConflict(f); return false;
    }
    return STG.handle.createWritable().then(function(w){
      return w.write(json).then(function(){ return w.close(); });
    }).then(function(){
      return STG.handle.getFile();
    }).then(function(nf){
      STG.stamp=nf.lastModified; STG.lastSaved=Date.now(); STG.dirty=false; STG.writing=false;
      if(STG.state!=="ok"){ STG.state="ok"; }
      stgRemember();
      stgPaint();
      return stgBackupDaily(json);
    });
  }).catch(function(e){
    STG.writing=false;
    STG.state = (e && e.name==="NotAllowedError") ? "ask" : "error";
    STG.err=e && e.message || String(e);
    stgPaint();
    return false;
  });
}

// One dated copy per day, in the "copii" folder next to the data file.
function stgBackupDaily(json){
  if(STG.mode!=="folder" || !STG.dir) return Promise.resolve(true);
  var day=todayISO();
  if(STG.backupDay===day) return Promise.resolve(true);
  return STG.dir.getDirectoryHandle(BACKUP_DIR,{create:true}).then(function(bd){
    return bd.getFileHandle("buget-"+day+".json",{create:true}).then(function(fh){
      return fh.createWritable().then(function(w){ return w.write(json).then(function(){ return w.close(); }); });
    }).then(function(){
      STG.backupDay=day;
      var names=[];
      return (async function(){
        for await (var e of bd.values()){ if(e.kind==="file" && /^buget-\d{4}-\d{2}-\d{2}\.json$/.test(e.name)) names.push(e.name); }
        names.sort().reverse();
        for(var i=BACKUP_KEEP;i<names.length;i++){ try{ await bd.removeEntry(names[i]); }catch(err){} }
        return true;
      })();
    });
  }).catch(function(){ return false; });
}

// A copy a day kept inside the browser as well — the quickest way back after a wrong move.
function stgSnapshot(force){
  var day=todayISO();
  if(!force && STG.snaps.indexOf(day)>=0) return Promise.resolve();
  return idbSet("snap:"+day, JSON.parse(JSON.stringify(D))).then(function(){
    if(STG.snaps.indexOf(day)<0){ STG.snaps.unshift(day); STG.snaps.sort().reverse(); }
    var extra=STG.snaps.slice(SNAP_KEEP);
    STG.snaps=STG.snaps.slice(0,SNAP_KEEP);
    return Promise.all(extra.map(function(d){ return idbDel("snap:"+d); }));
  }).catch(function(){});
}
function stgRestoreSnap(day){
  return idbGet("snap:"+day).then(function(o){
    if(!o) { alertBox("Copia din "+day+" nu mai există."); return; }
    adoptData(o); save("Datele au fost refăcute din copia de pe "+day.split("-").reverse().join(".")+" ✅");
    applyTheme(); render();
  });
}

// ───────────────────────── Firefox and anyone without file access ─────────────────────────
function stgDownload(){
  var blob=new Blob([JSON.stringify(D,null,1)],{type:"application/json"});
  var a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="buget-familie-"+todayISO()+".json";
  a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); },5000);
  STG.lastSaved=Date.now(); STG.dirty=false; stgPaint();
}
function stgLoadFromFile(file){
  return file.text().then(function(t){
    var o=JSON.parse(t);
    if(!o || !o.expenses) throw new Error("Fișierul nu pare să fie un buget salvat din aplicație.");
    adoptData(o); stgTouch(); applyTheme(); render();
    toast("Datele au fost încărcate ✅");
  }).catch(function(e){ alertBox("Nu am putut citi fișierul: "+e.message); });
}

// ───────────────────────── the data file was changed elsewhere ─────────────────────────
function stgConflict(f){
  var when=new Date(f.lastModified).toLocaleString("ro-RO");
  choiceBox('<b>Fișierul a fost modificat în altă parte</b> (ultima dată la '+when+').<br><br>'+
    'Probabil ai lucrat pe alt calculator, iar fișierul s-a sincronizat prin Drive sau OneDrive.<br><br>'+
    'Ca să nu pierzi nimic, alege ce păstrezi.',
    "Încarcă varianta din fișier",
    function(){
      f.text().then(function(t){
        try{ var o=JSON.parse(t); adoptData(o); STG.stamp=f.lastModified; STG.dirty=false; STG.state="ok";
             idbSet("data", JSON.parse(JSON.stringify(D))); render(); toast("Am încărcat varianta din fișier ✅"); }
        catch(e){ alertBox("Fișierul nu a putut fi citit: "+e.message); }
      });
    },
    "Păstrează ce am aici",
    function(){ STG.state="ok"; stgFlush(true).then(function(){ toast("Am salvat varianta din aplicație ✅"); }); });
}

// ───────────────────────── what the user sees ─────────────────────────
function stgAgo(){
  if(!STG.lastSaved) return "";
  var s=Math.round((Date.now()-STG.lastSaved)/1000);
  if(s<5) return "acum";
  if(s<60) return "acum "+s+"s";
  if(s<3600) return "acum "+Math.round(s/60)+" min";
  return new Date(STG.lastSaved).toLocaleTimeString("ro-RO",{hour:"2-digit",minute:"2-digit"});
}
function stgLabel(){
  if(STG.state==="ok" && STG.handle)
    return '<i class="fas fa-circle-check" style="color:var(--ok)"></i> <b>'+esc(STG.name)+'</b><br>'+
           (STG.dirty?'se salvează…':'salvat '+stgAgo())+(STG.folder?' · '+esc(STG.folder):'');
  if(STG.state==="ask")   return '<span class="neg"><i class="fas fa-plug-circle-exclamation"></i> Fișierul nu e conectat</span><br>apasă aici ca să-l reconectezi';
  if(STG.state==="error") return '<span class="neg"><i class="fas fa-triangle-exclamation"></i> Nu pot salva în fișier</span><br>apasă pentru detalii';
  if(STG.mode==="manual") return '<i class="fas fa-download"></i> <b>Salvare manuală</b><br>'+(STG.dirty?'ai modificări nesalvate':'salvat '+stgAgo());
  return '<span class="neg"><i class="fas fa-file-circle-question"></i> Niciun fișier ales</span><br>apasă ca să alegi unde se salvează';
}
// The red strip at the top: only when something really needs the user.
function stgPaint(){
  var f=document.getElementById("sbFoot");
  if(f){ f.innerHTML=stgLabel(); f.onclick=stgFootClick; f.style.cursor="pointer"; }
  var bar=document.getElementById("stgBar"), msg="", lvl="bad", act="";
  if(STG.state==="ask"){
    msg='Aplicația nu mai are voie să scrie în fișierul tău, deci <b>modificările nu ajung în el</b>.';
    act='<button class="btn sm" onclick="stgReconnect()">Reconectează fișierul</button>';
  } else if(STG.state==="error"){
    msg='Datele <b>nu se salvează în fișier</b>'+(STG.err?' ('+esc(STG.err)+')':'')+'.';
    act='<button class="btn sm" onclick="stgReconnect()">Încearcă din nou</button>';
  } else if(STG.mode==="manual"){
    if(!STG.dirty){ if(bar) bar.remove(); return; }
    lvl="warn"; msg='Ai modificări <b>salvate doar în browser</b>. Salvează o copie ca să nu le pierzi.';
    act='<button class="btn sm" onclick="stgDownload()">Salvează o copie</button>';
  } else if(!STG.handle && (hasAnyData() || D.settings.setupDone)){
    lvl="warn"; msg='Încă n-ai ales un fișier pentru datele tale. Acum stau doar în browser și <b>se pierd dacă îl cureți</b>.';
    act=(STG.supported?'<button class="btn sm" onclick="stgPickFolder().then(render)">Alege un folder</button>':'')+
        '<button class="btn sm gh" onclick="stgDownload()">Salvează o copie</button>';
  } else { if(bar) bar.remove(); return; }
  if(!bar){ bar=document.createElement("div"); bar.id="stgBar"; document.body.prepend(bar); }
  bar.className="stgbar"+(lvl==="warn"?" warn":"");
  bar.innerHTML='<i class="fas fa-triangle-exclamation"></i> '+msg+' '+act;
}
function stgFootClick(){
  if(STG.state==="ok"){ go("set"); return; }
  if(STG.state==="ask" || STG.state==="error"){ stgReconnect(); return; }
  if(STG.supported) stgPickFolder().then(function(){ render(); });
  else go("set");
}
setInterval(function(){ var f=document.getElementById("sbFoot"); if(f && STG.state==="ok") f.innerHTML=stgLabel(); }, 30000);
