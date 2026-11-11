// Buget Familie — ui.js
// Navigation, modals, toasts, month picker, charts, the expense dialog and movable page modules.

var PAGES = [
  {id:"dash",     ico:"fa-gauge-high",    name:"Acasă",      render:function(){ renderDash(); }},
  {id:"exp",      ico:"fa-receipt",       name:"Cheltuieli", render:function(){ renderExpenses(); }},
  {id:"inc",      ico:"fa-wallet",        name:"Venituri",   render:function(){ renderIncomes(); }},
  {id:"bud",      ico:"fa-bullseye",      name:"Buget",      render:function(){ renderBudget(); }},
  {id:"stats",    ico:"fa-chart-column",  name:"Statistici", render:function(){ renderStats(); }},
  {id:"sav",      ico:"fa-coins",         name:"Economii",   render:function(){ renderSavings(); }},
  {id:"set",      ico:"fa-gear",          name:"Setări",     render:function(){ renderSettings(); }}
];

function buildNav(){
  if(S.page==="bud" && !budgetOn()) S.page="dash";
  document.getElementById("nav").innerHTML = PAGES.filter(function(p){ return p.id!=="bud" || budgetOn(); }).map(function(p){
    return '<div class="ni'+(S.page===p.id?' on':'')+'" onclick="go(\''+p.id+'\')" title="'+p.name+'"><i class="fas '+p.ico+'"></i><span>'+p.name+'</span></div>';
  }).join("");
  try{ stgPaint(); }catch(e){}
}
function go(p){ S.page=p; render(); window.scrollTo(0,0); }
function render(){
  invalidate(); killCharts(); buildNav();
  var p=PAGES.find(function(x){return x.id===S.page;})||PAGES[0];
  p.render();
  addMonthBar();
  try{ makeLayout(S.page); }catch(e){ console.error(e); }
}

// ───────── Month picker ─────────
// Month choice: the strip under the page title (see addMonthBar). monthPicker() only marks the pages that use it.
function monthPicker(){ return '<span class="mpa" hidden></span>'; }
function pickYears(){ var ys=yearsWithData(); [S.ym.slice(0,4), String(S.year)].forEach(function(y){ if(ys.indexOf(y)<0) ys.push(y); }); return ys.sort(); }
function goMonth(m){ closeMonthPop(); S.ym=m; S.year=+m.slice(0,4); render(); }
// year list on Statistics (openYearPop)
function closeMonthPop(){ var p=document.getElementById("mpop"); if(p) p.remove(); document.removeEventListener("pointerdown", mpOutside); document.removeEventListener("keydown", mpEsc); }
function mpOutside(e){ var p=document.getElementById("mpop"); if(p && !p.contains(e.target) && !(e.target.closest && e.target.closest(".ml"))) closeMonthPop(); }
function mpEsc(e){ if(e.key==="Escape") closeMonthPop(); }
// Strip under the page title: the years as tabs and the 12 months, each with a small bar showing how much was
// spent — one click to any month. The app always opens on the current month.
function addMonthBar(){
  var ph=document.querySelector("#pg .ph"); if(!ph || !ph.querySelector(".mpa")) return;
  var y=S.ym.slice(0,4), bal=balances(), max=1;
  LUNI.forEach(function(l,i){ var b=bal[y+"-"+pad2(i+1)]; if(b && b.exp>max) max=b.exp; });
  var el=document.createElement("div"); el.className="mbar";
  el.innerHTML='<div class="mby">'+pickYears().map(function(yy){ return '<button class="'+(yy===y?'on':'')+'" onclick="goMonth(\''+yy+'-'+S.ym.slice(5,7)+'\')">'+yy+'</button>'; }).join("")+'</div>'+
    (S.ym!==curYM()?'<button class="mbt" onclick="goMonth(curYM())" title="Înapoi la luna în care suntem"><i class="fas fa-calendar-day"></i> Azi</button>':'')+
    '<div class="mbm">'+LUNI.map(function(l,i){ var m=y+"-"+pad2(i+1), b=bal[m], e=b?b.exp:0;
      return '<button class="'+(m===S.ym?'on':'')+(b?'':' empty')+(m===curYM()?' now':'')+'" onclick="goMonth(\''+m+'\')" title="'+l+' '+y+(b?' · cheltuit '+money0(e):' · fără date')+'">'+
        '<span class="mbb"><i style="height:'+Math.max(b&&e?6:0,Math.round(e/max*100))+'%"></i></span><span>'+l.slice(0,3)+'</span></button>'; }).join("")+'</div>';
  ph.parentNode.insertBefore(el, ph.nextSibling);
}
// Year picker (Statistics): ‹ year › ; clicking the year lists all years
function yearPicker(){
  return '<div class="mp"><button onclick="S.year--;render()"><i class="fas fa-chevron-left"></i></button><div class="ml" style="min-width:90px" onclick="openYearPop(this)" title="Alege anul">'+S.year+' <i class="fas fa-caret-down mlc"></i></div><button onclick="S.year++;render()"><i class="fas fa-chevron-right"></i></button></div>';
}
function openYearPop(el){
  closeMonthPop();
  var pop=document.createElement("div"); pop.className="mpop"; pop.id="mpop";
  pop.innerHTML='<div class="mpy">'+pickYears().map(function(y){ return '<button class="'+(+y===S.year?'on':'')+'" onclick="closeMonthPop();S.year='+y+';render()">'+y+'</button>'; }).join("")+'</div>';
  el.parentElement.appendChild(pop);
  setTimeout(function(){ document.addEventListener("pointerdown", mpOutside); document.addEventListener("keydown", mpEsc); },0);
}
function pageHead(title, sub, right){
  // no back/close buttons on pages (the sidebar is always visible); modals keep their close button
  return '<div class="ph"><h1>'+title+(sub?'<small>'+sub+'</small>':'')+'</h1>'+(right||"")+'</div>';
}

