// Tests du Pr Noxwell, étape 1 (Node + Playwright) : arrivée sur la page Gymon, premier examen, protocole,
// bloc labo de la page Routine, objectif et ressenti en séance, effets de l'objectif sur le programme.
// Usage : node tests/noxwell.js
const {chromium, devices} = require("playwright");
const path = require("path");
const URL = "file://" + path.resolve(__dirname, "..", "index.html");
let fails = 0; const ok = (cond, label, extra) => { console.log(`${cond ? "OK  " : "ÉCHEC"} ${label}${extra!==undefined ? " → " + JSON.stringify(extra).slice(0, 400) : ""}`); if(!cond) fails++; };

(async () => {
  const b = await chromium.launch(), errs = [];
  const phone = async (setup) => {
    const ctx = await b.newContext({...devices["iPhone 13"]}), p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
    await p.addInitScript(() => addEventListener("DOMContentLoaded", () => { gyHourFix = 12; }));
    await p.goto(URL); await p.waitForTimeout(300);
    await p.evaluate(setup || (() => {}));
    return p;
  };
  const base = () => { S.profile.tutoDone = true; S.profile.tutoAppDone = true; S.profile.onboarded = true; S.profile.welcomed = true; S.profile.installHintOff = true;
    S.profile.wnKeys = WHATS_NEW.map(wnKey); S.profile.wnSeen = versionDate(APP_VERSION); closeSheet(); document.getElementById("tuto").hidden = true; };

  // 1. Pas d'arrivée tant que le Gymon est petit
  const p0 = await phone(base);
  await p0.evaluate(() => { const c = creatureState(); c.stage = 2; c.fidelity = 3; saveLocal(); tab = "creature"; render(); });
  await p0.waitForTimeout(1800);
  ok(await p0.$("#nox-layer") === null, "Gymon au stade 2 : Noxwell n'arrive pas");
  await p0.evaluate(() => { tab = "routine"; render(); });
  ok(await p0.$(".nox-hero") === null && await p0.$(".tpls") === null, "avant son arrivée : pas de bloc Noxwell, pas d'« Organisation proposée » (choisie au bilan)");

  // 2. Arrivée à une visite calme (stade 3), nouveau joueur
  await p0.evaluate(() => { const c = creatureState(); c.stage = 3; c.fidelity = 5; c.journal = []; saveLocal(); tab = "creature"; render(); });
  await p0.waitForTimeout(2800);
  ok(await p0.$("#nox-layer .nox-bub.in") !== null, "stade 3 : Noxwell surgit sur la page Gymon");
  const t1 = await p0.$eval(".nox-txt", e => e.textContent);
  ok(/FASCINANT/.test(t1), "première bulle « FASCINANT ! »", t1);
  for(let k = 0; k < 3; k++){ await p0.click(".nox-bub"); await p0.waitForTimeout(150); }
  ok(await p0.$eval(".nox-btns", e => !e.hidden), "dernière bulle : « Passer l'examen » ou « Plus tard »");
  const noStage = await p0.$eval(".nox-layer", e => !/Poussin|Poule|Dinosaure|Dragon/.test(e.textContent));
  ok(noStage, "aucun nom de stade dans sa présentation");
  await p0.click('[data-nox="later"]'); await p0.waitForTimeout(2600);
  ok(await p0.$("#nox-layer") === null && await p0.evaluate(() => !!S.profile.nox.intro && !!S.profile.nox.later), "« Plus tard » : il repart, présentation vue une fois");
  await p0.evaluate(() => render()); await p0.waitForTimeout(1800);
  ok(await p0.$("#nox-layer") === null, "il ne revient pas à la visite suivante");

  // 3. La page Routine devient son labo, avec l'invitation à l'examen
  await p0.evaluate(() => { tab = "routine"; render(); });
  ok(await p0.$(".nox-hero") !== null && await p0.$('.nox-hero [data-act="nox-exam"]') !== null, "Routine : bloc Noxwell avec « Passer l'examen »");
  ok(await p0.$(".tpls") === null, "sans examen : pas d'« Organisation proposée » sur la page");

  // 4. Premier examen complet : prise de muscle, haut du corps, 4 séances, 45 min, avec matériel, deux fois par semaine
  await p0.click('.nox-hero [data-act="nox-exam"]'); await p0.waitForTimeout(300);
  ok(await p0.$("#nox-exam") !== null, "l'examen s'ouvre en plein écran");
  const next = async () => { await p0.click('[data-nxe="next"]'); await p0.waitForTimeout(120); };
  await next();
  ok(await p0.$eval('[data-nxe="next"]', e => e.disabled), "« Continuer » bloqué tant qu'aucun objectif n'est choisi");
  await p0.click('[data-set="obj"][data-v="muscle"]');
  ok(/CROISSANCE/.test(await p0.$eval(".nxe-bub", e => e.textContent)), "il réagit au choix de l'objectif");
  await next(); await p0.click('[data-set="prec"][data-v="haut"]'); await next();
  await p0.click('[data-set="exp"][data-v="mid"]'); await next();
  await p0.click('[data-nxn="1"]'); await next();
  await p0.click('[data-set="dur"][data-v="1"]'); await next();
  ok(/superset/i.test(await p0.$eval(".nxe-bub", e => e.textContent)), "il demande si les supersets dérangent");
  await p0.click('[data-set="ss"][data-v="oui"]'); await next();
  await p0.click('[data-set="lieu"][data-v="salle"]'); await next();
  await p0.click('[data-set="org"][data-v="un"]');
  ok(/Ce que dit la science/.test(await p0.$eval(".nxe-body", e => e.textContent)), "« un muscle par séance » : les risques sont expliqués");
  await p0.click('[data-set="org"][data-v="deux"]'); await next();
  await p0.fill('[data-in="bw"]', "80"); await p0.fill('[data-in="height"]', "180"); await p0.click('[data-set="sexe"][data-v="h"]'); await next();
  const recap = await p0.$eval(".nxe-body", e => e.textContent);
  ok(/Prendre du muscle/.test(recap) && /4 séances/.test(recap), "récapitulatif de ce qu'il a compris", recap.slice(0, 160));
  await next();
  ok(/Priorité au haut du corps/.test(await p0.$eval(".nxe-body", e => e.textContent)), "protocole : leviers annoncés selon l'objectif");
  await next(); await p0.waitForTimeout(300);
  const after = await p0.evaluate(() => ({goal:S.profile.goal, ex:S.profile.nox.exam, tpl:S.profile.plan && S.profile.plan.tpl, n:(S.profile.plan || {days:[]}).days.length, min:(S.profile.plan || {days:[{}]}).days[0].min,
    bw:S.profile.bw, h:S.profile.height, routines:S.profile.routines.filter(r => r.plan).length, tab}));
  ok(after.goal.obj === "muscle" && after.tpl === "ul2" && after.n === 4 && after.min === 45 && after.bw === 80 && after.h === 180 && after.routines === 4 && after.tab === "routine", "accepter : programme haut/bas sur 4 séances de 45 min enregistré, mesures gardées", after);

  const ssPlan = await p0.evaluate(() => ({pref:S.profile.ssPref, ss:S.profile.routines.filter(r => r.plan).some(r => r.items.filter(it => it.ss).length >= 2)}));
  ok(ssPlan.pref === "oui" && ssPlan.ss, "supersets acceptés : des paires dans le programme", ssPlan);

  // 5. Effet réel de l'objectif : au moins 14 séries par semaine pour le haut du corps
  const vol = await p0.evaluate(() => { const d = newDraft(3); d.days.forEach(x => x.min = 75); const up = () => { const g = generatePlan(d); return NOX_UPPER.reduce((t, m) => t + g.weekly[m], 0); };
    const haut = up(); S.profile.goal = {obj:"muscle", prec:"equi"}; const equi = up(); S.profile.goal = {obj:"muscle", prec:"haut"}; return {haut, equi}; });
  ok(vol.haut > vol.equi, "zone haut du corps (full body, 1 h 15) : plus de séries pour le haut qu'en équilibré", vol);

  // 6. Labo après l'examen : protocole, organisation dans le diagnostic, sources
  ok(await p0.$(".nox-proto") !== null && await p0.$(".tpls") === null, "Routine : bloc protocole, plus d'« Organisation proposée »");
  await p0.click('[data-act="nox-org"]'); await p0.waitForTimeout(200);
  await p0.click('[data-act="nox-org-set"][data-v="un"]'); await p0.waitForTimeout(200);
  ok(await p0.evaluate(() => S.profile.plan.tpl === "duo4"), "« changer » l'organisation : un muscle par séance → séances en duos");
  await p0.evaluate(() => document.querySelector('.nox-two [data-act="nox-src"]').click()); await p0.waitForTimeout(250);
  ok(/Pelland/.test(await p0.$eval("#sheet-in", e => e.textContent)), "« Mes sources » cite les études");
  await p0.evaluate(() => closeSheet());
  ok(await p0.evaluate(() => { tab = "reglages"; render(); return document.getElementById("bw").closest("label").hidden && /Pr Noxwell/.test(document.getElementById("view").textContent); }), "Réglages : mesures et lieu passés chez Noxwell");

  // 7. En séance : objectif signé 🧪, réponse au ressenti puis ligne compacte, « Comment répondre ? »
  await p0.evaluate(() => { S.workouts.push({id:"w0", name:"Test", start:Date.now() - 3 * 86400000, end:Date.now() - 3 * 86400000 + 3600000, exercises:[{exId:"dc-barre", feel:3, sets:[{w:"60", r:"8", done:true}, {w:"60", r:"8", done:true}]}], prs:[]});
    S.profile.active = {id:"a1", name:"Test", start:Date.now(), exercises:[{exId:"dc-barre", sets:[{w:"62.5", r:"8", done:true}, {w:"62.5", r:"8", done:true}]}]}; tab = "seance"; render(); });
  ok(await p0.$(".coach.nx .nox-fio") !== null, "objectif de l'exercice signé 🧪 en cyan");
  ok(await p0.$(".ex .nox-mini, .ex .nox-face") === null, "pas de tête de Noxwell à l'écran tant qu'il ne parle pas");
  await p0.click('[data-act="feel"][data-v="2"]'); await p0.waitForTimeout(200);
  const rep = await p0.$eval(".nox-reply", e => e.textContent).catch(() => "");
  ok(/Facile, noté/.test(rep) && /La prochaine fois : \d/.test(rep), "ressenti : il répond ce qu'il change la prochaine fois", rep);
  ok(await p0.evaluate(() => S.workouts.every(w => w.id !== "nox-tmp")), "le calcul de la prochaine charge ne laisse rien dans l'historique");
  await p0.waitForTimeout(4300);
  ok(await p0.$(".nox-reply") === null && /Facile · La prochaine fois/.test(await p0.$eval(".nox-compact", e => e.textContent)), "après 4 s, sa réponse se range en une ligne 🧪");
  await p0.click('[data-act="nox-how"]'); await p0.waitForTimeout(200);
  ok(/reps aurais-tu encore pu faire/.test(await p0.$eval("#sheet-in", e => e.textContent)), "« Comment répondre ? » explique l'échelle");
  await p0.evaluate(() => closeSheet());
  await p0.click('[data-act="coach-why"]'); await p0.waitForTimeout(200);
  const why = await p0.$eval("#sheet-in", e => e.textContent);
  ok(/\.nox-face|PR|Ta dernière|tu /i.test(why) && !/\bvous\b/i.test(why), "« pourquoi ? » dans sa voix, au tutoiement", why.slice(0, 200));
  await p0.evaluate(() => closeSheet());

  // 8. Ancien joueur : présentation adaptée, sans nom de stade ; objectif sèche : cardio en fin de séance
  const p1 = await phone(base);
  await p1.evaluate(() => { const c = creatureState(); c.stage = 6; c.fidelity = 42; c.name = "Pioupiou"; c.journal = []; saveLocal(); tab = "creature"; render(); });
  await p1.waitForTimeout(2800);
  for(let k = 0; k < 2; k++){ await p1.click(".nox-bub"); await p1.waitForTimeout(150); }
  const t2 = await p1.$eval(".nox-txt", e => e.textContent);
  ok(/Pioupiou/.test(t2), "ancien joueur : il connaît déjà le Gymon", t2);
  await p1.evaluate(() => { S.profile.goal = {obj:"seche", prec:"partout"}; S.profile.nox.exam = {done:Date.now(), obj:"seche", prec:"partout", n:3, days:[0,2,4], dur:2, org:"deux", exp:"mid"}; });
  const card = await p1.evaluate(() => { const g = generatePlan(newDraft(3)); return g.days.map(d => d.items.filter(it => it.cardio).length); });
  ok(card.every(n => n === 1), "sèche : un cardio en fin de chaque séance", card);
  const noGoal = await p1.evaluate(() => { S.profile.goal = null; const g = generatePlan(newDraft(3)); return g.days.some(d => d.items.some(it => it.cardio)); });
  ok(!noGoal, "sans objectif : programme inchangé, pas de cardio ajouté");

  // 9. Étape 3 : apparition pour expliquer un phénomène vu pour la première fois, une par jour au plus
  await p1.evaluate(() => { const c = creatureState(); document.getElementById("nox-layer") && document.getElementById("nox-layer").remove(); unlockBody();
    S.profile.nox = {v:1, intro:Date.now(), seen:{}, stageSeen:c.stage}; c.washTs = Date.now() - 9 * 86400000; c.fridge = []; S.workouts = []; S.profile.friends = []; saveLocal(); tab = "creature"; render(); });
  await p1.waitForTimeout(2800);
  const pop = await p1.$eval(".nox-txt", e => e.textContent).catch(() => "");
  ok(/vapeurs vertes/.test(pop), "première odeur : Noxwell surgit et l'explique", pop);
  await p1.click(".nox-bub"); await p1.waitForTimeout(150);
  ok(!/\d+ ?(jours|heures|%)/.test(await p1.$eval(".nox-txt", e => e.textContent)), "explication en mots, sans chiffres");
  await p1.click('[data-nox="ok"]'); await p1.waitForTimeout(2500);
  await p1.evaluate(() => { const c = creatureState(); c.fridge = [{id:"f1", k:"poulet", kg:500, t:Date.now()}]; render(); }); await p1.waitForTimeout(2000);
  ok(await p1.$("#nox-layer") === null, "pas plus d'une apparition par jour");
  // Rapport d'expérience
  const rap = await p1.evaluate(() => { const D = 86400000, now = Date.now(), st = now - 30 * D;
    S.profile.nox.exam = {done:st, obj:"force", prec:["dc"], exp:"mid", n:3, days:[0,2,4], dur:2, lieu:"salle", org:"deux"}; S.profile.nox.proto = {k:1, start:st, obj:"force", prec:["dc"]};
    S.workouts = [-40, -10, 5, 15, 25].map((d, k) => ({id:"r" + k, name:"T", start:st + d * D, end:st + d * D + 3600000, prs:[], exercises:[{exId:"dc-barre", feel:3, sets:[{w:String(80 + k * 2.5), r:"6", done:true}]}]}));
    const d = noxReportData(); noxReport(); return {up:d.up, n:d.gains.length, done:d.done, txt:document.getElementById("sheet-in").textContent}; });
  ok(rap.up === 1 && rap.done === 3 && /Rapport d'expérience/.test(rap.txt) && /Développé couché/.test(rap.txt), "rapport d'expérience : force avant/pendant, séances faites", rap);
  await p1.evaluate(() => closeSheet());
  // Un muscle par séance sur 5 jours
  const bro = await p1.evaluate(() => { const t = TEMPLATES[5].find(x => x.id === NOX_TPL.un[5]); const d = newDraft(5); d.tpl = t.id; d.days.forEach((x, i) => x.muscles = t.days[i].slice());
    const g = generatePlan(d); return {name:t.name, days:g.days.map(x => x.name), items:g.days[0].items.length}; });
  ok(bro.name === "Un muscle par séance" && bro.days[0] === "Pectoraux" && bro.items >= 3, "un muscle par séance sur 5 jours : une séance pecs avec plusieurs exercices", bro);

  // 9. Lieu d'entraînement : 4 options, banc à la maison, filtre réel des exercices
  const lieu = await p1.evaluate(() => {
    const saved = {eq:S.profile.equip, b:S.profile.bench}, r = {};
    const ids = () => new Set(allEx().filter(usableEx).map(e => e.id));
    S.profile.equip = ""; r.salle = ids().size; r.all = allEx().length;
    S.profile.equip = "petite"; const pe = ids(); r.petiteMachine = allEx().some(e => pe.has(e.id) && e.equip === "Machine"); r.petiteBarre = allEx().some(e => pe.has(e.id) && e.equip === "Barre");
    S.profile.equip = "halteres"; delete S.profile.bench; const h1 = ids(); r.halt = h1.size; r.haltBad = allEx().some(e => h1.has(e.id) && !["Haltères","Kettlebell","Poids du corps"].includes(e.equip) && !CARDIO_HOME.has(e.id));
    r.haltBench = allEx().some(e => h1.has(e.id) && e.equip === "Haltères" && BENCH_RE.test(e.name));
    S.profile.bench = false; const h2 = ids(); r.noBench = allEx().some(e => h2.has(e.id) && BENCH_RE.test(e.name) && e.equip === "Haltères"); r.h2 = h2.size;
    S.profile.equip = "maison"; const m = ids(); r.maisonBad = allEx().some(e => m.has(e.id) && e.equip !== "Poids du corps" && !CARDIO_HOME.has(e.id));
    const d = newDraft(3); r.planOk = generatePlan(d).days.every(x => x.items.every(it => m.has(it.exId)));
    S.profile.equip = "halteres"; S.profile.bench = false; const d2 = newDraft(3); r.planHalt = generatePlan(d2).days.every(x => x.items.every(it => h2.has(it.exId)));
    S.profile.equip = saved.eq; S.profile.bench = saved.b; if(saved.b === undefined) delete S.profile.bench; return r; });
  ok(lieu.salle === lieu.all && !lieu.petiteMachine && lieu.petiteBarre && !lieu.haltBad && lieu.haltBench && !lieu.noBench && lieu.h2 < lieu.halt && !lieu.maisonBad && lieu.planOk && lieu.planHalt,
    "lieu : salle = tout, petite salle sans machines, maison haltères (± banc), sans matériel ; le programme suit", lieu);
  const ex2 = await p1.evaluate(() => { noxExamOpen(); noxStep = NOX_STEPS.findIndex(s => s.k === "lieu"); noxDraw(false);
    return {n:document.querySelectorAll('[data-set="lieu"]').length}; });
  await p1.click('[data-set="lieu"][data-v="halt"]');
  const banc = await p1.evaluate(() => ({q:!!document.querySelector('[data-set="banc"]'), say:document.querySelector(".nxe-bub").textContent}));
  await p1.click('[data-set="banc"][data-v="non"]');
  const banc2 = await p1.evaluate(() => document.querySelector(".nxe-bub").textContent);
  ok(ex2.n === 4 && banc.q && /haltères/i.test(banc.say) && /banc/i.test(banc2), "examen : 4 lieux, « As-tu un banc ? » pour la maison avec haltères", {ex2, banc, banc2});
  await p1.evaluate(() => noxExamClose());

  // 10. « Non, pas de superset » : aucun superset dans le programme, quel que soit le choix final (accepter, ajuster, garder)
  const ssNo = await p1.evaluate(() => { const r = {};
    for(const mode of ["accept", "edit", "keep"]){ S.profile.ssPref = undefined;
      for(const [v, m] of [["oui", "accept"], ["non", mode]]){ noxExamOpen(); Object.assign(noxA, {obj:"muscle", exp:"mid", n:4, days:[0,1,3,4], dur:1, lieu:"salle", org:"deux", ss:v}); noxApply(m); }
      if(mode === "edit") planSave();
      r[mode] = S.profile.routines.filter(x => x.plan).reduce((t, x) => t + x.items.filter(it => it.ss).length, 0) + S.profile.plan.days.reduce((t, d) => t + (d.ss || []).length, 0); }
    return r; });
  ok(ssNo.accept === 0 && ssNo.edit === 0 && ssNo.keep === 0, "supersets refusés au 2e examen : plus aucun superset, même en gardant le programme", ssNo);

  // 11. Routine enregistrée automatiquement : plus de bouton « Valider la routine », chaque réglage sauvegarde
  const auto = await p1.evaluate(() => { tab = "routine"; planDraft = null; render(); const r = {btn:!!document.querySelector('[data-act="plan-save"]')};
    const before = JSON.stringify(S.profile.routines.filter(x => x.plan).map(x => x.items.map(i => i.exId)));
    document.querySelector('[data-act="plan-min"][data-t="30"]').click();
    r.min = S.profile.plan.days[0].min; r.changed = JSON.stringify(S.profile.routines.filter(x => x.plan).map(x => x.items.map(i => i.exId))) !== before;
    S.profile.novelty = null; planDraft.days[0].muscles = ["Biceps", "Triceps"]; planSave(); const nov = S.profile.novelty && S.profile.novelty.exId; document.querySelector('[data-act="plan-min"][data-t="60"]').click(); planDraft = null; render();
    r.novKept = !!nov && (S.profile.novelty.exId === nov && S.profile.routines.some(x => x.plan && x.items.some(i => i.exId === nov)));
    r.label = /Enregistré automatiquement/.test(document.getElementById("view").textContent); return r; });
  ok(!auto.btn && auto.min === 30 && auto.changed && auto.novKept && auto.label, "routine : enregistrement automatique, la nouveauté du mois ne change pas", auto);

  // 12. Favoris d'abord dans la routine : un exercice étoilé jamais fait passe devant les autres de son muscle
  const fav = await p1.evaluate(() => { const st = exStats(), savedFav = S.profile.favs, savedEq = S.profile.equip; S.profile.equip = "";
    const c = candidatesFor("Biceps", st).filter(x => !x.n && !isFav(x.e.id)).pop(); S.profile.favs = [c.e.id];
    const d = {n:1, tpl:"", days:[{dow:1, muscles:["Biceps"], off:{}, min:30}], novOff:0, noNovelty:true}, g = generatePlan(d);
    const r = {id:c.e.id, first:(g.days[0].items.find(it => it.muscle === "Biceps") || {}).exId};
    S.profile.favs = ["__aucun__"]; r.without = (generatePlan(d).days[0].items.find(it => it.muscle === "Biceps") || {}).exId;
    S.profile.favs = savedFav; S.profile.equip = savedEq; return r; });
  ok(fav.first === fav.id && fav.without !== fav.id, "routine : l'exercice favori passe en premier pour son muscle", fav);

  ok(errs.length === 0, "aucune erreur JavaScript", errs);
  await b.close();
  console.log(fails ? `\n${fails} échec(s)` : "\nTous les tests de Noxwell passent");
  process.exit(fails ? 1 : 0);
})();
