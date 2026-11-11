// Buget Familie — incomes.js (Income page and the account-adjustment dialog)

function renderIncomes(){
  var ym=S.ym, mi=monthInfo(ym), inc=incOf(ym);
  var h=pageHead("Venituri", ymLabel(ym), monthPicker()+'<button class="btn" onclick="openIncome()"><i class="fas fa-plus"></i> Venit</button>');

  h+='<div class="g g32"><div class="c"><div class="ct"><i class="fas fa-wallet"></i> Venituri în '+LUNI[+ym.slice(5,7)-1]+'<span class="sp bg gg">'+money(mi.start+mi.inc)+'</span></div>';
  if(inc.length || mi.start){
    h+='<div class="tw"><table class="rt"><thead><tr><th>Persoana</th><th>Tip</th><th>Detalii</th><th>Zi</th><th class="n">Suma</th><th></th></tr></thead><tbody>'+
      (mi.start?'<tr style="background:rgba(74,158,255,.06)"><td style="white-space:nowrap"><span class="av" style="width:26px;height:26px;font-size:.7rem;color:var(--info);border-color:rgba(74,158,255,.4);background:rgba(74,158,255,.12)"><i class="fas fa-rotate-right"></i></span> <b>Reportat</b></td><td><span class="bg gb">Din luna trecută</span></td><td class="mut">rămas din '+LUNI[+ymAdd(ym,-1).slice(5,7)-1]+'</td><td class="mut">01</td><td class="n"><b class="'+(mi.start<0?'neg':'')+'">'+money(mi.start)+'</b></td><td></td></tr>':'')+
      inc.map(function(e){
        return '<tr><td style="white-space:nowrap">'+(e.person?avatar(e.person,26)+' ':'')+'<b>'+esc(e.person||"—")+'</b></td><td><span class="bg '+typeCls(e.type)+'">'+esc(e.type)+'</span></td><td class="mut">'+esc(e.desc)+'</td><td class="mut">'+(e.day?pad2(e.day):"—")+'</td><td class="n"><b>'+money(e.amount)+'</b></td>'+
          '<td class="act"><button class="ib" onclick="openIncome(\''+e.id+'\')"><i class="fas fa-pen"></i></button><button class="ib del" onclick="delIncome(\''+e.id+'\')"><i class="fas fa-trash"></i></button></td></tr>';
      }).join("")+'</tbody><tfoot><tr><td colspan="4">TOTAL'+(mi.start?' <span class="mut" style="font-weight:400">(încasări '+money(mi.inc)+' + reportat '+money(mi.start)+')</span>':'')+'</td><td class="n">'+money(mi.start+mi.inc)+'</td><td></td></tr></tfoot></table></div>';
  } else h+='<div class="empty"><i class="fas fa-wallet"></i>Niciun venit în luna asta.</div>';
  h+='</div>';

  h+='<div class="c">';
  // per person
  var per={}; inc.forEach(function(e){ var k=e.person||e.type; per[k]=(per[k]||0)+e.amount; });
  if(Object.keys(per).length){
    h+='<div class="ct"><i class="fas fa-users"></i> Pe persoane</div>'+Object.keys(per).sort(function(a,b){return per[b]-per[a];}).map(function(k){
      return '<div class="kv"><span>'+(D.settings.people.indexOf(k)>=0?avatar(k,22)+' ':'')+esc(k)+'</span><b>'+money(per[k])+' <span class="mut" style="font-weight:400">('+pct(per[k],mi.inc)+'%)</span></b></div>';
    }).join("");
  }
  else h+='<div class="ct"><i class="fas fa-users"></i> Pe persoane</div><div class="mut" style="font-size:.85rem">Nicio încasare.</div>';
  h+='</div></div>';

  document.getElementById("pg").innerHTML=h;
}
function typeCls(t){ var k=normKey(t); return k==="salariu"?"gg":k==="imprumut"?"gr":k==="chirie"?"gb":"gy"; }

