# Gymon — mémoire projet pour Claude Code

Ce fichier se charge à chaque session. Il dit ce qu'est le projet, comment on y travaille et ce qu'il ne faut pas casser. Les détails sont dans `docs/` et dans les deux documents de règles (`ALGORITHME.md`, `CREATURE.md`).

## Le projet en trois phrases

Gymon (ex-Carnet de Fonte) est une application web de suivi de musculation, installable sur iPhone comme une app, qui fonctionne hors ligne, sans compte, sans serveur et sans IA embarquée. Un coach à règles fixes propose charges et répétitions ; une créature façon Tamagotchi (le Gymon) grandit avec les séances, tombe malade et peut mourir si on arrête. Les retours testeurs sont unanimes : **la créature est la valeur ajoutée**, le coach est le socle de crédibilité.

Statut : MVP en test auprès de testeurs (novembre 2026). Les fonctionnalités et la logique de développement du MVP ont vocation à être valorisées commercialement : on les préserve, on ne les réécrit pas sans décision explicite du propriétaire.

## Posture attendue

- Agir comme **responsable produit et technique** du projet : vision, priorités, arbitrages argumentés, pas d'exécution aveugle.
- Avant toute modification de règle (coach, créature, routine), lire la section correspondante de `ALGORITHME.md` ou `CREATURE.md`, et la mettre à jour dans le même commit.
- Proposer, ne pas décider seul, sur tout ce qui change les règles du jeu pour l'utilisateur (seuils, vitalité, mort, fourchettes de reps). Faire les retouches techniques sans demander.
- Dire clairement ce qui est fait, ce qui ne l'est pas, et ce qui n'a pas pu être vérifié (les tests ne couvrent pas Safari iOS réel).

## Architecture (à connaître avant de toucher au code)

| Élément | Où | Remarque |
|---|---|---|
| Toute l'app | `index.html` (≈ 3 200 lignes : CSS puis JS) | Un seul fichier, zéro dépendance, zéro build |
| Hors ligne | `sw.js` | Cache précharge `index.html`, le manifeste, les icônes et les 170 photos |
| PWA | `manifest.json`, `icon-*.png`, `icon.svg` | |
| Photos d'exercices | `img/<id>-0.jpg`, `img/<id>-1.jpg` | Free Exercise DB, domaine public |
| Règles du coach | `ALGORITHME.md` | Sources scientifiques citées, à garder à jour |
| Règles de la créature | `CREATURE.md` | Historique des versions V1.0 → V2.0 |
| Tests | `tests/*.js` + `tests/golden.json` | Node + Playwright, Chromium |
| Prototype 3D | `proto-3d/` | Page à part, n'affecte pas l'app |
| Retours testeurs | `.retours-utilisateurs.md` | Anonymes, interne |
| Contexte complet | `docs/CONTEXTE.md` | Historique, décisions, glossaire, backlog |
| Audit | `docs/AUDIT-2026-11.md` | État des lieux, risques, recommandations |
| Migration | `docs/MIGRATION.md` | Procédure de changement de compte ou d'hébergement |

Ordre des blocs dans le JS de `index.html` : données de base (`MUSCLES`, `EX`) → état et stockage (`S`, `loadLocal`, `saveLocal`) → calculs (`e1rm`, `exHistory`) → coach (`coach`, `coachFresh`, fatigue) → échauffement → routine de la semaine (`generatePlan`) → points forts (`strengthByMuscle`) → séance du jour (`chooseToday`, `adaptToday`) → créature (`CREATURE_CFG`, `creatureState`, `creatureFeed`, `creatureSVG`) → partage, célébration, bulles → tutos et « Quoi de neuf » → raisons de séance moins bonne → import Gravl → rendu (`render`, `view*`) → actions (`ACT`) → démarrage.

Données : tout est dans `localStorage` sous la clé `carnet-fonte.v1`, objet `S = {profile, workouts}`. La créature vit dans `S.profile.creature`. Les séances (`S.workouts`) ne sont jamais modifiées par la créature ni par le coach. Schéma détaillé dans `docs/CONTEXTE.md`.

## Règles de développement (non négociables)

