// Buget Familie — settings.js (Settings: people, categories, import/export, backups)

var ICONS=["fa-cart-shopping","fa-utensils","fa-burger","fa-bolt","fa-fire","fa-droplet","fa-gas-pump","fa-car","fa-bus","fa-kit-medical","fa-pills","fa-wifi","fa-mobile-screen","fa-tv","fa-book-open","fa-graduation-cap","fa-shirt","fa-cake-candles","fa-gift","fa-user","fa-people-roof","fa-house","fa-couch","fa-screwdriver-wrench","fa-umbrella-beach","fa-plane","fa-file-invoice-dollar","fa-church","fa-hand-holding-heart","fa-chart-line","fa-pump-soap","fa-bug","fa-paw","fa-dumbbell","fa-gamepad","fa-baby","fa-tag"];

function renderSettings(){
  var h=pageHead("Setări","Persoane, categorii, unde se salvează datele și copiile de siguranță");
  var dark=D.settings.dark!==false, snaps=listSnapshots();
  h+='<div class="g g2"><div class="c"><div class="ct"><i class="fas fa-users"></i> Persoane care contribuie la venit<span class="sp"><button class="btn sm" onclick="editPerson()"><i class="fas fa-plus"></i> Adaugă persoană</button></span></div>'+
    '<div class="ppl">'+D.settings.people.map(function(p,i){
      var n=D.incomes.filter(function(e){return e.person===p;}).length;
      return '<div class="pc">'+avatar(p,52)+'<div class="pn"><b>'+esc(p)+'</b><span class="hint">'+n+' încasări</span></div>'+
        '<button class="ib" onclick="editPerson('+i+')" title="Modifică"><i class="fas fa-pen"></i></button><button class="ib del" onclick="delPerson('+i+')" title="Șterge"><i class="fas fa-trash"></i></button></div>';
    }).join("")+(D.settings.people.length?'':'<div class="mut">Nicio persoană încă.</div>')+'</div>'+
    '<div class="ct" style="margin-top:20px"><i class="fas fa-list"></i> Tipuri de venit</div>'+
    '<div class="chips">'+D.settings.incomeTypes.map(function(t,i){
      return '<span class="chip on" style="cursor:default">'+esc(t)+' <i class="fas fa-xmark" style="cursor:pointer;opacity:.7" title="Șterge" onclick="delType('+i+')"></i></span>';
    }).join("")+'<span class="chip" id="addTypeChip" onclick="addTypeInline()"><i class="fas fa-plus"></i> Tip nou</span></div></div>'+
    '<div class="c"><div class="ct"><i class="fas fa-palette"></i> Aspect</div>'+
    '<div class="seg"><button class="'+(dark?"on":"")+'" onclick="setTheme(true)"><i class="fas fa-moon"></i> Întunecat</button><button class="'+(!dark?"on":"")+'" onclick="setTheme(false)"><i class="fas fa-sun"></i> Luminos</button></div>'+
    '<div class="ct" style="margin-top:18px"><i class="fas fa-grip-vertical"></i> Așezarea modulelor</div>'+
    '<p class="cs" style="margin-bottom:8px">Pe orice pagină muți un card de ⠿ (se pune doar unde încape) și îl mărești sau micșorezi trăgând de marginea din dreapta, de jos sau de colț. Numărul de coloane îl alegi lângă titlul paginii.</p>'+
    '<button class="btn sm gh" onclick="resetLayouts()"><i class="fas fa-rotate-left"></i> Readu așezarea inițială</button>'+
    '<div class="ct" style="margin-top:18px"><i class="fas fa-bullseye"></i> Buget pe categorii</div>'+
    '<label class="ck" style="display:flex;gap:10px;align-items:flex-start;cursor:pointer;font-size:.86rem;line-height:1.45"><input type="checkbox" id="useBud"'+(budgetOn()?' checked':'')+' onchange="toggleBudget(this.checked)" style="margin-top:3px"> '+
    '<span>Folosesc sume puse deoparte pe fiecare categorie<span class="hint">Când e pornit apar pagina Buget, barele de progres și alertele de depășire. Sumele (ex. Mâncare 5.000) rămân salvate și când e oprit.</span></span></label>'+
    '<div class="ct" style="margin-top:18px"><i class="fas fa-clock-rotate-left"></i> Copii păstrate în browser</div>'+
    '<p class="cs" style="margin-bottom:8px">Aplicația păstrează singură o copie pe zi (ultimele '+SNAP_KEEP+'), ca să poți reveni repede după o greșeală. Copiile din folderul tău sunt separate și rezistă chiar dacă browserul e curățat.</p>'+
    (snaps.length?'<select id="snapSel">'+snaps.map(function(d){return '<option value="'+d+'">'+d.split("-").reverse().join(".")+'</option>';}).join("")+'</select><div class="br" style="margin-top:8px"><button class="btn sm gh" onclick="restoreSnap()"><i class="fas fa-rotate-left"></i> Revino la copia aleasă</button></div>':'<span class="mut">Încă nu există.</span>')+
    '<div class="ct" style="margin-top:18px;color:var(--danger)"><i class="fas fa-triangle-exclamation"></i> Ștergere</div>'+
    '<div class="br"><button class="btn sm bd" onclick="delYear()"><i class="fas fa-calendar-xmark"></i> Șterge un an</button><button class="btn sm bd" onclick="wipeAll()"><i class="fas fa-trash"></i> Șterge tot</button></div></div></div>';


  // Where the data lives, and the backups
  var place = STG.state==="ok" && STG.handle
    ? '<div class="al alo"><i class="fas fa-circle-check"></i> Se salvează singur în <b>'+esc(STG.name)+'</b>'+(STG.folder?', în folderul <b>'+esc(STG.folder)+'</b>':'')+'. '+(STG.dirty?'Se salvează acum…':'Ultima salvare: '+stgAgo()+'.')+'</div>'
    : STG.state==="ask"
      ? '<div class="al ald"><i class="fas fa-plug-circle-exclamation"></i> Aplicația nu mai are voie să scrie în fișierul tău. Apasă <b>Reconectează</b>, altfel modificările rămân doar în browser.</div>'
      : STG.mode==="manual"
        ? '<div class="al ald"><i class="fas fa-download"></i> Salvare manuală: datele stau în browser până apeși <b>Salvează o copie</b>. Dacă cureți browserul fără să salvezi, se pierd.</div>'
        : '<div class="al ald"><i class="fas fa-file-circle-question"></i> Încă n-ai ales un fișier. Datele stau doar în browser și <b>se pierd dacă îl cureți</b>.</div>';

  h+='<div class="g g2"><div class="c"><div class="ct"><i class="fas fa-folder-open"></i> Unde se salvează datele</div>'+place+
    '<div class="br" style="margin-top:12px">'+
    (STG.supported?'<button class="btn" onclick="chooseFolder()"><i class="fas fa-folder-open"></i> '+(STG.handle?'Schimbă folderul':'Alege folderul')+'</button>':'')+
    (STG.state==="ask"?'<button class="btn" onclick="stgReconnect()"><i class="fas fa-plug"></i> Reconectează</button>':'')+
    (STG.supported?'<button class="btn gh" onclick="chooseFile()"><i class="fas fa-file"></i> Alege un singur fișier</button>':'')+
    '</div>'+
    (STG.supported?'<span class="hint" style="margin-top:8px">Pune folderul în Google Drive sau OneDrive dacă vrei și o copie în cloud. Lângă fișier, aplicația ține copii datate în subfolderul <b>copii</b>.</span>'
                  :'<span class="hint" style="margin-top:8px">Browserul tău nu permite scrierea directă în fișier. Pentru salvare automată, deschide aplicația în Chrome sau Edge.</span>')+
    '<div class="ct" style="margin-top:18px"><i class="fas fa-chart-simple"></i> Ce ai în aplicație</div>'+
    '<div class="kv"><span>Cheltuieli</span><b>'+D.expenses.length+'</b></div><div class="kv"><span>Venituri</span><b>'+D.incomes.length+'</b></div>'+
    '<div class="kv"><span>Ani cu date</span><b>'+(yearsWithData().filter(function(y){return allMonths().some(function(m){return m.slice(0,4)===y;});}).join(", ")||"—")+'</b></div>'+
    '<div class="kv"><span>Mărimea datelor</span><b>'+Math.round(JSON.stringify(D).length/1024)+' KB</b></div>'+
    '<div class="br" style="margin-top:14px"><button class="btn sm gh" onclick="openWelcome(true)"><i class="fas fa-circle-question"></i> Revezi ghidul de pornire</button></div></div>';

  h+='<div class="c"><div class="ct"><i class="fas fa-shield-halved"></i> Copii de siguranță</div>'+
    '<p class="cs" style="line-height:1.5;margin-bottom:8px">O copie în plus, pe care o poți ține oriunde: alt calculator, un stick, pe email. Din ea se refac toate datele.</p>'+
    '<div class="br"><button class="btn" onclick="exportBackup()"><i class="fas fa-file-export"></i> Salvează o copie (.json)</button>'+
    '<button class="btn gh" onclick="pickFile(\'.json\',importBackup)"><i class="fas fa-file-arrow-up"></i> Încarcă o copie</button></div>'+
    // Spreadsheet copy, readable by anyone and loadable back into the app
    '<div class="ct" style="margin-top:18px"><i class="fas fa-file-excel"></i> Copie în Excel</div>'+
    '<p class="cs" style="line-height:1.5;margin-bottom:8px">Un an pe foi lunare, de citit în Excel, LibreOffice sau Google Drive. Fișierul conține și copia completă a datelor, deci poate fi încărcat înapoi în aplicație.</p>'+
    '<div class="r3"><div><label class="L">Anul</label><select id="xlY">'+yearsWithData().filter(function(y){return allMonths().some(function(m){return m.slice(0,4)===y;});}).reverse().map(function(y){return '<option>'+y+'</option>';}).join("")+'</select></div>'+
    '<div><label class="L">Format</label><select id="xlF"><option value="xlsx">.xlsx (Excel, Drive, LibreOffice)</option><option value="ods">.ods (LibreOffice / OpenOffice)</option></select></div>'+
    '<div style="display:flex;align-items:flex-end"><button class="btn" style="width:100%" onclick="exportExcel(document.getElementById(\'xlY\').value,document.getElementById(\'xlF\').value)"><i class="fas fa-file-arrow-down"></i> Salvează</button></div></div>'+
    '<div class="br" style="margin-top:12px"><button class="btn sm gh" onclick="pickFile(\'.xls,.xlsx,.xlsb,.ods\',importExcelCopy)"><i class="fas fa-file-import"></i> Refă datele dintr-o copie Excel</button></div>'+
    '<span class="hint" style="margin-top:6px">Merge doar cu fișierele Excel salvate din această aplicație.</span></div></div>';

  // Categories
  // collapsible: closed by default, opened by clicking the title
  h+='<div class="c" style="margin-bottom:16px"><div class="ct clk-h" onclick="SETV.catsOpen=!SETV.catsOpen;render()"><i class="fas fa-chevron-'+(SETV.catsOpen?'down':'right')+'" style="font-size:.7rem;width:12px"></i><i class="fas fa-tags"></i> Categorii de cheltuieli'+
      '<span class="mut" style="font-weight:400;font-size:.8rem">'+D.cats.length+' categorii'+(SETV.catsOpen?'':' — apasă ca să le vezi')+'</span>'+
      '<span class="sp"><button class="btn sm" onclick="event.stopPropagation();editCat()"><i class="fas fa-plus"></i> Categorie nouă</button></span></div>'+
    (SETV.catsOpen?'<div class="tw"><table class="rt"><thead><tr><th>Categoria</th><th class="n" style="text-align:right;'+(budgetOn()?'':'display:none')+'">Buget / lună</th><th>Subcategorii</th><th>Folosită</th><th></th></tr></thead><tbody>'+
    D.cats.map(function(c,i){
      var used=D.expenses.filter(function(e){return e.cat===c.id;}).length;
      return '<tr><td>'+catIco(c,26)+' <b>'+esc(c.name)+'</b>'+(c.outside?' <span class="bg gm">nu intră în total</span>':'')+'</td><td class="n" style="'+(budgetOn()?'':'display:none')+'">'+(c.budget?money(c.budget):'<span class="mut">—</span>')+'</td>'+
        '<td class="mut" style="font-size:.78rem">'+esc(c.subs.join(", "))+'</td><td class="mut">'+used+'×</td>'+
        '<td class="act"><button class="ib" title="Mută sus" onclick="moveCat('+i+',-1)"><i class="fas fa-arrow-up"></i></button><button class="ib" title="Mută jos" onclick="moveCat('+i+',1)"><i class="fas fa-arrow-down"></i></button>'+
        '<button class="ib" onclick="editCat(\''+c.id+'\')"><i class="fas fa-pen"></i></button><button class="ib del" onclick="delCat(\''+c.id+'\')"><i class="fas fa-trash"></i></button></td></tr>';
    }).join("")+'</tbody></table></div>':'')+'</div>';

  // People, income types, appearance
  document.getElementById("pg").innerHTML=h;

}

