// Buget Familie — stats.js (Yearly statistics)

var STAT_SECTIONS=["evo","cats","inc","table","years"];

// Every module has its own year (STY), the current year unless changed with the chips in its title;
// the cards at the top follow the year chosen next to the page title.
var STY={};
function statYear(k){ var y=STY[k]||String(new Date().getFullYear()); return yearsWithData().indexOf(y)>=0 || !yearsWithData().length ? y : yearsWithData()[yearsWithData().length-1]; }
function setStatYear(k, y){ STY[k]=String(y); render(); }
function yearChips(k){
  var cur=statYear(k);
  return '<span class="ychips sp">'+yearsWithData().map(function(y){ return '<span class="chip'+(y===cur?' on':'')+'" onclick="setStatYear(\''+k+'\','+y+')">'+y+'</span>'; }).join("")+'</span>';
}
// everything a module needs about one year
function yearData(y){
  var ms=monthsOfYear(y), bal=balances();
  var active=ms.filter(function(m){ return bal[m] && (bal[m].inc||bal[m].exp); });
  var yExp=D.expenses.filter(function(e){ return e.month.slice(0,4)===y; });
  var yInc=D.incomes.filter(function(e){ return e.month.slice(0,4)===y; });
  var days=0; active.forEach(function(m){ days += m===curYM() ? new Date().getDate() : daysIn(m); });   // the current month only up to today
  return {y:y, ms:ms, bal:bal, active:active, yExp:yExp, yExpIn:yExp.filter(function(e){ return !isOutside(e.cat); }), yInc:yInc, n:active.length||1, lastM:active[active.length-1], days:days||1};
}
function noData(y){ return '<div class="empty" style="padding:18px 0">Nu ai date pentru '+y+'.</div>'; }
function renderStats(){
  var y=String(S.year), d=yearData(y);
  var h=pageHead("Statistici", "Anul "+y+(d.active.length?" · "+d.active.length+" luni cu date":""), yearPicker());

  // the cards follow the "earned income only" switch of the monthly evolution module
  if(d.active.length){
    var tInc=sum(d.yInc), tExp=sum(d.yExpIn), n=d.n, lastM=d.lastM, bal=d.bal;
    var inBase = EVO.earned ? sum(d.yInc.filter(isEarned)) : tInc;
    var saveRate = inBase ? Math.round((inBase-tExp)/inBase*100) : 0;
    h+='<div class="g g4" data-k="cards">'+
      card("fa-arrow-down",(EVO.earned?"Câștigat ":"Încasări ")+y,money0(inBase),"pos","medie "+money0(inBase/n)+" / lună"+(EVO.earned?" · fără împrumuturi":""))+
      card("fa-arrow-up","Cheltuieli "+y,money0(tExp),"","medie "+money0(tExp/n)+" / lună")+
      card("fa-percent",EVO.earned?"Rămas din câștig":"Rămas din încasări",saveRate+"%",saveRate>=0?"pos":"neg",(inBase-tExp>=0?"":"−")+money0(Math.abs(inBase-tExp))+" în "+n+" luni"+(inBase-tExp<0?(EVO.earned?" (peste ce ai câștigat)":" (peste încasări)"):""))+
      card("fa-piggy-bank",y===String(new Date().getFullYear())?"Disponibil acum":"Disponibil la final",money(bal[lastM].end),bal[lastM].end>=0?"pos":"neg","la final de "+LUNI[+lastM.slice(5,7)-1])+
    '</div>';
  } else h+='<div class="c empty" data-k="cards"><i class="fas fa-chart-column"></i>Nu ai date pentru '+y+'.</div>';

  var ys=yearsWithData().filter(function(yy){ return D.expenses.some(function(e){return e.month.slice(0,4)===yy;}); });
  var E=yearData(statYear("evo")), C=yearData(statYear("cats")), I=yearData(statYear("inc")), T=yearData(statYear("table"));
  var SEC={
    evo:'<div class="c"><div class="ct"><i class="fas fa-chart-column"></i> Evoluție lunară '+E.y+' — '+(EVO.earned?'cât ai câștigat și cât ai cheltuit':'câți bani ai avut și cât ai cheltuit')+yearChips("evo")+
      '<label class="sw" title="Compară cheltuielile doar cu banii câștigați"><input type="checkbox"'+(EVO.earned?' checked':'')+' onchange="EVO.earned=this.checked;render()"><span class="sl"></span><span class="swl">Doar venitul câștigat</span></label></div>'+
      (E.active.length ? (EVO.earned?monthEarned(E.ms,E.bal,E.lastM,E.yInc):monthFlow(E.ms,E.bal,E.lastM)) : noData(E.y))+'</div>',
    cats:'<div class="c"><div class="ct"><i class="fas fa-tags"></i> Cheltuieli pe categorii — '+C.y+yearChips("cats")+'</div>'+(C.yExp.length?catTotals(C.yExp,C.n,C.days):noData(C.y))+'</div>',
    inc: INCV.by==="years"
      ? '<div class="c"><div class="ct"><i class="fas fa-wallet"></i> Încasări — luna cu luna, an de an</div>'+incomeByYears()+'</div>'
      : '<div class="c"><div class="ct"><i class="fas fa-wallet"></i> Încasări pe luni — '+I.y+yearChips("inc")+'</div>'+(I.yInc.length?incomeByMonth(I.ms,I.yInc):noData(I.y))+'</div>',
    table:'<div class="c"><div class="ct"><i class="fas fa-table"></i> Tabel anual pe categorii — '+T.y+yearChips("table")+'</div>'+(T.yExp.length?annualTable(T.y,T.ms,T.yExp):noData(T.y))+'</div>',
    years: ys.length>1 ? '<div class="c"><div class="ct"><i class="fas fa-code-compare"></i> Comparație între ani — cheltuieli pe lună</div><div class="ch"><canvas id="sYears"></canvas></div></div>' : ''
  };
  h+=STAT_SECTIONS.filter(function(k){return SEC[k];}).map(function(k){ return SEC[k].replace('<div class="c">','<div class="c" data-k="'+k+'">'); }).join("");

  document.getElementById("pg").innerHTML=h;

  if(INCV.by==="years") drawIncYears();
  if(ys.length>1){
    var bal2=balances(), ypal=["#a0a0a0","#4a9eff","#6fbf4c","#e6b422","#e07c4c"];
    mkChart("sYears",{type:"line",data:{labels:LUNI.map(function(l){return l.slice(0,3);}),datasets:ys.map(function(yy,i){
      return {label:yy,data:monthsOfYear(yy).map(function(m){ var b=bal2[m]; return b&&b.exp?b.exp:null; }),borderColor:ypal[(ypal.length-ys.length+i)%ypal.length],backgroundColor:ypal[(ypal.length-ys.length+i)%ypal.length],tension:.3,borderWidth:yy===y?3:1.5};
    })},options:{plugins:{legend:{labels:{boxWidth:10}}},scales:{y:{ticks:moneyTicks()},x:{grid:{display:false}}}}});
  }
}

