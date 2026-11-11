// Buget Familie — expenses.js (Expenses page)

var EXF = {view:"boxes", cat:"", q:"", scope:"month"};

function renderExpenses(){
  var ym=S.ym;
  var list = EXF.scope==="year" ? D.expenses.filter(function(e){return e.month.slice(0,4)===ym.slice(0,4);}) : D.expenses.filter(function(e){return e.month===ym;});
  var q=normKey(EXF.q);
  var filtered=list.filter(function(e){
    if(EXF.cat && e.cat!==EXF.cat) return false;
    if(q && normKey(cat(e.cat).name+" "+e.sub+" "+e.desc+" "+e.amount).indexOf(q)<0) return false;
    return true;
  });
  var tot=sum(filtered.filter(function(e){return !isOutside(e.cat);}));
  var h=pageHead("Cheltuieli", filtered.length+" înregistrări · total "+money(tot)+(EXF.scope==="year"?" în "+ym.slice(0,4):""),
    monthPicker()+'<button class="btn gh" onclick="openAdj()" title="Când banii din aplicație nu se potrivesc cu cei reali"><i class="fas fa-scale-balanced"></i> Reglare cont</button><button class="btn" onclick="openExpense()"><i class="fas fa-plus"></i> Cheltuială</button>');

  h+='<div class="tools">'+
    '<div class="seg"><button class="'+(EXF.view==="boxes"?"on":"")+'" onclick="EXF.view=\'boxes\';render()"><i class="fas fa-table-cells-large"></i> Pe categorii</button>'+
    '<button class="'+(EXF.view==="list"?"on":"")+'" onclick="EXF.view=\'list\';render()"><i class="fas fa-list"></i> Listă</button>'+
    '<button class="'+(EXF.view==="daily"?"on":"")+'" onclick="EXF.view=\'daily\';render()"><i class="fas fa-calendar-days"></i> Pe zile</button></div>'+
    '<div class="seg"><button class="'+(EXF.scope==="month"?"on":"")+'" onclick="EXF.scope=\'month\';render()">Luna</button><button class="'+(EXF.scope==="year"?"on":"")+'" onclick="EXF.scope=\'year\';render()">Tot anul</button></div>'+
    '<input id="exQ" placeholder="🔍 Caută (ex. Mol, haine, 120)" value="'+esc(EXF.q)+'" style="flex:1;max-width:320px">'+
    '<select onchange="EXF.cat=this.value;render()"><option value="">Toate categoriile</option>'+D.cats.map(function(c){return '<option value="'+c.id+'"'+(EXF.cat===c.id?' selected':'')+'>'+esc(c.name)+'</option>';}).join("")+'</select>'+
  '</div>';

  if(!filtered.length){ h+='<div class="c empty"><i class="fas fa-receipt"></i>Nicio cheltuială'+(EXF.q||EXF.cat?' pentru filtrul ales':' în '+ymLabel(ym))+'.</div>'; }
  else if(EXF.view==="boxes") h+=expBoxes(filtered);
  else if(EXF.view==="daily") h+=expDaily(filtered, ym);
  else h+=expList(filtered);
  h+=adjBox(ym);

  document.getElementById("pg").innerHTML=h;
  var qi=document.getElementById("exQ");
  qi.addEventListener("input",function(){ EXF.q=qi.value; clearTimeout(qi._t); qi._t=setTimeout(function(){ render(); var n=document.getElementById("exQ"); n.focus(); n.setSelectionRange(n.value.length,n.value.length); },250); });
}

function sortExp(a,b){ return (a.month<b.month?-1:a.month>b.month?1:0) || ((a.day||0)-(b.day||0)); }

