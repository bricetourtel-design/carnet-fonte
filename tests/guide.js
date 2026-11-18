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
  await p.click('.top [data-act="settings"]'); await p.click('[data-act="tuto-app"]');
  ok(await p.textContent("#tuto h3") === "Note tes séries", "« Revoir le guide de l'app » le rouvre depuis Exercices");
  await p.click('#tuto .tu-skip'); await p.click('[data-act="tuto"]');
  ok(await p.textContent("#tuto h3") === "Voici ton Gymon", "« Revoir le tuto du Gymon » rouvre l'autre tuto");
  await p.click('#tuto .tu-skip');
  // Quoi de neuf : nouvel utilisateur → rien ; testeur d'avant → les nouveautés depuis sa dernière séance, une seule fois
  const wn = await p.evaluate(() => { closeSheet();
    const fresh = S.profile.wnSeen === versionDate(APP_VERSION) && document.getElementById("sheet").hidden;
    const born0 = S.profile.creature.born; S.profile.creature.born = new Date(2026, 10, 1).getTime();
    S.profile.wnSeen = undefined; delete S.profile.wnKeys; S.workouts = [{id:"old", name:"x", start:new Date(2026, 10, 5, 18).getTime(), end:new Date(2026, 10, 5, 19).getTime(), exercises:[{exId:"squat", sets:[{w:"100", r:"5", done:true}]}]}];
    maybeWhatsNew(); const shown = !document.getElementById("sheet").hidden, items = document.querySelectorAll(".wn-i").length, oldest = [...document.querySelectorAll(".wn-d")].pop().textContent;
    // rechargement (mise à jour) avant de fermer : la fenêtre revient
    document.getElementById("sheet").hidden = true; maybeWhatsNew(); const back = !document.getElementById("sheet").hidden;
    closeSheet(); maybeWhatsNew(); const again = !document.getElementById("sheet").hidden;
    // testeur sans séance, Gymon né il y a 10 jours : nouveautés depuis sa naissance
    S.profile.wnSeen = undefined; delete S.profile.wnKeys; S.workouts = []; const keep = S.profile.creature.born; S.profile.creature.born = Date.now() - 10*864e5; const fid = S.profile.creature.fidelity; S.profile.creature.fidelity = 0;
    maybeWhatsNew(); const noSession = !document.getElementById("sheet").hidden; closeSheet(); S.profile.creature.born = keep; S.profile.creature.fidelity = fid;
    S.profile.creature.born = born0;
    return {fresh, shown, items, oldest, back, again, noSession, after:WHATS_NEW.filter(x => x.d > "2026-11-05").length}; });
  ok(wn.fresh, "nouvel utilisateur : pas de fenêtre « Quoi de neuf »", wn);
  ok(wn.shown && wn.items === wn.after && /6 novembre/.test(wn.oldest), "testeur dont la dernière séance date du 5 nov. : nouveautés depuis le 6 nov.", wn);
  ok(wn.back && !wn.again, "marquée « vue » seulement à la fermeture : un rechargement de mise à jour ne la fait plus disparaître", wn);
  ok(wn.noSession, "testeur sans séance : nouveautés depuis la naissance de son Gymon", wn);
  // 18 nov. 2026 : une nouveauté publiée plus tard le même jour s'affiche aussi ; la fenêtre ne se ferme que par un bouton ; si une autre fenêtre est ouverte, on réessaie
  const wn2 = await p.evaluate(async () => { closeSheet(); const W0 = WHATS_NEW.slice();
    WHATS_NEW.unshift({d:WHATS_NEW[0].d, t:"Test du même jour", x:"…"}); maybeWhatsNew();
    const same = !document.getElementById("sheet").hidden && /Test du même jour/.test(document.querySelector(".wn").textContent) && document.querySelectorAll(".wn-i").length === 1;
    document.getElementById("sheet").click(); const locked = !document.getElementById("sheet").hidden, avis = !!document.querySelector('[data-act="wn-avis"]');
    closeSheet(); maybeWhatsNew(); const once = document.getElementById("sheet").hidden;
    WHATS_NEW.unshift({d:WHATS_NEW[0].d, t:"Test réessai", x:"…"}); openSheet("<p>autre</p>"); maybeWhatsNew(); const waits = !document.querySelector(".wn"); closeSheet();
    await new Promise(r => setTimeout(r, 2800)); const retried = !!document.querySelector(".wn") && /Test réessai/.test(document.querySelector(".wn").textContent);
    document.querySelector('[data-act="wn-avis"]').click(); const idea = /Boîte à idées/.test(document.querySelector(".sheet").textContent) && /Test réessai/.test((document.querySelector(".sheet textarea") || {}).value || "");
    closeSheet(); try{ localStorage.removeItem("gymon.idea"); }catch(e){}
    WHATS_NEW.splice(0, WHATS_NEW.length, ...W0); return {same, locked, avis, once, waits, retried, idea}; });
  ok(wn2.same && wn2.once, "nouveauté publiée plus tard le même jour : affichée, une seule fois", wn2);
  ok(wn2.locked && wn2.avis, "nouveautés : fermeture par bouton seulement, bouton « Donner mon avis »", wn2);
  ok(wn2.waits && wn2.retried, "une autre fenêtre ouverte au démarrage : les nouveautés s'affichent juste après", wn2);
  ok(wn2.idea, "« Donner mon avis » ouvre la boîte à idées avec un message prérempli", wn2);
  await p.click('.top [data-act="settings"]'); await p.click('[data-act="whats-new"]');
  ok(await p.evaluate(() => document.querySelectorAll(".wn-i").length === WHATS_NEW.length), "Réglages : « Les nouveautés » rouvre la liste complète");
  ok(errs.length === 0, "aucune erreur JavaScript", errs);
  await b.close();
  console.log(fails ? `\n${fails} échec(s)` : "\nTous les tests du guide passent");
  process.exit(fails ? 1 : 0);
})();
