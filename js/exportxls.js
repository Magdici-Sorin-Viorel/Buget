// Buget Familie — exportxls.js
// Writes one year of data as a spreadsheet anyone can read: a summary, a sheet per month with
// the expenses and the incomes, a category table and an income table — all built from whatever
// categories and people the user actually has.
// The file also carries a hidden "Date aplicatie" sheet with the complete data as JSON, so the
// workbook doubles as a full backup that can be loaded straight back into the app.

function rawBudget(ym, id){ var o=D.budgets[ym]; return (o && o[id]!==undefined) ? o[id] : (cat(id).budget||0); }

// Small grid writer: g.set(row, col, value) with 0-based indexes, then g.sheet() → SheetJS worksheet
function gridWriter(){
  var rows=[];
  return {
    set:function(r,c,v){ if(v===undefined||v===null||v==="") return; while(rows.length<=r) rows.push([]); rows[r][c]=v; },
    row:function(r,c,arr){ var self=this; arr.forEach(function(v,i){ self.set(r,c+i,v); }); },
    sheet:function(widths){
      var ws=XLSX.utils.aoa_to_sheet(rows.map(function(r){ var a=[]; for(var i=0;i<r.length;i++) a.push(r[i]===undefined?null:r[i]); return a; }));
      if(widths) ws["!cols"]=widths.map(function(w){ return {wch:w}; });
      return ws;
    }
  };
}

function peopleWithIncome(list){
  var p=D.settings.people.filter(function(x){ return list.some(function(e){ return e.person===x; }); });
  list.forEach(function(e){ if(e.person && p.indexOf(e.person)<0) p.push(e.person); });
  return p;
}

// ───────── Sheet 1: the year at a glance, month by month ─────────
function buildSummarySheet(y){
  var g=gridWriter(), ms=monthsOfYear(String(y)), bal=balances();
  g.set(0,0,"Buget Familie — anul "+y);
  g.set(1,0,"Salvat pe "+todayISO().split("-").reverse().join("."));
  g.row(3,0,["Luna","Reportat din luna trecută","Încasări","Cheltuieli","Reglări","Rămas la sfârșit"]);
  var t={inc:0, exp:0, adj:0};
  ms.forEach(function(m,i){
    var b=bal[m]||monthInfo(m);
    var adj=0; adjOf(m).filter(function(a){ return !isCarryAdj(a); }).forEach(function(a){ adj+=a.amount; });
    g.row(4+i,0,[LUNI[i], r2(b.start), r2(b.inc), r2(b.exp), r2(adj), r2(b.end)]);
    t.inc+=b.inc; t.exp+=b.exp; t.adj+=adj;
  });
  g.row(4+ms.length,0,["TOTAL","",r2(t.inc),r2(t.exp),r2(t.adj),""]);
  return g.sheet([14,24,14,14,12,18]);
}

// ───────── Sheet 2: how much went into each category, month by month ─────────
function buildCatSheet(y){
  var g=gridWriter(), ms=monthsOfYear(String(y));
  var yExp=D.expenses.filter(function(e){ return e.month.slice(0,4)===String(y); });
  g.set(0,0,"Cheltuieli pe categorii — "+y);
  g.set(2,0,"Categoria");
  LUNI.forEach(function(l,i){ g.set(2,1+i,l); });
  g.set(2,13,"Total an");
  var used=D.cats.filter(function(c){ return yExp.some(function(e){ return e.cat===c.id; }); });
  var colT=[], tot=0;
  used.forEach(function(c,ri){
    var rowT=0;
    ms.forEach(function(m,mi){
      var v=0; yExp.forEach(function(e){ if(e.cat===c.id && e.month===m) v+=e.amount; });
      if(v){ g.set(3+ri,1+mi,r2(v)); rowT+=v; colT[mi]=(colT[mi]||0)+v; }
    });
    g.set(3+ri,0,c.name+(c.outside?" (în afara totalului)":""));
    g.set(3+ri,13,r2(rowT)); tot+=rowT;
  });
  g.set(3+used.length,0,"TOTAL");
  ms.forEach(function(m,mi){ if(colT[mi]) g.set(3+used.length,1+mi,r2(colT[mi])); });
  g.set(3+used.length,13,r2(tot));
  return g.sheet([24].concat(LUNI.map(function(){return 12;})).concat([13]));
}

// ───────── Sheet 3: who brought in how much, month by month ─────────
function buildIncomeSheet(y){
  var g=gridWriter(), ms=monthsOfYear(String(y));
  var yInc=D.incomes.filter(function(e){ return e.month.slice(0,4)===String(y); });
  var people=peopleWithIncome(yInc);
  g.set(0,0,"Încasări pe persoane — "+y);
  g.set(2,0,"Persoana");
  LUNI.forEach(function(l,i){ g.set(2,1+i,l); });
  g.set(2,13,"Total an");
  var colT=[], tot=0;
  people.concat([""]).forEach(function(p,ri){
    var list=yInc.filter(function(e){ return (e.person||"")===p; });
    if(!list.length) return;
    var rowT=0;
    ms.forEach(function(m,mi){
      var v=0; list.forEach(function(e){ if(e.month===m) v+=e.amount; });
      if(v){ g.set(3+ri,1+mi,r2(v)); rowT+=v; colT[mi]=(colT[mi]||0)+v; }
    });
    g.set(3+ri,0,p||"Fără persoană");
    g.set(3+ri,13,r2(rowT)); tot+=rowT;
  });
  var last=3+people.length+1;
  g.set(last,0,"TOTAL");
  ms.forEach(function(m,mi){ if(colT[mi]) g.set(last,1+mi,r2(colT[mi])); });
  g.set(last,13,r2(tot));
  return g.sheet([20].concat(LUNI.map(function(){return 12;})).concat([13]));
}

