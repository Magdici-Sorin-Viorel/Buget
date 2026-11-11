// Buget Familie — savings.js (Savings and investments)
// Board with one column per investor; investments are dragged from "De împărțit" (unallocated) to a person.
// Each investment has deposits (mirrored as expenses under Investiții) and, from time to time, a real value
// typed from the broker. Profit = current value − money put in.

// the two used most come first; the rest are the platforms popular in Romania
var PLATFORMS=["Tradeville","Trading 212","XTB","Revolut","eToro","Interactive Brokers","BT Trade (BT Capital Partners)","BCR (George / Investiții)","BRK Financial Group","Raiffeisen Smart Investment","ING (fonduri)","Banca Transilvania (fonduri)","Fidelis / Tezaur (titluri de stat)"];
var CURRENCIES=["EUR","USD","GBP","CHF","HUF","PLN","CZK","SEK","NOK","DKK","CAD","AUD","JPY","TRY","MDL","CNY"];
var KIND_ICO={metal:"fa-ring", valuta:"fa-money-bill-wave", actiuni:"fa-chart-line", teren:"fa-mountain-sun", altele:"fa-box-archive"};
var NF4=new Intl.NumberFormat("ro-RO",{minimumFractionDigits:4,maximumFractionDigits:4});

var SAVV={view:"now", by:"people"};
function savTabs(){
  var ys=Object.keys(D.savingsHistory||{}).sort().reverse();
  var add=SAVV.view==="now"?'<button class="btn" onclick="openHolding()"><i class="fas fa-plus"></i> Investiție nouă</button>':'';
  if(!ys.length) return add;
  return '<div class="seg"><button class="'+(SAVV.view==="now"?"on":"")+'" onclick="SAVV.view=\'now\';render()">Acum</button>'+
    ys.map(function(y){ return '<button class="'+(SAVV.view===y?"on":"")+'" onclick="SAVV.view=\''+y+'\';render()">Final '+y+'</button>'; }).join("")+'</div>'+add;
}
function dmy(d){ return d ? d.split("-").reverse().join(".") : "—"; }

function renderSavings(){
  if(SAVV.view!=="now" && D.savingsHistory && D.savingsHistory[SAVV.view]) return renderSavingsHistory(SAVV.view);
  SAVV.view="now";
  var hs=D.savings.filter(hasHolding);
  var tVal=0, tInv=0, tReal=0; hs.forEach(function(x){ tVal+=holdingValue(x); tInv+=invested(x); });
  D.savings.forEach(function(x){ tReal+=realized(x); });
  var gain=r2(tVal-tInv+tReal);
  var h=pageHead("Economii","Investițiile familiei — ce are fiecare și profitul lui",savTabs());
  h+='<div class="g g4">'+
    valueCard(tVal, hs.length)+
    card("fa-hand-holding-dollar","Băgat în total",money(tInv),"","cât au costat cele pe care le ai acum")+
    card("fa-arrow-trend-"+(gain>=0?"up":"down"),"Profit / pierdere",(gain>=0?"+":"−")+money(Math.abs(gain)),gain>=0?"pos":"neg",(tInv?(gain>=0?"+":"−")+NF2.format(Math.abs(gain/tInv*100))+"%":"")+(tReal?" · din vânzări "+(tReal>=0?"+":"−")+money(Math.abs(tReal)):""))+
    rateCard()+
  '</div>';
  h+=investorsModule();
  h+=peopleModule();
  h+=boardModule();
  h+=dueModule();
  document.getElementById("pg").innerHTML=h;
  initBoard();
}

// ───── Due for update ─────
function dueModule(){
  var due=D.savings.filter(isDue);
  if(!due.length) return '';
  return '<div class="c" data-k="due"><div class="ct"><i class="fas fa-bell"></i> De actualizat<span class="mut" style="font-weight:400;font-size:.8rem">'+due.length+' investiții n-au mai fost actualizate de ceva vreme</span></div>'+
    '<div class="tw"><table class="rt due"><tbody>'+due.map(function(x){
      var lu=lastUpdate(x), bnr=qtyKind(x) && x.priceMode!=="manual" && bnrAvailable(x), man=qtyKind(x) && !bnr;
      var unit = unitName(x);
      return '<tr><td style="white-space:nowrap"><i class="fas '+KIND_ICO[x.kind]+'" style="color:var(--gold);width:18px"></i> <b>'+esc(x.name)+'</b>'+'</td>'+
        '<td class="mut" style="font-size:.8rem">ultima dată: '+(lu?dmy(lu):'niciodată')+'</td>'+
        '<td class="n">'+(bnr?'<span class="mut" style="font-size:.8rem">din cartonașul Curs</span>':
          '<input class="valin" id="du_'+x.id+'" inputmode="decimal" placeholder="'+(man?'preț '+(x.kind==="teren"?CUR_SIGN[x.priceCur||"RON"]:'lei')+'/'+esc(unit):'valoarea de acum')+'" style="width:150px"> '+(x.kind==="teren"?CUR_SIGN[x.priceCur||"RON"]:'lei'))+'</td>'+
        '<td class="act">'+(bnr?'<button class="btn sm" onclick="goRates()"><i class="fas fa-pen"></i> Scrie cursul</button>':'<button class="btn sm" onclick="dueSave(\''+x.id+'\')"><i class="fas fa-check"></i> Actualizează</button>')+
        ' <button class="btn sm gh" onclick="snooze(\''+x.id+'\')" title="Îmi amintește peste o lună">Amână</button></td></tr>';
    }).join("")+'</tbody></table></div><span class="hint">Scrie valoarea pe care o vezi acum în platformă (sau prețul de acum). Dacă nu vrei acum, apasă Amână.</span></div>';
}
function dueSave(id){
  var x=D.savings.find(function(s){return s.id===id;}), v=document.getElementById("du_"+id).value;
  if(v===""){ toast("Scrie valoarea"); return; }
  if(x.kind==="actiuni"||x.kind==="altele"){ x.vals=x.vals||[]; x.vals.push({date:todayISO(), value:r2(num(v)), ts:Date.now()}); }
  else { x.unitPrice=num(v); x.unitPriceDate=todayISO(); }
  delete x.snooze;
  if(save("Actualizat: "+x.name)) render();
}
function snooze(id){ var x=D.savings.find(function(s){return s.id===id;}); x.snooze=addMonthsISO(todayISO(),1); if(save("Amânat o lună")) render(); }

// ───── Allocation per person ─────
// h.alloc = {person: quantity} for metals / currencies (grams, euros…)
//         = {person: fraction of value} for stocks / other (e.g. one person holds 0.3 of a holding)
// Anything unallocated stays in "De împărțit". Each person's invested amount is proportional to their part.
function isQty(h){ return qtyKind(h); }
function allocOf(h){ if(!h.alloc) h.alloc={}; return h.alloc; }
function shares(h){
  var al=allocOf(h), val=holdingValue(h), inv=invested(h), ai=h.allocInv, m={}, usedInv=0;
  var invOf=function(p,frac){ var v=ai ? (ai[p]||0) : inv*frac; usedInv+=v; return r2(v); };
  if(isQty(h)){
    var tq=h.qty||0, used=0;
    Object.keys(al).forEach(function(p){ var q=al[p]||0; if(q<=0) return; used+=q; m[p]={qty:r2(q), value:r2(q*unitPrice(h)), frac:tq?q/tq:0}; m[p].inv=invOf(p,m[p].frac); });
    var rest=r2(tq-used), pInv=r2(Math.max(0,inv-usedInv));
    if(rest>0.0001 || (ai && pInv>0.005)) m[""]={qty:Math.max(0,rest), value:r2(Math.max(0,rest)*unitPrice(h)), inv:ai?pInv:(tq?r2(inv*rest/tq):0), frac:tq?Math.max(0,rest)/tq:0};
  } else {
    var usedF=0;
    Object.keys(al).forEach(function(p){ var f=al[p]||0; if(f<=0) return; usedF+=f; m[p]={qty:0, value:r2(val*f), frac:f}; m[p].inv=invOf(p,f); });
    var rf=Math.max(0,1-usedF), pInv2=r2(Math.max(0,inv-usedInv));
    if((rf>0.0001 && (val>0||inv>0)) || (ai && pInv2>0.005)) m[""]={qty:0, value:r2(val*rf), inv:ai?pInv2:r2(inv*rf), frac:rf};
  }
  return m;
}
function restOf(h){ var s=shares(h)[""]; return s||null; }
function investors(){
  var list=(D.settings.investors||D.settings.people).slice();
  D.savings.forEach(function(h){ Object.keys(h.alloc||{}).forEach(function(p){ if(p && h.alloc[p]>0 && list.indexOf(p)<0) list.push(p); }); });
  return list;
}
function personTotals(){
  var t={};
  D.savings.forEach(function(h){ if(!hasHolding(h)) return; var sh=shares(h);
    Object.keys(sh).forEach(function(p){ var r=t[p]=t[p]||{inv:0,value:0,y:0}; r.inv+=sh[p].inv; r.value+=sh[p].value; });
  });
  D.savings.forEach(function(h){ (h.sales||[]).forEach(function(q){ var r=t[q.person]=t[q.person]||{inv:0,value:0,y:0}; r.real=r2((r.real||0)+(q.received||0)-(q.cost||0)); r.sold=r2((r.sold||0)+(q.cost||0)); }); });
  var y=String(new Date().getFullYear());
  D.savings.forEach(function(h){ (h.txs||[]).forEach(function(t2){ if(!t2.initial && t2.payer && (t2.date||"").slice(0,4)===y){ (t[t2.payer]=t[t2.payer]||{inv:0,value:0,y:0}).y+=t2.amount; } }); });
  return t;
}