function toggleBudget(on){ D.settings.useBudget=on; save(on?"Buget pe categorii pornit":"Buget pe categorii oprit"); render(); }
function setTheme(d){ D.settings.dark=d; applyTheme(); save(); render(); }
function applyTheme(){ document.body.classList.toggle("light", D.settings.dark===false); }
// ───────── People (with photo) ─────────
var PH=null;
function editPerson(i){
  var old = i===undefined ? null : D.settings.people[i];
  PH = old ? ((D.settings.photos||{})[old]||null) : null;
  modal('<div class="mt"><i class="fas fa-user-plus"></i> '+(old?"Modifică persoana":"Persoană nouă")+'</div>'+
    '<div class="pedit"><div id="phPrev" class="phprev"></div><div style="flex:1;min-width:0">'+
    '<label class="L">Nume</label><input id="pnN" value="'+esc(old||"")+'" placeholder="ex. Maria" autofocus>'+
    '<label class="L">Poză (opțional)</label><div class="br"><button class="btn sm gh" onclick="pickFile(\'image/*\',loadPhoto)"><i class="fas fa-image"></i> Alege poza</button>'+
    '<button class="btn sm gh" id="phDel" onclick="PH=null;drawPh()"><i class="fas fa-xmark"></i> Fără poză</button></div>'+
    '<span class="hint">Poza se micșorează și se păstrează împreună cu datele, în fișierul tău.</span></div></div>'+
    '<div class="mf"><button class="btn gh" onclick="closeModal()">Renunță</button><button class="btn" id="pnS"><i class="fas fa-check"></i> Salvează</button></div>');
  drawPh();
  var doSave=function(){
    var n=document.getElementById("pnN").value.trim(); if(!n){ toast("Scrie numele"); return; }
    if(D.settings.people.some(function(p,j){ return p===n && j!==i; })){ toast("Există deja "+n); return; }
    D.settings.photos=D.settings.photos||{};
    if(old){
      D.settings.people[i]=n;
      if(n!==old){ D.incomes.forEach(function(e){ if(e.person===old) e.person=n; }); delete D.settings.photos[old]; }
    } else D.settings.people.push(n);
    if(PH) D.settings.photos[n]=PH; else delete D.settings.photos[n];
    if(save(old?"Persoană modificată ✅":"Persoană adăugată ✅")){ closeModal(); render(); }
  };
  document.getElementById("pnS").onclick=doSave;
  document.getElementById("pnN").addEventListener("keydown",function(e){ if(e.key==="Enter") doSave(); });
}
function drawPh(){
  var el=document.getElementById("phPrev"); if(!el) return;
  el.innerHTML = PH ? '<img src="'+PH+'" alt="">' : '<i class="fas fa-user"></i>';
}
// shrink the photo to a 160×160 square crop to keep the data small
function loadPhoto(f){
  var rd=new FileReader();
  rd.onload=function(){
    var img=new Image();
    img.onload=function(){
      var S2=160, c=document.createElement("canvas"); c.width=S2; c.height=S2;
      var m=Math.min(img.width,img.height), sx=(img.width-m)/2, sy=(img.height-m)/2;
      c.getContext("2d").drawImage(img,sx,sy,m,m,0,0,S2,S2);
      PH=c.toDataURL("image/jpeg",.82); drawPh();
    };
    img.onerror=function(){ toast("Nu pot citi poza"); };
    img.src=rd.result;
  };
  rd.readAsDataURL(f);
}
function delPerson(i){
  var p=D.settings.people[i], n=D.incomes.filter(function(e){return e.person===p;}).length;
  var go2=function(){ softDelete(p+" a fost scos din listă",function(){ D.settings.people.splice(i,1); }); };
  if(n) confirmBox("<b>"+esc(p)+"</b> are "+n+" încasări. Le păstrez, doar scot persoana din listă. Continui?",go2,"Da, scoate");
  else go2();
}
// ───────── Income types ─────────
function addTypeInline(){
  var ch=document.getElementById("addTypeChip");
  ch.outerHTML='<span class="chip on" style="padding:3px 6px"><input id="newType" placeholder="Tip nou" style="width:140px;padding:5px 8px;font-size:.8rem"><i class="fas fa-check" style="cursor:pointer;padding:0 6px" onclick="saveNewType()"></i></span>';
  var i=document.getElementById("newType"); i.focus();
  i.addEventListener("keydown",function(e){ if(e.key==="Enter") saveNewType(); if(e.key==="Escape") render(); });
}
function saveNewType(){
  var v=document.getElementById("newType").value.trim(); if(!v){ render(); return; }
  if(D.settings.incomeTypes.indexOf(v)<0) D.settings.incomeTypes.push(v);
  if(save("Tip adăugat ✅")) render();
}
function delType(i){
  var t=D.settings.incomeTypes[i];
  softDelete("Tipul „"+t+"” a fost scos (veniturile vechi îl păstrează)",function(){ D.settings.incomeTypes.splice(i,1); });
}
function moveCat(i,k){ var j=i+k; if(j<0||j>=D.cats.length) return; var t=D.cats[i]; D.cats[i]=D.cats[j]; D.cats[j]=t; save(); render(); }