1. **Aucune dépendance, aucun serveur, aucune IA dans l'app.** C'est une promesse faite aux utilisateurs (affichée dans Réglages) et un choix produit.
2. **Les données restent dans le téléphone.** Jamais d'envoi de séance, de nom, de donnée de santé ou de cycle. Les statistiques se limitent aux deux compteurs GoatCounter existants.
3. **Un stade acquis, un niveau de muscle, une fidélité ne se perdent jamais** par une mise à jour. Toute migration de données (nouveau champ, nouvelle règle) doit prévoir le cas des utilisateurs existants, comme le font `creatureState()` et `creatureFixLevels()`.
4. **Le prochain stade du Gymon n'est jamais nommé ni compté** dans l'interface. Les seuils sont tirés au hasard et cachés.
5. **Lire avant d'écrire.** `index.html` est long : chercher la fonction, lire le bloc entier et ses commentaires, puis modifier. Pas de réécriture de bloc « pour faire propre ».
6. **Style du code existant** : français dans les commentaires et les textes, fonctions courtes et denses, templates HTML dans les fonctions `view*`, actions dans `ACT` déclenchées par `data-act`. Échapper toute chaîne avec `esc()`.
7. **iPhone d'abord.** Tout rendu différé passe par `softRender`/`flushPending` (jamais de re-rendu sous le doigt), le minuteur ne reconstruit pas ses boutons, les saisies sélectionnent leur valeur au focus.
8. **Textes en français**, tutoiement dans les tutos et les bulles du Gymon, vouvoiement dans le coach et les réglages (c'est l'existant, on ne mélange pas dans une même zone).

## Avant de livrer une modification

1. Si la modification change un calcul volontairement : `node tests/regression.js --update` **avant** la modification pour figer la référence, puis vérifier la différence après.
2. Lancer les suites concernées, toutes si doute :
   ```
   node tests/regression.js
   node tests/coach.js
   node tests/creature.js
   node tests/guide.js
   node tests/idees.js
   node tests/taps.js
   ```
   Prérequis : Node et Playwright avec Chromium. Les tests tournent sur `file://` ou sur un petit serveur local lancé par le script.
3. Incrémenter `APP_VERSION` dans `index.html` (format `AAAA-MM-JJ` + lettre) **et** `CACHE` dans `sw.js` (`carnet-fonte-vN`). Sans ça, les téléphones gardent l'ancienne version.
4. Ajouter une entrée `WHATS_NEW` seulement pour une nouveauté qui change l'usage (nouvelle fonction, règle du jeu ou du coach). Pas pour une correction ni une retouche.
5. Mettre à jour `ALGORITHME.md` ou `CREATURE.md` si une règle change.
6. Commit en français, une ligne qui dit ce que voit l'utilisateur (voir `git log` pour le style). Pousser sur la branche de travail, jamais directement sur `main` sans accord.
7. Mention « Assisté par IA » dans tout document produit.

## Priorités produit (novembre 2026)

1. Renforcer la créature : c'est ce qui plaît et ce qui sera valorisé.
2. Garder le coach crédible et sourcé.
3. Fiabilité iPhone (touchers, mises à jour, hors ligne).
4. Ne rien ajouter qui nécessite un serveur tant que le MVP n'est pas validé.

Backlog et idées : `docs/CONTEXTE.md`, section « Pistes ».

## Ce qu'il ne faut pas faire

- Découper `index.html` en modules, introduire un framework ou un bundler. Si un jour c'est décidé, ce sera un projet à part entière, pas un à-côté.
- Changer les identifiants d'exercices (`EX`, `GRAVL`, `gx-*`) : ils sont dans l'historique de tous les utilisateurs.
- Changer la clé `localStorage`, le nom du cache sans incrément, ou le champ `app:"carnet-fonte"` des exports : la compatibilité des sauvegardes en dépend.
- Toucher aux photos ou à leur nommage sans mettre à jour `sw.js` et `EXTRA_IMG`.
- Mettre des données personnelles (noms de testeurs, numéros) dans le dépôt, y compris dans `.retours-utilisateurs.md`.

## Hébergement et déploiement

L'app est un dossier statique. `LISEZMOI.txt` décrit l'installation : hébergement de fichiers statiques (Netlify Drop ou GitHub Pages), puis « Sur l'écran d'accueil » dans Safari. L'URL de production n'est pas dans le dépôt : la demander au propriétaire avant toute opération qui en dépend. Changer d'URL fait perdre les données des utilisateurs installés (le `localStorage` est lié à l'origine) : voir `docs/MIGRATION.md`.

---
*Assisté par IA. Le collaborateur reste responsable et vérifie.*
