// Buget Familie — cats.js
// Month names, the default expense categories, and reading the data copy embedded
// in a spreadsheet the app exported.

var LUNI = ["Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie","Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"];

// Default categories for a new user. The id never changes; name, budget, colour and
// subcategories are all editable from Settings, and whole categories can be added or removed.
var DEFAULT_CATS = [
  {id:"mancare",      name:"Mâncare",          icon:"fa-cart-shopping",        color:"#e6b422", budget:0, subs:["Alimente","Fast-food","Apă","Dulciuri"]},
  {id:"casa",         name:"Cheltuieli casă",  icon:"fa-bolt",                 color:"#4a9eff", budget:0, subs:["Curent","Gaz","Apă","Gunoi","Întreținere"]},
  {id:"transport",    name:"Transport",        icon:"fa-gas-pump",             color:"#e07c4c", budget:0, subs:["Benzină","Transport public","Taxi"]},
  {id:"masina",       name:"Mașină",           icon:"fa-car",                  color:"#c98a5a", budget:0, subs:["Service","Asigurare","ITP","Anvelope"]},
  {id:"medical",      name:"Medical",          icon:"fa-kit-medical",          color:"#ef6f8a", budget:0, subs:["Medicamente","Consultații","Analize","Stomatolog"]},
  {id:"abonamente",   name:"Abonamente",       icon:"fa-wifi",                 color:"#7c8cff", budget:0, subs:["Telefon","Internet","Streaming"]},
  {id:"copii",        name:"Copii",            icon:"fa-baby",                 color:"#d98cf0", budget:0, subs:["Școală","Rechizite","Activități","Haine"]},
  {id:"educatie",     name:"Educație",         icon:"fa-graduation-cap",       color:"#8ab4f8", budget:0, subs:["Cursuri","Cărți","Taxe"]},
  {id:"imbracaminte", name:"Îmbrăcăminte",     icon:"fa-shirt",                color:"#b48cff", budget:0, subs:["Haine","Încălțăminte"]},
  {id:"personal",     name:"Personal",         icon:"fa-user",                 color:"#6fbf4c", budget:0, subs:["Îngrijire","Frizerie","Cosmetice"]},
  {id:"gospodarie",   name:"Gospodărie",       icon:"fa-pump-soap",            color:"#8fd3ff", budget:0, subs:["Detergenți","Curățenie","Mărunțișuri"]},
  {id:"reparatii",    name:"Casă și reparații",icon:"fa-screwdriver-wrench",   color:"#d4b06a", budget:0, subs:["Mobilă","Unelte","Reparații"]},
  {id:"aniversari",   name:"Aniversări și cadouri", icon:"fa-gift",            color:"#f5a3c7", budget:0, subs:[]},
  {id:"familie",      name:"Ajutor familie",   icon:"fa-people-roof",          color:"#4cbfa4", budget:0, subs:[]},
  {id:"animale",      name:"Animale",          icon:"fa-paw",                  color:"#9fbf4c", budget:0, subs:["Mâncare","Veterinar"]},
  {id:"divertisment", name:"Ieșiri și timp liber", icon:"fa-gamepad",          color:"#3fc1d9", budget:0, subs:["Restaurant","Cinema","Sport"]},
  {id:"concediu",     name:"Concediu",         icon:"fa-umbrella-beach",       color:"#5ad1c4", budget:0, subs:["Cazare","Transport","Mâncare"]},
  {id:"rate",         name:"Rate și credite",  icon:"fa-file-invoice-dollar",  color:"#a0a0a0", budget:0, subs:[]},
  {id:"donatii",      name:"Donații",          icon:"fa-hand-holding-heart",   color:"#f0d27a", budget:0, subs:[]},
  {id:"investitii",   name:"Investiții",       icon:"fa-chart-line",           color:"#5ad18c", budget:0, subs:["Aur","Valută","Acțiuni","Fonduri","Teren"]},
  {id:"urgente",      name:"Urgențe",          icon:"fa-triangle-exclamation", color:"#e57373", budget:0, subs:[]},
  {id:"altele",       name:"Altele",           icon:"fa-tag",                  color:"#9aa0a6", budget:0, subs:[]}
];

function normKey(s){
  return String(s==null?"":s).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\s+/g," ").trim().toLowerCase();
}
function isNum(v){ return typeof v==="number" && isFinite(v); }
function r2(v){ return Math.round(v*100)/100; }
function cell(g,r,c){ return (g[r]&&g[r][c]!==undefined)?g[r][c]:""; }
function pad2(n){ return (n<10?"0":"")+n; }
// Sheet as a [row][col] grid where index 0 = A1 (regardless of where the used range starts)
function sheetGrid(XLSXlib, ws){
  var g=[]; if(!ws||!ws["!ref"]) return g;
  var rg=XLSXlib.utils.decode_range(ws["!ref"]);
  for(var r=0;r<=rg.e.r;r++){
    var row=[];
    for(var c=0;c<=rg.e.c;c++){
      var cl=ws[XLSXlib.utils.encode_cell({r:r,c:c})];
      row.push(cl && cl.v!==undefined && cl.v!==null ? cl.v : "");
    }
    g.push(row);
  }
  return g;
}

// Every spreadsheet the app exports carries a hidden sheet with the whole data set,
// so a workbook saved from the app can be loaded back as a full backup.
var BACKUP_SHEET="Date aplicatie";

function readBackupSheet(XLSXlib, wb){
  if(wb.SheetNames.indexOf(BACKUP_SHEET)<0) return null;
  var g=sheetGrid(XLSXlib, wb.Sheets[BACKUP_SHEET]), txt="";
  for(var r=2;r<g.length;r++){ var v=cell(g,r,0); if(v==="") break; txt+=String(v); }
  try{ var d=JSON.parse(txt); return (d && Array.isArray(d.expenses)) ? d : null; }catch(e){ return null; }
}

