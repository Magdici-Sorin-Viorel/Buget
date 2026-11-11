// Buget Familie — welcome.js
// The guide shown the first time the app is opened: what it is, where the data will live,
// and who brings money into the house. It never shows again once it has been finished;
// it can be reopened from Settings.

var WIZ = {step:0, people:[]};

function needsWelcome(){ return !D.settings.setupDone; }

function openWelcome(fromSettings){
  WIZ.step = fromSettings ? 0 : 0;
  WIZ.people = (D.settings.people||[]).slice();
  WIZ.reopened = !!fromSettings;
  drawWelcome();
}
function closeWelcome(){
  var g=document.getElementById("wiz"); if(g) g.remove();
}
function wizGo(n){ WIZ.step=n; drawWelcome(); }

function wizFinish(){
  D.settings.people = WIZ.people.filter(function(p){ return p && p.trim(); });
  D.settings.setupDone = true;
  save();
  closeWelcome();
  S.page="exp";
  render();
  stgPaint();
  toast("Gata! Adaugă prima cheltuială cu butonul de sus ✅");
}

function drawWelcome(){
  var g=document.getElementById("wiz");
  if(!g){ g=document.createElement("div"); g.className="gate"; g.id="wiz"; document.body.appendChild(g); }
  var dots='<div class="wdots">'+[0,1,2,3].map(function(i){ return '<span class="'+(i===WIZ.step?"on":(i<WIZ.step?"done":""))+'"></span>'; }).join("")+'</div>';
  g.innerHTML='<div class="c wizc">'+dots+wizStep()+'</div>';
  var inp=document.getElementById("wizName"); if(inp) inp.focus();
}

