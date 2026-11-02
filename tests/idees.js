// Tests de la boîte à idées (Node + Playwright). Usage : node tests/idees.js [dossier-captures]
const {chromium, devices} = require("playwright");
const path = require("path");
const URL = "file://" + path.resolve(__dirname, "..", "index.html"), SHOTS = process.argv[2];
let fails = 0; const ok = (cond, label, extra) => { console.log(`${cond ? "OK  " : "ÉCHEC"} ${label}${extra!==undefined ? " → " + JSON.stringify(extra) : ""}`); if(!cond) fails++; };

(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({...devices["iPhone 13"]}), p = await ctx.newPage();
  p.on("pageerror", e => errs.push(e.message));
  // Partage simulé : on garde le texte envoyé
  await p.addInitScript(() => { window.__shared = null; navigator.share = d => { window.__shared = d.text; return Promise.resolve(); }; });
  await p.goto(URL); await p.waitForTimeout(300);
  await p.click('.sheet [data-act="close"]').catch(()=>{});   // écran de bienvenue
  await p.waitForSelector('#tuto .tu-skip', {timeout:2000}).then(() => p.click('#tuto .tu-skip')).catch(()=>{});   // tuto
  for(const t of ["creature","seance","progres"]){ await p.click(`.tabs [data-tab="${t}"]`); ok(await p.locator('.top [data-act="idea"]').isVisible(), `bouton boîte à idées visible (${t})`); }

  await p.click('.top [data-act="idea"]');
  await p.click('#idea-kinds [data-k="manque"]');
  await p.fill("#idea-txt", "Pouvoir donner un nom à mon Gymon");
  if(SHOTS) await p.screenshot({path: path.join(SHOTS, "idees.png")});
  // Brouillon conservé si on ferme puis rouvre
  await p.click('.sheet [data-act="close"]'); await p.click('.top [data-act="idea"]');
  ok(await p.inputValue("#idea-txt") === "Pouvoir donner un nom à mon Gymon", "brouillon conservé");
  ok(await p.getAttribute('#idea-kinds [data-k="manque"]', "aria-pressed") === "true", "type « Il manque » conservé");
  // Message vide refusé
  await p.fill("#idea-txt", "  "); await p.click('[data-act="idea-send"]');
  ok(await p.evaluate(() => window.__shared) === null, "message vide non envoyé");
  // Envoi
  await p.fill("#idea-txt", "Pouvoir donner un nom à mon Gymon"); await p.click('[data-act="idea-send"]'); await p.waitForTimeout(200);
  const sent = await p.evaluate(() => window.__shared);
  ok(/^🧩 Il manque pour Gymon/.test(sent) && sent.includes("Pouvoir donner un nom") && /Version /.test(sent), "message préparé et envoyé par le partage", sent);
  ok(await p.locator("#sheet").isHidden(), "la fenêtre se ferme après l'envoi");
  ok(await p.evaluate(() => localStorage.getItem("gymon.idea")) === null, "brouillon effacé après l'envoi");
  await ctx.close();

  // Sans partage disponible : copie dans le presse-papiers
  const ctx2 = await b.newContext({permissions:["clipboard-read","clipboard-write"]}), p2 = await ctx2.newPage();
  p2.on("pageerror", e => errs.push(e.message));
  await p2.addInitScript(() => { delete Navigator.prototype.share; navigator.share = undefined; });
  await p2.goto(URL); await p2.waitForTimeout(300); await p2.click('.sheet [data-act="close"]').catch(()=>{});
  await p2.waitForSelector('#tuto .tu-skip', {timeout:2000}).then(() => p2.click('#tuto .tu-skip')).catch(()=>{});
  await p2.click('.top [data-act="idea"]'); await p2.fill("#idea-txt", "Un mode sombre plus contrasté"); await p2.click('[data-act="idea-send"]'); await p2.waitForTimeout(300);
  const clip = await p2.evaluate(() => navigator.clipboard.readText());
  ok(/^💡 Idée pour Gymon/.test(clip) && clip.includes("mode sombre"), "sans partage : message copié", clip.split("\n")[0]);
  await ctx2.close();

  ok(errs.length === 0, "aucune erreur JavaScript", errs);
  await b.close();
  console.log(fails ? `\n${fails} échec(s)` : "\nTous les tests de la boîte à idées passent");
  process.exit(fails ? 1 : 0);
})();