// Category boxes, like the workbook layout (every card is placed on the page grid by makeLayout in ui.js)
function expBoxes(list){
  var groups={}; list.forEach(function(e){ (groups[e.cat]=groups[e.cat]||[]).push(e); });
  var ids=D.cats.map(function(c){return c.id;}).filter(function(id){return groups[id];});
  Object.keys(groups).forEach(function(k){ if(ids.indexOf(k)<0) ids.push(k); });
  var card=function(id){
    var c=cat(id), g=groups[id].slice().sort(sortExp), t=sum(g), b=EXF.scope==="month"?budgetFor(S.ym,id):0;
    return '<div class="box" data-cat="'+id+'"><div class="box-h">'+catIco(c)+'<span>'+esc(c.name)+(c.outside?' <span class="bg gm">separat</span>':'')+'</span><span class="t">'+money(t)+'</span></div>'+
      (b?'<div style="padding:0 13px 8px"><div class="gauge"><div class="gf '+(t>b?"over":(t/b<.8?"ok":""))+'" style="width:'+Math.min(100,t/b*100)+'%"></div></div><span class="hint">'+pct(t,b)+'% din '+money0(b)+'</span></div>':'')+
      '<div class="box-l">'+subTotals(c,g).map(function(r){
        return '<div class="box-r" onclick="showGroup(\''+id+'\',\''+encodeURIComponent(r.k).replace(/'/g,"%27")+'\')" title="Vezi, modifică sau șterge cheltuielile"><span class="x">'+(r.k?esc(r.k):'<span class="mut">fără subcategorie</span>')+'</span><span class="a">'+nf(r.t)+'</span><i class="fas fa-chevron-right mut" style="font-size:.65rem;margin-left:4px"></i></div>';
      }).join("")+'</div>'+
      '<div style="padding:8px 13px"><button class="btn sm gh" onclick="openExpense(null,{cat:\''+id+'\'})"><i class="fas fa-plus"></i> Adaugă<span class="bn"> în '+esc(c.name)+'</span></button></div></div>';
  };
  return '<div class="boxes">'+ids.map(card).join("")+'</div>';
}

// an expense saved from several receipts shows how many (the amounts are in the tooltip)
function partsTag(e){ return (e.parts&&e.parts.length>1) ? ' <span class="bg gb" title="'+e.parts.map(nf).join(" + ")+'">'+e.parts.length+' bonuri</span>' : ''; }
function expList(list){
  var rows=list.slice().sort(sortExp).reverse();
  return '<div class="c"><div class="tw"><table class="rt"><thead><tr><th>Data</th><th>Categoria</th><th>Subcategorie</th><th>Descriere</th><th class="n">Suma</th><th></th></tr></thead><tbody>'+
    rows.map(function(e){
      return '<tr><td class="mut">'+(e.day?pad2(e.day)+"."+e.month.slice(5,7)+"."+e.month.slice(0,4):ymShort(e.month)+" "+e.month.slice(0,4))+'</td><td>'+catIco(e.cat,24)+' '+esc(cat(e.cat).name)+'</td><td>'+esc(e.sub)+'</td><td class="mut">'+esc(e.desc)+partsTag(e)+'</td><td class="n"><b>'+money(e.amount)+'</b></td>'+
        '<td class="act"><button class="ib" onclick="openExpense(\''+e.id+'\')" title="Modifică"><i class="fas fa-pen"></i></button><button class="ib del" onclick="delExpense(\''+e.id+'\')" title="Șterge"><i class="fas fa-trash"></i></button></td></tr>';
    }).join("")+'</tbody><tfoot><tr><td colspan="4">TOTAL</td><td class="n">'+money(sum(rows))+'</td><td></td></tr></tfoot></table></div></div>';
}

// Per-day table, like the workbook's daily table (columns = categories/subcategories used)
function expDaily(list, ym){
  if(EXF.scope==="year") return '<div class="al ali">Vederea „Pe zile” arată o singură lună. Alege „Luna”.</div>';
  var cols={}, keyOf=function(e){ return e.cat+"|"+(e.sub||""); };
  list.forEach(function(e){ cols[keyOf(e)]=1; });
  var keys=Object.keys(cols).sort(function(a,b){
    var ia=D.cats.findIndex(function(c){return c.id===a.split("|")[0];}), ib=D.cats.findIndex(function(c){return c.id===b.split("|")[0];});
    return ia-ib || (a<b?-1:1);
  });
  var nd=daysIn(ym), grid={}, colTot={};
  list.forEach(function(e){ var k=keyOf(e), d=e.day||0; grid[d+"/"+k]=(grid[d+"/"+k]||0)+e.amount; colTot[k]=(colTot[k]||0)+e.amount; });
  var h='<div class="c"><div class="tw" style="max-height:72vh"><table class="rt heat"><thead><tr><th>Zi</th>'+keys.map(function(k){
    var p=k.split("|"); return '<th class="n" style="text-align:right"><span style="color:'+cat(p[0]).color+'">●</span> '+esc(p[1]||cat(p[0]).name)+'</th>';
  }).join("")+'<th class="n" style="text-align:right">Total zi</th></tr></thead><tbody>';
  var days=[]; for(var d=1;d<=nd;d++) days.push(d); if(list.some(function(e){return !e.day;})) days.push(0);
  days.forEach(function(d){
    var rt=0, cells=keys.map(function(k){ var v=grid[d+"/"+k]; if(v) rt+=v; return '<td class="n">'+(v?nf(v):'<span class="mut">·</span>')+'</td>'; }).join("");
    var wd=d? new Date(+ym.slice(0,4), +ym.slice(5,7)-1, d).getDay() : -1;
    h+='<tr'+(wd===0||wd===6?' style="background:rgba(230,180,34,.035)"':'')+'><td class="mut">'+(d?d:'fără zi')+'</td>'+cells+'<td class="n"><b>'+(rt?nf(rt):'')+'</b></td></tr>';
  });
  h+='</tbody><tfoot><tr><td>TOTAL</td>'+keys.map(function(k){return '<td class="n">'+nf(colTot[k])+'</td>';}).join("")+'<td class="n">'+nf(sum(list))+'</td></tr></tfoot></table></div></div>';
  return h;
}

// Totals per subcategory (or per description when there is none): one amount per row
function subTotals(c, list){
  var m={}, order=[];
  list.forEach(function(e){ var k=e.sub||e.desc||""; if(m[k]===undefined){ m[k]=0; order.push(k); } m[k]+=e.amount; });
  return order.map(function(k){ return {k:k, t:r2(m[k])}; }).sort(function(a,b){
    var ia=c.subs.indexOf(a.k), ib=c.subs.indexOf(b.k);
    if(ia>=0 && ib>=0) return ia-ib; if(ia>=0) return -1; if(ib>=0) return 1;
    if(!a.k) return 1; if(!b.k) return -1;
    return b.t-a.t;
  });
}

// Dialog listing the expenses of one subcategory, to edit or delete them
function showGroup(catId, keyEnc){
  var key=decodeURIComponent(keyEnc), c=cat(catId), ym=S.ym;
  var list=D.expenses.filter(function(e){
    var inScope = EXF.scope==="year" ? e.month.slice(0,4)===ym.slice(0,4) : e.month===ym;
    return inScope && e.cat===catId && (e.sub||e.desc||"")===key;
  }).sort(sortExp);
  if(!list.length){ closeModal(); return; }
  // possible duplicates: same day and same amount
  var seen={}, dup={};
  list.forEach(function(e){ var k=e.month+"/"+e.day+"/"+e.amount; if(seen[k]){ dup[k]=1; } seen[k]=1; });
  modal('<div class="mt">'+catIco(c)+' '+esc(c.name)+(key?' · '+esc(key):'')+'</div>'+
    '<p class="cs" style="margin-bottom:10px">'+(EXF.scope==="year"?"Anul "+ym.slice(0,4):ymLabel(ym))+' · '+list.length+' înregistrări · total <b>'+money(sum(list))+'</b></p>'+
    (Object.keys(dup).length?'<div class="al alw"><i class="fas fa-clone"></i> Unele cheltuieli apar de două ori (aceeași zi, aceeași sumă). Le-am marcat mai jos.</div>':'')+
    '<div class="tw" style="max-height:55vh"><table class="rt"><tbody>'+list.map(function(e){
      var isDup=dup[e.month+"/"+e.day+"/"+e.amount];
      return '<tr'+(isDup?' style="background:rgba(230,180,34,.08)"':'')+'><td class="mut" style="white-space:nowrap">'+dayLabel(e)+'</td><td>'+esc(e.desc||e.sub||"—")+partsTag(e)+(isDup?' <span class="bg gy">de 2 ori?</span>':'')+'</td><td class="n"><b>'+money(e.amount)+'</b></td>'+
        '<td class="act"><button class="ib" onclick="openExpense(\''+e.id+'\')" title="Modifică"><i class="fas fa-pen"></i></button>'+
        '<button class="ib del" onclick="delFromGroup(\''+e.id+'\',\''+catId+'\',\''+keyEnc+'\')" title="Șterge"><i class="fas fa-trash"></i></button></td></tr>';
    }).join("")+'</tbody></table></div>'+
    '<div class="mf"><button class="btn" onclick="closeModal()">Gata</button></div>', true);
}
function delFromGroup(id, catId, keyEnc){
  softDelete("Cheltuială ștearsă", function(){ D.expenses=D.expenses.filter(function(x){return x.id!==id;}); });
  showGroup(catId, keyEnc);
}

// The month's account adjustments (excluding automatic carry-over)
function adjBox(ym){
  var list=D.adjustments.filter(function(a){ return (EXF.scope==="year"?a.month.slice(0,4)===ym.slice(0,4):a.month===ym) && !isCarryAdj(a); });
  if(!list.length) return '';
  var t=0; list.forEach(function(a){ t+=a.amount; });
  return '<div class="c" style="margin-top:16px"><div class="ct"><i class="fas fa-scale-balanced"></i> Reglări cont<span class="sp '+(t<0?"neg":"pos")+'"><b>'+(t>0?"+":t<0?"−":"")+money(Math.abs(t))+'</b></span></div>'+
    '<div class="tw"><table class="rt"><tbody>'+list.map(function(a){
      return '<tr><td class="mut" style="width:90px">'+ymShort(a.month)+' '+a.month.slice(0,4)+'</td><td>'+esc(a.desc)+'</td><td class="n '+(a.amount<0?"neg":"pos")+'"><b>'+(a.amount>0?"+":"−")+money(Math.abs(a.amount))+'</b></td>'+
        '<td class="act"><button class="ib" onclick="openAdj(\''+a.id+'\')"><i class="fas fa-pen"></i></button><button class="ib del" onclick="delAdj(\''+a.id+'\')"><i class="fas fa-trash"></i></button></td></tr>';
    }).join("")+'</tbody></table></div><span class="hint">Minus = ai avut mai puțini bani decât arăta aplicația; plus = mai mulți. Nu intră la cheltuieli, doar corectează disponibilul.</span></div>';
}