// "Earned income only" switch: off by default (shows the month's money including carry-over)
var EVO={earned:false};
var NOT_EARNED=["imprumut","rata","credit","vanzare"];   // income types that are not earnings
function isEarned(e){ var k=normKey(e.type); return !NOT_EARNED.some(function(x){ return k.indexOf(x)===0; }); }

// Per month: earned income (salary, vouchers, tips, bees, allowance… no loans, no carry-over) vs. spending
function monthEarned(ms, bal, lastM, yInc){
  var excl={}; yInc.forEach(function(e){ if(!isEarned(e)) excl[e.type]=1; });
  var h='<div class="mf2"><div class="mfr hd"><span>Luna</span><span class="n">Câștigat</span><span>Cât ai cheltuit din câștig</span><span class="n">Cheltuit</span><span class="n">Diferență</span></div>';
  var tE=0, tX=0, over=[];
  ms.forEach(function(m){
    var b=bal[m]; if(!b || m>lastM){ h+='<div class="mfr off"><span>'+LUNI[+m.slice(5,7)-1]+'</span><span class="n mut">—</span><span></span><span class="n mut">—</span><span class="n mut">—</span></div>'; return; }
    var earned=r2(sum(yInc.filter(function(e){ return e.month===m && isEarned(e); })));
    var d=r2(earned-b.exp), p=earned>0?b.exp/earned*100:(b.exp?999:0), cls=p>100?"over":(p>=90?"warn":"ok");
    tE+=earned; tX+=b.exp; if(d<0) over.push(LUNI[+m.slice(5,7)-1]);
    h+='<div class="mfr"><span><b>'+LUNI[+m.slice(5,7)-1]+'</b></span>'+
      '<span class="n">'+money0(earned)+'</span>'+
      '<span class="mfb"><span class="mfbar"><span class="'+cls+'" style="width:'+Math.min(100,p)+'%"></span></span><span class="mfp '+cls+'">'+(p>=999?"—":Math.round(p)+"%")+'</span></span>'+
      '<span class="n">'+money0(b.exp)+'</span>'+
      '<span class="n '+(d>=0?"pos":"neg")+'"><b>'+(d>=0?"+":"−")+money0(Math.abs(d))+'</b></span></div>';
  });
  var D2=tE-tX;
  h+='<div class="mfr" style="border-top:2px solid var(--gold);border-bottom:none"><span><b>TOTAL</b></span><span class="n"><b>'+money0(tE)+'</b></span><span class="mut" style="font-size:.78rem">'+(over.length?'Ai cheltuit peste câștig în '+over.length+' luni: '+over.join(", "):'Nicio lună peste câștig')+'</span><span class="n"><b>'+money0(tX)+'</b></span><span class="n '+(D2>=0?"pos":"neg")+'"><b>'+(D2>=0?"+":"−")+money0(Math.abs(D2))+'</b></span></div>';
  return h+'</div><div class="mfl"><span><i class="ok"></i> sub 90% din câștig</span><span><i class="warn"></i> 90–100%</span><span><i class="over"></i> ai cheltuit mai mult decât ai câștigat</span>'+
    '<span class="mut">Fără suma reportată'+(Object.keys(excl).length?' și fără: '+Object.keys(excl).map(esc).join(", "):' și fără împrumuturi')+'.</span></div>';
}