function openIncome(id){
  var e=id?D.incomes.find(function(x){return x.id===id;}):null;
  var ppl=D.settings.people.slice(); if(e && e.person && ppl.indexOf(e.person)<0) ppl.push(e.person);
  var tps=D.settings.incomeTypes.slice(); if(e && tps.indexOf(e.type)<0) tps.push(e.type);
  // date: today by default (first of the viewed month when browsing another month); "fără zi" keeps month only
  var noDay = e ? !e.day : false;
  var date = e ? (e.day ? e.month+"-"+pad2(e.day) : e.month+"-01") : (S.ym===curYM() ? todayISO() : S.ym+"-01");
  modal('<div class="mt"><i class="fas fa-wallet"></i> '+(e?"Modifică venitul":"Venit nou")+'</div>'+
    '<label class="L">Persoana</label><div class="chips" id="inPc">'+ppl.map(function(p){return '<span class="chip pchip'+((e?e.person:ppl[0])===p?' on':'')+'" data-p="'+esc(p)+'">'+avatar(p,24)+' '+esc(p)+'</span>';}).join("")+
      '<span class="chip pchip'+(e&&!e.person?' on':'')+'" data-p="">— nimeni anume —</span></div><input type="hidden" id="inP" value="'+esc(e?e.person:(ppl[0]||""))+'">'+
    '<div class="r2"><div><label class="L">Tip</label><select id="inT">'+tps.map(function(t){return '<option'+((e?e.type:"Salariu")===t?' selected':'')+'>'+esc(t)+'</option>';}).join("")+'</select></div>'+
    '<div><label class="L">Data</label><input type="date" id="inDt" value="'+date+'"'+(noDay?' disabled':'')+'>'+
      '<label class="hint" style="display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" id="inNoDay"'+(noDay?' checked':'')+'> fără zi (doar luna)</label>'+
      '<select id="inM" style="margin-top:6px;'+(noDay?'':'display:none')+'">'+monthOptions(e?e.month:S.ym)+'</select></div></div>'+
    '<label class="L">Detalii (opțional)</label><input id="inX" value="'+esc(e?e.desc:"")+'" placeholder="ex. prima, sticle, plastic">'+
    '<label class="L">Suma (lei)</label><input class="big" id="inA" inputmode="decimal" value="'+(e?nf(e.amount).replace(/\./g,""):"")+'" autofocus>'+
    '<div class="mf"><button class="btn gh" onclick="closeModal()">Renunță</button><button class="btn" id="inS"><i class="fas fa-check"></i> Salvează</button></div>');
  document.querySelectorAll("#inPc .pchip").forEach(function(ch){ ch.onclick=function(){ document.querySelectorAll("#inPc .pchip").forEach(function(x){x.classList.remove("on");}); ch.classList.add("on"); document.getElementById("inP").value=ch.dataset.p; }; });
  document.getElementById("inNoDay").onchange=function(){
    var nd=this.checked; document.getElementById("inDt").disabled=nd; document.getElementById("inM").style.display=nd?"":"none";
  };
  var doSave=function(){
    var a=num(document.getElementById("inA").value); if(!(a>0)){ toast("Scrie suma"); return; }
    var month, day=null;
    if(document.getElementById("inNoDay").checked) month=document.getElementById("inM").value;
    else { var dt=document.getElementById("inDt").value; if(!dt){ toast("Alege data"); return; } month=dt.slice(0,7); day=+dt.slice(8,10); }
    var rec={person:document.getElementById("inP").value, type:document.getElementById("inT").value, month:month,
      day:day, desc:document.getElementById("inX").value.trim(), amount:r2(a)};
    if(e) Object.assign(e,rec); else { rec.id=uid(); D.incomes.push(rec); }
    if(save("Venit salvat ✅")){ closeModal(); render(); }
  };
  document.getElementById("inS").onclick=doSave;
  document.getElementById("inA").addEventListener("keydown",function(ev){ if(ev.key==="Enter") doSave(); });
}
function delIncome(id){ softDelete("Venit șters",function(){ D.incomes=D.incomes.filter(function(x){return x.id!==id;}); }); }

