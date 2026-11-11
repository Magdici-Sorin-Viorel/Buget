// Buget Familie — budget.js (Budget vs. actual per category; shown only when the budget option is on)

function renderBudget(){
  var ym=S.ym, bc=byCat(expOf(ym,true)), tb=totalBudget(ym), mi=monthInfo(ym);
  var isCur=ym===curYM(), dayNow=new Date().getDate(), nd=daysIn(ym);
  var h=pageHead("Buget", "Cât ai pus deoparte pe fiecare categorie și cât a rămas", monthPicker());

  var rest=tb-mi.exp;
  h+='<div class="g gs">'+
    card("fa-bullseye","Buget total",money(tb),"",D.cats.filter(function(c){return !c.outside&&budgetFor(ym,c.id)>0;}).length+" categorii cu buget")+
    card("fa-arrow-up","Cheltuit",money(mi.exp),"",pct(mi.exp,tb)+"% din buget")+
    card("fa-hand-holding-dollar","Rest din buget",money(rest),rest>=0?"pos":"neg",rest>=0?"poți cheltui încă":"buget depășit")+
    (isCur?card("fa-calendar","Ritm",pct(dayNow,nd)+"% din lună","",(pct(mi.exp,tb)>pct(dayNow,nd)?"cheltui mai repede decât trece luna":"ești în ritm")):
      card("fa-check-double","Categorii depășite",String(D.cats.filter(function(c){var b=budgetFor(ym,c.id);return b&&(bc[c.id]||0)>b;}).length),"","din "+D.cats.filter(function(c){return budgetFor(ym,c.id)>0;}).length))+
  '</div>';

  h+='<div class="c"><div class="tw"><table class="rt"><thead><tr><th>Categoria</th><th class="n" style="text-align:right">Buget</th><th class="n" style="text-align:right">Cheltuit</th><th class="n" style="text-align:right">Rest</th><th style="width:30%">Progres</th><th></th></tr></thead><tbody>';
  var tS=0;
  D.cats.forEach(function(c){
    var b=budgetFor(ym,c.id), s=bc[c.id]||0, r=b-s, ov=D.budgets[ym]&&D.budgets[ym][c.id]!==undefined;
    if(!c.outside) tS+=s;
    var p=b?Math.min(100,s/b*100):(s?100:0), cls=!b?"":(s>b?"over":(s/b<.8?"ok":""));
    var paceWarn = isCur && b && s/b > dayNow/nd + .15 && s<=b;
    h+='<tr'+(c.outside?' style="opacity:.65"':'')+'><td>'+catIco(c,26)+' <b>'+esc(c.name)+'</b>'+(c.outside?' <span class="bg gm">nu intră în total</span>':'')+(ov?' <span class="bg gb" title="Buget schimbat doar pentru luna asta">doar luna asta</span>':'')+'</td>'+
      '<td class="n">'+(b?money(b):'<span class="mut">—</span>')+'</td><td class="n"><b>'+money(s)+'</b></td>'+
      '<td class="n '+(r<0?"neg":"pos")+'">'+(b?money(r):'')+'</td>'+
      '<td><div class="gauge" style="margin:0"><div class="gf '+cls+'" style="width:'+p+'%"></div></div><span class="hint">'+(b?pct(s,b)+'%':'')+(paceWarn?' · <span style="color:var(--gold)">merge repede</span>':'')+'</span></td>'+
      '<td class="act"><button class="ib" onclick="editBudget(\''+c.id+'\')" title="Schimbă bugetul"><i class="fas fa-pen"></i></button></td></tr>';
  });
  h+='</tbody><tfoot><tr><td>TOTAL</td><td class="n">'+money(tb)+'</td><td class="n">'+money(tS)+'</td><td class="n '+(tb-tS<0?"neg":"pos")+'">'+money(tb-tS)+'</td><td colspan="2"></td></tr></tfoot></table></div></div>';
  document.getElementById("pg").innerHTML=h;
}

function editBudget(catId){
  var c=cat(catId), ym=S.ym, cur=budgetFor(ym,catId), ov=D.budgets[ym]&&D.budgets[ym][catId]!==undefined;
  modal('<div class="mt">'+catIco(c)+' Buget — '+esc(c.name)+'</div>'+
    '<label class="L">Suma pe lună (lei)</label><input class="big" id="bdA" inputmode="decimal" value="'+cur+'" autofocus>'+
    '<label class="L">Se aplică</label><div class="chips" id="bdW">'+
      '<span class="chip on" data-w="all">Pentru toate lunile (implicit)</span><span class="chip" data-w="one">Doar pentru '+ymLabel(ym)+'</span></div>'+
    (ov?'<div class="al ali" style="margin-top:12px">Luna asta are un buget special. Implicit: '+money(c.budget)+'. <a href="#" id="bdR" style="color:var(--info)">Revino la implicit</a></div>':'')+
    '<div class="mf"><button class="btn gh" onclick="closeModal()">Renunță</button><button class="btn" id="bdS"><i class="fas fa-check"></i> Salvează</button></div>');
  var w="all";
  document.querySelectorAll("#bdW .chip").forEach(function(ch){ ch.onclick=function(){ document.querySelectorAll("#bdW .chip").forEach(function(x){x.classList.remove("on");}); ch.classList.add("on"); w=ch.dataset.w; }; });
  var r=document.getElementById("bdR"); if(r) r.onclick=function(ev){ ev.preventDefault(); delete D.budgets[ym][catId]; save("Buget implicit"); closeModal(); render(); };
  var doSave=function(){
    var v=r2(num(document.getElementById("bdA").value));
    if(w==="one"){ D.budgets[ym]=D.budgets[ym]||{}; D.budgets[ym][catId]=v; }
    else { c.budget=v; if(D.budgets[ym]) delete D.budgets[ym][catId]; }
    if(save("Buget salvat ✅")){ closeModal(); render(); }
  };
  document.getElementById("bdS").onclick=doSave;
  document.getElementById("bdA").addEventListener("keydown",function(ev){ if(ev.key==="Enter") doSave(); });
}