// ───────── One sheet per month: every entry, as it was written down ─────────
function buildMonthSheet(ym){
  var g=gridWriter(), b=balances()[ym]||monthInfo(ym);
  var inc=incOf(ym), exps=expOf(ym,true);
  var adjs=adjOf(ym).filter(function(a){ return !isCarryAdj(a); });

  g.set(0,0,ymLabel(ym));
  g.row(1,0,["Reportat din luna trecută", r2(b.start)]);
  g.row(2,0,["Încasări", r2(b.inc)]);
  g.row(3,0,["Cheltuieli", r2(b.exp)]);
  g.row(4,0,["Rămas la sfârșit", r2(b.end)]);

  var r=6;
  g.set(r,0,"ÎNCASĂRI"); r++;
  g.row(r,0,["Ziua","Persoana","Tipul","Detalii","Suma"]); r++;
  inc.slice().sort(function(a,c){ return (a.day||0)-(c.day||0); }).forEach(function(e){
    g.row(r,0,[e.day||"", e.person||"", e.type||"", e.desc||"", r2(e.amount)]); r++;
  });
  if(!inc.length){ g.set(r,0,"—"); r++; }
  r++;

  if(adjs.length){
    g.set(r,0,"REGLĂRI DE CONT"); r++;
    g.row(r,0,["","Detalii","","","Suma"]); r++;
    adjs.forEach(function(a){ g.row(r,1,[a.desc||""]); g.set(r,4,r2(a.amount)); r++; });
    r++;
  }

  g.set(r,0,"CHELTUIELI"); r++;
  g.row(r,0,["Ziua","Categoria","Subcategoria","Detalii","Suma"]); r++;
  exps.slice().sort(function(a,c){ return (a.day||0)-(c.day||0); }).forEach(function(e){
    g.row(r,0,[e.day||"", cat(e.cat).name, e.sub||"", e.desc||"", r2(e.amount)]); r++;
  });
  if(!exps.length){ g.set(r,0,"—"); r++; }
  r++;

  g.set(r,0,"TOTAL PE CATEGORII"); r++;
  var bc=byCat(exps), tb=0;
  D.cats.forEach(function(c){
    if(!bc[c.id] && !rawBudget(ym,c.id)) return;
    var bud=rawBudget(ym,c.id); tb+=bud;
    g.row(r,0,[c.name, "", budgetOn()&&bud?r2(bud):"", budgetOn()&&bud?"rămas "+r2(bud-(bc[c.id]||0)):"", r2(bc[c.id]||0)]);
    r++;
  });
  g.row(r,0,["TOTAL","",budgetOn()&&tb?r2(tb):"","",r2(b.exp)]);
  return g.sheet([10,22,18,26,12]);
}

// ───────── The hidden full copy ─────────
function buildBackupSheet(){
  var g=gridWriter(), txt=JSON.stringify(D), CH=30000;
  g.set(0,0,"Copie completă a datelor din aplicația Buget Familie — nu modifica foaia asta.");
  g.set(1,0,"Salvată pe "+todayISO().split("-").reverse().join(".")+". În aplicație, „Refă datele dintr-o copie Excel” folosește foaia asta ca să refacă exact toate datele (toți anii).");
  for(var i=0, r=2; i<txt.length; i+=CH, r++) g.set(r,0,txt.slice(i,i+CH));
  return g.sheet([120]);
}

function buildYearWorkbook(y){
  var wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildSummarySheet(y), "Rezumat");
  XLSX.utils.book_append_sheet(wb, buildCatSheet(y), "Categorii");
  XLSX.utils.book_append_sheet(wb, buildIncomeSheet(y), "Încasări");
  monthsOfYear(String(y)).forEach(function(m,i){ XLSX.utils.book_append_sheet(wb, buildMonthSheet(m), LUNI[i]); });
  XLSX.utils.book_append_sheet(wb, buildBackupSheet(), BACKUP_SHEET);
  return wb;
}

// Saves through the browser's save dialog, falling back to a normal download.
function exportExcel(y, fmt){
  if(typeof XLSX==="undefined"){ alertBox("Biblioteca Excel nu s-a încărcat (lib/xlsx.full.min.js)."); return; }
  fmt = fmt==="ods" ? "ods" : "xlsx";
  var data=XLSX.write(buildYearWorkbook(y), {bookType:fmt, type:"array"});
  var mime = fmt==="ods" ? "application/vnd.oasis.opendocument.spreadsheet" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  var name="Buget-"+y+"."+fmt, blob=new Blob([data],{type:mime});
  if(window.showSaveFilePicker){
    var acc={}; acc[mime]=["."+fmt];
    window.showSaveFilePicker({suggestedName:name, types:[{description:fmt==="ods"?"LibreOffice / OpenOffice":"Excel",accept:acc}]})
      .then(function(h){ return h.createWritable().then(function(w){ return w.write(blob).then(function(){ return w.close(); }); }); })
      .then(function(){ toast("Salvat: "+name+" ✅"); })
      .catch(function(e){ if(e && e.name!=="AbortError") alertBox("Nu am putut salva fișierul: "+esc(e.message)); });
  } else {
    var a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove();
    toast("Fișierul "+name+" a fost descărcat");
  }
}
