// Tests de la progression du coach (Node + Playwright) : sportifs simulés sur 16 semaines (force réelle connue),
// plus les règles de l'audit du 19 nov. 2026 une par une (cascade de décharges, ajustement en séance, palier, semaine légère, plateau…).
// Usage : node tests/progression.js
const {chromium} = require("playwright");
const path = require("path");
const URL = "file://" + path.resolve(__dirname, "..", "index.html");
let fails = 0; const ok = (cond, label, extra) => { console.log(`${cond ? "OK  " : "ÉCHEC"} ${label}${extra!==undefined ? " → " + JSON.stringify(extra).slice(0, 400) : ""}`); if(!cond) fails++; };

(async () => {
  const b = await chromium.launch(), p = await b.newPage(), errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(300);

  // 1. Simulation : 3 séances par semaine, 48 séances, ressenti exact ou bruité (une fois sur trois)
  const sim = await p.evaluate(() => {
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const gauss = () => { let u = 0, v = 0; while(!u) u = rnd(); while(!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const P = {debutant:[0.015, {"dc-barre":55, "leg-ext":45, "curl-halteres":11}], intermediaire:[0.005, {"dc-barre":90, "leg-ext":80, "curl-halteres":18}], confirme:[0.0015, {"squat":170, "leg-ext":110, "curl-halteres":26}]};
    const out = [];
    for(const [pn, [g, T0s]] of Object.entries(P)) for(const [exId, T0] of Object.entries(T0s)) for(const noisy of [false, true]){
      S.workouts = []; S.profile.ranges = {}; S.profile.bw = 80; S.profile.nox = {v:1}; S.profile.exOpts = {}; delete S.profile.lightWeek;
      const t0 = Date.now() - 120 * 86400000, rows = [];
      for(let k = 0; k < 48; k++){
        const ts = t0 + Math.floor(k / 3) * 7 * 86400000 + [0, 2, 4][k % 3] * 86400000 + 18 * 3600000;
        const T = T0 * (1 + g * (ts - t0) / (7 * 86400000)) * (1 + 0.03 * gauss()), c = coach(exId, ts);
        let w = num(c.w), rT = num(c.r) || c.lo; if(!w){ w = Math.round(T / (1 + (c.lo + 2) / 30) / 2.5) * 2.5; rT = c.lo; }
        const sets = []; let minRIR = 99;
        for(let s = 0; s < (c.sets || 3); s++){ const maxR = Math.max(0, Math.floor(30 * (T * (1 - 0.015 * s) / w - 1))), d = Math.min(rT, maxR); sets.push({w:String(w), r:String(d), done:true}); minRIR = Math.min(minRIR, maxR - d); }
        let feel = Math.min(...sets.map(x => num(x.r))) < rT ? 5 : minRIR >= 4 ? 1 : minRIR === 3 ? 2 : minRIR >= 1 ? 3 : 4;
        if(noisy && rnd() < 0.35) feel = Math.min(5, Math.max(1, feel + (rnd() < 0.5 ? -1 : 1)));
        S.workouts.push({id:"s" + k, name:"S", start:ts, end:ts + 3600000, exercises:[{exId, feel, sets}], prs:[]});
        rows.push({w, ideal:T / (1 + (rT + 1.5) / 30), deload:/Décharge|Reprise/.test(c.tag || "")});
      }
      const l8 = rows.slice(-8), eff = l8.reduce((t, r) => t + r.w / r.ideal, 0) / l8.length, minW = Math.min(...rows.slice(4).map(r => r.w));
      out.push({cas:`${pn} ${exId}${noisy ? " (ressenti bruité)" : ""}`, eff:+(eff * 100).toFixed(0), deloads:rows.filter(r => r.deload).length, chute:+((1 - minW / rows[1].w) * 100).toFixed(0)});
    }
    return out;
  });
  sim.forEach(r => ok(r.eff >= 85 && r.eff <= 108, `charges proches de l'idéal en fin de simulation : ${r.cas}`, r));
  ok(sim.every(r => r.deloads <= 7), "pas de décharges à répétition (7 au plus en 48 séances)", sim.map(r => r.deloads));
  ok(sim.every(r => r.chute <= 25), "jamais d'effondrement de la charge (cascade de décharges)", sim.map(r => r.chute));

  // 2. Règles une par une
  const t = await p.evaluate(() => {
    const D = 86400000, now = Date.now(), W = (dAgo, exId, feel, sets) => ({id:"x" + dAgo + exId, name:"T", start:now - dAgo * D, end:now - dAgo * D + 3600000, prs:[], exercises:[{exId, feel, sets:sets.map(([w, r]) => ({w:String(w), r:String(r), done:true}))}]});
    const reset = () => { S.workouts = []; S.profile.ranges = {}; S.profile.exOpts = {}; S.profile.nox = {v:1}; delete S.profile.lightWeek; };
    const r = {};
    // exercice repris après 5 semaines, mais le même muscle travaillé la semaine dernière : pas de « Reprise »
    reset(); S.workouts = [W(35, "curl-halteres", 3, [[14, 10], [14, 10]]), W(6, "curl-marteau", 3, [[16, 10], [16, 10]])];
    let cr = coach("curl-halteres"); r.reprise = [cr.tag, cr.w];
    reset(); S.workouts = [W(35, "curl-halteres", 3, [[14, 10], [14, 10]])]; cr = coach("curl-halteres"); r.reprise2 = [cr.tag, cr.w];
    // supersets : paires automatiques quand le joueur les accepte, aucune sinon ; une paire fait gagner du temps
    reset(); S.profile.ssPref = "non"; const g0 = generatePlan(newDraft(3)); S.profile.ssPref = "oui"; const g1 = generatePlan(newDraft(3)); delete S.profile.ssPref;
    r.ss = {sans:g0.days.flatMap(d => d.items.filter(it => it.ss)).length, avec:g1.days.map(d => d.items.filter(it => it.ss).length), firstFree:g1.days.every(d => !d.items[0].ss),
      gain:g0.days.reduce((t, d) => t + d.est, 0) - g1.days.reduce((t, d) => t + d.est, 0)};
    // décharge puis séance facile : on reprend la charge d'avant, sans nouvelle décharge
    reset(); S.workouts = [W(12, "leg-ext", 3, [[60, 10], [60, 10], [60, 10]]), W(8, "leg-ext", 4, [[62.5, 9], [62.5, 9], [62.5, 8]]), W(4, "leg-ext", 1, [[55, 8], [55, 8]])];
    let c = coach("leg-ext"); r.rebound = [c.w, c.tag];
    // audit 4 : après une décharge en alternance lourd/volume, le rebond reprend la charge du même type (jamais la charge lourde en volume)
    reset(); const dlw = W(2, "dc-barre", 2, [[72.5, 8], [72.5, 8]]); dlw.exercises[0].dl = 1;
    S.workouts = [W(10, "dc-barre", 3, [[80, 8], [80, 8], [80, 8]]), W(6, "dc-barre", 3, [[95, 5], [95, 5], [95, 5]]), dlw];
    c = coach("dc-barre"); r.dupRebound = [c.mode, c.w, c.r, c.tag];
    // trois séances « Dur » (pas « Trop dur ») : pas de décharge
    reset(); S.workouts = [W(12, "squat", 4, [[100, 8], [100, 8]]), W(8, "squat", 4, [[100, 8], [100, 8]]), W(4, "squat", 4, [[100, 8], [100, 7]])];
    c = coach("squat"); r.dur3 = c.tag;
    // ressenti non noté, objectif largement dépassé : traité comme facile
    reset(); S.workouts = [W(3, "curl-halteres", 0, [[12, 15], [12, 14], [12, 14]])];
    r.infer = inferFeel(sessionsFor("curl-halteres")[0], 8, 12);
    // reprise : −10 % après 4 semaines, −20 % après 8
    reset(); S.workouts = [W(30, "leg-ext", 3, [[60, 10], [60, 10]])]; r.rep4 = coach("leg-ext").w;
    reset(); S.workouts = [W(60, "leg-ext", 3, [[60, 10], [60, 10]])]; r.rep8 = coach("leg-ext").w;
    // palier réglé : machine de 5 en 5 kg
    reset(); S.workouts = [W(3, "leg-ext", 3, [[60, 12], [60, 12], [60, 12]])]; const c0 = coach("leg-ext"); setExOpt("leg-ext", "step", 5); const c5 = coach("leg-ext");
    r.step = [c0.w, c5.w];
    // cardio et gainage plafonnés
    reset(); S.workouts = [W(2, "rameur", 3, [[0, 30]])]; r.cardio = [coach("rameur").r, coach("rameur").tag];
    reset(); S.workouts = [W(2, "gainage", 3, [[0, 60], [0, 60]])]; r.gainage = [coach("gainage").r, coach("gainage").tag];
    // semaine légère : −10 % et une série de moins
    reset(); S.workouts = [W(3, "leg-ext", 3, [[60, 10], [60, 10], [60, 10]])]; const n0 = coach("leg-ext"); S.profile.lightWeek = {from:now - D, until:now + 6 * D, proto:1}; const n1 = coach("leg-ext");
    r.light = [n0.w, n1.w, n0.sets, n1.sets, n1.tag];
    // plateau : 8 séances à la même force
    reset(); for(let k = 0; k < 10; k++) S.workouts.push(W(60 - k * 6, "curl-halteres", 3, [[14, 10], [14, 10], [14, 10]])); S.profile.nox = {v:1, intro:now, exam:{done:now, obj:"muscle", n:3}};
    r.plateau = plateaus().map(x => x.id);
    return r;
  });
  ok(t.reprise[0] === "Retour" && t.reprise[1] === 14, "exercice repris mais muscle travaillé récemment : même charge, pas de « Reprise »", t.reprise);
  ok(t.reprise2[0] === "Reprise" && t.reprise2[1] < 14, "muscle au repos depuis 5 semaines : vraie reprise allégée", t.reprise2);
  ok(t.ss.sans === 0 && t.ss.avec.every(n => n >= 2 && n % 2 === 0) && t.ss.firstFree, "supersets : aucun sans accord, des paires sinon, jamais sur le 1er exercice", t.ss);
  ok(t.ss.gain > 0, "les supersets raccourcissent la séance prévue", t.ss.gain);
  ok(t.rebound[0] === 62.5 && /^(\+|Retour|.*kg)/.test(t.rebound[1] || ""), "après un allègement facile, on reprend la charge d'avant (62,5 kg)", t.rebound);
  ok(t.dupRebound[1] >= 80 && (t.dupRebound[0] !== "volume" || t.dupRebound[1] < 95) && (t.dupRebound[0] !== "lourd" || t.dupRebound[1] >= 95), "alternance : après la décharge, on reprend la charge du même type (volume ≈ 80 kg, lourd ≈ 95 kg)", t.dupRebound);
  ok(t.dur3 !== "Décharge", "trois séances « Dur » ne déclenchent plus de décharge", t.dur3);
  ok(t.infer === 2, "ressenti non noté et objectif dépassé de 2 reps : « Facile »", t.infer);
  ok(t.rep4 === 55 && t.rep8 === 47.5, "reprise : −10 % après 4 semaines, −20 % après 8", [t.rep4, t.rep8]);
  ok(t.step[0] === 62.5 && t.step[1] === 65, "palier de la machine réglé à 5 kg : 65 kg au lieu de 62,5", t.step);
  ok(t.cardio[0] === 30 && t.cardio[1] === "Intensité", "cardio plafonné à la durée visée, puis plus d'intensité", t.cardio);
  ok(t.gainage[0] === 60 && t.gainage[1] === "Variante", "gainage plafonné, puis une variante plus dure", t.gainage);
  ok(t.light[1] < t.light[0] && t.light[3] === t.light[2] - 1 && t.light[4] === "Semaine légère", "semaine légère : charge −10 % et une série de moins", t.light);
  ok(t.plateau.includes("curl-halteres"), "plateau détecté sur 10 séances (9 semaines) sans progrès", t.plateau);

  // 3. Ajustement en cours de séance : 3 reps de plus que l'objectif → charge plus lourde pour les séries suivantes
  const live = await p.evaluate(() => {
    const D = 86400000, now = Date.now(); S.profile.exOpts = {}; S.profile.ranges = {}; delete S.profile.lightWeek;
    S.profile.tutoDone = true; S.profile.onboarded = true; S.profile.welcomed = true; closeSheet(); document.getElementById("tuto").hidden = true;
    S.workouts = [{id:"p1", name:"T", start:now - 3 * D, end:now - 3 * D + 3600000, prs:[], exercises:[{exId:"leg-ext", feel:3, sets:[{w:"60", r:"10", done:true}, {w:"60", r:"10", done:true}, {w:"60", r:"9", done:true}]}]}];
    const c = coach("leg-ext");
    S.profile.active = {id:"a", name:"T", start:now, exercises:[{exId:"leg-ext", sets:[{w:"", r:""}, {w:"", r:""}, {w:"", r:""}]}]}; tab = "seance"; render();
    return {w:c.w, r:c.r};
  });
  await p.fill("#w-0-0", String(live.w)); await p.fill("#r-0-0", String(live.r + 4));
  await p.click('tr[data-j="0"] [data-act="check"]'); await p.waitForTimeout(200);
  const after = await p.evaluate(() => ({adj:A().exercises[0].adj, next:A().exercises[0].sets[1].w, txt:(document.querySelector(".live-adj") || {}).textContent || ""}));
  ok(after.adj && after.adj.w > live.w && Number(after.next) === after.adj.w && /au lieu de/.test(after.txt), "série nettement au-dessus de l'objectif : charge recalculée pour la suite", {live, after});
  // Bug remonté (24 nov. 2026) : série validée avec une erreur de reps, puis corrigée → l'ajustement est annulé et recalculé
  await p.fill("#r-0-0", String(live.r)); await p.press("#r-0-0", "Tab"); await p.waitForTimeout(300);
  const fixed = await p.evaluate(() => ({adj:A().exercises[0].adj || null, next:A().exercises[0].sets[1].w, txt:(document.querySelector(".live-adj") || {}).textContent || ""}));
  ok(!fixed.adj && !/au lieu de/.test(fixed.txt) && (fixed.next === "" || Number(fixed.next) === live.w), "série corrigée après validation (reps visées) : message retiré, charge suivante remise", fixed);
  await p.fill("#r-0-0", String(live.r - 3)); await p.press("#r-0-0", "Tab"); await p.waitForTimeout(300);
  const low = await p.evaluate(() => ({adj:A().exercises[0].adj || null, next:A().exercises[0].sets[1].w}));
  ok(low.adj && low.adj.w < live.w && Number(low.next) === low.adj.w, "corrigée vers moins de reps : nouvel ajustement, plus léger", low);

  const ssLive = await p.evaluate(() => { stopRest(); S.profile.active = {id:"b", name:"T", start:Date.now(), exercises:[{exId:"dc-barre", sets:[{w:"60", r:"8"}]}, {exId:"rowing-barre", sets:[{w:"60", r:"8"}]}]}; tab = "seance"; render();
    ACT["ex-ss"]({dataset:{i:"0"}}); return {ss:A().exercises.map(x => x.ss), wrap:!!document.querySelector(".ss-wrap"), n:document.querySelectorAll(".ss-wrap .ex").length}; });
  ok(ssLive.ss[0] === "A" && ssLive.ss[1] === "A" && ssLive.wrap && ssLive.n === 2, "superset créé à la main en séance : deux exercices regroupés", ssLive);
  await p.click('.ex[data-i="0"] tr[data-j="0"] [data-act="check"]'); await p.waitForTimeout(150);
  const rest1 = await p.evaluate(() => !!restState);
  await p.click('.ex[data-i="1"] tr[data-j="0"] [data-act="check"]'); await p.waitForTimeout(150);
  const rest2 = await p.evaluate(() => !!restState);
  ok(!rest1 && rest2, "superset : pas de repos après le 1er exercice, repos après le 2e", {rest1, rest2});

  // Récupération v2 (audit 3) : la fatigue suit l'effort ; une marche ou une série facile ne « fatiguent » presque plus, les séances s'additionnent
  const rec = await p.evaluate(() => { const H = 36e5, n = Date.now(), W = S.workouts, bw = S.profile.bw, act = S.profile.active; S.profile.bw = 80; S.profile.active = null;
    const set = (w, r, k) => Array.from({length:k}, () => ({w:String(w), r:String(r), done:true}));
    const at = (l, h) => { S.workouts = l.map((w, i) => ({id:"rc" + i, name:"x", start:n - ((w.ago || 0) + 1) * H, end:n - (w.ago || 0) * H, prs:[], ...w})); return recovery("Jambes", n + h * H); };
    const legs = [{exercises:[{exId:"squat", feel:4, sets:set(100, 8, 4)}, {exId:"presse", feel:4, sets:set(150, 10, 3)}, {exId:"leg-ext", feel:4, sets:set(50, 12, 3)}]}];
    const r = {walk:Math.round(at([{act:{k:"marche", min:20}, exercises:[]}], 1).pct * 100), one:Math.round(at([{exercises:[{exId:"leg-ext", feel:2, sets:set(30, 12, 1)}]}], 1).pct * 100),
      legs1:Math.round(at(legs, 1).pct * 100), legs48:Math.round(at(legs, 48).pct * 100), ready:at(legs, 1).readyIn,
      sq1:Math.round(at([{exercises:[{exId:"squat", feel:4, sets:set(100, 8, 4)}]}], 1).pct * 100),
      sq2:Math.round(at([{exercises:[{exId:"squat", feel:4, sets:set(100, 8, 4)}], ago:24}, {exercises:[{exId:"squat", feel:4, sets:set(100, 8, 4)}]}], 1).pct * 100),
      bike:Math.round(at([{exercises:[{exId:"velo", feel:3, sets:[{w:"", r:"60", done:true}]}]}], 1).pct * 100)};
    S.workouts = W; S.profile.bw = bw; S.profile.active = act; return r; });
  ok(rec.walk >= 90 && rec.one >= 85 && rec.legs1 <= 5 && rec.legs48 > 30 && rec.legs48 < 70 && rec.ready > 48 && rec.ready < 84 && rec.sq2 < rec.sq1 && rec.bike < 80,
    "récupération : marche et série facile presque sans fatigue, vraie séance de jambes ≈ 3 jours, séances qui s'additionnent, cardio en séance selon la durée", rec);

  // Audit 4, lot D : marche longue presque neutre, coach prudent sur un muscle pas récupéré, repos conseillé après une séance
  const ld = await p.evaluate(() => { const H = 36e5, D = 864e5, n = Date.now(), W = S.workouts, act = S.profile.active; S.profile.active = null;
    const set = (w, r, k) => Array.from({length:k}, () => ({w:String(w), r:String(r), done:true})), r = {};
    S.workouts = [{id:"wk", name:"x", start:n - 2 * H, end:n - H, act:{k:"marche", min:60}, exercises:[], prs:[]}]; r.walk60 = Math.round(recoveryFine("Quadriceps").pct * 100);
    S.workouts = [{id:"c1", name:"x", start:n - 5 * D, end:n - 5 * D + H, prs:[], exercises:[{exId:"leg-ext", feel:3, sets:set(60, 12, 3)}]}]; r.up = coach("leg-ext").w;
    S.workouts.push({id:"c2", name:"x", start:n - 3 * H, end:n - 2 * H, prs:[], exercises:[{exId:"squat", feel:4, sets:set(100, 8, 3)}]});
    const c = coach("leg-ext"); r.tired = [c.w, c.tag]; const R0 = S.profile.routines; S.profile.routines = [{id:"u-t", name:"Test", items:[{exId:"curl-barre", sets:3}]}];
    r.restAdv = (chooseToday() || {}).restAdvised; S.profile.routines = R0;
    S.workouts = W; S.profile.active = act; return r; });
  ok(ld.walk60 >= 95, "1 h de marche : les quadriceps restent récupérés", ld.walk60);
  ok(ld.up > 60 && ld.tired[0] <= 60 && /Récupération|Même charge/.test(ld.tired[1]), "quadriceps pas récupérés (squat il y a 2 h) : pas de hausse de charge au leg extension", ld);
  // Vérification finale : 1er polyarticulaire à 3 séries au moins, jambes ouvertes par un squat ou un mouvement de hanche
  const fin = await p.evaluate(() => { const W = S.workouts, out = []; S.workouts = []; S.profile.equip = "salle"; S.profile.ssPref = "non"; S.profile.nox = {v:1};
    [[2, 90], [3, 60], [4, 90], [6, 90]].forEach(([nd, min]) => { const tpl = TEMPLATES[nd][0];
      const g = generatePlan({days:DEFAULT_DAYS[nd].map((dow, i) => ({dow, muscles:tpl.days[i].slice(), off:{}, min})), noNovelty:true});
      g.days.forEach(d => { const fc = d.items.filter(i => i.comp).sort((a, b) => PRIO.indexOf(a.muscle) - PRIO.indexOf(b.muscle))[0], lg = d.items.find(i => i.muscle === "Jambes");
        out.push({k:nd + "/" + min + " " + d.name, first:fc ? fc.sets : 3, leg:lg ? ["Quadriceps", "Ischios"].includes(planPrim(exById(lg.exId))) && lg.comp : true}); }); });
    S.workouts = W; return out; });
  ok(fin.every(x => x.first >= 3 && x.leg), "programme : 1er polyarticulaire ≥ 3 séries, jambes ouvertes par un squat ou un mouvement de hanche (2 à 6 séances, 60 à 90 min)", fin.filter(x => x.first < 3 || !x.leg));
  const pill = await p.evaluate(() => { const ex = S.profile.nox; S.profile.nox = {v:1, intro:Date.now(), exam:{done:Date.now(), obj:"muscle", n:3}};
    const r = [routineSrc({id:"x", plan:1}), routineSrc({id:"today-duo-0"}), routineSrc({id:"u1"})]; S.profile.nox = {v:1}; r.push(routineSrc({id:"y", plan:1})); S.profile.nox = ex; return r.join(); });
  ok(pill === "nox,nox,me,me", "pastille d'origine : programme et suggestion du Pr Noxwell, séances créées par le joueur", pill);
  // Plus de programmes de départ : retirés s'ils n'ont pas été modifiés ; page Séance vide → bilan ou séance à soi
  const st = await p.evaluate(() => { const R = S.profile.routines, off = S.profile.startersOff, W = S.workouts, act = S.profile.active;
    S.profile.routines = [clone(OLD_STARTERS[0]), {...clone(OLD_STARTERS[1]), name:"Mon pull"}, {id:"u9", name:"Bras", items:[{exId:"curl-barre", sets:3}]}]; delete S.profile.startersOff; dropStarters();
    const kept = S.profile.routines.map(r => r.id).join(); S.profile.routines = []; S.profile.active = null; tab = "seance"; render();
    const v = document.getElementById("view"), out = {kept, fresh:defaultProfile().routines.length, empty:!!v.querySelector(".seance-empty"), choose:chooseToday(),
      exam:!!v.querySelector('.seance-empty [data-act="nox-exam"]'), mine:!!v.querySelector('.seance-empty [data-act="new-routine"]'), card:!!v.querySelector(".todaycard")};
    S.profile.routines = R; S.profile.startersOff = off; S.workouts = W; S.profile.active = act; render(); return out; });
  ok(st.kept === "r-pull,u9" && st.fresh === 0, "programmes de départ retirés, sauf s'ils ont été modifiés ; un nouveau joueur n'en a aucun", st);
  ok(st.empty && st.choose === null && st.exam && st.mine && !st.card, "sans séance : « Pas encore de séance », bilan du Pr Noxwell ou séance à soi, aucune séance conseillée", st);
  // Satiété (22 nov. 2026) : 20 min de marche ne remontent plus à 100 %, même pour un joueur qui marche souvent
  const sat = await p.evaluate(() => { const D = 864e5, H = 36e5, n = Date.now(), W = S.workouts, saved = JSON.stringify(S.profile.creature || null), bw = S.profile.bw; S.profile.bw = 80;
    const set = (w, r) => ({w:String(w), r:String(r), done:true}), mus = k => ({id:"sm" + k, name:"x", start:n - k * D - H, end:n - k * D, prs:[], exercises:[{exId:"squat", feel:3, sets:[set(80, 8), set(80, 8), set(80, 8)]}, {exId:"dc-barre", feel:3, sets:[set(60, 8), set(60, 8), set(60, 8)]}, {exId:"rowing-barre", feel:3, sets:[set(50, 10), set(50, 10), set(50, 10)]}]});
    const walk = (k, min) => ({id:"sw" + k + "_" + min, name:"m", start:n - k * D - min * 60e3, end:n - k * D, act:{k:"marche", min}, exercises:[], prs:[]});
    const feed = (hist, w) => { S.workouts = [...hist, w]; delete S.profile.creature; Object.assign(creatureState(), {fed:[], fridge:[], meal:null, sat:5, satT:n - 1, full:0, born:n - 100 * D}); return Math.round(creatureFeed(w).satAfter); };
    const h = [mus(2), mus(4), mus(6), walk(3, 20), walk(5, 20), walk(8, 20)];
    const r = {walk:feed(h, walk(0, 20)), mu:feed(h, {...mus(0), id:"sm0x"}), newWalk:feed([], walk(0, 20)), mass:gymFood(walk(0, 20)) > satFood(walk(0, 20))};
    S.workouts = W; S.profile.creature = JSON.parse(saved); if(!S.profile.creature) delete S.profile.creature; S.profile.bw = bw; return r; });
  ok(sat.walk <= 40 && sat.mu === 100 && sat.newWalk <= 40 && sat.mass, "satiété : 20 min de marche ne remontent plus de 5 à 100 % (même habituelles) ; la muscu habituelle oui ; la masse garde ses calories", sat);
  // Heure de fin (24 nov. 2026) : au rythme prévu (série, puis repos entier), elle reste stable d'une série à l'autre, repos en cours compris
  const fin2 = await p.evaluate(() => { const W = S.workouts, act = S.profile.active, rs = restState; S.workouts = [];
    startWorkout("T", ["dc-barre", "elev-lat"].map(id => ({exId:id, sets:[blankSet(), blankSet(), blankSet()]}))); const a = A(); a.exercises.forEach(ex => ex.sets = ex.sets.filter(x => !x.warm));
    const ends = [], endAt = () => a.start + ((Date.now() - a.start) / 60000 + sessLeft(a)) * 60000;
    const first = endAt(); a.start -= 90 * 1000;   // mise en place du 1er exercice
    a.exercises.forEach((ex, i) => ex.sets.forEach((st, j) => { if(j === 0 && i > 0) a.start -= 90 * 1000;
      a.start -= 40 * 1000; st.w = "20"; st.r = "10"; st.done = true; const r = sessRestOf(exById(ex.exId)); restState = {end:Date.now() + r * 1000, total:r * 1000};
      ends.push(endAt()); a.start -= r * 1000; restState = null; }));
    const spread = Math.round((Math.max(...ends.slice(0, -1)) - Math.min(...ends.slice(0, -1))) / 60000 * 10) / 10, txt = sessLeftTxt(a);
    S.profile.active = act; S.workouts = W; restState = rs; return {spread, drift:Math.round((ends[0] - first) / 60000 * 10) / 10, txt}; });
  ok(fin2.spread <= 1.5 && Math.abs(fin2.drift) <= 1.5, "heure de fin stable (±1,5 min) quand la séance suit le rythme prévu, repos en cours compté", fin2);
  // Audit masse musculaire (24 nov. 2026) : double progression garantie, abdos chaque semaine, muscles sans créneau qui suivent leur groupe
  const am = await p.evaluate(() => { const D = 864e5, n = Date.now(), W = S.workouts, eq = S.profile.equip, bw = S.profile.bw, r = {}; S.profile.bw = 80; S.profile.exOpts = {}; S.profile.ranges = {}; delete S.profile.lightWeek;
    S.workouts = []; const seq = [];
    for(let k = 0; k < 6; k++){ const t = n - (30 - k * 4) * D, c = coach("dc-halteres", t, 3), w = num(c.w) || 10, rr = (num(c.r) || c.lo) + 2; seq.push(w);
      S.workouts.push({id:"am" + k, name:"x", start:t, end:t + 36e5, prs:[], exercises:[{exId:"dc-halteres", feel:2, sets:[1, 2, 3].map(() => ({w:String(w), r:String(rr), done:true}))}]}); }
    r.seq = seq; S.profile.equip = "salle"; S.workouts = []; S.profile.nox = {v:1};
    const g = generatePlan({days:DEFAULT_DAYS[3].map((dow, i) => ({dow, muscles:TEMPLATES[3][0].days[i].slice(), off:{}, min:45})), noNovelty:true});
    r.abs = g.days.flatMap(d => d.items).filter(it => it.muscle === "Abdos").length;
    const c = {levels:{}, lastWorked:{}, peak:{}}, set = (w, rr) => ({w:String(w), r:String(rr), done:true});
    S.workouts = [{id:"lw", name:"x", start:n - D, end:n - D, prs:[], exercises:[{exId:"tractions", feel:3, sets:[set("", 12), set("", 12), set("", 12)]}, {exId:"rowing-barre", feel:3, sets:[set(80, 8), set(80, 8), set(80, 8)]}]}];
    growMuscles(c, S.workouts[0]); r.lomb = c.levels.Lombaires || 0; r.dos = c.levels["Grand dorsal"] || 0;
    S.workouts = W; S.profile.equip = eq; S.profile.bw = bw; return r; });
  ok(am.seq[5] > am.seq[1], "objectif dépassé de 2 reps, ressenti facile : la charge monte (plus jamais bloquée par l'arrondi au palier)", am.seq);
  ok(am.abs >= 1, "full body court : au moins un exercice d'abdos dans la semaine", am.abs);
  ok(am.lomb > 0 && am.dos > 0, "muscles sans créneau (lombaires) : ils suivent leur groupe travaillé", am);
  ok(ld.restAdv === true, "déjà une séance aujourd'hui : repos conseillé, la séance reste en option", ld.restAdv);

  ok(errs.length === 0, "aucune erreur JavaScript", errs);
  await b.close();
  console.log(fails ? `\n${fails} échec(s)` : "\nTous les tests de progression passent");
  process.exit(fails ? 1 : 0);
})();