// ───────── Modal, toast, confirmation ─────────
function modal(html, wide){
  closeModal();
  var d=document.createElement("div"); d.className="mb"; d.id="mb";
  d.innerHTML='<div class="mb-b'+(wide?' wide':'')+'"><button class="xb mx" onclick="closeModal()" title="Închide"><i class="fas fa-xmark"></i></button>'+html+'</div>';
  d.addEventListener("mousedown",function(e){ if(e.target===d) closeModal(); });
  document.body.appendChild(d);
  var f=d.querySelector("[autofocus]"); if(f) setTimeout(function(){ f.focus(); if(f.select) f.select(); },30);
  return d;
}
function closeModal(){ var m=document.getElementById("mb"); if(m) m.remove(); }
function toast(msg){
  if(S.quiet) return;
  document.querySelectorAll(".toast").forEach(function(x){ x.remove(); });
  var t=document.createElement("div"); t.className="toast"; t.textContent=msg; document.body.appendChild(t);
  setTimeout(function(){ t.remove(); }, 2600);
}
// Delete with an "Undo" toast, so nothing disappears irreversibly
function softDelete(msg, fn){
  var prev=JSON.stringify(D);
  fn(); save(); render();
  document.querySelectorAll(".toast").forEach(function(x){x.remove();});
  var t=document.createElement("div"); t.className="toast undo";
  t.innerHTML='<span>'+esc(msg)+'</span><button class="btn sm gh"><i class="fas fa-rotate-left"></i> Anulează</button>';
  t.querySelector("button").onclick=function(){ D=JSON.parse(prev); save("Restaurat ✅"); render(); t.remove(); };
  document.body.appendChild(t);
  setTimeout(function(){ t.remove(); }, 8000);
}
function undoToast(msg, undo){
  document.querySelectorAll(".toast").forEach(function(x){x.remove();});
  var t=document.createElement("div"); t.className="toast undo";
  t.innerHTML='<span>'+esc(msg)+'</span><button class="btn sm gh"><i class="fas fa-rotate-left"></i> Anulează</button>';
  t.querySelector("button").onclick=function(){ t.remove(); undo(); };
  document.body.appendChild(t); setTimeout(function(){ t.remove(); }, 8000);
}
function avatar(name, size){
  size=size||28;
  var ph=(D.settings.photos||{})[name];
  if(ph) return '<span class="av" style="width:'+size+'px;height:'+size+'px"><img src="'+ph+'" alt=""></span>';
  var ini=String(name||"?").trim().split(/\s+/).map(function(w){return w[0];}).join("").slice(0,2).toUpperCase()||"?";
  return '<span class="av" style="width:'+size+'px;height:'+size+'px;font-size:'+Math.round(size*.4)+'px">'+esc(ini)+'</span>';
}
function confirmBox(msg, onYes, yesLabel){
  modal('<div class="mt"><i class="fas fa-circle-question"></i> Confirmare</div><p style="line-height:1.5;margin-top:8px">'+msg+'</p>'+
    '<div class="mf"><button class="btn gh" onclick="closeModal()">Renunță</button><button class="btn bd" id="cfYes">'+(yesLabel||"Da, șterge")+'</button></div>');
  document.getElementById("cfYes").onclick=function(){ closeModal(); onYes(); };
}
// Two real choices, neither of them "cancel" — used when the data file and the app disagree.
function choiceBox(msg, aLabel, aFn, bLabel, bFn){
  modal('<div class="mt"><i class="fas fa-circle-question"></i> Alege</div><p style="line-height:1.5;margin-top:8px">'+msg+'</p>'+
    '<div class="mf"><button class="btn gh" id="cbB">'+esc(bLabel)+'</button><button class="btn" id="cbA">'+esc(aLabel)+'</button></div>');
  document.getElementById("cbA").onclick=function(){ closeModal(); aFn(); };
  document.getElementById("cbB").onclick=function(){ closeModal(); if(bFn) bFn(); };
}
function alertBox(msg){
  modal('<div class="mt"><i class="fas fa-circle-info"></i> Atenție</div><p style="line-height:1.5;margin-top:8px">'+msg+'</p><div class="mf"><button class="btn" onclick="closeModal()">OK</button></div>');
}
document.addEventListener("keydown",function(e){
  if(e.key==="Escape") closeModal();
  var tag=(e.target.tagName||"").toLowerCase();
  if((e.key==="n"||e.key==="N") && S.page==="exp" && !document.getElementById("mb") && tag!=="input" && tag!=="textarea" && tag!=="select"){ e.preventDefault(); openExpense(); }
});

