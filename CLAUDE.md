# Gymon — consignes techniques

Ce dépôt est **public** et ne contient que l'application. Règles du coach et du Gymon, contexte, décisions, organisation et business sont dans le document Claude privé du propriétaire : https://claude.ai/artifact/3cgRPQyaPkfaAqKMZ9M2qi (outils Claude Docs). Le lire avant de modifier une règle, et le mettre à jour dans la foulée. Ne rien écrire de cela dans le dépôt, ni dans les messages de commit.

## L'app
- Tout est dans `index.html` (CSS puis JS), zéro dépendance, zéro build ; `sw.js` pour le hors ligne ; photos dans `img/`.
- Données dans `localStorage`, clé `carnet-fonte.v1`, objet `S = {profile, workouts}`.

## À ne jamais casser
1. Aucune dépendance, aucun serveur, aucune IA dans l'app. Les données restent dans le téléphone.
2. Un stade, une fidélité, un niveau de muscle ne se perdent jamais par une mise à jour : toute migration prévoit les utilisateurs existants.
3. Ne pas changer les identifiants d'exercices (`EX`, `GRAVL`, `gx-*`), la clé `localStorage`, ni le champ `app:"carnet-fonte"` des exports.
4. Lire le bloc entier avant de modifier ; style existant ; échapper avec `esc()` ; rendu différé via `softRender`/`flushPending`.
5. Aucune donnée personnelle, capture d'écran ou CSV dans le dépôt.

## Livrer
1. Changement de calcul voulu : `node tests/regression.js --update` avant, comparer après.
2. Tests : `node tests/regression.js`, `coach.js`, `creature.js`, `guide.js`, `idees.js`, `taps.js` (Node + Playwright, Chromium).
3. Incrémenter `APP_VERSION` (`index.html`) et `CACHE` (`sw.js`).
4. Commit en français, signé avec l'adresse personnelle du propriétaire.
5. Un push sur `main` déploie chez les testeurs (GitHub Pages) : seulement après accord du propriétaire, tests verts.
