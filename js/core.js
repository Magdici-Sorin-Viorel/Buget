// Buget Familie — core.js
// App data (D), persistence, calculations (totals, budget, carried-over balance), formatting.


function freshData(){
  return {
    v:1,
    settings:{dark:true, people:[],
      incomeTypes:["Salariu","Bonuri de masă","Alocație","Pensie","Chirie","Bonus","Împrumut","Altele"], photos:{}},
    cats: JSON.parse(JSON.stringify(DEFAULT_CATS)),
    budgets:{},          // per-month overrides of the default budget: {"2026-03":{mancare:5500}}
    expenses:[],         // {id, month:"2026-03", day:12|null, cat, sub, desc, amount}
    incomes:[],          // {id, month, day, person, type, desc, amount}
    adjustments:[],      // account adjustments: {id, month, desc, amount (+ in / − out)}
    savings:[],          // investments: {id, name, kind, qty, unit, priceMode, unitPrice, txs, vals, alloc, remind, note}
    prices:{aur:0, euro:0, dolar:0},
    pricesDate:"",
    years:[]             // imported years
  };
}

var D = freshData();
// View state (not persisted)
var S = {page:"dash", ym:curYM(), year:new Date().getFullYear(), canSave:false};

// ───────────────────────── Persistence ─────────────────────────
// The data file the user chose is the real home of the data (see storage.js). Here we only
// fold a loaded object into D and tell the storage layer that something changed.

function adoptData(p){
  try{
    var base=freshData();
    D=Object.assign(base, p||{});
    D.settings=Object.assign(freshData().settings, (p&&p.settings)||{});
  }catch(e){ console.error(e); }
  if(!D.prices) D.prices={};
  if(!Array.isArray(D.settings.people)) D.settings.people=[];
  migrateSavings();
}

// Every change goes through here. Returns true so the callers that check it keep working.
function save(msg){
  stgTouch();
  if(msg) toast(msg);
  return true;
}

// Kept for the places that ask for an extra copy before something risky.
function dailySnapshot(force){ try{ stgSnapshot(force); }catch(e){} }
function listSnapshots(){ return STG.snaps.slice(); }

// ───────────────────────── Helpers ─────────────────────────
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function curYM(){ var d=new Date(); return d.getFullYear()+"-"+pad2(d.getMonth()+1); }
function todayISO(){ var d=new Date(); return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate()); }
function ymAdd(ym,k){ var y=+ym.slice(0,4), m=+ym.slice(5,7)-1+k; y+=Math.floor(m/12); m=((m%12)+12)%12; return y+"-"+pad2(m+1); }
function ymLabel(ym){ return LUNI[+ym.slice(5,7)-1]+" "+ym.slice(0,4); }
function ymShort(ym){ return LUNI[+ym.slice(5,7)-1].slice(0,3); }
function daysIn(ym){ return new Date(+ym.slice(0,4), +ym.slice(5,7), 0).getDate(); }
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
function num(v){ if(typeof v==="number") return v; v=String(v||"").replace(/\s/g,"").replace(",","."); var n=parseFloat(v); return isFinite(n)?n:0; }

var NF2=new Intl.NumberFormat("ro-RO",{minimumFractionDigits:2,maximumFractionDigits:2});
var NF0=new Intl.NumberFormat("ro-RO",{maximumFractionDigits:0});
function money(v){ return NF2.format(v||0)+" lei"; }
function money0(v){ return NF0.format(Math.round(v||0))+" lei"; }
function nf(v){ return NF2.format(v||0); }
function pct(a,b){ return b>0 ? Math.round(a/b*100) : 0; }

function cat(id){ for(var i=0;i<D.cats.length;i++) if(D.cats[i].id===id) return D.cats[i]; return {id:id,name:id,icon:"fa-tag",color:"#888",budget:0,subs:[]}; }
function catIco(c, size){
  c=typeof c==="string"?cat(c):c;
  return '<span class="cico" style="background:'+hexA(c.color,.18)+';color:'+c.color+(size?';width:'+size+'px;height:'+size+'px':'')+'"><i class="fas '+esc(c.icon)+'"></i></span>';
}
function hexA(hex,a){
  var h=String(hex||"#888").replace("#",""); if(h.length===3) h=h.split("").map(function(x){return x+x;}).join("");
  var n=parseInt(h,16); return "rgba("+((n>>16)&255)+","+((n>>8)&255)+","+(n&255)+","+a+")";
}
function isOutside(catId){ return !!cat(catId).outside; }