// Investors (board columns)
function investorsModule(){
  var inv=investors();
  return '<div class="c" data-k="investors"><div class="ct"><i class="fas fa-user-plus"></i> Cine investește</div><div class="chips">'+
    inv.map(function(p){ return '<span class="chip on pchip" style="cursor:default">'+avatar(p,24)+' '+esc(p)+' <i class="fas fa-xmark" style="cursor:pointer;opacity:.7;margin-left:4px" title="Scoate" onclick="delInvestor(\''+esc(p).replace(/'/g,"\\'")+'\')"></i></span>'; }).join("")+
    '<span class="chip" onclick="addInvestor()"><i class="fas fa-plus"></i> Adaugă</span></div></div>';
}
function addInvestor(){
  var inv=investors(), free=D.settings.people.filter(function(p){return inv.indexOf(p)<0;});
  modal('<div class="mt"><i class="fas fa-user-plus"></i> Cine mai investește</div>'+
    (free.length?'<label class="L">Din familie</label><div class="chips">'+free.map(function(p){ return '<span class="chip pchip" onclick="saveInvestor(\''+esc(p).replace(/'/g,"\\'")+'\')">'+avatar(p,24)+' '+esc(p)+'</span>'; }).join("")+'</div>':'')+
    '<label class="L">Sau alt nume</label><div class="r2"><input id="invN" placeholder="ex. Andrei" autofocus><button class="btn" onclick="saveInvestor(document.getElementById(\'invN\').value)"><i class="fas fa-check"></i> Adaugă</button></div>'+
    '<span class="hint">Persoanele noi le poți adăuga cu poză din Setări → Persoane.</span>');
  document.getElementById("invN").addEventListener("keydown",function(e){ if(e.key==="Enter") saveInvestor(this.value); });
}
function saveInvestor(n){
  n=String(n||"").trim(); if(!n){ toast("Scrie numele"); return; }
  var inv=investors(); if(inv.indexOf(n)<0) inv.push(n);
  D.settings.investors=inv;
  if(D.settings.people.indexOf(n)<0) D.settings.people.push(n);
  if(save(n+" a fost adăugat")){ closeModal(); render(); }
}
function delInvestor(p){
  var has=D.savings.some(function(h){ return (h.alloc||{})[p]>0; });
  var doIt=function(){ softDelete(p+" scos din investitori",function(){ D.settings.investors=investors().filter(function(x){return x!==p;}); D.savings.forEach(function(h){ if(h.alloc) delete h.alloc[p]; if(h.allocInv) delete h.allocInv[p]; }); }); };
  if(has) confirmBox("<b>"+esc(p)+"</b> are părți din investiții. Dacă îl scoți, părțile lui trec înapoi la „De împărțit”. Continui?",doIt,"Da, scoate");
  else doIt();
}

// Summary: each person's holdings, money put in, profit, plus the family total
function peopleModule(){
  var t=personTotals(), ps=investors().filter(function(p){return t[p];});
  if(t[""]) ps.push("");
  if(!ps.length) return '';
  var ti=0, tv=0, ty=0, tr=0, ts=0; ps.forEach(function(p){ ti+=t[p].inv; tv+=t[p].value; ty+=t[p].y; tr+=t[p].real||0; ts+=t[p].sold||0; });
  // profit = (value now − what it cost) + profit already taken out by selling
  var row=function(label, r, bold){ var g=r2(r.value-r.inv+(r.real||0));
    return '<tr'+(bold?' style="font-weight:800"':'')+'><td>'+label+'</td><td class="n">'+money(r.inv)+'</td><td class="n">'+(r.y?money(r.y):'<span class="mut">—</span>')+'</td><td class="n"><b>'+money(r.value)+'</b></td>'+
      '<td class="n"><b class="'+(g>=0?"pos":"neg")+'">'+(g>=0?"+":"−")+money(Math.abs(g))+'</b>'+(r.real?'<div class="hint" style="margin:0;font-size:.72rem">din vânzări '+(r.real>=0?"+":"−")+money(Math.abs(r.real))+'</div>':'')+'</td><td class="n '+(g>=0?"pos":"neg")+'">'+((r.inv+(r.sold||0))?(g>=0?"+":"−")+NF2.format(Math.abs(g/(r.inv+(r.sold||0))*100))+"%":"")+'</td></tr>'; };   // % of everything it cost, sold parts included
  return '<div class="c" data-k="people"><div class="ct"><i class="fas fa-users"></i> Cât are fiecare și profitul lui</div>'+
    '<div class="tw"><table class="rt"><thead><tr><th>Persoana</th><th class="n" style="text-align:right">A băgat</th><th class="n" style="text-align:right">Depuneri '+new Date().getFullYear()+'</th><th class="n" style="text-align:right">Valoarea părții lui</th><th class="n" style="text-align:right">Profit / pierdere</th><th class="n" style="text-align:right">%</th></tr></thead><tbody>'+
    ps.map(function(p){ return row(p?avatar(p,24)+' '+esc(p):'<i class="fas fa-inbox"></i> De împărțit', t[p]); }).join("")+'</tbody><tfoot>'+row('<i class="fas fa-people-roof"></i> FAMILIA',{inv:ti,value:tv,y:ty,real:tr,sold:ts},true)+'</tfoot></table></div></div>';
}

// Board: "De împărțit" (unallocated) plus one column per investor
function boardModule(){
  var hs=D.savings.filter(function(x){ return hasHolding(x) || x.created===todayISO(); });
  var h='<div class="c" data-k="board"><div class="ct"><i class="fas fa-layer-group"></i> Cine ce are<span class="mut" style="font-weight:400;font-size:.8rem">trage o investiție (de ⠿) în coloana cuiva; sumele și gramele le poți schimba oricând</span></div>';
  if(!hs.length) return h+'<div class="empty"><i class="fas fa-coins"></i>Nicio investiție încă. Apasă „Investiție nouă”.</div></div>';
  var lane=function(p, cards, head){ return '<div class="lane'+(p===""?' pool':'')+'" data-owner="'+esc(p)+'">'+head+'<div class="lane-b">'+cards+'<div class="lane-empty">'+(cards?'':'Trage aici')+'</div></div></div>'; };
  // unallocated pool
  var poolCards=hs.map(function(x){ var r=restOf(x); if((!r || !(r.value>0.005||r.qty>0)) && hasHolding(x)) return ""; if(!r) r={qty:x.qty||0,value:holdingValue(x),inv:invested(x)};
    return '<div class="pcard sm" data-id="'+x.id+'" data-from=""><span class="grip3"><i class="fas fa-grip-vertical"></i></span>'+
      '<div class="pc-top"><i class="fas '+KIND_ICO[x.kind]+'"></i><b class="pc-n" onclick="showHolding(\''+x.id+'\')">'+esc(x.name)+(isDue(x)?' <span class="bg gy">!</span>':'')+'</b>'+
        '<b class="pc-v">'+(x.kind==="teren"?landMoney(x,r.value):money0(r.value))+'</b></div>'+
      (x.kind==="teren"?landEdit(x,r.qty,r.value,null):'<div class="pc-edit"><input class="valin" inputmode="decimal" value="'+String(isQty(x)?r.qty:r2(r.value)).replace(".",",")+'" data-id="'+x.id+'" onkeydown="if(event.key===\'Enter\')this.blur()" onchange="setRest(this)"> '+unitOf(x)+'</div>')+'</div>';
  }).join("");
  var poolV=0; hs.forEach(function(x){ var r=restOf(x); if(r) poolV+=r.value; });
  h+='<div class="board">'+lane("",poolCards,'<div class="lane-h"><span class="av" style="width:30px;height:30px"><i class="fas fa-inbox"></i></span><div style="flex:1"><b>De împărțit</b><div class="hint" style="margin:0">ce nu e încă al nimănui</div></div><b>'+money0(poolV)+'</b></div>');
  investors().forEach(function(p){
    var tv=0, ti=0, cards="";
    hs.forEach(function(x){ var s=shares(x)[p]; if(!s) return; tv+=s.value; ti+=s.inv; var g=r2(s.value-s.inv);
      cards+='<div class="pcard sm" data-id="'+x.id+'" data-from="'+esc(p)+'"><span class="grip3"><i class="fas fa-grip-vertical"></i></span>'+
        '<div class="pc-top"><i class="fas '+KIND_ICO[x.kind]+'"></i><b class="pc-n" onclick="showHolding(\''+x.id+'\')">'+esc(x.name)+'</b>'+
          '<b class="pc-v">'+(x.kind==="teren"?landMoney(x,s.value):money0(s.value))+'</b></div>'+
        (x.kind==="teren"?landEdit(x,s.qty,s.value,p):'<div class="pc-edit"><input class="valin" inputmode="decimal" value="'+(isQty(x)?String(s.qty).replace(".",","):String(r2(s.value)).replace(".",","))+'" data-id="'+x.id+'" data-p="'+esc(p)+'" onkeydown="if(event.key===\'Enter\')this.blur()" onchange="setAlloc(this)"> '+unitOf(x)+'</div>')+
        '<div class="pc-foot"><span class="mut">a costat '+(x.kind==="teren"?landMoney(x,s.inv):money0(s.inv))+' · <b class="'+(g>=0?"pos":"neg")+'">'+(g>=0?"+":"−")+(x.kind==="teren"?landMoney(x,Math.abs(g)):money0(Math.abs(g)))+'</b></span>'+
          '<span class="pc-act"><button class="btn sm gh pc-sell" title="Vând / scot bani din ea" onclick="sellPart(\''+x.id+'\',\''+esc(p).replace(/'/g,"\\'")+'\')"><i class="fas fa-hand-holding-dollar"></i> Vând</button>'+
          '<i class="fas fa-xmark ib del" title="Dă înapoi la De împărțit" onclick="unAlloc(\''+x.id+'\',\''+esc(p).replace(/'/g,"\\'")+'\')"></i></span></div></div>';
    });
    var g=r2(tv-ti);
    h+=lane(p,cards,'<div class="lane-h">'+avatar(p,30)+'<div style="flex:1;min-width:0"><b>'+esc(p)+'</b><div class="hint" style="margin:0">a costat '+money0(ti)+'</div></div><div style="text-align:right"><b>'+money0(tv)+'</b><div style="font-size:.74rem" class="'+(g>=0?"pos":"neg")+'">'+(ti?(g>=0?"+":"−")+money0(Math.abs(g)):"")+'</div></div></div>');
  });
  return h+'</div><span class="hint">La aur și valută scrii cantitatea (grame, euro); la acțiuni suma în lei pe care o are fiecare acum. Ce schimbi la cineva se schimbă doar la el (ca la bursă) — „De împărțit” nu se atinge. Ca să dai înapoi o parte, apasă ✕ sau trage-o înapoi. Când vinzi sau scoți bani, apasă „Vând” pe cardul persoanei — profitul sau pierderea se socotește față de cât a costat partea vândută. Și „De împărțit” se poate modifica. Click pe nume pentru detalii.</span></div>';
}
function curOpts(sel){ sel=sel||"RON"; return [["RON","lei (RON)"],["EUR","euro (€)"],["USD","dolari ($)"]].map(function(o){ return '<option value="'+o[0]+'"'+(o[0]===sel?' selected':'')+'>'+o[1]+'</option>'; }).join(""); }
// land card: m² × price per m² = value; any of the three can be changed, the value or the price follows
function landEdit(x, q, v, p){
  var a=' data-id="'+x.id+'"'+(p===null?'':' data-p="'+esc(p)+'"')+' onkeydown="if(event.key===\'Enter\')this.blur()" onchange="setLand(this)"';
  var f=function(n){ return String(r2(n||0)).replace(".",","); }, pc=x.priceCur||"RON", cc=x.cardCur||"RON", cr=curRate(cc);
  return '<div class="land">'+
    '<label><input class="valin" inputmode="decimal" data-f="q" value="'+f(q)+'"'+a+'> m²</label>'+
    '<label>× <input class="valin" inputmode="decimal" data-f="p" value="'+f(x.unitPrice)+'"'+a+'> '+CUR_SIGN[pc]+'/m²</label>'+
    '<label>= <input class="valin" inputmode="decimal" data-f="v" value="'+f(cr?v/cr:v)+'"'+a+'> '+(cr?CUR_SIGN[cc]:"lei")+'</label></div>'+
    (!curRate(pc)||!cr?'<div class="hint" style="margin:4px 0 0;color:var(--red,#e57373)">Lipsește cursul '+(curRate(pc)?cc:pc)+' — scrie-l în cartonașul „Curs aur și valută”.</div>':'');
}
function setLand(inp){
  var x=D.savings.find(function(s){return s.id===inp.dataset.id;}); if(!x) return;
  var p=inp.dataset.p, pool=(p===undefined), f=inp.dataset.f, v=Math.max(0,num(inp.value));
  var st=partsOf(x), q=pool?st.rest:(st.parts[p]||0);
  if(f==="q"){                                        // m² changed → value follows (same price)
    if(pool) setRestQty(x, v); else setAllocAmount(x, p, v);
  } else {
    if(f==="v"){                                      // value changed → price per m² follows (value in the card currency, price in its own)
      if(!(q>0)){ toast("Scrie întâi câți m²"); render(); return; }
      var rc=curRate(x.cardCur), rp=curRate(x.priceCur); if(!rc||!rp){ toast("Lipsește cursul valutar — scrie-l în cartonașul Curs"); render(); return; }
      v=Math.round(v*rc/rp/q*10000)/10000;
    }
    x.unitPrice=v; x.unitPriceDate=todayISO(); delete x.snooze;                                                         // same land, same price for everyone
  }
  save("Actualizat: "+x.name); render();
}
function unitOf(x){ return isQty(x)?esc(unitName(x)):"lei"; }
function qtyTxt(x,q){ return NF2.format(q||0)+" "+esc(unitName(x)); }

// ── Free editing of parts ──
// Every person's part is written as an amount (grams / euros, or lei for stocks); "De împărțit" is the rest.
// Editing a part changes only that part (the total follows); parts go back to "De împărțit" only with ✕ or by dragging.
// h.allocInv = {person: lei put in} keeps what each one invested, so a value change shows as profit/loss.
function ensureInv(x){
  if(x.allocInv) return x.allocInv;
  var sh=shares(x), ai={}; Object.keys(sh).forEach(function(p){ if(p) ai[p]=sh[p].inv; });
  return (x.allocInv=ai);
}
function partsOf(x){
  var al=allocOf(x), sh=shares(x), parts={};
  Object.keys(al).forEach(function(p){ if(sh[p]) parts[p]=isQty(x)?sh[p].qty:sh[p].value; });
  var r=sh[""]; return {parts:parts, rest:r?(isQty(x)?r.qty:r.value):0};
}
// write all parts back: total = sum of parts + rest
function setParts(x, parts, rest){
  rest=Math.max(0,r2(rest||0));
  var sum=0; Object.keys(parts).forEach(function(p){ if(!(parts[p]>0)) delete parts[p]; else sum+=parts[p]; });
  var total=r2(sum+rest), al={};
  if(isQty(x)){ x.qty=total; Object.keys(parts).forEach(function(p){ al[p]=r2(parts[p]); }); }
  else {
    if(Math.abs(total-holdingValue(x))>0.005){ x.vals=x.vals||[]; x.vals.push({date:todayISO(), value:total, ts:Date.now()}); delete x.snooze; }
    Object.keys(parts).forEach(function(p){ if(total>0) al[p]=parts[p]/total; });
  }
  x.alloc=al;
}
// someone's part changed (the market moved, or the grams were wrong): only that part changes,
// the investment total follows, "De împărțit" stays as it is and what he put in stays the same
function setAllocAmount(x, p, amount){
  amount=Math.max(0,r2(amount||0));
  var ai=ensureInv(x), st=partsOf(x), old=st.parts[p]||0;
  // grams / euros / m² are not "the market": a corrected quantity keeps the same cost per unit
  if(isQty(x) && old>0 && ai[p]){ var ni=r2(ai[p]*amount/old); x.invAdj=r2((x.invAdj||0)+ni-ai[p]); ai[p]=ni; }
  st.parts[p]=amount;
  if(!(amount>0)) delete ai[p];
  setParts(x, st.parts, st.rest);
  return true;
}
function setAlloc(inp){
  var x=D.savings.find(function(s){return s.id===inp.dataset.id;}); if(!x) return;
  setAllocAmount(x, inp.dataset.p, num(inp.value));
  save("Actualizat: "+inp.dataset.p+" · "+x.name); render();
}
// change the quantity left in "De împărțit" (metal, currency, land): its cost per unit stays the same
function setRestQty(x, rest){
  ensureInv(x); var sh=shares(x), st=partsOf(x), pInv=sh[""]?sh[""].inv:0, old=st.rest;
  rest=Math.max(0,r2(rest||0));
  if(old>0 && pInv) x.invAdj=r2((x.invAdj||0)+pInv*rest/old-pInv); else if(!(old>0) && pInv && !(rest>0)) x.invAdj=r2((x.invAdj||0)-pInv);
  setParts(x, st.parts, rest);
}
// edit what is left in "De împărțit"
function setRest(inp){
  var x=D.savings.find(function(s){return s.id===inp.dataset.id;}); if(!x) return;
  if(isQty(x)){ setRestQty(x, num(inp.value)); save("Actualizat: De împărțit · "+x.name); render(); return; }
  var ai=ensureInv(x), sh=shares(x), st=partsOf(x), rest=Math.max(0,num(inp.value)), pInv=sh[""]?sh[""].inv:0, sum=0;
  // nothing left to share: what was put in for it goes to the people who hold it
  if(!(rest>0) && pInv>0){ Object.keys(st.parts).forEach(function(k){ sum+=st.parts[k]; }); if(sum>0) Object.keys(st.parts).forEach(function(k){ ai[k]=r2((ai[k]||0)+pInv*st.parts[k]/sum); }); }
  setParts(x, st.parts, rest);
  save("Actualizat: De împărțit · "+x.name); render();
}
// ───── Selling / taking money out ─────
// Selling part of someone's share: that part's cost (bought price) leaves "Băgat", and the difference between
// what was received and what it had cost is kept as profit (or loss) from selling. The money can go to Venituri.
var SALE_TYPE="Vânzare investiții";
function sellPart(id, p){
  var x=D.savings.find(function(s){return s.id===id;}); if(!x) return;
  ensureInv(x);
  var sh=shares(x)[p]; if(!sh){ toast(p+" nu are nimic din "+x.name); return; }
  var q=isQty(x), part=q?sh.qty:sh.value, unit=q?unitName(x):"lei";
  modal('<div class="mt"><i class="fas fa-hand-holding-dollar"></i> Vând / scot — '+esc(x.name)+' ('+esc(p)+')</div>'+
    '<p class="cs">'+esc(p)+' are '+(q?qtyTxt(x,part)+' (valoare '+money(sh.value)+')':money(part))+'; a costat-o '+money(sh.inv)+'.</p>'+
    '<div class="r2"><div><label class="L">'+(q?'Cât vinzi ('+esc(unit)+')':'Cât scoți (lei, din valoarea de acum)')+'</label><input class="big" id="slQ" inputmode="decimal" value="'+String(r2(part)).replace(".",",")+'"></div>'+
      '<div><label class="L">Câți lei ai primit</label><input class="big" id="slR" inputmode="decimal"></div></div>'+
    '<div class="r2"><div><label class="L">Data</label><input type="date" id="slD" value="'+todayISO()+'"></div>'+
      '<div><label class="L">&nbsp;</label><label class="ck" style="display:flex;gap:8px;align-items:center;cursor:pointer;font-size:.86rem;padding-top:8px"><input type="checkbox" id="slI" checked> Banii intră la Venituri ('+esc(p)+')</label></div></div>'+
    '<div class="hint" id="slP" style="font-size:.88rem;margin-top:8px"></div>'+
    '<div class="mf"><button class="btn gh" onclick="closeModal()">Renunță</button><button class="btn" id="slS"><i class="fas fa-check"></i> Vândut</button></div>');
  var qi=document.getElementById("slQ"), ri=document.getElementById("slR"), typed=false;
  var calc=function(){
    var sold=Math.min(Math.max(0,num(qi.value)),part), frac=part>0?sold/part:0, cost=r2(sh.inv*frac);
    if(!typed) ri.value=String(r2(sh.value*frac)).replace(".",",");
    var got=num(ri.value), g=r2(got-cost);
    document.getElementById("slP").innerHTML='Partea asta a costat <b>'+money(cost)+'</b> · ai primit <b>'+money(got)+'</b> → '+(g>=0?'<span class="pos">profit +':'<span class="neg">pierdere −')+money(Math.abs(g))+'</span>';
    return {sold:sold, cost:cost, got:got};
  };
  qi.addEventListener("input",calc); ri.addEventListener("input",function(){ typed=true; calc(); });
  calc();
  var ok=function(){
    var c=calc(); if(!(c.sold>0)){ toast("Scrie cât vinzi"); return; }
    var ai=ensureInv(x), st=partsOf(x), d=document.getElementById("slD").value||todayISO();
    ai[p]=r2(Math.max(0,(ai[p]||0)-c.cost)); st.parts[p]=r2((st.parts[p]||0)-c.sold);
    if(!(st.parts[p]>0)) delete ai[p];
    setParts(x, st.parts, st.rest);
    var sale={id:uid(), date:d, person:p, qty:q?c.sold:0, value:q?0:c.sold, received:r2(c.got), cost:c.cost, ts:Date.now()};
    (x.sales=x.sales||[]).push(sale);
    if(document.getElementById("slI").checked && c.got>0){
      var inc={id:uid(), month:d.slice(0,7), day:+d.slice(8,10), person:p, type:SALE_TYPE, desc:"Vândut "+(q?qtyTxt(x,c.sold)+" ":"")+x.name, amount:r2(c.got), linkHolding:x.id, linkSale:sale.id};
      D.incomes.push(inc); sale.incId=inc.id;
      if(D.settings.incomeTypes.indexOf(SALE_TYPE)<0) D.settings.incomeTypes.push(SALE_TYPE);
    }
    if(save("Vândut: "+x.name+" ("+p+")")){ closeModal(); render(); }
  };
  document.getElementById("slS").onclick=ok;
}
// "Vând / scot" from the investment's details: choose whose part is sold
function sellPick(id){
  var x=D.savings.find(function(s){return s.id===id;}); if(!x) return;
  var sh=shares(x), ps=Object.keys(sh).filter(function(p){ return p && (sh[p].value>0||sh[p].qty>0); });
  if(!ps.length){ alertBox("Investiția nu e încă a nimănui. Trage-o întâi în coloana cuiva la „Cine ce are”, apoi vinzi din partea lui."); return; }
  if(ps.length===1){ sellPart(id, ps[0]); return; }
  modal('<div class="mt"><i class="fas fa-hand-holding-dollar"></i> Din partea cui vinzi — '+esc(x.name)+'?</div><div class="chips">'+
    ps.map(function(p){ return '<span class="chip pchip" onclick="sellPart(\''+id+'\',\''+esc(p).replace(/'/g,"\\'")+'\')">'+avatar(p,24)+' '+esc(p)+' · '+(isQty(x)?qtyTxt(x,sh[p].qty):money0(sh[p].value))+'</span>'; }).join("")+'</div>');
}
// undo a sale: the part, its cost and the quantity come back; the linked income is removed
function delSale(hid, sid){
  var x=D.savings.find(function(s){return s.id===hid;}); if(!x) return;
  closeModal();
  softDelete("Vânzare ștearsă (și din Venituri)",function(){
    var q=(x.sales||[]).find(function(z){return z.id===sid;}); if(!q) return;
    var ai=ensureInv(x), st=partsOf(x);
    st.parts[q.person]=r2((st.parts[q.person]||0)+(isQty(x)?q.qty:q.value));
    x.sales=x.sales.filter(function(z){return z.id!==sid;});
    ai[q.person]=r2((ai[q.person]||0)+q.cost);
    setParts(x, st.parts, st.rest);
    if(q.incId) D.incomes=D.incomes.filter(function(e){return e.id!==q.incId;});
  });
  showHolding(hid);
}
// the real purchase cost of someone's part (e.g. gold bought years ago); profit is counted against it
function setPersonCost(id, p, v){
  var x=D.savings.find(function(s){return s.id===id;}); if(!x) return;
  var ai=ensureInv(x), old=ai[p]||0, nv=r2(Math.max(0,num(v)));
  ai[p]=nv; x.invAdj=r2((x.invAdj||0)+nv-old); x.costEdited=1;
  if(save("Costul lui "+p+" la "+x.name+": "+money(nv))){ render(); showHolding(id); }
}
function unAlloc(id,p){ var x=D.savings.find(function(s){return s.id===id;}); if(!x) return;
  softDelete(x.name+": partea lui "+p+" trece la De împărțit",function(){ var ai=ensureInv(x), st=partsOf(x); st.rest+=st.parts[p]||0; delete st.parts[p]; delete ai[p]; setParts(x, st.parts, st.rest); }); }
function askAlloc(x, p){
  var r=restOf(x); var def = r ? (isQty(x)?r.qty:r2(r.value)) : 0;
  var unit = isQty(x) ? unitName(x) : "lei";
  modal('<div class="mt">'+avatar(p,28)+' Cât din '+esc(x.name)+' îi dai lui '+esc(p)+'?</div>'+
    '<p class="cs">'+(isQty(x)?'Total: '+qtyTxt(x,x.qty)+' · de împărțit: '+qtyTxt(x,r?r.qty:0):'Valoarea de acum: '+money(holdingValue(x))+' · de împărțit: '+money(r?r.value:0))+'</p>'+
    '<label class="L">'+(isQty(x)?'Cantitate ('+esc(unit)+')':'Suma pe care o are '+esc(p)+' acum (lei)')+'</label><input class="big" id="alA" inputmode="decimal" value="'+String(def).replace(".",",")+'" autofocus>'+
    '<span class="hint">Poți scrie și mai mult decât e de împărțit: investiția crește cu diferența.</span>'+
    '<div class="mf"><button class="btn gh" onclick="closeModal()">Renunță</button><button class="btn" id="alS"><i class="fas fa-check"></i> Dă-i</button></div>');
  var ok=function(){ var a=r2(num(document.getElementById("alA").value)); if(!(a>0)){ toast("Scrie cât"); return; }
    var ai=ensureInv(x), sh=shares(x), st=partsOf(x), take=Math.min(a, st.rest), pInv=sh[""]?sh[""].inv:0;
    if(st.rest>0) ai[p]=r2((ai[p]||0)+pInv*take/st.rest);                 // what was put in moves with the part
    st.parts[p]=r2((st.parts[p]||0)+a); st.rest-=take;                     // more than is free → the investment grows
    setParts(x, st.parts, st.rest);
    if(save(esc(p)+" are acum parte din "+x.name)){ closeModal(); render(); } };
  document.getElementById("alS").onclick=ok;
  document.getElementById("alA").addEventListener("keydown",function(e){ if(e.key==="Enter") ok(); });
}
// dragging cards between columns
function initBoard(){
  var board=document.querySelector(".board"); if(!board) return;
  [].forEach.call(board.querySelectorAll(".pcard .grip3"),function(gr){
    gr.addEventListener("pointerdown",function(e){
      e.preventDefault(); e.stopPropagation();
      var card=gr.parentElement, from=card.dataset.from, ghost=card.cloneNode(true);
      ghost.className="pcard sm ghost"; ghost.style.width=card.offsetWidth+"px"; document.body.appendChild(ghost);
      card.classList.add("dragging"); document.body.classList.add("nosel");
      var lx=e.clientX, ly=e.clientY, target=null;
      var place=function(){
        ghost.style.left=(lx-20)+"px"; ghost.style.top=(ly-14)+"px"; target=null;
        [].forEach.call(board.querySelectorAll(".lane"),function(l){ var r=l.getBoundingClientRect(); var inside=lx>=r.left&&lx<=r.right&&ly>=r.top&&ly<=r.bottom; l.classList.toggle("over",inside && l.dataset.owner!==from); if(inside) target=l.dataset.owner; });
      };
      place();
      var timer=setInterval(function(){ var d=ly<90?-Math.ceil((90-ly)/4):(ly>innerHeight-90?Math.ceil((ly-innerHeight+90)/4):0); if(d){ window.scrollBy(0,d); place(); } },16);
      var move=function(ev){ lx=ev.clientX; ly=ev.clientY; place(); };
      var up=function(){
        clearInterval(timer); document.removeEventListener("pointermove",move); document.removeEventListener("pointerup",up);
        ghost.remove(); card.classList.remove("dragging"); document.body.classList.remove("nosel");
        board.querySelectorAll(".lane").forEach(function(l){ l.classList.remove("over"); });
        var x=D.savings.find(function(s){return s.id===card.dataset.id;});
        if(!x || target===null || target===from) return;
        if(from===""){ askAlloc(x,target); return; }            // from the pool: ask how much
        var ai=ensureInv(x), al=allocOf(x), part=al[from]||0, pi=ai[from]||0;   // between people: move the whole part
        delete al[from]; delete ai[from];
        if(target!==""){ al[target]=(al[target]||0)+part; ai[target]=r2((ai[target]||0)+pi); }
        if(save(x.name+": "+from+" → "+(target||"De împărțit"))) render();
      };
      document.addEventListener("pointermove",move); document.addEventListener("pointerup",up);
    });
  });
}

// ───── Deposit / purchase ─────
function openDeposit(id, txId){
  var x=D.savings.find(function(s){return s.id===id;}); if(!x) return;
  var t=txId?(x.txs||[]).find(function(q){return q.id===txId;}):null;
  var qtyLbl = x.kind==="metal" ? "Câte "+({g:"grame",kg:"kg",oz:"uncii",buc:"bucăți"}[x.unit||"g"])+" ai cumpărat" : (x.kind==="valuta" ? "Câți "+esc(x.currency)+" ai cumpărat" : (x.kind==="teren" ? "Câți m² ai cumpărat" : ""));
  var payer = t ? t.payer : (x.lastPayer || D.settings.people[0] || "");
  modal('<div class="mt"><i class="fas fa-plus"></i> '+(t?"Modifică depunerea":"Depunere")+' — '+esc(x.name)+'</div>'+
    '<p class="cs">Scrie câți lei a pus și cine. Partea lui din '+esc(x.name)+' crește cu atât.</p>'+
    '<div class="r2"><div><label class="L">Data</label><input type="date" id="dpD" value="'+(t&&t.date?t.date:todayISO())+'"></div>'+
      '<div><label class="L">Suma (lei)</label><input class="big" id="dpA" inputmode="decimal" value="'+(t?String(t.amount).replace(".",","):"")+'" autofocus></div></div>'+
    (qtyLbl?'<label class="L">'+qtyLbl+'</label><input id="dpQ" inputmode="decimal" value="'+(t&&t.qty?String(t.qty).replace(".",","):"")+'">':'')+
    '<label class="L">Cine investește (din venitul lui)</label><div class="chips" id="dpP">'+D.settings.people.map(function(p){ return '<span class="chip pchip'+(p===payer?' on':'')+'" data-p="'+esc(p)+'">'+avatar(p,22)+' '+esc(p)+'</span>'; }).join("")+'</div>'+
    '<label class="ck" style="display:flex;gap:8px;align-items:center;margin-top:12px;cursor:pointer;font-size:.86rem"><input type="checkbox" id="dpE"'+(!t||t.expId?' checked':'')+'> Trece și la Cheltuieli → Investiții</label>'+
    '<div class="mf"><button class="btn gh" onclick="closeModal()">Renunță</button><button class="btn" id="dpS"><i class="fas fa-check"></i> Salvează</button></div>');
  document.querySelectorAll("#dpP .pchip").forEach(function(ch){ ch.onclick=function(){ document.querySelectorAll("#dpP .pchip").forEach(function(c){c.classList.remove("on");}); ch.classList.add("on"); payer=ch.dataset.p; }; });
  var doSave=function(){
    var a=r2(num(document.getElementById("dpA").value)); if(!(a>0)){ toast("Scrie suma"); return; }
    var d=document.getElementById("dpD").value||todayISO(), q=document.getElementById("dpQ")?num(document.getElementById("dpQ").value):0;
    x.txs=x.txs||[];
    if(!t) ensureInv(x);
    else if(x.allocInv){ if(t.payer && x.allocInv[t.payer]!=null) x.allocInv[t.payer]=r2(Math.max(0,x.allocInv[t.payer]-t.amount)); if(payer && (allocOf(x)[payer]>0)) x.allocInv[payer]=r2((x.allocInv[payer]||0)+a); }
    var tx=t||{id:uid()};
    if(t && isQty(x)) x.qty=r2((x.qty||0)-(t.qty||0));
    Object.assign(tx,{date:d, amount:a, qty:q, payer:payer, initial:false}); if(!t) tx.ts=Date.now();
    if(!t) x.txs.push(tx);
    if(isQty(x)) x.qty=r2((x.qty||0)+q);
    syncTxExpense(x, tx, document.getElementById("dpE").checked);
    if(!t && payer) allocDeposit(x, payer, a, q);
    x.lastPayer=payer;
    if(save("Depunere salvată: "+money(a)+" → "+x.name)){ closeModal(); render(); }
  };
  document.getElementById("dpS").onclick=doSave;
  document.getElementById("dpA").addEventListener("keydown",function(e){ if(e.key==="Enter") doSave(); });
}
// a deposit grows the payer's part: by quantity for metal/currency, by amount for stocks (fractions recomputed)
function allocDeposit(x, p, amount, qty){
  var al=allocOf(x); if(x.allocInv) x.allocInv[p]=r2((x.allocInv[p]||0)+amount);
  if(isQty(x)){ al[p]=r2((al[p]||0)+(qty||0)); return; }
  var newVal=holdingValue(x), oldVal=newVal-amount;
  Object.keys(al).forEach(function(k){ al[k]=oldVal>0 ? al[k]*oldVal/newVal : 0; });
  al[p]=(al[p]||0)+(newVal>0?amount/newVal:0);
}
function unallocDeposit(x,t){
  var al=allocOf(x), p=t.payer; if(!p || al[p]===undefined) return;
  if(x.allocInv && x.allocInv[p]) x.allocInv[p]=r2(Math.max(0,x.allocInv[p]-t.amount));
  if(isQty(x)){ al[p]=r2(Math.max(0,al[p]-(t.qty||0))); if(!al[p]) delete al[p]; return; }
  var oldVal=holdingValue(x), newVal=oldVal-t.amount; if(newVal<=0){ x.alloc={}; return; }
  Object.keys(al).forEach(function(k){ var part=al[k]*oldVal - (k===p?t.amount:0); al[k]=Math.max(0,part)/newVal; if(!al[k]) delete al[k]; });
}
function kindSub(x){
  if(x.kind==="metal") return normKey(x.name).indexOf("aur")===0 ? "Aur" : "";
  if(x.kind==="valuta") return "Valută";
  if(x.kind==="actiuni") return x.isFund ? "Fonduri mutuale" : "Acțiuni";
  if(x.kind==="teren") return "Pământ";
  return normKey(x.name).indexOf("teren")>=0||normKey(x.name).indexOf("pamant")>=0 ? "Pământ" : "";
}
// deposit ↔ expense under Investiții (entered once, kept in sync)
function syncTxExpense(x, tx, want){
  var e=tx.expId ? D.expenses.find(function(q){return q.id===tx.expId;}) : null;
  if(!want){ if(e) D.expenses=D.expenses.filter(function(q){return q.id!==e.id;}); delete tx.expId; return; }
  var rec={month:tx.date.slice(0,7), day:+tx.date.slice(8,10), cat:"investitii", sub:kindSub(x), desc:x.name+(tx.payer?" ("+tx.payer+")":""), amount:tx.amount, linkHolding:x.id, linkTx:tx.id};
  if(e) Object.assign(e,rec); else { rec.id=uid(); D.expenses.push(rec); tx.expId=rec.id; }
}
function delTx(hid, txId){
  var x=D.savings.find(function(s){return s.id===hid;}); if(!x) return;
  closeModal();
  softDelete("Depunere ștearsă (și din Cheltuieli)",function(){
    var t=(x.txs||[]).find(function(q){return q.id===txId;}); if(!t) return;
    ensureInv(x); unallocDeposit(x,t);
    if(isQty(x)) x.qty=r2((x.qty||0)-(t.qty||0));
    if(t.expId) D.expenses=D.expenses.filter(function(e){return e.id!==t.expId;});
    x.txs=x.txs.filter(function(q){return q.id!==txId;});
  });
  showHolding(hid);
}

// scroll to the Curs card and put the cursor in the first empty rate
function goRates(){
  closeModal();
  var c=[].filter.call(document.querySelectorAll(".rgrid"),function(){return true;})[0]; if(!c) return;
  c.scrollIntoView({behavior:"smooth",block:"center"});
  var inp=[].filter.call(c.querySelectorAll("input"),function(i){ return !i.value; })[0]||c.querySelector("input"); if(inp) setTimeout(function(){ inp.focus(); },350);
  toast("Prețul aurului și al valutei se scrie în cartonașul „Curs aur și valută”");
}
// ───── Current value ─────
function openValue(id){
  var x=D.savings.find(function(s){return s.id===id;}); if(!x) return;
  var bnr=qtyKind(x) && x.priceMode!=="manual" && bnrAvailable(x);
  if(bnr){ goRates(); return; }
  var isPrice = qtyKind(x), unit=unitName(x);
  modal('<div class="mt"><i class="fas fa-rotate"></i> '+(isPrice?"Prețul de acum":"Valoarea de acum")+' — '+esc(x.name)+'</div>'+
    '<p class="cs">'+(isPrice?'Scrie prețul de acum pe '+esc(unit)+'.':'Scrie valoarea totală pe care o vezi acum în '+(x.platform?esc(x.platform):'platformă')+'.')+' Băgat până acum: <b>'+money(invested(x))+'</b>.</p>'+
    '<label class="L">'+(isPrice?'Preț ('+(x.kind==="teren"?CUR_SIGN[x.priceCur||"RON"]:'lei')+' / '+esc(unit)+')':'Valoare (lei)')+'</label><input class="big" id="vlV" inputmode="decimal" autofocus>'+
    '<div class="hint" id="vlR" style="font-size:.85rem;margin-top:6px"></div>'+
    '<div class="mf"><button class="btn gh" onclick="closeModal()">Renunță</button><button class="btn" id="vlS"><i class="fas fa-check"></i> Salvează</button></div>');
  var inp=document.getElementById("vlV");
  inp.addEventListener("input",function(){
    var v=num(inp.value); if(!inp.value){ document.getElementById("vlR").innerHTML=""; return; }
    var val=isPrice? r2((x.qty||0)*v*(x.kind==="teren"?curRate(x.priceCur):1)) : v, g=r2(val-invested(x));
    document.getElementById("vlR").innerHTML='Valoare: <b>'+money(val)+'</b> · '+(g>=0?'<span class="pos">pe plus ':'<span class="neg">pe minus ')+(g>=0?"+":"−")+money(Math.abs(g))+'</span>';
  });
  var doSave=function(){
    if(inp.value===""){ toast("Scrie valoarea"); return; }
    if(isPrice){ x.unitPrice=num(inp.value); x.unitPriceDate=todayISO(); x.priceMode="manual"; }
    else { x.vals=x.vals||[]; x.vals.push({date:todayISO(), value:r2(num(inp.value)), ts:Date.now()}); }
    delete x.snooze;
    if(save("Valoare actualizată: "+x.name)){ closeModal(); render(); }
  };
  document.getElementById("vlS").onclick=doSave;
  inp.addEventListener("keydown",function(e){ if(e.key==="Enter") doSave(); });
}

// ───── Investment details: deposit and valuation history ─────
function showHolding(id){
  var x=D.savings.find(function(s){return s.id===id;}); if(!x){ closeModal(); return; }
  var v=holdingValue(x), inv=invested(x), real=realized(x), g=r2(v-inv+real);
  var txs=(x.txs||[]).slice().sort(function(a,b){return (a.date||"")<(b.date||"")?1:-1;});
  var vals=(x.vals||[]).slice().sort(function(a,b){return a.date<b.date?1:-1;});
  modal('<div class="mt"><i class="fas '+KIND_ICO[x.kind]+'"></i> '+esc(x.name)+'</div>'+
    '<p class="cs" style="margin-bottom:10px">'+(x.platform?esc(x.platform)+' · ':'')+'reamintire: '+(x.remind?'la '+x.remind+' luni':'niciodată')+'</p>'+
    '<div class="g g4" style="margin-bottom:12px">'+
      '<div class="c"><div class="cl">Valoare</div><div class="cv" style="font-size:1.2rem">'+money(v)+'</div><div class="cs">'+(isEstimated(x)?'estimat':'')+'</div></div>'+
      '<div class="c"><div class="cl">A costat</div><div class="cv" style="font-size:1.2rem">'+money(inv)+'</div></div>'+
      '<div class="c"><div class="cl">Profit</div><div class="cv '+(g>=0?"pos":"neg")+'" style="font-size:1.2rem">'+(g>=0?"+":"−")+money(Math.abs(g))+'</div><div class="cs">'+(inv?(g>=0?"+":"−")+NF2.format(Math.abs(g/inv*100))+"%":"")+(real?' · din vânzări '+(real>=0?"+":"−")+money(Math.abs(real)):'')+'</div></div>'+
      '<div class="c"><div class="cl">Actualizat</div><div class="cv" style="font-size:1.2rem">'+dmy(lastUpdate(x))+'</div></div></div>'+
    '<div class="br" style="margin-bottom:12px"><button class="btn sm" onclick="openDeposit(\''+x.id+'\')"><i class="fas fa-plus"></i> Depunere</button><button class="btn sm gh" onclick="sellPick(\''+x.id+'\')"><i class="fas fa-hand-holding-dollar"></i> Vând / scot</button><button class="btn sm gh" onclick="openValue(\''+x.id+'\')"><i class="fas fa-rotate"></i> Valoarea de acum</button><button class="btn sm gh" onclick="openHolding(\''+x.id+'\')"><i class="fas fa-pen"></i> Modifică</button><button class="btn sm bd" style="margin-left:auto" onclick="closeModal();delHolding(\''+x.id+'\')"><i class="fas fa-trash"></i> Șterge investiția</button></div>'+
    (function(){ var sh=shares(x), ks=Object.keys(sh).filter(function(p){return sh[p].inv>0||sh[p].qty>0;}); if(!ks.length) return '';
      return '<div class="ct" style="font-size:.88rem"><i class="fas fa-users"></i> Cine are ce</div><div class="tw" style="margin-bottom:12px"><table class="rt">'+
        '<thead><tr><th>Cine</th><th class="n" style="text-align:right">'+(isQty(x)?'Cantitate':'')+'</th><th class="n" style="text-align:right">A costat (lei)</th><th class="n" style="text-align:right">Valoare acum</th><th class="n" style="text-align:right">Profit</th></tr></thead><tbody>'+
        ks.map(function(p){ var r=sh[p], gg=r2(r.value-r.inv);
          return '<tr><td>'+(p?avatar(p,20)+' '+esc(p):'De împărțit')+'</td><td class="n mut">'+(isQty(x)?qtyTxt(x,r.qty):'')+'</td>'+
            '<td class="n">'+(p?'<input class="valin" inputmode="decimal" style="width:100px" value="'+String(r2(r.inv)).replace(".",",")+'" title="Cât a dat pe partea lui (prețul real de cumpărare)" onkeydown="if(event.key===\'Enter\')this.blur()" onchange="setPersonCost(\''+x.id+'\',\''+esc(p).replace(/'/g,"\\'")+'\',this.value)">':money(r.inv))+'</td>'+
            '<td class="n"><b>'+money(r.value)+'</b></td><td class="n '+(gg>=0?"pos":"neg")+'">'+(gg>=0?"+":"−")+money(Math.abs(gg))+'</td></tr>'; }).join("")+'</tbody></table></div>'+
        '<span class="hint" style="margin:-6px 0 12px">„A costat” = cât a dat fiecare pe partea lui; profitul se socotește față de el. Pentru ce a venit din Excel, e valoarea de atunci — dacă știi prețul real de cumpărare, scrie-l aici.</span>'; })()+
    '<div class="ct" style="font-size:.88rem"><i class="fas fa-arrow-right-to-bracket"></i> Depuneri</div>'+
    (txs.length?'<div class="tw" style="max-height:30vh"><table class="rt"><tbody>'+txs.map(function(t){
      return '<tr><td class="mut" style="white-space:nowrap">'+(t.initial?'la început':dmy(t.date))+'</td><td>'+(t.payer?avatar(t.payer,20)+' '+esc(t.payer):'<span class="mut">—</span>')+'</td>'+
        '<td class="n">'+(t.qty?NF2.format(t.qty)+' '+esc(unitName(x)):'')+'</td><td class="n"><b>'+money(t.amount)+'</b></td>'+
        '<td>'+(t.expId?'<span class="bg gb">în cheltuieli</span>':'')+'</td>'+
        '<td class="act">'+(t.initial?'':'<button class="ib" onclick="openDeposit(\''+x.id+'\',\''+t.id+'\')"><i class="fas fa-pen"></i></button>')+'<button class="ib del" onclick="delTx(\''+x.id+'\',\''+t.id+'\')"><i class="fas fa-trash"></i></button></td></tr>';
    }).join("")+'</tbody></table></div>':'<div class="mut" style="font-size:.85rem">Nicio depunere.</div>')+
    ((x.sales||[]).length?'<div class="ct" style="font-size:.88rem;margin-top:14px"><i class="fas fa-hand-holding-dollar"></i> Vânzări</div><div class="tw" style="max-height:24vh"><table class="rt"><tbody>'+
      x.sales.slice().sort(function(a,b){return a.date<b.date?1:-1;}).map(function(q){ var gg=r2(q.received-q.cost);
        return '<tr><td class="mut">'+dmy(q.date)+'</td><td>'+avatar(q.person,20)+' '+esc(q.person)+'</td><td class="n">'+(q.qty?qtyTxt(x,q.qty):money(q.value))+'</td><td class="n">primit <b>'+money(q.received)+'</b></td><td class="n mut">a costat '+money(q.cost)+'</td>'+
          '<td class="n '+(gg>=0?"pos":"neg")+'">'+(gg>=0?"+":"−")+money(Math.abs(gg))+'</td><td>'+(q.incId&&D.incomes.some(function(e){return e.id===q.incId;})?'<span class="bg gb">în venituri</span>':'')+'</td>'+
          '<td class="act"><button class="ib del" title="Anulează vânzarea" onclick="delSale(\''+x.id+'\',\''+q.id+'\')"><i class="fas fa-trash"></i></button></td></tr>'; }).join("")+'</tbody></table></div>':'')+
    ((x.kind==="actiuni"||x.kind==="altele")?'<div class="ct" style="font-size:.88rem;margin-top:14px"><i class="fas fa-chart-line"></i> Valori reale scrise</div>'+
      (vals.length?'<div class="tw" style="max-height:24vh"><table class="rt"><tbody>'+vals.map(function(q,i){
        return '<tr><td class="mut">'+dmy(q.date)+'</td><td class="n"><b>'+money(q.value)+'</b></td><td class="act"><button class="ib del" onclick="delVal(\''+x.id+'\',\''+q.date+'\','+q.value+')"><i class="fas fa-trash"></i></button></td></tr>';
      }).join("")+'</tbody></table></div>':'<div class="mut" style="font-size:.85rem">Încă nicio valoare scrisă.</div>'):'')+
    '<div class="mf"><button class="btn" onclick="closeModal()">Gata</button></div>', true);
}
function delVal(id, date, value){
  var x=D.savings.find(function(s){return s.id===id;}); closeModal();
  softDelete("Valoare ștearsă",function(){ var i=(x.vals||[]).findIndex(function(q){return q.date===date && q.value===value;}); if(i>=0) x.vals.splice(i,1); });
  showHolding(id);
}

// ───── New / edit investment ─────
var METALS=["Aur","Argint","Platină","Paladiu","Cupru"];
function openHolding(id, kind){
  var x=id?D.savings.find(function(s){return s.id===id;}):null;
  var k=x?x.kind:(kind||"actiuni"), mode=x?(x.priceMode||"bnr"):"bnr";
  var plats=PLATFORMS.slice(); D.savings.forEach(function(s){ if(s.platform && plats.indexOf(s.platform)<0) plats.push(s.platform); });
  var mets=METALS.slice(); D.savings.forEach(function(s){ if(s.kind==="metal" && mets.indexOf(s.name)<0) mets.push(s.name); });
  var lv=x?lastVal(x):null, curPl=x?(x.platform||""):"Tradeville";
  if(curPl && plats.indexOf(curPl)<0) plats.push(curPl);
  modal('<div class="mt"><i class="fas fa-coins"></i> '+(x?"Modifică investiția":"Investiție nouă")+'</div>'+
    '<label class="L">Ce este</label><div class="seg" id="hK" style="flex-wrap:wrap">'+
      [["metal","fa-ring","Metal / marfă"],["valuta","fa-money-bill-wave","Valută"],["actiuni","fa-chart-line","Acțiuni / cont"],["teren","fa-mountain-sun","Teren"],["altele","fa-box-archive","Altceva"]].map(function(o){ return '<button data-k="'+o[0]+'" class="'+(k===o[0]?"on":"")+'"><i class="fas '+o[1]+'"></i> '+o[2]+'</button>'; }).join("")+'</div>'+

    '<div class="r2"><div><label class="L">Nume</label><input id="hN" list="hNL" value="'+esc(x?x.name:"")+'" placeholder="ex. Aur, Euro, Acțiuni, Teren"><datalist id="hNL"></datalist></div>'+
      '<div class="kf kf-valuta"><label class="L">Valuta</label><select id="hC">'+rateList().concat(CURRENCIES.filter(function(c){ return rateList().indexOf(c)<0; })).map(function(c){return '<option'+((x&&x.currency||"EUR")===c?' selected':'')+'>'+c+'</option>';}).join("")+'</select></div>'+
      '<div class="kf kf-metal"><label class="L">Unitate</label><select id="hU">'+[["g","grame"],["kg","kilograme"],["oz","uncii"],["buc","bucăți"]].map(function(u){return '<option value="'+u[0]+'"'+((x&&x.unit||"g")===u[0]?' selected':'')+'>'+u[1]+'</option>';}).join("")+'</select></div>'+
      '<div class="kf kf-actiuni"><label class="L">Platforma</label><select id="hPlS">'+plats.map(function(p){return '<option'+(p===curPl?' selected':'')+'>'+esc(p)+'</option>';}).join("")+'<option value="__alt">Altă platformă…</option></select>'+
        '<input id="hPl" style="margin-top:6px;display:none" placeholder="numele platformei"></div></div>'+
    '<div class="kf kf-metal kf-valuta"><label class="L">De unde iau prețul</label><div class="seg" id="hM">'+
      '<button data-m="bnr"><i class="fas fa-coins"></i> Din cartonașul Curs</button><button data-m="manual"><i class="fas fa-pen"></i> Preț doar pentru ea</button></div><span class="hint" id="hMh"></span></div>'+
    '<div class="r2"><div class="kf kf-metal kf-valuta kf-teren"><label class="L" id="hQl">Cantitate</label><input id="hQ" inputmode="decimal" value="'+(x&&x.qty?String(x.qty).replace(".",","):"")+'"></div>'+
      '<div class="kf kf-man"><label class="L" id="hPrl">Preț pe unitate (lei)</label><input id="hPr" inputmode="decimal" value="'+(x&&x.unitPrice?String(x.unitPrice).replace(".",","):"")+'"></div>'+
      '<div class="kf kf-actiuni kf-altele"><label class="L">Valoarea de acum (lei)</label><input id="hV" inputmode="decimal" value="'+(lv?String(lv.value).replace(".",","):"")+'" placeholder="din platformă"></div></div>'+
    '<div class="r2 kf kf-teren"><div><label class="L">Prețul pe m² îl scriu în</label><select id="hTc">'+curOpts(x&&x.priceCur)+'</select></div>'+
      '<div><label class="L">Pe card arăt suma în</label><select id="hTd">'+curOpts(x&&x.cardCur)+'</select></div></div>'+
    '<div class="kf kf-teren hint" id="hTv" style="font-size:.88rem"></div>'+
    (x?'':'<p class="hint" style="margin-top:10px">După ce o salvezi, o tragi din „De împărțit” în coloana fiecăruia, iar cu <b>„+ Depunere”</b> treci ce pune fiecare de acum înainte.</p>')+
    '<div class="r2"><div><label class="L">Îmi cere valoarea reală</label><select id="hR">'+[[1,"în fiecare lună"],[3,"la 3 luni"],[6,"la 6 luni"],[12,"o dată pe an"],[0,"niciodată"]].map(function(o){ return '<option value="'+o[0]+'"'+(((x&&x.remind!=null)?x.remind:3)===o[0]?' selected':'')+'>'+o[1]+'</option>'; }).join("")+'</select></div>'+
      '<div class="kf kf-actiuni"><label class="L">&nbsp;</label><label class="ck" style="display:flex;gap:8px;align-items:center;cursor:pointer;font-size:.85rem;padding-top:8px"><input type="checkbox" id="hF"'+(x&&x.isFund?' checked':'')+'> E fond de investiții</label></div></div>'+
    '<label class="L">Notă</label><input id="hX" value="'+esc(x?x.note||"":"")+'">'+
    '<div class="mf"><button class="btn gh" onclick="closeModal()">Renunță</button><button class="btn" id="hS"><i class="fas fa-check"></i> Salvează</button></div>', true);
  var refresh=function(){
    var name=document.getElementById("hN").value.trim();
    var bnrOk = k==="valuta" || (k==="metal" && bnrAvailable({kind:k,name:name}));
    var u=document.getElementById("hU").value;
    if(k==="metal" && u==="buc") bnrOk=false;
    var m = bnrOk ? mode : "manual";
    document.querySelectorAll("#hK button").forEach(function(b){ b.classList.toggle("on",b.dataset.k===k); });
    document.querySelectorAll("#hM button").forEach(function(b){ b.classList.toggle("on",b.dataset.m===m); b.disabled=(b.dataset.m==="bnr"&&!bnrOk); b.style.opacity=b.disabled?.4:1; });
    document.querySelectorAll(".kf").forEach(function(el){ el.style.display = (el.classList.contains("kf-"+k) || (el.classList.contains("kf-man") && (((k==="metal"||k==="valuta") && m==="manual") || k==="teren"))) ? "" : "none"; });
    var ul={g:"gram",kg:"kg",oz:"uncie",buc:"bucată"}[u];
    document.getElementById("hQl").textContent = k==="metal" ? "Cantitate ("+({g:"grame",kg:"kg",oz:"uncii",buc:"bucăți"}[u])+")" : (k==="teren" ? "Suprafața (m²)" : "Suma în valută");
    document.getElementById("hPrl").textContent = k==="metal" ? "Preț pe "+ul+" (lei)" : (k==="teren" ? "Preț pe m² (lei)" : "Curs: 1 "+document.getElementById("hC").value+" = ? lei");
    var tq=num(document.getElementById("hQ").value), tp=num(document.getElementById("hPr").value), tc=document.getElementById("hTc").value, td=document.getElementById("hTd").value;
    if(k==="teren") document.getElementById("hPrl").textContent="Preț pe m² ("+CUR_SIGN[tc]+")";
    var lei=tq*tp*curRate(tc), rd=curRate(td);
    document.getElementById("hTv").innerHTML = !(tq&&tp) ? 'Valoarea terenului = m² × preț pe m²' :
      (!curRate(tc)||!rd) ? 'Lipsește cursul '+(curRate(tc)?td:tc)+' — scrie-l în cartonașul Curs.' :
      'Valoarea terenului: <b style="color:var(--txt)">'+(td==="RON"?money(r2(lei)):NF2.format(lei/rd)+' '+CUR_SIGN[td])+'</b> ('+NF2.format(tq)+' m² × '+NF2.format(tp)+' '+CUR_SIGN[tc]+')'+(td!=="RON"||tc!=="RON"?' · '+money(r2(lei)):'');
    document.getElementById("hPl").style.display = document.getElementById("hPlS").value==="__alt" ? "" : "none";
    document.getElementById("hMh").textContent = k==="metal" ? (bnrOk?(m==="bnr"?"Prețul pe gram se ia din cartonașul „Curs aur și valută” (Aur).":"Scrii aici prețul doar pentru această investiție."):"În cartonașul Curs e doar aurul; pentru acest metal scrii tu prețul.") : (m==="bnr"?"Cursul se ia din cartonașul „Curs aur și valută”.":"Scrii aici cursul doar pentru această investiție.");
    document.getElementById("hNL").innerHTML=(k==="metal"?mets:[]).map(function(n){return '<option value="'+esc(n)+'">';}).join("");
  };
  document.querySelectorAll("#hK button").forEach(function(b){ b.onclick=function(){ k=b.dataset.k; refresh(); }; });
  document.querySelectorAll("#hM button").forEach(function(b){ b.onclick=function(){ if(!b.disabled){ mode=b.dataset.m; refresh(); } }; });
  ["hN","hU","hC","hQ","hPr","hPlS","hTc","hTd"].forEach(function(i){ var el=document.getElementById(i); el.addEventListener("input",refresh); el.addEventListener("change",refresh); });
  refresh();
  document.getElementById("hS").onclick=function(){
    var name=document.getElementById("hN").value.trim();
    if(!name) name = k==="valuta" ? document.getElementById("hC").value : "";
    if(!name){ toast("Scrie numele"); return; }
    var rec=x||{id:uid(), txs:[], vals:[], created:todayISO()};
    Object.assign(rec,{name:name, kind:k, remind:+document.getElementById("hR").value, note:document.getElementById("hX").value.trim()});
    if(k==="teren"){
      rec.qty=num(document.getElementById("hQ").value);
      var lp=num(document.getElementById("hPr").value); if(lp!==rec.unitPrice){ rec.unitPrice=lp; rec.unitPriceDate=todayISO(); }
      rec.priceMode="manual"; rec.unit="m²"; rec.priceCur=document.getElementById("hTc").value; rec.cardCur=document.getElementById("hTd").value; delete rec.currency; delete rec.platform; delete rec.isFund;
    } else if(k==="metal"||k==="valuta"){
      rec.qty=num(document.getElementById("hQ").value);
      var u=document.getElementById("hU").value;
      var bnrOk = k==="valuta" || (bnrAvailable(rec) && u!=="buc");
      rec.priceMode=(bnrOk && mode==="bnr")?"bnr":"manual";
      if(rec.priceMode==="manual"){ var np=num(document.getElementById("hPr").value); if(np!==rec.unitPrice){ rec.unitPrice=np; rec.unitPriceDate=todayISO(); } }
      if(k==="metal"){ rec.unit=u; delete rec.currency; } else { rec.currency=document.getElementById("hC").value; rec.unit=rec.currency; }
      delete rec.platform; delete rec.isFund;
    } else {
      var vv=document.getElementById("hV").value;
      if(vv!==""){ var nv=r2(num(vv)); var l=lastVal(rec); if(!l || l.value!==nv){ rec.vals=rec.vals||[]; rec.vals.push({date:todayISO(), value:nv, ts:Date.now()}); } }
      if(k==="actiuni"){ var ps=document.getElementById("hPlS").value; rec.platform=ps==="__alt"?document.getElementById("hPl").value.trim():ps; rec.isFund=document.getElementById("hF").checked; } else { delete rec.platform; }
      rec.qty=0; delete rec.priceMode;
    }
    if(!x){ D.savings.push(rec); startingCost(rec); }
    // refresh linked expenses in case the name changed
    (rec.txs||[]).forEach(function(t){ if(t.expId) syncTxExpense(rec,t,true); });
    if(save("Salvat ✅")){ closeModal(); render(); }
  };
}
function delHolding(id){
  softDelete("Investiție ștearsă (și depunerile ei din Cheltuieli)",function(){
    var x=D.savings.find(function(s){return s.id===id;});
    if(x) (x.txs||[]).forEach(function(t){ if(t.expId) D.expenses=D.expenses.filter(function(e){return e.id!==t.expId;}); });
    D.savings=D.savings.filter(function(s){return s.id!==id;});
  });
}

// ───── Rates (gold and currencies), typed by the user ─────
// D.prices = {aur: lei per gram, EUR: lei, USD: lei, …}; D.settings.rateList = the currencies shown in the card.
// Every calculation takes its rate from here by its own key: gold → "aur", a currency holding → its currency code,
// land priced or shown in euro / dollars → that currency. Nothing is fetched from the internet.
// rows shown in the card: what the user chose (gold = "aur") plus whatever some investment needs
function rateList(){
  var l=(D.settings.rateList||["aur","EUR","USD"]).slice();
  usedRates().forEach(function(c){ if(l.indexOf(c)<0) l.push(c); });
  return l;
}
// rates some investment needs (these cannot be removed): gold for gold priced from the card, the currencies of
// currency holdings, and the currencies a land is priced or shown in
function usedRates(){
  var c=[]; var add=function(k){ if(k && k!=="RON" && c.indexOf(k)<0) c.push(k); };
  D.savings.forEach(function(x){
    if(!hasHolding(x)) return;   // an empty investment needs no rate
    if(x.kind==="metal" && x.priceMode!=="manual" && bnrAvailable(x)) add("aur");
    if(x.kind==="valuta" && x.priceMode!=="manual") add(x.currency);
    if(x.kind==="teren"){ add(x.priceCur); add(x.cardCur); }
  });
  return c;
}
function usedCurrencies(){ return usedRates().filter(function(k){ return k!=="aur"; }); }
function rateCard(){
  var row=function(key,label,unit,del){
    return '<div class="rrow"><span class="rk">'+label+'</span><input class="valin" inputmode="decimal" value="'+(D.prices[key]?String(D.prices[key]).replace(".",","):"")+'" placeholder="0,00" onkeydown="if(event.key===\'Enter\')this.blur()" onchange="setRate(\''+key+'\',this.value)"><span class="mut">'+unit+'</span>'+
      (del?'<i class="fas fa-xmark ib del" title="Scoate '+key+'" onclick="delRate(\''+key+'\')"></i>':'<span></span>')+'</div>';
  };
  var list=rateList();
  return '<div class="c"><div class="cl"><i class="fas fa-coins"></i> Curs aur și valută</div>'+
    '<div class="rgrid">'+(list.length?list.map(function(c){ return c==="aur" ? row("aur","Aur","lei/g",true) : row(c,c,"lei",true); }).join(""):'<span class="mut" style="font-size:.84rem">Nimic — apasă „+ Adaugă”.</span>')+'</div>'+
    '<div class="br" style="margin-top:8px;align-items:center"><button class="btn sm gh" onclick="addRate()"><i class="fas fa-plus"></i> Adaugă</button>'+
    '<span class="cs" style="margin:0">'+(D.pricesDate?"scris pe "+dmy(D.pricesDate):"scrie cursul")+'</span></div></div>';
}
function setRate(key, v){
  var n=num(v); if(n<0) n=0;
  D.prices[key]=key==="aur"?r2(n):Math.round(n*10000)/10000; D.pricesDate=todayISO(); D.pricesSrc="scris de mână";
  save("Curs "+(key==="aur"?"aur":key)+": "+(n?NF4.format(D.prices[key])+(key==="aur"?" lei/g":" lei"):"—")); render();
}
function addRate(){
  var have=rateList(), opts=(have.indexOf("aur")<0?["aur"]:[]).concat(CURRENCIES.filter(function(c){ return have.indexOf(c)<0; }));
  modal('<div class="mt"><i class="fas fa-plus"></i> Adaugă aur sau o valută</div>'+
    '<div class="r2"><div><label class="L">Ce</label><select id="arC">'+opts.map(function(c){ return '<option value="'+c+'">'+(c==="aur"?"Aur (lei / gram)":c)+'</option>'; }).join("")+'<option value="__alt">Altă valută…</option></select>'+
      '<input id="arX" maxlength="3" placeholder="ex. RSD" style="margin-top:6px;display:none;text-transform:uppercase"></div>'+
    '<div><label class="L" id="arL">Cât e 1 în lei</label><input class="big" id="arV" inputmode="decimal" placeholder="0,00"></div></div>'+
    '<div class="mf"><button class="btn gh" onclick="closeModal()">Renunță</button><button class="btn" id="arS"><i class="fas fa-check"></i> Adaugă</button></div>');
  var sel=document.getElementById("arC"); sel.onchange=function(){ document.getElementById("arX").style.display=sel.value==="__alt"?"":"none"; document.getElementById("arL").textContent=sel.value==="aur"?"Lei pe gram":"Cât e 1 în lei"; }; sel.onchange();
  document.getElementById("arS").onclick=function(){
    var c=sel.value==="__alt" ? document.getElementById("arX").value.trim().toUpperCase() : sel.value;
    if(c!=="aur" && !/^[A-Z]{3}$/.test(c)){ toast("Scrie codul valutei din 3 litere (ex. GBP)"); return; }
    if(c==="RON"){ toast("RON e leul"); return; }
    D.settings.rateList=rateList(); if(D.settings.rateList.indexOf(c)<0) D.settings.rateList.push(c);
    if(c!=="aur" && CURRENCIES.indexOf(c)<0) CURRENCIES.push(c);
    var v=num(document.getElementById("arV").value); if(v>0){ D.prices[c]=c==="aur"?r2(v):Math.round(v*10000)/10000; D.pricesDate=todayISO(); }
    if(save("Am adăugat "+(c==="aur"?"aurul":c))){ closeModal(); render(); }
  };
}
function delRate(c){
  var used=D.savings.filter(function(x){
    if(!hasHolding(x)) return false;
    if(c==="aur") return x.kind==="metal" && x.priceMode!=="manual" && bnrAvailable(x);
    return (x.kind==="valuta" && x.currency===c && x.priceMode!=="manual") || (x.kind==="teren" && (x.priceCur===c || x.cardCur===c));
  });
  var doIt=function(){
    // the investments that used this rate keep today's price as their own, so nothing changes in their value
    var rate=D.prices[c]||0;
    used.forEach(function(x){
      if(x.kind==="teren"){
        if(x.priceCur===c){ x.unitPrice=r2((x.unitPrice||0)*rate); x.priceCur="RON"; }
        if(x.cardCur===c) x.cardCur="RON";
      } else { x.unitPrice = x.kind==="metal" ? r2(rate*(UNIT_G[x.unit]||1)) : rate; x.unitPriceDate=todayISO(); x.priceMode="manual"; }
    });
    D.settings.rateList=rateList().filter(function(x){ return x!==c; }); delete D.prices[c];
    save("Am scos "+(c==="aur"?"aurul":c)); render();
  };
  if(!used.length) return doIt();
  confirmBox((c==="aur"?"Aurul":c)+" e folosit de: <b>"+used.map(function(x){ return esc(x.name); }).join(", ")+"</b>.<br>Dacă îl scoți, "+(used.length>1?"ele păstrează":"ea păstrează")+" prețul de acum ("+(D.prices[c]?(c==="aur"?NF2.format(D.prices[c])+" lei/g":NF4.format(D.prices[c])+" lei"):"—")+") ca preț propriu, iar valoarea nu se schimbă. Îl scoți?", doIt, "Da, scoate");
}
// "Valoare acum" card: a switch shows the total in euro (at the EUR rate from the Curs card)
function valueCard(tVal, n){
  var eur=!!D.settings.savEur, r=D.prices.EUR||0;
  var val = eur ? (r ? NF2.format(r2(tVal/r))+" €" : "—") : money(tVal);
  return '<div class="c"><div class="cl" style="display:flex;align-items:center;gap:6px"><i class="fas fa-coins"></i> Valoare acum'+
      '<label class="sw sp" style="margin-left:auto" title="Arată suma în euro, la cursul EUR din cartonașul Curs"><input type="checkbox"'+(eur?' checked':'')+' onchange="D.settings.savEur=this.checked;save();render()"><span class="sl"></span><span class="swl">€</span></label></div>'+
    '<div class="cv">'+val+'</div>'+
    '<div class="cs">'+(eur ? (r ? "= "+money(tVal)+" · 1 € = "+NF4.format(r)+" lei" : "scrie cursul EUR în cartonașul Curs") : n+" investiții")+'</div></div>';
}


// ───── History: year-end savings (from the workbook) compared with now ─────
function renderSavingsHistory(y){
  var snap=D.savingsHistory[y], now=D.savings.filter(hasHolding);
  var key=function(n){ return normKey(n); };
  var nowBy={}; now.forEach(function(x){ nowBy[key(x.name)]=x; });
  var tThen=0, tNow=0; snap.items.forEach(function(i){ tThen+=i.value; }); now.forEach(function(x){ tNow+=holdingValue(x); });
  var d=r2(tNow-tThen);
  var h=pageHead("Economii","Situația la final de "+y+", față de acum",savTabs());
  h+='<div class="g g4">'+
    card("fa-clock-rotate-left","Total la final de "+y,money(tThen),"",snap.items.length+" poziții")+
    card("fa-coins","Total acum",money(tNow),"",now.length+" poziții")+
    card("fa-arrow-trend-"+(d>=0?"up":"down"),"Diferență",(d>=0?"+":"−")+money(Math.abs(d)),d>=0?"pos":"neg",tThen?(d>=0?"+":"−")+NF2.format(Math.abs(d/tThen*100))+"%":"")+
    '<div class="c"><div class="cl"><i class="fas fa-building-columns"></i> Prețuri la final de '+y+'</div><div class="rates">'+
      (snap.prices.aur?'<span>Aur <b>'+NF2.format(snap.prices.aur)+'</b> lei/g</span>':'')+(snap.prices.EUR?'<span>EUR <b>'+NF4.format(snap.prices.EUR)+'</b></span>':'')+(snap.prices.USD?'<span>USD <b>'+NF4.format(snap.prices.USD)+'</b></span>':'')+'</div><div class="cs">din REZUMAT '+y+'</div></div>'+
  '</div>';
  var groups=[["metal","fa-ring","Metale"],["valuta","fa-money-bill-wave","Valută"],["actiuni","fa-chart-line","Acțiuni și fonduri"],["teren","fa-mountain-sun","Terenuri"],["altele","fa-box-archive","Altele"]];
  var used={};
  groups.forEach(function(gr){
    var rows=snap.items.filter(function(i){return i.kind===gr[0];}).map(function(i){ var n=nowBy[key(i.name)]; if(n) used[key(i.name)]=1; return {name:i.name, fund:i.isFund, qty:i.qty, unit:i.unit, then:i.value, now:n?holdingValue(n):null, nqty:n?n.qty:null}; });
    now.filter(function(x){ return (x.kind===gr[0]) && !snap.items.some(function(i){return key(i.name)===key(x.name);}); }).forEach(function(x){ rows.push({name:x.name, fund:x.isFund, qty:null, unit:x.unit, then:null, now:holdingValue(x), nqty:x.qty}); });
    if(!rows.length) return;
    var st=0, sn=0; rows.forEach(function(r){ st+=r.then||0; sn+=r.now||0; });
    h+='<div class="c" style="margin-bottom:16px"><div class="ct"><i class="fas '+gr[1]+'"></i> '+gr[2]+'<span class="sp br mut" style="font-weight:400;font-size:.82rem">'+y+': <b style="color:var(--txt)">'+money(st)+'</b> → acum: <b style="color:var(--txt)">'+money(sn)+'</b></span></div>'+
      '<div class="tw"><table class="rt"><thead><tr><th>Ce</th><th class="n" style="text-align:right">Final '+y+'</th><th class="n" style="text-align:right">Acum</th><th class="n" style="text-align:right">Diferență</th><th></th></tr></thead><tbody>'+
      rows.map(function(r){
        var dd = (r.now!=null && r.then!=null) ? r2(r.now-r.then) : null;
        var tag = r.then==null ? '<span class="bg gb">nou</span>' : (r.now==null ? '<span class="bg gm">nu mai e</span>' : '');
        var q=function(v){ return v ? ' <span class="hint" style="display:inline">('+NF2.format(v)+' '+esc(r.unit||"")+')</span>' : ''; };
        return '<tr><td><b>'+esc(r.name)+'</b>'+(r.fund?' <span class="bg gb">fond</span>':'')+'</td>'+
          '<td class="n">'+(r.then!=null?money(r.then)+q(r.qty):'<span class="mut">—</span>')+'</td>'+
          '<td class="n">'+(r.now!=null?money(r.now)+q(r.nqty):'<span class="mut">—</span>')+'</td>'+
          '<td class="n">'+(dd!=null?'<b class="'+(dd>=0?"pos":"neg")+'">'+(dd>=0?"+":"−")+money(Math.abs(dd))+'</b>':'')+'</td><td>'+tag+'</td></tr>';
      }).join("")+'</tbody></table></div></div>';
  });
  h+='<p class="hint">„Final '+y+'” vine din foaia REZUMAT a Excel-ului '+y+' (valoarea la prețul de atunci). „Acum” e ce ai la pagina Economii.</p>';
  document.getElementById("pg").innerHTML=h;
}
