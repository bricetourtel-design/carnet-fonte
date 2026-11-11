// Fiabilité des touchers : un bouton ne doit jamais être remplacé pendant qu'on le touche (iPhone)
// Lancer : node tests/taps.js
const {chromium, devices} = require("playwright"), path = require("path"), http = require("http"), fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
let fails = 0; const ok = (c, m, d) => { console.log((c ? "OK   " : "ÉCHEC ") + m + (d !== undefined ? " → " + JSON.stringify(d) : "")); if(!c) fails++; };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]).replace(/^\/$/, "/index.html"));
    fs.readFile(f, (e, d) => { if(e){ r.writeHead(404); r.end(); return; } r.writeHead(200, {"Content-Type": f.endsWith(".html") ? "text/html" : f.endsWith(".js") ? "text/javascript" : "application/octet-stream"}); r.end(d); }); }).listen(0);
  const b = await chromium.launch(), ctx = await b.newContext({...devices["iPhone 13"]}), p = await ctx.newPage(), errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto(`http://localhost:${srv.address().port}/index.html`); await p.waitForTimeout(300);
  await p.evaluate(() => { S.profile.tutoAppDone = true; S.profile.tutoDone = true; try{ closeSheet(); }catch(e){} try{ endTuto(); }catch(e){}
    startWorkout("T", [{exId:"curl-halteres", sets:[blankSet(), blankSet()]}]); startRest(90); });
  await p.waitForTimeout(400);
  const hold = async (sel, ms) => { const x = await p.locator(sel).boundingBox(); await p.mouse.move(x.x + x.width/2, x.y + x.height/2); await p.mouse.down(); await p.waitForTimeout(ms); await p.mouse.up(); await p.waitForTimeout(100); };
  const t0 = await p.evaluate(() => restState.end);
  await hold('[data-act="rest-plus"]', 350);
  ok(Math.round((await p.evaluate(() => restState.end) - t0) / 1000) === 15, "minuteur : un toucher long sur « +15 s » est bien pris en compte");
  const same = await p.evaluate(() => new Promise(res => { const a = document.querySelector('[data-act="rest-skip"]'); setTimeout(() => res(a === document.querySelector('[data-act="rest-skip"]')), 700); }));
  ok(same, "minuteur : les boutons ne sont pas reconstruits pendant le décompte");
  await hold('[data-act="rest-skip"]', 400);
  ok(await p.evaluate(() => restState === null), "minuteur : « Passer » fonctionne au premier toucher, même long");
  await p.waitForTimeout(300);
  // Saisie puis toucher d'un bouton : le rendu différé attend que le doigt soit levé
  const deferred = await p.evaluate(() => new Promise(res => { let n = 0; const r0 = render; window.render = (...a) => { n++; return r0(...a); };
    fingerDown = true; pendingRender = true; flushPending(); setTimeout(() => { const during = n; fingerDown = false; setTimeout(() => { window.render = r0; res([during, n]); }, 200); }, 150); }));
  ok(deferred[0] === 0 && deferred[1] === 1, "rendu différé : jamais pendant un toucher, fait juste après", deferred);
  // 10 s avant la fin : bandeau en haut qui ne bloque pas la saisie ; fin : plein écran
  await p.evaluate(() => { startRest(14); }); await p.waitForTimeout(4600);
  const ban = await p.evaluate(() => { const f = document.getElementById("flash"), r = f.getBoundingClientRect(); return {cls:f.className, hidden:f.hidden, h:r.height, vh:innerHeight}; });
  ok(!ban.hidden && /warn/.test(ban.cls) && ban.h < ban.vh/4, "10 s avant la fin : bandeau en haut (pas plein écran)", ban);
  const inp = await p.locator("#w-0-0").boundingBox(); await p.touchscreen.tap(inp.x + 20, inp.y + 10); await p.keyboard.type("12");
  ok(await p.evaluate(() => A().exercises[0].sets[0].w) === "12", "pendant le bandeau, la saisie de la charge reste possible");
  await p.waitForTimeout(10500);
  const go = await p.evaluate(() => { const f = document.getElementById("flash"), r = f.getBoundingClientRect(); return {cls:f.className, hidden:f.hidden, h:r.height, vh:innerHeight}; });
  ok(!go.hidden && /go/.test(go.cls) && go.h >= go.vh - 1, "fin du repos : écran « C'est reparti ! » en plein écran", go);
  // Toucher une case de charge : la valeur est sélectionnée, ce qu'on tape la remplace
  await p.evaluate(() => { stopRest(); flash(null); S.profile.active = null; startWorkout("Saisie", [{exId:"curl-halteres", sets:[blankSet()]}]); const s = A().exercises[0].sets.find(x => !x.warm); s.w = "10"; render(); });
  const idx = await p.evaluate(() => A().exercises[0].sets.findIndex(x => !x.warm));
  const box = await p.locator(`#w-0-${idx}`).boundingBox(); await p.touchscreen.tap(box.x + box.width - 6, box.y + box.height/2); await p.waitForTimeout(150);
  await p.keyboard.type("20");
  ok(await p.evaluate(i => A().exercises[0].sets[i].w, idx) === "20", "toucher la case « 10 » puis taper 20 donne 20 (pas 1020)");
  await p.evaluate(() => { S.profile.active = null; render(); });
  // Charge par côté de la barre
  const pl = await p.evaluate(() => { stopRest(); S.profile.active = null; S.workouts = [];
    startWorkout("Barre", [{exId:"dc-barre", sets:[blankSet()]}, {exId:"curl-halteres", sets:[blankSet()]}]); render();
    const j = A().exercises[0].sets.findIndex(x => !x.warm), inp = document.getElementById(`w-0-${j}`);
    inp.value = "50"; inp.dispatchEvent(new Event("input", {bubbles:true})); const a = document.getElementById(`pl-0-${j}`).textContent;
    inp.value = "20"; inp.dispatchEvent(new Event("input", {bubbles:true})); const b2 = document.getElementById(`pl-0-${j}`).textContent;
    const ez = plateText({equip:"Barre", name:"Curl à la barre EZ"}, 30), db = !!document.querySelector('[id^="pl-1-"]');
    S.profile.active = null; render(); return {a, b2, ez, db}; });
  ok(pl.a === "(15 kg / côté)" && pl.b2 === "(barre seule)", "développé couché : 50 kg → 15 kg par côté ; 20 kg → barre seule", pl);
  ok(pl.ez === "(10 kg / côté)" && !pl.db, "barre EZ de 10 kg (30 kg → 10 par côté) ; rien sur les haltères", pl);
  // Statistiques anonymes : rien n'est envoyé pendant les tests, réglage pour refuser
  const gc = []; p.on("request", r => { if(/goatcounter/.test(r.url())) gc.push(r.url()); });
  await p.evaluate(() => { flash(null); stopRest(); S.profile.active = null; tab = "exercices"; render(); gcOpen(); });
  await p.locator("#stats-on").scrollIntoViewIfNeeded(); await p.click("#stats-on");
  ok(await p.evaluate(() => S.profile.noStats === true), "Réglages : décocher « Statistiques anonymes » les désactive");
  await p.click("#stats-on");
  // Indicateurs de validation du MVP : une seule fois par téléphone, seulement si une séance récente
  const ret = await p.evaluate(() => { const D = 86400000, keys = ["gymon.firstSeen","gymon.gc.j7","gymon.gc.j30","gymon.gc.partage"], saved = S.workouts;
    keys.forEach(k => localStorage.removeItem(k)); localStorage.setItem("gymon.firstSeen", String(Date.now() - 31*D));
    S.workouts = []; gcRetention(); const none = !localStorage.getItem("gymon.gc.j7");
    S.workouts = [{id:"t1", start:Date.now() - D, end:Date.now() - D + 3600000, exercises:[]}]; gcRetention();
    const both = !!localStorage.getItem("gymon.gc.j7") && !!localStorage.getItem("gymon.gc.j30");
    S.profile.noStats = true; gcOnce("gymon.gc.partage", "partage-premier"); const refused = !localStorage.getItem("gymon.gc.partage"); S.profile.noStats = false;
    S.workouts = saved; keys.forEach(k => localStorage.removeItem(k)); return {none, both, refused}; });
  ok(ret.none && ret.both, "rétention : rien sans séance récente ; actif à 7 et 30 jours avec une séance récente", ret);
  ok(ret.refused, "statistiques refusées : l'indicateur n'est ni envoyé ni marqué", ret);
  ok(await p.evaluate(() => S.profile.noStats === false) && gc.length === 0, "aucune statistique envoyée pendant les tests", gc);
  ok(errs.length === 0, "aucune erreur JavaScript", errs);
  await b.close(); srv.close();
  console.log(fails ? `\n${fails} échec(s)` : "\nTous les tests de touchers passent"); process.exit(fails ? 1 : 0);
})();