// ───────── Charts ─────────
var CHARTS=[];
function killCharts(){ CHARTS.forEach(function(c){ try{c.destroy();}catch(e){} }); CHARTS=[]; }
function themeColors(){
  var cs=getComputedStyle(document.body);
  return {txt:cs.getPropertyValue("--mut").trim()||"#b9b5ae", grid:cs.getPropertyValue("--grid").trim()||"rgba(255,255,255,.07)", gold:"#e6b422", ok:"#6fbf4c", danger:"#e07c4c", info:"#4a9eff"};
}
function mkChart(id, cfg){
  var el=document.getElementById(id); if(!el || typeof Chart==="undefined") return null;
  var t=themeColors();
  Chart.defaults.color=t.txt; Chart.defaults.borderColor=t.grid;
  Chart.defaults.font.family="'Inter',system-ui,'Segoe UI',sans-serif";
  cfg.options=cfg.options||{};
  cfg.options.responsive=true; cfg.options.maintainAspectRatio=false;
  cfg.options.plugins=cfg.options.plugins||{};
  if(!cfg.options.plugins.tooltip) cfg.options.plugins.tooltip={callbacks:{label:function(c){
    var v=c.parsed && typeof c.parsed==="object" ? (c.chart.config.type==="bar"&&c.chart.options.indexAxis==="y"?c.parsed.x:c.parsed.y) : c.parsed;
    return " "+(c.dataset.label?c.dataset.label+": ":(c.label?c.label+": ":""))+money(v);
  }}};
  var ch=new Chart(el.getContext("2d"), cfg); CHARTS.push(ch); return ch;
}
function moneyTicks(){ return {callback:function(v){ return NF0.format(v); }}; }

// ───────── Expense dialog ─────────
// ───── Expense dialog ─────
// Left: category, subcategory, description. Right: a receipt calculator — type an amount and press "+" (or the
// + key) for every receipt; Enter saves. Several receipts are saved as one total or each on its own.
// "Mai am bonuri" keeps the dialog open after saving (category and date stay), with this session's list below.
var EX={};
function openExpense(id, preset){
  var e = id ? D.expenses.find(function(x){return x.id===id;}) : null;
  var date = e ? (e.day ? e.month+"-"+pad2(e.day) : "") : (S.ym===curYM() ? todayISO() : S.ym+"-01");
  EX = {id:id||null, cat: e?e.cat:((preset&&preset.cat)||lastCat()), sub:e?e.sub:((preset&&preset.sub)||null), noDay: e? !e.day : false, month: e?e.month:S.ym,
        tape: e ? (e.parts&&e.parts.length?e.parts.slice():[e.amount]) : [], each:false, session:(preset&&preset.session)||[]};
  var keep = !e && D.settings.exKeepOpen;
  var html='<div class="mt"><i class="fas fa-receipt"></i> '+(e?"Modifică cheltuiala":"Cheltuială nouă")+'</div>'+
    '<div class="exg"><div class="exl">'+
      '<label class="L">Categoria</label><div class="catgrid sm" id="exCats"></div>'+
      '<label class="L">Subcategorie</label><div class="chips subchips" id="exSubs"></div><input id="exSubNew" placeholder="Numele subcategoriei noi" style="margin-top:6px;display:none">'+
      '<span class="hint" id="exSubTot"></span>'+
      '<label class="L">Descriere / magazin</label><input id="exDesc" list="exDescL" placeholder="ex. Mol, Lidl, haine…" value="'+esc(e?e.desc:"")+'"><datalist id="exDescL"></datalist>'+
      (e?'':'<div class="hint" style="margin-top:8px"><a href="#" onclick="event.preventDefault();closeModal();openAdj()" style="color:var(--info)"><i class="fas fa-scale-balanced"></i> Banii din aplicație nu se potrivesc cu cei reali? Fă o reglare de cont</a></div>')+
    '</div><div class="exr">'+
      '<label class="L">Suma (lei) — câte un bon, apoi <b>+</b></label>'+
      '<div class="calc"><input class="big" id="exAmt" inputmode="decimal" placeholder="0,00" autocomplete="off" autofocus>'+
        '<button class="btn calcplus" onclick="tapeAdd()" title="Adaugă bonul (sau tasta +)"><i class="fas fa-plus"></i></button></div>'+
      '<div class="tape" id="exTape"></div>'+
      '<div class="tapetot" id="exTot"></div>'+
      '<div class="seg" id="exEach" style="display:none;margin-top:8px"><button data-v="0">Un total</button><button data-v="1">Fiecare bon separat</button></div>'+
      '<label class="L">Data</label><div class="r2 dateq"><input type="date" id="exDate" value="'+date+'"'+(EX.noDay?' disabled':'')+'>'+
        '<div class="chips"><span class="chip" onclick="setExDate(0)">Azi</span><span class="chip" onclick="setExDate(-1)">Ieri</span></div></div>'+
      '<label class="hint" style="display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" id="exNoDay"'+(EX.noDay?' checked':'')+' onchange="toggleNoDay()"> fără zi (doar luna)</label>'+
      '<select id="exMonth" style="margin-top:6px;'+(EX.noDay?'':'display:none')+'">'+monthOptions(EX.month)+'</select>'+
    '</div></div>'+
    '<div class="mf">'+(e?'<button class="btn bd" style="margin-right:auto" onclick="delExpense(\''+e.id+'\')"><i class="fas fa-trash"></i> Șterge</button>':
      '<label class="ck keepck" title="După salvare fereastra rămâne deschisă, cu aceeași categorie și dată"><input type="checkbox" id="exKeep"'+(keep?' checked':'')+' onchange="D.settings.exKeepOpen=this.checked;save()"> Mai am bonuri (rămân aici)</label>')+
      '<button class="btn gh" onclick="closeModal()">'+(EX.session.length?'Gata':'Renunță')+'</button>'+
      '<button class="btn" id="exSave" onclick="saveExpense()"><i class="fas fa-check"></i> Salvează</button></div>'+
    '<span class="hint" style="text-align:right;margin-top:6px">+ = încă un bon · ⌫ pe gol = scoate ultimul · Enter = salvează · Esc = închide</span>'+
    '<div id="exSess"></div>';
  modal(html,true);
  drawExCats(); fillSubs(); drawTape(); drawSession();
  if(EX.id && EX.tape.length===1){ document.getElementById("exAmt").value=String(EX.tape[0]).replace(".",","); EX.tape=[]; drawTape(); }
  var amt=document.getElementById("exAmt");
  amt.addEventListener("keydown",function(ev){
    if(ev.key==="+"){ ev.preventDefault(); tapeAdd(); }
    else if(ev.key==="Enter"){ ev.preventDefault(); saveExpense(); }
    else if(ev.key==="Backspace" && !amt.value && EX.tape.length){ ev.preventDefault(); EX.tape.pop(); drawTape(); }
  });
  amt.addEventListener("input",function(){ if(/[+]/.test(amt.value)){ var parts=amt.value.split("+"); amt.value=parts.pop(); parts.forEach(function(x){ var v=num(x); if(v>0) EX.tape.push(r2(v)); }); } drawTape(); });
  ["exDate","exMonth"].forEach(function(id){ var el=document.getElementById(id); el.addEventListener("change",subHint); });
  document.getElementById("exDesc").addEventListener("keydown",function(ev){ if(ev.key==="Enter"){ ev.preventDefault(); amt.focus(); } });
  document.querySelectorAll("#exEach button").forEach(function(b){ b.onclick=function(){ EX.each=b.dataset.v==="1"; drawTape(); }; });
}
function setExDate(k){ var d=new Date(); d.setDate(d.getDate()+k); var iso=d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate());
  var nd=document.getElementById("exNoDay"); if(nd.checked){ nd.checked=false; toggleNoDay(); }
  document.getElementById("exDate").value=iso; subHint(); document.getElementById("exAmt").focus(); }