// ───────────────────────── Calculations ─────────────────────────
function sum(arr){ var s=0; for(var i=0;i<arr.length;i++) s+=arr[i].amount; return r2(s); }
function expOf(ym, inclOutside){ return D.expenses.filter(function(e){ return e.month===ym && (inclOutside || !isOutside(e.cat)); }); }
function incOf(ym){ return D.incomes.filter(function(e){ return e.month===ym; }); }
function adjOf(ym){ return D.adjustments.filter(function(e){ return e.month===ym; }); }

// The per-category budget is optional (Settings). When off it is hidden everywhere, but amounts are kept.
function budgetOn(){ return !!D.settings.useBudget; }
function budgetFor(ym, catId){
  if(!budgetOn() && S.page!=="bud") return 0;
  var o=D.budgets[ym]; if(o && o[catId]!==undefined) return o[catId];
  return cat(catId).budget||0;
}
function totalBudget(ym){ var s=0; D.cats.forEach(function(c){ if(!c.outside) s+=budgetFor(ym,c.id); }); return s; }

function allMonths(){
  var set={};
  [D.expenses,D.incomes,D.adjustments].forEach(function(a){ a.forEach(function(x){ set[x.month]=1; }); });
  return Object.keys(set).sort();
}

// Balance carries over automatically: month end = month start + incomes − expenses + adjustments
var _balCache=null;
function invalidate(){ _balCache=null; }
function balances(){
  if(_balCache) return _balCache;
  var ms=allMonths(), res={};
  if(!ms.length){ _balCache=res; return res; }
  var start=ms[0], end=ms[ms.length-1]; if(curYM()>end) end=curYM();
  var bal=0, ym=start, guard=0;
  while(ym<=end && guard++<1200){
    // opening balance and carry-over corrections from Excel belong to the carried-over amount, not to the month's adjustments
    var adjs=adjOf(ym), carryAdj=sum(adjs.filter(isCarryAdj)), adj=sum(adjs.filter(function(a){return !isCarryAdj(a);}));
    bal=r2(bal+carryAdj);
    var inc=sum(incOf(ym)), exp=sum(expOf(ym));
    var o={start:r2(bal), inc:inc, exp:exp, adj:adj, net:r2(inc-exp)};
    bal=r2(bal+inc-exp+adj); o.end=bal; res[ym]=o;
    ym=ymAdd(ym,1);
  }
  _balCache=res; return res;
}
function isCarryAdj(a){ return /^(Sold de început|Diferență report)/.test(a.desc||""); }
function monthInfo(ym){
  var b=balances()[ym];
  if(b) return b;
  var ms=allMonths(), prev=0;
  if(ms.length && ym>ms[ms.length-1]){ var bb=balances(); var ks=Object.keys(bb).sort(); prev=bb[ks[ks.length-1]].end; }
  return {start:prev, inc:0, exp:0, adj:0, net:0, end:prev};
}

function byCat(list){
  var m={}; list.forEach(function(e){ m[e.cat]=(m[e.cat]||0)+e.amount; });
  Object.keys(m).forEach(function(k){ m[k]=r2(m[k]); }); return m;
}
function yearsWithData(){
  var ys={}; allMonths().forEach(function(m){ ys[m.slice(0,4)]=1; });
  ys[String(new Date().getFullYear())]=1;
  return Object.keys(ys).sort();
}
function monthsOfYear(y){ var a=[]; for(var i=1;i<=12;i++) a.push(y+"-"+pad2(i)); return a; }