// Per month: available money (receipts + carry-over), spent, left over, with a "% spent" bar
function monthFlow(ms, bal, lastM){
  var h='<div class="mf2"><div class="mfr hd"><span>Luna</span><span class="n">Bani în lună</span><span>Cât ai cheltuit din ei</span><span class="n">Cheltuit</span><span class="n">Rămas</span></div>';
  ms.forEach(function(m){
    var b=bal[m]; if(!b || m>lastM){ h+='<div class="mfr off"><span>'+LUNI[+m.slice(5,7)-1]+'</span><span class="n mut">—</span><span></span><span class="n mut">—</span><span class="n mut">—</span></div>'; return; }
    var av=r2(b.start+b.inc), p=av>0?b.exp/av*100:(b.exp?100:0), cls=p>100?"over":(p>=90?"warn":"ok");
    h+='<div class="mfr"><span><b>'+LUNI[+m.slice(5,7)-1]+'</b></span>'+
      '<span class="n" title="încasări '+money(b.inc)+' + reportat '+money(b.start)+'">'+money0(av)+'</span>'+
      '<span class="mfb"><span class="mfbar"><span class="'+cls+'" style="width:'+Math.min(100,p)+'%"></span></span><span class="mfp '+cls+'">'+Math.round(p)+'%</span></span>'+
      '<span class="n">'+money0(b.exp)+'</span>'+
      '<span class="n '+(b.end>=0?"pos":"neg")+'"><b>'+(b.end>=0?"+":"")+money0(b.end)+'</b></span></div>';
  });
  return h+'</div><div class="mfl"><span><i class="ok"></i> sub 90% cheltuit</span><span><i class="warn"></i> 90–100%</span><span><i class="over"></i> ai cheltuit mai mult decât ai avut</span><span class="mut">„Bani în lună” = încasări + ce a rămas din luna trecută. „Rămas” trece în luna următoare.</span></div>';
}

// percentage with one decimal below 1% (so 0.4% is not shown as 0%)
function pctFine(a,b){ if(!b) return ""; var p=a/b*100; return p<1 ? NF2.format(Math.round(p*10)/10).replace(/0$/,"").replace(/,$/,"")+"%" : Math.round(p)+"%"; }