// receipts typed so far + what is in the field now
function tapeAll(){ var a=EX.tape.slice(), v=num(document.getElementById("exAmt").value); if(v>0) a.push(r2(v)); return a; }
function tapeAdd(){
  var inp=document.getElementById("exAmt"), v=num(inp.value);
  if(v>0){ EX.tape.push(r2(v)); inp.value=""; drawTape(); }
  inp.focus();
}
function drawTape(){
  var t=document.getElementById("exTape"); if(!t) return;
  t.innerHTML=EX.tape.map(function(v,i){ return '<span class="tchip">'+nf(v)+'<i class="fas fa-xmark" title="Scoate bonul" onclick="EX.tape.splice('+i+',1);drawTape();document.getElementById(\'exAmt\').focus()"></i></span>'; }).join("");
  var all=tapeAll(), tot=0; all.forEach(function(v){ tot+=v; });
  document.getElementById("exTot").innerHTML = all.length>1 ? '<span>'+all.length+' bonuri</span><b>'+money(r2(tot))+'</b>' : '';
  var each=document.getElementById("exEach"); each.style.display = (all.length>1 && !EX.id) ? "" : "none";
  each.querySelectorAll("button").forEach(function(b){ b.classList.toggle("on", (b.dataset.v==="1")===EX.each); });
  var sb=document.getElementById("exSave");
  sb.innerHTML='<i class="fas fa-check"></i> '+(all.length>1 ? (EX.each&&!EX.id ? 'Salvează '+all.length+' bonuri' : 'Salvează '+money(r2(tot))) : 'Salvează');
  subHint();
}
function monthOptions(sel){
  var o="", base=ymAdd(curYM(),-24);
  var ms={}; for(var i=0;i<36;i++) ms[ymAdd(base,i)]=1; allMonths().forEach(function(m){ms[m]=1;}); ms[sel]=1;
  Object.keys(ms).sort().reverse().forEach(function(m){ o+='<option value="'+m+'"'+(m===sel?' selected':'')+'>'+ymLabel(m)+'</option>'; });
  return o;
}
function toggleNoDay(){
  EX.noDay=document.getElementById("exNoDay").checked;
  document.getElementById("exDate").disabled=EX.noDay;
  document.getElementById("exMonth").style.display=EX.noDay?"":"none";
  subHint();
}
function lastCat(){ var l=D.expenses[D.expenses.length-1]; return l?l.cat:(D.cats[0]&&D.cats[0].id); }
function drawExCats(){
  document.getElementById("exCats").innerHTML=D.cats.map(function(c){
    return '<div class="catb'+(c.id===EX.cat?' on':'')+'" onclick="EX.cat=\''+c.id+'\';EX.sub=null;drawExCats();fillSubs();document.getElementById(\'exAmt\').focus()">'+catIco(c)+'<span>'+esc(c.name)+'</span></div>';
  }).join("");
}
// subcategories as chips (one click); the first one is chosen when nothing was chosen before
function fillSubs(){
  var c=cat(EX.cat), subs=c.subs.slice();
  if(EX.sub && subs.indexOf(EX.sub)<0) subs.push(EX.sub);
  if(EX.sub===null) EX.sub = (!EX.id && subs.length) ? subs[0] : "";
  var box=document.getElementById("exSubs");
  box.innerHTML='<span class="chip'+(!EX.sub?' on':'')+'" data-s="">— fără —</span>'+subs.map(function(s){ return '<span class="chip'+(s===EX.sub?' on':'')+'" data-s="'+esc(s)+'">'+esc(s)+'</span>'; }).join("")+
    '<span class="chip" data-s="__new"><i class="fas fa-plus"></i> nouă</span>';
  box.querySelectorAll(".chip").forEach(function(ch){ ch.onclick=function(){
    var v=ch.dataset.s, ni=document.getElementById("exSubNew");
    if(v==="__new"){ ni.style.display=""; ni.focus(); EX.sub="__new"; }
    else { ni.style.display="none"; EX.sub=v; document.getElementById("exAmt").focus(); }
    box.querySelectorAll(".chip").forEach(function(x){ x.classList.toggle("on", x===ch); }); subHint();
  }; });
  document.getElementById("exSubNew").style.display="none";
  // descriptions used before in this category
  var seen={}, list=[];
  for(var i=D.expenses.length-1;i>=0 && list.length<60;i--){ var x=D.expenses[i]; if(x.cat===EX.cat && x.desc && !seen[x.desc]){ seen[x.desc]=1; list.push(x.desc); } }
  document.getElementById("exDescL").innerHTML=list.map(function(d){return '<option value="'+esc(d)+'">';}).join("");
  subHint();
}
function exMonth(){ var dt=document.getElementById("exDate").value; return EX.noDay?document.getElementById("exMonth").value:(dt?dt.slice(0,7):S.ym); }
// the chosen subcategory's month total, and what it becomes after this save
function subHint(){
  var el=document.getElementById("exSubTot"); if(!el) return;
  var sub=EX.sub;
  if(!sub || sub==="__new"){ el.innerHTML=""; return; }
  var m=exMonth();
  var t=sum(D.expenses.filter(function(e){ return e.month===m && e.cat===EX.cat && e.sub===sub && e.id!==EX.id; }));
  var a=0; tapeAll().forEach(function(v){ a+=v; });
  el.innerHTML='Total '+esc(sub)+' în '+LUNI[+m.slice(5,7)-1]+': <b>'+money(t)+'</b>'+(a>0?' → după adăugare <b style="color:var(--gold)">'+money(t+a)+'</b>':'');
}
// receipts saved while the dialog stayed open ("Mai am bonuri")
function drawSession(){
  var el=document.getElementById("exSess"); if(!el) return;
  var list=EX.session.map(function(id){ return D.expenses.find(function(x){return x.id===id;}); }).filter(Boolean);
  if(!list.length){ el.innerHTML=""; return; }
  var tot=0; list.forEach(function(x){ tot+=x.amount; });
  el.innerHTML='<div class="sess"><div class="sess-h"><b><i class="fas fa-list-check"></i> Adăugate acum: '+list.length+'</b><b>'+money(r2(tot))+'</b></div>'+
    list.slice().reverse().map(function(x){ return '<div class="sess-r"><span>'+catIco(x.cat,22)+' '+esc(cat(x.cat).name)+(x.sub?' · '+esc(x.sub):'')+(x.desc?' · <span class="mut">'+esc(x.desc)+'</span>':'')+'</span><span class="mut">'+(x.day?pad2(x.day)+'.'+x.month.slice(5,7):'')+'</span><b>'+money(x.amount)+'</b>'+
      '<button class="ib del" title="Scoate" onclick="sessDel(\''+x.id+'\')"><i class="fas fa-trash"></i></button></div>'; }).join("")+'</div>';
}
function sessDel(id){ D.expenses=D.expenses.filter(function(x){return x.id!==id;}); EX.session=EX.session.filter(function(x){return x!==id;}); save("Scoasă"); render(); drawSession(); }
function saveExpense(){
  var all=tapeAll(); if(!all.length){ toast("Scrie suma"); document.getElementById("exAmt").focus(); return; }
  var tot=0; all.forEach(function(v){ tot+=v; }); tot=r2(tot);
  var sub=EX.sub||"";
  if(sub==="__new"){
    sub=document.getElementById("exSubNew").value.trim();
    var cc=cat(EX.cat); if(sub && cc.subs.indexOf(sub)<0) cc.subs.push(sub);
  }
  var month, day;
  if(EX.noDay){ month=document.getElementById("exMonth").value; day=null; }
  else{
    var dt=document.getElementById("exDate").value;
    if(!dt){ toast("Alege data"); return; }
    month=dt.slice(0,7); day=+dt.slice(8,10);
  }
  var base={month:month, day:day, cat:EX.cat, sub:sub, desc:document.getElementById("exDesc").value.trim()};
  var added=[];
  if(EX.id){
    var e=D.expenses.find(function(x){return x.id===EX.id;}); Object.assign(e,base,{amount:tot});
    if(all.length>1) e.parts=all; else delete e.parts;
    // linked investment deposit: keep amount and date in sync
    if(e.linkTx) D.savings.forEach(function(h){ var t=(h.txs||[]).find(function(q){return q.id===e.linkTx;}); if(t){ t.amount=e.amount; if(e.day) t.date=e.month+"-"+pad2(e.day); } });
  } else if(EX.each && all.length>1){
    all.forEach(function(v){ var r=Object.assign({id:uid(), amount:v},base); D.expenses.push(r); added.push(r); });
  } else {
    var r=Object.assign({id:uid(), amount:tot},base); if(all.length>1) r.parts=all; D.expenses.push(r); added.push(r);
  }
  if(!save(EX.id?"Cheltuială modificată ✅":null)) return;
  var ids=added.map(function(x){return x.id;});
  var keep=!EX.id && document.getElementById("exKeep") && document.getElementById("exKeep").checked;
  if(keep){
    // stay: same category, subcategory and date; empty calculator; this session's list grows
    var st={cat:EX.cat, sub:EX.sub==="__new"?sub:EX.sub, session:EX.session.concat(ids)}, d=document.getElementById("exDate").value, nd=EX.noDay, m=document.getElementById("exMonth").value;
    render(); openExpense(null, st);
    if(nd){ document.getElementById("exNoDay").checked=true; toggleNoDay(); document.getElementById("exMonth").value=m; } else document.getElementById("exDate").value=d;
    toast("Salvat: "+money(tot)+(ids.length>1?" ("+ids.length+" bonuri)":""));
    return;
  }
  closeModal(); render();
  if(added.length) undoToast("Adăugat: "+cat(EX.cat).name+" · "+money(tot)+(added.length>1?" ("+added.length+" bonuri)":""), function(){ D.expenses=D.expenses.filter(function(x){return ids.indexOf(x.id)<0;}); save("Anulat — scos"); render(); });
}
function delExpense(id){
  closeModal();
  softDelete("Cheltuială ștearsă", function(){
    var e=D.expenses.find(function(x){return x.id===id;});
    // linked investment deposit: remove it there as well
    if(e && e.linkTx) D.savings.forEach(function(h){ var t=(h.txs||[]).find(function(q){return q.id===e.linkTx;}); if(t){ if(qtyKind(h)) h.qty=r2((h.qty||0)-(t.qty||0)); h.txs=h.txs.filter(function(q){return q!==t;}); } });
    D.expenses=D.expenses.filter(function(x){return x.id!==id;});
  });
}
function dayLabel(e){ return e.day ? pad2(e.day)+"."+e.month.slice(5,7) : "—"; }

