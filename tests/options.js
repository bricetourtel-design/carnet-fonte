// Tests des réglages par exercice (Node + Playwright) : exercice perso modifiable et muscles secondaires,
// photo de sa machine, unilatéral (volume ×2 figé dans la séance), poids à vide, export / import.
// Usage : node tests/options.js
const {chromium, devices} = require("playwright");
const path = require("path");
const URL = "file://" + path.resolve(__dirname, "..", "index.html");
const PHOTO = path.resolve(__dirname, "..", "img", "dc-barre-0.jpg");
let fails = 0; const ok = (cond, label, extra) => { console.log(`${cond ? "OK  " : "ÉCHEC"} ${label}${extra!==undefined ? " → " + JSON.stringify(extra).slice(0, 400) : ""}`); if(!cond) fails++; };

(async () => {
  const b = await chromium.launch(), errs = [], ctx = await b.newContext({...devices["iPhone 13"]}), p = await ctx.newPage();
  p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(300);
  await p.evaluate(() => { S.profile.tutoDone = true; S.profile.welcomed = true; S.profile.wnKeys = WHATS_NEW.map(wnKey); closeSheet(); document.getElementById("tuto")?.remove(); tab = "exercices"; render(); });

  // Création avec muscles secondaires
  await p.evaluate(() => ACT["new-ex"]());
  await p.fill("#nx-name", "Presse maison"); await p.selectOption("#nx-m", "Quadriceps"); await p.selectOption("#nx-e", "Machine");
  await p.click('#nx-sec [data-m="Fessiers"]'); await p.click('#nx-sec [data-m="Ischios"]');
  await p.click('[data-act="nx-save"]'); await p.waitForTimeout(200);
  const c1 = await p.evaluate(() => { const e = S.profile.custom.find(x => x.name === "Presse maison"); return {e, w:exWork(e)}; });
  ok(c1.w.Quadriceps === 1 && c1.w.Fessiers === .5 && c1.w.Ischios === .5 && Object.keys(c1.w).length === 3, "création : principal 100 %, secondaires 50 %", c1.w);
  const c0 = await p.evaluate(() => { ACT["new-ex"](); document.getElementById("nx-name").value = "Développé machine perso"; ACT["nx-save"](); const e = S.profile.custom.find(x => x.name === "Développé machine perso"); return {sec:e.sec, w:exWork(e)}; });
  ok(c0.sec === undefined && c0.w.Triceps > 0, "sans muscle secondaire choisi : devinés comme avant", c0);

  // Modifier un exercice perso : nom, muscles ; l'identifiant ne change pas
  await p.evaluate(id => ACT["ex-info"]({dataset:{id}}), c1.e.id); await p.waitForTimeout(150);
  await p.click('[data-act="ex-edit"]');
  await p.fill("#nx-name", "Presse 45° de ma salle"); await p.click('#nx-sec [data-m="Fessiers"]'); await p.click('#nx-sec [data-m="Adducteurs"]');
  await p.click('[data-act="ex-edit-save"]'); await p.waitForTimeout(150);
  const c2 = await p.evaluate(id => { const e = S.profile.custom.find(x => x.id === id); return {e, w:exWork(e)}; }, c1.e.id);
  ok(c2.e.name === "Presse 45° de ma salle" && !c2.w.Fessiers && c2.w.Adducteurs === .5 && c2.w.Ischios === .5, "modification : nom et muscles, même identifiant", c2);
  await p.evaluate(() => ACT["ex-info"]({dataset:{id:"dc-barre"}})); await p.waitForTimeout(100);
  ok(await p.$('[data-act="ex-edit"]') === null, "pas de modification sur un exercice de base");

  // Photo de sa machine : réduite, stockée à part, affichée
  await p.setInputFiles("#ph-file", PHOTO); await p.waitForTimeout(800);
  const ph = await p.evaluate(() => ({n:myPhoto("dc-barre").length, shown:!!document.querySelector(".demo.mine img"), inS:JSON.stringify(S).includes("data:image"), w:(() => { const i = document.querySelector(".demo.mine img"); return i ? i.naturalWidth : 0; })()}));
  ok(ph.n > 1000 && ph.n < 150000 && ph.shown && !ph.inS && ph.w <= 560, "photo réduite (≤ 560 px), affichée, hors de la clé principale", ph);

  // Poids à vide
  await p.fill("#ex-empty", "15"); await p.dispatchEvent("#ex-empty", "change");
  ok(await p.evaluate(() => plateText(exById("dc-barre"), 75)) === "(30 kg / côté)", "barre : poids à vide réglé");
  ok(await p.evaluate(() => plateText(exById("rowing-iso-machine"), 60)) === "", "machine sans poids à vide : rien");
  ok(await p.evaluate(() => { setExOpt("rowing-iso-machine", "empty", 10); return plateText(exById("rowing-iso-machine"), 60); }) === "(25 kg / côté)", "machine à disques : par côté");
  ok(await p.evaluate(() => { setExOpt("leg-ext-unilateral", "empty", 5); return plateText(exById("leg-ext-unilateral"), 45); }) === "(40 kg ajoutés)", "machine : kg ajoutés");
  ok(await p.evaluate(() => plateText(exById("curl-halteres"), 20)) === "", "haltères : jamais de poids à vide");

  // Unilatéral : volume ×2, mentions, figé à l'enregistrement
  await p.evaluate(() => { closeSheet(); S.profile.active = {id:"t1", name:"Test", start:Date.now(), exercises:[{exId:"curl-halteres", sets:[{w:"10", r:"10", done:true}]}]}; tab = "seance"; render(); });
  const v1 = await p.evaluate(() => wVolume(S.profile.active));
  await p.evaluate(() => ACT["ex-menu"]({dataset:{i:"0"}})); await p.click('.sheet [data-act="ex-uni"]'); await p.waitForTimeout(150);
  const v2 = await p.evaluate(() => ({v:wVolume(S.profile.active), head:document.querySelector("table.sets thead").textContent}));
  ok(v1 === 100 && v2.v === 200 && /kgpar côté.*Repspar côté/.test(v2.head), "unilatéral : volume ×2, « par côté » sous kg et reps", {v1, v2});
  await p.evaluate(() => { closeSheet(); finishWorkout(); });
  const sv = await p.evaluate(() => { const w = S.workouts.at(-1); return {uni:w.exercises[0].uni, v:wVolume(w)}; });
  ok(sv.uni === 1 && sv.v === 200, "séance enregistrée : unilatéral figé", sv);
  ok(await p.evaluate(() => { setExOpt("curl-halteres", "uni", 0); return wVolume(S.workouts.at(-1)); }) === 200, "changer l'option ne réécrit pas le passé");
  ok(await p.evaluate(() => wVolume({exercises:[{exId:"curl-halteres", sets:[{w:"10", r:"10", done:true}]}]})) === 100, "séance ancienne sans option : volume inchangé");

  // Export / import sur un autre téléphone
  const exp = await p.evaluate(() => exportText()), d = JSON.parse(exp);
  ok(d.app === "carnet-fonte" && d.photos && d.photos["dc-barre"] && d.profile.exOpts["rowing-iso-machine"].empty === 10, "export : photos et réglages");
  const ctx2 = await b.newContext({...devices["iPhone 13"]}), q = await ctx2.newPage(); q.on("pageerror", e => errs.push(e.message));
  await q.goto(URL); await q.waitForTimeout(300);
  await q.evaluate(t => importText(t), exp); await q.waitForTimeout(400);
  const r = await q.evaluate(() => ({ph:!!myPhoto("dc-barre"), empty:exOpt("rowing-iso-machine").empty, uni:S.workouts.at(-1).exercises[0].uni, sec:S.profile.custom.find(x => x.name.startsWith("Presse")).sec}));
  ok(r.ph && r.empty === 10 && r.uni === 1 && r.sec.Adducteurs === .5 && r.sec.Ischios === .5, "import : photos, réglages, unilatéral, muscles", r);

  ok(errs.length === 0, "aucune erreur JavaScript", errs);
  await b.close();
  console.log(fails ? `\n${fails} échec(s)` : "\nTous les tests des réglages d'exercice passent");
  process.exit(fails ? 1 : 0);
})();