// Total per category, with a bar and share of the total
var CATOPEN={};   // expanded categories (subcategories visible)
function catTotals(yExp, n, days){
  days=days||30;
  var bc=byCat(yExp), ids=Object.keys(bc).filter(function(i){ return bc[i]>0; }).sort(function(a,b){return bc[b]-bc[a];});
  var tot=0; ids.forEach(function(i){ if(!isOutside(i)) tot+=bc[i]; });
  var max=bc[ids[0]]||1, allOpen=ids.every(function(i){return CATOPEN[i];});
  return '<div class="br" style="margin:-4px 0 8px"><button class="btn sm gh" onclick="toggleAllCats('+(allOpen?'false':'true')+')"><i class="fas fa-'+(allOpen?'compress':'expand')+'"></i> '+(allOpen?'Închide toate':'Deschide toate subcategoriile')+'</button><span class="hint" style="margin:0">Click pe o categorie ca să vezi subcategoriile ei.</span></div>'+
    '<div class="ctl">'+ids.map(function(i){
    var c=cat(i), v=bc[i], open=!!CATOPEN[i];
    var h='<div class="ctr clk'+(c.outside?' out':'')+(open?' open':'')+'" onclick="CATOPEN[\''+i+'\']=!CATOPEN[\''+i+'\'];render()">'+catIco(c,26)+'<span class="nm"><i class="fas fa-chevron-'+(open?'down':'right')+' chev"></i>'+esc(c.name)+(c.outside?' <span class="bg gm">separat</span>':'')+'</span>'+
      '<div class="ctb"><div style="width:'+(v/max*100)+'%;background:'+c.color+'"></div></div>'+
      '<span class="pc2">'+(c.outside?'':pctFine(v,tot))+'</span><span class="vv">'+money(v)+'</span><span class="md">'+money0(v/n)+'/lună</span><span class="md dz">'+money0(v/days)+'/zi</span></div>';
    if(open){
      var subs=subTotals(c, yExp.filter(function(e){return e.cat===i;}));
      var smax=Math.max.apply(null,subs.map(function(r){return r.t;}).concat([1]));
      h+='<div class="subl">'+subs.map(function(r){
        var months={}; yExp.forEach(function(e){ if(e.cat===i && (e.sub||e.desc||"")===r.k) months[e.month]=1; });
        return '<div class="ctr sub"><span></span><span class="nm">'+(r.k?esc(r.k):'<span class="mut">fără subcategorie</span>')+'<span class="hint" style="display:inline;margin-left:6px">'+Object.keys(months).length+' luni</span></span>'+
          '<div class="ctb"><div style="width:'+(r.t/smax*100)+'%;background:'+hexA(c.color,.65)+'"></div></div>'+
          '<span class="pc2" title="din '+esc(c.name)+'">'+pctFine(r.t,v)+'</span><span class="vv">'+money(r.t)+'</span><span class="md">'+money0(r.t/n)+'/lună</span><span class="md dz">'+money0(r.t/days)+'/zi</span></div>';
      }).join("")+'</div>';
    }
    return h;
  }).join("")+'<div class="ctr tot"><span class="nm"><b>TOTAL</b></span><div class="ctb" style="background:none"></div><span class="pc2"></span><span class="vv">'+money(tot)+'</span><span class="md">'+money0(tot/n)+'/lună</span><span class="md dz">'+money0(tot/days)+'/zi</span></div></div>'+
    '<span class="hint">Media pe zi e pe '+days+' zile (lunile cu date; luna curentă doar până azi).</span>';
}
function toggleAllCats(on){ D.cats.forEach(function(c){ CATOPEN[c.id]=on; }); render(); }