// ───────── Page layout: a free grid, the same on every page ─────────
// The page is a grid of N columns (chosen in the title bar, 1–6; 4 by default) and 20px rows. Every card or module
// has its own place {x, y, w, h} (column, row, width in columns, height in rows):
//   • move it by ⠿ — a frame shows where it would land: gold = it fits, red = it would cover another card;
//   • resize it by its right edge, bottom edge or corner — it stops where it would touch another card;
//   • nothing else moves or changes size by itself, and empty space stays empty.
// Places are saved per page and per number of columns (D.settings.pageBox["page@N"]). A card placed for the first
// time gets its natural height and the first free spot. Content taller than its card scrolls inside it.
var ROW=20, GAP=16;
function modKey(el, i){
  if(el.dataset.k) return el.dataset.k;
  if(el.dataset.cat) return "cat-"+el.dataset.cat;
  var t=el.querySelector(".ct, .cl, .box-h span");
  // the title without amounts and month names, so a module keeps its place when the month changes
  var txt=t ? normKey(t.textContent) : "";
  LUNI.forEach(function(l){ txt=txt.split(normKey(l)).join(""); });
  var k=txt.replace(/[^a-z0-9]+/g,"-").replace(/-?\d[\d.,-]*(lei)?/g,"").slice(0,32);
  return k || ("m"+i);
}
function pageCols(page){ var n=((D.settings.pageCols||{})[page])||0; return n>=1 && n<=6 ? n : 4; }
function makeLayout(page){
  var pg=document.getElementById("pg"); if(!pg) return;
  var units=[];
  [].slice.call(pg.children).forEach(function(el){
    if(el.classList.contains("ph") || el.classList.contains("tools") || el.classList.contains("mbar") || el.tagName==="P" || el.classList.contains("empty")) return;
    // groups are taken apart: every card is placed on its own (rows of cards, the category boxes…)
    if(el.classList.contains("g") || el.classList.contains("boxes")){
      [].slice.call(el.children).forEach(function(ch){ units.push({el:ch, wide:false}); }); el.remove(); return;
    }
    units.push({el:el, wide:true});
  });
  addColsControl(page);
  if(!units.length) return;
  var seen={}; units.forEach(function(u,i){ var k=modKey(u.el,i); while(seen[k]) k+="_"; seen[k]=1; u.k=k; });
  var n=pageCols(page), boxes=((D.settings.pageBox||{})[page+"@"+n])||{};
  var wrap=document.createElement("div"); wrap.className="fgrid"; wrap.style.gridTemplateColumns="repeat("+n+",minmax(0,1fr))";
  pg.appendChild(wrap);
  var items=units.map(function(u){
    var w=document.createElement("div"); w.className="fitem"; w.dataset.k=u.k; u.el.style.marginBottom="0"; w.appendChild(u.el); wrap.appendChild(w);
    var b=boxes[u.k], it={el:w, k:u.k, wide:u.wide, b:null};
    if(b){ it.b={w:Math.max(1,Math.min(b.w,n)), h:Math.max(3,b.h), y:Math.max(0,b.y)}; it.b.x=Math.max(0,Math.min(b.x, n-it.b.w)); }
    return it;
  });
  // first time on this page / with this number of columns: natural height, first free place, in the page order
  var todo=items.filter(function(it){ return !it.b; });
  if(todo.length){
    wrap.classList.add("measuring");
    todo.forEach(function(it){ it._w=it.wide?n:1; it.el.style.gridColumn="span "+it._w; it.el.style.gridRow="auto"; });
    // a module with a title (list, table, chart) gets at least ~280px, because its content changes from month to month
    todo.forEach(function(it){ var min=it.el.querySelector(":scope > .c > .ct, :scope > .box") ? 14 : 3; it._h=Math.max(min, Math.ceil((it.el.getBoundingClientRect().height+GAP)/ROW)); });
    wrap.classList.remove("measuring");
    var placed=items.filter(function(it){ return it.b; });
    todo.forEach(function(it){ it.b=firstFree(placed, n, it._w, it._h); placed.push(it); });
  }
  // never two cards on the same spot (e.g. after a card was added): the later one goes to the first free place
  var ok=[]; items.forEach(function(it){ if(!fits(it.b, ok, it, n)) it.b=firstFree(ok, n, it.b.w, it.b.h); ok.push(it); });
  if(todo.length) saveBoxes(page, n, items);
  items.forEach(function(it){ placeItem(it); addHandles(it, items, wrap, page, n); });
  fitGridHeight(wrap, items);
  CHARTS.forEach(function(c){ try{c.resize();}catch(e){} });
}
function hits(a,b){ return a.x<b.x+b.w && b.x<a.x+a.w && a.y<b.y+b.h && b.y<a.y+a.h; }
function fits(b, items, self, n){ if(b.x<0 || b.y<0 || b.x+b.w>n) return false; for(var i=0;i<items.length;i++){ var o=items[i]; if(o!==self && o.b && hits(b,o.b)) return false; } return true; }
function firstFree(placed, n, w, h){ for(var y=0;y<5000;y++) for(var x=0;x+w<=n;x++){ var b={x:x,y:y,w:w,h:h}; if(fits(b,placed,null,n)) return b; } return {x:0,y:5000,w:w,h:h}; }
function placeItem(it){
  var b=it.b, el=it.el;
  el.style.gridColumn=(b.x+1)+" / span "+b.w; el.style.gridRow=(b.y+1)+" / span "+b.h;
  el.style.height=(b.h*ROW-GAP)+"px";
}
function fitGridHeight(wrap, items, extra){ var m=0; items.forEach(function(it){ m=Math.max(m,it.b.y+it.b.h); }); wrap.style.gridTemplateRows="repeat("+(m+(extra||0))+","+ROW+"px)"; }
function saveBoxes(page, n, items){
  D.settings.pageBox=D.settings.pageBox||{};
  var o=D.settings.pageBox[page+"@"+n]={};
  items.forEach(function(it){ o[it.k]={x:it.b.x, y:it.b.y, w:it.b.w, h:it.b.h}; });
  // on Expenses the category cards, top to bottom and left to right, give the order of the categories
  if(page==="exp"){
    var ids=items.filter(function(it){ return it.k.indexOf("cat-")===0; }).sort(function(a,b){ return a.b.y-b.b.y || a.b.x-b.b.x; }).map(function(it){ return it.k.slice(4); });
    D.cats.sort(function(a,b){ var ia=ids.indexOf(a.id), ib=ids.indexOf(b.id); if(ia<0 && ib<0) return 0; if(ia<0) return 1; if(ib<0) return -1; return ia-ib; });
  }
  save();
}
// the frame that shows where a card would go
function showFrame(wrap, b, ok){
  var f=wrap.querySelector(":scope > .fframe"); if(!f){ f=document.createElement("div"); f.className="fframe"; wrap.appendChild(f); }
  f.style.gridColumn=(b.x+1)+" / span "+b.w; f.style.gridRow=(b.y+1)+" / span "+b.h; f.style.height=(b.h*ROW-GAP)+"px";
  f.classList.toggle("bad",!ok);
}
function addHandles(it, items, wrap, page, n){
  var el=it.el;
  [["grip2","Trage ca să muți (se pune doar unde încape)",'<i class="fas fa-grip-vertical"></i>'],["rsz","Trage ca să-l faci mai lat sau mai îngust",""],
   ["rszh","Trage ca să-l faci mai înalt sau mai scund",""],["rszc","Trage ca să-l faci mai mare sau mai mic",""]].forEach(function(d){
    var h=document.createElement("span"); h.className=d[0]; h.title=d[1]; h.innerHTML=d[2]; el.appendChild(h);
  });
  var geo=function(){ var r=wrap.getBoundingClientRect(), cg=parseFloat(getComputedStyle(wrap).columnGap)||GAP; return {left:r.left, top:r.top, colW:(r.width-cg*(n-1))/n, cg:cg}; };
  var session=function(e, onMove, onEnd, cls){
    e.preventDefault(); e.stopPropagation();
    document.body.classList.add("nosel", cls); el.classList.add("active");
    fitGridHeight(wrap, items, 40);
    var lx=e.clientX, ly=e.clientY;
    var timer=setInterval(function(){ var d = ly<90 ? -Math.ceil((90-ly)/4) : (ly>innerHeight-90 ? Math.ceil((ly-innerHeight+90)/4) : 0); if(d){ window.scrollBy(0,d); onMove(lx,ly); } },16);
    var move=function(ev){ lx=ev.clientX; ly=ev.clientY; onMove(lx,ly); };
    var up=function(){ clearInterval(timer); document.removeEventListener("pointermove",move); document.removeEventListener("pointerup",up);
      document.body.classList.remove("nosel", cls); el.classList.remove("active"); var f=wrap.querySelector(":scope > .fframe"); if(f) f.remove();
      onEnd(); fitGridHeight(wrap, items); CHARTS.forEach(function(c){ try{c.resize();}catch(x){} }); };
    document.addEventListener("pointermove",move); document.addEventListener("pointerup",up);
    onMove(lx,ly);
  };
  // move: only where it fits
  el.querySelector(":scope > .grip2").addEventListener("pointerdown",function(e){
    var r=el.getBoundingClientRect(), offX=e.clientX-r.left, offY=e.clientY-r.top, cand=null, ok=false;
    session(e, function(lx,ly){
      var G=geo(), x=Math.round((lx-offX-G.left)/(G.colW+G.cg)), y=Math.round((ly-offY-G.top)/ROW);
      cand={x:Math.max(0,Math.min(n-it.b.w,x)), y:Math.max(0,y), w:it.b.w, h:it.b.h}; ok=fits(cand,items,it,n);
      if(cand.y+cand.h > parseInt(wrap.style.gridTemplateRows.slice(7),10)-5) fitGridHeight(wrap, items, cand.y+cand.h+20-Math.max.apply(null,items.map(function(o){return o.b.y+o.b.h;})));
      showFrame(wrap,cand,ok);
    }, function(){
      if(cand && ok && (cand.x!==it.b.x || cand.y!==it.b.y)){ it.b=cand; placeItem(it); saveBoxes(page,n,items); }
      else if(cand && !ok) toast("Acolo nu încape — s-ar suprapune peste alt card");
    }, "moving");
  });
  // resize by the right edge (width), bottom edge (height) or corner (both); it stops before touching another card
  var resize=function(e, doW, doH){
    var start=JSON.stringify(it.b);
    session(e, function(lx,ly){
      var G=geo(), r=el.getBoundingClientRect(), b={x:it.b.x,y:it.b.y,w:it.b.w,h:it.b.h};
      if(doW) b.w=Math.max(1,Math.min(n-b.x, Math.round((lx-r.left+G.cg)/(G.colW+G.cg))));
      if(doH) b.h=Math.max(3, Math.round((ly-r.top+GAP)/ROW));
      if(fits(b,items,it,n)){ it.b=b; placeItem(it); fitGridHeight(wrap, items, 40); CHARTS.forEach(function(c){ try{c.resize();}catch(x){} }); }
      showFrame(wrap, it.b, true);
    }, function(){ if(JSON.stringify(it.b)!==start) saveBoxes(page,n,items); }, doW&&doH?"cornerresize":(doW?"colresize":"rowresize"));
  };
  el.querySelector(":scope > .rsz").addEventListener("pointerdown",function(e){ resize(e,true,false); });
  el.querySelector(":scope > .rszh").addEventListener("pointerdown",function(e){ resize(e,false,true); });
  el.querySelector(":scope > .rszc").addEventListener("pointerdown",function(e){ resize(e,true,true); });
}
// "columns" switch in the page title bar (1–6, the same on every page)
function addColsControl(page){
  var ph=document.querySelector("#pg .ph"); if(!ph || ph.querySelector(".colsw")) return;
  var n=pageCols(page);
  var el=document.createElement("div"); el.className="seg colsw"; el.title="Câte coloane are pagina. Cardurile le muți de ⠿ și le mărești de margini; fiecare număr de coloane își ține minte așezarea";
  el.innerHTML='<span class="colsi"><i class="fas fa-table-columns"></i></span>'+[1,2,3,4,5,6].map(function(k){ return '<button class="'+(k===n?"on":"")+'" onclick="setPageCols(\''+page+'\','+k+')">'+k+'</button>'; }).join("");
  var h1=ph.querySelector("h1"); ph.insertBefore(el, h1 ? h1.nextSibling : ph.firstChild);
}
function setPageCols(page, n){ D.settings.pageCols=D.settings.pageCols||{}; D.settings.pageCols[page]=n; save(n+(n===1?" coloană":" coloane")); render(); }
// back to the first arrangement (Settings → Aspect)
function resetLayouts(){ D.settings.pageBox={}; D.settings.pageCols={}; D.settings.layout={}; D.settings.pageSpan={}; D.settings.pageH={}; save("Așezare inițială refăcută"); render(); }