var SETV={catsOpen:false};
// Subcategories in the category dialog: chips with × plus a "+" chip that opens an inline input
var SUBS=[];
function drawSubs(){
  var el=document.getElementById("cS"); if(!el) return;
  el.innerHTML=SUBS.map(function(t,i){ return '<span class="chip on" style="cursor:default">'+esc(t)+' <i class="fas fa-xmark" style="cursor:pointer;opacity:.7" title="Scoate" onclick="SUBS.splice('+i+',1);drawSubs()"></i></span>'; }).join("")+
    '<span class="chip" id="subAdd" onclick="addSubInline()"><i class="fas fa-plus"></i> Subcategorie</span>';
}
function addSubInline(){
  var ch=document.getElementById("subAdd");
  ch.outerHTML='<span class="chip on" style="padding:3px 6px"><input id="newSub" placeholder="ex. Lidl" style="width:140px;padding:5px 8px;font-size:.8rem"><i class="fas fa-check" style="cursor:pointer;padding:0 6px" onclick="saveSubInline()"></i></span>';
  var i=document.getElementById("newSub"); i.focus();
  i.addEventListener("keydown",function(e){ if(e.key==="Enter"){ e.preventDefault(); saveSubInline(true); } if(e.key==="Escape"){ e.stopPropagation(); drawSubs(); } });
}
function saveSubInline(again){
  var v=document.getElementById("newSub").value.trim();
  if(v && SUBS.indexOf(v)<0) SUBS.push(v);
  drawSubs();
  if(again && v) addSubInline();   // Enter: ready for the next one
}
function editCat(id){
  var c=id?cat(id):{name:"",icon:"fa-tag",color:"#e6b422",budget:0,subs:[],outside:false};
  var ico=c.icon;
  modal('<div class="mt"><i class="fas fa-tag"></i> '+(id?"Modifică categoria":"Categorie nouă")+'</div>'+
    '<div class="r3"><div style="grid-column:span 2"><label class="L">Nume</label><input id="cN" value="'+esc(c.name)+'" autofocus></div><div><label class="L">Culoare</label><input type="color" id="cC" value="'+esc(c.color)+'"></div></div>'+
    '<div class="r2"><div style="'+(budgetOn()?'':'display:none')+'"><label class="L">Buget lunar (lei)</label><input id="cB" inputmode="decimal" value="'+(c.budget||"")+'"></div>'+
    '<div><label class="L">&nbsp;</label><label class="ck" style="display:flex;gap:8px;align-items:center;padding-top:8px;cursor:pointer"><input type="checkbox" id="cO"'+(c.outside?' checked':'')+'> Nu intră în totaluri (o urmăresc separat)</label></div></div>'+
    '<label class="L">Subcategorii</label><div class="chips" id="cS"></div>'+
    '<label class="L">Iconiță</label><div class="chips" id="cI">'+ICONS.map(function(i){return '<span class="chip'+(i===ico?' on':'')+'" data-i="'+i+'" style="width:38px;justify-content:center"><i class="fas '+i+'"></i></span>';}).join("")+'</div>'+
    '<div class="mf"><button class="btn gh" onclick="closeModal()">Renunță</button><button class="btn" id="cSv"><i class="fas fa-check"></i> Salvează</button></div>', true);
  SUBS=c.subs.slice(); drawSubs();
  document.querySelectorAll("#cI .chip").forEach(function(ch){ ch.onclick=function(){ document.querySelectorAll("#cI .chip").forEach(function(x){x.classList.remove("on");}); ch.classList.add("on"); ico=ch.dataset.i; }; });
  document.getElementById("cSv").onclick=function(){
    var name=document.getElementById("cN").value.trim(); if(!name){ toast("Scrie numele"); return; }
    var rec={name:name, color:document.getElementById("cC").value, budget:r2(num(document.getElementById("cB").value)), icon:ico, outside:document.getElementById("cO").checked,
      subs:SUBS.slice()};
    if(id) Object.assign(cat(id),rec);
    else { rec.id="c"+uid(); D.cats.push(rec); }
    if(save("Categorie salvată ✅")){ closeModal(); render(); }
  };
}
function delCat(id){
  var c=cat(id), used=D.expenses.filter(function(e){return e.cat===id;}).length;
  if(!used){ softDelete("Categoria "+c.name+" a fost ștearsă",function(){ D.cats=D.cats.filter(function(x){return x.id!==id;}); }); return; }
  modal('<div class="mt"><i class="fas fa-trash"></i> Șterge „'+esc(c.name)+'”</div><p style="line-height:1.5">Categoria are <b>'+used+'</b> cheltuieli. Unde le muți?</p>'+
    '<select id="mvTo" style="margin-top:10px">'+D.cats.filter(function(x){return x.id!==id;}).map(function(x){return '<option value="'+x.id+'">'+esc(x.name)+'</option>';}).join("")+'</select>'+
    '<div class="mf"><button class="btn gh" onclick="closeModal()">Renunță</button><button class="btn bd" id="mvB">Mută și șterge</button></div>');
  document.getElementById("mvB").onclick=function(){
    var to=document.getElementById("mvTo").value;
    var prev=JSON.stringify(D);
    D.expenses.forEach(function(e){ if(e.cat===id){ e.cat=to; if(e.sub && !e.desc){ e.desc=e.sub; } e.sub=matchSub(cat(to),e.sub)||""; } });
    D.cats=D.cats.filter(function(x){return x.id!==id;});
    Object.keys(D.budgets).forEach(function(m){ delete D.budgets[m][id]; });
    closeModal(); var mv=D; D=JSON.parse(prev); softDelete("Categoria a fost mutată și ștearsă",function(){ D=mv; });
  };
}

