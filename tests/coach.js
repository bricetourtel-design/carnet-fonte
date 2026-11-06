// Scénarios du coach v2 (audit nov. 2026) : charges lourdes conservées, pas de baisse pour 1 ou 2 reps sous la fourchette.
// Lancer : node tests/coach.js   (serveur local lancé automatiquement)
const {chromium} = require("playwright"), path = require("path"), http = require("http"), fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
let fails = 0; const ok = (c, m, d) => { console.log((c ? "OK   " : "ÉCHEC ") + m + (d !== undefined ? " → " + JSON.stringify(d) : "")); if(!c) fails++; };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]).replace(/^\/$/, "/index.html"));
    fs.readFile(f, (e, d) => { if(e){ r.writeHead(404); r.end(); return; } r.writeHead(200, {"Content-Type": f.endsWith(".html") ? "text/html" : f.endsWith(".js") ? "text/javascript" : "application/octet-stream"}); r.end(d); }); }).listen(0);
  const b = await chromium.launch(), p = await b.newPage(), errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto(`http://localhost:${srv.address().port}/index.html`); await p.waitForTimeout(300);
  const R = await p.evaluate(() => {
    const D = 864e5, now = Date.now(), mk = (d, exId, sets, feel) => ({id:"t"+Math.random(), name:"t", start:now - d*D, end:now - d*D, exercises:[{exId, feel, sets:sets.map(([w,r]) => ({w:String(w), r:String(r), done:true}))}]});
    const run = ws => { S.workouts = ws; return coach(ws[0].exercises[0].exId); };
    const out = {};
    out.rangeBench = repRange(exById("dc-barre")); out.rangeCurl = repRange(exById("curl-halteres")); out.rangeLat = repRange(exById("elev-lat")); out.rangeDb = repRange(exById("dc-halteres"));
    let c = run([mk(3, "curl-halteres", [[16,6],[16,6],[16,6]], 3)]); out.curl = [c.w, c.r, c.tag];          // 6 reps, fourchette 8–12 : on garde 16 kg
    c = run([mk(3, "curl-halteres", [[16,4],[16,4]], 3)]); out.curlLow = [c.w < 16, c.r];                       // 4 reps : on baisse
    // Polyarticulaires : séance lourde et séance volume en alternance
    c = run([mk(3, "dc-barre", [[80,8],[80,8],[80,8]], 3)]); out.heavy = [c.mode, c.w, c.r, c.lo, c.hi]; out.restH = c.rest;        // après du volume : lourd
    c = run([mk(3, "dc-barre", [[87.5,5],[87.5,5],[87.5,5]], 3), mk(7, "dc-barre", [[80,8],[80,8]], 3)]); out.volume = [c.mode, c.w, c.r]; out.restV = c.rest;
    c = run([mk(3, "dc-barre", [[80,8],[80,8]], 3), mk(7, "dc-barre", [[87.5,6],[87.5,6]], 3)]); out.heavyUp = [c.mode, c.w];   // haut de fourchette lourde atteint
    c = run([mk(3, "dc-barre", [[80,8],[80,8]], 3), mk(7, "dc-barre", [[87.5,4],[87.5,4]], 3)]); out.heavyRep = [c.mode, c.w, c.r];
    c = run([mk(3, "curl-halteres", [[14,10],[14,10]], 3)]); out.iso = [c.mode, c.lo, c.hi];
    c = run([mk(3, "tractions", [["",4],["",3]], 0)]); out.pull = [c.r, c.tag];                                 // ressenti non noté : on progresse
    // 1RM en baisse sur 3 séances espacées de 3 semaines : pas de décharge ; rapprochées et -5 % : décharge
    c = run([mk(3, "dc-barre", [[76,6]], 3), mk(24, "dc-barre", [[78,6]], 3), mk(45, "dc-barre", [[80,6]], 3)]); out.spread = c.tag;
    c = run([mk(2, "dc-barre", [[74,6]], 3), mk(6, "dc-barre", [[77,6]], 3), mk(10, "dc-barre", [[80,6]], 3)]); out.close = c.tag;
    return out;
  });
  ok(R.rangeBench.join() === "5,8" && R.rangeDb.join() === "6,10" && R.rangeCurl.join() === "8,12" && R.rangeLat.join() === "10,15", "fourchettes : barre 5–8, haltères/machines 6–10, isolation 8–12, petits muscles 10–15", R);
  ok(R.curl[0] === 16 && R.curl[1] === 8, "6 reps sans difficulté sous 8–12 : on garde la charge et on vise 8", R.curl);
  ok(R.curlLow[0] && R.curlLow[1] >= 8, "4 reps sous 8–12 : on baisse un peu la charge", R.curlLow);
  ok(R.heavy[0] === "lourd" && R.heavy[1] > 80 && R.heavy[3] === 4 && R.heavy[4] === 6, "après une séance volume (80 kg × 8) : séance lourde 4–6 reps, plus chargée", R.heavy);
  ok(R.volume[0] === "volume" && R.volume[1] <= 80 && R.volume[2] >= 8, "après une séance lourde : séance volume, au moins la charge du dernier volume réussi", R.volume);
  ok(R.heavyUp[0] === "lourd" && R.heavyUp[1] === 90, "haut de la fourchette lourde atteint (87,5 × 6) : +2,5 kg", R.heavyUp);
  ok(R.heavyRep[0] === "lourd" && R.heavyRep[1] === 87.5 && R.heavyRep[2] === 5, "même charge lourde : une rep de plus (87,5 × 4 → 5)", R.heavyRep);
  ok(R.iso[0] === null && R.iso[1] === 8, "isolation : pas d'alternance, fourchette 8–12", R.iso);
  ok(R.pull[0] === 4, "tractions sans ressenti noté : +1 rep (plus de blocage en « Consolider »)", R.pull);
  ok(R.spread !== "Décharge", "séances espacées : pas de décharge sur du bruit", R.spread);
  ok(R.close === "Décharge", "3 séances rapprochées en baisse de plus de 5 % : décharge", R.close);
  ok(R.restH === 180 && R.restV === 120, "repos : 3 min en séance lourde, 2 min en séance volume", [R.restH, R.restV]);
  ok(errs.length === 0, "aucune erreur JavaScript", errs);
  await b.close(); srv.close();
  console.log(fails ? `\n${fails} échec(s)` : "\nTous les tests du coach passent"); process.exit(fails ? 1 : 0);
})();
