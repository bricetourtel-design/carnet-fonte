// Tests de la séance en équipe (Node + Playwright) : deux téléphones simulés, QR maison, cas d'erreur.
// Usage : node tests/team.js
const {chromium, devices} = require("playwright");
const path = require("path");
const URL = "file://" + path.resolve(__dirname, "..", "index.html");
let fails = 0; const ok = (cond, label, extra) => { console.log(`${cond ? "OK  " : "ÉCHEC"} ${label}${extra!==undefined ? " → " + JSON.stringify(extra).slice(0, 400) : ""}`); if(!cond) fails++; };

(async () => {
  const b = await chromium.launch(), errs = [];
  const phone = async () => { const ctx = await b.newContext({...devices["iPhone 13"]}), p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
    await p.addInitScript(() => addEventListener("DOMContentLoaded", () => { gyHourFix = 12; }));
    await p.goto(URL); await p.waitForTimeout(300);
    await p.evaluate(() => { S.profile.tutoDone = true; S.profile.tutoAppDone = true; S.profile.onboarded = true; S.profile.installHintOff = true; S.profile.wnKeys = WHATS_NEW.map(wnKey); closeSheet(); saveLocal(); render(); });
    return p; };
  const A_ = await phone(), B_ = await phone();

  // 1. QR maison : encodage puis lecture d'images (tailles, rotation), dans le navigateur
  const qr = await A_.evaluate(async () => {
    const res = [];
    for(const len of [10, 120, 260]){
      const txt = "GYT1|" + "é".repeat(3) + "abcdefghijklmnopqrstuvwxyz".repeat(12).slice(0, len), q = QR.encode(txt), N = q.n + 8;
      for(const [scale, rot] of [[6, 0], [4, 0.4], [5, -0.9]]){
        const cv = document.createElement("canvas"); cv.width = cv.height = Math.ceil(N * scale * 1.5); const cx = cv.getContext("2d");
        cx.fillStyle = "#ddd"; cx.fillRect(0, 0, cv.width, cv.height); cx.translate(cv.width / 2, cv.height / 2); cx.rotate(rot); cx.scale(scale, scale); cx.translate(-N / 2, -N / 2);
        cx.fillStyle = "#fff"; cx.fillRect(0, 0, N, N); cx.fillStyle = "#111"; for(let y = 0; y < q.n; y++) for(let x = 0; x < q.n; x++) if(q.m[y * q.n + x]) cx.fillRect(x + 4, y + 4, 1.02, 1.02);
        res.push(QR.decode(cx.getImageData(0, 0, cv.width, cv.height)) === txt); } }
    // correction d'erreurs Reed-Solomon
    const data = Array.from({length:30}, (_, i) => (i * 37) % 256), cw = data.concat(QR.rsEnc(data, 16)), bad = cw.slice(); [0, 5, 12, 20, 33, 40, 44].forEach(i => bad[i] ^= 0x5a);
    return {all:res.every(Boolean), n:res.filter(Boolean).length, rs:QR.rsFix(bad, 16) && bad.join() === cw.join()}; });
  ok(qr.all, "QR maison : encodé puis relu (3 longueurs, 3 tailles et rotations)", qr.n);
  ok(qr.rs, "QR maison : correction de 7 octets abîmés (Reed-Solomon)");

  // 2. Codes courts des exercices : tous différents
  const codes = await A_.evaluate(() => { const s = new Set(EX.map(e => exCode(e.id))); return {n:EX.length, u:s.size}; });
  ok(codes.n === codes.u, "codes courts des exercices : aucun doublon", codes);

  // 3. Téléphone A (maître) : historique lourd, séance de 3 exercices + un exercice perso
  await A_.evaluate(() => { const now = Date.now(), D = 86400000;
    S.profile.bw = 90; S.profile.custom = [{id:"perso-x", name:"Mon exo perso", muscle:"Pectoraux", equip:"Autre"}];
    S.workouts = [{id:"a1", name:"P", start:now - 3 * D, end:now - 3 * D + 3600000, prs:[], exercises:[{exId:"dc-barre", feel:3, sets:[1,2,3].map(() => ({w:"100", r:"6", done:true}))}]}];
    const c = creatureState(); c.stage = 6; c.fidelity = 52; c.look = {col:7, shorts:3}; c.name = "Titan"; c.levels = {}; MUSC.forEach((m, i) => c.levels[m] = (i % 5) * 0.9); saveLocal();
    S.profile.active = null; startWorkout("Pecs du jeudi", [{exId:"dc-barre", sets:[blankSet(), blankSet()]}, {exId:"rowing-barre", sets:[blankSet()]}, {exId:"perso-x", sets:[blankSet()]}, {exId:"curl-barre", sets:[blankSet()]}]);
    closeSheet(); render(); });
  // partage : le prénom est demandé au premier partage
  await A_.click('[data-act="team-share"]'); await A_.fill("#team-name", "Alex"); await A_.click('[data-act="team-name-ok"]');
  const share = await A_.evaluate(() => ({txt:document.getElementById("qr-txt").value, svg:document.querySelector(".qr-box svg").outerHTML, role:A().team.role, name:S.profile.firstName}));
  ok(/^GYT1\|/.test(share.txt) && share.role === "maitre" && share.name === "Alex" && share.txt.length < 260, "maître : prénom demandé au premier partage, QR versionné et compact", share.txt.length);
  const share2 = await A_.evaluate(async () => { closeSheet(); await new Promise(r => setTimeout(r, 5)); showQR("session"); return document.getElementById("qr-txt").value; });
  ok(share2 !== share.txt, "un nouveau QR à chaque partage");
  await A_.evaluate(() => closeSheet());

  // 4. Téléphone B (suiveur) : historique léger ; la caméra (simulée) filme le QR du maître
  await B_.evaluate(() => { const now = Date.now(), D = 86400000; S.profile.bw = 70; S.profile.firstName = "Sam";
    S.workouts = [{id:"b1", name:"P", start:now - 4 * D, end:now - 4 * D + 3600000, prs:[], exercises:[{exId:"dc-barre", feel:3, sets:[1,2,3].map(() => ({w:"40", r:"8", done:true}))}]}];
    const c = creatureState(); c.stage = 3; c.fidelity = 12; saveLocal(); tab = "creature"; render(); });
  await B_.evaluate(async svg => {
    const img = new Image(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); await img.decode();
    const cv = document.createElement("canvas"); cv.width = 640; cv.height = 480; const cx = cv.getContext("2d");
    const draw = () => { cx.fillStyle = "#777"; cx.fillRect(0, 0, 640, 480); cx.save(); cx.translate(320, 240); cx.rotate(0.12); cx.drawImage(img, -170, -170, 340, 340); cx.restore(); };
    draw(); setInterval(draw, 100);
    navigator.mediaDevices.getUserMedia = async () => cv.captureStream(10);
  }, share.svg);
  await B_.click('[data-act="gy-social"]'); await B_.click('.sheet [data-act="team-join"]');
  await B_.waitForSelector('[data-act="team-start"]', {timeout:8000}).catch(() => {});
  const prev = await B_.evaluate(() => ({h:(document.querySelector(".sheet h3") || {}).textContent, ex:[...document.querySelectorAll(".team-ex li")].map(x => x.textContent), unk:document.querySelector(".sheet").textContent.includes("Mon exo perso"), duo:document.querySelectorAll(".sheet .team-duo .duo-svg").length}));
  ok(/Séance d'Alex/.test(prev.h) && prev.ex.join() === "Développé couché (barre),Rowing barre,Curl barre" && prev.unk && prev.duo === 2, "suiveur : scan caméra → aperçu (même ordre, exercice perso signalé, deux Gymon)", prev);
  await B_.click('[data-act="team-start"]');
  const fol = await B_.evaluate(() => { const a = A(), dc = coach("dc-barre", a.start);
    return {ids:a.exercises.map(x => x.exId).join(), team:a.team && a.team.role, friend:a.team && a.team.friend && a.team.friend.name, w:dc.w, duo:document.querySelectorAll("main .team-duo .duo-svg").length,
      fr:(S.profile.friends || []).map(f => f.name).join(), titan:/Titan|class="creature/.test(document.querySelector(".team-duo").innerHTML)}; });
  ok(fol.ids === "dc-barre,rowing-barre,curl-barre" && fol.team === "suiveur" && fol.friend === "Alex", "suiveur : mêmes exercices, même ordre, trace « suiveur »", fol);
  ok(fol.w > 0 && fol.w <= 50, "suiveur : charges recalculées sur SON historique (≈ 40 kg, pas les 100 kg du maître)", fol.w);
  ok(fol.duo === 2 && fol.fr === "Alex", "séance : les deux Gymon côte à côte ; Alex ajouté aux amis", fol);
  // apparence complète du Gymon du maître retrouvée chez le suiveur
  const look = await Promise.all([A_.evaluate(() => gymonCard()), B_.evaluate(() => A().team.friend.card)]);
  ok(look[0] === look[1], "Gymon du maître transmis à l'identique (stade, couleur, short, poids, taille, 17 muscles, nom)", look);
  // le suiveur peut modifier sa séance
  await B_.evaluate(() => { A().exercises.splice(2, 1); render(); });
  ok(await B_.evaluate(() => A().exercises.length === 2), "suiveur : peut retirer un exercice");

  // 5. Fin de séance chez le suiveur : trace et bouton pour montrer son Gymon
  const endB = await B_.evaluate(() => { A().exercises[0].sets.forEach(s => { s.w = "42.5"; s.r = "8"; s.done = true; }); finishWorkout(); if(celebState && celebState.main) celebState.main();
    const w = S.workouts[S.workouts.length - 1], cel = (document.getElementById("celebrate") || {}).innerHTML || "";
    return {team:w.team, log:S.profile.teams, btn:/Montrer mon Gymon à Alex/.test(cel), duo:/team-duo/.test(cel)}; });
  ok(endB.team && endB.team.role === "suiveur" && endB.team.friend.name === "Alex" && endB.log.length === 1 && endB.log[0].friend.name === "Alex", "suiveur : séance enregistrée avec la trace « séance en équipe » (prénom, niveau, date)", endB.log);
  ok(endB.btn && endB.duo, "fin de séance : les deux personnages, et « Montrer mon Gymon à Alex »", endB);
  const cardB = await B_.evaluate(() => { celebClose(true); closeSheet(); showQR("friend"); return document.getElementById("qr-txt").value; });

  // 6. Fin chez le maître, puis deuxième scan facultatif (Gymon du suiveur, ici par le code texte)
  const endA = await A_.evaluate(() => { A().exercises[0].sets.forEach(s => { s.w = "100"; s.r = "6"; s.done = true; }); finishWorkout(); if(celebState && celebState.main) celebState.main();
    const cel = document.getElementById("celebrate").innerHTML; celebClose(true); closeSheet(); return {scanBtn:/Scanner le Gymon de ton coéquipier/.test(cel), team:S.workouts[S.workouts.length - 1].team}; });
  ok(endA.scanBtn && endA.team.role === "maitre" && !endA.team.friend, "maître : séance enregistrée ; deuxième scan proposé, facultatif", endA.team);
  const link = await A_.evaluate(txt => { teamReceive(txt); const w = S.workouts[S.workouts.length - 1];
    return {friend:w.team.friend && w.team.friend.name, log:S.profile.teams[S.profile.teams.length - 1].friend, friends:S.profile.friends.map(f => [f.name, f.together])}; }, cardB);
  ok(link.friend === "Sam" && link.log && link.log.name === "Sam" && link.friends[0][0] === "Sam" && link.friends[0][1] === 1, "deuxième scan : le maître sait avec qui il s'est entraîné ; amitié créée", link);

  // 7. Cas d'erreur
  const er = await B_.evaluate(() => { closeSheet(); const t = [];
    for(const txt of ["bonjour", "GYT9|x|y", "GYT1|abc", "GYT1|u|1|Zoé|2|3|" + gymonCard() + "|zzzz,~Inconnu total"]) t.push(teamParse(txt).error);
    const toastOf = txt => { teamReceive(txt); return document.getElementById("toast").textContent; };
    return {codes:t, msgVer:toastOf("GYT9|x"), msgVide:toastOf("GYT1|u|1|Zoé|2|3|" + gymonCard() + "|zzzz"), own:toastOf(teamPayload("friend"))}; });
  ok(er.codes.join() === "autre,version,illisible,vide", "erreurs : QR étranger, version inconnue, code illisible, séance vide", er.codes);
  ok(/plus récente/.test(er.msgVer) && /vide/.test(er.msgVide) && /propre code/.test(er.own), "erreurs : messages clairs (mise à jour, séance vide, son propre code)", er);

  // 8. Sauvegarde : la trace d'équipe et les amis passent l'export / import
  const imp = await B_.evaluate(async () => { const txt = exportText(), w0 = S.workouts.find(w => w.team);
    const c = cleanImport(JSON.parse(txt)), w = c.workouts.find(x => x.id === w0.id); return {kept:!!(w && w.team && w.team.friend.name === "Alex"), role:w && w.team.role}; });
  ok(imp.kept && imp.role === "suiveur", "sauvegarde : la trace « séance en équipe » est gardée", imp);

  // 9. Page Gymon : bouton « Sociabiliser »
  const soc = await B_.evaluate(() => { closeSheet(); tab = "creature"; render(); document.querySelector('[data-act="gy-social"]').click();
    const t = document.querySelector(".sheet").textContent; closeSheet(); return {t:/Sociabiliser/.test(t) && /Mes amis Gymon \(1\)/.test(t) && /Alex/.test(t)}; });
  ok(soc.t, "page Gymon : « Sociabiliser » ouvre l'espace équipe et la liste des amis");

  ok(errs.length === 0, "aucune erreur JavaScript", errs);
  await b.close();
  console.log(fails ? `\n${fails} échec(s)` : "\nTous les tests de la séance en équipe passent");
  process.exit(fails ? 1 : 0);
})();