// ───────── Files ─────────
function pickFile(accept, cb){
  var i=document.createElement("input"); i.type="file"; i.accept=accept;
  i.onchange=function(){ if(i.files[0]) cb(i.files[0]); }; i.click();
}
function exportBackup(){
  var name="BugetFamilie-copie-"+todayISO()+".json", data=JSON.stringify(D,null,1);
  if(window.showSaveFilePicker){
    window.showSaveFilePicker({suggestedName:name, types:[{description:"Copie Buget Familie",accept:{"application/json":[".json"]}}]})
      .then(function(h){ return h.createWritable().then(function(w){ return w.write(data).then(function(){ return w.close(); }); }); })
      .then(function(){ toast("Copie salvată ✅"); })
      .catch(function(e){ if(e && e.name!=="AbortError") alertBox("Nu am putut salva: "+e.message); });
  } else {
    var a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([data],{type:"application/json"})); a.download=name; a.click();
  }
}
// Replaces all data with a saved copy (.json or the app's own Excel copy)
function restoreData(p){ adoptData(p); }

// Choosing where the data file lives (both need a click from the user)
function chooseFolder(){ stgPickFolder().then(function(){ render(); }); }
function chooseFile(){ stgPickFile(true).then(function(){ render(); }); }
function importBackup(f){
  var rd=new FileReader();
  rd.onload=function(){
    try{
      var p=JSON.parse(rd.result);
      if(!p || !Array.isArray(p.expenses)) throw new Error("Fișierul nu e o copie Buget Familie.");
      confirmBox("Înlocuiești toate datele cu copia <b>"+esc(f.name)+"</b> ("+p.expenses.length+" cheltuieli)?",function(){
        dailySnapshot(true); restoreData(p);
        if(save("Copie încărcată ✅")){ applyTheme(); render(); }
      },"Da, încarcă");
    }catch(e){ alertBox("Nu pot citi fișierul: "+esc(e.message)); }
  };
  rd.readAsText(f);
}
// Restores everything from a spreadsheet this app exported (it carries a hidden copy of the data).
function importExcelCopy(f){
  if(typeof XLSX==="undefined"){ alertBox("Biblioteca Excel nu s-a încărcat (lib/xlsx.full.min.js)."); return; }
  var rd=new FileReader();
  rd.onload=function(){
    var wb;
    try{ wb=XLSX.read(new Uint8Array(rd.result),{type:"array"}); }catch(e){ alertBox("Nu am putut citi fișierul: "+esc(e.message)); return; }
    var b=readBackupSheet(XLSX, wb);
    if(!b){ alertBox("Fișierul nu conține o copie a datelor. Merge doar cu fișierele Excel salvate din această aplicație."); return; }
    confirmBox("Fișierul <b>"+esc(f.name)+"</b> conține <b>"+b.expenses.length+"</b> cheltuieli și <b>"+b.incomes.length+"</b> venituri.<br>Înlocuiești toate datele de acum cu cele din copie?",
      function(){
        var prev=JSON.stringify(D);
        dailySnapshot(true); restoreData(b);
        if(save("Datele au fost refăcute din copie ✅")){
          applyTheme(); go("dash");
          undoToast("Datele au fost refăcute din copie", function(){ adoptData(JSON.parse(prev)); save("Revenit la datele de dinainte ✅"); go("set"); });
        }
      }, "Da, refă datele");
  };
  rd.readAsArrayBuffer(f);
}

