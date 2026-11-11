// Tests du guide de prise en main (Node + Playwright). Usage : node tests/guide.js
const {chromium, devices} = require("playwright");
const path = require("path");
const URL = "file://" + path.resolve(__dirname, "..", "index.html");
let fails = 0; const ok = (cond, label, extra) => { console.log(`${cond ? "OK  " : "ÉCHEC"} ${label}${extra!==undefined ? " → " + JSON.stringify(extra) : ""}`); if(!cond) fails++; };

(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({...devices["iPhone 13"]}), p = await ctx.newPage(), errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(300);
  await p.click('.sheet [data-act="close"]').catch(()=>{});
  await p.waitForSelector("#tuto .tu-skip", {timeout:2000}); await p.click("#tuto .tu-skip");   // tuto du Gymon
  ok(await p.isHidden("#tuto"), "le guide de l'app ne s'ouvre pas sur la page Gymon");
  await p.click('.tabs [data-tab="seance"]'); await p.waitForTimeout(150);
  ok(await p.isVisible("#tuto .tu-card"), "premier passage sur Séance : le guide de l'app s'ouvre");
  const titles = [];
  for(let i=0;i<7;i++){ titles.push(await p.textContent("#tuto h3")); if(i<6) await p.click('#tuto [data-act="tuto-next"]'); }
  ok(titles.length === 7 && titles[3] === "Construis ta semaine" && titles[6] === "Ton avis compte", "7 écrans, dont la Routine et la boîte à idées", titles);
  await p.click('#tuto [data-act="tuto-prev"]'); ok(await p.textContent("#tuto h3") === titles[5], "« Retour » revient à l'écran précédent");
  await p.click('#tuto .tu-skip');
  ok(await p.isHidden("#tuto") && await p.evaluate(() => S.profile.tutoAppDone === true && S.profile.tutoDone === true), "« Passer » ferme le guide pour de bon, sans toucher au tuto du Gymon");
  await p.click('.tabs [data-tab="routine"]'); await p.click('.tabs [data-tab="seance"]');
  ok(await p.isHidden("#tuto"), "le guide ne revient pas ensuite");
  await p.reload(); await p.waitForTimeout(300); await p.click('.tabs [data-tab="seance"]');
  ok(await p.isHidden("#tuto"), "ni après rechargement");
  await p.click('.tabs [data-tab="exercices"]'); await p.click('[data-act="tuto-app"]');
  ok(await p.textContent("#tuto h3") === "Note tes séries", "« Revoir le guide de l'app » le rouvre depuis Exercices");
  await p.click('#tuto .tu-skip'); await p.click('[data-act="tuto"]');
  ok(await p.textContent("#tuto h3") === "Voici ton Gymon", "« Revoir le tuto du Gymon » rouvre l'autre tuto");
  await p.click('#tuto .tu-skip');
  // Quoi de neuf : nouvel utilisateur → rien ; testeur d'avant → les nouveautés depuis sa dernière séance, une seule fois
  const wn = await p.evaluate(() => { closeSheet();
    const fresh = S.profile.seenVersion === versionDate(APP_VERSION);
    S.profile.seenVersion = undefined; S.workouts = [{id:"old", name:"x", start:new Date(2026, 10, 5, 18).getTime(), end:new Date(2026, 10, 5, 19).getTime(), exercises:[{exId:"squat", sets:[{w:"100", r:"5", done:true}]}]}];
    maybeWhatsNew(); const shown = !document.getElementById("sheet").hidden, items = document.querySelectorAll(".wn-i").length, oldest = [...document.querySelectorAll(".wn-d")].pop().textContent;
    closeSheet(); maybeWhatsNew(); const again = !document.getElementById("sheet").hidden;
    return {fresh, shown, items, oldest, again, total:WHATS_NEW.length, after:WHATS_NEW.filter(x => x.d > "2026-11-05").length}; });
  ok(wn.fresh, "nouvel utilisateur : pas de fenêtre « Quoi de neuf »", wn);
  ok(wn.shown && wn.items === wn.after && /6 novembre/.test(wn.oldest) && !wn.again, "testeur dont la dernière séance date du 5 nov. : nouveautés depuis le 6 nov., affichées une seule fois", wn);
  await p.click('.tabs [data-tab="exercices"]'); await p.click('[data-act="whats-new"]');
  ok(await p.evaluate(() => document.querySelectorAll(".wn-i").length === WHATS_NEW.length), "Réglages : « Les nouveautés » rouvre la liste complète");
  ok(errs.length === 0, "aucune erreur JavaScript", errs);
  await b.close();
  console.log(fails ? `\n${fails} échec(s)` : "\nTous les tests du guide passent");
  process.exit(fails ? 1 : 0);
})();