// Monthly receipts by person or by type (salary, tips, bees…), for everyone or one person
var INCV={by:"people", person:""};
function incomeByMonth(ms, yInc){
  var people=D.settings.people.filter(function(p){ return yInc.some(function(e){return e.person===p;}); });
  yInc.forEach(function(e){ if(e.person && people.indexOf(e.person)<0) people.push(e.person); });
  if(INCV.person && people.indexOf(INCV.person)<0) INCV.person="";
  var list = INCV.person ? yInc.filter(function(e){return e.person===INCV.person;}) : yInc;
  var who = INCV.by==="types" ? function(e){ return e.type||"Altele"; } : function(e){ return e.person || (e.type||"Altele"); };
  var cols=[];
  if(INCV.by==="types") D.settings.incomeTypes.forEach(function(t){ if(list.some(function(e){return e.type===t;})) cols.push(t); });
  else people.forEach(function(p){ cols.push(p); });
  list.forEach(function(e){ var k=who(e); if(cols.indexOf(k)<0) cols.push(k); });
  var cell={}, colT={}, tot=0, nAct=0;
  list.forEach(function(e){ var k=e.month+"|"+who(e); cell[k]=(cell[k]||0)+e.amount; colT[who(e)]=(colT[who(e)]||0)+e.amount; tot+=e.amount; });
  var isP=function(k){ return INCV.by!=="types" && people.indexOf(k)>=0; };

  var h=incTools(people);
  if(!list.length) return h+'<div class="empty">Nicio încasare.</div>';
  h+='<div class="tw"><table class="rt"><thead><tr><th>Luna</th>'+cols.map(function(k){
      return '<th class="n" style="text-align:right;white-space:nowrap">'+(isP(k)?avatar(k,22)+' ':'')+esc(k)+'</th>';
    }).join("")+'<th class="n" style="text-align:right">Total'+(INCV.person?' '+esc(INCV.person):'')+'</th></tr></thead><tbody>';
  ms.forEach(function(m){
    var rt=0, cells=cols.map(function(k){ var v=cell[m+"|"+k]||0; rt+=v; return '<td class="n">'+(v?money(v):'<span class="mut">—</span>')+'</td>'; }).join("");
    if(rt) nAct++;
    h+='<tr><td>'+LUNI[+m.slice(5,7)-1]+'</td>'+cells+'<td class="n"><b>'+(rt?money(rt):'<span class="mut">—</span>')+'</b></td></tr>';
  });
  h+='</tbody><tfoot><tr><td>TOTAL</td>'+cols.map(function(k){ return '<td class="n">'+money(colT[k]||0)+'</td>'; }).join("")+'<td class="n">'+money(tot)+'</td></tr>'+
    '<tr><td class="mut" style="font-weight:400;border-top:none">Medie / lună</td>'+cols.map(function(k){ return '<td class="n mut" style="font-weight:400;border-top:none">'+money0((colT[k]||0)/(nAct||1))+'</td>'; }).join("")+'<td class="n mut" style="font-weight:400;border-top:none">'+money0(tot/(nAct||1))+'</td></tr>'+
    '<tr><td class="mut" style="font-weight:400;border-top:none">% din total</td>'+cols.map(function(k){ return '<td class="n mut" style="font-weight:400;border-top:none">'+pct(colT[k]||0,tot)+'%</td>'; }).join("")+'<td class="n mut" style="font-weight:400;border-top:none">100%</td></tr></tfoot></table></div>'+
    '<span class="hint">Doar încasările, fără suma reportată. Alege o persoană ca să vezi cât a câștigat din fiecare sursă.</span>';
  return h;
}