function restoreSnap(){
  var k=document.getElementById("snapSel").value;
  confirmBox("Revii la copia din "+k.split("-").reverse().join(".")+"? Ce ai adăugat după se pierde.",function(){
    dailySnapshot(true);
    stgRestoreSnap(k);
  },"Da, revino");
}
function delYear(){
  var ys=yearsWithData().filter(function(y){return allMonths().some(function(m){return m.slice(0,4)===y;});});
  if(!ys.length) return toast("Nu ai date");
  modal('<div class="mt"><i class="fas fa-calendar-xmark"></i> Șterge un an</div><select id="dyY">'+ys.map(function(y){return '<option>'+y+'</option>';}).join("")+'</select>'+
    '<div class="mf"><button class="btn gh" onclick="closeModal()">Renunță</button><button class="btn bd" id="dyB">Șterge anul</button></div>');
  document.getElementById("dyB").onclick=function(){
    var y=document.getElementById("dyY").value, f=function(x){return x.month.slice(0,4)!==y;};
    closeModal();
    confirmBox("Sigur ștergi toate cheltuielile, veniturile și reglările din <b>"+y+"</b>?",function(){
      dailySnapshot(true);
      D.expenses=D.expenses.filter(f); D.incomes=D.incomes.filter(f); D.adjustments=D.adjustments.filter(f);
      Object.keys(D.budgets).forEach(function(m){ if(m.slice(0,4)===y) delete D.budgets[m]; });
      save("Anul "+y+" a fost șters"); render();
    });
  };
}
function wipeAll(){
  confirmBox("Ștergi <b>toate</b> datele din aplicație? (Copiile automate rămân, ca să poți reveni.)",function(){
    dailySnapshot(true);
    var keep=D.settings.setupDone, people=D.settings.people.slice(), types=D.settings.incomeTypes.slice();
    D=freshData(); D.settings.setupDone=keep; D.settings.people=people; D.settings.incomeTypes=types;
    save("Totul a fost șters"); render();
  });
}
