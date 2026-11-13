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
    let toastTxt = ""; const t0 = toast; window.toast = m => toastTxt = m; ACT["ex-swap"]({dataset:{i:"1"}}); window.toast = t0;
    const calf = A().exercises[1].exId; S.profile.active = null;
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
    return {table, gx, seen:[...seen], toastTxt, calf, pre, rec, prims, swapKeep, wf:{q:wf.Quadriceps, f:wf.Fessiers}, str, perso}; });
  ok(MU.table, "17 muscles : chaque exercice de la bibliothèque a sa répartition, cohérente avec sa catégorie", MU.table);
  ok(MU.gx.join() === "Ischios,Mollets,Haut du dos,Triceps", "exercices importés : muscle principal deviné d'après le nom", MU.gx);
  ok(MU.seen.length === 1 && MU.seen[0] === "Quadriceps", "↻ en séance : un exercice quadriceps reste un exercice quadriceps (jamais des mollets)", MU.seen);
  ok(MU.calf === "mollets" && /mollets/.test(MU.toastTxt), "↻ sans autre exercice du même muscle : message, rien n'est remplacé", MU);
  ok(MU.pre.curl === 0.6 && MU.pre.tri === 1, "fatigue en séance au prorata : 3 squats = 0,6 série d'ischios ; 2 développés = 1 série de triceps", MU.pre);
  ok(MU.rec.q < 0.6 && MU.rec.m === 1 && MU.rec.j === MU.rec.q, "récupération par muscle : quadriceps fatigués, mollets reposés ; « Jambes » = le muscle le plus fatigué", MU.rec);
  ok(new Set(MU.prims).size === MU.prims.length && MU.prims.length >= 3, "programme : une séance jambes travaille des muscles principaux différents", MU.prims);
  ok(MU.swapKeep, "programme : ↻ propose un autre exercice du même muscle principal", MU);
  ok(MU.wf.q >= 3 && MU.wf.f > 0, "volume hebdo par muscle, travail indirect au prorata (fessiers comptés via squat, presse…)", MU.wf);
  ok(MU.str.q.join() === "squat" && MU.str.i.join() === "leg-curl" && MU.str.g, "force par muscle : chaque exercice compte pour son muscle principal, moyenne par catégorie", MU.str);
  ok(MU.perso === "Mollets", "exercice créé : le muscle principal choisi est respecté", MU.perso);
  ok(errs.length === 0, "aucune erreur JavaScript", errs);
  await b.close(); srv.close();
  console.log(fails ? `\n${fails} échec(s)` : "\nTous les tests du coach passent"); process.exit(fails ? 1 : 0);
})();
