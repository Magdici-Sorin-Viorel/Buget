// Buget Familie — dashboard.js (Home page)

function renderDash(){
  var ym=S.ym, mi=monthInfo(ym), exps=expOf(ym), tb=totalBudget(ym);
  var bc=byCat(exps);
  var h=pageHead("Acasă", "Situația pe "+ymLabel(ym), monthPicker());

  if(!allMonths().length){
    h+='<div class="c empty"><i class="fas fa-seedling"></i><div style="font-size:1.05rem;color:var(--txt);font-weight:700;margin-bottom:6px">Nu ai încă date</div>'+
       'Începe cu prima cheltuială sau cu veniturile lunii. Dacă ai mai folosit aplicația, încarcă o copie salvată.<div class="br" style="justify-content:center;margin-top:14px">'+
       '<button class="btn" onclick="go(\'exp\');setTimeout(openExpense,60)"><i class="fas fa-plus"></i> Adaugă o cheltuială</button>'+
       '<button class="btn gh" onclick="go(\'inc\')"><i class="fas fa-wallet"></i> Adaugă un venit</button>'+
       '<button class="btn gh" onclick="pickFile(\'.json\',importBackup)"><i class="fas fa-file-arrow-up"></i> Încarcă o copie</button></div></div>';
    document.getElementById("pg").innerHTML=h; return;
  }

  // Summary cards
  var usedPct=pct(mi.exp,tb);
  // Income = this month's receipts + what was left over from last month
  var avail=r2(mi.start+mi.inc);
  h+='<div class="g g4">'+
    card("fa-arrow-down","Venituri",money(avail),"pos","încasări "+money0(mi.inc)+" + reportat "+money0(mi.start))+
    card("fa-arrow-up","Cheltuieli",money(mi.exp),"", (tb?usedPct+"% din bugetul de "+money0(tb):pct(mi.exp,avail)+"% din banii lunii · "+exps.length+" cheltuieli"))+
    card("fa-rotate-right","Reportat din luna trecută",money(mi.start),mi.start>=0?"":"neg","rămas din "+LUNI[+ymAdd(ym,-1).slice(5,7)-1])+
    card("fa-piggy-bank","Disponibil",money(mi.end),mi.end>=0?"pos":"neg","venituri − cheltuieli"+(mi.adj?" ± reglări "+money0(mi.adj):""))+
  '</div>';

  // Spending per day (full width)
  h+='<div class="c" style="margin-bottom:16px"><div class="ct"><i class="fas fa-calendar-day"></i> Cheltuieli pe zile — '+LUNI[+ym.slice(5,7)-1]+'</div><div class="ch"><canvas id="cDays"></canvas></div>'+
    '<span class="hint">Doar cheltuielile cu dată. '+money(sum(exps.filter(function(e){return !e.day;})))+' sunt trecute doar pe lună.</span></div>';

  // Latest expenses
  var last=D.expenses.filter(function(e){return e.month===ym;}).slice(-10).reverse();
  h+='<div class="c"><div class="ct"><i class="fas fa-clock-rotate-left"></i> Ultimele adăugate<span class="sp"><button class="btn sm gh" onclick="go(\'exp\')">Toate <i class="fas fa-arrow-right"></i></button></span></div>'+
     (last.length?'<div class="tw"><table class="rt"><tbody>'+last.map(function(e){
       return '<tr><td class="mut">'+dayLabel(e)+'</td><td>'+catIco(e.cat,24)+' '+esc(cat(e.cat).name)+'</td><td class="mut">'+esc([e.sub,e.desc].filter(Boolean).join(" · "))+'</td><td class="n"><b>'+money(e.amount)+'</b></td></tr>';
     }).join("")+'</tbody></table></div>':'<div class="empty">—</div>')+'</div>';

  document.getElementById("pg").innerHTML=h;

  // Charts
  var nd=daysIn(ym), perDay=[]; for(var d=1;d<=nd;d++) perDay.push(0);
  exps.forEach(function(e){ if(e.day) perDay[e.day-1]+=e.amount; });
  mkChart("cDays",{type:"bar",data:{labels:perDay.map(function(_,i){return i+1;}),datasets:[{label:"Cheltuit",data:perDay.map(r2),backgroundColor:"rgba(230,180,34,.8)",borderRadius:3}]},
    options:{plugins:{legend:{display:false}},scales:{y:{ticks:moneyTicks()},x:{grid:{display:false},ticks:{autoSkip:true,maxTicksLimit:16}}}}});
}

function card(ico,label,val,cls,sub){
  return '<div class="c"><div class="cl"><i class="fas '+ico+'"></i> '+label+'</div><div class="cv '+(cls||"")+'">'+val+'</div><div class="cs">'+sub+'</div></div>';
}

