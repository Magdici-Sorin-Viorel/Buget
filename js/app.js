// Buget Familie — app.js (start-up)
// The working copy is read from the browser, then the app tries to reconnect to the data file
// the user chose last time. Nothing is loaded from the internet and nothing is sent anywhere.

(function start(){
  applyTheme();
  stgInit().then(function(){
    applyTheme();
    S.ym=curYM(); S.year=+S.ym.slice(0,4);
    S.canSave=true;
    render();
    stgPaint();
    if(needsWelcome()) openWelcome();
    else dailySnapshot();
  }).catch(function(e){
    console.error(e);
    document.getElementById("pg").innerHTML='<div class="c"><div class="ct"><i class="fas fa-triangle-exclamation"></i> Ceva n-a mers la pornire</div>'+
      '<p class="cs">'+esc(e && e.message || String(e))+'</p></div>';
  });

  // Warn before closing if a change has not reached the file yet.
  window.addEventListener("beforeunload", function(e){
    if(STG.dirty && STG.mode!=="none"){ e.preventDefault(); e.returnValue=""; }
  });
  // Last chance to push the change into the file when the window is hidden.
  document.addEventListener("visibilitychange", function(){
    if(document.visibilityState==="hidden" && STG.dirty) stgFlush();
  });
})();
