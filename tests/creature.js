// Tests de la créature (Node + Playwright). Usage : node tests/creature.js [dossier-captures]
const MUSCLES_LIST = ["Pectoraux","Dos","Épaules","Biceps","Triceps","Jambes","Abdos"];
const {chromium, devices} = require("playwright");
const path = require("path");
const URL = "file://" + path.resolve(__dirname, "..", "index.html"), SHOTS = process.argv[2];
let fails = 0; const ok = (cond, label, extra) => { console.log(`${cond ? "OK  " : "ÉCHEC"} ${label}${extra!==undefined ? " → " + JSON.stringify(extra) : ""}`); if(!cond) fails++; };

(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({...devices["iPhone 13"]}), p = await ctx.newPage(), errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.addInitScript(() => addEventListener("DOMContentLoaded", () => { gyHourFix = 12; }));   // midi : le Gymon est réveillé, quelle que soit l'heure du test
  await p.goto(URL); await p.waitForTimeout(300);
  // Premier lancement : bienvenue, puis tuto du Gymon (5 écrans)
  await p.click('.sheet [data-act="close"]').catch(()=>{});
  ok(await p.waitForSelector('#tuto .tu-card', {timeout:2000}).then(() => true, () => false), "le tuto s'affiche après l'écran de bienvenue");
  for(let i=0;i<4;i++) await p.click('#tuto [data-act="tuto-next"]');
  ok(/meurt/.test(await p.textContent("#tuto")) && /ressusciter/.test(await p.textContent("#tuto")), "dernier écran : prévient de la mort et de la résurrection");
  await p.click('#tuto [data-act="tuto-end"]');
  ok(await p.isHidden("#tuto") && await p.evaluate(() => S.profile.tutoDone === true), "« C'est parti » ferme le tuto pour de bon");
  await p.reload(); await p.waitForTimeout(300);
  ok(await p.isHidden("#tuto"), "le tuto ne revient pas au lancement suivant");
  await p.click('.gy-help'); ok(await p.isVisible("#tuto .tu-card"), "« ? » permet de revoir le tuto");
  await p.click('#tuto .tu-skip'); ok(await p.isHidden("#tuto"), "« Passer » ferme le tuto");
  await p.evaluate(() => { S.profile.tutoAppDone = true; saveLocal(); });   // guide de l'app : testé dans tests/guide.js ; midi : le Gymon est réveillé
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
  const celebSeen = [];
  const play = async (w1, r1, w2, r2) => {
    await p.click('.tabs [data-tab="seance"]'); await p.click('[data-act="start-empty"]');
    await p.click('[data-act="pick-ex"]'); await p.click('#pick-list [data-act="pick-toggle"][data-id="dc-barre"]'); await p.click("#pick-go");
    await p.fill("#w-0-0", w1); await p.fill("#r-0-0", r1); await p.click('tr[data-i="0"][data-j="0"] .check');
    await p.fill("#w-0-1", w2); await p.fill("#r-0-1", r2); await p.click('tr[data-i="0"][data-j="1"] .check');
    await p.click('[data-act="rest-skip"]').catch(()=>{});
    await p.click('[data-act="finish-w"]'); await p.click('[data-act="confirm-ok"]').catch(()=>{}); await p.waitForTimeout(200);
    celebSeen.push(await p.evaluate(() => !!document.getElementById("celebrate")));
    await p.evaluate(() => celebClose(true));
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
    const r = [0,1,2,3,4,21,22].map(d => Math.round(at(d)*10)/10); c.vit = 80; r.push(Math.round(at(2))); c.last = Date.now() - 2*864e5; r.push(creatureDaysLeft(c)); return r; });
  ok(rule.join() === "100,100,80,72,65,11,10,64,18", "vitalité en proportion : 100, 100, 80 (2 j), 72 (×0,9), 65, 11 (21 j), 10 → sous 10 % à 22 j ; partie de 80 % → 64 % à 2 j, mort dans 18 j", rule);
  // Pause de 5 jours : vitalité en baisse, rien n'est perdu
  const pause = await p.evaluate(() => { const c = creatureState(), keep = JSON.stringify({s:c.stage, l:c.levels, w:c.weight, f:c.fidelity});
    c.vit = 100; c.last = Date.now() - 5*864e5 - 6e4; const v = creatureVitality(c);
    return {v, same: keep === JSON.stringify({s:c.stage, l:c.levels, w:c.weight, f:c.fidelity})}; });
  ok(pause.v === 58 && pause.same, "pause de 5 jours : vitalité 58 % (100×0,8×0,9×0,9×0,9), stade, muscles et poids conservés", pause.v);
  await p.click('.tabs [data-tab="creature"]'); if(SHOTS) await p.screenshot({path:path.join(SHOTS, "c3tired.png")});
  await play("90","8","90","8");
  ok(await p.evaluate(() => creatureVitality(creatureState())) === 70, "reprise : une séance augmente de 20 % (58 → 70 %)");
  // 3 jours de suite avec une séance : retour à 100 %
  const streak = await p.evaluate(() => { const c = creatureState(), D = 864e5, now = Date.now();
    const mk = (id, t) => ({id, name:"x", start:t, end:t, exercises:[{exId:"dc-barre", sets:[{w:"60",r:"8",done:true}]}]});
    c.vit = 50; c.last = now - 2*D - 6e4; c.born = Math.min(c.born, now - 5*D);
    const a = mk("st-a", now - 1*D), b = mk("st-b", now);
    S.workouts.push(a); creatureFeed(a); const v1 = c.vit;
    const y = mk("st-y", now - 2*D); S.workouts.push(y); c.fed.push(y.id);   // séance de l'avant-veille déjà comptée
    S.workouts.push(b); creatureFeed(b); return [v1, c.vit]; });
  const low = await p.evaluate(() => { const c = creatureState(), now = Date.now(), w = {id:"low-1", name:"x", start:now, end:now, exercises:[{exId:"dc-barre", sets:[{w:"60",r:"8",done:true}]}]};
    S.workouts = S.workouts.filter(x => !/^st-/.test(x.id)); c.fed = c.fed.filter(id => !/^st-/.test(id)); c.vit = 20; c.last = now - 6e4; S.workouts.push(w); creatureFeed(w); return Math.round(c.vit); });
  ok(low === 30, "sous 30 % : une séance augmente de 50 % (20 → 30 %)", low);
  ok(Math.round(streak[0]) === 60 && streak[1] === 100, "séance : +20 % de la vitalité (50 → 60 %) ; 3 jours de suite : retour à 100 %", streak);
  await p.click('.tabs [data-tab="creature"]'); if(SHOTS) await p.screenshot({path:path.join(SHOTS, "c3.png"), fullPage:true});

  // Croissance v2 : chaque séance fait grossir le muscle travaillé, sans plafond de force, de moins en moins vite, max 4,5
  const grow = await p.evaluate(() => { const c = {levels:{}}, out = [], n = Date.now(), W = (i, prs) => ({end:n + i*3600000, prs:prs||[], exercises:[{exId:"dc-barre", sets:[1,2,3,4].map(() => ({w:"60", r:"10", done:true}))}]});
    for(let i=0;i<4;i++){ growMuscles(c, W(i)); out.push(c.levels.Pectoraux); }
    for(let i=4;i<120;i++) growMuscles(c, W(i));
    const a = {levels:{Pectoraux:2}}, b = {levels:{Pectoraux:2}}; growMuscles(a, W(1)); growMuscles(b, W(1, ["dc-barre"]));
    return {out, last:c.levels.Pectoraux, legs:c.levels.Jambes||0, gain:a.levels.Pectoraux - 2, prGain:b.levels.Pectoraux - 2}; });
  ok(grow.out[0] > 0.1 && grow.out.every((x,i,a) => i===0 || x > a[i-1]), "chaque séance fait grossir le muscle travaillé (4 séries ≈ +0,16)", grow.out);
  ok(grow.last > 4 && grow.last <= 4.5 && grow.legs === 0, "plus de plafond de force : il continue de grossir jusqu'à 4,5 ; les muscles non travaillés ne bougent pas", grow);
  ok(grow.prGain > grow.gain + 0.1, "un record donne un bonus de croissance", grow);
  // Fonte : après 14 jours sans travailler un muscle, il fond doucement (jamais sous 40 % de son maximum)
  const melt = await p.evaluate(() => { const D = 864e5, n = Date.now(), c = {levels:{Jambes:3}, lastWorked:{Jambes:n - 20*D}, peak:{Jambes:3}};
    const a = muscleLevel(c, "Jambes"); c.lastWorked.Jambes = n - 200*D; const b = muscleLevel(c, "Jambes"); c.lastWorked.Jambes = n - 5*D; const z = muscleLevel(c, "Jambes");
    return [Math.round(a*100)/100, Math.round(b*100)/100, z]; });
  ok(melt[0] === 2.7 && melt[1] === 1.2 && melt[2] === 3, "fonte : 20 jours → 3 devient 2,7 ; 200 jours → plancher 1,2 (40 %) ; 5 jours → rien", melt);

  // Migration : un Gymon de l'ancienne version (4 formes) garde la forme la plus proche
  const mig = await p.evaluate(() => { const keep = S.profile.creature; const out = [];
    for(const [old, fid] of [[0,1],[1,5],[2,15],[3,40]]){
      S.profile.creature = {v:3, at:[0,2,10,30], born:Date.now(), fed:[], fidelity:fid, food:0, weight:1, stage:old, levels:{}, last:Date.now()};
      const c = creatureState(); out.push([c.stage, stageFor(c.fidelity, c) <= c.stage || c.fidelity < c.at[c.stage+1], c.at.length]); }
    S.profile.creature = keep; return out; });
  ok(mig.map(x => x[0]).join() === "0,2,5,9" && mig.every(x => x[2] === 13), "migration : œuf → œuf, poussin → poussin, poulet → poule adulte, dino → dinosaure", mig);

  // Mort sous 10 % de vitalité (10 jours sans séance depuis 100 %), séance mise de côté, résurrection, nouvel œuf
  const death = await p.evaluate(() => { const c = creatureState(); c.vit = 100; c.last = Date.now() - 22*864e5 - 6e4; S.profile.creature = c;
    const d = creatureState(); const keep = {stage:d.stage, levels:JSON.stringify(d.levels), w:d.weight, fid:d.fidelity};
    const w = {id:"after-death", name:"x", start:Date.now(), end:Date.now(), exercises:[{exId:"dc-barre", sets:[{w:"80",r:"8",done:true}]}]};
    S.workouts.push(w); const r = creatureFeed(w);
    return {dead:!!d.dead, vit:creatureVitality(d), fedWhileDead:r && r.dead, pending:d.pending.length, fid:d.fidelity, keep}; });
  ok(death.dead && death.vit === 0, "22 jours sans séance : vitalité sous 10 %, le Gymon meurt");
  ok(death.fedWhileDead && death.pending === 1 && death.fid === death.keep.fid, "une séance faite pendant sa mort est mise de côté, pas comptée");
  await p.click('.tabs [data-tab="creature"]');
  ok(/Ressusciter/.test(await p.textContent("#view")) && /nouvel œuf/.test(await p.textContent("#view")), "page Gymon : boutons Ressusciter et Nouvel œuf");
  ok(await p.evaluate(() => document.querySelector('.tabs [data-tab="creature"]').classList.contains("sick")), "pastille rouge sur l'onglet Gymon");
  if(SHOTS) await p.screenshot({path:path.join(SHOTS, "dead.png")});
  await p.click('[data-act="gy-resurrect"]'); await p.waitForTimeout(150);
  const res2 = await p.evaluate(() => { const c = creatureState(); return {dead:!!c.dead, vit:creatureVitality(c), stage:c.stage, levels:JSON.stringify(c.levels), fid:c.fidelity, w:c.weight, n:c.resurrections}; });
  const kept = JSON.parse(death.keep.levels), now2 = JSON.parse(res2.levels);
  ok(!res2.dead && res2.vit === 100 && res2.stage === death.keep.stage && MUSCLES_LIST.every(m => (now2[m]||0) >= (kept[m]||0) - 1e-9), "ressuscité : vivant, vitalité 100 %, stade et muscles conservés (la séance en attente peut les faire grossir)");
  ok(res2.fid === death.keep.fid + 1, "la séance mise de côté est mangée à la résurrection", res2.fid);
  await p.evaluate(() => { creatureState().last = Date.now() - 23*864e5; creatureState(); render(); });
  await p.click('.tabs [data-tab="creature"]'); await p.click('[data-act="gy-restart"]'); await p.click('[data-act="confirm-ok"]'); await p.waitForTimeout(150);
  const fresh = await p.evaluate(() => { const c = creatureState(); return {stage:c.stage, fid:c.fidelity, dead:!!c.dead, graves:(c.graves||[]).length, workouts:S.workouts.length}; });
  ok(fresh.stage === 0 && fresh.fid === 0 && !fresh.dead && fresh.graves === 1, "nouvel œuf : départ à zéro, l'ancien Gymon reste en souvenir");
  ok(fresh.workouts > 0, "repartir d'un œuf ne touche pas à l'historique des séances");
  await p.evaluate(() => { const c = creatureState(); c.stage = 12; c.fidelity = 70; c.at = CREATURE_CFG.stageAt.slice(); c.last = Date.now(); render(); });

  // Dessin : chaque muscle suit son niveau, et l'ambiance se choisit dans la fiche
  const draw = await p.evaluate(() => { const c = creatureState(); c.stage = 5;
    const w = lv => { MUSCLES.forEach(m => c.levels[m] = lv); return creatureSVG(c); };
    const thin = w(0), big = w(4.5), legs = (MUSCLES.forEach(m => c.levels[m] = 4), c.levels.Jambes = 0, creatureSVG(c));
    return {differs: thin !== big, veinsBig: /stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".9"/.test(big), veinsThin: /opacity=".9"\/>/.test(thin) && /stroke-linecap="round" opacity=".9"/.test(thin), legsThin: /scale\(0\.2 1\)/.test(legs)}; });
  ok(draw.differs && draw.veinsBig && !draw.veinsThin, "veines seulement aux niveaux élevés");
  ok(draw.legsThin, "retard en jambes : jambes en allumettes");
  // Courbes : passé reconstitué (poids, taille), un point par jour ensuite, gardé dans la sauvegarde
  const cv = await p.evaluate(() => { const D = 86400000, n = Date.now(), saved = {c:JSON.stringify(S.profile.creature), w:S.workouts};
    const set = (w, r) => Array.from({length:3}, () => ({w:String(w), r:String(r), done:true, warm:false}));
    S.workouts = []; for(let i = 0; i < 12; i++){ const t = n - (40 - i*3)*D; S.workouts.push({id:"cv"+i, name:"x", start:t, end:t+3600000, prs:[], exercises:[{exId:"squat", feel:3, sets:set(80+i, 8)}]}); }
    const c = creatureState(); c.born = n - 45*D; c.at = CREATURE_CFG.stageAt; c.fed = S.workouts.map(w => w.id); c.fidelity = 12; c.stage = stageFor(12, c); c.weight = 1.5; c.last = n - D; c.vit = 90; c.hist = null; c.histB = 0; c.dead = null;
    creatureLog(c); const h = c.hist, est = h.filter(p => p[4]).length, last = h[h.length-1], up = h[0][2] <= last[2];
    tab = "creature"; render(); ACT["gy-curve"](document.querySelector('[data-act="gy-curve"][data-k="1"]'), {stopPropagation(){}}); const svg = !!document.querySelector(".curve-box svg"); closeSheet();
    const back = cleanCreature(JSON.parse(JSON.stringify(c))).hist.length === h.length;
    S.profile.creature = JSON.parse(saved.c); S.workouts = saved.w; render();
    return {n:h.length, est, lastReal:last[4] === 0 && last[3] === 90, endsAtWeight:Math.abs(last[1] - 1.5) < 1e-9, up, svg, back}; });
  ok(cv.est === 12 && cv.lastReal && cv.endsAtWeight && cv.up, "courbes : 12 points reconstitués puis le point du jour, recalés sur le poids actuel, taille croissante", cv);
  ok(cv.svg && cv.back, "courbe affichée au toucher du poids ; l'historique suit la sauvegarde", cv);
  // Bras selon la vitalité, regard selon la forme (validés le 12 nov. 2026)
  const ge = await p.evaluate(() => { const D = 86400000, n = Date.now(), lv = Object.fromEntries(MUSCLES.map(m => [m, 2]));
    const mk = (vit, fed) => ({born:n - 60*D, last:n - D, vit, weight:3, fidelity:30, at:CREATURE_CFG.stageAt, look:{col:3, shorts:1}, stage:9, levels:lv, fed:fed || []});
    const arm = v => { const svg = creatureSVG(mk(v), false, false, {noFx:true}); return svg.includes("rotate(-82 ") ? 3 : svg.includes("rotate(-72 ") ? 2 : svg.includes("rotate(-38 ") ? 1 : 0; };
    const saved = S.workouts, set = Array.from({length:3}, () => ({w:"50", r:"8", done:true, warm:false}));
    S.workouts = []; for(let i = 0; i < 7; i++) S.workouts.push({id:"ge"+i, name:"x", start:n - (1 + i*2)*D, end:n - (1 + i*2)*D, prs:i < 3 ? ["squat"] : [], exercises:[{exId:"squat", feel:3, sets:set}]});
    const all = S.workouts.map(w => w.id), eyes = [gymonEyes(mk(100, all)), gymonEyes(mk(100, all.slice(3, 6))), gymonEyes(mk(100, all.slice(6))), gymonEyes(mk(100, ["x"]))];
    const sick = creatureSVG(mk(40, all), false, false, {noFx:true}).includes('rx="8.2"');   // malade : yeux mi-clos, sans iris
    S.workouts = saved; return {arms:[arm(100), arm(65), arm(40), arm(20)], eyes, sick}; });
  ok(ge.arms.join() === "0,1,2,3", "bras : levés à 80 % et plus, mi-hauteur, le long du corps, ballants sous 30 %", ge.arms);
  ok(ge.eyes[0] === "spark" && ge.eyes[1] === "tired" && ge.eyes[3] === "worn" && !ge.sick, "regard : étincelant si régulier et en progrès, fatigué puis épuisé sinon ; malade, les yeux restent mi-clos", ge);
  // La page Gymon tient dans l'écran : pas de défilement, bouton de séance au-dessus de la barre d'onglets
  const fit = await p.evaluate(() => { closeSheet(); const c = creatureState(), st0 = c.stage; c.stage = Math.max(2, c.stage); tab = "creature"; render();
    const r = {scroll:document.documentElement.scrollHeight - innerHeight, cta:document.querySelector(".gy-cta").getBoundingClientRect().bottom <= document.getElementById("tabs").getBoundingClientRect().top};
    c.stage = st0; render(); return r; });
  ok(fit.scroll <= 1 && fit.cta, "page Gymon sans défilement, tout tient au-dessus des onglets", fit);
  // Glisser sur le Gymon : face ⇄ dos, sans ouvrir sa fiche
  const sw = await p.evaluate(() => { const c = creatureState(), st0 = c.stage; c.stage = Math.max(2, c.stage); gyBack = false; tab = "creature"; render();
    const el = document.querySelector(".gy-stage"), r = el.getBoundingClientRect(), y = r.top + r.height/2;
    const tc = x => new Touch({identifier:1, target:el, clientX:x, clientY:y});
    el.dispatchEvent(new TouchEvent("touchstart", {bubbles:true, touches:[tc(r.left + 60)], changedTouches:[tc(r.left + 60)]}));
    el.dispatchEvent(new TouchEvent("touchend", {bubbles:true, touches:[], changedTouches:[tc(r.left + 220)]}));
    const back = gyBack; ACT["gy-more-tap"](); const sheet = !document.getElementById("sheet").hidden;
    gyBack = false; gySwiped = 0; c.stage = st0; closeSheet(); render(); return {back, sheet}; });
  ok(sw.back && !sw.sheet, "glisser sur le Gymon le retourne (dos), sans ouvrir sa fiche", sw);
  // Réglage d'expression retiré (12 nov. 2026) : plus de choix dans la fiche, mais un clin d'œil déjà choisi est gardé
  await p.evaluate(() => render()); await p.click('.tabs [data-tab="creature"]'); await p.click('[data-act="gy-more-tap"]');
  const noSeg = await p.evaluate(() => !document.querySelector('[data-act="gy-style"]'));
  await p.click('[data-act="close"]');
  const style = await p.evaluate(() => { S.profile.gymonStyle = "competition"; render(); const w = /Q\d+(\.\d+)? \d+(\.\d+)? \d+(\.\d+)? \d+(\.\d+)?" stroke="#2a1a14" stroke-width="3.4"/.test(document.querySelector(".gy-stage .creature").outerHTML); S.profile.gymonStyle = "aesthetic"; render(); return w; });
  ok(noSeg && style, "plus de réglage d'expression dans la fiche ; un clin d'œil déjà choisi reste appliqué", {noSeg, style});
  // Phrase du jour : tirée parmi 50, différente d'un jour à l'autre
  const q = await p.evaluate(() => { const c = creatureState(), real = Date; const at = d => { const t0 = new real(2026, 10, d, 12).getTime();
      window.Date = class extends real { constructor(...a){ a.length ? super(...a) : super(t0); } static now(){ return t0; } }; const r = gymQuote(c); window.Date = real; return r; };
    const days = Array.from({length:50}, (_, i) => at(i+1)); return {n:GYM_QUOTES.length, all:new Set(days).size, diff:days.every((x,i) => !i || x !== days[i-1]), hint:document.querySelector(".gy-hint") && getComputedStyle(document.querySelector(".gy-hint")).fontSize}; });
  ok(q.n === 50 && q.all === 50 && q.diff, "phrase du jour : 50 phrases, une différente chaque jour, toutes vues en 50 jours", q);
  ok(q.hint === "15px", "phrase écrite plus petite (15 px)", q.hint);
  // v1.9 : couleur et short tirés à la naissance, gardés à vie ; 3 couleurs rares
  const look = await p.evaluate(() => { const c = creatureState(), keep = JSON.stringify(c.look);
    const svgs = [5, 9, 12].map(st => { c.stage = st; return creatureSVG(c); }); c.stage = 5;
    const N = 20000, cnt = {}; for(let i=0;i<N;i++){ const l = rollLook(); cnt[l.col] = (cnt[l.col]||0) + 1; }
    const rare = GYM_COLORS.reduce((t,g,i) => t + (g.rare ? (cnt[i]||0) : 0), 0) / N;
    return {has:!!c.look, keep: keep === JSON.stringify(c.look), sameColor: svgs.every(x => x.includes(gymColor(c).h)), n:GYM_COLORS.length, rares:GYM_COLORS.filter(g => g.rare).length, rare, shorts:GYM_SHORTS.includes(GYM_SHORTS[c.look.shorts])}; });
  ok(look.has && look.keep && look.sameColor, "couleur tirée à la naissance et gardée à toutes les évolutions", look);
  ok(look.n === 20 && look.rares === 3 && look.rare > 0.045 && look.rare < 0.075 && look.shorts, "20 couleurs dont 3 rares (≈ 6 % au total), short tiré au hasard", look.rare);
  // Muscles qui viennent de grossir en rouge, fumée sur les muscles en récupération
  const fx = await p.evaluate(() => { const c = creatureState(), n = Date.now();
    c.lastMeal = {ts:n - 3600000, ups:["Pectoraux"], dl:{Pectoraux:.2}, vol:1000};
    S.workouts.push({id:"fx", name:"x", start:n - 3600000, end:n - 3600000, exercises:[{exId:"squat", sets:Array.from({length:6}, () => ({w:"100", r:"8", done:true}))}]});
    const a = creatureSVG(c); c.lastMeal.ts = n - 30*3600000; const b2 = creatureSVG(c);
    S.workouts = S.workouts.filter(w => w.id !== "fx");
    return {pump:/url\(#g\w+p\)/.test(a), pumpGone:!/url\(#g\w+p\)/.test(b2), steam:/cr-steam/.test(a)}; });
  ok(fx.pump && fx.pumpGone, "muscles qui viennent de grossir en rouge pendant 24 h", fx);
  ok(fx.steam, "fumée sur les muscles en récupération (jambes après un squat)", fx);
  // Nom, bulles, partage
  await p.evaluate(() => { tab = "creature"; render(); });
  await p.click('[data-act="gy-name"]'); await p.fill("#gy-name-in", "Rocky"); await p.click('[data-act="gy-name-ok"]');
  ok(await p.evaluate(() => creatureState().name === "Rocky" && /Rocky/.test(document.querySelector(".gy-name").textContent)), "nommer son Gymon : nom enregistré et affiché");
  const ba = await p.evaluate(() => { const c = creatureState(), D = 864e5; c.dead = null; c.last = Date.now(); c.vit = 100;
    c.ref = {ts:Date.now() - 16*D, stage:c.stage, weight:c.weight, levels:Object.fromEntries(MUSCLES.map(m => [m, Math.max(0, muscleLevel(c, m) - 0.5)]))};
    render(); const shown = !!document.querySelector(".ba"); c.ref.ts = Date.now() - 5*D; render(); const early = !!document.querySelector(".ba");
    c.ref = {ts:Date.now() - 31*D, stage:c.stage, weight:c.weight, levels:Object.fromEntries(MUSCLES.map(m => [m, muscleLevel(c, m)]))}; render(); const month = !!document.querySelector(".ba");
    return {shown, early, month}; });
  ok(ba.shown && !ba.early && ba.month, "avant / après : à 15 jours si ça a bougé, jamais avant, à 30 jours dans tous les cas", ba);
  await p.click('[data-act="ba-ok"]');
  ok(await p.evaluate(() => !document.querySelector(".ba") && Date.now() - creatureState().ref.ts < 60000), "« Super, on continue » : nouveau point de départ");
  const meltTalk = await p.evaluate(() => { const c = creatureState(), keep = JSON.stringify([c.levels, c.lastWorked, c.peak]);
    c.levels.Jambes = 3; c.peak = {...(c.peak||{}), Jambes:3}; c.lastWorked = {...(c.lastWorked||{}), Jambes:Date.now() - 25*864e5}; const L = gymonLines(c);
    [c.levels, c.lastWorked, c.peak] = JSON.parse(keep); return L; });
  ok(/Mes jambes fondent/.test(meltTalk[0]), "bulle : « Mes jambes fondent » en priorité", meltTalk[0]);
  const bubMelt = await p.evaluate(() => { const c = creatureState(), keep = JSON.stringify([c.levels, c.lastWorked, c.peak]);
    c.levels.Jambes = 3; c.peak = {...(c.peak||{}), Jambes:3}; c.lastWorked = {...(c.lastWorked||{}), Jambes:Date.now() - 25*864e5}; gyTalk = 0; tab = "creature"; render();
    const txt = document.querySelector(".gy-bubble").textContent; [c.levels, c.lastWorked, c.peak] = JSON.parse(keep); render(); return txt; });
  ok(/jambes fondent/.test(bubMelt), "la bulle affiche d'abord la fonte", bubMelt);
  const talk = await p.evaluate(() => { const c = creatureState(); MUSCLES.forEach(m => c.levels[m] = 3); c.levels.Jambes = 0.5; return gymonLines(c); });
  ok(talk.some(x => /jambes… on les oublie/.test(x)), "bulle : un muscle en retard est signalé (jambes)", talk);
  const bub1 = await p.evaluate(() => { render(); return document.querySelector(".gy-bubble").textContent; });
  await p.click(".gy-bubble"); const bub2 = await p.evaluate(() => document.querySelector(".gy-bubble").textContent);
  ok(bub1 && bub2 && bub1 !== bub2, "toucher la bulle : il dit autre chose", [bub1, bub2]);
  const card = await p.evaluate(async () => { const bl = await cardPNG(cardSVG("week")); return {type:bl.type, size:bl.size, svg:/Rocky/.test(cardSVG("week"))}; });
  ok(card.type === "image/png" && card.size > 20000 && card.svg, "carte de partage : image PNG avec le Gymon, son nom et les perfs", card);
  // Célébration de fin de séance et évolution en plein écran
  const cel = await p.evaluate(() => { const c = creatureState(), n = Date.now(); c.dead = null; c.last = n; c.vit = 100;
    const w = {id:"cel1", name:"x", start:n - 3000000, end:n, prs:[], exercises:[{exId:"dc-barre", sets:[{w:"60", r:"8", done:true}]}]}; S.workouts.push(w);
    celebrate(w, {vol:480, evolved:true, from:4, stage:5, ups:[]}); const evo = document.getElementById("celebrate").className;
    celebState.main(); const main = !!document.querySelector("#celebrate .celeb-in"); celebClose(true);
    return {evo, main, gone:!document.getElementById("celebrate")}; });
  ok(/evo/.test(cel.evo) && cel.main && cel.gone, "fin de séance : évolution en plein écran puis célébration, fermée par « Continuer »", cel);
  ok(celebSeen.length && celebSeen.every(Boolean), "la célébration s'affiche après chaque séance terminée", celebSeen);

  // Vue de dos : bouton Dos / Face, fessiers et mollets suivent les jambes
  await p.click('[data-act="gy-flip"]');
  const backV = await p.evaluate(() => ({lbl:document.querySelector(".gy-stage .creature").getAttribute("aria-label"), btn:document.querySelector('[data-act="gy-flip"]').textContent, sheet:!!document.querySelector(".sheet.open, .sheet[open]")}));
  ok(/vu de dos/.test(backV.lbl) && /Face/.test(backV.btn), "bouton Dos : le Gymon se retourne", backV);
  const glutes = await p.evaluate(() => { const c = creatureState(); const g = lv => { c.levels.Jambes = lv; return creatureSVG(c, false, true).match(/scale\(([\d.]+) [\d.]+\) translate\(-120 -200\)/)[1]; }; return [g(0), g(4.5)]; });
  ok(+glutes[1] > +glutes[0], "de dos, les fessiers grossissent avec les jambes", glutes);
  await p.click('[data-act="gy-flip"]');
  ok(!/vu de dos/.test(await p.evaluate(() => document.querySelector(".gy-stage .creature").getAttribute("aria-label"))), "bouton Face : retour de face");

  // Sauvegarde : le Gymon est restauré seulement s'il est plus avancé que celui du téléphone
  const rs = await p.evaluate(async () => {
    const saved = JSON.stringify(S.profile.creature), D = 86400000, now = Date.now();
    const adv = {v:4, born:now - 40*D, fidelity:25, stage:7, weight:12, levels:{Pectoraux:3.2, Jambes:9}, look:{col:18, shorts:2}, name:"Rocky<b>", vit:90, last:now - D,
      at:CREATURE_CFG.stages.map((_, i) => i * 3), fed:["w1", "bad id!"], hack:"<script>", mv:2, graves:[{stage:2, fidelity:5, died:now - 30*D}]};
    const backup = s => JSON.stringify({app:"carnet-fonte", profile:{creature:s}, workouts:[]});
    S.profile.creature = null; creatureState();   // téléphone neuf : un œuf
    await importText(backup(adv)); const c1 = S.profile.creature;
    const r1 = {stage:c1.stage, fid:c1.fidelity, name:c1.name, col:c1.look.col, jambes:c1.levels.Jambes, hack:"hack" in c1, fed:c1.fed, graves:c1.graves.length};
    c1.fidelity = 40; c1.stage = 9;   // le téléphone est plus avancé : la sauvegarde ne le remplace pas
    await importText(backup(adv)); const r2 = {fid:S.profile.creature.fidelity};
    S.profile.creature.fidelity = 10; S.profile.creature.stage = 4;   // moins avancé : remplacé, l'ancien part dans les souvenirs
    await importText(backup(adv)); const r3 = {fid:S.profile.creature.fidelity, graves:S.profile.creature.graves.length, last:S.profile.creature.graves.slice(-1)[0].fidelity};
    const r4 = cleanCreature({born:now, stage:99, look:{col:999}, levels:{Biceps:-3}}); const bad = cleanCreature({stage:3});
    S.profile.creature = JSON.parse(saved); saveLocal(); closeSheet(); render();
    return {r1, r2, r3, r4:{stage:r4.stage, look:r4.look, biceps:r4.levels.Biceps}, bad};
  });
  ok(rs.r1.stage === 7 && rs.r1.fid === 25 && rs.r1.name === "Rocky<b>" && rs.r1.col === 18 && rs.r1.jambes === 4.5, "sauvegarde : un Gymon plus avancé remplace l'œuf (stade, séances, nom, couleur rare, muscles bornés)", rs.r1);
  ok(!rs.r1.hack && rs.r1.fed.join() === "w1" && rs.r1.graves === 1, "sauvegarde : champs inconnus et identifiants douteux écartés ; l'œuf neuf ne laisse pas de souvenir", rs.r1);
  ok(rs.r2.fid === 40, "sauvegarde : un Gymon du téléphone plus avancé est gardé", rs.r2);
  ok(rs.r3.fid === 25 && rs.r3.graves === 2 && rs.r3.last === 10, "sauvegarde : le Gymon remplacé part dans les souvenirs", rs.r3);
  ok(rs.r4.stage === 12 && rs.r4.look === undefined && rs.r4.biceps === 0 && rs.bad === null, "sauvegarde : valeurs hors bornes ramenées, Gymon sans date de naissance refusé", rs);

  // Idées gaming 1 (12 nov. 2026) : réaction en direct, coup critique, repas du Gymon
  const g1 = await p.evaluate(async () => {
    const c = creatureState(), saved = JSON.stringify(c), W = JSON.stringify(S.workouts); c.stage = Math.max(2, c.stage); c.dead = false;
    S.profile.active = null; startWorkout("G", [{exId:"squat", sets:[blankSet(), blankSet(), blankSet(), blankSet()]}]); A().exercises[0].sets = A().exercises[0].sets.filter(x => !x.warm); render();
    const row = j => document.querySelector(`tr[data-i="0"][data-j="${j}"]`), val = (j, w, r) => { const a = A().exercises[0].sets[j]; a.w = w; a.r = r; render(); ACT.check(row(j).querySelector(".check")); };
    const r0 = CRIT.roll; CRIT.roll = () => true;   // les dés tombent toujours sur « critique »
    val(0, "60", "10"); const pop1 = document.getElementById("gy-pop"), p1 = pop1 && pop1.textContent, viewSame = !!document.getElementById("w-name");
    const pill1 = document.getElementById("meal").textContent;
    val(1, "60", "10"); const crit2 = !!A().exercises[0].sets[1].crit;
    val(2, "60", "10"); const crit3 = !!A().exercises[0].sets[2].crit, p3 = document.getElementById("gy-pop").textContent;
    val(3, "60", "10"); const crit4 = !!A().exercises[0].sets[3].crit;
    ACT.check(row(3).querySelector(".check")); const undo = !A().exercises[0].sets[3].crit;   // dévalider retire le critique
    val(3, "60", "10"); const crit5 = A().exercises[0].sets.filter(x => x.crit).length;
    const pill = document.getElementById("meal"), pct = pill.textContent, crow = !!document.querySelector("tr.set.crit");
    CRIT.roll = r0;
    finishWorkout(); const w = S.workouts[S.workouts.length-1], lm = creatureState().lastMeal;
    const res = {p1, viewSame, pill1, crit2, crit3, p3, crit4, undo, crit5, pct, crow, saved:w.exercises[0].sets.filter(x => x.crit).length, vol:wVolume(w), lm:{vol:lm.vol, bonus:lm.bonus}};
    celebClose(true); closeSheet(); S.workouts = JSON.parse(W); S.profile.creature = JSON.parse(saved); saveLocal(); render();
    return res; });
  ok(g1.p1 && g1.viewSame, "le Gymon réagit à chaque série validée, dans une bulle hors de la page", g1.p1);
  ok(!g1.crit2 && g1.crit3 && /CRITIQUE/.test(g1.p3), "coup critique possible à partir de la 3e série de travail, annoncé", g1);
  ok(g1.crit4 && g1.undo && g1.crit5 === 2 && g1.crow, "au plus 2 coups critiques par séance ; dévalider une série retire le sien", g1);
  ok(g1.saved === 2 && g1.vol === 2400 && g1.lm.vol === 2400 && g1.lm.bonus === 1200, "le critique nourrit double le Gymon sans changer le volume de la séance", g1);
  ok(/%/.test(g1.pct) && /%|kg|t/.test(g1.pill1), "pastille du repas du Gymon à côté du chrono", g1.pct);
  const g1b = await p.evaluate(() => {   // record battu en pleine séance : bulle spéciale, une fois par exercice
    const c = creatureState(), saved = JSON.stringify(c); c.stage = Math.max(2, c.stage); c.dead = false; const r0 = CRIT.roll; CRIT.roll = () => false;
    S.profile.active = null; startWorkout("P", [{exId:"dc-barre", sets:[blankSet(), blankSet()]}]); A().exercises[0].sets = A().exercises[0].sets.filter(x => !x.warm); render(); document.getElementById("gy-pop")?.remove();
    const row = j => document.querySelector(`tr[data-i="0"][data-j="${j}"]`), val = (j, w, r) => { const a = A().exercises[0].sets[j]; a.w = w; a.r = r; render(); ACT.check(row(j).querySelector(".check")); };
    val(0, "200", "5"); const a = document.getElementById("gy-pop"); const pr = a.className, t = a.textContent;
    val(1, "205", "5"); const pr2 = document.getElementById("gy-pop").className;
    CRIT.roll = r0; S.profile.active = null; S.profile.creature = JSON.parse(saved); saveLocal(); render();
    return {pr, t, pr2}; });
  ok(/pop-pr/.test(g1b.pr) && /RECORD/.test(g1b.t) && !/pop-pr/.test(g1b.pr2), "record pendant la séance : bulle « RECORD », une seule fois par exercice", g1b);

  // Idées gaming 4 : saute de joie après un repas, dort la nuit, repas donné à la main
  const g4 = await p.evaluate(async () => {
    const c = creatureState(), saved = JSON.stringify(c); c.stage = Math.max(5, c.stage); c.dead = false; c.last = Date.now();
    c.lastMeal = {w:"x", vol:1000, gain:.1, ts:Date.now(), ups:[], dl:{}}; tab = "creature"; render();
    const hop1 = !!document.querySelector(".gy-stage .creature.gy-hop"), happy = /Q[\d.]+ [\d.]+ [\d.]+ [\d.]+" stroke="#2a1a14" stroke-width="3.4"/.test(document.querySelector(".gy-stage .creature").outerHTML);
    render(); const hop2 = !!document.querySelector(".gy-stage .creature.gy-hop");
    gyHourFix = 2; render(); const zzz = !!document.querySelector(".gy-zzz"), night = /Zzz/.test(document.querySelector(".gy-bubble").textContent);
    ACT["gy-more-tap"](); const sheet = !document.getElementById("sheet").hidden, woke = !document.querySelector(".gy-zzz") && /Hein/.test(document.querySelector(".gy-bubble").textContent);
    gyWake = 0; gyHourFix = 12; render();
    // Fin de séance : le repas attend qu'on le donne
    celebrate({id:"z", prs:[], exercises:[]}, {vol:1500, bonus:500, gain:.2, evolved:false, ups:[]});
    const hid = document.getElementById("celeb-rev").hidden, food = document.getElementById("celeb-food").textContent;
    document.getElementById("celeb-food").click(); await new Promise(r => setTimeout(r, 600));
    const shown = !document.getElementById("celeb-rev").hidden && /Coup critique/.test(document.getElementById("celeb-rev").textContent), chomp = document.getElementById("celeb-gy").classList.contains("chomp");
    celebClose(true); S.profile.creature = JSON.parse(saved); saveLocal(); render();
    return {hop1, hop2, happy, zzz, night, sheet, woke, hid, food, shown, chomp}; });
  ok(g4.hop1 && !g4.hop2 && g4.happy, "après un repas : yeux rieurs, et il saute de joie une seule fois à l'ouverture", g4);
  ok(g4.zzz && g4.night && !g4.sheet && g4.woke, "la nuit il dort (Zzz) ; le toucher le réveille au lieu d'ouvrir sa fiche", g4);
  ok(g4.hid && /2 t|2 000|2000/.test(g4.food.replace(/\s/g, " ")) && g4.shown && g4.chomp, "fin de séance : on lui donne le repas (bonus compris), puis ses gains s'affichent", g4);
  // Glisser le repas jusqu'au Gymon
  await p.evaluate(() => { celebrate({id:"z2", prs:[], exercises:[]}, {vol:900, gain:.1, evolved:false, ups:[]}); });
  const fb = await p.locator("#celeb-food").boundingBox(), gb = await p.locator("#celeb-gy").boundingBox();
  await p.mouse.move(fb.x + fb.width/2, fb.y + fb.height/2); await p.mouse.down();
  for(let i = 1; i <= 8; i++) await p.mouse.move(fb.x + fb.width/2 + (gb.x + gb.width/2 - fb.x - fb.width/2)*i/8, fb.y + fb.height/2 + (gb.y + gb.height/2 - fb.y - fb.height/2)*i/8);
  await p.mouse.up(); await p.waitForTimeout(600);
  ok(await p.evaluate(() => { const r = !document.getElementById("celeb-rev").hidden; celebClose(true); return r; }), "glisser le repas sur le Gymon le nourrit");

  // Rendu des 4 stades avec muscles faibles puis forts
  if(SHOTS){ for(const st of [5,9,12]) for(const lv of [0,4]){
    await p.evaluate(([st,lv]) => { const c = creatureState(); c.stage = st; MUSCLES.forEach(m => c.levels[m] = m==="Jambes" ? Math.min(lv,1) : lv); c.last = Date.now(); render(); }, [st,lv]);
    await p.locator(".creature").first().screenshot({path:path.join(SHOTS, `st${st}-lv${lv}.png`)}); } }

  ok(errs.length === 0, "aucune erreur JavaScript", errs);
  await b.close();
  console.log(fails ? `\n${fails} échec(s)` : "\nTous les tests de la créature passent");
  process.exit(fails ? 1 : 0);
})();
