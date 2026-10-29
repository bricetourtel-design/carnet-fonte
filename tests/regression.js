// Test de non-régression du Carnet de Fonte (Node + Playwright, Chromium).
// Usage : node tests/regression.js            → compare aux valeurs de référence
//         node tests/regression.js --update   → enregistre les valeurs de référence (à faire avant une modification)
// Données synthétiques uniquement : aucune donnée personnelle.
const {chromium, devices} = require("playwright");
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), GOLDEN = path.join(__dirname, "golden.json");
const URL = "file://" + path.join(ROOT, "index.html");

// Historique synthétique, relatif à « maintenant » (heures rondes) pour rester stable
const SYNTH = `(() => {
  const H = 3600e3, now = Math.floor(Date.now()/H)*H, D = 24*H;
  const set = (w,r,warm) => ({w:String(w), r:String(r), done:true, warm:!!warm});
  const W = (id, daysAgo, exs) => ({id, name:"T"+id, start:now-daysAgo*D, end:now-daysAgo*D+H, routineId:null, prs:[],
    exercises: exs.map(([exId, feel, sets]) => ({exId, feel, sets: sets.map(s => set(...s))}))});
  return [
    W("s1", 30, [["dc-barre",3,[[40,12,1],[80,10],[80,9],[80,8]]], ["tractions",3,[[0,8],[0,7],[0,6]]], ["curl-halteres",3,[[14,11],[14,11],[14,10]]]]),
    W("s2", 26, [["squat",4,[[100,8],[100,8],[100,7]]], ["leg-curl",3,[[40,12],[40,12]]], ["crunch",2,[[0,20],[0,20]]]]),
    W("s3", 23, [["dc-barre",2,[[82.5,10],[82.5,10],[82.5,10]]], ["dm-halteres",3,[[20,10],[20,9]]], ["ext-poulie",3,[[25,12],[25,11]]]]),
    W("s4", 19, [["rowing-barre",3,[[60,10],[60,10],[60,9]]], ["tirage-vertical",3,[[50,12],[50,11]]], ["curl-barre",4,[[30,9],[30,8]]]]),
    W("s5", 16, [["squat",5,[[105,6],[105,5]]], ["hip-thrust",3,[[80,10],[80,10]]], ["mollets",3,[[60,15],[60,15]]]]),
    W("s6", 12, [["dc-barre",3,[[85,8],[85,8],[85,7]]], ["elev-lat",1,[[8,20],[8,20],[8,20]]], ["face-pull",3,[[30,15],[30,14]]]]),
    W("s7", 2, [["dc-barre",4,[[85,8],[85,7]]], ["di-halteres",3,[[24,10],[24,9]]], ["ext-poulie",4,[[27,10],[27,9]]]])
  ];
})()`;

const CSV = "\uFEFFDate,Start Date,Workout,Source,Workout Duration (min),Energy,Exercise,Superset,Set,Set Type,Reps,Weight (kg),Distance (km),Set Duration (sec),Incline,Steps,Effort,Workout Notes\n" +
  "2026/01/05,08:00,Monday,,50,0,Développé Couché à la Barre,Non,1,Échauffement,12,40,0,,,,Idéal,\n" +
  "2026/01/05,08:00,Monday,,50,0,Développé Couché à la Barre,Non,2,Normale,8,80,0,,,,Difficile,\n" +
  "2026/01/05,08:00,Monday,,50,0,Squat Hack,Non,1,Normale,10,60,0,,,,Idéal,\n" +
  "2026/01/05,08:00,Monday,,50,0,Natation,Non,1,Normale,0,0,1,,,,,\n" +
  "2026/01/07,18:30,Wednesday,,40,0,Pull Up,Non,1,Dropset,6,92.2,0,,,,Facile,\n";