function wizStep(){
  if(WIZ.step===0) return ''+
    '<h2><i class="fas fa-piggy-bank"></i> Bine ai venit la Buget Familie</h2>'+
    '<p>O aplicație simplă pentru banii casei: cât intră, cât iese, pe ce se duc și cât rămâne la sfârșit de lună.</p>'+
    '<p><b>Datele tale rămân la tine.</b> Nu există cont, nu există server, nimic nu pleacă pe internet. '+
    'Totul se salvează într-un fișier de pe calculatorul tău, pe care îl alegi tu în pasul următor.</p>'+
    '<p class="hint">Durează mai puțin de un minut.</p>'+
    '<div class="br" style="margin-top:16px"><button class="btn" onclick="wizGo(1)">Să începem <i class="fas fa-arrow-right"></i></button></div>';

  if(WIZ.step===1){
    if(!STG.supported) return ''+
      '<h2><i class="fas fa-download"></i> Salvarea datelor</h2>'+
      (STG.frameBlocked
        ? '<p>Vezi aplicația într-o fereastră de previzualizare, iar aici browserul nu permite scrierea în fișiere. '+
          'Totul funcționează, dar datele rămân doar în această fereastră. Pentru salvarea automată în fișier, '+
          'deschide aplicația direct, într-o filă a ei.</p>'
        : '<p>Browserul pe care îl folosești nu permite aplicațiilor să scrie direct într-un fișier. '+
          'Aplicația merge la fel de bine, dar salvarea o faci tu, cu un buton.</p>')+
      '<p><b>Ce înseamnă asta:</b> la final de sesiune apeși <b>Salvează o copie</b> și păstrezi fișierul. '+
      'Când revii, îl încarci cu <b>Deschide o copie</b>. Aplicația îți va aminti dacă ai modificări nesalvate.</p>'+
      '<p class="hint">Dacă vrei salvare automată, deschide aplicația în Google Chrome sau Microsoft Edge.</p>'+
      '<div class="br" style="margin-top:16px"><button class="btn gh" onclick="wizGo(0)">Înapoi</button>'+
      '<button class="btn" onclick="STG.mode=\'manual\';wizGo(2)">Am înțeles, mergem mai departe</button></div>';

    var done = STG.state==="ok" && STG.handle;
    return ''+
      '<h2><i class="fas fa-folder-open"></i> Unde îți ținem datele</h2>'+
      '<p>Alege un folder de pe calculator. Aplicația va ține acolo un fișier <b>buget-familie.json</b> '+
      'și, lângă el, copii datate din ultimele zile.</p>'+
      '<p><b>Sfat:</b> alege un folder din <b>Google Drive</b> sau <b>OneDrive</b>, dacă ai. Așa ai automat '+
      'o copie în cloud și îți poți deschide bugetul și de pe alt calculator.</p>'+
      '<p class="hint">Fișierul rămâne al tău. Dacă ștergi istoricul browserului sau reinstalezi Windows, datele sunt tot acolo.</p>'+
      (done ? '<div class="al alo" style="margin-top:12px"><i class="fas fa-circle-check"></i> Gata: <b>'+esc(STG.name)+'</b>'+(STG.folder?' în folderul <b>'+esc(STG.folder)+'</b>':'')+'</div>' : '')+
      '<div class="br" style="margin-top:16px">'+
      '<button class="btn gh" onclick="wizGo(0)">Înapoi</button>'+
      '<button class="btn" onclick="wizPickFolder()"><i class="fas fa-folder-open"></i> '+(done?'Alege alt folder':'Alege folderul')+'</button>'+
      (done ? '<button class="btn" onclick="wizGo(2)">Mai departe <i class="fas fa-arrow-right"></i></button>'
            : '<button class="btn gh" onclick="wizPickFile()">Prefer un singur fișier</button>')+'</div>'+
      (done ? '' : '<div style="margin-top:10px"><button class="btn sm gh" onclick="wizGo(2)">Sar peste, aleg mai târziu</button>'+
        '<span class="hint" style="margin-top:6px">Până alegi un fișier, datele stau doar în browser — și se pierd dacă îl cureți.</span></div>');
  }

  if(WIZ.step===2) return ''+
    '<h2><i class="fas fa-users"></i> Cine aduce bani în casă</h2>'+
    '<p>Scrie persoanele ale căror venituri le urmărești. Poți adăuga sau șterge oricând, din Setări.</p>'+
    '<div class="wrow"><input id="wizName" placeholder="Nume (ex. Maria)" onkeydown="if(event.key===\'Enter\'){wizAddPerson();}">'+
    '<button class="btn" onclick="wizAddPerson()"><i class="fas fa-plus"></i> Adaugă</button></div>'+
    '<div class="chips" style="margin-top:12px">'+(WIZ.people.length?WIZ.people.map(function(p,i){
      return '<span class="chip on">'+esc(p)+' <i class="fas fa-xmark" style="cursor:pointer;opacity:.7" onclick="WIZ.people.splice('+i+',1);drawWelcome()"></i></span>';
    }).join(""):'<span class="mut">Încă nimeni.</span>')+'</div>'+
    '<div class="br" style="margin-top:16px"><button class="btn gh" onclick="wizGo(1)">Înapoi</button>'+
    '<button class="btn" onclick="wizGo(3)">Mai departe <i class="fas fa-arrow-right"></i></button></div>';

  return ''+
    '<h2><i class="fas fa-circle-check"></i> Gata, poți începe</h2>'+
    '<p><b>Cheltuieli</b> — aici îți treci bonurile. Butonul mare adună sumă după sumă, ca un calculator de mână, '+
    'și salvezi tot bonul dintr-o dată.</p>'+
    '<p><b>Venituri</b> — salariile și orice alt ban care intră în casă.</p>'+
    '<p><b>Statistici</b> — pe ce se duc banii, lună de lună și an de an.</p>'+
    '<p><b>Copiile tale</b> — aplicația păstrează singură o copie pe zi. Le găsești în Setări, '+
    'iar în folderul ales ai și fișiere datate, pe care le poți deschide oricând.</p>'+
    '<p class="hint">Sfat: instalează aplicația (iconița din bara de adrese a browserului). Așa pornește ca un program obișnuit și își ține singură legătura cu fișierul tău.</p>'+
    '<div class="br" style="margin-top:16px"><button class="btn gh" onclick="wizGo(2)">Înapoi</button>'+
    '<button class="btn" onclick="wizFinish()">Intru în aplicație <i class="fas fa-arrow-right"></i></button></div>';
}

function wizAddPerson(){
  var i=document.getElementById("wizName"), v=(i.value||"").trim();
  if(!v) return;
  if(WIZ.people.indexOf(v)<0) WIZ.people.push(v);
  i.value=""; drawWelcome();
}
function wizPickFolder(){ stgPickFolder().then(function(){ drawWelcome(); }); }
function wizPickFile(){ stgPickFile(true).then(function(){ drawWelcome(); }); }
