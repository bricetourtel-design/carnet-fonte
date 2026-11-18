// Scénarios du coach v2 (audit nov. 2026) : charges lourdes conservées, pas de baisse pour 1 ou 2 reps sous la fourchette.
// Lancer : node tests/coach.js   (serveur local lancé automatiquement)
const {chromium} = require("playwright"), path = require("path"), http = require("http"), fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
let fails = 0; const ok = (c, m, d) => { console.log((c ? "OK   " : "ÉCHEC ") + m + (d !== undefined ? " → " + JSON.stringify(d) : "")); if(!c) fails++; };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]).replace(/^\/$/, "/index.html"));
    fs.readFile(f, (e, d) => { if(e){ r.writeHead(404); r.end(); return; } r.writeHead(200, {"Content-Type": f.endsWith(".html") ? "text/html" : f.endsWith(".js") ? "text/javascript" : "application/octet-stream"}); r.end(d); }); }).listen(0);
  const b = await chromium.launch(), p = await b.newPage(), errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto(`http://localhost:${srv.address().port}/index.html`); await p.waitForTimeout(300);
  const R = await p.evaluate(() => {
    const D = 864e5, now = Date.now(), mk = (d, exId, sets, feel) => ({id:"t"+Math.random(), name:"t", start:now - d*D, end:now - d*D, exercises:[{exId, feel, sets:sets.map(([w,r]) => ({w:String(w), r:String(r), done:true}))}]});
    const run = ws => { S.workouts = ws; return coach(ws[0].exercises[0].exId); };
    const out = {};
    out.rangeBench = repRange(exById("dc-barre")); out.rangeCurl = repRange(exById("curl-halteres")); out.rangeLat = repRange(exById("elev-lat")); out.rangeDb = repRange(exById("dc-halteres"));
    let c = run([mk(3, "curl-halteres", [[16,6],[16,6],[16,6]], 3)]); out.curl = [c.w, c.r, c.tag];          // 6 reps, fourchette 8–12 : on garde 16 kg
    c = run([mk(3, "curl-halteres", [[16,4],[16,4]], 3)]); out.curlLow = [c.w < 16, c.r];                       // 4 reps : on baisse
    // Polyarticulaires : séance lourde et séance volume en alternance
    c = run([mk(3, "dc-barre", [[80,8],[80,8],[80,8]], 3)]); out.heavy = [c.mode, c.w, c.r, c.lo, c.hi]; out.restH = c.rest;        // après du volume : lourd
    c = run([mk(3, "dc-barre", [[87.5,5],[87.5,5],[87.5,5]], 3), mk(7, "dc-barre", [[80,8],[80,8]], 3)]); out.volume = [c.mode, c.w, c.r]; out.restV = c.rest;
    c = run([mk(3, "dc-barre", [[80,8],[80,8]], 3), mk(7, "dc-barre", [[87.5,6],[87.5,6]], 3)]); out.heavyUp = [c.mode, c.w];   // haut de fourchette lourde atteint
    c = run([mk(3, "dc-barre", [[80,8],[80,8]], 3), mk(7, "dc-barre", [[87.5,4],[87.5,4]], 3)]); out.heavyRep = [c.mode, c.w, c.r];
    c = run([mk(3, "curl-halteres", [[14,10],[14,10]], 3)]); out.iso = [c.mode, c.lo, c.hi];
    c = run([mk(3, "tractions", [["",4],["",3]], 0)]); out.pull = [c.r, c.tag];                                 // ressenti non noté : on progresse
    // 1RM en baisse sur 3 séances espacées de 3 semaines : pas de décharge ; rapprochées et -5 % : décharge
    c = run([mk(3, "dc-barre", [[76,6]], 3), mk(24, "dc-barre", [[78,6]], 3), mk(45, "dc-barre", [[80,6]], 3)]); out.spread = c.tag;
    c = run([mk(2, "dc-barre", [[74,6]], 3), mk(6, "dc-barre", [[77,6]], 3), mk(10, "dc-barre", [[80,6]], 3)]); out.close = c.tag;
    return out;
  });
  ok(R.rangeBench.join() === "5,8" && R.rangeDb.join() === "6,10" && R.rangeCurl.join() === "8,12" && R.rangeLat.join() === "10,15", "fourchettes : barre 5–8, haltères/machines 6–10, isolation 8–12, petits muscles 10–15", R);
  ok(R.curl[0] === 16 && R.curl[1] === 8, "6 reps sans difficulté sous 8–12 : on garde la charge et on vise 8", R.curl);
  ok(R.curlLow[0] && R.curlLow[1] >= 8, "4 reps sous 8–12 : on baisse un peu la charge", R.curlLow);
  ok(R.heavy[0] === "lourd" && R.heavy[1] > 80 && R.heavy[3] === 4 && R.heavy[4] === 6, "après une séance volume (80 kg × 8) : séance lourde 4–6 reps, plus chargée", R.heavy);
  ok(R.volume[0] === "volume" && R.volume[1] <= 80 && R.volume[2] >= 8, "après une séance lourde : séance volume, au moins la charge du dernier volume réussi", R.volume);
  ok(R.heavyUp[0] === "lourd" && R.heavyUp[1] === 90, "haut de la fourchette lourde atteint (87,5 × 6) : +2,5 kg", R.heavyUp);
  ok(R.heavyRep[0] === "lourd" && R.heavyRep[1] === 87.5 && R.heavyRep[2] === 5, "même charge lourde : une rep de plus (87,5 × 4 → 5)", R.heavyRep);
  ok(R.iso[0] === null && R.iso[1] === 8, "isolation : pas d'alternance, fourchette 8–12", R.iso);
  ok(R.pull[0] === 4, "tractions sans ressenti noté : +1 rep (plus de blocage en « Consolider »)", R.pull);
  ok(R.spread !== "Décharge", "séances espacées : pas de décharge sur du bruit", R.spread);
  ok(R.close === "Décharge", "3 séances rapprochées en baisse de plus de 5 % : décharge", R.close);
  ok(R.restH === 180 && R.restV === 120, "repos : 3 min en séance lourde, 2 min en séance volume", [R.restH, R.restV]);
  // Séries d'échauffement : seulement quand c'est utile
  const wu = await p.evaluate(() => { const D = 864e5, n = Date.now(), set = (w, r) => ({w:String(w), r:String(r), done:true});
    S.profile.tutoAppDone = true; S.profile.tutoDone = true; S.profile.active = null;
    S.workouts = [{id:"h", name:"x", start:n-3*D, end:n-3*D, exercises:[
      {exId:"dc-barre", feel:3, sets:[set(80,8), set(80,8)]}, {exId:"di-halteres", feel:3, sets:[set(26,9)]},
      {exId:"curl-halteres", feel:3, sets:[set(14,10)]}, {exId:"squat", feel:3, sets:[set(100,9)]}]}];
    startWorkout("T", ["dc-barre","di-halteres","curl-halteres","squat"].map(id => ({exId:id, sets:[blankSet(), blankSet(), blankSet()]}))); render();
    const a = S.profile.active, warm = a.exercises.map(x => x.sets.filter(s => s.warm).length);
    const ph = [...document.querySelectorAll('.ex[data-i="0"] tr.set')].slice(0, 2).map(tr => [tr.querySelector('[data-f="w"]').placeholder, tr.querySelector('[data-f="r"]').placeholder]);
    const hint = document.querySelector('.ex[data-i="0"] .wu-hint'), btn = document.querySelector('.ex[data-i="2"] [data-act="add-warm"]');
    btn && btn.click(); const forced = S.profile.active.exercises[2].sets.filter(s => s.warm).length;
    const out = {warm, ph, hint: hint ? hint.textContent : "", btn:!!btn, forced}; S.profile.active = null; return out; });
  ok(/45 kg × 8 puis 65 kg × 3/.test(wu.hint), "message « Échauffement d'abord » visible au-dessus des séries", wu.hint);
  ok(wu.btn && wu.forced === 1, "bouton « + Échauffement » sur un exercice sans échauffement (curls) : ajoute une série légère", wu);
  ok(wu.warm.join() === "2,0,0,2", "échauffement : 2 séries avant le 1er exercice lourd de chaque muscle (développé, squat), aucune sur le 2e exercice pecs ni sur les curls", wu.warm);
  ok(wu.ph[0][0] === "45" && wu.ph[0][1] === "8" && wu.ph[1][0] === "65" && wu.ph[1][1] === "3", "échauffement proposé : ~50 % × 8 puis ~75 % × 3 de la charge de travail (87,5 kg)", wu.ph);
  // « Trop dur » : fenêtre qui demande de vérifier la saisie (13 nov. 2026)
  const td = await p.evaluate(() => { S.workouts = []; S.profile.active = null;
    startWorkout("F", [{exId:"curl-halteres", sets:[blankSet(), blankSet()]}]); const ex = A().exercises[0]; ex.sets = ex.sets.filter(s => !s.warm);
    Object.assign(ex.sets[0], {w:"14", r:"8", done:true}); closeSheet(); render();
    const open = () => !document.getElementById("sheet").hidden;
    document.querySelector('.ex[data-i="0"] [data-act="feel"][data-v="4"]').click(); const dur = open();
    document.querySelector('.ex[data-i="0"] [data-act="feel"][data-v="5"]').click(); const sheet = open(), txt = document.getElementById("sheet-in").textContent;
    document.querySelector('[data-act="feel-fix"]').click(); const closed = !open(), foc = document.activeElement && document.activeElement.id, hl = !!document.querySelector("tr.set.check-me");
    document.querySelector('.ex[data-i="0"] [data-act="feel"][data-v="5"]').click(); const unsel = open();   // re-toucher « Trop dur » le retire, sans fenêtre
    closeSheet(); S.profile.active = null; return {dur, sheet, txt, closed, foc, hl, unsel}; });
  ok(!td.dur && td.sheet && /pas pu faire toutes vos reps ou la charge/.test(td.txt) && /Vérifiez que la saisie/.test(td.txt) && /14 kg × 8/.test(td.txt), "« Trop dur » ouvre une fenêtre qui demande de vérifier la saisie (séries rappelées) ; pas « Dur »", td);
  ok(td.closed && td.foc === "r-0-0" && td.hl && !td.unsel, "« Corriger la saisie » ramène sur les séries (reps de la dernière série) ; retirer « Trop dur » n'ouvre rien", td);

  // Retirer une série d'échauffement (13 nov. 2026) : la plus légère part, la suivante garde sa charge
  const dw = await p.evaluate(() => { const D = 864e5, n = Date.now(), set = (w, r) => ({w:String(w), r:String(r), done:true});
    S.workouts = [{id:"hw", name:"x", start:n-3*D, end:n-3*D, exercises:[{exId:"dc-barre", feel:3, sets:[set(80,8), set(80,8)]}]}];
    S.profile.active = null; startWorkout("W", [{exId:"dc-barre", sets:[blankSet(), blankSet(), blankSet()]}]); render();
    const n0 = A().exercises[0].sets.filter(s => s.warm).length; document.querySelector('[data-act="del-warm"][data-i="0"]').click();
    const n1 = A().exercises[0].sets.filter(s => s.warm).length, ph = document.querySelector('.ex[data-i="0"] tr.set.warm [data-f="w"]').placeholder,
      hint = document.querySelector('.ex[data-i="0"] .wu-hint').textContent, work = A().exercises[0].sets.filter(s => !s.warm).length;
    document.querySelector('[data-act="del-warm"][data-i="0"]').click();
    const n2 = A().exercises[0].sets.filter(s => s.warm).length, btn = !!document.querySelector('[data-act="del-warm"][data-i="0"]');
    S.profile.active = null; S.workouts = []; return {n0, n1, n2, ph, hint, work, btn}; });
  ok(dw.n0 === 2 && dw.n1 === 1 && dw.ph === "65" && /65 kg × 3/.test(dw.hint) && !/45 kg/.test(dw.hint) && dw.work === 3, "« − Échauffement » retire la série la plus légère ; la suivante garde sa charge, les séries de travail ne bougent pas", dw);
  ok(dw.n2 === 0 && !dw.btn, "on peut retirer tous les échauffements ; le bouton disparaît ensuite", dw);

  // Échauffement par zone pour les jambes (13 nov. 2026) : quadriceps, ischios, fessiers, mollets se préparent séparément
  const lz = await p.evaluate(() => { const D = 864e5, n = Date.now(), set = (w, r) => ({w:String(w), r:String(r), done:true});
    S.workouts = [{id:"hl", name:"x", start:n-3*D, end:n-3*D, exercises:[
      {exId:"hip-thrust", feel:3, sets:[set(100,8)]}, {exId:"leg-curl", feel:3, sets:[set(50,10)]}, {exId:"squat", feel:3, sets:[set(100,6)]},
      {exId:"presse", feel:3, sets:[set(180,10)]}, {exId:"sdt-roumain", feel:3, sets:[set(90,8)]}, {exId:"leg-ext", feel:3, sets:[set(60,12)]}, {exId:"mollets", feel:3, sets:[set(80,12)]}]}];
    const run = ids => { S.profile.active = null; startWorkout("L", ids.map(id => ({exId:id, sets:[blankSet(), blankSet(), blankSet()]}))); render();
      const r = S.profile.active.exercises.map(x => x.sets.filter(s => s.warm).length), ph = [...document.querySelectorAll('.ex[data-i="1"] tr.set.warm [data-f="w"]')].map(i => i.placeholder + "×" + i.closest("tr").querySelector('[data-f="r"]').placeholder);
      S.profile.active = null; return {r:r.join(), ph}; };
    const out = {a:run(["hip-thrust","leg-curl"]), b:run(["squat","presse","leg-curl","mollets"]), c:run(["squat","sdt-roumain","hip-thrust"]), d:run(["leg-ext","squat"])};
    // ajouter un exercice en cours de séance tient compte des zones déjà faites
    S.profile.active = null; startWorkout("M", [{exId:"squat", sets:[blankSet()]}]);
    const added = addWarmups([{exId:"leg-curl", sets:[blankSet()]}, {exId:"presse", sets:[blankSet()]}], S.profile.active.start, S.profile.active.exercises).map(x => x.sets.filter(s => s.warm).length).join();
    S.workouts.push({id:"hp", name:"x", start:n-2*D, end:n-2*D, exercises:[{exId:"dc-barre", feel:3, sets:[set(80,8)]}, {exId:"di-halteres", feel:3, sets:[set(26,9)]}]});
    const pec = run(["dc-barre","di-halteres"]).r;
    S.profile.active = null; S.workouts = []; return {...out, added, pec}; });
  ok(/^[12],1$/.test(lz.a.r) && lz.a.ph.length === 1 && /×12/.test(lz.a.ph[0]), "jambes : hip thrust puis leg curl → les ischios ont aussi leur série légère (~50 % × 12)", lz.a);
  ok(/^[12],0,1,1$/.test(lz.b.r), "jambes : squat échauffé, presse non (quadriceps déjà chauds), leg curl et mollets une série légère chacun", lz.b);
  ok(/^[12],1,0$/.test(lz.c.r) && /×5/.test(lz.c.ph[0] || ""), "jambes : soulevé de terre roumain après squat → une série à ~60 % × 5 ; hip thrust non (fessiers déjà chauds)", lz.c);
  ok(/^1,[12]$/.test(lz.d.r), "jambes : leg extension en premier → une série légère ; le squat garde sa série d'approche (la leg extension ne prépare pas une charge lourde)", lz.d);
  ok(/^[12],0$/.test(lz.pec), "pecs inchangés : le 2e exercice pecs après un développé n'a pas d'échauffement", lz.pec);
  ok(lz.added === "1,0", "exercices ajoutés en séance : zones déjà faites prises en compte", lz.added);
  // Fatigue liée à la place dans la séance, calibrée sur l'historique de l'utilisateur
  const F = await p.evaluate(() => { const D = 864e5, n = Date.now(), set = (w, r, k) => Array.from({length:k}, () => ({w:String(w), r:String(r), done:true}));
    const mk = (d, exs) => ({id:"f"+d+Math.random(), name:"x", start:n - d*D, end:n - d*D, exercises:exs.map(([id, w, r, k]) => ({exId:id, feel:3, sets:set(w, r, k)}))});
    S.workouts = []; const k0 = fatigueK().k;
    // historique : développé incliné tantôt en 1er (26 × 10), tantôt après 9 séries de pecs (26 × 6)
    const hist = []; for(let i = 0; i < 12; i++){ const d = 80 - i*6;
      hist.push(i % 2 ? mk(d, [["dc-barre", 80, 8, 3], ["dc-halteres", 30, 8, 3], ["ecarte-poulie", 20, 10, 3], ["di-halteres", 26, 6, 3]]) : mk(d, [["di-halteres", 26, 10, 3]])); }
    S.workouts = hist; const cal = fatigueK();
    // dernière séance : incliné en 4e position (26 × 6) ; aujourd'hui en 1er → pas de baisse de charge
    S.workouts = [mk(3, [["dc-barre", 80, 8, 3], ["dc-halteres", 30, 8, 3], ["ecarte-poulie", 20, 10, 3], ["di-halteres", 26, 6, 3]])];
    const fresh = coach("di-halteres", n, undefined, 0), late = coach("di-halteres", n, undefined, 9);
    // note de fin de séance : 26 × 6 en 4e position après 26 × 9 en 1re position = pas un recul
    S.workouts = [mk(10, [["di-halteres", 26, 9, 3]])]; const w = mk(1, [["dc-barre", 80, 8, 3], ["dc-halteres", 30, 8, 3], ["ecarte-poulie", 20, 10, 3], ["di-halteres", 26, 7, 3]]);
    const rate = rateWorkout(w);
    S.workouts = []; return {k0, cal, fresh:[fresh.w, fresh.r, fresh.fatigue||0], late:[late.w, late.r, late.fatigue], rate:rate.why[0]}; });
  ok(F.k0 === 0.01, "sans historique : −1 % de performance par série déjà faite pour le muscle", F.k0);
  ok(F.cal.n >= 8 && Math.abs(F.cal.raw - 0.0111) < 0.001 && F.cal.k > 0.0105 && F.cal.k < F.cal.raw, "avec historique : pente mesurée sur l'utilisateur (26 × 10 en 1er, 26 × 6 après 9 séries = −1,1 % par série), ramenée vers 1 % selon le nombre de mesures", F.cal);
  ok(F.fresh[0] >= 26 && F.fresh[2] === 0, "dernière fois en 4e position (26 × 6), aujourd'hui en 1er : on ne baisse pas la charge", F.fresh);
  ok(F.late[2] > 0 && (F.late[0] < F.fresh[0] || F.late[1] < F.fresh[1]), "aujourd'hui en 4e position : objectif adapté à la fatigue, affichée", F.late);
  ok(/0 en recul/.test(F.rate), "note de fin de séance : faire moins en fin de séance n'est pas compté comme un recul", F.rate);
  // Séance moins bonne : la raison change son interprétation
  const OFF = await p.evaluate(() => { const D = 864e5, n = Date.now(), set = (w, r, k) => Array.from({length:k}, () => ({w:String(w), r:String(r), done:true}));
    const good = {id:"g1", name:"x", start:n - 6*D, end:n - 6*D, exercises:[{exId:"curl-halteres", feel:3, sets:set(16, 10, 3)}]};
    const bad = {id:"b1", name:"x", start:n - 2*D, end:n - 2*D, exercises:[{exId:"curl-halteres", feel:4, sets:set(16, 5, 3)}]};
    S.workouts = [good, bad]; const before = coach("curl-halteres");
    bad.off = {reasons:["fatigue"], ignore:true}; const asleep = coach("curl-halteres");
    bad.off = {reasons:["contexte"], ignore:false}; const unmotivated = coach("curl-halteres");
    // fin de séance « en dessous » : les raisons sont proposées ; « Règles » seulement si la référence Femmes est choisie
    S.profile.sex = "h"; S.workouts = [good]; S.profile.active = null;
    startWorkout("T", [{exId:"curl-halteres", sets:[blankSet()]}]); const a = A(); a.exercises[0].sets.forEach(s => { s.w = "16"; s.r = "4"; s.done = true; }); a.start -= 1800000;
    finishWorkout(); celebClose(true);
    const chips = [...document.querySelectorAll('.sheet [data-act="off-reason"]')].map(c => c.dataset.k);
    document.querySelector('.sheet [data-act="off-reason"][data-k="sante"]').click();
    const last = sortW(S.workouts.slice())[0], cons = document.querySelector(".sheet .off-c").textContent;
    closeSheet(); S.profile.sex = "f"; const fem = /data-k="regles"/.test(offReasonsHTML(last)) && offReasonsHTML(last).indexOf('regles') < offReasonsHTML(last).indexOf('fatigue');
    S.workouts = []; S.profile.sex = "h";
    return {before:[before.w, before.r], asleep:[asleep.w, asleep.r], unmotivated:[unmotivated.w, unmotivated.r], chips, saved:last.off, cons, fem}; });
  ok(OFF.before[0] < 16 && OFF.asleep[0] === 16 && OFF.asleep[1] >= 10, "« Fatigue » (sommeil, stress…) : la séance ratée n'entraîne pas de baisse de charge", OFF);
  ok(OFF.unmotivated[0] === OFF.before[0], "« Motivation ou contexte » : séance comptée normalement", OFF);
  ok(OFF.chips.join() === "fatigue,sante,vie,technique,contexte", "fin de séance « en dessous » : 5 catégories pour un homme", OFF.chips);
  ok(OFF.saved && OFF.saved.ignore && /mise de côté/.test(OFF.cons) && OFF.fem, "raison enregistrée sur la séance, conséquence expliquée ; « Règles » proposée en premier aux femmes", OFF.saved);
  // Nouvel exercice : charge estimée depuis le niveau du même muscle, marquée « Estimé »
  const EST = await p.evaluate(() => {
    const D = 86400000, n = Date.now(), saved = {w:S.workouts, bw:S.profile.bw, sex:S.profile.sex, custom:S.profile.custom.slice()};
    const set = (w, r) => Array.from({length:3}, () => ({w:String(w), r:String(r), done:true, warm:false}));
    S.profile.bw = 80; S.profile.sex = "h";
    S.workouts = [{id:"e1", name:"x", start:n - 3*D, end:n - 3*D, exercises:[{exId:"elev-lat", feel:3, sets:set(12, 12)}, {exId:"dm-halteres", feel:3, sets:set(22, 8)}]}];
    const oiseau = coach("oiseau"), dm = coach("dm-barre");
    S.profile.bw = ""; const noBw = coach("oiseau");
    S.profile.bw = 80; S.profile.custom.push({id:"xperso", name:"Perso", muscle:"Épaules", equip:"Machine"}); const perso = coach("xperso");
    S.workouts = saved.w; S.profile.bw = saved.bw; S.profile.sex = saved.sex; S.profile.custom = saved.custom;
    return {oiseau:{tag:oiseau.tag, w:oiseau.w, r:oiseau.r, why:oiseau.why}, dm:{tag:dm.tag, w:dm.w}, noBw:noBw.tag, perso:perso.tag};
  });
  ok(EST.oiseau.tag === "Estimé" && EST.oiseau.w > 0 && EST.oiseau.w <= 12 && Number.isInteger(EST.oiseau.w) && EST.oiseau.r === 10 && /estimation/.test(EST.oiseau.why), "nouvel exercice : charge estimée depuis le niveau en épaules, au palier, au bas de la fourchette, « Estimé »", EST.oiseau);
  ok(EST.dm.tag === "Estimé" && EST.dm.w % 2.5 === 0 && EST.dm.w >= 20 && EST.dm.w <= 60, "développé militaire barre : estimation au palier de 2,5 kg, plausible", EST.dm);
  ok(EST.noBw === "Nouveau" && EST.perso === "Nouveau", "sans poids de corps, ou exercice sans repère : pas d'estimation (« Nouveau »)", EST);
  // 17 muscles (13 nov. 2026) : répartition du travail, ↻ par muscle principal, fatigue et récupération au prorata, programme varié
  const MU = await p.evaluate(() => {
    const D = 864e5, n = Date.now(), set = (w, r) => ({w:String(w), r:String(r), done:true}), saved = {w:S.workouts, custom:S.profile.custom};
    const table = EX.every(e => WORK[e.id] && GROUP_OF[primOf(e)] === e.muscle && Object.keys(WORK[e.id]).every(m => MUSC.includes(m)));
    const gx = [["Curl aux jambes assis","Jambes"],["Presse à mollets","Jambes"],["Haussement d'épaules aux haltères","Épaules"],["Dips pour triceps","Triceps"]].map(([name, muscle]) => primOf({id:"gx-t", name, muscle}));
    // ↻ en séance
    S.workouts = []; S.profile.active = null; startWorkout("S", [{exId:"leg-ext", sets:[blankSet()]}, {exId:"mollets", sets:[blankSet()]}]); closeSheet();
    const seen = new Set(); for(let k = 0; k < 6; k++){ ACT["ex-swap"]({dataset:{i:"0"}}); seen.add(primOf(exById(A().exercises[0].exId))); }
    ACT["ex-swap"]({dataset:{i:"1"}}); const calfSwap = primOf(exById(A().exercises[1].exId)); S.profile.active = null;
    // tous les exercices mollets déjà dans la séance : rien à proposer, message
    const calves = allEx().filter(e => primOf(e) === "Mollets").map(e => e.id); startWorkout("S2", calves.map(id => ({exId:id, sets:[blankSet()]}))); closeSheet();
    let toastTxt = ""; const t0 = toast; window.toast = m => toastTxt = m; ACT["ex-swap"]({dataset:{i:"0"}}); window.toast = t0;
    const calf = A().exercises[0].exId === calves[0]; S.profile.active = null;
    // Fatigue en séance : séries déjà faites, au prorata
    const pre = {curl:preLoad([{exId:"squat", sets:[set(100,5),set(100,5),set(100,5)]}, {exId:"leg-curl", sets:[]}], 1), tri:preLoad([{exId:"dc-barre", sets:[set(80,8),set(80,8)]}, {exId:"ext-poulie", sets:[]}], 1)};
    // Récupération : leg extension lourde hier → quadriceps fatigués, mollets reposés, « Jambes » = le plus fatigué
    S.workouts = [{id:"r1", name:"x", start:n-20*3600e3, end:n-19*3600e3, exercises:[{exId:"leg-ext", feel:5, sets:Array.from({length:6}, () => set(60,10))}]}];
    const rec = {q:recoveryFine("Quadriceps").pct, m:recoveryFine("Mollets").pct, j:recovery("Jambes").pct};
    // Programme : une séance jambes de 45 min = des muscles principaux variés
    S.workouts = []; const g = generatePlan({days:[{dow:0, muscles:["Jambes"], off:{}, min:45}], novOff:0, noNovelty:true});
    const prims = g.days[0].items.map(it => primOf(exById(it.exId)));
    const g2 = generatePlan({days:[{dow:0, muscles:["Jambes"], off:{"Jambes:0":1}, min:45}], novOff:0, noNovelty:true});
    const swapKeep = primOf(exById(g2.days[0].items[0].exId)) === prims[0];
    // Volume hebdo par muscle, au prorata
    const wf = g.weeklyFine;
    // Force par muscle principal
    S.profile.bw = 80; S.workouts = [{id:"s1", name:"x", start:n-2*D, end:n-2*D, exercises:[{exId:"squat", feel:3, sets:[set(120,5)]}, {exId:"leg-curl", feel:3, sets:[set(40,10)]}, {exId:"hip-thrust", feel:3, sets:[set(100,8)]}]}];
    const sb = strengthByMuscle(), str = {q:sb.res.Quadriceps.ex.map(x => x.e.id), i:sb.res.Ischios.ex.map(x => x.e.id), g:sb.resG.Jambes.score !== null};
    // Exercice créé : muscle principal choisi
    S.profile.custom = [{id:"xmol", name:"Machin perso", muscle:"Jambes", prim:"Mollets", equip:"Machine"}]; const perso = primOf(exById("xmol"));
    S.workouts = saved.w; S.profile.custom = saved.custom;
    return {table, gx, seen:[...seen], toastTxt, calf, calfSwap, pre, rec, prims, swapKeep, wf:{q:wf.Quadriceps, f:wf.Fessiers}, str, perso}; });
  ok(MU.table, "17 muscles : chaque exercice de la bibliothèque a sa répartition, cohérente avec sa catégorie", MU.table);
  ok(MU.gx.join() === "Ischios,Mollets,Haut du dos,Triceps", "exercices importés : muscle principal deviné d'après le nom", MU.gx);
  ok(MU.seen.length === 1 && MU.seen[0] === "Quadriceps", "↻ en séance : un exercice quadriceps reste un exercice quadriceps (jamais des mollets)", MU.seen);
  ok(MU.calfSwap === "Mollets", "↻ sur des mollets : un autre exercice de mollets", MU.calfSwap);
  ok(MU.calf && /mollets/.test(MU.toastTxt), "↻ sans autre exercice du même muscle disponible : message, rien n'est remplacé", MU);
  ok(MU.pre.curl === 0.6 && MU.pre.tri === 1, "fatigue en séance au prorata : 3 squats = 0,6 série d'ischios ; 2 développés = 1 série de triceps", MU.pre);
  ok(MU.rec.q < 0.6 && MU.rec.m === 1 && MU.rec.j === MU.rec.q, "récupération par muscle : quadriceps fatigués, mollets reposés ; « Jambes » = le muscle le plus fatigué", MU.rec);
  ok(new Set(MU.prims).size === MU.prims.length && MU.prims.length >= 3, "programme : une séance jambes travaille des muscles principaux différents", MU.prims);
  ok(MU.swapKeep, "programme : ↻ propose un autre exercice du même muscle principal", MU);
  ok(MU.wf.q >= 3 && MU.wf.f > 0, "volume hebdo par muscle, travail indirect au prorata (fessiers comptés via squat, presse…)", MU.wf);
  ok(MU.str.q.join() === "squat" && MU.str.i.join() === "leg-curl" && MU.str.g, "force par muscle : chaque exercice compte pour son muscle principal, moyenne par catégorie", MU.str);
  ok(MU.perso === "Mollets", "exercice créé : le muscle principal choisi est respecté", MU.perso);
  // Points forts et faibles : la silhouette prend la couleur de chaque muscle, comme la liste (13 nov. 2026)
  const BODY = await p.evaluate(() => {
    const D = 864e5, n = Date.now(), set = (w, r) => ({w:String(w), r:String(r), done:true}), saved = {w:S.workouts, bw:S.profile.bw};
    S.profile.bw = 80; S.workouts = [{id:"b1", name:"x", start:n-2*D, end:n-2*D, exercises:[{exId:"squat", feel:3, sets:[set(170,5)]}, {exId:"hip-thrust", feel:3, sets:[set(40,8)]}, {exId:"dc-barre", feel:3, sets:[set(100,5)]}, {exId:"leg-curl", feel:3, sets:[set(45,10)]}]}];
    const {res} = strengthByMuscle(), svg = new DOMParser().parseFromString(bodySVG(res, null), "image/svg+xml");
    progSub = "prog"; tab = "progres"; render();
    const dots = [...document.querySelectorAll('.list [data-act="body-m"]')].map(b => [b.dataset.m, b.querySelector(".mdot").style.getPropertyValue("--mc").trim()]);
    const want = t => t === "fort" ? "var(--ok)" : t === "faible" ? "var(--danger)" : "var(--accent)";
    const rows = MUSC.filter(m => res[m].score !== null).map(m => [m, res[m].tag, [...svg.querySelectorAll(`g[data-m="${m}"]`)].map(g => g.getAttribute("fill"))]);
    S.workouts = saved.w; S.profile.bw = saved.bw;
    const dotsOk = dots.length && dots.every(([m, c]) => c === want(res[m].tag));
    return {rows, dots, dotsOk, glute:res.Fessiers.tag, quad:res.Quadriceps.tag, ok:rows.every(([m, t, f]) => f.length && f.every(x => x === want(t)))}; });
  ok(BODY.glute === "faible" && BODY.quad === "fort" && BODY.ok, "points forts et faibles : chaque muscle de la liste a la même couleur sur la silhouette (fessiers faibles = rouges, quadriceps forts = verts)", BODY.rows);
  ok(BODY.dotsOk, "points forts et faibles : la pastille de chaque muscle de la liste a la couleur fort / moyen / faible", BODY.dots);
  // Bibliothèque de 200+ exercices (14 nov. 2026) : complète, cohérente, photos présentes, classiques d'abord, imports fusionnés
  const LIB = await p.evaluate(async () => {
    const names = new Set(EX.map(e => e.name.toLowerCase())), bad = EX.filter(e => !WORK[e.id] || GROUP_OF[primOf(e)] !== e.muscle || !(defaultRange(e)[1] > defaultRange(e)[0]));
    const miss = []; await Promise.all(EX.flatMap(e => [0, 1].map(k => fetch(`img/${e.id}-${k}.jpg`, {method:"HEAD"}).then(r => { if(!r.ok) miss.push(`${e.id}-${k}`); }))));
    const comp = ["rowing-2-halteres", "squat-goblet", "arnold", "tirage-vertical-serre"].every(id => isCompound(exById(id))) && !isCompound(exById("kickback")) && !isCompound(exById("elev-lat-inclinee"));
    const saved = {w:S.workouts, c:S.profile.custom};
    S.workouts = []; const first = candidatesFor("Biceps", {}).slice(0, 2).map(c => c.e.id);
    S.profile.custom = [{id:"gx-chin-up", name:"Chin up", muscle:"Dos", equip:"Poids du corps"}, {id:"gx-truc", name:"Truc", muscle:"Dos", equip:"Autre"}];
    const dedup = allEx().filter(e => e.id === "gx-chin-up").length, kept = !!allEx().find(e => e.id === "gx-truc"), lib = exById("gx-chin-up").name;
    // Alternance lourd / volume en 5–7 / 8–12 : une séance volume à 8 reps est bien une séance volume → la suivante est lourde
    const D = 864e5, n = Date.now(), st = (w, r, k) => Array.from({length:k}, () => ({w:String(w), r:String(r), done:true}));
    S.workouts = [{id:"a1", name:"x", start:n - 6*D, end:n - 6*D, exercises:[{exId:"dm-halteres", feel:3, sets:st(18, 6, 3)}]}, {id:"a2", name:"x", start:n - 3*D, end:n - 3*D, exercises:[{exId:"dm-halteres", feel:3, sets:st(16, 8, 3)}]}];
    const alt = coach("dm-halteres").mode;
    S.workouts = saved.w; S.profile.custom = saved.c;
    return {n:EX.length, uniq:names.size === EX.length, bad:bad.map(e => e.id), miss, comp, first, dedup, kept, lib, alt, kb:stepFor(exById("squat-goblet"), 20)}; });
  ok(LIB.n >= 200 && LIB.uniq && !LIB.bad.length, "bibliothèque : 200 exercices et plus, noms uniques, répartition et fourchette cohérentes", {n:LIB.n, bad:LIB.bad});
  ok(LIB.miss.length === 0, "chaque exercice a ses 2 photos", LIB.miss.slice(0, 5));
  ok(LIB.comp, "polyarticulaires reconnus par la répartition (rowing haltères, squat goblet, développé Arnold), isolations non", LIB);
  ok(LIB.first.join() === "curl-barre,curl-halteres", "sans historique, les grands classiques passent avant les variantes", LIB.first);
  ok(LIB.dedup === 1 && LIB.kept && /chin-up/i.test(LIB.lib), "exercice importé entré dans la bibliothèque : une seule fois (version de la bibliothèque) ; les autres imports restent", LIB);
  ok(LIB.alt === "lourd", "alternance lourd / volume : une séance volume faite à 8 reps est reconnue, la suivante est lourde", LIB.alt);
  ok(LIB.kb === 4, "kettlebell : paliers de 4 kg", LIB.kb);
  // Règles validées le 14 nov. 2026 : gros paliers, fourchettes au poids du corps, gainage en secondes ; réglage avec / sans matériel
  const V = await p.evaluate(() => {
    const D = 864e5, n = Date.now(), st = (w, r, k) => Array.from({length:k}, () => ({w:String(w), r:String(r), done:true})), saved = {w:S.workouts, eq:S.profile.equip};
    const ses = (id, list) => list.map(([d, w, r, f], i) => ({id:id + i, name:"x", start:n - d*D, end:n - d*D, exercises:[{exId:id, feel:f, sets:st(w, r, 3)}]}));
    // curl 10 kg × 12 « Idéal » : monter à 12 kg (+20 %) serait trop dur → reps au-delà de 12
    S.workouts = ses("curl-halteres", [[3, 10, 12, 3]]); const big = coach("curl-halteres");
    // après la montée à 12 kg, 7 reps « Trop dur » : on garde 12 kg
    S.workouts = ses("curl-halteres", [[6, 10, 16, 3], [3, 12, 7, 5]]); const keep = coach("curl-halteres");
    // barre : palier de 2,5 kg sur 80 kg, rien ne change
    S.workouts = ses("curl-barre", [[3, 30, 12, 3]]); const bar = coach("curl-barre");
    const ranges = ["pompes", "dips", "tractions"].map(id => repRange(exById(id)).join("-"));
    S.workouts = ses("gainage", [[3, "", 40, 3]]); const g1 = coach("gainage"); S.workouts = ses("gainage", [[3, "", 40, 4]]); const g2 = coach("gainage");
    // Sans matériel
    S.profile.equip = "maison"; S.workouts = [];
    const home = ["Pectoraux", "Dos", "Jambes"].every(m => candidatesFor(m, {}).length && candidatesFor(m, {}).every(c => c.e.equip === "Poids du corps"));
    const g = generatePlan({days:[{dow:0, muscles:["Pectoraux","Biceps","Jambes"], off:{}, min:60}], novOff:0, noNovelty:true});
    const planOk = g.days[0].items.every(it => exById(it.exId).equip === "Poids du corps") && g.notes.some(t => /biceps/.test(t));
    exFilter.all = false; exFilter.m = "Tous"; exFilter.q = ""; const listHome = (exListHTML(null, "browse").match(/data-id=/g) || []).length; exFilter.all = true; const listAll = (exListHTML(null, "browse").match(/data-id=/g) || []).length; exFilter.all = false;
    S.profile.equip = ""; const gym = candidatesFor("Pectoraux", {}).some(c => c.e.equip === "Poids du corps") && candidatesFor("Pectoraux", {}).some(c => c.e.equip === "Barre");
    S.workouts = saved.w; S.profile.equip = saved.eq;
    return {big:{w:big.w, r:big.r, why:big.why}, keep:{w:keep.w, r:keep.r}, bar:{w:bar.w, r:bar.r}, ranges, g1:{r:g1.r, unit:g1.unit, tag:g1.tag}, g2:g2.r, home, planOk, listHome, listAll, gym, notes:g.notes}; });
  ok(V.big.w === 10 && V.big.r === 13 && /saut de 20 %/.test(V.big.why), "gros palier (10 → 12 kg, +20 %) : on ajoute d'abord des reps au-delà de la fourchette", V.big);
  ok(V.keep.w === 12 && V.keep.r >= 7, "après la montée, encore trop dur : la nouvelle charge est gardée (pas de yo-yo)", V.keep);
  ok(V.bar.w === 32.5, "barre : petit palier (30 → 32,5 kg), progression inchangée", V.bar);
  ok(V.ranges.join() === "10-25,6-15,5-12", "poids du corps : pompes 10–25, dips 6–15, tractions 5–12", V.ranges);
  ok(V.g1.r === 45 && V.g1.unit === "s" && /\+5 s/.test(V.g1.tag) && V.g2 === 40, "gainage : +5 s par progression (« Dur » : on garde)", V);
  ok(V.home && V.planOk, "sans matériel : programme et propositions au poids du corps ; catégories sans exercice signalées", V.notes);
  ok(V.listHome > 20 && V.listAll > V.listHome * 3, "sans matériel : la liste montre le poids du corps, un bouton montre aussi le reste", [V.listHome, V.listAll]);
  ok(V.gym, "avec matériel : le poids du corps reste proposé avec le reste");
  // Même mouvement (15 nov. 2026) : jamais deux variantes du même exercice dans une séance, plutôt plus de séries
  const FM = await p.evaluate(() => {
    const W = S.workouts, eq = S.profile.equip; S.profile.equip = ""; const now = Date.now(), D = 86400000;
    // Historique où les deux développés inclinés sont les plus pratiqués (le cas vu sur iPhone)
    S.workouts = Array.from({length:6}, (_, i) => ({id:"fm" + i, name:"P", start:now - (i + 10) * D, end:now - (i + 10) * D + 3600000, prs:[],
      exercises:["di-halteres", "di-barre"].map(id => ({exId:id, sets:[1,2,3].map(() => ({w:"20", r:"8", done:true}))}))}));
    const days = [45, 60, 75, 90].map(min => generatePlan({days:[{dow:0, muscles:["Pectoraux","Épaules","Triceps"], off:{}, min}], novOff:0, noNovelty:true}).days[0]);
    const dup = days.map(d => { const f = d.items.map(it => exFamily(exById(it.exId))); return f.length - new Set(f).size; });
    const twoIncl = days.some(d => d.items.some(it => it.exId === "di-halteres") && d.items.some(it => it.exId === "di-barre"));
    // Programme déjà enregistré avec le doublon : regroupé à l'affichage de la séance du jour
    const r = {id:"plan-x", plan:true, dow:0, name:"T", items:[{exId:"di-halteres", sets:3}, {exId:"di-barre", sets:3}, {exId:"ecarte-halteres", sets:3}]};
    const a = adaptToday(r), di = a.items.filter(it => /^di-/.test(it.exId));
    const mine = adaptToday({...r, plan:false}).items.filter(it => /^di-/.test(it.exId)).length;   // routine faite à la main : on n'y touche pas
    S.workouts = W; S.profile.equip = eq;
    return {dup, twoIncl, di:di.map(x => [x.exId, x.sets]), note:(a.changes.find(c => /Regroupé/.test(c.t)) || {}).t || "", mine, fam:[exFamily(exById("di-barre")) === exFamily(exById("di-halteres")), exFamily(exById("dc-barre")) !== exFamily(exById("di-barre"))]}; });
  ok(FM.fam[0] && FM.fam[1], "même mouvement : développé incliné barre = haltères ; couché ≠ incliné", FM.fam);
  ok(FM.dup.every(n => n === 0) && !FM.twoIncl, "programme : jamais deux variantes du même mouvement dans une séance (45 à 90 min)", FM.dup);
  ok(FM.di.length === 1 && FM.di[0][1] === 5 && /Regroupé/.test(FM.note), "programme déjà enregistré : doublon regroupé en un exercice de 5 séries, expliqué", FM);
  ok(FM.mine === 2, "routine faite à la main : laissée telle quelle", FM.mine);
  // Poids du corps (15 nov. 2026) : charge proposée = poids de corps actuel, jamais baissée par la fatigue
  const BWT = await p.evaluate(() => {
    const W = S.workouts, bw0 = S.profile.bw, now = Date.now(), D = 86400000; S.profile.bw = 82;
    const ses = (id, w, r) => ({id:"bw" + id, name:"T", start:now - 3 * D, end:now - 3 * D + 3600000, prs:[], exercises:[{exId:id, feel:3, sets:[1,2,3].map(() => ({w, r, done:true}))}]});
    S.workouts = [ses("tractions", "75", "8"), ses("pompes", "", "15")];
    const t0 = coach("tractions"), tf = coach("tractions", now, 3, 9), p0 = coach("pompes");
    S.workouts = W; S.profile.bw = bw0;
    return {t0:[t0.w, t0.r], tf:[tf.w, tf.r], p0:p0.w}; });
  ok(BWT.t0[0] === 82 && BWT.tf[0] === 82 && BWT.tf[1] < BWT.t0[1], "poids du corps : charge proposée = poids actuel (82 kg, pas l'ancien 75), la fatigue baisse les reps, pas le poids", BWT);
  ok(BWT.p0 === "", "poids du corps : une charge jamais notée reste vide", BWT.p0);
  // Trapèzes (16 nov. 2026) : nouveaux exercices, recherche par muscle
  const TR = await p.evaluate(() => { const f = {...exFilter}; exFilter.m = "Tous"; exFilter.all = true; exFilter.q = "trapèze";
    const h = exListHTML(null, "browse"), ids = [...h.matchAll(/data-id="([^"]+)"/g)].map(m => m[1]); exFilter.q = "haut du dos"; const h2 = (exListHTML(null, "browse").match(/data-id=/g) || []).length;
    Object.assign(exFilter, f); return {ids, n2:h2}; });
  ok(["shrug-barre","shrug-smith","shrug-dos","shrug-arrache","shrug-mollets","tractions-scapulaires","tirage-haut-kb"].every(id => TR.ids.includes(id)) && !TR.ids.includes("rowing-barre") && TR.ids.length <= 16 && TR.n2 > 0, "trapèzes : 6 nouveaux exercices, « trapèze » ou « haut du dos » dans la recherche les retrouve", TR);
  // Calories (16 nov. 2026) : MET × poids de corps × durée
  const KC = await p.evaluate(() => { const bw0 = S.profile.bw, now = Date.now(); S.profile.bw = 80;
    const w = (ids, feel, min) => ({id:"k", start:now - min * 60000, end:now, exercises:ids.map(id => ({exId:id, feel, sets:[1,2,3].map(() => ({w:"40", r:"10", done:true}))}))});
    const r = [wCalories(w(["curl-barre", "elev-lat"], 3, 60)).kcal, wCalories(w(["squat", "souleve-terre"], 3, 60)).kcal, wCalories(w(["curl-barre"], 4, 60)).kcal,
      wCalories(w(["pompes", "tractions"], 3, 60)).kcal, wCalories(w(["curl-barre"], 3, 600)).kcal];
    S.profile.bw = 0; const none = wCalories(w(["curl-barre"], 3, 60)); S.profile.bw = bw0; return {r, none}; });
  ok(KC.r.join() === "280,400,480,240,700" && KC.none === null, "calories : 3,5 MET classique, 5 jambes lourdes, 6 effort dur, 3 poids du corps ; durée plafonnée à 2 h 30 ; rien sans poids de corps", KC);
  // Favoris (18 nov. 2026) : fréquents automatiquement, étoile à la main, en premier dans les listes
  const FV = await p.evaluate(() => { const W = S.workouts, f0 = S.profile.favs, ef = {...exFilter}, now = Date.now(), D = 86400000;
    S.workouts = [0,1,2].map(i => ({id:"fv" + i, name:"P", start:now - (i + 1) * 10 * D, end:now - (i + 1) * 10 * D + 3600000, prs:[], exercises:[{exId:"dc-barre", sets:[{w:"60", r:"8", done:true}]}, ...(i < 2 ? [{exId:"rowing-barre", sets:[{w:"50", r:"8", done:true}]}] : [])]}));
    S.workouts.push({id:"fvold", name:"P", start:now - 200 * D, end:now - 200 * D, prs:[], exercises:[{exId:"rowing-barre", sets:[{w:"50", r:"8", done:true}]}]});
    S.profile.favs = []; favCache = null;
    const freq = [isFav("dc-barre"), isFav("rowing-barre")];   // 3 séances en 90 jours / 2 seulement (la 3e est trop vieille)
    exFilter.m = "Tous"; exFilter.q = "curl"; exFilter.all = true;
    const order = l => [...l.matchAll(/data-id="([^"]+)"/g)].map(m => m[1]);
    const before = order(exListHTML(null, "browse"));
    openSheet("<div></div>"); document.body.insertAdjacentHTML("beforeend", '<button id="fvb" data-act="fav-toggle" data-id="curl-marteau"></button>'); document.getElementById("fvb").click();
    const after = order(exListHTML(null, "browse")), head = /Favoris/.test(exListHTML(null, "browse")), pick = order(exListHTML(new Set(), "pick"))[0];
    document.getElementById("fvb").click(); const off = !isFav("curl-marteau"); document.getElementById("fvb").remove(); closeSheet();
    ACT["ex-info"]({dataset:{id:"dc-barre"}}); const locked = !document.querySelector('.sheet [data-act="fav-toggle"]') && /souvent/.test(document.querySelector(".sheet").textContent); closeSheet();
    S.workouts = W; S.profile.favs = f0; Object.assign(exFilter, ef); favCache = null;
    return {freq, first:before[0], after0:after[0], head, pick, off, locked}; });
  ok(FV.freq[0] && !FV.freq[1], "favori automatique : 3 séances ou plus sur 90 jours", FV.freq);
  ok(FV.first !== "curl-marteau" && FV.after0 === "curl-marteau" && FV.head && FV.pick === "curl-marteau" && FV.off, "étoile à la main : l'exercice passe en tête (recherche et ajout à une séance), sous « Favoris » ; on peut le retirer", FV);
  ok(FV.locked, "exercice fréquent : favori d'office, sans bouton pour le retirer", FV.locked);
  // Lombaires et avant-bras, muscles à part entière (18 nov. 2026)
  const LA = await p.evaluate(() => { const g = generatePlan({days:[{dow:0, muscles:["Dos","Biceps"], off:{}, min:60}], novOff:0, noNovelty:true});
    return {minor:[MINOR.has("Lombaires"), MINOR.has("Avant-bras")], lag:!!(M_LAG.Lombaires && M_LAG["Avant-bras"]), comp:isCompound(exById("rouleau-poignets")), dead:isCompound(exById("souleve-deficit")),
      lomb:allEx().filter(e => primOf(e) === "Lombaires").length, fore:allEx().filter(e => primOf(e) === "Avant-bras").length, inPlan:"Lombaires" in g.weeklyFine && "Avant-bras" in g.weeklyFine}; });
  ok(!LA.minor[0] && !LA.minor[1] && LA.lag && LA.inPlan, "lombaires et avant-bras : muscles à part entière (volume, phrases du Gymon)", LA);
  ok(LA.lomb >= 8 && LA.fore >= 10 && !LA.comp && LA.dead, "lombaires et avant-bras : 8 exercices de plus ; le rouleau à poignets n'est pas un polyarticulaire", LA);
  ok(errs.length === 0, "aucune erreur JavaScript", errs);
  await b.close(); srv.close();
  console.log(fails ? `\n${fails} échec(s)` : "\nTous les tests du coach passent"); process.exit(fails ? 1 : 0);
})();