// Account adjustment, for when the app balance differs from the real money.
// Mode 1: type the real balance and the difference is computed. Mode 2: type the adjustment amount.
function openAdj(id){
  var a=id?D.adjustments.find(function(x){return x.id===id;}):null;
  var m0=a?a.month:S.ym, mode=a?"sum":"real";
  modal('<div class="mt"><i class="fas fa-scale-balanced"></i> Reglare cont</div>'+
    '<p class="cs" style="margin-bottom:6px">Folosește-o când banii din aplicație nu se potrivesc cu banii pe care îi ai în realitate.</p>'+
    '<div class="seg" id="ajMode"><button data-m="real"><i class="fas fa-wallet"></i> Am de fapt…</button><button data-m="sum"><i class="fas fa-pen"></i> Scriu diferența</button></div>'+
    '<div class="r2"><div><label class="L">Luna</label><select id="ajM">'+monthOptions(m0)+'</select></div><div><label class="L">Descriere</label><input id="ajX" value="'+esc(a?a.desc:"Reglare cont")+'"></div></div>'+
    '<div id="ajReal"><div class="al ali" id="ajInfo" style="margin-top:12px"></div>'+
      '<label class="L">Câți bani ai de fapt acum (lei)</label><input class="big" id="ajR" inputmode="decimal" autofocus><div class="hint" id="ajDiff" style="font-size:.85rem;margin-top:6px"></div></div>'+
    '<div id="ajSum"><div class="r2"><div><label class="L">Sens</label><select id="ajS"><option value="-1"'+(a&&a.amount>0?'':' selected')+'>− scad din sold</option><option value="1"'+(a&&a.amount>0?' selected':'')+'>+ adaug la sold</option></select></div>'+
      '<div><label class="L">Suma (lei)</label><input class="big" id="ajA" inputmode="decimal" value="'+(a?nf(Math.abs(a.amount)).replace(/\./g,""):"")+'"></div></div></div>'+
    '<div class="mf">'+(a?'<button class="btn bd" style="margin-right:auto" onclick="closeModal();delAdj(\''+a.id+'\')"><i class="fas fa-trash"></i> Șterge</button>':'')+
      '<button class="btn gh" onclick="closeModal()">Renunță</button><button class="btn" id="ajB"><i class="fas fa-check"></i> Salvează</button></div>');
  var appBal=function(){ // app balance at month end, excluding the adjustment being edited
    var m=document.getElementById("ajM").value; invalidate(); var e=monthInfo(m).end; return r2(e-(a&&a.month===m?a.amount:0));
  };
  var upd=function(){
    document.querySelectorAll("#ajMode button").forEach(function(b){ b.classList.toggle("on",b.dataset.m===mode); });
    document.getElementById("ajReal").style.display=mode==="real"?"":"none";
    document.getElementById("ajSum").style.display=mode==="sum"?"":"none";
    var m=document.getElementById("ajM").value, ab=appBal();
    document.getElementById("ajInfo").innerHTML='În aplicație, la final de '+LUNI[+m.slice(5,7)-1]+', ai <b>'+money(ab)+'</b>.';
    var rv=document.getElementById("ajR").value;
    if(rv!==""){ var d=r2(num(rv)-ab); document.getElementById("ajDiff").innerHTML = Math.abs(d)<0.01 ? '<span class="pos">Se potrivește — nu e nevoie de reglare.</span>' : 'Reglare: <b class="'+(d<0?"neg":"pos")+'">'+(d>0?"+":"−")+money(Math.abs(d))+'</b> ('+(d<0?"ai mai puțini bani decât arată aplicația":"ai mai mulți bani decât arată aplicația")+')'; }
    else document.getElementById("ajDiff").innerHTML="";
  };
  document.querySelectorAll("#ajMode button").forEach(function(b){ b.onclick=function(){ mode=b.dataset.m; upd(); }; });
  ["ajM","ajR"].forEach(function(i){ document.getElementById(i).addEventListener("input",upd); document.getElementById(i).addEventListener("change",upd); });
  upd();
  document.getElementById("ajB").onclick=function(){
    var amount;
    if(mode==="real"){
      if(document.getElementById("ajR").value===""){ toast("Scrie câți bani ai"); return; }
      amount=r2(num(document.getElementById("ajR").value)-appBal());
      if(Math.abs(amount)<0.01){ toast("Se potrivește — nu e nevoie de reglare"); closeModal(); return; }
    } else {
      var v=num(document.getElementById("ajA").value); if(!(v>0)){ toast("Scrie suma"); return; }
      amount=r2(v*+document.getElementById("ajS").value);
    }
    var rec={desc:document.getElementById("ajX").value.trim()||"Reglare cont", month:document.getElementById("ajM").value, amount:amount};
    if(a) Object.assign(a,rec); else { rec.id=uid(); D.adjustments.push(rec); }
    if(save("Reglare salvată: "+(amount>0?"+":"−")+money(Math.abs(amount)))){ closeModal(); render(); }
  };
}
function delAdj(id){ softDelete("Reglare ștearsă",function(){ D.adjustments=D.adjustments.filter(function(x){return x.id!==id;}); }); }