// "Compară anii": one row per month, one column per year — for everyone or for one person.
// The same switch and the same person chips as the other views, in the same module.
function incTools(people){
  return '<div class="tools" style="margin-bottom:10px">'+
    '<div class="seg"><button class="'+(INCV.by==="people"?"on":"")+'" onclick="INCV.by=\'people\';render()"><i class="fas fa-users"></i> Pe persoane</button>'+
    '<button class="'+(INCV.by==="types"?"on":"")+'" onclick="INCV.by=\'types\';render()"><i class="fas fa-list"></i> Pe tipuri</button>'+
    '<button class="'+(INCV.by==="years"?"on":"")+'" onclick="INCV.by=\'years\';render()" title="Aceeași lună, an după an"><i class="fas fa-code-compare"></i> Compară anii</button></div>'+
    '<div class="chips"><span class="chip'+(!INCV.person?' on':'')+'" onclick="INCV.person=\'\';render()">Toți</span>'+people.map(function(p){
      return '<span class="chip pchip'+(INCV.person===p?' on':'')+'" onclick="INCV.person=\''+esc(p).replace(/'/g,"\\'")+'\';if(INCV.by===\'people\')INCV.by=\'types\';render()">'+avatar(p,22)+' '+esc(p)+'</span>';
    }).join("")+'</div></div>';
}
function incomeByYears(){
  var people=[]; D.settings.people.forEach(function(p){ if(D.incomes.some(function(e){return e.person===p;})) people.push(p); });
  D.incomes.forEach(function(e){ if(e.person && people.indexOf(e.person)<0) people.push(e.person); });
  if(INCV.person && people.indexOf(INCV.person)<0) INCV.person="";
  var list = INCV.person ? D.incomes.filter(function(e){ return e.person===INCV.person; }) : D.incomes;
  var h=incTools(people);
  if(!list.length) return h+'<div class="empty">Nicio încasare'+(INCV.person?' pentru '+esc(INCV.person):'')+'.</div>';

  var ys=[]; list.forEach(function(e){ var y=e.month.slice(0,4); if(ys.indexOf(y)<0) ys.push(y); }); ys.sort();
  var cell={}, colT={}, rowT={}, tot=0, nM={};
  list.forEach(function(e){ var y=e.month.slice(0,4), mi=+e.month.slice(5,7)-1, k=mi+"|"+y;
    cell[k]=(cell[k]||0)+e.amount; colT[y]=(colT[y]||0)+e.amount; rowT[mi]=(rowT[mi]||0)+e.amount; tot+=e.amount; nM[y]=nM[y]||{}; nM[y][mi]=1; });
  var max=0; Object.keys(cell).forEach(function(k){ if(cell[k]>max) max=cell[k]; });

  var cy=String(new Date().getFullYear());
  h+='<div class="tw"><table class="rt yrs"><thead><tr><th>Luna</th>'+ys.map(function(y){ return '<th class="n" style="text-align:right'+(y===cy?';color:var(--gold)':'')+'">'+y+'</th>'; }).join("")+
    '</tr></thead><tbody>';
  LUNI.forEach(function(l,mi){
    h+='<tr><td style="white-space:nowrap">'+l+'</td>'+ys.map(function(y){
      var v=cell[mi+"|"+y]||0, pv=cell[mi+"|"+(+y-1)]||0, a=max?Math.min(.5,v/max*.5):0, d="";
      if(v && pv){ var g=Math.round((v-pv)/pv*100); d='<span class="yoy '+(g>0?"up":g<0?"dn":"")+'">'+(g>0?"+":g<0?"−":"")+Math.abs(g)+'%</span>'; }
      return '<td class="n" style="background:'+(v?hexA("#6fbf4c",a+.04):"transparent")+'" title="'+l+' '+y+(v&&pv?' — față de '+l+' '+(+y-1):'')+'">'+(v?NF0.format(Math.round(v))+d:'<span class="mut">·</span>')+'</td>';
    }).join("")+'</tr>';
  });
  h+='</tbody><tfoot><tr><td>TOTAL AN</td>'+ys.map(function(y){
      var v=colT[y]||0, pv=colT[String(+y-1)]||0, d="";
      if(v && pv){ var g=Math.round((v-pv)/pv*100); d='<span class="yoy '+(g>0?"up":g<0?"dn":"")+'">'+(g>0?"+":g<0?"−":"")+Math.abs(g)+'%</span>'; }
      return '<td class="n">'+NF0.format(Math.round(v))+d+'</td>'; }).join("")+'</tr>'+
    '<tr><td class="mut" style="font-weight:400;border-top:none">Medie / lună</td>'+ys.map(function(y){ var c=Object.keys(nM[y]||{}).length||1;
      return '<td class="n mut" style="font-weight:400;border-top:none">'+NF0.format(Math.round((colT[y]||0)/c))+'</td>'; }).join("")+'</tr></tfoot></table></div>'+
    '<div class="ch" style="margin-top:12px"><canvas id="sIncY"></canvas></div>'+
    '<span class="hint">Sub fiecare sumă vezi cu cât a crescut sau a scăzut față de aceeași lună din anul dinainte. Fiecare lună, an după an'+(INCV.person?' — doar '+esc(INCV.person):' — toată familia')+'. Culoarea arată cât de mare e suma. „Medie” e pe anii în care luna aceea are încasări.</span>';
  return h;
}
function drawIncYears(){
  if(!document.getElementById("sIncY")) return;
  var list = INCV.person ? D.incomes.filter(function(e){ return e.person===INCV.person; }) : D.incomes;
  var ys=[]; list.forEach(function(e){ var y=e.month.slice(0,4); if(ys.indexOf(y)<0) ys.push(y); }); ys.sort();
  var cell={}; list.forEach(function(e){ var k=e.month.slice(0,4)+"|"+(+e.month.slice(5,7)-1); cell[k]=(cell[k]||0)+e.amount; });
  var pal=["#a0a0a0","#7c8cff","#4a9eff","#6fbf4c","#e6b422","#e07c4c"], cy=String(new Date().getFullYear());
  if(!ys.length) return;
  mkChart("sIncY",{type:"line",data:{labels:LUNI.map(function(l){return l.slice(0,3);}),datasets:ys.map(function(y,i){
    return {label:y, data:LUNI.map(function(_,mi){ return cell[y+"|"+mi]||null; }),
      borderColor:pal[(pal.length-ys.length+i+pal.length)%pal.length], backgroundColor:pal[(pal.length-ys.length+i+pal.length)%pal.length],
      tension:.3, borderWidth:y===cy?3:1.5, spanGaps:true};
  })},options:{plugins:{legend:{labels:{boxWidth:10}}},scales:{y:{ticks:moneyTicks()},x:{grid:{display:false}}}}});
}
function annualTable(y, ms, yExp){
  var grid={}, colT={}, maxV=0;
  yExp.forEach(function(e){ var k=e.cat+"/"+e.month; grid[k]=(grid[k]||0)+e.amount; });
  Object.keys(grid).forEach(function(k){ if(grid[k]>maxV && !isOutside(k.split("/")[0])) maxV=grid[k]; });
  var cats=D.cats.filter(function(c){ return yExp.some(function(e){return e.cat===c.id;}); });
  var h='<div class="tw"><table class="rt heat"><thead><tr><th>Categoria</th>'+ms.map(function(m){return '<th class="n" style="text-align:right">'+ymShort(m)+'</th>';}).join("")+'<th class="n" style="text-align:right">Total</th><th class="n" style="text-align:right">Medie</th></tr></thead><tbody>';
  var nAct=ms.filter(function(m){ return yExp.some(function(e){return e.month===m;}); }).length||1;
  cats.forEach(function(c){
    var t=0;
    h+='<tr'+(c.outside?' style="opacity:.6"':'')+'><td style="white-space:nowrap">'+catIco(c,22)+' '+esc(c.name)+'</td>'+ms.map(function(m){
      var v=grid[c.id+"/"+m]||0; t+=v; if(!c.outside) colT[m]=(colT[m]||0)+v;
      var b=budgetFor(m,c.id), over=b&&v>b;
      var a=maxV? Math.min(.55, v/maxV*.55):0;
      return '<td class="n" style="background:'+(v?hexA(over?"#e07c4c":"#e6b422",a+.04):"transparent")+'" title="'+esc(c.name)+' · '+ymLabel(m)+(b?' · buget '+money0(b):'')+'">'+(v?NF0.format(Math.round(v)):'<span class="mut">·</span>')+'</td>';
    }).join("")+'<td class="n"><b>'+NF0.format(Math.round(t))+'</b></td><td class="n mut">'+NF0.format(Math.round(t/nAct))+'</td></tr>';
  });
  var gt=0; ms.forEach(function(m){ gt+=colT[m]||0; });
  h+='</tbody><tfoot><tr><td>TOTAL</td>'+ms.map(function(m){return '<td class="n">'+(colT[m]?NF0.format(Math.round(colT[m])):'')+'</td>';}).join("")+'<td class="n">'+NF0.format(Math.round(gt))+'</td><td class="n">'+NF0.format(Math.round(gt/nAct))+'</td></tr></tfoot></table></div>'+
    '<span class="hint">Culoarea arată cât de mare e suma; '+(budgetOn()?'portocaliu = peste bugetul lunii. ':'')+'Categoriile estompate nu intră în total.</span>';
  return h;
}
