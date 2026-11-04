// Tests de la créature (Node + Playwright). Usage : node tests/creature.js [dossier-captures]
const {chromium, devices} = require("playwright");
const path = require("path");
const URL = "file://" + path.resolve(__dirname, "..", "index.html"), SHOTS = process.argv[2];
let fails = 0; const ok = (cond, label, extra) => { console.log(`${cond ? "OK  " : "ÉCHEC"} ${label}${extra!==undefined ? " → " + JSON.stringify(extra) : ""}`); if(!cond) fails++; };

(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({...devices["iPhone 13"]}), p = await ctx.newPage(), errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(300);
  // Premier lancement : bienvenue, puis tuto du Gymon (5 écrans)
  await p.click('.sheet [data-act="close"]').catch(()=>{});
  ok(await p.waitForSelector('#tuto .tu-card', {timeout:2000}).then(() => true, () => false), "le tuto s'affiche après l'écran de bienvenue");
  for(let i=0;i<4;i++) await p.click('#tuto [data-act="tuto-next"]');
  ok(/10 %/.test(await p.textContent("#tuto")) && /ressusciter/.test(await p.textContent("#tuto")), "dernier écran : prévient de la mort et de la résurrection");
  await p.click('#tuto [data-act="tuto-end"]');
  ok(await p.isHidden("#tuto") && await p.evaluate(() => S.profile.tutoDone === true), "« C'est parti » ferme le tuto pour de bon");
  await p.reload(); await p.waitForTimeout(300);
  ok(await p.isHidden("#tuto"), "le tuto ne revient pas au lancement suivant");
  await p.click('.gy-help'); ok(await p.isVisible("#tuto .tu-card"), "« ? » permet de revoir le tuto");
  await p.click('#tuto .tu-skip'); ok(await p.isHidden("#tuto"), "« Passer » ferme le tuto");
  await p.evaluate(() => { S.profile.tutoAppDone = true; saveLocal(); });   // guide de l'app : testé dans tests/guide.js
  await p.click('#sheet-in [data-act="close"]', {timeout:1000}).catch(()=>{});   // accueil du premier lancement (déjà fermé plus haut)
  ok(await p.evaluate(() => tab) === "creature", "la page Créature s'ouvre en premier");
  ok(await p.evaluate(() => document.querySelector(".tabs button").dataset.tab) === "creature", "Créature en première position de la navigation");
  let c = await p.evaluate(() => creatureState());
  ok(c.stage === 0 && c.fidelity === 0, "départ : œuf, fidélité 0", {stage:c.stage, fid:c.fidelity});
  // Seuils d'évolution tirés au hasard dans les fourchettes, croissants, jamais affichés
  const {rolls, ranges} = await p.evaluate(() => ({rolls: Array.from({length:200}, () => rollStages()), ranges: CREATURE_CFG.stageRange}));
  ok(rolls.every(a => a.every((x,i) => x >= ranges[i][0] && x <= ranges[i][1]) && a[1] < a[2] && a[2] < a[3]), "seuils tirés dans les fourchettes, toujours croissants", rolls[0]);
  ok(new Set(rolls.map(a => a.join())).size > 5, "seuils différents d'un Gymon à l'autre");
  const pageTxt = await p.evaluate(() => { tab = "creature"; render(); return document.getElementById("view").innerText; });
  ok(!/séances? avant|Poussin|Poulet|Dinosaure|\d\/4/.test(pageTxt), "la page ne révèle ni le prochain stade ni le nombre de séances restantes");
  ok(/Mon Gymon/.test(await p.evaluate(() => document.getElementById("title").textContent)), "la page s'appelle « Mon Gymon »");
  ok(await p.evaluate(() => CREATURE_CFG.stages.length === 13 && CREATURE_CFG.stages[12] === "Dragon"), "13 formes, de l'œuf au dragon");
  // Pour la suite des tests : seuils de référence (repères de la configuration)
  await p.evaluate(() => { creatureState().at = CREATURE_CFG.stageAt.slice(); saveLocal(); });

  // Une séance importée ou antérieure ne nourrit pas la créature
  await p.evaluate(() => { S.workouts.push({id:"old", name:"Ancienne", start:Date.now()-5*864e5, end:Date.now()-5*864e5, exercises:[{exId:"squat", sets:[{w:"100",r:"5",done:true}]}]}); });
  ok(await p.evaluate(() => creatureFeed(S.workouts.find(w => w.id==="old"))) === null, "une séance antérieure à la naissance n'est pas comptée");

  // Séance validée par le carnet : 70×10 + 70×9 = 1 330 kg
  const play = async (w1, r1, w2, r2) => {
    await p.click('.tabs [data-tab="seance"]'); await p.click('[data-act="start-empty"]');
    await p.click('[data-act="pick-ex"]'); await p.click('#pick-list [data-act="pick-toggle"][data-id="dc-barre"]'); await p.click("#pick-go");
    await p.fill("#w-0-0", w1); await p.fill("#r-0-0", r1); await p.click('tr[data-i="0"][data-j="0"] .check');
    await p.fill("#w-0-1", w2); await p.fill("#r-0-1", r2); await p.click('tr[data-i="0"][data-j="1"] .check');
    await p.click('[data-act="rest-skip"]').catch(()=>{});
    await p.click('[data-act="finish-w"]'); await p.click('[data-act="confirm-ok"]').catch(()=>{}); await p.waitForTimeout(200);
    const meal = await p.locator(".cr-meal").count();
    if(SHOTS) await p.screenshot({path:path.join(SHOTS, "meal-"+w1+".png")});
    await p.click('.sheet [data-act="close"]').catch(()=>{}); await p.waitForTimeout(100);
    return meal;
  };
  const before = await p.evaluate(() => JSON.stringify(S.workouts));
  const meal1 = await play("70","10","70","9");
  c = await p.evaluate(() => creatureState());
  ok(c.fidelity === 1 && c.food === 1330, "séance validée : fidélité +1, nourriture = volume (1 330 kg)", {fid:c.fidelity, food:c.food});
  ok(c.weight > 0.06, "le poids augmente", c.weight);
  ok(meal1 === 1, "message de repas dans le résumé de séance");
  const lv1 = await p.evaluate(() => creatureState().levels);
  ok(Object.keys(lv1).every(m => m==="Pectoraux"), "séance pecs : seuls les pectoraux peuvent évoluer", lv1);
  ok((lv1.Pectoraux||0) <= 1, "au plus un niveau gagné par séance", lv1.Pectoraux);
  // Un exercice prévu mais sans série validée ne fait pas évoluer son muscle
  const planned = await p.evaluate(() => { const c = creatureState(), before = JSON.stringify(c.levels);
    const w = {id:"plan-only", name:"x", start:Date.now(), end:Date.now(), exercises:[{exId:"dc-barre", sets:[{w:"90",r:"8",done:true}]}, {exId:"squat", sets:[{w:"200",r:"5",done:false}]}]};
    growMuscles(c, w); const ok = !c.levels.Jambes; c.levels = JSON.parse(before); return ok; });
  ok(planned, "un exercice prévu mais non fait ne compte pas");
  const w = await p.evaluate(() => S.workouts[S.workouts.length-1]);
  ok(JSON.stringify(w.exercises[0].sets) === JSON.stringify([{w:"70",r:"10",done:true,warm:false},{w:"70",r:"9",done:true,warm:false}]), "les données de la séance ne sont pas modifiées par la créature");
  ok(await p.evaluate(() => JSON.stringify(S.workouts.slice(0, -1))) === before, "les séances précédentes sont intactes");

  // Pas de double comptage
  const again = await p.evaluate(id => creatureFeed(S.workouts.find(x => x.id===id)), w.id);
  c = await p.evaluate(() => creatureState());
  ok(again === null && c.fidelity === 1 && c.food === 1330, "pas de double comptage d'une même séance");

  // Persistance
  await p.reload(); await p.waitForTimeout(300);
  c = await p.evaluate(() => creatureState());
  ok(c.fidelity === 1 && c.food === 1330 && c.fed.length === 1, "progression conservée après rechargement");
  ok(await p.evaluate(() => S.workouts.length) === 2, "pas de séance dupliquée après rechargement");

  await p.click('.tabs [data-tab="creature"]'); if(SHOTS) await p.screenshot({path:path.join(SHOTS, "c0.png")});
  // Deuxième séance : éclosion
  await play("72.5","8","72.5","8");
  c = await p.evaluate(() => creatureState());
  ok(c.stage === 2, "2 séances : poussin (après l'œuf fêlé)", c.stage);
  await p.click('.tabs [data-tab="creature"]'); if(SHOTS) await p.screenshot({path:path.join(SHOTS, "c1.png")});

  // Montée jusqu'au dragon par des séances simulées (même fonction que la validation)
  const res = await p.evaluate(() => {
    const out = []; let prevLv = {...creatureState().levels};
    for(let i=0;i<64;i++){
      const t = Date.now() + i*1000;
      const w = {id:"sim"+i, name:"Sim", start:t, end:t+1800e3, exercises:[{exId:"squat", sets:[{w:String(100+i), r:"8", done:true}]}, {exId:"dc-barre", sets:[{w:String(80+i), r:"8", done:true}]}]};
      S.workouts.push(w); creatureFeed(w);
      const c = creatureState(); out.push(c.stage);
      if(MUSCLES.some(m => (c.levels[m]||0) < (prevLv[m]||0))) return {regress:true};
      prevLv = {...c.levels};
    }
    return {stages: out, weight: creatureState().weight, h: creatureHeight(creatureState())};
  });
  ok(!res.regress, "la musculature ne régresse jamais");
  const seen = res.stages.filter((x,i,a) => a.indexOf(x)===i);
  ok(seen.join() === [2,3,4,5,6,7,8,9,10,11,12].join() && res.stages.every((x,i,a) => i===0 || x - a[i-1] <= 1), "progression jusqu'au dragon, une forme à la fois, sans en sauter", seen);
  ok(res.stages.every((x,i,a) => i===0 || x >= a[i-1]), "un stade acquis ne se perd jamais");

  // Règles de vitalité : -20 au 2e jour sans séance, puis -10 par jour, mort sous 10 %
  const rule = await p.evaluate(() => { const c = {vit:100, born:0, fidelity:1, stage:3}, at = d => { c.last = Date.now() - d*864e5 - 6e4; return creatureVitality(c); };
    const r = [0,1,2,3,4,9,10].map(at); c.vit = 70; r.push(at(2)); c.last = Date.now() - 2*864e5; r.push(creatureDaysLeft(c)); return r; });
  ok(rule.join() === "100,100,80,70,60,10,0,50,5", "vitalité : 100, 100, 80 (2 j), 70, 60, 10 (9 j), 0 (10 j) ; partie de 70 % → 50 % à 2 j, mort dans 5 j", rule);
  // Pause de 5 jours : vitalité en baisse, rien n'est perdu
  const pause = await p.evaluate(() => { const c = creatureState(), keep = JSON.stringify({s:c.stage, l:c.levels, w:c.weight, f:c.fidelity});
    c.vit = 100; c.last = Date.now() - 5*864e5 - 6e4; const v = creatureVitality(c);
    return {v, same: keep === JSON.stringify({s:c.stage, l:c.levels, w:c.weight, f:c.fidelity})}; });
  ok(pause.v === 50 && pause.same, "pause de 5 jours : vitalité 50 %, stade, muscles et poids conservés", pause.v);
  await p.click('.tabs [data-tab="creature"]'); if(SHOTS) await p.screenshot({path:path.join(SHOTS, "c3tired.png")});
  await play("90","8","90","8");
  ok(await p.evaluate(() => creatureVitality(creatureState())) === 70, "reprise : une séance rend +20 % (50 → 70 %)");
  // 3 jours de suite avec une séance : retour à 100 %
  const streak = await p.evaluate(() => { const c = creatureState(), D = 864e5, now = Date.now();
    const mk = (id, t) => ({id, name:"x", start:t, end:t, exercises:[{exId:"dc-barre", sets:[{w:"60",r:"8",done:true}]}]});
    c.vit = 30; c.last = now - 2*D - 6e4; c.born = Math.min(c.born, now - 5*D);
    const a = mk("st-a", now - 1*D), b = mk("st-b", now);
    S.workouts.push(a); creatureFeed(a); const v1 = c.vit;
    const y = mk("st-y", now - 2*D); S.workouts.push(y); c.fed.push(y.id);   // séance de l'avant-veille déjà comptée
    S.workouts.push(b); creatureFeed(b); return [v1, c.vit]; });
  ok(streak[0] === 50 && streak[1] === 100, "séance : +20 % ; 3 jours de suite : retour à 100 %", streak);
  await p.click('.tabs [data-tab="creature"]'); if(SHOTS) await p.screenshot({path:path.join(SHOTS, "c3.png"), fullPage:true});

  // Croissance progressive : petites évolutions visibles à chaque séance, plafonnées par le niveau de force
  const grow = await p.evaluate(() => { const c = {levels:{}}, out = [];
    for(let i=0;i<4;i++){ growMuscles(c, {exercises:[{exId:"dc-barre", sets:[1,2,3].map(() => ({w:"60", r:"10", done:true}))}]}); out.push(c.levels.Pectoraux); }
    const cap = muscleLevels().Pectoraux + 0.5; for(let i=0;i<40;i++) growMuscles(c, {exercises:[{exId:"dc-barre", sets:[{w:"60",r:"10",done:true}]}]});
    return {out, last:c.levels.Pectoraux, cap, legs:c.levels.Jambes||0}; });
  ok(grow.out[0] > 0 && grow.out[0] <= 0.5 && grow.out.every((x,i,a) => i===0 || x > a[i-1] || x === grow.cap), "chaque séance fait un peu grossir le muscle travaillé", grow.out);
  ok(grow.last <= grow.cap + 1e-9 && grow.legs === 0, "plafond au niveau de force, les muscles non travaillés ne bougent pas", grow);

  // Migration : un Gymon de l'ancienne version (4 formes) garde la forme la plus proche
  const mig = await p.evaluate(() => { const keep = S.profile.creature; const out = [];
    for(const [old, fid] of [[0,1],[1,5],[2,15],[3,40]]){
      S.profile.creature = {v:3, at:[0,2,10,30], born:Date.now(), fed:[], fidelity:fid, food:0, weight:1, stage:old, levels:{}, last:Date.now()};
      const c = creatureState(); out.push([c.stage, stageFor(c.fidelity, c) <= c.stage || c.fidelity < c.at[c.stage+1], c.at.length]); }
    S.profile.creature = keep; return out; });
  ok(mig.map(x => x[0]).join() === "0,2,5,9" && mig.every(x => x[2] === 13), "migration : œuf → œuf, poussin → poussin, poulet → poule adulte, dino → dinosaure", mig);

  // Mort sous 10 % de vitalité (10 jours sans séance depuis 100 %), séance mise de côté, résurrection, nouvel œuf
  const death = await p.evaluate(() => { const c = creatureState(); c.vit = 100; c.last = Date.now() - 10*864e5 - 6e4; S.profile.creature = c;
    const d = creatureState(); const keep = {stage:d.stage, levels:JSON.stringify(d.levels), w:d.weight, fid:d.fidelity};
    const w = {id:"after-death", name:"x", start:Date.now(), end:Date.now(), exercises:[{exId:"dc-barre", sets:[{w:"80",r:"8",done:true}]}]};
    S.workouts.push(w); const r = creatureFeed(w);
    return {dead:!!d.dead, vit:creatureVitality(d), fedWhileDead:r && r.dead, pending:d.pending.length, fid:d.fidelity, keep}; });
  ok(death.dead && death.vit === 0, "10 jours sans séance : vitalité sous 10 %, le Gymon meurt");
  ok(death.fedWhileDead && death.pending === 1 && death.fid === death.keep.fid, "une séance faite pendant sa mort est mise de côté, pas comptée");
  await p.click('.tabs [data-tab="creature"]');
  ok(/Ressusciter/.test(await p.textContent("#view")) && /nouvel œuf/.test(await p.textContent("#view")), "page Gymon : boutons Ressusciter et Nouvel œuf");
  ok(await p.evaluate(() => document.querySelector('.tabs [data-tab="creature"]').classList.contains("sick")), "pastille rouge sur l'onglet Gymon");
  if(SHOTS) await p.screenshot({path:path.join(SHOTS, "dead.png")});
  await p.click('[data-act="gy-resurrect"]'); await p.waitForTimeout(150);
  const res2 = await p.evaluate(() => { const c = creatureState(); return {dead:!!c.dead, vit:creatureVitality(c), stage:c.stage, levels:JSON.stringify(c.levels), fid:c.fidelity, w:c.weight, n:c.resurrections}; });
  ok(!res2.dead && res2.vit === 100 && res2.stage === death.keep.stage && res2.levels === death.keep.levels, "ressuscité : vivant, vitalité 100 %, stade et muscles conservés");
  ok(res2.fid === death.keep.fid + 1, "la séance mise de côté est mangée à la résurrection", res2.fid);
  await p.evaluate(() => { creatureState().last = Date.now() - 11*864e5; creatureState(); render(); });
  await p.click('.tabs [data-tab="creature"]'); await p.click('[data-act="gy-restart"]'); await p.click('[data-act="confirm-ok"]'); await p.waitForTimeout(150);
  const fresh = await p.evaluate(() => { const c = creatureState(); return {stage:c.stage, fid:c.fidelity, dead:!!c.dead, graves:(c.graves||[]).length, workouts:S.workouts.length}; });
  ok(fresh.stage === 0 && fresh.fid === 0 && !fresh.dead && fresh.graves === 1, "nouvel œuf : départ à zéro, l'ancien Gymon reste en souvenir");
  ok(fresh.workouts > 0, "repartir d'un œuf ne touche pas à l'historique des séances");
  await p.evaluate(() => { const c = creatureState(); c.stage = 12; c.fidelity = 70; c.at = CREATURE_CFG.stageAt.slice(); c.last = Date.now(); render(); });

  // Dessin : chaque muscle suit son niveau, et l'ambiance se choisit dans la fiche
  const draw = await p.evaluate(() => { const c = creatureState(); c.stage = 5;
    const w = lv => { MUSCLES.forEach(m => c.levels[m] = lv); return creatureSVG(c); };
    const thin = w(0), big = w(4.5), legs = (MUSCLES.forEach(m => c.levels[m] = 4), c.levels.Jambes = 0, creatureSVG(c));
    return {differs: thin !== big, veinsBig: /stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".9"/.test(big), veinsThin: /opacity=".9"\/>/.test(thin) && /stroke-linecap="round" opacity=".9"/.test(thin), legsThin: /scale\(0\.28 1\)/.test(legs)}; });
  ok(draw.differs && draw.veinsBig && !draw.veinsThin, "veines seulement aux niveaux élevés");
  ok(draw.legsThin, "retard en jambes : jambes en allumettes");
  await p.evaluate(() => render()); await p.click('.tabs [data-tab="creature"]'); await p.click('[data-act="gy-more"]'); await p.click('[data-act="gy-style"][data-k="competition"]');
  const style = await p.evaluate(() => ({s:S.profile.gymonStyle, svg:/#7b2cbf/.test(document.querySelector(".gy-stage .creature").outerHTML)}));
  ok(style.s === "competition" && style.svg, "ambiance Compétition choisie et appliquée (short violet)");
  await p.click('[data-act="gy-style"][data-k="aesthetic"]'); await p.click('[data-act="close"]');
  // Vue de dos : bouton Dos / Face, fessiers et mollets suivent les jambes
  await p.click('[data-act="gy-flip"]');
  const backV = await p.evaluate(() => ({lbl:document.querySelector(".gy-stage .creature").getAttribute("aria-label"), btn:document.querySelector('[data-act="gy-flip"]').textContent, sheet:!!document.querySelector(".sheet.open, .sheet[open]")}));
  ok(/vu de dos/.test(backV.lbl) && /Face/.test(backV.btn), "bouton Dos : le Gymon se retourne", backV);
  const glutes = await p.evaluate(() => { const c = creatureState(); const g = lv => { c.levels.Jambes = lv; return creatureSVG(c, false, true).match(/scale\(([\d.]+) [\d.]+\) translate\(-120 -200\)/)[1]; }; return [g(0), g(4.5)]; });
  ok(+glutes[1] > +glutes[0], "de dos, les fessiers grossissent avec les jambes", glutes);
  await p.click('[data-act="gy-flip"]');
  ok(!/vu de dos/.test(await p.evaluate(() => document.querySelector(".gy-stage .creature").getAttribute("aria-label"))), "bouton Face : retour de face");

  // Rendu des 4 stades avec muscles faibles puis forts
  if(SHOTS){ for(const st of [5,9,12]) for(const lv of [0,4]){
    await p.evaluate(([st,lv]) => { const c = creatureState(); c.stage = st; MUSCLES.forEach(m => c.levels[m] = m==="Jambes" ? Math.min(lv,1) : lv); c.last = Date.now(); render(); }, [st,lv]);
    await p.locator(".creature").first().screenshot({path:path.join(SHOTS, `st${st}-lv${lv}.png`)}); } }

  ok(errs.length === 0, "aucune erreur JavaScript", errs);
  await b.close();
  console.log(fails ? `\n${fails} échec(s)` : "\nTous les tests de la créature passent");
  process.exit(fails ? 1 : 0);
})();