async function snapshot(page){
  return page.evaluate(({SYNTH, CSV}) => {
    // Horloge figée à la demi-heure en cours : les calculs liés au temps (récupération, reprise) restent identiques d'un lancement à l'autre
    const H = 3600e3, FIXED = Math.floor(Date.now()/H)*H + H/2, RealDate = Date; Date.now = () => FIXED;
    const out = {};
    // Bibliothèque et associations exercice → muscle (ne doivent pas changer)
    out.library = EX.map(e => [e.id, e.name, e.muscle, e.equip]);
    out.gravlMap = GRAVL;
    out.muscles = MUSCLES;
    out.repRanges = EX.map(e => [e.id, repRange(e)]);
    // Calculs de force
    out.e1rm = [[100,1],[100,5],[80,10],[60,0],[22.5,12]].map(([w,r]) => e1rm(w,r));
    S.workouts = eval(SYNTH); S.profile = {...defaultProfile(), bw:90};
    out.history = ["dc-barre","squat","tractions","curl-halteres"].map(id => exHistory(id).map(x => [Math.round(x.best*100)/100, x.maxW, x.vol, x.reps]));
    out.volumes = S.workouts.map(w => [w.id, wVolume(w), wSetCount(w)]);
    out.coach = ["dc-barre","squat","tractions","curl-halteres","rowing-barre","elev-lat","ext-poulie","leg-press-inexistant"].map(id => { const c = coach(id); return [id, c.w, c.r, c.sets, c.tag, c.lo, c.hi, c.rest]; });
    const st = strengthByMuscle(); out.strength = MUSCLES.map(m => [m, st.res[m].score===null ? null : Math.round(st.res[m].score*1000)/1000, st.res[m].tag||null]);
    out.recovery = MUSCLES.map(m => [m, Math.round(recovery(m).pct*1000)/1000]);
    const d = newDraft(4); d.days.forEach(x => x.min = 60);
    const g = generatePlan(d); out.plan = g.days.map(x => [x.dow, x.name, x.items.map(i => [i.exId, i.sets])]); out.planWeekly = g.weekly;
    out.estMinutes = Math.round(estMinutes([{exId:"dc-barre",sets:3},{exId:"curl-barre",sets:3}])*100)/100;
    const gr = gravlToWorkouts(CSV); out.gravl = {n:gr.workouts.length, sets:gr.sets, skipped:gr.skipped, custom:gr.custom.map(e => [e.id, e.muscle, e.equip]),
      w:gr.workouts.map(w => [w.id, w.name, w.exercises.map(x => [x.exId, x.feel||0, x.sets.map(s => [s.w, s.r, s.warm])])])};
    Date.now = RealDate.now;
    return out;
  }, {SYNTH, CSV});
}

async function uiChecks(browser){
  const ctx = await browser.newContext({...devices["iPhone 13"]}), page = await ctx.newPage(), errs = [];
  page.on("pageerror", e => errs.push(e.message));
  await page.goto(URL); await page.waitForTimeout(300);
  const res = {};
  // Chaque onglet s'affiche sans erreur
  const tabs = await page.$$eval(".tabs button", bs => bs.map(b => b.dataset.tab));
  for(const t of tabs){ await page.click(`.tabs [data-tab="${t}"]`); await page.waitForTimeout(80); }
  res.tabsRender = true;
  // Carnet : démarrer une séance libre, ajouter 1 exercice, valider 2 séries, terminer
  await page.click('.tabs [data-tab="seance"]');
  await page.click('[data-act="start-empty"]');
  await page.click('[data-act="pick-ex"]');
  await page.click('#pick-list [data-act="pick-toggle"][data-id="dc-barre"]');
  await page.click('#pick-go');
  await page.fill("#w-0-0", "70"); await page.fill("#r-0-0", "10"); await page.click('tr[data-i="0"][data-j="0"] .check');
  await page.fill("#w-0-1", "70"); await page.fill("#r-0-1", "9");  await page.click('tr[data-i="0"][data-j="1"] .check');
  await page.click('[data-act="rest-skip"]').catch(()=>{});
  await page.click('[data-act="finish-w"]'); await page.click('[data-act="confirm-ok"]').catch(()=>{});
  await page.waitForTimeout(200);
  const saved = await page.evaluate(() => S.workouts.map(w => w.exercises.map(x => [x.exId, x.sets.map(s => [s.w, s.r, s.done])])));
  res.saved = saved;
  // Persistance : la séance est toujours là après rechargement, sans doublon
  await page.reload(); await page.waitForTimeout(300);
  res.afterReload = await page.evaluate(() => S.workouts.length);
  res.errors = errs;
  await ctx.close();
  return res;
}

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage(), errs = [];
  page.on("pageerror", e => errs.push(e.message));
  await page.goto(URL); await page.waitForTimeout(200);
  const snap = await snapshot(page);
  const ui = await uiChecks(browser);
  await browser.close();
  const data = {snap, ui:{saved:ui.saved, afterReload:ui.afterReload}};
  if(process.argv.includes("--update")){ fs.writeFileSync(GOLDEN, JSON.stringify(data, null, 1)); console.log("Valeurs de référence enregistrées :", GOLDEN); }
  const gold = JSON.parse(fs.readFileSync(GOLDEN, "utf8")); let fails = 0;
  for(const k of Object.keys(gold.snap)){
    const ok = JSON.stringify(gold.snap[k]) === JSON.stringify(snap[k]);
    console.log(`${ok ? "OK  " : "ÉCHEC"} calcul : ${k}`); if(!ok){ fails++; console.log("   attendu :", JSON.stringify(gold.snap[k]).slice(0,300), "\n   obtenu  :", JSON.stringify(snap[k]).slice(0,300)); }
  }
  for(const k of ["saved","afterReload"]){
    const ok = JSON.stringify(gold.ui[k]) === JSON.stringify(data.ui[k]);
    console.log(`${ok ? "OK  " : "ÉCHEC"} carnet : ${k}`); if(!ok) fails++;
  }
  const allErr = errs.concat(ui.errors);
  console.log(allErr.length ? "ÉCHEC erreurs JavaScript : " + allErr.join(" | ") : "OK   aucune erreur JavaScript");
  if(allErr.length) fails++;
  console.log(fails ? `\n${fails} échec(s)` : "\nTous les tests de non-régression passent");
  process.exit(fails ? 1 : 0);
})();
