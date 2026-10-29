// Tests de la créature (Node + Playwright). Usage : node tests/creature.js [dossier-captures]
const {chromium, devices} = require("playwright");
const path = require("path");
const URL = "file://" + path.resolve(__dirname, "..", "index.html"), SHOTS = process.argv[2];
let fails = 0; const ok = (cond, label, extra) => { console.log(`${cond ? "OK  " : "ÉCHEC"} ${label}${extra!==undefined ? " → " + JSON.stringify(extra) : ""}`); if(!cond) fails++; };

(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({...devices["iPhone 13"]}), p = await ctx.newPage(), errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(300);
  ok(await p.evaluate(() => tab) === "creature", "la page Créature s'ouvre en premier");
  ok(await p.evaluate(() => document.querySelector(".tabs button").dataset.tab) === "creature", "Créature en première position de la navigation");
  let c = await p.evaluate(() => creatureState());
  ok(c.stage === 0 && c.fidelity === 0, "départ : œuf, fidélité 0", {stage:c.stage, fid:c.fidelity});

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
  ok(c.stage === 1, "2 séances : poussin", c.stage);
  await p.click('.tabs [data-tab="creature"]'); if(SHOTS) await p.screenshot({path:path.join(SHOTS, "c1.png")});

  // Montée jusqu'au dinosaure par des séances simulées (même fonction que la validation)
  const res = await p.evaluate(() => {
    const out = []; let prevLv = {...creatureState().levels};
    for(let i=0;i<30;i++){
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
  ok(res.stages.includes(2) && res.stages[res.stages.length-1] === 3, "progression poussin → poulet → dinosaure sans sauter de stade", res.stages.filter((x,i,a)=>a.indexOf(x)===i));
  ok(res.stages.every((x,i,a) => i===0 || x >= a[i-1]), "un stade acquis ne se perd jamais");

  // Pause de 20 jours : vitalité en baisse, rien n'est perdu
  const pause = await p.evaluate(() => { const c = creatureState(), keep = JSON.stringify({s:c.stage, l:c.levels, w:c.weight, f:c.fidelity});
    c.last = Date.now() - 20*864e5; const v = creatureVitality(c);
    return {v, same: keep === JSON.stringify({s:c.stage, l:c.levels, w:c.weight, f:c.fidelity})}; });
  ok(pause.v === 22 && pause.same, "pause de 20 jours : vitalité 22 %, stade, muscles et poids conservés", pause.v);
  await p.click('.tabs [data-tab="creature"]'); if(SHOTS) await p.screenshot({path:path.join(SHOTS, "c3tired.png")});
  await play("90","8","90","8");
  ok(await p.evaluate(() => creatureVitality(creatureState())) === 100, "reprise : vitalité remontée à 100 %");
  await p.click('.tabs [data-tab="creature"]'); if(SHOTS) await p.screenshot({path:path.join(SHOTS, "c3.png"), fullPage:true});

  // Rendu des 4 stades avec muscles faibles puis forts
  if(SHOTS){ for(const st of [2,3]) for(const lv of [0,4]){
    await p.evaluate(([st,lv]) => { const c = creatureState(); c.stage = st; MUSCLES.forEach(m => c.levels[m] = m==="Jambes" ? Math.min(lv,1) : lv); c.last = Date.now(); render(); }, [st,lv]);
    await p.locator(".creature").first().screenshot({path:path.join(SHOTS, `st${st}-lv${lv}.png`)}); } }

  ok(errs.length === 0, "aucune erreur JavaScript", errs);
  await b.close();
  console.log(fails ? `\n${fails} échec(s)` : "\nTous les tests de la créature passent");
  process.exit(fails ? 1 : 0);
})();