// Prices: D.prices = {aur: lei/gram, EUR: lei, USD: lei, …}, typed in the "Curs aur și valută" card.
// Gold and currencies take their rate from there (priceMode "bnr", the name kept from older versions) or have a
// price of their own (priceMode "manual"); other metals always have their own price.
var UNIT_G={g:1, kg:1000, oz:31.1034768};
function bnrAvailable(h){
  if(h.kind==="valuta") return true;
  return h.kind==="metal" && normKey(h.name).indexOf("aur")===0;   // the Curs card has gold only, not silver or copper
}
// land: price per m² may be typed in lei, euro or dollars (priceCur); the card may show lei, euro or dollars (cardCur)
var CUR_SIGN={RON:"lei", EUR:"€", USD:"$"};
function curRate(c){ return (!c||c==="RON") ? 1 : (D.prices[c]||0); }
function landMoney(h, lei){ var c=h.cardCur||"RON", r=curRate(c); return (c==="RON"||!r) ? money0(lei) : NF0.format(Math.round(lei/r))+" "+CUR_SIGN[c]; }
function unitPrice(h){
  if(h.kind==="teren") return (h.unitPrice||0)*curRate(h.priceCur);
  if(h.priceMode==="manual" || !bnrAvailable(h)) return h.unitPrice||0;
  if(h.kind==="metal") return (D.prices.aur||0)*(UNIT_G[h.unit]||1);
  return D.prices[h.currency]||0;
}
// ── Investments: every position has deposits (txs) and valuations (vals) ──
// txs:  [{id, date, amount (lei spent), qty (grams / currency bought), payer, initial, expId, ts}]
// vals: [{date, value, ts}] — real value typed from the broker (stock accounts / other)
// kinds counted by quantity × price per unit: metals (g…), currencies, land (m²)
function qtyKind(h){ return h.kind==="metal"||h.kind==="valuta"||h.kind==="teren"; }
function unitName(h){ return h.kind==="valuta" ? (h.currency||"") : (h.kind==="teren" ? "m²" : (h.unit||"g")); }
// money still invested = deposits + corrections (invAdj) − the cost of what was sold
function invested(h){ var s=h.invAdj||0; (h.txs||[]).forEach(function(t){ s+=t.amount||0; }); (h.sales||[]).forEach(function(q){ s-=q.cost||0; }); return r2(s); }
// profit already taken out by selling: money received − what that part had cost (for one person when p is given)
function realized(h, p){ var s=0; (h.sales||[]).forEach(function(q){ if(p===undefined || q.person===p) s+=(q.received||0)-(q.cost||0); }); return r2(s); }
function lastVal(h){ var v=(h.vals||[]).slice().sort(function(a,b){return a.date<b.date?-1:(a.date>b.date?1:(a.ts||0)-(b.ts||0));}); return v[v.length-1]||null; }
// was the deposit made after the last valuation? (on the same day, the entry time decides)
function txAfter(t,lv){ if(t.initial || !t.date) return false; return t.date>lv.date || (t.date===lv.date && (t.ts||0)>(lv.ts||0)); }
function holdingValue(h){
  if(qtyKind(h)) return r2((h.qty||0)*unitPrice(h));
  var lv=lastVal(h); if(!lv) return invested(h);
  // after the last valuation, add deposits made since (estimated value until the next valuation)
  var add=0; (h.txs||[]).forEach(function(t){ if(txAfter(t,lv)) add+=t.amount; });
  return r2(lv.value+add);
}
function isEstimated(h){
  if(qtyKind(h)) return false;
  var lv=lastVal(h); if(!lv) return true;
  return (h.txs||[]).some(function(t){ return txAfter(t,lv); });
}
function lastUpdate(h){
  if(h.kind==="actiuni"||h.kind==="altele"){ var lv=lastVal(h); return lv?lv.date:""; }
  if(h.priceMode==="manual" || !bnrAvailable(h)) return h.unitPriceDate||"";
  return D.pricesDate||"";
}
function addMonthsISO(d,m){ var x=new Date(d+"T12:00:00"); x.setMonth(x.getMonth()+m); return x.toISOString().slice(0,10); }
function isDue(h){
  var m=h.remind==null?3:h.remind; if(!m || !hasHolding(h)) return false;
  var t=todayISO(); if(h.snooze && h.snooze>t) return false;
  var lu=lastUpdate(h); return !lu || addMonthsISO(lu,m)<=t;
}
function hasHolding(x){ return (x.qty||0)>0 || invested(x)>0 || (lastVal(x)&&lastVal(x).value>0); }
// migrate older data: "euro"/"dolar" price keys → currency codes; invested/value → txs/vals
function migrateSavings(){
  var P=D.prices;
  if(P.euro!==undefined){ if(!P.EUR) P.EUR=P.euro; delete P.euro; }
  if(P.dolar!==undefined){ if(!P.USD) P.USD=P.dolar; delete P.dolar; }
  (D.savings||[]).forEach(function(h){
    if(h.kind==="valuta" && !h.currency) h.currency = (h.priceKey==="dolar"||h.unit==="USD") ? "USD" : (h.unit||"EUR");
    if(h.kind==="fond") h.kind="actiuni", h.isFund=true;
    if(["metal","valuta","actiuni","teren","altele"].indexOf(h.kind)<0) h.kind="actiuni";
    if(h.platform===undefined) h.platform="";
    if((h.kind==="metal"||h.kind==="valuta") && !h.priceMode) h.priceMode="bnr";
    if(h.kind==="metal" && !UNIT_G[h.unit] && h.unit!=="buc") h.unit="g";
    delete h.priceKey;
    if(!h.txs){
      h.txs = (h.invested>0) ? [{id:uid(), date:"", amount:h.invested, qty:qtyKind(h)?(h.qty||0):0, payer:"", initial:true}] : [];
      h.vals = ((h.kind==="actiuni"||h.kind==="altele") && h.value!=null) ? [{date:h.valueDate||"", value:h.value}] : [];
      delete h.invested; delete h.value; delete h.valueDate;
    }
    if(!h.vals) h.vals=[];
    if(h.owner===undefined) h.owner="";
    if(h.remind===undefined) h.remind=3;
    if(h.kind==="teren"){ h.priceMode="manual"; h.unit="m²"; if(!h.priceCur) h.priceCur="RON"; if(!h.cardCur) h.cardCur="RON"; }
    startingCost(h);
  });
  fixCostBasis();
}
// An investment added with a value but no deposit: what it is worth when added counts as what it cost
// (like the values imported from Excel), so it does not show its whole value as profit. The real cost can be
// typed later in the investment's details ("A costat").
function startingCost(h){
  if((h.txs||[]).length || (h.sales||[]).length || h.invAdj) return;
  var v=holdingValue(h); if(!(v>0)) return;
  h.txs=[{id:uid(), date:"", amount:r2(v), qty:qtyKind(h)?(h.qty||0):0, payer:"", initial:true}];
  if(h.allocInv){ var tot=qtyKind(h)?(h.qty||0):1;
    Object.keys(h.alloc||{}).forEach(function(p){ var f=(h.alloc[p]||0)/(tot||1); if(f>0) h.allocInv[p]=r2(v*f); }); }
}
// One-time repair (Nov 2026): an earlier version could leave a wrong cost on a person's grams after their
// quantity was edited. For metal / currency / land bought only at the start, every gram costs the same.
function fixCostBasis(){
  if(D.settings.costFix1) return;
  D.savings.forEach(function(h){
    if(!qtyKind(h) || !h.allocInv || h.costEdited || (h.sales||[]).length) return;
    var tx=h.txs||[]; if(!tx.length || tx.some(function(t){ return !t.initial; })) return;
    var a=0, q=0; tx.forEach(function(t){ a+=t.amount||0; q+=t.qty||0; }); if(!(q>0)) return;
    var avg=a/q, used=0, sumAi=0;
    Object.keys(h.allocInv).forEach(function(p){ if(!((h.alloc||{})[p]>0)) delete h.allocInv[p]; });
    Object.keys(h.alloc||{}).forEach(function(p){ var qq=h.alloc[p]||0; if(qq>0){ h.allocInv[p]=r2(qq*avg); used+=qq; sumAi+=h.allocInv[p]; } });
    h.invAdj=r2(sumAi+Math.max(0,(h.qty||0)-used)*avg-a);
  });
  D.settings.costFix1=1;
}
